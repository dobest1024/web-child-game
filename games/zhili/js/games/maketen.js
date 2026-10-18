// 数学岛 · 凑数小能手：用所有数字卡凑出目标数（小：3 张凑 10；大：4 张凑 24）
Z.register({
  id: 'maketen', island: 'math', icon: '🧮', name: '凑数小能手', desc: '凑出 10 和 24',
  how: '点一张数字卡，再点一个符号，再点另一张卡，把它们合起来。所有卡都用上，凑出目标数！',
  play(ctx) {
    const { h, rand } = Z;
    const L = ctx.level;
    const N = L === 1 ? 4 : 3, TARGET = L === 1 ? 10 : 24, COUNT = L === 1 ? 3 : 4;
    const OPS = L === 1 ? ['+', '−'] : ['+', '−', '×', '÷'];
    let round = 0, uid = 0;
    ctx.rounds(N);

    function calc(a, op, b) {
      if (op === '+') return a + b;
      if (op === '−') return a - b >= 0 ? a - b : null;
      if (op === '×') return a * b;
      if (op === '÷') return b !== 0 && a % b === 0 ? a / b : null;
      return null;
    }
    // Integer-only solver, returns list of steps [a, op, b, result] or null
    function solve(nums) {
      if (nums.length === 1) return nums[0] === TARGET ? [] : null;
      for (let i = 0; i < nums.length; i++) for (let j = 0; j < nums.length; j++) {
        if (i === j) continue;
        const rest = nums.filter((_, k) => k !== i && k !== j);
        for (const op of OPS) {
          if ((op === '+' || op === '×') && i > j) continue;
          const r = calc(nums[i], op, nums[j]);
          if (r == null) continue;
          const s = solve([...rest, r]);
          if (s) return [[nums[i], op, nums[j], r], ...s];
        }
      }
      return null;
    }
    function makePuzzle() {
      for (;;) {
        const nums = Z.range(COUNT).map(() => rand(1, L === 1 ? 9 : 10));
        if (L === 1 && nums.reduce((a, b) => a + b) === TARGET && Math.random() < 0.5) continue; // mix in subtraction
        if (solve(nums)) return nums;
      }
    }

    function next() {
      if (round >= N) return ctx.finishByMistakes(0, 2);
      ctx.setRound(round); ctx.clear();
      const start = makePuzzle().map(v => ({ id: uid++, v }));
      let cards, sel, op, hist, log, done = false;

      const cardRow = h('div', { class: 'num-cards' });
      const opRow = h('div', { class: 'op-row' });
      const logEl = h('div', { class: 'calc-log' });

      function render() {
        cardRow.innerHTML = '';
        cards.forEach(c => cardRow.append(h('button', {
          class: 'num-card' + (sel === c ? ' sel' : '') + (c.made ? ' made' : ''), onclick: () => tapCard(c),
        }, h('span', {}, c.v))));
        opRow.innerHTML = '';
        OPS.forEach(o => opRow.append(h('button', {
          class: 'op-btn' + (op === o ? ' sel' : ''), disabled: !sel || done, onclick: () => { op = op === o ? null : o; Z.sfx.tap(); render(); },
        }, o)));
        logEl.innerHTML = '';
        log.forEach(t => logEl.append(h('div', {}, t)));
      }
      function reset() { cards = start.map(c => ({ ...c })); sel = null; op = null; hist = []; log = []; render(); }
      function tapCard(c) {
        if (done) return;
        Z.sfx.tap();
        if (!sel || sel === c || !op) { sel = sel === c ? null : c; op = null; render(); return; }
        const r = calc(sel.v, op, c.v);
        if (r == null) {
          ctx.say(op === '−' ? '小的数不够减大的数哦，换个顺序试试！' : '要刚好能除尽才行哦！');
          op = null; render(); return;
        }
        hist.push({ cards: cards.map(x => ({ ...x })), log: [...log] });
        log.push(`${sel.v} ${op} ${c.v} = ${r}`);
        const nc = { id: uid++, v: r, made: true };
        cards = cards.filter(x => x !== sel).map(x => (x === c ? nc : x));
        sel = null; op = null;
        render();
        if (cards.length === 1) {
          if (r === TARGET) {
            done = true; ctx.good(`凑出 ${TARGET} 啦！`);
            cardRow.classList.add('won');
            ctx.after(1500, () => { round++; next(); });
          } else {
            ctx.bad(`算出来是 ${r}，不是 ${TARGET} 哦，再来一次！`);
            ctx.after(1600, () => { if (!done) reset(); });
          }
        }
      }
      function undo() {
        if (done || !hist.length) return;
        const s = hist.pop(); cards = s.cards; log = s.log; sel = null; op = null; Z.sfx.tap(); render();
      }
      function hint() {
        if (done) return;
        const steps = solve(cards.map(c => c.v));
        if (!steps) { ctx.say('这条路走不通啦，点"退一步"或者"重来"试试。'); return; }
        ctx.miss();
        const [a, o, b] = steps[0];
        ctx.say(`试试 ${a} ${o === '−' ? '减' : o === '÷' ? '除以' : o === '×' ? '乘' : '加'} ${b}`);
      }

      ctx.stage.append(h('div', { class: 'panel make' },
        h('div', { class: 'target' }, h('span', {}, '目标'), h('b', {}, TARGET), h('span', { class: 'tgt-icon' }, '🎯')),
        cardRow, opRow, logEl,
        h('div', { class: 'tool-row' },
          h('button', { class: 'btn small', onclick: undo }, '↩️ 退一步'),
          h('button', { class: 'btn small', onclick: () => { Z.sfx.tap(); reset(); } }, '🔄 重来'),
          h('button', { class: 'btn small', onclick: hint }, '💡 提示'))));
      reset();
      if (round > 0) ctx.say(`新的数字卡！凑出 ${TARGET}！`);
    }
    next();
  },
});
