import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '../levels.js';
import {
  emptyState,
  placeWeight,
  removeWeight,
  clearPans,
  usedWeights,
  isSolved,
  tiltOf,
  score,
  findSolution,
  describeEquation,
  hiddenReveal,
  cleanProgress,
  createWeights,
  MAX_TILT,
} from '../engine.js';

test('全部 20 关都能用给定库存配平，三星阈值不低于最优砝码数', () => {
  assert.equal(levels.length, 20);
  for (const level of levels) {
    const solution = findSolution(level);
    assert.ok(solution, `${level.name} 无解`);
    assert.ok(solution.used >= 1, level.name);
    assert.ok(
      solution.used <= level.threeStar,
      `${level.name}：最优 ${solution.used} 块 > 三星阈值 ${level.threeStar}`,
    );
    const state = {
      box: [],
      left: solution.left.map((value, i) => ({ id: `t${i}`, value })),
      right: solution.right.map((value, i) => ({ id: `r${i}`, value })),
    };
    assert.equal(isSolved(level, state), true, level.name);
  }
});

test('前两段难度的砝码只放到右盘就够，不必压住左盘物品', () => {
  for (const level of levels.filter((item) => item.theme < 2)) {
    const solution = findSolution(level);
    assert.equal(solution.left.length, 0, level.name);
    assert.equal(
      solution.right.reduce((sum, value) => sum + value, 0),
      level.left[0].weight,
      level.name,
    );
  }
});

test('每关开局都不平衡，必须放上砝码才能过关', () => {
  for (const level of levels) {
    const state = emptyState(level.stock);
    assert.equal(isSolved(level, state), false, level.name);
    assert.equal(usedWeights(state), 0);
  }
});

test('平衡判定：左边重、右边重、恰好平衡，倾角有上下限', () => {
  const level = {
    stock: { 100: 1, 50: 2 },
    left: [{ name: '喵喵', icon: '🐱', weight: 100 }],
    right: [],
    threeStar: 1,
  };
  let state = emptyState(level.stock);
  assert.equal(tiltOf(level, state).side, 'left');
  state = placeWeight(state, 'right', 'w100-0');
  assert.equal(isSolved(level, state), true);
  assert.deepEqual(tiltOf(level, state), { side: null, deg: 0 });
  state = placeWeight(state, 'right', 'w50-0');
  assert.equal(tiltOf(level, state).side, 'right');
  assert.ok(tiltOf(level, state).deg > 0);
  const huge = {
    stock: {},
    left: [{ name: '山', icon: '⛰️', weight: 5000 }],
    right: [],
    threeStar: 1,
  };
  assert.equal(tiltOf(huge, emptyState({})).deg, MAX_TILT);
  const tiny = {
    stock: {},
    left: [{ name: '羽毛', icon: '🪶', weight: 10 }],
    right: [],
    threeStar: 1,
  };
  assert.equal(tiltOf(tiny, emptyState({})).deg, 3);
});

test('取回砝码恢复库存，未知砝码的放置与取回都无效', () => {
  const level = levels[0];
  let state = emptyState(level.stock);
  const total = createWeights(level.stock).length;
  assert.equal(total, 7);
  state = placeWeight(state, 'right', 'w200-0');
  state = placeWeight(state, 'left', 'w100-0');
  assert.equal(state.box.length, total - 2);
  assert.equal(usedWeights(state), 2);
  state = removeWeight(state, 'w100-0');
  assert.equal(state.box.length, total - 1);
  assert.ok(state.box.some((weight) => weight.id === 'w100-0'));
  assert.equal(placeWeight(state, 'left', 'w200-1'), state);
  assert.equal(removeWeight(state, 'nope'), state);
  state = clearPans(state);
  assert.equal(state.box.length, total);
  assert.equal(usedWeights(state), 0);
  assert.deepEqual(
    state.box.map((w) => w.id),
    createWeights(level.stock).map((w) => w.id),
  );
});

test('评分：配平 1 星，达标砝码与一次配平各加 1 星', () => {
  const level = levels[0];
  let state = emptyState(level.stock);
  assert.equal(score(level, state, 0), 0);
  state = placeWeight(state, 'right', 'w200-0');
  state = placeWeight(state, 'right', 'w100-0');
  assert.equal(usedWeights(state), 2);
  assert.equal(score(level, state, 0), 3);
  assert.equal(score(level, state, 1), 2);
  const over = placeWeight(state, 'right', 'w50-0');
  assert.equal(isSolved(level, over), false);
  assert.equal(score(level, over, 0), 0);
});

test('结算算式：物品按数量展开，两边克数写成加法', () => {
  const level = levels[0];
  let state = placeWeight(emptyState(level.stock), 'right', 'w200-0');
  state = placeWeight(state, 'right', 'w100-0');
  assert.equal(describeEquation(level, state), '300 = 200 + 100');
  const mango = levels.find((item) => item.name === '哈密瓜配芒果');
  let mangoState = placeWeight(emptyState(mango.stock), 'left', 'w100-0');
  assert.equal(describeEquation(mango, mangoState), '150 + 150 + 100 = 400');
  assert.deepEqual(hiddenReveal(mango), ['哈密瓜重 400 克']);
  const pears = levels.find((item) => item.name === '苹果和梨');
  let pearState = placeWeight(emptyState(pears.stock), 'right', 'w100-0');
  assert.equal(describeEquation(pears, pearState), '300 = 200 + 100');
  assert.deepEqual(hiddenReveal(pears), ['苹果重 300 克', '梨重 200 克']);
});

test('存档清洗：只保留有效关卡号的 1-3 星整数', () => {
  assert.deepEqual(cleanProgress(null), {});
  assert.deepEqual(cleanProgress('oops'), {});
  assert.deepEqual(cleanProgress(42), {});
  assert.deepEqual(
    cleanProgress({
      0: 3,
      1: '2',
      2: 0,
      3: 9,
      4: 2.5,
      5: -1,
      7: 2,
      19: 1,
      x: 3,
      20: 2,
      99: 3,
    }),
    { 0: 3, 7: 2, 19: 1 },
  );
  assert.deepEqual(cleanProgress([3, 'x']), { 0: 3 });
});
