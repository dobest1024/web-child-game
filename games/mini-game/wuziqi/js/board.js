/**
 * 通用棋盘渲染器（canvas）。
 * new Board(canvas, { size, cell, onClick }) 后用 set/clear/draw 操作。
 * stones[row][col]: 0 空, 1 黑, 2 白
 */
class Board {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.size = opts.size || 15;        // 每边交叉点数
    this.cell = opts.cell || 36;        // 每格像素
    this.onClick = opts.onClick || null;
    this.margin = this.cell;
    this.stones = this.emptyGrid();
    this.marks = [];                    // [{row, col, color}] 高亮圈
    this.lastMove = null;

    const px = this.margin * 2 + this.cell * (this.size - 1);
    // 高分屏下用物理像素绘制，避免模糊
    const dpr = window.devicePixelRatio || 1;
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    canvas.style.width = px + "px";
    // 高さは CSS の height:auto に任せる（縮小時も正方形を保ち歪まない）
    this.ctx = canvas.getContext("2d");
    this.ctx.scale(dpr, dpr);
    this.pxSize = px;

    if (this.onClick) {
      canvas.addEventListener("click", (e) => {
        const pos = this.eventToCell(e);
        if (pos) this.onClick(pos.row, pos.col);
      });
    }
    this.draw();
  }

  emptyGrid() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(0));
  }

  eventToCell(e) {
    const rect = this.canvas.getBoundingClientRect();
    // 横・縦それぞれの拡縮率で換算（CSS で歪んでも座標がズレないように）
    const x = (e.clientX - rect.left) * (this.pxSize / rect.width);
    const y = (e.clientY - rect.top) * (this.pxSize / rect.height);
    const col = Math.round((x - this.margin) / this.cell);
    const row = Math.round((y - this.margin) / this.cell);
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return null;
    return { row, col };
  }

  set(row, col, color) {
    this.stones[row][col] = color;
    this.lastMove = { row, col };
  }

  clear() {
    this.stones = this.emptyGrid();
    this.marks = [];
    this.lastMove = null;
    this.draw();
  }

  cx(col) { return this.margin + col * this.cell; }
  cy(row) { return this.margin + row * this.cell; }

  draw() {
    const { ctx, size, cell, margin, pxSize } = this;
    ctx.clearRect(0, 0, pxSize, pxSize);

    // 木纹底
    ctx.fillStyle = "#e8b96f";
    ctx.fillRect(0, 0, pxSize, pxSize);

    // 网格线
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < size; i++) {
      ctx.beginPath();
      ctx.moveTo(margin, this.cy(i));
      ctx.lineTo(pxSize - margin, this.cy(i));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.cx(i), margin);
      ctx.lineTo(this.cx(i), pxSize - margin);
      ctx.stroke();
    }

    // 星位（仅标准大棋盘）
    if (size >= 13) {
      const star = [3, Math.floor(size / 2), size - 4];
      ctx.fillStyle = "#8a5a2b";
      for (const r of star) for (const c of star) {
        ctx.beginPath();
        ctx.arc(this.cx(c), this.cy(r), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 棋子
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (this.stones[r][c]) this.drawStone(r, c, this.stones[r][c]);
    }

    // 高亮圈
    for (const m of this.marks) {
      ctx.strokeStyle = m.color || "#ff6b6b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.cx(m.col), this.cy(m.row), cell * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 最后一手红点
    if (this.lastMove) {
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(this.cx(this.lastMove.col), this.cy(this.lastMove.row), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawStone(row, col, color) {
    const { ctx, cell } = this;
    const x = this.cx(col);
    const y = this.cy(row);
    const r = cell * 0.42;
    const grad = ctx.createRadialGradient(x - r / 3, y - r / 3, r / 6, x, y, r);
    if (color === 1) {
      grad.addColorStop(0, "#666");
      grad.addColorStop(1, "#111");
    } else {
      grad.addColorStop(0, "#fff");
      grad.addColorStop(1, "#ccc");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** 按顺序逐颗落子的演示动画。moves: [[row, col, color], ...] */
  animate(moves, interval = 600, done) {
    this.clear();
    let i = 0;
    const timer = setInterval(() => {
      if (i >= moves.length) {
        clearInterval(timer);
        if (done) done();
        return;
      }
      const [r, c, color] = moves[i++];
      this.set(r, c, color);
      this.draw();
    }, interval);
  }
}
