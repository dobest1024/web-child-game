import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyDeduction,
  markConfirmed,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { CASES } from '../levels.js';

describe('Logic Detective Engine', () => {
  it('accurately verifies correct and incorrect deductive assignments', () => {
    const solution = {
      rabbit: { food: 'carrot' },
      cat: { food: 'fish' },
    };
    // Perfect match
    const exact = verifyDeduction(solution, {
      rabbit: { food: 'carrot' },
      cat: { food: 'fish' },
    });
    assert.equal(exact.solved, true);
    assert.equal(exact.errors, 0);

    // Mismatch
    const wrong = verifyDeduction(solution, {
      rabbit: { food: 'fish' },
      cat: { food: 'carrot' },
    });
    assert.equal(wrong.solved, false);
    assert.equal(wrong.errors, 2);
  });

  it('marks confirmed grid state and automatically crosses out row/col', () => {
    const grid = [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ];
    const next = markConfirmed(grid, 1, 1);
    assert.equal(next[1][1], 'yes');
    assert.equal(next[1][0], 'no');
    assert.equal(next[1][2], 'no');
    assert.equal(next[0][1], 'no');
    assert.equal(next[2][1], 'no');
  });

  it('calculates stars based on errors and hints', () => {
    assert.equal(calculateStars(0, 0), 3);
    assert.equal(calculateStars(0, 1), 2);
    assert.equal(calculateStars(0, 3), 1);
    assert.equal(calculateStars(1, 0), 0);
  });

  it('sanitizes user progress data safely', () => {
    assert.deepEqual(sanitizeProgress(null), { cleared: {}, stars: {} });
    const clean = sanitizeProgress({
      cleared: { '1': true, 'bad': 'no' },
      stars: { '1': 3, 'bad': 8 },
    });
    assert.deepEqual(clean, {
      cleared: { '1': true },
      stars: { '1': 3 },
    });
  });

  it('verifies all 12 cases have entities, attributes, clues, and matching solutions', () => {
    assert.equal(CASES.length, 12);
    for (const c of CASES) {
      assert.ok(c.title);
      assert.ok(c.entities.length >= 3);
      assert.ok(c.attributes.length >= 3);
      assert.ok(c.clues.length >= 2);

      // Verify that every entity is mapped to an attribute that exists
      const attrIds = new Set(c.attributes.map(a => a.id));
      for (const entity of c.entities) {
        assert.ok(c.solution[entity.id], `Entity ${entity.id} must be in solution`);
        const assignedVal = Object.values(c.solution[entity.id])[0];
        assert.ok(attrIds.has(assignedVal), `Attribute ${assignedVal} must be in attributes`);
      }
    }
  });
});
