'use strict';
// 浏览器自测用的"小玩家"，游戏本身不加载它。用法（控制台或 Playwright）：
//   const s = document.createElement('script'); s.src = 'tests/bot.js'; document.head.append(s);
//   runLevel(5, 0.2)  // 第 5 关，20% 的题故意先答错；结果在 window.__res
window.botStart = (wrongRate = 0) => {
  clearInterval(window.__bot);
  let pressedAt = 0;
  window.__bot = setInterval(() => {
    const g = game;
    if (!g || g.state !== 'play' || g.paused) return;
    const p = g.player;
    if (pressedAt && g.time - pressedAt > 0.08) { g.release(); pressedAt = 0; }
    const active = g.ents.find((e) => (e.type === 'gate' || e.type === 'river') && !e.done);
    let want = false;
    for (const e of g.ents) {
      if ((e.type === 'hog' || e.type === 'rock') && e.x - g.dist > 70 && e.x - g.dist < 110) want = true;
    }
    if (active && active.type === 'gate') {
      if (active.botWrong === undefined) active.botWrong = Math.random() < wrongRate;
      let target = active.blocks.find((b) => b.item === active.item);
      if (active.botWrong && !active.blocks.some((b) => b.state === 'wrong')) {
        const w = active.blocks.find((b) => b.item !== active.item && b.x < target.x);
        if (w) target = w;
      }
      const d = target.x + 39 - g.dist;
      if (d > 15 && d < 40 && target.state === 'idle') want = true;
    }
    if (active && active.type === 'river') {
      const answerCloud = active.cloud.item === active.item;
      if (active.sink) active.botRetry = true;
      if (active.botChoice === undefined || active.botRetry) {
        active.botChoice = active.botRetry ? answerCloud : (Math.random() < wrongRate ? !answerCloud : answerCloud);
      }
      const d = active.x - g.dist;
      if (active.botChoice && !active.cloud.gone && d < 110 && d > 60 && p.onGround && p.platform !== 'cloud') want = true;
    }
    if (want && p.onGround) { g.press(); pressedAt = g.time; }
  }, 16);
};

window.runLevel = (n, wrongRate = 0) => {
  window.__res = null;
  (async () => {
    clearInterval(window.__bot);
    stopGame();
    openLevel(WORLDS[0], WORLDS[0].levels[n - 1]);
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#go').click();
    await new Promise((r) => setTimeout(r, 400));
    botStart(wrongRate);
    const t0 = performance.now();
    const seen = new Set();
    while (!(game && game.ended) && performance.now() - t0 < 200000) {
      await new Promise((r) => setTimeout(r, 250));
      if (!game) return; // 被手动停掉了
      for (const e of game.ents) seen.add(e.type);
      if (game.boss && game.boss.warn) seen.add('bossWarn');
    }
    window.__res = {
      n, secs: Math.round((performance.now() - t0) / 1000), state: game.state, progress: game.progress,
      wrong: game.wrong, hearts: game.player.hearts, seen: [...seen],
      title: document.querySelector('#result-title').textContent, stars: document.querySelector('#result-stars').textContent,
    };
  })();
};
