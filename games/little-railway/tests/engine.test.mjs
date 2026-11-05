import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, referenceRoutes, sandboxLevel } from '../levels.js';
import {
  extendRoute,
  evaluateRoute,
  validateRoute,
  readSandbox,
} from '../engine.js';

test('all 18 authored journeys are legal, collect all passengers and earn three stars', () => {
  assert.equal(levels.length, 18);
  for (const [i, level] of levels.entries()) {
    let route = [level.start];
    for (const point of referenceRoutes[i].slice(1)) {
      const result = extendRoute(level, route, point);
      assert.equal(result.error, undefined, `${level.name}: ${point}`);
      route = result.route;
    }
    assert.equal(validateRoute(level, route), true, level.name);
    assert.deepEqual(
      evaluateRoute(level, route),
      { success: true, stars: 3, souvenir: true, efficient: true },
      level.name,
    );
  }
});

test('rails reject gaps, water, trees and out of bounds; returning to an old cell truncates', () => {
  const level = {
    ...sandboxLevel(),
    rocks: ['1,3'],
    water: ['0,2'],
    bridges: ['0,4'],
  };
  const route = [level.start];
  for (const p of [
    [1, 3],
    [0, 2],
    [2, 3],
    [-1, 3],
    [8, 3],
  ]) {
    const result = extendRoute(level, route, p);
    assert.ok(result.error);
    assert.deepEqual(result.route, route);
  }
  const bridge = extendRoute(level, route, [0, 4]);
  assert.equal(bridge.error, undefined);
  assert.deepEqual(extendRoute(level, bridge.route, level.start).route, route);
});

test('finishing without passengers fails, while optional stars and budget never prevent completion', () => {
  const level = {
    ...sandboxLevel(),
    passengers: [{ name: '兔兔', kind: 0, at: [2, 2] }],
    tokens: [[1, 1]],
    budget: 3,
  };
  const route = Array.from({ length: 8 }, (_, x) => [x, 3]);
  assert.equal(evaluateRoute(level, route).success, false);
  assert.equal(evaluateRoute(level, route.slice(0, 4)).success, false);
  level.passengers = [];
  assert.deepEqual(evaluateRoute(level, route), {
    success: true,
    stars: 1,
    souvenir: false,
    efficient: false,
  });
  assert.ok(extendRoute(level, route, [7, 2]).error);
});

test('invalid, overlapping and disjoint routes cannot be driven', () => {
  const level = sandboxLevel();
  for (const route of [
    [],
    [[1, 3]],
    [
      [0, 3],
      [2, 3],
    ],
    [
      [0, 3],
      [1, 3],
      [0, 3],
    ],
    [
      [0, 3],
      [-1, 3],
    ],
  ]) {
    assert.equal(validateRoute(level, route), false);
    assert.equal(evaluateRoute(level, route).success, false);
  }
});

test('saved sandbox survives roundtrip and corrupt local data is rejected', () => {
  const data = {
    level: sandboxLevel(),
    route: [
      [0, 3],
      [1, 3],
    ],
  };
  assert.deepEqual(readSandbox(JSON.stringify(data)), data);
  for (const invalid of [null, '', '{', '{}', '{"level":{}}'])
    assert.equal(readSandbox(invalid), null);
  data.level.water.push('0,3');
  assert.equal(readSandbox(JSON.stringify(data)), null);
  data.level = sandboxLevel();
  data.route.push([5, 3]);
  assert.deepEqual(readSandbox(JSON.stringify(data)).route, [[0, 3]]);
});
