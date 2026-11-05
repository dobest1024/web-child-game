export const cols = 8;
export const rows = 6;
export const key = (p) => p.join(',');
export const same = (a, b) => a[0] === b[0] && a[1] === b[1];
export const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const themes = [
  { name: '春日邮局', subtitle: '第一封信，也要一起送到', icon: '🌷', ground: '#d4e7b8', tile: '#e3efcf', accent: '#6b996c' },
  { name: '汽水海湾', subtitle: '踩住踏板，把路留给伙伴', icon: '🐚', ground: '#eddaaa', tile: '#fae9bf', accent: '#bcaa7b' },
  { name: '星光小镇', subtitle: '冰与火，让每扇窗亮起来', icon: '✨', ground: '#d0cee6', tile: '#e5e2f2', accent: '#9290b3' },
];
const designs = [
  ['你好，小快递员', '先各自拿到同色包裹，再送进蓝色和橙色邮筒。', '1,1 2,1 3,1 4,1 5,1 6,1', '1,4 2,4 3,4 4,4 5,4 6,4'],
  ['花园里的小弯路', '花丛挡住直路啦，转个弯，把包裹安全送到。', '1,2 2,2 2,1 3,1 4,1 5,1 6,1', '1,3 2,3 2,4 3,4 4,4 5,4 6,4'],
  ['帮你打开一扇门', '冰冰先踩左边金色踏板，让暖暖过门。暖暖再踩右边踏板，接冰冰过来！', '1,1 2,1 3,1 4,1 5,1 6,1', '1,4 2,4 3,4 4,4 5,4 6,4'],
  ['换你来帮我', '门在有人踩踏板时才打开。送好快递以后，也别忘了帮伙伴。', '1,2 2,2 2,1 3,1 4,1 5,1 6,1', '1,4 2,4 3,4 3,3 4,3 5,3 6,3 6,4'],
  ['凉凉与暖暖', '蓝色水洼只让冰冰走，橙色暖石只让暖暖走。互相看好自己的路。', '1,1 2,1 3,1 4,1 5,1 5,2 6,2', '1,4 2,4 3,4 4,4 5,4 6,4'],
  ['海风邮差', '暖暖要绕过贝壳小山，冰冰记得一直踩稳踏板哦。', '1,2 2,2 3,2 3,1 4,1 5,1 6,1', '1,4 2,4 2,5 3,5 4,5 5,5 6,5 6,4'],
  ['两份惊喜', '今天每人有两件包裹，一起带到同色邮筒就好！', '0,1 1,1 2,1 3,1 4,1 5,1 6,1 7,1', '0,4 1,4 2,4 3,4 4,4 5,4 6,4 7,4'],
  ['海湾接力赛', '绕过小礁石，再帮伙伴开门。没有倒计时，商量好再走。', '0,2 1,2 2,2 2,1 3,1 4,1 5,1 6,1 7,1', '0,4 1,4 2,4 3,4 3,5 4,5 5,5 6,5 7,5 7,4'],
  ['星光第一站', '小镇的居民都在等礼物。用冰火接力点亮他们的邮筒。', '0,1 1,1 2,1 3,1 3,2 4,2 5,2 6,2 7,2', '0,4 1,4 2,4 3,4 4,4 5,4 6,4 7,4'],
  ['月亮绕一圈', '月亮桥弯弯的，包裹不能落下，踏板也不能太早松开。', '0,2 1,2 1,1 2,1 3,1 4,1 5,1 5,2 6,2 7,2', '0,4 1,4 2,4 2,5 3,5 4,5 5,5 6,5 7,5 7,4'],
  ['繁星快递站', '每个人负责自己的包裹，也负责伙伴脚下的通路。', '0,1 1,1 2,1 2,2 3,2 4,2 5,2 6,2 6,1 7,1', '0,4 1,4 2,4 3,4 3,5 4,5 5,5 6,5 7,5 7,4'],
  ['团圆礼物大派送', '最后一趟快递！踩好踏板、收齐礼物，让冰冰和暖暖一起获得合作勋章。', '0,2 1,2 1,1 2,1 3,1 4,1 5,1 6,1 6,2 7,2', '0,4 1,4 2,4 2,5 3,5 4,5 5,5 6,5 7,5 7,4'],
];
const route = (text) => text.split(' ').map((p) => p.split(',').map(Number));
function actions(points, player, from = 0) {
  return points.slice(from + 1).map((p, i) => {
    const previous = points[from + i];
    const direction = Object.entries(directions).find(([, [dx, dy]]) => p[0] - previous[0] === dx && p[1] - previous[1] === dy)[0];
    return { player, direction };
  });
}
export const levels = designs.map(([name, story, blueText, orangeText], id) => {
  const blue = route(blueText), orange = route(orangeText);
  const safe = new Set([...blue, ...orange].map(key));
  const cooperation = id >= 2;
  const gates = cooperation ? [...blue, ...orange].filter(([x]) => x === 4).map(key) : [];
  const walls = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const p = `${x},${y}`;
    if (!safe.has(p) && ((cooperation && x === 4) || (x * 11 + y * 7 + id * 3) % 9 < 5)) walls.push(p);
  }
  const plateAt = cooperation ? blue[1] : null;
  const rightPlate = cooperation ? orange.at(-1) : null;
  const plateKeys = [plateAt, rightPlate].filter(Boolean).map(key);
  const goals = [blue.at(-1), cooperation ? orange.at(-2) : orange.at(-1)];
  const packages = [];
  for (const [player, points] of [blue, orange].entries()) {
    const candidates = points.slice(1, -1).filter((p) => !plateKeys.includes(key(p)) && !same(p, goals[player]) && !gates.includes(key(p)));
    const chosen = id >= 6 ? [candidates[0], candidates.at(-1)] : [candidates[0]];
    [...new Map(chosen.map((p) => [key(p), p])).values()].forEach((at) => packages.push({ id: `${player}:${key(at)}`, player, at }));
  }
  const terrain = id >= 4 ? [{ at: blue.find((p) => p[0] === 3), player: 0 }, { at: orange.find((p) => p[0] === 3), player: 1 }] : [];
  const reference = cooperation ? [...actions(blue.slice(0, 2), 0), ...actions(orange, 1), ...actions(blue, 0, 1)] : [...actions(blue, 0), ...actions(orange, 1)];
  return { id, name, story, theme: Math.floor(id / 4), starts: [blue[0], orange[0]], goals, plates: [plateAt, rightPlate].filter(Boolean), gates, walls, terrain, packages, budget: reference.length, solution: reference,
    hint: cooperation ? `冰冰先到第 ${plateAt[1] + 1} 行第 ${plateAt[0] + 1} 列的踏板。暖暖送达后，再走到第 ${rightPlate[1] + 1} 行第 ${rightPlate[0] + 1} 列踩住另一块踏板。` : '走到同色包裹上会自动拿起，带到同色邮筒会自动送达。可以先完成一位，再完成另一位。' };
});
