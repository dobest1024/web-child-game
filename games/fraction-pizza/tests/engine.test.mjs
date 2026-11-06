import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gcd,
  simplifyFraction,
  formatFraction,
  getSliceCounts,
  matchesOrder,
  sanitizeProgress,
} from '../engine.js';
import { PIZZA_LEVELS } from '../levels.js';

test('fraction-pizza engine: gcd and simplifyFraction', () => {
  assert.equal(gcd(4, 6), 2);
  assert.equal(gcd(3, 9), 3);
  assert.equal(gcd(5, 7), 1);

  assert.deepEqual(simplifyFraction(2, 4), { num: 1, den: 2 });
  assert.deepEqual(simplifyFraction(3, 6), { num: 1, den: 2 });
  assert.deepEqual(simplifyFraction(4, 8), { num: 1, den: 2 });
  assert.deepEqual(simplifyFraction(2, 6), { num: 1, den: 3 });
  assert.deepEqual(simplifyFraction(4, 12), { num: 1, den: 3 });
  assert.deepEqual(simplifyFraction(0, 4), { num: 0, den: 1 });
});

test('fraction-pizza engine: matchesOrder', () => {
  // Order: 1/2 cheese, 1/4 mushroom, 1/4 bacon (cuts = 4)
  const order = {
    cheese: { num: 1, den: 2 },
    mushroom: { num: 1, den: 4 },
    bacon: { num: 1, den: 4 },
  };

  const goodSlices4 = ['cheese', 'cheese', 'mushroom', 'bacon'];
  assert.equal(matchesOrder(goodSlices4, 4, order).match, true);

  // Cuts = 8: 4 cheese, 2 mushroom, 2 bacon
  const goodSlices8 = ['cheese', 'cheese', 'cheese', 'cheese', 'mushroom', 'mushroom', 'bacon', 'bacon'];
  assert.equal(matchesOrder(goodSlices8, 8, order).match, true);

  // Wrong ratio
  const wrongSlices = ['cheese', 'mushroom', 'mushroom', 'bacon'];
  assert.equal(matchesOrder(wrongSlices, 4, order).match, false);

  // Extra unrequested topping
  const extraTopping = ['cheese', 'cheese', 'mushroom', 'shrimp'];
  assert.equal(matchesOrder(extraTopping, 4, order).match, false);
});

test('fraction-pizza engine: sanitizeProgress', () => {
  const clean = sanitizeProgress({
    cleared: { '1': 3, '2': 1, 'bad': 'five' },
  });
  assert.deepEqual(clean.cleared, { '1': 3, '2': 1 });
});

test('fraction-pizza levels: all 12 levels have achievable fractions with their allowed cuts', () => {
  assert.equal(PIZZA_LEVELS.length, 12);
  PIZZA_LEVELS.forEach((lvl) => {
    assert.ok(lvl.id >= 1 && lvl.id <= 12);
    assert.ok(lvl.allowedCuts.length > 0);

    // Sum of fractions in order must be <= 1
    let sum = 0;
    for (const frac of Object.values(lvl.order)) {
      sum += frac.num / frac.den;
      // Also ensure at least one allowed cut can evenly represent this fraction
      const canRepresent = lvl.allowedCuts.some((cut) => (cut * frac.num) % frac.den === 0);
      assert.ok(canRepresent, `Level ${lvl.id} has fraction that fits allowed cuts`);
    }
    assert.ok(sum <= 1.0001, `Level ${lvl.id} fraction sum <= 1`);
  });
});
