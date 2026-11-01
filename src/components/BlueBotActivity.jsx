import React,{useEffect,useMemo,useState} from 'react';

const DIRS=[{name:'Norte',dr:-1,dc:0,symbol:'↑'},{name:'Este',dr:0,dc:1,symbol:'→'},{name:'Sur',dr:1,dc:0,symbol:'↓'},{name:'Oeste',dr:0,dc:-1,symbol:'←'}];
const COMMANDS=[
 {id:'forward',label:'Avanzar',symbol:'↑',color:'blue'},
 {id:'back',label:'Retroceder',symbol:'↓',color:'blue'},
 {id:'left',label:'Girar izquierda',symbol:'↶',color:'purple'},
 {id:'right',label:'Girar derecha',symbol:'↷',color:'purple'}
];
const LEVELS={
 '3':{title:'Pequeños exploradores',subtitle:'3 años',description:'Conoce las flechas y da una instrucción a la vez.',emoji:'🐣',color:'#ffd978',challenges:[
  {title:'¡Un paso adelante!',start:[3,1],dir:0,target:[2,1],hint:'El robot mira hacia arriba. ¿Qué botón lo hace avanzar?',commands:1},
  {title:'Vamos hacia atrás',start:[2,2],dir:0,target:[3,2],hint:'El robot está mirando hacia arriba. Para ir hacia atrás, usa la flecha de retroceder.',commands:1},
  {title:'Gira y avanza',start:[3,1],dir:1,target:[3,2],hint:'El robot mira hacia la derecha. Avanza una casilla.',commands:1}
 ]},
 '4':{title:'Constructores de caminos',subtitle:'4 años',description:'Ordena dos o tres instrucciones para llegar al caramelo.',emoji:'🐝',color:'#9ee5c4',challenges:[
  {title:'Camino cortito',start:[4,1],dir:0,target:[2,1],hint:'Programa dos avances seguidos.',commands:2},
  {title:'Gira a la derecha',start:[3,1],dir:0,target:[2,2],hint:'Avanza una casilla, gira a la derecha y avanza otra.',commands:3},
  {title:'Rumbo al caramelo',start:[4,0],dir:0,target:[2,2],hint:'Avanza dos casillas, gira a la derecha y avanza dos.',commands:5}
 ]},
 '5':{title:'Pequeños programadores',subtitle:'5 años',description:'Planifica rutas, combina giros y corrige tus instrucciones.',emoji:'🚀',color:'#c9b5ff',challenges:[
  {title:'Ruta en forma de L',start:[4,0],dir:0,target:[2,2],hint:'Avanza dos, gira a la derecha y avanza dos.',commands:5},
  {title:'Rodea el camino',start:[4,3],dir:0,target:[1,1],hint:'Piensa en una ruta: avanza, gira a la izquierda y continúa hacia el caramelo.',commands:6},
  {title:'¡Planifica tu recorrido!',start:[4,4],dir:3,target:[1,2],hint:'El robot empieza mirando a la izquierda. Combina avances y giros para llegar.',commands:6}
 ]}
};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export default function BlueBotActivity({onBack}){
 const [level,setLevel]=useState('');
 const [index,setIndex]=useState(0);
 const [sequence,setSequence]=useState([]);
 const [position,setPosition]=useState(null);
 const [direction,setDirection]=useState(0);
 const [running,setRunning]=useState(false);
 const [feedback,setFeedback]=useState('Elige tu edad para comenzar.');
 const [completed,setCompleted]=useState([]);
 const [showHint,setShowHint]=useState(false);
 const [finished,setFinished]=useState(false);
 const challenge=level?LEVELS[level].challenges[index]:null;
 const targetKey=challenge?challenge.target.join('-'):'';
 const posKey=position?position.join('-'):'';
 useEffect(()=>{if(challenge){setPosition([...challenge.start]);setDirection(challenge.dir);setSequence([]);setFeedback('¡Vamos a programar! Elige las instrucciones.');setShowHint(false);setFinished(false);}},[level,index]);
 const addCommand=id=>{if(running||finished)return;const max=challenge?.commands||1;if(sequence.length>=max){setFeedback(`Este reto permite ${max} instrucción${max===1?'':'es'}.`);return;}setSequence(s=>[...s,id]);setFeedback('Instrucción agregada. ¡Sigue programando!');};
 const removeLast=()=>{if(running)return;setSequence(s=>s.slice(0,-1));setFeedback('Quitaste la última instrucción.');};
 const reset=()=>{if(!challenge||running)return;setPosition([...challenge.start]);setDirection(challenge.dir);setSequence([]);setFeedback('Recorrido borrado. Puedes intentarlo otra vez.');setFinished(false);};
 const execute=async()=>{
  if(!challenge||running)return;
  if(!sequence.length){setFeedback('Primero elige al menos una instrucción.');return;}
  setRunning(true);setPosition([...challenge.start]);setDirection(challenge.dir);setFeedback('¡El robot está siguiendo tus instrucciones!');
  let p=[...challenge.start],d=challenge.dir;
  for(const command of sequence){
   await wait(520);
   if(command==='left')d=(d+3)%4;
   else if(command==='right')d=(d+1)%4;
   else {const sign=command==='back'?-1:1;const next=[p[0]+DIRS[d].dr*sign,p[1]+DIRS[d].dc*sign];if(next[0]>=0&&next[0]<5&&next[1]>=0&&next[1]<5)p=next;}
   setPosition([...p]);setDirection(d);
  }
  await wait(250);setRunning(false);
  if(p[0]===challenge.target[0]&&p[1]===challenge.target[1]){
   setFinished(true);setCompleted(old=>old.includes(`${level}-${index}`)?old:[...old,`${level}-${index}`]);setFeedback('¡Muy bien! ¡Llegaste al caramelo!');
  }else setFeedback('Todavía no llegaste al caramelo. Revisa tus flechas e inténtalo otra vez.');
 };
 const next=()=>{if(index<LEVELS[level].challenges.length-1){setIndex(i=>i+1);}else{setLevel('');setIndex(0);setFeedback('¡Nivel completado! Puedes elegir otro nivel.');}};
 const directionArrow=DIRS[direction].symbol;
 return <section className="bluebotPage">
  <div className="bluebotHeader"><button className="soft" onClick={level?()=>{setLevel('');setIndex(0);}:onBack}>← Volver</button><div><span>🤖</span><div><h2>Aprendo a programar</h2><p>Preparación para Blue-Bot</p></div></div><span className="bluebotTag">Misión de aprendizaje</span></div>
  {!level?<>
   <div className="bluebotIntro"><div><h2>¡Vamos a darle instrucciones al robot!</h2><p>Aprende a avanzar, retroceder y girar. Elige tu edad para comenzar con retos a tu medida.</p></div><div className="bigBee">🐝</div></div>
   <div className="ageGrid">{Object.entries(LEVELS).map(([id,l])=><button key={id} className="ageCard" style={{'--level-color':l.color}} onClick={()=>{setLevel(id);setIndex(0);}}><span className="ageEmoji">{l.emoji}</span><strong>{l.subtitle}</strong><b>{l.title}</b><small>{l.description}</small><span className="ageStart">Comenzar retos →</span><span className="ageProgress">{completed.filter(x=>x.startsWith(id+'-')).length} de 3 retos completados</span></button>)}</div>
   <div className="bluebotNote"><b>¿Cómo se juega?</b><span>1. Observa dónde está el robot y dónde está el caramelo.</span><span>2. Elige las flechas para crear una secuencia.</span><span>3. Pulsa «Ejecutar» y observa el recorrido.</span></div>
  </>:<>
   <div className="levelBanner" style={{'--level-color':LEVELS[level].color}}><div><small>NIVEL {level} AÑOS · RETO {index+1} DE 3</small><h2>{LEVELS[level].title}</h2><p>{challenge.title} · {LEVELS[level].description}</p></div><div className="levelBadge">{LEVELS[level].emoji}</div></div>
   <div className="bluebotWorkspace">
    <div className="bluebotBoardWrap"><div className="boardCaption"><b>Ayuda al robot a llegar al caramelo</b><span>Cuadrícula de 5 × 5</span></div><div className="bluebotBoard">{Array.from({length:25},(_,i)=>{const r=Math.floor(i/5),c=i%5,isRobot=position?.[0]===r&&position?.[1]===c,isTarget=challenge.target[0]===r&&challenge.target[1]===c;return <div key={i} className={`bluebotCell ${isTarget?'targetCell':''} ${isRobot?'robotCell':''}`}>{isTarget&&<span className="targetEmoji">🍬</span>}{isRobot&&<span className="robotEmoji">🐝<small>{directionArrow}</small></span>}</div>;})}</div><div className={`bluebotFeedback ${finished?'success':''}`}>{finished?'⭐':running?'🤖':'💡'} {feedback}</div></div>
    <div className="bluebotControls"><div className="instructionTitle"><b>1. Elige las instrucciones</b><span>{sequence.length}/{challenge.commands}</span></div><div className="commandGrid">{COMMANDS.map(cmd=><button key={cmd.id} className={`commandButton ${cmd.color}`} onClick={()=>addCommand(cmd.id)} disabled={running||finished||sequence.length>=challenge.commands}><span>{cmd.symbol}</span><b>{cmd.label}</b></button>)}</div>
     <div className="sequenceTitle"><b>2. Tu programa</b><small>Orden de las instrucciones</small></div><div className="sequenceList">{sequence.length?sequence.map((id,i)=>{const cmd=COMMANDS.find(c=>c.id===id);return <div className="sequenceItem" key={`${i}-${id}`}><small>{i+1}</small><b>{cmd.symbol}</b><span>{cmd.label}</span></div>}):<span className="emptySequence">Tus flechas aparecerán aquí</span>}</div>
     <div className="bluebotActions"><button className="soft" onClick={removeLast} disabled={!sequence.length||running}>↶ Borrar última</button><button className="soft" onClick={reset} disabled={running}>Limpiar</button></div><button className="primary bluebotExecute" onClick={execute} disabled={running||finished||!sequence.length}>▶ EJECUTAR PROGRAMA</button>
     <button className="hintButton" onClick={()=>setShowHint(v=>!v)}>{showHint?'Ocultar pista':'💡 Necesito una pista'}</button>{showHint&&<p className="bluebotHint">{challenge.hint}</p>}
     {finished&&<button className="primary nextChallenge" onClick={next}>{index===2?'Elegir otro nivel':'Siguiente reto →'}</button>}
    </div>
   </div>
   <div className="bluebotFooter"><span>🐝 El robot comienza mirando {DIRS[challenge.dir].name.toLowerCase()}.</span><span>Completa el recorrido para superar el reto.</span></div>
  </>}
 </section>;
}
