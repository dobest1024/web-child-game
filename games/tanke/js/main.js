'use strict';
const UNLOCK_ALL = /[?&]unlock=1/.test(location.search);
const isUnlocked = i => UNLOCK_ALL || i === 0 || (save.stars[i - 1] || 0) > 0 || !!save.skipped[i - 1];
const DEV = /[?&]dev=1/.test(location.search);
const $ = s => document.querySelector(s);

// ===== 键盘：单人时所有键都能用；双人时左右分开 =====
const DIR_A = { KeyW: 0, KeyD: 1, KeyS: 2, KeyA: 3 }, DIR_B = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
const KEYS_2P = {
  fire0: ['KeyJ', 'Space', 'KeyF'], skill0: ['KeyK', 'KeyX', 'ShiftLeft', 'KeyG'],
  fire1: ['Enter', 'NumpadEnter', 'Numpad0', 'Slash'], skill1: ['ShiftRight', 'Numpad1', 'Period', 'Quote'],
};
const KEYS_1P = { fire: ['Space', 'KeyJ'], skill: ['KeyK', 'KeyX', 'ShiftLeft', 'ShiftRight'] };
let mode = save.mode || 1;
function keyRole(code) {
  if (mode === 2 && G && G.players.length > 1) {
    if (DIR_A[code] !== undefined) return { pid: 0, role: 'dir' };
    if (DIR_B[code] !== undefined) return { pid: 1, role: 'dir' };
    for (const pid of [0, 1]) {
      if (KEYS_2P['fire' + pid].includes(code)) return { pid, role: 'fire' };
      if (KEYS_2P['skill' + pid].includes(code)) return { pid, role: 'skill' };
    }
    return null;
  }
  if (DIR_A[code] !== undefined || DIR_B[code] !== undefined) return { pid: 0, role: 'dir' };
  if (KEYS_1P.fire.includes(code)) return { pid: 0, role: 'fire' };
  if (KEYS_1P.skill.includes(code)) return { pid: 0, role: 'skill' };
  return null;
}
const keyDir = code => (DIR_A[code] !== undefined ? DIR_A[code] : DIR_B[code]);
const newPad = () => ({ codes: [], fire: new Set(), skill: new Set() });
const Input = {
  pads: [newPad(), newPad()],
  get(pid) {
    const s = this.pads[pid];
    let x = 0, y = 0;
    const n = s.codes.length;
    if (n) {
      const d = keyDir(s.codes[n - 1]); x = DX[d]; y = DY[d];
      if (n >= 2) { const d2 = keyDir(s.codes[n - 2]); if ((d2 & 1) !== (d & 1)) { x += DX[d2] * 0.5; y += DY[d2] * 0.5; } }
    }
    let fire = s.fire.size > 0, skill = s.skill.size > 0;
    if (pid === 0 && Touch.on) {
      if (Touch.joy.id !== null) { x = Touch.joy.x; y = Touch.joy.y; }
      fire = fire || Touch.fireIds.size > 0;
      skill = skill || Touch.skillIds.size > 0;
    }
    return { x, y, fire, skill };
  },
  reset() {
    this.pads = [newPad(), newPad()];
    Touch.joy.id = null; Touch.fireIds.clear(); Touch.skillIds.clear();
    updateTouchUI();
  },
};

// ===== 触屏（平板）：左手摇杆，右手开火 =====
const Touch = {
  on: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches),
  joy: { id: null, cx: 0, cy: 0, x: 0, y: 0 }, fireIds: new Set(), skillIds: new Set(),
};
const JOY_R = 60;
function playing() { return screen === 'play' && G && !paused; }
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  if (!Touch.on) { Touch.on = true; layout(); }
  const tgt = e.target instanceof Element ? e.target : null;
  if (!playing() || (tgt && tgt.closest('button'))) return;
  e.preventDefault();
  if (tgt && tgt.closest('#skillBtn')) Touch.skillIds.add(e.pointerId);
  else if (e.clientX < innerWidth / 2) {
    if (Touch.joy.id === null) Object.assign(Touch.joy, { id: e.pointerId, cx: e.clientX, cy: e.clientY, x: 0, y: 0 });
  } else Touch.fireIds.add(e.pointerId);
  updateTouchUI();
}, { passive: false });
document.addEventListener('pointermove', e => {
  const j = Touch.joy;
  if (e.pointerId !== j.id) return;
  e.preventDefault();
  let dx = e.clientX - j.cx, dy = e.clientY - j.cy;
  const len = Math.hypot(dx, dy);
  if (len > JOY_R) { j.cx += (dx / len) * (len - JOY_R); j.cy += (dy / len) * (len - JOY_R); dx = e.clientX - j.cx; dy = e.clientY - j.cy; }
  j.x = Math.hypot(dx, dy) < 10 ? 0 : dx / JOY_R; j.y = Math.hypot(dx, dy) < 10 ? 0 : dy / JOY_R;
  updateTouchUI();
}, { passive: false });
function endPointer(e) {
  if (e.pointerId === Touch.joy.id) { Touch.joy.id = null; Touch.joy.x = Touch.joy.y = 0; }
  Touch.fireIds.delete(e.pointerId); Touch.skillIds.delete(e.pointerId);
  updateTouchUI();
}
document.addEventListener('pointerup', endPointer);
document.addEventListener('pointercancel', endPointer);
document.addEventListener('touchmove', e => { if (screen === 'play' || e.target === edCanvasEl()) e.preventDefault(); }, { passive: false });
function edCanvasEl() { return document.getElementById('edCanvas'); }
document.addEventListener('gesturestart', e => e.preventDefault());
function updateTouchUI() {
  const ui = $('#touchUI');
  if (!ui) return;
  const show = Touch.on && playing() && G.phase !== 'won' && G.phase !== 'lost';
  ui.style.display = show ? 'block' : 'none';
  if (!show) return;
  const base = $('#joyBase'), knob = $('#joyKnob'), j = Touch.joy;
  if (j.id !== null) {
    base.classList.add('active');
    Object.assign(base.style, { left: j.cx - 65 + 'px', top: j.cy - 65 + 'px', bottom: 'auto' });
    knob.style.transform = `translate(${j.x * JOY_R}px, ${j.y * JOY_R}px)`;
  } else {
    base.classList.remove('active');
    Object.assign(base.style, { left: '24px', top: 'auto', bottom: '28px' });
    knob.style.transform = '';
  }
  $('#fireBtn').classList.toggle('pressed', Touch.fireIds.size > 0);
  const sk = $('#skillBtn'), p = G.players[0];
  sk.classList.toggle('ready', p.energy >= 1);
  sk.style.setProperty('--k', Math.round(p.energy * 100) + '%');
}

