// 编程岛 · 机器人回家：拼指令积木，让机器人走到电池那里（大探险家用"重复"积木）
Z.register({
  id: 'robot', island: 'code', icon: '🤖', name: '机器人回家', desc: '拼积木，下指令',
  how: '点箭头积木排好指令，再按出发，让机器人走到电池那里充电！',
  play(ctx) {
    const { h, rand, pick, shuffle } = Z;
    const L = ctx.level, N = 3, S = L === 1 ? 5 : 6;
    const DIRS = { up: [-1, 0, '⬆️', '上'], down: [1, 0, '⬇️', '下'], left: [0, -1, '⬅️', '左'], right: [0, 1, '➡️', '右'] };
    const ROCKS = ['🪨', '🌵', '🌲', '🧱'];
    let round = 0;
    ctx.rounds(N);

    function bfs(block, s, g) {
      const prev = new Map([[s.join(), null]]), q = [s];
      while (q.length) {
        const cur = q.shift();
        if (cur[0] === g[0] && cur[1] === g[1]) break;
        for (const [k, [dr, dc]] of Object.entries(DIRS)) {
          const n = [cur[0] + dr, cur[1] + dc];
          if (n[0] < 0 || n[1] < 0 || n[0] >= S || n[1] >= S || block[n[0]][n[1]] || prev.has(n.join())) continue;
          prev.set(n.join(), { from: cur, dir: k }); q.push(n);
        }
      }
      if (!prev.has(g.join())) return null;
      const path = []; let k = g.join();
      while (prev.get(k)) { const p = prev.get(k); path.unshift(p.dir); k = p.from.join(); }
      return path;
    }
    function makeLevel() {
      const minLen = L === 1 ? [3, 4, 5][round] : [6, 7, 8][round];
      const minTurns = L === 1 ? [1, 1, 2][round] : [2, 2, 3][round];
      for (;;) {
        const block = Z.range(S).map(() => Z.range(S).map(() => Math.random() < 0.26));
        const s = [rand(0, S - 1), rand(0, S - 1)], g = [rand(0, S - 1), rand(0, S - 1)];
        block[s[0]][s[1]] = false; block[g[0]][g[1]] = false;
        const path = bfs(block, s, g);
        if (!path || path.length < minLen || path.length > minLen + 4) continue;
        const runs = path.reduce((n, d, i) => n + (i === 0 || d !== path[i - 1] ? 1 : 0), 0);
        if (runs - 1 < minTurns) continue;
        const rocks = block.map(row => row.map(b => b ? pick(ROCKS) : null));
        return { s, g, block, rocks, path, runs };
      }
    }

    function next() {
      if (round >= N) return ctx.finishByMistakes(0, 2);
      ctx.setRound(round); ctx.clear();
      const lv = makeLevel();
      const LIMIT = L === 1 ? Math.max(lv.path.length + 2, 8) : lv.runs + 1;
      let prog = [], running = false, done = false, pos = [...lv.s];

      const board = h('div', { class: 'rb-board', style: { '--s': S } });
      for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
        board.append(h('div', { class: 'rb-cell' + ((r + c) % 2 ? ' alt' : '') },
          lv.rocks[r][c] || (r === lv.g[0] && c === lv.g[1] ? h('span', { class: 'goal' }, '🔋') : '')));
      }
      const bot = h('div', { class: 'rb-bot' }, '🤖');
      board.append(bot);
      const trail = [];
      const place = () => { bot.style.left = pos[1] * 100 / S + '%'; bot.style.top = pos[0] * 100 / S + '%'; };
      const clearTrail = () => { trail.forEach(t => t.remove()); trail.length = 0; };

      const progEl = h('div', { class: 'program' });
      const countEl = h('span', { class: 'muted' });
      function drawProg() {
        progEl.innerHTML = '';
        if (!prog.length) progEl.append(h('span', { class: 'muted hint' }, '点下面的箭头积木，排出路线'));
        prog.forEach((b, k) => {
          const chip = h('div', { class: 'chip' + (b.active ? ' active' : '') },
            h('button', {
              class: 'chip-main', 'aria-label': L === 2 ? '改变次数' : '删除', onclick: () => {
                if (running) return;
                if (L === 2) { b.n = b.n % 5 + 1; Z.sfx.tap(); } else { prog.splice(k, 1); Z.sfx.tap(); }
                drawProg();
              },
            }, DIRS[b.d][2], L === 2 ? h('b', { class: 'times' }, '×' + b.n) : null),
            L === 2 ? h('button', { class: 'chip-x', 'aria-label': '删除', onclick: () => { if (running) return; prog.splice(k, 1); Z.sfx.tap(); drawProg(); } }, '✕') : null);
          progEl.append(chip);
        });
        countEl.textContent = `积木 ${prog.length} / ${LIMIT}`;
      }
      const add = d => {
        if (running || done) return;
        if (prog.length >= LIMIT) { ctx.say(L === 2 ? `最多只能用 ${LIMIT} 块积木！点积木可以让它重复几次哦。` : `最多 ${LIMIT} 块积木哦！`); Z.sfx.bad(); return; }
        prog.push({ d, n: 1 }); Z.sfx.pop(); drawProg();
      };

      async function runProg() {
        if (running || done || !prog.length) return;
        running = true; pos = [...lv.s]; place(); clearTrail();
        const wait = ms => new Promise(res => ctx.after(ms, res));
        await wait(250);
        for (const b of prog) {
          b.active = true; drawProg();
          for (let t = 0; t < b.n; t++) {
            const [dr, dc] = DIRS[b.d];
            const n = [pos[0] + dr, pos[1] + dc];
            if (n[0] < 0 || n[1] < 0 || n[0] >= S || n[1] >= S || lv.block[n[0]][n[1]]) {
              bot.classList.remove('crash'); void bot.offsetWidth; bot.classList.add('crash');
              ctx.bad(n[0] < 0 || n[1] < 0 || n[0] >= S || n[1] >= S ? '哎呀，走出地图啦！' : '哎呀，撞到障碍物了！');
              await wait(1200);
              if (!ctx.alive) return;
              b.active = false; running = false; pos = [...lv.s]; place(); clearTrail(); drawProg();
              return;
            }
            const dot = h('i', { class: 'trail', style: { left: (pos[1] + 0.5) * 100 / S + '%', top: (pos[0] + 0.5) * 100 / S + '%' } });
            board.insertBefore(dot, bot); trail.push(dot);
            pos = n; place(); Z.sfx.move();
            await wait(380);
            if (!ctx.alive) return;
          }
          b.active = false;
        }
        drawProg();
        if (pos[0] === lv.g[0] && pos[1] === lv.g[1]) {
          done = true; bot.classList.add('charged'); board.classList.add('won');
          ctx.good('到家啦！机器人充满电了！');
          ctx.after(1700, () => { round++; next(); });
        } else {
          ctx.bad('还没走到电池那里哦，改一改指令吧！');
          await wait(900);
          if (!ctx.alive) return;
          running = false; pos = [...lv.s]; place(); clearTrail();
        }
      }

      ctx.stage.append(h('div', { class: 'panel rb-wrap' },
        board,
        h('div', { class: 'rb-side' },
          h('div', { class: 'stat-row' }, h('b', {}, '我的程序'), countEl),
          progEl,
          h('div', { class: 'blocks-row' }, Object.entries(DIRS).map(([d, v]) => h('button', { class: 'code-btn', 'aria-label': '向' + v[3], onclick: () => add(d) }, v[2]))),
          h('div', { class: 'tool-row' },
            h('button', { class: 'btn small', onclick: () => { if (running) return; prog.pop(); Z.sfx.tap(); drawProg(); } }, '⌫ 删一块'),
            h('button', { class: 'btn small', onclick: () => { if (running) return; prog = []; Z.sfx.tap(); drawProg(); } }, '🗑️ 清空'),
            h('button', { class: 'btn primary go', onclick: runProg }, '▶ 出发')))));
      place(); drawProg();
      if (round === 0) ctx.say(L === 2 ? `排好指令让机器人回家。最多 ${LIMIT} 块积木，点积木能让它重复走几步！` : ctx.game.how);
      else ctx.say('新的地图！');
    }
    next();
  },
});
