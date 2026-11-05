'use strict';
// ===== 存档：改结构时同时改 defaultSave() 和 fillSave()，键名不改 =====

const SAVE_KEY = 'pinyin-adventure-save-v1';

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
    if (/^[a-zāáǎàōóǒòēéěèīíǐìūúǔùüǖǘǚǜ]{1,6}$/.test(key)) save.learned[key] = true;
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

const levelKey = (grade, n) => `${grade}-${n}`;
function levelRecord(save, grade, n) {
  return save.levels[levelKey(grade, n)] || { stars: 0, fails: 0, skipped: false };
}
function isUnlocked(save, grade, n) {
  if (n === 1) return true;
  const prev = levelRecord(save, grade, n - 1);
  return prev.stars > 0 || prev.skipped;
}

if (typeof module === 'object') module.exports = { defaultSave, fillSave, levelRecord, isUnlocked };
