'use strict';
// ===== 关卡数据（来自 docs/02-关卡设计.md 世界 1）=====
// 每个题目：show 屏幕上显示的拼音，audio 是 audio/syl 下的文件名，group 相同的优先当干扰项

// 浏览器里 pinyin.js 的顶层常量是全局词法绑定，不在 window 上，所以直接取名字
const pinyinRules = typeof module === 'object' ? require('./pinyin.js') : { INITIALS, INITIAL_AUDIO, markTone };

const VOWEL_AUDIO = { a: 'a', o: 'o', e: 'e', i: 'yi', u: 'wu', 'ü': 'yu' };
const vowel = (v) => ({ show: v, audio: VOWEL_AUDIO[v] + '1' });
const initial = (s, group) => ({ show: s, audio: pinyinRules.INITIAL_AUDIO[s], group });
const tones = (base, audioBase) => [1, 2, 3, 4].map((t) => ({
  show: pinyinRules.markTone(base, t), audio: audioBase + t, group: base, tone: t,
}));
const ALL_VOWEL_TONES = ['a', 'o', 'e', 'i', 'u', 'ü'].flatMap((v) => tones(v, VOWEL_AUDIO[v]));
const MA_TONES = [...tones('a', 'a'), ...tones('ma', 'ma')];

const WORLDS = [
  {
    grade: 1, name: '声韵母森林', sky: ['#bfe6ff', '#f1fbff'], hill: '#9fd59a',
    levels: [
      { name: '跳跳出发', gates: ['block'], options: 2, hedgehogs: 0, speed: 165, tutorial: true,
        intro: '点一下屏幕跳起来，顶一顶写着对的拼音的砖块！',
        pools: { block: ['a', 'o', 'e'].map(vowel) } },
      { name: '小河弯弯', gates: ['block'], options: 3, hedgehogs: 0, speed: 175,
        intro: '新朋友：i u ü。听仔细哦！',
        pools: { block: ['i', 'u', 'ü', 'a', 'o', 'e'].map(vowel) } },
      { name: '会唱歌的路', gates: ['tone'], options: 4, hedgehogs: 0, speed: 170,
        intro: '声调有样子：平平 ˉ、上坡 ˊ、拐弯 ˇ、下坡 ˋ。',
        pools: { tone: MA_TONES } },
      { name: '蘑菇林', gates: ['block'], options: 3, hedgehogs: 1, speed: 180,
        intro: '小刺猬来了，跳过去别碰到它！',
        pools: { block: ['b', 'p', 'm', 'f'].map((s) => initial(s)) } },
      { name: '小 Boss：声调怪', gates: ['block'], options: 4, hedgehogs: 0, speed: 175, display: 'mark',
        boss: { kind: 'tone', name: '声调怪', hp: 6 },
        intro: '声调怪把声调吹乱啦！听音，顶对的声调打它！',
        pools: { block: ALL_VOWEL_TONES } },
      { name: '萤火虫谷', gates: ['block'], options: 3, hedgehogs: 1, speed: 185,
        intro: '新朋友：d t n l。',
        pools: { block: [...['d', 't', 'n', 'l'].map((s) => initial(s)), ...['b', 'p'].map((s) => initial(s))] } },
      { name: '大树洞', gates: ['stone'], options: 2, hedgehogs: 0, speed: 170,
        intro: '过河啦！听音选路：要走上面的云朵桥，就跳上去；走下面的木头桥，就别跳。',
        pools: { stone: [initial('b', 'bd'), initial('d', 'bd'), initial('p', 'pq'), initial('q', 'pq')] } },
      { name: '山坡坡', gates: ['block', 'tone'], options: 3, hedgehogs: 1, speed: 185,
        intro: '新朋友：g k h j q x，还有会唱歌的路。',
        pools: { block: ['g', 'k', 'h', 'j', 'q', 'x'].map((s) => initial(s)), tone: ALL_VOWEL_TONES } },
      { name: '风车草原', gates: ['block'], options: 3, hedgehogs: 2, speed: 190,
        intro: '平舌 z c s 和翘舌 zh ch sh，舌头翘起来不一样哦！',
        pools: { block: [initial('zh', 'z'), initial('z', 'z'), initial('ch', 'c'), initial('c', 'c'),
          initial('sh', 's'), initial('s', 's'), initial('r'), initial('y'), initial('w')] } },
      { name: '大 Boss：字母大盗', gates: ['block'], options: 3, hedgehogs: 0, speed: 185,
        boss: { kind: 'thief', name: '字母大盗', hp: 8 },
        intro: '字母大盗偷走了声母！听音，顶对的声母砸它！',
        pools: { block: pinyinRules.INITIALS.map((s) => initial(s)) } },
    ],
  },

];

