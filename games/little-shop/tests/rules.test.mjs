import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const M = require('../js/money.js');
const D = require('../js/data.js');
const T = require('../js/tasks.js');
const { WORLDS } = require('../js/levels.js');
const S = require('../js/save.js');

test('钱的写法和加法：金额用角做单位', () => {
  assert.equal(M.formatMoney(0), '0元');
  assert.equal(M.formatMoney(7), '7角');
  assert.equal(M.formatMoney(30), '3元');
  assert.equal(M.formatMoney(15), '1元5角');
  assert.equal(M.formatMoney(205), '20元5角');
  assert.equal(M.sumMoney(['y10', 'y5', 'j5', 'j1']), 156);
});

test('凑钱：张数最少、从大到小，凑不出返回 null', () => {
  assert.deepEqual(M.makeChange(80, ['y1', 'y5', 'y10']), ['y5', 'y1', 'y1', 'y1']);
  assert.deepEqual(M.makeChange(37, ['y1', 'j5', 'j1']), ['y1', 'y1', 'y1', 'j5', 'j1', 'j1']);
  assert.deepEqual(M.makeChange(0, ['y1']), []);
  assert.equal(M.makeChange(5, ['y1']), null);
  assert.equal(M.makeChange(-1, ['y1']), null);
});

// 每关、每种题型各出 300 道（固定种子），标准答案必须判对，题目数值不出范围
test('每关的每种题：标准答案判对，价钱、找零、选项都在范围里', () => {
  const r = T.makeRng(20261023);
  for (const L of WORLDS[0].levels) {
    for (const type of new Set(L.types)) {
      for (const options of [L.options || 3, 2]) {
        const spec = { ...L.specs[type], options };
        for (let i = 0; i < 300; i++) {
          const t = T.makeTask(type, spec, r);
          const sol = T.solveTask(t);
          assert.ok(T.checkAnswer(t, sol), `${L.name} ${type}: 标准答案判错 ${JSON.stringify(t)}`);
          assert.ok(t.ask && !/undefined|NaN/.test(t.ask), `${L.name} ${type}: 题目文字 ${t.ask}`);
          if (type === 'count') assert.ok(t.n >= (spec.min || 1) && t.n <= spec.max);
          if (type === 'pay') {
            assert.ok(t.price >= spec.prices[0] && t.price <= spec.prices[1] && t.price % spec.step === 0, `${L.name} 价钱 ${t.price}`);
            assert.ok(sol.every((m) => spec.allowed.includes(m)));
          }
          if (type === 'change') {
            const given = M.MONEY[t.given].value;
            assert.ok(spec.given.includes(t.given));
            assert.ok(t.price > 0 && t.price < given, `${L.name} 找零：${t.price} / ${given}`);
            assert.equal(t.target, given - t.price);
          }
          if (type === 'exchange') {
            assert.ok(t.allowed.every((m) => M.MONEY[m].value < t.target), '换零钱不能用同样大的钱');
          }
          if (type === 'pick' || type === 'clock') {
            const answer = type === 'pick' ? t.target : t.key;
            assert.ok(t.choices.includes(answer));
            assert.equal(new Set(t.choices).size, t.choices.length, `${L.name} ${type} 选项重复`);
            assert.ok(t.choices.length >= 2 && t.choices.length <= options);
          }
          if (type === 'clock') {
            assert.ok(t.h >= 1 && t.h <= 12);
            if (!spec.half) assert.equal(t.half, false);
            for (const k of t.choices) assert.match(k, /^(1[0-2]|[1-9]):(00|30)$/);
          }
        }
      }
    }
  }
});

