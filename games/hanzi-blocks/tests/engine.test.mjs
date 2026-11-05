import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 在 Node 里用假画布跑真实的 game.js：每帧 33ms，tests/bot.js 的小玩家会放错、会堆方块
function load({ sayLog } = {}) {
  const ctx2d = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const sandbox = {
    window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: (cb) => { sandbox.raf = cb; return 1; },
    cancelAnimationFrame: () => {},
    setTimeout: () => 0, // 拼对后念字、念组词的延时音不在这里测
    Sound: new Proxy({}, { get: (t, k) => (k === 'sequence' ? () => 3.52 : k === 'say' && sayLog ? (id) => sayLog.push(id) : () => {}) }),
    ctx2d,
  };
  vm.createContext(sandbox);
  for (const f of ['js/chars.js', 'js/audio-list.js', 'js/board.js', 'js/game.js', 'tests/bot.js']) {
    vm.runInContext(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), sandbox, { filename: f });
  }
  return sandbox;
}

// 固定种子的随机数（mulberry32）
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function start(n, { grade = 1, fails = 0, seed = 1, calm = false, size = [1000, 640], sayLog } = {}) {
  const S = load({ sayLog });
  const W = vm.runInContext(`WORLDS.find(w => w.grade === ${grade})`, S);
  const L = W.levels[n - 1];
  const out = { result: null, learned: [] };
  const canvas = { width: 0, height: 0, getContext: () => S.ctx2d, getBoundingClientRect: () => ({ width: size[0], height: size[1] }) };
  const G = S.createGame(canvas, L, W, {
    fails, calm, random: rng(seed),
    onLearn: (c) => out.learned.push(c),
    onEnd: (r) => { out.result = r; },
  });
  let t = 0;
  out.step = (frames = 1, each) => {
    for (let i = 0; i < frames && !out.result; i++) {
      if (each) each();
      t += 33;
      S.raf(t);
    }
  };
  out.charAudio = (c) => vm.runInContext(`charAudio(${JSON.stringify(c)})`, S);
  return Object.assign(out, { S, W, L, G });
}

function play(n, plan = () => 'right', { maxSeconds = 600, react = 0.3, ...opts } = {}) {
  const run = start(n, opts);
  run.step(Math.ceil(maxSeconds / 0.033), () => run.S.botStep(run.G, plan, react));
  run.G.stop();
  return run;
}

test('十关都能打通：每块都放对拿 3 颗星，Boss 被打到 0 血（换几个随机种子都不卡住）', () => {
  for (let n = 1; n <= 10; n++) {
    for (const seed of [1, 2, 3, 4]) {
      const { result, G, L } = play(n, () => 'right', { seed });
      assert.ok(result, `第 ${n} 关 ${L.name}（种子 ${seed}）没有结束`);
      assert.ok(result.win, `第 ${n} 关 ${L.name}（种子 ${seed}）没打赢：${result.why}`);
      assert.equal(result.stars, 3);
      assert.equal(G.progress, L.goal);
      if (G.boss) assert.equal(G.boss.hp, 0);
    }
  }
});

// 找一个第一题就有"位置不对"的列的开局
function nearStart(n) {
  for (let seed = 1; seed < 100; seed++) {
    const run = start(n, { seed });
    while (!(run.G.q && run.G.q.phase === 'fall')) run.step();
    if (run.S.columnsOf(run.G, 'near').length) return run;
  }
  throw new Error('找不到有"位置不对"列的开局');
}

test('放到另一半旁边但位置不对：方块弹回去、亮出提示、说清楚怎么拼，不往棋盘上堆', () => {
  const run = nearStart(3);
  const { G, S } = run;
  const near = S.columnsOf(G, 'near');
  const blocks = G.board.stacks.flat().length;
  const q = G.q;
  if (near[0] !== q.col) assert.ok(G.moveTo(near[0]));
  G.drop();
  while (!G.anim) run.step();
  while (G.anim) run.step();
  assert.equal(q.near, 1);
  assert.equal(q.hint, true, '放错一次就亮出答案列');
  assert.equal(G.wrong, 1);
  assert.equal(G.board.stacks.flat().length, blocks, '弹回来的方块不留在棋盘上');
  assert.equal(q.phase, 'fall');
  assert.ok(q.y < 0, '从顶上重新落');
  assert.ok(G.popups.some((p) => /结构/.test(p.text)), '提示里说是左右还是上下结构');
});

