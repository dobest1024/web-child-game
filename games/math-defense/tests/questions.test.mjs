import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Q = require('../js/questions.js');
const { WORLDS, MONSTERS, KIND_NAMES } = require('../js/levels.js');
const { fillSave, isUnlocked } = require('../js/save.js');

// 固定种子的随机数，失败时能复现
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 不看生成器，自己从显示的算式里把答案算出来
function evaluate(expr) {
  const tokens = expr.trim().split(/\s+/);
  let value = Number(tokens[0]);
  const steps = [value];
  for (let i = 1; i < tokens.length; i += 2) {
    const n = Number(tokens[i + 1]);
    value = tokens[i] === '+' ? value + n : tokens[i] === '−' ? value - n : NaN;
    steps.push(value);
  }
  return { value, steps, nums: tokens.filter((_, i) => i % 2 === 0).map(Number) };
}
function check(q) {
  if (q.kind === 'cmp10') {
    const [left, right] = q.prompt.split('○');
    const { value, nums } = evaluate(left);
    const c = Number(right);
    assert.equal(q.answer, value > c ? '>' : value < c ? '<' : '=', q.prompt);
    assert.ok(value >= 0 && value <= 10 && c >= 0 && c <= 10, `比大小超出 10 以内：${q.prompt}`);
    assert.ok(nums.every((n) => n >= 1 && n <= 10), q.prompt);
    return;
  }
  if (q.kind === 'make10') {
    const m = q.prompt.match(/^(\d+) \+ □ = 10$/);
    assert.ok(m, q.prompt);
    assert.equal(q.answer, 10 - Number(m[1]));
    assert.ok(q.answer >= 1 && q.answer <= 9, q.prompt);
    return;
  }
  assert.ok(q.prompt.endsWith(' = ?'), q.prompt);
  const { value, steps, nums } = evaluate(q.prompt.slice(0, -4));
  assert.equal(q.answer, value, q.prompt);
  assert.ok(steps.every((v) => v >= 0 && v <= Q.MAX_NUMBER), `中间结果超出 0–20：${q.prompt}`);
  const [a, b] = nums;
  const range = {
    add5: () => a >= 1 && b >= 1 && value <= 5,
    add10: () => a >= 1 && b >= 1 && value <= 10,
    sub10: () => a <= 10 && b >= 1 && value >= 0,
    carryAdd: () => a <= 9 && b <= 9 && (a % 10) + (b % 10) >= 10 && value >= 11 && value <= 18,
    borrowSub: () => a >= 11 && a <= 18 && b <= 9 && a % 10 < b && value >= 2 && value <= 9,
    chain: () => nums.length === 3 && nums.every((n) => n >= 1 && n <= 10),
  }[q.kind];
  assert.ok(range(), `${q.kind} 超出范围：${q.prompt}`);
}

test('每种题型 3000 道：答案和数值范围都对', () => {
  const random = seeded(7);
  for (const kind of ['add5', 'add10', 'sub10', 'cmp10', 'make10', 'carryAdd', 'borrowSub', 'chain']) {
    for (let i = 0; i < 3000; i++) check(Q.makeQuestion(kind, random));
  }
});

test('炮台选项：个数够、不重复、答案在里面、都在 0–20 之间', () => {
  const random = seeded(11);
  for (const kind of ['add5', 'add10', 'sub10', 'cmp10', 'make10', 'carryAdd', 'borrowSub', 'chain']) {
    for (const count of [2, 3, 4]) {
      for (let i = 0; i < 800; i++) {
        const q = Q.makeQuestion(kind, random);
        const choices = Q.makeChoices(q, count, random);
        assert.ok(choices.includes(q.answer), q.prompt);
        assert.equal(new Set(choices).size, choices.length, `${q.prompt} 选项重复 ${choices}`);
        if (kind === 'cmp10') {
          assert.deepEqual(choices, ['<', '=', '>']);
        } else {
          assert.equal(choices.length, count, q.prompt);
          assert.ok(choices.every((c) => Number.isInteger(c) && c >= 0 && c <= 20), `${q.prompt}：${choices}`);
        }
      }
    }
  }
});

