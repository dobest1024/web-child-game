'use strict';
// ===== 基础常量 =====
const T = 48, C = 24, COLS = 15, ROWS = 11, GW = COLS * 2, GH = ROWS * 2;
const MAP_W = COLS * T, MAP_H = ROWS * T, HUD_H = 60, VIEW_W = MAP_W, VIEW_H = MAP_H + HUD_H;
const EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, GRASS = 4, EGG = 5, ICE = 6;
// 100 关新增的地形
const SAND = 7, JELLY = 8, FLOW = 9, VINE = 10, LAVA = 11, VENT = 12, SWITCH = 13, GATE = 14, GATE_OPEN = 15, HOLE = 16, BLINK = 17, BLINK_OFF = 18;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const OUT = '#26324A';
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const dirAngle = d => [-Math.PI / 2, 0, Math.PI / 2, Math.PI][d];
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===== 世界主题 =====
// friend：营救关里的小伙伴；gem：收集关里星星的样子
const WORLDS = [
  { theme: 'grass', name: '青青草地', song: 'normal', friend: '小兔子', gem: 'star', trophy: 'snailHat' },
  { theme: 'snow', name: '冰雪世界', song: 'snow', friend: '小企鹅', gem: 'star', trophy: 'iceCrown' },
  { theme: 'desert', name: '黄沙沙漠', song: 'desert', friend: '小骆驼', gem: 'star', trophy: 'dinoHorn' },
  { theme: 'candy', name: '糖果王国', song: 'candy', friend: '小熊软糖', gem: 'candy', trophy: 'jellyHat' },
  { theme: 'ocean', name: '海底世界', song: 'ocean', friend: '小海龟', gem: 'pearl', trophy: 'goggles' },
  { theme: 'forest', name: '蘑菇森林', song: 'forest', friend: '小松鼠', gem: 'star', trophy: 'bearEars' },
  { theme: 'volcano', name: '火山熔岩', song: 'volcano', friend: '小恐龙', gem: 'star', trophy: 'fireHelm' },
  { theme: 'factory', name: '玩具工厂', song: 'factory', friend: '玩具熊', gem: 'gear', trophy: 'windKey' },
  { theme: 'space', name: '星空太空', song: 'space', friend: '小外星人', gem: 'star', trophy: 'spaceHelm' },
  { theme: 'castle', name: '魔王城堡', song: 'castle', friend: '小精灵', gem: 'star', trophy: 'devilHorn' },
];
// brick: [砖缝, 砖面, 高光]  steel: [边, 面, 高光]  water: [水, 浪花]  bush: [深, 浅]
const THEMES = {
  grass: { g1: '#A8E07E', g2: '#9ED673', deco: '#78BE55', brick: ['#B95A2E', '#F2864A', '#FFB27C'], steel: ['#5E6E80', '#AEBFD0', '#E3ECF5'], water: ['#4CC4F2', '#D2F3FF'], bush: ['#2FA84F', '#5CCB5F'], bg: ['#8FD3FF', '#DFF7C8'] },
  snow: { g1: '#EEF7FF', g2: '#E1EFFA', deco: '#C3DDF0', brick: ['#6E9CC4', '#BFE3FF', '#F4FBFF'], steel: ['#4F5D75', '#9AA9C2', '#D5DEEC'], water: ['#2F8FD8', '#BFE6FF'], bush: ['#2E7D5B', '#F0FAFF'], bg: ['#A9D4FF', '#F2FAFF'] },
  desert: { g1: '#F7E2A6', g2: '#F0D592', deco: '#D9B56A', brick: ['#9A5B24', '#E3A65C', '#F9D49A'], steel: ['#6D6A75', '#B9B3BE', '#E6E1EA'], water: ['#36C2B4', '#C8FAF2'], bush: ['#3E9B4F', '#7CCB6A'], bg: ['#FFCF8F', '#FFF3D6'] },
  candy: { g1: '#FFE4F2', g2: '#FFD6EC', deco: '#FFB3D9', brick: ['#6B3B22', '#A86A42', '#DDA27A'], steel: ['#7C68B8', '#C9BCFF', '#F3EEFF'], water: ['#FF8CC6', '#FFE0F0'], bush: ['#FF5FA2', '#FFC1DE'], bg: ['#FFB8DE', '#FFF0F8'] },
  ocean: { g1: '#BDEBFF', g2: '#AEE2F7', deco: '#8CCDEB', brick: ['#C2475E', '#FF8A9E', '#FFC2CC'], steel: ['#4A6378', '#93AFC4', '#D2E3EF'], water: ['#1F6FB8', '#9ED8FF'], bush: ['#1E9E7A', '#5ED6A8'], bg: ['#5FC3F5', '#D6F4FF'] },
  forest: { g1: '#B9DE8C', g2: '#AED27F', deco: '#86B95C', brick: ['#7A4B26', '#B97A45', '#E2AE7A'], steel: ['#5E6A62', '#A8B5AA', '#DDE6DE'], water: ['#3FB2C9', '#C9F1F7'], bush: ['#2D7A3E', '#69B852'], bg: ['#7CC48F', '#E4F5D2'] },
  volcano: { g1: '#E8C7A8', g2: '#DDB897', deco: '#C49A78', brick: ['#6B3A2A', '#A8604A', '#D99A7E'], steel: ['#3B3550', '#6F6890', '#B2ABCF'], water: ['#3FA9D9', '#CDEFFF'], bush: ['#8A6A2A', '#D1A84A'], bg: ['#FF9A6B', '#FFE2C7'] },
  factory: { g1: '#E3E6EE', g2: '#D7DBE6', deco: '#BFC5D4', brick: ['#C24A4A', '#FF7B6B', '#FFB3A6'], steel: ['#55606E', '#A3AEBD', '#E0E6EE'], water: ['#4C9DF2', '#D2E7FF'], bush: ['#6B7BD6', '#A9B5FF'], bg: ['#A8B8E8', '#EEF1FA'] },
  space: { g1: '#4A4F86', g2: '#444A7E', deco: '#5E6499', brick: ['#5A4A7A', '#8E7BB8', '#C6B8EE'], steel: ['#2A2E4F', '#7A82B8', '#C3C9F0'], water: ['#6A5CFF', '#C9C2FF'], bush: ['#8E5BD6', '#C9A5FF'], bg: ['#1D1F45', '#4A3F8A'] },
  castle: { g1: '#D8CFE8', g2: '#CCC2DE', deco: '#B3A6CC', brick: ['#5E4B7A', '#9C86C2', '#D2C4EE'], steel: ['#3E3A55', '#8A84A8', '#CBC6E2'], water: ['#4A7FD6', '#C6DAFF'], bush: ['#7A3F8E', '#C77BDB'], bg: ['#8C6BC8', '#EADFFF'] },
};
const LAVA_COL = ['#FF5A1F', '#FFC94A'];

