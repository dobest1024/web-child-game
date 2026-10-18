// 空间岛 · 方块拼拼乐：把形状块拖进格子，正好填满
Z.register({
  id: 'blocks', island: 'space', icon: '🟦', name: '方块拼拼乐', desc: '填满所有格子',
  how: '把下面的方块拖进格子里，把格子全部填满！点一下方块可以转方向。',
  play(ctx) {
    const { h, rand, pick, shuffle } = Z;
    const L = ctx.level;
    const PLAN = L === 1 ? [[3, 4, 3, 4], [4, 4, 3, 4]] : [[4, 5, 3, 5], [5, 5, 4, 5]]; // rows, cols, min, max piece size
    const COLORS = ['#FF6B6B', '#FFC93C', '#4CC26E', '#13A3C7', '#7B5CFA', '#FF9F43', '#F2507B', '#4D96FF'];
    let round = 0;
    ctx.rounds(PLAN.length);

    function partition(R, C, mn, mx) {
      for (;;) {
        const owner = Z.range(R).map(() => Array(C).fill(-1));
        const pieces = [];
        for (const k of shuffle(Z.range(R * C))) {
          const r0 = Math.floor(k / C), c0 = k % C;
          if (owner[r0][c0] >= 0) continue;
          const id = pieces.length, cells = [[r0, c0]], size = rand(mn, mx);
          owner[r0][c0] = id;
          while (cells.length < size) {
            const fr = [];
            cells.forEach(([r, c]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
              const a = r + dr, b = c + dc;
              if (a >= 0 && b >= 0 && a < R && b < C && owner[a][b] < 0) fr.push([a, b]);
            }));
            if (!fr.length) break;
            const [a, b] = pick(fr); owner[a][b] = id; cells.push([a, b]);
          }
          pieces.push(cells);
        }
        if (pieces.every(p => p.length >= mn - 1) && pieces.filter(p => p.length < mn).length <= 1) return pieces;
      }
    }
    const norm = cells => {
      const r0 = Math.min(...cells.map(c => c[0])), c0 = Math.min(...cells.map(c => c[1]));
      return cells.map(([r, c]) => [r - r0, c - c0]);
    };
    const turn = cells => { const mr = Math.max(...cells.map(c => c[0])); return norm(cells.map(([r, c]) => [c, mr - r])); };

    function next() {
      if (round >= PLAN.length) return ctx.finishByMistakes(2, 6);
      ctx.setRound(round); ctx.clear();
      const [R, C, mn, mx] = PLAN[round];
      const parts = partition(R, C, mn, mx);
      const occ = Z.range(R).map(() => Array(C).fill(null));
      const avail = Math.min(ctx.stage.clientWidth || 360, 620) - 40;
      const cs = Math.max(34, Math.min(58, Math.floor(avail / Math.max(C, 6))));
      let done = false;

      const board = h('div', { class: 'blk-board', style: { '--r': R, '--c': C, '--cs': cs + 'px' } },
        Z.range(R * C).map(() => h('div', { class: 'blk-cell' })));
      const tray = h('div', { class: 'blk-tray', style: { '--cs': cs + 'px' } });

      const pieces = parts.map((cells, i) => {
        let shape = norm(cells);
        if (L === 2) for (let t = rand(1, 3); t > 0; t--) shape = turn(shape);
        const p = { shape, color: COLORS[i % COLORS.length], at: null, el: h('div', { class: 'blk-piece' }) };
        p.el.style.setProperty('--pc', p.color);
        return p;
      });
      const drawPiece = p => {
        const rows = Math.max(...p.shape.map(c => c[0])) + 1, cols = Math.max(...p.shape.map(c => c[1])) + 1;
        p.el.style.width = cols * cs + 'px'; p.el.style.height = rows * cs + 'px';
        p.el.innerHTML = '';
        p.shape.forEach(([r, c]) => p.el.append(h('i', { style: { left: c * cs + 'px', top: r * cs + 'px', width: cs + 'px', height: cs + 'px' } })));
      };
      const fits = (p, r0, c0) => p.shape.every(([r, c]) => {
        const a = r0 + r, b = c0 + c;
        return a >= 0 && b >= 0 && a < R && b < C && (occ[a][b] === null || occ[a][b] === p);
      });
      const place = (p, r0, c0) => {
        p.at = [r0, c0];
        p.shape.forEach(([r, c]) => { occ[r0 + r][c0 + c] = p; });
        board.append(p.el);
        Object.assign(p.el.style, { position: 'absolute', left: c0 * cs + 'px', top: r0 * cs + 'px' });
        p.el.classList.add('on-board');
      };
      const lift = p => {
        if (p.at) { p.shape.forEach(([r, c]) => { occ[p.at[0] + r][p.at[1] + c] = null; }); p.at = null; }
      };
      const toTray = p => {
        lift(p);
        Object.assign(p.el.style, { position: '', left: '', top: '' });
        p.el.classList.remove('on-board');
        tray.append(p.el);
      };

      pieces.forEach(p => {
        drawPiece(p); tray.append(p.el);
        p.el.addEventListener('pointerdown', e => {
          if (done) return;
          e.preventDefault();
          const rect = p.el.getBoundingClientRect();
          const offX = e.clientX - rect.left, offY = e.clientY - rect.top;
          const sx = e.clientX, sy = e.clientY;
          let moved = false;
          const ghost = p.el.cloneNode(true);
          ghost.classList.add('ghost'); ghost.classList.remove('on-board');
          Object.assign(ghost.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px' });
          const mv = ev => {
            if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
              moved = true; document.body.append(ghost); p.el.classList.add('dragging');
            }
            if (moved) { ghost.style.left = ev.clientX - offX + 'px'; ghost.style.top = ev.clientY - offY + 'px'; }
          };
          const up = ev => {
            window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
            ghost.remove(); p.el.classList.remove('dragging');
            if (!moved) {
              // tap: rotate (only while in the tray or if the turn still fits)
              const old = p.shape; const at = p.at;
              lift(p); p.shape = turn(p.shape); drawPiece(p);
              if (at) { if (fits(p, at[0], at[1])) place(p, at[0], at[1]); else { p.shape = old; drawPiece(p); place(p, at[0], at[1]); } }
              Z.sfx.tap(); return;
            }
            const br = board.getBoundingClientRect();
            const c0 = Math.round((ev.clientX - offX - br.left) / cs), r0 = Math.round((ev.clientY - offY - br.top) / cs);
            const overBoard = ev.clientX > br.left - cs && ev.clientX < br.right + cs && ev.clientY > br.top - cs && ev.clientY < br.bottom + cs;
            lift(p);
            if (overBoard && fits(p, r0, c0)) {
              place(p, r0, c0); Z.sfx.pop();
              if (occ.every(row => row.every(x => x))) {
                done = true; board.classList.add('won');
                ctx.good('全部填满啦！');
                ctx.after(1500, () => { round++; next(); });
              }
            } else {
              toTray(p);
              if (overBoard) { ctx.miss(); Z.sfx.bad(); ctx.say('放不下哦，换个位置或者转一转！', false); }
            }
          };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
        });
      });

      ctx.stage.append(h('div', { class: 'panel blk-wrap' },
        h('div', { class: 'stat-row' }, h('span', {}, `${R} × ${C} 的格子`), h('span', { class: 'muted' }, '拖动放进去 · 点一下转方向')),
        board, tray));
      if (round > 0) ctx.say('格子变大啦，继续填满它！');
    }
    next();
  },
});