test('答错的提示说清楚差在哪里', () => {
  const count = T.makeTask('count', { n: 4 });
  assert.equal(T.checkAnswer(count, 3), false);
  assert.equal(T.hintText(count, 3), `还少 1 ${count.item.unit}哦！`);
  assert.equal(T.hintText(count, 6), `多了 2 ${count.item.unit}哦！`);
  assert.equal(T.hintText(count, 0), '篮子还是空的呀！');
  const pay = { type: 'pay', target: 70, allowed: ['y1', 'y5'] };
  assert.equal(T.hintText(pay, ['y5']), '还差 2元 哦！');
  assert.equal(T.hintText(pay, ['y5', 'y5']), '多了 3元 哦！');
  assert.equal(T.hintText(pay, []), '还没放钱呢！');
  assert.equal(T.checkAnswer(pay, ['y5', 'y1', 'y1']), true);
  assert.equal(T.checkAnswer(pay, ['y5', 'j5', 'j5', 'y1']), false, '不在钱包里的钱不能用');
});

test('钟表题：半点的干扰项先放最容易看错的', () => {
  const r = T.makeRng(7);
  let sawHalf = false;
  for (let i = 0; i < 200; i++) {
    const t = T.makeTask('clock', { half: true, options: 3 }, r);
    if (!t.half) continue;
    sawHalf = true;
    // 8时半常被看成 9时半：短针已经过了 8
    assert.ok(t.choices.includes(T.clockKey((t.h % 12) + 1, true)), JSON.stringify(t));
  }
  assert.ok(sawHalf);
  assert.equal(T.clockLabel(8, true), '8时半');
  assert.deepEqual(T.clockTime('12:30'), { h: 12, half: true });
});

test('关卡数据：10 关，第 5、10 关是 Boss，题型都有出题范围', () => {
  const w = WORLDS[0];
  assert.equal(w.levels.length, 10);
  assert.ok(w.levels[4].boss && w.levels[9].boss);
  for (const L of w.levels) for (const type of L.types) assert.ok(L.specs[type], `${L.name} 缺 ${type}`);
  assert.ok(WORLDS.every(x => !x.locked && x.levels.length === 10));
});

test('存档清洗：坏数据回到默认值，没买的装修换不上', () => {
  const s = S.fillSave({
    grade: 0, coins: 1e9, levels: { '1-1': { stars: 9, fails: -2 }, '1-2': { skipped: true }, x: {} },
    friends: { rabbit: 3, dragon: 5, bear: -1 }, money: { y1: true, j5: 'yes', zz: true },
    decor: { owned: ['hat:crown', 'hat:nope', 'bad', 7, 'hat:crown'], hat: 'crown', awning: 'rainbow', sign: 'wood' },
  });
  assert.equal(s.grade, 1);
  assert.equal(s.coins, 999999);
  assert.deepEqual(s.levels, { '1-1': { stars: 3, fails: 0, skipped: false }, '1-2': { stars: 0, fails: 0, skipped: true } });
  assert.deepEqual(s.friends, { rabbit: 3 });
  assert.deepEqual(s.money, { y1: true });
  assert.deepEqual(s.decor.owned, ['hat:crown']);
  assert.equal(s.decor.hat, 'crown');
  assert.equal(s.decor.awning, 'red', '没买彩虹遮阳棚');
  assert.ok(S.isUnlocked(s, 1, 3), '跳过的关也能解锁下一关');
  assert.ok(!S.isUnlocked(s, 1, 4));
  assert.deepEqual(S.fillSave(null), S.defaultSave());
  for (const slot of D.DECOR_SLOTS) assert.equal(D.DECOR[slot].items[0].price, 0, `${slot} 第一个是免费的`);
});

test('二至六年级经营题可解，干扰项不同且已学题型全部覆盖', () => {
  for (const w of WORLDS.slice(1)) for (const L of w.levels) {
    for (const topic of L.topics || [L.specs.calc.topic]) for (let i = 0; i < 50; i++) {
      const t = T.makeTask('calc', { topic, options: 4 });
      assert.ok(T.checkAnswer(t, T.solveTask(t)), `${w.grade} ${topic}`);
      assert.equal(t.choices.length, 4);
      assert.equal(new Set(t.choices).size, 4);
      assert.ok(t.choices.includes(T.solveTask(t)));
      for (const c of t.choices) if (c !== T.solveTask(t)) assert.ok(!T.checkAnswer(t, c));
      assert.ok(t.ask && t.unit && T.hintText(t, '999'));
    }
  }
});
