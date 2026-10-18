import assert from "node:assert/strict";
import { WebSocket } from "ws";
const base = process.env.TEST_URL || "http://localhost:8790";
const sockets = [];
function wait(client, predicate, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      const found = client.messages.find(predicate);
      if (found) {
        clearInterval(poll);
        resolve(found);
      } else if (Date.now() - started > timeout) {
        clearInterval(poll);
        reject(new Error(`Timed out: ${predicate}`));
      }
    }, 25);
  });
}
async function connect(code, name, token) {
  const url = new URL("/ws", base);
  url.protocol = base.startsWith("https") ? "wss:" : "ws:";
  url.searchParams.set("code", code);
  url.searchParams.set("name", name);
  if (token) url.searchParams.set("token", token);
  const ws = new WebSocket(url),
    client = {
      ws,
      messages: [],
      send: (data) => ws.send(JSON.stringify(data)),
    };
  sockets.push(ws);
  ws.on("error", () => {});
  ws.on("message", (raw) => client.messages.push(JSON.parse(raw)));
  client.welcome = await wait(client, (m) => m.type === "welcome");
  return client;
}
async function create(mode = "pvp") {
  const response = await fetch(`${base}/api/rooms?mode=${mode}`, {
    method: "POST",
  });
  assert.equal(response.status, 201);
  return (await response.json()).code;
}
try {
  assert.equal((await fetch(`${base}/health`)).status, 200);
  if (!process.env.WORKER_TEST) {
    assert.equal((await fetch(`${base}/server/local.js`)).status, 404);
    assert.equal((await fetch(`${base}/package.json`)).status, 404);
  }
  const code = await create();
  const a = await connect(code, "蓝方"),
    b = await connect(code, "红方");
  assert.equal(a.welcome.team, 0);
  assert.equal(b.welcome.team, 1);
  a.send({ type: "ready" });
  b.send({ type: "ready" });
  await wait(a, (m) => m.game?.time > 0.1 && !m.countdown);
  a.send({ type: "play", slot: 0, x: -3.8, z: -4 });
  await wait(a, (m) => m.type === "error" && m.message.includes("己方半场"));
  a.send({ type: "play", slot: 0, x: -3.8, z: 4 });
  b.send({ type: "play", slot: 1, x: -3.8, z: -4 });
  const seenA = await wait(a, (m) => m.game?.units.length === 3);
  const seenB = await wait(
    b,
    (m) => m.game?.units.length === 3 && m.game.time === seenA.game.time,
  );
  assert.deepEqual(seenA.game.units, seenB.game.units);
  assert.deepEqual(seenA.game.towers, seenB.game.towers);
  assert.equal(seenA.game.players[1].hand, undefined);
  assert.equal(seenB.game.players[0].hand, undefined);
  a.ws.close();
  await wait(b, (m) => m.seats?.[0]?.connected === false);
  const resumed = await connect(code, "蓝方", a.welcome.token);
  assert.equal(resumed.welcome.team, 0);
  const resumeState = await wait(
    resumed,
    (m) => m.game?.time >= seenA.game.time,
  );
  assert.ok(resumeState.game.units.length > 0);
  resumed.send({ type: "surrender" });
  const result = await wait(b, (m) => m.game?.phase === "ended");
  assert.equal(result.game.result.winner, 1);
  resumed.messages = [];
  b.messages = [];
  resumed.send({ type: "ready" });
  b.send({ type: "ready" });
  const rematch = await wait(b, (m) => m.countdown > 0 && m.game?.time === 0);
  assert.equal(rematch.game.units.length, 0);
  resumed.send({ type: "leave" });
  b.send({ type: "leave" });
  const bot = await connect(await create("bot"), "练习者");
  const botState = await wait(
    bot,
    (m) => m.game?.units.some((u) => u.team === 1),
    15000,
  );
  assert.ok(botState.game.players[0].elixir <= 10);
  bot.send({ type: "leave" });
  console.log(
    JSON.stringify(
      {
        result: "PASS",
        server: base,
        checks: [
          "HTTP/static boundaries",
          "room creation",
          "two player readiness",
          "deployment validation",
          "identical server tick for two clients",
          "hidden opposing hand",
          "token reconnect preserves combat",
          "surrender result",
          "mutual rematch resets game",
          "AI real-time deployment",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  for (const ws of sockets) ws.close();
}
