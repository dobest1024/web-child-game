'use strict';
// 浏览器自测用的"小玩家"，游戏本身不加载它。用法（控制台或 playwright-cli eval）：
//   const s = document.createElement('script'); s.src = 'tests/bot.js'; document.head.append(s);
//   runLevel(5, 0.2, 1.5)  // 第 5 关，20% 的题先答错一次，看到题 1.5 秒后作答；结果在 window.__res
window.botStart = (wrongRate = 0, react = 1.2) => {
  clearInterval(window.__bot);
  let last = null, seenAt = 0, wrongDone = false, planWrong = false;
  window.__bot = setInterval(() => {
    const g = game;
    if (!g || g.state !== 'play' || g.paused) return;
    if (g.energy >= 6) g.rainbow();
    const q = g.currentQ();
    if (!q) return;
    if (q !== last) { last = q; seenAt = g.time; wrongDone = false; planWrong = Math.random() < wrongRate; }
    if (g.time - seenAt < react) return;
    if (planWrong && !wrongDone) {
      const bad = q.choices.findIndex((c) => c !== q.answer && !q.tried.includes(c));
      if (bad >= 0) g.answer(bad);
      wrongDone = true;
      seenAt = g.time;
      return;
    }
    g.answer(q.choices.indexOf(q.answer));
  }, 50);
};

window.runLevel = (n, wrongRate = 0, react = 1.2) => {
  window.__res = null;
  (async () => {
    clearInterval(window.__bot);
    stopGame();
    openLevel(WORLDS[0], WORLDS[0].levels[n - 1]);
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#go').click();
    await new Promise((r) => setTimeout(r, 300));
    botStart(wrongRate, react);
    const t0 = performance.now();
    let rainbows = 0, waves = 1;
    while (!(game && game.ended) && performance.now() - t0 < 400000) {
      await new Promise((r) => setTimeout(r, 250));
      if (!game) return; // 被手动停掉了
      if (game.rainbowT > 1.3) rainbows++;
      waves = Math.max(waves, game.wave);
    }
    clearInterval(window.__bot);
    window.__res = {
      n, secs: Math.round((performance.now() - t0) / 1000), state: game.state, progress: game.progress, goal: game.goal,
      wrong: game.wrong, castle: game.castle.hp, waves, rainbows, boss: game.boss && game.boss.hp,
      title: document.querySelector('#result-title').textContent, stars: document.querySelector('#result-stars').textContent,
    };
  })();
};
