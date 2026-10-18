import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "../server/room.js";
const socket = () => ({
  readyState: 1,
  messages: [],
  send(raw) {
    this.messages.push(JSON.parse(raw));
  },
  close() {
    this.readyState = 3;
  },
});
function fixture() {
  let now = 1000;
  const room = new Room("ABC234", "pvp", () => now);
  const a = socket(),
    b = socket();
  room.connect(a, { name: "A" });
  room.connect(b, { name: "B" });
  return {
    room,
    a,
    b,
    advance(ms) {
      now += ms;
      room.tick();
    },
  };
}
test("two-player readiness starts countdown and third player is refused", () => {
  const { room, a, b, advance } = fixture();
  const c = socket();
  room.connect(c, { name: "C" });
  assert.equal(c.readyState, 3);
  room.receive(a, '{"type":"ready"}');
  assert.equal(room.game, null);
  room.receive(b, '{"type":"ready"}');
  assert.ok(room.countdown);
  advance(3001);
  assert.equal(room.countdown, null);
  assert.ok(room.game.time > 0);
});
test("same token reconnect restores team and prevents stale close from disconnecting new socket", () => {
  const { room, a } = fixture();
  const token = room.seats[0].token;
  room.disconnect(a);
  const fresh = socket();
  room.connect(fresh, { token, name: "changed" });
  room.disconnect(a);
  assert.equal(room.seats[0].socket, fresh);
  assert.equal(room.seats[0].name, "A");
  assert.equal(fresh.messages[0].team, 0);
});
test("disconnect grace expires to forfeit; malformed commands do not crash", () => {
  const { room, a, b, advance } = fixture();
  room.start();
  advance(3001);
  for (const raw of [
    "bad json",
    "null",
    "[]",
    '{"type":"play","slot":-1}',
    '{"type":"play","slot":0,"x":null,"z":3}',
  ])
    room.receive(a, raw);
  room.disconnect(a);
  advance(29000);
  assert.equal(room.game.phase, "playing");
  room.receive(b, '{"type":"ping"}');
  advance(1001);
  assert.equal(room.game.result.winner, 1);
});
test("both players must agree to rematch, which resets combat state", () => {
  const { room, a, b, advance } = fixture();
  room.start();
  advance(3001);
  room.game.forfeit(0);
  room.receive(a, '{"type":"ready"}');
  assert.equal(room.game.phase, "ended");
  room.receive(b, '{"type":"ready"}');
  assert.equal(room.game.phase, "playing");
  assert.equal(room.game.time, 0);
  assert.ok(room.countdown);
});
test("empty rooms expire, live rooms remain, and heartbeat disconnects silent sockets", () => {
  let now = 1000;
  const room = new Room("ABC234", "pvp", () => now);
  now += 120001;
  assert.equal(room.expired, true);
  const a = socket();
  room.connect(a, { name: "A" });
  assert.equal(room.expired, false);
  now += 20001;
  room.tick();
  assert.equal(a.readyState, 3);
  assert.equal(room.seats[0].socket, null);
  now += 120001;
  assert.equal(room.expired, true);
});
