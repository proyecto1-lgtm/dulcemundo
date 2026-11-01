export const SIZE = 20;

export const DIRS = {
  up: { dr: -1, dc: 0, label: 'Arriba', symbol: '↑' },
  down: { dr: 1, dc: 0, label: 'Abajo', symbol: '↓' },
  left: { dr: 0, dc: -1, label: 'Izquierda', symbol: '←' },
  right: { dr: 0, dc: 1, label: 'Derecha', symbol: '→' }
};

// Genera una distribución NUEVA para cada partida.
 // Dos dulces deben tener al menos dos casillas vacías entre ellos,
 // incluso en diagonal (distancia Chebyshev mínima de 3).
function createCandyPositions(count=20) {
  for (let attempt=0; attempt<2000; attempt++) {
    const candidates=[];
    for(let r=0;r<SIZE;r++) {
      for(let c=0;c<SIZE;c++) {
        // Evitar únicamente las casillas de salida y sus vecinas inmediatas.
        if ((r<=1 && c<=1) || (r>=SIZE-2 && c>=SIZE-2)) continue;
        candidates.push([r,c]);
      }
    }

    // Fisher-Yates con una nueva permutación completa en cada intento.
    for(let i=candidates.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
    }

    const selected=[];
    for(const [r,c] of candidates) {
      const farEnough=selected.every(([rr,cc]) =>
        Math.max(Math.abs(r-rr),Math.abs(c-cc)) >= 3
      );
      if(farEnough) selected.push([r,c]);
      if(selected.length===count) {
        // Comprobación final: la distribución devuelta siempre cumple separación.
        return new Set(selected.map(([rr,cc])=>`${rr},${cc}`));
      }
    }
  }

  // Fallback aleatorio por cuadrícula desplazada: nunca usa posiciones fijas.
  // La separación mínima se conserva aunque el algoritmo aleatorio principal falle.
  const offsetR=Math.floor(Math.random()*3);
  const offsetC=Math.floor(Math.random()*3);
  const fallback=[];
  for(let r=offsetR;r<SIZE;r+=3) {
    for(let c=offsetC;c<SIZE;c+=3) {
      if ((r<=1 && c<=1) || (r>=SIZE-2 && c>=SIZE-2)) continue;
      fallback.push([r,c]);
    }
  }
  for(let i=fallback.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [fallback[i],fallback[j]]=[fallback[j],fallback[i]];
  }
  return new Set(fallback.slice(0,count).map(([r,c])=>`${r},${c}`));
}

export function createGame() {
  const coins=createCandyPositions(20);
  const candyLayoutId=`candy-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  return {
    board: Array.from({length: SIZE}, () => Array.from({length: SIZE}, () => ({owner: 0}))),
    players: [
      {id:1,name:'Jugador 1',animal:'🐰',color:'#2689ee',pos:{r:0,c:0},facing:'down-right',coins:0},
      {id:2,name:'Jugador 2',animal:'🦁',color:'#f05b55',pos:{r:19,c:19},facing:'up-left',coins:0}
    ],
    coins, candyLayoutId, active:0, die:null, sequence:[], phase:'roll', winner:null, isDraw:false,
    lastMessage:'¡Lanza el dado para comenzar!'
  };
}
export function validateSequence(game, playerIndex, sequence) {
  const p = game.players[playerIndex];
  let {r,c} = p.pos;
  for (const direction of sequence) {
    const d = DIRS[direction];
    r += d.dr; c += d.dc;
    if (r<0 || c<0 || r>=SIZE || c>=SIZE) return {ok:false, reason:'¡Cuidado! Ese camino sale del tablero.'};
    const rival = game.players[1-playerIndex].pos;
    if (r===rival.r && c===rival.c) return {ok:false, reason:'No puedes ocupar la casilla del otro animal.'};
  }
  return {ok:true, destination:{r,c}};
}
export function applySequence(game, sequence) {
  const next = structuredClone(game);
  const playerIndex = next.active;
  const player = next.players[playerIndex];
  for (const direction of sequence) {
    const d = DIRS[direction];
    const r = player.pos.r+d.dr, c = player.pos.c+d.dc;
    player.pos = {r,c};
    player.facing = direction;
    next.board[r][c].owner = player.id;
    const key = `${r},${c}`;
    if (next.coins.has(key)) {
      next.coins.delete(key);
      player.coins += 1;
    }
  }
  // La partida termina cuando se recoge la última moneda.
  if (next.coins.size === 0) {
    const scores = next.players.map(p => {
      const territory = next.board.flat().filter(cell => cell.owner === p.id).length;
      return territory + p.coins * 5;
    });
    next.phase = 'finished';
    next.die = null;
    next.sequence = [];
    if (scores[0] > scores[1]) {
      next.winner = next.players[0].id;
      next.lastMessage = `¡Se acabaron las monedas! ${next.players[0].name} gana con ${scores[0]} puntos.`;
    } else if (scores[1] > scores[0]) {
      next.winner = next.players[1].id;
      next.lastMessage = `¡Se acabaron las monedas! ${next.players[1].name} gana con ${scores[1]} puntos.`;
    } else {
      next.winner = null;
      next.isDraw = true;
      next.lastMessage = `¡Se acabaron las monedas! La partida terminó en empate con ${scores[0]} puntos.`;
    }
    return next;
  }
  next.active = 1-playerIndex;
  next.phase = 'roll';
  next.die = null;
  next.sequence = [];
  next.lastMessage = `¡Buen recorrido! Ahora juega ${next.players[next.active].name}.`;
  return next;
}
export function scorePlayer(game, p) {
  const territory = game.board.flat().filter(cell=>cell.owner===p.id).length;
  return territory + p.coins*5;
}
