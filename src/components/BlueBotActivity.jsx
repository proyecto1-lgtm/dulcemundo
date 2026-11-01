import React,{useEffect,useState} from 'react';

const COMMANDS=[
 {id:'U',label:'Adelante',symbol:'↑',color:'blue'},
 {id:'D',label:'Atrás',symbol:'↓',color:'blue'},
 {id:'L',label:'Izquierda',symbol:'←',color:'purple'},
 {id:'R',label:'Derecha',symbol:'→',color:'purple'}
];
const makeChallenges=(items)=>items.map(([title,start,path,targetEmoji,hint,scene])=>({
 title,start,path:path.split(''),target:targetFor(start,path),targetEmoji,hint,scene,commands:path.length
}));
function targetFor(start,path){let [r,c]=start;for(const step of path){if(step==='U')r--;if(step==='D')r++;if(step==='L')c--;if(step==='R')c++;}return [r,c];}
const LEVELS={
 '3':{title:'Pequeños exploradores',subtitle:'3 años',description:'Descubre las cuatro direcciones con recorridos cortos.',emoji:'🐣',color:'#ffd978',challenges:makeChallenges([
  ['Visita la flor',[3,1],'U','🌸','Pulsa la flecha hacia arriba para llegar a la flor.','garden'],
  ['Busca la pelota',[1,1],'R','⚽','La pelota está a tu derecha.','park'],
  ['Baja por la colina',[1,3],'D','🍓','La fruta está debajo del robot.','garden'],
  ['Ve a la estrella',[3,3],'L','⭐','La estrella está a la izquierda.','space'],
  ['Dos pasos al tesoro',[4,0],'RR','💎','Avanza dos casillas hacia la derecha.','treasure'],
  ['Regresa a casa',[0,2],'DD','🏠','Baja dos casillas hasta la casa.','home'],
  ['La mariposa',[2,4],'LL','🦋','Muévete dos casillas a la izquierda.','garden'],
  ['Al globo',[4,4],'UU','🎈','Sube dos casillas para alcanzar el globo.','party'],
  ['La manzana',[0,0],'RR','🍎','La manzana está dos casillas a la derecha.','garden'],
  ['Saluda al sol',[4,2],'U','☀️','Sube una casilla para llegar al sol.','space']
 ])},
 '4':{title:'Constructores de caminos',subtitle:'4 años',description:'Combina varias flechas para encontrar diferentes caminos.',emoji:'🐝',color:'#9ee5c4',challenges:makeChallenges([
  ['Camino al arcoíris',[4,0],'RRU','🌈','Avanza dos a la derecha y luego sube.','rainbow'],
  ['El tren de dulces',[0,0],'RRDD','🍬','Avanza dos a la derecha y baja dos.','candy'],
  ['La laguna',[0,4],'LLD','🦆','Ve dos casillas a la izquierda y baja.','lake'],
  ['Sube al árbol',[4,4],'UUL','🌳','Sube dos casillas y ve a la izquierda.','garden'],
  ['La casa amarilla',[1,0],'RRD','🏡','Dos pasos a la derecha y uno hacia abajo.','home'],
  ['El cohete',[4,1],'UUR','🚀','Sube dos y avanza a la derecha.','space'],
  ['La mariposa azul',[0,1],'DDR','🦋','Baja dos casillas y avanza a la derecha.','garden'],
  ['El castillo',[3,4],'UULL','🏰','Sube dos y gira tu recorrido hacia la izquierda.','castle'],
  ['El barco',[1,4],'DDLL','⛵','Baja dos y luego ve dos a la izquierda.','sea'],
  ['La montaña',[4,2],'UURR','⛰️','Sube dos y continúa dos a la derecha.','mountain']
 ])},
 '5':{title:'Pequeños programadores',subtitle:'5 años',description:'Planifica secuencias más largas y revisa cada movimiento.',emoji:'🚀',color:'#c9b5ff',challenges:makeChallenges([
  ['Expedición espacial',[4,0],'UURRU','🪐','Sube dos, avanza dos a la derecha y vuelve a subir.','space'],
  ['El jardín secreto',[4,4],'UULLU','🌷','Sube dos, ve dos a la izquierda y sube una más.','garden'],
  ['Rescate del gatito',[0,0],'RRDDRR','🐱','Avanza dos a la derecha, baja dos y continúa a la derecha.','home'],
  ['El puente mágico',[4,0],'RRUUR','🌉','Ve dos a la derecha, sube dos y avanza a la derecha.','bridge'],
  ['La búsqueda del mapa',[0,4],'LLDDLL','🗺️','Ve dos a la izquierda, baja dos y continúa a la izquierda.','treasure'],
  ['El volcán de colores',[4,4],'UULLDD','🌋','Sube dos, ve a la izquierda dos y baja dos.','volcano'],
  ['La ruta del dinosaurio',[0,0],'DDRRUU','🦕','Baja dos, avanza dos a la derecha y sube dos.','dino'],
  ['Carrera de caracoles',[2,0],'RRUURR','🐌','Avanza dos, sube dos y avanza dos a la derecha.','park'],
  ['El faro brillante',[4,4],'LLUU L'.replaceAll(' ','')+'R','🗼','Ve dos a la izquierda, sube dos y avanza a la derecha.','sea'],
  ['La gran aventura',[0,2],'DDLLDD','🏆','Baja dos, ve dos a la izquierda y baja dos.','adventure']
 ])}
};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const STEP={U:[-1,0],D:[1,0],L:[0,-1],R:[0,1]};
const SCENES={garden:'🌼',park:'🌳',space:'✨',treasure:'🪙',home:'🏡',party:'🎉',rainbow:'🌈',candy:'🍭',lake:'💧',castle:'🏰',sea:'🐚',mountain:'☁️',bridge:'🌉',volcano:'🔥',dino:'🦖',adventure:'⭐'};
export default function BlueBotActivity({onBack}){
 const [level,setLevel]=useState('');const [index,setIndex]=useState(0);const [sequence,setSequence]=useState([]);const [position,setPosition]=useState(null);const [running,setRunning]=useState(false);const [feedback,setFeedback]=useState('Elige tu edad para comenzar.');const [completed,setCompleted]=useState([]);const [showHint,setShowHint]=useState(false);const [finished,setFinished]=useState(false);
 const challenge=level?LEVELS[level].challenges[index]:null;
 useEffect(()=>{if(challenge){setPosition([...challenge.start]);setSequence([]);setFeedback('¡Vamos a programar! Elige las flechas.');setShowHint(false);setFinished(false);}},[level,index]);
 const addCommand=id=>{if(running||finished)return;if(sequence.length>=challenge.commands){setFeedback(`Este reto permite ${challenge.commands} movimientos.`);return;}setSequence(s=>[...s,id]);setFeedback('¡Flecha agregada! Continúa tu recorrido.');};
 const removeLast=()=>{if(running)return;setSequence(s=>s.slice(0,-1));setFeedback('Quitaste la última flecha.');};
 const reset=()=>{if(!challenge||running)return;setPosition([...challenge.start]);setSequence([]);setFeedback('Recorrido limpio. ¡Inténtalo otra vez!');setFinished(false);};
 const execute=async()=>{if(!challenge||running)return;if(!sequence.length){setFeedback('Primero elige las flechas.');return;}setRunning(true);let p=[...challenge.start];setPosition([...p]);setFeedback('¡El robot está siguiendo tu programa!');for(const command of sequence){await wait(430);const [dr,dc]=STEP[command];const next=[p[0]+dr,p[1]+dc];if(next[0]>=0&&next[0]<5&&next[1]>=0&&next[1]<5)p=next;setPosition([...p]);}await wait(200);setRunning(false);if(p[0]===challenge.target[0]&&p[1]===challenge.target[1]){setFinished(true);setCompleted(old=>old.includes(`${level}-${index}`)?old:[...old,`${level}-${index}`]);setFeedback('🎉 ¡MUY BIEN! ¡LO LOGRASTE! El robot llegó a su destino.');await wait(1800);if(index<LEVELS[level].challenges.length-1){setFeedback('¡Excelente trabajo! Vamos al siguiente reto.');setIndex(i=>i+1);}else{setFeedback('🏆 ¡FELICITACIONES! ¡Completaste los 10 retos de este nivel!');await wait(1200);setLevel('');setIndex(0);}}else setFeedback('Aún no llegaste. Revisa el orden de las flechas e inténtalo otra vez.');};
 const next=()=>{if(index<LEVELS[level].challenges.length-1)setIndex(i=>i+1);else{setLevel('');setIndex(0);setFeedback('¡Completaste los 10 retos de este nivel!');}};
 const directionArrow=sequence.length?COMMANDS.find(c=>c.id===sequence[Math.max(0,sequence.length-1)])?.symbol:'↑';
 return <section className="bluebotPage">
  <div className="bluebotHeader"><button className="soft" onClick={level?()=>{setLevel('');setIndex(0);}:onBack}>← Volver</button><div><span>🐝</span><div><h2>Aprendo a programar</h2><p>Preparación para Blue-Bot</p></div></div><span className="bluebotTag">30 retos · 3 niveles</span></div>
  {!level?<><div className="bluebotIntro"><div><h2>¡Ayuda al robot a encontrar su camino!</h2><p>Elige una flecha por cada movimiento: adelante, atrás, izquierda o derecha. ¡Programa y ejecuta!</p></div><div className="bigBee">🐝</div></div><div className="ageGrid">{Object.entries(LEVELS).map(([id,l])=><button key={id} className="ageCard" style={{'--level-color':l.color}} onClick={()=>{setLevel(id);setIndex(0);}}><span className="ageEmoji">{l.emoji}</span><strong>{l.subtitle}</strong><b>{l.title}</b><small>{l.description}</small><span className="ageStart">Comenzar retos →</span><span className="ageProgress">{completed.filter(x=>x.startsWith(id+'-')).length} de 10 retos completados</span></button>)}</div><div className="bluebotNote"><b>¿Cómo se juega?</b><span>1. Mira dónde está el robot y dónde debe llegar.</span><span>2. Elige las flechas en el orden correcto.</span><span>3. Pulsa «Ejecutar» y observa cada movimiento.</span></div></>:<>
   <div className="levelBanner" style={{'--level-color':LEVELS[level].color}}><div><small>NIVEL {level} AÑOS · RETO {index+1} DE 10</small><h2>{LEVELS[level].title}</h2><p>{challenge.title} · {LEVELS[level].description}</p></div><div className="levelBadge">{LEVELS[level].emoji}</div></div>
   <div className="bluebotWorkspace"><div className="bluebotBoardWrap"><div className="boardCaption"><b>¡Lleva al robot hasta {challenge.targetEmoji}!</b><span>Cuadrícula de 5 × 5</span></div><div className={`bluebotBoard scene-${challenge.scene}`}>{Array.from({length:25},(_,i)=>{const r=Math.floor(i/5),c=i%5,isRobot=position?.[0]===r&&position?.[1]===c,isTarget=challenge.target[0]===r&&challenge.target[1]===c;return <div key={i} className={`bluebotCell ${isTarget?'targetCell':''} ${isRobot?'robotCell':''}`}>{isTarget&&<span className="targetEmoji">{challenge.targetEmoji}</span>}{isRobot&&<span className="robotEmoji">🐝<small>{directionArrow}</small></span>}</div>;})}</div><div className={`bluebotFeedback ${finished?'success':''}`}>{finished?'⭐':running?'🤖':'💡'} {feedback}</div></div>
    <div className="bluebotControls"><div className="instructionTitle"><b>1. Elige las flechas</b><span>{sequence.length}/{challenge.commands}</span></div><div className="commandGrid">{COMMANDS.map(cmd=><button key={cmd.id} title={cmd.label} aria-label={cmd.label} className={`commandButton ${cmd.color}`} onClick={()=>addCommand(cmd.id)} disabled={running||finished||sequence.length>=challenge.commands}><span>{cmd.symbol}</span><b>{cmd.label}</b></button>)}</div>
     <div className="sequenceTitle"><b>2. Tu recorrido</b><small>Orden de movimientos</small></div><div className="sequenceList">{sequence.length?sequence.map((id,i)=>{const cmd=COMMANDS.find(c=>c.id===id);return <div className="sequenceItem" key={`${i}-${id}`}><small>{i+1}</small><b>{cmd.symbol}</b><span>{cmd.label}</span></div>}):<span className="emptySequence">Tus flechas aparecerán aquí</span>}</div>
     <div className="bluebotActions"><button className="soft" onClick={removeLast} disabled={!sequence.length||running}>↶ Borrar última</button><button className="soft" onClick={reset} disabled={running}>Limpiar</button></div><button className="bluebotExecute" onClick={execute} disabled={running||finished||!sequence.length} aria-label="Ejecutar programa" title="Ejecutar programa"><span aria-hidden="true">▶</span></button><button className="hintButton" onClick={()=>setShowHint(v=>!v)}>{showHint?'Ocultar pista':'💡 Necesito una pista'}</button>{showHint&&<p className="bluebotHint">{challenge.hint}</p>}
    </div></div><div className="bluebotFooter"><span>🐝 Las flechas mueven al robot en esa dirección.</span><span>¡Completa los 10 recorridos!</span></div>
  </>}
 </section>;
}
