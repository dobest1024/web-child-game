import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, themes } from '../levels.js';
import { WEIGHT_VALUES, itemsTotal, emptyState, isSolved } from '../engine.js';

test('20 关分成三段难度：3 关水果称重、10 关动物称重、7 关双物体', () => {
  assert.equal(levels.length, 20);
  assert.equal(themes.length, 3);
  assert.deepEqual(
    levels.map((level) => level.theme),
    [...Array(3).fill(0), ...Array(10).fill(1), ...Array(7).fill(2)],
  );
  for (const theme of themes) {
    assert.ok(theme.name && theme.icon && theme.story);
  }
});

test('每一关字段齐全，库存只用四种规格且至少有一块砝码', () => {
  for (const level of levels) {
    assert.ok(level.name.length >= 2, level.name);
    assert.ok(level.sign.length >= 8, level.name);
    if (level.theme !== 1) assert.ok(level.sign.includes('克'), level.name);
    assert.ok(level.tag && level.hint, level.name);
    assert.ok(
      Number.isInteger(level.threeStar) && level.threeStar >= 1,
      level.name,
    );
    for (const [value, count] of Object.entries(level.stock)) {
      assert.ok(WEIGHT_VALUES.includes(Number(value)), level.name);
      assert.ok(Number.isInteger(count) && count >= 0, level.name);
    }
    assert.ok(
      Object.values(level.stock).reduce((sum, count) => sum + count, 0) >= 1,
      level.name,
    );
    assert.ok(level.left.length >= 1, level.name);
    for (const item of [...level.left, ...level.right]) {
      assert.ok(item.name && item.icon, level.name);
      assert.ok(Number.isInteger(item.weight) && item.weight > 0, level.name);
      assert.equal(item.weight % 10, 0, `${level.name} 的重量应为 10 的倍数`);
    }
  }
});

test('第一段：水果重量明示；第二段：动物体重保密且不能太小', () => {
  for (const level of levels.slice(0, 3)) {
    assert.equal(level.left.length, 1, level.name);
    assert.equal(level.right.length, 0, level.name);
    assert.equal(level.left[0].hidden, undefined, level.name);
    assert.ok(
      level.left[0].weight >= 200 && level.left[0].weight <= 600,
      level.name,
    );
  }
  for (const level of levels.slice(3, 13)) {
    assert.equal(level.left.length, 1, level.name);
    assert.equal(level.right.length, 0, level.name);
    assert.equal(level.left[0].hidden, true, level.name);
    assert.ok(
      level.left[0].weight >= 100 && level.left[0].weight <= 700,
      level.name,
    );
    assert.ok(level.threeStar >= 3, `${level.name} 的三星阈值应至少 3 块`);
  }
});

test('第三段：至少一个重量保密，第 15 关起左右盘都有物体且开局不平衡', () => {
  for (const level of levels.slice(13)) {
    assert.ok(
      [...level.left, ...level.right].some((item) => item.hidden),
      level.name,
    );
    assert.notEqual(
      itemsTotal(level.left),
      itemsTotal(level.right),
      `${level.name} 开局不应平衡`,
    );
    assert.equal(isSolved(level, emptyState(level.stock)), false, level.name);
  }
  for (const level of levels.slice(14)) {
    assert.ok(level.left.length >= 1 && level.right.length >= 1, level.name);
  }
});

test('第三段等式成立：把隐藏重量代入任务牌关系后两边守恒', () => {
  // 苹果 = 2 × 50；西瓜 = 菠萝 + 150；哈密瓜 = 2 × 150 + 100；
  // 大西瓜 = 2 × 300；南瓜 = 菠萝 + 160；苹果 − 梨 = 100；
  // 大西瓜 = 2 × 300 + 50。
  const relations = {
    香蕉和苹果: (level) => level.left[0].weight === 2 * 50,
    西瓜和菠萝: (level) =>
      level.left[0].weight - level.right[0].weight === 150,
    哈密瓜配芒果: (level) =>
      level.right[0].weight === 2 * 150 + 100,
    西瓜的两倍: (level) => level.left[0].weight === 2 * 300,
    南瓜和菠萝: (level) =>
      level.left[0].weight - level.right[0].weight === 160,
    苹果和梨: (level) =>
      level.left[0].weight + level.right[0].weight === 500 &&
      level.left[0].weight - level.right[0].weight === 100,
    厨房大挑战: (level) =>
      level.left[0].weight === 2 * 300 + 50,
  };
  for (const level of levels.slice(13)) {
    const check = relations[level.name];
    assert.ok(check, `${level.name} 缺少等式校验`);
    assert.ok(check(level), `${level.name} 的等式不成立`);
  }
});
