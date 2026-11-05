'use strict';
// ===== 关卡数据：世界 1 森林街角小店（关卡一览见 README.md）=====
// goal：服务几位顾客过关（Boss 关是 Boss 的饱饱值）；secs：每位顾客给多少秒营业时间
// types：轮流出的题型；specs：每种题的出题范围（金额单位是角）；sum：收银台显示合计

const WORLDS = [
  {
    grade: 1, name: '森林街角小店',
    levels: [
      { name: '开张啦', goal: 5, secs: 36, types: ['count'], sum: true, tutorial: true,
        intro: '顾客要几个，就点几下货架上的东西，放进篮子里，再点"装好啦"！',
        specs: { count: { min: 1, max: 5 } } },
      { name: '硬币宝宝', goal: 6, secs: 32, types: ['pick', 'pick', 'count'], options: 3, sum: true,
        intro: '认识硬币：1角、5角、1元。顾客要哪个，就点哪个！',
        specs: { pick: { pool: ['j1', 'j5', 'y1'] }, count: { min: 2, max: 6 } } },
      { name: '纸币朋友', goal: 6, secs: 32, types: ['pick'], options: 3, sum: true,
        intro: '纸币来啦：5元、10元、20元。看清上面的数字和"元"字！',
        specs: { pick: { pool: ['j5', 'y1', 'y5', 'y10', 'y20'], targets: ['y5', 'y10', 'y20', 'y1'] } } },
      { name: '凑一凑', goal: 6, secs: 40, types: ['pay', 'pay', 'pick'], options: 3, sum: true,
        intro: '顾客把钱包交给你啦。东西卖几元，就拿几元放进收银台！',
        specs: { pay: { prices: [20, 100], step: 10, allowed: ['y1', 'y5'] }, pick: { pool: ['j1', 'j5', 'y1', 'y5', 'y10', 'y20'] } } },
      { name: '小 Boss：大胃王熊熊', goal: 6, secs: 42, types: ['count', 'pay'], sum: true,
        boss: { name: '大胃王熊熊', e: '🐻', pest: '🐝', pestName: '小蜜蜂', warn: '嗡嗡～我的小蜜蜂飞出来啦！' },
        intro: '熊熊要买好多好多东西！一边做生意，一边点掉飞出来的小蜜蜂。',
        specs: { count: { min: 3, max: 8 }, pay: { prices: [20, 100], step: 10, allowed: ['y1', 'y5'] } } },
      { name: '几时开门', goal: 6, secs: 34, types: ['clock', 'pay'], options: 3, sum: true,
        intro: '认识钟表：长针指着 12，短针指着几，就是几时。',
        specs: { clock: { half: false }, pay: { prices: [20, 100], step: 10, allowed: ['y1', 'y5', 'y10'] } } },
      { name: '找零钱', goal: 6, secs: 42, types: ['change', 'change', 'pay'], sum: true,
        intro: '顾客给的钱比价钱多，要把多出来的找回去：10元买 7元的东西，找 3元！',
        specs: { change: { prices: [10, 90], step: 10, given: ['y10', 'y5'], allowed: ['y1', 'y5'] },
          pay: { prices: [20, 100], step: 10, allowed: ['y1', 'y5', 'y10'] } } },
      { name: '角角换换', goal: 6, secs: 40, types: ['exchange', 'pay'], sum: true,
        intro: '1元 = 10角！帮顾客换零钱，再收几元几角的钱。',
        specs: { exchange: { from: ['y1', 'y1', 'y5'], allowed: ['j1', 'j5', 'y1'] },
          pay: { prices: [3, 20], step: 1, allowed: ['y1', 'j5', 'j1'] } } },
      { name: '半点钟', goal: 7, secs: 38, types: ['clock', 'change', 'pay'], options: 3, sum: false,
        intro: '长针指着 6、短针在两个数中间，就是几时半。这关收银台不帮你算合计啦！',
        specs: { clock: { half: true }, change: { prices: [10, 190], step: 10, given: ['y20', 'y10'], allowed: ['y1', 'y5', 'y10'] },
          pay: { prices: [20, 200], step: 10, allowed: ['y1', 'y5', 'y10'] } } },
      { name: '大 Boss：调皮猴王', goal: 8, secs: 44, types: ['pay', 'clock', 'change', 'exchange', 'count', 'pick'], options: 3, sum: false,
        boss: { name: '调皮猴王', e: '🐵', pest: '🍌', pestName: '香蕉皮', warn: '嘿嘿，香蕉皮飞过来啦！' },
        intro: '猴王什么都要买：收钱、找零、换零钱、看钟表！香蕉皮扔过来，快点掉它。',
        specs: { pay: { prices: [3, 200], step: 1, allowed: ['y1', 'y5', 'y10', 'j5', 'j1'] }, clock: { half: true },
          change: { prices: [10, 190], step: 10, given: ['y20', 'y10'], allowed: ['y1', 'y5', 'y10'] },
          exchange: { from: ['y1', 'y5'], allowed: ['j1', 'j5', 'y1'] }, count: { min: 4, max: 10 },
          pick: { pool: ['j1', 'j5', 'y1', 'y5', 'y10', 'y20'] } } },
    ],
  },

];
const SHOP_GRADES = [
  [2, '时间小站', ['total','share','remain','elapsed','later','stock','sold','twice']],
  [3, '小数集市', ['decimalTotal','decimalChange','grams','metres','perimeter','area','minutes','transport']],
  [4, '超市大采购', ['budget','boxes','transport','area','perimeter','average','stock','total']],
  [5, '批发小仓库', ['wholesale','unitPrice','profit','litres','average','decimalChange','fractionStock','volume']],
  [6, '打折大促销', ['discount','percent','tax','ratio','increase','fractionStock','volume','profit']],
];
const SHOP_TOPIC_NAMES = { total:'整单总价',share:'平均分装',remain:'装袋余数',elapsed:'经过时间',later:'到达时刻',stock:'库存加法',sold:'库存减法',twice:'倍数关系',decimalTotal:'小数总价',decimalChange:'小数找零',grams:'质量换算',metres:'长度换算',perimeter:'柜台周长',area:'店面面积',minutes:'时分换算',transport:'送货路程',budget:'采购预算',boxes:'整箱包装',average:'平均销量',wholesale:'批发采购',unitPrice:'计算单价',profit:'计算利润',litres:'容量换算',fractionStock:'分数库存',discount:'打折促销',percent:'销售比例',tax:'费用计算',ratio:'按比分配',increase:'销量增长',volume:'包装容积' };
for (const [grade, name, topics] of SHOP_GRADES) {
  const levels = topics.map(topic => ({ name: SHOP_TOPIC_NAMES[topic], goal: 6, secs: 55, types: ['calc'], options: 4, sum: false,
    intro: `今天练习${SHOP_TOPIC_NAMES[topic]}。读清顾客的要求，再选择答案。`, specs: { calc: { topic } } }));
  // 复习关轮流抽取已学专题，避免只反复出现同一种题。
  const challenge = (name, pool, boss) => ({ name, goal: 8, secs: 60, types: ['calc'], options: 4, sum: false, topics: pool,
    boss, intro: '一边完成顾客的经营问题，一边点掉捣乱的小东西！', specs: { calc: { topic: pool[0] } } });
  levels.splice(4, 0, challenge('熊熊采购挑战', topics.slice(0, 4), { name:'采购熊熊', e:'🐻', pest:'🐝', pestName:'小蜜蜂', warn:'蜜蜂飞来了！' }));
  levels.push(challenge('店长毕业挑战', topics, { name:'采购猴王', e:'🐵', pest:'🍌', pestName:'香蕉皮', warn:'注意香蕉皮！' }));
  WORLDS.push({ grade, name, levels });
}
WORLDS.forEach((w) => (w.levels || []).forEach((L, i) => { L.n = i + 1; }));

if (typeof module === 'object') module.exports = { WORLDS };
