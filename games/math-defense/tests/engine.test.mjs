import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 在 Node 里用假画布跑真实的 game.js：每帧 30ms，模拟会答错、会漏题、发呆的小玩家
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function load() {
  const sandbox = {
    window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: (cb) => { sandbox.raf = cb; return 1; },
    cancelAnimationFrame: () => {},
    Sound: new Proxy({}, { get: () => () => {} }),
  };
  vm.createContext(sandbox);
  for (const f of ['questions.js', 'levels.js', 'game.js']) {
    vm.runInContext(readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8'), sandbox, { filename: f });
  }
  return sandbox;
}
const fakeCtx = () => new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
  set: (t, k, v) => { t[k] = v; return true; },
});

// plan(questionNo) → 'right' | 'wrong' | 'miss'；react 是看到题后几秒作答
function play(n, { grade = 1, plan = () => 'right', react = 1.2, fails = 0, rainbow = false, maxSeconds = 400, seed = 1 } = {}) {
  const S = load();
  const W = vm.runInContext(`WORLDS.find(w => w.grade === ${grade})`, S);
  const canvas = { width: 0, height: 0, getContext: fakeCtx, getBoundingClientRect: () => ({ width: 1024, height: 640, left: 0, top: 0 }) };
  let result = null;
  const defeated = [];
  const G = S.createGame(canvas, W.levels[n - 1], W, {
    fails, random: seeded(seed), onDefeat: (k) => defeated.push(k), onEnd: (r) => { result = r; },
  });
  const log = { prompts: [], plans: [], rainbows: 0 };
  let lastQ = null, seenAt = 0, wrongDone = false, plannedFor = null;
  for (let t = 30; !result && t < maxSeconds * 1000; t += 30) {
    S.raf(t);
    const q = G.currentQ();
    if (G.state !== 'play' || !q) continue;
    if (q !== lastQ) {
      lastQ = q; seenAt = G.time; wrongDone = false;
      log.prompts.push(q.prompt);
      plannedFor = plan(log.prompts.length);
      log.plans.push(plannedFor);
    }
    if (rainbow && G.energy >= 6 && G.rainbow()) log.rainbows++;
    if (G.time - seenAt < react || plannedFor === 'miss') continue;
    const right = q.choices.indexOf(q.answer);
    if (plannedFor === 'wrong' && !wrongDone) {
      const bad = q.choices.findIndex((c) => c !== q.answer);
      assert.ok(G.answer(bad), '答错也要能开炮');
      wrongDone = true;
      seenAt = G.time; // 想一想再答
      continue;
    }
    assert.ok(G.answer(right), `第 ${n} 关：当前题 ${q.prompt} 答不了`);
  }
  G.stop();
  return { result, G, log, defeated };
}

test('普通关：认真答的小玩家 10 关都能过，答对题数正好等于目标', () => {
  for (const n of [1, 2, 3, 4, 6, 7, 8, 9]) {
    const { result, G, defeated } = play(n);
    assert.ok(result && result.win, `第 ${n} 关没打通`);
    assert.equal(G.progress, G.goal);
    assert.equal(result.correct, G.goal, `第 ${n} 关答对 ${result.correct} 题，目标 ${G.goal}`);
    assert.equal(defeated.length, G.goal);
    assert.equal(result.stars, 3);
  }
});

test('漏题的玩家：漏掉的题会再出现，过关仍要真答对够数', () => {
  for (const n of [2, 7]) {
    const { result, G, log } = play(n, { plan: (i) => (i % 6 === 0 ? 'miss' : 'right') });
    assert.ok(result && result.win, `第 ${n} 关漏 3 题也应该能过关`);
    assert.ok(result, `第 ${n} 关没有结束`);
    assert.ok(G.castleHit, '漏掉的怪物应该咬到城堡');
    if (result.win) assert.equal(result.correct, G.goal);
    // 最后一道漏掉的题可能来不及再出（已经答够过关了），其余的都要再出现
    const missed = log.prompts.filter((_, i) => log.plans[i] === 'miss').slice(0, -1);
    assert.ok(missed.length >= 1);
    for (const p of missed) {
      const first = log.prompts.indexOf(p);
      assert.ok(log.prompts.indexOf(p, first + 1) > first, `漏掉的「${p}」没有再出现`);
    }
  }
});

