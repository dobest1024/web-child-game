import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOptimalWeighs,
  weighCoins,
  verifyAccusation,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { LEVELS } from '../levels.js';

test('Mineral Scale Engine', async (t) => {
  await t.test('calculates optimal weighs using ternary log3', () => {
    assert.equal(getOptimalWeighs(3), 1);
    assert.equal(getOptimalWeighs(8), 2);
    assert.equal(getOptimalWeighs(9), 2);
    assert.equal(getOptimalWeighs(12), 3);
    assert.equal(getOptimalWeighs(27), 3);
  });

  await t.test('simulates scale physics correctly with light fake coin', () => {
    // 假币是 2，偏轻 (fakeDelta = -1)
    const res1 = weighCoins([1], [2], 2, -1);
    assert.equal(res1, 'left-heavier'); // 1 是真的(10)，2 是假轻(9)，所以左重右轻

    const res2 = weighCoins([2], [3], 2, -1);
    assert.equal(res2, 'left-lighter'); // 2 是假轻(9)，3 是真的(10)，所以左轻右重

    const res3 = weighCoins([1], [3], 2, -1);
    assert.equal(res3, 'balanced'); // 两边都是真币(10 vs 10)，平衡
  });

  await t.test('simulates scale physics correctly with heavy fake coin', () => {
    // 假币是 5，偏重 (fakeDelta = +1)
    const res1 = weighCoins([1, 2], [3, 5], 5, 1);
    assert.equal(res1, 'left-lighter'); // 右盘有假重币，右边下沉
  });

  await t.test('verifies accusation correctly', () => {
    assert.ok(verifyAccusation(3, 3));
    assert.ok(!verifyAccusation(2, 3));
  });

  await t.test('calculates stars and sanitizes progress', () => {
    assert.equal(calculateStars(2, 2), 3);
    assert.equal(calculateStars(3, 2), 2);
    assert.equal(calculateStars(5, 2), 1);

    const clean = sanitizeProgress({ 1: 3, 2: '2', invalid: 99 });
    assert.equal(clean[1], 3);
    assert.equal(clean[2], 2);
    assert.equal(clean.invalid, undefined);
  });

  await t.test('verifies all 12 authored levels have valid coin counts and fake coin index', () => {
    assert.equal(LEVELS.length, 12);
    for (const lvl of LEVELS) {
      assert.ok(lvl.coinCount >= 3);
      assert.ok(lvl.fakeCoinIndex >= 1 && lvl.fakeCoinIndex <= lvl.coinCount);
      assert.ok(lvl.optimalWeighs >= 1 && lvl.optimalWeighs <= 3);
    }
  });
});