// ===== 画布与布局 =====
const cv = $('#game'), ctx = cv.getContext('2d');
function layout() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const side = Touch.on ? Math.min(170, W * 0.14) : 12;
  const s = Math.max(0.3, Math.min((W - side * 2) / VIEW_W, (H - 24) / VIEW_H));
  const w = VIEW_W * s, h = VIEW_H * s, left = (W - w) / 2, top = (H - h) / 2;
  Object.assign(cv.style, { width: w + 'px', height: h + 'px', left: left + 'px', top: top + 'px' });
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const bs = Math.max(34, 42 * s), hb = $('#hudBtns');
  Object.assign(hb.style, { left: left + w - (bs * 2 + 22 * s) + 'px', top: top + (HUD_H * s - bs) / 2 + 'px' });
  hb.querySelectorAll('button').forEach(b => Object.assign(b.style, { width: bs + 'px', height: bs + 'px', fontSize: bs * 0.5 + 'px' }));
  const sk = $('#btnSkip');
  Object.assign(sk.style, { left: left + w - 130 * s - 10 + 'px', top: top + h - 50 * s - 10 + 'px', fontSize: Math.max(14, 18 * s) + 'px' });
  $('#rotateTip').style.display = Touch.on && H > W ? 'flex' : 'none';
  if (Touch.on && H > W) pauseGame();
}
addEventListener('resize', layout);

// ===== 界面状态 =====
let screen = 'title', paused = false, selLevel = 0, tankStage = 0, cur = null;
const selTanks = save.tanks.slice();
const OVERLAYS = ['pause', 'win', 'lose', 'end'];
function setBg(bg) { document.body.style.background = `linear-gradient(180deg, ${bg[0]} 0%, ${bg[1]} 100%)`; }
function coinsHtml() { return '🪙 ' + save.coins; }
const UI = {
  show(id) {
    screen = id;
    document.querySelectorAll('.screen').forEach(el => el.classList.toggle('on', el.id === 'scr-' + id));
    const inGame = id === 'play' || OVERLAYS.includes(id);
    cv.style.display = inGame ? 'block' : 'none';
    $('#hudBtns').style.display = id === 'play' ? 'flex' : 'none';
    $('#btnSkip').style.display = id === 'play' && cur && cur.type === 'tutorial' ? 'block' : 'none';
    if (!inGame) setBg(THEMES.grass.bg);
    document.querySelectorAll('.coins').forEach(el => { el.textContent = coinsHtml(); });
    Input.reset();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },
  showWin() {
    const g = G;
    if (cur.type === 'level' && g.li === LEVELS.length - 1) { UI.showEnd(); return; }
    const box = $('#winStars'); box.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'bigstar' + (i < g.stars ? ' lit' : '');
      s.style.animationDelay = 0.2 + i * 0.25 + 's';
      s.textContent = '★';
      box.appendChild(s);
    }
    $('#winTitle').textContent = cur.type === 'tutorial' ? '教学完成！' : cur.type === 'custom' ? '你的关卡过关啦！' :
      g.L.boss ? '打败' + BOSSES[g.L.boss].name + '！' : pick(['过关啦！', '太厉害了！', '真棒！']);
    $('#winTip').textContent = cur.type === 'tutorial' ? '你已经学会啦，去打第 1 关吧！' :
      g.stars === 3 ? '满分三颗星！' : g.lostLives > 0 ? '不丢命可以拿更多星星哦' : '保护好宝宝蛋可以拿更多星星哦';
    $('#winCoins').textContent = '+' + (g.coinsGot + g.reward) + ' 🪙';
    const extra = [];
    if (g.trophy) { const hat = SHOP.hat.find(h => h.id === g.trophy); extra.push('🎩 拿到纪念帽：' + hat.name + '！去商店戴上它吧'); }
    if (g.newTank !== undefined) extra.push('🚙 新坦克：' + PLAYER_TANKS[g.newTank].name + ' 加入啦！');
    if (g.mode === 'gold') extra.unshift('抓到 ' + (g.goldCaught || 0) + ' / ' + g.L.golds + ' 只金宝宝');
    $('#winExtra').textContent = extra.join('　');
    if (g.trophy) say('拿到纪念帽啦！');
    UI.show('win');
  },
  showLose() {
    $('#loseTitle').textContent = G.loseReason === 'egg' ? '宝宝蛋被打破啦' : '坦克都没电啦';
    $('#loseEmoji').textContent = G.loseReason === 'egg' ? '🐣💦' : '🔋💤';
    $('#loseCoins').textContent = G.coinsGot ? '这关捡到的 ' + G.coinsGot + ' 金币已经存好啦' : '';
    const n = cur.type === 'level' ? fails[cur.L.li] || 0 : 0;
    $('#btnSkipLv').style.display = canSkip() ? 'inline-flex' : 'none';
    $('#loseHelp').textContent = n >= 3 ? '下次开局送你护盾和小蜜蜂！' : '别灰心！再来一次，敌人会变弱一点哦';
    UI.show('lose');
  },
  showEnd() {
    const total = save.stars.reduce((s, v) => s + (v || 0), 0);
    $('#endStars').textContent = '一共拿到 ' + total + ' / ' + LEVELS.length * 3 + ' 颗星星';
    UI.show('end');
    say('恭喜你！你是坦克小英雄！');
  },
};

