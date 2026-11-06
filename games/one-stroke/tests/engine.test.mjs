import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, themes } from '../levels.js';
import {
  edgeKey,
  edgeIndexOf,
  degrees,
  oddNodes,
  isConnected,
  startNodes,
  canStart,
  move,
  walkedEdges,
  nextOptions,
  isComplete,
  isStuck,
  findTrail,
  hint,
  score,
} from '../engine.js';

test('all 20 levels are connected, Euler-valid and free of bad edges', () => {
  assert.equal(levels.length, 20);
  levels.forEach((level, index) => {
    assert.equal(level.id, index, level.name);
    assert.equal(level.points.length >= 6, true, level.name);
    assert.ok(isConnected(level), level.name);
    const odd = oddNodes(level);
    assert.ok(
      [0, 2].includes(odd.length),
      `${level.name}: ${odd.length} 个奇度点`,
    );
    assert.equal(degrees(level).length, level.points.length, level.name);
    assert.equal(themes[level.theme].name.length > 0, true, level.name);
    const seen = new Set();
    for (const [a, b] of level.edges) {
      assert.ok(
        a >= 0 && a < level.points.length && b >= 0 && b < level.points.length,
        level.name,
      );
      assert.notEqual(a, b, level.name);
      assert.ok(!seen.has(edgeKey(a, b)), `${level.name}: 重复边 ${a}-${b}`);
      seen.add(edgeKey(a, b));
    }
  });
});

test('solver completes a verified Euler trail from a legal start in every level', () => {
  for (const level of levels) {
    const odd = oddNodes(level);
    const starts = startNodes(level);
    assert.equal(
      starts.length,
      odd.length === 0 ? level.points.length : 2,
      level.name,
    );
    if (odd.length)
      assert.deepEqual(
        [...starts].sort((a, b) => a - b),
        [...odd].sort((a, b) => a - b),
        level.name,
      );
    for (const start of starts) {
      const trail = findTrail(level, start);
      assert.ok(trail, `${level.name}: 从 ${start} 无解`);
      // 求解结果逐边回放：每一步都必须通过合法性判定。
      let path = [];
      for (const node of trail) {
        const result = move(level, path, node);
        assert.equal(result.ok, true, `${level.name} 第 ${path.length} 步`);
        path = result.path;
      }
      assert.equal(isComplete(level, path), true, level.name);
      assert.equal(isStuck(level, path), false, level.name);
    }
  }
});

test('every level is solvable and edges match solver usage exactly', () => {
  for (const level of levels) {
    const trail = findTrail(level, startNodes(level)[0]);
    const used = new Set();
    for (let i = 1; i < trail.length; i++) {
      const edge = edgeIndexOf(level, trail[i - 1], trail[i]);
      assert.ok(edge >= 0, level.name);
      assert.ok(!used.has(edge), level.name);
      used.add(edge);
    }
    assert.equal(used.size, level.edges.length, level.name);
  }
  // 从 2 个奇度点图的偶度点出发，findTrail 必须返回 null 而不是跳边伪路线。
  assert.equal(findTrail(levels[2], 0), null);
});

test('illegal moves are rejected: wrong start, missing edge, repeated edge', () => {
  const house = levels[2]; // 小房子：奇度点是 3（左上角）和 5（烟囱顶）
  assert.deepEqual(oddNodes(house).sort((a, b) => a - b), [3, 5]);
  assert.equal(move(house, [], 0).ok, false);
  assert.equal(move(house, [], 0).reason, 'start');
  assert.equal(canStart(house, 5), true);
  assert.equal(move(house, [], 5).ok, true);
  assert.equal(move(house, [3], 1).reason, 'no-edge'); // 3-1 之间没有小路
  assert.equal(move(house, [3, 4], 3).reason, 'walked'); // 3-4 已经画过
  assert.equal(move(house, [3, 4, 2], 4).reason, 'walked');
  const hexagon = levels[0]; // 六边形：0 个奇度点，任意点都能出发
  for (let node = 0; node < hexagon.points.length; node++)
    assert.equal(move(hexagon, [], node).ok, true, String(node));
  assert.equal(move(hexagon, [0], 2).reason, 'no-edge');
  assert.equal(move(hexagon, [0, 1], 0).reason, 'walked');
  // 合法移动返回新路径且不改原路径。
  const before = [3];
  const after = move(house, before, 0);
  assert.equal(after.ok, true);
  assert.deepEqual(before, [3]);
  assert.deepEqual(after.path, [3, 0]);
});

