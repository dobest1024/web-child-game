// 逻辑岛 · 找规律：看懂排队规律，补上问号
Z.register({
  id: 'pattern', island: 'logic', icon: '🔮', name: '找规律', desc: '问号里藏着谁？',
  how: '看看它们是怎么排队的，问号里应该是谁呢？',
  play(ctx) {
    const { h, pick, shuffle, rand, numberChoices } = Z;
    const L = ctx.level, N = 5;
    const THEMES = [
      ['🍎', '🍌', '🍇', '🍓', '🍊', '🥝', '🍒', '🍉'],
      ['🐶', '🐱', '🐰', '🐻', '🐼', '🐸', '🐵', '🐷'],
      ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'],
      ['⭐', '🌙', '☀️', '☁️', '🌈', '⚡'],
      ['🚗', '🚌', '🚀', '🚲', '⛵', '✈️'],
    ];
    const PATTERNS = L === 1 ? ['AB', 'AAB', 'ABB', 'ABC'] : ['ABC', 'AABB', 'ABCD', 'AABC', 'ABBC', 'ABAC'];
    // Which rounds use counting / number patterns instead of symbols
    const kinds = L === 1 ? ['sym', 'sym', 'grow', 'sym', 'sym'] : ['sym', 'sym', 'grow', 'sym', 'num'];
    let i = 0;
    ctx.rounds(N);

    function makeRound(kind) {
      const theme = pick(THEMES);
      if (kind === 'sym') {
        const p = pick(PATTERNS);
        const letters = [...new Set(p)];
        const syms = shuffle(theme).slice(0, letters.length + 2);
        const map = {}; letters.forEach((c, k) => { map[c] = syms[k]; });
        const len = p.length <= 3 ? 7 : 9;
        const seq = Z.range(len).map(k => map[p[k % p.length]]);
        const miss = L === 1 ? len - 1 : rand(p.length, len - 1);
        const answer = seq[miss];
        const others = shuffle(syms.filter(s => s !== answer));
        return { seq, miss, answer, options: shuffle([answer, ...others.slice(0, L === 1 ? 2 : 3)]), show: v => v };
      }
      if (kind === 'grow') {
        const e = pick(theme), d = L === 1 ? 1 : pick([1, 2]), s = L === 1 ? 1 : rand(1, 2);
        const seq = [0, 1, 2, 3].map(k => s + k * d);
        const answer = seq[3];
        const show = v => h('div', { class: 'group' + (v > 4 ? ' many' : '') }, Z.range(v).map(() => h('span', {}, e)));
        return { seq, miss: 3, answer, options: numberChoices(answer, L === 1 ? 3 : 4, [1, -1, -d, 2], 1), show, wide: true };
      }
      // number sequence (bigger explorers)
      let d = pick([2, 3, 5, 10]), s = rand(1, 9);
      if (Math.random() < 0.4) { s = d * 5 + rand(1, 9); d = -d; }
      const seq = Z.range(5).map(k => s + k * d);
      const miss = rand(2, 4);
      const answer = seq[miss];
      return { seq, miss, answer, options: numberChoices(answer, 4, [1, -1, d, -d, 2]), show: v => h('span', { class: 'num' }, v) };
    }

    function next() {
      if (i >= N) return ctx.finishByMistakes(0, 2);
      ctx.setRound(i); ctx.clear();
      const r = makeRound(kinds[i]);
      const seqEl = h('div', { class: 'seq' + (r.wide ? ' wide' : '') }, r.seq.map((v, k) =>
        h('div', { class: 'tile' + (k === r.miss ? ' q' : ''), style: { animationDelay: k * 70 + 'ms' } },
          k === r.miss ? '?' : r.show(v))));
      ctx.stage.append(
        h('div', { class: 'panel' }, h('p', { class: 'prompt' }, r.miss === r.seq.length - 1 ? '下一个该是谁？' : '问号里藏着谁？'), seqEl),
        Z.options(ctx, r.options.map(v => ({ label: r.show(v), value: v })), {
          correct: r.answer, cls: r.wide ? 'wide' : '',
          now: () => { const t = seqEl.children[r.miss]; t.innerHTML = ''; t.append(r.show(r.answer)); t.classList.replace('q', 'filled'); },
          then: () => { i++; next(); },
        }));
    }
    next();
  },
});