test('一直放旁边：弹回两次后第三次先放下，这个字过两题再出', () => {
  const plan = () => 'nearAlways';
  const run = nearStart(3);
  const { G, S } = run;
  const q = G.q;
  for (let i = 0; i < 2000 && G.q === q; i++) run.step(1, () => S.botStep(G, plan));
  assert.notEqual(G.q, q, '这一题已经结束，换了下一题');
  assert.equal(q.near, 2);
  assert.equal(G.misses, 1);
  assert.ok(G.retry.some((r) => r.target === q.target), '放下的字排进重做队列');
  assert.equal(G.missCount[q.target], 1);
});

test('每块都放到别处：方块越堆越高，堆满就失败', () => {
  for (const n of [1, 10]) {
    const { result, G } = play(n, () => 'stack', { maxSeconds: 900 });
    assert.ok(result, `第 ${n} 关没有结束`);
    assert.equal(result.win, false);
    assert.equal(result.why, '方块堆满啦');
    assert.ok(result.hardest, '结算里写最难的字');
    assert.ok(G.board.stacks.every((s) => s.length <= G.board.rows), '没有方块堆出棋盘');
  }
  // 别的列都满了、只剩答案列时放哪儿都是对的，所以也可能磕磕绊绊地过关，但只有 1 颗星
  const { result } = play(6, () => 'stack', { maxSeconds: 900 });
  assert.ok(result && (result.win ? result.stars === 1 : result.why === '方块堆满啦'));
});

test('有时放错也能打通，星星按放错次数算', () => {
  let k = 0;
  const plan = () => (++k % 3 === 0 ? 'near' : 'right');
  for (const n of [2, 4, 7, 9]) {
    const { result, G } = play(n, plan);
    assert.ok(result && result.win, `第 ${n} 关有放错后没打通`);
    assert.ok(G.wrong >= 2);
    assert.equal(result.stars, G.wrong <= 1 ? 3 : G.wrong <= 4 ? 2 : 1);
  }
});

test('连输几次就变简单：开局方块少、落得慢、5 秒没放就亮出答案', () => {
  const normal = start(4).G;
  const easy = start(4, { fails: 3 }).G;
  assert.ok(easy.board.stacks.flat().length < normal.board.stacks.flat().length);
  assert.ok(easy.speed < normal.speed);
  const run = start(4, { fails: 1 });
  while (!(run.G.q && run.G.q.phase === 'fall')) run.step();
  const q = run.G.q;
  assert.equal(q.hint, false);
  run.step(Math.ceil(5.2 / 0.033));
  assert.ok(run.G.q !== q || q.hint, '帮过 1 次以后，5 秒没放就亮出答案列');
  for (const n of [5, 8]) {
    const { result } = play(n, () => 'right', { fails: 3 });
    assert.ok(result && result.win, `第 ${n} 关简单模式没打通`);
  }
});

test('顺手拼出别的学过的字：也算认识了，多给 1 枚金币，这一题接着拼', () => {
  const run = start(10, { seed: 2 });
  const { G } = run;
  while (!(G.q && G.q.phase === 'fall')) run.step();
  // 摆一个局面：要拼「明」，落下的是左边的 日；第 0 列顶上是 十（日 叠在 十 上就是「早」）
  Object.assign(G.q, { target: '明', piece: '日', base: '月', side: 'left', col: 2, x: 2, y: -1 });
  G.board.stacks.forEach((s) => (s.length = 0));
  G.board.stacks[0].push({ part: '十' });
  G.board.stacks[4].push({ part: '月' });
  const coins = G.coins;
  assert.ok(G.moveTo(0));
  G.drop();
  while (!G.anim) run.step();
  assert.equal(G.anim.type, 'bonus');
  while (G.anim) run.step();
  assert.deepEqual(run.learned, ['早']);
  assert.equal(G.coins, coins + 1);
  assert.equal(G.progress, 0, '顺手拼的字不算这一题');
  assert.equal(G.board.stacks[0].length, 0, '十 和 日 一起拼走了');
  assert.equal(G.q.target, '明', '还是拼「明」');
  assert.equal(G.q.phase, 'fall');
});

