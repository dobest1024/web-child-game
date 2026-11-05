import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function load(name) {
  class Element {
    constructor(id = '') {
      this.id = id; this.children = []; this.listeners = {}; this.hidden = true; this.dataset = {};
      const classes = new Set();
      this.classList = { contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c),
        toggle(c, on) { if (on) classes.add(c); else classes.delete(c); } };
    }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    fire(name = 'click') { return this.listeners[name]?.({ currentTarget: this, preventDefault() {} }); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    set innerHTML(v) { this.children = []; }
    get innerHTML() { return ''; }
    querySelector() { return new Element(); }
    querySelectorAll() { return this.children; }
    setAttribute() {} focus() {} blur() {}
    getContext() { return { clearRect() {} }; }
  }
  const nodes = new Map();
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element(selector.slice(1))); return nodes.get(selector); };
  const screens = ['title','map','play','book'].map(id => get('#'+id));
  const back = new Element(); back.dataset.go = 'title';
  const pending = [], spoken = [], timers = new Map(); let creates = 0, timerId = 0;
  const S = { window: { matchMedia: () => ({ matches: false }) },
    document: { querySelector: get, querySelectorAll: s => s === '.screen' ? screens : s === '[data-go]' ? [back] : [], createElement: () => new Element(), addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); },
    Sound: { unlock() {}, stopVoice() {}, say(id) { spoken.push(id); }, sequence(ids) { spoken.push(...ids); }, length() { return 1; },
      load() { return new Promise(resolve => pending.push(resolve)); } },
    createGame() { creates++; return { stop() {}, state: 'play' }; },
  };
  vm.createContext(S);
  const files = name === 'hanzi-blocks' ? ['chars','audio-list','save','main'] :
    [name === 'word-adventure' ? 'words' : name === 'poetry-adventure' ? 'poems' : 'pinyin','levels','save','main'];
  for (const file of files) vm.runInContext(readFileSync(new URL(`../games/${name}/js/${file}.js`, import.meta.url),'utf8'), S);
  return { S, get, back, pending, spoken, timers, creates: () => creates, run: code => vm.runInContext(code, S) };
}

for (const name of ['pinyin-adventure','poetry-adventure','word-adventure','hanzi-blocks']) {
  test(`${name}: 旧关卡加载不能挡住新关卡或跨局启动，连点只开一局`, async () => {
    const h = load(name);
    h.run('openLevel(WORLDS[0], WORLDS[0].levels[0])');
    const old = h.get('#go').fire();
    h.back.fire();
    h.run('openLevel(WORLDS[0], WORLDS[0].levels[1])');
    const next = h.get('#go').fire();
    h.get('#go').fire();
    assert.equal(h.pending.length, 2, '新关卡应该立即开始预载，重复点击不重复预载');
    h.pending[0](); await old;
    assert.equal(h.creates(), 0, '旧回调不能启动新页面');
    h.pending[1](); await next;
    assert.equal(h.creates(), 1);
  });
  if (name !== 'poetry-adventure') test(`${name}: 图鉴乱序加载只播放最后一次选择，退出后不播放`, async () => {
    const h = load(name);
    if (name === 'hanzi-blocks') h.run('for (const c of Object.keys(CHARS)) save.learned[c] = true');
    h.get('#open-book').fire();
    const buttons = name === 'word-adventure' ? h.get('#cards').children.flatMap(c => c.children) : h.get('#cards').children;
    const first = buttons[0].fire(), second = buttons[1].fire();
    h.pending[1](); await second;
    const spoken = [...h.spoken];
    assert.ok(spoken.length);
    h.pending[0](); await first;
    assert.deepEqual(h.spoken, spoken);
    const late = buttons[0].fire();
    h.back.fire(); h.pending[2](); await late;
    assert.deepEqual(h.spoken, spoken);
  });
}

test('古诗：关闭诗卡会取消尚未加载完的整首朗读', async () => {
  const h = load('poetry-adventure');
  h.run('openPoem(POEMS[0])');
  const read = h.get('#pv-read').onclick();
  h.get('#pv-close').fire();
  h.pending[0](); await read;
  assert.equal(h.timers.size, 0);
  assert.equal(h.spoken.length, 0);
});
