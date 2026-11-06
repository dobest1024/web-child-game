// 12 Authored Levels for Gear Lab (齿轮连动坊)

export const LEVELS = [
  {
    id: 1,
    title: '初识齿轮传动',
    desc: '放置一个中齿轮，将动力电机的旋转传递给右侧的目标齿轮。',
    tip: '两个咬合的齿轮，转向必定相反！',
    optimalGears: 1,
    tray: ['M', 'S'],
    pegs: [
      { id: 'p_motor', x: 180, y: 200, fixedGear: 'S', isMotor: true, motorDir: 1 },
      { id: 'p_mid', x: 255, y: 200 }, // dist from motor: 75 (S 30 + M 45)
      { id: 'p_target', x: 345, y: 200, fixedGear: 'M', isTarget: true, targetReq: { dir: 1 } }, // dist from mid: 90 (M 45 + M 45)
    ],
  },
  {
    id: 2,
    title: '转向变换器',
    desc: '目标齿轮要求逆时针(⟲)旋转，利用齿轮链完成转向控制！',
    tip: '每增加一个中间齿轮（介轮），输出端的转向就会翻转一次。',
    optimalGears: 2,
    tray: ['S', 'S', 'M'],
    pegs: [
      { id: 'p_motor', x: 160, y: 200, fixedGear: 'M', isMotor: true, motorDir: 1 },
      { id: 'p_1', x: 235, y: 200 }, // M 45 + S 30 = 75
      { id: 'p_2', x: 295, y: 200 }, // S 30 + S 30 = 60
      { id: 'p_target', x: 370, y: 200, fixedGear: 'M', isTarget: true, targetReq: { dir: -1 } }, // S 30 + M 45 = 75
    ],
  },
  {
    id: 3,
    title: '齿轮加速器',
    desc: '用大齿轮带动小齿轮，让终点风车达到 2 倍以上转速！',
    tip: '大齿轮齿数多，转一圈会让小齿轮转好多圈！',
    optimalGears: 1,
    tray: ['S', 'M', 'L'],
    pegs: [
      { id: 'p_motor', x: 200, y: 200, fixedGear: 'L', isMotor: true, motorDir: 1 }, // 24 teeth
      { id: 'p_target', x: 290, y: 200, fixedGear: 'S', isTarget: true, targetReq: { minSpeed: 2.0 } }, // L 60 + S 30 = 90 (ratio = 24/12 = 2.0)
    ],
  },
  {
    id: 4,
    title: '齿轮减速器',
    desc: '小马达转得太快啦！请让吊车齿轮慢悠悠平稳转动（转速 ≤ 0.5）。',
    tip: '小齿轮带动大齿轮可以减速并增大力量（扭矩）！',
    optimalGears: 1,
    tray: ['L', 'M', 'S'],
    pegs: [
      { id: 'p_motor', x: 200, y: 200, fixedGear: 'S', isMotor: true, motorDir: 1 }, // 12 teeth
      { id: 'p_target', x: 290, y: 200, fixedGear: 'L', isTarget: true, targetReq: { dir: -1 } }, // S 30 + L 60 = 90 (ratio = 0.5)
    ],
  },
  {
    id: 5,
    title: '三角折线避障',
    desc: '中间有固定障碍物阻挡，请将齿轮向上折线排列搭桥绕过去。',
    tip: '齿轮可以在任意角度咬合，不一定要排成一条直线哦！',
    optimalGears: 2,
    tray: ['M', 'M', 'S'],
    pegs: [
      { id: 'p_motor', x: 180, y: 260, fixedGear: 'S', isMotor: true, motorDir: 1 },
      { id: 'p_bridge1', x: 233, y: 207 }, // dx=53, dy=-53, dist=75 (S 30 + M 45)
      { id: 'p_bridge2', x: 323, y: 207 }, // dist=90 (M 45 + M 45)
      { id: 'p_target', x: 376, y: 260, fixedGear: 'S', isTarget: true, targetReq: { dir: 1 } }, // dist=75 (M 45 + S 30)
    ],
  },
  {
    id: 6,
    title: '双路动力分流',
    desc: '中央电机要同时带动左右两个不同方向的快乐风车！',
    tip: '一个主动轮可以同时与多个齿轮咬合分流动力。',
    optimalGears: 2,
    tray: ['S', 'M', 'L'],
    pegs: [
      { id: 'p_motor', x: 270, y: 200, fixedGear: 'M', isMotor: true, motorDir: 1 },
      { id: 'p_left', x: 195, y: 200 }, // dist=75 (M 45 + S 30)
      { id: 'p_target_left', x: 135, y: 200, fixedGear: 'S', isTarget: true, targetReq: { dir: 1 } }, // dist=60 (S 30 + S 30)
      { id: 'p_target_right', x: 345, y: 200, fixedGear: 'S', isTarget: true, targetReq: { dir: -1 } }, // dist=75 (M 45 + S 30)
    ],
  },
  {
    id: 7,
    title: '破解死锁之谜',
    desc: '小心！如果三个齿轮互相咬合就会发生机械卡死，找一条顺畅路径！',
    tip: '奇数个齿轮闭合成环会产生矛盾转向导致卡死，要避开死锁空位！',
    optimalGears: 2,
    tray: ['S', 'M', 'L'],
    pegs: [
      { id: 'p_motor', x: 180, y: 160, fixedGear: 'S', isMotor: true, motorDir: 1 },
      { id: 'p_trap', x: 233, y: 213 }, // trap peg forming triangle with motor & mid
      { id: 'p_bypass', x: 240, y: 160 }, // S 30 + S 30 = 60
      { id: 'p_mid', x: 315, y: 160 }, // S 30 + M 45 = 75
      { id: 'p_target', x: 390, y: 160, fixedGear: 'S', isTarget: true, targetReq: { dir: 1 } }, // M 45 + S 30 = 75
    ],
  },
  {
    id: 8,
    title: '跨越深谷',
    desc: '两端距离较远，巧妙组合不同尺寸的齿轮连成长桥。',
    tip: '大齿轮跨度大，小齿轮更灵活！',
    optimalGears: 3,
    tray: ['L', 'M', 'S', 'S'],
    pegs: [
      { id: 'p_motor', x: 140, y: 200, fixedGear: 'S', isMotor: true, motorDir: 1 },
      { id: 'p_1', x: 230, y: 200 }, // S 30 + L 60 = 90
      { id: 'p_2', x: 335, y: 200 }, // L 60 + M 45 = 105
      { id: 'p_target', x: 410, y: 200, fixedGear: 'S', isTarget: true, targetReq: { dir: -1 } }, // M 45 + S 30 = 75
    ],
  },
  {
    id: 9,
    title: '精准时钟转速',
    desc: '钟表师傅需要秒针以 2.0 倍速度顺时针(↻)快速转动！',
    tip: '兼顾传动方向和放大转速两项指标。',
    optimalGears: 2,
    tray: ['L', 'S', 'M'],
    pegs: [
      { id: 'p_motor', x: 160, y: 200, fixedGear: 'M', isMotor: true, motorDir: 1 }, // 18 teeth
      { id: 'p_1', x: 265, y: 200 }, // M 45 + L 60 = 105 (L 24 teeth)
      { id: 'p_2', x: 355, y: 200 }, // L 60 + S 30 = 90 (S 12 teeth)
      { id: 'p_target', x: 415, y: 200, fixedGear: 'S', isTarget: true, targetReq: { dir: 1, minSpeed: 1.5 } }, // S 30 + S 30 = 60
    ],
  },
  {
    id: 10,
    title: '竖直提升机',
    desc: '动力源在底部，通过垂直搭接的齿轮列把动力送到顶层吊篮。',
    tip: '齿轮垂直向上排列同样能稳定传递动力。',
    optimalGears: 2,
    tray: ['M', 'L', 'S'],
    pegs: [
      { id: 'p_motor', x: 270, y: 310, fixedGear: 'S', isMotor: true, motorDir: 1 },
      { id: 'p_up1', x: 270, y: 235 }, // S 30 + M 45 = 75
      { id: 'p_up2', x: 270, y: 130 }, // M 45 + L 60 = 105
      { id: 'p_target', x: 270, y: 40, fixedGear: 'S', isTarget: true, targetReq: { dir: 1 } }, // L 60 + S 30 = 90
    ],
  },
  {
    id: 11,
    title: '音乐八音盒',
    desc: '同时驱动三个高低音铃铛，创造轻快的机械交响乐！',
    tip: '主轴齿轮通过两个支路分别连接上方与右侧的乐器。',
    optimalGears: 3,
    tray: ['S', 'M', 'L', 'M'],
    pegs: [
      { id: 'p_motor', x: 240, y: 240, fixedGear: 'L', isMotor: true, motorDir: 1 }, // 24 teeth
      { id: 'p_top', x: 240, y: 150 }, // L 60 + S 30 = 90
      { id: 'p_target_top', x: 240, y: 90, fixedGear: 'S', isTarget: true, targetReq: { dir: 1 } }, // S 30 + S 30 = 60
      { id: 'p_right', x: 345, y: 240 }, // L 60 + M 45 = 105
      { id: 'p_target_right', x: 420, y: 240, fixedGear: 'S', isTarget: true, targetReq: { dir: -1 } }, // M 45 + S 30 = 75
    ],
  },
  {
    id: 12,
    title: '大师齿轮工坊',
    desc: '终极挑战！连通全场 4 个游乐设施，让整个奇幻工坊一起运转！',
    tip: '全面运用不同尺寸齿轮，合理规划路径，创造完美的工业奇迹！',
    optimalGears: 4,
    tray: ['S', 'M', 'L', 'S', 'M'],
    pegs: [
      { id: 'p_motor', x: 120, y: 200, fixedGear: 'M', isMotor: true, motorDir: 1 },
      { id: 'p_1', x: 195, y: 200 }, // M 45 + S 30 = 75
      { id: 'p_2', x: 285, y: 200 }, // S 30 + L 60 = 90
      { id: 'p_3', x: 375, y: 200 }, // L 60 + S 30 = 90
      { id: 'p_4', x: 450, y: 200 }, // S 30 + M 45 = 75
      { id: 'p_target1', x: 285, y: 110, fixedGear: 'S', isTarget: true, targetReq: { dir: -1 } }, // L 60 + S 30 = 90
      { id: 'p_target2', x: 450, y: 125, fixedGear: 'S', isTarget: true, targetReq: { dir: 1 } }, // M 45 + S 30 = 75
    ],
  },
];
