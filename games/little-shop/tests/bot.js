'use strict';
// 自测用的"小店员"，游戏本身不加载它。Node 测试（engine.test.mjs）和浏览器里共用。
// 浏览器用法（控制台或 Playwright）：
//   const s = document.createElement('script'); s.src = 'tests/bot.js'; document.head.append(s);
//   runLevel(5, 0.2)  // 第 5 关，20% 的顾客先做错一次；结果在 window.__res
// shopBot(G, plan, opts)：每帧调用一次；plan(task) 返回这位顾客打算 'right' | 'wrong' | 'idle'

function botRight(G, t) {
  if (t.type === 'count') {
    while (G.basket < t.n) G.addItem();
    while (G.basket > t.n) G.removeItem();
    return G.submit();
  }
  if (t.type === 'pick' || t.type === 'clock' || t.type === 'calc') return G.choose(solveTask(t));
  while (G.plate.length) G.removeMoney(0);
  solveTask(t).forEach((id) => G.addMoney(id));
  return G.submit();
}

// 做错一次：多装一个、多放一枚最小的钱、点一个不对的选项
function botWrong(G, t) {
  if (t.type === 'count') {
    while (G.basket < t.n + 1) G.addItem();
    return G.submit();
  }
  if (t.type === 'pick' || t.type === 'clock' || t.type === 'calc') {
    const answer = solveTask(t);
    const bad = t.choices.find((v) => v !== answer && !G.customer.tried.includes(v));
    return bad ? G.choose(bad) : botRight(G, t);
  }
  while (G.plate.length) G.removeMoney(0);
  solveTask(t).forEach((id) => G.addMoney(id));
  G.addMoney(t.allowed.reduce((a, b) => (MONEY[a].value <= MONEY[b].value ? a : b)));
  return G.submit();
}

function shopBot(G, plan, { react = 1, catchPests = true } = {}) {
  if (catchPests) for (const p of [...G.pests]) if (p.t > 0.5) G.catchPest(p.id);
  const c = G.customer;
  if (!G.canAct()) return;
  if (c.botPlan === undefined) { c.botPlan = plan(c.task); c.botAt = G.time; }
  if (c.botPlan === 'idle' || G.time - c.botAt < react) return;
  if (c.botPlan === 'wrong' && !c.botWrong) {
    c.botWrong = true;
    c.botAt = G.time;
    return botWrong(G, c.task);
  }
  botRight(G, c.task);
}

if (typeof document === 'object') {
  window.botStart = (wrongRate = 0, react = 1) => {
    clearInterval(window.__bot);
    const plan = () => (Math.random() < wrongRate ? 'wrong' : 'right');
    window.__bot = setInterval(() => {
      if (game && game.state === 'play' && !game.paused) shopBot(game, plan, { react });
    }, 50);
  };

  window.runLevel = (n, wrongRate = 0, react = 1) => {
    window.__res = null;
    (async () => {
      clearInterval(window.__bot);
      stopGame();
      openLevel(WORLDS[0], WORLDS[0].levels[n - 1]);
      await new Promise((r) => setTimeout(r, 200));
      document.querySelector('#go').click();
      await new Promise((r) => setTimeout(r, 200));
      botStart(wrongRate, react);
      const t0 = performance.now();
      while (!(game && game.ended) && performance.now() - t0 < 300000) {
        await new Promise((r) => setTimeout(r, 250));
        if (!game) return; // 被手动停掉了
      }
      clearInterval(window.__bot);
      window.__res = {
        n, secs: Math.round((performance.now() - t0) / 1000), state: game.state, served: game.served, goal: game.goal,
        wrong: game.wrong, hearts: game.hearts,
        title: document.querySelector('#result-title').textContent, stars: document.querySelector('#result-stars').textContent,
        text: document.querySelector('#result-text').textContent,
      };
    })();
  };
}
