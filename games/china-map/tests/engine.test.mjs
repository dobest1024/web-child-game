import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVINCES,
  REGIONS,
  getProvincesByRegion,
  generateQuiz,
  sanitizeProgress,
} from '../engine.js';

describe('China Map Explorer Engine', () => {
  it('covers all 34 provincial-level regions with complete metadata', () => {
    assert.equal(PROVINCES.length, 34);
    for (const p of PROVINCES) {
      assert.ok(p.id, 'Province id exists');
      assert.ok(p.name, 'Province name exists');
      assert.ok(p.abbr, 'Province abbreviation exists');
      assert.ok(p.capital, 'Province capital exists');
      assert.ok(p.region && REGIONS[p.region], 'Province region is recognized');
      assert.ok(p.landmark, 'Province landmark exists');
      assert.ok(p.specialty, 'Province specialty exists');
    }
  });

  it('filters provinces correctly by geographic region', () => {
    const north = getProvincesByRegion('north');
    assert.equal(north.length, 5); // 京、津、冀、晋、蒙

    const northeast = getProvincesByRegion('northeast');
    assert.equal(northeast.length, 3); // 辽、吉、黑
  });

  it('generates geography trivia quizzes with valid options and correct answer', () => {
    const quiz = generateQuiz(5);
    assert.equal(quiz.length, 5);
    for (const q of quiz) {
      assert.ok(q.question);
      assert.equal(q.options.length, 4);
      // Target must be present in options
      assert.ok(q.options.some(o => o.id === q.targetId));
    }
  });

  it('sanitizes user progress data safely', () => {
    assert.deepEqual(sanitizeProgress(null), { puzzleCleared: {}, quizHighScore: 0 });
    const clean = sanitizeProgress({
      puzzleCleared: { north: true, bad: 'no' },
      quizHighScore: 80,
    });
    assert.deepEqual(clean, {
      puzzleCleared: { north: true },
      quizHighScore: 80,
    });
  });
});
