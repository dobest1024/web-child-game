/* ===========================================================
   main.js —— 页面逻辑：导航、各个课程板块的渲染、互动
   =========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  buildPieces();
  buildPlayground();
  buildLevels();
  buildTactics();
  buildMind();
  buildThink();
  buildQuiz();
});

/* ---------- 顶部导航：点击切换板块 ---------- */
function setupNav() {
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  function show(id) {
    sections.forEach(s => s.classList.toggle('active', s.id === id));
    links.forEach(l => l.classList.toggle('active', l.dataset.target === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  links.forEach(l => l.addEventListener('click', e => {
    e.preventDefault();
    show(l.dataset.target);
  }));

  // “开始学习”按钮
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.addEventListener('click', () => show('pieces'));

  show('home');
}

/* ---------- 板块：认识棋子（点击卡片，棋盘演示走法） ---------- */
function buildPieces() {
  const grid = document.getElementById('piece-grid');
  const boardBox = document.getElementById('piece-board');
  const info = document.getElementById('piece-info');

  const board = new XiangqiBoard(boardBox, {
    interactive: true,
    onSelect: code => showPieceInfo(info, code),
  });

  // 只展示红方 7 种棋子（黑方走法一样）
  const demo = [
    { code: 'R_R', c: 4, r: 5 },
    { code: 'R_H', c: 4, r: 5 },
    { code: 'R_C', c: 4, r: 5 },
    { code: 'R_E', c: 2, r: 9 },
    { code: 'R_A', c: 4, r: 8 },
    { code: 'R_P', c: 4, r: 4 },
    { code: 'R_K', c: 4, r: 8 },
  ];

  demo.forEach(d => {
    const piece = PIECES[d.code];
    const card = document.createElement('button');
    card.className = `piece-card ${piece.side}`;
    card.innerHTML = `<span class="pc-py">${piece.py}</span><span class="pc-char">${piece.name}</span><span class="pc-nick">${piece.nick}</span>`;
    card.addEventListener('click', () => {
      board.setSingle(d.code, d.c, d.r);
      document.querySelectorAll('.piece-card').forEach(x => x.classList.remove('on'));
      card.classList.add('on');
    });
    grid.appendChild(card);
  });

  // 默认展示车
  board.setSingle('R_R', 4, 5);
  grid.firstChild.classList.add('on');
}

function showPieceInfo(info, code) {
  const p = PIECES[code];
  info.innerHTML = `
    <div class="pi-head"><span class="pi-char ${p.side}">${p.name}</span>
      <div><h3><span class="pi-py">${p.py}</span> ${p.name}（${p.nick}）</h3>
        <p class="pi-shape">👉 ${p.shape}</p></div>
    </div>
    <p class="pi-desc">${p.desc}</p>
    <div class="pi-diagram">
      <div class="pi-dia-svg">${pieceMoveSVG(code)}</div>
      <p class="pi-dia-tip">🟢 绿点/绿箭头 = 能走的地方　🔴 红圈 = 能吃的子${p.kind==='cannon'?'　⚪ 灰子 = 炮架':''}</p>
    </div>`;
}

/* ---------- 板块：自由练习棋盘（完整开局，可自己走） ---------- */
function buildPlayground() {
  const boardBox = document.getElementById('play-board');
  const board = new XiangqiBoard(boardBox, { interactive: true });
  document.getElementById('play-reset').addEventListener('click', () => board.reset());
}

/* ---------- 板块：进阶之路（台阶卡片） ---------- */
function buildLevels() {
  const wrap = document.getElementById('levels-wrap');
  LEVELS.forEach((lv, i) => {
    const card = document.createElement('div');
    card.className = 'level-card';
    card.innerHTML = `
      <div class="lv-top"><span class="lv-star">${lv.star}</span>
        <h3>${lv.title}</h3></div>
      <p class="lv-goal">🎯 目标：${lv.goal}</p>
      <ul class="lv-tasks">${lv.tasks.map(t => `<li>${t}</li>`).join('')}</ul>`;
    wrap.appendChild(card);
  });
}

/* ---------- 板块：战法 ---------- */
function buildTactics() {
  const wrap = document.getElementById('tactics-wrap');
  TACTICS.forEach(t => {
    const card = document.createElement('div');
    card.className = 'info-card tactic-card';
    card.innerHTML = `
      <div class="ic-icon">${t.icon}</div>
      <h3>${t.name}</h3>
      <div class="tactic-dia">${miniBoardSVG(t.diagram)}<span class="dia-label">示意图</span></div>
      <p>${t.text}</p>`;
    wrap.appendChild(card);
  });
}

/* ---------- 板块：心理 ---------- */
function buildMind() {
  const wrap = document.getElementById('mind-wrap');
  MIND.forEach(m => {
    const card = document.createElement('div');
    card.className = 'info-card';
    card.innerHTML = `<div class="ic-icon">${m.icon}</div><h3>${m.title}</h3><p>${m.text}</p>`;
    wrap.appendChild(card);
  });
}

/* ---------- 板块：思考方法（每步问自己 4 个问题） ---------- */
function buildThink() {
  const wrap = document.getElementById('think-wrap');
  THINK_STEPS.forEach(s => {
    const card = document.createElement('div');
    card.className = 'think-card';
    card.innerHTML = `
      <div class="tk-num">${s.num}</div>
      <div class="tk-body"><h3>${s.q}</h3><p>${s.tip}</p></div>`;
    wrap.appendChild(card);
  });
}

/* ---------- 板块：趣味问答 ---------- */
function buildQuiz() {
  const wrap = document.getElementById('quiz-wrap');
  const scoreBox = document.getElementById('quiz-score');
  let score = 0;
  let answered = 0;

  QUIZ.forEach((q, qi) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    const opts = q.options.map((o, oi) =>
      `<button class="quiz-opt" data-q="${qi}" data-o="${oi}">${o}</button>`).join('');
    card.innerHTML = `
      <h3>🤔 ${q.q}</h3>
      <div class="quiz-opts">${opts}</div>
      <p class="quiz-feedback" id="qf-${qi}"></p>`;
    wrap.appendChild(card);
  });

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.quiz-opt');
    if (!btn) return;
    const qi = +btn.dataset.q;
    const oi = +btn.dataset.o;
    const card = btn.closest('.quiz-card');
    if (card.classList.contains('done')) return; // 每题只答一次

    const q = QUIZ[qi];
    const fb = document.getElementById(`qf-${qi}`);
    card.classList.add('done');
    card.querySelectorAll('.quiz-opt').forEach((b, i) => {
      b.disabled = true;
      if (i === q.answer) b.classList.add('correct');
    });

    if (oi === q.answer) {
      btn.classList.add('correct');
      fb.textContent = '✅ ' + q.yes;
      fb.className = 'quiz-feedback ok';
      score++;
    } else {
      btn.classList.add('wrong');
      fb.textContent = '❌ ' + q.no;
      fb.className = 'quiz-feedback bad';
    }

    answered++;
    if (answered === QUIZ.length) {
      scoreBox.textContent = `🎉 全部答完啦！你答对了 ${score} / ${QUIZ.length} 题，真厉害！`;
      scoreBox.classList.add('show');
    }
  });
}
