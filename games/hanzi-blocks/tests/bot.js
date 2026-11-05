'use strict';
// 自测用的"小玩家"，游戏本身不加载它。Node 测试（engine.test.mjs）和浏览器里共用。
// 浏览器用法（控制台或 Playwright）：
//   const s = document.createElement('script'); s.src = 'tests/bot.js'; document.head.append(s);
//   runLevel(4, 0.3)            // 第 4 关，30% 的题先放到另一半旁边（位置不对，会弹回来）；结果在 window.__res
//   runLevel(2, 1, 0.3, 'stack') // 每块都放到别处，等着堆满
// botStep(G, plan, react)：每帧调用一次；plan(q) 返回这一题打算
//   'right' 放对 | 'near' 先放到另一半旁边一次再放对 | 'nearAlways' 一直放旁边 | 'stack' 放到别处 | 'idle' 不动

// 落到哪一列会得到 kind（right / bonus / near / stack）
function columnsOf(G, kind) {
  const q = G.q, b = G.board, cols = [];
  for (let c = 0; c < b.cols; c++) {
    if (hasRoom(b, c) && q.y <= b.rows - 1 - height(b, c) + 0.01 && judge(b, c, q.piece, q.target, G.known).kind === kind) cols.push(c);
  }
  return cols;
}

function botStep(G, plan, react = 0.3) {
  const q = G.q;
  if (!q || G.paused || G.state !== 'play' || q.phase !== 'fall' || q.dropping || G.anim) return;
  if (q.botPlan === undefined) q.botPlan = plan(q);
  if (q.botPlan === 'idle' || q.t < react) return;
  let want = q.botPlan;
  if (want === 'near' && q.botNear) want = 'right';
  let cols = want === 'nearAlways' || want === 'near' ? columnsOf(G, 'near') : columnsOf(G, want);
  if (want === 'near' || want === 'nearAlways') q.botNear = true;
  if (!cols.length && want === 'stack') cols = columnsOf(G, 'near');
  if (!cols.length) cols = columnsOf(G, 'right');
  if (!cols.length) return;
  const c = cols[0];
  if (c === q.col || G.moveTo(c)) G.drop();
}

if (typeof document === 'object') {
  window.botStart = (wrongRate = 0, react = 0.3, wrongKind = 'near') => {
    clearInterval(window.__bot);
    const plan = () => (Math.random() < wrongRate ? wrongKind : 'right');
    window.__bot = setInterval(() => {
      if (game && game.state === 'play' && !game.paused) botStep(game, plan, react);
    }, 30);
  };

  window.runLevel = (n, wrongRate = 0, react = 0.3, wrongKind = 'near') => {
    window.__res = null;
    (async () => {
      clearInterval(window.__bot);
      stopGame();
      openLevel(WORLDS[0], WORLDS[0].levels[n - 1]);
      await new Promise((r) => setTimeout(r, 200));
      document.querySelector('#go').click();
      while (!game) await new Promise((r) => setTimeout(r, 50)); // 等读音加载完
      botStart(wrongRate, react, wrongKind);
      const t0 = performance.now();
      while (!(game && game.ended) && performance.now() - t0 < 300000) {
        await new Promise((r) => setTimeout(r, 250));
        if (!game) return; // 被手动停掉了
      }
      clearInterval(window.__bot);
      window.__res = {
        n, secs: Math.round((performance.now() - t0) / 1000), state: game.state, progress: game.progress, goal: game.L.goal,
        wrong: game.wrong, misses: game.misses, boss: game.boss && game.boss.hp,
        title: document.querySelector('#result-title').textContent, stars: document.querySelector('#result-stars').textContent,
        text: document.querySelector('#result-text').textContent,
      };
    })();
  };
}
