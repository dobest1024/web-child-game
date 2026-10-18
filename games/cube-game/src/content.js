import { cfopLessons } from "./cfop.js";
export const courses = [
  {
    id: "beginner",
    name: "三阶魔方",
    subtitle: "一层一层，拼出小小成就",
    tag: "从这里开始",
    color: "orange",
    puzzle: "3x3x3",
    method: "层先法",
    emoji: "🌱",
    level: "零基础友好",
    description: "像盖小房子一样，从第一层慢慢向上。先跟着做，再自己试一试。",
    stages: [
      {
        name: "白色小十字",
        icon: "plus",
        alg: "F2",
        intro:
          "把白色放在下面，绿色朝向你。今天只差一块白绿棱块！前面转半圈，让它回到下面。",
        tip: "十字的四个侧面，也要和各自的中心颜色相同。",
        goal: "让白绿棱块回到底层，补齐白色十字。",
      },
      {
        name: "角块回家",
        icon: "box",
        alg: "R U R'",
        intro:
          "白色继续朝下。找到右上角的白色角块，看看它身上的另外两种颜色。右边上去，顶层转一下，右边回来。",
        tip: "角块有三种颜色，它的家在同色的三个中心之间。这里只练习准备好的这一种情况。",
        goal: "把右上角的白色角块送回第一层。",
      },
      {
        name: "盖好第二层",
        icon: "layers",
        alg: "U R U' R' U' F' U F",
        intro:
          "白色朝下，黄色朝上。找到顶层没有黄色的棱块。它要住进前面和右面的中间，就跟着这八个动作走。",
        tip: "这一关练习“向右插入”。真实魔方上，要先让棱块正面的颜色和中心对齐。",
        goal: "把准备好的棱块送进中间一层。",
      },
      {
        name: "黄色小十字",
        icon: "sun",
        alg: "F R U R' U' F'",
        intro:
          "看看顶部，是不是有一条黄色横线？把横线横着摆好，跟着六个动作，让黄色也变成小十字。",
        tip: "黄点、小拐角、横线是不同情况。这一关先学横线；十字做好后，再照顾黄色角块。",
        goal: "把顶面的黄色横线变成十字。",
      },
      {
        name: "点亮黄色面",
        icon: "sparkles",
        alg: "R U R' U R U2 R'",
        intro:
          "这次练习一种小鱼情况。保持画面里的方向，先找出顶面的黄色角块，再一格一格跟着转。",
        tip: "U2 是顶层转半圈。不同的小鱼要先调整方向，不能看到黄色就套公式。",
        goal: "在这个准备好的局面中，让黄色朝上。",
      },
      {
        name: "角块找邻居",
        icon: "users",
        alg: "R U R' U' R' F R2 U' R' U' R U R' F'",
        intro:
          "黄色面做好了，但侧面的颜色还没排整齐。今天认识 T 公式，它会交换两个角块，也交换两个棱块。",
        tip: "角块朝向正确，不代表位置正确。用侧面的颜色判断它的家。这里只练习一个交换局面。",
        goal: "观察 T 公式怎样交换顶层的块。",
      },
      {
        name: "最后的拼图",
        icon: "flag",
        alg: "R U' R U R U R U' R' U' R2",
        intro:
          "最后三个棱块要换位置了！保持黄色在上，跟着动作把它们送回家。六面颜色整齐，就是复原成功！",
        tip: "这是一种三棱换位情况。真实复原前，先找到已经对齐的一面，再选择正确方向的公式。",
        goal: "完成这一关的三棱换位，让六面复原。",
      },
    ],
  },
  {
    id: "pocket",
    name: "二阶魔方",
    subtitle: "小小魔方，大大的成就感",
    tag: "轻松入门",
    color: "mint",
    puzzle: "2x2x2",
    method: "角块入门",
    emoji: "🍀",
    level: "适合第一次玩",
    description: "只有角块的迷你世界。颜色配成一队，再让每个小角块找到家。",
    stages: [
      {
        name: "转动第一步",
        alg: "R",
        intro:
          "二阶只有角块，没有中心和棱块。先试试把右边这一层转回来。看右面，顺时针转四分之一圈。",
        tip: "二阶没有中心块。用已经拼好的角块，记住整颗魔方的配色。",
        goal: "用一步，让右边的颜色排整齐。",
      },
      {
        name: "拼好第一层",
        alg: "R U R'",
        intro:
          "白色放下面。这颗白色角块就在右上角，跟着三个动作，把它送回第一层。",
        tip: "拼好一面以后，也要看看侧面是不是同一种颜色。",
        goal: "把最后一个白色角块送回家。",
      },
      {
        name: "顶面小鱼",
        alg: "R U R' U R U2 R'",
        intro:
          "保持画面里的方向，跟着小鱼公式，让顶面的角块都露出黄色。我们先练习这一种情况。",
        tip: "每次先观察，再转动。别急着追求速度。",
        goal: "练习一个顶面角块翻色局面。",
      },
      {
        name: "全都回家啦",
        alg: "R U R' U' R' F R2 U' R' U' R U R' F'",
        intro:
          "顶面同色了，侧面还需要排队。跟着 T 公式，交换这一关的两个角块，完成复原！",
        tip: "二阶也能用三阶里学过的角块动作。",
        goal: "交换准备好的角块，复原二阶。",
      },
    ],
  },
  {
    id: "pyramid",
    name: "金字塔魔方",
    subtitle: "出发！探索三角形的秘密",
    tag: "趣味挑战",
    color: "lavender",
    puzzle: "pyraminx",
    method: "基础复原",
    emoji: "🔺",
    level: "换个形状玩",
    description: "尖尖的小山也能复原！认识小尖角、大层和棱块，开始三角形探险。",
    stages: [
      {
        name: "小尖角转转",
        alg: "u",
        intro:
          "金字塔的小尖角可以单独转动。小写 u 只转最上面的小尖角，转到两边颜色对上。",
        tip: "小写字母转尖角，大写字母转整层。金字塔每次转三分之一圈，也就是 120 度。",
        goal: "对齐最上面的小尖角。",
      },
      {
        name: "认识大层",
        alg: "R",
        intro:
          "这次转右边的大层。大写 R 会带着更多小三角一起动，跟刚才的小尖角不一样哦。",
        tip: "沿着右边的顶点，正对这个顶点看，顺时针转 120 度。",
        goal: "转回右边的大层。",
      },
      {
        name: "棱块回家",
        alg: "R U R' U'",
        intro: "来练习棱块插入动作。看清位置，右层、上层、右层回来、上层回来。",
        tip: "这是准备好的插入练习，不是所有乱序都能用同一个动作解决。",
        goal: "练习四步棱块插入。",
      },
      {
        name: "三角大团圆",
        alg: "R U' R' U' R U' R'",
        intro:
          "最后一组棱块需要换位置。保持现在的拿法，跟着七个动作，看小三角们排好队。",
        tip: "所有四个大面同色，小尖角也对齐，才算完全复原。",
        goal: "让四个大面都变成同一种颜色。",
      },
    ],
  },
  {
    id: "cfop",
    name: "CFOP 训练营",
    subtitle: "懂原理，变成小小速拧手",
    tag: "进阶探险",
    color: "peach",
    puzzle: "3x3x3",
    method: "CFOP 入门",
    emoji: "🚀",
    level: "会层先法再来",
    description:
      "Cross 十字 → F2L 配对 → OLL 翻色 → PLL 换位。先理解四步，再慢慢积累公式。",
    stages: cfopLessons,
  },
];

