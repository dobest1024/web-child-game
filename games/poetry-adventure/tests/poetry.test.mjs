import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../js/poems.js');
const { WORLDS, rainDistractors, bossOptions } = require('../js/levels.js');
const { fillSave, isUnlocked } = require('../js/save.js');

test('13 首诗：id 不重复，每句以标点结尾，字数整齐', () => {
  assert.equal(P.POEMS.filter(p => p.grade === 1).length, 13);
  assert.equal(new Set(P.POEMS.map((p) => p.id)).size, P.POEMS.length);
  for (const p of P.POEMS.filter(p => p.grade === 1)) {
    assert.ok(p.title && p.author && p.dynasty && p.icon, p.id);
    for (const l of p.lines) assert.match(l, /[，。]$/, `${p.title}: ${l}`);
    const lens = p.lines.map((l) => P.bare(l).length);
    if (p.id === 'yonge') assert.deepEqual(lens, [3, 5, 5, 5]);
    else if (p.id === 'jiangnan') assert.deepEqual(lens, [5, 5, 5, 5, 5, 5, 5]);
    else {
      assert.equal(p.lines.length, 4, p.title);
      assert.ok(lens.every((n) => n === lens[0]) && [5, 7].includes(lens[0]), `${p.title} 字数 ${lens}`);
    }
  }
});

test('几处容易写错的字', () => {
  const text = (id) => P.poemById(id).lines.join('');
  assert.ok(text('xiaochi').includes('树阴照水'));
  assert.ok(text('jingyesi').startsWith('床前明月光'));
  assert.ok(text('jingyesi').includes('举头望明月'));
  assert.ok(text('feng').endsWith('入竹万竿斜。'));
  assert.ok(text('huaji').includes('满身雪白走将来'));
});

test('接字雨干扰字：不等于要接的字、不重复、数量够', () => {
  for (const p of P.POEMS) {
    for (const c of new Set(p.lines.map(P.bare).join(''))) {
      const d = rainDistractors(p, c, 3);
      assert.equal(d.length, 3);
      assert.ok(!d.includes(c), `${p.title} ${c}`);
      assert.equal(new Set(d).size, 3);
    }
  }
});

test('飞花令选项：3 个不同的句子，正确下句在里面，字数相同', () => {
  for (const pair of P.linePairs(P.POEMS)) {
    const o = bossOptions(pair, 3);
    const answer = P.bare(pair.down);
    assert.equal(o.length, 3, pair.up);
    assert.ok(o.includes(answer));
    assert.equal(new Set(o).size, 3);
    const sameLength = new Set(P.POEMS.flatMap(p => p.lines.map(P.bare)).filter(l => l.length === answer.length));
    if (sameLength.size >= 3) assert.ok(o.every(t => t.length === answer.length));
  }
});

test('第 5 关 Boss 的选项只用上册的诗', () => {
  const up = WORLDS[0].levels[4].tasks[0].poems.map(P.poemById);
  const upLines = new Set(up.flatMap((p) => p.lines.map(P.bare)));
  for (const pair of P.linePairs(up)) {
    const o = bossOptions(pair, 3, Math.random, up);
    assert.equal(o.length, 3, pair.up);
    assert.ok(o.every((t) => upLines.has(t)), `${pair.up} → ${o}`);
  }
});

test('关卡：10 关，第 5、10 关是 Boss，任务里的诗都存在，每首诗都有地方学', () => {
  const w = WORLDS[0];
  assert.equal(w.levels.length, 10);
  assert.ok(w.levels[4].boss && w.levels[9].boss);
  const taught = new Set();
  for (const L of w.levels) {
    for (const t of L.tasks) {
      if (t.type === 'boss') t.poems.forEach((id) => assert.ok(P.poemById(id), id));
      else { assert.ok(P.poemById(t.poem), t.poem); taught.add(t.poem); }
    }
  }
  assert.deepEqual([...taught].sort(), P.POEMS.filter(p => p.grade === 1).map((p) => p.id).sort());
  // Boss 只考已经学过的诗
  const before5 = new Set(w.levels.slice(0, 4).flatMap((L) => L.tasks.map((t) => t.poem)));
  w.levels[4].tasks[0].poems.forEach((id) => assert.ok(before5.has(id), `第 5 关考到了还没学的 ${id}`));
});

test('朗读清单里的文件都在，文本和诗句一致', () => {
  const url = new URL('../audio/manifest.json', import.meta.url);
  if (!existsSync(url)) return; // 没有朗读也能玩
  const list = JSON.parse(readFileSync(url, 'utf8'));
  for (const item of list) {
    assert.ok(existsSync(new URL(`../audio/${item.file}`, import.meta.url)), item.file);
    const [id, n] = item.id.split('-');
    const p = P.poemById(id);
    assert.ok(p, item.id);
    if (n !== '0') assert.equal(item.text, p.lines[Number(n) - 1]);
  }
});

test('存档清洗：坏数据回到默认值，只认识真实的诗', () => {
  const s = fillSave({ grade: 7, coins: -1, levels: { '1-1': { stars: 9, fails: 3 }, x: {} }, learned: { yonge: true, '<img>': true } });
  assert.equal(s.grade, 1);
  assert.equal(s.coins, 0);
  assert.deepEqual(s.levels, { '1-1': { stars: 3, fails: 3, skipped: false } });
  assert.deepEqual(Object.keys(s.learned), ['yonge']);
  assert.ok(isUnlocked(s, 1, 2));
  assert.ok(!isUnlocked(s, 1, 3));
  assert.deepEqual(fillSave('坏'), fillSave(null));
});
