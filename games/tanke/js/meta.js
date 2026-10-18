'use strict';
// ===== 存档：进度、金币、商店、成就 =====
const SAVE_KEY = 'tanke-save-v2';
function defaultSave() {
  return {
    stars: [], muted: false, tanks: [0, 1], diff: 1, mode: 1, coins: 0,
    owned: { hat: {}, paint: {}, sticker: {} }, skins: {}, up: { hp: 0, atk: 0, spd: 0, energy: 0 },
    ach: {}, stats: { kills: 0, pups: 0, skills: 0, coins: 0, pushes: 0, portals: 0, jumps: 0, bosses: 0, rescued: 0, collected: 0, survived: 0, mirrored: 0 },
    tutorialDone: false, custom: [null, null, null], lastLevel: null,
    ver: 3, skipped: [], seen: { e: {}, t: {}, p: {} }, bossKills: {}, tankWins: {}, pushWins: {},
  };
}
// 把缺的字段补上（兼容老存档）
function fillSave(s) {
  const d = defaultSave();
  if (!s || typeof s !== 'object' || !Array.isArray(s.stars)) return d;
  for (const k of Object.keys(d)) {
    if (s[k] === undefined || s[k] === null && d[k] !== null) s[k] = d[k];
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) s[k] = Object.assign({}, d[k], s[k]);
  }
  const num = (v, lo, hi, def) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? clamp(v, lo, hi) : def; };
  if (!Array.isArray(s.tanks)) s.tanks = d.tanks;
  if (typeof s.tank === 'number' && !s._migrated) { s.tanks[0] = s.tank; s._migrated = true; }
  // v2 → v3：第 1–20 关的星星原样对应新的第 1–20 关
  if (!s.ver || s.ver < 3) s.ver = 3;
  s.stars = s.stars.slice(0, LEVELS.length).map(v => num(v, 0, 3, 0));
  const tankOk = i => !PLAYER_TANKS[i].unlock || (s.stars[PLAYER_TANKS[i].unlock - 1] || 0) > 0;
  const tk = (v, def) => { const i = num(v, 0, PLAYER_TANKS.length - 1, def); return tankOk(i) ? i : def; };
  s.tanks = [tk(s.tanks[0], 0), tk(s.tanks[1], 1)];
  s.skipped = (Array.isArray(s.skipped) ? s.skipped : []).slice(0, LEVELS.length).map(Boolean);
  // 只留白名单里的键、值是数字
  const obj = (o, keys) => { const r = {}; if (o && typeof o === 'object') for (const k of Object.keys(o)) if ((!keys || keys.includes(k)) && Number.isFinite(+o[k])) r[k] = num(o[k], 0, 1e9, 0); return r; };
  const seen = s.seen && typeof s.seen === 'object' ? s.seen : {};
  s.seen = { e: obj(seen.e, Object.keys(ENEMIES)), t: obj(seen.t, Object.keys(TERRAIN_TIPS).concat(['collect', 'survive', 'push', 'rescue', 'gold'].map(m => 'mode_' + m))), p: obj(seen.p, Object.keys(PUPS)) };
  s.bossKills = obj(s.bossKills, Object.keys(BOSSES));
  s.tankWins = obj(s.tankWins, PLAYER_TANKS.map(t => t.id));
  s.pushWins = obj(s.pushWins, LEVELS.filter(L => L.mode === 'push').map(L => String(L.n)));
  for (const cat of ['hat', 'paint', 'sticker']) s.owned[cat] = obj(s.owned[cat], SHOP[cat].map(it => it.id));
  // 打赢过世界 Boss 就有纪念帽（老存档也补上）
  WORLDS.forEach((w, i) => { if ((s.stars[i * 10 + 9] || 0) > 0) s.owned.hat[w.trophy] = 1; });
  s.coins = num(s.coins, 0, 1e7, 0);
  s.diff = num(s.diff, 0, DIFFS.length - 1, 1);
  s.mode = s.mode === 2 ? 2 : 1;
  s.lastLevel = s.lastLevel == null ? null : num(s.lastLevel, 0, LEVELS.length - 1, null);
  for (const u of UPGRADES) s.up[u.id] = num(s.up[u.id], 0, u.costs.length, 0);
  for (const k of Object.keys(s.stats)) s.stats[k] = num(s.stats[k], 0, 1e9, 0);
  s.muted = !!s.muted; s.tutorialDone = !!s.tutorialDone;
  if (!Array.isArray(s.custom) || s.custom.length < 3) s.custom = [null, null, null];
  return s;
}
const save = (() => {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* 无痕模式等 */ }
  return fillSave(s);
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 存不了就算了 */ } }