const GRADE_READINGS = {"2": [["山水花园", [["山峰", "峰", "feng1"], ["河流", "流", "liu2"], ["湖水", "湖", "hu2"]]], ["四季天气", [["春天", "春", "chun1"], ["夏天", "夏", "xia4"], ["秋天", "秋", "qiu1"]]], ["校园生活", [["学校", "校", "xiao4"], ["教室", "室", "shi4"], ["读书", "读", "du2"]]], ["动物朋友", [["狐狸", "狐", "hu2"], ["老虎", "虎", "hu3"], ["狼群", "狼", "lang2"]]], ["前后鼻音", [["森林", "林", "lin2"], ["铃声", "铃", "ling2"], ["星星", "星", "xing1"]]], ["平翘舌音", [["祖国", "祖", "zu3"], ["竹子", "竹", "zhu2"], ["草地", "草", "cao3"]]], ["长与乐", [["长大", "长", "zhang3"], ["长短", "长", "chang2"], ["快乐", "乐", "le4"]]], ["行与重", [["行走", "行", "xing2"], ["银行", "行", "hang2"], ["重新", "重", "chong2"]]]], "3": [["一字多音", [["音乐", "乐", "yue4"], ["重要", "重", "zhong4"], ["便宜", "便", "pian2"]]], ["词语语境", [["方便", "便", "bian4"], ["假期", "假", "jia4"], ["假如", "假", "jia3"]]], ["藏与朝", [["收藏", "藏", "cang2"], ["朝阳", "朝", "zhao1"], ["朝代", "朝", "chao2"]]], ["转与数", [["转身", "转", "zhuan3"], ["转圈", "转", "zhuan4"], ["数学", "数", "shu4"]]], ["平翘舌辨析", [["石头", "石", "shi2"], ["私人", "私", "si1"], ["事情", "事", "shi4"]]], ["鼻音辨析", [["认真", "真", "zhen1"], ["争取", "争", "zheng1"], ["深浅", "深", "shen1"]]], ["声调辨析", [["勇敢", "勇", "yong3"], ["永远", "永", "yong3"], ["用处", "用", "yong4"]]], ["常见字音", [["结束", "束", "shu4"], ["祝福", "祝", "zhu4"], ["确实", "确", "que4"]]]], "4": [["薄字辨音", [["薄饼", "薄", "bao2"], ["薄弱", "薄", "bo2"], ["薄荷", "薄", "bo4"]]], ["角与差", [["角落", "角", "jiao3"], ["角色", "角", "jue2"], ["出差", "差", "chai1"]]], ["参字辨音", [["参加", "参", "can1"], ["人参", "参", "shen1"], ["参差", "参", "cen1"]]], ["似与系", [["似乎", "似", "si4"], ["似的", "似", "shi4"], ["联系", "系", "xi4"]]], ["读准形近字", [["辨别", "辨", "bian4"], ["花瓣", "瓣", "ban4"], ["分析", "析", "xi1"]]], ["容易读错", [["薄雾", "雾", "wu4"], ["崭新", "崭", "zhan3"], ["嫩绿", "嫩", "nen4"]]], ["供与冠", [["提供", "供", "gong1"], ["供品", "供", "gong4"], ["冠军", "冠", "guan4"]]], ["综合辨音", [["皇冠", "冠", "guan1"], ["模型", "模", "mo2"], ["模样", "模", "mu2"]]]], "5": [["强字辨音", [["坚强", "强", "qiang2"], ["勉强", "强", "qiang3"], ["倔强", "强", "jiang4"]]], ["落字辨音", [["落叶", "落", "luo4"], ["落下功课", "落", "la4"], ["落枕", "落", "lao4"]]], ["泊与调", [["停泊", "泊", "bo2"], ["湖泊", "泊", "po1"], ["调整", "调", "tiao2"]]], ["调与省", [["声调", "调", "diao4"], ["节省", "省", "sheng3"], ["反省", "省", "xing3"]]], ["易错声调", [["教诲", "诲", "hui4"], ["友谊", "谊", "yi4"], ["酝酿", "酿", "niang4"]]], ["形近字辨析", [["干燥", "燥", "zao4"], ["做操", "操", "cao1"], ["急躁", "躁", "zao4"]]], ["书面词语", [["脊梁", "脊", "ji3"], ["暂时", "暂", "zan4"], ["膝盖", "膝", "xi1"]]], ["综合词语", [["惩罚", "惩", "cheng2"], ["给予", "给", "ji3"], ["奔赴", "赴", "fu4"]]]], "6": [["载字辨音", [["记载", "载", "zai3"], ["载重", "载", "zai4"], ["三年五载", "载", "zai3"]]], ["塞字辨音", [["塞住", "塞", "sai1"], ["边塞", "塞", "sai4"], ["阻塞", "塞", "se4"]]], ["解字辨音", [["解答", "解", "jie3"], ["押解", "解", "jie4"], ["解姓", "解", "xie4"]]], ["处与恶", [["处理", "处", "chu3"], ["到处", "处", "chu4"], ["厌恶", "恶", "wu4"]]], ["易错字音", [["恶劣", "恶", "e4"], ["炽热", "炽", "chi4"], ["粗犷", "犷", "guang3"]]], ["鼻音复习", [["憧憬", "憧", "chong1"], ["濒临", "濒", "bin1"], ["铭记", "铭", "ming2"]]], ["声调复习", [["迂回", "迂", "yu1"], ["氛围", "氛", "fen1"], ["卓越", "卓", "zhuo2"]]], ["毕业挑战", [["锲而不舍", "锲", "qie4"], ["惟妙惟肖", "肖", "xiao4"], ["自怨自艾", "艾", "yi4"]]]]};

