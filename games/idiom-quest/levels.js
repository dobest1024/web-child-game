// 成语库与题目生成。本模块保持纯数据与纯逻辑，供 Node 测试直接导入。
export const IDIOMS = [
  {
    word: '一心一意',
    pinyin: 'yī xīn yī yì',
    meaning: '心里只有一个念头，专心做好一件事。',
    example: '上课的时候，他一心一意地听讲。',
    tag: '数字',
  },
  {
    word: '三心二意',
    pinyin: 'sān xīn èr yì',
    meaning: '一会儿想做这个，一会儿想做那个，不专心。',
    example: '写作业时三心二意，半天也写不完。',
    tag: '数字',
  },
  {
    word: '四面八方',
    pinyin: 'sì miàn bā fāng',
    meaning: '指周围所有的地方和方向。',
    example: '灯会一开始，人们从四面八方赶来。',
    tag: '数字',
  },
  {
    word: '五颜六色',
    pinyin: 'wǔ yán liù sè',
    meaning: '颜色又多又好看。',
    example: '花园里开满了五颜六色的花。',
    tag: '数字',
  },
  {
    word: '七上八下',
    pinyin: 'qī shàng bā xià',
    meaning: '心里不安定，像有东西上下直跳。',
    example: '要发考试卷了，我心里七上八下的。',
    tag: '数字',
  },
  {
    word: '九牛一毛',
    pinyin: 'jiǔ niú yī máo',
    meaning: '像九头牛身上的一根毛，形容很小的一份。',
    example: '和大海比，这滴水就像九牛一毛。',
    tag: '数字',
  },
  {
    word: '十全十美',
    pinyin: 'shí quán shí měi',
    meaning: '样样都好，一点儿缺点也没有。',
    example: '没有人是十全十美的，有进步就好。',
    tag: '数字',
  },
  {
    word: '百发百中',
    pinyin: 'bǎi fā bǎi zhòng',
    meaning: '每次都射中目标，形容非常准确。',
    example: '他投篮百发百中，大家都为他鼓掌。',
    tag: '数字',
  },
  {
    word: '井底之蛙',
    pinyin: 'jǐng dǐ zhī wā',
    meaning: '井底的青蛙只看见一小块天，比喻见识少的人。',
    example: '多读书，才不会做井底之蛙。',
    tag: '寓言',
  },
  {
    word: '画蛇添足',
    pinyin: 'huà shé tiān zú',
    meaning: '给蛇画上脚，比喻做了多余的事反而不合适。',
    example: '作文写完就好了，硬加一段反而画蛇添足。',
    tag: '寓言',
  },
  {
    word: '守株待兔',
    pinyin: 'shǒu zhū dài tù',
    meaning: '守着树桩等兔子撞上来，比喻不肯努力、只想靠运气。',
    example: '学习不能守株待兔，要自己努力。',
    tag: '寓言',
  },
  {
    word: '亡羊补牢',
    pinyin: 'wáng yáng bǔ láo',
    meaning: '丢了羊赶快修羊圈，比喻出了问题及时补救还不晚。',
    example: '这次错了没关系，亡羊补牢还来得及。',
    tag: '寓言',
  },
  {
    word: '掩耳盗铃',
    pinyin: 'yǎn ěr dào líng',
    meaning: '捂住自己的耳朵去偷铃铛，比喻自己欺骗自己。',
    example: '捂住耳朵按门铃，就是掩耳盗铃。',
    tag: '寓言',
  },
  {
    word: '狐假虎威',
    pinyin: 'hú jiǎ hǔ wēi',
    meaning: '狐狸借着老虎的威风吓唬别人，比喻靠别人的势力吓人。',
    example: '他跟着大孩子吓唬人，真是狐假虎威。',
    tag: '寓言',
  },
  {
    word: '画龙点睛',
    pinyin: 'huà lóng diǎn jīng',
    meaning: '画龙最后点上眼睛，比喻在关键的地方加上一笔就变活了。',
    example: '最后一句让作文更精彩，真是画龙点睛。',
    tag: '寓言',
  },
  {
    word: '对牛弹琴',
    pinyin: 'duì niú tán qín',
    meaning: '对着牛弹琴，比喻对不懂的人讲道理，白费力气。',
    example: '给睡觉的小猫讲故事，就像对牛弹琴。',
    tag: '寓言',
  },
  {
    word: '惊弓之鸟',
    pinyin: 'jīng gōng zhī niǎo',
    meaning: '被箭吓怕了的鸟，比喻受过惊吓、特别害怕的人。',
    example: '被鞭炮吓过的小狗，成了惊弓之鸟。',
    tag: '寓言',
  },
  {
    word: '叶公好龙',
    pinyin: 'yè gōng hào lóng',
    meaning: '嘴上说爱龙，见了真龙却吓坏了，比喻表面喜欢其实不喜欢。',
    example: '他说喜欢毛毛虫，见了却吓跑了，真是叶公好龙。',
    tag: '寓言',
  },
  {
    word: '龙飞凤舞',
    pinyin: 'lóng fēi fèng wǔ',
    meaning: '像龙在飞、凤在舞，形容写字画画活泼有气势。',
    example: '爷爷写的毛笔字龙飞凤舞。',
    tag: '寓言',
  },
  {
    word: '生龙活虎',
    pinyin: 'shēng lóng huó hǔ',
    meaning: '像活生生的龙和虎，形容活泼有精神。',
    example: '弟弟一进门就生龙活虎地跑来跑去。',
    tag: '寓言',
  },
  {
    word: '虎头蛇尾',
    pinyin: 'hǔ tóu shé wěi',
    meaning: '头像老虎、尾像蛇，比喻做事开头声势大、结尾却草草了事。',
    example: '做事要有头有尾，不能虎头蛇尾。',
    tag: '寓言',
  },
  {
    word: '如鱼得水',
    pinyin: 'rú yú dé shuǐ',
    meaning: '像鱼儿回到水里，比喻到了自己喜欢又合适的环境。',
    example: '到了新的图书角，她如鱼得水。',
    tag: '寓言',
  },
  {
    word: '马到成功',
    pinyin: 'mǎ dào chéng gōng',
    meaning: '战马一到就打胜仗，形容事情顺利，一开始就成功。',
    example: '比赛开始前，老师祝我们马到成功。',
    tag: '寓言',
  },
  {
    word: '胆小如鼠',
    pinyin: 'dǎn xiǎo rú shǔ',
    meaning: '胆子像老鼠一样小，形容非常胆小。',
    example: '他以前胆小如鼠，现在敢上台发言了。',
    tag: '寓言',
  },
  {
    word: '鸟语花香',
    pinyin: 'niǎo yǔ huā xiāng',
    meaning: '鸟儿唱歌、花儿飘香，形容春天美好的景色。',
    example: '春天的公园鸟语花香，真舒服。',
    tag: '景色',
  },
  {
    word: '山清水秀',
    pinyin: 'shān qīng shuǐ xiù',
    meaning: '山峦清秀、河水清澈，形容风景优美。',
    example: '老家山清水秀，空气特别好。',
    tag: '景色',
  },
  {
    word: '春暖花开',
    pinyin: 'chūn nuǎn huā kāi',
    meaning: '春天暖和，花儿开放，形容好时候到了。',
    example: '等到春暖花开，我们去野餐吧。',
    tag: '景色',
  },
  {
    word: '风和日丽',
    pinyin: 'fēng hé rì lì',
    meaning: '微风轻吹、阳光明媚，形容天气晴朗暖和。',
    example: '今天风和日丽，最适合放风筝。',
    tag: '景色',
  },
  {
    word: '雨过天晴',
    pinyin: 'yǔ guò tiān qíng',
    meaning: '大雨过去天空放晴，比喻困难过去，情况变好。',
    example: '别难过，雨过天晴，一切都会好起来。',
    tag: '景色',
  },
  {
    word: '晴空万里',
    pinyin: 'qíng kōng wàn lǐ',
    meaning: '天空晴朗没有云，一眼望出去特别远。',
    example: '坐飞机那天晴空万里，能看见好远。',
    tag: '景色',
  },
  {
    word: '万紫千红',
    pinyin: 'wàn zǐ qiān hóng',
    meaning: '花儿颜色又多又艳，形容春天美丽热闹。',
    example: '春天一到，公园里万紫千红。',
    tag: '景色',
  },
  {
    word: '花好月圆',
    pinyin: 'huā hǎo yuè yuán',
    meaning: '花儿正开、月亮正圆，形容美好圆满。',
    example: '中秋夜花好月圆，一家人在一起。',
    tag: '景色',
  },
  {
    word: '雪中送炭',
    pinyin: 'xuě zhōng sòng tàn',
    meaning: '下雪天送炭取暖，比喻在别人急需时给予帮助。',
    example: '我忘带伞时同学借给我，真是雪中送炭。',
    tag: '品格',
  },
  {
    word: '锦上添花',
    pinyin: 'jǐn shàng tiān huā',
    meaning: '在漂亮的锦缎上再绣花，比喻好上加好。',
    example: '给画好的画涂上亮色，就像锦上添花。',
    tag: '品格',
  },
  {
    word: '水滴石穿',
    pinyin: 'shuǐ dī shí chuān',
    meaning: '水一直滴能把石头滴穿，比喻只要坚持就能成功。',
    example: '每天练一点点，水滴石穿，总会成功。',
    tag: '品格',
  },
  {
    word: '天长地久',
    pinyin: 'tiān cháng dì jiǔ',
    meaning: '像天地一样长久，形容时间很长、永远不变。',
    example: '我和好朋友的友谊天长地久。',
    tag: '品格',
  },
  {
    word: '微不足道',
    pinyin: 'wēi bù zú dào',
    meaning: '小得不值得一提。',
    example: '一滴水微不足道，聚起来就是大海。',
    tag: '品格',
  },
  {
    word: '大同小异',
    pinyin: 'dà tóng xiǎo yì',
    meaning: '大部分相同，只有小的差别。',
    example: '这两个灯笼做得大同小异。',
    tag: '神态',
  },
  {
    word: '异口同声',
    pinyin: 'yì kǒu tóng shēng',
    meaning: '不同的嘴里说出同一句话，形容大家说法完全一致。',
    example: '大家异口同声地喊：加油！',
    tag: '神态',
  },
  {
    word: '异想天开',
    pinyin: 'yì xiǎng tiān kāi',
    meaning: '想法又新奇又大胆，常常超出一般人的想象。',
    example: '他异想天开，想给小猫设计一把伞。',
    tag: '神态',
  },
  {
    word: '开门见山',
    pinyin: 'kāi mén jiàn shān',
    meaning: '一开门就看见山，比喻说话写文章一开头就说正题。',
    example: '老师开门见山地说：今天讲评作文。',
    tag: '神态',
  },
  {
    word: '东张西望',
    pinyin: 'dōng zhāng xī wàng',
    meaning: '向东看看、向西看看，形容四处张望、不专心。',
    example: '上课要专心，不要东张西望。',
    tag: '神态',
  },
  {
    word: '望梅止渴',
    pinyin: 'wàng méi zhǐ kě',
    meaning: '想到梅子流口水，比喻用空想来安慰自己。',
    example: '走累了想想前面的零食店，算是望梅止渴。',
    tag: '神态',
  },
  {
    word: '眉开眼笑',
    pinyin: 'méi kāi yǎn xiào',
    meaning: '眉毛舒展、眼睛含笑，形容非常高兴的样子。',
    example: '听到好消息，奶奶眉开眼笑。',
    tag: '神态',
  },
  {
    word: '目瞪口呆',
    pinyin: 'mù dèng kǒu dāi',
    meaning: '瞪着眼睛说不出话，形容又吃惊又发愣的样子。',
    example: '魔术变得太快，大家看得目瞪口呆。',
    tag: '神态',
  },
  {
    word: '手忙脚乱',
    pinyin: 'shǒu máng jiǎo luàn',
    meaning: '手和脚都忙乱起来，形容做事慌张、没有条理。',
    example: '第一次做饭，他忙得手忙脚乱。',
    tag: '神态',
  },
  {
    word: '乱七八糟',
    pinyin: 'luàn qī bā zāo',
    meaning: '形容又乱又没有条理。',
    example: '玩具丢得乱七八糟，该收拾啦。',
    tag: '神态',
  },
  {
    word: '灵机一动',
    pinyin: 'líng jī yī dòng',
    meaning: '脑子一转，忽然想出了好主意。',
    example: '他灵机一动，用纸盒做了个小房子。',
    tag: '神态',
  },
];

