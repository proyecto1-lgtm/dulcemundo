import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createGame, validateSequence, applySequence } from '../src/game/engine.js';

const app=express();
app.get('/health',(_,res)=>res.json({status:'ok',service:'dulce-mundo-server'}));
const httpServer=createServer(app);
const io=new Server(httpServer,{cors:{origin:true,methods:['GET','POST']}});
const PORT=process.env.PORT||8787;
const queue=[];
const rooms=new Map();
const playerRoom=new Map();
const WAIT_MS=30000;

function publicState(room){
  return {game:{...room.game,coins:[...room.game.coins]},players:room.players.map(p=>({id:p.id,name:p.name,animal:p.animal,color:p.color})),mode:room.mode};
}
function emitState(room){
  io.to(room.id).emit('game:state',publicState(room));
}
function createRoom(human1,human2=null,mode='human'){
  const id=`dm-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const game=createGame();
  console.log(`[Dulce Mundo] Nueva distribución ${game.candyLayoutId}: ${[...game.coins].join(' | ')}`);
  const players=[
    {...human1,id:game.players[0].id,color:game.players[0].color},
    human2?{...human2,id:game.players[1].id,color:game.players[1].color}:{id:2,name:'Robot Dulce',animal:'🤖',color:game.players[1].color}
  ];
  game.players[0].name=players[0].name; game.players[0].animal=players[0].animal;
  game.players[1].name=players[1].name; game.players[1].animal=players[1].animal;
  const room={id,game,players,mode,sockets:[human1.socketId,human2?.socketId].filter(Boolean),ai:!human2};
  rooms.set(id,room);
  room.sockets.forEach((sid,index)=>{
    playerRoom.set(sid,{roomId:id,index});
    const connectedSocket=io.sockets.sockets.get(sid);
    if(connectedSocket) connectedSocket.join(id);
    io.to(sid).emit('match:found',{roomId:id,playerIndex:index,opponent:players[1-index],mode});
  });
  emitState(room);
  return room;
}
function removeFromQueue(socketId){
  const index=queue.findIndex(q=>q.socketId===socketId);
  if(index>=0){clearTimeout(queue[index].timer);queue.splice(index,1);}
}
function aiSequence(room){
  const game=room.game, p=game.players[1], target={r:9,c:9};
  const value=game.die||1, dirs=['up','down','left','right'], chosen=[];
  let pos={...p.pos};
  for(let i=0;i<value;i++){
    const candidates=dirs.map(k=>({k,r:pos.r+({up:-1,down:1,left:0,right:0}[k]),c:pos.c+({up:0,down:0,left:-1,right:1}[k])}))
      .filter(x=>x.r>=0&&x.c>=0&&x.r<20&&x.c<20&&!(x.r===game.players[0].pos.r&&x.c===game.players[0].pos.c));
    if(!candidates.length)break;
    candidates.sort((a,b)=>(Math.abs(a.r-target.r)+Math.abs(a.c-target.c))-(Math.abs(b.r-target.r)+Math.abs(b.c-target.c)));
    const pick=candidates[0];chosen.push(pick.k);pos={r:pick.r,c:pick.c};
  }
  return chosen;
}
function aiTurn(room){
  if(!room||room.game.winner||room.game.active!==1)return;
  const value=1+Math.floor(Math.random()*6);
  room.game={...room.game,die:value,phase:'program'};
  const seq=aiSequence(room);
  const valid=validateSequence(room.game,1,seq);
  if(valid.ok) room.game=applySequence(room.game,seq);
  else {room.game.active=0;room.game.phase='roll';room.game.die=null;}
  emitState(room);
}
io.on('connection',socket=>{
  socket.emit('server:ready',{ok:true});
  socket.on('match:find',({name,animal,color})=>{
    removeFromQueue(socket.id);
    const player={socketId:socket.id,name:String(name||'Jugador').slice(0,20),animal:String(animal||'🐰'),color:color||'#2689ee'};
    const opponentIndex=queue.findIndex(q=>q.socketId!==socket.id);
    if(opponentIndex>=0){
      const opponent=queue.splice(opponentIndex,1)[0];clearTimeout(opponent.timer);
      createRoom(opponent.player,player,'human');
    }else{
      const entry={socketId:socket.id,player,timer:null};
      entry.timer=setTimeout(()=>{
        const idx=queue.findIndex(q=>q.socketId===socket.id);
        if(idx>=0){queue.splice(idx,1);createRoom(player,null,'ai');}
      },WAIT_MS);
      queue.push(entry);
      socket.emit('match:queued',{waitSeconds:30});
    }
  });
  socket.on('match:cancel',()=>removeFromQueue(socket.id));
  socket.on('game:roll',()=>{
    const info=playerRoom.get(socket.id);if(!info)return;
    const room=rooms.get(info.roomId);if(!room||room.game.active!==info.index||room.game.phase!=='roll'||room.game.winner)return;
    const die=1+Math.floor(Math.random()*6);
    room.game={...room.game,die,phase:'program',lastMessage:`Salió ${die}. Elige ${die} flechas.`};
    emitState(room);
  });
  socket.on('game:move',({sequence})=>{
    const info=playerRoom.get(socket.id);if(!info)return;
    const room=rooms.get(info.roomId);if(!room||room.game.active!==info.index||room.game.phase!=='program'||room.game.winner)return;
    if(!Array.isArray(sequence)||sequence.length!==room.game.die)return socket.emit('game:error',{message:`Debes seleccionar exactamente ${room.game.die} flechas.`});
    const valid=validateSequence(room.game,info.index,sequence);
    if(!valid.ok)return socket.emit('game:error',{message:valid.reason});
    room.game=applySequence(room.game,sequence);
    emitState(room);
    if(room.ai&&!room.game.winner&&room.game.active===1)setTimeout(()=>aiTurn(room),900);
  });
  socket.on('disconnect',()=>{
    removeFromQueue(socket.id);
    const info=playerRoom.get(socket.id);
    if(info){const room=rooms.get(info.roomId);if(room){io.to(room.id).emit('match:opponent-left',{message:'El otro jugador se desconectó.'});rooms.delete(room.id);}playerRoom.delete(socket.id);}
  });
});
httpServer.listen(PORT,()=>console.log(`Dulce Mundo online server listening on ${PORT}`));