test('答错的玩家：错题会再考一次，不会卡住', () => {
  const { result, G, log } = play(8, { plan: (i) => (i % 3 === 0 ? 'wrong' : 'right') });
  assert.ok(result && result.win, '有答错也应该能过关');
  assert.ok(G.wrong >= 3);
  assert.equal(result.correct, G.goal);
  const wrongOnes = log.prompts.filter((_, i) => log.plans[i] === 'wrong');
  const again = wrongOnes.filter((p) => log.prompts.filter((x) => x === p).length > 1);
  assert.ok(again.length >= 1, '答错的题应该过一会儿再出');
  assert.ok(result.stars >= 1 && result.stars < 3);
});

test('发呆的玩家：城堡被咬光就失败，不会一直卡着', () => {
  for (const n of [1, 5, 10]) {
    const { result, G } = play(n, { plan: () => 'miss', maxSeconds: 900 });
    assert.ok(result, `第 ${n} 关一直没结束`);
    assert.equal(result.win, false);
    assert.equal(G.castle.hp, 0);
  }
});

test('Boss 关：每 3 道连对打掉 1 格血，血打空才赢', () => {
  for (const n of [5, 10]) {
    const { result, G } = play(n, { plan: (i) => (i % 5 === 0 ? 'wrong' : 'right') });
    assert.ok(result && result.win, `第 ${n} 关 Boss 没打赢`);
    assert.equal(G.boss.hp, 0);
    assert.equal(result.correct, G.boss.max * 3);
  }
});

test('慢慢答的玩家也能打败 Boss（推回去比它走得快）', () => {
  const { result } = play(5, { react: 3 });
  assert.ok(result && result.win);
});

test('彩虹大招：吹跑的怪物以后还会来，过关仍以答对为准', () => {
  const { result, G, log } = play(3, { rainbow: true });
  assert.ok(log.rainbows >= 1, '连对 6 题应该能放大招');
  assert.ok(result && result.win);
  assert.equal(result.correct, G.goal);
});

test('失败过就变简单：选项少一个、怪物走得慢', () => {
  const start = (fails) => {
    const S = load();
    const W = vm.runInContext('WORLDS[0]', S);
    const canvas = { width: 0, height: 0, getContext: fakeCtx, getBoundingClientRect: () => ({ width: 1024, height: 640, left: 0, top: 0 }) };
    const G = S.createGame(canvas, W.levels[6], W, { fails, random: seeded(2), onDefeat() {}, onEnd() {} });
    for (let t = 30; t < 3000; t += 30) S.raf(t); // 每个沙盒只有一局，raf 不会串
    G.stop();
    return G;
  };
  const normal = start(0), easy = start(2);
  assert.equal(normal.currentQ().choices.length, 3);
  assert.equal(easy.currentQ().choices.length, 2);
  assert.ok(easy.target().x > normal.target().x, '变简单后怪物应该走得更慢');
});

test('城堡同一帧不会被咬成负数', () => {
  const { result, G } = play(1, { plan: () => 'miss', maxSeconds: 400 });
  assert.equal(result.win, false);
  assert.equal(G.castle.hp, 0);
});

test('只有最前面那只怪物能答；点炮台坐标能打中', () => {
  const S = load();
  const W = vm.runInContext('WORLDS[0]', S);
  const canvas = { width: 0, height: 0, getContext: fakeCtx, getBoundingClientRect: () => ({ width: 1024, height: 640, left: 0, top: 0 }) };
  const G = S.createGame(canvas, W.levels[1], W, { fails: 0, random: seeded(4), onDefeat() {}, onEnd() {} });
  for (let t = 30; t < 12000; t += 30) S.raf(t);
  const walking = G.mons.filter((m) => m.state === 'walk');
  assert.ok(walking.length >= 2, '应该同时有好几只怪物排队');
  const front = G.target();
  assert.equal(front.x, Math.min(...walking.map((m) => m.x)));
  // 用屏幕坐标点正确答案的炮台（画面 1024×640，逻辑高 540）
  const q = G.currentQ();
  const scale = 640 / 540;
  const i = q.choices.indexOf(q.answer);
  const n = q.choices.length;
  const right = G.W - 18 - 112 - 16, w = Math.min(170, (right - 18 - 16 * (n - 1)) / n);
  const x0 = 18 + (right - 18 - (w * n + 16 * (n - 1))) / 2;
  const cx = (x0 + i * (w + 16) + w / 2) * scale + G.view[1];
  const cy = (392 + 60) * scale + G.view[2];
  assert.ok(G.tap(cx, cy));
  assert.equal(front.state, 'dying');
  assert.equal(G.progress, 1);
  G.stop();
});


test('二至六年级全部关卡都能完成并给出胜利结算', () => {
  for (let grade = 2; grade <= 6; grade++) for (let n = 1; n <= 10; n++) {
    const run = play(n, { grade });
    assert.ok(run.result?.win, `${grade}年级第${n}关未通关`);
  }
});
