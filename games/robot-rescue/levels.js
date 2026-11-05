export const cols = 7;
export const rows = 6;
export const directions = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
export const key = (p) => p.join(',');
export const same = (a, b) => a[0] === b[0] && a[1] === b[1];
export const themes = [
  {
    name: '萌芽森林',
    label: '认识方向 · 排好顺序',
    icon: '🌱',
    floor: '#c9e0ae',
    light: '#dfedc9',
    accent: '#537b58',
    sky: '#e6f0d7',
  },
  {
    name: '泡泡海岸',
    label: '发现重复 · 启动机关',
    icon: '🫧',
    floor: '#f1dfad',
    light: '#fbebc4',
    accent: '#3c8790',
    sky: '#def1f1',
  },
  {
    name: '萤火山谷',
    label: '观察障碍 · 作出判断',
    icon: '✨',
    floor: '#c7c8e5',
    light: '#deddf1',
    accent: '#7670a6',
    sky: '#ece9f6',
  },
];
const designs = [
  [
    '你好，小队长',
    '小兔迷路啦！让豆豆走到它身边，抱起它，再去救援站。',
    '0,3 1,3 2,3 3,3 4,3',
    '先放 2 张前进，再放救援，最后放 2 张前进。',
  ],
  [
    '向阳花的转角',
    '小熊在花田边等着。转向只改变朝向，不会走动哦。',
    '0,4 1,4 2,4 2,3 2,2 3,2 4,2 5,2',
    '先向右走，再左转向上；用右转可以重新朝右。',
  ],
  [
    '绕开大树',
    '小猫被大树挡住了视线。绕个弯，它就能看见你！',
    '0,1 1,1 1,2 1,3 2,3 3,3 4,3 5,3 6,3',
    '看豆豆脚下的箭头。右转后，前进的方向也会改变。',
  ],
  [
    '一对好朋友',
    '小兔和小熊约好一起回家，记得分别抱起它们。',
    '0,4 1,4 2,4 3,4 3,3 3,2 4,2 5,2 6,2',
    '每到一位朋友所在的格子，放一张「救援」。',
  ],
  [
    '小小绕行家',
    '沿着花丛弯弯绕绕，带朋友去亮着灯的小屋。',
    '0,3 1,3 1,4 2,4 3,4 4,4 4,3 4,2 5,2 6,2',
    '可以先用「走一步」观察每条指令的结果。',
  ],
  [
    '森林救援勋章',
    '三位朋友正在等待，出发前先把路线想清楚。',
    '0,1 1,1 2,1 2,2 2,3 3,3 4,3 5,3 5,4 6,4',
    '路线可以分成几小段，先接近一个朋友，再安排后面的路。',
  ],
  [
    '重复的魔法',
    '新工具来了：把前进放进重复口袋，豆豆就会多走几步。',
    '0,3 1,3 2,3 3,3 4,3 5,3 6,3',
    '试试「重复 3 次：前进」，接着救援，再重复 3 次前进。',
  ],
  [
    '沙滩小巡逻',
    '相似的路可以用同一个小口袋装起来。',
    '0,4 1,4 2,4 3,4 3,3 3,2 3,1 4,1 5,1 6,1',
    '选择「重复口袋」后，再点前进或转向，就能把指令装进去。',
  ],
  [
    '桥梁启动器',
    '桥还没升起来。走到黄色开关上，按下机关，再过河。',
    '0,3 1,3 2,3 3,3 4,3 5,3 6,3',
    '第 4 行第 3 列是开关；站上去后执行「机关」。',
  ],
  [
    '海风送朋友',
    '先开桥，再带两位朋友一起去海边的小站。',
    '0,4 1,4 2,4 2,3 3,3 4,3 5,3 5,2 5,1 6,1',
    '开关是黄色的圆形按钮。开启后，所有虚线桥都会升起来。',
  ],
  [
    '贝壳接力',
    '三个朋友散落在沙滩上，安排好每一站的救援顺序。',
    '0,1 1,1 2,1 2,2 2,3 3,3 4,3 5,3 5,4 6,4',
    '到动物的格子要停下救援；重复口袋不要让豆豆走过头。',
  ],
  [
    '海岸总动员',
    '绕行、救援、开桥，把学到的本领连起来！',
    '0,4 1,4 1,3 1,2 2,2 3,2 4,2 5,2 5,3 5,4 6,4',
    '如果走错，保留指令、回到起点，点错的指令就能删除。',
  ],
  [
    '萤火探路灯',
    '探路灯会观察前方：有障碍就右转，没有就前进。',
    '0,1 1,1 2,1 2,2 2,3 2,4 3,4 4,4 5,4 6,4',
    '用「探路」替代前进试试看。前方是树时，它会原地右转。',
  ],
  [
    '会思考的拐角',
    '山谷里藏着小伙伴。把观察和行动排进同一段程序。',
    '0,1 1,1 2,1 3,1 3,2 3,3 4,3 5,3 6,3',
    '探路只看前方一格；右边是否能走，要等下一次指令再检查。',
  ],
  [
    '萤火小桥',
    '小桥旁的开关亮了，别让豆豆把没开的桥当成道路。',
    '0,4 1,4 2,4 2,3 2,2 3,2 4,2 5,2 6,2',
    '未开启的桥也是障碍。先按机关，探路灯才会把它当作通路。',
  ],
  [
    '月光巡逻队',
    '豆豆要沿着月光小路接齐朋友，用短短的指令完成长长的路。',
    '0,1 1,1 2,1 3,1 3,2 3,3 3,4 4,4 5,4 6,4',
    '重复口袋能装多个动作：例如前进、前进、右转。',
  ],
  [
    '星星护送员',
    '把三位朋友和能量星星一起带回温暖的救援站。',
    '0,4 1,4 2,4 2,3 2,2 3,2 4,2 5,2 5,3 5,4 6,4',
    '先完成救援，再挑战更少的指令。失败不会扣掉已得到的星星。',
  ],
  [
    '豆豆的大冒险',
    '最后一次任务！开动小脑筋，让所有朋友平安到站。',
    '0,1 1,1 1,2 1,3 2,3 3,3 4,3 5,3 5,4 6,4',
    '先看开关，再找动物的位置。用一步一步执行来检查计划。',
  ],
];
const paths = designs.map((entry) =>
  entry[2].split(' ').map((p) => p.split(',').map(Number)),
);
export const commands = {
  forward: {
    icon: '↑',
    name: '前进',
    detail: '沿当前朝向走一格',
    color: 'mint',
  },
  left: {
    icon: '↶',
    name: '左转',
    detail: '原地向左转，不走动',
    color: 'blue',
  },
  right: {
    icon: '↷',
    name: '右转',
    detail: '原地向右转，不走动',
    color: 'blue',
  },
  rescue: {
    icon: '♡',
    name: '救援',
    detail: '站在动物的格子上，抱起朋友',
    color: 'pink',
  },
  switch: {
    icon: '⚡',
    name: '机关',
    detail: '站在黄色开关上，升起木桥',
    color: 'yellow',
  },
  probe: {
    icon: '◉',
    name: '探路',
    detail: '前方有障碍就右转，否则前进一格',
    color: 'purple',
  },
};
export function compact(actions, allowed) {
  if (!allowed) return actions.map((type) => ({ type }));
  const program = [];
  for (let i = 0; i < actions.length; ) {
    let count = 1;
    while (
      count < 4 &&
      actions[i + count] === actions[i] &&
      ['forward', 'probe'].includes(actions[i])
    )
      count++;
    if (count >= 3)
      program.push({
        type: 'repeat',
        times: count,
        body: [{ type: actions[i] }],
      });
    else for (let j = 0; j < count; j++) program.push({ type: actions[i] });
    i += count;
  }
  return program;
}
export const levels = designs.map(([name, story, , hint], id) => {
  const path = paths[id];
  const theme = Math.floor(id / 6);
  const safe = new Set(path.map(key));
  const count = [0, 1, 2, 6, 8, 12].includes(id)
    ? 1
    : [5, 10, 11, 15, 16, 17].includes(id)
      ? 3
      : 2;
  const animals = Array.from({ length: count }, (_, n) => ({
    at: path[Math.floor(((n + 1) * (path.length - 1)) / (count + 1))],
    kind: ((id === 3 ? 0 : id) + n) % 4,
    name: ['兔兔', '小熊', '小猫', '企鹅'][((id === 3 ? 0 : id) + n) % 4],
  }));
  const hasBridge = [8, 9, 11, 14, 17].includes(id);
  const gates = hasBridge ? path.filter(([x]) => x === 3).map(key) : [];
  const water = hasBridge
    ? Array.from({ length: rows }, (_, y) => `3,${y}`).filter(
        (p) => !gates.includes(p),
      )
    : [];
  const switchAt = hasBridge
    ? path[path.findIndex((p) => key(p) === gates[0]) - 1]
    : null;
  const occupied = new Set([
    ...animals.map((a) => key(a.at)),
    ...(switchAt ? [key(switchAt)] : []),
  ]);
  const crystals = [
    path.slice(1, -1).find((p) => !occupied.has(key(p))),
  ].filter(Boolean);
  const rocks = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const p = `${x},${y}`;
      if (
        !safe.has(p) &&
        !water.includes(p) &&
        (x * 7 + y * 13 + id * 3) % 9 < 3
      )
        rocks.push(p);
    }
  let dir = 0;
  const actions = [];
  for (let i = 0; i < path.length; i++) {
    if (animals.some((a) => same(a.at, path[i]))) actions.push('rescue');
    if (switchAt && same(switchAt, path[i])) actions.push('switch');
    if (i === path.length - 1) break;
    const desired = directions.findIndex(
      ([dx, dy]) =>
        path[i + 1][0] - path[i][0] === dx &&
        path[i + 1][1] - path[i][1] === dy,
    );
    const turn = (desired - dir + 4) % 4;
    if (turn === 3) actions.push('left');
    if (turn === 2) actions.push('right', 'right');
    if (turn === 1) {
      const ahead = [
        path[i][0] + directions[dir][0],
        path[i][1] + directions[dir][1],
      ];
      const canBlock = !safe.has(key(ahead));
      if (id >= 12 && canBlock) {
        if (
          ahead[0] >= 0 &&
          ahead[0] < cols &&
          ahead[1] >= 0 &&
          ahead[1] < rows &&
          !water.includes(key(ahead))
        )
          rocks.push(key(ahead));
        actions.push('probe');
      } else actions.push('right');
    }
    dir = desired;
    actions.push(id >= 12 ? 'probe' : 'forward');
  }
  const solution = compact(actions, id >= 6);
  const budget = solution.reduce(
    (sum, command) =>
      sum + (command.type === 'repeat' ? 1 + command.body.length : 1),
    0,
  );
  return {
    id,
    name,
    story,
    hint,
    theme,
    start: path[0],
    goal: path.at(-1),
    direction: 0,
    animals,
    crystals,
    rocks: [...new Set(rocks)],
    water,
    gates,
    switchAt,
    budget,
    solution,
    repeat: id >= 6,
    probe: id >= 12,
  };
});
