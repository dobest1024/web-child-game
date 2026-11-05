import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('所有拼桥选项在横竖屏完整显示，并能点击拼完', () => {
  for (const [width, height] of [[390, 788], [844, 334], [1024, 768]]) {
    const drawn = [];
    const ctx = new Proxy({ fillText(text, x, y) { drawn.push({ text, x, y }); } }, {
      get: (obj, key) => key in obj ? obj[key] : () => ({ addColorStop() {} }),
    });
    const S = { window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
      requestAnimationFrame(fn) { S.frame = fn; return 1; }, cancelAnimationFrame() {}, setTimeout() {}, clearTimeout() {},
      Sound: new Proxy({}, { get: () => () => 1 }),
    };
    vm.createContext(S);
    for (const f of ['poems', 'levels', 'game']) vm.runInContext(readFileSync(new URL(`../js/${f}.js`, import.meta.url), 'utf8'), S);
    const worlds = vm.runInContext('WORLDS', S);
    for (const world of worlds) for (const level of world.levels) for (const task of level.tasks.filter(t => t.type === 'bridge')) {
      const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width, height }) };
      const g = S.createGame(canvas, { ...level, tasks: [task] }, world, { onLearn() {}, onEnd() {} });
      drawn.length = 0;
      S.frame(33);
      const lines = g.task.poem.lines.map(l => l.replace(/[，。！？、；：]/g, ''));
      const cards = drawn.filter(d => lines.includes(d.text));
      assert.equal(cards.length, lines.length);
      for (const c of cards) {
        assert.ok(c.y - 29 >= 390 && c.y + 27 <= 540, `${width}×${height} ${task.poem} ${c.text}: y=${c.y}`);
        assert.ok(c.x >= 0 && c.x <= g.W);
      }
      for (const line of lines) {
        const card = cards.find(c => c.text === line);
        g.pointerDown(card.x, card.y);
        g.pointerUp();
      }
      assert.equal(g.task.placed, lines.length, '每个选项都能点击');
      g.stop();
    }
  }
});
