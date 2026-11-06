import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '../levels.js';
import { sanitizeProgress } from '../engine.js';

test('progress cleaning keeps only valid level ids and star values', () => {
  const clean = sanitizeProgress({
    0: 3,
    1: '2',
    2: 1,
    3: 0,
    4: 4,
    5: -1,
    6: 2.5,
    7: null,
    8: 3,
    99: 3,
    '-2': 2,
    foo: 1,
    19: 3,
  });
  assert.deepEqual(clean, { 0: 3, 1: 2, 2: 1, 8: 3, 19: 3 });
});

test('bad container values fall back to an empty save', () => {
  for (const raw of [
    null,
    undefined,
    'two',
    42,
    [],
    [1, 2, 3],
    true,
    () => {},
  ])
    assert.deepEqual(sanitizeProgress(raw), {}, String(raw));
  assert.deepEqual(sanitizeProgress({}), {});
});

test('a full valid save passes through unchanged', () => {
  const full = {};
  levels.forEach((_, index) => {
    full[index] = (index % 3) + 1;
  });
  assert.deepEqual(sanitizeProgress(full), full);
  assert.equal(Object.keys(sanitizeProgress(full)).length, levels.length);
});

test('numeric string keys are accepted like JSON storage would produce', () => {
  assert.deepEqual(sanitizeProgress({ '5': 2, '6': '3' }), { 5: 2, 6: 3 });
});