function songFor(L) {
  if (L.boss) return BOSSES[L.boss].kind === 'final' ? 'final' : 'boss';
  if (L.night) return 'night';
  const w = WORLDS.find(x => x.theme === L.theme);
  return w ? w.song : 'normal';
}
function begin(L, type) {
  cur = { type, L };
  const tanks = type === 'tutorial' || mode === 1 ? [selTanks[0]] : [selTanks[0], selTanks[1]];
  buildGame(L, { tanks, diff: type === 'tutorial' ? 1 : save.diff });
  paused = false;
  UI.show('play');
  setBg(THEMES[L.theme].bg);
  Snd.setSong(songFor(L)); Snd.startMusic();
  updateTouchUI();
}
function startLevel(li) { selLevel = li; begin(LEVELS[li], 'level'); }
function startTutorial2() { begin(TUTORIAL_LEVEL, 'tutorial'); }
function retry() { if (cur.type === 'level') startLevel(cur.L.li); else begin(cur.L, cur.type); }
function next() {
  if (cur.type === 'tutorial') { startLevel(0); return; }
  if (cur.type === 'custom') { openEditor(); return; }
  startLevel(Math.min(LEVELS.length - 1, cur.L.li + 1));
}
function pauseGame() {
  if (screen !== 'play' || !G) return;
  paused = true; Snd.stopMusic();
  $('#pauseLevel').textContent = cur.type === 'level' ? '第 ' + (cur.L.li + 1) + ' 关 · ' + cur.L.name : cur.L.name;
  $('#btnSkipPause').style.display = canSkip() ? 'inline-flex' : 'none';
  UI.show('pause');
}
// 正式关卡（不是最后一关）随时可以先跳过
function canSkip() { return cur && cur.type === 'level' && cur.L.li < LEVELS.length - 1; }
function resumeGame() { paused = false; UI.show('play'); Snd.startMusic(); updateTouchUI(); }
function leaveGame() {
  paused = false;
  const wasCustom = cur && cur.type === 'custom';
  G = null; Snd.setSong('normal'); Snd.startMusic();
  if (wasCustom) openEditor(); else goLevels();
}
function goLevels() { G = null; buildLevels(); UI.show('levels'); }

// ===== 选坦克 + 难度 =====
const tankCanvases = [];
function buildTanks() {
  const two = mode === 2;
  $('#tankTitle').textContent = two ? (tankStage === 0 ? '1P 选坦克' : '2P 选坦克') : '选择你的坦克';
  $('#tankHint').textContent = two ? (tankStage === 0 ? 'A D 选择，J 确定' : '← → 选择，回车确定') : '← → 选择，回车确定';
  const box = $('#tankGrid'); box.innerHTML = ''; tankCanvases.length = 0;
  box.classList.toggle('many', PLAYER_TANKS.length > 5);
  PLAYER_TANKS.forEach((d, i) => {
    const card = document.createElement('button');
    const lock = !tankUnlocked(i);
    card.className = 'tcard' + (i === selTanks[tankStage] ? ' sel' : '') + (lock ? ' locked' : '');
    card.style.setProperty('--tc', d.body);
    const bar = (label, v, max) => `<div class="stat"><span>${label}</span><i><b style="width:${Math.min(100, (v / max) * 100)}%"></b></i></div>`;
    const taken = two && tankStage === 1 && i === selTanks[0] ? '<em class="taken">1P</em>' : '';
    card.innerHTML = `${taken}<canvas width="200" height="150"></canvas><div class="tname">${d.name}</div><div class="tdesc">${d.desc}</div>` +
      bar('血量', d.hp + save.up.hp, STAT_MAX.hp + 3) + bar('攻击', d.atk + save.up.atk, STAT_MAX.atk + 2) + bar('防御', d.dfn + 0.4, STAT_MAX.dfn + 0.4) + bar('速度', d.speed * (1 + 0.08 * save.up.spd), STAT_MAX.speed * 1.24) +
      `<div class="tskill">大招：${d.skillName}</div>` + (lock ? `<div class="tlock">🔒<span>打赢第 ${d.unlock} 关解锁</span></div>` : '');
    card.onclick = () => {
      if (lock) { Snd.play('boing'); say('打赢第' + d.unlock + '关就能解锁' + d.name); return; }
      if (selTanks[tankStage] === i) confirmTank(); else { selTanks[tankStage] = i; markTank(); Snd.play('click'); }
    };
    box.appendChild(card);
    tankCanvases.push(card.querySelector('canvas'));
  });
  const db = $('#diffRow'); db.innerHTML = '';
  DIFFS.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'diff' + (i === save.diff ? ' on' : '');
    b.innerHTML = `<b>${d.emoji} ${d.name}</b><span>${d.desc}</span>`;
    b.onclick = () => { save.diff = i; persist(); Snd.play('click'); buildTanks(); };
    db.appendChild(b);
  });
  db.style.display = tankStage === 0 ? 'flex' : 'none';
}
function markTank() { document.querySelectorAll('.tcard').forEach((el, i) => el.classList.toggle('sel', i === selTanks[tankStage])); }
function confirmTank() {
  Snd.play('start');
  if (mode === 2 && tankStage === 0) { tankStage = 1; say('2P 选坦克'); buildTanks(); return; }
  save.tanks = selTanks.slice(); save.mode = mode; persist();
  say(PLAYER_TANKS[selTanks[tankStage]].name + '，出发！');
  if (mode === 1 && !save.tutorialDone) { say('我们先来学一学怎么玩吧'); startTutorial2(); return; }
  goLevels();
}
function renderTankCards(time) {
  tankCanvases.forEach((tc, i) => {
    const c = tc.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 200, 150);
    const sel = i === selTanks[tankStage];
    const t = demoTank(i, 100, 80, sel ? Math.floor(time * 1.2) % 4 : 0, sel ? time * 60 : 0);
    t.moving = sel;
    c.save(); c.translate(100, 80); const k = sel ? 2.3 + Math.sin(time * 6) * 0.08 : 2; c.scale(k, k); c.translate(-100, -80);
    drawTank(c, t, time + i);
    c.restore();
  });
}
function demoTank(i, x, y, dir, dist, skin) {
  return { kind: 'player', tankIdx: i, x, y, size: 42, dir, dist, moving: false, recoil: 0, flashT: 0, invT: 0, shieldT: 0, hurtT: 0, slowT: 0, helperT: 0, weapon: 'normal', blink: i, skin: skin || Meta.skin(i) };
}

