'use strict';
// ===== 口算题生成器：纯函数，答案、范围和干扰项都由 tests/questions.test.mjs 自动校验 =====

const MAX_NUMBER = 20; // 一年级只出 20 以内的数
const COMPARE_CHOICES = ['<', '=', '>']; // 比大小三个炮台位置固定，孩子好记

const randInt = (lo, hi, random) => lo + Math.floor(random() * (hi - lo + 1));
function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 每道题：kind 题型，prompt 显示的算式，answer 答案，alts 孩子最常见的算错结果（优先当干扰项）
function addQ(kind, a, b, alts = [Math.abs(a - b)]) {
  return { kind, prompt: `${a} + ${b} = ?`, answer: a + b, alts };
}
function subQ(kind, a, b, alts = [a + b]) {
  return { kind, prompt: `${a} − ${b} = ?`, answer: a - b, alts };
}

const GENERATORS = {
  // 5 以内加法
  add5(random) {
    const a = randInt(1, 4, random);
    return addQ('add5', a, randInt(1, 5 - a, random));
  },
  // 10 以内加法
  add10(random) {
    const a = randInt(1, 9, random);
    return addQ('add10', a, randInt(1, 10 - a, random));
  },
  // 10 以内减法（可以减到 0）
  sub10(random) {
    const a = randInt(2, 10, random);
    return subQ('sub10', a, randInt(1, a, random));
  },
  // 比大小：10 以内的加减算式和一个数比
  cmp10(random) {
    const plus = random() < 0.5;
    const a = randInt(1, plus ? 9 : 10, random);
    const b = plus ? randInt(1, 10 - a, random) : randInt(1, a, random);
    const value = plus ? a + b : a - b;
    let c = value;
    if (random() >= 1 / 3) {
      const near = [1, 2, 3, -1, -2, -3].map((d) => value + d).filter((n) => n >= 0 && n <= 10);
      c = near[Math.floor(random() * near.length)];
    }
    return {
      kind: 'cmp10',
      prompt: `${a} ${plus ? '+' : '−'} ${b} ○ ${c}`,
      answer: value > c ? '>' : value < c ? '<' : '=',
      alts: [],
    };
  },
  // 凑十：几和几凑成 10
  make10(random) {
    const a = randInt(1, 9, random);
    return { kind: 'make10', prompt: `${a} + □ = 10`, answer: 10 - a, alts: [a, 10 + a] };
  },
  // 20 以内进位加法：个位相加满十
  carryAdd(random) {
    const a = randInt(2, 9, random);
    const b = randInt(Math.max(2, 11 - a), 9, random);
    return addQ('carryAdd', a, b, [a + b - 10, a + b + 10]); // 忘了进位 / 进位进多了
  },
  // 20 以内退位减法：个位不够减
  borrowSub(random) {
    const a = randInt(11, 18, random);
    const ones = a - 10;
    const b = randInt(ones + 1, 9, random);
    return subQ('borrowSub', a, b, [10 + b - ones, a - b + 10]); // 个位大减小 / 忘了退位
  },
  // 连加连减：三个数，每一步都在 0–20 之间
  chain(random) {
    for (;;) {
      const nums = [randInt(1, 10, random), randInt(1, 10, random), randInt(1, 10, random)];
      const ops = [random() < 0.5 ? '+' : '−', random() < 0.5 ? '+' : '−'];
      const step = (x, op, y) => (op === '+' ? x + y : x - y);
      const mid = step(nums[0], ops[0], nums[1]);
      const end = step(mid, ops[1], nums[2]);
      if (mid < 0 || mid > MAX_NUMBER || end < 0 || end > MAX_NUMBER) continue;
      const flip = step(mid, ops[1] === '+' ? '−' : '+', nums[2]); // 最后一步看错符号
      return {
        kind: 'chain',
        prompt: `${nums[0]} ${ops[0]} ${nums[1]} ${ops[1]} ${nums[2]} = ?`,
        answer: end,
        alts: [flip],
      };
    }
  },
};


