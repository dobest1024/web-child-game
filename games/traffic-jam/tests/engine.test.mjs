import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCar,
  buildOccupancyGrid,
  canMove,
  getMoveRange,
  moveCar,
  isSolved,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { LEVELS } from '../levels.js';

test('traffic-jam engine: grid placement and collision', () => {
  const cars = [
    createCar('red', 2, 0, 2, 'H', true),
    createCar('v1', 1, 2, 2, 'V', false),
  ];

  const grid = buildOccupancyGrid(cars);
  assert.equal(grid[2][0], 'red');
  assert.equal(grid[2][1], 'red');
  assert.equal(grid[1][2], 'v1');
  assert.equal(grid[2][2], 'v1');
  assert.equal(grid[0][0], null);

  // Red car cannot move right past col 0 because (2,2) is occupied by v1
  const rangeRed = getMoveRange(cars[0], cars);
  assert.equal(rangeRed.min, 0);
  assert.equal(rangeRed.max, 0); // cannot move right

  // v1 can move up to row 0 or down to row 4
  const rangeV1 = getMoveRange(cars[1], cars);
  assert.equal(rangeV1.min, 0);
  assert.equal(rangeV1.max, 4);
});

test('traffic-jam engine: moveCar and solving level 1', () => {
  let cars = JSON.parse(JSON.stringify(LEVELS[0].cars));
  assert.equal(isSolved(cars), false);

  // Move v1 down from row 1 to row 3
  const move1 = moveCar(cars, 'v1', 2);
  assert.equal(move1.moved, true);
  cars = move1.cars;

  // Now red car can move from col 0 to col 4 (length 2 => occupies cols 4, 5)
  const rangeRed = getMoveRange(cars.find((c) => c.id === 'red'), cars);
  assert.equal(rangeRed.max, 4);

  const moveRed = moveCar(cars, 'red', 4);
  assert.equal(moveRed.moved, true);
  cars = moveRed.cars;

  assert.equal(isSolved(cars), true);
});

test('traffic-jam engine: calculateStars and sanitizeProgress', () => {
  assert.equal(calculateStars(5, 5), 3);
  assert.equal(calculateStars(7, 5), 2);
  assert.equal(calculateStars(8, 5), 2);
  assert.equal(calculateStars(9, 5), 1);

  const clean = sanitizeProgress({
    cleared: { '1': 3, '2': 2, 'bad': 5 },
    bestMoves: { '1': 4, '2': 10 },
  });
  assert.deepEqual(clean.cleared, { '1': 3, '2': 2 });
  assert.deepEqual(clean.bestMoves, { '1': 4, '2': 10 });
});

test('traffic-jam levels: all 15 levels are valid and have target car at row 2', () => {
  assert.equal(LEVELS.length, 15);
  LEVELS.forEach((lvl) => {
    assert.ok(lvl.id >= 1 && lvl.id <= 15);
    const target = lvl.cars.find((c) => c.isTarget);
    assert.ok(target, `Level ${lvl.id} has target car`);
    assert.equal(target.row, 2, `Target car on row 2 in level ${lvl.id}`);
    assert.equal(target.orientation, 'H');

    // No overlaps in initial state
    const grid = buildOccupancyGrid(lvl.cars);
    let totalCells = 0;
    for (const r of grid) {
      for (const cell of r) {
        if (cell) totalCells++;
      }
    }
    const expectedCells = lvl.cars.reduce((sum, c) => sum + c.length, 0);
    assert.equal(totalCells, expectedCells, `Level ${lvl.id} has overlapping cars`);
  });
});
