import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {DIRS,SIZE} from '../game/engine.js';


function makeAnimalModel(emoji, playerId) {
  const group=new THREE.Group();
  const furColors={'🐰':'#eee5d8','🦁':'#e9a33b','🐼':'#f3f1e9','🦊':'#e97832','🐘':'#8eabb8','🐢':'#63a66b'};
  const fur=furColors[emoji]||'#d9a56b';
  const mat=(color,roughness=.78)=>new THREE.MeshStandardMaterial({color,roughness});
  const bodyMat=mat(fur), darkMat=mat('#46352d'), whiteMat=mat('#fff8e9'), pinkMat=mat('#e98b9c');
  const addSphere=(parent,scale,pos,material,geo=[20,16])=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,...geo),material);
    m.scale.set(...scale);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  // Cuerpo redondeado, cabeza y hocico: geometría real, no una imagen plana.
  addSphere(group,[.34,.38,.48],[0,.55,0],bodyMat);
  const head=new THREE.Group();head.position.set(0,.93,-.24);group.add(head);
  addSphere(head,[.34,.34,.32],[0,0,0],bodyMat);
  addSphere(head,[.19,.13,.16],[0,-.09,-.24],whiteMat);
  addSphere(head,[.065,.055,.045],[0,-.065,-.38],darkMat);
  for(const x of [-.13,.13]){
    addSphere(head,[.045,.055,.035],[x,.055,-.28],whiteMat);
    addSphere(head,[.022,.03,.02],[x,-.005,-.31],darkMat);
  }
  // Rasgos distintivos de cada animal.
  if(emoji==='🐰'){
    for(const x of [-.17,.17]){const ear=addSphere(head,[.085,.27,.09],[x,.32,.02],bodyMat);ear.rotation.z=x<0?-.18:.18;addSphere(head,[.045,.20,.025],[x,.34,-.055],pinkMat);}
  } else if(emoji==='🦁'){
    addSphere(head,[.43,.42,.39],[0,.01,.02],mat('#bd7027'));
    addSphere(head,[.32,.31,.30],[0,0,-.035],bodyMat);
  } else if(emoji==='🐼'){
    for(const x of [-.19,.19])addSphere(head,[.105,.11,.08],[x,.24,0],darkMat);
    for(const x of [-.14,.14])addSphere(head,[.085,.10,.035],[x,.04,-.29],darkMat);
  } else if(emoji==='🦊'){
    for(const x of [-.17,.17]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.11,.28,5),bodyMat);ear.position.set(x,.29,0);ear.castShadow=true;head.add(ear);}
    addSphere(head,[.15,.11,.13],[0,-.12,-.31],whiteMat);
    const tail=addSphere(group,[.16,.18,.43],[-.02,.53,.48],mat('#e97832'));tail.rotation.x=-.25;
    addSphere(group,[.13,.14,.16],[-.02,.55,.82],whiteMat);
  } else if(emoji==='🐘'){
    const trunk=addSphere(head,[.09,.25,.12],[0,-.22,-.31],mat('#7896a5'));trunk.rotation.x=-.25;
    for(const x of [-.32,.32])addSphere(head,[.13,.19,.08],[x,-.02,0],mat('#a9c0c9'));
  } else if(emoji==='🐢'){
    addSphere(group,[.38,.22,.43],[0,.77,.05],mat('#397e4a'));
    addSphere(group,[.31,.13,.36],[0,.86,.05],mat('#b6a15b'));
  }
  // Cuatro patas articuladas; sus pivotes se animan durante cada paso.
  const legs=[];
  for(const x of [-.21,.21])for(const z of [-.27,.27]){
    const pivot=new THREE.Group();pivot.position.set(x,.38,z);group.add(pivot);
    addSphere(pivot,[.105,.25,.12],[0,-.12,0],bodyMat);
    addSphere(pivot,[.11,.07,.13],[0,-.24,-.015],whiteMat);
    legs.push(pivot);
  }
  // Acento de color para distinguir a cada jugador.
  const badge=new THREE.Mesh(new THREE.SphereGeometry(.09,12,10),mat(playerId===1?'#2689ee':'#f05b55'));
  badge.position.set(0,1.31,.02);badge.castShadow=true;group.add(badge);
  group.userData.legs=legs;
  group.userData.head=head;
  return group;
}

