'use strict';
// ===== 小店引擎：只管状态和规则，不碰 DOM（view.js 负责画，main.js 负责按钮和循环）=====
// 时间全部由 tick(dt) 推进，暂停时不调用；同一时间只有柜台前那位顾客能被服务

const PATIENCE = { count: 24, pick: 20, pay: 32, change: 36, exchange: 32, clock: 24, calc: 40 };
const ENTER_T = 0.7;
const LEAVE_T = 0.9;
const HELP_T = 2.2;
const GRACE_T = 15; // 耐心用完后再等这么久还没做对，小鹦鹉来帮忙
const PLATE_MAX = 20;
const BASKET_MAX = 12;
const SHOP_PRAISES = { 3: '生意兴隆！', 5: '金牌小店长！', 8: '顾客都爱你！' };
const THANKS = ['谢谢店长！', '太好啦！', '下次还来！', '你真能干！'];

function createShop(level, world, opts) {
  const assist = Math.min(3, opts.fails || 0);
  const random = opts.random || Math.random;
  const onLearn = opts.onLearn || (() => {});
  const onServe = opts.onServe || (() => {});
  // 每失败一次简单一点：顾客少、营业久、耐心多、选项少，第 2 档起一直显示合计
  const goal = Math.max(3, level.goal - (assist >= 3 ? 2 : assist >= 1 ? 1 : 0));
  const options = Math.max(2, (level.options || 3) - (assist >= 1 ? 1 : 0));
  const dayLen = Math.round(level.goal * level.secs * (1 + assist * 0.15));
  const G = {
    L: level, world, assist, goal, dayLen, dayLeft: dayLen,
    time: 0, served: 0, coins: 0, wrong: 0, combo: 0, frowned: false, lostHeart: false,
    hearts: level.boss ? 3 : null,
    boss: level.boss ? { hp: goal, max: goal, attack: 6, warn: 0, hurt: 0 } : null,
    pests: [], pestSeq: 0,
    customer: null, queue: [], plate: [], basket: 0, lastAnimal: null,
    retry: [], taskCount: 0, wrongByType: {},
    state: 'play', reason: null, endTimer: 0, ended: false, paused: false,
    rev: 0, events: [],
  };

  const isMoney = (t) => MONEY_TYPES.includes(t.type);
  const canAct = () => G.state === 'play' && !G.paused && !!G.customer && G.customer.phase === 'order';
  G.canAct = canAct;
  G.showSum = () => !!level.sum || assist >= 2 || (!!G.customer && G.customer.hint >= 2);
  G.mood = (c) => (c.patience / c.max > 0.5 ? 'happy' : c.patience > 0 ? 'wait' : 'sad');
  const say = (c, text, secs = 3) => { c.say = text; c.sayT = secs; };
  const event = (e) => G.events.push(e);

  // ---------- 顾客和出题 ----------
  function randomAnimal(avoid) {
    const pool = ANIMALS.filter((a) => !avoid.includes(a.id));
    return pool[Math.floor(random() * pool.length) % pool.length];
  }
  function nextAnimal() {
    if (level.boss) return { id: 'boss', e: level.boss.e, name: level.boss.name };
    while (G.queue.length < 3) G.queue.push(randomAnimal([...G.queue.map((a) => a.id), G.lastAnimal].filter(Boolean)));
    const a = G.queue.shift();
    G.lastAnimal = a.id;
    return a;
  }
  function nextTask() {
    const due = G.retry.findIndex((r) => r.due <= G.taskCount);
    let task;
    if (due >= 0) task = G.retry.splice(due, 1)[0].task;
    else if (level.tutorial && G.taskCount === 0) task = makeTask('count', { n: 2 }, random);
    else {
      const type = level.types[G.taskCount % level.types.length];
      const spec = { ...level.specs[type], options };
      if (type === 'calc' && level.topics) spec.topic = level.topics[G.taskCount % level.topics.length];
      task = makeTask(type, spec, random);
    }
    G.taskCount++;
    return task;
  }
  function spawnCustomer() {
    const task = nextTask();
    const animal = nextAnimal();
    const max = PATIENCE[task.type] * (1 + assist * 0.25);
    G.customer = { animal, task, phase: 'enter', t: 0, patience: max, max, wrong: 0, hint: 0, sad: false, sadT: 0, tried: [], say: null, sayT: 0 };
    G.plate = [];
    G.basket = 0;
    Sound.door();
    G.rev++;
  }
  function requeue(task) {
    if (!G.retry.some((r) => r.task === task)) G.retry.push({ task, due: G.taskCount + 2 });
  }

  // ---------- 孩子的操作（只对柜台前、正在点单的顾客有效）----------
  G.addMoney = (id) => {
    if (!canAct()) return false;
    const t = G.customer.task;
    if (!isMoney(t) || !t.allowed.includes(id) || G.plate.length >= PLATE_MAX) return false;
    G.plate.push(id);
    Sound.coin();
    G.rev++;
    return true;
  };
  G.removeMoney = (i) => {
    if (!canAct() || !(i >= 0 && i < G.plate.length)) return false;
    G.plate.splice(i, 1);
    Sound.back();
    G.rev++;
    return true;
  };
  G.addItem = () => {
    if (!canAct() || G.customer.task.type !== 'count' || G.basket >= BASKET_MAX) return false;
    G.basket++;
    Sound.tap();
    G.rev++;
    return true;
  };
  G.removeItem = () => {
    if (!canAct() || G.customer.task.type !== 'count' || G.basket <= 0) return false;
    G.basket--;
    Sound.back();
    G.rev++;
    return true;
  };
  G.choose = (value) => {
    if (!canAct()) return false;
    const c = G.customer;
    if (!['pick', 'clock', 'calc'].includes(c.task.type) || !c.task.choices.includes(value) || c.tried.includes(value)) return false;
    if (checkAnswer(c.task, value)) serve(value);
    else {
      c.tried.push(value);
      wrong(value);
    }
    return true;
  };
  G.submit = () => {
    if (!canAct()) return false;
    const t = G.customer.task;
    let ans;
    if (isMoney(t)) ans = [...G.plate];
    else if (t.type === 'count') ans = G.basket;
    else return false;
    if (checkAnswer(t, ans)) serve(ans);
    else wrong(ans);
    return true;
  };
  G.catchPest = (id) => {
    const i = G.pests.findIndex((p) => p.id === id);
    if (i < 0 || G.state !== 'play' || G.paused) return false;
    const [p] = G.pests.splice(i, 1);
    G.coins += 1;
    G.rev++;
    Sound.pop();
    event({ kind: 'pop', at: 'pest', x: p.x, y: p.y, text: '抓到啦 +🪙1' });
    return true;
  };

  function serve(ans) {
    const c = G.customer;
    const t = c.task;
    const ratio = c.patience / c.max;
    const tip = ratio > 0.5 ? 3 : ratio > 0 ? 2 : 1;
    c.phase = 'leave';
    c.t = 0;
    c.outcome = 'happy';
    say(c, THANKS[Math.floor(random() * THANKS.length) % THANKS.length], 2);
    G.coins += tip;
    G.combo++;
    Sound.right();
    const learned = isMoney(t) ? [...new Set(ans)] : t.type === 'pick' ? [t.target] : [];
    if (t.type === 'change') learned.push(t.given);
    if (learned.length) onLearn(learned);
    if (!G.boss) onServe(c.animal.id);
    event({ kind: 'pop', at: 'customer', text: `+🪙${tip}` });
    if (SHOP_PRAISES[G.combo]) event({ kind: 'praise', text: SHOP_PRAISES[G.combo] });
    if (G.boss) {
      G.boss.hp--;
      G.boss.hurt = 0.6;
      G.served = G.boss.max - G.boss.hp;
    } else {
      G.served++;
    }
    G.rev++;
    if (G.served >= G.goal) finish(true);
  }

  function wrong(ans) {
    const c = G.customer;
    c.wrong++;
    G.wrong++;
    G.combo = 0;
    G.wrongByType[c.task.type] = (G.wrongByType[c.task.type] || 0) + 1;
    Sound.wrong();
    say(c, hintText(c.task, ans), 3.2);
    if (c.wrong >= 2) c.hint = 2;
    G.rev++;
    if (c.wrong >= 3) help();
  }

  // 小鹦鹉示范标准答案，顾客拿了东西走，但不算这一位；这道题过两位顾客再出
  function help() {
    const c = G.customer;
    const sol = solveTask(c.task);
    c.phase = 'help';
    c.t = 0;
    say(c, '小鹦鹉：要这样做哦～记住啦！', HELP_T);
    if (isMoney(c.task)) G.plate = sol.slice();
    else if (c.task.type === 'count') G.basket = sol;
    else c.helpPick = sol;
    requeue(c.task);
    Sound.help();
    G.rev++;
  }

  // ---------- Boss 捣乱：先冒感叹号，再放出小东西，限时点掉 ----------
  function updateBoss(dt) {
    const B = G.boss;
    B.hurt = Math.max(0, B.hurt - dt);
    for (const p of G.pests) p.t += dt;
    const missed = G.pests.filter((p) => p.t >= p.life);
    if (missed.length) {
      G.pests = G.pests.filter((p) => p.t < p.life);
      missed.forEach(hurt);
    }
    if (G.state !== 'play') return;
    B.attack -= dt;
    if (B.attack <= 0 && !B.warn && !G.pests.length) {
      B.warn = 1.1;
      Sound.warn();
      if (G.customer) { say(G.customer, level.boss.warn, 1.8); G.rev++; }
    }
    if (B.warn) {
      B.warn -= dt;
      if (B.warn <= 0) {
        B.warn = 0;
        G.pests.push({ id: ++G.pestSeq, x: 0.2 + random() * 0.26, y: 0.4 + random() * 0.28, life: 4.5 + assist * 1.5, t: 0 });
        B.attack = 8 + assist * 2;
      }
    }
  }
  function hurt(p) {
    if (G.state !== 'play') return;
    G.hearts--;
    G.rev++;
    G.lostHeart = true;
    G.combo = 0;
    Sound.hurt();
    event({ kind: 'pop', at: 'pest', x: p.x, y: p.y, text: '哎哟！', bad: true });
    if (G.hearts <= 0) finish(false, 'hearts');
  }

  // ---------- 时间 ----------
  G.tick = (dt) => {
    G.time += dt;
    if (G.state !== 'play') {
      if (G.boss) updateBoss(dt);
      G.endTimer -= dt;
      if (G.endTimer <= 0 && !G.ended) {
        G.ended = true;
        opts.onEnd(result());
      }
      return;
    }
    G.dayLeft = Math.max(0, G.dayLeft - dt);
    if (!G.customer) spawnCustomer();
    const c = G.customer;
    c.t += dt;
    if (c.sayT > 0) {
      c.sayT -= dt;
      if (c.sayT <= 0) { c.say = null; G.rev++; }
    }
    if (c.phase === 'enter' && c.t >= ENTER_T) {
      c.phase = 'order';
      c.t = 0;
      G.rev++;
    } else if (c.phase === 'order') {
      c.patience = Math.max(0, c.patience - dt);
      if (c.patience === 0) {
        if (!c.sad) {
          c.sad = true;
          G.frowned = true;
          c.hint = 2;
          say(c, '我等得有点久啦…看看提示吧！', 2.5);
          G.rev++;
        }
        c.sadT += dt;
        if (c.sadT >= GRACE_T) help();
      }
    } else if (c.phase === 'help' && c.t >= HELP_T) {
      c.phase = 'leave';
      c.t = 0;
      c.outcome = 'helped';
      G.rev++;
    } else if (c.phase === 'leave' && c.t >= LEAVE_T) {
      G.customer = null;
      G.rev++;
    }
    if (G.boss) updateBoss(dt);
    if (G.state === 'play' && G.dayLeft <= 0) finish(false, 'closed');
  };

  function finish(win, reason = null) {
    if (G.state !== 'play') return;
    G.state = win ? 'win' : 'fail';
    G.reason = reason;
    G.endTimer = win ? (G.boss ? 1.8 : 1.3) : 1.5;
    G.pests = [];
    if (G.boss) G.boss.warn = 0;
    if (win) Sound.win();
    else Sound.close();
    G.rev++;
  }

  function result() {
    const win = G.state === 'win';
    const stars = Math.max(1, 3 - (G.frowned || G.lostHeart ? 1 : 0) - (G.wrong > 2 ? 1 : 0));
    const worst = Object.entries(G.wrongByType).sort((a, b) => b[1] - a[1])[0];
    return {
      win, stars, reason: G.reason, served: G.served, wrong: G.wrong,
      coins: G.coins + (win ? stars * 5 + (G.boss ? 10 : 0) : 0),
      hardest: worst ? worst[0] : null,
    };
  }

  return G;
}
