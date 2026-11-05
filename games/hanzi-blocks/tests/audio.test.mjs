import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('字音、组词按实际时长播放；重播或离开会取消待播音频', () => {
  let now = 0, next = 0;
  const timers = new Map(), played = [], stopped = [];
  const sandbox = {
    setTimeout(fn, ms) { timers.set(++next, { fn, at: now + ms }); return next; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../js/audio.js', import.meta.url), 'utf8'), sandbox);
  const sound = vm.runInContext('Sound', sandbox);
  sound.ctx = {
    destination: {},
    createBufferSource() {
      return { connect(target) { return target; }, start() { played.push({ id: this.buffer.id, at: now }); }, stop() { stopped.push(now); } };
    },
    createGain() { return { gain: {}, connect() {} }; },
  };
  sound.buffers = { 'zi-6674': { id: '晴', duration: 1.15 }, 'ci-test': { id: '晴天', duration: 2.1 } };
  function advance(to) {
    for (;;) {
      const entry = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry || entry[1].at > to) break;
      now = entry[1].at; timers.delete(entry[0]); entry[1].fn();
    }
    now = to;
  }
  const duration = sound.sequence(['zi-6674', 'ci-test'], 0.12);
  advance(1270);
  assert.deepEqual(played, [{ id: '晴', at: 120 }]);
  assert.equal(stopped.length, 0, '字音未播完时不能被停止');
  advance(1500);
  assert.equal(played[1].id, '晴天');
  assert.ok(played[1].at >= 1270);
  assert.ok(duration * 1000 >= played[1].at + 2100, '下一题必须等组词结束');
  sound.sequence(['zi-6674', 'ci-test'], 0.12);
  sound.stopVoice();
  advance(10000);
  assert.equal(played.length, 2, '退出后不再播放');
  sound.sequence(['zi-6674', 'ci-test'], 0.12);
  sound.say('zi-6674');
  advance(20000);
  assert.equal(played.length, 3, '手动重播取消旧序列');
  assert.ok(sound.duration('zi-missing') > 0, '音频缺失仍有有限等待时间');
});