test('undo restores the walked set and reopens the taken edge', () => {
  const kite = levels[4]; // 小风筝：奇度点是 2 和 5
  let path = move(kite, [], 5).path;
  for (const target of [4, 2, 1]) path = move(kite, path, target).path;
  assert.deepEqual(path, [5, 4, 2, 1]);
  const before = [...walkedEdges(kite, path)].sort((a, b) => a - b);
  assert.equal(before.length, 3);
  const undone = path.slice(0, -1);
  assert.equal(walkedEdges(kite, undone).size, 2);
  assert.ok(nextOptions(kite, undone).includes(1)); // 撤回后 2→1 重新可走
  const redone = move(kite, undone, 1);
  assert.equal(redone.ok, true);
  assert.deepEqual(
    [...walkedEdges(kite, redone.path)].sort((a, b) => a - b),
    before,
  );
  // 一路撤回到空路径时，起点限制恢复。
  assert.deepEqual(walkedEdges(kite, []), new Set());
  assert.equal(move(kite, [], 0).ok, false);
});

test('walking into a dead end is detected; undo or solver escape exists', () => {
  const house = levels[2];
  // 3→4→2→5：画进烟囱顶这个死胡同，还有小路没画。
  let path = move(house, [], 3).path;
  for (const target of [4, 2, 5]) path = move(house, path, target).path;
  assert.equal(isComplete(house, path), false);
  assert.equal(isStuck(house, path), true);
  assert.deepEqual(nextOptions(house, path), []);
  const undoTip = hint(house, path);
  assert.equal(undoTip.type, 'undo');
  path = path.slice(0, -1); // 撤回一步
  assert.equal(isStuck(house, path), false);
  assert.ok(findTrail(house, path[path.length - 1], walkedEdges(house, path)));
});

test('hint follows the solver and never suggests an illegal move', () => {
  for (const level of levels) {
    const startTip = hint(level, []);
    assert.equal(startTip.type, 'start', level.name);
    assert.equal(canStart(level, startTip.node), true, level.name);
    assert.ok(findTrail(level, startTip.node), level.name);
    const first = move(level, [], startTip.node).path;
    const options = nextOptions(level, first);
    assert.ok(options.length > 0, level.name);
    // 故意走一步贪心选择，提示要么给出合法下一步，要么建议撤回。
    const path = move(level, first, options[0]).path;
    const tip = hint(level, path);
    if (tip.type === 'move') {
      const result = move(level, path, tip.node);
      assert.equal(result.ok, true, level.name);
      assert.ok(
        findTrail(level, tip.node, walkedEdges(level, result.path)),
        level.name,
      );
    } else {
      assert.equal(tip.type, 'undo', level.name);
      assert.equal(
        findTrail(level, path[path.length - 1], walkedEdges(level, path)),
        null,
        level.name,
      );
    }
  }
});

test('solver respects an already walked prefix (hint mid-drawing)', () => {
  const ship = levels[14]; // 小轮船：奇度点是 4 和 5
  assert.deepEqual(oddNodes(ship).sort((a, b) => a - b), [4, 5]);
  const prefix = move(ship, [], 4).path;
  const next = nextOptions(ship, prefix)[0];
  let path = move(ship, prefix, next).path;
  const trail = findTrail(ship, path[path.length - 1], walkedEdges(ship, path));
  assert.ok(trail, '从已画前缀的笔尖应能继续');
  for (const node of trail.slice(1)) path = move(ship, path, node).path;
  assert.equal(isComplete(ship, path), true);
});

test('stars follow the hint and undo rules', () => {
  assert.equal(score(0, 0), 3);
  assert.equal(score(0, 1), 3);
  assert.equal(score(1, 0), 2);
  assert.equal(score(1, 5), 2);
  assert.equal(score(2, 0), 1);
  assert.equal(score(3, 2), 1);
});