test('拼对以后：先念刚拼出的字和组词，过一会儿再报下一个要拼的字', () => {
  const sayLog = [];
  const run = start(1, { seed: 3, sayLog });
  const { G, S } = run;
  while (!(G.q && G.q.phase === 'fall')) run.step();
  assert.deepEqual(sayLog, [run.charAudio(G.q.target)], '开局马上报第一个字');
  const first = G.q;
  for (let i = 0; i < 2000 && G.q === first; i++) run.step(1, () => S.botStep(G, () => 'right'));
  assert.notEqual(G.q, first);
  const solvedAt = G.time;
  assert.equal(sayLog.length, 1, '刚拼对时不马上报新字，免得被念字的声音打断');
  while (sayLog.length < 2) run.step();
  assert.ok(G.time - solvedAt >= 1.3, `等了 ${(G.time - solvedAt).toFixed(2)} 秒才报新字`);
  assert.equal(sayLog[1], run.charAudio(G.q.target));
});

test('拼对的字进图鉴；减少动态效果时不放彩屑', () => {
  const { result, learned } = play(2, () => 'right', { calm: true });
  assert.ok(result.win);
  assert.ok(learned.length >= 6);
  const run = start(1, { calm: true });
  run.step(600, () => run.S.botStep(run.G, () => 'right'));
  assert.ok(run.G.progress >= 1);
  assert.equal(run.G.particles.length, 0);
});

test('竖屏、横屏的布局：棋盘（连同刚出现方块的那一行）、目标卡、Boss 框、分数牌都在屏幕里，互不重叠，不压右上角的按钮', () => {
  const inside = (r, w, h) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w + 0.5 && r.y + r.h <= h + 0.5;
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const [w, h] of [[390, 844], [375, 667], [844, 390], [667, 375], [1280, 800], [768, 1024]]) {
    for (const n of [1, 10]) {
      const { G } = start(n, { size: [w, h] });
      const v = G.view;
      // 第 -1 行是方块刚出现的地方
      const board = { x: v.bx - 8, y: v.by - v.cell, w: v.cell * G.board.cols + 16, h: v.cell * (G.board.rows + 1) + 8 };
      const buttons = { x: w - 12 - 102, y: 0, w: 102, h: 56 };
      const hud = { x: v.hudX, y: 12, w: (G.boss ? 120 : 150) + 80, h: 38 }; // 连"连对 ×12"（约 62px）一起
      const parts = [['棋盘', board], ['目标卡', v.card], ['Boss 框', v.boss], ['分数牌', hud]].filter(([, r]) => r);
      for (const [name, r] of parts) {
        assert.ok(inside(r, w, h), `${w}×${h} 第 ${n} 关 ${name}出屏了 ${JSON.stringify(r)}`);
        assert.ok(!overlap(r, buttons), `${w}×${h} 第 ${n} 关 ${name}压到右上角按钮`);
      }
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
        assert.ok(!overlap(parts[i][1], parts[j][1]), `${w}×${h} 第 ${n} 关 ${parts[i][0]}和${parts[j][0]}重叠`);
      }
      assert.ok(v.cell >= 36, `${w}×${h} 格子太小：${v.cell}`);
    }
  }
});


test('二至六年级全部关卡都能完成并给出胜利结算', () => {
  for (let grade = 2; grade <= 6; grade++) for (let n = 1; n <= 10; n++) {
    const run = play(n, () => 'right', { grade });
    assert.ok(run.result?.win, `${grade}年级第${n}关未通关`);
  }
});
