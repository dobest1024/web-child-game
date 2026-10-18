// 课程与关卡数据。每关是一串步骤，由 main.js 的步骤引擎依次执行。
// 步骤类型：say 说话 / show 展示状态或演示 / find 点选小块 / teach 学一个转动 / spell 魔法咒语 / goal 自由解题
// goal 的 stage 对应 stages.js 里的阶段（'auto' = 完整挑战，按 order 自动判断当前在第几步）
// track 是所属课程，不写就是入门课程
import { Cube, daisyBase, puzzleFrom, randomCrossPuzzle } from './cube.js';
import { ALGS, PUZZLES, fromSolved } from './stages.js';

const PAD = ['R', 'L', 'U', 'F', 'B'];

export const LEVELS = [
  {
    id: 'l1', title: '认识魔方一家', emoji: '👀',
    steps: [
      { type: 'say', text: '嗨！我是方方 🧊 魔方由 26 个小方块组成，它们分成三种：中心块、棱块、角块。' },
      { type: 'say', text: '中心块在每一面的正中间，只有 1 种颜色。它永远不会跑掉，是这一面的「队长」！' },
      { type: 'find', piece: 'center', count: 3, text: '点一点，找出 3 个中心块！' },
      { type: 'say', text: '角块住在魔方的角落，身上有 3 种颜色。' },
      { type: 'find', piece: 'corner', count: 4, text: '找出 4 个角块！用手指拖一拖，可以转着看哦。' },
      { type: 'say', text: '棱块夹在两个角块中间，身上有 2 种颜色。' },
      { type: 'find', piece: 'edge', count: 4, text: '找出 4 个棱块！' },
      { type: 'say', text: '太棒了！记住口诀：中心 1 色、棱块 2 色、角块 3 色 🎉' },
    ],
  },
  {
    id: 'l2', title: '转动小能手', emoji: '🔄',
    steps: [
      { type: 'say', text: '魔方的每一面都有名字：R 右、L 左、U 上、F 前、B 后。' },
      { type: 'say', text: '只写字母 = 顺时针转；字母后面加一撇（比如 R\'），读作「R 反」，就是反过来转。' },
      { type: 'teach', move: 'R', text: '右边那一层，往上转 ⬆', pad: PAD },
      { type: 'teach', move: "R'", text: '再把右边往下转回来 ⬇', pad: PAD },
      { type: 'teach', move: 'U', text: '上面那一层，往左转 ⬅', pad: PAD },
      { type: 'teach', move: "U'", text: '上面往右转回来 ➡', pad: PAD },
      { type: 'teach', move: 'L', text: '左边那一层，往下转 ⬇', pad: PAD },
      { type: 'teach', move: "L'", text: '左边往上转回来 ⬆', pad: PAD },
      { type: 'teach', move: 'F', text: '前面这一层，像钟表一样顺时针转 ↻', pad: PAD },
      { type: 'teach', move: "F'", text: '前面逆时针转回来 ↺', pad: PAD },
      { type: 'teach', move: 'B', text: '后面那一层顺时针转（从前面看是反过来的哦）', pad: PAD },
      { type: 'teach', move: "B'", text: '后面再转回来', pad: PAD },
      { type: 'teach', move: 'y', text: '还可以把整个魔方拿在手里转！y 就是整个魔方往左转 ⬅', pad: [...PAD, 'y'] },
      { type: 'teach', move: "y'", text: '整个魔方再往右转回来 ➡', pad: [...PAD, 'y'] },
      { type: 'say', text: '学会魔法咒语啦！R U R\' U\' 是魔方界最有名的咒语，后面还原魔方会经常用到它。' },
      {
        type: 'spell', seq: ['R', 'U', "R'", "U'"], rounds: 6, manualRounds: 1, pad: PAD,
        text: '先自己念一遍咒语：R、U、R\'、U\'',
        done: '哇！念了 6 遍咒语，魔方自己变回原样啦！这就是魔方的魔法 ✨',
      },
    ],
  },
  {
    id: 'l3', title: '种一朵小白花', emoji: '🌼',
    steps: [
      { type: 'say', text: '现在开始真正的还原啦！层先法第一步：种一朵「小白花」🌼' },
      { type: 'show', state: () => daisyBase(), text: '看！黄色中心在最上面，4 个白色棱块像花瓣一样围着它，这就是小白花。' },
      { type: 'say', text: '口诀：找到白色花瓣，把它转到上面去。小心别把已经种好的花瓣碰掉哦！' },
      {
        type: 'goal', stage: 'daisy',
        puzzle: () => puzzleFrom(daisyBase(), ['F2']),
        text: '第 1 朵：有一片花瓣掉到底下啦，把前面转两下，送它回到上面！',
        done: '花瓣回来啦 🌼',
      },
      {
        type: 'goal', stage: 'daisy',
        puzzle: () => puzzleFrom(daisyBase(), ['R']),
        text: '第 2 朵：花瓣跑到侧面去了，找到它在哪一层，转一下送上去！',
        done: '又种好一朵 🌼',
      },
      {
        type: 'goal', stage: 'daisy',
        puzzle: () => puzzleFrom(daisyBase(), ['U', 'F']),
        text: '第 3 朵：花瓣想上去，可是它头顶的位置被占住了！先转上面腾出空位，再把它送上去。',
        done: '你学会「腾空位」啦，真聪明！',
      },
    ],
  },
  {
    id: 'l4', title: '白色大十字', emoji: '✚',
    steps: [
      { type: 'say', text: '小白花开好啦！接下来把它变成底部的「白色大十字」✚' },
      { type: 'say', text: '诀窍：转上面，让花瓣侧面的颜色和下面的中心块对上；对上了，就把那一面转两下，花瓣会「扑通」掉到底部！' },
      { type: 'show', state: () => daisyBase().move("U'"), play: ['U', 'F2'], text: '看演示：先转上面对颜色，再把前面转两下。' },
      {
        type: 'goal', stage: 'cross', puzzle: () => randomCrossPuzzle(), doneView: 'bottom',
        text: '轮到你啦！把 4 片花瓣都送到底部，拼出白色十字。每片都要先对好颜色哦！',
        done: '白色大十字完成 ✚ 翻过来看看底部！这是所有解法（包括世界冠军用的 CFOP）共同的第一步！',
      },
    ],
  },
  {
    id: 'l5', title: '白色第一层', emoji: '⬜', starCost: [2, 8],
    steps: [
      { type: 'say', text: '十字做好啦！现在把 4 个白色角块送回家，底下一整层就都是白色了。' },
      { type: 'say', text: '每个白角都有自己的「家」：家就在和它颜色一样的两个中心块中间。' },
      { type: 'say', text: '方法：① 转上面，把白角送到家的正上方 ② 转整个魔方，让家在右前下方 ③ 念魔法咒语 R U R\' U\'，一直念到角块回家！' },
      { type: 'show', state: () => fromSolved(ALGS.spell).start, play: ALGS.spell, fast: true, text: '看演示：白角就在家门口（右前上方），念一遍咒语，它就回家了。' },
      {
        type: 'goal', stage: 'corners', puzzle: () => fromSolved([...ALGS.spell, ...ALGS.spell, ...ALGS.spell]),
        text: '白角在家门口，可是方向不对。不要怕，多念几遍咒语，它会自己转好！',
        done: '你发现了吗？咒语念着念着，角块就回家了！',
      },
      {
        type: 'goal', stage: 'corners', puzzle: () => fromSolved(['y', 'U', ...ALGS.spell]),
        text: '这个白角离家有点远：先转上面送到家的正上方，再转整个魔方让家在右前下方，最后念咒语。',
        done: '三步走，学会啦！',
      },
      {
        type: 'goal', stage: 'corners', puzzle: () => PUZZLES.corners(), doneView: 'bottom',
        text: '最后挑战：把所有白角都送回家！卡住了就点「💡 提示」。',
        done: '白色第一层完成 ⬜ 翻过来看看，底面全是白色！',
      },
    ],
  },
  {
    id: 'l6', title: '中间第二层', emoji: '🧱', starCost: [2, 6],
    steps: [
      { type: 'say', text: '第二层有 4 个棱块，它们身上都没有黄色。我们要把它们从顶层「放」下去。' },
      { type: 'say', text: '方法：① 在顶层找一个没有黄色的棱块 ② 转上面，让它侧面的颜色和中心对上，变成一个倒立的「T」③ 转整个魔方，让 T 在正前方。' },
      { type: 'say', text: '④ 看 T 顶上的颜色：和右边中心一样，就念「往右放」；和左边一样，就念「往左放」。' },
      { type: 'show', state: () => fromSolved(ALGS.right).start, play: ALGS.right, fast: true, text: '看演示：T 顶上是右边的颜色，念「往右放」咒语。' },
      {
        type: 'goal', stage: 'middle', puzzle: () => fromSolved(ALGS.left),
        text: '这个 T 顶上的颜色和左边一样，该念哪个咒语呢？',
        done: '对啦，往左放！',
      },
      {
        type: 'goal', stage: 'middle', puzzle: () => PUZZLES.middle(),
        text: '把 4 个棱块都放好！如果顶层找不到没有黄色的棱块，就把放错的那个转到右前方，念一次「往右放」把它请出来。',
        done: '前两层全部完成 🧱 你已经还原了大半个魔方！',
      },
    ],
  },
  {
    id: 'l7', title: '黄色十字', emoji: '➕',
    steps: [
      { type: 'say', text: '现在只剩顶层啦！第一步，在顶面拼出黄色十字。咒语是 F R U R\' U\' F\'。' },
      { type: 'say', text: '看顶面的黄色棱块：一个点 → 念一次变成小拐角；小拐角放在左后方 → 念一次变成横线；横线横着放 → 再念一次就是十字！' },
      { type: 'show', state: () => fromSolved(ALGS.oll).start, play: ALGS.oll, fast: true, text: '看演示：横线横着放，念一次黄十字咒语。' },
      {
        type: 'goal', stage: 'ycross', puzzle: () => PUZZLES.ycross(),
        text: '你来试试！先看看顶面是点、小拐角还是横线。',
        done: '黄色十字出现啦 ➕',
      },
    ],
  },
  {
    id: 'l8', title: '黄色顶面', emoji: '🟨',
    steps: [
      { type: 'say', text: '接下来让整个顶面都变黄！咒语叫「小鱼」：R U R\' U R U2 R\'。' },
      { type: 'say', text: '如果只有一个角是黄色朝上，顶面就像一条小鱼 🐟 把鱼头转到左前方，念小鱼咒语。' },
      { type: 'say', text: '没有小鱼怎么办？没有黄角朝上时，让左前角的黄色朝左；有两个黄角朝上时，让左前角的黄色朝前，然后念咒语，小鱼就出来了。' },
      { type: 'show', state: () => fromSolved(ALGS.sune).start, play: ALGS.sune, fast: true, text: '看演示：鱼头在左前方，念一次小鱼咒语。' },
      {
        type: 'goal', stage: 'yface', puzzle: () => PUZZLES.yface(),
        text: '把顶面全部变成黄色吧！',
        done: '顶面全黄啦 🟨 只差最后两步！',
      },
    ],
  },
  {
    id: 'l9', title: '顶层角块归位', emoji: '🔺',
    steps: [
      { type: 'say', text: '看看顶层四周：同一面上两个角颜色一样，就像汽车的一对「车灯」🚗' },
      { type: 'say', text: '方法：转上面把车灯放到后面，念换角咒语 R\' F R\' B2 R F\' R\' B2 R2，再转上面对齐颜色。没有车灯？先随便念一次，车灯就出现了。' },
      { type: 'show', state: () => fromSolved(ALGS.aperm).start, play: ALGS.aperm, fast: true, text: '看演示：车灯在后面，念一次换角咒语。' },
      {
        type: 'goal', stage: 'ycorners', puzzle: () => PUZZLES.ycorners(),
        text: '让 4 个顶角都回到正确的位置！',
        done: '角块全部归位 🔺 最后一步啦！',
      },
    ],
  },
  {
    id: 'l10', title: '顶层棱块归位', emoji: '🏁',
    steps: [
      { type: 'say', text: '最后一步！找一找有没有已经拼好的一整面（顶层三个块颜色都一样）。' },
      { type: 'say', text: '方法：转整个魔方，把拼好的那一面放到后面，念换棱咒语 R U\' R U R U R U\' R\' U\' R2，念一到两次就还原了！没有拼好的面就先念一次。' },
      { type: 'show', state: () => fromSolved(ALGS.uperm).start, play: ALGS.uperm, fast: true, text: '看演示：拼好的一面在后面，念一次换棱咒语。' },
      {
        type: 'goal', stage: 'yedges', puzzle: () => PUZZLES.yedges(), doneView: 'spin',
        text: '完成最后一步，把魔方完全还原！',
        done: '🎉 魔方完全还原！你已经学会了层先法的全部 8 步！',
      },
    ],
  },
  {
    id: 'l11', title: '完整还原挑战', emoji: '🏆', starCost: [5, 20],
    steps: [
      { type: 'say', text: '毕业挑战！魔方会被完全打乱，你要用学过的 8 步把它还原。' },
      { type: 'say', text: '方方会告诉你现在在第几步、可以用哪些咒语。忘了怎么做就点「💡 提示」，加油！' },
      {
        type: 'goal', stage: 'auto', puzzle: () => PUZZLES.full(), doneView: 'spin',
        text: '开始吧！第一步：种小白花 🌼',
        done: '🏆 太厉害了！你独立还原了一个完全打乱的魔方，是真正的魔方小达人！',
      },
    ],
    finale: '恭喜从入门课程毕业！「进阶 · 四步 CFOP」已经解锁，让你越转越快 🚀',
  },

  // ======== 进阶 · 四步 CFOP ========
  {
    id: 'c1', track: 'cfop4', title: '直接做十字', emoji: '✚', starCost: [3, 10],
    steps: [
      { type: 'say', text: '欢迎来到 CFOP 🚀 它只有 4 步：十字 → F2L 前两层 → OLL 顶面变黄 → PLL 顶层归位。世界冠军就是这样几秒钟还原魔方的！' },
      { type: 'say', text: '高手不种小白花，而是直接把白色棱块送到底部。先看白棱在哪里，想一想一两步怎么把它转下去，还不能碰掉已经拼好的。' },
      { type: 'show', state: () => new Cube().moves(['F2', 'U']), play: ["U'", 'F2'], text: '看演示：白绿棱块在顶上，先转上面对好颜色，再把前面转两下。' },
      {
        type: 'goal', stage: 'crossD', puzzle: () => fromSolved(['F']),
        text: '白绿棱块翻到侧面去了，一步把它转回底部！',
        done: '一步就回来了，好快！',
      },
      {
        type: 'goal', stage: 'crossD', puzzle: () => fromSolved(['R', 'F']),
        text: '两片白棱跑掉了。想一想：先转哪一面？',
        done: '倒着转回去，就是答案！',
      },
      {
        type: 'goal', stage: 'crossD', puzzle: () => PUZZLES.full(), doneView: 'bottom',
        text: '完全打乱的魔方！不种小白花，直接在底部拼出白色十字。',
        done: '十字完成 ✚ 不种花，省了好多步！',
      },
    ],
  },
  {
    id: 'c2', track: 'cfop4', title: 'F2L 配对入槽', emoji: '🤝', starCost: [3, 8],
    steps: [
      { type: 'say', text: 'F2L 是 CFOP 最厉害的一步：把一个白角和它旁边的中层棱块先「配成一对」，再一起放进去，第一层和第二层同时完成！' },
      { type: 'say', text: '白角和棱块要去的地方叫「槽」，十字的 4 个角落就是 4 个槽。我们总是把要做的槽转到右前方。' },
      { type: 'say', text: '只要 6 个小公式：右手 R U R\'、R U\' R\'、R U2 R\'，前手 F\' U F、F\' U\' F、F\' U2 F。它们只动右前方的槽和顶层，不会碰坏别的槽！' },
      { type: 'show', state: () => fromSolved(ALGS.rur).start, play: ALGS.rur, fast: true, text: '看演示：角块和棱块已经配成一对，就在槽的上方，用右手 R U R\' 放进去！' },
      {
        type: 'goal', stage: 'f2l', puzzle: () => fromSolved(ALGS.rur),
        text: '对子已经配好啦，用右手把它放进槽里！',
        done: '入槽成功 🤝',
      },
      {
        type: 'goal', stage: 'f2l', puzzle: () => fromSolved(ALGS.fuif),
        text: '这一对躺在前面，换「前手」试试！',
        done: '前手也会用啦！',
      },
      {
        type: 'goal', stage: 'f2l', puzzle: () => fromSolved(['U', ...ALGS.rur]),
        text: '对子配好了，可是不在槽的上方。先转上面对准，再放进去。',
        done: '先对准，再入槽！',
      },
      {
        type: 'goal', stage: 'f2l', puzzle: () => fromSolved([...ALGS.ruir, 'U', ...ALGS.rur]),
        text: '角块和棱块分开了：先用一个小公式把它们配成一对，再放进去。',
        done: '先配对、再入槽，这就是 F2L 的秘诀！',
      },
      {
        type: 'goal', stage: 'f2l', puzzle: () => PUZZLES.f2lOne(),
        text: '自己来：把右前方的槽做好！想不出来就点「💡 提示」。',
        done: '一个槽完成啦 🎉',
      },
    ],
  },
  {
    id: 'c3', track: 'cfop4', title: 'F2L 四个槽', emoji: '🧩', starCost: [5, 16],
    steps: [
      { type: 'say', text: '现在 4 个槽都乱了。一个一个来：找到一个白角，转整个魔方，把它的槽放到右前方，再配对入槽。' },
      { type: 'say', text: '如果角块或棱块卡在别的槽里，就把那个槽转到右前方，用 R U R\' 把它请出来。' },
      {
        type: 'goal', stage: 'f2l', puzzle: () => PUZZLES.f2l(), doneView: 'bottom',
        text: '把 4 个槽都做好吧！',
        done: '前两层全部完成！比层先法少转了好多步 🚀',
      },
    ],
  },
  {
    id: 'c4', track: 'cfop4', title: 'OLL 顶面（上）', emoji: '🐟', starCost: [2, 6],
    steps: [
      { type: 'say', text: 'OLL 是让顶面全变黄。第一步还是黄十字咒语 F R U R\' U\' F\'，你已经会啦！' },
      {
        type: 'goal', stage: 'ycross', puzzle: () => PUZZLES.ycross(),
        text: '先做出黄十字：点 → 小拐角（放左后方）→ 横线（横着放）→ 十字。',
        done: '黄十字 ➕',
      },
      { type: 'say', text: '层先法的小鱼咒语要念好几遍。CFOP 认出 7 种图案，每种只念一次！这一关先学 4 种。' },
      { type: 'show', state: () => fromSolved(ALGS.sune).start, play: ALGS.sune, fast: true, text: '🐟 小鱼：只有一个黄角朝上，把它放在左前方，右前角的黄色朝前。' },
      { type: 'show', state: () => fromSolved(ALGS.anti).start, play: ALGS.anti, fast: true, text: '🐠 反小鱼：只有一个黄角朝上，把它放在右后方，左前角的黄色朝前。' },
      { type: 'show', state: () => fromSolved(ALGS.holl).start, play: ALGS.holl, fast: true, text: '🅷 大H：没有黄角朝上，左边一对车灯、右边一对车灯。' },
      { type: 'show', state: () => fromSolved(ALGS.pi).start, play: ALGS.pi, fast: true, text: '🥧 派：没有黄角朝上，把唯一的一对车灯放在左边。' },
      {
        type: 'goal', stage: 'oll4', puzzle: () => fromSolved(ALGS.anti),
        text: '认一认：这是哪一种？',
        done: '是反小鱼！眼力真好 👀',
      },
      {
        type: 'goal', stage: 'oll4', puzzle: () => PUZZLES.oll4(),
        text: '先转上面摆好位置，再念对应的公式。',
        done: '一次就变黄啦 🟨',
      },
    ],
  },
  {
    id: 'c5', track: 'cfop4', title: 'OLL 顶面（下）', emoji: '🔦', starCost: [2, 6],
    steps: [
      { type: 'say', text: '还剩 3 种图案，它们都有两个黄角朝上。' },
      { type: 'show', state: () => fromSolved(ALGS.head).start, play: ALGS.head, fast: true, text: '🔦 车头灯：两个朝上的黄角放在后面，前面是一对车灯。' },
      { type: 'show', state: () => fromSolved(ALGS.toll).start, play: ALGS.toll, fast: true, text: '🆃 T字：两个朝上的黄角放在右边。公式里的小写 r 是右边两层一起转。' },
      { type: 'show', state: () => fromSolved(ALGS.loll).start, play: ALGS.loll, fast: true, text: '🎀 领结：两个黄角斜对着朝上，左前角的黄色朝前。' },
      {
        type: 'goal', stage: 'oll', puzzle: () => fromSolved(ALGS.head),
        text: '这是哪一种？',
        done: '车头灯，答对啦！',
      },
      {
        type: 'goal', stage: 'oll', puzzle: () => PUZZLES.oll(),
        text: '7 种图案都学会了！随便来一个试试。',
        done: 'OLL 毕业 🟨',
      },
    ],
  },
  {
    id: 'c6', track: 'cfop4', title: 'PLL 角块', emoji: '🔺', starCost: [2, 6],
    steps: [
      { type: 'say', text: 'PLL 第一步：让顶层 4 个角归位。看看四周有没有「车灯」（同一面两个角颜色一样）。' },
      { type: 'say', text: '有一对车灯：车灯放后面，念「相邻换角」，这个你在层先法里学过。一对车灯都没有：两个角要斜着交换，念新公式「对角换角」！' },
      { type: 'show', state: () => fromSolved(ALGS.yperm).start, play: ALGS.yperm, fast: true, text: '看演示：一对车灯都没有，念一次对角换角。' },
      {
        type: 'goal', stage: 'pllc', puzzle: () => fromSolved(ALGS.yperm),
        text: '找找有没有车灯？选对公式！',
        done: '对角换角，答对啦！',
      },
      {
        type: 'goal', stage: 'pllc', puzzle: () => PUZZLES.pllc(),
        text: '让 4 个顶角都归位！',
        done: '角块归位 🔺',
      },
    ],
  },
  {
    id: 'c7', track: 'cfop4', title: 'PLL 棱块', emoji: '🏁', starCost: [2, 6],
    steps: [
      { type: 'say', text: '最后一步：顶层的棱块。有拼好的一整面，就把它放到后面，看前面中间那块的颜色：和右边一样念「换棱 A」，和左边一样念「换棱 B」。' },
      { type: 'say', text: '一整面都没拼好？前面中间那块和后面颜色一样，念「对面换棱」；不一样，就是「邻边换棱」。' },
      { type: 'show', state: () => fromSolved(ALGS.ub).start, play: ALGS.ub, fast: true, text: '看演示：前面中间那块和左边一样，念换棱 B。' },
      { type: 'show', state: () => fromSolved(ALGS.hperm).start, play: ALGS.hperm, fast: true, text: '看演示：四面都没拼好，前后对调、左右对调，念对面换棱。' },
      {
        type: 'goal', stage: 'plle', puzzle: () => fromSolved(ALGS.uperm),
        text: '前面中间那块和哪边颜色一样？',
        done: '换棱 A，答对啦！',
      },
      {
        type: 'goal', stage: 'plle', puzzle: () => PUZZLES.plle(), doneView: 'spin',
        text: '把魔方完全还原！',
        done: '🎉 CFOP 的 4 步你都学会啦！',
      },
    ],
  },
  {
    id: 'c8', track: 'cfop4', title: 'CFOP 完整挑战', emoji: '🏆', starCost: [6, 24],
    steps: [
      { type: 'say', text: 'CFOP 毕业挑战！用十字 → F2L → OLL → PLL 还原一个完全打乱的魔方。' },
      { type: 'say', text: '方方会告诉你现在在第几步。比一比：用 CFOP 是不是比层先法少转很多下？' },
      {
        type: 'goal', stage: 'auto', order: 'cfop', puzzle: () => PUZZLES.full(), doneView: 'spin',
        text: '开始吧！第一步：直接在底部拼十字 ✚',
        done: '🏆 你用 CFOP 还原了魔方，是真正的速拧小选手！',
      },
    ],
    finale: '恭喜学会四步 CFOP！接下来多练习认图案，你会越转越快 ⚡',
  },
];

