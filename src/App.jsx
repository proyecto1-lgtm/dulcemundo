import React,{useEffect,useMemo,useState} from 'react';
import {io} from 'socket.io-client';
import Board3D from './components/Board3D.jsx';
import {DIRS,scorePlayer} from './game/engine.js';

const SERVER_URL=import.meta.env.VITE_SERVER_URL||'http://localhost:8787';
const animals=[{name:'Conejito',emoji:'🐰',color:'#2689ee'},{name:'Leoncito',emoji:'🦁',color:'#f05b55'},{name:'Panda',emoji:'🐼',color:'#7c65c9'},{name:'Zorrito',emoji:'🦊',color:'#ed9639'},{name:'Elefantito',emoji:'🐘',color:'#4aaeb2'},{name:'Tortuguita',emoji:'🐢',color:'#58a66b'}];

export default function App(){
 const [socket,setSocket]=useState(null),[name,setName]=useState(''),[animal,setAnimal]=useState(animals[0]),[screen,setScreen]=useState('welcome');
 const [status,setStatus]=useState('Conectando con el servidor...'),[seconds,setSeconds]=useState(30),[game,setGame]=useState(null),[playerIndex,setPlayerIndex]=useState(0),[draft,setDraft]=useState([]),[error,setError]=useState('');
 const [roomMode,setRoomMode]=useState('');
 useEffect(()=>{
  const s=io(SERVER_URL,{transports:['websocket','polling']});setSocket(s);
  s.on('connect',()=>setStatus('Conectado'));s.on('connect_error',()=>setStatus('Servidor desconectado. Inicia npm run server en otra terminal.'));
  s.on('disconnect',()=>setStatus('Conexión perdida con el servidor.'));
  s.on('match:queued',()=>{setScreen('search');setSeconds(30);});
  s.on('match:found',d=>{setPlayerIndex(d.playerIndex);setRoomMode(d.mode);setScreen('game');setStatus(d.mode==='ai'?'Partida contra Dulce IA':'¡Rival encontrado!');});
  s.on('game:state',d=>{setGame(d.game);setDraft([]);setError('');});
  s.on('game:error',d=>setError(d.message));
  s.on('match:opponent-left',d=>{setError(d.message);setScreen('finished');});
  return()=>s.disconnect();
 },[]);
 useEffect(()=>{if(screen!=='search')return;const t=setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(t);},[screen]);
 const find=()=>{if(!name.trim()){setError('Escribe tu nombre para continuar.');return;}if(!socket?.connected){setError('El servidor no está disponible. Intenta nuevamente.');return;}setError('');setScreen('search');setSeconds(30);socket.emit('match:find',{name:name.trim(),animal:animal.emoji,color:animal.color});};
 const cancel=()=>{socket?.emit('match:cancel');setScreen('welcome');};
 const roll=()=>socket?.emit('game:roll');
 const add=k=>{if(game?.phase==='program'&&draft.length<game.die)setDraft(d=>[...d,k]);};
 const execute=()=>{if(draft.length!==game?.die){setError(`Selecciona ${game?.die} flechas.`);return;}socket?.emit('game:move',{sequence:draft});};
 const me=game?.players?.[playerIndex],opponent=game?.players?.[1-playerIndex];
 const winner=game?.winner?game.players.find(p=>p.id===game.winner):null;
 const screenMoves=playerIndex===0
   ? [
      {screen:'up',key:'down',symbol:'↑',label:'Arriba',toward:true},
      {screen:'down',key:'up',symbol:'↓',label:'Abajo',toward:false},
      {screen:'left',key:'right',symbol:'←',label:'Izquierda',toward:true},
      {screen:'right',key:'left',symbol:'→',label:'Derecha',toward:false}
     ]
   : [
      {screen:'up',key:'up',symbol:'↑',label:'Arriba',toward:true},
      {screen:'down',key:'down',symbol:'↓',label:'Abajo',toward:false},
      {screen:'left',key:'left',symbol:'←',label:'Izquierda',toward:true},
      {screen:'right',key:'right',symbol:'→',label:'Derecha',toward:false}
     ];
 const localSymbol=(actualKey)=>screenMoves.find(move=>move.key===actualKey)?.symbol||DIRS[actualKey]?.symbol||'';
 const activePlayer=game?.players?.[game?.active];
 return <main className="app">
  <header className="topbar"><div><span className="logo">🍭</span><div><h1>Dulce Mundo</h1><p>Conquista el camino • Aventura online</p></div></div>{screen==='game'&&<button className="soft" onClick={()=>{socket?.disconnect();setScreen('welcome');setGame(null);}}>Salir</button>}</header>
  {screen==='welcome'&&<section className="lobby">
   <div className="hero"><h2>¡Bienvenido a Dulce Mundo!</h2><p>Elige tu animal, encuentra un rival y conquista el tablero.</p></div>
   <div className="lobbyCard"><label htmlFor="playerName">¿Cómo te llamas?</label><input id="playerName" value={name} maxLength={20} onChange={e=>setName(e.target.value)} placeholder="Escribe tu nombre..."/>
    <h3>Escoge tu personaje</h3><div className="animalGrid">{animals.map(a=><button key={a.name} className={`animal ${animal.name===a.name?'chosen':''}`} onClick={()=>setAnimal(a)}><span>{a.emoji}</span><b>{a.name}</b></button>)}</div>
    <button className="primary findButton" onClick={find}>🔎 BUSCAR PARTIDA</button><p className="hint">Buscaremos otro jugador durante 30 segundos. Si no encontramos a nadie, jugarás contra Dulce IA.</p>
    <small className="connection">{status}</small>{error&&<p className="error">{error}</p>}
   </div>
  </section>}
  {screen==='search'&&<section className="searchCard"><div className="searchAnimal">{animal.emoji}</div><h2>Buscando un contrincante...</h2><p>{name} está listo para jugar.</p><div className="loader"></div><strong className="countdown">{seconds} segundos</strong><p className="hint">Si no encontramos otro jugador, te emparejaremos automáticamente con Dulce IA.</p><button className="soft" onClick={cancel}>Cancelar búsqueda</button></section>}
  {screen==='game'&&game&&<><section className="status"><strong>{me?.animal} {me?.name}</strong><span>{game.lastMessage||status}</span><span className="turn">Turno de {activePlayer?.name||'—'}</span></section>
   {game.phase==='finished'&&<section className="winner"><h2>{game.isDraw?'🤝 ¡Tenemos un empate!':`🏆 ¡Ganó ${winner?.name||'el jugador'}!`}</h2><p>¡Se recogieron todas las monedas! Resultado final:</p><div className="finalScores">{game.players.map(p=><strong key={p.id}>{p.animal} {p.name}: {scorePlayer(game,p)} puntos</strong>)}</div></section>}
   <div className="layout"><aside className="panel left"><h2>Jugadores</h2>{game.players.map((p,i)=><div className="playerCard" key={p.id} style={{borderColor:p.color}}><div className="avatar">{p.animal}</div><div><b>{p.name}</b><small>{i===0?'Azul':'Rojo'} · {p.coins} dulces</small><strong>{scorePlayer(game,p)} puntos</strong></div></div>)}<h3>Partida online</h3><p className="hint">{roomMode==='ai'?'Estás jugando contra Dulce IA.':'Estás conectado con otro estudiante.'}</p></aside>
    <section className="gameArea"><Board3D game={game} playerIndex={playerIndex} draft={draft}/><div className="legend"><span><i className="blue"></i> Territorio azul</span><span><i className="red"></i> Territorio rojo</span><span>🪙 Dulces</span><span><i className="previewDot"></i> Camino previsto</span></div></section>
    <aside className="panel controls"><h2>Turno de {activePlayer?.name||'—'}</h2><div className="dice">{game.die??'🎲'}</div><button className="primary" onClick={roll} disabled={game.active!==playerIndex||game.phase!=='roll'||!!winner}>🎲 Lanzar dado</button><h3>Elige tus flechas</h3><div className="slots">{Array.from({length:game.die||0},(_,i)=><div key={i} className="slot">  {draft[i]?localSymbol(draft[i]):i+1}</div>)}</div><div className="arrows">{screenMoves.map(move=><button key={move.screen} className={move.toward?'towardGoal':''} onClick={()=>add(move.key)} disabled={game.active!==playerIndex||game.phase!=='program'||draft.length>=game.die}> {move.symbol}<small>{move.toward?'Hacia meta':'Regresar'}</small><em>{move.label}</em></button>)}</div><div className="actions"><button className="soft" onClick={()=>setDraft(d=>d.slice(0,-1))} disabled={!draft.length}>↶ Deshacer</button><button className="primary" onClick={execute} disabled={game.active!==playerIndex||game.phase!=='program'||!!winner}>Ejecutar</button></div>{error&&<p className="error">{error}</p>}<p className="hint">Mientras eliges flechas, verás en verde el camino que recorrerá tu animal. Puedes deshacer y cambiarlo antes de ejecutar.</p></aside>
   </div></>}
  {screen==='finished'&&<section className="searchCard"><h2>Partida finalizada</h2><p>{error}</p><button className="primary" onClick={()=>{setGame(null);setScreen('welcome');setError('');}}>Volver al inicio</button></section>}
  <footer>Dulce Mundo · Juego educativo online · Tablero 20 × 20</footer>
 </main>;
}