// ===== 选关：每页一个世界 =====
let lvPage = 0;
const MODE_ICON = { collect: '⭐', survive: '⏱️', push: '📦', rescue: '🔓', gold: '💰' };
const worldOpen = w => isUnlocked(w * 10);
function buildLevels() {
  lvPage = clamp(Math.floor(selLevel / 10), 0, WORLDS.length - 1);
  const box = $('#lvWorlds'); box.innerHTML = '';
  const w = WORLDS[lvPage], th = THEMES[w.theme];
  const got = save.stars.slice(lvPage * 10, lvPage * 10 + 10).reduce((a, v) => a + (v || 0), 0);
  const page = document.createElement('div'); page.className = 'wpage';
  page.style.setProperty('--wc', th.bg[0]);
  page.innerHTML = `<button class="btn round blue sm2 wnav" data-act="lvPrev" ${lvPage ? '' : 'disabled'}>◀</button>` +
    `<div class="world"><div class="whead"><b>世界 ${lvPage + 1} · ${w.name}</b><span>⭐ ${got} / 30</span>${save.owned.hat[w.trophy] ? '<span>🎩</span>' : ''}</div><div class="nodes"></div></div>` +
    `<button class="btn round blue sm2 wnav" data-act="lvNext" ${lvPage < WORLDS.length - 1 ? '' : 'disabled'}>▶</button>`;
  const nodes = page.querySelector('.nodes');
  for (let k = 0; k < 10; k++) {
    const i = lvPage * 10 + k, L = LEVELS[i], open = isUnlocked(i), st = save.stars[i] || 0;
    const b = document.createElement('button');
    const kind = L.boss ? BOSSES[L.boss].kind : '';
    b.className = 'lv' + (open ? '' : ' locked') + (kind ? ' k-' + kind : '') + (i === selLevel ? ' sel' : '');
    const badge = kind === 'final' ? '🐲' : kind === 'big' ? '👑' : kind === 'mini' ? '😈' : MODE_ICON[L.mode] || (L.night ? '🌙' : '');
    const skip = save.skipped[i] && !st ? '<i class="skip">↷</i>' : '';
    b.innerHTML = open
      ? `${badge ? `<em>${badge}</em>` : ''}${skip}<span class="num">${i + 1}</span><span class="st">${'<b>★</b>'.repeat(st)}${'<i>★</i>'.repeat(3 - st)}</span>`
      : `<span class="num">🔒</span>`;
    b.title = L.name;
    b.onclick = () => { if (!open) { Snd.play('boing'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } Snd.play('click'); startLevel(i); };
    nodes.appendChild(b);
  }
  box.appendChild(page);
  const dots = document.createElement('div'); dots.className = 'wdots';
  WORLDS.forEach((ww, wi) => {
    const d = document.createElement('button');
    d.className = 'wdot' + (wi === lvPage ? ' on' : '') + (worldOpen(wi) ? '' : ' locked');
    d.style.setProperty('--wc', THEMES[ww.theme].bg[0]);
    d.textContent = worldOpen(wi) ? wi + 1 : '🔒';
    d.title = ww.name;
    d.onclick = () => { if (!worldOpen(wi)) { Snd.play('boing'); return; } Snd.play('click'); gotoWorld(wi); };
    dots.appendChild(d);
  });
  box.appendChild(dots);
  $('#lvMode').textContent = (mode === 2 ? '👫 2 人' : '🙂 1 人') + ' · ' + DIFFS[save.diff].emoji + ' ' + DIFFS[save.diff].name;
}
// 翻到某个世界：选中那个世界里最新能玩的一关
function gotoWorld(w) {
  if (w < 0 || w >= WORLDS.length || !worldOpen(w)) { Snd.play('boing'); return; }
  let n = w * 10;
  for (let i = w * 10; i < w * 10 + 10; i++) if (isUnlocked(i)) n = i;
  selLevel = n; buildLevels();
}
function markLevel() {
  if (Math.floor(selLevel / 10) !== lvPage) { buildLevels(); return; }
  document.querySelectorAll('.lv').forEach((el, i) => el.classList.toggle('sel', lvPage * 10 + i === selLevel));
}

// ===== Boss 图鉴 =====
const bossCanvases = [];
function buildBosses() {
  const grid = $('#bossGrid'); grid.innerHTML = ''; bossCanvases.length = 0;
  let n = 0;
  for (const key of BOSS_LIST) {
    const bd = BOSSES[key], got = !!save.bossKills[key] || UNLOCK_ALL;
    if (got) n++;
    const at = LEVELS.filter(L => L.bosses && L.bosses.includes(key)).map(L => L.n);
    const d = document.createElement('div'); d.className = 'bcard' + (got ? ' got' : '');
    const cvs = document.createElement('canvas'); cvs.width = 200; cvs.height = 170;
    d.appendChild(cvs);
    d.insertAdjacentHTML('beforeend', `<b>${got ? bd.name : '？？？'}</b><span>${BOSS_KIND_NAME[bd.kind]} · 第 ${at.join('、')} 关</span>${got && bd.joke ? `<i>${bd.joke}</i>` : ''}`);
    grid.appendChild(d);
    bossCanvases.push([cvs, key, got]);
  }
  $('#bossCount').textContent = '见过 ' + n + ' / ' + BOSS_LIST.length;
}
function renderBossCards(time) {
  for (const [cvs, key, got] of bossCanvases) {
    if (!cvs.isConnected) continue;
    const r = cvs.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const c = cvs.getContext('2d'), bd = BOSSES[key];
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 200, 170);
    const fake = { bd, key, size: bd.size, aim: Math.PI / 2 + Math.sin(time * 2) * 0.3, dir: 2, dist: time * 20, recoil: 0, flashT: 0, frozenT: 0, invisT: 0, teleT: 0, dashWarn: 0, angry: false, x: 0, y: 0, guardKind: '', popWarn: 0, weakT: 0, shieldOffT: 0, stunT: 0, clawWarn: 0, windT: 0 };
    c.save(); c.translate(100, 92); const k = 110 / bd.size; c.scale(k, k);
    if (!got) c.filter = 'brightness(0) opacity(.35)';
    drawBoss(c, fake, time, {});
    c.restore();
  }
}
// ===== 说明页 / 暂停页的道具图鉴 =====
function itemCard(type, title, desc) {
  const d = document.createElement('div'); d.className = 'item';
  const c = document.createElement('canvas'); c.width = 96; c.height = 96;
  const x = c.getContext('2d'); x.scale(2, 2); drawPupIcon(x, type, 24, 24, 40, 0.3);
  d.appendChild(c);
  d.insertAdjacentHTML('beforeend', `<div><b>${title}</b><span>${desc}</span></div>`);
  return d;
}
const WEAPON_DESC = { big: '炮弹超大，伤害翻倍', scatter: '一次打出 3 发', pierce: '穿过敌人和砖墙', ice: '把敌人冻住', bomb: '砰！炸一大片', homing: '子弹会拐弯找敌人', double: '一次打两发', rainbow: '又大又穿透，还会冻和炸' };
function fillItems(wbox, ibox) {
  wbox.innerHTML = ''; ibox.innerHTML = '';
  for (const k of Object.keys(WEAPON_DESC)) wbox.appendChild(itemCard(k, PUPS[k].name, WEAPON_DESC[k]));
  for (const k of Object.keys(PUPS)) if (!PUPS[k].weapon) ibox.appendChild(itemCard(k, PUPS[k].name, PUPS[k].desc));
}

