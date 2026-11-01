import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {DIRS,SIZE} from '../game/engine.js';

function makeAnimalSprite(emoji) {
  const canvas=document.createElement('canvas');
  canvas.width=256; canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.beginPath(); ctx.arc(128,128,112,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,.96)'; ctx.fill();
  ctx.lineWidth=10; ctx.strokeStyle='#ffffff'; ctx.stroke();
  ctx.font='150px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(emoji,128,137);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.scale.set(1.05,1.05,1);
  return sprite;
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
      const sprite=makeAnimalSprite(p.animal||'🐾');sprite.position.y=1;group.add(sprite);
      // Flecha flotante sobre la cabeza: apunta en la dirección real de la última flecha ejecutada.
      const arrow=new THREE.ArrowHelper(facingVector(p.facing),new THREE.Vector3(0,2.05,0),.95,p.id===1?0x1679e8:0xe34e48,.30,.22);
      arrow.line.material.depthTest=false;arrow.cone.material.depthTest=false;
      arrow.renderOrder=10;arrow.line.renderOrder=10;arrow.cone.renderOrder=10;
      group.add(arrow);facingArrows.push(arrow);
      group.position.set(p.pos.c-9.5,.15,p.pos.r-9.5);scene.add(group);animalMeshes.push(group);
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

    const render=()=>renderer.render(scene,camera);
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
    sceneRef.current={scene,renderer,camera,tiles,animalMeshes,facingArrows,facingVector,coinGroup,drawCoins,previewGroup,updatePreview,setCamera};
    return()=>{
      observer.disconnect();window.removeEventListener('resize',resize);
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
      if(s.animalMeshes[i])s.animalMeshes[i].position.set(p.pos.c-9.5,.15,p.pos.r-9.5);
      if(s.facingArrows[i])s.facingArrows[i].setDirection(s.facingVector(p.facing));
    });
    s.drawCoins(game.coins);
    s.updatePreview(draft,game.players[playerIndex]?.pos);
    s.setCamera(game.players[playerIndex]?.pos);
    s.renderer.render(s.scene,s.camera);
  },[game,draft,playerIndex]);

  return <div className="board3d fixed-view top-down-board" ref={host} aria-label="Tablero visto desde arriba, como un tablero de damas, con filas y columnas rectas"/>;
}
