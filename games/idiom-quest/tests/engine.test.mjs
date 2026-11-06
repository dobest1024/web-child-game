import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IDIOMS,
  findIdiom,
  LEVEL_COUNT,
  CHAIN_PAIRS,
  buildLevels,
} from '../levels.js';
import {
  starsFor,
  recordStars,
  addCollected,
  normalizeProgress,
  resolveQuestionIdiom,
  collectableWords,
} from '../engine.js';

test('star rule: flawless run earns 3, one miss earns 2, anything else passes with 1', () => {
  assert.equal(starsFor(0), 3);
  assert.equal(starsFor(1), 2);
  assert.equal(starsFor(2), 1);
  assert.equal(starsFor(4), 1);
});

test('recording stars keeps the best result and ignores invalid levels', () => {
  let progress = { stars: {}, collected: [] };
  progress = recordStars(progress, 0, 1);
  progress = recordStars(progress, 0, 3);
  progress = recordStars(progress, 0, 2);
  assert.equal(progress.stars[0], 3);
  progress = recordStars(progress, 11, 2);
  assert.equal(progress.stars[11], 2);
  assert.equal(recordStars(progress, 12, 3).stars[12], undefined);
  assert.equal(recordStars(progress, -1, 3).stars[-1], undefined);
});

test('collecting idioms appends library words in order and skips duplicates', () => {
  let progress = { stars: {}, collected: [] };
  progress = addCollected(progress, ['一心一意', '守株待兔']);
  progress = addCollected(progress, ['守株待兔', '画蛇添足']);
  assert.deepEqual(progress.collected, ['一心一意', '守株待兔', '画蛇添足']);
  assert.equal(addCollected(progress, ['不是成语']).collected.length, 3);
  assert.deepEqual(addCollected(progress, []), progress);
});

test('normalizeProgress returns a clean empty save for junk input', () => {
  for (const junk of [null, undefined, 'abc', 42, ['一心一意']]) {
    assert.deepEqual(normalizeProgress(junk), { stars: {}, collected: [] });
  }
});

test('normalizeProgress keeps only valid star entries', () => {
  const progress = normalizeProgress({
    stars: {
      0: 3,
      11: 2,
      12: 3,
      '-1': 3,
      3: 0,
      4: 9,
      5: 2.5,
      x: 1,
      6: '2',
      7: null,
    },
  });
  assert.deepEqual(progress.stars, { 0: 3, 11: 2 });
  assert.deepEqual(normalizeProgress({ stars: 'oops' }), { stars: {}, collected: [] });
  assert.deepEqual(normalizeProgress({ stars: [3, 2] }), { stars: {}, collected: [] });
});

test('normalizeProgress keeps in-order unique library idioms only', () => {
  const progress = normalizeProgress({
    collected: [
      '守株待兔',
      '一心一意',
      '守株待兔',
      '不存在的成语',
      42,
      null,
      '井底之蛙',
      {},
    ],
  });
  assert.deepEqual(progress.collected, ['守株待兔', '一心一意', '井底之蛙']);
  assert.deepEqual(normalizeProgress({ collected: '一心一意' }), {
    stars: {},
    collected: [],
  });
});

test('cleaned save can round-trip through JSON and stay stable', () => {
  const raw = JSON.stringify({
    stars: { 0: 3, 11: 2 },
    collected: ['一心一意', '异口同声'],
    extra: 'ignored',
  });
  const first = normalizeProgress(JSON.parse(raw));
  const second = normalizeProgress(JSON.parse(JSON.stringify(first)));
  assert.deepEqual(first, second);
  assert.deepEqual(first, { stars: { 0: 3, 11: 2 }, collected: ['一心一意', '异口同声'] });
});

test('every collected idiom a cleaned save may contain comes from the library', () => {
  const progress = normalizeProgress({
    collected: IDIOMS.map((idiom) => idiom.word).concat(['乱码']),
  });
  assert.equal(progress.collected.length, 48);
  for (const word of progress.collected) assert.ok(findIdiom(word), word);
});

test('chain questions always continue from an idiom learned in the same or an earlier level', () => {
  const levels = buildLevels();
  assert.equal(levels.length, LEVEL_COUNT);
  assert.equal(CHAIN_PAIRS.length, LEVEL_COUNT);
  for (const level of levels) {
    const match = level.questions.find((question) => question.type === 'match');
    assert.equal(match.pairs.length, 4);
  }
  for (const [index, pair] of CHAIN_PAIRS.entries()) {
    const known = new Set(
      levels
        .slice(0, index + 1)
        .flatMap((level) =>
          level.questions
            .find((question) => question.type === 'match')
            .pairs.map((item) => item.word),
        ),
    );
    assert.ok(known.has(pair.from), `第${index + 1}关接龙头 ${pair.from} 还没学到`);
  }
});

test('chain questions resolve valid idioms and collect both head and tail words', () => {
  const levels = buildLevels();
  let progress = { stars: {}, collected: [] };
  for (const level of levels) {
    const chain = level.questions.find((question) => question.type === 'chain');
    const idiom = resolveQuestionIdiom(chain);
    assert.ok(idiom, `第${level.id + 1}关接龙应能查到成语释义`);
    assert.equal(idiom.word, chain.tail);
    const words = collectableWords(chain);
    assert.deepEqual(words, [chain.head, chain.tail]);
    progress = addCollected(progress, words);
    assert.ok(progress.collected.includes(chain.head));
    assert.ok(progress.collected.includes(chain.tail));
  }
});
