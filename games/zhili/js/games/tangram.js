// 空间岛 · 七巧板：把七块板拖进剪影里（大探险家要先转对方向）
Z.register({
  id: 'tangram', island: 'space', icon: '🔺', name: '七巧板', desc: '拼出小房子、小鱼…',
  how: '把下面的七块板拖到上面的影子里，拼出完整的图案！',
  play(ctx) {
    const { h, shuffle, rand } = Z;
    const L = ctx.level;
    const NS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const R2 = Math.SQRT1_2;
    // Each figure lists the 7 target polygons. Unit: small-triangle leg = 1.
    const FIGURES = [
      { name: '小房子', e: '🏠', pieces: [
        ['LT', [[0, 2], [2, 0], [2, 2]]], ['LT', [[2, 0], [4, 2], [2, 2]]], ['MT', [[1, 2], [3, 2], [2, 3]]],
        ['SQ', [[1, 3], [2, 3], [2, 4], [1, 4]]], ['ST', [[1, 2], [2, 3], [1, 3]]],
        ['PA', [[2, 4], [2, 3], [3, 2], [3, 3]]], ['ST', [[2, 4], [3, 3], [3, 4]]]] },
      { name: '小鱼', e: '🐟', pieces: [
        ['LT', [[2, 0], [2, 2], [0, 2]]], ['LT', [[0, 2], [2, 2], [2, 4]]], ['PA', [[2, 0], [3, 1], [3, 2], [2, 1]]],
        ['ST', [[2, 1], [3, 2], [2, 2]]], ['SQ', [[2, 2], [3, 2], [3, 3], [2, 3]]], ['ST', [[2, 3], [3, 3], [2, 4]]],
        ['MT', [[3, 2], [4, 1], [4, 3]]]] },
      { name: '小盆栽', e: '🪴', pieces: [
        ['MT', [[1, 1], [3, 1], [2, 0]]], ['LT', [[0, 3], [2, 1], [2, 3]]], ['LT', [[2, 1], [4, 3], [2, 3]]],
        ['SQ', [[1.5, 3], [2.5, 3], [2.5, 4], [1.5, 4]]], ['PA', [[1, 4], [2, 4], [3, 5], [2, 5]]],
        ['ST', [[1, 4], [2, 5], [1, 5]]], ['ST', [[2, 4], [3, 4], [3, 5]]]] },
      { name: '小帆船', e: '⛵', pieces: [
        ['LT', [[1.5, 0], [1.5, 2], [-0.5, 2]]], ['LT', [[1.5, 0], [3.5, 2], [1.5, 2]]], ['MT', [[1.5, -2], [1.5, 0], [2.5, -1]]],
        ['ST', [[0, 2], [1, 2], [1, 3]]], ['SQ', [[1, 2], [2, 2], [2, 3], [1, 3]]], ['ST', [[2, 2], [3, 2], [2, 3]]],
        ['PA', [[0.5, 3], [1.5, 3], [2.5, 4], [1.5, 4]]]] },
      { name: '大正方形', e: '🟪', pieces: [ // classic square, scaled from side-4 coordinates
        ['LT', [[0, 0], [4, 0], [2, 2]]], ['LT', [[0, 0], [2, 2], [0, 4]]], ['MT', [[4, 2], [4, 4], [2, 4]]],
        ['ST', [[4, 0], [4, 2], [3, 1]]], ['SQ', [[2, 2], [3, 1], [4, 2], [3, 3]]], ['ST', [[2, 2], [3, 3], [1, 3]]],
        ['PA', [[0, 4], [1, 3], [3, 3], [2, 4]]]].map(([t, pts]) => [t, pts.map(([x, y]) => [x * R2, y * R2])]) },
    ];
    const COLORS = { LT: ['#FF6B6B', '#4D96FF'], MT: ['#FFC93C'], ST: ['#4CC26E', '#F2507B'], SQ: ['#7B5CFA'], PA: ['#FF9F43'] };
    const figs = shuffle(FIGURES).slice(0, 2);
    let round = 0;
    ctx.rounds(figs.length);

    const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
    const rot = (pts, deg) => {
      const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
    };
    const sameSet = (A, B) => A.length === B.length && A.every(([x, y]) => B.some(([u, v]) => Math.abs(x - u) < 0.06 && Math.abs(y - v) < 0.06));
    const ptsAttr = pts => pts.map(p => p.map(n => n.toFixed(3)).join(',')).join(' ');

    function next() {
      if (round >= figs.length) return ctx.finishByMistakes(1, 3);
      ctx.setRound(round); ctx.clear();
      const fig = figs[round];
      const W = 10, H = 16, TOP = 7.2;
      // fit figure into the top area
      const all = fig.pieces.flatMap(p => p[1]);
      const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]));
      const minY = Math.min(...all.map(p => p[1])), maxY = Math.max(...all.map(p => p[1]));
      const S = Math.min(1.5, 9 / (maxX - minX), (TOP - 0.6) / (maxY - minY));
      const ox = (W - (maxX - minX) * S) / 2 - minX * S, oy = (TOP - (maxY - minY) * S) / 2 - minY * S;
      const slots = fig.pieces.map(([type, pts]) => {
        const abs = pts.map(([x, y]) => [x * S + ox, y * S + oy]);
        const c = centroid(abs);
        return { type, abs, c, rel: abs.map(([x, y]) => [x - c[0], y - c[1]]), filled: false };
      });

      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tangram' });
      svg.append(svgEl('rect', { x: 0.15, y: 0.15, width: W - 0.3, height: TOP - 0.1, rx: 0.4, class: 'tg-board' }));
      svg.append(svgEl('rect', { x: 0.15, y: TOP + 0.3, width: W - 0.3, height: H - TOP - 0.45, rx: 0.4, class: 'tg-tray' }));
      slots.forEach(s => { s.el = svgEl('polygon', { points: ptsAttr(s.abs), class: 'tg-slot' }); svg.append(s.el); });

      // tray layout: big pieces top row, small pieces bottom row
      const order = [...slots.keys()].sort((a, b) => ({ LT: 0, MT: 1, PA: 2, SQ: 3, ST: 4 }[slots[a].type] - { LT: 0, MT: 1, PA: 2, SQ: 3, ST: 4 }[slots[b].type]));
      const homes = [[1.8, 9.7], [5, 9.7], [8.2, 9.7], [1.4, 13.8], [3.8, 13.8], [6.2, 13.8], [8.6, 13.8]];
      const used = {};
      const pieces = order.map((si, k) => {
        const s = slots[si];
        const colorList = COLORS[s.type];
        const color = colorList[(used[s.type] = (used[s.type] || 0) + 1) - 1] || colorList[0];
        const p = { type: s.type, base: s.rel, angle: L === 2 ? 45 * rand(1, 7) : 0, x: homes[k][0], y: homes[k][1], placed: false };
        p.g = svgEl('g', { class: 'tg-piece' });
        p.poly = svgEl('polygon', { fill: color });
        p.g.append(p.poly);
        svg.append(p.g);
        return p;
      });
      const draw = p => {
        p.poly.setAttribute('points', ptsAttr(rot(p.base, p.angle)));
        p.g.setAttribute('transform', `translate(${p.x.toFixed(3)} ${p.y.toFixed(3)})`);
      };
      pieces.forEach(draw);

      const toSvg = e => {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
        const r = pt.matrixTransform(m.inverse()); return { x: r.x, y: r.y };
      };
      let drag = null, done = false;
      pieces.forEach(p => {
        p.g.addEventListener('pointerdown', e => {
          if (p.placed || done) return;
          e.preventDefault();
          const q = toSvg(e);
          drag = { p, dx: p.x - q.x, dy: p.y - q.y, sx: q.x, sy: q.y, moved: false };
          svg.append(p.g); p.g.classList.add('lift');
          svg.setPointerCapture(e.pointerId);
        });
      });
      svg.addEventListener('pointermove', e => {
        if (!drag) return;
        const q = toSvg(e);
        if (Math.hypot(q.x - drag.sx, q.y - drag.sy) > 0.18) drag.moved = true;
        drag.p.x = Math.max(0.3, Math.min(W - 0.3, q.x + drag.dx));
        drag.p.y = Math.max(0.3, Math.min(H - 0.3, q.y + drag.dy));
        draw(drag.p);
      });
      const end = () => {
        if (!drag) return;
        const { p, moved } = drag; drag = null;
        p.g.classList.remove('lift');
        if (!moved) { if (L === 2) { p.angle = (p.angle + 45) % 360; Z.sfx.tap(); draw(p); } return; }
        const cur = rot(p.base, p.angle);
        const near = slots.filter(s => !s.filled && s.type === p.type && Math.hypot(s.c[0] - p.x, s.c[1] - p.y) < 0.75);
        const fit = near.find(s => sameSet(cur, s.rel));
        if (fit) {
          fit.filled = true; p.placed = true; p.x = fit.c[0]; p.y = fit.c[1];
          draw(p); p.g.classList.add('placed'); fit.el.classList.add('filled'); Z.sfx.pop();
          if (slots.every(s => s.filled)) {
            done = true; svg.classList.add('won');
            ctx.good(`拼好啦！是一个${fig.name}！`);
            ctx.after(1800, () => { round++; next(); });
          }
        } else if (near.length) {
          ctx.miss();
          ctx.say(L === 2 ? '位置差不多了，点一下它转个方向试试！' : '好像不是这里，换个位置试试～');
          Z.sfx.bad();
        }
      };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);

      ctx.stage.append(h('div', { class: 'panel tg-wrap' },
        h('div', { class: 'stat-row' }, h('span', {}, `${fig.e} 拼一个：${fig.name}`), h('span', { class: 'muted' }, L === 2 ? '点一下能转动' : '拖到影子里')),
        svg));
      ctx.say(round === 0 ? (L === 2 ? '把七块板拖进影子里。点一下板子可以转方向！' : ctx.game.how) : `这次拼一个${fig.name}！`);
    }
    next();
  },
});
