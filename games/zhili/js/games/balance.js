// 数学岛 · 天平称一称：从平衡的天平推出等量关系
Z.register({
  id: 'balance', island: 'math', icon: '⚖️', name: '天平称一称', desc: '谁和谁一样重？',
  how: '天平平平的，就说明两边一样重。看看上面的天平，算出问号要放几个水果！',
  play(ctx) {
    const { h, rand, pick, numberChoices } = Z;
    const L = ctx.level, N = 5;
    const FRUITS = [['🍉', '西瓜'], ['🍍', '菠萝'], ['🍌', '香蕉'], ['🍎', '苹果'], ['🍓', '草莓'], ['🍒', '樱桃']];
    let round = 0;
    ctx.rounds(N);
    const many = (e, n) => Z.range(n).map(() => e);

    function makeRound() {
      if (L === 1) {
        const i = rand(0, FRUITS.length - 2), j = rand(i + 1, FRUITS.length - 1);
        const [X, xn] = FRUITS[i], [Y, yn] = FRUITS[j];
        const k = rand(2, 3);
        const rel = [{ l: [X], r: many(Y, k) }];
        if (Math.random() < 0.5) {
          const n = rand(2, 3);
          return { rel, q: many(X, n), unit: Y, uname: yn, answer: n * k };
        }
        const m = rand(1, 2);
        return { rel, q: [X, ...many(Y, m)], unit: Y, uname: yn, answer: k + m };
      }
      const idx = Z.shuffle(Z.range(FRUITS.length)).slice(0, 3).sort((a, b) => a - b);
      const [X, Y, Zf] = idx.map(i => FRUITS[i]);
      if (Math.random() < 0.4) {
        // X = a·Z, X + Y = (a+b)·Z  →  Y = b·Z
        const a = rand(2, 4), b = rand(1, 4);
        return { rel: [{ l: [X[0]], r: many(Zf[0], a) }, { l: [X[0], Y[0]], r: many(Zf[0], a + b) }], q: [Y[0]], unit: Zf[0], uname: Zf[1], answer: b };
      }
      // chain: X = a·Y, Y = b·Z
      const a = rand(2, 3), b = rand(2, 3);
      for (;;) {
        const p = rand(0, 1), q = rand(0, 2), r = rand(0, 2);
        if (p + q === 0) continue;
        const ans = p * a * b + q * b + r;
        if (ans > 20 || ans < 3) continue;
        return {
          rel: [{ l: [X[0]], r: many(Y[0], a) }, { l: [Y[0]], r: many(Zf[0], b) }],
          q: [...many(X[0], p), ...many(Y[0], q), ...many(Zf[0], r)], unit: Zf[0], uname: Zf[1], answer: ans,
        };
      }
    }

    function pan(items) {
      return h('div', { class: 'pan' + (items.length > 6 ? ' many' : '') + (items.length > 12 ? ' lots' : '') },
        h('div', { class: 'pan-items' }, items.map(e => typeof e === 'string' ? h('span', {}, e) : e)), h('div', { class: 'pan-dish' }));
    }
    function scale(l, r, cls = '') {
      return h('div', { class: 'scale ' + cls },
        h('div', { class: 'beam' }, pan(l), h('div', { class: 'pivot' }, cls === 'q' ? '?' : '='), pan(r)),
        h('div', { class: 'stand' }));
    }

    function next() {
      if (round >= N) return ctx.finishByMistakes(0, 2);
      ctx.setRound(round); ctx.clear();
      const r = makeRound();
      const qMark = h('span', { class: 'qmark' }, '?');
      const qScale = scale(r.q, [qMark, h('span', { class: 'xunit' }, '个', r.unit)], 'q');
      ctx.stage.append(
        h('div', { class: 'panel scales' },
          h('div', { class: 'rel-row' }, r.rel.map(x => h('div', { class: 'rel' }, scale(x.l, x.r, 'eq'), h('small', {}, '✔ 一样重')))),
          h('div', { class: 'q-wrap' }, h('p', { class: 'prompt' }, `右边要放几个${r.uname}${r.unit}才能平？`), qScale)),
        Z.options(ctx, numberChoices(r.answer, 4, [1, -1, 2, -2, 3], 1).map(v => ({ label: h('span', { class: 'num' }, v), value: v })), {
          correct: r.answer,
          now: () => {
            const rp = qScale.querySelectorAll('.pan')[1];
            rp.replaceWith(pan(Z.range(r.answer).map(() => r.unit)));
            qScale.classList.replace('q', 'eq');
            qScale.querySelector('.pivot').textContent = '=';
          },
          then: () => { round++; next(); },
        }));
      if (round > 0) ctx.say(pick(['再称一称！', '看看这次的天平～', '水果们又来比重量啦！']));
    }
    next();
  },
});
