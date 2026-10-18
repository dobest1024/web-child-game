// 数学岛 · 小小超市：算总价、算找零、亲手付钱
Z.register({
  id: 'shop', island: 'math', icon: '🛒', name: '小小超市', desc: '买东西，算算钱',
  how: '欢迎光临小小超市！帮小动物们算一算要付多少钱、要找回多少钱。',
  play(ctx) {
    const { h, rand, pick, shuffle, numberChoices } = Z;
    const L = ctx.level, N = 5;
    const ITEMS = [['🍎', '苹果'], ['🍭', '棒棒糖'], ['🧃', '果汁'], ['🍞', '面包'], ['🥛', '牛奶'], ['🍦', '冰淇淋'], ['🧸', '小熊'], ['✏️', '铅笔'], ['🎈', '气球'], ['🍪', '饼干'], ['🚗', '玩具车'], ['📒', '本子'], ['🪀', '悠悠球'], ['🍩', '甜甜圈']];
    const BUYERS = ['🐰', '🐻', '🐱', '🐶', '🐼', '🦊', '🐨', '🐯'];
    const DENOMS = L === 1 ? [1, 5, 10] : [1, 5, 10, 20, 50];
    const types = shuffle(['total', 'change', 'pay', 'total', 'pay']);
    let round = 0;
    ctx.rounds(N);

    const money = v => h('span', { class: 'money ' + (v < 5 ? 'coin' : 'note') + ' m' + v }, h('b', {}, v), h('small', {}, '元'));
    const goods = list => h('div', { class: 'shelf' }, list.map(([e, n, p]) =>
      h('div', { class: 'good' }, h('span', { class: 'good-e' }, e), h('span', { class: 'tag' }, p + '元'), h('small', {}, n))));

    function priced(k, lo, hi, maxSum) {
      for (;;) {
        const list = shuffle(ITEMS).slice(0, k).map(([e, n]) => [e, n, rand(lo, hi)]);
        const sum = list.reduce((s, x) => s + x[2], 0);
        if (sum <= maxSum) return { list, sum };
      }
    }

    function next() {
      if (round >= N) return ctx.finishByMistakes(0, 2);
      ctx.setRound(round); ctx.clear();
      const who = pick(BUYERS), type = types[round];
      const goOn = () => { round++; next(); };

      if (type === 'total') {
        const { list, sum } = L === 1 ? priced(2, 1, 9, 15) : priced(rand(2, 3), 3, 35, 80);
        const q = `${list.map(x => x[1]).join('和')}，一共要付多少钱？`;
        ctx.stage.append(
          h('div', { class: 'panel shop' }, h('div', { class: 'buyer' }, h('span', { class: 'buyer-e' }, who), h('div', { class: 'bubble' }, '我要买这些！')), goods(list),
            h('p', { class: 'prompt' }, '一共多少钱？')),
          Z.options(ctx, numberChoices(sum, 4, [1, -1, 2, -2, 10, -10], 1).map(v => ({ label: h('span', { class: 'num' }, v + '元'), value: v })), { correct: sum, then: goOn }));
        ctx.say(q);
      } else if (type === 'change') {
        const { list, sum } = L === 1 ? priced(1, 1, 9, 9) : priced(2, 4, 45, 95);
        const paid = L === 1 ? 10 : (sum <= 45 ? 50 : 100);
        const ch = paid - sum;
        ctx.stage.append(
          h('div', { class: 'panel shop' }, h('div', { class: 'buyer' }, h('span', { class: 'buyer-e' }, who), h('div', { class: 'bubble' }, '给你钱！', money(paid))), goods(list),
            h('p', { class: 'prompt' }, `付了 ${paid} 元，要找回多少钱？`)),
          Z.options(ctx, numberChoices(ch, 4, [1, -1, 2, -2, 10, -10], 1).map(v => ({ label: h('span', { class: 'num' }, v + '元'), value: v })), { correct: ch, then: goOn }));
        ctx.say(`付了${paid}元，要找回多少钱？`);
      } else {
        const target = L === 1 ? rand(6, 20) : rand(12, 88);
        const item = pick(ITEMS);
        let tray = [], done = false;
        const trayEl = h('div', { class: 'tray' });
        const sumEl = h('b', {}, '0');
        const draw = () => {
          trayEl.innerHTML = '';
          if (!tray.length) trayEl.append(h('span', { class: 'muted' }, '点下面的钱放进来'));
          tray.forEach((v, k) => trayEl.append(h('button', { class: 'tray-money', 'aria-label': '拿回', onclick: () => { if (done) return; tray.splice(k, 1); Z.sfx.tap(); draw(); } }, money(v))));
          sumEl.textContent = tray.reduce((a, b) => a + b, 0);
        };
        const pay = () => {
          if (done) return;
          const s = tray.reduce((a, b) => a + b, 0);
          if (s === target) { done = true; ctx.good(`刚刚好 ${target} 元！`); ctx.after(1400, goOn); }
          else if (s > target) ctx.bad(`给了 ${s} 元，多了 ${s - target} 元哦，点盘子里的钱可以拿回来。`);
          else ctx.bad(`才 ${s} 元，还差 ${target - s} 元哦！`);
        };
        ctx.stage.append(h('div', { class: 'panel shop' },
          h('div', { class: 'buyer' }, h('span', { class: 'buyer-e' }, who), h('div', { class: 'bubble' }, `我要买${item[1]}${item[0]}，帮我付钱吧！`)),
          h('div', { class: 'price-big' }, item[0], h('span', { class: 'tag big' }, target + '元')),
          h('div', { class: 'tray-wrap' }, h('div', { class: 'tray-label' }, '盘子里：', sumEl, ' 元'), trayEl),
          h('div', { class: 'wallet' }, DENOMS.map(v => h('button', { class: 'wallet-btn', onclick: () => { if (done) return; tray.push(v); tray.sort((a, b) => b - a); Z.sfx.pop(); draw(); } }, money(v)))),
          h('button', { class: 'btn primary', onclick: pay }, '💰 付钱')));
        draw();
        ctx.say(`要付${target}元，把钱放进盘子里，再点付钱。`);
      }
    }
    next();
  },
});