export const TRACKS = [
  { id: 'beginner', name: '入门 · 层先法', emoji: '🌱', desc: '8 步还原魔方，每步只记一个短咒语' },
  { id: 'cfop4', name: '进阶 · 四步 CFOP', emoji: '🚀', requires: 'l11', desc: '直接做十字、角块棱块一起入槽，顶层认图案一次到位', lockedDesc: '完成入门课程的「完整还原挑战」后开启' },
  { id: 'cfop', name: '高手 · 完整 CFOP', emoji: '🏆', locked: true, desc: '78 个公式 + 双层同步，世界冠军都在用（制作中）' },
];

const sticker = (x, y, s, c) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.18}" fill="${c}"/>`;
const grid = (n, colors) => {
  const s = 54 / n;
  let out = '<rect x="3" y="3" width="58" height="58" rx="10" fill="#1c1d26"/>';
  for (let i = 0; i < n * n; i++) out += sticker(5 + (i % n) * s + 1, 5 + Math.floor(i / n) * s + 1, s - 2, colors[i % colors.length]);
  return `<svg viewBox="0 0 64 64">${out}</svg>`;
};

export const CUBES = [
  { id: '3x3', name: '三阶魔方', ready: true, icon: grid(3, ['#ffd500', '#00b050', '#ff7a00', '#e8283c', '#1e6bff', '#ffffff']) },
  { id: '2x2', name: '二阶魔方', icon: grid(2, ['#ffd500', '#e8283c', '#1e6bff', '#00b050']) },
  {
    id: 'pyraminx', name: '金字塔魔方',
    icon: '<svg viewBox="0 0 64 64"><path d="M32 4 L61 58 H3 Z" fill="#1c1d26"/><path d="M32 12 L44 34 H20Z" fill="#ffd500"/><path d="M19 37 H31 L25 52 H11Z" fill="#e8283c"/><path d="M33 37 H45 L53 52 H39Z" fill="#1e6bff"/><path d="M27 52 L32 40 L37 52Z" fill="#00b050"/></svg>',
  },
  {
    id: 'skewb', name: '斜转魔方',
    icon: '<svg viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="10" fill="#1c1d26"/><path d="M32 8 L56 32 L32 56 L8 32Z" fill="#ff7a00"/><path d="M7 7 H27 L7 27Z M57 7 H37 L57 27Z M7 57 H27 L7 37Z M57 57 H37 L57 37Z" fill="#ffffff"/></svg>',
  },
];
