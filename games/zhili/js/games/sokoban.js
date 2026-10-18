// 逻辑岛 · 小熊推蜂蜜：推箱子。关卡由"倒着拉"生成，保证一定有解。
Z.register({
  id: 'sokoban', island: 'logic', icon: '🐻', name: '小熊推蜂蜜', desc: '把蜂蜜推进篮子',
  how: '用箭头帮小熊把蜂蜜推到篮子里。小熊只能推，不能拉哦！',
  play(ctx) {
    const { h, pick, shuffle, rand } = Z;
    const L = ctx.level;
    const PLAN = L === 1 ? [[6, 1], [7, 1], [7, 2]] : [[7, 2], [8, 2], [8, 3]]; // [grid size, boxes]
    const D = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    const same = (a, b) => a[0] === b[0] && a[1] === b[1];
    let idx = 0;
    ctx.rounds(PLAN.length);

    function connected(wall, n) {
      const floors = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!wall[r][c]) floors.push([r, c]);
      if (!floors.length) return null;
      const seen = new Set([floors[0].join()]), q = [floors[0]];
      while (q.length) {
        const [r, c] = q.shift();
        for (const [dr, dc] of Object.values(D)) {
          const k = (r + dr) + ',' + (c + dc);
          if (!wall[r + dr][c + dc] && !seen.has(k)) { seen.add(k); q.push([r + dr, c + dc]); }
        }
      }
      return seen.size === floors.length ? floors : null;
    }

    function generate(n, nb) {
      let best = null, bestScore = -1;
      for (let attempt = 0; attempt < 80; attempt++) {
        const wall = Z.range(n).map(r => Z.range(n).map(c => r === 0 || c === 0 || r === n - 1 || c === n - 1));
        const inner = (n - 2) * (n - 2);
        const nw = rand(Math.floor(inner * 0.08), Math.floor(inner * 0.2));
        for (let k = 0; k < nw; k++) wall[rand(1, n - 2)][rand(1, n - 2)] = true;
        const floors = connected(wall, n);
        if (!floors || floors.length < nb + 6) continue;
        const goals = shuffle(floors).slice(0, nb).map(g => [...g]);
        const boxes = goals.map(g => [...g]);
        const boxAt = (r, c) => boxes.find(b => b[0] === r && b[1] === c);
        let p = [...pick(floors.filter(f => !boxAt(f[0], f[1])))];
        // walk backwards: moving away from a box may pull it along
        for (let s = 0; s < 400; s++) {
          const [dr, dc] = pick(Object.values(D));
          const nr = p[0] + dr, nc = p[1] + dc;
          if (wall[nr][nc] || boxAt(nr, nc)) continue;
          const b = boxAt(p[0] - dr, p[1] - dc);
          if (b && Math.random() < 0.65) { b[0] = p[0]; b[1] = p[1]; }
          p = [nr, nc];
        }
        if (boxes.some(b => goals.some(g => same(g, b)))) continue;
        const score = boxes.reduce((s, b) => s + Math.min(...goals.map(g => Math.abs(g[0] - b[0]) + Math.abs(g[1] - b[1]))), 0);
        if (score > bestScore) { bestScore = score; best = { n, wall, goals, boxes, p }; }
        if (bestScore >= nb * (L === 1 ? 3 : 4) && attempt > 15) break;
      }
      return best;
    }

    function play() {
      if (idx >= PLAN.length) return ctx.finishByMistakes(1, 3);
      ctx.setRound(idx); ctx.clear();
      const [n, nb] = PLAN[idx];
      let lvl = null;
      while (!lvl) lvl = generate(n, nb);
      const start = { boxes: lvl.boxes.map(b => [...b]), p: [...lvl.p] };
      let boxes, p, hist, moves, won = false, facing = 1;

      const board = h('div', { class: 'soko', style: { '--n': n } });
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const isGoal = lvl.goals.some(g => same(g, [r, c]));
        board.append(h('div', { class: 'sk-cell ' + (lvl.wall[r][c] ? 'wall' : 'floor') + (isGoal ? ' goal' : '') },
          lvl.wall[r][c] ? pick(['🌳', '🌲', '🌳']) : isGoal ? '🧺' : ''));
      }
      const pos = (el, r, c) => { el.style.left = (c * 100 / n) + '%'; el.style.top = (r * 100 / n) + '%'; };
      const boxEls = start.boxes.map(() => { const e = h('div', { class: 'sk-sprite box' }, '🍯'); board.append(e); return e; });
      const bear = h('div', { class: 'sk-sprite bear' }, h('span', {}, '🐻'));
      board.append(bear);
      const moveLabel = h('b', {}, '0');

      function draw() {
        boxes.forEach((b, k) => {
          pos(boxEls[k], b[0], b[1]);
          boxEls[k].classList.toggle('done', lvl.goals.some(g => same(g, b)));
        });
        pos(bear, p[0], p[1]);
        bear.firstChild.style.transform = facing < 0 ? 'scaleX(-1)' : '';
        moveLabel.textContent = moves;
      }
      function reset(count) {
        if (count) { ctx.miss(); ctx.say('重新开始，想一想先推哪一个～'); }
        boxes = start.boxes.map(b => [...b]); p = [...start.p]; hist = []; moves = 0; draw();
      }
      function bump() {
        bear.classList.remove('bump'); void bear.offsetWidth; bear.classList.add('bump');
      }
      function move(dir) {
        if (won) return;
        const [dr, dc] = D[dir];
        if (dc) facing = dc;
        const nr = p[0] + dr, nc = p[1] + dc;
        if (lvl.wall[nr][nc]) { bump(); draw(); return; }
        const b = boxes.find(x => x[0] === nr && x[1] === nc);
        if (b) {
          const br = nr + dr, bc = nc + dc;
          if (lvl.wall[br][bc] || boxes.some(x => x[0] === br && x[1] === bc)) { bump(); draw(); return; }
          hist.push({ boxes: boxes.map(x => [...x]), p: [...p] });
          b[0] = br; b[1] = bc;
          if (lvl.goals.some(g => g[0] === br && g[1] === bc)) Z.sfx.pop(); else Z.sfx.move();
        } else {
          hist.push({ boxes: boxes.map(x => [...x]), p: [...p] });
          Z.sfx.move();
        }
        p = [nr, nc]; moves++; draw();
        if (boxes.every(x => lvl.goals.some(g => same(g, x)))) {
          won = true;
          board.classList.add('won');
          ctx.good(`成功啦！用了 ${moves} 步！`);
          ctx.after(1500, () => { idx++; play(); });
        }
      }
      function undo() {
        if (won || !hist.length) return;
        const s = hist.pop(); boxes = s.boxes; p = s.p; moves = Math.max(0, moves - 1); Z.sfx.tap(); draw();
      }

      const arrow = (dir, label) => h('button', { class: 'pad-btn ' + dir, 'aria-label': dir, onclick: () => move(dir) }, label);
      ctx.stage.append(
        h('div', { class: 'soko-wrap' },
          h('div', { class: 'soko-info' }, h('span', {}, `第 ${idx + 1} 关 · 🍯 × ${nb}`), h('span', {}, '步数 ', moveLabel)),
          board,
          h('div', { class: 'soko-controls' },
            h('div', { class: 'pad' }, arrow('up', '⬆️'), arrow('left', '⬅️'), arrow('down', '⬇️'), arrow('right', '➡️')),
            h('div', { class: 'tool-col' },
              h('button', { class: 'btn small', onclick: undo }, '↩️ 退一步'),
              h('button', { class: 'btn small', onclick: () => { Z.sfx.tap(); reset(true); } }, '🔄 重来')))));
      Z.swipe(board, move);
      ctx.onKey(e => {
        const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
        if (k) { e.preventDefault(); move(k); }
      });
      reset(false);
      if (idx === 0) ctx.say(ctx.game.how); else ctx.say(`第 ${idx + 1} 关，有 ${nb} 罐蜂蜜！`);
    }
    play();
  },
});
