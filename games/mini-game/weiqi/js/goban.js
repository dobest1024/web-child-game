/*
 * goban.js — 轻量级围棋棋盘渲染器
 * 用法：在 HTML 中写 <div class="goban" data-size="9" data-stones="B:dd,jj W:dj,jd" ...></div>
 * 页面加载后自动渲染为 SVG 棋盘。坐标用字母 a-s 表示 1-19 列/行（左下角为 a，aa=左下）。
 * 为了对 6 岁小朋友友好，这里统一用「列字母+行字母」的小写坐标，例如 "ee" 表示第5列第5行。
 *
 * 支持的 data 属性：
 *   data-size      棋盘大小：9 / 13 / 19（默认 9）
 *   data-stones    棋子："B:坐标,坐标 W:坐标,坐标"
 *   data-marks     标记："△:坐标 □:坐标 ○:坐标 ×:坐标"（用于讲解：三角/方/圆/叉）
 *   data-labels    文字标签："A:坐标 1:坐标"（在交叉点上写字/数字）
 *   data-moves     带序号的着法："B:dd W:dj B:gg"（按顺序编号 1,2,3…，黑白交替显示在棋子上）
 *   data-last      标出最后一手（红点）："dd"
 *   data-caption   图注（显示在棋盘下方）
 */
