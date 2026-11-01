import { randomUUID } from 'node:crypto';
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
const TURN_SECONDS=40;
const TURN_START_DELAY_MS=4000;
const RECONNECT_GRACE_MS=120000;
const resumeSessions=new Map();

function publicState(room){
  return {game:{...room.game,coins:[...room.game.coins]},players:room.players.map(p=>({id:p.id,name:p.name,animal:p.animal,color:p.color})),mode:room.mode,timerStartsAt:room.timerStartsAt||null,deadlineAt:room.deadlineAt||null};
}
function emitState(room){
  io.to(room.id).emit('game:state',publicState(room));
}
function clearTurnTimer(room){
  if(room.turnTimer){clearTimeout(room.turnTimer);room.turnTimer=null;}
}
function startTurnTimer(room,durationMs=TURN_SECONDS*1000){
  if(!room||room.game.winner||room.ai&&room.game.active===1)return;
  clearTurnTimer(room);
  room.remainingTurnMs=null;
  const now=Date.now();
  room.timerStartsAt=now+TURN_START_DELAY_MS;
  room.deadlineAt=room.timerStartsAt+durationMs;
  const expectedPlayer=room.game.active;
  room.turnTimer=setTimeout(()=>{
    room.turnTimer=null;
    if(!rooms.has(room.id)||room.game.winner||room.game.active!==expectedPlayer)return;
    room.game.active=1-expectedPlayer;
    room.game.phase='roll';
    room.game.die=null;
    room.game.sequence=[];
    room.game.lastMovePath=[];
    room.game.lastCollectedCoins=[];
    room.game.lastRewards=[];
    room.game.lastReward=null;
    room.game.lastMovedPlayer=null;
    room.game.lastMessage=`Se acabaron los 40 segundos. ${room.players[expectedPlayer].name} perdió su turno.`;
    room.deadlineAt=null;
    room.timerStartsAt=null;
    if(room.ai&&room.game.active===1){
      emitState(room);
      setTimeout(()=>aiTurn(room),1200);
    }else{
      emitState(room);
    }
  },TURN_START_DELAY_MS+durationMs);
}
function pauseTurnTimer(room){
  if(!room)return;
  if(room.turnTimer){
    const now=Date.now();
    // No descontar los 4 segundos de preparación si la desconexión ocurre antes del inicio real.
    room.remainingTurnMs=room.deadlineAt
      ? Math.max(1000, now < (room.timerStartsAt||0) ? TURN_SECONDS*1000 : room.deadlineAt-now)
      : TURN_SECONDS*1000;
    clearTimeout(room.turnTimer);
    room.turnTimer=null;
  }
  room.deadlineAt=null;
  room.timerStartsAt=null;
}
function createRoom(human1,human2=null,mode='human',difficulty='intermediate'){
  const id=`dm-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const game=createGame();
  console.log(`[Dulce Mundo] Nueva distribución ${game.candyLayoutId}: ${[...game.coins].join(' | ')}`);
  const players=[
    {...human1,id:game.players[0].id,color:game.players[0].color,resumeToken:human1.resumeToken||randomUUID()},
    human2?{...human2,id:game.players[1].id,color:game.players[1].color,resumeToken:human2.resumeToken||randomUUID()}:{id:2,name:'Robot Dulce',animal:'🤖',color:game.players[1].color}
  ];
  game.players[0].name=players[0].name; game.players[0].animal=players[0].animal;
  game.players[1].name=players[1].name; game.players[1].animal=players[1].animal;
  const room={id,game,players,mode,difficulty,sockets:[human1.socketId,human2?.socketId].filter(Boolean),ai:!human2,turnTimer:null,deadlineAt:null,timerStartsAt:null,disconnectTimers:[]};
  rooms.set(id,room);
  room.sockets.forEach((sid,index)=>{
    playerRoom.set(sid,{roomId:id,index});
    if(players[index].resumeToken)resumeSessions.set(players[index].resumeToken,{roomId:id,index});
    const connectedSocket=io.sockets.sockets.get(sid);
    if(connectedSocket) connectedSocket.join(id);
    io.to(sid).emit('match:found',{roomId:id,playerIndex:index,opponent:players[1-index],mode,resumeToken:players[index].resumeToken});
  });
  emitState(room);
  return room;
}
function removeFromQueue(socketId){
  const index=queue.findIndex(q=>q.socketId===socketId);
  if(index>=0){clearTimeout(queue[index].timer);queue.splice(index,1);}
}
function aiSequence(room,difficulty='intermediate'){
  const game=room.game,p=game.players[1],value=game.die||1;
  const dirs=['up','down','left','right'], rival=game.players[0].pos;
  const candies=[...game.coins].map(k=>k.split(',').map(Number));
  let pos={...p.pos},chosen=[];
  const dist=(a,b)=>Math.abs(a.r-b[0])+Math.abs(a.c-b[1]);
  for(let step=0;step<value;step++){
    const candidates=dirs.map(k=>({k,r:pos.r+({up:-1,down:1,left:0,right:0}[k]),c:pos.c+({up:0,down:0,left:-1,right:1}[k])}))
      .filter(x=>x.r>=0&&x.c>=0&&x.r<20&&x.c<20&&!(x.r===rival.r&&x.c===rival.c));
    if(!candidates.length)break;
    const ranked=candidates.map(x=>{
      const key=`${x.r},${x.c}`, candy=game.coins.has(key);
      const nearest=candies.length?Math.min(...candies.map(c=>dist(x,c))):20;
      const territory=game.board[x.r][x.c].owner!==p.id?1:0;
      const rivalDistance=Math.abs(x.r-rival.r)+Math.abs(x.c-rival.c);
      let score=(candy?100:0)+(territory*2)-nearest* (difficulty==='easy'?1: difficulty==='expert'?4:2);
      if(difficulty==='expert')score+=Math.min(rivalDistance,8)*0.35;
      return {...x,score};
    }).sort((a,b)=>b.score-a.score);
    const pool=difficulty==='easy'?ranked.slice(0,3):difficulty==='expert'?ranked.slice(0,1):ranked.slice(0,2);
    const pick=pool[Math.floor(Math.random()*pool.length)];
    chosen.push(pick.k);pos={r:pick.r,c:pick.c};
    const idx=candies.findIndex(c=>c[0]===pos.r&&c[1]===pos.c);if(idx>=0)candies.splice(idx,1);
  }
  return chosen;
}
function aiTurn(room){
  if(!room||room.game.phase!=='roll'||room.game.active!==1||room.game.coins.size===0)return;
  const value=1+Math.floor(Math.random()*6);
  room.game={...room.game,die:value,phase:'program'};
  const seq=aiSequence(room,room.difficulty);
  const valid=validateSequence(room.game,1,seq);
  if(valid.ok&&seq.length===value) room.game=applySequence(room.game,seq);
  else {room.game.active=0;room.game.phase='roll';room.game.die=null;}
  emitState(room);
  if(room.game.active===1&&room.game.phase==='roll'&&room.game.coins.size>0){const delay=(room.game.lastMovePath?.length||0)*650+1900;setTimeout(()=>aiTurn(room),delay);}
}
io.on('connection',socket=>{
  socket.emit('server:ready',{ok:true});
  socket.on('player:resume',({token}={})=>{
    if(!token)return;
    const session=resumeSessions.get(token);if(!session)return socket.emit('player:resume-failed',{message:'No se encontró una partida recuperable. Puedes iniciar una nueva.'});
    const room=rooms.get(session.roomId);if(!room)return resumeSessions.delete(token),socket.emit('player:resume-failed',{message:'La partida ya no está disponible en el servidor.'});
    const player=room.players[session.index];
    if(!player||player.resumeToken!==token)return socket.emit('player:resume-failed',{message:'No se pudo validar la reconexión.'});
    const oldSocket=player.socketId;
    if(oldSocket&&oldSocket!==socket.id)playerRoom.delete(oldSocket);
    player.socketId=socket.id;
    if(!room.sockets.includes(socket.id))room.sockets[session.index]=socket.id;
    playerRoom.set(socket.id,{roomId:room.id,index:session.index});
    socket.join(room.id);
    if(room.disconnectTimers[session.index]){clearTimeout(room.disconnectTimers[session.index]);room.disconnectTimers[session.index]=null;}
    socket.emit('match:found',{roomId:room.id,playerIndex:session.index,opponent:room.players[1-session.index],mode:room.mode,resumeToken:token,reconnected:true});
    if(!room.deadlineAt&&!room.ai||!room.deadlineAt&&room.ai&&room.game.active===0)
      startTurnTimer(room,room.remainingTurnMs||TURN_SECONDS*1000);
    socket.emit('game:state',publicState(room));
    io.to(room.id).emit('match:player-reconnected',{playerIndex:session.index,name:player.name});
  });
  socket.on('match:find',({name,animal,color,difficulty})=>{
    removeFromQueue(socket.id);
    const player={socketId:socket.id,resumeToken:randomUUID(),name:String(name||'Jugador').slice(0,20),animal:String(animal||'🐰'),color:color||'#2689ee',difficulty:['easy','intermediate','expert'].includes(difficulty)?difficulty:'intermediate'};
    const opponentIndex=queue.findIndex(q=>q.socketId!==socket.id);
    if(opponentIndex>=0){
      const opponent=queue.splice(opponentIndex,1)[0];clearTimeout(opponent.timer);
      createRoom(opponent.player,player,'human');
    }else{
      const entry={socketId:socket.id,player,timer:null};
      entry.timer=setTimeout(()=>{
        const idx=queue.findIndex(q=>q.socketId===socket.id);
        if(idx>=0){queue.splice(idx,1);createRoom(player,null,'ai',player.difficulty||'intermediate');}
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
    room.game={...room.game,die,phase:'program',lastMessage:`Salió ${die}. Elige ${die} flechas.`,lastReward:null,lastRewards:[],lastMovePath:[]};
    emitState(room);
  });
  socket.on('game:move',({sequence})=>{
    const info=playerRoom.get(socket.id);if(!info)return;
    const room=rooms.get(info.roomId);if(!room||room.game.active!==info.index||room.game.phase!=='program'||room.game.winner)return;
    if(!Array.isArray(sequence)||sequence.length!==room.game.die)return socket.emit('game:error',{message:`Debes seleccionar exactamente ${room.game.die} flechas.`});
    const valid=validateSequence(room.game,info.index,sequence);
    if(!valid.ok)return socket.emit('game:error',{message:valid.reason});
    clearTurnTimer(room);
    room.deadlineAt=null;
    room.timerStartsAt=null;
    room.game=applySequence(room.game,sequence);
    if(room.game.winner)clearTurnTimer(room);
    else if(!room.ai&&room.game.active!==info.index)room.deadlineAt=null;
    emitState(room);
    if(room.ai&&!room.game.winner&&room.game.active===1){const delay=(room.game.lastMovePath?.length||0)*650+1900;setTimeout(()=>aiTurn(room),delay);}
  });
  socket.on('game:turn:ready',()=>{
    const info=playerRoom.get(socket.id);if(!info)return;
    const room=rooms.get(info.roomId);if(!room||room.game.active!==info.index||room.game.phase!=='roll'||room.game.winner)return;
    if(!room.deadlineAt){
      startTurnTimer(room,room.remainingTurnMs||TURN_SECONDS*1000);
      room.game.lastRewards=[];
      room.game.lastReward=null;
      room.game.lastMovePath=[];
      room.game.lastCollectedCoins=[];
      room.game.lastMovedPlayer=null;
      emitState(room);
    }
  });
  socket.on('disconnect',()=>{
    removeFromQueue(socket.id);
    const info=playerRoom.get(socket.id);
    if(info){
      const room=rooms.get(info.roomId);
      playerRoom.delete(socket.id);
      if(room){
        const player=room.players[info.index];
        // A page refresh can reconnect with a new socket before the old
        // socket's disconnect event reaches the server. Do not mark the
        // player offline or pause the match if a newer socket owns the seat.
        if(player?.socketId && player.socketId !== socket.id) return;
        pauseTurnTimer(room);
        if(player&&player.socketId===socket.id)player.socketId=null;
        room.sockets[info.index]=null;
        io.to(room.id).emit('match:opponent-disconnected',{message:`${player?.name||'El rival'} se desconectó. Esperando que vuelva a conectarse...`,playerIndex:info.index});
        if(room.disconnectTimers[info.index])clearTimeout(room.disconnectTimers[info.index]);
        room.disconnectTimers[info.index]=setTimeout(()=>{
          if(!rooms.has(room.id)||room.players[info.index]?.socketId)return;
          clearTurnTimer(room);
          io.to(room.id).emit('match:opponent-left',{message:'Se terminó el tiempo para reconectarse. La partida ha finalizado.'});
          room.players.forEach(p=>{if(p.resumeToken)resumeSessions.delete(p.resumeToken);});
          rooms.delete(room.id);
        },RECONNECT_GRACE_MS);
      }
    }
  });
});
httpServer.listen(PORT,()=>console.log(`Dulce Mundo online server listening on ${PORT}`));
