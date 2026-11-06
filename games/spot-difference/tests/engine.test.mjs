import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scenes, hintLimit, diffCount, viewBox } from '../levels.js';
import {
  applyDiff,
  applyDiffs,
  hitTest,
  shuffleDiffs,
  score,
  cleanProgress,
  isComplete,
  formatTime,
  solvedCount,
} from '../engine.js';

const leafPaths = (value, prefix = '') =>
  Object.entries(value).flatMap(([key, leaf]) =>
    leaf !== null && typeof leaf === 'object'
      ? leafPaths(leaf, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
const leafAt = (value, path) =>
  path.split('.').reduce((node, key) => node[key], value);

test('all 8 scenes list exactly six diffs with in-bounds, non-overlapping hotzones', () => {
  assert.equal(scenes.length, 8);
  for (const scene of scenes) {
    assert.equal(scene.diffs.length, diffCount, scene.name);
    for (const diff of scene.diffs) {
      assert.ok(
        ['color', 'size', 'count', 'flip', 'add', 'remove'].includes(diff.type),
        `${scene.name} ${diff.path} 的类型`,
      );
      const { x, y, r } = diff.zone;
      assert.ok(
        x - r >= 0 &&
          x + r <= viewBox.width &&
          y - r >= 0 &&
          y + r <= viewBox.height,
        `${scene.name} ${diff.path} 热区越界`,
      );
    }
    for (let i = 0; i < scene.diffs.length; i++)
      for (let j = i + 1; j < scene.diffs.length; j++) {
        const a = scene.diffs[i].zone,
          b = scene.diffs[j].zone;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        assert.ok(
          distance > a.r + b.r,
          `${scene.name}：${scene.diffs[i].path} 与 ${scene.diffs[j].path} 热区相距 ${distance.toFixed(1)}`,
        );
      }
  }
});

test('diff paths are legal: only those values change and the baseline stays intact', () => {
  for (const scene of scenes) {
    const base = scene.params;
    for (const diff of scene.diffs) {
      assert.ok(
        leafPaths(base).includes(diff.path),
        `${scene.name} 缺少路径 ${diff.path}`,
      );
      const single = applyDiff(base, diff);
      assert.notEqual(
        leafAt(single, diff.path),
        leafAt(base, diff.path),
        `${scene.name} ${diff.path} 未产生变化`,
      );
    }
    const changed = applyDiffs(base, scene.diffs);
    assert.deepEqual(
      leafPaths(changed).sort(),
      leafPaths(base).sort(),
      `${scene.name} 应用差异后结构改变`,
    );
    for (const path of leafPaths(base))
      if (!scene.diffs.some((diff) => diff.path === path))
        assert.equal(
          leafAt(changed, path),
          leafAt(base, path),
          `${scene.name} ${path} 不应变化`,
        );
    for (const diff of scene.diffs)
      assert.notEqual(
        leafAt(changed, diff.path),
        leafAt(base, diff.path),
        `${scene.name} ${diff.path} 应用全部差异后应与基线不同`,
      );
    assert.deepEqual(base, scene.params, `${scene.name} 基线参数被修改`);
  }
});

test('hotzone hit testing accepts points inside and rejects points outside', () => {
  for (const scene of scenes) {
    scene.diffs.forEach((diff, index) => {
      assert.equal(
        hitTest(scene.diffs, diff.zone.x, diff.zone.y),
        index,
        `${scene.name} ${diff.path} 圆心未命中`,
      );
      assert.equal(
        hitTest(scene.diffs, diff.zone.x + diff.zone.r - 1, diff.zone.y),
        index,
        `${scene.name} ${diff.path} 边缘内侧未命中`,
      );
    });
    let outside = null;
    for (let x = 2; x < viewBox.width && !outside; x += 6)
      for (let y = 2; y < viewBox.height && !outside; y += 6)
        if (hitTest(scene.diffs, x, y) < 0) {
          outside = [x, y];
          break;
        }
    assert.ok(outside, `${scene.name} 找不到热区外的点`);
    assert.equal(hitTest(scene.diffs, outside[0], outside[1]), -1, scene.name);
  }
  const single = [
    {
      path: 'a.b',
      type: 'color',
      value: '#123456',
      zone: { x: 100, y: 100, r: 10 },
    },
  ];
  assert.equal(hitTest(single, 109, 100), 0);
  assert.equal(hitTest(single, 100, 111), -1);
  assert.equal(hitTest(single, 0, 0), -1);
});

test('scoring: fast no-hint runs earn three stars, hints cap at two, slow runs still pass', () => {
  assert.equal(score({ usedHints: 0, seconds: 45 }), 3);
  assert.equal(score({ usedHints: 0, seconds: 90 }), 3);
  assert.equal(score({ usedHints: 0, seconds: 91 }), 2);
  assert.equal(score({ usedHints: 1, seconds: 20 }), 2);
  assert.equal(score({ usedHints: 1, seconds: 91 }), 1);
  assert.equal(score({ usedHints: 3, seconds: 300 }), 1);
  assert.equal(score({}), 2);
});

test('progress cleaning keeps only valid level ids and integer star counts', () => {
  const cleaned = cleanProgress(
    { 0: 3, 1: 2, 2: 0, 3: 4, 4: 1.5, 5: '2', 9: 2, '-1': 3, x: 2 },
    8,
  );
  assert.deepEqual(cleaned, { 0: 3, 1: 2 });
  assert.deepEqual(cleanProgress(null, 8), {});
  assert.deepEqual(cleanProgress(undefined, 8), {});
  assert.deepEqual(cleanProgress('broken', 8), {});
  assert.deepEqual(cleanProgress([3, 2], 8), {});
  assert.deepEqual(cleanProgress({ 7: 2 }, 8), { 7: 2 });
  assert.deepEqual(cleanProgress({ 7: 3 }, 7), {});
});

test('helpers expose the promised hint budget, completion and time formatting', () => {
  assert.equal(hintLimit, 3);
  assert.equal(solvedCount({ 0: 1, 3: 2 }), 2);
  assert.equal(
    isComplete({ 0: 1, 1: 2, 2: 3, 3: 1, 4: 2, 5: 3, 6: 1, 7: 2 }, 8),
    true,
  );
  assert.equal(isComplete({ 0: 1, 1: 2 }, 8), false);
  assert.equal(isComplete({}, 8), false);
  assert.equal(formatTime(75), '1:15');
  assert.equal(formatTime(90), '1:30');
  assert.equal(formatTime(0), '0:00');
});

test('zone focus order is shuffled without losing or mutating entries', () => {
  const diffs = scenes[0].diffs;
  const snapshot = JSON.stringify(diffs);
  const sequence = [0.9, 0.2, 0.5, 0.1, 0.7];
  let calls = 0;
  const order = shuffleDiffs(diffs, () => sequence[calls++ % sequence.length]);
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5],
    '洗牌后丢失了下标',
  );
  assert.equal(JSON.stringify(diffs), snapshot, '洗牌修改了原数据');
  const identity = shuffleDiffs(diffs, () => 0.99);
  assert.deepEqual(identity, [0, 1, 2, 3, 4, 5]);
  assert.notDeepEqual(order, identity, '不同随机源应产生不同顺序');
  assert.deepEqual(
    [...shuffleDiffs(diffs)].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5],
  );
});

test('logic modules never touch browser-only globals or timers', () => {
  for (const name of ['engine.js', 'levels.js', 'art.js']) {
    const source = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(
      source,
      /\b(document|window|localStorage|navigator|setTimeout|setInterval|requestAnimationFrame)\b/,
      `${name} 出现浏览器专用引用`,
    );
  }
});
