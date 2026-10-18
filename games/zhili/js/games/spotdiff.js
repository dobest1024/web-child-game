// 记忆岛 · 火眼金睛：两幅图找不同
Z.register({
  id: 'spotdiff', island: 'memory', icon: '🔍', name: '火眼金睛', desc: '两幅图找不同',
  how: '两幅图有几个地方不一样，在任意一幅图上点出来！',
  play(ctx) {
    const { h, rand, pick, shuffle } = Z;
    const L = ctx.level;
    const COLS = L === 1 ? 4 : 5, ROWS = L === 1 ? 3 : 4, ND = L === 1 ? 3 : 5, SCENES = 2;
    const THEMES = [
      { name: '海底世界', bg: 'linear-gradient(#7FD8F0, #1C8FC0)', items: ['🐠', '🐟', '🐡', '🐙', '🦀', '🐚', '🦑', '🐳', '🪸', '🐬', '🦐', '🐢'] },
      { name: '小森林', bg: 'linear-gradient(#C9F2B5, #6CC46A)', items: ['🌳', '🍄', '🦔', '🐿️', '🌸', '🦋', '🐞', '🌼', '🐝', '🍓', '🐌', '🦉'] },
      { name: '太空', bg: 'linear-gradient(#3A2C7A, #120E33)', items: ['🚀', '🪐', '⭐', '🌙', '👽', '☄️', '🛸', '🌍', '🛰️', '🌟', '👾', '🌕'] },
      { name: '农场', bg: 'linear-gradient(#FFF1B8, #A6DC7A)', items: ['🐄', '🐖', '🐔', '🐑', '🌻', '🚜', '🐴', '🥕', '🌽', '🐣', '🏡', '🐓'] },
    ];
    const themes = shuffle(THEMES);
    let scene = 0;
    ctx.rounds(SCENES);

    function build(theme) {
      const A = Z.range(COLS * ROWS).map(() => Math.random() < 0.08 ? { e: null } : {
        e: pick(theme.items), dx: rand(-14, 14), dy: rand(-12, 12), s: (rand(90, 125) / 100), rot: rand(-14, 14),
      });
      const B = A.map(c => ({ ...c }));
      const diffs = shuffle(Z.range(A.length)).slice(0, ND);
      for (const k of diffs) {
        const c = A[k];
        if (!c.e) { B[k] = { e: pick(theme.items), dx: 0, dy: 0, s: 1.05, rot: 0 }; continue; }
        const kinds = L === 1 ? ['swap', 'swap', 'remove'] : ['swap', 'remove', 'size'];
        const kind = pick(kinds);
        if (kind === 'swap') B[k].e = pick(theme.items.filter(x => x !== c.e));
        else if (kind === 'remove') B[k] = { e: null };
        else B[k].s = c.s > 1.05 ? 0.6 : 1.75;
      }
      return { A, B, diffs: new Set(diffs) };
    }

    function next() {
      if (scene >= SCENES) return ctx.finishByMistakes(2, 6);
      ctx.setRound(scene); ctx.clear();
      const theme = themes[scene];
      const { A, B, diffs } = build(theme);
      const found = new Set();
      const countEl = h('b', {}, '0');
      const panels = [];
      const tap = (k, ev, panel) => {
        if (found.size === ND) return;
        if (diffs.has(k) && !found.has(k)) {
          found.add(k); countEl.textContent = found.size;
          panels.forEach(p => p.children[k].append(h('i', { class: 'ring' })));
          if (found.size === ND) {
            ctx.good(`${ND} 处不同全找到啦！`);
            ctx.after(1600, () => { scene++; next(); });
          } else { Z.sfx.good(); ctx.say(`找到 ${found.size} 个了！`, false); }
        } else if (!found.has(k)) {
          ctx.bad('不是这里哦～', false);
          const r = panel.getBoundingClientRect();
          const x = h('i', { class: 'nope-mark', style: { left: (ev.clientX - r.left) + 'px', top: (ev.clientY - r.top) + 'px' } }, '✖');
          panel.append(x);
          ctx.after(700, () => x.remove());
        }
      };
      const makePanel = cells => {
        const p = h('div', { class: 'scene', style: { background: theme.bg, '--cols': COLS, '--rows': ROWS } });
        cells.forEach((c, k) => p.append(h('button', { class: 'spot', 'aria-label': '位置' + (k + 1), onclick: ev => tap(k, ev, p) },
          c.e ? h('span', { style: { transform: `translate(${c.dx}%, ${c.dy}%) scale(${c.s}) rotate(${c.rot}deg)` } }, c.e) : null)));
        panels.push(p);
        return p;
      };
      ctx.stage.append(h('div', { class: 'panel spot-wrap' },
        h('div', { class: 'stat-row' }, h('span', {}, `🗺️ ${theme.name}`), h('span', {}, '找到 ', countEl, ` / ${ND}`)),
        h('div', { class: 'scenes' }, makePanel(A), makePanel(B))));
      ctx.say(`${theme.name}里有 ${ND} 处不一样，快找找！`);
    }
    next();
  },
});
