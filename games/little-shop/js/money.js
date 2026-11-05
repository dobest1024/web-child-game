'use strict';
// ===== 钱：金额一律用"角"做整数单位（1 元 = 10 角），避免小数误差 =====
// 面额取一年级"认识人民币"会遇到的 1 角、5 角、1 元硬币和 5、10、20 元纸币

const MONEY = {
  j1: { id: 'j1', value: 1, label: '1角', kind: 'coin' },
  j5: { id: 'j5', value: 5, label: '5角', kind: 'coin' },
  y1: { id: 'y1', value: 10, label: '1元', kind: 'coin' },
  y5: { id: 'y5', value: 50, label: '5元', kind: 'note' },
  y10: { id: 'y10', value: 100, label: '10元', kind: 'note' },
  y20: { id: 'y20', value: 200, label: '20元', kind: 'note' },
};
const MONEY_ORDER = ['j1', 'j5', 'y1', 'y5', 'y10', 'y20'];

// 15 → "1元5角"，7 → "7角"，30 → "3元"
function formatMoney(jiao) {
  const yuan = Math.floor(jiao / 10);
  const j = jiao % 10;
  if (!yuan && !j) return '0元';
  return (yuan ? `${yuan}元` : '') + (j ? `${j}角` : '');
}

function sumMoney(ids) {
  return ids.reduce((s, id) => s + MONEY[id].value, 0);
}

// 用允许的面额凑出 amount，张数最少，从大到小排；凑不出返回 null
function makeChange(amount, allowed) {
  if (!Number.isInteger(amount) || amount < 0) return null;
  const best = [[]];
  for (let a = 1; a <= amount; a++) {
    best[a] = null;
    for (const id of allowed) {
      const prev = best[a - MONEY[id].value];
      if (prev && (!best[a] || prev.length + 1 < best[a].length)) best[a] = [...prev, id];
    }
  }
  return best[amount] && best[amount].sort((x, y) => MONEY[y].value - MONEY[x].value);
}

if (typeof module === 'object') module.exports = { MONEY, MONEY_ORDER, formatMoney, sumMoney, makeChange };
