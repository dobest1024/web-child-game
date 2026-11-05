import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const V = require('../js/words.js');
const { WORLDS, worldOfGrade, makeOptions } = require('../js/levels.js');
const { fillSave, isUnlocked } = require('../js/save.js');
const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('每个单词都对照过 Cambridge Dictionary：词条拼写一致、查到了词义', () => {
  const checked = json('./sources/cambridge.json');
  for (const w of V.WORD_LIST.map(([id]) => id)) {
    const c = checked[w];
    assert.ok(c, `${w} 没有核对记录（运行 tools/verify-cambridge.py）`);
    assert.equal(c.error, undefined, `${w} 核对时出错`);
    assert.equal(c.headword, w, `${w} 的词条是 ${c.headword}`);
    assert.ok(c.definition.length > 5, `${w} 没查到词义`);
  }
});

test('每个单词和 26 个字母都有真人录音，许可都在白名单里', () => {
  const manifest = json('../audio/manifest.json');
  const allowed = new Set(['CC BY-SA 3.0', 'CC BY-SA 2.5', 'CC BY-SA 4.0', 'CC BY 3.0', 'CC BY 4.0', 'CC0', 'Public domain']);
  const items = [...Object.values(V.WORDS), ...Object.values(V.LETTERS)];
  assert.equal(items.length, Object.keys(V.WORDS).length + 26);
  for (const item of items) {
    assert.ok(existsSync(new URL(`../audio/${item.audio}.mp3`, import.meta.url)), `${item.audio}.mp3`);
    const m = manifest.find((x) => x.id === item.audio);
    assert.ok(m, `manifest 里没有 ${item.audio}`);
    assert.ok(m.synthesized === true || allowed.has(m.license), `${item.audio} 的许可 ${m.license}`);
    assert.ok(m.seconds > 0.2 && m.seconds < (m.synthesized ? 8 : 3), `${item.audio} 时长 ${m.seconds}`);
  }
  const credits = readFileSync(new URL('../audio/CREDITS.txt', import.meta.url), 'utf8');
  for (const m of manifest) assert.ok(credits.includes(`${m.id}.mp3`), `CREDITS 缺 ${m.id}`);
});

test('一到六年级都有独立内容', () => {
  assert.notEqual(worldOfGrade(1), worldOfGrade(2));
  assert.ok(!worldOfGrade(1).locked);
  for (const g of [3, 4, 5, 6]) assert.ok(!worldOfGrade(g).locked, `${g} 年级`);
});

test('每关题库够用：选项凑得够、不重复、答案在里面', () => {
  const world = WORLDS[0];
  assert.equal(world.levels.length, 10);
  assert.ok(world.levels[4].boss && world.levels[9].boss, '第 5、10 关是 Boss');
  for (const L of world.levels) {
    assert.ok(['bubble', 'snake', 'match'].includes(L.mode), L.name);
    if (L.mode === 'match') assert.ok(L.pool.length >= L.pairs, L.name);
    if (L.mode === 'snake' && L.task === 'word') {
      for (const w of L.pool) assert.equal(new Set(w.show).size, w.show.length, `${w.show} 有重复字母，小蛇拼不了`);
      continue;
    }
    for (const item of L.pool) {
      const options = makeOptions(item, L.pool, L.options || 2);
      assert.equal(options.length, Math.min(L.options || 2, L.pool.length), L.name);
      assert.ok(options.includes(item));
      assert.equal(new Set(options.map((o) => o.id)).size, options.length, `${L.name} 选项重复`);
    }
  }
});

test('干扰项优先同一类：Boss 关里问颜色就给颜色', () => {
  const L = WORLDS[0].levels[4];
  for (const item of L.pool) {
    assert.ok(makeOptions(item, L.pool, 3).every((o) => o.group === item.group), item.id);
  }
});

test('存档清洗：坏数据回到默认值，学会的词按 id 记录', () => {
  const s = fillSave({
    grade: 9, coins: -5,
    levels: { '1-1': { stars: 7, fails: 2 }, '1-2': { skipped: true }, bad: {} },
    learned: { cat: true, 'letter-a': true, '<img>': true, Cat: true },
  });
  assert.equal(s.grade, 1);
  assert.equal(s.coins, 0);
  assert.deepEqual(s.levels, { '1-1': { stars: 3, fails: 2, skipped: false }, '1-2': { stars: 0, fails: 0, skipped: true } });
  assert.deepEqual(Object.keys(s.learned).sort(), ['cat', 'letter-a']);
  assert.ok(isUnlocked(s, 1, 2));
  assert.ok(isUnlocked(s, 1, 3), '跳过的关也能解锁下一关');
  assert.ok(!isUnlocked(s, 1, 4));
  assert.deepEqual(fillSave(null), fillSave(undefined));
});
