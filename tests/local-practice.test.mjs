import test from 'node:test';
import assert from 'node:assert/strict';
import { Connection } from '../games/huang/src/network-local.js';

test('static AI practice supports play, surrender, rematch and cleanup', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: 10000 });
  const states = [];
  let welcome;
  const connection = new Connection({
    onWelcome: (value) => { welcome = value; },
    onState: (value) => states.push(value),
    onStatus() {}, onError() {}, onPing() {},
  });
  t.after(() => connection.leave());
  await connection.create('bot', '小棋手');
  assert.equal(welcome.mode, 'bot');
  for (let i = 0; i < 80; i++) t.mock.timers.tick(50);
  await Promise.resolve();
  assert.equal(states.at(-1).game.phase, 'playing');
  assert.equal(states.at(-1).countdown, 0);
  assert.equal(states.at(-1).seats[1].connected, true);
  connection.send({ type: 'play', slot: 0, x: 0, z: 4 });
  assert.ok(connection.room.game.units.some((unit) => unit.team === 0));
  connection.send({ type: 'surrender' });
  assert.equal(connection.room.game.phase, 'ended');
  connection.send({ type: 'ready' });
  assert.equal(connection.room.game.phase, 'playing');
  assert.equal(connection.room.game.time, 0);
  connection.leave();
  await Promise.resolve();
  const count = states.length;
  t.mock.timers.tick(5000);
  await Promise.resolve();
  assert.equal(states.length, count);
  assert.equal(connection.send({ type: 'play' }), false);
});

test('static preview rejects multiplayer instead of pretending to connect', async () => {
  const errors = [];
  const connection = new Connection({ onError: (message) => errors.push(message) });
  await assert.rejects(connection.create('pvp', '玩家'), /单人/);
  connection.join('ABC123');
  assert.match(errors[0], /暂不支持好友/);
});
