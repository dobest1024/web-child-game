import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, parse, vectors, key } from '../levels.js';
import { startState, canMove, move, score, sanitizeProgress } from '../engine.js';

// 找一个能一步走进 target 的相邻格，返回 { prev, direction }。
const approach = (level, target) => {
  const [tx, ty] = parse(target);
  for (let d = 0; d < 4; d++) {
    const px = tx - vectors[d][0],
      py = ty - vectors[d][1];
    if (px < 0 || py < 0 || px >= level.size || py >= level.size) continue;
    const prev = key([px, py]);
    if (canMove(level, prev, d)) return { prev, direction: d };
  }
  return null;
};

test('起点状态：站在狐狸窝，步数为 0，没有宝贝', () => {
  for (const level of levels) {
    const state = startState(level);
    assert.equal(state.at, level.start);
    assert.equal(state.steps, 0);
    assert.deepEqual(state.keys, []);
    assert.deepEqual(state.stars, []);
  }
});
test('出边界的方向必定撞墙：不动、不计步', () => {
  for (const level of levels) {
    assert.equal(canMove(level, '0,0', 0), false, level.name);
    assert.equal(canMove(level, '0,0', 3), false, level.name);
    const result = move(level, { ...startState(level), at: '0,0' }, 0);
    assert.equal(result.event, 'wall');
    assert.equal(result.state.at, '0,0');
    assert.equal(result.state.steps, 0);
  }
});
test('沿通路移动：坐标前进一格，步数 +1', () => {
  const level = levels[0];
  const state = startState(level);
  const direction = [0, 1, 2, 3].find((d) => canMove(level, state.at, d));
  assert.ok(direction !== undefined, '起点四周全是墙？');
  const result = move(level, state, direction);
  const [x, y] = parse(state.at);
  assert.equal(result.state.at, key([x + vectors[direction][0], y + vectors[direction][1]]));
  assert.equal(result.state.steps, 1);
});
test('钥匙拾取与去重：重复踩过不会多拿', () => {
  const level = levels[4];
  assert.equal(level.keys.length, 1);
  const { prev, direction } = approach(level, level.keys[0]);
  const first = move(level, { ...startState(level), at: prev }, direction);
  assert.equal(first.event, 'key');
  assert.deepEqual(first.state.keys, [level.keys[0]]);
  assert.equal(first.state.steps, startState(level).steps + 1);
  const back = move(level, first.state, (direction + 2) % 4);
  const again = move(level, back.state, direction);
  assert.equal(again.event, 'move');
  assert.deepEqual(again.state.keys, [level.keys[0]]);
});
test('星星拾取与去重：重复踩过不会多拿', () => {
  const level = levels[0];
  const { prev, direction } = approach(level, level.stars[0]);
  const first = move(level, { ...startState(level), at: prev }, direction);
  assert.equal(first.event, 'star');
  assert.deepEqual(first.state.stars, [level.stars[0]]);
  const back = move(level, first.state, (direction + 2) % 4);
  const again = move(level, back.state, direction);
  assert.equal(again.event, 'move');
  assert.deepEqual(again.state.stars, [level.stars[0]]);
});
test('钥匙不足不能通过锁门格；集齐后可以回家', () => {
  const level = levels[4];
  const { prev, direction } = approach(level, level.exit);
  const blocked = move(level, { ...startState(level), at: prev }, direction);
  assert.equal(blocked.event, 'locked');
  assert.equal(blocked.state.at, prev);
  assert.equal(blocked.state.steps, startState(level).steps);
  const opened = move(
    level,
    { ...startState(level), at: prev, keys: [...level.keys] },
    direction,
  );
  assert.equal(opened.event, 'home');
  assert.equal(opened.state.at, level.exit);
});
test('没有钥匙的关卡可以直接回家', () => {
  const level = levels[0];
  const { prev, direction } = approach(level, level.exit);
  const result = move(level, { ...startState(level), at: prev }, direction);
  assert.equal(result.event, 'home');
  assert.equal(result.state.at, level.exit);
});
test('评分：3 星 = 参考步数内 + 捡齐星星；超步数只少拿星', () => {
  const level = levels[0];
  const win = (steps, starCount) => ({
    at: level.exit,
    steps,
    keys: [],
    stars: level.stars.slice(0, starCount),
  });
  assert.equal(score(level, win(level.par, level.stars.length)), 3);
  assert.equal(score(level, win(level.par, level.stars.length - 1)), 2);
  const half = Math.ceil(level.par * 1.5);
  assert.ok(half > level.par);
  assert.equal(score(level, win(level.par + 1, level.stars.length)), 2);
  assert.equal(score(level, win(half, level.stars.length)), 2);
  assert.equal(score(level, win(half + 1, level.stars.length)), 1);
  assert.equal(
    score(level, { ...win(0, level.stars.length), at: level.start }),
    0,
  );
});
test('存档清洗：只保留已知关卡的 1-3 星', () => {
  assert.deepEqual(sanitizeProgress(null), {});
  assert.deepEqual(sanitizeProgress(undefined), {});
  assert.deepEqual(sanitizeProgress('3'), {});
  assert.deepEqual(sanitizeProgress([1, 2, 3]), {});
  assert.deepEqual(
    sanitizeProgress({ 0: 3, '1': '2', 2: 5, 3: 0, 4: true, 99: 3, '-1': 2, 11: 1 }),
    { 0: 3, 11: 1 },
  );
  assert.deepEqual(sanitizeProgress({ 5: 2, 6: 3 }), { 5: 2, 6: 3 });
});
