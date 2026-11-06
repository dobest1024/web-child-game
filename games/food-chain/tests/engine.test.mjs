import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLink,
  verifyFoodWeb,
  simulateEcosystem,
  calculateStars,
  sanitizeProgress,
} from '../engine.js';
import { LEVELS } from '../levels.js';

describe('Food Chain Engine', () => {
  it('normalizes directed prey-to-predator link strings', () => {
    assert.equal(normalizeLink('grass', 'rabbit'), 'grass->rabbit');
  });

  it('verifies complete and incomplete food webs accurately', () => {
    const valid = [['grass', 'rabbit'], ['rabbit', 'fox']];
    // Exact match
    const exact = verifyFoodWeb(valid, ['grass->rabbit', 'rabbit->fox']);
    assert.equal(exact.balanced, true);
    assert.equal(exact.missing, 0);
    assert.equal(exact.invalid, 0);

    // Missing link
    const missing = verifyFoodWeb(valid, ['grass->rabbit']);
    assert.equal(missing.balanced, false);
    assert.equal(missing.missing, 1);

    // Invalid backwards link
    const invalid = verifyFoodWeb(valid, ['rabbit->grass', 'fox->rabbit']);
    assert.equal(invalid.balanced, false);
    assert.equal(invalid.invalid, 2);
  });

  it('simulates ecosystem energy flow from producers to consumers', () => {
    const nodes = [
      { id: 'p', type: 'producer' },
      { id: 'h', type: 'herbivore' },
      { id: 'c', type: 'carnivore' },
    ];
    // Full chain
    const full = simulateEcosystem(nodes, ['p->h', 'h->c']);
    assert.equal(full.allFed, true);
    assert.equal(full.starvingIds.length, 0);

    // Broken chain (c disconnected)
    const broken = simulateEcosystem(nodes, ['p->h']);
    assert.equal(broken.allFed, false);
    assert.deepEqual(broken.starvingIds, ['c']);
  });

  it('calculates stars and sanitizes progress records safely', () => {
    assert.equal(calculateStars(0, 0), 3);
    assert.equal(calculateStars(1, 0), 0);

    assert.deepEqual(sanitizeProgress(null), { cleared: {}, stars: {} });
    const clean = sanitizeProgress({
      cleared: { '1': true, 'bad': 'no' },
      stars: { '1': 3, 'bad': -2 },
    });
    assert.deepEqual(clean, {
      cleared: { '1': true },
      stars: { '1': 3 },
    });
  });

  it('validates all 12 levels have valid nodes, links, and complete ecosystem flow', () => {
    assert.equal(LEVELS.length, 12);
    for (const lvl of LEVELS) {
      assert.ok(lvl.title);
      assert.ok(lvl.nodes.length >= 3);
      assert.ok(lvl.links.length >= 2);

      const nodeMap = new Set(lvl.nodes.map(n => n.id));
      for (const [from, to] of lvl.links) {
        assert.ok(nodeMap.has(from), `${lvl.title} link from ${from} must exist in nodes`);
        assert.ok(nodeMap.has(to), `${lvl.title} link to ${to} must exist in nodes`);
      }

      // Author solution must satisfy simulation
      const authorLinks = lvl.links.map(([from, to]) => `${from}->${to}`);
      const sim = simulateEcosystem(lvl.nodes, authorLinks);
      assert.ok(sim.allFed, `${lvl.title} author solution must feed all organisms`);
    }
  });
});
