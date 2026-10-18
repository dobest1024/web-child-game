import assert from 'node:assert/strict';
import { Cube, daisyBase, puzzleFrom, randomCrossPuzzle } from '../js/cube.js';
import { ALGS, MACROS, STAGES, PUZZLES, ORDERS, fromSolved } from '../js/stages.js';
import { LEVELS } from '../js/levels.js';

// 公式本身：保留该保留的层
const solved = () => new Cube();
assert.ok(solved().moves([...ALGS.spell, ...ALGS.spell, ...ALGS.spell, ...ALGS.spell, ...ALGS.spell, ...ALGS.spell]).isSolved());
for (const k of ['right', 'left']) assert.ok(solved().moves(ALGS[k]).isFirstLayer(), k + ' keeps layer 1');
for (const k of ['oll', 'sune', 'aperm', 'uperm']) assert.ok(solved().moves(ALGS[k]).isF2L(), k + ' keeps F2L');
assert.ok(solved().moves(ALGS.sune).yellowEdgesUp() === 4, 'sune keeps yellow cross');
for (const k of ['aperm', 'uperm']) assert.ok(solved().moves(ALGS[k]).yellowCornersUp() === 4 && solved().moves(ALGS[k]).yellowEdgesUp() === 4);
assert.equal(solved().moves(ALGS.uperm).topCornerCount(), 4, 'uperm keeps corners');
// y 是整体转动：转完仍然算还原
assert.ok(solved().move('y').isSolved() && solved().moves(['y', 'R', "R'", "y'"]).isSolved());

// CFOP 公式：都不破坏前两层；F2L 小公式只动右前方的槽和顶层
for (const k of ['anti', 'holl', 'pi', 'head', 'toll', 'loll']) {
  const s = solved().moves(ALGS[k]);
  assert.ok(s.isF2L() && s.yellowEdgesUp() === 4 && s.yellowCornersUp() < 4, k + ' is an OLL corner case');
}
for (const k of ['yperm', 'ub', 'hperm', 'zperm']) {
  const s = solved().moves(ALGS[k]);
  assert.ok(s.isF2L() && s.yellowEdgesUp() === 4 && s.yellowCornersUp() === 4 && !s.isSolved(), k + ' is a PLL');
}
for (const k of ['ub', 'hperm', 'zperm']) assert.equal(solved().moves(ALGS[k]).topCornerCount(), 4, k + ' keeps corners');
for (const k of ['rur', 'ruir', 'ru2r', 'fuf', 'fuif', 'fu2f']) {
  const s = solved().moves(ALGS[k]);
  assert.ok(s.isWhiteCross() && s.pairCount() === 3, k + ' only touches the front-right slot');
}
// 小写 r：右边两层一起转，转 4 次回到原样
assert.ok(solved().moves(['r', 'r', 'r', 'r']).isSolved() && !solved().move('r').isSolved());
assert.ok(solved().moves(['r', "r'"]).isSolved());

// 跟着提示走，直到完成（stageKey 为 'full' / 'cfopFull' 时按完整挑战的顺序自动判断）
const FULL_ORDER = { full: ORDERS.beginner, cfopFull: ORDERS.cfop };
function follow(stageKey, start, limit = 80) {
  const c = start.clone();
  const order = FULL_ORDER[stageKey];
  for (let i = 0; i < limit; i++) {
    const key = order ? order.current(c) : stageKey;
    if (order ? c.isSolved() : STAGES[key].done(c)) return i;
    const h = STAGES[key].hint(c);
    assert.ok(h, `no hint at ${key} step ${i}`);
    if (h.move) c.move(h.move); else c.moves(MACROS[h.macro].alg);
  }
  assert.fail(`${stageKey} not finished in ${limit} hints`);
}

const N = Number(process.env.N || 40);
const stats = {};
const CASES = [
  ...['corners', 'middle', 'ycross', 'yface', 'ycorners', 'yedges'].map(k => [k, k]),
  ['f2l', 'f2lOne'], ['f2l', 'f2l'], ['oll4', 'oll4'], ['oll', 'oll'], ['pllc', 'pllc'], ['plle', 'plle'],
];
for (const [key, puzzle] of CASES) {
  let max = 0;
  for (let i = 0; i < N; i++) {
    const { start } = PUZZLES[puzzle]();
    assert.ok(!STAGES[key].done(start), puzzle + ' puzzle trivially done');
    max = Math.max(max, follow(key, start));
  }
  stats[puzzle] = max;
}
// 直接做十字：从完全打乱开始
for (let i = 0; i < Math.max(5, N / 4); i++) stats.crossD = Math.max(stats.crossD || 0, follow('crossD', PUZZLES.full().start));

