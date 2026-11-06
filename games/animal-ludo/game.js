import {
  PLAYERS,
  createInitialState,
  rollDice,
  getMovablePawns,
  movePawn,
  chooseAiMove,
  sanitizeProgress,
} from './engine.js';
import { sound } from './audio.js';

const STORAGE_KEY = 'animal-ludo:progress';

// 24 track coordinates on 7x7 grid: { r, c, color }
export const TRACK_CELLS = [
  { r: 0, c: 3, color: '#fee2e2' }, // 0: Red Start
  { r: 0, c: 4, color: '#fef9c3' }, // 1
  { r: 1, c: 4, color: '#dcfce7' }, // 2
  { r: 2, c: 4, color: '#dbeafe' }, // 3
  { r: 2, c: 5, color: '#fee2e2' }, // 4
  { r: 2, c: 6, color: '#fef9c3' }, // 5
  { r: 3, c: 6, color: '#fef9c3' }, // 6: Yellow Start
  { r: 4, c: 6, color: '#dcfce7' }, // 7
  { r: 4, c: 5, color: '#dbeafe' }, // 8
  { r: 4, c: 4, color: '#fee2e2' }, // 9
  { r: 5, c: 4, color: '#fef9c3' }, // 10
  { r: 6, c: 4, color: '#dcfce7' }, // 11
  { r: 6, c: 3, color: '#dcfce7' }, // 12: Green Start
  { r: 6, c: 2, color: '#dbeafe' }, // 13
  { r: 5, c: 2, color: '#fee2e2' }, // 14
  { r: 4, c: 2, color: '#fef9c3' }, // 15
  { r: 4, c: 1, color: '#dcfce7' }, // 16
  { r: 4, c: 0, color: '#dbeafe' }, // 17
  { r: 3, c: 0, color: '#dbeafe' }, // 18: Blue Start
  { r: 2, c: 0, color: '#fee2e2' }, // 19
  { r: 2, c: 1, color: '#fef9c3' }, // 20
  { r: 2, c: 2, color: '#dcfce7' }, // 21
  { r: 1, c: 2, color: '#dbeafe' }, // 22
  { r: 0, c: 2, color: '#fee2e2' }, // 23
];

// Runways for 4 players leading to (3, 3)
export const RUNWAY_CELLS = {
  0: [{ r: 1, c: 3 }, { r: 2, c: 3 }], // Red down
  1: [{ r: 3, c: 5 }, { r: 3, c: 4 }], // Yellow left
  2: [{ r: 5, c: 3 }, { r: 4, c: 3 }], // Green up
  3: [{ r: 3, c: 1 }, { r: 3, c: 2 }], // Blue right
};

let state = createInitialState(4, [false, true, true, true]);
let progress = { wins: 0, gamesPlayed: 0 };
let isProcessingTurn = false;

