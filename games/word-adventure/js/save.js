'use strict';
// ===== 存档：改结构时同时改 defaultSave() 和 fillSave()，键名不改 =====

const SAVE_KEY = 'word-adventure-save-v1';

function defaultSave() {
  return { grade: 1, coins: 0, levels: {}, learned: {} };
}

// 读进来的数据按白名单清洗，坏数据回到默认值
function fillSave(raw) {
  const save = defaultSave();
  if (!raw || typeof raw !== 'object') return save;
  if (Number.isInteger(raw.grade) && raw.grade >= 1 && raw.grade <= 6) save.grade = raw.grade;
  if (Number.isFinite(raw.coins) && raw.coins >= 0) save.coins = Math.floor(raw.coins);
  for (const [key, value] of Object.entries(raw.levels || {})) {
    if (!/^\d+-\d+$/.test(key) || !value || typeof value !== 'object') continue;
    save.levels[key] = {
      stars: Math.min(3, Math.max(0, Math.floor(value.stars) || 0)),
      fails: Math.max(0, Math.floor(value.fails) || 0),
      skipped: value.skipped === true,
    };
  }
  for (const key of Object.keys(raw.learned || {})) {
    if (/^(letter-)?[a-z]{1,12}$/.test(key)) save.learned[key] = true;
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

const levelKey = (worldId, n) => `${worldId}-${n}`;
function levelRecord(save, worldId, n) {
  return save.levels[levelKey(worldId, n)] || { stars: 0, fails: 0, skipped: false };
}
function isUnlocked(save, worldId, n) {
  if (n === 1) return true;
  const prev = levelRecord(save, worldId, n - 1);
  return prev.stars > 0 || prev.skipped;
}

if (typeof module === 'object') module.exports = { defaultSave, fillSave, levelRecord, isUnlocked, levelKey };
