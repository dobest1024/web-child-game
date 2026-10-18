// Layer-by-layer routes from the current cube state.
import { puzzles } from 'cubing/puzzles';
import { Alg } from 'cubing/alg';
import { cfopLessons } from './cfop.js';

const inverse = (alg) => new Alg(alg).invert().toString().replace(/2'/g, '2');
const sides = ['F', 'R', 'B', 'L'];
function rotate(alg, n) {
  return alg.split(' ').map(m => {
    const i = sides.indexOf(m[0]);
    return i < 0 ? m : sides[(i+n)%4] + m.slice(1);
  }).join(' ');
}
const conjugates = (alg) => ['', 'U', 'U2', "U'"].map(u =>
  [u, alg, inverse(u)].filter(Boolean).join(' '));
function symmetric(algs) {
  const all = [...new Set(algs.flatMap(a => [a, inverse(a)]))];
  return all.map(alg => ({ alg, inverse: all.indexOf(inverse(alg)) }));
}

// A quotient coordinate tracks only named pieces. Their other neighbors are
// irrelevant to where a macro sends them. This makes every table exhaustive,
// rather than a bounded search that sometimes gives up on a random scramble.
function pieceTable(k, target, orbit, slots, macroList) {
  const definition = k.definition.orbits.find(o => o.orbitName === orbit);
  const orientations = definition.numOrientations;
  const radix = definition.numPieces * orientations;
  const powers = slots.map((_, i) => radix ** i);
  const targetOrbit = target.patternData[orbit];
  const wanted = slots.map(i => targetOrbit.pieces[i]);
  const macros = symmetric(macroList);
  const maps = macros.map(({ alg }) => {
    const t = k.algToTransformation(alg).transformationData[orbit];
    const dest = new Array(definition.numPieces);
    t.permutation.forEach((old, pos) => dest[old] = pos);
    return Array.from({ length: radix }, (_, digit) => {
      const pos = dest[Math.floor(digit / orientations)];
      return pos * orientations + (digit % orientations + t.orientationDelta[pos]) % orientations;
    });
  });
  function step(key, m) {
    let result = 0;
    for (let i=0; i<slots.length; i++) {
      result += maps[m][key % radix] * powers[i];
      key = Math.floor(key / radix);
    }
    return result;
  }
  function encode(pattern) {
    const data = pattern.patternData[orbit];
    return wanted.reduce((key, piece, i) => {
      const pos = data.pieces.indexOf(piece);
      return key + (pos * orientations + data.orientation[pos]) * powers[i];
    }, 0);
  }
  const root = encode(target), size = radix ** slots.length;
  const next = new Uint8Array(size).fill(255);
  const queue = new Uint32Array(size);
  let read = 0, write = 1;
  queue[0] = root; next[root] = 254;
  while (read < write) {
    const key = queue[read++];
    for (let m=0; m<macros.length; m++) {
      const other = step(key, m);
      if (next[other] !== 255) continue;
      next[other] = macros[m].inverse;
      queue[write++] = other;
    }
  }
  return {
    orbit, slots, states: write, bytes: next.byteLength, macros: macros.map(m=>m.alg),
    solved: p => encode(p) === root,
    solve(pattern) {
      const result = [];
      let key = encode(pattern);
      if (next[key] === 255) throw new Error(`Unreachable ${orbit}:${slots}`);
      while (key !== root) {
        const m = next[key];
        result.push(macros[m].alg); key = step(key, m);
      }
      return result;
    },
  };
}

// Top-corner twists have 27 legal states. U and Sune (plus its inverse)
// cover all of them while fixing the lower layers. Only outer faces are used,
// so a learner can request a new route after any individual turn.
function cornerOrientationTable(k, macroList) {
  const macros = symmetric(macroList);
  const transforms = macros.map(m => k.algToTransformation(m.alg).transformationData.CORNERS);
  const encode = values => values.reduce((key, value, i) => key + value * 3 ** i, 0);
  function step(key, index) {
    const values = Array.from({ length: 4 }, (_, i) => Math.floor(key / 3 ** i) % 3);
    const transform = transforms[index];
    return encode(values.map((_, i) =>
      (values[transform.permutation[i]] + transform.orientationDelta[i]) % 3));
  }
  const next = new Int16Array(81).fill(-1), queue = [0];
  next[0] = -2;
  for (let head = 0; head < queue.length; head++) {
    for (let m = 0; m < macros.length; m++) {
      const other = step(queue[head], m);
      if (next[other] !== -1) continue;
      next[other] = macros[m].inverse;
      queue.push(other);
    }
  }
  if (queue.length !== 27) throw new Error('Incomplete top-corner orientation table');
  return {
    solve(pattern) {
      let key = encode(pattern.patternData.CORNERS.orientation.slice(0, 4));
      if (next[key] === -1) throw new Error('Unreachable top-corner orientation');
      const route = [];
      while (key !== 0) {
        const m = next[key];
        route.push(macros[m].alg);
        key = step(key, m);
      }
      return route;
    },
  };
}

const sameSlots = (p,t,orbit,slots) => slots.every(i =>
  p.patternData[orbit].pieces[i] === t.patternData[orbit].pieces[i] &&
  p.patternData[orbit].orientation[i] === t.patternData[orbit].orientation[i]);
const crossDone = (p,t) => sameSlots(p,t,'EDGES',[4,5,6,7]);
const cornersDone = (p,t) => sameSlots(p,t,'CORNERS',[4,5,6,7]);
const middleDone = (p,t) => sameSlots(p,t,'EDGES',[8,9,10,11]);
const firstTwoDone = (p,t) => crossDone(p,t) && cornersDone(p,t) && middleDone(p,t);
const yellowEdges = p => [0,1,2,3].every(i => p.patternData.EDGES.orientation[i] === 0);
const yellowCorners = p => [0,1,2,3].every(i => p.patternData.CORNERS.orientation[i] === 0);

// Tiny OLL state space: try each taught case under U adjustment and accept only
// by actual orientation checks. OLL identity/permutation does not affect the goal.
function orient(pattern, target, cases, check, label) {
  if (check(pattern)) return [];
  for (const u of ['', 'U', 'U2', "U'"]) {
    for (const s of cases) {
      const alg = [u,s.alg].filter(Boolean).join(' ');
      const after = pattern.applyAlg(alg);
      if (check(after) && firstTwoDone(after,target)) return [alg];
    }
  }
  throw new Error(`No ${label} case matched`);
}

export async function createLayerSolver() {
  const k = await puzzles['3x3x3'].kpuzzle();
  const target = k.defaultPattern().applyAlg('z2');
  const faceMoves = ['U','D','F','R','B','L'].flatMap(f => [f,f+'2',f+"'"]);
  // Every trigger fixes all four cross edges at macro boundaries.
  const cornerMacros = ['U','U2',"U'", ...sides.flatMap(f => [f+" U "+f+"'", f+" U' "+f+"'"])];
  // Four side orientations, insertion and extraction, plus top alignment.
  const insert = "U R U' R' U' F' U F";
  const middleMacros = ['U','U2',"U'", ...[0,1,2,3].map(n=>rotate(insert,n))];
  const stages = [];
  for (let count=1;count<=4;count++) stages.push({
    name:`cross-${count}`, table:pieceTable(k,target,'EDGES',[4,5,6,7].slice(0,count),faceMoves),
    goal:{EDGES:[4,5,6,7].slice(0,count)},
    boundary: () => true,
  });
  for (let count=1;count<=4;count++) stages.push({
    name:`first-corners-${count}`, table:pieceTable(k,target,'CORNERS',[4,5,6,7].slice(0,count),cornerMacros),
    goal:{EDGES:[4,5,6,7],CORNERS:[4,5,6,7].slice(0,count)},
    boundary:p=>crossDone(p,target),
  });
  for (let count=1;count<=4;count++) stages.push({
    name:`middle-edges-${count}`, table:pieceTable(k,target,'EDGES',[8,9,10,11].slice(0,count),middleMacros),
    goal:{EDGES:[4,5,6,7,...[8,9,10,11].slice(0,count)],CORNERS:[4,5,6,7]},
    boundary:p=>crossDone(p,target)&&cornersDone(p,target),
  });
  const tAlg = cfopLessons.find(s=>s.id==='pll-t').alg;
  const yAlg = cfopLessons.find(s=>s.id==='pll-y').alg;
  const cornerPLL = pieceTable(k,target,'CORNERS',[0,1,2,3],['U','U2',"U'",...conjugates(tAlg),...conjugates(yAlg)]);
  // Ua/Ub conjugates generate every even edge permutation, including H/Z.
  // Avoid slice formulas here: an interrupted M turn would change the centers
  // and violate the fixed-center premise of a subsequent route request.
  const edgeAlgs = ['pll-ua','pll-ub'].map(id=>cfopLessons.find(s=>s.id===id).alg);
  const edgePLL = pieceTable(k,target,'EDGES',[0,1,2,3],edgeAlgs.flatMap(conjugates));
  const edgeCases = cfopLessons.filter(s=>['oll-line','oll-elbow','oll-dot'].includes(s.id));
  const cornerOLL = cornerOrientationTable(k, ['U', 'U2', "U'", cfopLessons.find(s=>s.id==='oll-sune').alg]);
  const tables = [...stages.map(s=>s.table),cornerPLL,edgePLL];
  const lowerGoal = {EDGES:[4,5,6,7,8,9,10,11],CORNERS:[4,5,6,7]};
  return {
    k, target,
    stats: tables.map((t,i)=>({stage:stages[i]?.name??['pll-corners','pll-edges'][i-stages.length],states:t.states,bytes:t.bytes,macroCount:t.macros.length})),
    solve(pattern) {
      const result = [];
      function apply(name, macros, check, goal) {
        for (const alg of macros) pattern=pattern.applyAlg(alg);
        if(!check(pattern)) throw new Error(`Failed boundary ${name}`);
        result.push({id:name,name,alg:macros.join(' '),macros,groups:macros.map(alg=>({alg})),goal,moveCount:macros.reduce((n,a)=>n+a.split(' ').length,0)});
      }
      for (const s of stages) apply(s.name,s.table.solve(pattern),p=>s.table.solved(p)&&s.boundary(p),s.goal);
      apply('yellow-cross',orient(pattern,target,edgeCases,yellowEdges,'yellow cross'),p=>firstTwoDone(p,target)&&yellowEdges(p),{...lowerGoal,edgeOrientation:[0,1,2,3]});
      apply('yellow-corners',cornerOLL.solve(pattern),p=>firstTwoDone(p,target)&&yellowEdges(p)&&yellowCorners(p),{...lowerGoal,edgeOrientation:[0,1,2,3],cornerOrientation:[0,1,2,3]});
      apply('pll-corners',cornerPLL.solve(pattern),p=>firstTwoDone(p,target)&&yellowEdges(p)&&yellowCorners(p)&&cornerPLL.solved(p),{...lowerGoal,CORNERS:[0,1,2,3,4,5,6,7],edgeOrientation:[0,1,2,3]});
      apply('pll-edges',edgePLL.solve(pattern),p=>p.isIdentical(target),{solved:true});
      return {stages:result, pattern};
    },
  };
}

