'use strict';
// ===== 关卡编辑器 =====
// 第三项：玩到第几个世界才能用（0 起）
const ED_TOOLS = [['B', '砖墙'], ['S', '铁块'], ['W', '小河'], ['G', '草丛'], ['X', '木箱'], ['I', '冰面', 1], ['J', '弹簧', 2], ['Z', '流沙', 2],
  ['Y', '果冻墙', 3], ['O', '传送门', 3], ['>', '水流', 4], ['V', '藤蔓', 5], ['L', '熔岩', 6], ['F', '喷火口', 6], ['T', '开关', 7], ['D', '大门', 7],
  ['H', '黑洞', 8], ['N', '机关墙', 9], ['.', '橡皮']];
const ED_MAP_CHARS = new Set(ED_TOOLS.map(t => t[0]).concat(['^', 'v', '<']));
const ED_LOCKED = { '7,10': 'E', '4,10': 'P', '10,10': 'Q', '0,0': '.', '7,0': '.', '14,0': '.' };
const ED_ENEMY_TYPES = ['g', 'o', 'b', 'r', 'p', 'h', 'd', 'k', 'f', 'n', 'l', 'z', 'u', 'q'];
// 玩到了哪个世界（编辑器按这个解锁工具）
function edWorldReached() { let w = 0; for (let i = 0; i < WORLDS.length; i++) if (isUnlocked(i * 10)) w = i; return w; }
const edToolOpen = t => (t[2] || 0) <= edWorldReached();
const edEnemyOpen = t => ED_ENEMY_TYPES.indexOf(t) < 6 || !!save.seen.e[t] || UNLOCK_ALL;

