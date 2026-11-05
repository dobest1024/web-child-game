'use strict';
// 自测用的"小玩家"，游戏本身不加载它。Node 测试（engine.test.mjs）和浏览器里共用。
// 浏览器用法（控制台或 Playwright）：
//   const s = document.createElement('script'); s.src = 'tests/bot.js'; document.head.append(s);
//   runLevel(5, 0.2)  // 第 5 关，20% 的题故意先答错；结果在 window.__res
// botStep(G, plan)：每帧调用一次；plan() 返回这道题打算 'right' | 'wrong' | 'miss'

function bubbleBot(G, plan) {
  const g = G.mode.current();
  if (!g || g.done) return;
  if (g.botPlan === undefined) g.botPlan = plan();
  if (g.botPlan === 'miss') return;
  const a = g.bubbles.find((b) => b.item === g.item);
  let pick = a;
  if (g.botPlan === 'wrong' && !g.bubbles.some((b) => b.state === 'wrong')) pick = g.bubbles.find((b) => b !== a) || a;
  if (pick.y < 470) G.tapAt(pick.x, pick.y);
}

function matchBot(G, plan) {
  const { cards, open, lock } = G.mode.state();
  if (lock > 0 || open.length >= 2) return;
  const hidden = cards.filter((c) => !c.face && !c.matched);
  if (!hidden.length) return;
  if (open.length === 1) {
    const first = open[0];
    const partner = hidden.find((c) => c.item === first.item);
    const decoy = hidden.find((c) => c.item !== first.item);
    const c = first.botPlan === 'wrong' && decoy ? decoy : partner;
    return G.tapAt(c.x + 10, c.y + 10);
  }
  const c = hidden[0];
  c.botPlan = plan();
  G.tapAt(c.x + 10, c.y + 10);
}

const BOT_GRID = { cols: 15, rows: 7 };
const BOT_STEPS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const BOT_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const BOT_BACK = { up: 'down', down: 'up', left: 'right', right: 'left' };
const botAhead = ([c, r], d) => [(c + BOT_STEPS[d][0] + BOT_GRID.cols) % BOT_GRID.cols, (r + BOT_STEPS[d][1] + BOT_GRID.rows) % BOT_GRID.rows];

// 广度优先找路（会穿墙），返回第一步往哪走；不能掉头
function botFirstStep(from, goal, dir, blocked) {
  const key = ([c, r]) => c * 100 + r;
  const seen = new Set([key(from)]);
  let frontier = Object.keys(BOT_STEPS).filter((d) => d !== BOT_BACK[dir]).map((d) => ({ d, cell: botAhead(from, d) }));
  while (frontier.length) {
    const next = [];
    for (const { d, cell } of frontier) {
      if (seen.has(key(cell)) || blocked(cell)) continue;
      if (cell[0] === goal[0] && cell[1] === goal[1]) return d;
      seen.add(key(cell));
      for (const s of Object.keys(BOT_STEPS)) next.push({ d, cell: botAhead(cell, s) });
    }
    frontier = next;
  }
  return null;
}

// 躲开石头、Boss 红圈和不想吃的字母；两题之间（或故意漏题）只躲前面的石头
function snakeBot(G, plan) {
  const s = G.mode.state();
  if (s.queue.length) return;
  const q = s.q && !s.q.done ? s.q : null;
  if (q && q.botPlan === undefined) q.botPlan = plan();
  const tiles = q ? q.tiles.filter((t) => !t.gone && t.cell) : [];
  let goal = q && q.botPlan !== 'miss' ? s.target : null;
  if (goal && q.botPlan === 'wrong' && !q.glow) goal = tiles.find((t) => t !== s.target) || goal;
  const zone = G.boss && G.boss.zone;
  const blocked = (cell) => s.rocks.some((r) => r[0] === cell[0] && r[1] === cell[1])
    || tiles.some((t) => t !== goal && t.cell[0] === cell[0] && t.cell[1] === cell[1])
    || (zone && Math.abs(cell[0] - zone[0]) <= 1 && Math.abs(cell[1] - zone[1]) <= 1);
  const head = s.body[0];
  const d = goal ? botFirstStep(head, goal.cell, s.dir, blocked)
    : blocked(botAhead(head, s.dir)) ? Object.keys(BOT_STEPS).find((k) => k !== s.dir && k !== BOT_BACK[s.dir] && !blocked(botAhead(head, k))) : null;
  if (d && d !== s.dir) G.key(BOT_KEYS[d]);
}

function botStep(G, plan) {
  ({ bubble: bubbleBot, match: matchBot, snake: snakeBot })[G.L.mode](G, plan);
}

if (typeof document === 'object') {
  window.botStart = (wrongRate = 0) => {
    clearInterval(window.__bot);
    const plan = () => (Math.random() < wrongRate ? 'wrong' : 'right');
    window.__bot = setInterval(() => {
      if (game && game.state === 'play' && !game.paused) botStep(game, plan);
    }, 30);
  };

  window.runLevel = (n, wrongRate = 0) => {
    window.__res = null;
    (async () => {
      clearInterval(window.__bot);
      stopGame();
      const world = WORLDS[0];
      openLevel(world, world.levels[n - 1]);
      await new Promise((r) => setTimeout(r, 200));
      document.querySelector('#go').click();
      while (!game) await new Promise((r) => setTimeout(r, 50)); // 等读音加载完
      botStart(wrongRate);
      const t0 = performance.now();
      while (!(game && game.ended) && performance.now() - t0 < 300000) {
        await new Promise((r) => setTimeout(r, 250));
        if (!game) return; // 被手动停掉了
      }
      clearInterval(window.__bot);
      window.__res = {
        n, secs: Math.round((performance.now() - t0) / 1000), state: game.state, progress: game.progress,
        wrong: game.wrong, hearts: game.hearts,
        title: document.querySelector('#result-title').textContent, stars: document.querySelector('#result-stars').textContent,
      };
    })();
  };
}
