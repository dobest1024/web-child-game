'use strict';
// ===== 关卡数据：世界 1 英语启蒙岛（关卡一览见 README.md）=====
// mode：bubble 吹泡泡 / snake 字母小蛇 / match 翻翻乐；boss 关在 bubble 或 snake 上加一只恐龙
// snake 的 task：letter 听字母吃字母；word 按顺序吃字母拼出小词（图和整个单词一直显示）

const Vocab = typeof module === 'object' ? require('./words.js') : { word, lettersOf, group };
const ids = (...list) => list.map(Vocab.word);

const WORLDS = [
  {
    id: 1, grades: [1], name: '英语启蒙岛', bg: ['#c9ecff', '#f2fbff'], ground: '#a8dc8c',
    levels: [
      { name: '彩虹泡泡', mode: 'bubble', options: 2, tutorial: true, rise: 52,
        intro: '听一听是什么颜色，戳破那个颜色的泡泡！',
        pool: Vocab.group('color') },
      { name: '字母小蛇 A–M', mode: 'snake', task: 'letter', options: 3, rocks: 0, step: 0.34,
        intro: '点小蛇要去的方向（或按方向键），听到哪个字母就去吃哪个！',
        pool: Vocab.lettersOf('a', 'm') },
      { name: '数一数泡泡', mode: 'bubble', options: 3, rise: 56,
        intro: '数一数圆点，one、two、three……戳对的数字泡泡！',
        pool: Vocab.group('number') },
      { name: '动物翻翻乐', mode: 'match', pairs: 4,
        intro: '翻开卡片会读出单词，把单词卡和动物配成一对！',
        pool: Vocab.group('animal') },
      { name: '小 Boss：捣蛋恐龙', mode: 'bubble', options: 3, rise: 60,
        boss: { name: '捣蛋恐龙', hp: 6, every: 9 },
        intro: '恐龙要跺脚啦！快听音戳对泡泡打它，答对就能打断它跺脚。',
        pool: [...Vocab.group('color'), ...Vocab.group('number'), ...Vocab.group('animal'), ...Vocab.lettersOf('a', 'm')] },
      { name: '字母小蛇 N–Z', mode: 'snake', task: 'letter', options: 3, rocks: 2, step: 0.33,
        intro: '新字母来啦！小心石头，别让小蛇撞上去。',
        pool: Vocab.lettersOf('n', 'z') },
      { name: '水果泡泡', mode: 'bubble', options: 3, rise: 62,
        intro: '甜甜的水果飞上天，听音戳对的水果泡泡！',
        pool: Vocab.group('fruit') },
      { name: '身体和家人翻翻乐', mode: 'match', pairs: 4,
        intro: 'eye、ear、mom、dad……翻开听一听，配成一对！',
        pool: [...Vocab.group('body'), ...Vocab.group('family')] },
      { name: '拼小词', mode: 'snake', task: 'word', options: 1, rocks: 2, step: 0.33, goal: 6,
        intro: '看上面的图和单词，按顺序吃字母，拼出 cat、dog、sun！',
        pool: ids('cat', 'dog', 'pig', 'sun', 'bus', 'fox', 'bed', 'hat') },
      { name: '大 Boss：乱码恐龙王', mode: 'snake', task: 'word', options: 1, rocks: 1, step: 0.34,
        boss: { name: '乱码恐龙王', hp: 6, every: 7 },
        intro: '恐龙王把单词弄乱了！按顺序吃字母拼回来打它，看到红圈快躲开！',
        pool: ids('cat', 'dog', 'pig', 'sun', 'bus', 'fox', 'bed', 'hat') },
    ],
  },

];
const WORD_TOPICS = {"2": [["校园", ["book", "pen", "pencil", "ruler", "eraser", "bag", "desk", "chair"]], ["食物", ["rice", "bread", "milk", "water", "egg", "cake", "juice", "tea"]], ["家里", ["door", "window", "room", "table", "sofa", "clock", "lamp", "floor"]], ["动作", ["run", "walk", "jump", "swim", "sing", "dance", "read", "write"]], ["感受", ["happy", "sad", "angry", "hungry", "thirsty", "tired", "cold", "hot"]], ["比较", ["big", "small", "tall", "short", "long", "old", "new", "young"]], ["衣服", ["shirt", "coat", "dress", "skirt", "shoe", "sock", "cap", "sweater"]], ["人物", ["teacher", "student", "friend", "mother", "father", "brother", "sister", "child"]]], "3": [["课堂", ["school", "classroom", "lesson", "homework", "notebook", "computer", "picture", "blackboard"]], ["数字", ["eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "twenty", "thirty"]], ["餐食", ["breakfast", "lunch", "dinner", "chicken", "beef", "soup", "noodle", "potato"]], ["天气", ["sunny", "rainy", "cloudy", "windy", "snowy", "warm", "cool", "weather"]], ["星期", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "week"]], ["运动", ["football", "basketball", "tennis", "sport", "game", "ball", "play", "ride"]], ["地点", ["park", "zoo", "library", "shop", "hospital", "farm", "house", "garden"]], ["方位", ["in", "on", "under", "behind", "near", "beside", "between", "front"]]], "4": [["学科", ["chinese", "english", "maths", "science", "music", "art", "history", "subject"]], ["职业", ["doctor", "nurse", "farmer", "driver", "cook", "worker", "singer", "pilot"]], ["交通", ["train", "plane", "bike", "boat", "ship", "taxi", "subway", "car"]], ["城市", ["city", "street", "road", "station", "cinema", "museum", "hotel", "supermarket"]], ["购物", ["buy", "sell", "money", "price", "cheap", "expensive", "yuan", "dollar"]], ["日常", ["morning", "afternoon", "evening", "night", "today", "tomorrow", "yesterday", "weekend"]], ["自然", ["river", "lake", "mountain", "forest", "tree", "flower", "grass", "leaf"]], ["健康", ["head", "face", "arm", "leg", "tooth", "back", "heart", "healthy"]]], "5": [["月份", ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]], ["季节", ["spring", "summer", "autumn", "winter", "season", "year", "holiday", "birthday"]], ["能力", ["speak", "listen", "learn", "teach", "draw", "paint", "climb", "skate"]], ["性格", ["kind", "polite", "clever", "helpful", "shy", "quiet", "funny", "strict"]], ["旅行", ["travel", "visit", "trip", "ticket", "map", "airport", "beach", "island"]], ["生活", ["clean", "wash", "brush", "finish", "start", "wait", "open", "close"]], ["频率", ["always", "usually", "often", "sometimes", "never", "early", "late", "again"]], ["环境", ["earth", "world", "plant", "animal", "air", "ocean", "rubbish", "recycle"]]], "6": [["比较", ["bigger", "smaller", "taller", "shorter", "older", "younger", "heavier", "stronger"]], ["过去式", ["went", "saw", "ate", "drank", "bought", "took", "had", "did"]], ["计划", ["plan", "future", "dream", "hope", "decide", "become", "study", "practise"]], ["情绪", ["excited", "worried", "afraid", "proud", "bored", "surprised", "nervous", "calm"]], ["交流", ["question", "answer", "message", "letter", "email", "story", "explain", "understand"]], ["社会", ["country", "village", "people", "family", "neighbour", "visitor", "rule", "safety"]], ["资源", ["save", "waste", "protect", "energy", "electricity", "plastic", "paper", "pollution"]], ["学习", ["because", "before", "after", "different", "important", "interesting", "difficult", "easy"]]]};
for (let grade = 2; grade <= 6; grade++) {
  const levels = [], taught = [];
  WORD_TOPICS[grade].forEach(([name, ids], i) => {
    const pool = ids.map(Vocab.word);
    taught.push(...pool);
    levels.push({ name, mode: i % 2 ? 'match' : 'bubble', options: 3, pairs: 4, rise: 42, goal: pool.length,
      intro: '听单词读音，配对中文意思；翻卡时留心英文拼写。', pool });
    if (i === 3 || i === 7) levels.push({ name: i === 3 ? '词汇小挑战' : '词汇毕业挑战', mode: 'bubble', options: 4, rise: 42,
      boss: { name: '词汇恐龙', hp: 10, every: 15 }, intro: '复习刚学过的主题单词，听音找到对应的意思！', pool: [...taught] });
  });
  // id 2–5 原来预留给三到六年级；二年级使用 6，不覆盖旧存档。
  WORLDS.push({ id: grade === 2 ? 6 : grade - 1, grades: [grade], name: ['','','生活英语岛','校园单词森林','生活单词城堡','主题词汇海湾','英语综合挑战'][grade], bg: ['#c9ecff','#f2fbff'], ground: '#a8dc8c', levels });
}
WORLDS.forEach((w) => (w.levels || []).forEach((L, i) => {
  L.n = i + 1;
  L.goal = L.boss ? L.boss.hp : L.goal || 8;
}));
const worldOfGrade = (grade) => WORLDS.find((w) => w.grades.includes(grade));

// 出一道选择题：目标 + 干扰项（优先同一类，比如颜色配颜色）
function makeOptions(item, pool, count, random = Math.random) {
  const others = pool.filter((p) => p.id !== item.id);
  const same = others.filter((p) => p.group === item.group);
  const rest = others.filter((p) => p.group !== item.group);
  const shuffle = (a) => a.map((v) => [random(), v]).sort((x, y) => x[0] - y[0]).map((v) => v[1]);
  const picks = [...shuffle(same), ...shuffle(rest)].slice(0, Math.max(0, count - 1));
  return shuffle([item, ...picks]);
}

if (typeof module === 'object') module.exports = { WORLDS, worldOfGrade, makeOptions };
