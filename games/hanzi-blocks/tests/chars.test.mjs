import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

const require = createRequire(import.meta.url);
const C = require('../js/chars.js');
const { WORD_AUDIO } = require('../js/audio-list.js');
const B = require('../js/board.js');
const S = require('../js/save.js');
const { Sound } = require('../js/audio.js');
const file = (p) => new URL(`../${p}`, import.meta.url);

test('字表：每个字两个部件，左右或上下，部件拼回去就是这个字', () => {
  const chars = Object.values(C.CHARS);
  assert.equal(chars.length, 147);
  assert.equal(C.CHAR_TABLE.trim().split('\n').length, chars.length, '没有重复的字');
  for (const ch of chars) {
    assert.equal(ch.parts.length, 2, `${ch.c} 部件数`);
    assert.ok(['lr', 'tb'].includes(ch.layout));
    assert.equal(C.charOf(ch.layout, ch.parts[0], ch.parts[1]), ch.c, `${ch.c} 拼不回去`);
    assert.match(ch.py, /^[a-zü]*[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ][a-zü]*$/, `${ch.c} 拼音 ${ch.py}`);
    assert.ok(ch.word.includes(ch.c), `${ch.c} 的组词 ${ch.word}`);
    assert.ok(ch.emoji && ch.source, `${ch.c} 缺小图或出处`);
  }
  // 同样的部件、同样的摆法只能拼出一个字
  const keys = chars.map((ch) => `${ch.layout}:${ch.parts.join('')}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const r of Object.keys(C.RADICAL_NAMES)) {
    assert.ok(chars.some((ch) => ch.parts.includes(r)), `偏旁 ${r} 没用上`);
    assert.ok(!C.CHARS[r], `${r} 是偏旁，不是字表里的字`);
  }
  assert.deepEqual(C.CHARS['杨'].parts, ['木', '昜']);
  for (const r of ['昜', '㐬', '㣺', '龹', '豙', '肰', '夬', '毌', '䍃', '彖', '彳']) {
    assert.ok(C.RADICAL_NAMES[r], `缺 ${r} 的偏旁名称`);
  }
});

test('关卡：10 关，第 5、10 关是 Boss，部件池就是本关字的部件', () => {
  const w = C.WORLDS[0];
  assert.equal(w.levels.length, 10);
  w.levels.forEach((L, i) => {
    assert.equal(L.n, i + 1);
    assert.ok(L.chars.length >= 3 && L.chars.every((c) => C.CHARS[c]), `${L.name} 有不认识的字`);
    assert.ok(L.goal > 0 && L.speed > 0 && L.start >= 0 && L.intro);
    assert.deepEqual(new Set(L.parts), new Set(L.chars.flatMap((c) => C.CHARS[c].parts)));
  });
  assert.ok(w.levels[4].boss && w.levels[9].boss);
  assert.equal(w.levels[4].goal, w.levels[4].boss.hp);
  assert.deepEqual(new Set(w.levels[9].chars), new Set(w.levels.slice(0, 9).flatMap(l => l.chars)), '大 Boss 关只考本年级学过的字');
  assert.ok(w.levels[0].tutorial);
  assert.ok(C.WORLDS.every(x => !x.locked && x.levels.length === 10));
  // 前面关卡学过的字都算"学过的字"
  const known = C.knownChars(w, 4);
  for (const L of w.levels.slice(0, 4)) for (const c of L.chars) assert.ok(known.has(c));
  assert.ok(!known.has('清'));
});

test('录音：每个字都有字音，组词录音清单里的词都有文件，没有多余的文件', () => {
  for (const ch of Object.values(C.CHARS)) {
    const f = `audio/${C.charAudio(ch.c)}.mp3`;
    assert.ok(existsSync(file(f)) && statSync(file(f)).size > 1000, `${ch.c} 缺字音 ${f}`);
  }
  const words = new Set(Object.values(C.CHARS).map((ch) => ch.word));
  for (const w of WORD_AUDIO) {
    assert.ok(words.has(w), `${w} 不是哪个字的组词`);
    assert.ok(existsSync(file(`audio/${C.wordAudio(w)}.mp3`)), `${w} 缺录音`);
  }
  const manifest = JSON.parse(readFileSync(file('audio/manifest.json'), 'utf8'));
  const listed = new Set(manifest.map((m) => m.file));
  for (const m of manifest) assert.ok(m.source && m.speaker, `${m.text} 缺来源`);
  for (const f of readdirSync(file('audio'))) {
    if (f.endsWith('.mp3')) assert.ok(listed.has(`audio/${f}`), `audio/${f} 不在 manifest.json 里`);
  }
  assert.equal(manifest.filter((m) => m.py).length, Object.keys(C.CHARS).length);
});

test('音效：game.js 用到的 Sound 方法 audio.js 里都有', () => {
  const used = new Set([...readFileSync(file('js/game.js'), 'utf8').matchAll(/Sound\.(\w+)\(/g)].map((m) => m[1]));
  for (const name of readFileSync(file('js/main.js'), 'utf8').matchAll(/Sound\.(\w+)\(/g)) used.add(name[1]);
  assert.ok(used.size >= 8);
  for (const name of used) assert.equal(typeof Sound[name], 'function', `audio.js 缺 Sound.${name}()`);
});

test('存档清洗：坏数据回到默认值，图鉴只记字表里的字', () => {
  const s = S.fillSave({
    grade: 9, coins: -5, levels: { '1-1': { stars: 7, fails: -1 }, '1-2': { skipped: true }, bad: { stars: 3 } },
    learned: { 明: true, 龙: true, constructor: true, 早: 1 },
  });
  assert.equal(s.grade, 1);
  assert.equal(s.coins, 0);
  assert.deepEqual(s.levels, { '1-1': { stars: 3, fails: 0, skipped: false }, '1-2': { stars: 0, fails: 0, skipped: true } });
  assert.deepEqual(Object.keys(s.learned).sort(), ['早', '明'].sort());
  assert.ok(S.isUnlocked(s, 1, 3), '跳过的关也能解锁下一关');
  assert.ok(!S.isUnlocked(s, 1, 4));
  assert.deepEqual(S.fillSave(null), S.defaultSave());
  assert.equal(S.fillSave({ coins: 1e12 }).coins, 999999);
});

test('棋盘：落在本列是上下拼，落在旁边是左右拼', () => {
  const b = B.createBoard();
  B.push(b, 0, '日');
  B.push(b, 2, '大');
  assert.deepEqual(B.judge(b, 1, '月', '明'), { kind: 'right', layout: 'lr', first: '日', second: '月', baseCol: 0, char: '明' });
  assert.equal(B.judge(b, 2, '小', '尖').kind, 'right', '小 叠在 大 上面是 尖');
  assert.equal(B.judge(b, 2, '小', '尖').layout, 'tb');
  assert.equal(B.judge(b, 3, '小', '尖').kind, 'near', '小 放在 大 的右边：碰到了另一半，但位置不对');
  assert.equal(B.judge(b, 0, '月', '明').kind, 'near', '月 叠在 日 上面不对，要放旁边');
  assert.equal(B.judge(b, 4, '月', '明').kind, 'stack');
  assert.deepEqual(B.answerColumns(b, '明', '月'), [1]);
  assert.deepEqual(B.answerColumns(b, '尖', '小'), [2]);
});

test('棋盘：顺手拼出学过的别的字算 bonus，没学过的不算', () => {
  const b = B.createBoard();
  B.push(b, 0, '十');
  assert.equal(B.judge(b, 0, '日', '明', new Set(['早'])).kind, 'bonus');
  assert.equal(B.judge(b, 0, '日', '明', new Set(['早'])).char, '早');
  assert.equal(B.judge(b, 0, '日', '明').kind, 'stack');
});

test('棋盘：拆题、送底座、出方块的列都合理', () => {
  const r0 = () => 0, r1 = () => 0.99;
  assert.deepEqual(B.splitTarget('尖'), { piece: '小', base: '大', side: 'top' });
  assert.deepEqual(B.splitTarget('明', r0), { piece: '月', base: '日', side: 'right' });
  assert.deepEqual(B.splitTarget('明', r1), { piece: '日', base: '月', side: 'left' });

  const b = B.createBoard();
  B.push(b, 0, '木'); B.push(b, 0, '木');
  B.push(b, 1, '人');
  // 送到最矮的列；放右边的方块不能送到最右列，放左边的不能送到最左列
  for (let i = 0; i < 20; i++) {
    const r = () => i / 20;
    assert.ok([2, 3].includes(B.deliveryColumn(b, { side: 'right' }, r)));
    assert.ok([2, 3, 4].includes(B.deliveryColumn(b, { side: 'left' }, r)));
  }
  const full = B.createBoard();
  for (let c = 0; c < full.cols; c++) for (let i = 0; i < full.rows; i++) B.push(full, c, '口');
  assert.equal(B.deliveryColumn(full, { side: 'top' }), -1);
  assert.equal(B.spawnColumn(full, '古', '十'), -1);

  // 出方块的列：避开答案列，也尽量不挨着另一半
  const s = B.createBoard();
  B.push(s, 2, '日');
  for (let i = 0; i < 20; i++) {
    const c = B.spawnColumn(s, '明', '月', () => i / 20);
    assert.equal(B.judge(s, c, '月', '明').kind, 'stack', `第 ${c} 列`);
  }

  const start = B.createBoard();
  B.fillStart(start, ['日', '月'], 20, () => 0.5);
  assert.ok(start.stacks.every((st) => st.length <= 2));
  assert.equal(start.stacks.flat().length, 10);
});
