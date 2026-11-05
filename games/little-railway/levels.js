export const cols = 8;
export const rows = 6;
export const themes = [
  {
    name: '春日森林',
    subtitle: '和森林朋友一起出发',
    icon: '🌿',
    ground: '#c5df9a',
    tile: '#d9e9b6',
    dark: '#315e47',
    water: '#85d0d7',
    sky: '#d5ede4',
  },
  {
    name: '糖果海湾',
    subtitle: '沿着海风，去看更远的风景',
    icon: '🐚',
    ground: '#f0d899',
    tile: '#f7e7b7',
    dark: '#377779',
    water: '#78cbdc',
    sky: '#d4edf1',
  },
  {
    name: '星光雪山',
    subtitle: '把温暖送到白雪覆盖的小站',
    icon: '❄️',
    ground: '#cddfe4',
    tile: '#e4eef0',
    dark: '#526788',
    water: '#91bfdc',
    sky: '#dce5f5',
  },
];
// Authored routes guarantee that every challenge can earn all three stars.
const designs = [
  [
    '第一声汽笛',
    '小兔第一次坐火车。沿着草地，把它送到红屋顶车站吧！',
    '0,3 1,3 2,3 3,3 4,3 5,3 6,3 7,3',
  ],
  [
    '花田里的弯弯',
    '小熊在花田等你。铁路也可以拐弯哦！',
    '0,4 1,4 2,4 2,3 2,2 3,2 4,2 5,2 6,2 7,2',
  ],
  [
    '一起去野餐',
    '两位朋友约好去野餐，一个都不能落下。',
    '0,2 1,2 1,3 1,4 2,4 3,4 4,4 5,4 5,3 6,3 7,3',
  ],
  [
    '小溪上的木桥',
    '小溪不能直接铺轨，找到木桥就能到对岸。',
    '0,3 1,3 2,3 2,2 2,1 3,1 4,1 5,1 5,2 6,2 7,2',
  ],
  [
    '苹果快递',
    '绕过果园接上伙伴，再把野餐篮带去车站。',
    '0,1 1,1 1,2 1,3 2,3 3,3 4,3 5,3 5,4 6,4 7,4',
  ],
  [
    '森林巡游日',
    '森林列车长的最后一站：三个朋友都准备好啦！',
    '0,4 1,4 1,3 1,2 2,2 3,2 4,2 5,2 5,1 6,1 6,2 6,3 7,3',
  ],
  [
    '海风来信',
    '欢迎来到海湾！小猫想坐火车去看海。',
    '0,2 1,2 2,2 2,3 3,3 4,3 5,3 6,3 7,3',
  ],
  [
    '贝壳小路',
    '海边的小路弯弯曲曲，去接等在沙滩上的朋友。',
    '0,4 1,4 2,4 2,3 3,3 3,2 4,2 5,2 6,2 6,1 7,1',
  ],
  [
    '蓝色海湾桥',
    '海湾中间只有一座桥。先观察，再铺轨。',
    '0,1 1,1 2,1 2,2 2,3 2,4 3,4 4,4 5,4 6,4 6,3 7,3',
  ],
  [
    '灯塔下午茶',
    '小熊和小猫要去灯塔喝茶，顺路带上星星纪念章。',
    '0,3 1,3 1,2 2,2 3,2 4,2 5,2 5,3 5,4 6,4 7,4',
  ],
  [
    '珊瑚湾旅行',
    '三位旅客，三份期待。规划一条不走回头路的铁路。',
    '0,4 1,4 1,3 1,2 1,1 2,1 3,1 4,1 5,1 5,2 5,3 6,3 7,3',
  ],
  [
    '海湾庆典',
    '庆典就要开始啦！绕过礁石，接齐朋友一起出发。',
    '0,1 1,1 1,2 1,3 2,3 3,3 3,4 4,4 5,4 6,4 6,3 6,2 7,2',
  ],
  [
    '第一片雪花',
    '雪地也能铺铁路！接上小企鹅去温暖的小站。',
    '0,3 1,3 2,3 2,2 3,2 4,2 5,2 6,2 7,2',
  ],
  [
    '松林捉迷藏',
    '朋友们藏在雪松旁，看看谁还没有上车。',
    '0,4 1,4 1,3 1,2 2,2 3,2 4,2 5,2 5,3 6,3 7,3',
  ],
  [
    '冰河上的桥',
    '结冰的河面也不能行驶，木桥才是安全的路。',
    '0,2 1,2 2,2 2,3 2,4 3,4 4,4 5,4 5,3 5,2 6,2 7,2',
  ],
  [
    '热可可专列',
    '接齐三位冻得红扑扑的朋友，去车站喝热可可。',
    '0,1 1,1 1,2 2,2 2,3 3,3 4,3 5,3 5,2 6,2 6,1 7,1',
  ],
  [
    '雪山邮差',
    '穿过雪山，把星星纪念章和朋友一起送到终点。',
    '0,4 1,4 2,4 2,3 2,2 2,1 3,1 4,1 5,1 5,2 5,3 6,3 6,4 7,4',
  ],
  [
    '星光团圆号',
    '最后一趟星光列车，带上所有朋友去参加团圆晚会！',
    '0,1 1,1 1,2 1,3 2,3 2,4 3,4 4,4 5,4 5,3 5,2 5,1 6,1 6,2 7,2',
  ],
];
export const key = (point) => point.join(',');
export const same = (a, b) => a[0] === b[0] && a[1] === b[1];
export const referenceRoutes = designs.map((design) =>
  design[2].split(' ').map((p) => p.split(',').map(Number)),
);
export const levels = designs.map(([name, story], i) => {
  const route = referenceRoutes[i];
  const safe = new Set(route.map(key));
  const theme = Math.floor(i / 6);
  const river = i >= 3 && i % 6 !== 0;
  const bridges = river ? route.filter(([x]) => x === 4).map(key) : [];
  const water = river
    ? Array.from({ length: rows }, (_, y) => `4,${y}`).filter(
        (p) => !bridges.includes(p),
      )
    : [];
  const rocks = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const p = `${x},${y}`;
      if (
        !safe.has(p) &&
        !water.includes(p) &&
        (x * 17 + y * 11 + i * 7) % 9 < (i === 0 ? 1 : 3)
      )
        rocks.push(p);
    }
  const count = i < 2 || i === 6 || i === 12 ? 1 : i % 6 >= 4 ? 3 : 2;
  const animals = ['兔兔', '小熊', '小猫', '企鹅'];
  const firstKind = i === 1 ? 1 : i % 6 === 0 ? [0, 2, 3][theme] : theme;
  const passengers = Array.from({ length: count }, (_, n) => ({
    at: route[Math.floor(((n + 1) * (route.length - 1)) / (count + 1))],
    name: animals[(firstKind + n) % animals.length],
    kind: (firstKind + n) % 4,
  }));
  const used = new Set(passengers.map((p) => key(p.at)));
  const token = route.slice(2, -1).find((p) => !used.has(key(p)));
  return {
    id: i,
    name,
    story,
    theme,
    start: route[0],
    goal: route.at(-1),
    passengers,
    tokens: token ? [token] : [],
    rocks,
    water,
    bridges,
    budget: route.length - 1,
    sandbox: false,
  };
});
export function sandboxLevel() {
  return {
    id: 'free',
    name: '我的梦幻铁路',
    story: '种树、挖河、建桥、邀请朋友，再铺一条属于你的铁路！',
    theme: 0,
    start: [0, 3],
    goal: [7, 3],
    passengers: [],
    tokens: [],
    rocks: [],
    water: [],
    bridges: [],
    budget: 47,
    sandbox: true,
  };
}
