'use strict';
// ===== 关卡和怪物数据（来自 docs/02-关卡设计.md 世界 1）=====
// walk：怪物从右边走到城堡门口要几秒；gap：多久来一只；maxOn：同屏最多几只；goal：答对几题过关

const KIND_NAMES = {
  add5: '5 以内加法', add10: '10 以内加法', sub10: '10 以内减法', cmp10: '比大小',
  make10: '凑十', carryAdd: '20 以内进位加法', borrowSub: '20 以内退位减法', chain: '连加连减',
};

// 每种题型由一种捣蛋小怪物举着；shape 决定画法
const MONSTERS = {
  add5: { name: '小糖豆', shape: 'bean', color: '#ff9ec4', desc: '圆滚滚的小糖豆，最喜欢数到 5。' },
  add10: { name: '果冻宝宝', shape: 'jelly', color: '#7fd6a4', desc: '走一步晃三下，手里的加法不超过 10。' },
  sub10: { name: '棉花糖云', shape: 'cloud', color: '#f4f1ff', desc: '软软的，会把数字一点点吃掉，所以举着减法。' },
  cmp10: { name: '跷跷板糖', shape: 'seesaw', color: '#ffd166', desc: '总在比谁大谁小：<、=、> 你分得清吗？' },
  make10: { name: '十字饼干', shape: 'cookie', color: '#e9b872', desc: '饼干上有十个格子，帮它凑满 10！' },
  carryAdd: { name: '跳跳糖', shape: 'pop', color: '#ff8a65', desc: '满十就要跳一跳，往十位进一！' },
  borrowSub: { name: '甜甜圈', shape: 'donut', color: '#c792ea', desc: '个位不够减？向十位借一个！' },
  chain: { name: '糖葫芦', shape: 'stack', color: '#ef5350', desc: '三颗山楂串一串，连加连减一步一步算。' },
  dragon: { name: '贪吃算式龙', shape: 'dragon', color: '#9b7bea', boss: true, desc: '一口气举三道算式，全答对它才会疼。' },
  king: { name: '糖果魔王', shape: 'king', color: '#ff6fa5', boss: true, desc: '城堡最大的捣蛋鬼，生气了会走得更快！' },
};

const WORLDS = [
  {
    grade: 1, name: '糖果城堡', sky: ['#ffd9ec', '#fff6fb'], hill: '#f7b7d2',
    levels: [
      { name: '苹果小路', kinds: ['add5'], options: 2, goal: 15, walk: 22, gap: 4.5, maxOn: 2, tutorial: true,
        intro: '小怪物要来偷糖果啦！点写着答案的炮台，把它打跑！' },
      { name: '果冻草地', kinds: ['add10'], options: 3, goal: 21, walk: 17, gap: 3.8, maxOn: 3,
        intro: '10 以内的加法，果冻宝宝排着队来了！' },
      { name: '棉花糖云', kinds: ['sub10'], options: 3, goal: 21, walk: 17, gap: 3.8, maxOn: 3,
        intro: '减法来啦：拿走几个，还剩几个？' },
      { name: '跷跷板桥', kinds: ['cmp10'], options: 3, goal: 21, walk: 18, gap: 4, maxOn: 3,
        intro: '比大小！先算左边，再选 <、= 还是 >。小嘴巴朝着大的那边。' },
      { name: '小 Boss：贪吃算式龙', kinds: ['add10', 'sub10', 'cmp10'], options: 3, walk: 48,
        boss: { kind: 'dragon', hp: 5, chain: 3 },
        intro: '贪吃算式龙一次举三道题，连着答对三道，它才会疼！它走到城堡会咬一口，快答题把它推回去！' },
      { name: '凑十小屋', kinds: ['make10'], options: 3, goal: 21, walk: 17, gap: 3.8, maxOn: 3,
        intro: '几和几凑成 10？想一想十根手指头！' },
      { name: '跳跳糖山', kinds: ['carryAdd'], options: 3, goal: 21, walk: 19, gap: 4.2, maxOn: 3,
        intro: '个位满十就进一：9 + 5，先把 9 凑成 10！' },
      { name: '甜甜圈洞', kinds: ['borrowSub'], options: 3, goal: 21, walk: 19, gap: 4.2, maxOn: 3,
        intro: '个位不够减，就向十位借一个 10。' },
      { name: '糖葫芦街', kinds: ['chain'], options: 3, goal: 21, walk: 21, gap: 4.6, maxOn: 3,
        intro: '三个数连在一起，从左往右一步一步算。' },
      { name: '大 Boss：糖果魔王', kinds: ['make10', 'carryAdd', 'borrowSub', 'chain', 'cmp10'], options: 4, walk: 48,
        boss: { kind: 'king', hp: 6, chain: 3, rage: true },
        intro: '糖果魔王来抢城堡了！连着答对三道题打它一下。它生气时会走得更快，先别慌！' },
    ],
  },

];

const GRADE_TOPICS = [
  [2, '乘法花园', [['add100','百以内加法'],['sub100','百以内减法'],['mul9','乘法口诀'],['div9','表内除法'],['missing','乘法填空'],['remainder','有余数除法'],['mixed','乘加混合'],['brackets','括号算式']]],
  [3, '万以内大森林', [['add1000','三位数加法'],['sub1000','三位数减法'],['mulSmall','两位数乘法'],['divSmall','整除练习'],['perimeter','长方形周长'],['area','长方形面积'],['mixed','运算顺序'],['decimalAdd','小数初步']]],
  [4, '大数星空', [['addLarge','大数加法'],['subLarge','大数减法'],['mulLarge','两位数相乘'],['divLarge','两位数除法'],['times10','整十整百'],['brackets','括号运算'],['distribute','运算律'],['average','平均数']]],
  [5, '小数海洋', [['decimalAdd','小数加法'],['decimalSub','小数减法'],['decimalMul','小数乘法'],['decimalDiv','小数除法'],['shiftDecimal','小数点移动'],['factor','公因数'],['multiple','公倍数'],['triangle','三角形面积']]],
  [6, '分数城堡', [['fractionAdd','分数加法'],['fractionSub','分数减法'],['fractionMul','分数乘法'],['fractionDiv','分数除法'],['percent','百分数'],['ratio','比与比例'],['volume','长方体体积'],['equation','方程复习']]],
];
for (const [grade, name, topics] of GRADE_TOPICS) {
  const levels = topics.map(([kind, title]) => {
    KIND_NAMES[kind] = title;
    MONSTERS[kind] = { ...MONSTERS.add10, name: `${title}小怪`, desc: `用${title}守护城堡。` };
    return { name: title, kinds: [kind], options: 4, goal: 12, walk: 35, gap: 6, maxOn: 2, intro: `本关练习${title}，算好再发射！` };
  });
  const boss = (name, kinds, kind) => ({ name, kinds, options: 4, walk: 80, boss: { kind, hp: 5, chain: 3 }, intro: '用刚学过的知识打败守关怪物，连答三题打掉一格血！' });
  levels.splice(4, 0, boss('阶段挑战', topics.slice(0, 4).map(t => t[0]), 'dragon'));
  levels.push(boss('年级大挑战', topics.map(t => t[0]), 'king'));
  WORLDS.push({ grade, name, sky: ['#d9eaff', '#fff6fb'], hill: '#b6dca8', levels });
}

WORLDS.forEach((w) => (w.levels || []).forEach((L, i) => {
  L.n = i + 1;
  if (L.boss) L.goal = L.boss.hp;
}));

if (typeof module === 'object') module.exports = { WORLDS, MONSTERS, KIND_NAMES };
