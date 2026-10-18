import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../shared/game.js";
import { CARDS } from "../shared/cards.js";
const advance = (game, seconds) => {
  for (let i = 0; i < seconds * 20; i++) game.step();
};

test("deployment charges elixir once and cycles a complete eight-card deck", () => {
  const g = new Game();
  assert.equal(g.deploy(0, 0, -3.8, 4), null);
  assert.equal(g.players[0].elixir, 2);
  assert.equal(g.units.length, 1);
  assert.equal(g.players[0].hand[0], "bomber");
  assert.equal(g.players[0].queue.at(-1), "knight");
  const before = JSON.stringify(g.snapshot(0));
  assert.equal(g.deploy(0, 0, -3.8, 4), "圣水不足");
  assert.equal(JSON.stringify(g.snapshot(0)), before);
});
test("hostile deployment, tower overlap, invalid slots and malformed coordinates do not mutate state", () => {
  const g = new Game();
  for (const [team, slot, x, z] of [
    [0, 0, 0, -2],
    [1, 0, 0, 2],
    [0, 0, 3.8, 7],
    [0, 0, NaN, 4],
    [0, 4, 1, 4],
    [0, 1, Infinity, 4],
    [0, 0, 8, 4],
  ]) {
    const before = JSON.stringify(g);
    assert.ok(g.deploy(team, slot, x, z));
    assert.equal(JSON.stringify(g), before);
  }
});
test("regeneration caps at ten and doubles in the final minute", () => {
  const g = new Game();
  g.players[0].elixir = 0;
  advance(g, 2.8);
  assert.ok(Math.abs(g.players[0].elixir - 1) < 0.001);
  g.time = 120;
  g.players[0].elixir = 0;
  advance(g, 2.8);
  assert.ok(Math.abs(g.players[0].elixir - 2) < 0.001);
  advance(g, 20);
  assert.equal(g.players[0].elixir, 10);
});
test("ground troops cross bridges, reach enemy towers, and deal damage", () => {
  const g = new Game();
  g.players[0].elixir = 10;
  g.deploy(0, 2, 0, 4);
  let crossed = false;
  for (let i = 0; i < 700; i++) {
    g.step();
    for (const u of g.units)
      if (Math.abs(u.z) < 1.15) {
        crossed = true;
        assert.ok(Math.abs(Math.abs(u.x) - 3.8) < 0.8);
      }
  }
  assert.ok(crossed);
  assert.ok(g.towers.some((t) => t.team === 1 && t.hp < t.maxHp));
});
test("melee cannot hit flying troops while archers can", () => {
  const g = new Game();
  g.deploy(0, 0, 0, 4);
  g.towers.forEach((t) => {
    t.cooldown = 1000;
  });
  g.units.push({
    id: 99,
    card: "dragon",
    team: 1,
    x: 0,
    z: 4.8,
    hp: 860,
    age: 2,
    cooldown: 100,
    facing: 0,
  });
  advance(g, 1);
  assert.equal(g.units.find((u) => u.id === 99).hp, 860);
  g.players[0].elixir = 10;
  g.deploy(0, 1, 0, 4);
  advance(g, 1.2);
  assert.ok(g.units.find((u) => u.id === 99).hp < 860);
});
test("spells damage only enemies, hit air and deal reduced tower damage", () => {
  const g = new Game();
  g.players[0].hand[0] = "fireball";
  g.units.push(
    { id: 77, card: "dragon", team: 1, hp: 860, x: -3.8, z: -7 },
    { id: 78, card: "knight", team: 0, hp: 1050, x: -3.8, z: -7 },
  );
  assert.equal(g.deploy(0, 0, -3.8, -7), null);
  assert.equal(g.units[0].hp, 860 - CARDS.fireball.damage);
  assert.equal(g.units[1].hp, 1050);
  assert.equal(
    g.towers.find((t) => t.team === 1 && t.x === -3.8).hp,
    2300 - CARDS.fireball.towerDamage,
  );
});
test("king tower activates after princess tower falls and king defeat ends immediately", () => {
  const g = new Game();
  const princess = g.towers.find((t) => t.team === 1 && !t.king);
  g.hurt(princess, 99999, 0);
  g.checkResult();
  assert.equal(g.players[0].crowns, 1);
  assert.equal(g.towers.find((t) => t.team === 1 && t.king).active, true);
  g.hurt(
    g.towers.find((t) => t.team === 1 && t.king),
    99999,
    0,
  );
  g.checkResult();
  assert.equal(g.result.winner, 0);
  assert.equal(g.players[0].crowns, 3);
  assert.ok(g.deploy(0, 1, 0, 3));
});
test("regulation, overtime sudden death, health tie breaker and draw", () => {
  const lead = new Game();
  lead.players[0].crowns = 1;
  lead.time = 180;
  lead.checkResult();
  assert.equal(lead.result.winner, 0);
  const extra = new Game();
  extra.time = 180;
  extra.checkResult();
  assert.equal(extra.phase, "playing");
  extra.players[1].crowns = 1;
  extra.time = 181;
  extra.checkResult();
  assert.equal(extra.result.winner, 1);
  const hp = new Game();
  hp.time = 240;
  hp.towers[0].hp -= 1;
  hp.checkResult();
  assert.equal(hp.result.winner, 1);
  const draw = new Game();
  draw.time = 240;
  draw.checkResult();
  assert.equal(draw.result.winner, null);
});
test("snapshots do not reveal opponent hand or elixir", () => {
  const g = new Game();
  assert.ok(g.snapshot(0).players[0].hand);
  assert.equal(g.snapshot(0).players[1].hand, undefined);
  assert.equal(g.snapshot(0).players[1].elixir, undefined);
});
test("AI completes a full match with legal deployments and actual tower damage", () => {
  const g = new Game();
  for (let i = 0; i < 5000 && g.phase === "playing"; i++) {
    g.step();
    g.bot(1);
  }
  assert.equal(g.phase, "ended");
  assert.equal(g.result.winner, 1);
  assert.ok(g.towers.some((t) => t.team === 0 && t.hp < t.maxHp));
  assert.ok(g.players.every((p) => p.elixir >= 0 && p.elixir <= 10));
});
test("bomber splash hits a ground group but not a nearby flying unit", () => {
  const g = new Game();
  g.towers.forEach((t) => {
    t.cooldown = 1000;
  });
  g.players[0].hand[0] = "bomber";
  g.deploy(0, 0, 0, 3);
  for (let i = 0; i < 3; i++)
    g.units.push({
      id: 100 + i,
      card: "goblins",
      team: 1,
      x: 0.2 * i,
      z: 2.2,
      hp: 190,
      age: 2,
      cooldown: 100,
      facing: 0,
    });
  g.units.push({
    id: 103,
    card: "dragon",
    team: 1,
    x: 0,
    z: 2.2,
    hp: 860,
    age: 2,
    cooldown: 100,
    facing: 0,
  });
  advance(g, 0.7);
  assert.equal(
    g.units.filter((u) => u.card === "goblins" && u.hp === 35).length,
    3,
  );
  assert.equal(g.units.find((u) => u.id === 103).hp, 860);
});