test('干扰项是典型错误：差 1、差 2 或算式里常见的算错', () => {
  const random = seeded(3);
  let typicalHits = 0, total = 0;
  for (const kind of ['add10', 'sub10', 'carryAdd', 'borrowSub', 'make10', 'chain']) {
    for (let i = 0; i < 500; i++) {
      const q = Q.makeQuestion(kind, random);
      for (const c of Q.makeChoices(q, 3, random)) {
        if (c === q.answer) continue;
        total++;
        if (Math.abs(c - q.answer) <= 2 || q.alts.includes(c)) typicalHits++;
      }
    }
  }
  assert.ok(typicalHits / total > 0.95, `典型干扰项只占 ${Math.round((typicalHits / total) * 100)}%`);
  // 退位减法最常见的错：个位大数减小数（13 − 5 算成 12）
  assert.deepEqual(Q.GENERATORS.borrowSub(() => 0.2).alts.length, 2);
  const q = { kind: 'borrowSub', prompt: '13 − 5 = ?', answer: 8, alts: [12, 18] };
  assert.ok(Q.makeChoices(q, 3, seeded(1)).includes(12));
});

test('比大小三种答案都会出现', () => {
  const random = seeded(5);
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(Q.makeQuestion('cmp10', random).answer);
  assert.deepEqual([...seen].sort(), ['<', '=', '>']);
});

test('关卡数据：10 关，第 5、10 关是 Boss，题型和怪物都对得上', () => {
  const w = WORLDS[0];
  assert.equal(w.levels.length, 10);
  assert.ok(w.levels[4].boss && w.levels[9].boss);
  assert.equal(w.levels.filter((L) => L.boss).length, 2);
  for (const L of w.levels) {
    assert.ok(L.kinds.length && L.kinds.every((k) => Q.GENERATORS[k] && MONSTERS[k] && KIND_NAMES[k]), L.name);
    assert.ok(L.goal > 0 && L.walk > 0 && L.options >= 2 && L.options <= 4, L.name);
    if (L.boss) assert.ok(MONSTERS[L.boss.kind].boss && L.boss.chain === 3, L.name);
  }
  assert.deepEqual(WORLDS.map((x) => x.grade), [1, 2, 3, 4, 5, 6]);
  assert.ok(WORLDS.every((x) => !x.locked && x.levels.length === 10));
  const nonBossLevels = WORLDS.flatMap((x) => x.levels.filter((L) => !L.boss));
  assert.equal(new Set(nonBossLevels.map((L) => L.kinds[0])).size, nonBossLevels.length);
  for (const L of nonBossLevels) {
    const k = L.kinds[0];
    assert.ok(Q.GENERATORS[k] && MONSTERS[k] && KIND_NAMES[k], L.name);
  }
  for (const L of WORLDS.slice(1).flatMap((x) => x.levels.filter((l) => !l.boss))) {
    assert.equal(KIND_NAMES[L.kinds[0]], L.name);
  }
  const looks = Object.values(MONSTERS).map((m) => `${m.shape}|${m.color}|${m.belly || ''}|${m.eyes || ''}|${m.horn || ''}`);
  assert.equal(new Set(looks).size, looks.length);
});

test('存档清洗：坏数据回到默认值，图鉴只记正数', () => {
  const s = fillSave({ grade: 0, coins: 'x', levels: { '1-1': { stars: 9, fails: -1 }, '<b>': {} }, monsters: { add5: 3, chain: -2, '<img>': 5 } });
  assert.equal(s.grade, 1);
  assert.equal(s.coins, 0);
  assert.deepEqual(s.levels, { '1-1': { stars: 3, fails: 0, skipped: false } });
  assert.deepEqual(s.monsters, { add5: 3 });
  assert.ok(isUnlocked(s, 1, 2) && !isUnlocked(s, 1, 3));
  assert.deepEqual(fillSave(null), fillSave('bad'));
});
