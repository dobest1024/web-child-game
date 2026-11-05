export const cols = 7;
export const rows = 6;
export const vectors = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export const key = ([x, y]) => `${x},${y}`;
export const themes = [
  {
    name: '晨露花园',
    icon: '🌼',
    background: '#dbe9c1',
    ground: '#eef4dd',
    accent: '#6d9467',
    story: '把第一滴清水，送给等候的小花。',
  },
  {
    name: '贝壳海湾',
    icon: '🐚',
    background: '#f1dfae',
    ground: '#fbf0ce',
    accent: '#bf9c64',
    story: '海风轻轻吹，花园也想喝口水。',
  },
  {
    name: '月光温室',
    icon: '🌙',
    background: '#d5d5ec',
    ground: '#e8e7f6',
    accent: '#9395b5',
    story: '让月光下的每一朵花，重新亮起来。',
  },
];
const route = (text) =>
  text.split(' ').map((point) => point.split(',').map(Number));
const designs = [
  [
    '第一滴问候',
    ['0,2 1,2 2,2 3,2 4,2'],
    '点一下水管，它会顺时针转一格。先把横向管道连起来！',
  ],
  [
    '拐个弯见面',
    ['0,3 1,3 2,3 2,2 2,1 3,1 4,1'],
    '弯管有两个开口，让它们对准前后两格。',
  ],
  [
    '花田小曲线',
    ['0,4 1,4 1,3 1,2 2,2 3,2 4,2 4,3 5,3 6,3'],
    '从水源开始，一节一节检查开口有没有对上。',
  ],
  [
    '两朵花的约定',
    ['0,2 1,2 2,2 3,2 3,1 4,1 5,1', '3,2 3,3 3,4 4,4 5,4'],
    '三通管可以分出两条水路，两朵花都要喝到水。',
  ],
  [
    '花园小管家',
    ['0,3 1,3 2,3 2,2 3,2 4,2 5,2 6,2', '2,3 2,4 3,4 4,4 5,4'],
    '先接通分岔前的水路，再照顾左右两片花田。',
  ],
  [
    '海风的礼物',
    ['0,1 1,1 2,1 2,2 3,2 4,2 5,2 5,3 6,3'],
    '欢迎来到海湾！转动管道，把水送到贝壳花盆。',
  ],
  [
    '打开小阀门',
    ['0,3 1,3 2,3 3,3 4,3 4,2 5,2 6,2'],
    '红色阀门挡住了水。点阀门上的小开关，把它打开。',
  ],
  [
    '沙滩分水站',
    ['0,2 1,2 2,2 3,2 3,1 4,1 5,1 6,1', '3,2 3,3 3,4 4,4 5,4 6,4'],
    '两条支路都要连通，别让一朵花还在等水哦。',
  ],
  [
    '三份清凉',
    [
      '0,3 1,3 2,3 3,3 4,3 5,3 6,3',
      '2,3 2,2 2,1 3,1 4,1 5,1',
      '4,3 4,4 5,4 6,4',
    ],
    '三朵花需要三条小水路。留意两个三通管的方向。',
  ],
  [
    '贝壳花园节',
    [
      '0,2 1,2 2,2 3,2 4,2 5,2 6,2',
      '2,2 2,1 3,1 4,1 5,1',
      '4,2 4,3 4,4 5,4 6,4',
    ],
    '阀门打开以后，水才能流到后面的花田。',
  ],
  [
    '月光第一站',
    ['0,4 1,4 1,3 2,3 3,3 3,2 3,1 4,1 5,1 6,1'],
    '月光温室亮起来啦。长水路可以分成几段来检查。',
  ],
  [
    '星星分流器',
    ['0,3 1,3 2,3 3,3 4,3 5,3 6,3', '3,3 3,2 3,1 4,1 5,1', '3,3 3,4 4,4 5,4'],
    '十字管可以分出三条路，四个开口都要接好。',
  ],
  [
    '晚安铃兰',
    [
      '0,1 1,1 2,1 2,2 3,2 4,2 5,2 6,2',
      '2,2 2,3 2,4 3,4 4,4 5,4',
      '4,2 4,1 5,1 6,1',
    ],
    '先检查阀门，再检查三通，最后看看花盆入口。',
  ],
  [
    '温室小巡游',
    [
      '0,3 1,3 2,3 3,3 4,3 5,3 6,3',
      '2,3 2,2 2,1 3,1 4,1 5,1',
      '4,3 4,4 3,4 2,4 1,4',
    ],
    '有的花在来时的方向。水管能拐弯，试着往回连。',
  ],
  [
    '满园星光',
    [
      '0,2 1,2 2,2 3,2 4,2 5,2 6,2',
      '2,2 2,1 3,1 4,1 5,1 6,1',
      '4,2 4,3 4,4 5,4 6,4',
    ],
    '最后一站啦！让所有花朵盛开，成为星光花园的小园丁。',
  ],
];
export const rotatePorts = (ports, rotation) =>
  ports.map((direction) => (direction + rotation) % 4).sort((a, b) => a - b);
export const levels = designs.map(([name, paths, hint], id) => {
  const routes = paths.map(route);
  const connections = new Map();
  const add = (point, direction) => {
    const id = key(point);
    if (!connections.has(id)) connections.set(id, new Set());
    connections.get(id).add(direction);
  };
  for (const path of routes)
    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1],
        to = path[i];
      const direction = vectors.findIndex(
        ([dx, dy]) => from[0] + dx === to[0] && from[1] + dy === to[1],
      );
      add(from, direction);
      add(to, (direction + 2) % 4);
    }
  const source = key(routes[0][0]);
  const flowers = routes.map((path) => key(path.at(-1)));
  const gateKey = id >= 6 ? key(routes[0][id === 6 ? 3 : 1]) : null;
  let budget = 0;
  const tiles = [...connections].map(([at, set], index) => {
    const ports = [...set].sort((a, b) => a - b);
    const kind =
      at === source
        ? 'source'
        : flowers.includes(at)
          ? 'flower'
          : at === gateKey
            ? 'valve'
            : 'pipe';
    const locked = kind !== 'pipe';
    const rotation = locked ? 0 : (id + index * 3 + 1) % 4;
    const initial = rotatePorts(ports, rotation);
    let turns = 0;
    while (
      JSON.stringify(rotatePorts(initial, turns)) !== JSON.stringify(ports)
    )
      turns++;
    budget += turns;
    return {
      at,
      ports: initial,
      kind,
      rotation: 0,
      open: kind !== 'valve',
      solution: turns,
    };
  });
  // A disconnected spare pipe is harmless until a live pipe points at it.
  if (id > 1) {
    const occupied = new Set(tiles.map((tile) => tile.at));
    const spare = ['6,5', '6,0', '0,5'].find((at) => !occupied.has(at));
    if (spare)
      tiles.push({
        at: spare,
        ports: [0, 1],
        kind: 'pipe',
        rotation: 0,
        open: true,
        solution: 0,
        spare: true,
      });
  }
  return {
    id,
    name,
    hint,
    theme: Math.floor(id / 5),
    source,
    flowers,
    tiles,
    budget: budget + Number(Boolean(gateKey)),
    story: themes[Math.floor(id / 5)].story,
  };
});
export function initialTiles(level) {
  return level.tiles.map((tile) => ({ ...tile, ports: [...tile.ports] }));
}
export function solutionTiles(level) {
  return initialTiles(level).map((tile) => ({
    ...tile,
    rotation: tile.solution,
    open: true,
  }));
}