const idiomMap = new Map(IDIOMS.map((idiom) => [idiom.word, idiom]));
export const findIdiom = (word) => idiomMap.get(word);

// 去掉声调符号，用于谐音判断：yì 与 yī 都变成 yi。
export const deaccent = (syllable) =>
  syllable.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// 接龙规则：下一个成语的首字与上一个成语的末字相同，或读音相同（谐音）。
export function chainCheck(prevWord, nextWord) {
  const miss = { ok: false, homophone: false };
  if (prevWord === nextWord) return miss;
  if (prevWord.at(-1) === nextWord[0]) return { ok: true, homophone: false };
  const prev = findIdiom(prevWord);
  const next = findIdiom(nextWord);
  if (!prev || !next) return miss;
  const from = deaccent(prev.pinyin.split(' ').at(-1));
  const to = deaccent(next.pinyin.split(' ')[0]);
  return from === to ? { ok: true, homophone: true } : miss;
}

// 预写好的接龙对子，与 12 个关卡一一对应，谐音必须显式标注。
export const CHAIN_PAIRS = [
  { from: '一心一意', to: '异口同声', homophone: true },
  { from: '三心二意', to: '异想天开', homophone: true },
  { from: '掩耳盗铃', to: '灵机一动', homophone: true },
  { from: '狐假虎威', to: '微不足道', homophone: true },
  { from: '画龙点睛', to: '惊弓之鸟', homophone: true },
  { from: '叶公好龙', to: '龙飞凤舞', homophone: false },
  { from: '生龙活虎', to: '虎头蛇尾', homophone: false },
  { from: '如鱼得水', to: '水滴石穿', homophone: false },
  { from: '春暖花开', to: '开门见山', homophone: false },
  { from: '雨过天晴', to: '晴空万里', homophone: false },
  { from: '锦上添花', to: '花好月圆', homophone: false },
  { from: '东张西望', to: '望梅止渴', homophone: false },
];