// ===== 武器（子弹种类）=====
const WEAPONS = {
  normal: { name: '普通弹', cd: 0.26, max: 2, speed: 440, r: 7, mul: 1, color: '#FFE14D' },
  big: { name: '大炮弹', cd: 0.42, max: 2, speed: 370, r: 12, mul: 2, depth: 2, color: '#FF7043' },
  scatter: { name: '散弹', cd: 0.36, max: 6, speed: 420, r: 6, mul: 1, n: 3, gap: 0.26, color: '#FF6FC8' },
  pierce: { name: '穿透弹', cd: 0.3, max: 3, speed: 600, r: 6, mul: 1, pierce: true, color: '#FFC107' },
  ice: { name: '冰弹', cd: 0.3, max: 2, speed: 420, r: 8, mul: 1, freeze: 2.5, color: '#7FE3FF' },
  bomb: { name: '爆炸弹', cd: 0.55, max: 1, speed: 340, r: 10, mul: 1.5, boom: 58, color: '#9C6BFF' },
  homing: { name: '追踪弹', cd: 0.32, max: 2, speed: 360, r: 7, mul: 1, homing: 3.0, color: '#FF8A3D' },
  double: { name: '双管炮', cd: 0.28, max: 4, speed: 440, r: 6, mul: 1, twin: 10, color: '#FFE14D' },
  rainbow: { name: '彩虹弹', cd: 0.3, max: 3, speed: 460, r: 10, mul: 2, pierce: true, freeze: 1.2, boom: 40, color: '#FF6FAE' },
};

// ===== 玩家坦克（5 种颜色）=====
const PLAYER_TANKS = [
  { id: 'blue', name: '蓝蓝', body: '#3EC1F3', top: '#8ADCFF', dark: '#1F7FB8', hp: 8, atk: 2, dfn: 1, speed: 140, skill: 'scatter', skillName: '七彩散弹', desc: '样样都不错' },
  { id: 'red', name: '红红', body: '#FF5D5D', top: '#FFA0A0', dark: '#B8323A', hp: 6, atk: 3, dfn: 0, speed: 130, skill: 'big', skillName: '超级大炮', desc: '攻击最厉害' },
  { id: 'green', name: '绿绿', body: '#4CD964', top: '#9AF2AA', dark: '#22943A', hp: 10, atk: 2, dfn: 2, speed: 112, skill: 'ice', skillName: '冰冻风暴', desc: '皮最厚，最耐打' },
  { id: 'yellow', name: '黄黄', body: '#FFC93C', top: '#FFE69A', dark: '#C48A00', hp: 6, atk: 2, dfn: 0, speed: 178, skill: 'pierce', skillName: '闪电激光', desc: '跑得最快' },
  { id: 'purple', name: '紫紫', body: '#A97CFF', top: '#D2BCFF', dark: '#6A3FC8', hp: 7, atk: 2, dfn: 1, speed: 135, skill: 'bomb', skillName: '超级炸弹', desc: '爆炸最厉害' },
  // unlock：打赢第几关后解锁
  { id: 'orange', name: '橙橙', body: '#FF9F43', top: '#FFCB8A', dark: '#C76A10', hp: 7, atk: 2, dfn: 1, speed: 150, skill: 'missiles', skillIcon: 'homing', skillName: '追踪导弹群', desc: '导弹会自己找敌人', unlock: 40 },
  { id: 'pink', name: '粉粉', body: '#FF7EB6', top: '#FFB8D6', dark: '#C7457E', hp: 8, atk: 2, dfn: 1, speed: 128, skill: 'heal', skillIcon: 'heart', skillName: '爱心光环', desc: '会照顾队友', unlock: 70 },
];
// 只在存档读好以后调用
const tankUnlocked = i => !PLAYER_TANKS[i].unlock || (save.stars[PLAYER_TANKS[i].unlock - 1] || 0) > 0 || /[?&]unlock=1/.test(location.search);
const STAT_MAX = { hp: 10, atk: 3, dfn: 2, speed: 180 };

