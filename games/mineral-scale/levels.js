// 天平探矿师 - 关卡数据 (12 关)
import { getOptimalWeighs } from './engine.js';

export const LEVELS = [
  {
    id: 1,
    title: '矿脉浅滩：3 枚小金豆',
    coinCount: 3,
    fakeCoinIndex: 2,
    fakeDelta: -1, // 假币偏轻
    optimalWeighs: getOptimalWeighs(3), // 1
    prompt: '3 枚金币中有 1 枚偏轻的假币，只需称量 1 次即可锁定！',
    hint: '两盘各放 1 枚，留 1 枚在盘外：若平，则是盘外那枚；若不平，轻的一方就是假币！',
  },
  {
    id: 2,
    title: '初探矿洞：5 枚金币',
    coinCount: 5,
    fakeCoinIndex: 4,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(5), // 2
    prompt: '5 枚金币中有 1 枚偷工减料的轻假币，尝试 2 次称量找出它。',
    hint: '先称 2 对 2，若平衡则剩下一枚就是；若不平衡，再从轻的那 2 枚中称 1 对 1！',
  },
  {
    id: 3,
    title: '水晶溪流：6 枚金币',
    coinCount: 6,
    fakeCoinIndex: 3,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(6), // 2
    prompt: '6 枚金币分组称量，你能用最少步骤锁定假币吗？',
    hint: '把 6 枚分成 3 组（每组 2 枚）：先称 2 对 2！',
  },
  {
    id: 4,
    title: '淘金小镇：8 枚金币',
    coinCount: 8,
    fakeCoinIndex: 7,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(8), // 2
    prompt: '经典 8 枚金币问题！分成 3 堆（3, 3, 2），只需 2 次称量！',
    hint: '左盘放 3 枚，右盘放 3 枚：若平衡在剩下的 2 枚中称 1 次；若不平衡在轻的 3 枚中称 1 次！',
  },
  {
    id: 5,
    title: '黄金走廊：9 枚标准金币',
    coinCount: 9,
    fakeCoinIndex: 5,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(9), // 2
    prompt: '纯正三分法代表作！9 枚金币分成 3, 3, 3，严格 2 次必然锁定！',
    hint: '每次称量排除三分之二的金币，这就是数学的强大魅力！',
  },
  {
    id: 6,
    title: '秘境深坑：12 枚金币',
    coinCount: 12,
    fakeCoinIndex: 11,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(12), // 3
    prompt: '12 枚金币混入了 1 枚轻币，在 3 次称量内找出真凶。',
    hint: '可以先分成 4, 4, 4 称量，将范围缩小到 4 枚，再继续二分或三分！',
  },
  {
    id: 7,
    title: '熔岩矿井：15 枚金币',
    coinCount: 15,
    fakeCoinIndex: 8,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(15), // 3
    prompt: '面对 15 枚闪烁的金币，运用严谨的探矿笔记一步步缩小包围圈。',
    hint: '分成 5, 5, 5 称量，第一步锁定到 5 枚，剩下只需 2 步！',
  },
  {
    id: 8,
    title: '地下宝库：18 枚金币',
    coinCount: 18,
    fakeCoinIndex: 14,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(18), // 3
    prompt: '18 枚大金币，每次称量后在笔记中划掉不可能的候选者！',
    hint: '先称 6 对 6，若平衡直接在剩下的 6 枚里找！',
  },
  {
    id: 9,
    title: '重金属谜案：未知偏重或偏轻',
    coinCount: 8,
    fakeCoinIndex: 2,
    fakeDelta: 1, // 假币偏重！
    optimalWeighs: 3,
    prompt: '情报有变！这枚假币可能灌了铅，反而比真币更沉！注意观察天平倾斜方向。',
    hint: '如果左盘下沉，可能是左盘有重假币，也可能是右盘有轻假币！',
  },
  {
    id: 10,
    title: '黑金矿场：未知假币二选一',
    coinCount: 10,
    fakeCoinIndex: 6,
    fakeDelta: 1, // 假币偏重
    optimalWeighs: 3,
    prompt: '10 枚金币中暗藏一枚异样重量的金币，仔细分析天平沉浮！',
    hint: '善用已知是真金币的硬币作为参照物！',
  },
  {
    id: 11,
    title: '矮人国度：24 枚金币大探矿',
    coinCount: 24,
    fakeCoinIndex: 17,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(24), // 3
    prompt: '24 枚金币分成 8, 8, 8，挑战 3 次称量极致锁定！',
    hint: '第一步 8 对 8，第二步 3 对 3，第三步 1 对 1！',
  },
  {
    id: 12,
    title: '黄金殿堂：终极 27 枚满编三分阵',
    coinCount: 27,
    fakeCoinIndex: 23,
    fakeDelta: -1,
    optimalWeighs: getOptimalWeighs(27), // 3
    prompt: '3 的 3 次方等于 27！理论上 27 枚金币只需 3 次称量，你能做到吗？',
    hint: '9-9-9 称量，剩下 9 枚；再 3-3-3 称量，剩下 3 枚；最后 1-1-1 锁定！',
  },
];
