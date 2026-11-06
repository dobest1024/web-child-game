import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IDIOMS,
  findIdiom,
  chainCheck,
  CHAIN_PAIRS,
  CHAPTERS,
  LEVEL_COUNT,
  QUESTION_TYPES,
  buildLevels,
} from '../levels.js';

const TONE_VOWELS = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
const syllableRe = new RegExp(`^[a-z${TONE_VOWELS}]+$`, 'i');

test('idiom library has 48 unique four-character entries', () => {
  assert.equal(IDIOMS.length, 48);
  const words = new Set(IDIOMS.map((idiom) => idiom.word));
  assert.equal(words.size, 48);
  for (const idiom of IDIOMS) {
    assert.equal(idiom.word.length, 4, idiom.word);
    for (const ch of idiom.word)
      assert.match(ch, /[\u4e00-\u9fff]/, `${idiom.word} 含非汉字字符`);
  }
});

test('every entry has four tone-marked syllables and a child-friendly meaning', () => {
  for (const idiom of IDIOMS) {
    const syllables = idiom.pinyin.trim().split(/\s+/);
    assert.equal(syllables.length, 4, `${idiom.word} 拼音音节数不对`);
    for (const syllable of syllables) {
      assert.match(syllable, syllableRe, `${idiom.word} 拼音含非法字符`);
      assert.equal(
        [...syllable].filter((ch) => TONE_VOWELS.includes(ch)).length,
        1,
        `${idiom.word} 拼音 ${syllable} 应恰有一个声调符号`,
      );
    }
    assert.ok(idiom.meaning.length >= 5 && idiom.meaning.length <= 60, idiom.word);
    if (idiom.example) assert.ok(idiom.example.length >= 4, idiom.word);
  }
});

test('each idiom carries a known structure tag', () => {
  const tags = new Set(['数字', '寓言', '景色', '品格', '神态']);
  for (const idiom of IDIOMS)
    assert.ok(tags.has(idiom.tag), `${idiom.word} 的结构标签无效`);
});

test('chain pairs reference library idioms and honor the marked homophones', () => {
  assert.equal(CHAIN_PAIRS.length, LEVEL_COUNT);
  const seen = new Set();
  for (const pair of CHAIN_PAIRS) {
    assert.ok(findIdiom(pair.from), `接龙头 ${pair.from} 不在成语库`);
    assert.ok(findIdiom(pair.to), `接龙尾 ${pair.to} 不在成语库`);
    assert.ok(!seen.has(pair.to), `接龙答案 ${pair.to} 重复使用`);
    seen.add(pair.to);
    const outcome = chainCheck(pair.from, pair.to);
    assert.equal(outcome.ok, true, `${pair.from} → ${pair.to} 不满足接龙规则`);
    assert.equal(
      outcome.homophone,
      pair.homophone,
      `${pair.from} → ${pair.to} 谐音标注与实际不符`,
    );
  }
});

test('chain rule rejects wrong heads and exact homophones are detected', () => {
  assert.deepEqual(chainCheck('一心一意', '雪中送炭'), {
    ok: false,
    homophone: false,
  });
  assert.deepEqual(chainCheck('锦上添花', '花好月圆'), {
    ok: true,
    homophone: false,
  });
  assert.deepEqual(chainCheck('天长地久', '九牛一毛'), {
    ok: true,
    homophone: true,
  });
  assert.equal(chainCheck('守株待兔', '守株待兔').ok, false);
});

test('12 levels assign 4 distinct idioms each and cover the library exactly once', () => {
  const levels = buildLevels();
  assert.equal(levels.length, 12);
  const assigned = levels.flatMap((level) => {
    const design = level.questions.find((question) => question.type === 'match');
    return design.pairs.map((pair) => pair.word);
  });
  assert.equal(assigned.length, 48);
  assert.equal(new Set(assigned).size, 48);
  for (const word of assigned) assert.ok(findIdiom(word), word);
});

test('every referenced idiom across all questions lives in the library', () => {
  for (const level of buildLevels()) {
    for (const question of level.questions) {
      if (question.type === 'fill') assert.ok(findIdiom(question.word), question.word);
      if (question.type === 'match')
        for (const pair of question.pairs) assert.ok(findIdiom(pair.word), pair.word);
      if (question.type === 'chain') {
        assert.ok(findIdiom(question.head), question.head);
        for (const word of question.options) assert.ok(findIdiom(word), word);
      }
    }
  }
});

test('fill questions offer four unique options containing the correct character', () => {
  for (const level of buildLevels())
    for (const question of level.questions) {
      if (question.type !== 'fill') continue;
      assert.equal(question.options.length, 4, question.word);
      assert.equal(new Set(question.options).size, 4, question.word);
      assert.equal(
        question.options[question.answer],
        question.word[question.blank],
        question.word,
      );
      for (const [i, option] of question.options.entries())
        if (i !== question.answer)
          assert.ok(
            ![...question.word].includes(option),
            `${question.word} 的干扰字 ${option} 与原字面冲突`,
          );
    }
});

test('match questions pair four idioms with four distinct correct meanings', () => {
  for (const level of buildLevels())
    for (const question of level.questions) {
      if (question.type !== 'match') continue;
      assert.equal(question.pairs.length, 4);
      assert.equal(new Set(question.pairs.map((pair) => pair.word)).size, 4);
      const meanings = question.pairs.map((pair) => pair.meaning);
      assert.equal(new Set(meanings).size, 4);
      for (const pair of question.pairs)
        assert.equal(findIdiom(pair.word).meaning, pair.meaning);
      assert.deepEqual([...question.right].sort(), [...meanings].sort());
    }
});

test('chain questions offer exactly one option that satisfies the chain rule', () => {
  for (const level of buildLevels())
    for (const question of level.questions) {
      if (question.type !== 'chain') continue;
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options).size, 3);
      const okOptions = question.options.filter(
        (word) => chainCheck(question.head, word).ok,
      );
      assert.equal(okOptions.length, 1, `${question.head} → ${question.options}`);
      assert.equal(question.options[question.answer], question.tail);
      assert.ok(okOptions.includes(question.tail));
    }
});

test('all four questions per level rotate through the three types', () => {
  for (const level of buildLevels()) {
    assert.equal(level.questions.length, 4);
    assert.deepEqual(
      level.questions.map((question) => question.type),
      QUESTION_TYPES,
    );
  }
  assert.deepEqual(QUESTION_TYPES, ['fill', 'match', 'chain', 'fill']);
});

test('building levels with the same seed yields identical questions', () => {
  assert.deepEqual(buildLevels(42), buildLevels(42));
  assert.deepEqual(buildLevels(), buildLevels());
  assert.notEqual(JSON.stringify(buildLevels(7)), JSON.stringify(buildLevels(8)));
});

test('three chapters group the twelve stations', () => {
  assert.equal(CHAPTERS.length, 3);
  const levels = buildLevels();
  for (const level of levels)
    assert.ok(
      level.chapter >= 0 && level.chapter < CHAPTERS.length,
      `${level.name} 章节无效`,
    );
});