// ===== 敌人（不同颜色不同能力）=====
const ENEMIES = {
  g: { name: '小绿', size: 40, body: '#7ED957', dark: '#3E9B2A', eye: '#FF4D6D', hp: 2, atk: 2, dfn: 0, speed: 72, gun: 'normal', fire: [1.6, 3.2] },
  o: { name: '快快', size: 36, body: '#FFA94D', dark: '#C96A10', eye: '#2EE6D6', hp: 2, atk: 2, dfn: 0, speed: 132, gun: 'normal', fire: [1.8, 3.4] },
  b: { name: '冰冰', size: 40, body: '#6FC8FF', dark: '#2A86C8', eye: '#FFFFFF', hp: 3, atk: 2, dfn: 0, speed: 78, gun: 'ice', fire: [2.0, 3.6] },
  r: { name: '炮炮', size: 42, body: '#FF6B6B', dark: '#B83434', eye: '#FFE14D', hp: 3, atk: 3, dfn: 0, speed: 64, gun: 'big', fire: [2.2, 3.8] },
  p: { name: '散散', size: 40, body: '#FF8AD8', dark: '#C24FA0', eye: '#FFFFFF', hp: 3, atk: 2, dfn: 0, speed: 74, gun: 'scatter', fire: [2.2, 3.8] },
  h: { name: '大块头', size: 44, body: '#8E8BA8', dark: '#4C4968', eye: '#FFD23F', hp: 4, atk: 3, dfn: 1, speed: 56, gun: 'normal', fire: [1.8, 3.2] },
  y: { name: '金宝宝', size: 38, body: '#FFD23F', dark: '#C99A00', head: '#FFE88A', eye: '#FFFFFF', hp: 3, atk: 0, dfn: 0, speed: 150, gun: 'none', fire: [99, 99] },
  d: { name: '挖挖', size: 40, body: '#C9935A', dark: '#8A5A2A', eye: '#FFE14D', hp: 3, atk: 2, dfn: 0, speed: 66, gun: 'normal', fire: [2.4, 4.0], dig: true, tip: '它会挖墙，别躲在砖后面太久' },
  k: { name: '弹弹', size: 38, body: '#5EE0C0', dark: '#1F9E80', eye: '#FFFFFF', hp: 2, atk: 2, dfn: 0, speed: 80, gun: 'bounce', fire: [2.0, 3.6], tip: '小心会拐弯的子弹' },
  f: { name: '泡泡鱼', size: 40, body: '#FF9E6B', dark: '#C9602E', eye: '#FFFFFF', hp: 2, atk: 2, dfn: 0, speed: 76, gun: 'normal', fire: [2.0, 3.6], split: 'm', tip: '打完还有两只小的哦' },
  m: { name: '小泡泡', size: 26, body: '#FFC39E', dark: '#C97A4A', eye: '#26324A', hp: 1, atk: 1, dfn: 0, speed: 120, gun: 'normal', fire: [2.5, 4.0] },
  n: { name: '忍忍', size: 38, body: '#6B5B95', dark: '#3A2E5E', eye: '#FF4D6D', hp: 2, atk: 2, dfn: 0, speed: 100, gun: 'normal', fire: [2.0, 3.4], stealth: true, tip: '看它开炮的地方' },
  l: { name: '火火', size: 42, body: '#FF6B3D', dark: '#B83A1A', eye: '#FFE14D', hp: 3, atk: 2, dfn: 0, speed: 64, gun: 'flame', fire: [2.6, 4.0], tip: '看到冒火星就快躲开' },
  z: { name: '盾盾', size: 42, body: '#7A8CA8', dark: '#3E4C66', eye: '#FFE14D', hp: 3, atk: 2, dfn: 0, speed: 60, gun: 'normal', fire: [2.2, 3.8], shield: true, tip: '绕到旁边或后面打它' },
  u: { name: '飞飞', size: 38, body: '#B8F07E', dark: '#6AAE2E', eye: '#FF4DD2', hp: 2, atk: 2, dfn: 0, speed: 96, gun: 'normal', fire: [2.0, 3.6], fly: true, tip: '它能飞过小河和熔岩' },
  q: { name: '修修', size: 36, body: '#9EF0D0', dark: '#2EAE86', eye: '#26324A', hp: 2, atk: 0, dfn: 0, speed: 70, gun: 'none', fire: [99, 99], healer: true, tip: '它会给敌人修血，先打它！' },
  t: { name: '玩具兵', size: 34, body: '#E04848', dark: '#8E2020', eye: '#26324A', hp: 1, atk: 2, dfn: 0, speed: 70, gun: 'normal', fire: [2.4, 4.0], march: true },
  gen: { name: '护盾发生器', size: 40, body: '#9AA5FF', dark: '#4A55B8', eye: '#FFFFFF', hp: 8, atk: 0, dfn: 0, speed: 0, gun: 'none', fire: [99, 99], still: true },
  statue: { name: '小石像', size: 42, body: '#D9B56A', dark: '#9A7A3A', eye: '#3AD6FF', hp: 4, atk: 2, dfn: 0, speed: 0, gun: 'normal', fire: [2.4, 3.8], still: true },
};

// ===== 难度 =====
// dmg：敌人伤害加减；egg：宝宝蛋血量；boss：Boss 血量倍数
const DIFFS = [
  { id: 'baby', name: '宝宝', emoji: '🍼', desc: '敌人慢吞吞，5 条命', lives: 5, spd: 0.72, fire: 1.6, bullet: 0.78, count: 0.7, dmg: -1, egg: 7, boss: 0.7 },
  { id: 'kid', name: '小勇士', emoji: '⚔️', desc: '不难也不简单', lives: 3, spd: 1, fire: 1, bullet: 1, count: 1, dmg: 0, egg: 5, boss: 1 },
  { id: 'hero', name: '大英雄', emoji: '🔥', desc: '敌人又快又猛，2 条命', lives: 2, spd: 1.15, fire: 0.8, bullet: 1.15, count: 1.25, dmg: 1, egg: 3, boss: 1.3 },
];

