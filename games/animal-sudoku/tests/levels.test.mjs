import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, generatePuzzle, seedFor, countSolutions } from '../levels.js';

const sorted = (list) => [...list].sort((a, b) => a - b);

test('same seed always yields the exact same puzzle', () => {
  for (const key of Object.keys(DIFFICULTIES)) {
    const first = generatePuzzle(key, 'unit-seed');
    const second = generatePuzzle(key, 'unit-seed');
    assert.deepEqual(first.givens, second.givens, key);
    assert.deepEqual(first.solution, second.solution, key);
    assert.equal(first.holes, second.holes, key);
    assert.equal(first.seed, second.seed, key);
  }
});

test('different seeds yield different puzzles', () => {
  const seen = new Set();
  for (let i = 0; i < 6; i++)
    seen.add(JSON.stringify(generatePuzzle('easy', `seed-${i}`).givens));
  assert.ok(seen.size >= 5, `expected variety, got ${seen.size}`);
});

test('unknown difficulty is rejected', () => {
  assert.throws(() => generatePuzzle('mega', 'x'), /未知难度/);
});

test('every solution satisfies row, column and box constraints', () => {
  const plan = { easy: 3, medium: 2, hard: 2 };
  for (const [key, count] of Object.entries(plan)) {
    const cfg = DIFFICULTIES[key];
    for (let i = 0; i < count; i++) {
      const { solution, size } = generatePuzzle(key, `solution-${i}`);
      const expected = Array.from({ length: size }, (_, v) => v + 1);
      for (const row of solution)
        assert.deepEqual(sorted(row), expected, `${key} #${i} row`);
      for (let c = 0; c < size; c++) {
        const column = solution.map((row) => row[c]);
        assert.deepEqual(sorted(column), expected, `${key} #${i} col ${c}`);
      }
      const stacks = size / cfg.boxCols;
      for (let box = 0; box < size; box++) {
        const r0 = Math.floor(box / stacks) * cfg.boxRows;
        const c0 = (box % stacks) * cfg.boxCols;
        const cells = [];
        for (let r = r0; r < r0 + cfg.boxRows; r++)
          for (let c = c0; c < c0 + cfg.boxCols; c++) cells.push(solution[r][c]);
        assert.deepEqual(sorted(cells), expected, `${key} #${i} box ${box}`);
      }
    }
  }
});

test('every generated puzzle keeps exactly one solution', () => {
  const plan = { easy: 3, medium: 2, hard: 2 };
  for (const [key, count] of Object.entries(plan)) {
    for (let i = 0; i < count; i++) {
      const puzzle = generatePuzzle(key, `unique-${i}`);
      assert.equal(
        countSolutions(puzzle.givens, puzzle.size, puzzle.boxRows, puzzle.boxCols, 2),
        1,
        `${key} #${i}`,
      );
      assert.equal(
        countSolutions(puzzle.solution, puzzle.size, puzzle.boxRows, puzzle.boxCols, 2),
        1,
        `${key} #${i} solution grid`,
      );
    }
  }
});

test('hole counts stay inside each difficulty range', () => {
  const plan = { easy: 6, medium: 5, hard: 4 };
  for (const [key, count] of Object.entries(plan)) {
    const cfg = DIFFICULTIES[key];
    for (let i = 0; i < count; i++) {
      const puzzle = generatePuzzle(key, `holes-${i}`);
      assert.ok(
        puzzle.holes >= cfg.digMin && puzzle.holes <= cfg.digMax,
        `${key} #${i} dug ${puzzle.holes}, expected ${cfg.digMin}-${cfg.digMax}`,
      );
      const filled = puzzle.givens.flat().filter(Boolean).length;
      assert.equal(filled, cfg.size ** 2 - puzzle.holes, `${key} #${i} givens`);
    }
  }
});

test('seedFor is stable per difficulty and 9x9 generation stays fast', () => {
  assert.equal(seedFor('easy', 3), seedFor('easy', 3));
  assert.notEqual(seedFor('easy', 3), seedFor('easy', 4));
  assert.notEqual(seedFor('easy', 3), seedFor('hard', 3));
  const start = performance.now();
  const puzzle = generatePuzzle('hard', 'speed-check');
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 5000, `9x9 generation took ${elapsed.toFixed(0)}ms`);
  assert.equal(
    countSolutions(puzzle.givens, 9, 3, 3, 2),
    1,
    'speed-check puzzle stays unique',
  );
});
