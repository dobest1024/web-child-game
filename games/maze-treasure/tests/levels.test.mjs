import test from 'node:test';
import assert from 'node:assert/strict';
import {
  levels,
  generateLevel,
  parse,
  vectors,
  key,
} from '../levels.js';

// 独立于 levels.js 再写一份 BFS，用来实算最短路线并核对参考步数。
const bfsShortest = (level, from, blocked) => {
  const dist = new Map([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift();
    const [x, y] = parse(at);
    for (let d = 0; d < 4; d++) {
      if (!(level.masks[y * level.size + x] & (1 << d))) continue;
      const nx = x + vectors[d][0],
        ny = y + vectors[d][1];
      if (nx < 0 || ny < 0 || nx >= level.size || ny >= level.size) continue;
      const next = key([nx, ny]);
      if (dist.has(next) || (blocked && blocked.has(next))) continue;
      dist.set(next, dist.get(at) + 1);
      queue.push(next);
    }
  }
  return dist;
};
const popcount = (mask) => {
  let count = 0;
  while (mask) {
    count += mask & 1;
    mask >>= 1;
  }
  return count;
};
// 暴力枚举捡宝顺序（星星 + 钥匙 ≤ 6 个），求最短寻宝路线。
const optimalTour = (level) => {
  const stops = [...level.stars, ...level.keys];
  if (!stops.length) return bfsShortest(level, level.start).get(level.exit);
  const blocked = new Set([level.exit]);
  const maps = [
    bfsShortest(level, level.start, blocked),
    ...stops.map((stop) => bfsShortest(level, stop, blocked)),
  ];
  const lastLegs = stops.map((stop) => bfsShortest(level, stop).get(level.exit));
  let best = Infinity;
  const walk = (order, map, total) => {
    if (total >= best) return;
    if (order.length === stops.length) {
      best = Math.min(best, total + lastLegs[order[order.length - 1]]);
      return;
    }
    for (let i = 0; i < stops.length; i++) {
      if (order.includes(i)) continue;
      order.push(i);
      walk(order, maps[i + 1], total + map.get(stops[i]));
      order.pop();
    }
  };
  walk([], maps[0], 0);
  return best;
};

test('12 关按梯度递增：8×8 起步 1 颗星，14×14 收官，钥匙 1→3', () => {
  assert.equal(levels.length, 12);
  assert.deepEqual(
    levels.map((level) => level.size),
    [8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 14],
  );
  assert.deepEqual(
    levels.map((level) => level.keys.length),
    [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3],
  );
  assert.equal(levels[0].stars.length, 1);
  assert.equal(levels[11].size, 14);
  for (const level of levels) {
    assert.ok(
      level.stars.length >= 1 && level.stars.length <= 3,
      `第 ${level.id + 1} 关星星数应在 1-3 之间`,
    );
    assert.ok(level.par > 0 && Number.isFinite(level.par));
  }
});
test('同 seed 生成同一座迷宫，默认关卡全部可由 seed 复现', () => {
  assert.deepEqual(generateLevel(5, 99), generateLevel(5, 99));
  assert.notDeepEqual(generateLevel(5, 99), generateLevel(5, 100));
  for (let id = 0; id < levels.length; id++)
    assert.deepEqual(levels[id], generateLevel(id), `第 ${id + 1} 关`);
});
test('完美迷宫：全连通、边数 = 可走格数 - 1、门两侧掩码对称', () => {
  for (const level of levels) {
    const cells = level.size * level.size;
    let edges = 0;
    for (const mask of level.masks) edges += popcount(mask);
    assert.equal(edges / 2, cells - 1, `第 ${level.id + 1} 关边数`);
    assert.equal(bfsShortest(level, level.start).size, cells, level.name);
    for (let y = 0; y < level.size; y++)
      for (let x = 0; x < level.size; x++)
        for (let d = 0; d < 4; d++) {
          if (!(level.masks[y * level.size + x] & (1 << d))) continue;
          const nx = x + vectors[d][0],
            ny = y + vectors[d][1];
          assert.ok(nx >= 0 && ny >= 0 && nx < level.size && ny < level.size);
          assert.ok(
            level.masks[ny * level.size + nx] & (1 << ((d + 2) % 4)),
            `第 ${level.id + 1} 关 ${x},${y} 方向 ${d} 的门不对称`,
          );
        }
  }
});
test('每关的出口、星星、钥匙都可达、互不重叠、也不在起点上', () => {
  for (const level of levels) {
    const seen = bfsShortest(level, level.start);
    const spots = [level.exit, ...level.stars, ...level.keys];
    assert.equal(new Set(spots).size, spots.length, level.name);
    for (const at of spots) {
      assert.notEqual(at, level.start, level.name);
      assert.ok(seen.has(at), `第 ${level.id + 1} 关 ${at} 不可达`);
    }
    for (const at of level.keys)
      assert.equal(level.stars.includes(at), false, level.name);
  }
});
test('参考步数（3 星线）不小于 BFS 实算的最短寻宝路线', () => {
  for (const level of levels) {
    const tour = optimalTour(level);
    assert.ok(Number.isFinite(tour) && tour > 0, level.name);
    const home = bfsShortest(level, level.start).get(level.exit);
    assert.ok(home <= level.par, `第 ${level.id + 1} 关回家路 ${home} 超线`);
    assert.ok(tour <= level.par, `第 ${level.id + 1} 关寻宝路线 ${tour} 超线`);
    assert.ok(
      level.par <= Math.ceil(tour * 1.15),
      `第 ${level.id + 1} 关参考步数被抬高：${level.par} > ${tour}`,
    );
  }
});
