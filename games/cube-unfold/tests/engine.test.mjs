import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCube,
  rollCube,
  checkOppositePair,
  sanitizeProgress,
} from '../engine.js';
import { CUBE_LEVELS } from '../levels.js';

test('cube-unfold engine: 3D cube rolling mechanics', () => {
  let cube = createCube({ top: 1, bottom: 6, front: 2, back: 5, left: 3, right: 4 });

  // Roll North: front becomes bottom, top becomes back, etc.
  cube = rollCube(cube, 'N');
  assert.equal(cube.top, 2);
  assert.equal(cube.bottom, 5);

  // Roll South back to initial
  cube = rollCube(cube, 'S');
  assert.equal(cube.top, 1);
  assert.equal(cube.bottom, 6);

  // Roll East: left becomes bottom, top becomes right, etc.
  cube = rollCube(cube, 'E');
  assert.equal(cube.top, 3);
  assert.equal(cube.bottom, 4);

  // Roll West back to initial
  cube = rollCube(cube, 'W');
  assert.equal(cube.top, 1);
  assert.equal(cube.bottom, 6);
});

test('cube-unfold engine: checkOppositePair', () => {
  const pairs = [
    ['A', 'C'],
    ['B', 'D'],
    ['U', 'D2'],
  ];

  assert.equal(checkOppositePair(pairs, 'A', 'C'), true);
  assert.equal(checkOppositePair(pairs, 'C', 'A'), true);
  assert.equal(checkOppositePair(pairs, 'A', 'B'), false);
  assert.equal(checkOppositePair(pairs, 'U', 'D2'), true);
});

test('cube-unfold levels: all 12 levels are valid', () => {
  assert.equal(CUBE_LEVELS.length, 12);
  CUBE_LEVELS.forEach((lvl) => {
    assert.ok(lvl.id >= 1 && lvl.id <= 12);
    if (lvl.type === 'net') {
      assert.equal(lvl.faces.length, 6);
      assert.ok(lvl.correctAnswer);
      assert.ok(lvl.oppositePairs.length === 3);
    } else {
      assert.ok(lvl.gridSize >= 3);
      assert.ok(lvl.targetTop);
      assert.ok(lvl.start && lvl.end);
    }
  });
});
