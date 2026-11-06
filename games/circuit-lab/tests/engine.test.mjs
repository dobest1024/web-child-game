import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getComponentPorts,
  solveCircuit,
  isLevelSolved,
  sanitizeProgress,
} from '../engine.js';
import { CIRCUIT_LEVELS } from '../levels.js';

test('circuit-lab engine: component ports calculation', () => {
  // Battery: rot 1 (+ East, - West)
  const bat = { type: 'battery', rot: 1 };
  assert.deepEqual(getComponentPorts(bat), [1, 3]);

  // Bulb H: [1, 3]
  const bulbH = { type: 'bulb', dir: 'H' };
  assert.deepEqual(getComponentPorts(bulbH), [1, 3]);

  // Switch: open returns [], closed returns [1, 3]
  const swOpen = { type: 'switch', dir: 'H', closed: false };
  assert.deepEqual(getComponentPorts(swOpen), []);
  const swClosed = { type: 'switch', dir: 'H', closed: true };
  assert.deepEqual(getComponentPorts(swClosed), [1, 3]);

  // Wire straight: rot 0 is [0, 2] (V), rot 1 is [1, 3] (H)
  const wireStraight = { type: 'wire', wireType: 'straight', rot: 0 };
  assert.deepEqual(getComponentPorts(wireStraight), [0, 2]);

  // Wire corner: rot 0 is N-E [0, 1]
  const wireCorner = { type: 'wire', wireType: 'corner', rot: 0 };
  assert.deepEqual(getComponentPorts(wireCorner), [0, 1]);
});

test('circuit-lab engine: solving a simple closed circuit', () => {
  // Loop: Battery at (2, 1) rot 0 (+ is North, - is South)
  // (2,1) -> North to (1,1) -> East to (1,2) -> East to (1,3) -> South to (2,3) [bulb] -> South to (3,3) -> West to (3,2) -> West to (3,1) -> North to (2,1)
  const comps = [
    { id: 'bat', type: 'battery', row: 2, col: 1, rot: 0 },
    { id: 'w1', type: 'wire', wireType: 'corner', row: 1, col: 1, rot: 1 }, // E-S (enters S from bat, leaves E)
    { id: 'w2', type: 'wire', wireType: 'straight', row: 1, col: 2, rot: 1 }, // H (enters W, leaves E)
    { id: 'w3', type: 'wire', wireType: 'corner', row: 1, col: 3, rot: 2 }, // S-W (enters W, leaves S)
    { id: 'bulb1', type: 'bulb', row: 2, col: 3, dir: 'V' }, // V [0, 2] (enters N, leaves S)
    { id: 'w4', type: 'wire', wireType: 'corner', row: 3, col: 3, rot: 3 }, // W-N (enters N, leaves W)
    { id: 'w5', type: 'wire', wireType: 'straight', row: 3, col: 2, rot: 1 }, // H (enters E, leaves W)
    { id: 'w6', type: 'wire', wireType: 'corner', row: 3, col: 1, rot: 0 }, // N-E (enters E, leaves N to bat)
  ];

  const res = solveCircuit(comps);
  assert.equal(res.isShortCircuit, false);
  assert.equal(res.poweredItems.has('bulb1'), true);
  assert.equal(isLevelSolved(['bulb1'], res.poweredItems, res.isShortCircuit), true);
});

test('circuit-lab engine: detects short circuit when wire connects battery directly without load', () => {
  // Loop with no load directly connecting battery + and -
  const shortComps = [
    { id: 'bat', type: 'battery', row: 2, col: 1, rot: 0 },
    { id: 'w1', type: 'wire', wireType: 'corner', row: 1, col: 1, rot: 1 }, // E-S
    { id: 'w2', type: 'wire', wireType: 'corner', row: 1, col: 2, rot: 2 }, // S-W
    { id: 'w3', type: 'wire', wireType: 'straight', row: 2, col: 2, rot: 0 }, // V
    { id: 'w4', type: 'wire', wireType: 'corner', row: 3, col: 2, rot: 3 }, // W-N
    { id: 'w5', type: 'wire', wireType: 'corner', row: 3, col: 1, rot: 0 }, // N-E
  ];

  const res = solveCircuit(shortComps);
  assert.equal(res.isShortCircuit, true);
  assert.equal(isLevelSolved(['bulb1'], res.poweredItems, res.isShortCircuit), false);
});

test('circuit-lab levels: all 12 levels have battery and target items', () => {
  assert.equal(CIRCUIT_LEVELS.length, 12);
  CIRCUIT_LEVELS.forEach((lvl) => {
    assert.ok(lvl.id >= 1 && lvl.id <= 12);
    assert.ok(lvl.components.some((c) => c.type === 'battery'));
    assert.ok(lvl.targetItems.length > 0);
  });
});
