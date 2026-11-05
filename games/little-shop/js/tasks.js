'use strict';
// ===== 出题：每种题都是纯函数；checkAnswer 判对错，solveTask 给标准答案（tests 覆盖）=====
// 浏览器里顶层 const 是全局词法绑定，不能重名，所以依赖放进 TM / TD 两个新名字里

const TM = typeof module === 'object' ? require('./money.js') : { MONEY, formatMoney, sumMoney, makeChange };
const TD = typeof module === 'object' ? require('./data.js') : { ITEMS };

const TYPE_NAMES = { count: '装货', pick: '认钱币', pay: '收钱', change: '找零钱', exchange: '换零钱', clock: '看钟表', calc: '经营计算' };
const MONEY_TYPES = ['pay', 'change', 'exchange'];
const CLOCK_ASKS = ['现在几时啦？我要赶回家吃饭。', '看看墙上的钟，现在是几时？', '小店的钟走到几时啦？'];

// 可复现的随机数（测试用固定种子）
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickOne = (r, arr) => arr[Math.min(arr.length - 1, Math.floor(r() * arr.length))];
const randInt = (r, min, max) => min + Math.min(max - min, Math.floor(r() * (max - min + 1)));
function shuffle(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 在 [min, max] 里按 step 取一个价钱，ok(price) 不成立的不要（比如凑不出、找不开）
function pickPrice(r, [min, max], step, ok) {
  const list = [];
  for (let p = Math.ceil(min / step) * step; p <= max; p += step) if (p > 0 && ok(p)) list.push(p);
  if (!list.length) throw new Error(`价钱范围 ${min}-${max} 里没有可用的价钱`);
  return pickOne(r, list);
}

const clockKey = (h, half) => `${h}:${half ? '30' : '00'}`;
const clockLabel = (h, half) => (half ? `${h}时半` : `${h}时`);
const clockTime = (key) => {
  const [h, m] = key.split(':').map(Number);
  return { h, half: m === 30 };
};


// 金额用整数分或角计算后显示，避免浮点误差影响判分。
const shopProblem = (ask, answer, unit, explanation) => ({ ask, answer: Math.round(answer * 100) / 100, unit, explanation });
const SHOP_PROBLEMS = {
  total(r) { const p = randInt(r, 2, 9), n = randInt(r, 2, 9); return shopProblem(`每袋饼干${p}元，买${n}袋一共多少元？`, p * n, '元', `单价 × 数量：${p} × ${n}。`); },
  share(r) { const n = randInt(r, 2, 9), k = randInt(r, 2, 9); return shopProblem(`${n * k}个苹果平均装${n}袋，每袋几个？`, k, '个', `总数 ÷ 袋数：${n * k} ÷ ${n}。`); },
  remain(r) { const n = randInt(r, 2, 9), k = randInt(r, 2, 9), rest = randInt(r, 1, n - 1); return shopProblem(`${n * k + rest}块糖，每袋${n}块，装完还剩几块？`, rest, '块', `先算装了${k}袋，再减去${n * k}块。`); },
  elapsed(r) { const h = randInt(r, 8, 16), m = randInt(r, 1, 5) * 10; return shopProblem(`小店${h}:00开门，${h}:` + String(m).padStart(2,'0') + '开始配送，经过几分钟？', m, '分钟', '同一小时内，用结束分钟减开始分钟。'); },
  later(r) { const h = randInt(r, 8, 16), d = randInt(r, 1, 4); return shopProblem(`${h}时出发，送货需要${d}小时，几时到？`, h + d, '时', '到达时刻 = 出发时刻 + 经过时间。'); },
  stock(r) { const a = randInt(r, 20, 50), b = randInt(r, 10, 30); return shopProblem(`原有${a}盒牛奶，又进${b}盒，共有几盒？`, a + b, '盒', '原有数量加上新进数量。'); },
  sold(r) { const a = randInt(r, 50, 99), b = randInt(r, 10, 40); return shopProblem(`进货${a}盒，卖出${b}盒，还剩几盒？`, a - b, '盒', '进货数量减去售出数量。'); },
  twice(r) { const a = randInt(r, 2, 9), b = randInt(r, 2, 5); return shopProblem(`红糖有${a}袋，白糖是它的${b}倍，白糖几袋？`, a * b, '袋', '求一个数的几倍用乘法。'); },
  decimalTotal(r) { const p = randInt(r, 11, 49), n = randInt(r, 2, 5); return shopProblem(`果汁每瓶${p / 10}元，${n}瓶多少元？`, p * n / 10, '元', `先按角计算：${p} × ${n}，再换成元。`); },
  decimalChange(r) { const p = randInt(r, 11, 89); return shopProblem(`一支笔${p / 10}元，付10元找回多少元？`, (100 - p) / 10, '元', '付出的钱减去价钱。'); },
  grams(r) { const n = randInt(r, 1, 9); return shopProblem(`${n}千克大米是多少克？`, n * 1000, '克', '1千克 = 1000克。'); },
  metres(r) { const n = randInt(r, 2, 9); return shopProblem(`${n}米包装带是多少厘米？`, n * 100, '厘米', '1米 = 100厘米。'); },
  perimeter(r) { const a = randInt(r, 3, 12), b = randInt(r, 2, 8); return shopProblem(`长方形柜台长${a}米宽${b}米，周长多少米？`, (a + b) * 2, '米', '周长 = (长 + 宽) × 2。'); },
  area(r) { const a = randInt(r, 3, 12), b = randInt(r, 2, 8); return shopProblem(`长方形店面长${a}米宽${b}米，面积多少平方米？`, a * b, '平方米', '长方形面积 = 长 × 宽。'); },
  minutes(r) { const h = randInt(r, 1, 5); return shopProblem(`营业${h}小时，合多少分钟？`, h * 60, '分钟', '1小时 = 60分钟。'); },
  transport(r) { const v = randInt(r, 3, 8) * 10, t = randInt(r, 2, 5); return shopProblem(`货车每小时行${v}千米，${t}小时行多少千米？`, v * t, '千米', '路程 = 速度 × 时间。'); },
  budget(r) { const a = randInt(r, 10, 30), n = randInt(r, 2, 9), b = (a * n + 100); return shopProblem(`预算${b}元，每箱${a}元买${n}箱，还剩多少元？`, b - a * n, '元', '先乘法算总价，再用预算减总价。'); },
  boxes(r) { const n = randInt(r, 12, 30), k = randInt(r, 5, 20); return shopProblem(`${n * k}瓶牛奶每箱${n}瓶，一共几箱？`, k, '箱', '总瓶数 ÷ 每箱瓶数。'); },
  average(r) { const a = randInt(r, 20, 60), d = randInt(r, 2, 10); return shopProblem(`三天卖${a - d}、${a}、${a + d}盒，平均每天几盒？`, a, '盒', '三天数量相加，再除以3。'); },
  wholesale(r) { const p = randInt(r, 11, 49), n = randInt(r, 10, 30); return shopProblem(`每件${p / 10}元，进货${n}件要多少元？`, p * n / 10, '元', '单价乘数量，注意小数点。'); },
  unitPrice(r) { const p = randInt(r, 11, 49), n = randInt(r, 2, 8); return shopProblem(`${n}件商品共${p * n / 10}元，每件多少元？`, p / 10, '元', '总价 ÷ 数量 = 单价。'); },
  profit(r) { const cost = randInt(r, 11, 49), add = randInt(r, 2, 15), n = randInt(r, 2, 9); return shopProblem(`每件进价${cost / 10}元，售价${(cost + add) / 10}元，卖${n}件赚多少元？`, add * n / 10, '元', '先算每件售价减进价，再乘件数。'); },
  litres(r) { const a = randInt(r, 1, 19); return shopProblem(`${a / 10}升果汁是多少毫升？`, a * 100, '毫升', '1升 = 1000毫升。'); },
  fractionStock(r) { const d = randInt(r, 2, 8), n = randInt(r, 2, 15), a = randInt(r, 1, d - 1); return shopProblem(`${d * n}箱水果卖出${a}/${d}，卖了多少箱？`, a * n, '箱', '总量先除以分母，再乘分子。'); },
  discount(r) { const p = randInt(r, 2, 20) * 10, d = randInt(r, 5, 9); return shopProblem(`原价${p}元，打${d}折，现价多少元？`, p * d / 10, '元', `打${d}折就是按原价的${d * 10}%付款。`); },
  percent(r) { const p = randInt(r, 2, 20) * 10, rate = randInt(r, 1, 9) * 10; return shopProblem(`${p}件商品卖出了${rate}%，卖了几件？`, p * rate / 100, '件', '总量 × 百分率。'); },
  tax(r) { const p = randInt(r, 2, 20) * 100, rate = randInt(r, 1, 5); return shopProblem(`练习情境：收入${p}元，按${rate}%计算费用，应付多少元？`, p * rate / 100, '元', '费用 = 收入 × 给定费率。'); },
  ratio(r) { const a = randInt(r, 1, 5), b = randInt(r, 2, 5), k = randInt(r, 2, 10); return shopProblem(`红黄糖共${(a + b) * k}块，数量比${a}:${b}，红糖几块？`, a * k, '块', '先除以总份数，再乘红糖份数。'); },
  increase(r) { const p = randInt(r, 2, 20) * 10, rate = randInt(r, 1, 5) * 10; return shopProblem(`上周卖${p}盒，本周增加${rate}%，本周几盒？`, p * (100 + rate) / 100, '盒', '本周数量 = 上周数量 × (1 + 增长率)。'); },
  volume(r) { const a = randInt(r, 2, 9), b = randInt(r, 2, 9), c = randInt(r, 2, 9); return shopProblem(`箱子长${a}分米宽${b}分米高${c}分米，容积几立方分米？`, a * b * c, '立方分米', '长方体体积 = 长 × 宽 × 高。'); },
};
let taskSeq = 0;
function makeTask(type, spec, r = Math.random) {
  const id = ++taskSeq;
  const item = pickOne(r, TD.ITEMS);
  const label = (m) => TM.MONEY[m].label;
  if (type === 'calc') {
    const { ask, answer, unit, explanation } = SHOP_PROBLEMS[spec.topic](r);
    const values = [...new Set([answer, ...[1, -1, 2, -2, 5, 10].map(d => Math.round((answer + d) * 100) / 100).filter(v => v >= 0)])].slice(0, spec.options || 4);
    return { id, type, topic: spec.topic, ask, target: String(answer), choices: shuffle(r, values.map(String)), unit, explanation };
  }
  if (type === 'count') {
    const n = spec.n || randInt(r, spec.min || 1, spec.max);
    return { id, type, item, n, ask: `我要 ${n} ${item.unit}${item.name}！` };
  }
  if (type === 'pick') {
    const target = pickOne(r, spec.targets || spec.pool);
    const others = shuffle(r, spec.pool.filter((m) => m !== target));
    const choices = shuffle(r, [target, ...others.slice(0, Math.max(1, (spec.options || 3) - 1))]);
    const m = TM.MONEY[target];
    return { id, type, target, choices, ask: m.kind === 'coin' ? `请给我一个 ${m.label} 的硬币！` : `请给我一张 ${m.label}！` };
  }
  if (type === 'pay') {
    const price = pickPrice(r, spec.prices, spec.step, (p) => TM.makeChange(p, spec.allowed));
    return { id, type, item, price, target: price, allowed: spec.allowed, ask: `${item.name}卖 ${TM.formatMoney(price)}，从我的钱包里拿钱吧！` };
  }
  if (type === 'change') {
    const given = pickOne(r, spec.given);
    const g = TM.MONEY[given].value;
    const price = pickPrice(r, [spec.prices[0], Math.min(spec.prices[1], g - spec.step)], spec.step, (p) => TM.makeChange(g - p, spec.allowed));
    return { id, type, item, price, given, target: g - price, allowed: spec.allowed, ask: `${item.name}卖 ${TM.formatMoney(price)}，我给你 ${label(given)}，请找我钱！` };
  }
  if (type === 'exchange') {
    const from = pickOne(r, spec.from);
    const target = TM.MONEY[from].value;
    const allowed = spec.allowed.filter((m) => TM.MONEY[m].value < target);
    const allJiao = allowed.every((m) => TM.MONEY[m].value < 10);
    return { id, type, from, target, allowed, ask: `帮我把 ${label(from)} 换成${allJiao ? '角' : '零钱'}吧！` };
  }
  if (type === 'clock') {
    const h = randInt(r, 1, 12);
    const half = !!spec.half && r() < 0.5;
    const next = (h % 12) + 1;
    const prev = ((h + 10) % 12) + 1;
    // 干扰项先放最容易弄混的：8时半常被看成 9时半（短针已经过了 8）
    let pool = [[next, false], [prev, false]];
    if (spec.half) pool = half ? [[next, true], [h, false], [prev, true], [next, false]] : [[h, true], [next, false], [prev, true], [prev, false]];
    const wrongs = pool.map(([x, y]) => clockKey(x, y)).filter((k, i, a) => k !== clockKey(h, half) && a.indexOf(k) === i);
    const choices = shuffle(r, [clockKey(h, half), ...wrongs.slice(0, Math.max(1, (spec.options || 3) - 1))]);
    return { id, type, h, half, key: clockKey(h, half), choices, ask: pickOne(r, CLOCK_ASKS) };
  }
  throw new Error(`不认识的题型 ${type}`);
}

function checkAnswer(task, ans) {
  if (task.type === 'calc') return String(ans) === task.target;
  if (task.type === 'count') return ans === task.n;
  if (task.type === 'pick') return ans === task.target;
  if (task.type === 'clock') return ans === task.key;
  return Array.isArray(ans) && ans.every((m) => task.allowed.includes(m)) && TM.sumMoney(ans) === task.target;
}

function solveTask(task) {
  if (task.type === 'calc') return task.target;
  if (task.type === 'count') return task.n;
  if (task.type === 'pick') return task.target;
  if (task.type === 'clock') return task.key;
  return TM.makeChange(task.target, task.allowed);
}

// 答错时顾客说的话：告诉孩子差在哪里，而不是只说"错了"
function hintText(task, ans) {
  if (task.type === 'calc') return task.explanation;
  if (task.type === 'count') {
    if (!ans) return '篮子还是空的呀！';
    const d = task.n - ans;
    return d > 0 ? `还少 ${d} ${task.item.unit}哦！` : `多了 ${-d} ${task.item.unit}哦！`;
  }
  if (task.type === 'pick') return `这是 ${TM.MONEY[ans].label}，我要的是 ${TM.MONEY[task.target].label}。`;
  if (task.type === 'clock') return `先看短针指着几～长针指着 ${task.half ? '6 是半时' : '12 是整时'}。`;
  const sum = TM.sumMoney(ans);
  if (!sum) return '还没放钱呢！';
  const d = task.target - sum;
  return d > 0 ? `还差 ${TM.formatMoney(d)} 哦！` : `多了 ${TM.formatMoney(-d)} 哦！`;
}

if (typeof module === 'object') {
  module.exports = { TYPE_NAMES, MONEY_TYPES, makeRng, makeTask, checkAnswer, solveTask, hintText, clockKey, clockLabel, clockTime };
}
