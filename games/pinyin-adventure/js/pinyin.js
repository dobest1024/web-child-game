'use strict';
// ===== 拼音规则：题目答案都以这里为准（tests/pinyin.test.mjs 覆盖）=====

const INITIALS = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x',
  'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'];
const FINALS = ['a', 'o', 'e', 'i', 'u', 'ü',
  'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er',
  'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong'];
const WHOLE_SYLLABLES = ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si',
  'yi', 'wu', 'yu', 'ye', 'yue', 'yuan', 'yin', 'yun', 'ying'];
// 声母呼读音（都读一声），值是 audio/syl 下的文件名
const INITIAL_AUDIO = {
  b: 'bo1', p: 'po1', m: 'mo1', f: 'fo1', d: 'de1', t: 'te1', n: 'ne1', l: 'le1',
  g: 'ge1', k: 'ke1', h: 'he1', j: 'ji1', q: 'qi1', x: 'xi1',
  zh: 'zhi1', ch: 'chi1', sh: 'shi1', r: 'ri1', z: 'zi1', c: 'ci1', s: 'si1', y: 'yi1', w: 'wu1',
};
const TONE_MARKS = {
  a: 'āáǎà', o: 'ōóǒò', e: 'ēéěè', i: 'īíǐì', u: 'ūúǔù', 'ü': 'ǖǘǚǜ',
};
const TONE_SYMBOLS = ['', 'ˉ', 'ˊ', 'ˇ', 'ˋ'];

// 标调：有 a 标 a，没 a 找 o、e；i、u 并列标在后；i 上标调自然去点
function markTone(syllable, tone) {
  const s = syllable.replace(/v/g, 'ü');
  if (!tone || tone > 4) return s;
  let at = s.indexOf('a');
  if (at < 0) at = s.indexOf('o');
  if (at < 0) at = s.indexOf('e');
  if (at < 0 && s.includes('iu')) at = s.indexOf('iu') + 1;
  if (at < 0 && s.includes('ui')) at = s.indexOf('ui') + 1;
  if (at < 0) at = Math.max(s.lastIndexOf('i'), s.lastIndexOf('u'), s.lastIndexOf('ü'));
  if (at < 0) return s;
  return s.slice(0, at) + TONE_MARKS[s[at]][tone - 1] + s.slice(at + 1);
}

// ü 遇 j q x y 去两点，遇 n l 保留
function spell(initial, final) {
  if (['j', 'q', 'x', 'y'].includes(initial) && final.startsWith('ü'))
    return initial + 'u' + final.slice(1);
  return initial + final;
}

function toneOf(marked) {
  for (const marks of Object.values(TONE_MARKS)) {
    const i = [...marks].findIndex((m) => marked.includes(m));
    if (i >= 0) return i + 1;
  }
  return 0;
}

function isWholeSyllable(syllable) {
  return WHOLE_SYLLABLES.includes(syllable.replace(/[1-5]$/, ''));
}

if (typeof module === 'object') {
  module.exports = { INITIALS, FINALS, WHOLE_SYLLABLES, INITIAL_AUDIO, TONE_SYMBOLS, markTone, spell, toneOf, isWholeSyllable };
}
