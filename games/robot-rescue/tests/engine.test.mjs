import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '../levels.js';
import {
  initialState,
  step,
  result,
  simulate,
  compile,
  programSize,
} from '../engine.js';

test('all 18 rescue missions have working three-star programs', () => {
  assert.equal(levels.length, 18);
  for (const level of levels) {
    const outcome = simulate(level, level.solution);
    assert.equal(outcome.success, true, `${level.name}: ${outcome.message}`);
    assert.equal(outcome.stars, 3, level.name);
    assert.equal(outcome.state.rescued.length, level.animals.length);
  }
});

test('turns are relative and never move the robot; collision leaves position unchanged', () => {
  const level = levels[0],
    original = initialState(level);
  const left = step(level, original, 'left');
  assert.equal(left.direction, 3);
  assert.deepEqual(left.position, original.position);
  assert.equal(original.direction, 0);
  assert.equal(step(level, left, 'right').direction, 0);
  const edge = { ...original, position: [0, 0], direction: 2 };
  const collision = step(level, edge, 'forward');
  assert.match(collision.failure, /边缘/);
  assert.deepEqual(collision.position, [0, 0]);
});

test('rescue requires a friend on the current tile; reaching home alone is not success', () => {
  const level = levels[0];
  assert.match(step(level, initialState(level), 'rescue').failure, /没有/);
  let state = { ...initialState(level), position: level.animals[0].at };
  state = step(level, state, 'rescue');
  assert.equal(state.rescued.length, 1);
  assert.match(step(level, state, 'rescue').failure, /没有/);
  assert.equal(
    result(
      level,
      { ...initialState(level), position: level.goal },
      level.solution,
    ).success,
    false,
  );
});

test('bridge requires the switch; probe branches on the effective obstacle state', () => {
  const level = levels[8];
  let state = { ...initialState(level), position: level.switchAt };
  assert.match(step(level, state, 'forward').failure, /桥/);
  assert.equal(step(level, state, 'probe').event, 'turn-probe');
  assert.match(step(level, initialState(level), 'switch').failure, /开关/);
  state = step(level, state, 'switch');
  assert.equal(state.bridgeOpen, true);
  const moved = step(level, state, 'probe');
  assert.equal(moved.failure, null);
  assert.notDeepEqual(moved.position, state.position);
});

test('repeat expands in execution order with iteration and source mapping', () => {
  const program = [
    {
      type: 'repeat',
      times: 3,
      body: [{ type: 'forward' }, { type: 'right' }],
    },
    { type: 'rescue' },
  ];
  const { steps } = compile(program);
  assert.deepEqual(
    steps.map((s) => s.type),
    ['forward', 'right', 'forward', 'right', 'forward', 'right', 'rescue'],
  );
  assert.deepEqual(
    steps.slice(0, 6).map((s) => s.iteration),
    [1, 1, 2, 2, 3, 3],
  );
  assert.equal(steps[4].source, '0:0');
  assert.equal(programSize(program), 4);
});

test('invalid and unbounded programs are rejected before execution', () => {
  for (const program of [
    [],
    [{ type: 'unknown' }],
    [{ type: 'repeat', times: 3, body: [] }],
    [{ type: 'repeat', times: 9, body: [{ type: 'forward' }] }],
    [{ type: 'repeat', times: 2, body: [{ type: 'repeat' }] }],
    Array.from({ length: 41 }, () => ({ type: 'forward' })),
  ])
    assert.ok(compile(program).error);
  const tooLong = Array.from({ length: 4 }, () => ({
    type: 'repeat',
    times: 4,
    body: Array.from({ length: 12 }, () => ({ type: 'forward' })),
  }));
  assert.ok(compile(tooLong).error);
});

test('a valid rescue can finish with one star; a stopped program cannot win', () => {
  const level = { ...levels[0], budget: 1, crystals: [[6, 5]] };
  assert.equal(simulate(level, level.solution).stars, 1);
  const stopped = simulate(level, [{ type: 'rescue' }, ...level.solution]);
  assert.equal(stopped.success, false);
  assert.equal(stopped.state.moves, 1);
});
