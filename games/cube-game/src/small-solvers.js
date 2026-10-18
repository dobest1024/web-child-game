// Staged 2×2 and Pyraminx routes from the current state.
import { Alg } from "cubing/alg";
import { puzzles } from "cubing/puzzles";
import { KPattern } from "cubing/kpuzzle";

const assert = {
  ok: (value, message="Invariant failed") => { if(!value) throw new Error(message); },
  equal: (a,b) => { if(a!==b) throw new Error(`Expected ${a} === ${b}`); },
  notEqual: (a,b,message) => { if(a===b) throw new Error(message); },
  deepEqual: (a,b) => { if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error("Orbit invariant failed"); },
};
const inverse = (alg) => new Alg(alg).invert().toString().replace(/2'/g,"2");
const movesIn = (alg) => alg.trim() ? alg.trim().split(/\s+/).length : 0;
function pack(values, base) { return values.reduce((n, x) => n * base + x, 0); }
function unpack(key, base, count) {
  const a = Array(count);
  for (let i = count - 1; i >= 0; i--) { a[i] = key % base; key = Math.floor(key / base); }
  return a;
}
function macroSet(k, algorithms, orbit) {
  const macros = [...new Set(algorithms.flatMap((a) => [a, inverse(a)]))].map((alg) => {
    const transform = k.algToTransformation(alg).transformationData[orbit];
    const destination = [];
    transform.permutation.forEach((source, target) => { destination[source] = target; });
    return { alg, inverse: inverse(alg), transform, destination };
  });
  // T permutation and double edge flip are self-inverse transformations. Show
  // the already taught formula again, not a second reverse-written spelling.
  const transformations=macros.map(m=>k.algToTransformation(m.alg));
  for(const m of macros){
    const reverse=k.algToTransformation(m.inverse);
    const canonical=transformations.findIndex(t=>t.isIdentical(reverse));
    if(canonical>=0)m.inverse=macros[canonical].alg;
  }
  return macros;
}
// Breadth first over a projected orbit coordinate. Reverse lookup returns a
// shortest macro-count route to its goal; no scramble is passed or recorded.
function makeTable(name, goal, base, count, macros, transition) {
  const before = performance.now();
  const size = base ** count;
  const parent = new Int32Array(size).fill(-1);
  const action = new Int16Array(size).fill(-1);
  const depth = new Uint8Array(size);
  const queue = new Int32Array(size);
  const goalKey = pack(goal, base);
  parent[goalKey] = goalKey;
  queue[0] = goalKey;
  let length = 1, maxDepth = 0;
  for (let head = 0; head < length; head++) {
    const key = queue[head], value = unpack(key, base, count);
    for (let i = 0; i < macros.length; i++) {
      const next = pack(transition(value, macros[i]), base);
      if (parent[next] !== -1) continue;
      parent[next] = key; action[next] = i; depth[next] = depth[key] + 1;
      maxDepth = Math.max(maxDepth, depth[next]); queue[length++] = next;
    }
  }
  return {
    metrics: { name, states: length, allocatedStates: size, macros: macros.length, maxMacroDepth: maxDepth, buildMs: +(performance.now() - before).toFixed(2), bytes: parent.byteLength + action.byteLength + depth.byteLength + queue.byteLength },
    solve(value) {
      let key = pack(value, base); const route = [];
      assert.notEqual(parent[key], -1, `${name}: projected state unreachable`);
      while (key !== goalKey) { route.push(macros[action[key]].inverse); key = parent[key]; }
      return route;
    },
  };
}
function tracked(pattern, orbit, pieceIds, orientations) {
  const data = pattern.patternData[orbit];
  return pieceIds.map((piece) => {
    const position = data.pieces.indexOf(piece);
    return position * orientations + data.orientation[position];
  });
}
function trackedTransition(orientations) {
  return (value, macro) => value.map((token) => {
    const position = Math.floor(token / orientations), orientation = token % orientations;
    const target = macro.destination[position];
    return target * orientations + (orientation + macro.transform.orientationDelta[target]) % orientations;
  });
}
function assertFixed(pattern, target, orbit, slots) {
  for (const slot of slots) {
    assert.equal(pattern.patternData[orbit].pieces[slot], target.patternData[orbit].pieces[slot]);
    assert.equal(pattern.patternData[orbit].orientation[slot], target.patternData[orbit].orientation[slot]);
  }
}
function applyStage(pattern, name, macros) {
  const alg = macros.join(" ");
  return { pattern: pattern.applyAlg(alg), stage: { name, macros, turns: movesIn(alg) } };
}

export async function createSmallSolvers() {
  const cube = await puzzles["2x2x2"].kpuzzle();
  const pyramid = await puzzles.pyraminx.kpuzzle();
  const cubeGoal = cube.defaultPattern(), pyramidGoal = pyramid.defaultPattern();
  const faceTurns = "U R F D L B".split(" ").flatMap((face) => [face, `${face}'`, `${face}2`]);
  const cubeBottom = [1,2,3,4].map(count=>makeTable(`2x2 bottom ${count} corners`, [12,15,18,21].slice(0,count),24,count,macroSet(cube,faceTurns,"CORNERS"),trackedTransition(3)));
  const sune = "R U R' U R U2 R'";
  const ollMacros = macroSet(cube,["U","U2",sune],"CORNERS");
  const cubeOrientation = makeTable("2x2 top orientation",[0,0,0,0],3,4,ollMacros,
    (value,m) => value.map((_,i) => (value[m.transform.permutation[i]] + m.transform.orientationDelta[i]) % 3));
  const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";
  const pllMacros = macroSet(cube,["U","U2",tPerm],"CORNERS");
  const cubePermutation = makeTable("2x2 top permutation",[0,1,2,3],4,4,pllMacros,
    (value,m) => value.map((_,i) => value[m.transform.permutation[i]]));
  for (const m of [...ollMacros,...pllMacros]) assertFixed(cubeGoal.applyAlg(m.alg),cubeGoal,"CORNERS",[4,5,6,7]);
  for (const m of pllMacros) assert.deepEqual(cubeGoal.applyAlg(m.alg).patternData.CORNERS.orientation,Array(8).fill(0));

  const mainFaces = ["U","B","R","L"];
  const commutators = [];
  for (let a = 0; a < 4; a++) for (let b = a+1; b<4; b++) {
    for (const sa of ["","'"]) for (const sb of ["","'"]) {
      const A=mainFaces[a]+sa,B=mainFaces[b]+sb;
      commutators.push(`${A} ${B} ${inverse(A)} ${inverse(B)}`);
    }
  }
  const pyrMacros=macroSet(pyramid,commutators,"EDGES");
  const pyrBottom=[1,2,3].map(count=>makeTable(`pyraminx bottom ${count} edges`,[4,6,8].slice(0,count),12,count,pyrMacros,trackedTransition(2)));
  const lastCycle="R U R' U R U R'";
  const lastFlip="R' L R L' U L' U' L";
  const lastMacros=macroSet(pyramid,[lastCycle,lastFlip],"EDGES");
  const pyrLast=makeTable("pyraminx last three edges",[0,2,10],12,3,lastMacros,trackedTransition(2));
  for(const m of [...pyrMacros,...lastMacros]) {
    const pattern=pyramidGoal.applyAlg(m.alg);
    assertFixed(pattern,pyramidGoal,"CORNERS",[0,1,2,3]);
    assertFixed(pattern,pyramidGoal,"CORNERS2",[0,1,2,3]);
  }
  for(const m of lastMacros) assertFixed(pyramidGoal.applyAlg(m.alg),pyramidGoal,"EDGES",[2,3,4]);

  function solveCube(initial) {
    let pattern=initial;const stages=[];
    const add=(name,macros)=>{const out=applyStage(pattern,name,macros);pattern=out.pattern;stages.push(out.stage);};
    for(let i=0;i<4;i++) {
      const slots=[4,5,6,7].slice(0,i+1);
      add(`底层第 ${i+1} 个角块：位置和朝向一起回家`,cubeBottom[i].solve(tracked(pattern,"CORNERS",slots,3)));
      assertFixed(pattern,cubeGoal,"CORNERS",slots);
    }
    add("顶面翻色：U 调整后用小鱼",cubeOrientation.solve(pattern.patternData.CORNERS.orientation.slice(0,4)));
    assertFixed(pattern,cubeGoal,"CORNERS",[4,5,6,7]);
    assert.deepEqual(pattern.patternData.CORNERS.orientation,Array(8).fill(0));
    add("顶角换位：U 调整后用 T 交换",cubePermutation.solve(pattern.patternData.CORNERS.pieces.slice(0,4)));
    assert.ok(pattern.isIdentical(cubeGoal));
    return {pattern,stages};
  }
  function solvePyramid(initial) {
    let pattern=initial;const stages=[];
    const add=(name,macros)=>{const out=applyStage(pattern,name,macros);pattern=out.pattern;stages.push(out.stage);};
    const tips=[];
    for(let i=0;i<4;i++) {
      const delta=(pattern.patternData.CORNERS.orientation[i]-pattern.patternData.CORNERS2.orientation[i]+3)%3;
      if(delta) tips.push(mainFaces[i].toLowerCase()+(delta===2?"'":""));
    }
    add("四个小尖角：对齐各自轴角",tips);
    assert.deepEqual(pattern.patternData.CORNERS.orientation,pattern.patternData.CORNERS2.orientation);
    const axes=[];
    for(let i=0;i<4;i++) {const orientation=pattern.patternData.CORNERS.orientation[i];if(orientation) axes.push(mainFaces[i]+(orientation===1?"'":""));}
    add("四个轴角：三色中心归位",axes);
    assertFixed(pattern,pyramidGoal,"CORNERS",[0,1,2,3]);assertFixed(pattern,pyramidGoal,"CORNERS2",[0,1,2,3]);
    for(let i=0;i<3;i++) {
      const slots=[2,3,4].slice(0,i+1);
      add(`底面第 ${i+1} 条棱：用四步开关门送回家`,pyrBottom[i].solve(tracked(pattern,"EDGES",slots,2)));
      assertFixed(pattern,pyramidGoal,"EDGES",slots);
    }
    add("最后三棱：三循环或双翻棱",pyrLast.solve(tracked(pattern,"EDGES",[0,1,5],2)));
    assert.ok(pattern.isIdentical(pyramidGoal));
    return {pattern,stages};
  }
  return {cube,pyramid,solveCube,solvePyramid,tables:[...cubeBottom,cubeOrientation,cubePermutation,...pyrBottom,pyrLast].map(x=>x.metrics),macros:{cubeOLL:ollMacros.map(m=>m.alg),cubePLL:pllMacros.map(m=>m.alg),pyramidBottom:pyrMacros.map(m=>m.alg),pyramidLast:lastMacros.map(m=>m.alg)}};
}

let cachedSolvers;
const getSolvers=()=>cachedSolvers??=createSmallSolvers();
// Goals use the same slots/orientation vocabulary as the 3x3 prototype. A
// `tipAlignment` goal means CORNERS2 orientation equals CORNERS orientation.
const smallGoals={
  "2x2x2":[
    ...[1,2,3,4].map(count=>({id:`bottom-corners-${count}`,goal:{CORNERS:[4,5,6,7].slice(0,count)}})),
    {id:"yellow-corners",goal:{CORNERS:[4,5,6,7],cornerOrientation:[0,1,2,3]}},
    {id:"pll-corners",goal:{solved:true}},
  ],
  pyraminx:[
    {id:"tips",goal:{tipAlignment:true}},
    {id:"axes",goal:{CORNERS:[0,1,2,3],CORNERS2:[0,1,2,3]}},
    ...[1,2,3].map(count=>({id:`bottom-edges-${count}`,goal:{CORNERS:[0,1,2,3],CORNERS2:[0,1,2,3],EDGES:[2,3,4].slice(0,count)}})),
    {id:"last-edges",goal:{solved:true}},
  ],
};
function normalizeCube(pattern,k) {
  // z2's orientation array is all zero. Relabeling pieces by their target slot
  // therefore commutes with every subsequent face move, with no axis rotation.
  const target=k.defaultPattern().applyAlg("z2").patternData.CORNERS;
  const data=pattern.patternData.CORNERS;
  assert.ok(target.orientation.every(x=>x===0));
  return new KPattern(k,{CORNERS:{pieces:data.pieces.map(piece=>target.pieces.indexOf(piece)),orientation:[...data.orientation]}});
}
export async function planSmall(puzzle, suppliedPattern) {
  assert.ok(puzzle==="2x2x2"||puzzle==="pyraminx","Unsupported small puzzle");
  const solvers=await getSolvers(),k=puzzle==="2x2x2"?solvers.cube:solvers.pyramid;
  const pattern=suppliedPattern?.patternData?suppliedPattern:new KPattern(k,suppliedPattern);
  const solve=puzzle==="2x2x2"?solvers.solveCube:solvers.solvePyramid;
  const relative=puzzle==="2x2x2"?normalizeCube(pattern,k):pattern;
  const result=solve(relative);
  const phases=result.stages.map((stage,i)=>({
    ...smallGoals[puzzle][i],name:stage.name,alg:stage.macros.join(" "),
    groups:stage.macros.map(alg=>({alg})),moveCount:stage.turns,
  }));
  const target=k.defaultPattern().applyAlg(puzzle==="2x2x2"?"z2":"");
  assert.ok(pattern.applyAlg(phases.map(p=>p.alg).join(" ")).isIdentical(target));
  return {puzzle,base:puzzle==="2x2x2"?"z2":"",phases};
}
export async function smallPhaseSatisfied(puzzle,suppliedPattern,id) {
  const solvers=await getSolvers(),k=puzzle==="2x2x2"?solvers.cube:solvers.pyramid;
  const pattern=suppliedPattern?.patternData?suppliedPattern:new KPattern(k,suppliedPattern);
  const target=k.defaultPattern().applyAlg(puzzle==="2x2x2"?"z2":"");
  const goal=smallGoals[puzzle].find(p=>p.id===id)?.goal;
  assert.ok(goal,"Unknown phase");
  if(goal.solved)return pattern.isIdentical(target);
  if(goal.tipAlignment)return pattern.patternData.CORNERS.orientation.every((x,i)=>x===pattern.patternData.CORNERS2.orientation[i]);
  return Object.entries(goal).every(([orbit,slots])=>{
    if(orbit==="cornerOrientation")return slots.every(i=>pattern.patternData.CORNERS.orientation[i]===0);
    return slots.every(i=>pattern.patternData[orbit].pieces[i]===target.patternData[orbit].pieces[i]&&pattern.patternData[orbit].orientation[i]===target.patternData[orbit].orientation[i]);
  });
}

