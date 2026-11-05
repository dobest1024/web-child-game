import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, key } from '../levels.js';
import { initialState, move, gateOpen, complete, score, simulate } from '../engine.js';

test('all twelve authored cooperative deliveries complete with three stars', () => {
  assert.equal(levels.length, 12);
  for (const level of levels) {
    const state = simulate(level);
    assert.equal(complete(level, state), true, level.name);
    assert.equal(score(level, state), 3, level.name);
    assert.equal(state.bumps, 0, level.name);
    assert.equal(new Set(state.delivered).size, level.packages.length, level.name);
  }
});

test('the relay needs one friend to hold a plate, then the other holds the far plate', () => {
  const level = levels[2];
  let state = initialState(level);
  assert.equal(gateOpen(level, state), false);
  state = move(level, state, 1, 'right'); state = move(level, state, 1, 'right');
  const blocked = move(level, state, 1, 'right');
  assert.equal(blocked.event, 'blocked'); assert.deepEqual(blocked.players[1], [3, 4]);
  state = move(level, state, 0, 'right'); assert.equal(gateOpen(level, state), true);
  for (let i = 0; i < 3; i++) state = move(level, state, 1, 'right');
  assert.deepEqual(state.players[1], [6, 4]);
  for (let i = 0; i < 4; i++) state = move(level, state, 0, 'right');
  assert.equal(complete(level, state), true);
});

test('releasing a plate shuts the gate but never traps a character already standing in it', () => {
  const level = levels[2];
  let state = initialState(level);
  state.players = [[2, 1], [4, 4]];
  state = move(level, state, 0, 'left');
  assert.equal(gateOpen(level, state), false);
  state = move(level, state, 1, 'right');
  assert.deepEqual(state.players[1], [5, 4]); assert.notEqual(state.event, 'blocked');
});

test('only the matching courier can pick up and deliver a parcel', () => {
  const level = levels[0];
  let state = initialState(level);
  state.players[1] = [2, 0]; state = move(level, state, 1, 'down');
  assert.deepEqual(state.carried[1], []);
  state = initialState(level); state = move(level, state, 0, 'right');
  assert.equal(state.carried[0].length, 1);
  for (let i = 0; i < 4; i++) state = move(level, state, 0, 'right');
  assert.equal(state.delivered.length, 1); assert.equal(state.carried[0].length, 0);
});

test('exclusive terrain, occupied tiles, walls and map boundaries prevent movement', () => {
  const level = levels[4];
  const base = initialState(level);
  base.players[1] = [3, 0];
  assert.equal(move(level, base, 1, 'down').event, 'blocked');
  base.players = [[1, 1], [2, 1]];
  assert.equal(move(level, base, 0, 'right').event, 'blocked');
  base.players[0] = [0, 0];
  assert.equal(move(level, base, 0, 'left').event, 'blocked');
  const wall = level.walls.map((s) => s.split(',').map(Number)).find(([x]) => x > 0);
  base.players[0] = [wall[0] - 1, wall[1]];
  assert.equal(move(level, base, 0, 'right').event, 'blocked');
});

test('moves are immutable, undo snapshots restore parcels, and score counts bumps', () => {
  const level = levels[0];
  const previous = initialState(level);
  const next = move(level, previous, 0, 'right');
  assert.deepEqual(previous.players[0], [1, 1]); assert.equal(previous.picked.length, 0);
  assert.equal(next.picked.length, 1);
  const finished = simulate(level); finished.bumps = 1; finished.moves += 2;
  assert.equal(score(level, finished), 1);
  assert.deepEqual(move(level, finished, 0, 'left'), finished);
});
