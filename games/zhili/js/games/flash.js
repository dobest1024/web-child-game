// 记忆岛 · 闪电记忆：小动物闪一下就藏起来，说出它们在哪
Z.register({
  id: 'flash', island: 'memory', icon: '⚡', name: '闪电记忆', desc: '谁藏在哪片叶子下？',
  how: '小动物们会出现一下，然后躲到叶子下面。记住它们的位置！',
  play(ctx) {
    const { h, shuffle } = Z;
    const L = ctx.level, S = L === 1 ? 3 : 4;
    const COUNTS = L === 1 ? [2, 3, 3, 4, 4] : [3, 4, 5, 5, 6];
    const ANIMALS = [['🐱', '小猫'], ['🐶', '小狗'], ['🐰', '小兔'], ['🐸', '青蛙'], ['🐼', '熊猫'], ['🦊', '狐狸'], ['🐷', '小猪'], ['🐥', '小鸡'], ['🐵', '猴子'], ['🐯', '老虎']];
    let round = 0;
    ctx.rounds(COUNTS.length);

    function next() {
      if (round >= COUNTS.length) return ctx.finishByMistakes(1, 4);
      ctx.setRound(round); ctx.clear();
      const k = COUNTS[round];
      const spots = shuffle(Z.range(S * S)).slice(0, k);
      const who = shuffle(ANIMALS).slice(0, k);
      const at = new Map(spots.map((s, i) => [s, who[i]]));
      const showMs = 1400 + k * 550;
      const cells = Z.range(S * S).map(i => h('button', { class: 'fl-cell', disabled: true },
        h('div', { class: 'fl-in' },
          h('div', { class: 'fl-front' }, at.has(i) ? at.get(i)[0] : ''),
          h('div', { class: 'fl-back' }, '🍃'))));
      const grid = h('div', { class: 'flash', style: { '--s': S } }, cells);
      const bar = h('div', { class: 'timebar' }, h('i', { style: { animationDuration: showMs + 'ms' } }));
      const ask = h('div', { class: 'ask' }, h('span', {}, '看仔细，记住它们！'));
      ctx.stage.append(h('div', { class: 'panel flash-wrap' }, ask, bar, grid));
      ctx.say(round === 0 ? ctx.game.how : `这次有 ${k} 只小动物，看仔细！`);

      ctx.after(showMs, () => {
        bar.remove();
        cells.forEach(c => { c.classList.add('hide'); c.disabled = false; });
        Z.sfx.flip();
        const order = shuffle(spots);
        let q = 0, tries = 0, busy = false;
        const askOne = () => {
          const [e, name] = at.get(order[q]);
          ask.innerHTML = '';
          ask.append(h('span', { class: 'ask-e' }, e), h('span', {}, `${name}刚才在哪里？`));
          ctx.say(`${name}刚才在哪里？`);
          tries = 0;
        };
        cells.forEach((c, i) => c.addEventListener('click', () => {
          if (busy || q >= order.length || !c.classList.contains('hide')) return;
          if (i === order[q]) {
            c.classList.remove('hide'); c.classList.add('found'); Z.sfx.good();
            q++;
            if (q < order.length) { busy = true; ctx.after(500, () => { busy = false; askOne(); }); }
            else { ctx.good('全都记住啦！'); ctx.after(1400, () => { round++; next(); }); }
          } else {
            tries++;
            c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope');
            if (tries >= 2) {
              ctx.bad('在这里哦，下一个要记牢！');
              const t = cells[order[q]]; t.classList.remove('hide'); t.classList.add('shown');
              busy = true; q++;
              ctx.after(1300, () => {
                busy = false;
                if (q < order.length) askOne(); else { round++; next(); }
              });
            } else ctx.bad(null, false);
          }
        }));
        askOne();
      });
    }
    next();
  },
});
