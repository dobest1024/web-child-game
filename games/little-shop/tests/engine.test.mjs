import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 在 Node 里跑真实的 game.js（它不碰 DOM）：每帧 0.05 秒，tests/bot.js 的小店员会做错、会发呆
function load() {
  const sandbox = { Sound: new Proxy({}, { get: () => () => {} }) };
  vm.createContext(sandbox);
  for (const f of ['js/money.js', 'js/data.js', 'js/tasks.js', 'js/levels.js', 'js/game.js', 'tests/bot.js']) {
    vm.runInContext(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), sandbox, { filename: f });
  }
  return sandbox;
}

function play(n, { grade = 1, wrongEvery = 0, idleEvery = 0, fails = 0, react = 1, catchPests = true, seed = 1, maxSeconds = 900 } = {}) {
  const S = load();
  const W = vm.runInContext(`WORLDS.find(w => w.grade === ${grade})`, S);
  const L = W.levels[n - 1];
  let result = null;
  const served = [];
  const learned = new Set();
  const G = S.createShop(L, W, {
    fails, random: S.makeRng(seed),
    onServe: (id) => served.push(id), onLearn: (ids) => ids.forEach((id) => learned.add(id)),
    onEnd: (r) => { result = r; },
  });
  let k = 0;
  const plan = () => {
    k++;
    return idleEvery && k % idleEvery === 0 ? 'idle' : wrongEvery && k % wrongEvery === 0 ? 'wrong' : 'right';
  };
  for (let t = 0; !result && t < maxSeconds; t += 0.05) {
    if (G.state === 'play') S.shopBot(G, plan, { react, catchPests });
    G.tick(0.05);
  }
  return { result, G, L, served, learned };
}

test('十关都能打通：认真做的小店员拿 3 颗星，服务人数正好等于目标', () => {
  for (let n = 1; n <= 10; n++) {
    const { result, G, L } = play(n);
    assert.ok(result, `第 ${n} 关 ${L.name} 没有结束`);
    assert.ok(result.win, `第 ${n} 关 ${L.name} 没打赢：${result.reason}`);
    assert.equal(result.served, G.goal);
    assert.equal(result.stars, 3, `第 ${n} 关全对却只有 ${result.stars} 颗星`);
    if (G.boss) assert.equal(G.boss.hp, 0);
    assert.ok(G.dayLeft > 0, `第 ${n} 关差点打烊`);
  }
});

test('做错一次的顾客会说差在哪里，改对了照样算；错题记进结算', () => {
  for (const n of [2, 4, 7, 8, 9]) {
    const { result, G, L } = play(n, { wrongEvery: 2 });
    assert.ok(result && result.win, `第 ${n} 关 ${L.name} 有错题后没打通`);
    assert.ok(G.wrong >= 2);
    assert.ok(result.stars <= 2, '答错超过 2 次少一颗星');
    assert.ok(result.hardest, '结算里要写最难的题型');
  }
});

test('发呆的顾客：耐心用完会皱眉、给提示，再过一会儿小鹦鹉帮忙，这一位不算', () => {
  const { result, G } = play(3, { idleEvery: 3 });
  assert.ok(result && result.win);
  assert.equal(result.stars, 2, '有顾客等到皱眉，少一颗星');
  assert.ok(G.taskCount > G.goal, '小鹦鹉帮忙的那位不算，后面还要再服务');
});

test('一直发呆：营业时间用完就打烊，结算是失败', () => {
  const { result } = play(1, { idleEvery: 1 });
  assert.ok(result);
  assert.equal(result.win, false);
  assert.equal(result.reason, 'closed');
  assert.equal(result.served, 0);
});

test('Boss 关：不点掉捣乱的小东西会掉心，三颗心掉光就失败', () => {
  for (const n of [5, 10]) {
    const { result, G } = play(n, { catchPests: false, react: 3 });
    assert.ok(result, `第 ${n} 关没有结束`);
    if (!result.win) {
      assert.equal(result.reason, 'hearts');
      assert.equal(G.hearts, 0);
    } else assert.ok(G.lostHeart && result.stars <= 2, '被捣乱过不能拿满星');
  }
  const { result } = play(5, { catchPests: false, idleEvery: 1 });
  assert.equal(result.win, false);
  assert.equal(result.reason, 'hearts');
});

test('连输几次就变简单：顾客少、营业久、选项少', () => {
  const S = load();
  const W = vm.runInContext('WORLDS[0]', S);
  const L = W.levels[8];
  const easy = S.createShop(L, W, { fails: 3, onEnd() {} });
  const normal = S.createShop(L, W, { fails: 0, onEnd() {} });
  assert.ok(easy.goal < normal.goal);
  assert.ok(easy.dayLen > normal.dayLen);
  assert.ok(easy.showSum(), '第 2 次失败起一直显示合计');
  assert.ok(!normal.showSum());
  for (const n of [6, 9, 10]) {
    const { result } = play(n, { fails: 3, wrongEvery: 3, react: 2 });
    assert.ok(result && result.win, `第 ${n} 关简单模式没打通`);
  }
});

test('服务过的小动物进图鉴，用过的钱币点亮；Boss 不进顾客图鉴', () => {
  const { served, learned } = play(7);
  assert.ok(served.length >= 6 && served.every((id) => id !== 'boss'));
  assert.ok(learned.has('y10') || learned.has('y5'), '找零题顾客给的钱也算认识了');
  assert.deepEqual(play(5).served, []);
});

test('抓虫加金币和漏虫扣心都会立即通知画面刷新', () => {
  const S = load();
  const W = vm.runInContext('WORLDS[0]', S);
  const G = S.createShop(W.levels[4], W, { onEnd() {} });
  G.tick(1);
  G.customer.sayT = 0;
  G.customer.phase = 'order';
  G.customer.patience = 100;
  G.boss.attack = 100;
  G.pests.push({ id: 1, x: 0.3, y: 0.5, life: 1, t: 0 });
  let rev = G.rev;
  const coins = G.coins;
  assert.ok(G.catchPest(1));
  assert.equal(G.coins, coins + 1);
  assert.ok(G.rev > rev);
  G.pests.push({ id: 2, x: 0.3, y: 0.5, life: 0.01, t: 0 });
  rev = G.rev;
  const hearts = G.hearts;
  G.tick(0.05);
  assert.equal(G.hearts, hearts - 1);
  assert.ok(G.rev > rev);
});


test('二至六年级全部关卡都能完成并给出胜利结算', () => {
  for (let grade = 2; grade <= 6; grade++) for (let n = 1; n <= 10; n++) {
    const run = play(n, { grade });
    assert.ok(run.result?.win, `${grade}年级第${n}关未通关`);
  }
});


test('高年级计算题有有限耐心、及时答对得小费，久等会提示并帮助', () => {
  for (let grade = 2; grade <= 6; grade++) {
    const S = load();
    const W = vm.runInContext(`WORLDS[${grade - 1}]`, S);
    const G = S.createShop(W.levels[0], W, { onEnd() {} });
    for (let i = 0; i < 20; i++) G.tick(0.05);
    assert.ok(Number.isFinite(G.customer.patience));
    assert.equal(G.mood(G.customer), 'happy');
    G.choose(G.customer.task.target);
    assert.equal(G.coins, 3);
    const idle = S.createShop(W.levels[0], W, { onEnd() {} });
    for (let i = 0; i < 820; i++) idle.tick(0.05);
    assert.equal(idle.customer.hint, 2);
    assert.ok(idle.customer.sad);
    for (let i = 0; i < 300; i++) idle.tick(0.05);
    assert.equal(idle.customer.phase, 'help');
  }
});
