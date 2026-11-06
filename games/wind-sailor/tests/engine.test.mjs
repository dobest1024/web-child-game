import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateApparentWindAngle,
  isInNoGoZone,
  calculateThrust,
  checkCollision,
  isAtDestination,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { LEVELS } from '../levels.js';

test('Wind Sailor Engine', async (t) => {
  await t.test('calculates apparent wind angle accurately', () => {
    // 船头向东 (90°)，风从西边吹来 (270°) -> 顺风 (180°)
    assert.equal(calculateApparentWindAngle(90, 270), 180);

    // 船头向东 (90°)，风从东边吹来 (90°) -> 正顶风 (0°)
    assert.equal(calculateApparentWindAngle(90, 90), 0);

    // 船头向东 (90°)，风从北边吹来 (0°) -> 侧风 (90°)
    assert.equal(calculateApparentWindAngle(90, 0), 90);
  });

  await t.test('detects No-Go Zone correctly (< 45 degrees)', () => {
    assert.ok(isInNoGoZone(90, 90)); // 0°
    assert.ok(isInNoGoZone(90, 110)); // 20°
    assert.ok(!isInNoGoZone(90, 150)); // 60°
    assert.ok(!isInNoGoZone(90, 270)); // 180°
  });

  await t.test('calculates sail thrust according to aerodynamics', () => {
    // 禁航区应产生负阻力
    assert.ok(calculateThrust(90, 90) < 0);

    // 侧风区产生强劲升力 (> 0.5)
    assert.ok(calculateThrust(90, 0) > 0.6);

    // 顺风产生正推力
    assert.ok(calculateThrust(90, 270) > 0.6);
  });

  await t.test('detects collisions and destination arrivals', () => {
    assert.ok(checkCollision(100, 100, 10, 110, 100, 10));
    assert.ok(!checkCollision(100, 100, 10, 200, 200, 10));

    assert.ok(isAtDestination(500, 100, 500, 100, 30));
    assert.ok(!isAtDestination(100, 100, 500, 100, 30));
  });

  await t.test('calculates stars and sanitizes progress', () => {
    assert.equal(calculateStars(10, 15, 0), 3);
    assert.equal(calculateStars(20, 15, 0), 2);
    assert.equal(calculateStars(10, 15, 1), 1);

    const clean = sanitizeProgress({ 1: 3, 2: '2', xyz: 4 });
    assert.equal(clean[1], 3);
    assert.equal(clean[2], 2);
    assert.equal(clean.xyz, undefined);
  });

  await t.test('verifies all 12 authored levels have valid physics properties', () => {
    assert.equal(LEVELS.length, 12);
    for (const lvl of LEVELS) {
      assert.ok(lvl.start && lvl.dest);
      assert.ok(lvl.wind && typeof lvl.wind.deg === 'number');
      assert.ok(lvl.parTime >= 10);
      assert.ok(Array.isArray(lvl.obstacles));
    }
  });
});
