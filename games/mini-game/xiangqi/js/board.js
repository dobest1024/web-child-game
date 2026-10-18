/* ===========================================================
   board.js —— 象棋棋盘引擎
   职责：1) 画棋盘和棋子  2) 计算某个棋子的合法走法（教学高亮）
        3) 处理点击：选中棋子 → 显示能走的格子 → 移动
   坐标：col 0~8（左→右），row 0~9（上→下）。
   =========================================================== */

const COLS = 9;
const ROWS = 10;

/* 工具：判断坐标是否在棋盘内 */
function inBoard(c, r) {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS;
}

/* 工具：某方的九宫格列范围固定 3~5，行范围按红黑不同 */
function inPalace(c, r, side) {
  if (c < 3 || c > 5) return false;
  return side === 'red' ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2);
}

/* 判断某行是否在“自己家”这一侧（相/象不能过河） */
function ownSide(r, side) {
  return side === 'red' ? r >= 5 : r <= 4;
}

/* 计算一个棋子在当前局面下所有合法目标格。
   board: 二维数组，存棋子代码或 null。
   返回 [{c, r, capture:true/false}, ...] */
function legalMoves(board, c, r) {
  const code = board[r][c];
  if (!code) return [];
  const piece = PIECES[code];
  const side = piece.side;
  const moves = [];

  const at = (cc, rr) => (inBoard(cc, rr) ? board[rr][cc] : 'OUT');
  const isEnemy = (cc, rr) => {
    const t = at(cc, rr);
    return t && t !== 'OUT' && PIECES[t].side !== side;
  };
  const isEmpty = (cc, rr) => at(cc, rr) === null;
  const tryAdd = (cc, rr) => {
    if (!inBoard(cc, rr)) return;
    const t = board[rr][cc];
    if (t === null) moves.push({ c: cc, r: rr, capture: false });
    else if (PIECES[t].side !== side) moves.push({ c: cc, r: rr, capture: true });
  };

  switch (piece.kind) {
    case 'king': {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (const [dc, dr] of dirs) {
        const cc = c + dc, rr = r + dr;
        if (inPalace(cc, rr, side)) tryAdd(cc, rr);
      }
      break;
    }
    case 'advisor': {
      const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dc, dr] of dirs) {
        const cc = c + dc, rr = r + dr;
        if (inPalace(cc, rr, side)) tryAdd(cc, rr);
      }
      break;
    }
    case 'elephant': {
      const dirs = [[2,2],[2,-2],[-2,2],[-2,-2]];
      for (const [dc, dr] of dirs) {
        const cc = c + dc, rr = r + dr;
        const eyeC = c + dc / 2, eyeR = r + dr / 2; // 象眼
        if (!inBoard(cc, rr)) continue;
        if (!ownSide(rr, side)) continue;            // 不能过河
        if (!isEmpty(eyeC, eyeR)) continue;          // 塞象眼则不能走
        tryAdd(cc, rr);
      }
      break;
    }
    case 'horse': {
      // 8 个落点，每个落点对应一个“马腿”
      const cand = [
        { c: c+1, r: r+2, leg: [c, r+1] },
        { c: c-1, r: r+2, leg: [c, r+1] },
        { c: c+1, r: r-2, leg: [c, r-1] },
        { c: c-1, r: r-2, leg: [c, r-1] },
        { c: c+2, r: r+1, leg: [c+1, r] },
        { c: c+2, r: r-1, leg: [c+1, r] },
        { c: c-2, r: r+1, leg: [c-1, r] },
        { c: c-2, r: r-1, leg: [c-1, r] },
      ];
      for (const m of cand) {
        if (!inBoard(m.c, m.r)) continue;
        if (!isEmpty(m.leg[0], m.leg[1])) continue;  // 蹩马腿
        tryAdd(m.c, m.r);
      }
      break;
    }
    case 'rook': {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (const [dc, dr] of dirs) {
        let cc = c + dc, rr = r + dr;
        while (inBoard(cc, rr)) {
          if (isEmpty(cc, rr)) {
            moves.push({ c: cc, r: rr, capture: false });
          } else {
            if (isEnemy(cc, rr)) moves.push({ c: cc, r: rr, capture: true });
            break;
          }
          cc += dc; rr += dr;
        }
      }
      break;
    }
    case 'cannon': {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (const [dc, dr] of dirs) {
        let cc = c + dc, rr = r + dr;
        // 第一段：移动（不吃子），遇到任何棋子停止
        while (inBoard(cc, rr) && isEmpty(cc, rr)) {
          moves.push({ c: cc, r: rr, capture: false });
          cc += dc; rr += dr;
        }
        // 找到“炮架”后，继续找第一个棋子，若是敌方则可吃
        cc += dc; rr += dr;
        while (inBoard(cc, rr)) {
          if (!isEmpty(cc, rr)) {
            if (isEnemy(cc, rr)) moves.push({ c: cc, r: rr, capture: true });
            break;
          }
          cc += dc; rr += dr;
        }
      }
      break;
    }
    case 'pawn': {
      const forward = side === 'red' ? -1 : 1; // 红向上(row 减)，黑向下(row 加)
      tryAdd(c, r + forward);
      const crossed = side === 'red' ? r <= 4 : r >= 5; // 是否已过河
      if (crossed) {
        tryAdd(c + 1, r);
        tryAdd(c - 1, r);
      }
      break;
    }
  }
  return moves;
}