export const formulas = [
  {
    name: "右手小动作",
    group: "基础",
    alg: "R U R' U'",
    detail: "认识右层和顶层的配合。它是练习动作，不是万能复原公式。",
    course: "beginner",
  },
  {
    name: "角块送回家",
    group: "层先法",
    alg: "R U R'",
    detail: "练习已摆好位置的白色角块插入。",
    course: "beginner",
  },
  {
    name: "向右插入棱块",
    group: "层先法",
    alg: "U R U' R' U' F' U F",
    detail: "顶层棱块与前面中心对齐后，向右插入第二层。",
    course: "beginner",
  },
  {
    name: "向左插入棱块",
    group: "层先法",
    alg: "U' L' U L U F U' F'",
    detail: "顶层棱块与前面中心对齐后，向左插入第二层。",
    course: "beginner",
  },
  {
    name: "横线变十字",
    group: "OLL",
    alg: "F R U R' U' F'",
    detail: "顶面黄色横线横着摆好，再练习这一组动作。",
    course: "cfop",
  },
  {
    name: "小鱼 · Sune",
    group: "OLL",
    alg: "R U R' U R U2 R'",
    detail: "一种顶面角块翻色情况。先观察示范中的小鱼朝向。",
    course: "cfop",
  },
  {
    name: "反小鱼 · Anti-Sune",
    group: "OLL",
    alg: "R U2 R' U' R U' R'",
    detail: "另一种角块翻色情况，不能和小鱼公式随意互换。",
    course: "cfop",
  },
  {
    name: "T 交换",
    group: "PLL",
    alg: "R U R' U' R' F R2 U' R' U' R U R' F'",
    detail: "交换两个相邻角块和两个棱块，顶面朝向保持不变。",
    course: "cfop",
  },
  {
    name: "三棱顺换 · Ua",
    group: "PLL",
    alg: "R U' R U R U R U' R' U' R2",
    detail: "三个顶层棱块循环换位，观察示范中的固定面。",
    course: "cfop",
  },
  {
    name: "三棱逆换 · Ub",
    group: "PLL",
    alg: "R2 U R U R' U' R' U' R' U R'",
    detail: "与 Ua 相反方向的三棱换位。",
    course: "cfop",
  },
  {
    name: "金字塔棱块插入",
    group: "金字塔",
    alg: "R U R' U'",
    detail: "金字塔大写字母转整层，每步 120 度。与三阶的转法不同。",
    course: "pyramid",
  },
  {
    name: "金字塔三棱换位",
    group: "金字塔",
    alg: "R U' R' U' R U' R'",
    detail: "在准备好的三棱换位局面中练习。",
    course: "pyramid",
  },
];

for (const s of cfopLessons.filter((s) => ["oll", "pll"].includes(s.chapter))) {
  const existing = formulas.find((f) => f.course === "cfop" && f.alg === s.alg);
  if (existing) existing.lessonId = s.id;
  else
    formulas.push({
      name: s.name,
      group: s.chapter.toUpperCase(),
      alg: s.alg,
      detail: s.intro,
      course: "cfop",
      lessonId: s.id,
    });
}

export function moveWords(move, puzzle = "3x3x3") {
  const pyramid = puzzle === "pyraminx";
  const face =
    {
      R: "右层",
      L: "左层",
      U: "顶层",
      D: "底层",
      F: "前层",
      B: "后层",
      u: "上尖角",
      r: pyramid ? "右尖角" : "右边两层",
      M: "夹心中层（正对左面看）",
      l: "左尖角",
      b: "后尖角",
    }[move[0]] || move[0];
  const turn = move.includes("2")
    ? "转半圈"
    : move.includes("'")
      ? "逆时针转"
      : "顺时针转";
  return `${face}${turn}${move.includes("2") ? "" : pyramid ? " 120 度" : "四分之一圈"}`;
}
