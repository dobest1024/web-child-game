import { CARDS, DECK, ARENA, RULES } from "./cards.js";

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export class Game {
  constructor(names = ["挑战者", "训练骑士"]) {
    this.time = 0;
    this.phase = "playing";
    this.result = null;
    this.nextId = 1;
    this.units = [];
    this.effects = [];
    this.players = names.map((name) => ({
      name,
      elixir: 5,
      hand: DECK.slice(0, 4),
      queue: DECK.slice(4),
      crowns: 0,
    }));
    this.towers = [0, 1].flatMap((team) => {
      const sign = team === 0 ? 1 : -1;
      return [
        { x: -3.8, z: sign * 7, king: false },
        { x: 3.8, z: sign * 7, king: false },
        { x: 0, z: sign * 9.3, king: true },
      ].map((t) => ({
        ...t,
        team,
        id: this.nextId++,
        hp: t.king ? 3600 : 2300,
        maxHp: t.king ? 3600 : 2300,
        cooldown: 0,
        active: !t.king,
        range: 5.2,
      }));
    });
    this.botNext = 1.5;
  }
  event(type, data) {
    this.effects.push({ id: this.nextId++, type, at: this.time, ...data });
  }
  deploy(team, slot, x, z) {
    if (this.phase !== "playing") return "比赛已结束";
    if (
      ![0, 1].includes(team) ||
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot > 3
    )
      return "无效的卡牌";
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      Math.abs(x) > 6.6 ||
      Math.abs(z) > 10.5
    )
      return "请选择竞技场内的位置";
    const player = this.players[team];
    const card = CARDS[player.hand[slot]];
    if (player.elixir + 0.00001 < card.cost) return "圣水不足";
    if (!card.spell && (team === 0 ? z < 1.45 : z > -1.45))
      return "请在己方半场部署部队";
    if (
      !card.spell &&
      this.towers.some(
        (t) => t.hp > 0 && Math.hypot(t.x - x, t.z - z) < (t.king ? 1.35 : 1),
      )
    )
      return "不能部署在防御塔上";
    player.elixir -= card.cost;
    player.hand[slot] = player.queue.shift();
    player.queue.push(card.id);
    if (card.spell) {
      this.event(card.id, { x, z, team, radius: card.radius });
      for (const target of [...this.units, ...this.towers]) {
        if (
          target.team !== team &&
          target.hp > 0 &&
          distance(target, { x, z }) <= card.radius
        ) {
          this.hurt(
            target,
            target.maxHp ? card.towerDamage : card.damage,
            team,
          );
        }
      }
      this.checkResult();
    } else {
      for (let i = 0; i < card.count; i++) {
        this.units.push({
          id: this.nextId++,
          card: card.id,
          team,
          x: clamp(x + (i - (card.count - 1) / 2) * 0.65, -6.5, 6.5),
          z,
          hp: card.hp,
          cooldown: 0.65,
          age: 0,
          facing: team === 0 ? Math.PI : 0,
        });
      }
      this.event("deploy", { x, z, team });
    }
    return null;
  }
  hurt(target, damage, attacker) {
    if (target.hp <= 0) return;
    target.hp = Math.max(0, target.hp - damage);
    if (target.maxHp) target.active = true;
    if (target.hp === 0) {
      this.event(target.maxHp ? "collapse" : "death", {
        x: target.x,
        z: target.z,
        team: target.team,
      });
      if (target.maxHp) {
        this.players[attacker].crowns += target.king
          ? 3 - this.players[attacker].crowns
          : 1;
        this.towers
          .filter((t) => t.team === target.team && t.king)
          .forEach((t) => {
            t.active = true;
          });
      }
    }
  }
  finish(winner, reason) {
    this.phase = "ended";
    this.result = { winner, reason };
  }
  forfeit(team) {
    if (this.phase === "playing") this.finish(1 - team, "对手离开了战场");
  }
  checkResult() {
    if (this.phase !== "playing") return;
    const deadKing = this.towers.find((t) => t.king && t.hp <= 0);
    if (deadKing) return this.finish(1 - deadKing.team, "国王塔被摧毁");
    const [a, b] = this.players.map((p) => p.crowns);
    if (this.time >= RULES.duration && a !== b)
      return this.finish(
        a > b ? 0 : 1,
        this.time >= RULES.duration + 0.1 ? "加时赛决胜" : "皇冠领先",
      );
    if (this.time >= RULES.duration + RULES.overtime) {
      const hp = [0, 1].map((team) =>
        this.towers
          .filter((t) => t.team === team)
          .reduce((sum, t) => sum + t.hp, 0),
      );
      this.finish(
        hp[0] === hp[1] ? null : hp[0] > hp[1] ? 0 : 1,
        hp[0] === hp[1] ? "势均力敌" : "剩余塔生命值决胜",
      );
    }
  }
  step(dt = RULES.tick) {
    if (this.phase !== "playing") return;
    this.time += dt;
    const multiplier = this.time >= 120 ? 2 : 1;
    this.players.forEach((p) => {
      p.elixir = Math.min(
        RULES.maxElixir,
        p.elixir + (dt * multiplier) / RULES.regeneration,
      );
    });
    this.effects = this.effects.filter((e) => this.time - e.at < 1.3);
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      if (tower.hp <= 0 || !tower.active || tower.cooldown > 0) continue;
      const target = this.units
        .filter(
          (u) =>
            u.team !== tower.team &&
            u.hp > 0 &&
            distance(u, tower) <= tower.range,
        )
        .sort((a, b) => distance(a, tower) - distance(b, tower))[0];
      if (target) {
        this.hurt(target, tower.king ? 100 : 88, tower.team);
        this.event("shot", {
          x: tower.x,
          z: tower.z,
          tx: target.x,
          tz: target.z,
          team: tower.team,
          source: "tower",
        });
        tower.cooldown = tower.king ? 1 : 0.9;
      }
    }
    for (const unit of this.units) {
      if (unit.hp <= 0) continue;
      const card = CARDS[unit.card];
      unit.age += dt;
      unit.cooldown -= dt;
      if (unit.age < 0.65) continue;
      const enemyTowers = this.towers.filter(
        (t) => t.team !== unit.team && t.hp > 0,
      );
      const enemyUnits = card.buildingsOnly
        ? []
        : this.units.filter(
            (u) =>
              u.team !== unit.team &&
              u.hp > 0 &&
              (!CARDS[u.card].flying || card.airAttack) &&
              distance(unit, u) < 5,
          );
      const target = [...enemyUnits, ...enemyTowers].sort(
        (a, b) => distance(a, unit) - distance(b, unit),
      )[0];
      if (!target) continue;
      const range = card.range + (target.maxHp ? 0.55 : 0);
      if (distance(unit, target) <= range) {
        unit.facing = Math.atan2(target.x - unit.x, target.z - unit.z);
        if (unit.cooldown <= 0) {
          this.hurt(target, card.damage, unit.team);
          if (card.splash)
            for (const other of this.units) {
              if (
                other.id !== target.id &&
                other.team !== unit.team &&
                other.hp > 0 &&
                (!CARDS[other.card].flying || card.airAttack) &&
                distance(other, target) < card.splash
              )
                this.hurt(other, card.damage, unit.team);
            }
          this.event("shot", {
            x: unit.x,
            z: unit.z,
            tx: target.x,
            tz: target.z,
            team: unit.team,
            source: unit.card,
          });
          unit.cooldown = card.cooldown;
        }
      } else {
        const waypoint = this.waypoint(unit, target, card.flying);
        const d = distance(unit, waypoint);
        if (d > 0.01) {
          const travel = Math.min(d, card.speed * dt);
          unit.x += ((waypoint.x - unit.x) / d) * travel;
          unit.z += ((waypoint.z - unit.z) / d) * travel;
          unit.facing = Math.atan2(waypoint.x - unit.x, waypoint.z - unit.z);
        }
      }
    }
    this.separateUnits();
    this.units = this.units.filter((u) => u.hp > 0);
    this.checkResult();
  }
  waypoint(unit, target, flying) {
    if (flying) return target;
    const bridgeX = unit.x < 0 ? -ARENA.bridgeX : ARENA.bridgeX;
    const direction = Math.sign(target.z - unit.z);
    const crossing = unit.z * target.z < 0 || Math.abs(unit.z) < 1.3;
    if (!crossing) return target;
    if (Math.abs(unit.z) > 1.3 && Math.abs(unit.x - bridgeX) > 0.25)
      return { x: bridgeX, z: Math.sign(unit.z) * 1.45 };
    return { x: bridgeX, z: direction * 1.55 };
  }
  separateUnits() {
    for (let i = 0; i < this.units.length; i++) {
      const a = this.units[i];
      for (let j = i + 1; j < this.units.length; j++) {
        const b = this.units[j];
        if (
          a.team !== b.team ||
          !!CARDS[a.card].flying !== !!CARDS[b.card].flying
        )
          continue;
        const d = distance(a, b);
        if (d < 0.47 && d > 0.001) {
          const push = (0.47 - d) * 0.15;
          a.x = clamp(a.x + ((a.x - b.x) / d) * push, -6.6, 6.6);
          b.x = clamp(b.x - ((a.x - b.x) / d) * push, -6.6, 6.6);
        }
      }
      if (!CARDS[a.card].flying && Math.abs(a.z) < 1.15) {
        const center = a.x < 0 ? -ARENA.bridgeX : ARENA.bridgeX;
        a.x = clamp(a.x, center - 0.7, center + 0.7);
      }
    }
  }
  bot(team = 1) {
    if (this.time < this.botNext || this.phase !== "playing") return;
    this.botNext = this.time + 1.3;
    const p = this.players[team];
    const sign = team === 0 ? 1 : -1;
    const threats = this.units.filter((u) => u.team !== team && u.z * sign > 0);
    const affordable = p.hand
      .map((id, slot) => ({ ...CARDS[id], slot }))
      .filter((c) => c.cost <= p.elixir);
    const spell = affordable.find((c) => c.spell && threats.length >= 2);
    const card =
      spell ||
      affordable.find(
        (c) => !c.spell && (threats.length || c.buildingsOnly || p.elixir > 7),
      ) ||
      affordable.find((c) => !c.spell && p.elixir > 5);
    if (!card) return;
    const threat = threats[0];
    const lane = threat
      ? Math.sign(threat.x || 1)
      : Math.floor(this.time / 13) % 2
        ? -1
        : 1;
    this.deploy(
      team,
      card.slot,
      card.spell ? threat.x : lane * 3.8,
      card.spell
        ? threat.z
        : sign * (threat ? 4.5 : card.buildingsOnly ? 8.9 : 3.4),
    );
  }
  snapshot(team) {
    return {
      time: this.time,
      phase: this.phase,
      result: this.result,
      towers: this.towers,
      units: this.units,
      effects: this.effects,
      players: this.players.map((p, i) => ({
        name: p.name,
        crowns: p.crowns,
        ...(i === team
          ? { elixir: p.elixir, hand: p.hand, next: p.queue[0] }
          : {}),
      })),
    };
  }
}
