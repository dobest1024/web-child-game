import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, animals } from '../levels.js';
import {
  colorIds,
  mix,
  deltaE,
  ratioOf,
  judge,
  score,
  hintFor,
  minimalDrops,
  perceptibleDeltaE,
} from '../engine.js';

// Every count vector over the level's bottles with 1..capacity drops in total.
function* recipes(bottles, capacity, index = 0, counts = {}) {
  if (index === colorIds.length) {
    if (Object.values(counts).some(Boolean)) yield { ...counts };
    return;
  }
  const id = colorIds[index];
  const used = Object.values(counts).reduce((a, b) => a + b, 0);
  const top = bottles.includes(id) ? capacity - used : 0;
  for (let n = 0; n <= top; n++) yield* recipes(bottles, capacity, index + 1, { ...counts, [id]: n });
}
const key = (counts) => ratioOf(counts).join();

test('18 levels in 3 areas, each customer with a valid authored order', () => {
  assert.equal(levels.length, 18);
  assert.deepEqual([...new Set(levels.map((level) => level.theme))], [0, 1, 2]);
  for (const level of levels) {
    assert.ok(level.capacity >= 4 && level.capacity <= 8, level.name);
    assert.ok(level.customers.length >= 1 && level.customers.length <= 3, level.name);
    for (const customer of level.customers) {
      assert.ok(animals[customer.animal], customer.animal);
      for (const id of Object.keys(customer.recipe)) assert.ok(level.bottles.includes(id), `${level.name}: ${id}`);
      assert.ok(minimalDrops(customer.recipe) <= level.capacity, level.name);
    }
  }
  assert.ok(levels.some((level) => level.mystery));
  assert.ok(levels.some((level) => level.customers.length === 3));
});

test('every reference solution gets 3 stars and the empty cauldron never wins', () => {
  for (const level of levels) {
    const results = level.customers.map((customer) => {
      assert.equal(judge([], customer.recipe, level.capacity).correct, false);
      assert.ok(customer.solution.length <= level.capacity);
      assert.ok(customer.solution.every((id) => level.bottles.includes(id)), level.name);
      const verdict = judge(customer.solution, customer.recipe, level.capacity);
      assert.equal(verdict.correct, true, `${level.name} ${customer.potion}`);
      assert.equal(verdict.minimal, true, `${level.name} ${customer.potion}`);
      return { firstTry: true, minimal: verdict.minimal };
    });
    assert.equal(score(results), 3, level.name);
  }
});

test(`every wrong recipe within capacity looks different from the target (CIE76 ΔE ≥ ${perceptibleDeltaE})`, () => {
  for (const level of levels)
    for (const customer of level.customers) {
      const target = mix(customer.recipe);
      let closest = Infinity,
        near = null;
      for (const counts of recipes(level.bottles, level.capacity)) {
        if (key(counts) === key(customer.recipe)) continue;
        const distance = deltaE(target, mix(counts));
        if (distance < closest) [closest, near] = [distance, counts];
      }
      assert.ok(
        closest >= perceptibleDeltaE,
        `${level.id + 1} ${level.name} ${customer.potion}: ΔE ${closest.toFixed(1)} to ${JSON.stringify(near)}`,
      );
    }
});

test('customers queued in one level want visibly different potions', () => {
  for (const level of levels.filter((item) => item.customers.length > 1)) {
    let closest = Infinity;
    for (const [i, a] of level.customers.entries())
      for (const b of level.customers.slice(i + 1)) closest = Math.min(closest, deltaE(mix(a.recipe), mix(b.recipe)));
    assert.ok(closest >= perceptibleDeltaE, `${level.name}: ${closest.toFixed(1)}`);
  }
});

test('every wrong recipe gets a kind hint that only names available bottles and fits the cauldron', () => {
  for (const level of levels)
    for (const customer of level.customers)
      for (const counts of recipes(level.bottles, level.capacity)) {
        if (key(counts) === key(customer.recipe)) continue;
        const hint = hintFor(counts, customer.recipe, level.capacity);
        const used = Object.values(counts).reduce((a, b) => a + b, 0);
        assert.ok(hint.text.length > 6);
        for (const id of [hint.add, hint.over, hint.extra].filter(Boolean)) assert.ok(level.bottles.includes(id));
        if (hint.add) assert.ok(used < level.capacity, `${level.name} suggests adding to a full cauldron`);
        if (used === level.capacity) assert.equal(hint.add, undefined);
      }
});
