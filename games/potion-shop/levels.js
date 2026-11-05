export const themes = [
  {
    name: '森林早市',
    icon: '🌳',
    concept: '两色魔法',
    story: '两种颜色碰一碰，就会变出新的颜色！',
  },
  {
    name: '花园午后',
    icon: '🌸',
    concept: '比例和浅色',
    story: '多一滴、少一滴，颜色就不一样；加白色，颜色会变浅。',
  },
  {
    name: '月光夜市',
    icon: '🌙',
    concept: '深色和神秘药水',
    story: '加黑色会变深，红黄蓝在一起会变成棕色。',
  },
];

// `base` is the customer's color before the potion.
export const animals = {
  fox: { name: '小狐狸', base: '#f3eee6' },
  frog: { name: '小青蛙', base: '#dcc58e' },
  bear: { name: '小熊', base: '#a87e5c' },
  bunny: { name: '小兔子', base: '#f2ece5' },
  chick: { name: '小鸡', base: '#f5e6a8' },
  owl: { name: '猫头鹰', base: '#bfa284' },
  chameleon: { name: '变色龙', base: '#bdbcb2' },
  flamingo: { name: '火烈鸟', base: '#f3ede8' },
  snowman: { name: '雪人', base: '#fbfbf7' },
  sheep: { name: '小羊', base: '#f4f0e8' },
  ghost: { name: '小幽灵', base: '#ffffff' },
};

const all = ['red', 'yellow', 'blue', 'white', 'black'];
const order = (animal, potion, reason, recipe, solution) => ({
  animal,
  potion,
  reason,
  recipe,
  solution,
});

