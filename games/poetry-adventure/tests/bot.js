'use strict';
// 浏览器自测用的"小玩家"，游戏本身不加载它。用法（控制台或 Playwright）：
//   const s = document.createElement('script'); s.src = 'tests/bot.js'; document.head.append(s);
//   runLevel(5, 0.2)  // 第 5 关，20% 的题故意先答错；结果在 window.__res
//   runLevel(3, 0, { idle: true })  // 什么都不做（测失败 / Boss 蓄力打人）
window.botStart = (wrongRate = 0, mode = {}) => {
  clearInterval(window.__bot);
  let lastAct = 0;
  window.__bot = setInterval(() => {
    const g = game;
    if (!g || g.state !== 'play' || g.paused || mode.idle) return;
    const T = g.task;
    if (!T || T.finished) return;
    if (T.type === 'rain') {
      const right = T.drops.find((d) => d.state === 'fall' && d.right);
      if (!right) return;
      if (right.botWrong === undefined) right.botWrong = Math.random() < wrongRate;
      let target = right;
      // 每波最多故意接错一次
      const bad = T.drops.find((d) => d.state === 'fall' && !d.right);
      if (right.botWrong && bad && !T.drops.some((d) => d.state === 'bad')) target = bad;
      g.pointerX = target.x;
    } else if (g.time - lastAct > 0.7) {
      lastAct = g.time;
      if (T.type === 'bridge') {
        if (T.crossing) return;
        const k = T.cards.findIndex((c) => !c.placed && c.line === T.placed);
        const wrongK = T.cards.findIndex((c) => !c.placed && c.line !== T.placed);
        const pick = Math.random() < wrongRate && wrongK >= 0 ? wrongK : k;
        g.key(`Digit${pick + 1}`, true);
      } else if (T.q && !T.q.done && T.q.t > 1.0) {
        const answer = bare(T.q.pair.down);
        const k = T.q.options.findIndex((o) => o.text === answer);
        const wrongK = T.q.options.findIndex((o) => o.text !== answer && o.state === 'idle');
        g.key(`Digit${(Math.random() < wrongRate && wrongK >= 0 ? wrongK : k) + 1}`, true);
      }
    }
  }, 16);
};

window.runLevel = (n, wrongRate = 0, mode = {}) => {
  window.__res = null;
  (async () => {
    clearInterval(window.__bot);
    stopGame();
    openLevel(WORLDS[0], WORLDS[0].levels[n - 1]);
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#go').click();
    for (let i = 0; i < 40 && !game; i++) await new Promise((r) => setTimeout(r, 100));
    botStart(wrongRate, mode);
    const t0 = performance.now();
    const seen = new Set();
    while (game && !game.ended && performance.now() - t0 < 300000) {
      await new Promise((r) => setTimeout(r, 250));
      if (!game) return; // 被手动停掉了
      if (game.task) seen.add(game.task.type);
      if (game.task && game.task.attack) seen.add('bossAttack');
      if (game.task && game.task.q && game.task.q.warned) seen.add('bossWarn');
      if (game.task && game.task.redone) seen.add('redo');
    }
    if (!game) return;
    window.__res = {
      n, secs: Math.round((performance.now() - t0) / 1000), state: game.state, wrong: game.wrong,
      hearts: game.player ? game.player.hearts : game.hearts, coins: game.coins, seen: [...seen],
      title: document.querySelector('#result-title').textContent, stars: document.querySelector('#result-stars').textContent,
    };
  })();
};