const Editor = {
  slot: 0, theme: 'grass', tool: 'B', map: null, enemies: null, painting: false, msgT: 0, msg: '',
  blank() {
    const m = [];
    for (let r = 0; r < ROWS; r++) m.push(new Array(COLS).fill('.'));
    m[9][6] = m[9][7] = m[9][8] = 'B';
    m[10][6] = 'B'; m[10][8] = 'B';
    for (const k of Object.keys(ED_LOCKED)) { const [c, r] = k.split(',').map(Number); m[r][c] = ED_LOCKED[k]; }
    return m;
  },
  load(slot) {
    this.slot = slot;
    const d = save.custom[slot];
    let loaded = false;
    if (d) try { this.fromData(d); loaded = true; } catch (e) { /* 坏数据就当空关卡 */ }
    if (!loaded) { this.map = this.blank(); this.theme = 'grass'; this.enemies = {}; for (const t of ED_ENEMY_TYPES) this.enemies[t] = 0; this.enemies.g = 4; this.enemies.o = 2; }
    this.buildUI();
  },
  fromData(d) {
    this.theme = THEMES[d.theme] ? d.theme : 'grass';
    const ok = ED_MAP_CHARS;
    this.map = (Array.isArray(d.map) ? d.map : []).slice(0, ROWS).map(row => String(row).padEnd(COLS, '.').slice(0, COLS).split('').map(ch => (ok.has(ch) ? ch : '.')));
    while (this.map.length < ROWS) this.map.push(new Array(COLS).fill('.'));
    this.map.length = ROWS;
    for (const k of Object.keys(ED_LOCKED)) { const [c, r] = k.split(',').map(Number); this.map[r][c] = ED_LOCKED[k]; }
    const en = d.enemies && typeof d.enemies === 'object' ? d.enemies : {};
    this.enemies = {};
    for (const t of ED_ENEMY_TYPES) this.enemies[t] = clamp(Math.floor(Number(en[t])) || 0, 0, 9);
  },
  data() { return { theme: this.theme, map: this.map.map(r => r.join('')), enemies: Object.assign({}, this.enemies) }; },
  say(msg) { this.msg = msg; this.msgT = 2.5; },
  open() { this.load(this.slot); },
  paint(c, r, fresh) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    if (ED_LOCKED[c + ',' + r] !== undefined) return;
    if (this.tool === 'O' && this.map[r][c] !== 'O' && this.map.flat().filter(x => x === 'O').length >= 4) { this.say('传送门最多放 4 个'); return; }
    // 水流：在水流上点一下换方向
    const flows = '^>v<';
    if (this.tool === '>' && flows.includes(this.map[r][c])) {
      if (fresh) { this.map[r][c] = flows[(flows.indexOf(this.map[r][c]) + 1) % 4]; Snd.play('click'); }
      return;
    }
    if (this.map[r][c] !== this.tool) { this.map[r][c] = this.tool; Snd.play('click'); }
  },
  check() {
    const m = this.map;
    const n = Object.values(this.enemies).reduce((s, v) => s + v, 0);
    if (n < 1) return '至少要放 1 个敌人哦';
    const portals = m.flat().filter(x => x === 'O').length;
    if (portals % 2) return '传送门要成对放（2 个或 4 个）';
    if (!mapConnected(m.map(r => r.slice()))) return m.flat().includes('T') ? '大门关着的时候也要能开到开关哦' : '要给坦克留一条路，能开到最上面哦';
    if (m.flat().includes('D') && !m.flat().includes('T')) return '放了大门，也要放一个开关';
    return null;
  },
  level() {
    const d = this.data();
    const list = [];
    for (const t of ED_ENEMY_TYPES) for (let i = 0; i < this.enemies[t]; i++) list.push(t);
    // 打乱一下，不要一种敌人扎堆
    const R = mulberry32(list.length * 31 + 7);
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return { li: -1, custom: true, world: Math.max(0, WORLDS.findIndex(w => w.theme === d.theme)), theme: d.theme, boss: null, name: '我的关卡', map: d.map, enemies: list.join(''), maxOn: 4, mode: 'kill', objs: [], flags: {}, D: 3 };
  },
  buildUI() {
    const slots = document.getElementById('edSlots'); slots.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('button');
      b.className = 'chip' + (i === this.slot ? ' on' : '');
      b.textContent = '关卡 ' + (i + 1) + (save.custom[i] ? ' ✓' : '');
      b.onclick = () => { Snd.play('click'); this.load(i); };
      slots.appendChild(b);
    }
    const pal = document.getElementById('edPalette'); pal.innerHTML = '';
    for (const tool of ED_TOOLS) {
      if (!edToolOpen(tool)) continue;
      const [ch, name] = tool;
      const b = document.createElement('button');
      b.className = 'tool' + (ch === this.tool ? ' on' : '');
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
      const x = cv.getContext('2d'); x.scale(2, 2);
      if (ch === '.') { x.fillStyle = '#FFB3C7'; x.strokeStyle = OUT; x.lineWidth = 2.5; x.save(); x.translate(24, 24); x.rotate(-0.6); rr(x, -16, -8, 32, 16, 4); x.fill(); x.stroke(); x.restore(); }
      else { x.fillStyle = THEMES[this.theme].g1; x.fillRect(0, 0, 48, 48); edDrawTile(x, ch, 24, 24, this.theme, 0.5); }
      b.appendChild(cv);
      b.insertAdjacentHTML('beforeend', `<span>${name}</span>`);
      b.onclick = () => { this.tool = ch; Snd.play('click'); this.buildUI(); };
      pal.appendChild(b);
    }
    const th = document.getElementById('edThemes'); th.innerHTML = '';
    WORLDS.forEach((w, wi) => {
      if (!isUnlocked(wi * 10) && w.theme !== this.theme) return;
      const b = document.createElement('button');
      b.className = 'chip' + (w.theme === this.theme ? ' on' : '');
      b.style.setProperty('--cc', THEMES[w.theme].bg[0]);
      b.textContent = w.name;
      b.onclick = () => { this.theme = w.theme; Snd.play('click'); this.buildUI(); };
      th.appendChild(b);
    });
    const en = document.getElementById('edEnemies'); en.innerHTML = '';
    for (const t of ED_ENEMY_TYPES) {
      if (!edEnemyOpen(t) && !this.enemies[t]) continue;
      const d = ENEMIES[t], row = document.createElement('div');
      row.className = 'erow';
      row.innerHTML = `<i style="background:${d.body}"></i><span>${d.name}</span><button class="mini">−</button><b>${this.enemies[t]}</b><button class="mini">＋</button>`;
      const [minus, plus] = row.querySelectorAll('button');
      minus.onclick = () => { this.enemies[t] = Math.max(0, this.enemies[t] - 1); Snd.play('click'); this.buildUI(); };
      plus.onclick = () => { this.enemies[t] = Math.min(9, this.enemies[t] + 1); Snd.play('click'); this.buildUI(); };
      en.appendChild(row);
    }
  },
  render(time) {
    const cv = document.getElementById('edCanvas'), c = cv.getContext('2d');
    const k = cv.width / MAP_W;
    c.setTransform(k, 0, 0, k, 0, 0);
    c.clearRect(0, 0, MAP_W, MAP_H);
    c.drawImage(getGround(this.theme), 0, 0, MAP_W, MAP_H);
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) edDrawTile(c, this.map[r][q], q * T + 24, r * T + 24, this.theme, time);
    for (const [q, r] of [[0, 0], [7, 0], [14, 0]]) {
      c.strokeStyle = 'rgba(255,77,109,.8)'; c.lineWidth = 2; c.setLineDash([5, 4]);
      rr(c, q * T + 3, r * T + 3, T - 6, T - 6, 8); c.stroke(); c.setLineDash([]);
      txt(c, '敌人', q * T + 24, r * T + 24, 13, '#FF4D6D');
    }
    c.strokeStyle = 'rgba(0,0,0,.06)'; c.lineWidth = 1; c.beginPath();
    for (let q = 1; q < COLS; q++) { c.moveTo(q * T, 0); c.lineTo(q * T, MAP_H); }
    for (let r = 1; r < ROWS; r++) { c.moveTo(0, r * T); c.lineTo(MAP_W, r * T); }
    c.stroke();
    if (this.msgT > 0) {
      this.msgT -= 1 / 60;
      c.globalAlpha = clamp(this.msgT, 0, 1);
      c.fillStyle = 'rgba(38,50,74,.9)'; rr(c, MAP_W / 2 - 220, MAP_H / 2 - 30, 440, 60, 20); c.fill();
      txt(c, this.msg, MAP_W / 2, MAP_H / 2, 20, '#FFFFFF');
      c.globalAlpha = 1;
    }
  },
};

