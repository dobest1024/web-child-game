import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../js/pinyin.js');
const { WORLDS, makeOptions } = require('../js/levels.js');

test('声母 23、韵母 24、整体认读 16', () => {
  assert.equal(P.INITIALS.length, 23);
  assert.equal(P.FINALS.length, 24);
  assert.equal(P.WHOLE_SYLLABLES.length, 16);
  assert.deepEqual(Object.keys(P.INITIAL_AUDIO).sort(), [...P.INITIALS].sort());
  const finalLevels = WORLDS[0].levels.slice(10, 15).flatMap((L) => L.pools.block);
  assert.deepEqual(finalLevels.map((i) => i.base), P.FINALS.slice(6));
  assert.deepEqual(
    finalLevels.map((i) => i.show),
    ['āi', 'ēi', 'uī', 'āo', 'ōu', 'iū', 'iē', 'üē', 'ér', 'ān', 'ēn', 'īn', 'ūn', 'ǖn', 'āng', 'ēng', 'īng', 'ōng'],
  );
});

test('标调：a 优先，再 o、e，iu ui 标在后', () => {
  assert.equal(P.markTone('hao', 3), 'hǎo');
  assert.equal(P.markTone('lou', 2), 'lóu');
  assert.equal(P.markTone('xie', 4), 'xiè');
  assert.equal(P.markTone('liu', 2), 'liú');
  assert.equal(P.markTone('gui', 4), 'guì');
  assert.equal(P.markTone('yi', 1), 'yī');
  assert.equal(P.markTone('ma', 0), 'ma');
});

test('ü 遇 j q x y 去点，遇 n l 保留', () => {
  assert.equal(P.spell('j', 'ü'), 'ju');
  assert.equal(P.spell('q', 'üe'), 'que');
  assert.equal(P.spell('y', 'ün'), 'yun');
  assert.equal(P.spell('n', 'ü'), 'nü');
  assert.equal(P.markTone('lv', 4), 'lǜ');
  assert.equal(P.markTone(P.spell('x', 'ü'), 1), 'xū');
});

test('声调识别与整体认读', () => {
  assert.equal(P.toneOf('mǎ'), 3);
  assert.equal(P.toneOf('lǜ'), 4);
  assert.equal(P.toneOf('ma'), 0);
  assert.ok(P.isWholeSyllable('yuan2'));
  assert.ok(!P.isWholeSyllable('yan'));
});

test('每关的题目都有音频文件，选项凑得够、答案在选项里', () => {
  for (const world of WORLDS.filter((w) => !w.locked)) {
    assert.equal(world.levels.length, world.grade === 1 ? 20 : 10);
    for (const L of world.levels) {
      for (const gate of L.gates) {
        const pool = L.pools[gate];
        assert.ok(pool?.length, `${L.name} 缺少 ${gate} 题库`);
        for (const item of pool) {
          assert.ok(existsSync(new URL(`../audio/syl/${item.audio}.mp3`, import.meta.url)), `${L.name}: ${item.audio}.mp3`);
          const options = makeOptions(item, pool, L.options);
          assert.equal(options.length, Math.min(L.options, pool.length), L.name);
          assert.ok(options.includes(item));
          assert.equal(new Set(options.map((o) => o.show)).size, options.length, `${L.name} 选项重复`);
        }
      }
    }
  }
});

test('同组干扰项优先：声调关的选项是同一个韵母的四个声调', () => {
  const L = WORLDS[0].levels[4];
  const item = L.pools.block.find((p) => p.show === 'ǎ');
  const options = makeOptions(item, L.pools.block, 4);
  assert.deepEqual(options.map((o) => o.tone).sort(), [1, 2, 3, 4]);
  assert.ok(options.every((o) => o.group === 'a'));
});

test('存档清洗：坏数据回到默认值，学会的拼音按显示文字记录', () => {
  const { fillSave, isUnlocked } = require('../js/save.js');
  const s = fillSave({ grade: 9, coins: -5, levels: { '1-1': { stars: 7, fails: 2 }, bad: {} }, learned: { 'ǎ': true, '<img>': true, zh: true } });
  assert.equal(s.grade, 1);
  assert.equal(s.coins, 0);
  assert.deepEqual(s.levels, { '1-1': { stars: 3, fails: 2, skipped: false } });
  assert.deepEqual(Object.keys(s.learned).sort(), ['zh', 'ǎ']);
  assert.ok(isUnlocked(s, 1, 2));
  assert.ok(!isUnlocked(s, 1, 3));
  assert.deepEqual(fillSave(null), fillSave(undefined));
});
