import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = (name) => readFileSync(new URL(`../js/${name}.js`, import.meta.url), 'utf8');

test('fallback 语音在重播及离开时可以停止', () => {
  const clips = [];
  const sandbox = { Audio: class {
    constructor(url) { this.url = url; this.paused = false; clips.push(this); }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
  } };
  vm.createContext(sandbox);
  vm.runInContext(source('audio'), sandbox);
  const sound = vm.runInContext('Sound', sandbox);
  sound.say('words/cat');
  sound.say('words/dog');
  assert.equal(clips[0].paused, true);
  sound.stopVoice();
  assert.equal(clips[1].paused, true);
  assert.equal(sound.current, null);
});

function bubble() {
  const items = ['electricity', 'paper', 'plastic'].map(id => ({ id, audio: `words/${id}` }));
  const said = [];
  const G = { L: { options: 3, rise: 42, pool: items }, time: 0, asked: 0 };
  let next = 0;
  const S = { MODES: {}, Sound: { pop() {}, duration: () => 1.3 }, makeOptions: item => [item, ...items.filter(i => i !== item)] };
  vm.createContext(S);
  vm.runInContext(source('mode-bubble'), S);
  const mode = S.MODES.bubble(G, {
    assist: 0, random: () => 0.5,
    next: () => { G.asked++; return items[next++ % items.length]; },
    say: item => said.push(item.id), correct() {}, wrong() {}, popup() {},
  });
  const tick = seconds => {
    for (let i = 0; i < Math.round(seconds * 100); i++) { G.time += 0.01; mode.update(0.01); }
  };
  tick(0.81);
  return { mode, said, tick };
}

test('答对后的长单词念完才出下一题', () => {
  const { mode, said, tick } = bubble();
  mode.key('Digit1');
  tick(1.2);
  assert.deepEqual(said, ['electricity', 'electricity']);
  tick(0.3);
  assert.deepEqual(said, ['electricity', 'electricity', 'paper']);
});

test('错误选项念完才重读目标，暂停或停止帧循环不会触发跨局延时回调', () => {
  const { mode, said, tick } = bubble();
  mode.key('Digit2');
  tick(1.2);
  assert.deepEqual(said, ['electricity', 'paper']);
  tick(0.3);
  assert.deepEqual(said, ['electricity', 'paper', 'electricity']);
  // 模式未注入 setTimeout；所有待播均随引擎时间推进，暂停/stop 后不会再运行。
});

function snakeGame() {
  const said = [];
  const ctx = new Proxy({}, { get: (target, key) => target[key] || (() => ({ addColorStop() {} })) });
  const S = {
    window: { addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: callback => { S.frame = callback; return 1; },
    cancelAnimationFrame() {},
    Sound: new Proxy({ say: id => said.push(id), duration: () => 1 }, { get: (target, key) => target[key] || (() => {}) }),
  };
  vm.createContext(S);
  for (const name of ['words', 'levels', 'art', 'game', 'mode-snake']) vm.runInContext(source(name), S);
  const world = vm.runInContext('WORLDS[0]', S);
  const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 960, height: 540 }) };
  let seed = 7;
  const random = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  const G = S.createGame(canvas, world.levels[8], world, { random, onLearn() {}, onEnd() {} });
  let time = 0;
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds / .03); i++) { time += 30; S.frame(time); } };
  tick(.85);
  // 把每个正确字母依次放到下一步经过的格子，运行真实碰撞/吞食逻辑。
  const state = G.mode.state();
  for (let i = 0; i < state.q.item.show.length; i++) {
    const { body, q } = G.mode.state();
    const tile = q.tiles.find(t => t.index === i);
    tile.cell = [(body[0][0] + 1) % 15, body[0][1]];
    tick(.34);
  }
  return { G, said, tick, word: state.q.item.audio };
}

test('小蛇拼完字母后的读词遵守暂停，恢复后才播放，并等待完整词音', () => {
  const { G, said, tick, word } = snakeGame();
  const before = said.length;
  G.paused = true;
  tick(2);
  assert.equal(said.length, before);
  G.paused = false;
  tick(1.2);
  assert.equal(said.at(-1), word);
  const afterWord = said.length;
  tick(.6);
  assert.equal(said.length, afterWord, '新题不能截断完整词音');
});