// ===== 商店 =====
let shopTab = 'hat', shopTank = 0, shopMsgT = null;
function shopMsg(m) {
  const el = $('#shopMsg'); el.textContent = m; el.classList.add('show');
  clearTimeout(shopMsgT); shopMsgT = setTimeout(() => el.classList.remove('show'), 1800);
}
function buildShop() {
  document.querySelectorAll('.coins').forEach(el => { el.textContent = coinsHtml(); });
  $('#shopTankName').textContent = PLAYER_TANKS[shopTank].name;
  const tabs = $('#shopTabs'); tabs.innerHTML = '';
  for (const [id, name] of SHOP_TABS) {
    const b = document.createElement('button');
    b.className = 'chip' + (id === shopTab ? ' on' : '');
    b.textContent = name;
    b.onclick = () => { shopTab = id; Snd.play('click'); buildShop(); };
    tabs.appendChild(b);
  }
  const grid = $('#shopGrid'); grid.innerHTML = '';
  if (shopTab === 'up') {
    for (const u of UPGRADES) {
      const lv = save.up[u.id] || 0, max = u.costs.length, cost = u.costs[lv];
      const b = document.createElement('button');
      b.className = 'scard up' + (lv >= max ? ' owned' : '');
      b.innerHTML = `<div class="uicon">${u.icon}</div><b>${u.name}</b><span>${u.desc}</span><div class="pips">${'<i class="on"></i>'.repeat(lv)}${'<i></i>'.repeat(max - lv)}</div>` +
        `<div class="price">${lv >= max ? '满级啦' : '🪙 ' + cost}</div>`;
      b.onclick = () => {
        if (lv >= max) return;
        if (save.coins < cost) { Snd.play('boing'); shopMsg('金币还不够，再去打几关吧'); return; }
        save.coins -= cost; save.up[u.id] = lv + 1; persist();
        Snd.play('pup'); Meta.unlock('shop'); shopMsg(u.name + ' 升到 ' + (lv + 1) + ' 级！');
        buildShop();
      };
      grid.appendChild(b);
    }
    return;
  }
  const skin = Meta.skin(shopTank);
  for (const it of SHOP[shopTab]) {
    const owned = Meta.owns(shopTab, it.id), using = skin[shopTab] === it.id;
    const b = document.createElement('button');
    b.className = 'scard' + (using ? ' using' : owned ? ' owned' : '') + (it.trophy && !owned ? ' trophy' : '');
    const c = document.createElement('canvas'); c.width = 160; c.height = 130;
    const x = c.getContext('2d');
    if (it.trophy && !owned) x.filter = 'brightness(0) opacity(.3)';
    const sk = Object.assign({}, skin, { [shopTab]: it.id });
    x.translate(80, 72); x.scale(1.9, 1.9); x.translate(-80, -72);
    drawTank(x, demoTank(shopTank, 80, 72, 0, 0, sk), 1);
    b.appendChild(c);
    b.insertAdjacentHTML('beforeend', `<b>${it.trophy && !owned ? '？？？' : it.name}</b><div class="price">${using ? '正在用' : owned ? '点一下换上' : it.trophy ? '🏆 打败第 ' + it.trophy + ' 关的 Boss' : '🪙 ' + it.price}</div>`);
    b.onclick = () => {
      if (it.trophy && !owned) { Snd.play('boing'); shopMsg('这是纪念帽，打败第 ' + it.trophy + ' 关的 Boss 就能拿到'); return; }
      if (!owned) {
        if (save.coins < it.price) { Snd.play('boing'); shopMsg('金币还不够，再去打几关吧'); return; }
        save.coins -= it.price; save.owned[shopTab][it.id] = true;
        Meta.unlock('shop'); shopMsg('买到啦：' + it.name + '！');
        Snd.play('pup');
      } else Snd.play('click');
      save.skins[shopTank] = Object.assign(Meta.skin(shopTank), { [shopTab]: it.id });
      persist();
      buildShop();
    };
    grid.appendChild(b);
  }
}
function renderShopPreview(time) {
  const c = $('#shopPreview').getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 300, 260);
  const t = demoTank(shopTank, 150, 140, Math.floor(time * 0.8) % 4, time * 50);
  t.moving = true;
  c.save(); c.translate(150, 140); c.scale(3.4, 3.4); c.translate(-150, -140);
  drawTank(c, t, time);
  c.restore();
}

