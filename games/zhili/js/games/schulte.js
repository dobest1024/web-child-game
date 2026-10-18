// 记忆岛 · 数字快快找：舒尔特方格，按顺序点数字，练专注力
Z.register({
  id: 'schulte', island: 'memory', icon: '🎯', name: '数字快快找', desc: '按顺序点数字',
  how: '从 1 开始，按顺序快快点出所有数字！',
  play(ctx) {
    const { h, shuffle, state, save } = Z;
    const L = ctx.level, S = L === 1 ? 4 : 5, MAX = S * S;
    const TIERS = L === 1 ? [30, 55] : [45, 80];
    const COLORS = ['#FFE3E3', '#FFF1C9', '#DDF7D5', '#D6F1FB', '#E5DEFF', '#FFE0EE'];
    const recKey = 'schulte-' + L;
    ctx.rounds(1); ctx.setRound(0);
    let want = 1, t0 = 0, timer = null, mistakes = 0;

    const nowEl = h('b', { class: 'want' }, '1');
    const timeEl = h('b', {}, '0.0');
    const best = state.records[recKey];
    const grid = h('div', { class: 'schulte', style: { '--s': S } }, shuffle(Z.range(MAX).map(i => i + 1)).map(n =>
      h('button', { class: 'sch-cell', style: { background: COLORS[n % COLORS.length] }, onclick: e => tap(n, e.currentTarget) }, n)));
    const cover = h('div', { class: 'countdown' }, '3');

    function tap(n, el) {
      if (!t0) return;
      if (n === want) {
        el.classList.add('hit'); Z.sfx.tap();
        want++;
        if (want > MAX) return win();
        nowEl.textContent = want;
      } else if (n > want || !el.classList.contains('hit')) {
        mistakes++; el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); Z.sfx.bad();
      }
    }
    function win() {
      ctx.stop(timer);
      const secs = (Date.now() - t0) / 1000;
      timeEl.textContent = secs.toFixed(1);
      const rec = state.records[recKey];
      const isRec = !rec || secs < rec;
      if (isRec) { state.records[recKey] = Math.round(secs * 10) / 10; save(); }
      let stars = secs <= TIERS[0] ? 3 : secs <= TIERS[1] ? 2 : 1;
      if (mistakes > 6 && stars > 1) stars--;
      ctx.good(isRec ? `新纪录！${secs.toFixed(1)} 秒！` : `完成！用了 ${secs.toFixed(1)} 秒！`);
      ctx.after(1000, () => ctx.finish(stars, `用时 ${secs.toFixed(1)} 秒${isRec ? ' · 🏆 新纪录' : ''}`));
    }

    ctx.stage.append(h('div', { class: 'panel sch-wrap' },
      h('div', { class: 'stat-row' },
        h('span', {}, '下一个 ', nowEl), h('span', {}, '⏱️ ', timeEl, ' 秒'),
        h('span', {}, '🏆 最快 ', best ? best + ' 秒' : '还没有')),
      h('div', { class: 'sch-board' }, grid, cover)));

    let c = 3;
    Z.sfx.tap();
    const cd = ctx.every(800, () => {
      c--;
      if (c > 0) { cover.textContent = c; Z.sfx.tap(); return; }
      ctx.stop(cd); cover.remove(); Z.sfx.pop();
      t0 = Date.now();
      timer = ctx.every(100, () => { timeEl.textContent = ((Date.now() - t0) / 1000).toFixed(1); });
    });
  },
});
