/*
 * play.js — 可点击的小棋盘，真实实现「气 / 提子 / 禁着点 / 打劫」规则。
 * 让小朋友亲手落子，亲眼看到没气的棋子被提走。
 * 用法：<div id="play" data-size="9"></div> + 控制按钮（见 練習場 页面）。
 */
(function () {
  'use strict';

  function createBoard(rootId, size) {
    var root = document.getElementById(rootId);
    if (!root) return;
    size = size || 9;

    var EMPTY = 0, BLACK = 1, WHITE = 2;
    var board, turn, history, captures, koPoint;

    function reset() {
      board = [];
      for (var i = 0; i < size * size; i++) board.push(EMPTY);
      turn = BLACK;
      history = [];
      captures = { 1: 0, 2: 0 };
      koPoint = -1;
      draw();
      updateStatus();
    }

    function idx(x, y) { return y * size + x; }
    function inBounds(x, y) { return x >= 0 && x < size && y >= 0 && y < size; }

    function neighbors(i) {
      var x = i % size, y = Math.floor(i / size), out = [];
      if (inBounds(x - 1, y)) out.push(idx(x - 1, y));
      if (inBounds(x + 1, y)) out.push(idx(x + 1, y));
      if (inBounds(x, y - 1)) out.push(idx(x, y - 1));
      if (inBounds(x, y + 1)) out.push(idx(x, y + 1));
      return out;
    }

    // 返回某个棋串的所有点和它的气数
    function groupInfo(start, brd) {
      var color = brd[start];
      var seen = {}, stack = [start], stones = [], liberties = {};
      seen[start] = true;
      while (stack.length) {
        var cur = stack.pop();
        stones.push(cur);
        neighbors(cur).forEach(function (n) {
          if (brd[n] === EMPTY) liberties[n] = true;
          else if (brd[n] === color && !seen[n]) { seen[n] = true; stack.push(n); }
        });
      }
      return { stones: stones, libs: Object.keys(liberties).length };
    }

    function tryPlay(i) {
      if (board[i] !== EMPTY) return false;
      if (i === koPoint) { flash('这里现在不能下哦，要先在别处走一手（打劫规则）'); return false; }

      var color = turn;
      var opp = color === BLACK ? WHITE : BLACK;
      var test = board.slice();
      test[i] = color;

      // 先提掉对方没气的棋串
      var capturedStones = [];
      neighbors(i).forEach(function (n) {
        if (test[n] === opp) {
          var g = groupInfo(n, test);
          if (g.libs === 0) g.stones.forEach(function (s) {
            if (capturedStones.indexOf(s) < 0) capturedStones.push(s);
          });
        }
      });
      capturedStones.forEach(function (s) { test[s] = EMPTY; });

      // 自己这串还有没有气？没有就是自杀，不允许
      var mine = groupInfo(i, test);
      if (mine.libs === 0 && capturedStones.length === 0) {
        flash('这里下了就没有气啦，不能自杀～');
        return false;
      }

      // 打劫判定：只提掉一颗、且自己也只剩这一口气、回提会还原 —— 标记 ko 点
      var newKo = -1;
      if (capturedStones.length === 1 && mine.stones.length === 1 && mine.libs === 1) {
        newKo = capturedStones[0];
      }

      history.push({ board: board.slice(), turn: turn, captures: { 1: captures[1], 2: captures[2] }, ko: koPoint });
      board = test;
      captures[color] += capturedStones.length;
      koPoint = newKo;
      turn = opp;
      draw();
      updateStatus();
      return true;
    }

    function pass() {
      history.push({ board: board.slice(), turn: turn, captures: { 1: captures[1], 2: captures[2] }, ko: koPoint });
      turn = turn === BLACK ? WHITE : BLACK;
      koPoint = -1;
      updateStatus();
    }

    function undo() {
      if (!history.length) return;
      var h = history.pop();
      board = h.board; turn = h.turn; captures = h.captures; koPoint = h.ko;
      draw();
      updateStatus();
    }

    // ---- 渲染 ----
    var SVGNS = 'http://www.w3.org/2000/svg';
    var pad = 24, cell = 42, boardPx = pad * 2 + cell * (size - 1);

    function flashMsg(text) { /* replaced below */ }
    var msgEl = null;
    function flash(text) {
      if (!msgEl) return;
      msgEl.textContent = text;
      msgEl.classList.add('show');
      clearTimeout(flash._t);
      flash._t = setTimeout(function () { msgEl.classList.remove('show'); }, 2200);
    }

    function draw() {
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + boardPx + ' ' + boardPx);
      svg.setAttribute('class', 'play-svg');

      var rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('width', boardPx); rect.setAttribute('height', boardPx);
      rect.setAttribute('rx', 8); rect.setAttribute('fill', '#e9b96e');
      svg.appendChild(rect);

      for (var i = 0; i < size; i++) {
        line(svg, pad + i * cell, pad, pad + i * cell, pad + (size - 1) * cell);
        line(svg, pad, pad + i * cell, pad + (size - 1) * cell, pad + i * cell);
      }
      var stars = { 9: [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]], 13: [[3, 3], [9, 3], [3, 9], [9, 9], [6, 6]], 19: [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]] }[size] || [];
      stars.forEach(function (s) { dot(svg, pad + s[0] * cell, pad + s[1] * cell, 3.5, '#5b3a1a'); });

      for (var p = 0; p < board.length; p++) {
        var x = p % size, y = Math.floor(p / size);
        var cx = pad + x * cell, cy = pad + y * cell;
        if (board[p] !== EMPTY) {
          var c = document.createElementNS(SVGNS, 'circle');
          c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', cell * 0.45);
          c.setAttribute('fill', board[p] === BLACK ? 'url(#pbG)' : 'url(#pwG)');
          c.setAttribute('stroke', board[p] === BLACK ? '#000' : '#888');
          svg.appendChild(c);
        }
        // 透明热区，方便点击
        var hit = document.createElementNS(SVGNS, 'rect');
        hit.setAttribute('x', cx - cell / 2); hit.setAttribute('y', cy - cell / 2);
        hit.setAttribute('width', cell); hit.setAttribute('height', cell);
        hit.setAttribute('fill', 'transparent'); hit.style.cursor = 'pointer';
        (function (point) { hit.addEventListener('click', function () { tryPlay(point); }); })(p);
        svg.appendChild(hit);
      }

      var defs = document.createElementNS(SVGNS, 'defs');
      defs.innerHTML = '<radialGradient id="pbG" cx="38%" cy="32%" r="75%"><stop offset="0%" stop-color="#777"/><stop offset="45%" stop-color="#222"/><stop offset="100%" stop-color="#000"/></radialGradient><radialGradient id="pwG" cx="38%" cy="32%" r="80%"><stop offset="0%" stop-color="#fff"/><stop offset="70%" stop-color="#f2f2f2"/><stop offset="100%" stop-color="#cfcfcf"/></radialGradient>';
      svg.appendChild(defs);

      var holder = root.querySelector('.play-board');
      holder.innerHTML = '';
      holder.appendChild(svg);
    }

    function line(svg, x1, y1, x2, y2) {
      var l = document.createElementNS(SVGNS, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('stroke', '#5b3a1a'); l.setAttribute('stroke-width', 1.4);
      svg.appendChild(l);
    }
    function dot(svg, cx, cy, r, fill) {
      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r); c.setAttribute('fill', fill);
      svg.appendChild(c);
    }

    function updateStatus() {
      var t = root.querySelector('.play-turn');
      if (t) t.innerHTML = '轮到：<b>' + (turn === BLACK ? '⚫ 黑棋' : '⚪ 白棋') + '</b>';
      var cap = root.querySelector('.play-caps');
      if (cap) cap.textContent = '黑提 ' + captures[BLACK] + ' 子 ｜ 白提 ' + captures[WHITE] + ' 子';
    }

    // 构建结构
    root.innerHTML =
      '<div class="play-board"></div>' +
      '<div class="play-msg"></div>' +
      '<div class="play-bar">' +
      '<span class="play-turn"></span>' +
      '<span class="play-caps"></span>' +
      '</div>' +
      '<div class="play-buttons">' +
      '<button data-act="undo">↩ 悔棋</button>' +
      '<button data-act="pass">⤳ 停一手</button>' +
      '<button data-act="reset">🗑 清空重来</button>' +
      '</div>';
    msgEl = root.querySelector('.play-msg');
    root.querySelector('[data-act="undo"]').addEventListener('click', undo);
    root.querySelector('[data-act="pass"]').addEventListener('click', pass);
    root.querySelector('[data-act="reset"]').addEventListener('click', reset);

    reset();
  }

  window.GoPlay = { create: createBoard };

  document.addEventListener('DOMContentLoaded', function () {
    var nodes = document.querySelectorAll('[data-play]');
    Array.prototype.forEach.call(nodes, function (n) {
      createBoard(n.id, parseInt(n.getAttribute('data-size') || '9', 10));
    });
  });
})();