export const CHAPTERS = [
  { name: '点灯', icon: '🌟', story: '认识成语宝宝，点亮第一排小灯笼。' },
  { name: '游灯', icon: '🎈', story: '提着灯笼去旅行，边走边玩接龙。' },
  { name: '赏灯', icon: '🌌', story: '灯火连成小星河，把成语都带回家。' },
];

// 每关 4 个成语，12 关恰好覆盖全部 48 条，不重复。
const LEVEL_DESIGNS = [
  {
    name: '第一盏灯',
    story: '灯会开门啦！先认识几位数字成语朋友。',
    chapter: 0,
    words: ['一心一意', '三心二意', '四面八方', '五颜六色'],
  },
  {
    name: '数字灯谜',
    story: '数字灯笼排排站，看谁数得又快又对。',
    chapter: 0,
    words: ['七上八下', '九牛一毛', '十全十美', '百发百中'],
  },
  {
    name: '老故事灯',
    story: '老故事里的成语，藏着好多小道理。',
    chapter: 0,
    words: ['井底之蛙', '守株待兔', '亡羊补牢', '掩耳盗铃'],
  },
  {
    name: '机灵小灯',
    story: '小机灵鬼成语来了，睁大眼睛别被骗。',
    chapter: 0,
    words: ['画蛇添足', '狐假虎威', '画龙点睛', '对牛弹琴'],
  },
  {
    name: '神兽灯会',
    story: '龙啊虎啊都来赶灯会，神气极了。',
    chapter: 1,
    words: ['惊弓之鸟', '叶公好龙', '龙飞凤舞', '生龙活虎'],
  },
  {
    name: '虎虎生风',
    story: '这一站威风十足，做事可别虎头蛇尾。',
    chapter: 1,
    words: ['虎头蛇尾', '如鱼得水', '马到成功', '胆小如鼠'],
  },
  {
    name: '春天花灯',
    story: '春天来了，花灯和花香一起飘。',
    chapter: 1,
    words: ['鸟语花香', '山清水秀', '春暖花开', '风和日丽'],
  },
  {
    name: '晴雨灯廊',
    story: '下过雨再看灯，天空亮得像洗过一样。',
    chapter: 1,
    words: ['雨过天晴', '晴空万里', '万紫千红', '花好月圆'],
  },
  {
    name: '暖心灯屋',
    story: '这一站暖暖的，成语也会送炭添花。',
    chapter: 2,
    words: ['雪中送炭', '锦上添花', '水滴石穿', '天长地久'],
  },
  {
    name: '说话灯笼',
    story: '会说话的灯笼，一句话点亮一盏灯。',
    chapter: 2,
    words: ['大同小异', '异口同声', '异想天开', '开门见山'],
  },
  {
    name: '表情灯戏',
    story: '灯笼也会做表情，猜猜它们的心情。',
    chapter: 2,
    words: ['东张西望', '望梅止渴', '眉开眼笑', '目瞪口呆'],
  },
  {
    name: '满城灯彩',
    story: '最后一站！把满城灯火全部点亮吧。',
    chapter: 2,
    words: ['手忙脚乱', '乱七八糟', '微不足道', '灵机一动'],
  },
];

