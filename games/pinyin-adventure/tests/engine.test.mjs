import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 在 Node 里用假画布跑真实的 game.js：每帧 30ms，模拟一个会漏题、会答错的小玩家
function load() {
  const gradient = { addColorStop() {} };
  const ctx2d = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : () => gradient),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const sandbox = {
    window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: (cb) => { sandbox.raf = cb; return 1; },
    cancelAnimationFrame: () => {},
    setTimeout: () => 0,
    clearTimeout() {},
    Sound: new Proxy({}, { get: () => () => {} }),
  };
  vm.createContext(sandbox);
  for (const f of ['pinyin.js', 'levels.js', 'game.js']) {
    vm.runInContext(readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8'), sandbox, { filename: f });
  }
  return sandbox;
}

function play(n, { grade = 1, fails = 0, missEvery = 0, wrongEvery = 0, maxSeconds = 240 } = {}) {
  const S = load();
  const W = vm.runInContext(`WORLDS.find(w => w.grade === ${grade})`, S);
  const canvas = { width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }), getBoundingClientRect: () => ({ width: 1024, height: 640 }) };
  let result = null;
  const G = S.createGame(canvas, W.levels[n - 1], W, { fails, onLearn() {}, onEnd: (r) => { result = r; } });
  let question = 0, t = 0, pressedAt = -1;
  while (!result && t < maxSeconds * 1000) {
    t += 30;
    if (pressedAt >= 0 && G.time - pressedAt > 0.08) { G.release(); pressedAt = -1; }
    const p = G.player;
    const active = G.ents.find((e) => (e.type === 'gate' || e.type === 'river') && !e.done);
    let want = G.ents.some((e) => (e.type === 'hog' || e.type === 'rock') && e.x - G.dist > 70 && e.x - G.dist < 110);
    if (active && active.botPlan === undefined) {
      question++;
      active.botPlan = missEvery && question % missEvery === 0 ? 'miss' : wrongEvery && question % wrongEvery === 0 ? 'wrong' : 'right';
    }
    if (active && active.type === 'gate' && active.botPlan !== 'miss') {
      let target = active.blocks.find((b) => b.item === active.item);
      const decoy = active.blocks.find((b) => b.item !== active.item && b.x < target.x);
      if (active.botPlan === 'wrong' && decoy && decoy.state === 'idle') target = decoy;
      const d = target.x + 39 - G.dist;
      if (d > 15 && d < 40 && target.state === 'idle') want = true;
    }
    if (active && active.type === 'river') {
      const answerCloud = active.cloud.item === active.item;
      const goCloud = active.sink || active.cloud.wrong || active.log.wrong || active.botPlan !== 'wrong' ? answerCloud : !answerCloud;
      const d = active.x - G.dist;
      if (goCloud && !active.cloud.gone && d < 110 && d > 60 && p.onGround && p.platform !== 'cloud') want = true;
    }
    if (want && p.onGround) { G.press(); pressedAt = G.time; }
    S.raf(t);
  }
  G.stop();
  return { result, G };
}

test('终点前漏掉的题会补出来：过关时拼音星一定攒满', () => {
  for (const n of [1, 2, 4]) {
    const { result, G } = play(n, { missEvery: 3 });
    assert.ok(result, `第 ${n} 关没有结束`);
    if (n < 4) assert.ok(result.win, `第 ${n} 关没有刺猬，应该能过关`);
    if (result.win) assert.equal(G.progress, G.L.goal, `第 ${n} 关只拿到 ${G.progress}/${G.L.goal} 颗就过关了`);
  }
});

test('过河关选错桥会掉水重来，不会卡住', () => {
  const { result, G } = play(7, { wrongEvery: 2 });
  assert.ok(result && result.win, '过河关没能打通');
  assert.ok(G.wrong >= 3);
  assert.equal(G.progress, 8);
});

test('Boss 关打空血条就赢', () => {
  for (const n of [5, 10]) {
    const { result, G } = play(n, { wrongEvery: 4 });
    assert.ok(result, `第 ${n} 关没有结束`);
    if (result.win) assert.equal(G.boss.hp, 0);
  }
});


test('新增年级关卡全部可以通关', () => {
  for (let grade = 1; grade <= 6; grade++) for (let n = grade === 1 ? 11 : 1; n <= (grade === 1 ? 20 : 10); n++) {
    // 使用游戏已有的重试辅助验证内容可通关，Boss 战斗另有独立测试。
    const { result } = play(n, { grade, fails: 3, maxSeconds: 600 });
    assert.ok(result?.win, `${grade}年级第${n}关没有通关`);
  }
});
