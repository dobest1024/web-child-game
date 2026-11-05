'use strict';
// ===== 存档：改结构时同时改 defaultSave() 和 fillSave()，键名不改 =====

const SAVE_KEY = 'little-shop-save-v1';
const SV = typeof module === 'object'
  ? { ...require('./money.js'), ...require('./data.js') }
  : { MONEY_ORDER, ANIMALS, DECOR, DECOR_SLOTS };

function defaultSave() {
  return {
    grade: 1, coins: 0, levels: {}, friends: {}, money: {},
    decor: { owned: [], awning: 'red', sign: 'wood', hat: 'none', deco: 'none' },
  };
}

const decorItem = (slot, id) => (Object.prototype.hasOwnProperty.call(SV.DECOR, slot) ? SV.DECOR[slot].items.find((i) => i.id === id) : undefined);
function ownsDecor(save, slot, id) {
  const item = decorItem(slot, id);
  return !!item && (item.price === 0 || save.decor.owned.includes(`${slot}:${id}`));
}

// 读进来的数据按白名单清洗，坏数据回到默认值
function fillSave(raw) {
  const save = defaultSave();
  if (!raw || typeof raw !== 'object') return save;
  if (Number.isInteger(raw.grade) && raw.grade >= 1 && raw.grade <= 6) save.grade = raw.grade;
  if (Number.isFinite(raw.coins) && raw.coins >= 0) save.coins = Math.min(999999, Math.floor(raw.coins));
  for (const [key, value] of Object.entries(raw.levels || {})) {
    if (!/^\d+-\d+$/.test(key) || !value || typeof value !== 'object') continue;
    save.levels[key] = {
      stars: Math.min(3, Math.max(0, Math.floor(value.stars) || 0)),
      fails: Math.min(99, Math.max(0, Math.floor(value.fails) || 0)),
      skipped: value.skipped === true,
    };
  }
  const friends = raw.friends && typeof raw.friends === 'object' ? raw.friends : {};
  for (const a of SV.ANIMALS) {
    const n = Math.floor(friends[a.id]);
    if (n > 0) save.friends[a.id] = Math.min(9999, n);
  }
  const money = raw.money && typeof raw.money === 'object' ? raw.money : {};
  for (const id of SV.MONEY_ORDER) if (money[id] === true) save.money[id] = true;
  const decor = raw.decor && typeof raw.decor === 'object' ? raw.decor : {};
  const owned = Array.isArray(decor.owned) ? decor.owned : [];
  save.decor.owned = [...new Set(owned.filter((k) => typeof k === 'string' && decorItem(...k.split(':'))))];
  for (const slot of SV.DECOR_SLOTS) {
    if (ownsDecor(save, slot, decor[slot])) save.decor[slot] = decor[slot];
  }
  return save;
}

function loadSave() {
  try {
    return fillSave(JSON.parse(localStorage.getItem(SAVE_KEY)));
  } catch {
    return defaultSave();
  }
}

function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // 隐私模式存不了，不影响这一次玩
  }
}

function levelRecord(save, grade, n) {
  return save.levels[`${grade}-${n}`] || { stars: 0, fails: 0, skipped: false };
}
function isUnlocked(save, grade, n) {
  if (n === 1) return true;
  const prev = levelRecord(save, grade, n - 1);
  return prev.stars > 0 || prev.skipped;
}

if (typeof module === 'object') module.exports = { SAVE_KEY, defaultSave, fillSave, levelRecord, isUnlocked, ownsDecor };
