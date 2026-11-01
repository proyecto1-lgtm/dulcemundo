import React,{useEffect,useMemo,useState} from 'react';
import {io} from 'socket.io-client';
import Board3D from './components/Board3D.jsx';
import BlueBotActivity from './components/BlueBotActivity.jsx';
import {DIRS,scorePlayer} from './game/engine.js';

const SERVER_URL=import.meta.env.VITE_SERVER_URL||'http://localhost:8787';
const animals=[{name:'Conejito',emoji:'🐰',color:'#2689ee'},{name:'Leoncito',emoji:'🦁',color:'#f05b55'},{name:'Panda',emoji:'🐼',color:'#7c65c9'},{name:'Zorrito',emoji:'🦊',color:'#ed9639'},{name:'Elefantito',emoji:'🐘',color:'#4aaeb2'},{name:'Tortuguita',emoji:'🐢',color:'#58a66b'}];

export default function App(){
 const [socket,setSocket]=useState(null),[name,setName]=useState(''),[animal,setAnimal]=useState(animals[0]),[screen,setScreen]=useState('welcome');
 const [status,setStatus]=useState('Conectando con el servidor...'),[seconds,setSeconds]=useState(30),[game,setGame]=useState(null),[playerIndex,setPlayerIndex]=useState(0),[draft,setDraft]=useState([]),[error,setError]=useState('');
 const [roomMode,setRoomMode]=useState(''),[difficulty,setDifficulty]=useState('intermediate'),[musicOn,setMusicOn]=useState(true),[volume,setVolume]=useState(0.12),[rewardQueue,setRewardQueue]=useState([]),[rewardIndex,setRewardIndex]=useState(0),[movementFinished,setMovementFinished]=useState(true),[deadlineAt,setDeadlineAt]=useState(null),[timerStartsAt,setTimerStartsAt]=useState(null),[timerNow,setTimerNow]=useState(Date.now());
 useEffect(()=>{
  const s=io(SERVER_URL,{transports:['websocket','polling']});setSocket(s);
  s.on('connect',()=>{
    setStatus('Conectado');
    const token=localStorage.getItem('dulceMundoResumeToken');
    if(token)s.emit('player:resume',{token});
   });s.on('connect_error',()=>setStatus('Servidor desconectado. Inicia npm run server en otra terminal.'));
  s.on('disconnect',()=>setStatus('Conexión perdida. Intentando reconectar con tu partida...'));
  s.on('match:queued',()=>{setScreen('search');setSeconds(30);});
  s.on('match:found',d=>{
    setPlayerIndex(d.playerIndex);setRoomMode(d.mode);setScreen('game');
    if(d.resumeToken)localStorage.setItem('dulceMundoResumeToken',d.resumeToken);
    setStatus(d.reconnected?'Partida recuperada. ¡Continúa jugando!':(d.mode==='ai'?'Partida contra Dulce IA':'¡Rival encontrado!'));
   });
  s.on('player:resume-failed',d=>{
    localStorage.removeItem('dulceMundoResumeToken');
    setStatus(d.message||'No se pudo recuperar la partida.');
   });
  s.on('game:state',d=>{
    setGame(d.game);setDeadlineAt(d.deadlineAt||null);setTimerStartsAt(d.timerStartsAt||null);setDraft([]);setError('');
    const steps=d.game.lastMovePath?.length||0;setMovementFinished(steps===0);
    const incoming=Array.isArray(d.game.lastRewards)&&d.game.lastRewards.length
      ?d.game.lastRewards
      :(d.game.lastReward?[d.game.lastReward]:[]);
    if(incoming.length){setRewardQueue(incoming);setRewardIndex(0);}
   });
  s.on('game:error',d=>setError(d.message));
  s.on('match:opponent-disconnected',d=>{setStatus(d.message);});
  s.on('match:player-reconnected',d=>{setStatus(`${d.name} volvió a conectarse.`);});
  s.on('match:opponent-left',d=>{setError(d.message);localStorage.removeItem('dulceMundoResumeToken');setScreen('finished');});
  return()=>s.disconnect();
 },[]);
 useEffect(()=>{if(screen!=='search')return;const t=setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(t);},[screen]);
 useEffect(()=>{const t=setInterval(()=>setTimerNow(Date.now()),250);return()=>clearInterval(t);},[]);
 const remainingSeconds=deadlineAt&&timerStartsAt&&timerNow>=timerStartsAt?Math.max(1,Math.ceil((deadlineAt-timerNow)/1000)):null;
 const timerPreparing=Boolean(timerStartsAt&&timerNow<timerStartsAt);
 useEffect(()=>{
  if(!musicOn)return;
  const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
  const ctx=new Ctx(),notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23];let i=0;
  const play=()=>{if(ctx.state==='suspended')ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=notes[i++%notes.length];g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(volume,ctx.currentTime+.08);g.gain.linearRampToValueAtTime(0,ctx.currentTime+.42);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.45);};
  play();const timer=setInterval(play,520);return()=>{clearInterval(timer);ctx.close();};
 },[musicOn,volume]);
 const find=()=>{if(!name.trim()){setError('Escribe tu nombre para continuar.');return;}if(!socket?.connected){setError('El servidor no está disponible. Intenta nuevamente.');return;}setError('');setScreen('search');setSeconds(30);socket.emit('match:find',{name:name.trim(),animal:animal.emoji,color:animal.color,difficulty});};
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
 useEffect(()=>{if(!game||movementFinished)return;const steps=game.lastMovePath?.length||0;const timer=setTimeout(()=>setMovementFinished(true),steps*680+250);return()=>clearTimeout(timer);},[game,movementFinished]);
 useEffect(()=>{
   if(!game||screen!=='game'||!movementFinished||rewardQueue.length>0||game.active!==playerIndex||game.phase!=='roll'||game.winner)return;
   socket?.emit('game:turn:ready');
 },[game,screen,movementFinished,rewardQueue.length,playerIndex,socket]);
 return <main className="app">
  <header className="topbar"><div><span className="logo">🍭</span><div><h1>Dulce Mundo</h1><p>Conquista el camino • Aventura online</p></div></div><div className="audioControl"><button className="soft" onClick={()=>setMusicOn(v=>!v)}>{musicOn?'♫ Música: sí':'♪ Música: no'}</button><input aria-label="Volumen" type="range" min="0" max="0.3" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div>{screen==='game'&&<button className="soft" onClick={()=>{socket?.disconnect();localStorage.removeItem('dulceMundoResumeToken');setScreen('welcome');setGame(null);}}>Salir</button>}</header>
  {screen==='bluebot'&&<BlueBotActivity onBack={()=>setScreen('welcome')}/> }
  {screen==='welcome'&&<><section className="lobby">
   <div className="hero"><h2>¡Bienvenido a Dulce Mundo!</h2><p>Elige tu animal, encuentra un rival y conquista el tablero.</p></div>
   <div className="lobbyCard"><label htmlFor="playerName">¿Cómo te llamas?</label><input id="playerName" value={name} maxLength={20} onChange={e=>setName(e.target.value)} placeholder="Escribe tu nombre..."/>
    <h3>Escoge tu personaje</h3><div className="animalGrid">{animals.map(a=><button key={a.name} className={`animal ${animal.name===a.name?'chosen':''}`} onClick={()=>setAnimal(a)}><span>{a.emoji}</span><b>{a.name}</b></button>)}</div>
    <label htmlFor="difficulty">Dificultad de Dulce IA</label><select id="difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Fácil</option><option value="intermediate">Intermedio</option><option value="expert">Experto</option></select><button className="primary findButton" onClick={find}>🔎 BUSCAR PARTIDA</button><p className="hint">Buscaremos otro jugador durante 30 segundos. Si no encontramos a nadie, jugarás contra Dulce IA.</p>
    <small className="connection">{status}</small>{error&&<p className="error">{error}</p>}
   </div>
  </section><section className="bluebotHomeEntry"><div><span className="bluebotHomeIcon">🐝</span><div><h2>Aprendo a programar</h2><p>Retos de preparación para Blue-Bot · 3, 4 y 5 años</p></div></div><button className="primary" onClick={()=>{setError('');setScreen('bluebot');}}>INICIAR RETOS <span>→</span></button></section></>}
  {screen==='search'&&<section className="searchCard"><div className="searchAnimal">{animal.emoji}</div><h2>Buscando un contrincante...</h2><p>{name} está listo para jugar.</p><div className="loader"></div><strong className="countdown">{seconds} segundos</strong><p className="hint">Si no encontramos otro jugador, te emparejaremos automáticamente con Dulce IA.</p><button className="soft" onClick={cancel}>Cancelar búsqueda</button></section>}
  {screen==='game'&&game&&<><section className="status"><strong>{me?.animal} {me?.name}</strong><span>{game.lastMessage||status}</span><span className="turn">Turno de {activePlayer?.name||'—'}</span><span className={`turnTimer ${remainingSeconds!==null&&remainingSeconds<=5?'urgent':''}`}>{remainingSeconds!==null?`⏱ ${remainingSeconds} s`:timerPreparing?`⏱ Preparando ${Math.max(1,Math.ceil((timerStartsAt-timerNow)/1000))} s`:'Preparando turno'}</span></section>
   {rewardQueue.length>0&&movementFinished&&rewardQueue[rewardIndex]&&<div className="rewardBackdrop"><div className="rewardCard"><div className="rewardCandy">🍬</div><small>Tarjeta {rewardIndex+1} de {rewardQueue.length}</small><h2>{rewardQueue[rewardIndex].title}</h2><p>{rewardQueue[rewardIndex].message}</p><small>Tarjeta sorpresa de {game.players[rewardQueue[rewardIndex].playerIndex]?.name}</small><button className="primary" onClick={()=>{
      if(rewardIndex+1<rewardQueue.length)setRewardIndex(index=>index+1);
      else{setRewardQueue([]);setRewardIndex(0);}
    }}>¡Continuar!</button></div></div>}
   {game.phase==='finished'&&<section className="winner"><h2>{game.isDraw?'🤝 ¡Tenemos un empate!':`🏆 ¡Ganó ${winner?.name||'el jugador'}!`}</h2><p>¡Se recogieron todas las monedas! Resultado final:</p><div className="finalScores">{game.players.map(p=><strong key={p.id}>{p.animal} {p.name}: {scorePlayer(game,p)} puntos</strong>)}</div></section>}
   <div className="layout"><aside className="panel left"><h2>Jugadores</h2>{game.players.map((p,i)=><div className="playerCard" key={p.id} style={{borderColor:p.color}}><div className="avatar">{p.animal}</div><div><b>{p.name}</b><small>{i===0?'Azul':'Rojo'} · {p.coins} dulces</small><strong>{scorePlayer(game,p)} puntos</strong></div></div>)}<h3>Partida online</h3><p className="hint">{roomMode==='ai'?'Estás jugando contra Dulce IA.':'Estás conectado con otro estudiante.'}</p></aside>
    <section className="gameArea"><Board3D game={game} playerIndex={playerIndex} draft={draft}/><div className="legend"><span><i className="blue"></i> Territorio azul</span><span><i className="red"></i> Territorio rojo</span><span>🍬 Caramelos</span><span><i className="previewDot"></i> Camino previsto</span></div></section>
    <aside className="panel controls"><h2>Turno de {activePlayer?.name||'—'}</h2><div className="dice">{game.die??'🎲'}</div><button className="primary" onClick={roll} disabled={!movementFinished||rewardQueue.length>0||game.active!==playerIndex||game.phase!=='roll'||!!winner}>🎲 Lanzar dado</button><h3>Elige tus flechas</h3><div className="slots">{Array.from({length:game.die||0},(_,i)=><div key={i} className="slot">  {draft[i]?localSymbol(draft[i]):i+1}</div>)}</div><button className="primary executeMobile" onClick={execute} disabled={!movementFinished||rewardQueue.length>0||game.active!==playerIndex||game.phase!=='program'||!!winner}>Ejecutar</button><div className="arrows">{screenMoves.map(move=><button key={move.screen} title={move.label} aria-label={move.label} className={move.toward?'towardGoal':''} onClick={()=>add(move.key)} disabled={!movementFinished||rewardQueue.length>0||game.active!==playerIndex||game.phase!=='program'||draft.length>=game.die}> {move.symbol}</button>)}</div><div className="actions"><button className="soft" onClick={()=>setDraft(d=>d.slice(0,-1))} disabled={!movementFinished||!draft.length}>↶ Deshacer</button><button className="primary executeDesktop" onClick={execute} disabled={!movementFinished||rewardQueue.length>0||game.active!==playerIndex||game.phase!=='program'||!!winner}>Ejecutar</button></div>{error&&<p className="error">{error}</p>}<p className="hint">Mientras eliges flechas, verás en verde el camino que recorrerá tu animal. Puedes deshacer y cambiarlo antes de ejecutar.</p></aside>
   </div></>}
  {screen==='finished'&&<section className="searchCard"><h2>Partida finalizada</h2><p>{error}</p><button className="primary" onClick={()=>{setGame(null);setScreen('welcome');setError('');}}>Volver al inicio</button></section>}
  <footer>Dulce Mundo · Juego educativo online · Tablero 20 × 20</footer>
 </main>;
}