// ===== 商店 =====
const SHOP = {
  hat: [
    { id: 'none', name: '不戴', price: 0 }, { id: 'party', name: '派对帽', price: 40 }, { id: 'bow', name: '蝴蝶结', price: 50 },
    { id: 'tophat', name: '小礼帽', price: 60 }, { id: 'cowboy', name: '牛仔帽', price: 70 }, { id: 'crown', name: '金皇冠', price: 90 },
    { id: 'chick', name: '小黄鸡', price: 110 }, { id: 'halo', name: '天使光环', price: 130 },
    // 纪念帽：打败世界 Boss 才有，买不到
    { id: 'snailHat', name: '蜗牛壳帽', trophy: 10 }, { id: 'iceCrown', name: '冰晶王冠', trophy: 20 }, { id: 'dinoHorn', name: '恐龙角帽', trophy: 30 },
    { id: 'jellyHat', name: '软糖帽', trophy: 40 }, { id: 'goggles', name: '潜水镜', trophy: 50 }, { id: 'bearEars', name: '熊耳朵', trophy: 60 },
    { id: 'fireHelm', name: '火焰头盔', trophy: 70 }, { id: 'windKey', name: '发条钥匙', trophy: 80 }, { id: 'spaceHelm', name: '宇航员头盔', trophy: 90 },
    { id: 'devilHorn', name: '魔王小角', trophy: 100 },
  ],
  paint: [
    { id: 'none', name: '原色', price: 0 }, { id: 'stripes', name: '条纹', price: 60 }, { id: 'stars', name: '星空', price: 100 },
    { id: 'gold', name: '黄金', price: 150 }, { id: 'rainbow', name: '彩虹', price: 180 },
    { id: 'camo', name: '迷彩', price: 120 }, { id: 'candy', name: '糖果', price: 140 }, { id: 'lava', name: '熔岩', price: 200 }, { id: 'galaxy', name: '星云', price: 220 },
  ],
  sticker: [
    { id: 'none', name: '没有', price: 0 }, { id: 'star', name: '星星', price: 25 }, { id: 'heart', name: '爱心', price: 25 },
    { id: 'bolt', name: '闪电', price: 30 }, { id: 'flower', name: '小花', price: 35 }, { id: 'smile', name: '笑脸', price: 35 },
    { id: 'fish', name: '小鱼', price: 40 }, { id: 'mushroom', name: '蘑菇', price: 40 }, { id: 'rocket', name: '火箭', price: 45 }, { id: 'moon', name: '月亮', price: 45 },
  ],
};
const SHOP_TABS = [['hat', '🎩 帽子'], ['paint', '🎨 涂装'], ['sticker', '⭐ 贴纸'], ['up', '⬆️ 升级']];
const UPGRADES = [
  { id: 'hp', name: '加厚装甲', icon: '❤️', desc: '血量 +1', costs: [50, 100, 180] },
  { id: 'atk', name: '强力炮管', icon: '💥', desc: '攻击 +1', costs: [150, 350] },
  { id: 'spd', name: '涡轮引擎', icon: '💨', desc: '速度 +8%', costs: [40, 90, 160] },
  { id: 'energy', name: '能量核心', icon: '⚡', desc: '大招充得更快', costs: [60, 120, 220] },
];

// ===== 成就 =====
const ACHS = [
  { id: 'tutorial', icon: '🎓', name: '学会啦', desc: '完成新手教学' },
  { id: 'win1', icon: '🚩', name: '第一次胜利', desc: '通过第 1 关' },
  { id: 'kill50', icon: '💥', name: '机器人克星', desc: '一共打败 50 个机器人' },
  { id: 'kill300', icon: '🤖', name: '机器人粉碎机', desc: '一共打败 300 个机器人' },
  { id: 'boss1', icon: '😈', name: 'Boss 猎人', desc: '打败第一个 Boss' },
  { id: 'bossBig', icon: '👑', name: '屠龙勇士', desc: '打败一个大 Boss' },
  { id: 'final', icon: '🐲', name: '坦克小英雄', desc: '打败第 100 关的魔王机甲' },
  { id: 'perfect', icon: '⭐', name: '完美通关', desc: '拿到一次三颗星' },
  { id: 'stars30', icon: '🌟', name: '星星收集家', desc: '一共拿到 30 颗星' },
  { id: 'stars60', icon: '🏆', name: '满天星', desc: '一共拿到 60 颗星' },
  { id: 'pup30', icon: '🎁', name: '道具达人', desc: '一共捡 30 个道具' },
  { id: 'skill20', icon: '⚡', name: '大招高手', desc: '放 20 次大招' },
  { id: 'combo3', icon: '🎯', name: '一炮三响', desc: '一下子打败 3 个敌人' },
  { id: 'gold', icon: '💰', name: '抓住金宝宝', desc: '打败金色宝箱机器人' },
  { id: 'coins500', icon: '🪙', name: '小富翁', desc: '一共赚到 500 金币' },
  { id: 'shop', icon: '🛒', name: '第一次购物', desc: '在商店买一样东西' },
  { id: 'duo', icon: '👫', name: '好朋友', desc: '两个人一起过一关' },
  { id: 'hero', icon: '🔥', name: '真正的英雄', desc: '用大英雄难度过一关' },
  { id: 'designer', icon: '🛠️', name: '小小设计师', desc: '试玩自己做的关卡' },
  { id: 'pusher', icon: '📦', name: '大力士', desc: '推箱子 20 次' },
  { id: 'portal', icon: '🌀', name: '传送门旅行家', desc: '穿过传送门 10 次' },
  { id: 'jumper', icon: '🦘', name: '弹弹弹', desc: '用弹簧板跳 10 次' },
  { id: 'stars150', icon: '🌠', name: '星星大王', desc: '一共拿到 150 颗星' },
  { id: 'stars300', icon: '🌌', name: '满天星河', desc: '拿满全部 300 颗星' },
  { id: 'boss20', icon: '🛡️', name: 'Boss 克星', desc: '一共打败 20 个 Boss' },
  { id: 'bossAll', icon: '📖', name: 'Boss 图鉴全开', desc: '40 种 Boss 都打败过' },
  { id: 'twin', icon: '👯', name: '一次两个', desc: '打败一对双子 Boss' },
  { id: 'world5', icon: '🗺️', name: '半路英雄', desc: '打败第 50 关' },
  { id: 'rescue20', icon: '🐧', name: '好心肠', desc: '一共救出 20 个小伙伴' },
  { id: 'collect100', icon: '✨', name: '捡星星的人', desc: '在收集关一共捡 100 颗星星' },
  { id: 'survive5', icon: '⏱️', name: '坚持就是胜利', desc: '完成 5 个坚持关' },
  { id: 'pushAll', icon: '🧩', name: '推箱子大师', desc: '5 个推箱关全部过关' },
  { id: 'goldRush', icon: '🤑', name: '金宝宝收割机', desc: '在金宝宝关抓到全部金宝宝' },
  { id: 'nightOwl', icon: '🦉', name: '夜猫子', desc: '夜晚关不丢命过关' },
  { id: 'magnet20', icon: '🧲', name: '吸吸吸', desc: '一次磁铁吸到 20 个金币' },
  { id: 'mirror10', icon: '🪞', name: '原路奉还', desc: '用反弹护盾弹回 10 发子弹' },
  { id: 'orange', icon: '🧡', name: '新伙伴橙橙', desc: '解锁橙橙' },
  { id: 'pink', icon: '🩷', name: '新伙伴粉粉', desc: '解锁粉粉' },
  { id: 'allTanks', icon: '🚗', name: '七色坦克', desc: '7 辆坦克每辆都过过关' },
  { id: 'kill1000', icon: '🏅', name: '机器人终结者', desc: '一共打败 1000 个机器人' },
  { id: 'trophy10', icon: '🎩', name: '帽子收藏家', desc: '拿到全部 10 顶纪念帽' },
];

