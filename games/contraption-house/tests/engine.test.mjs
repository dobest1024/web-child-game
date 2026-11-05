import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, endpoint } from '../levels.js';
import { simulate, trajectory } from '../engine.js';

test('all twelve authored contraptions reach the bell and earn three stars', () => {
  assert.equal(levels.length, 12);
  for (const level of levels) {
    const result = simulate(level, level.solution);
    assert.equal(result.success, true, level.name + ': ' + result.message);
    assert.equal(result.stars, 3, level.name);
    assert.ok(result.segments.length > 1);
  }
});
test('empty or missing mechanisms fail at the relevant socket', () => {
  assert.equal(simulate(levels[0], {}).success, false);
  const result = simulate(levels[0], { 0: levels[0].solution[0] });
  assert.equal(result.success, false);
  assert.equal(result.segments.length, 1);
  assert.match(result.message, /没有机关/);
});
test('wrong direction, unsupported tool and invalid direction cannot win', () => {
  for (const piece of [
    { type: 'ramp', direction: -1 },
    { type: 'fan', direction: 1 },
    { type: 'ramp', direction: 0 },
    { type: 'magic', direction: 1 },
  ])
    assert.equal(simulate(levels[0], { 0: piece }).success, false);
});
test('ramps, bridges, fans and springs have predictable distinct trajectories', () => {
  const start = [200, 200];
  assert.deepEqual(endpoint(start, { type: 'ramp', direction: 1 }), [340, 280]);
  assert.deepEqual(endpoint(start, { type: 'fan', direction: -1 }), [-10, 200]);
  assert.equal(trajectory(start, { type: 'spring', direction: 1 }, 0.5).y, 95);
  assert.deepEqual(trajectory(start, { type: 'bridge', direction: 1 }, 1), {
    x: 340,
    y: 200,
  });
});
test('collision is checked along the path rather than just endpoints', () => {
  const level = { ...levels[0], obstacles: [{ x: 120, y: 140, w: 30, h: 30 }] };
  const result = simulate(level, level.solution);
  assert.equal(result.success, false);
  assert.match(result.message, /碰到/);
  assert.ok(result.segments[0].endT < 1);
});
test('loops terminate and extra placed tools only affect efficiency star', () => {
  const level = {
    ...levels[0],
    available: ['bridge'],
    slots: [
      { x: 100, y: 100 },
      { x: 240, y: 100 },
    ],
    goal: [600, 100],
    stars: [],
  };
  const result = simulate(level, {
    0: { type: 'bridge', direction: 1 },
    1: { type: 'bridge', direction: -1 },
  });
  assert.equal(result.success, false);
  assert.match(result.message, /绕回/);
  const real = levels[2];
  const extra = {
    ...real.solution,
    [real.slots.length - 1]: { type: 'ramp', direction: 1 },
  };
  assert.equal(simulate(real, extra).success, true);
  assert.equal(simulate(real, extra).stars, 2);
});
test('missing a collectible never blocks a valid bell arrival', () => {
  const level = { ...levels[0], stars: [{ x: 800, y: 40 }] };
  const result = simulate(level, level.solution);
  assert.equal(result.success, true);
  assert.equal(result.stars, 2);
});
