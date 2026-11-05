import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, animals } from '../levels.js';
import { colorIds, mix, toHex, countDrops } from '../engine.js';
import { illustration } from '../../../portal/art.js';
import { customerSvg, cauldronSvg, bottleSvg, grannySvg, flaskSvg, moods } from '../art.js';

// "M360h36" is parsed as a move without its y value, so the browser drops the rest of the path.
function brokenMoves(svg) {
  const broken = [];
  for (const [, d] of svg.matchAll(/\sd="([^"]*)"/g))
    for (const move of d.match(/[Mm][^A-Za-z]*/g) || []) {
      const numbers = move.match(/-?(?:\d+\.?\d*|\.\d+)/g) || [];
      if (numbers.length < 2 || numbers.length % 2) broken.push(move);
    }
  return broken;
}
function assertClean(svg, label) {
  assert.deepEqual(brokenMoves(svg), [], label);
  assert.doesNotMatch(svg.replace(/#[0-9a-f]{3,8}\b/gi, ''), /NaN|undefined|null|Infinity|\de[+-]?\d/, label);
  assert.match(svg, /^<svg [^>]*viewBox="[^"]+"/, label);
}

test('every customer draws valid paths in every mood, before and after the potion', () => {
  for (const [id, animal] of Object.entries(animals))
    for (const mood of moods)
      for (const transformed of [false, true])
        assertClean(
          customerSvg(id, { color: transformed ? '#1fa338' : animal.base, mood, potion: '#ff780d', transformed }),
          `${id} ${mood} ${transformed}`,
        );
});

test('every level draws valid customers, cauldron colors and bottles', () => {
  for (const level of levels) {
    for (const id of level.bottles) assertClean(bottleSvg(toHex(mix({ [id]: 1 }))), `${level.name} ${id}`);
    for (const customer of level.customers) {
      const potion = toHex(mix(customer.recipe));
      for (const mood of moods) assertClean(customerSvg(customer.animal, { color: potion, mood, potion, transformed: mood === 'happy' }), level.name);
      // Cauldron at every drop count from empty to full along the reference solution, then padded.
      const drops = [...customer.solution];
      while (drops.length < level.capacity) drops.push(level.bottles[drops.length % level.bottles.length]);
      for (let n = 0; n <= level.capacity; n++) assertClean(cauldronSvg(toHex(mix(countDrops(drops.slice(0, n))))), `${level.name} ${n}`);
      assertClean(flaskSvg(potion), level.name);
    }
  }
  assertClean(grannySvg(), 'granny');
  for (const id of colorIds) assertClean(bottleSvg(toHex(mix({ [id]: 1 }))), id);
});

test('the transformed customer wears the potion color', () => {
  const svg = customerSvg('frog', { color: '#1fa338', mood: 'happy', transformed: true });
  assert.match(svg, /fill="#1fa338"/);
  assert.match(svg, /translate\(0 30\)/, 'the frog hides in the grass');
  assert.match(customerSvg('snowman', { color: '#8aa6f0', mood: 'happy', transformed: true }), /#7fb2e5/, 'snowflakes');
});

test('the portal card illustration has valid paths', () => {
  assertClean(illustration('potion'), 'portal art');
});
