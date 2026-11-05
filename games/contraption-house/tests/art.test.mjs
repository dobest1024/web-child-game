import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, tools } from '../levels.js';
import { pieceArt, scene } from '../art.js';

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

test('every tool draws valid SVG paths in both directions', () => {
  for (const type of Object.keys(tools))
    for (const direction of [1, -1])
      assert.deepEqual(brokenMoves(pieceArt([300, 200], { type, direction })), [], `${type} ${direction}`);
});

test('every workshop scene draws valid SVG paths', () => {
  for (const level of levels)
    assert.deepEqual(brokenMoves(scene(level, level.solution, level.start, { type: level.available[0], direction: 1 }, [], -1)), [], level.name);
});
