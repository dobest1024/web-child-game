import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMirror,
  createTarget,
  createEmitter,
  createRock,
  reflectDir,
  traceLaser,
  isLevelSolved,
  sanitizeProgress,
} from '../engine.js';
import { OPTIC_LEVELS } from '../levels.js';

test('laser-mirror engine: reflectDir 45-degree mirror', () => {
  // Angle 0: '/'
  assert.equal(reflectDir('E', 0), 'N');
  assert.equal(reflectDir('S', 0), 'W');
  assert.equal(reflectDir('W', 0), 'S');
  assert.equal(reflectDir('N', 0), 'E');

  // Angle 1: '\'
  assert.equal(reflectDir('E', 1), 'S');
  assert.equal(reflectDir('N', 1), 'W');
  assert.equal(reflectDir('W', 1), 'N');
  assert.equal(reflectDir('S', 1), 'E');
});

test('laser-mirror engine: traceLaser beam reflection and target hit', () => {
  const emitters = [createEmitter(1, 1, 'E', '#ef4444')];
  const targets = [createTarget(4, 4, '#ef4444')];

  // With mirror angle 0 ('/'), E turns N (misses target)
  const itemsWrong = [createMirror(1, 4, 0), ...targets];
  const res1 = traceLaser(emitters, itemsWrong);
  assert.equal(isLevelSolved(targets, res1.hitTargets), false);

  // With mirror angle 1 ('\'), E turns S, lands on (4,4)
  const itemsRight = [createMirror(1, 4, 1), ...targets];
  const res2 = traceLaser(emitters, itemsRight);
  assert.equal(isLevelSolved(targets, res2.hitTargets), true);
});

test('laser-mirror engine: splitter creates two beams', () => {
  const emitters = [createEmitter(3, 0, 'E', '#10b981')];
  const targets = [createTarget(0, 3, '#10b981'), createTarget(6, 3, '#10b981')];
  const items = [{ type: 'splitter', row: 3, col: 3 }, ...targets];

  const res = traceLaser(emitters, items);
  assert.equal(isLevelSolved(targets, res.hitTargets), true);
});

test('laser-mirror engine: rock stops beam', () => {
  const emitters = [createEmitter(1, 0, 'E', '#ef4444')];
  const targets = [createTarget(1, 5, '#ef4444')];
  const items = [createRock(1, 3), ...targets];

  const res = traceLaser(emitters, items);
  assert.equal(isLevelSolved(targets, res.hitTargets), false);
});

test('laser-mirror levels: all 12 levels have emitters and targets', () => {
  assert.equal(OPTIC_LEVELS.length, 12);
  OPTIC_LEVELS.forEach((lvl) => {
    assert.ok(lvl.id >= 1 && lvl.id <= 12);
    assert.ok(lvl.emitters.length > 0);
    assert.ok(lvl.targets.length > 0);
  });
});
