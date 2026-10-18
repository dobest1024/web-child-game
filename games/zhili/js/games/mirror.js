// 空间岛 · 镜子画画：照着镜子补全对称图
Z.register({
  id: 'mirror', island: 'space', icon: '🦋', name: '镜子画画', desc: '画出另一半',
  how: '中间有一面镜子。在镜子另一边涂上颜色，让两边一模一样！',
  play(ctx) {
    const { h, rand, pick, shuffle } = Z;
    const L = ctx.level;
    const PALETTE = L === 1 ? ['#FF5C8A'] : ['#FF5C8A', '#13A3C7', '#FFC93C'];
    // [axis, rows, half-width]  axis v = left|right mirror, h = top|bottom mirror
    const PLAN = L === 1 ? [['v', 5, 3], ['v', 5, 3], ['v', 6, 3]] : [['v', 6, 4], ['h', 4, 6], ['v', 7, 4]];
    let round = 0;
    ctx.rounds(PLAN.length);

    function next() {
      if (round >= PLAN.length) return ctx.finishByMistakes(0, 2);
      ctx.setRound(round); ctx.clear();
      const [axis, A, B] = PLAN[round];
      // model half: for 'v' it is A rows × B cols on the left; for 'h' it is A rows (top) × B cols
      const rows = axis === 'v' ? A : A * 2, cols = axis === 'v' ? B * 2 : B;
      let model;
      do {
        model = Z.range(A).map(() => Z.range(B).map(() => Math.random() < 0.42 ? pick(PALETTE) : null));
      } while (model.flat().filter(Boolean).length < Math.max(4, Math.floor(A * B * 0.3)));
      const mirrorOf = (r, c) => axis === 'v' ? model[r][cols - 1 - c] : model[rows - 1 - r][c];
      const isModel = (r, c) => axis === 'v' ? c < B : r < A;
      const paint = Z.range(rows).map(() => Array(cols).fill(null));
      let color = PALETTE[0], done = false;

      const cells = [];
      const track = 'minmax(30px, 52px)';
      const grid = h('div', {
        class: 'mirror ' + axis,
        style: { gridTemplateColumns: axis === 'v' ? `repeat(${B}, ${track}) 14px repeat(${B}, ${track})` : `repeat(${cols}, ${track})` },
      });
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (axis === 'v' && c === B) grid.append(h('div', { class: 'mr-gap' }));
        if (axis === 'h' && r === A && c === 0) grid.append(h('div', { class: 'mr-gap h' }));
        const model_ = isModel(r, c);
        const el = h('button', {
          class: 'mr-cell' + (model_ ? ' model' : ' canvas'), disabled: model_ ? true : null,
          style: model_ && model[r][c] ? { background: model[r][c] } : null,
          onclick: () => tap(r, c, el),
        });
        cells.push(el); grid.append(el);
      }
      function tap(r, c, el) {
        if (done) return;
        paint[r][c] = paint[r][c] === color ? null : color;
        el.style.background = paint[r][c] || '';
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
        Z.sfx.tap();
        check();
      }
      const wrongCells = () => {
        const out = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          if (!isModel(r, c) && paint[r][c] !== mirrorOf(r, c)) out.push(r * cols + c);
        }
        return out;
      };
      function check() {
        if (wrongCells().length) return;
        done = true; grid.classList.add('won');
        ctx.good('一模一样！真漂亮！');
        ctx.after(1600, () => { round++; next(); });
      }
      function hint() {
        if (done) return;
        const w = wrongCells();
        ctx.miss();
        w.forEach(i => { cells[i].classList.remove('flash'); void cells[i].offsetWidth; cells[i].classList.add('flash'); });
        ctx.say(`还有 ${w.length} 个格子不对哦，看闪的地方！`);
      }
      const swatches = PALETTE.length > 1 ? h('div', { class: 'swatches' }, PALETTE.map((p, k) => {
        const b = h('button', { class: 'swatch-btn' + (k === 0 ? ' on' : ''), style: { background: p }, 'aria-label': '颜色' + (k + 1),
          onclick: () => { color = p; [...swatches.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); Z.sfx.tap(); } });
        return b;
      })) : null;

      ctx.stage.append(h('div', { class: 'panel mr-wrap' },
        h('div', { class: 'stat-row' }, h('span', {}, axis === 'v' ? '🪞 镜子竖着放' : '🪞 镜子横着放'), swatches),
        h('div', { class: 'mr-grid-wrap' }, grid),
        h('div', { class: 'tool-row' }, h('button', { class: 'btn small', onclick: hint }, '💡 哪里不对？'))));
      if (round > 0) ctx.say(axis === 'h' ? '这次镜子横着放，在下面画出倒影！' : '再画一幅！');
    }
    next();
  },
});
