import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 在 Node 里用假画布跑真实的 game.js 和三种玩法：每帧 30ms，tests/bot.js 的小玩家会答错、会漏题
function load() {
  const fake = () => new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const sandbox = {
    window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: (cb) => { sandbox.raf = cb; return 1; },
    cancelAnimationFrame: () => {},
    setTimeout: () => 0,
    Sound: new Proxy({}, { get: (_, key) => key === 'duration' ? () => 1 : () => {} }),
    fake,
  };
  vm.createContext(sandbox);
  for (const f of ['words.js', 'levels.js', 'art.js', 'game.js', 'mode-bubble.js', 'mode-match.js', 'mode-snake.js']) {
    vm.runInContext(readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8'), sandbox, { filename: f });
  }
  // 小玩家（tests/bot.js，浏览器自测也用它）
  vm.runInContext(readFileSync(new URL('./bot.js', import.meta.url), 'utf8'), sandbox, { filename: 'bot.js' });
  return sandbox;
}

function play(n, { grade = 1, missEvery = 0, wrongEvery = 0, fails = 0, maxSeconds = 400, seed = 1 } = {}) {
  const S = load();
  const W = vm.runInContext(`worldOfGrade(${grade})`, S);
  const L = W.levels[n - 1];
  // 固定随机数，失败时能复现
  let x = seed;
  const random = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const canvas = { width: 0, height: 0, getContext: S.fake, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) };
  let result = null;
  const learned = new Set();
  const G = S.createGame(canvas, L, W, { fails, random, onLearn: (id) => learned.add(id), onEnd: (r) => { result = r; } });
  let question = 0;
  const plan = () => {
    question++;
    return missEvery && question % missEvery === 0 ? 'miss' : wrongEvery && question % wrongEvery === 0 ? 'wrong' : 'right';
  };
  let t = 0;
  while (!result && t < maxSeconds * 1000) {
    t += 30;
    if (G.state === 'play') S.botStep(G, plan);
    S.raf(t);
  }
  G.stop();
  return { result, G, L, learned, seconds: t / 1000 };
}

test('十关都能打通：全答对拿 3 颗星，星星 / Boss 血条刚好攒满', () => {
  for (let n = 1; n <= 10; n++) {
    const { result, G, L, seconds } = play(n);
    assert.ok(result, `第 ${n} 关 ${L.name} 没有结束`);
    assert.ok(result.win, `第 ${n} 关 ${L.name} 没打赢（心 ${G.hearts}）`);
    assert.equal(G.progress, L.goal, `第 ${n} 关只拿到 ${G.progress}/${L.goal}`);
    if (G.boss) assert.equal(G.boss.hp, 0);
    assert.ok(seconds < 300, `第 ${n} 关太长：${seconds} 秒`);
    if (!G.boss || L.mode !== 'bubble') assert.equal(result.stars, 3, `第 ${n} 关全对却只有 ${result.stars} 颗星`);
  }
});

test('答错、漏题之后还能打完，错的题会再出，结果里记着最容易错的', () => {
  for (const n of [1, 2, 3, 7, 9]) {
    const { result, G, L } = play(n, { wrongEvery: 3, missEvery: 5 });
    assert.ok(result && result.win, `第 ${n} 关 ${L.name} 有错题后没打通`);
    assert.equal(G.progress, L.goal);
    assert.ok(result.hardest, `第 ${n} 关没记下错题`);
    assert.ok(L.pool.includes(result.hardest));
  }
});

test('翻翻乐：第一次翻错不算错，见过另一半还翻错才算；抽重的牌不记成错题', () => {
  for (const n of [4, 8]) {
    const { result, G } = play(n, { wrongEvery: 2 });
    assert.ok(result && result.win);
    assert.equal(G.wrong, 0, '小玩家每次都翻没见过的牌，不该算错');
    assert.equal(result.hardest, null);
  }
  const S = load();
  const W = vm.runInContext('WORLDS[0]', S);
  const canvas = { getContext: S.fake, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) };
  const G = S.createGame(canvas, W.levels[3], W, { fails: 0, onLearn() {}, onEnd() {} });
  let t = 0;
  const tick = (secs) => { for (let i = 0; i < secs / 0.03; i++) S.raf((t += 30)); };
  const tapCard = (c) => G.tapAt(c.x + 10, c.y + 10);
  tick(0.5);
  const { cards } = G.mode.state();
  const a = cards[0];
  const partner = cards.find((c) => c !== a && c.item === a.item);
  const others = cards.filter((c) => c.item !== a.item);
  tapCard(a); tapCard(others[0]); tick(1.5);
  assert.equal(G.wrong, 0, '第一次翻错');
  tapCard(partner); tapCard(others[1]); tick(1.5);
  assert.equal(G.wrong, 1, '翻过 a 之后再翻它的另一半配错');
  G.stop();
});

test('吹泡泡 Boss：一直不答题，恐龙跺脚掉光心，结算是失败', () => {
  const { result, G } = play(5, { missEvery: 1, maxSeconds: 200 });
  assert.ok(result);
  assert.equal(result.win, false);
  assert.equal(G.hearts, 0);
});

test('小蛇 Boss：先画红圈再跺脚，留在红圈里会掉心', () => {
  const S = load();
  const W = vm.runInContext('WORLDS[0]', S);
  const canvas = { getContext: S.fake, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) };
  const G = S.createGame(canvas, W.levels[9], W, { fails: 0, onLearn() {}, onEnd() {} });
  let t = 0;
  while (!G.boss.zone && t < 20000) S.raf((t += 30));
  assert.ok(G.boss.zone, '恐龙王没有画红圈');
  assert.equal(G.hearts, 3, '画红圈的时候还不能扣心');
  // 每一帧都把蛇头按回红圈中间，等它跺脚
  const s = G.mode.state();
  const zone = [...G.boss.zone];
  for (let i = 0; i < 1.7 / 0.03; i++) {
    s.body[0] = [...zone];
    S.raf((t += 30));
  }
  assert.equal(G.hearts, 2);
  G.stop();
});

test('连输几次后变简单：选项更少、速度更慢，照样能打通', () => {
  for (const n of [3, 4, 6, 10]) {
    const { result, G, L } = play(n, { fails: 3, wrongEvery: 4 });
    assert.ok(result && result.win, `第 ${n} 关 ${L.name} 简单模式没打通`);
    if (L.mode === 'bubble') assert.ok(G.mode.current().bubbles.length <= L.options - 1);
  }
});

test('学会的词按 id 记录（单词 cat、字母 letter-a）', () => {
  assert.ok([...play(2).learned].every((id) => /^letter-[a-m]$/.test(id)));
  assert.ok([...play(9).learned].every((id) => /^[a-z]{3}$/.test(id)));
});


test('新增年级关卡全部可以通关', () => {
  for (let grade = 2; grade <= 6; grade++) for (let n = 1; n <= 10; n++) {
    const { result } = play(n, { grade, maxSeconds: 600 });
    assert.ok(result?.win, `${grade}年级第${n}关没有通关`);
  }
});