// Each customer keeps an authored reference solution: the fewest drops that brew the recipe.
export const levels = [
  {
    name: '狐狸的秋装',
    bottles: ['red', 'yellow'],
    capacity: 6,
    hint: '红色和黄色碰一碰，会变成橙色。各加一滴试试！',
    customers: [
      order('fox', '橘子橙', '秋天到啦！我想把白毛换成橘子一样的橙色。', { red: 1, yellow: 1 }, ['red', 'yellow']),
    ],
  },
  {
    name: '青蛙躲猫猫',
    bottles: ['yellow', 'blue'],
    capacity: 6,
    hint: '黄色加蓝色，会变成绿色。',
    customers: [
      order('frog', '叶子绿', '我想变成叶子的颜色，躲进草丛玩捉迷藏！', { yellow: 1, blue: 1 }, ['yellow', 'blue']),
    ],
  },
  {
    name: '小熊的葡萄紫',
    bottles: ['red', 'blue'],
    capacity: 6,
    hint: '红色加蓝色，会变成紫色。',
    customers: [
      order('bear', '葡萄紫', '我最爱吃葡萄啦，想变成一只葡萄紫的小熊！', { red: 1, blue: 1 }, ['red', 'blue']),
    ],
  },
  {
    name: '小兔的紫罗兰',
    bottles: ['red', 'yellow', 'blue'],
    capacity: 6,
    hint: '架子上多了一瓶黄色。紫色要用哪两种颜色呢？',
    customers: [
      order('bunny', '紫罗兰紫', '花园里的紫罗兰真美，我也想变成紫色！', { red: 1, blue: 1 }, ['blue', 'red']),
    ],
  },
  {
    name: '小鸡的太阳帽',
    bottles: ['red', 'yellow', 'blue'],
    capacity: 6,
    hint: '想一想第一位顾客：橙色是哪两种颜色变出来的？',
    customers: [
      order('chick', '太阳橙', '我想变成太阳公公的颜色，暖洋洋的！', { red: 1, yellow: 1 }, ['yellow', 'red']),
    ],
  },
  {
    name: '猫头鹰的午觉',
    bottles: ['red', 'yellow', 'blue'],
    capacity: 8,
    hint: '锅变大啦，能装 8 滴。2 滴黄加 2 滴蓝，也是同样的绿色哦。',
    customers: [
      order('owl', '树叶绿', '白天我想躲在树叶里睡午觉，请把我变成绿色！', { yellow: 1, blue: 1 }, ['blue', 'yellow']),
    ],
  },
  {
    name: '小鸡的芒果色',
    bottles: ['red', 'yellow'],
    capacity: 6,
    hint: '黄色要多一点：2 滴黄加 1 滴红，就是金灿灿的黄橙色。',
    customers: [
      order('chick', '芒果黄', '上次的太阳橙有点红，这次想要黄一点的芒果色！', { red: 1, yellow: 2 }, ['yellow', 'yellow', 'red']),
    ],
  },
  {
    name: '变色龙的新芽',
    bottles: ['yellow', 'blue'],
    capacity: 6,
    hint: '黄色多一点、蓝色少一点，绿色就会变得嫩嫩的。',
    customers: [
      order('chameleon', '嫩芽绿', '春天的新芽是黄绿色的，我想和它们一样！', { yellow: 2, blue: 1 }, ['yellow', 'blue', 'yellow']),
    ],
  },
  {
    name: '小熊的树莓',
    bottles: ['red', 'blue'],
    capacity: 6,
    hint: '紫色里多放一点红色，就变成树莓红啦。',
    customers: [
      order('bear', '树莓红', '吃完葡萄，我又爱上了树莓，想变成树莓红！', { red: 2, blue: 1 }, ['red', 'red', 'blue']),
    ],
  },
  {
    name: '火烈鸟的粉红',
    bottles: ['red', 'white'],
    capacity: 6,
    hint: '白色能让颜色变浅：红色加白色，会变成粉红色。',
    customers: [
      order('flamingo', '火烈鸟粉', '我的羽毛褪成了白色，想变回漂亮的粉红色！', { red: 1, white: 1 }, ['red', 'white']),
    ],
  },
  {
    name: '雪人想要蓝天',
    bottles: ['blue', 'white'],
    capacity: 6,
    hint: '蓝色加白色，会变成浅浅的天蓝色。',
    customers: [
      order('snowman', '天空蓝', '我整天看着天空，想变成天空一样的天蓝色！', { blue: 1, white: 1 }, ['blue', 'white']),
    ],
  },
  {
    name: '小羊的薰衣草',
    bottles: ['red', 'blue', 'white'],
    capacity: 6,
    hint: '先调出紫色，再加白色让它变浅。',
    customers: [
      order('sheep', '薰衣草紫', '我想要一身薰衣草颜色的羊毛，软软香香的！', { red: 1, blue: 1, white: 1 }, ['red', 'blue', 'white']),
    ],
  },
  {
    name: '猫头鹰的夜空',
    bottles: ['blue', 'white', 'black'],
    capacity: 4,
    hint: '黑色会让颜色变深。猫头鹰只要一小杯，最多 4 滴哦。',
    customers: [
      order('owl', '夜空蓝', '天黑啦，我想变成夜空的深蓝色，悄悄地飞。', { blue: 1, black: 1 }, ['blue', 'black']),
    ],
  },
  {
    name: '森林深处',
    bottles: ['yellow', 'blue', 'black'],
    capacity: 6,
    hint: '先调出绿色，再加一点黑色让它变深。',
    customers: [
      order('chameleon', '森林绿', '我要去大森林深处探险，请把我变成深深的绿色！', { yellow: 1, blue: 1, black: 1 }, ['yellow', 'blue', 'black']),
    ],
  },
  {
    name: '小兔钻树洞',
    bottles: ['red', 'yellow', 'blue', 'white'],
    capacity: 6,
    hint: '红、黄、蓝三种颜色都放进去，会变成棕色。',
    customers: [
      order('bunny', '树洞棕', '我要钻进树洞玩捉迷藏，想变成泥土一样的棕色！', { red: 1, yellow: 1, blue: 1 }, ['red', 'yellow', 'blue']),
    ],
  },
  {
    name: '神秘药水',
    bottles: all,
    capacity: 6,
    mystery: true,
    hint: '仔细看看：它像哪一种颜色？是深一点，还是浅一点？',
    customers: [
      order('ghost', '神秘药水', '我是透明的小幽灵，想变成这个颜色，让朋友们看见我！配方是秘密哦。', { yellow: 1, blue: 1, white: 1 }, ['yellow', 'blue', 'white']),
    ],
  },
  {
    name: '忙碌的下午茶',
    bottles: ['red', 'yellow', 'blue', 'white'],
    capacity: 6,
    hint: '两位顾客在排队。先给排在最前面的顾客调，交对了再调下一瓶。',
    customers: [
      order('frog', '荷叶绿', '又是我！这次想变绿，去荷叶上晒太阳。', { yellow: 1, blue: 1 }, ['blue', 'yellow']),
      order('flamingo', '火烈鸟粉', '轮到我啦！请给我一瓶粉红色的药水。', { red: 1, white: 1 }, ['white', 'red']),
    ],
  },
  {
    name: '打烊前的长队',
    bottles: all,
    capacity: 6,
    hint: '三位顾客排长队！每瓶药水都要调对，交完一位再调下一位。',
    customers: [
      order('bear', '葡萄紫', '打烊前再来一瓶葡萄紫，谢谢！', { red: 1, blue: 1 }, ['red', 'blue']),
      order('snowman', '天空蓝', '我也要天空蓝，晚上看星星的时候穿！', { blue: 1, white: 1 }, ['white', 'blue']),
      order('chick', '芒果黄', '最后是我！还要那瓶黄黄的芒果色。', { red: 1, yellow: 2 }, ['yellow', 'red', 'yellow']),
    ],
  },
].map((level, id) => ({ ...level, id, theme: Math.floor(id / 6) }));