export default function Board3D({game,playerIndex=0,draft=[]}) {
  const host=useRef(null);
  const sceneRef=useRef(null);

  useEffect(()=>{
    const el=host.current;
    if(!el)return;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color('#8bd9ee');
    

    // Vista cenital ortográfica, como un tablero de damas: sin perspectiva ni inclinación.
    const aspect=Math.max(el.clientWidth,1)/Math.max(el.clientHeight,1);
    const viewSize=23;
    const camera=new THREE.OrthographicCamera(
      -viewSize*Math.max(aspect,1)/2, viewSize*Math.max(aspect,1)/2,
       viewSize/Math.max(1,1/aspect)/2, -viewSize/Math.max(1,1/aspect)/2,
      .1,100
    );
    camera.position.set(0,32,0);
    // Cada participante mira desde su propia línea de salida: su animal queda abajo
    // y el rival arriba. El jugador 1 necesita girar 180° respecto al jugador 2.
    camera.up.set(0,0,playerIndex===0?1:-1);
    camera.lookAt(0,0,0);
    const setCamera=()=>{ camera.position.set(0,32,0);camera.lookAt(0,0,0); };

    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    renderer.setSize(el.clientWidth,el.clientHeight);
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff,0x8b704c,2.1));
    const sun=new THREE.DirectionalLight(0xffffff,2.0);
    sun.position.set(-8,20,12);sun.castShadow=true;scene.add(sun);

    const floor=new THREE.Mesh(new THREE.PlaneGeometry(24,24),new THREE.MeshStandardMaterial({color:'#f5dba8',roughness:.9}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.2;floor.receiveShadow=true;scene.add(floor);

    const tileGeo=new THREE.BoxGeometry(.94,.18,.94);
    const tiles=[];
    for(let r=0;r<20;r++)for(let c=0;c<20;c++){
      const owner=game.board[r][c].owner;
      const mat=new THREE.MeshStandardMaterial({color:owner===1?'#328df0':owner===2?'#f05b55':'#fff0cf',roughness:.72});
      const tile=new THREE.Mesh(tileGeo,mat);
      tile.position.set(c-9.5,0,r-9.5);tile.receiveShadow=true;tile.castShadow=true;scene.add(tile);
      tiles.push({r,c,mat});
    }

    const coinGroup=new THREE.Group();
    scene.add(coinGroup);

    // Grupo independiente para el recorrido provisional que el estudiante va programando.
    const previewGroup=new THREE.Group();
    scene.add(previewGroup);
    const updatePreview=(moves,startPos)=>{
      previewGroup.clear();
      if(!Array.isArray(moves)||moves.length===0||!startPos)return;
      // La posición se recibe desde las props actuales en cada render.
      // No leer game.players desde esta función: este efecto conserva el game
      // inicial y provocaría que el preview naciera en la posición de salida.
      let r=startPos.r,c=startPos.c;
      const points=[new THREE.Vector3(c-9.5,.20,r-9.5)];
      const previewMat=new THREE.MeshBasicMaterial({color:'#26b85b',transparent:true,opacity:.48,depthWrite:false});
      moves.forEach(direction=>{
        const d=DIRS[direction];if(!d)return;
        const nr=r+d.dr,nc=c+d.dc;
        if(nr<0||nc<0||nr>=SIZE||nc>=SIZE)return;
        r=nr;c=nc;
        const cell=new THREE.Mesh(new THREE.BoxGeometry(.78,.055,.78),previewMat);
        cell.position.set(c-9.5,.145,r-9.5);
        cell.renderOrder=5;previewGroup.add(cell);
        points.push(new THREE.Vector3(c-9.5,.205,r-9.5));
      });
      if(points.length>1){
        const line=new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({color:'#119447',transparent:true,opacity:.95,depthTest:false})
        );
        line.renderOrder=6;previewGroup.add(line);
      }
      points.slice(1).forEach((point,index)=>{
        const marker=new THREE.Mesh(
          new THREE.SphereGeometry(.12,12,8),
          new THREE.MeshBasicMaterial({color:'#087c37',depthTest:false})
        );
        marker.position.copy(point);marker.position.y=.24;marker.renderOrder=7;previewGroup.add(marker);
      });
    };

    const animalMeshes=[];
    const walkStates=[];
    const facingArrows=[];
    const facingVector=(direction)=>{
      const vectors={
        up:new THREE.Vector3(0,0,-1),down:new THREE.Vector3(0,0,1),
        left:new THREE.Vector3(-1,0,0),right:new THREE.Vector3(1,0,0),
        'down-right':new THREE.Vector3(1,0,1).normalize(),
        'up-left':new THREE.Vector3(-1,0,-1).normalize(),
        'down-left':new THREE.Vector3(-1,0,1).normalize(),
        'up-right':new THREE.Vector3(1,0,-1).normalize()
      };
      return vectors[direction]||new THREE.Vector3(0,0,1);
    };
    game.players.forEach(p=>{
      const group=new THREE.Group();
      const shadow=new THREE.Mesh(new THREE.CircleGeometry(.48,24),new THREE.MeshBasicMaterial({color:'#5c5147',transparent:true,opacity:.22}));
      shadow.rotation.x=-Math.PI/2;shadow.position.y=.12;group.add(shadow);
      const model=makeAnimalModel(p.animal||'🐾',p.id);group.add(model);
      // Flecha flotante sobre la cabeza: apunta en la dirección real de la última flecha ejecutada.
      const arrow=new THREE.ArrowHelper(facingVector(p.facing),new THREE.Vector3(0,2.05,0),.95,p.id===1?0x1679e8:0xe34e48,.30,.22);
      arrow.line.material.depthTest=false;arrow.cone.material.depthTest=false;
      arrow.renderOrder=10;arrow.line.renderOrder=10;arrow.cone.renderOrder=10;
      group.add(arrow);facingArrows.push(arrow);
      group.position.set(p.pos.c-9.5,.15,p.pos.r-9.5);scene.add(group);animalMeshes.push(group);
      walkStates.push({from:new THREE.Vector3(group.position.x,group.position.y,group.position.z),to:new THREE.Vector3(group.position.x,group.position.y,group.position.z),started:0,duration:0,walking:false,model:group.children.find(o=>o.userData.legs),steps:[],stepIndex:0,actor:group});
    });

    const drawCoins=(coins)=>{
      const oldGeometries=new Set();
      const oldMaterials=new Set();
      coinGroup.traverse(obj=>{
        if(obj.geometry)oldGeometries.add(obj.geometry);
        if(obj.material){
          const mats=Array.isArray(obj.material)?obj.material:[obj.material];
          mats.forEach(mat=>oldMaterials.add(mat));
        }
      });
      coinGroup.clear();
      oldGeometries.forEach(geometry=>geometry.dispose());
      oldMaterials.forEach(material=>material.dispose());

      const candyColors=['#ff4f91','#ffb52e','#7b65e8','#31c6b4','#f06b48','#64a7f5'];
      const bodyGeo=new THREE.SphereGeometry(.23,20,16);
      const wrapperGeo=new THREE.ConeGeometry(.16,.28,8);
      const twistGeo=new THREE.SphereGeometry(.105,12,10);
      const shineGeo=new THREE.SphereGeometry(.055,10,8);
      const sharedMaterials=candyColors.map(color=>new THREE.MeshStandardMaterial({
        color,roughness:.3,metalness:.05
      }));
      const wrapperMats=candyColors.map(color=>new THREE.MeshStandardMaterial({
        color,roughness:.38,metalness:.02
      }));
      const shineMat=new THREE.MeshBasicMaterial({color:'#fff5d6'});
      const list=coins instanceof Set?[...coins]:(Array.isArray(coins)?coins:[]);
      list.forEach((key,index)=>{
        const [r,c]=String(key).split(',').map(Number);
        const candy=new THREE.Group();
        const colorIndex=(r*7+c*11+index)%candyColors.length;
        const body=new THREE.Mesh(bodyGeo,sharedMaterials[colorIndex]);
        body.scale.set(1,1,.82);body.position.y=.34;body.castShadow=true;candy.add(body);

        const leftWrap=new THREE.Mesh(wrapperGeo,wrapperMats[colorIndex]);
        leftWrap.rotation.z=Math.PI/2;leftWrap.position.set(-.25,.34,0);candy.add(leftWrap);
        const rightWrap=new THREE.Mesh(wrapperGeo,wrapperMats[colorIndex]);
        rightWrap.rotation.z=-Math.PI/2;rightWrap.position.set(.25,.34,0);candy.add(rightWrap);

        const leftTwist=new THREE.Mesh(twistGeo,wrapperMats[colorIndex]);
        leftTwist.position.set(-.34,.34,0);candy.add(leftTwist);
        const rightTwist=new THREE.Mesh(twistGeo,wrapperMats[colorIndex]);
        rightTwist.position.set(.34,.34,0);candy.add(rightTwist);

        const shine=new THREE.Mesh(shineGeo,shineMat);
        shine.position.set(-.07,.52,-.07);candy.add(shine);
        candy.position.set(c-9.5,0,r-9.5);
        coinGroup.add(candy);
      });
    };
    drawCoins(game.coins);

    let raf=0;
    const render=()=>{
      const now=performance.now();
      let movingActor=null;
      walkStates.forEach((w)=>{
        if(!w.model)return;
        if(w.walking){
          movingActor=w;
          const t=Math.min(1,(now-w.started)/w.duration);
          const eased=t*t*(3-2*t);
          w.actor.position.copy(w.from).lerp(w.to,eased);
          const swing=Math.sin((now-w.started)/65)*.68;
          w.model.userData.legs.forEach((leg,i)=>{leg.rotation.x=(i===0||i===3?1:-1)*swing;});
          w.model.position.y=.025+Math.abs(Math.sin((now-w.started)/65))*.075;
          if(t>=1){
            w.actor.position.copy(w.to);w.model.position.y=0;
            w.model.userData.legs.forEach(l=>l.rotation.x=0);
            w.walking=false;
            if(w.stepIndex<w.steps.length){
              w.from.copy(w.actor.position);w.to.copy(w.steps[w.stepIndex++]);
              w.started=now;w.duration=230;w.walking=true;movingActor=w;
            }
          }
        }else{
          w.model.userData.legs.forEach(l=>l.rotation.x=0);
          w.model.position.y=Math.sin(now/650)*.018;
        }
      });
      // Durante la caminata, la cámara baja y sigue al animal; al terminar vuelve a la vista cenital.
      if(movingActor){
        const p=movingActor.actor.position;
        const side=playerIndex===0?1:-1;
        const desired=new THREE.Vector3(p.x+side*3.2, p.y+11.5, p.z+side*9.5);
        camera.position.lerp(desired,.10);
        camera.up.set(0,1,0);camera.lookAt(p.x,p.y+.3,p.z);
      }else{
        const overhead=new THREE.Vector3(0,32,0);
        camera.position.lerp(overhead,.075);
        camera.up.set(0,0,playerIndex===0?1:-1);camera.lookAt(0,0,0);
      }
      renderer.render(scene,camera);
      raf=requestAnimationFrame(render);
    };
    render();

    const resize=()=>{
      if(!el.clientWidth||!el.clientHeight)return;
      const a=el.clientWidth/el.clientHeight;
      const halfH=11.7;
      const halfW=halfH*a;
      camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth,el.clientHeight);render();
    };
    const observer=new ResizeObserver(resize);observer.observe(el);
    window.addEventListener('resize',resize);
    sceneRef.current={scene,renderer,camera,tiles,animalMeshes,walkStates,facingArrows,facingVector,coinGroup,drawCoins,previewGroup,updatePreview,setCamera};
    return()=>{
      cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('resize',resize);
      scene.traverse(obj=>{
        if(obj.geometry)obj.geometry.dispose();
        if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}
      });
      renderer.dispose();if(renderer.domElement.parentNode===el)el.removeChild(renderer.domElement);
    };
  },[playerIndex]);

  useEffect(()=>{
    const s=sceneRef.current;if(!s)return;
    s.tiles.forEach(({r,c,mat})=>{
      const owner=game.board[r][c].owner;
      mat.color.set(owner===1?'#328df0':owner===2?'#f05b55':'#fff0cf');
    });
    game.players.forEach((p,i)=>{
      if(s.animalMeshes[i]){
        const mesh=s.animalMeshes[i],walk=s.walkStates[i];
        const target=new THREE.Vector3(p.pos.c-9.5,.15,p.pos.r-9.5);
        if(mesh.position.distanceTo(target)>.01){
          const path=game.lastMovedPlayer===i&&Array.isArray(game.lastMovePath)&&game.lastMovePath.length
            ?game.lastMovePath.map(step=>new THREE.Vector3(step.c-9.5,.15,step.r-9.5))
            :[target];
          walk.steps=path;walk.stepIndex=0;
          walk.from.copy(mesh.position);walk.to.copy(walk.steps[walk.stepIndex++]);
          walk.started=performance.now();walk.duration=230;walk.walking=true;
          const dx=walk.to.x-mesh.position.x,dz=walk.to.z-mesh.position.z;
          mesh.rotation.y=Math.atan2(dx,-dz);
        }
      }
      if(s.facingArrows[i])s.facingArrows[i].setDirection(s.facingVector(p.facing));
    });
    s.drawCoins(game.coins);
    s.updatePreview(draft,game.players[playerIndex]?.pos);
    s.setCamera(game.players[playerIndex]?.pos);
    s.renderer.render(s.scene,s.camera);
  },[game,draft,playerIndex]);

  return <div className="board3d fixed-view top-down-board" ref={host} aria-label="Tablero visto desde arriba, como un tablero de damas, con filas y columnas rectas"/>;
}