const reading = ([word, char, audio]) => ({ show: pinyinRules.markTone(audio.slice(0, -1), Number(audio.at(-1))), audio, context: `${word}中的「${char}」` });
for (let grade = 2; grade <= 6; grade++) {
  const topics = GRADE_READINGS[grade];
  const levels = [], taught = [];
  topics.forEach(([name, rows], i) => {
    const pool = rows.map(reading);
    taught.push(...pool);
    levels.push({ name, gates: ['block'], options: 3, hedgehogs: 0, speed: 165,
      intro: '看清词语中的这个字，听读音，顶对应的拼音。多音字要结合词语辨认！', pools: { block: pool } });
    if (i === 3 || i === 7) levels.push({ name: i === 3 ? '字音博士' : '字音毕业战', gates: ['block'], options: 3, hedgehogs: 0, speed: 170,
      boss: { kind: 'thief', name: '字音大盗', hp: 8 }, intro: '复习本年级已经遇到的读音，注意词语语境。', pools: { block: [...taught] } });
  });
  WORLDS.push({ grade, name: ['','','字音小镇','字音山谷','多音字海湾','易错字城堡','字音大挑战'][grade], sky: ['#bfe6ff','#f1fbff'], hill: '#9fd59a', levels });
}
// 一年级补足复韵母、鼻韵母和整体认读，追加关卡以保留原存档编号。
const FINAL_BASES = {
  wei1: 'ui', you1: 'iu', ye1: 'ie', yue1: 'üe',
  yin1: 'in', wen1: 'un', yun1: 'ün', ying1: 'ing', hong1: 'ong',
};
const FOUNDATION = [
  ['复韵母一', ['ai1','ei1','wei1']], ['复韵母二', ['ao1','ou1','you1']],
  ['复韵母三', ['ye1','yue1','er2']], ['前鼻韵母', ['an1','en1','yin1','wen1','yun1']],
  ['后鼻韵母', ['ang1','eng1','ying1','hong1']], ['整体认读一', ['zhi1','chi1','shi1','ri1','zi1','ci1','si1']],
  ['整体认读二', ['yi1','wu1','yu1','ye1','yue1']], ['整体认读三', ['yuan1','yin1','yun1','ying1']],
  ['两拼三拼', ['hua1','guo2','jia1','xiao3','shui3']], ['拼读大挑战', ['bei3','jing1','tian1','kong1','xue2','xiao4']],
];
FOUNDATION.forEach(([name, syllables], i) => WORLDS[0].levels.push({ name, gates: ['block'], options: 3, hedgehogs: 0, speed: 165,
  intro: '听完整音节，辨认复韵母、鼻韵母与整体认读音节。',
  ...(i === 9 ? { boss: { kind: 'thief', name: '拼读大盗', hp: 8 } } : {}),
  pools: { block: syllables.map((audio) => {
    const base = (i < 5 && FINAL_BASES[audio]) || audio.slice(0, -1);
    return { audio, base, show: pinyinRules.markTone(base, Number(audio.at(-1))) };
  }) } }));
WORLDS.forEach((w) => (w.levels || []).forEach((L, i) => {
  L.n = i + 1;
  L.goal = L.boss ? L.boss.hp : 8;
}));

// 出一道题：目标 + 选项（优先同组干扰项）
function makeOptions(item, pool, count, random = Math.random) {
  const others = [...new Map(pool.filter(p => p.show !== item.show).map(p => [p.show, p])).values()];
  // 同音不同词不做互相干扰项；用其他声调补足选项。
  if (others.length < count - 1) {
    const base = item.base || item.audio.slice(0, -1);
    const audioBase = item.audio.slice(0, -1);
    for (let tone = 1; tone <= 4; tone++) {
      const show = pinyinRules.markTone(base, tone);
      if (show !== item.show && !others.some(p => p.show === show)) others.push({ show, base, audio: audioBase + tone });
    }
  }
  const same = others.filter((p) => item.group && p.group === item.group);
  const rest = others.filter((p) => !same.includes(p));
  const shuffle = (a) => a.map((v) => [random(), v]).sort((x, y) => x[0] - y[0]).map((v) => v[1]);
  const picks = [...shuffle(same), ...shuffle(rest)].slice(0, Math.max(0, count - 1));
  return shuffle([item, ...picks]);
}

if (typeof module === 'object') module.exports = { WORLDS, makeOptions };
