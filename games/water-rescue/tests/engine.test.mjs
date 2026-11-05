import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, initialTiles, solutionTiles } from '../levels.js';
import { flow, turnTile, toggleValve, score } from '../engine.js';

test('all 15 authored gardens require changes and have a leak-free three-star solution', () => {
  assert.equal(levels.length, 15);
  for (const level of levels) {
    assert.equal(flow(level, initialTiles(level)).success, false, level.name);
    const outcome = flow(level, solutionTiles(level));
    assert.equal(outcome.success, true, level.name);
    assert.equal(outcome.watered.length, level.flowers.length);
    assert.equal(outcome.leaks.length, 0);
    assert.equal(score(level, outcome, level.budget, 1), 3);
  }
});
test('rotating a tile preserves the original board and fixed tiles cannot rotate', () => {
  const level = levels[0],
    original = initialTiles(level);
  const rotated = turnTile(original, '2,2');
  assert.equal(original.find((tile) => tile.at === '2,2').rotation, 0);
  assert.equal(rotated.find((tile) => tile.at === '2,2').rotation, 1);
  assert.deepEqual(turnTile(original, level.source), original);
});
test('closed valves stop water and opening them resumes every downstream target', () => {
  const level = levels[6];
  const solved = solutionTiles(level);
  const valve = solved.find((tile) => tile.kind === 'valve');
  const closed = toggleValve(solved, valve.at);
  const outcome = flow(level, closed);
  assert.equal(outcome.success, false);
  assert.ok(outcome.blocked.includes(valve.at));
  assert.equal(outcome.watered.length, 0);
  assert.equal(flow(level, toggleValve(closed, valve.at)).success, true);
});
test('all split outlets must connect, even when one flower already receives water', () => {
  const level = levels[3],
    solved = solutionTiles(level);
  const branch = solved.find((tile) => tile.at === '3,3');
  const broken = turnTile(solved, branch.at);
  const outcome = flow(level, broken);
  assert.equal(outcome.success, false);
  assert.ok(
    outcome.watered.length > 0 && outcome.watered.length < level.flowers.length,
  );
  assert.ok(outcome.leaks.length > 0);
});
test('disconnected spare pipe is dry; empty and mismatching neighboring ports leak', () => {
  const level = levels[2],
    solved = solutionTiles(level);
  const spare = solved.find((tile) => tile.spare);
  assert.equal(
    flow(level, solved).order.some((item) => item.at === spare.at),
    false,
  );
  const removed = solved.filter((tile) => tile.at !== '1,4');
  assert.ok(
    flow(level, removed).leaks.some((leak) => leak.at === level.source),
  );
});
test('closed rings terminate after each cell is visited once', () => {
  const level = { source: '0,0', flowers: [] };
  const tiles = [
    { at: '0,0', ports: [1, 2], kind: 'source', rotation: 0, open: true },
    { at: '1,0', ports: [2, 3], kind: 'pipe', rotation: 0, open: true },
    { at: '1,1', ports: [0, 3], kind: 'pipe', rotation: 0, open: true },
    { at: '0,1', ports: [0, 1], kind: 'pipe', rotation: 0, open: true },
  ];
  const outcome = flow(level, tiles);
  assert.equal(outcome.order.length, 4);
  assert.equal(new Set(outcome.order.map((item) => item.at)).size, 4);
  assert.equal(outcome.leaks.length, 0);
});
test('exceeding optional goals does not prevent one-star completion', () => {
  const level = levels[0],
    outcome = flow(level, solutionTiles(level));
  assert.equal(score(level, outcome, 100, 10), 1);
  assert.equal(score(level, flow(level, initialTiles(level)), 0, 0), 0);
});