// 确定性随机：同一 seed 出题完全一致。
const mulberry32 = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (list, rng) => {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

// 干扰字优先取同类成语同一位置的字，其次同类成语的其他字。
function pickDistractors(idiom, blank, count, rng) {
  const taken = new Set(idiom.word);
  const tiers = [[], [], []];
  for (const other of IDIOMS) {
    if (other.word === idiom.word) continue;
    const ch = other.word[blank];
    if (taken.has(ch)) continue;
    taken.add(ch);
    if (other.tag === idiom.tag) tiers[0].push(ch);
    else tiers[2].push(ch);
  }
  for (const other of IDIOMS) {
    if (other.word === idiom.word || other.tag !== idiom.tag) continue;
    for (const ch of other.word)
      if (!taken.has(ch)) {
        taken.add(ch);
        tiers[1].push(ch);
      }
  }
  const picked = [];
  for (const tier of tiers) {
    if (picked.length >= count) break;
    picked.push(...shuffle(tier, rng).slice(0, count - picked.length));
  }
  return picked;
}

function fillQuestion(idiom, rng) {
  const blank = Math.floor(rng() * 4);
  const correct = idiom.word[blank];
  const options = shuffle([correct, ...pickDistractors(idiom, blank, 3, rng)], rng);
  return {
    type: 'fill',
    word: idiom.word,
    pinyin: idiom.pinyin,
    meaning: idiom.meaning,
    example: idiom.example,
    blank,
    options,
    answer: options.indexOf(correct),
  };
}

function matchQuestion(idioms, rng) {
  const pairs = idioms.map(({ word, pinyin, meaning }) => ({ word, pinyin, meaning }));
  return { type: 'match', pairs, right: shuffle(pairs.map((pair) => pair.meaning), rng) };
}

function chainQuestion(chain, rng) {
  const head = findIdiom(chain.from);
  const wrongs = IDIOMS.filter(
    (item) =>
      item.word !== chain.from &&
      item.word !== chain.to &&
      !chainCheck(chain.from, item.word).ok,
  );
  const options = shuffle(
    [chain.to, ...shuffle(wrongs, rng).slice(0, 2).map((item) => item.word)],
    rng,
  );
  return {
    type: 'chain',
    head: chain.from,
    headPinyin: head.pinyin,
    tail: chain.to,
    homophone: chain.homophone,
    options,
    answer: options.indexOf(chain.to),
  };
}

export const DEFAULT_SEED = 20260601;
export const QUESTION_TYPES = ['fill', 'match', 'chain', 'fill'];
export const LEVEL_COUNT = LEVEL_DESIGNS.length;

export function buildLevels(seed = DEFAULT_SEED) {
  return LEVEL_DESIGNS.map((design, id) => {
    const rng = mulberry32((seed + id * 7919) >>> 0);
    const idioms = design.words.map(findIdiom);
    const questions = QUESTION_TYPES.map((type, index) =>
      type === 'fill'
        ? fillQuestion(idioms[index === 0 ? 0 : 3], rng)
        : type === 'match'
          ? matchQuestion(idioms, rng)
          : chainQuestion(CHAIN_PAIRS[id], rng),
    );
    return {
      id,
      name: design.name,
      story: design.story,
      chapter: design.chapter,
      questions,
    };
  });
}
