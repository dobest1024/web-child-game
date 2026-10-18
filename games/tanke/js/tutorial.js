'use strict';
// ===== 新手教学 =====
const TUTORIAL_LEVEL = {
  li: -1, tutorial: true, world: 0, theme: 'grass', boss: null, name: '新手教学', maxOn: 3, enemies: '',
  map: [
    '...............',
    '...............',
    '...............',
    '.....BBBBB.....',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '......BBB......',
    '....P.BEB......',
  ],
};
const TUT_STEPS = [
  { text: '用方向键开坦克，开到星星那里', keys: ['↑', '↓', '←', '→'] },
  { text: '按空格发射炮弹，打碎上面的砖墙', keys: ['空格'] },
  { text: '开过去，捡起道具箱', keys: [] },
  { text: '坏机器人来了！打败它', keys: ['空格'] },
  { text: '能量满啦！按 K 放大招', keys: ['K'] },
  { text: '最后：保护宝宝蛋，打败所有机器人！', keys: [] },
];

function startTutorial() {
  G.tut = { step: 0, t: 0, done: false, spawned: false, target: [4 * T + 24, 5 * T + 24] };
  tutAnnounce();
}
function tutAnnounce() {
  const s = TUT_STEPS[G.tut.step];
  G.tut.t = 0;
  say(s.text.replace('K', 'K 键'));
}
function bricksLeftInWall() {
  let n = 0;
  for (let cy = 6; cy <= 7; cy++) for (let cx = 10; cx <= 19; cx++) if (cellAt(cx, cy) === BRICK) n++;
  return n;
}
function enemiesAlive() { return G.tanks.some(t => t.kind === 'enemy' && !t.dead) || G.spawns.length > 0; }

function updateTutorial(dt) {
  const g = G, tu = g.tut, p = g.players[0];
  tu.t += dt;
  switch (tu.step) {
    case 0:
      if (Math.hypot(p.x - tu.target[0], p.y - tu.target[1]) < 30) tu.done = true;
      break;
    case 1:
      if (bricksLeftInWall() <= 16) tu.done = true;
      break;
    case 2:
      if (!tu.spawned) {
        tu.spawned = true;
        const x = clamp(snapC(p.x / 2) * 2, 72, MAP_W - 72), y = clamp(p.y + 96 <= 8 * T + 24 ? p.y + 96 : p.y - 96, 72, 8 * T + 24);
        const px = Math.round((x - 24) / T) * T + 24, py = Math.round((y - 24) / T) * T + 24;
        if (freeSpot(px, py, 40)) g.pups.push({ x: px, y: py, type: 'big', t: 0, life: 9999 });
        else spawnPup(p.x, p.y, 'big');
        g.pups.forEach(u => { u.life = 9999; });
      }
      break;
    case 3:
      if (!tu.spawned) { tu.spawned = true; g.spawns.push({ x: 360, y: 24, t: 0, type: 'g', carrier: false, summoned: true }); }
      else if (tu.t > 1.5 && !enemiesAlive()) tu.done = true;
      break;
    case 4:
      if (!tu.spawned) { tu.spawned = true; p.energy = 1; }
      break;
    case 5:
      if (!tu.spawned) { tu.spawned = true; g.queue = ['g', 'o', 'g']; g.total = 3; g.killed = 0; g.spawnT = 1.5; }
      else if (g.queue.length === 0 && !enemiesAlive()) win();
      break;
  }
  if (tu.done && tu.step < 5) {
    tu.step++; tu.done = false; tu.spawned = false;
    burstStars(p.x, p.y, 16, ['#FFE14D', '#FFFFFF', '#7FD6FF'], 220);
    Snd.play('pup');
    addText(p.x, p.y - 40, pick(['真棒！', '好厉害！', '做得好！']), '#FFE14D', 22);
    tutAnnounce();
  }
}

function drawKeyCap(c, x, y, label) {
  const w = label.length > 1 ? 54 : 30;
  c.fillStyle = '#EEF2F7'; c.strokeStyle = OUT; c.lineWidth = 2;
  rr(c, x - w / 2, y - 14, w, 28, 7); c.fill(); c.stroke();
  c.fillStyle = '#C9D3DF'; c.fillRect(x - w / 2 + 3, y + 9, w - 6, 3);
  txt(c, label, x, y - 1, 15, OUT);
  return w;
}
function drawTutorial(c, time) {
  const g = G, tu = g.tut;
  if (!tu || g.phase !== 'play') return;
  const s = TUT_STEPS[tu.step];
  const pop = easeOutBack(clamp(tu.t * 3, 0, 1));
  c.save();
  c.translate(MAP_W / 2, 52); c.scale(pop, pop);
  const hasKeys = s.keys.length > 0, h = hasKeys ? 78 : 50;
  c.fillStyle = 'rgba(255,255,255,.95)'; c.strokeStyle = '#FFB82E'; c.lineWidth = 4;
  rr(c, -250, -h / 2, 500, h, 20); c.fill(); c.stroke();
  txt(c, '第 ' + (tu.step + 1) + ' 步', -205, -h / 2 + 22, 14, '#FF8A3D');
  txt(c, s.text, 0, hasKeys ? -12 : 0, 20, OUT);
  if (hasKeys) {
    const total = s.keys.reduce((sum, k) => sum + (k.length > 1 ? 54 : 30) + 8, -8);
    let x = -total / 2;
    for (const k of s.keys) { const w = k.length > 1 ? 54 : 30; drawKeyCap(c, x + w / 2, 20, k); x += w + 8; }
  }
  c.restore();
  const bob = Math.abs(Math.sin(time * 5)) * 8;
  if (tu.step === 0) {
    const [x, y] = tu.target;
    c.fillStyle = '#FFE14D'; c.strokeStyle = OUT; c.lineWidth = 2.5;
    starPath(c, x, y, 18 + Math.sin(time * 6) * 3, 8, 5, time); c.fill(); c.stroke();
  } else if (tu.step === 1) arrowTag(c, 360, 3 * T - 4 - bob, '#FFC93C', '打这里');
  else if (tu.step === 2 && g.pups[0]) arrowTag(c, g.pups[0].x, g.pups[0].y - 30 - bob, '#FFC93C', '捡我');
  else if (tu.step === 3) { const e = g.tanks.find(t => t.kind === 'enemy' && !t.dead); if (e) arrowTag(c, e.x, e.y - 32 - bob, '#FF7AB6', '打它'); }
}
