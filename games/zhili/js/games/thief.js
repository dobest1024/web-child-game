// 逻辑岛 · 谁偷吃了蛋糕：根据线索排除嫌疑人
Z.register({
  id: 'thief', island: 'logic', icon: '🕵️', name: '谁偷吃了蛋糕', desc: '看线索，抓小偷',
  how: '蛋糕被偷吃了！听听线索，找出是谁干的。点一下嫌疑人就是指认，点右上角的叉可以先排除他。',
  play(ctx) {
    const { h, pick, shuffle } = Z;
    const L = ctx.level, N = 3;
    const ANIMALS = [['🐶', '小狗'], ['🐱', '小猫'], ['🐰', '小兔'], ['🦊', '狐狸'], ['🐼', '熊猫'], ['🐨', '考拉'], ['🐯', '老虎'], ['🐸', '青蛙'], ['🐷', '小猪'], ['🐵', '猴子']];
    const HATS = [{ v: 'hat', e: '🎩', name: '礼帽' }, { v: 'bow', e: '🎀', name: '蝴蝶结' }, { v: 'none' }];
    const HOLD = [{ v: 'balloon', e: '🎈', name: '气球' }, { v: 'lolly', e: '🍭', name: '棒棒糖' }, { v: 'umb', e: '🌂', name: '雨伞' }];
    const COLORS = [{ v: 'red', name: '红色', css: '#FF6B6B' }, { v: 'blue', name: '蓝色', css: '#4D96FF' }, { v: 'yellow', name: '黄色', css: '#FFC93C' }, { v: 'green', name: '绿色', css: '#4CC26E' }];
    let round = 0;
    ctx.rounds(N);

    function cluesFor(t) {
      const list = [];
      HATS.filter(x => x.v !== 'none').forEach(x => list.push(t.hat === x.v
        ? { f: s => s.hat === x.v, text: `小偷戴着${x.name}`, icon: x.e, yes: true }
        : { f: s => s.hat !== x.v, text: `小偷没有戴${x.name}`, icon: x.e, yes: false }));
      list.push(t.glasses
        ? { f: s => s.glasses, text: '小偷戴着眼镜', icon: '👓', yes: true }
        : { f: s => !s.glasses, text: '小偷没有戴眼镜', icon: '👓', yes: false });
      HOLD.forEach(x => list.push(t.hold === x.v
        ? { f: s => s.hold === x.v, text: `小偷手里拿着${x.name}`, icon: x.e, yes: true }
        : { f: s => s.hold !== x.v, text: `小偷没有拿${x.name}`, icon: x.e, yes: false }));
      COLORS.forEach(x => list.push(t.color === x.v
        ? { f: s => s.color === x.v, text: `小偷穿着${x.name}衣服`, swatch: x.css, yes: true }
        : { f: s => s.color !== x.v, text: `小偷没穿${x.name}衣服`, swatch: x.css, yes: false }));
      return list;
    }

    function makeCase() {
      const n = L === 1 ? 3 : 4;
      let fallback = null;
      for (let tries = 0; tries < 300; tries++) {
        const sus = shuffle(ANIMALS).slice(0, n).map(([e, name]) => ({
          e, name, hat: pick(HATS).v, glasses: Math.random() < 0.5, hold: pick(HOLD).v,
          color: pick(COLORS.slice(0, L === 1 ? 3 : 4)).v,
        }));
        const sig = s => [s.hat, s.glasses, s.hold, s.color].join();
        if (new Set(sus.map(sig)).size < n) continue;
        const thief = pick(sus);
        let remain = sus.filter(s => s !== thief);
        const cand = cluesFor(thief), chosen = [];
        while (remain.length) {
          const scored = cand.filter(c => !chosen.includes(c))
            .map(c => ({ c, k: remain.filter(s => !c.f(s)).length })).filter(x => x.k > 0);
          if (!scored.length) break;
          let c;
          if (L === 1) { const ys = scored.filter(x => x.c.yes); c = pick(ys.length ? ys : scored).c; }
          else { const min = Math.min(...scored.map(x => x.k)); c = pick(scored.filter(x => x.k === min)).c; }
          chosen.push(c); remain = remain.filter(s => c.f(s));
        }
        if (remain.length) continue;
        const res = { sus: shuffle(sus), thief, clues: shuffle(chosen) };
        fallback = res;
        if (L === 1 && chosen.length >= 2 && chosen.length <= 3) return res;
        if (L === 2 && chosen.length >= 3 && chosen.length <= 4) return res;
      }
      return fallback;
    }

    function figure(s) {
      const col = COLORS.find(c => c.v === s.color).css;
      const hat = HATS.find(x => x.v === s.hat);
      return h('div', { class: 'fig' },
        h('div', { class: 'fig-body', style: { background: col } }),
        h('div', { class: 'fig-face' }, s.e),
        hat.e ? h('div', { class: 'fig-hat ' + hat.v }, hat.e) : null,
        s.glasses ? h('div', { class: 'fig-glasses' }, '👓') : null,
        h('div', { class: 'fig-hold' }, HOLD.find(x => x.v === s.hold).e));
    }

    function next() {
      if (round >= N) return ctx.finishByMistakes(0, 2);
      ctx.setRound(round); ctx.clear();
      const cs = makeCase();
      let solved = false;
      const clueEls = cs.clues.map(c => h('button', { class: 'clue', onclick: () => Z.speak(c.text) },
        h('span', { class: 'clue-icon' }, c.swatch ? h('i', { class: 'swatch', style: { background: c.swatch } }) : c.icon,
          h('em', { class: c.yes ? 'yes' : 'no' }, c.yes ? '✔' : '✘')),
        h('span', {}, c.text)));
      const cards = cs.sus.map(s => {
        const card = h('div', { class: 'suspect' });
        const cross = h('button', {
          class: 'cross', 'aria-label': '排除', onclick: e => { e.stopPropagation(); Z.sfx.tap(); card.classList.toggle('crossed'); },
        }, '✖');
        const body = h('button', {
          class: 'suspect-btn', onclick: () => {
            if (solved || card.classList.contains('cleared')) return;
            if (s === cs.thief) {
              solved = true; card.classList.add('caught');
              ctx.good(`找到啦！原来是${s.name}偷吃了蛋糕！`);
              ctx.after(2200, () => { round++; next(); });
            } else {
              const why = cs.clues.find(c => !c.f(s));
              card.classList.add('cleared', 'crossed');
              ctx.bad(`不是${s.name}哦，因为${why.text}。`);
            }
          },
        }, figure(s), h('b', {}, s.name));
        card.append(body, cross);
        return card;
      });
      ctx.stage.append(
        h('div', { class: 'panel case' },
          h('div', { class: 'case-head' }, h('span', { class: 'cake' }, '🎂'), h('div', {}, h('b', {}, `案件 ${round + 1}：蛋糕被偷吃了！`), h('small', {}, '点线索可以听一遍'))),
          h('div', { class: 'clues' }, clueEls)),
        h('div', { class: 'suspects' }, cards));
      ctx.say('线索：' + cs.clues.map(c => c.text).join('，') + '。是谁呢？');
    }
    next();
  },
});
