import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const poetry = false;
function engine() {
  const timers = new Map(), voices = [];
  let nextId = 0;
  const ctx = new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
  const S = {
    window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame(fn) { S.frame = fn; return 1; }, cancelAnimationFrame() {},
    setTimeout(fn) { const id = ++nextId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    Sound: new Proxy({ say(id) { voices.push(id); } }, { get: (o, k) => o[k] || (() => 1) }),
  };
  vm.createContext(S);
  for (const f of [poetry ? 'poems' : 'pinyin', 'levels', 'game']) {
    vm.runInContext(readFileSync(new URL(`../js/${f}.js`, import.meta.url), 'utf8'), S);
  }
  const w = vm.runInContext('WORLDS[0]', S);
  const g = S.createGame({ getContext: () => ctx, getBoundingClientRect: () => ({ width: 1024, height: 640 }) },
    w.levels[poetry ? 2 : 0], w, { onLearn() {}, onEnd() {} });
  // 拼音真实跳跃顶中教学砖；古诗拼桥开局本身就登记朗读。
  for (let t = 30; !timers.size && t < 15000; t += 30) {
    const gate = g.ents?.find(e => e.type === 'gate' && !e.done);
    const b = gate?.blocks.find(b => b.item === gate.item);
    if (b && g.player.onGround && b.x + 39 - g.dist > 15 && b.x + 39 - g.dist < 40) {
      g.press(); g.release();
    }
    S.frame(t);
  }
  assert.ok(timers.size, '实际游戏操作应产生待播语音');
  voices.length = 0;
  return { g, timers, voices };
}

test('离开关卡清除待播语音，暂停期间回调不会重新发声', () => {
  const stopped = engine();
  stopped.g.stop();
  assert.equal(stopped.timers.size, 0);
  const paused = engine();
  paused.g.paused = true;
  for (const fn of [...paused.timers.values()]) fn();
  assert.deepEqual(paused.voices, []);
  paused.g.stop();
  const resumed = engine();
  resumed.g.paused = true;
  resumed.g.stopVoice();
  resumed.g.paused = false;
  assert.equal(resumed.timers.size, 0, '暂停后快速继续也不能复活旧语音');
  resumed.g.stop();
});

test('HTML Audio 兜底也能停止：重播取消上一段，退出取消当前段', () => {
  const clips = [];
  class Audio {
    constructor(src) { this.src = src; this.paused = false; clips.push(this); }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const S = vm.createContext({ Audio });
  vm.runInContext(readFileSync(new URL('../js/audio.js', import.meta.url), 'utf8'), S);
  const sound = vm.runInContext('Sound', S);
  if (poetry) sound.available = new Set(['first', 'second']);
  sound.say('first');
  sound.say('second');
  assert.equal(clips[0].paused, true);
  sound.stopVoice();
  assert.equal(clips[1].paused, true);
  assert.equal(sound.current, null);
});