/* ----------------- 迷你示意图 (SVG) ----------------- */
/* 画一张小棋盘示意图。spec 字段：
   cols, rows,
   pieces:[{c,r,code,x}]  棋子（x:true 画红叉表示"弃掉"）
   ghosts:[{c,r}]         半透明的"炮架"
   dots:[{c,r}]           绿色可走点
   captures:[{c,r}]       红圈可吃点
   arrows:[{c,r,toc,tor,color,dashed}]  箭头
   boxes:[{c,r,c2,r2}]    九宫格方框
*/
function miniBoardSVG(spec) {
  const cell = 40;
  const W = spec.cols * cell, H = spec.rows * cell;
  const cx = c => c * cell + cell / 2;
  const cy = r => r * cell + cell / 2;
  const e = [];

  e.push(`<svg class="mini-board" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`);
  e.push(`<defs>
    <marker id="ah-red" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="#d23b34"/></marker>
    <marker id="ah-green" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="#2eb45a"/></marker>
  </defs>`);
  e.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="#f2cb87" stroke="#d49a4e" stroke-width="3"/>`);

  // 网格线（穿过格子中心）
  for (let c = 0; c < spec.cols; c++)
    e.push(`<line x1="${cx(c)}" y1="${cy(0)}" x2="${cx(c)}" y2="${cy(spec.rows-1)}" stroke="#9c5e1c" stroke-width="1.3"/>`);
  for (let r = 0; r < spec.rows; r++)
    e.push(`<line x1="${cx(0)}" y1="${cy(r)}" x2="${cx(spec.cols-1)}" y2="${cy(r)}" stroke="#9c5e1c" stroke-width="1.3"/>`);

  // 九宫格方框 + 斜线
  (spec.boxes || []).forEach(b => {
    e.push(`<rect x="${cx(b.c)}" y="${cy(b.r)}" width="${cx(b.c2)-cx(b.c)}" height="${cy(b.r2)-cy(b.r)}" fill="none" stroke="#9c5e1c" stroke-width="1.3"/>`);
    e.push(`<line x1="${cx(b.c)}" y1="${cy(b.r)}" x2="${cx(b.c2)}" y2="${cy(b.r2)}" stroke="#9c5e1c" stroke-width="1.3"/>`);
    e.push(`<line x1="${cx(b.c2)}" y1="${cy(b.r)}" x2="${cx(b.c)}" y2="${cy(b.r2)}" stroke="#9c5e1c" stroke-width="1.3"/>`);
  });

  // 可走绿点
  (spec.dots || []).forEach(d =>
    e.push(`<circle cx="${cx(d.c)}" cy="${cy(d.r)}" r="${cell*0.18}" fill="#2eb45a" opacity="0.9"/>`));
  // 可吃红圈
  (spec.captures || []).forEach(d =>
    e.push(`<circle cx="${cx(d.c)}" cy="${cy(d.r)}" r="${cell*0.3}" fill="none" stroke="#d23b34" stroke-width="3"/>`));

  // 箭头
  (spec.arrows || []).forEach(a => {
    const col = a.color === 'green' ? '#2eb45a' : '#d23b34';
    const mk = a.color === 'green' ? 'ah-green' : 'ah-red';
    // 箭头略微缩短，避免压在棋子上
    const x1 = cx(a.c), y1 = cy(a.r), x2 = cx(a.toc), y2 = cy(a.tor);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const sx = x1 + dx/len * cell*0.4, sy = y1 + dy/len * cell*0.4;
    const ex = x2 - dx/len * cell*0.4, ey = y2 - dy/len * cell*0.4;
    e.push(`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${col}" stroke-width="3" ${a.dashed?'stroke-dasharray="5 4"':''} marker-end="url(#${mk})"/>`);
  });

  // 炮架（半透明灰圈）
  (spec.ghosts || []).forEach(g =>
    e.push(`<circle cx="${cx(g.c)}" cy="${cy(g.r)}" r="${cell*0.32}" fill="#bbb" opacity="0.55" stroke="#888" stroke-width="2"/>`));

  // 棋子
  (spec.pieces || []).forEach(p => {
    const piece = PIECES[p.code];
    const col = piece.side === 'red' ? '#d23b34' : '#2b2b2b';
    const x = cx(p.c), y = cy(p.r), rad = cell * 0.36;
    e.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="#fde9c4" stroke="${col}" stroke-width="2.5"/>`);
    e.push(`<text x="${x}" y="${y}" fill="${col}" font-size="${cell*0.42}" font-weight="800" text-anchor="middle" dominant-baseline="central">${piece.name}</text>`);
    if (p.x) {
      e.push(`<line x1="${x-rad}" y1="${y-rad}" x2="${x+rad}" y2="${y+rad}" stroke="#d23b34" stroke-width="3"/>`);
      e.push(`<line x1="${x+rad}" y1="${y-rad}" x2="${x-rad}" y2="${y+rad}" stroke="#d23b34" stroke-width="3"/>`);
    }
  });

  e.push(`</svg>`);
  return e.join('');
}

/* 为某个棋子生成"走法形状"示意图（5x5 小格，棋子在正中）。 */
function pieceMoveSVG(code) {
  const piece = PIECES[code];
  const C = 2, R = 2; // 中心
  const spec = { cols: 5, rows: 5, pieces: [{ c: C, r: R, code }], dots: [], captures: [], arrows: [], ghosts: [], boxes: [] };

  switch (piece.kind) {
    case 'king':
      spec.dots = [{c:2,r:1},{c:1,r:2},{c:3,r:2},{c:2,r:3}];
      spec.boxes = [{c:1,r:1,c2:3,r2:3}];
      break;
    case 'advisor':
      spec.dots = [{c:1,r:1},{c:3,r:1},{c:1,r:3},{c:3,r:3}];
      spec.boxes = [{c:1,r:1,c2:3,r2:3}];
      break;
    case 'elephant':
      spec.dots = [{c:0,r:0},{c:4,r:0},{c:0,r:4},{c:4,r:4}];
      break;
    case 'horse':
      spec.dots = [{c:1,r:0},{c:3,r:0},{c:0,r:1},{c:4,r:1},{c:0,r:3},{c:4,r:3},{c:1,r:4},{c:3,r:4}];
      break;
    case 'rook':
      spec.arrows = [
        {c:2,r:2,toc:2,tor:0,color:'green'},{c:2,r:2,toc:2,tor:4,color:'green'},
        {c:2,r:2,toc:0,tor:2,color:'green'},{c:2,r:2,toc:4,tor:2,color:'green'},
      ];
      break;
    case 'cannon':
      // 左右是普通移动；向上画"隔子吃"：炮架 + 红圈目标
      spec.arrows = [{c:2,r:2,toc:0,tor:2,color:'green'},{c:2,r:2,toc:4,tor:2,color:'green'}];
      spec.ghosts = [{c:2,r:1}];
      spec.captures = [{c:2,r:0}];
      break;
    case 'pawn':
      spec.arrows = [{c:2,r:2,toc:2,tor:1,color:'green'}];
      spec.dots = [{c:1,r:2},{c:3,r:2}];
      break;
  }
  return miniBoardSVG(spec);
}

/* ----------------- 渲染 ----------------- */

class XiangqiBoard {
  /* container: DOM 元素；options.interactive: 是否允许走子 */
  constructor(container, options = {}) {
    this.container = container;
    this.interactive = options.interactive !== false;
    this.onSelect = options.onSelect || null;   // 选中棋子回调（用于显示介绍）
    this.board = JSON.parse(JSON.stringify(START_BOARD));
    this.selected = null;     // {c, r}
    this.highlights = [];      // 合法走法
    this.render();
  }

  reset() {
    this.board = JSON.parse(JSON.stringify(START_BOARD));
    this.selected = null;
    this.highlights = [];
    this.render();
  }

  /* 只放一个棋子用于单独教学：clear 后放置 */
  setSingle(code, c, r) {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.board[r][c] = code;
    this.selected = { c, r };
    this.highlights = legalMoves(this.board, c, r);
    this.render();
    if (this.onSelect) this.onSelect(code);
  }

  handleCell(c, r) {
    if (!this.interactive) return;
    const code = this.board[r][c];

    // 已选中且点击的是高亮目标 → 移动
    if (this.selected) {
      const target = this.highlights.find(m => m.c === c && m.r === r);
      if (target) {
        this.board[r][c] = this.board[this.selected.r][this.selected.c];
        this.board[this.selected.r][this.selected.c] = null;
        this.selected = null;
        this.highlights = [];
        this.render();
        return;
      }
    }

    // 点击己方棋子 → 选中并显示走法
    if (code) {
      this.selected = { c, r };
      this.highlights = legalMoves(this.board, c, r);
      this.render();
      if (this.onSelect) this.onSelect(code);
      return;
    }

    // 点击空格 → 取消选择
    this.selected = null;
    this.highlights = [];
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const board = document.createElement('div');
    board.className = 'xq-board';

    // 河界文字
    const river = document.createElement('div');
    river.className = 'xq-river';
    river.innerHTML = '<span>楚 河</span><span>汉 界</span>';
    board.appendChild(river);

    // 九宫格斜线（上、下两个）。位置用格子中心坐标定位。
    [{ row: 0 }, { row: 7 }].forEach(p => {
      const palace = document.createElement('div');
      palace.className = 'xq-palace';
      palace.style.left = 'calc(var(--cell) * 3.5)';
      palace.style.top = `calc(var(--cell) * ${p.row + 0.5})`;
      palace.style.width = 'calc(var(--cell) * 2)';
      palace.style.height = 'calc(var(--cell) * 2)';
      board.appendChild(palace);
    });

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'xq-cell';
        cell.style.gridColumn = c + 1;
        cell.style.gridRow = r + 1;

        const code = this.board[r][c];
        const hl = this.highlights.find(m => m.c === c && m.r === r);

        if (code) {
          const p = document.createElement('div');
          const piece = PIECES[code];
          p.className = `xq-piece ${piece.side}`;
          if (this.selected && this.selected.c === c && this.selected.r === r) {
            p.classList.add('selected');
          }
          if (hl && hl.capture) p.classList.add('can-capture');
          p.textContent = piece.name;
          cell.appendChild(p);
        } else if (hl) {
          const dot = document.createElement('div');
          dot.className = 'xq-dot';
          cell.appendChild(dot);
        }

        cell.addEventListener('click', () => this.handleCell(c, r));
        board.appendChild(cell);
      }
    }

    this.container.appendChild(board);
  }
}
