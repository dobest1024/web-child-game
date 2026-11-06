'use strict';
// ===== 关卡数据（来自 docs/02-关卡设计.md 世界 1）=====
// 每关是一串任务：rain 接字雨 / bridge 诗句拼桥 / boss 飞花令

const poemData = typeof module === 'object' ? require('./poems.js') : { POEMS, bare, linePairs };
const UP = ['yonge', 'jiangnan', 'hua', 'minnong', 'gulangyue', 'feng'];
const ALL = poemData.POEMS.filter(p => p.grade === 1).map((p) => p.id);
const rain = (poem) => ({ type: 'rain', poem });
const bridge = (poem) => ({ type: 'bridge', poem });

const WORLDS = [
  {
    grade: 1, name: '诗词花园', sky: ['#bfe3ff', '#fff4dc'],
    levels: [
      { name: '鹅鹅鹅', tutorial: true, drops: 2, speed: 85,
        intro: '字从天上掉下来啦！左右移动小鸡的篮子，按诗句的顺序接住每个字。',
        tasks: [rain('yonge')] },
      { name: '莲叶田田', drops: 3, speed: 95,
        intro: '鱼儿在莲叶间游来游去，东、西、南、北可别接乱哦！',
        tasks: [rain('jiangnan')] },
      { name: '山水小桥', intro: '小鸭子要过河！按顺序点诗句木板，把桥铺好。',
        tasks: [bridge('hua'), bridge('minnong'), bridge('yonge')] },
      { name: '月亮和风', drops: 3, speed: 100,
        intro: '月亮像白玉盘，风能吹落叶子、吹开花。先接字，再铺桥！',
        tasks: [rain('gulangyue'), bridge('feng')] },
      { name: '小 Boss：咕咕博士', boss: { kind: 'owl', name: '咕咕博士', hp: 6, time: 15 },
        intro: '咕咕博士来对诗啦！它说上一句，你选对下一句打败它。别让它的蓄力条满了哦！',
        tasks: [{ type: 'boss', poems: UP }] },
      { name: '春天早上', drops: 3, speed: 105,
        intro: '床前的月光像白霜，春天的早上鸟儿叫。先接字，再铺桥！',
        tasks: [rain('jingyesi'), bridge('chunxiao')] },
      { name: '桃花潭', intro: '再帮小鸭子铺桥过河，这次的诗句更长啦！',
        tasks: [bridge('zengwanglun'), bridge('xunyinzhe'), bridge('gulangyue')] },
      { name: '小荷尖尖', drops: 3, speed: 105,
        intro: '蜻蜓立荷尖，小娃撑小船。七个字的句子，加油！',
        tasks: [rain('xiaochi'), bridge('chishang')] },
      { name: '大公鸡', drops: 3, speed: 110,
        intro: '大公鸡一叫，千门万户都开了。接完字再铺两座桥！',
        tasks: [rain('huaji'), bridge('jiangnan'), bridge('jingyesi')] },
      { name: '大 Boss：诗词龙', boss: { kind: 'dragon', name: '诗词龙', hp: 8, time: 14 },
        intro: '诗词龙会背好多诗！一年级的 13 首诗都可能出现，打败它就是诗词小达人！',
        tasks: [{ type: 'boss', poems: ALL }] },
    ],
  },

];
// 每个年级独立诗单；阶段 Boss 只考此前学过的篇目。
for (let grade = 2; grade <= 6; grade++) {
  const poems = poemData.POEMS.filter(p => p.grade === grade);
  const levels = [];
  const taught = [];
  for (let i = 0; i < 8; i++) {
    const group = poems.slice(Math.floor(i * poems.length / 8), Math.floor((i + 1) * poems.length / 8));
    taught.push(...group.map(p => p.id));
    levels.push({ name: group.map(p => p.title).join(' · '), drops: 3, speed: 100 + grade * 3,
      intro: '先听诗句，再按顺序接字或铺桥。记住整首诗的顺序！',
      tasks: group.map(p => i % 3 === 0 && p.lines.length <= 4 ? rain(p.id) : bridge(p.id)) });
    if (i === 3 || i === 7) levels.push({ name: i === 3 ? '诗词博士' : '诗词龙挑战',
      boss: { kind: i === 3 ? 'owl' : 'dragon', name: i === 3 ? '诗词博士' : '诗词龙', hp: 8, time: 18 },
      intro: '上句接下句，复习本年级已经学过的诗。', tasks: [{ type: 'boss', poems: [...taught] }] });
  }
  WORLDS.push({ grade, name: ['','','诗词小溪','诗词山谷','诗词海湾','诗词城堡','诗词大挑战'][grade], sky: ['#cde7ff','#fff4dc'], levels });
}
WORLDS.forEach((w) => (w.levels || []).forEach((L, i) => { L.n = i + 1; }));

const shuffle = (list, random = Math.random) =>
  list.map((v) => [random(), v]).sort((a, b) => a[0] - b[0]).map((v) => v[1]);

// 接字雨的干扰字：先从同一首诗里挑（考顺序），不够再从别的诗里挑；不会和要接的字相同，也不重复
function rainDistractors(poem, needed, count, random = Math.random) {
  const own = [...new Set(poem.lines.map(poemData.bare).join(''))].filter((c) => c !== needed);
  const others = [...new Set(poemData.POEMS.filter((p) => p !== poem).map((p) => p.lines.map(poemData.bare).join('')).join(''))]
    .filter((c) => c !== needed && !own.includes(c));
  return [...shuffle(own, random), ...shuffle(others, random)].slice(0, count);
}

// 飞花令的选项：正确下句 + 同一关别的诗里字数相同的句子（不拿还没学过的诗出题，避免同诗重复句式造成歧义）
function bossOptions(pair, count, random = Math.random, poems = poemData.POEMS) {
  const down = poemData.bare(pair.down);
  const len = down.length;
  const distinct = (l) => {
    const b = poemData.bare(l);
    return b !== down && !(pair.poem.id === 'jiangnan' && b.startsWith('鱼戏莲叶') && down.startsWith('鱼戏莲叶'));
  };
  const pool = poems.filter((p) => p !== pair.poem).flatMap((p) => p.lines)
    .filter((l) => poemData.bare(l).length === len && distinct(l));
  const own = pair.poem.lines.filter(distinct).map(poemData.bare).filter((l) => l.length === len);
  const fallback = poems.flatMap((p) => p.lines.filter(distinct).map(poemData.bare));
  const picks = [...new Set([...shuffle(pool, random).map(poemData.bare), ...shuffle(own, random), ...shuffle(fallback, random)])].slice(0, count - 1);
  return shuffle([down, ...picks], random);
}

if (typeof module === 'object') module.exports = { WORLDS, shuffle, rainDistractors, bossOptions };
