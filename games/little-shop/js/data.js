'use strict';
// ===== 小店里的东西：货物、顾客、装修 =====

// 量词按日常说法：一个苹果、一根香蕉、一颗糖、一盒果汁、一块饼干、一瓶牛奶
const ITEMS = [
  { id: 'apple', e: '🍎', name: '苹果', unit: '个' },
  { id: 'banana', e: '🍌', name: '香蕉', unit: '根' },
  { id: 'carrot', e: '🥕', name: '胡萝卜', unit: '根' },
  { id: 'bread', e: '🍞', name: '面包', unit: '个' },
  { id: 'egg', e: '🥚', name: '鸡蛋', unit: '个' },
  { id: 'berry', e: '🍓', name: '草莓', unit: '个' },
  { id: 'candy', e: '🍬', name: '糖果', unit: '颗' },
  { id: 'juice', e: '🧃', name: '果汁', unit: '盒' },
  { id: 'cookie', e: '🍪', name: '饼干', unit: '块' },
  { id: 'milk', e: '🥛', name: '牛奶', unit: '瓶' },
  { id: 'pear', e: '🍐', name: '梨', unit: '个' },
  { id: 'corn', e: '🌽', name: '玉米', unit: '根' },
];

// 顾客图鉴：服务过就点亮
const ANIMALS = [
  { id: 'rabbit', e: '🐰', name: '小兔' },
  { id: 'bear', e: '🐻', name: '小熊' },
  { id: 'panda', e: '🐼', name: '熊猫' },
  { id: 'cat', e: '🐱', name: '小猫' },
  { id: 'dog', e: '🐶', name: '小狗' },
  { id: 'fox', e: '🦊', name: '小狐狸' },
  { id: 'pig', e: '🐷', name: '小猪' },
  { id: 'monkey', e: '🐵', name: '小猴' },
  { id: 'tiger', e: '🐯', name: '小老虎' },
  { id: 'koala', e: '🐨', name: '考拉' },
  { id: 'frog', e: '🐸', name: '青蛙' },
  { id: 'chick', e: '🐤', name: '小鸡' },
  { id: 'penguin', e: '🐧', name: '企鹅' },
  { id: 'lion', e: '🦁', name: '小狮子' },
  { id: 'cow', e: '🐮', name: '小牛' },
  { id: 'mouse', e: '🐭', name: '小老鼠' },
];

// 装修：用金币买，买了就能换上
const DECOR = {
  awning: {
    name: '遮阳棚',
    items: [
      { id: 'red', name: '红白条纹', price: 0, colors: ['#ff6f61', '#fff7ec'] },
      { id: 'blue', name: '蓝白条纹', price: 20, colors: ['#4aa3df', '#f2fbff'] },
      { id: 'green', name: '青草条纹', price: 20, colors: ['#5cc9a7', '#fffbe0'] },
      { id: 'candy', name: '糖果条纹', price: 40, colors: ['#ff8fc1', '#fff0f7'] },
      { id: 'rainbow', name: '彩虹条纹', price: 70, colors: ['#ff6f61', '#ffc93c', '#5cc9a7', '#4aa3df', '#a678f5'] },
    ],
  },
  sign: {
    name: '招牌',
    items: [
      { id: 'wood', name: '木头招牌', price: 0 },
      { id: 'star', name: '星星招牌', price: 30 },
      { id: 'candy', name: '糖果招牌', price: 50 },
    ],
  },
  hat: {
    name: '店长帽子',
    items: [
      { id: 'none', name: '不戴帽子', price: 0, e: '' },
      { id: 'cap', name: '鸭舌帽', price: 20, e: '🧢' },
      { id: 'bow', name: '蝴蝶结', price: 25, e: '🎀' },
      { id: 'straw', name: '小草帽', price: 30, e: '👒' },
      { id: 'grad', name: '博士帽', price: 45, e: '🎓' },
      { id: 'crown', name: '金皇冠', price: 90, e: '👑' },
    ],
  },
  deco: {
    name: '门口装饰',
    items: [
      { id: 'none', name: '空空的门口', price: 0, e: '' },
      { id: 'flower', name: '郁金香', price: 15, e: '🌷' },
      { id: 'plant', name: '小绿植', price: 20, e: '🪴' },
      { id: 'balloon', name: '彩色气球', price: 25, e: '🎈' },
      { id: 'sunflower', name: '向日葵', price: 35, e: '🌻' },
      { id: 'cat', name: '小猫门卫', price: 60, e: '🐈' },
    ],
  },
};
const DECOR_SLOTS = Object.keys(DECOR);

if (typeof module === 'object') module.exports = { ITEMS, ANIMALS, DECOR, DECOR_SLOTS };