(function () {
  'use strict';

  // 把坐标字母转成 0..size-1 的索引。a=0,b=1...
  function charToIndex(c) {
    return c.charCodeAt(0) - 97;
  }

  // 解析 "dd" -> {x:3, y:3}（x=列, y=行，0 起）
  function parseCoord(str) {
    return { x: charToIndex(str[0]), y: charToIndex(str[1]) };
  }

  // 解析 "B:dd,jj W:dj" -> {B:[...], W:[...]}
  function parseGroups(spec) {
    var result = {};
    if (!spec) return result;
    spec.trim().split(/\s+/).forEach(function (token) {
      var idx = token.indexOf(':');
      if (idx < 0) return;
      var key = token.slice(0, idx);
      var coords = token.slice(idx + 1).split(',').filter(Boolean);
      result[key] = coords;
    });
    return result;
  }

  // 标准星位
  var STAR_POINTS = {
    9: [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]],
    13: [[3, 3], [9, 3], [3, 9], [9, 9], [6, 6]],
    19: [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]]
  };

  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(SVGNS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function render(container) {
    var size = parseInt(container.getAttribute('data-size') || '9', 10);
    var stones = parseGroups(container.getAttribute('data-stones'));
    var marks = parseGroups(container.getAttribute('data-marks'));
    var labels = parseGroups(container.getAttribute('data-labels'));
    var lastMove = container.getAttribute('data-last');
    var movesSpec = container.getAttribute('data-moves');
    var caption = container.getAttribute('data-caption');

    var pad = 26;          // 边距
    var cell = 40;         // 格子间距
    var boardPx = pad * 2 + cell * (size - 1);

    var svg = el('svg', {
      viewBox: '0 0 ' + boardPx + ' ' + boardPx,
      class: 'goban-svg',
      role: 'img'
    });

    // 木色底板
    svg.appendChild(el('rect', { x: 0, y: 0, width: boardPx, height: boardPx, rx: 8, fill: '#e9b96e' }));

    // 注意：围棋习惯左下角为原点向上，这里把 y 翻转，让 data 里的行字母从下往上数，更符合棋谱直觉。
    function px(x, y) {
      return { cx: pad + x * cell, cy: pad + (size - 1 - y) * cell };
    }

    // 网格线
    for (var i = 0; i < size; i++) {
      var a = px(i, 0), b = px(i, size - 1);
      svg.appendChild(el('line', { x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, stroke: '#5b3a1a', 'stroke-width': 1.4 }));
      var c = px(0, i), d = px(size - 1, i);
      svg.appendChild(el('line', { x1: c.cx, y1: c.cy, x2: d.cx, y2: d.cy, stroke: '#5b3a1a', 'stroke-width': 1.4 }));
    }

    // 星位
    (STAR_POINTS[size] || []).forEach(function (p) {
      var pt = px(p[0], p[1]);
      svg.appendChild(el('circle', { cx: pt.cx, cy: pt.cy, r: 3.6, fill: '#5b3a1a' }));
    });

    // 占位记录：用于把 marks/labels 画在棋子之上
    var stoneColorAt = {};

    function drawStone(coord, color, label, isLast) {
      var p = parseCoord(coord);
      var pt = px(p.x, p.y);
      stoneColorAt[coord] = color;
      var grad = color === 'B' ? 'url(#bGrad)' : 'url(#wGrad)';
      svg.appendChild(el('circle', {
        cx: pt.cx, cy: pt.cy, r: cell * 0.46,
        fill: grad, stroke: color === 'B' ? '#000' : '#777', 'stroke-width': 0.8
      }));
      if (label) {
        var t = el('text', {
          x: pt.cx, y: pt.cy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': cell * 0.46, 'font-weight': '700',
          fill: color === 'B' ? '#fff' : '#111', 'font-family': 'sans-serif'
        });
        t.textContent = label;
        svg.appendChild(t);
      }
      if (isLast) {
        svg.appendChild(el('circle', { cx: pt.cx, cy: pt.cy, r: cell * 0.16, fill: 'none', stroke: '#e03030', 'stroke-width': 2.5 }));
      }
    }

    // 渐变定义（让棋子有立体感）
    var defs = el('defs', {});
    defs.innerHTML =
      '<radialGradient id="bGrad" cx="38%" cy="32%" r="75%">' +
      '<stop offset="0%" stop-color="#777"/><stop offset="45%" stop-color="#222"/><stop offset="100%" stop-color="#000"/></radialGradient>' +
      '<radialGradient id="wGrad" cx="38%" cy="32%" r="80%">' +
      '<stop offset="0%" stop-color="#fff"/><stop offset="70%" stop-color="#f2f2f2"/><stop offset="100%" stop-color="#cfcfcf"/></radialGradient>';
    svg.appendChild(defs);

    // 1) 普通棋子
    ['B', 'W'].forEach(function (color) {
      (stones[color] || []).forEach(function (coord) {
        drawStone(coord, color, null, coord === lastMove);
      });
    });

    // 2) 带序号的着法
    if (movesSpec) {
      var moveTokens = movesSpec.trim().split(/\s+/);
      moveTokens.forEach(function (token, i) {
        var idx = token.indexOf(':');
        var color = token.slice(0, idx);
        var coord = token.slice(idx + 1);
        drawStone(coord, color, String(i + 1), false);
      });
    }

    // 3) 标记符号
    var MARK_DRAW = {
      '△': function (pt, color) {
        var r = cell * 0.26, s = color === 'W' ? '#111' : '#fff';
        var pts = [
          [pt.cx, pt.cy - r],
          [pt.cx - r * 0.87, pt.cy + r * 0.5],
          [pt.cx + r * 0.87, pt.cy + r * 0.5]
        ].map(function (p) { return p.join(','); }).join(' ');
        svg.appendChild(el('polygon', { points: pts, fill: 'none', stroke: s, 'stroke-width': 2.5 }));
      },
      '□': function (pt, color) {
        var r = cell * 0.24, s = color === 'W' ? '#111' : '#fff';
        svg.appendChild(el('rect', { x: pt.cx - r, y: pt.cy - r, width: r * 2, height: r * 2, fill: 'none', stroke: s, 'stroke-width': 2.5 }));
      },
      '○': function (pt, color) {
        var s = color === 'W' ? '#111' : '#fff';
        svg.appendChild(el('circle', { cx: pt.cx, cy: pt.cy, r: cell * 0.26, fill: 'none', stroke: s, 'stroke-width': 2.5 }));
      },
      '×': function (pt, color) {
        var r = cell * 0.24, s = color === 'W' ? '#c01010' : '#e03030';
        svg.appendChild(el('line', { x1: pt.cx - r, y1: pt.cy - r, x2: pt.cx + r, y2: pt.cy + r, stroke: s, 'stroke-width': 3 }));
        svg.appendChild(el('line', { x1: pt.cx - r, y1: pt.cy + r, x2: pt.cx + r, y2: pt.cy - r, stroke: s, 'stroke-width': 3 }));
      }
    };
    Object.keys(marks).forEach(function (symbol) {
      (marks[symbol] || []).forEach(function (coord) {
        var p = parseCoord(coord);
        var pt = px(p.x, p.y);
        var color = stoneColorAt[coord]; // 在空点上画时 color 为 undefined
        if (color === undefined && (symbol === '△' || symbol === '□' || symbol === '○')) {
          // 空点上的标记加个白底圈，避免和网格线混淆
          svg.appendChild(el('circle', { cx: pt.cx, cy: pt.cy, r: cell * 0.3, fill: '#e9b96e' }));
        }
        (MARK_DRAW[symbol] || function () {})(pt, color === 'B' ? 'B' : 'W');
      });
    });

    // 4) 文字标签（多写在空点上）
    Object.keys(labels).forEach(function (text) {
      (labels[text] || []).forEach(function (coord) {
        var p = parseCoord(coord);
        var pt = px(p.x, p.y);
        var onStone = stoneColorAt[coord];
        if (!onStone) {
          svg.appendChild(el('circle', { cx: pt.cx, cy: pt.cy, r: cell * 0.32, fill: '#e9b96e' }));
        }
        var t = el('text', {
          x: pt.cx, y: pt.cy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': cell * 0.42, 'font-weight': '700',
          fill: onStone === 'B' ? '#fff' : '#1a4', 'font-family': 'sans-serif'
        });
        t.textContent = text;
        svg.appendChild(t);
      });
    });

    container.innerHTML = '';
    container.appendChild(svg);

    if (caption) {
      var cap = document.createElement('div');
      cap.className = 'goban-caption';
      cap.textContent = caption;
      container.appendChild(cap);
    }
  }

  function renderAll() {
    var nodes = document.querySelectorAll('.goban');
    Array.prototype.forEach.call(nodes, render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }

  window.Goban = { renderAll: renderAll, render: render };
})();