const ED_FLOW = [0, 1, 2, 3].map(d => new Int8Array(GW * GH).fill(d));
// 画一个格子（编辑器和按钮图标共用）
function edDrawTile(c, ch, x, y, theme, time) {
  const th = THEMES[theme], px = x - 24, py = y - 24;
  switch (ch) {
    case 'B': for (let i = 0; i < 4; i++) drawCellBrick(c, th, px + (i % 2) * C, py + (i >> 1) * C, i >> 1); break;
    case 'S': for (let i = 0; i < 4; i++) drawCellSteel(c, th, px + (i % 2) * C, py + (i >> 1) * C); break;
    case 'W':
      c.fillStyle = th.water[0]; c.fillRect(px, py, T, T);
      c.strokeStyle = th.water[1]; c.lineWidth = 2; c.beginPath();
      c.moveTo(px + 8, py + 18); c.quadraticCurveTo(px + 14, py + 12, px + 20, py + 18);
      c.moveTo(px + 26, py + 34); c.quadraticCurveTo(px + 32, py + 28, px + 38, py + 34); c.stroke();
      break;
    case 'G':
      c.fillStyle = th.bush[0];
      for (const [a, b, r] of [[12, 14, 12], [34, 13, 12], [14, 34, 12], [34, 34, 12], [24, 24, 12]]) { circle(c, px + a, py + b, r); c.fill(); }
      c.fillStyle = th.bush[1]; circle(c, px + 10, py + 10, 4); c.fill(); circle(c, px + 32, py + 9, 4); c.fill();
      break;
    case 'I':
      c.fillStyle = 'rgba(214,244,255,.95)'; c.fillRect(px, py, T, T);
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + 8, py + 30); c.lineTo(px + 20, py + 18); c.moveTo(px + 26, py + 40); c.lineTo(px + 40, py + 26); c.stroke();
      break;
    case 'X': drawCrate(c, { x, y, hp: 3, flashT: 0 }); break;
    case 'J': drawSpring(c, { x, y, t: 0 }, time); break;
    case 'O': drawPortal(c, { x, y, color: '#B57CFF' }, time); break;
    case 'E': drawEgg(c, { x, y, hp: 5, hitT: 0, broken: false }, time); break;
    case 'Z': case 'Y': case 'V': case 'L': case 'N': case '^': case '>': case 'v': case '<': {
      const v = { Z: SAND, Y: JELLY, V: VINE, L: LAVA, N: BLINK }[ch] || FLOW;
      const fake = { theme, flow: ED_FLOW[Math.max(0, '^>v<'.indexOf(ch))], t: 0 };
      for (let i = 0; i < 4; i++) drawCellNew(c, fake, v, (px / C) + (i % 2), (py / C) + (i >> 1), px + (i % 2) * C, py + (i >> 1) * C, time);
      break;
    }
    case 'F': {
      c.fillStyle = '#5A4A44'; c.strokeStyle = OUT; c.lineWidth = 2.5; circle(c, x, y, 16); c.fill(); c.stroke();
      c.fillStyle = '#FF7A2E'; circle(c, x, y, 9); c.fill(); break;
    }
    case 'T':
      c.fillStyle = '#3A4152'; c.strokeStyle = OUT; c.lineWidth = 2.5; rr(c, px + 6, py + 6, 36, 36, 8); c.fill(); c.stroke();
      c.fillStyle = '#FFD23F'; circle(c, x, y, 12); c.fill(); c.stroke(); break;
    case 'D':
      c.fillStyle = '#FFD23F'; c.strokeStyle = OUT; c.lineWidth = 2.5; rr(c, px + 2, py + 2, 44, 44, 6); c.fill(); c.stroke();
      c.fillStyle = OUT; for (let i = 0; i < 3; i++) c.fillRect(px + 6 + i * 14, py + 6, 6, 36); break;
    case 'H':
      c.fillStyle = '#1A1238'; circle(c, x, y, 20); c.fill();
      c.strokeStyle = '#C9A5FF'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 14, time * 3, time * 3 + 4); c.stroke(); break;
    case 'P': case 'Q':
      drawMiniTank(c, x, y + 4, PLAYER_TANKS[ch === 'P' ? 0 : 3]);
      txt(c, ch === 'P' ? '1P' : '2P', x, y - 14, 12, '#FFFFFF', 'center', ch === 'P' ? '#FF8A3D' : '#3EC1F3');
      break;
  }
}