// 小白花 / 十字也改成按状态提示
for (const sol of [['F2'], ['R'], ['U', 'F']]) follow('daisy', puzzleFrom(daisyBase(), sol).start);
for (let i = 0; i < N; i++) follow('cross', randomCrossPuzzle().start);

// 引导题
const easyCorner = fromSolved(ALGS.spell).start;
assert.ok(easyCorner.isWhiteCross() && easyCorner.cornerCount() === 3);
assert.equal(STAGES.corners.hint(easyCorner).macro, 'spell');
const easyMiddle = fromSolved(ALGS.right).start;
assert.ok(easyMiddle.isFirstLayer() && easyMiddle.middleCount() === 3);
assert.equal(STAGES.middle.hint(easyMiddle).macro, 'right');

// CFOP 引导题：提示要和关卡里讲的认图案口诀一致（直接念对应的公式）
const firstMacro = (stage, alg) => STAGES[stage].hint(fromSolved(alg).start).macro;
for (const k of ['sune', 'anti', 'holl', 'pi']) assert.equal(firstMacro('oll4', ALGS[k]), k, k + ' recognised');
for (const k of ['sune', 'anti', 'holl', 'pi', 'head', 'toll', 'loll']) assert.equal(firstMacro('oll', ALGS[k]), k, k + ' recognised');
assert.equal(firstMacro('pllc', ALGS.yperm), 'yperm');
assert.equal(firstMacro('pllc', ALGS.aperm), 'aperm2');
for (const [k, id] of [['uperm', 'ua'], ['ub', 'ub'], ['hperm', 'hperm']]) assert.equal(firstMacro('plle', ALGS[k]), id, k + ' recognised');
assert.equal(firstMacro('f2l', ALGS.rur), 'rur');
assert.equal(firstMacro('f2l', ALGS.fuif), 'fuif');
// 「先转上面对准，再放进去」「先配对，再放进去」
const plan = (stage, start) => {
  const c = start.clone();
  const out = [];
  while (!STAGES[stage].done(c)) {
    const h = STAGES[stage].hint(c);
    out.push(h.move || h.macro);
    if (h.move) c.move(h.move); else c.moves(MACROS[h.macro].alg);
  }
  return out;
};
assert.deepEqual(plan('f2l', fromSolved(['U', ...ALGS.rur]).start), ['U', 'rur']);
assert.equal(plan('f2l', fromSolved([...ALGS.ruir, 'U', ...ALGS.rur]).start).filter(x => MACROS[x]).length, 2);

// 关卡里写死的引导题和演示，都要符合对应阶段的口诀
for (const level of LEVELS) {
  for (const step of level.steps) {
    if (step.type === 'goal' && step.stage !== 'auto' && step.puzzle !== PUZZLES.full) {
      const { start } = step.puzzle();
      assert.ok(!STAGES[step.stage].done(start), `${level.id} goal already done`);
      follow(step.stage, start);
    }
    if (step.type === 'show' && step.play) {
      const end = step.state().moves(step.play);
      const ok = level.track ? c => c.isSolved() : { l4: c => c.crossCount() === 1, l5: c => c.isFirstLayer(), l6: c => c.isF2L(), l7: c => c.yellowEdgesUp() === 4, l8: c => c.yellowCornersUp() === 4, l9: c => c.topCornerCount() === 4, l10: c => c.isSolved() }[level.id];
      assert.ok(ok(end), `${level.id} demo ends in the taught pattern`);
    }
  }
}

// 完整挑战：随机打乱，从头按提示还原
const FULL_N = Math.max(5, Math.floor(N / 4));
for (const key of ['full', 'cfopFull']) {
  const t0 = performance.now();
  let max = 0;
  for (let i = 0; i < FULL_N; i++) max = Math.max(max, follow(key, PUZZLES.full().start, 400));
  stats[key] = max;
  stats[key + 'AvgMs'] = Math.round((performance.now() - t0) / FULL_N);
}

console.log('all stage tests passed; max hints per stage:', stats);
