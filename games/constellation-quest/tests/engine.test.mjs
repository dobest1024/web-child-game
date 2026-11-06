import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEdge,
  verifyConstellation,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { CONSTELLATIONS } from '../levels.js';

describe('Constellation Quest Engine', () => {
  it('normalizes edges symmetrically regardless of endpoint order', () => {
    assert.equal(normalizeEdge('a', 'b'), 'a-b');
    assert.equal(normalizeEdge('b', 'a'), 'a-b');
  });

  it('verifies complete and partial constellation matching', () => {
    const target = [['a', 'b'], ['b', 'c']];
    // Exact match
    const exact = verifyConstellation(target, ['a-b', 'b-c']);
    assert.equal(exact.matched, true);
    assert.equal(exact.missing, 0);
    assert.equal(exact.extra, 0);

    // Missing one line
    const missing = verifyConstellation(target, ['a-b']);
    assert.equal(missing.matched, false);
    assert.equal(missing.missing, 1);

    // Extra redundant line
    const extra = verifyConstellation(target, ['a-b', 'b-c', 'a-c']);
    assert.equal(extra.matched, false);
    assert.equal(extra.extra, 1);
  });

  it('calculates stars based on accuracy and mistakes', () => {
    assert.equal(calculateStars(1, 0, 0), 0); // incomplete
    assert.equal(calculateStars(0, 0, 0), 3); // perfect
    assert.equal(calculateStars(0, 1, 1), 2); // 1 extra/mistake
    assert.equal(calculateStars(0, 2, 3), 1); // low score
  });

  it('sanitizes user constellation progress data safely', () => {
    assert.deepEqual(sanitizeProgress(null), { cleared: {}, stars: {} });
    const clean = sanitizeProgress({
      cleared: { '1': true, 'bad': 'no' },
      stars: { '1': 3, 'bad': 5 },
    });
    assert.deepEqual(clean, {
      cleared: { '1': true },
      stars: { '1': 3 },
    });
  });

  it('ensures all 12 constellations have valid stars, coordinates, and lines', () => {
    assert.equal(CONSTELLATIONS.length, 12);
    for (const c of CONSTELLATIONS) {
      assert.ok(c.name);
      assert.ok(c.stars.length >= 4);
      assert.ok(c.lines.length >= 3);

      const starMap = new Set(c.stars.map(s => s.id));
      for (const s of c.stars) {
        assert.ok(s.x >= 0 && s.x <= 10, `${c.name} star ${s.id} x in [0, 10]`);
        assert.ok(s.y >= 0 && s.y <= 10, `${c.name} star ${s.id} y in [0, 10]`);
      }

      for (const [a, b] of c.lines) {
        assert.ok(starMap.has(a), `${c.name} line endpoint ${a} must exist in stars`);
        assert.ok(starMap.has(b), `${c.name} line endpoint ${b} must exist in stars`);
      }
    }
  });
});