// 高年级按题目自身的数域出干扰项；小数用整数缩放计算，分数约分后显示。
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const fraction = (n, d) => { const g = gcd(n, d); return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`; };
const fixed = (n) => Number(n.toFixed(4));
const advanced = (kind, prompt, answer, alts = []) => ({ kind, prompt: `${prompt} = ?`, answer, alts, max: Math.max(100, Number(answer) * 2 + 20), step: Number.isInteger(answer) ? 1 : 0.1 });
const binary = (kind, op, lo, hi, factor = 1) => {
  GENERATORS[kind] = (r) => {
    let a = randInt(lo, hi, r), b = randInt(lo, hi, r);
    if (op === '−' && a < b) [a, b] = [b, a];
    const answer = op === '+' ? (a + b) / factor : op === '−' ? (a - b) / factor : op === '×' ? a * b / (factor * factor) : a / factor;
    if (op === '÷') a *= b;
    return advanced(kind, `${a / factor} ${op} ${b / (op === '÷' ? 1 : factor)}`, fixed(answer));
  };
};
binary('add100', '+', 10, 49); binary('sub100', '−', 10, 99);
binary('mul9', '×', 2, 9); binary('div9', '÷', 2, 9);
binary('add1000', '+', 100, 499); binary('sub1000', '−', 100, 999);
binary('mulSmall', '×', 11, 19); binary('divSmall', '÷', 11, 19);
binary('addLarge', '+', 1000, 4999); binary('subLarge', '−', 1000, 9999);
binary('mulLarge', '×', 20, 99); binary('divLarge', '÷', 20, 99);
binary('decimalAdd', '+', 1, 99, 10); binary('decimalSub', '−', 1, 99, 10);
binary('decimalMul', '×', 1, 99, 10); binary('decimalDiv', '÷', 1, 99, 10);
GENERATORS.mixed = r => { const a = randInt(2, 9, r), b = randInt(2, 9, r), c = randInt(1, 20, r); return advanced('mixed', `${a} × ${b} + ${c}`, a * b + c); };
GENERATORS.brackets = r => { const a = randInt(2, 9, r), b = randInt(2, 9, r), c = randInt(2, 9, r); return advanced('brackets', `(${a} + ${b}) × ${c}`, (a + b) * c); };
GENERATORS.remainder = r => { const b = randInt(2, 9, r), q = randInt(2, 9, r), rem = randInt(1, b - 1, r); return { ...advanced('remainder', `${b * q + rem} ÷ ${b} 的余数`, rem), max: 9 }; };
GENERATORS.missing = r => { const a = randInt(2, 9, r), b = randInt(2, 9, r); return { ...advanced('missing', `${a} × □`, b), prompt: `${a} × □ = ${a * b}` }; };
GENERATORS.times10 = r => { const a = randInt(1, 999, r), b = [10, 100, 1000][randInt(0, 2, r)]; return advanced('times10', `${a} × ${b}`, a * b); };
GENERATORS.average = r => { const a = randInt(10, 50, r), d = randInt(1, 9, r); return advanced('average', `${a - d}、${a}、${a + d}的平均数`, a); };
GENERATORS.distribute = r => { const a = randInt(2, 9, r), b = randInt(2, 9, r); return advanced('distribute', `${a} × ${b} + ${a} × ${10 - b}`, a * 10); };
GENERATORS.area = r => { const a = randInt(3, 20, r), b = randInt(2, 12, r); return advanced('area', `长${a}宽${b}的长方形面积`, a * b); };
GENERATORS.perimeter = r => { const a = randInt(3, 20, r), b = randInt(2, 12, r); return advanced('perimeter', `长${a}宽${b}的长方形周长`, (a + b) * 2); };
GENERATORS.factor = r => { const a = randInt(2, 12, r), b = randInt(2, 12, r); return advanced('factor', `${a}和${b}的最大公因数`, gcd(a, b)); };
GENERATORS.multiple = r => { const a = randInt(2, 12, r), b = randInt(2, 12, r); return advanced('multiple', `${a}和${b}的最小公倍数`, a * b / gcd(a, b)); };
GENERATORS.shiftDecimal = r => { const a = randInt(1, 999, r); return advanced('shiftDecimal', `${a / 100} × 100`, a); };
GENERATORS.triangle = r => { const a = randInt(2, 10, r) * 2, h = randInt(2, 15, r); return advanced('triangle', `底${a}高${h}的三角形面积`, a * h / 2); };
for (const [kind, op] of [['fractionAdd', '+'], ['fractionSub', '−'], ['fractionMul', '×'], ['fractionDiv', '÷']]) {
  GENERATORS[kind] = r => {
    const d = randInt(2, 9, r), e = randInt(2, 9, r);
    let a = randInt(1, d - 1, r), b = randInt(1, e - 1, r);
    let x = [a, d], y = [b, e];
    if (op === '−' && a * e < b * d) [x, y] = [y, x];
    [a, b] = [x[0], y[0]];
    const n = op === '+' ? a * y[1] + b * x[1] : op === '−' ? a * y[1] - b * x[1] : op === '×' ? a * b : a * y[1];
    const den = op === '÷' ? x[1] * b : x[1] * y[1];
    const answer = fraction(n, den);
    return { kind, prompt: `${fraction(...x)} ${op} ${fraction(...y)} = ?`, answer,
      alts: [1, 2, 3, 4].map(k => fraction(n + k, den)), choiceValues: true };
  };
}
GENERATORS.percent = r => { const a = randInt(1, 20, r) * 10, p = randInt(1, 9, r) * 10; return advanced('percent', `${a}的${p}%`, a * p / 100); };
GENERATORS.ratio = r => { const a = randInt(1, 9, r), b = randInt(1, 9, r), k = randInt(2, 10, r); return { ...advanced('ratio', '', a * k), prompt: `□ : ${b * k} = ${a} : ${b}` }; };
GENERATORS.volume = r => { const a = randInt(2, 9, r), b = randInt(2, 9, r), c = randInt(2, 9, r); return advanced('volume', `长${a}宽${b}高${c}的长方体体积`, a * b * c); };
GENERATORS.equation = r => { const a = randInt(2, 9, r), x = randInt(2, 20, r), b = randInt(1, 20, r); return { ...advanced('equation', '', x), prompt: `${a}x + ${b} = ${a * x + b}，x = ?` }; };

function makeQuestion(kind, random = Math.random) {
  return GENERATORS[kind](random);
}

// 炮台上的选项：答案 + 典型错误（先用 alts，再用差 1、差 2），都在 0–20 之间且不重复
function makeChoices(q, count, random = Math.random) {
  if (q.choiceValues) return shuffle([q.answer, ...shuffle([...new Set(q.alts)].filter(v => v !== q.answer), random).slice(0, count - 1)], random);
  if (typeof q.answer === 'string') return [...COMPARE_CHOICES];
  const a = q.answer;
  const ok = (n) => Number.isFinite(n) && n >= 0 && n <= (q.max || MAX_NUMBER) && n !== a;
  const typical = [...shuffle(q.alts, random), ...shuffle([a + 1, a - 1, a + 2, a - 2], random)];
  const fallback = [a + 3, a - 3, a + 4, a - 4, a + 5, a - 5, a + 6, a - 6];
  const picks = [];
  for (const raw of [...typical, ...fallback]) {
    const n = fixed(a + (raw - a) * (q.step || 1));
    if (picks.length >= count - 1) break;
    if (ok(n) && !picks.includes(n)) picks.push(n);
  }
  return shuffle([a, ...picks], random);
}

if (typeof module === 'object') {
  module.exports = { MAX_NUMBER, COMPARE_CHOICES, GENERATORS, makeQuestion, makeChoices, shuffle };
}
