/**
 * 简单五子棋 AI：给每个空点打分（进攻 + 防守），选最高分。
 * 难度通过防守权重和随机扰动区分，让小朋友也能赢。
 */
const GomokuAI = {
  // 连子数 + 两端是否开放 → 分值
  SCORES: {
    "5": 1000000,
    "4-open": 100000, "4-half": 10000,
    "3-open": 5000, "3-half": 500,
    "2-open": 200, "2-half": 50,
    "1-open": 10, "1-half": 1,
  },

  DIRS: [[0, 1], [1, 0], [1, 1], [1, -1]],

  /** 假设 color 落在 (row,col)，统计四个方向的连线得分 */
  scorePoint(grid, row, col, color) {
    const size = grid.length;
    let total = 0;
    for (const [dr, dc] of this.DIRS) {
      let count = 1;
      let open = 0;
      // 正反两个方向数连子
      for (const sign of [1, -1]) {
        let r = row + dr * sign, c = col + dc * sign;
        while (r >= 0 && r < size && c >= 0 && c < size && grid[r][c] === color) {
          count++;
          r += dr * sign;
          c += dc * sign;
        }
        if (r >= 0 && r < size && c >= 0 && c < size && grid[r][c] === 0) open++;
      }
      if (count >= 5) total += this.SCORES["5"];
      else if (open > 0) {
        const key = count + (open === 2 ? "-open" : "-half");
        total += this.SCORES[key] || 0;
      }
    }
    return total;
  },

  /**
   * 选一手棋。level: 1 容易 / 2 中等 / 3 厉害
   * aiColor 是 AI 执的颜色，返回 {row, col}，无处可下返回 null
   */
  pickMove(grid, aiColor, level = 2) {
    const size = grid.length;
    const humanColor = aiColor === 1 ? 2 : 1;
    const defendWeight = { 1: 0.5, 2: 0.9, 3: 1.0 }[level];
    const noise = { 1: 800, 2: 100, 3: 0 }[level];

    let best = null;
    let bestScore = -1;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) continue;
      if (!this.nearStone(grid, r, c)) continue;
      const attack = this.scorePoint(grid, r, c, aiColor);
      const defend = this.scorePoint(grid, r, c, humanColor);
      const score = attack + defend * defendWeight + Math.random() * noise;
      if (score > bestScore) {
        bestScore = score;
        best = { row: r, col: c };
      }
    }
    // 开局棋盘附近无子时下中心
    if (!best) {
      const mid = Math.floor(size / 2);
      if (grid[mid][mid] === 0) return { row: mid, col: mid };
      return null;
    }
    return best;
  },

  /** 只考虑已有棋子周围两格内的点，缩小搜索范围 */
  nearStone(grid, row, col) {
    const size = grid.length;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < size && c >= 0 && c < size && grid[r][c] !== 0) return true;
    }
    return false;
  },

  /** 判断 color 在 (row,col) 落子后是否五连 */
  checkWin(grid, row, col, color) {
    const size = grid.length;
    for (const [dr, dc] of this.DIRS) {
      let count = 1;
      for (const sign of [1, -1]) {
        let r = row + dr * sign, c = col + dc * sign;
        while (r >= 0 && r < size && c >= 0 && c < size && grid[r][c] === color) {
          count++;
          r += dr * sign;
          c += dc * sign;
        }
      }
      if (count >= 5) return true;
    }
    return false;
  },
};