const $ = (s) => document.querySelector(s);
const boardEl = $('#board');
const diceBtn = $('#dice-btn');

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    progress = sanitizeProgress(raw);
  } catch {
    progress = { wins: 0, gamesPlayed: 0 };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

function initGame() {
  state = createInitialState(4, [false, true, true, true]);
  isProcessingTurn = false;
  renderBoard();
  renderStatus();
}

function renderBoard() {
  boardEl.innerHTML = '';

  // 4 Hangars
  const hangars = [
    { p: 0, class: 'red', name: '兔跳跳 (你)' },
    { p: 1, class: 'yellow', name: '狐闪闪 (电脑)' },
    { p: 3, class: 'blue', name: '熊大力 (电脑)' },
    { p: 2, class: 'green', name: '蛙呱呱 (电脑)' },
  ];

  hangars.forEach((h) => {
    const box = document.createElement('div');
    box.className = `hangar-box ${h.class}`;
    box.id = `hangar-${h.p}`;
    box.innerHTML = `<span style="font-size:0.75rem; font-weight:700">${h.name}</span><div class="hangar-pawns" style="display:flex;gap:6px"></div>`;
    boardEl.appendChild(box);
  });

  // Center Goal
  const goal = document.createElement('div');
  goal.className = 'goal-center';
  goal.id = 'cell-goal';
  goal.innerHTML = '🏆';
  boardEl.appendChild(goal);

  // Track cells
  TRACK_CELLS.forEach((c, idx) => {
    const cell = document.createElement('div');
    cell.className = 'board-cell';
    cell.id = `track-${idx}`;
    cell.style.gridRow = c.r + 1;
    cell.style.gridColumn = c.c + 1;
    cell.style.backgroundColor = c.color;
    cell.style.border = '1px solid #cbd5e1';
    boardEl.appendChild(cell);
  });

  // Runways
  Object.entries(RUNWAY_CELLS).forEach(([pStr, cells]) => {
    const p = parseInt(pStr, 10);
    const color = PLAYERS[p].color;
    cells.forEach((c, step) => {
      const cell = document.createElement('div');
      cell.className = 'board-cell runway-cell';
      cell.id = `runway-${p}-${step}`;
      cell.style.gridRow = c.r + 1;
      cell.style.gridColumn = c.c + 1;
      cell.style.backgroundColor = color + '33'; // 20% opacity
      cell.style.border = `2px solid ${color}`;
      boardEl.appendChild(cell);
    });
  });

  renderPawns();
}

function renderPawns() {
  // Clear any existing pawn tokens inside cells
  boardEl.querySelectorAll('.pawn-token').forEach((el) => el.remove());

  const activeMovable = state.hasRolled && !state.isAi[state.activePlayer]
    ? getMovablePawns(state, state.diceValue).map((p) => p.id)
    : [];

  state.pawns.forEach((pawn) => {
    const player = PLAYERS[pawn.player];
    const token = document.createElement('div');
    token.className = 'pawn-token';
    token.textContent = player.animal;
    token.style.backgroundColor = player.color;
    token.dataset.id = pawn.id;

    if (activeMovable.includes(pawn.id)) {
      token.classList.add('movable');
      token.addEventListener('click', () => {
        handlePawnClick(pawn.id);
      });
    }

    // Attach to correct DOM container
    if (pawn.state === 'hangar') {
      const hangarPawns = $(`#hangar-${pawn.player} .hangar-pawns`);
      if (hangarPawns) hangarPawns.appendChild(token);
    } else if (pawn.state === 'track') {
      const cell = $(`#track-${pawn.trackPos}`);
      if (cell) cell.appendChild(token);
    } else if (pawn.state === 'runway') {
      const cell = $(`#runway-${pawn.player}-${pawn.runwayPos}`);
      if (cell) cell.appendChild(token);
    } else if (pawn.state === 'goal') {
      const goal = $('#cell-goal');
      if (goal) goal.appendChild(token);
    }
  });
}

function renderStatus() {
  const player = PLAYERS[state.activePlayer];
  $('#turn-indicator').textContent = `${player.animal} ${player.name} 的回合`;
  $('#player-dot').style.backgroundColor = player.color;

  if (state.winner !== null) {
    const winPlayer = PLAYERS[state.winner];
    $('#turn-indicator').textContent = `🏆 ${winPlayer.animal} ${winPlayer.name} 获胜！`;
    diceBtn.disabled = true;
    return;
  }

  const isHuman = !state.isAi[state.activePlayer];
  if (isHuman) {
    diceBtn.disabled = state.hasRolled;
    diceBtn.style.display = 'flex';
  } else {
    diceBtn.disabled = true;
  }
}

// Human Dice Roll
diceBtn.addEventListener('click', () => {
  if (state.hasRolled || isProcessingTurn || state.isAi[state.activePlayer]) return;
  triggerRoll();
});

function triggerRoll() {
  sound.roll();
  diceBtn.classList.add('rolling');
  isProcessingTurn = true;

  setTimeout(() => {
    diceBtn.classList.remove('rolling');
    const val = rollDice();
    state.diceValue = val;
    state.hasRolled = true;
    diceBtn.textContent = val;

    const movable = getMovablePawns(state, val);
    renderPawns();
    renderStatus();

    if (movable.length === 0) {
      // No move available, pass turn
      setTimeout(() => {
        passTurn();
      }, 700);
    } else if (movable.length === 1 && !state.isAi[state.activePlayer]) {
      // Auto move single pawn for faster child UX
      setTimeout(() => {
        handlePawnClick(movable[0].id);
      }, 350);
    } else {
      isProcessingTurn = false;
    }
  }, 400);
}

function handlePawnClick(pawnId) {
  if (!state.hasRolled) return;
  const res = movePawn(state, pawnId, state.diceValue);
  if (!res.success) return;

  state = res.state;
  if (res.knockedPawn) sound.knock();
  else sound.step();

  renderPawns();
  renderStatus();

  if (state.winner !== null) {
    sound.win();
    progress.gamesPlayed++;
    if (state.winner === 0) progress.wins++;
    saveProgress();
    $('#winner-text').textContent = `恭喜 ${PLAYERS[state.winner].animal} ${PLAYERS[state.winner].name} 率先起飞抵达终点！`;
    $('#win-dialog').showModal();
    return;
  }

  isProcessingTurn = false;
  checkNextTurn();
}

function passTurn() {
  const extra = state.diceValue === 6;
  state.activePlayer = extra ? state.activePlayer : (state.activePlayer + 1) % state.playerCount;
  state.diceValue = null;
  state.hasRolled = false;
  isProcessingTurn = false;
  renderStatus();
  renderPawns();
  checkNextTurn();
}

function checkNextTurn() {
  if (state.winner !== null) return;
  if (state.isAi[state.activePlayer]) {
    // Run AI turn
    runAiTurn();
  } else {
    diceBtn.textContent = '🎲';
    renderStatus();
  }
}

function runAiTurn() {
  if (isProcessingTurn) return;
  isProcessingTurn = true;
  renderStatus();

  setTimeout(() => {
    sound.roll();
    const val = rollDice();
    state.diceValue = val;
    state.hasRolled = true;
    diceBtn.textContent = val;
    renderStatus();

    setTimeout(() => {
      const bestPawnId = chooseAiMove(state, val);
      if (bestPawnId) {
        const res = movePawn(state, bestPawnId, val);
        state = res.state;
        if (res.knockedPawn) sound.knock();
        else sound.step();
        renderPawns();
        renderStatus();

        if (state.winner !== null) {
          sound.win();
          progress.gamesPlayed++;
          saveProgress();
          $('#winner-text').textContent = `${PLAYERS[state.winner].animal} ${PLAYERS[state.winner].name} 赢得本局胜利！`;
          $('#win-dialog').showModal();
          return;
        }
      }
      isProcessingTurn = false;
      checkNextTurn();
    }, 500);
  }, 400);
}

$('#btn-restart').addEventListener('click', () => {
  initGame();
});

$('#btn-play-again').addEventListener('click', () => {
  $('#win-dialog').close();
  initGame();
});

loadProgress();
initGame();
