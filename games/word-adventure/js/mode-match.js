'use strict';
// ===== 翻翻乐：单词卡和图片卡配对，翻开就读出来 =====
// 一轮 4 对（越输越简单时 3 对），配对成功一对得一颗星，攒满 8 颗过关。
// 只有"明明见过它的另一半却翻错"才算错，第一次翻错不算。

const CARD_W = 150, CARD_H = 172, CARD_GAP = 22;

MODES.match = (G, api) => {
  const L = G.L;
  const pairs = Math.max(3, L.pairs - (api.assist >= 1 ? 1 : 0));
  let cards = [], open = [], lock = 0, wait = 0.3, seen = new Set(), cursor = 0, keyboard = false, lastSaid = null;

  function deal() {
    const n = Math.min(pairs, G.goal - G.progress);
    const items = [];
    while (items.length < n) {
      const it = api.next();
      if (!items.includes(it)) items.push(it);
      else api.requeue(it, false);
    }
    const list = items.flatMap((item) => [{ item, kind: 'pic' }, { item, kind: 'word' }]).map((c) => [api.random(), c]).sort((a, b) => a[0] - b[0]).map((v) => v[1]);
    const cols = Math.min(list.length, n <= 3 ? 3 : 4), rows = Math.ceil(list.length / cols);
    const x0 = (960 - (cols * CARD_W + (cols - 1) * CARD_GAP)) / 2, y0 = 112 + (2 - rows) * 90;
    cards = list.map((c, i) => ({ ...c, key: `${c.kind}-${c.item.id}`, x: x0 + (i % cols) * (CARD_W + CARD_GAP), y: y0 + Math.floor(i / cols) * (CARD_H + CARD_GAP), face: false, matched: false, turn: 0 }));
    seen = new Set();
    open = [];
    cursor = 0;
  }

  function flip(card) {
    if (!card || card.face || card.matched || open.length >= 2 || lock > 0) return;
    card.face = true;
    Sound.flip();
    api.say(card.item);
    lastSaid = card.item;
    open.push(card);
    if (open.length < 2) return;
    const [a, b] = open;
    if (a.item === b.item) {
      a.matched = b.matched = true;
      open = [];
      api.correct(a.item, b.x + CARD_W / 2, b.y + CARD_H / 2);
      api.popup(a.item.show, (a.x + b.x) / 2 + CARD_W / 2, Math.min(a.y, b.y) + 20, '#2f6fd1', 38);
      if (cards.every((c) => c.matched)) wait = 1.2;
    } else {
      const partnerOfA = `${a.kind === 'pic' ? 'word' : 'pic'}-${a.item.id}`;
      if (seen.has(partnerOfA)) api.wrong(a.item);
      else G.combo = 0;
      lock = 1.1; // 让孩子看清楚、听清楚再翻回去
    }
    seen.add(a.key);
    seen.add(b.key);
  }

  function update(dt) {
    for (const c of cards) c.turn += ((c.face || c.matched ? 1 : 0) - c.turn) * Math.min(1, dt * 14);
    if (lock > 0) {
      lock -= dt;
      if (lock <= 0) { for (const c of open) c.face = false; open = []; }
    }
    if (!cards.length || cards.every((c) => c.matched)) {
      wait -= dt;
      if (wait <= 0 && G.progress < G.goal) deal();
    }
  }

  function draw(ctx) {
    drawBackground(ctx, G.world, 960, 540, G.calm ? 0 : G.time, 520);
    cards.forEach((c, i) => {
      const s = Math.abs(Math.cos(c.turn * Math.PI)); // 翻牌：横向压扁再展开
      const showFace = c.turn > 0.5;
      const cx = c.x + CARD_W / 2, cy = c.y + CARD_H / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(Math.max(0.04, s), 1);
      ctx.globalAlpha = c.matched ? 0.85 : 1;
      ctx.lineWidth = 5;
      if (!showFace) {
        ctx.fillStyle = '#ffb347';
        ctx.strokeStyle = '#d9822b';
        roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 20); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        for (let k = 0; k < 3; k++) circle(ctx, -36 + k * 36, -40 + (k % 2) * 30, 14);
        text(ctx, '?', 0, 18, 64, '#fff');
      } else {
        ctx.fillStyle = c.matched ? '#e9f9e4' : '#ffffff';
        ctx.strokeStyle = c.matched ? '#6cc26c' : '#7fb2e5';
        roundRect(ctx, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 20); ctx.fill(); ctx.stroke();
        if (c.kind === 'pic') drawPic(ctx, c.item.pic, 0, 0, 120);
        else {
          const size = c.item.show.length > 7 ? 26 : c.item.show.length > 5 ? 32 : 40;
          text(ctx, c.item.show, 0, -6, size, '#2f4f8f');
          text(ctx, '🔊', 0, 52, 22, '#2f4f8f', EMOJI_FONT, '');
        }
      }
      ctx.restore();
      if (keyboard && i === cursor) {
        ctx.strokeStyle = '#ff9f1c';
        ctx.lineWidth = 6;
        roundRect(ctx, c.x - 8, c.y - 8, CARD_W + 16, CARD_H + 16, 24); ctx.stroke();
      }
    });
  }

  function key(code) {
    if (!cards.length) return false;
    const cols = cards.length <= 6 ? 3 : 4;
    const moves = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, ArrowUp: -cols, KeyW: -cols, ArrowDown: cols, KeyS: cols };
    if (code in moves) {
      keyboard = true;
      cursor = (cursor + moves[code] + cards.length) % cards.length;
      return true;
    }
    if (code === 'Space' || code === 'Enter') { keyboard = true; flip(cards[cursor]); return true; }
    return false;
  }

  return {
    usesHearts: false,
    update, draw, key,
    tap(x, y) {
      keyboard = false;
      flip(cards.find((c) => x >= c.x && x <= c.x + CARD_W && y >= c.y && y <= c.y + CARD_H));
    },
    replay: () => lastSaid && api.say(lastSaid),
    bossPos: () => [880, 70],
    state: () => ({ cards, open, lock }),
  };
};
