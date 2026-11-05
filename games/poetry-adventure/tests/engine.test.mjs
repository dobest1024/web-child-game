import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('六个年级的接字、拼桥与对诗关卡均可通关', () => {
  const ctx = new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
  const S = { window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame(fn) { S.frame = fn; return 1; }, cancelAnimationFrame() {}, setTimeout() {}, clearTimeout() {},
    Sound: new Proxy({}, { get: () => () => 1 }) };
  vm.createContext(S);
  for (const f of ['poems', 'levels', 'game']) vm.runInContext(readFileSync(new URL(`../js/${f}.js`, import.meta.url), 'utf8'), S);
  for (const world of vm.runInContext('WORLDS', S)) for (const level of world.levels) {
    let result;
    const g = S.createGame({ getContext: () => ctx, getBoundingClientRect: () => ({ width: 1024, height: 640 }) }, level, world, { onLearn() {}, onEnd(r) { result = r; } });
    for (let t = 30; !result && t < 600000; t += 30) {
      const task = g.task;
      if (task && !task.finished) {
        if (task.type === 'rain') {
          const drop = task.drops.find(d => d.state === 'fall' && d.right);
          if (drop) g.pointerX = drop.x;
        } else if (task.type === 'bridge' && !task.crossing) {
          const i = task.cards.findIndex(c => !c.placed && c.line === task.placed);
          if (i >= 0) g.key(`Digit${i + 1}`, true);
        } else if (task.q && !task.q.done && task.q.t > 1) {
          const answer = task.q.pair.down.replace(/[，。！？、；：]/g, '');
          const i = task.q.options.findIndex(o => o.text === answer);
          if (i >= 0) g.key(`Digit${i + 1}`, true);
        }
      }
      S.frame(t);
    }
    g.stop();
    assert.ok(result?.win, `${world.grade} 年级 ${level.n} ${level.name}: ${g.state}`);
  }
});
