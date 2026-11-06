import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYERS,
  createInitialState,
  canPawnMove,
  getMovablePawns,
  movePawn,
  chooseAiMove,
  sanitizeProgress,
} from '../engine.js';

test('animal-ludo engine: initial state setup', () => {
  const state = createInitialState(4, [false, true, true, true]);
  assert.equal(state.playerCount, 4);
  assert.equal(state.pawns.length, 8); // 4 players * 2 pawns
  assert.equal(state.activePlayer, 0);
  assert.equal(state.winner, null);
  assert.equal(state.pawns.every((p) => p.state === 'hangar'), true);
});

test('animal-ludo engine: launching from hangar requires 5 or 6', () => {
  const state = createInitialState(4, [false, true, true, true]);
  const p0 = state.pawns[0];

  assert.equal(canPawnMove(p0, 4), false);
  assert.equal(canPawnMove(p0, 5), true);
  assert.equal(canPawnMove(p0, 6), true);

  const res = movePawn(state, p0.id, 5);
  assert.equal(res.success, true);
  const updatedP0 = res.state.pawns.find((p) => p.id === p0.id);
  assert.equal(updatedP0.state, 'track');
  assert.equal(updatedP0.trackPos, PLAYERS[0].startTrack);
});

test('animal-ludo engine: moving on track and jumping', () => {
  let state = createInitialState(4, [false, true, true, true]);
  const p0 = state.pawns[0];

  // Launch p0
  state = movePawn(state, p0.id, 6).state;
  // Move 3 steps on track
  state = movePawn(state, p0.id, 3).state;
  const p0Moved = state.pawns.find((p) => p.id === p0.id);
  assert.equal(p0Moved.state, 'track');
  assert.equal(p0Moved.stepCount, 3);
});

test('animal-ludo engine: knocking opponent pawn back to hangar', () => {
  let state = createInitialState(4, [false, true, true, true]);
  const redPawn = state.pawns.find((p) => p.player === 0);
  const yellowPawn = state.pawns.find((p) => p.player === 1);

  // Put yellow pawn on track pos 2
  yellowPawn.state = 'track';
  yellowPawn.trackPos = 2;
  yellowPawn.stepCount = 20;

  // Launch red pawn and move it to track pos 2
  redPawn.state = 'track';
  redPawn.trackPos = 0;
  redPawn.stepCount = 0;

  // Red moves 2 steps to land on pos 2
  const res = movePawn(state, redPawn.id, 2);
  assert.equal(res.success, true);
  assert.ok(res.knockedPawn);
  assert.equal(res.knockedPawn.player, 1);

  // Check yellow is back in hangar
  const afterYellow = res.state.pawns.find((p) => p.id === yellowPawn.id);
  assert.equal(afterYellow.state, 'hangar');
  assert.equal(afterYellow.stepCount, 0);
});

test('animal-ludo engine: chooseAiMove and sanitizeProgress', () => {
  const state = createInitialState(4, [false, true, true, true]);
  // Roll 5 allows AI player to launch
  state.activePlayer = 1;
  const move = chooseAiMove(state, 5);
  assert.ok(move);
  assert.ok(move.startsWith('1-'));

  const clean = sanitizeProgress({ wins: 5, gamesPlayed: 12 });
  assert.deepEqual(clean, { wins: 5, gamesPlayed: 12 });
});
