import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mix,
  toLab,
  sameRatio,
  addDrop,
  countDrops,
  judge,
  score,
  hintFor,
  sanitizeStars,
  loadStars,
  saveStars,
  minimalDrops,
} from '../engine.js';

function hue(rgb) {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const lightness = (rgb) => toLab(rgb)[0];

test('paint-like RYB mixing gives orange, green, purple and brown', () => {
  const orange = hue(mix({ red: 1, yellow: 1 }));
  const green = hue(mix({ yellow: 1, blue: 1 }));
  const purple = hue(mix({ red: 1, blue: 1 }));
  assert.ok(orange >= 20 && orange <= 45, `orange hue ${orange}`);
  assert.ok(green >= 90 && green <= 160, `green hue ${green}`);
  assert.ok(purple >= 260 && purple <= 320, `purple hue ${purple}`);
  const brown = mix({ red: 1, yellow: 1, blue: 1 });
  const brownHue = hue(brown);
  assert.ok(brownHue >= 15 && brownHue <= 45, `brown hue ${brownHue}`);
  assert.ok(lightness(brown) < 50, 'brown is darker than the primaries mix');
  assert.ok(Math.max(...brown) - Math.min(...brown) < 0.5, 'brown is muted');
});

test('white lightens, black darkens, and equal ratios mix to the same color', () => {
  const blue = mix({ blue: 1 });
  assert.ok(lightness(mix({ blue: 1, white: 1 })) > lightness(blue) + 15);
  assert.ok(lightness(mix({ blue: 1, black: 1 })) < lightness(blue) - 15);
  assert.ok(lightness(mix({ blue: 1, white: 2 })) > lightness(mix({ blue: 1, white: 1 })));
  assert.deepEqual(mix({ red: 2, yellow: 2 }), mix({ red: 1, yellow: 1 }));
  assert.equal(mix({}), null);
});

test('judging compares reduced drop ratios, not raw counts', () => {
  assert.ok(sameRatio({ red: 2, yellow: 2 }, { red: 1, yellow: 1 }));
  assert.ok(sameRatio({ red: 2, yellow: 4 }, { red: 1, yellow: 2 }));
  assert.ok(!sameRatio({ red: 2, yellow: 1 }, { red: 1, yellow: 1 }));
  assert.ok(!sameRatio({ red: 1, yellow: 1, blue: 1 }, { red: 1, yellow: 1 }));
  assert.ok(!sameRatio({}, { red: 1 }));
  const equivalent = judge(['red', 'yellow', 'red', 'yellow'], { red: 1, yellow: 1 }, 6);
  assert.equal(equivalent.correct, true);
  assert.equal(equivalent.minimal, false);
  const exact = judge(['yellow', 'red'], { red: 1, yellow: 1 }, 6);
  assert.deepEqual([exact.correct, exact.minimal], [true, true]);
  const wrong = judge(['red', 'red', 'yellow'], { red: 1, yellow: 1 }, 6);
  assert.equal(wrong.correct, false);
  assert.match(wrong.hint.text, /偏红.*加一点黄/);
  assert.equal(judge([], { red: 1 }, 6).correct, false);
  assert.equal(minimalDrops({ red: 2, yellow: 4 }), 3);
});

test('the cauldron refuses drops past its capacity and unknown colors', () => {
  let drops = [];
  for (let i = 0; i < 9; i++) drops = addDrop(drops, 'blue', 6);
  assert.equal(drops.length, 6);
  assert.deepEqual(addDrop(['red'], 'green', 6), ['red']);
  assert.deepEqual(countDrops(drops), { red: 0, yellow: 0, blue: 6, white: 0, black: 0 });
});

test('kind hints name the extra color, the missing color, or say to pour when full', () => {
  const orange = { red: 1, yellow: 1 };
  assert.equal(hintFor({ red: 1, yellow: 1, blue: 1 }, orange, 6).extra, 'blue');
  assert.equal(hintFor({ yellow: 2 }, orange, 6).add, 'red');
  assert.equal(hintFor({ red: 1, yellow: 3 }, orange, 6).add, 'red');
  const full = hintFor({ red: 5, yellow: 1 }, orange, 6);
  assert.equal(full.add, undefined);
  assert.equal(full.pour, true);
  assert.match(hintFor({ red: 1, white: 2 }, { red: 1, white: 1 }, 6).text, /太浅/);
  assert.match(hintFor({ blue: 1, black: 2 }, { blue: 1, black: 1 }, 4).text, /太深/);
});

test('stars: one for success, one for first-try, one for fewest drops', () => {
  assert.equal(score([]), 0);
  assert.equal(score([{ firstTry: true, minimal: true }]), 3);
  assert.equal(score([{ firstTry: true, minimal: false }]), 2);
  assert.equal(score([{ firstTry: false, minimal: true }]), 2);
  assert.equal(score([{ firstTry: false, minimal: false }]), 1);
  assert.equal(
    score([
      { firstTry: true, minimal: true },
      { firstTry: false, minimal: true },
    ]),
    2,
  );
});

test('saved stars are sanitized and blocked storage never throws', () => {
  assert.deepEqual(sanitizeStars({ 0: 3, 1: 9, 2: '2', 3: 1.5, 4: -1, 17: 2, 18: 3, x: 3 }, 18), { 0: 3, 17: 2 });
  for (const raw of [null, 'oops', 42, [3, 3], true]) assert.deepEqual(sanitizeStars(raw, 18), {});
  const memory = new Map();
  const fake = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  for (const text of ['{not json', '"str"', '[1,2,3]', 'null', '{"0":"3","1":2}']) {
    memory.set('k', text);
    assert.doesNotThrow(() => loadStars(fake, 'k', 18));
  }
  memory.set('k', '{"0":"3","1":2}');
  assert.deepEqual(loadStars(fake, 'k', 18), { 1: 2 });
  assert.equal(saveStars(fake, 'k', { 0: 3 }), true);
  assert.deepEqual(loadStars(fake, 'k', 18), { 0: 3 });
  const blocked = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  };
  assert.deepEqual(loadStars(blocked, 'k', 18), {});
  assert.equal(saveStars(blocked, 'k', { 0: 3 }), false);
  assert.deepEqual(loadStars(null, 'k', 18), {});
  assert.equal(saveStars(undefined, 'k', {}), false);
});