// 存档码：方便换电脑、换浏览器
function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(save)))); }
function importSave(code) {
  const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if (!s || !Array.isArray(s.stars)) throw new Error('bad');
  const f = fillSave(s);
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, f);
  persist();
}
function resetSave() {
  const muted = save.muted;
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, defaultSave(), { muted });
  persist();
}

const Meta = {
  skin(tankIdx) {
    const s = save.skins[tankIdx] || {};
    return { hat: s.hat || 'none', paint: s.paint || 'none', sticker: s.sticker || 'none' };
  },
  owns(cat, id) { return id === 'none' || !!save.owned[cat][id]; },
  addCoins(n) {
    if (n <= 0) return;
    save.coins += n; save.stats.coins += n;
    if (save.stats.coins >= 500) this.unlock('coins500');
    persist();
  },
  stat(name, n) {
    save.stats[name] = (save.stats[name] || 0) + (n || 1);
    const v = save.stats[name];
    if (name === 'kills') { if (v >= 50) this.unlock('kill50'); if (v >= 300) this.unlock('kill300'); if (v >= 1000) this.unlock('kill1000'); }
    if (name === 'bosses' && v >= 20) this.unlock('boss20');
    if (name === 'rescued' && v >= 20) this.unlock('rescue20');
    if (name === 'collected' && v >= 100) this.unlock('collect100');
    if (name === 'survived' && v >= 5) this.unlock('survive5');
    if (name === 'mirrored' && v >= 10) this.unlock('mirror10');
    if (name === 'pups' && v >= 30) this.unlock('pup30');
    if (name === 'skills' && v >= 20) this.unlock('skill20');
    if (name === 'pushes' && v >= 20) this.unlock('pusher');
    if (name === 'portals' && v >= 10) this.unlock('portal');
    if (name === 'jumps' && v >= 10) this.unlock('jumper');
  },
  checkStars() {
    const total = save.stars.reduce((s, v) => s + (v || 0), 0);
    if (total >= 30) this.unlock('stars30');
    if (total >= 60) this.unlock('stars60');
    if (total >= 150) this.unlock('stars150');
    if (total >= LEVELS.length * 3) this.unlock('stars300');
  },
  unlock(id) {
    if (save.ach[id]) return;
    const a = ACHS.find(x => x.id === id);
    if (!a) return;
    save.ach[id] = Date.now();
    persist();
    toast(a.icon, '获得成就：' + a.name, a.desc);
    Snd.play('pup');
  },
  upLevel(id) { return save.up[id] || 0; },
};

// 右上角弹出的小提示
const toastQueue = [];
let toastBusy = false;
function toast(icon, title, sub) {
  toastQueue.push([icon, title, sub]);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const box = document.getElementById('toast');
  const item = toastQueue.shift();
  if (!item || !box) { toastBusy = false; return; }
  toastBusy = true;
  box.innerHTML = `<span class="ti">${item[0]}</span><div><b>${item[1]}</b><span>${item[2] || ''}</span></div>`;
  box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
  setTimeout(() => { box.classList.remove('show'); setTimeout(nextToast, 350); }, 2600);
}
