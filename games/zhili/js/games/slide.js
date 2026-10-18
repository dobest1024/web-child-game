// 数学岛 · 数字华容道：滑动方块，把 1–8 排好
Z.register({
  id: 'slide', island: 'math', icon: '🔢', name: '数字华容道', desc: '滑一滑，排好队',
  how: '点空格旁边的数字，它就会滑过去。把 1 到 8 按顺序排好！',
  play(ctx) {
    const { h, pick } = Z;
    const L = ctx.level, S = 3;
    const SHUFFLE = L === 1 ? [10, 18] : [36, 70];
    const COLORS = ['#FF6B6B', '#FF9F43', '#FFC93C', '#4CC26E', '#13A3C7', '#4D96FF', '#7B5CFA', '#F2507B'];
    let round = 0, totalMoves = 0, totalShuffle = 0;
    ctx.rounds(SHUFFLE.length);

    const neighbors = i => {
      const r = Math.floor(i / S), c = i % S, out = [];
      if (r > 0) out.push(i - S); if (r < S - 1) out.push(i + S);
      if (c > 0) out.push(i - 1); if (c < S - 1) out.push(i + 1);
      return out;
    };
    const solved = a => a.every((v, i) => v === (i === a.length - 1 ? 0 : i + 1));

    function next() {
      if (round >= SHUFFLE.length) {
        const ratio = totalMoves / totalShuffle;
        return ctx.finish(ratio <= 1.4 ? 3 : ratio <= 2.6 ? 2 : 1, `一共走了 ${totalMoves} 步`);
      }
      ctx.setRound(round); ctx.clear();
      const arr = [...Z.range(S * S - 1).map(i => i + 1), 0];
      let e = arr.length - 1, prev = -1, k = 0;
      while (k < SHUFFLE[round] || solved(arr)) {
        const opts = neighbors(e).filter(n => n !== prev);
        const n = pick(opts);
        [arr[e], arr[n]] = [arr[n], arr[e]]; prev = e; e = n; k++;
      }
      totalShuffle += k;
      let moves = 0, done = false;
      const board = h('div', { class: 'slide-board' });
      const tiles = {};
      for (let v = 1; v < S * S; v++) {
        tiles[v] = h('button', { class: 'slide-tile', style: { '--tc': COLORS[v - 1] }, onclick: () => tap(v) }, v);
        board.append(tiles[v]);
      }
      const moveEl = h('b', {}, '0');
      function draw() {
        arr.forEach((v, i) => {
          if (!v) return;
          tiles[v].style.left = (i % S) * 100 / S + '%';
          tiles[v].style.top = Math.floor(i / S) * 100 / S + '%';
          tiles[v].classList.toggle('home', v === i + 1);
        });
        moveEl.textContent = moves;
      }
      function tap(v) {
        if (done) return;
        const i = arr.indexOf(v), z = arr.indexOf(0);
        const ri = Math.floor(i / S), ci = i % S, rz = Math.floor(z / S), cz = z % S;
        if (ri !== rz && ci !== cz) { tiles[v].classList.remove('nope'); void tiles[v].offsetWidth; tiles[v].classList.add('nope'); return; }
        // slide every tile between v and the gap
        const step = ri === rz ? (ci < cz ? 1 : -1) : (ri < rz ? S : -S);
        let g = z;
        while (g !== i) { arr[g] = arr[g - step]; g -= step; }
        arr[i] = 0;
        moves++; totalMoves++; Z.sfx.move(); draw();
        if (solved(arr)) {
          done = true; board.classList.add('won');
          ctx.good(`排好啦！用了 ${moves} 步！`);
          ctx.after(1600, () => { round++; next(); });
        }
      }
      const goal = h('div', { class: 'mini-goal' }, [...Z.range(S * S - 1).map(i => i + 1), ''].map(v => h('span', {}, v)));
      ctx.stage.append(h('div', { class: 'panel slide' },
        h('div', { class: 'slide-info' }, h('div', {}, '目标', goal), h('div', { class: 'moves' }, '步数 ', moveEl)),
        board));
      draw();
      if (round > 0) ctx.say('这一盘更乱啦，加油！');
    }
    next();
  },
});