// ===== 成就 =====
function buildAch() {
  const n = ACHS.filter(a => save.ach[a.id]).length;
  $('#achCount').textContent = '已获得 ' + n + ' / ' + ACHS.length;
  const grid = $('#achGrid'); grid.innerHTML = '';
  for (const a of ACHS) {
    const got = !!save.ach[a.id];
    const d = document.createElement('div');
    d.className = 'ach' + (got ? ' got' : '');
    d.innerHTML = `<div class="aicon">${got ? a.icon : '❓'}</div><b>${a.name}</b><span>${a.desc}</span>`;
    grid.appendChild(d);
  }
}

// ===== 家长设置 =====
let resetArmed = false;
function buildParent() {
  $('#saveCode').value = exportSave();
  $('#loadCode').value = '';
  $('#parentMsg').textContent = '';
  resetArmed = false;
  $('#btnReset').textContent = '重置全部进度';
  const total = save.stars.reduce((s, v) => s + (v || 0), 0);
  $('#parentStats').innerHTML = `星星 <b>${total}</b> / ${LEVELS.length * 3}　金币 <b>${save.coins}</b>　打败机器人 <b>${save.stats.kills}</b>　成就 <b>${Object.keys(save.ach).length}</b> / ${ACHS.length}`;
}

// ===== 编辑器 =====
function openEditor() { G = null; Editor.open(); UI.show('editor'); }
const edCv = $('#edCanvas');
function edPointer(e, fresh) {
  const r = edCv.getBoundingClientRect();
  const c = Math.floor(((e.clientX - r.left) / r.width) * COLS), row = Math.floor(((e.clientY - r.top) / r.height) * ROWS);
  Editor.paint(c, row, fresh);
}
edCv.addEventListener('pointerdown', e => { e.preventDefault(); Editor.painting = true; edCv.setPointerCapture(e.pointerId); edPointer(e, true); });
edCv.addEventListener('pointermove', e => { if (Editor.painting) edPointer(e); });
edCv.addEventListener('pointerup', () => { Editor.painting = false; });
edCv.addEventListener('pointercancel', () => { Editor.painting = false; });

// ===== 标题动画 =====
const tcv = $('#tcv'), tctx = tcv.getContext('2d');
function renderTitle(time) {
  const c = tctx, W = 640, H = 200;
  c.setTransform(tcv.width / W, 0, 0, tcv.height / H, 0, 0);
  c.clearRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, 10, 120, 620, 70, 35); c.fill();
  const lead = 390 + Math.sin(time * 0.9) * 30;
  const robot = { kind: 'enemy', type: 'y', x: lead + 150, y: 120, size: 38, dir: 1, dist: time * 70, moving: true, recoil: 0, flashT: 0, hp: 3, maxHp: 3, frozenT: 0, blink: 0, gold: true };
  c.save(); c.translate(robot.x, robot.y); c.scale(1.5, 1.5); c.translate(-robot.x, -robot.y); drawTank(c, robot, time); c.restore();
  PLAYER_TANKS.slice(0, 5).forEach((d, i) => {
    const x = lead - i * 82, y = 120 - Math.abs(Math.sin(time * 6 + i)) * 10;
    const t = demoTank(i, x, y, 1, time * 70);
    t.moving = true; t.recoil = (time * 2 + i * 0.3) % 1 < 0.15 ? 1 : 0; t.weapon = ['scatter', 'big', 'ice', 'pierce', 'bomb'][i];
    c.save(); c.translate(x, y); c.scale(1.4, 1.4); c.translate(-x, -y); drawTank(c, t, time); c.restore();
  });
}
function buildTitle() {
  document.querySelectorAll('.coins').forEach(el => { el.textContent = coinsHtml(); });
  const cont = $('#btnContinue');
  if (save.lastLevel != null || save.stars.some(v => v > 0)) {
    let n = 0;
    for (let i = 0; i < LEVELS.length; i++) if (isUnlocked(i)) n = i;
    cont.style.display = 'inline-block';
    cont.textContent = '▶ 继续冒险：第 ' + (n + 1) + ' 关';
    cont.dataset.level = n;
  } else cont.style.display = 'none';
}

