// 记忆岛 · 翻翻乐：翻牌配对
Z.register({
  id: 'pairs', island: 'memory', icon: '🃏', name: '翻翻乐', desc: '找出一样的两张',
  how: '每次翻开两张牌，一样的就能消掉。记住每张牌在哪里！',
  play(ctx) {
    const { h, shuffle, pick } = Z;
    const L = ctx.level;
    const PAIRS = L === 1 ? 6 : 10, COLS = L === 1 ? 4 : 5;
    const SETS = [
      ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊', '🐸', '🐵', '🐷', '🐨', '🦁', '🐯'],
      ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍒', '🥝', '🍑', '🍍', '🥕', '🌽'],
      ['🚗', '🚌', '🚀', '🚲', '⛵', '✈️', '🚁', '🚂', '🛵', '🚒', '🚜', '🛸'],
    ];
    const deck = shuffle(shuffle(pick(SETS)).slice(0, PAIRS).flatMap(e => [e, e]));
    let open = [], found = 0, misses = 0, lock = false, t0 = Date.now();
    ctx.rounds(1); ctx.setRound(0);

    const timeEl = h('b', {}, '0');
    const missEl = h('b', {}, '0');
    const foundEl = h('b', {}, '0');
    ctx.every(500, () => { timeEl.textContent = Math.floor((Date.now() - t0) / 1000); });

    const grid = h('div', { class: 'pairs', style: { '--cols': COLS } }, deck.map((e, k) => {
      const card = h('button', { class: 'card', 'aria-label': '牌', onclick: () => flip(card, e) },
        h('div', { class: 'card-in' }, h('div', { class: 'card-back' }, '🦉'), h('div', { class: 'card-front' }, e)));
      card.style.animationDelay = k * 30 + 'ms';
      return card;
    }));

    function flip(card, e) {
      if (lock || card.classList.contains('up')) return;
      Z.sfx.flip();
      card.classList.add('up');
      open.push({ card, e });
      if (open.length < 2) return;
      const [a, b] = open; open = [];
      if (a.e === b.e) {
        found++; foundEl.textContent = found;
        ctx.after(300, () => { a.card.classList.add('matched'); b.card.classList.add('matched'); Z.sfx.pop(); });
        if (found === PAIRS) {
          const secs = Math.round((Date.now() - t0) / 1000);
          ctx.good('全部找到啦！');
          const ok3 = L === 1 ? 4 : 8, ok2 = L === 1 ? 9 : 16;
          ctx.after(1200, () => ctx.finish(misses <= ok3 ? 3 : misses <= ok2 ? 2 : 1, `用时 ${secs} 秒，翻错 ${misses} 次`));
        } else if (found === 1) ctx.say('找到一对！', false);
      } else {
        misses++; missEl.textContent = misses; lock = true;
        ctx.after(850, () => { a.card.classList.remove('up'); b.card.classList.remove('up'); lock = false; });
      }
    }

    ctx.stage.append(h('div', { class: 'panel pairs-wrap' },
      h('div', { class: 'stat-row' },
        h('span', {}, '⏱️ ', timeEl, ' 秒'), h('span', {}, '✅ ', foundEl, ' / ' + PAIRS), h('span', {}, '🙈 翻错 ', missEl)),
      grid));
  },
});