// ===== Boss =====
// kind: mini 小Boss / big 大Boss / final 终极Boss
// 特别能力：armored 平时打不疼、frontShield 正面有盾、sidestep 只横着走、still 不会走、
//          split 打倒后分裂、gens 开场放护盾发生器、rebuild 会捡积木回血、fake 假身、child 分裂出来的
const BOSSES = {
  hammer: { name: '铁锤将军', kind: 'mini', size: 68, body: '#9AA5B8', dark: '#4F5A70', eye: '#FF5A5F', hp: 30, atk: 3, speed: 58, deco: 'helmet', skills: ['big3', 'dash', 'summon', 'big3'], minions: 'go', joke: '其实头盔里面是空的' },
  king: { name: '机器人大王', kind: 'big', size: 92, body: '#FF6B81', dark: '#B02A45', eye: '#FFE14D', hp: 60, atk: 3, speed: 46, deco: 'crown', skills: ['spread', 'ring', 'summon', 'big3', 'spread5'], minions: 'goh', joke: '皇冠是用易拉罐做的' },
  shotgun: { name: '散弹大师', kind: 'mini', size: 68, body: '#FF9AE0', dark: '#B5468F', eye: '#FFFFFF', hp: 34, atk: 2, speed: 62, deco: 'mohawk', skills: ['spread5', 'summon', 'spread5', 'dash'], minions: 'go', joke: '每天花一小时梳头' },
  snail: { name: '蜗牛大王', kind: 'big', size: 92, body: '#FFB86B', dark: '#C9772E', eye: '#3A3A5A', hp: 70, atk: 3, speed: 34, deco: 'snail', skills: ['shellHide', 'spread', 'summon', 'shellSpin', 'spread5'], minions: 'goh', joke: '其实它很怕痒' },
  frost: { name: '冰雪女王', kind: 'mini', size: 68, body: '#9EE6FF', dark: '#3A9CC8', eye: '#3A6CFF', hp: 36, atk: 2, speed: 60, deco: 'ice', skills: ['iceSpread', 'ring', 'summon', 'iceSpread'], minions: 'bb', joke: '最爱吃冰淇淋' },
  snowman: { name: '雪人大将', kind: 'big', size: 94, body: '#F4FBFF', dark: '#9CC3E0', eye: '#26324A', hp: 78, atk: 3, speed: 40, deco: 'snowman', skills: ['snowball', 'iceSpread', 'summon', 'snowball', 'ring'], minions: 'gbo', joke: '鼻子是一根真的胡萝卜' },
  penguin: { name: '企鹅滑滑', kind: 'mini', size: 68, body: '#3B4A6B', dark: '#1E2740', eye: '#FFFFFF', hp: 40, atk: 2, speed: 60, deco: 'penguin', skills: ['slide', 'iceSpread', 'summon', 'slide', 'spread'], minions: 'bo', joke: '滑得太快经常撞墙' },
  icedragon: { name: '冰晶飞龙', kind: 'big', size: 96, body: '#8FDFFF', dark: '#3A8FC8', eye: '#3A6CFF', hp: 86, atk: 3, speed: 46, deco: 'dragon', skills: ['iceBreath', 'ring', 'fly', 'summon', 'iceSpread'], minions: 'brh', joke: '打喷嚏会下雪' },
  rocket: { name: '火箭小子', kind: 'mini', size: 68, body: '#FF8A3D', dark: '#B5501A', eye: '#FFFFFF', hp: 42, atk: 3, speed: 64, deco: 'rocket', skills: ['bomb3', 'dash', 'spread', 'summon'], minions: 'ro', joke: '梦想是飞上月亮' },
  worm: { name: '沙虫钻钻', kind: 'mini', size: 68, body: '#E8B86A', dark: '#A8742E', eye: '#FF5A5F', hp: 46, atk: 2, speed: 56, deco: 'worm', skills: ['burrow', 'spread5', 'summon', 'burrow', 'spread'], minions: 'dg', joke: '钻出来总是一头沙子' },
  pharaoh: { name: '法老金字塔', kind: 'big', size: 96, body: '#FFD25E', dark: '#B8862A', eye: '#3AD6FF', hp: 94, atk: 3, speed: 22, deco: 'pharaoh', skills: ['sunLaser', 'guards', 'spread5', 'summon', 'sunLaser', 'ring'], minions: 'dr', joke: '睡了三千年刚起床' },
  dino: { name: '恐龙霸王', kind: 'big', size: 96, body: '#5DD39E', dark: '#23845A', eye: '#FF5A5F', hp: 100, atk: 3, speed: 46, deco: 'spikes', skills: ['dash', 'stomp', 'bomb3', 'spread5', 'summon'], minions: 'hrd', joke: '手太短，够不到自己的头' },
  clown: { name: '棒棒糖小丑', kind: 'mini', size: 68, body: '#FFFFFF', dark: '#C9C9D9', eye: '#3EC1F3', hp: 48, atk: 2, speed: 62, deco: 'clown', skills: ['bounce5', 'juggle', 'summon', 'bounce5'], minions: 'kp', joke: '红鼻子按一下会响' },
  cake: { name: '蛋糕女王', kind: 'big', size: 94, body: '#FFC6E0', dark: '#C9709E', eye: '#7A3B22', hp: 106, atk: 3, speed: 42, deco: 'cake', skills: ['cakeWall', 'cream', 'spread5', 'summon', 'cream'], minions: 'kpo', joke: '偷偷吃掉了自己的樱桃' },
  ghost: { name: '幽灵坦克', kind: 'mini', size: 68, body: '#E8E4FF', dark: '#8C84C8', eye: '#5B4BFF', hp: 52, atk: 3, speed: 66, deco: 'ghost', skills: ['teleport', 'ring', 'invis', 'spread5', 'summon'], minions: 'po', joke: '其实很怕黑' },
  jelly: { name: '软糖巨人', kind: 'big', size: 96, body: '#7CF2C8', dark: '#2EAE86', eye: '#FF4D9A', hp: 56, atk: 3, speed: 50, deco: 'jelly', skills: ['spread', 'jump', 'summon', 'spread5'], minions: 'kph', split: { into: 'jellyMid', n: 2 }, joke: '闻起来是草莓味的' },
  jellyMid: { name: '软糖巨人', kind: 'mini', size: 68, body: '#7CF2C8', dark: '#2EAE86', eye: '#FF4D9A', hp: 28, atk: 2, speed: 60, deco: 'jelly', skills: ['spread', 'jump', 'spread5'], minions: 'k', split: { into: 'jellySmall', n: 2 }, child: true },
  jellySmall: { name: '软糖巨人', kind: 'mini', size: 44, body: '#7CF2C8', dark: '#2EAE86', eye: '#FF4D9A', hp: 14, atk: 2, speed: 72, deco: 'jelly', skills: ['spread', 'jump'], minions: 'k', child: true },
  crab: { name: '螃蟹钳钳', kind: 'mini', size: 68, body: '#FF7058', dark: '#B83A28', eye: '#FFFFFF', hp: 54, atk: 2, speed: 64, deco: 'crab', sidestep: true, frontShield: true, skills: ['claw', 'spread5', 'summon', 'claw', 'spread'], minions: 'fk', joke: '只会横着走路' },
  octo: { name: '章鱼船长', kind: 'big', size: 92, body: '#B57CFF', dark: '#6A3FC8', eye: '#FFE14D', hp: 118, atk: 3, speed: 44, deco: 'tentacle', skills: ['spiral', 'ring', 'summon', 'iceSpread'], minions: 'fbo', joke: '八只手一起挠痒痒' },
  puffer: { name: '河豚胖胖', kind: 'mini', size: 68, body: '#FFE07A', dark: '#C9A030', eye: '#26324A', hp: 58, atk: 2, speed: 52, deco: 'puffer', skills: ['puff', 'spread5', 'summon', 'puff'], minions: 'fk', joke: '一生气就鼓起来' },
  whale: { name: '鲸鱼潜艇', kind: 'big', size: 100, body: '#5C8DFF', dark: '#2B4FB8', eye: '#FFFFFF', hp: 124, atk: 3, speed: 44, deco: 'whale', skills: ['dive', 'torpedo', 'bubbleTrap', 'ring', 'summon'], minions: 'fkr', joke: '喷出来的水是汽水' },
  shroom: { name: '蘑菇炮手', kind: 'mini', size: 68, body: '#FF6B6B', dark: '#B83434', eye: '#FFFFFF', hp: 58, atk: 2, speed: 50, deco: 'shroom', skills: ['spore', 'mushShield', 'spread', 'summon', 'spore'], minions: 'go', joke: '下雨天会长高' },
  pecker: { name: '啄木鸟', kind: 'mini', size: 68, body: '#5AA9FF', dark: '#2A6AC8', eye: '#FFFFFF', hp: 62, atk: 2, speed: 66, deco: 'pecker', skills: ['peck', 'spread5', 'summon', 'dash', 'peck'], minions: 'nd', joke: '一天啄一千下也不头疼' },
  tree: { name: '大树爷爷', kind: 'big', size: 100, body: '#9B6B43', dark: '#5E3B1F', eye: '#FFE14D', hp: 130, atk: 3, speed: 0, deco: 'tree', still: true, skills: ['vineWall', 'acorn', 'roots', 'summon', 'acorn', 'roots'], minions: 'nhf', joke: '已经三百岁啦' },
  bear: { name: '熊熊机甲', kind: 'big', size: 96, body: '#B07A4A', dark: '#6E4524', eye: '#FFE14D', hp: 136, atk: 3, speed: 46, deco: 'bear', skills: ['stomp', 'roar', 'honey', 'dash', 'summon'], minions: 'hnr', joke: '最爱吃蜂蜜' },
  lavaball: { name: '熔岩球球', kind: 'mini', size: 66, body: '#FF7A2E', dark: '#B8401A', eye: '#FFE14D', hp: 62, atk: 2, speed: 60, deco: 'lava', trail: true, skills: ['bounceBall', 'ring', 'summon', 'bounceBall', 'spread5'], minions: 'lo', joke: '摸起来烫烫的' },
  firedragon: { name: '喷火龙', kind: 'big', size: 98, body: '#FF5A4A', dark: '#B02A20', eye: '#FFE14D', hp: 142, atk: 3, speed: 46, deco: 'dragon', skills: ['flame', 'fly', 'meteor', 'spread5', 'summon'], minions: 'lrh', joke: '用火烤棉花糖' },
  blaze: { name: '炎炎机器人', kind: 'mini', size: 68, body: '#FFB03A', dark: '#C46A10', eye: '#FFFFFF', hp: 66, atk: 2, speed: 58, deco: 'blaze', skills: ['flameSweep', 'dash', 'spread5', 'summon'], minions: 'ld', joke: '头发永远是竖起来的' },
  golem: { name: '火山魔像', kind: 'big', size: 100, body: '#7A6A66', dark: '#3E3433', eye: '#FF7A2E', hp: 148, atk: 3, speed: 34, deco: 'golem', armored: true, skills: ['erupt', 'stomp', 'big3', 'summon'], minions: 'lhr', joke: '肚子里装着一锅热汤' },
  bunny: { name: '发条兔', kind: 'mini', size: 68, body: '#FFC1DE', dark: '#C76A9A', eye: '#26324A', hp: 66, atk: 2, speed: 58, deco: 'bunny', skills: ['windup', 'spread5', 'summon'], minions: 'ok', joke: '发条要每天上一次' },
  crane: { name: '机械臂工厂', kind: 'big', size: 98, body: '#FFC93C', dark: '#B88A00', eye: '#26324A', hp: 154, atk: 3, speed: 40, deco: 'crane', skills: ['grabCrate', 'laserSweep', 'conveyorFlip', 'summon', 'grabCrate'], minions: 'zlo', joke: '抓娃娃机从来没失手过' },
  blocky: { name: '积木人', kind: 'mini', size: 68, body: '#4CB8FF', dark: '#2A78C8', eye: '#FFFFFF', hp: 70, atk: 2, speed: 54, deco: 'blocky', rebuild: true, skills: ['big3', 'spread', 'summon', 'big3'], minions: 'zk', joke: '少了一块积木会睡不着' },
  tinsoldier: { name: '锡兵大将', kind: 'big', size: 96, body: '#E04848', dark: '#8E2020', eye: '#26324A', hp: 160, atk: 3, speed: 44, deco: 'soldier', skills: ['march', 'volley', 'big3', 'summon', 'volley'], minions: 'zhr', joke: '走路永远是一二一' },
  ufo: { name: '外星飞碟', kind: 'mini', size: 70, body: '#9AE6B4', dark: '#3E9A6A', eye: '#FF4DD2', hp: 70, atk: 2, speed: 62, deco: 'ufo', skills: ['tractor', 'teleport', 'ring', 'summon'], minions: 'uz', joke: '来地球是为了买奶茶' },
  meteorite: { name: '陨石怪', kind: 'mini', size: 68, body: '#9C8A7A', dark: '#5A4A3E', eye: '#FF7A2E', hp: 37, atk: 2, speed: 56, deco: 'rock', skills: ['meteor', 'dash', 'spread5'], minions: 'ul', split: { into: 'rockling', n: 3 }, joke: '从很远很远的地方掉下来' },
  rockling: { name: '小陨石怪', kind: 'mini', size: 44, body: '#9C8A7A', dark: '#5A4A3E', eye: '#FF7A2E', hp: 12, atk: 2, speed: 70, deco: 'rock', skills: ['spread', 'dash'], minions: 'u', child: true },
  mothership: { name: '星际母舰', kind: 'big', size: 100, body: '#B9C4FF', dark: '#5A68C8', eye: '#FF4DD2', hp: 166, atk: 3, speed: 36, deco: 'mothership', gens: 4, skills: ['laserSweep', 'summon', 'spiral', 'ring'], minions: 'uzr', joke: '船上有个很大的游乐场' },
  blackhole: { name: '黑洞机甲', kind: 'big', size: 98, body: '#4A3A7A', dark: '#221A44', eye: '#C77BFF', hp: 172, atk: 3, speed: 40, deco: 'blackhole', skills: ['pull', 'spiral', 'teleport', 'ring', 'summon'], minions: 'uzl', joke: '把自己的袜子也吸走了' },
  knight: { name: '坏坏骑士', kind: 'mini', size: 68, body: '#A8B4C8', dark: '#5A667A', eye: '#FF4D6D', hp: 76, atk: 3, speed: 56, deco: 'knight', frontShield: true, skills: ['lance', 'spread5', 'summon', 'lance'], minions: 'zq', joke: '盔甲走路叮当响' },
  wizard: { name: '坏坏巫师', kind: 'big', size: 96, body: '#8A5CFF', dark: '#4A2AA8', eye: '#FFE14D', hp: 180, atk: 3, speed: 44, deco: 'wizard', skills: ['clone', 'teleport', 'magicCircle', 'spiral', 'summon'], minions: 'qnu', joke: '魔法书拿反了' },
  wizardFake: { name: '假巫师', kind: 'mini', size: 96, body: '#8A5CFF', dark: '#4A2AA8', eye: '#FFE14D', hp: 1, atk: 2, speed: 50, deco: 'wizard', fake: true, child: true, skills: ['spread', 'spread'], minions: 'q' },
  mirror: { name: '镜子怪', kind: 'mini', size: 68, body: '#CFE8FF', dark: '#7A9AC8', eye: '#FF4DD2', hp: 80, atk: 3, speed: 56, deco: 'mirror', skills: ['copyWeapon', 'teleport', 'ring', 'summon', 'copyWeapon'], minions: 'zl', joke: '每天照镜子一百次' },
  mega: {
    name: '魔王机甲', kind: 'final', size: 116, body: '#4A4A70', dark: '#23233D', eye: '#FF3B3B', hp: 260, atk: 3, speed: 42, deco: 'mega', minions: 'hrzqu', joke: '其实是个害羞的小机器人',
    phases: [['spread5', 'ring', 'summon', 'big3'], ['iceSpread', 'flame', 'meteor', 'summon'], ['cakeWall', 'gens2', 'spiral', 'summon', 'ring'], ['pull', 'clone', 'magicCircle', 'teleport', 'stomp', 'summon']],
    lines: ['你们是怎么打到这里的？！', '尝尝冰火两重天！', '我的机关厉害吧！', '我……我还没输！'],
  },
};
const BOSS_KIND_NAME = { mini: '小 Boss', big: '大 Boss', final: '终极 Boss' };
// 图鉴里的 40 种（不含分裂出来的和假身）
const BOSS_LIST = Object.keys(BOSSES).filter(k => !BOSSES[k].child);