// ===== 主循环 =====
let last = performance.now(), clock = 0;
function frame(now) {
  // 就算哪里出了错，也要让下一帧继续跑，游戏不会整个卡住
  requestAnimationFrame(frame);
  try { step(now); } catch (err) { console.error(err); }
}
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  clock += dt;
  if (screen === 'play' && G && !paused) { updateGame(dt); if (Touch.on) updateTouchUI(); }
  if (G && cv.style.display !== 'none') {
    if (OVERLAYS.includes(screen) && screen !== 'pause') { stepFx(dt); updateCoins(dt); if (G.phase === 'won' && Math.random() < 0.3) confetti(2); }
    const k = cv.width / VIEW_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    renderGame(ctx, G.t);
  }
  if (screen === 'title') renderTitle(clock);
  else if (screen === 'tanks') renderTankCards(clock);
  else if (screen === 'shop') renderShopPreview(clock);
  else if (screen === 'editor') Editor.render(clock);
  else if (screen === 'bosses') renderBossCards(clock);
}

// ===== 按钮 =====
document.addEventListener('pointerdown', () => Snd.init());
document.addEventListener('keydown', () => Snd.init());
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  Snd.init(); Snd.play('click'); Snd.startMusic();
  const act = b.dataset.act;
  switch (act) {
    case 'play1': case 'play2':
      mode = act === 'play1' ? 1 : 2; tankStage = 0; buildTanks(); UI.show('tanks');
      say(mode === 2 ? '两个人一起玩！1P 先选坦克' : '选一辆你喜欢的坦克吧'); break;
    case 'continue': mode = save.mode || 1; selLevel = +b.dataset.level; goLevels(); break;
    case 'tutorial': mode = 1; startTutorial2(); break;
    case 'skipTut': save.tutorialDone = true; persist(); leaveGame(); break;
    case 'help': fillItems($('#helpWeapons'), $('#helpItems')); UI.show('help'); break;
    case 'shop': shopTank = selTanks[0]; buildShop(); UI.show('shop'); break;
    case 'shopPrev': shopTank = nextTank(shopTank, -1); buildShop(); break;
    case 'shopNext': shopTank = nextTank(shopTank, 1); buildShop(); break;
    case 'lvPrev': gotoWorld(lvPage - 1); break;
    case 'lvNext': gotoWorld(lvPage + 1); break;
    case 'bosses': buildBosses(); UI.show('bosses'); break;
    case 'skip':
      if (canSkip()) { skipLevel(cur.L.li); paused = false; say('先跳过，以后再回来挑战吧'); startLevel(cur.L.li + 1); }
      break;
    case 'ach': buildAch(); UI.show('ach'); break;
    case 'parent': buildParent(); UI.show('parent'); break;
    case 'editor': openEditor(); break;
    case 'title': G = null; buildTitle(); UI.show('title'); break;
    case 'tanks': tankStage = 0; buildTanks(); UI.show('tanks'); break;
    case 'levels': leaveGame(); break;
    case 'resume': resumeGame(); break;
    case 'retry': retry(); break;
    case 'next': next(); break;
    case 'pause': pauseGame(); break;
    case 'mute': toggleMute(); break;
    case 'copyCode':
      $('#saveCode').select();
      copyText($('#saveCode'));
      $('#parentMsg').textContent = '存档码已复制，换电脑时粘贴到下面就行'; break;
    case 'loadCode':
      try { importSave($('#loadCode').value); selTanks.splice(0, 2, ...save.tanks); mode = save.mode; Snd.applyMute(); $('#btnMute').textContent = save.muted ? '🔇' : '🔊'; buildParent(); $('#parentMsg').textContent = '读取成功！'; }
      catch (err) { $('#parentMsg').textContent = '存档码不对，请检查一下'; }
      break;
    case 'reset':
      if (!resetArmed) { resetArmed = true; b.textContent = '真的要清空吗？再点一次'; setTimeout(() => { resetArmed = false; b.textContent = '重置全部进度'; }, 3000); }
      else { resetSave(); selTanks.splice(0, 2, 0, 1); buildParent(); $('#parentMsg').textContent = '已经全部重置'; }
      break;
    case 'edPlay': {
      const err = Editor.check();
      if (err) { Editor.say(err); Snd.play('boing'); break; }
      save.custom[Editor.slot] = Editor.data(); persist();
      Meta.unlock('designer');
      mode = save.mode || 1;
      begin(Editor.level(), 'custom');
      break;
    }
    case 'edSave': save.custom[Editor.slot] = Editor.data(); persist(); Editor.say('保存好啦！'); Editor.buildUI(); break;
    case 'edClear': Editor.map = Editor.blank(); Editor.say('清空啦，重新画吧'); break;
    case 'edShare':
      $('#edCode').value = btoa(unescape(encodeURIComponent(JSON.stringify(Editor.data()))));
      $('#edModal').classList.add('on'); break;
    case 'edImport':
      try { Editor.fromData(JSON.parse(decodeURIComponent(escape(atob($('#edCode').value.trim()))))); Editor.buildUI(); $('#edModal').classList.remove('on'); Editor.say('读取成功！'); }
      catch (err) { $('#edCodeMsg').textContent = '分享码不对，请检查一下'; }
      break;
    case 'edCopy':
      $('#edCode').select();
      copyText($('#edCode'));
      $('#edCodeMsg').textContent = '已复制，发给朋友吧'; break;
    case 'edClose': $('#edModal').classList.remove('on'); $('#edCodeMsg').textContent = ''; break;
  }
});
function copyText(el) {
  el.select();
  const old = () => { try { document.execCommand('copy'); } catch (e) { /* 只能手动复制 */ } };
  try { navigator.clipboard.writeText(el.value).catch(old); } catch (e) { old(); }
}
function toggleMute() {
  save.muted = !save.muted; persist(); Snd.applyMute();
  if (save.muted) try { speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
  $('#btnMute').textContent = save.muted ? '🔇' : '🔊';
}

// ===== 键盘 =====
document.addEventListener('keydown', e => {
  const code = e.code;
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (code === 'KeyM' && screen !== 'play') { toggleMute(); return; }
  if (screen === 'play') {
    if (code === 'Escape' || code === 'KeyP') { e.preventDefault(); pauseGame(); return; }
    if (code === 'KeyM') { toggleMute(); return; }
    const r = keyRole(code);
    if (!r) return;
    e.preventDefault();
    if (e.repeat) return;
    const pad = Input.pads[r.pid];
    if (r.role === 'dir') { pad.codes = pad.codes.filter(c => c !== code); pad.codes.push(code); }
    else pad[r.role].add(code);
    return;
  }
  const ok = code === 'Enter' || code === 'Space' || code === 'NumpadEnter' || (screen === 'tanks' && code === 'KeyJ');
  const d = keyDir(code);
  if (ok || d !== undefined || code === 'Escape') e.preventDefault();
  if (e.repeat) return;
  switch (screen) {
    case 'title': if (ok) $('[data-act=play1]').click(); break;
    case 'tanks':
      if (d === 1 || d === 3) { selTanks[tankStage] = nextTank(selTanks[tankStage], d === 1 ? 1 : -1); markTank(); Snd.play('click'); }
      else if ((d === 0 || d === 2) && tankStage === 0) { save.diff = clamp(save.diff + (d === 2 ? 1 : -1), 0, 2); persist(); buildTanks(); Snd.play('click'); }
      else if (ok) confirmTank();
      else if (code === 'Escape') { if (tankStage === 1) { tankStage = 0; buildTanks(); } else $('[data-act=title]').click(); }
      break;
    case 'levels':
      if (d !== undefined) {
        const n = selLevel + [-5, 1, 5, -1][d];
        if (n >= 0 && n < LEVELS.length && isUnlocked(n)) { selLevel = n; markLevel(); Snd.play('click'); }
      } else if (code === 'KeyQ' || code === 'PageUp') gotoWorld(lvPage - 1);
      else if (code === 'KeyE' || code === 'PageDown') gotoWorld(lvPage + 1);
      else if (ok) { if (isUnlocked(selLevel)) startLevel(selLevel); }
      else if (code === 'Escape') { tankStage = 0; buildTanks(); UI.show('tanks'); }
      break;
    case 'shop':
      if (d === 1 || d === 3) { shopTank = nextTank(shopTank, d === 1 ? 1 : -1); buildShop(); Snd.play('click'); }
      else if (code === 'Escape') $('[data-act=title]').click();
      break;
    case 'help': case 'ach': case 'parent': case 'editor': case 'bosses':
      if (code === 'Escape') { $('#edModal').classList.remove('on'); $('[data-act=title]').click(); }
      break;
    case 'pause': if (ok || code === 'Escape' || code === 'KeyP') resumeGame(); break;
    case 'win': if (ok) next(); else if (code === 'Escape') leaveGame(); break;
    case 'lose': if (ok) retry(); else if (code === 'Escape') leaveGame(); else if (code === 'KeyN' && $('#btnSkipLv').style.display !== 'none') $('#btnSkipLv').click(); break;
    case 'end': if (ok || code === 'Escape') goLevels(); break;
  }
});
document.addEventListener('keyup', e => {
  const r = keyRole(e.code);
  if (!r) return;
  const pad = Input.pads[r.pid];
  if (r.role === 'dir') pad.codes = pad.codes.filter(c => c !== e.code);
  else pad[r.role].delete(e.code);
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('blur', () => Input.reset());
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
document.addEventListener('contextmenu', e => e.preventDefault());

// 下一辆解锁了的坦克
function nextTank(i, d) {
  for (let k = 1; k <= PLAYER_TANKS.length; k++) { const j = (i + d * k + PLAYER_TANKS.length * 2) % PLAYER_TANKS.length; if (tankUnlocked(j)) return j; }
  return i;
}
for (let i = 0; i < LEVELS.length; i++) if (isUnlocked(i)) selLevel = i;
if (DEV) { const errs = checkLevels(); console.log(errs.length ? '关卡自检有问题：\n' + errs.join('\n') : '关卡自检通过（' + LEVELS.length + ' 关）'); }
$('#btnMute').textContent = save.muted ? '🔇' : '🔊';
fillItems($('#pauseWeapons'), $('#pauseItems'));
layout();
buildTitle();
UI.show('title');
requestAnimationFrame(frame);

// 方便调试
window.__tk = { get G() { return G; }, startLevel, begin, LEVELS, save, Editor, Meta, checkLevels };
