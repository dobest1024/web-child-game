import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzles } from 'cubing/puzzles';
import { Alg } from 'cubing/alg';
import { createLayerSolver } from '../src/layer-solver.js';
import { planSmall } from '../src/small-solvers.js';
import { goalSatisfied, phaseWords, randomSetup, validJourneySave, routeWalk } from '../src/journey-model.js';
import { baseOrientation } from '../src/mechanics.js';
import knowledge from '../src/knowledge.json' with { type:'json' };
import { cfopLessons } from '../src/cfop.js';

let seed=20261018;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const layer=await createLayerSolver();
for (const puzzle of ['3x3x3','2x2x2','pyraminx']) {
  test(`${puzzle}: 500 random cubes complete every continuous teaching goal`, async()=>{
    const k=await puzzles[puzzle].kpuzzle(), target=k.defaultPattern().applyAlg(baseOrientation(puzzle));
    for(let i=0;i<500;i++) {
      let p=k.defaultPattern().applyAlg(randomSetup(puzzle,25,random));
      const phases=puzzle==='3x3x3'?layer.solve(p).stages:(await planSmall(puzzle,p.patternData)).phases;
      assert.equal(phases.length,puzzle==='3x3x3'?16:6);
      for(const phase of phases) {
        assert.ok(phaseWords(phase.id),phase.id);
        if (puzzle === '3x3x3') {
          assert.ok(phase.alg.split(' ').filter(Boolean).every(m=>/^[URFDLB](2|')?$/.test(m)), phase.alg);
        }
        assert.equal(phase.groups.map(g=>g.alg).join(' '),phase.alg);
        p=p.applyAlg(phase.alg);
        assert.ok(goalSatisfied(p,target,phase.goal),phase.id);
      }
      assert.ok(p.isIdentical(target),`${puzzle} sample ${i}`);
    }
  });
  test(`${puzzle}: planning again uses the real state after an unexpected turn`, async()=>{
    const k=await puzzles[puzzle].kpuzzle(), target=k.defaultPattern().applyAlg(baseOrientation(puzzle));
    let p=k.defaultPattern().applyAlg(randomSetup(puzzle,25,random));
    const plan=async value=>puzzle==='3x3x3'?layer.solve(value).stages:(await planSmall(puzzle,value)).phases;
    const first=(await plan(p)).find(s=>s.alg);
    p=p.applyAlg(first.alg).applyAlg("R U R'");
    const newPlan=await plan(p);
    for(const phase of newPlan) p=p.applyAlg(phase.alg);
    assert.ok(p.isIdentical(target));
  });
}
test('continuous hints converge even with repeated macro boundaries and wrong turns', async()=>{
  const k=await puzzles['3x3x3'].kpuzzle();
  for(const algorithm of ["U U R R' F2", "R U R' U' U R U' R'", "F2 F2 U U U"]) {
    const solution=algorithm.split(' '), setup=new Alg(algorithm).invert().toString();
    const history=[solution[0],"L","B","B"];
    for(let i=0;i<80;i++) {
      const walk=routeWalk(history,solution,'3x3x3');
      if(!walk.remaining.length)break;
      history.push(walk.remaining[0]);
    }
    assert.equal(routeWalk(history,solution,'3x3x3').remaining.length,0);
    assert.ok(k.defaultPattern().applyAlg(`${setup} ${history.join(' ')}`).isIdentical(k.defaultPattern()));
  }
});
test('saved journeys reject damaged data and unsupported center-changing moves',()=>{
  assert.equal(validJourneySave({puzzle:'3x3x3',setup:'z2 R U',history:["F'"]},'3x3x3'),true);
  for(const bad of [null,{}, {puzzle:'3x3x3',setup:'z2 M r',history:[]}, {puzzle:'3x3x3',setup:'R U',history:[]}, {puzzle:'3x3x3',setup:'z2 R',history:[{}]}]) assert.equal(validJourneySave(bad,'3x3x3'),false);
  assert.equal(validJourneySave({puzzle:'3x3x3',setup:'z2 F2',history:["F2'"]},'3x3x3'),true);
  assert.equal(validJourneySave({puzzle:'pyraminx',setup:"R U' u",history:['l']},'pyraminx'),true);
});
test('knowledge lessons have complete feedback, real cases and legal 3D demonstrations',async()=>{
  assert.equal(knowledge.items.length,24);
  assert.equal(new Set(knowledge.items.map(q=>q.id)).size,24);
  for(const topic of knowledge.topics) assert.equal(knowledge.items.filter(q=>q.topic===topic.id).length,4);
  for(const q of knowledge.items) {
    assert.equal(q.choices.length,3);
    assert.ok(q.answer>=0&&q.answer<3);
    for(let i=0;i<3;i++) if(i!==q.answer)assert.ok(q.wrongFeedback[i]);
    if(q.caseId)assert.ok(cfopLessons.find(s=>s.id===q.caseId));
    if(q.alg) {
      const k=await puzzles[q.puzzle].kpuzzle();
      const p=k.defaultPattern().applyAlg(new Alg(q.alg).invert());
      assert.ok(!p.isIdentical(k.defaultPattern()));
      assert.ok(p.applyAlg(q.alg).isIdentical(k.defaultPattern()));
    }
  }
});
