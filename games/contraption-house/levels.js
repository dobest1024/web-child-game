export const tools = {
  ramp: {
    name: '斜坡',
    icon: '◿',
    dx: 140,
    dy: 80,
    description: '往旁边滚 140，下降一层',
  },
  spring: {
    name: '弹簧',
    icon: '↟',
    dx: 140,
    dy: -80,
    description: '弹到旁边，升高一层',
  },
  fan: {
    name: '风扇',
    icon: '✺',
    dx: 210,
    dy: 0,
    description: '平着吹过较远的距离',
  },
  bridge: {
    name: '平桥',
    icon: '═',
    dx: 140,
    dy: 0,
    description: '平着滚过较近的距离',
  },
};
export const themes = [
  {
    name: '森林木工房',
    icon: '🌱',
    sky: '#e5f0de',
    ground: '#c8d7aa',
    ink: '#47725e',
    subtitle: '滚一滚，发现小机关',
  },
  {
    name: '云朵实验室',
    icon: '☁',
    sky: '#e1eff3',
    ground: '#b7d8db',
    ink: '#518392',
    subtitle: '借一点风，跳得更远',
  },
  {
    name: '星光玩具屋',
    icon: '✦',
    sky: '#e8e4f4',
    ground: '#c8bfe0',
    ink: '#77709b',
    subtitle: '串起机关，点亮想象',
  },
];
const designs = [
  [
    '小球的第一趟旅行',
    '松松想听小铃铛响起来。搭两个向右的斜坡，让小球滚下去吧。',
    [70, 110],
    ['ramp', 'ramp'],
    [],
  ],
  [
    '跳上小阁楼',
    '铃铛放在高处了！弹簧能把小球送上一层。',
    [70, 350],
    ['spring', 'spring'],
    [],
  ],
  [
    '滚下去，再跳起来',
    '坡道和弹簧是好朋友。让小球先滚下去，再跳回高处。',
    [70, 190],
    ['ramp', 'spring', 'ramp'],
    [],
  ],
  [
    '越过花盆',
    '花盆挡在下面，搭一条高高低低的机关小路。',
    [70, 270],
    ['spring', 'ramp', 'bridge', 'spring'],
    [{ x: 245, y: 315, w: 50, h: 85 }],
  ],
  [
    '借一阵云朵风',
    '风扇吹得比平桥更远。看看哪个插槽适合它。',
    [70, 190],
    ['fan', 'ramp', 'spring'],
    [],
  ],
  [
    '云端接力',
    '弹上云朵，再让风把小球送给下一位机关朋友。',
    [70, 350],
    ['spring', 'fan', 'ramp'],
    [],
  ],
  [
    '长桥与短桥',
    '相同高度也有不同距离。别让小球落在两个插槽之间。',
    [70, 190],
    ['bridge', 'fan', 'bridge', 'ramp'],
    [],
  ],
  [
    '穿过风车谷',
    '先登高，再越过下面的大箱子。最后轻轻滚到铃铛旁。',
    [70, 350],
    ['spring', 'spring', 'fan', 'ramp'],
    [{ x: 285, y: 310, w: 95, h: 105 }],
  ],
  [
    '转个方向想一想',
    '机关也可以朝左！点击选中机关后，试试「换方向」。',
    [560, 110],
    ['ramp-', 'ramp-', 'spring-', 'bridge'],
    [],
  ],
  [
    '星星回旋舞',
    '右边的机关把小球送下楼，左边的机关再把它接回来。',
    [70, 110],
    ['fan', 'ramp', 'ramp-', 'bridge', 'spring'],
    [],
  ],
  [
    '玩具塔的秘密',
    '高低之间藏着星星。选对机关，把它们一起送到终点。',
    [70, 350],
    ['spring', 'fan', 'spring', 'ramp', 'bridge-'],
    [{ x: 400, y: 365, w: 85, h: 60 }],
  ],
  [
    '叮当音乐会',
    '最后一场机关音乐会！把风、弹簧和斜坡连成一段快乐的旅程。',
    [70, 190],
    ['ramp', 'spring', 'fan', 'ramp-', 'bridge', 'spring'],
    [],
  ],
];
export function endpoint(point, piece) {
  const tool = tools[piece.type];
  return [point[0] + tool.dx * piece.direction, point[1] + tool.dy];
}
export const levels = designs.map(
  ([name, story, start, codes, obstacles], id) => {
    const slots = [];
    const solution = {};
    let point = start;
    for (const code of codes) {
      const piece = {
        type: code.replace('-', ''),
        direction: code.endsWith('-') ? -1 : 1,
      };
      const index = slots.length;
      slots.push({ x: point[0], y: point[1] });
      solution[index] = piece;
      point = endpoint(point, piece);
    }
    const goal = point;
    // Decoy sockets introduce alternative placements without drawing a grid.
    if (id > 1) {
      const candidates = [
        [140, 430],
        [630, 430],
        [700, 110],
        [490, 430],
      ];
      for (const p of candidates) {
        if (
          !slots.some((s) => Math.hypot(s.x - p[0], s.y - p[1]) < 75) &&
          Math.hypot(goal[0] - p[0], goal[1] - p[1]) > 75
        ) {
          slots.push({ x: p[0], y: p[1] });
          break;
        }
      }
    }
    const available =
      id === 0
        ? ['ramp']
        : id === 1
          ? ['spring', 'ramp']
          : id < 4
            ? ['ramp', 'spring', 'bridge']
            : Object.keys(tools);
    const stars = codes
      .map((_, i) => {
        const source = slots[i];
        const piece = solution[i];
        const end = endpoint([source.x, source.y], piece);
        return {
          x: (source.x + end[0]) / 2,
          y:
            (source.y + end[1]) / 2 -
            (piece.type === 'spring' ? 65 : piece.type === 'fan' ? 12 : 0),
        };
      })
      .filter((_, i) => i % 2 === 0);
    return {
      id,
      name,
      story,
      theme: Math.floor(id / 4),
      slots,
      start: 0,
      goal,
      solution,
      obstacles,
      stars,
      available,
      budget: codes.length,
    };
  },
);