// 新地形第一次出现时的提示
const TERRAIN_TIPS = {
  ice: ['冰面', '冰上会滑，早点松手哦'], sand: ['流沙', '流沙会让坦克变慢'], spring: ['弹簧', '开上弹簧能跳过去'],
  jelly: ['果冻墙', '子弹打到果冻会弹回来'], portal: ['传送门', '钻进去会从另一个门出来'], flow: ['水流', '水流会推着坦克走'],
  belt: ['传送带', '传送带会把坦克带走'], vine: ['藤蔓墙', '打掉了过一会儿会长回来'], lava: ['熔岩', '熔岩开不过去，子弹能飞过去'],
  vent: ['喷火口', '发红光就要喷火啦，快躲开'], gate: ['开关和大门', '开上黄色按钮，大门就会打开'], hole: ['黑洞', '黑洞会吸走子弹'],
  blink: ['机关墙', '一会儿有一会儿没有'], meteor: ['陨石雨', '看到阴影就快躲开'], night: ['夜晚', '捡萤火虫能照亮全图'],
  crate: ['木箱', '顶着木箱开就能推它'],
};

// ===== 道具 =====
// world：从第几个世界开始掉（0 起）
const PUPS = {
  big: { name: '大炮弹', color: '#FF7043', weapon: true },
  scatter: { name: '散弹', color: '#FF5FBF', weapon: true },
  pierce: { name: '穿透弹', color: '#FFB300', weapon: true },
  ice: { name: '冰弹', color: '#29B6F6', weapon: true },
  bomb: { name: '爆炸弹', color: '#8E5BFF', weapon: true },
  homing: { name: '追踪弹', color: '#FF8A3D', weapon: true, desc: '子弹会拐弯找敌人' },
  double: { name: '双管炮', color: '#F9A825', weapon: true, desc: '一次打两发' },
  rainbow: { name: '彩虹弹', color: '#FF6FAE', weapon: true, desc: '又大又穿透，还会冻和炸' },
  shield: { name: '护盾泡泡', color: '#4FC3F7', desc: '10 秒不怕子弹' },
  heart: { name: '爱心', color: '#FF5C8A', desc: '加 2 颗心' },
  speed: { name: '闪电鞋', color: '#7C4DFF', desc: '跑得飞快' },
  freeze: { name: '时间冻结', color: '#00ACC1', desc: '敌人全部冻住' },
  wall: { name: '铁墙', color: '#78909C', desc: '老家变成铁墙' },
  starbomb: { name: '星星炸弹', color: '#FFA000', desc: '全屏敌人都挨炸' },
  helper: { name: '小蜜蜂', color: '#FBC02D', desc: '小帮手帮你打' },
  energy: { name: '能量电池', color: '#00C853', desc: '技能马上充满' },
  life: { name: '加一命', color: '#43A047', desc: '多一条命' },
  magnet: { name: '磁铁', color: '#E53935', desc: '金币和道具都飞过来' },
  mirror: { name: '反弹护盾', color: '#80DEEA', desc: '把敌人的子弹弹回去' },
  bubble: { name: '泡泡罩', color: '#4DD0E1', desc: '把敌人装进泡泡里' },
  clone: { name: '分身', color: '#B39DDB', desc: '变出一个自己帮忙开炮' },
  turret: { name: '小炮台', color: '#8D6E63', desc: '放一个自动炮台' },
  rocket: { name: '火箭冲刺', color: '#FF7043', desc: '往前冲，撞飞敌人' },
  firefly: { name: '萤火虫', color: '#C6FF00', desc: '把黑夜照亮' },
};
const PUP_WEIGHTS = [['big', 8], ['scatter', 8], ['pierce', 7], ['ice', 7], ['bomb', 7], ['shield', 8], ['heart', 8], ['speed', 5], ['freeze', 5], ['wall', 5], ['starbomb', 4], ['helper', 6], ['energy', 5], ['life', 2],
  ['magnet', 6, 1], ['homing', 6, 2], ['mirror', 5, 3], ['bubble', 5, 4], ['clone', 4, 5], ['double', 6, 6], ['turret', 4, 7], ['rocket', 4, 8], ['rainbow', 3, 9]];
// 每个世界第一次出现的新道具
const WORLD_NEW_PUP = [null, 'magnet', 'homing', 'mirror', 'bubble', 'clone', 'double', 'turret', 'rocket', 'rainbow'];
