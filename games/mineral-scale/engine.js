// 天平探矿师 - 核心逻辑与天平称量算法引擎

// 理论最优称量次数 (三分法: ceil(log3(N)))
export function getOptimalWeighs(coinCount) {
  let count = coinCount;
  let weighs = 0;
  while (count > 1) {
    count = Math.ceil(count / 3);
    weighs++;
  }
  return weighs;
}

// 称量模拟
// leftCoins, rightCoins: 数组，包含金币编号 [1, 2, ...]
// fakeCoinIndex: 假币编号
// fakeDelta: -1 表示较轻, +1 表示较重
export function weighCoins(leftCoins, rightCoins, fakeCoinIndex, fakeDelta = -1) {
  if (!Array.isArray(leftCoins) || !Array.isArray(rightCoins)) {
    throw new Error('Pans must be arrays');
  }
  if (leftCoins.length !== rightCoins.length) {
    throw new Error('両盘金币数量必须相等才能称量');
  }
  if (leftCoins.length === 0) {
    return 'empty';
  }

  // 正常金币重量为 10，假币为 10 + fakeDelta
  const normalWeight = 10;
  const leftWeight = leftCoins.reduce(
    (sum, c) => sum + (c === fakeCoinIndex ? normalWeight + fakeDelta : normalWeight),
    0
  );
  const rightWeight = rightCoins.reduce(
    (sum, c) => sum + (c === fakeCoinIndex ? normalWeight + fakeDelta : normalWeight),
    0
  );

  if (leftWeight < rightWeight) {
    return 'left-lighter'; // 左边轻 / 右边下沉
  } else if (leftWeight > rightWeight) {
    return 'left-heavier'; // 左边重 / 左边下沉
  } else {
    return 'balanced'; // 天平平衡
  }
}

export function verifyAccusation(chosenCoin, fakeCoinIndex) {
  return Number(chosenCoin) === Number(fakeCoinIndex);
}

export function calculateStars(weighCount, optimalLimit) {
  if (weighCount <= optimalLimit) return 3;
  if (weighCount <= optimalLimit + 1) return 2;
  return 1;
}

export function sanitizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(raw)) {
    const levelNum = Number(k);
    const stars = Number(v);
    if (Number.isInteger(levelNum) && levelNum >= 1 && levelNum <= 100) {
      clean[levelNum] = Math.max(1, Math.min(3, Math.floor(stars) || 1));
    }
  }
  return clean;
}
