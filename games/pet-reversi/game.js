import {
  createInitialBoard,
  getLegalMoves,
  applyMove,
  countPieces,
  isGameOver,
  chooseAiMove,
  sanitizeProgress,
  BLACK,
  WHITE,
  EMPTY,
} from './engine.js';
import { sfx } from './audio.js';

class PetReversiGame {
  constructor() {
    this.board = createInitialBoard();
    this.currentTurn = BLACK; // Black goes first
    this.mode = 'ai'; // 'ai' | 'pvp'
    this.difficulty = 'medium'; // 'easy' | 'medium' | 'hard'
    this.history = [];
    this.isThinking = false;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('pet_reversi_progress') || '{}');
      this.progress = sanitizeProgress(raw);
    } catch {
      this.progress = { wins: 0, losses: 0, draws: 0 };
    }

    this.cacheDOM();
    this.bindEvents();
    this.renderBoard();
    this.updateUI();
  }

  cacheDOM() {
    this.boardEl = document.getElementById('board');
    this.scoreCatEl = document.getElementById('score-cat');
    this.scoreDogEl = document.getElementById('score-dog');
    this.cardCatEl = document.getElementById('card-cat');
    this.cardDogEl = document.getElementById('card-dog');
    this.turnMsgEl = document.getElementById('turn-msg');

    this.btnMode = document.getElementById('btn-mode');
    this.btnDiff = document.getElementById('btn-diff');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnMute = document.getElementById('btn-mute');

    this.winModal = document.getElementById('win-modal');
    this.modalTitleEl = document.getElementById('modal-title');
    this.modalScoreEl = document.getElementById('modal-score');
    this.btnPlayAgain = document.getElementById('btn-play-again');
  }

  bindEvents() {
    this.btnMode.addEventListener('click', () => {
      sfx.init();
      this.mode = this.mode === 'ai' ? 'pvp' : 'ai';
      this.btnMode.textContent = this.mode === 'ai' ? '🤖 人机对战' : '👥 双人同屏';
      this.btnDiff.style.display = this.mode === 'ai' ? 'inline-block' : 'none';
      this.restartGame();
    });

    this.btnDiff.addEventListener('click', () => {
      sfx.init();
      if (this.difficulty === 'easy') this.difficulty = 'medium';
      else if (this.difficulty === 'medium') this.difficulty = 'hard';
      else this.difficulty = 'easy';

      const diffNames = { easy: '⭐ 初级', medium: '⭐⭐ 中级', hard: '⭐⭐⭐ 高手' };
      this.btnDiff.textContent = `难度: ${diffNames[this.difficulty]}`;
      this.restartGame();
    });

    this.btnUndo.addEventListener('click', () => {
      sfx.init();
      this.undoMove();
    });

    this.btnRestart.addEventListener('click', () => {
      sfx.init();
      this.restartGame();
    });

    this.btnMute.addEventListener('click', () => {
      sfx.init();
      sfx.muted = !sfx.muted;
      this.btnMute.textContent = sfx.muted ? '🔇 静音' : '🔊 声音';
    });

    this.btnPlayAgain.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      this.restartGame();
    });
  }

  restartGame() {
    this.board = createInitialBoard();
    this.currentTurn = BLACK;
    this.history = [];
    this.isThinking = false;
    this.renderBoard();
    this.updateUI();
  }

  undoMove() {
    if (this.isThinking) return;
    if (this.history.length === 0) return;

    if (this.mode === 'ai') {
      // In AI mode, undo 2 moves (both AI and player)
      if (this.history.length >= 2) {
        this.history.pop();
        const prev = this.history.pop();
        this.board = prev.board;
        this.currentTurn = prev.turn;
      } else {
        const prev = this.history.pop();
        this.board = prev.board;
        this.currentTurn = prev.turn;
      }
    } else {
      const prev = this.history.pop();
      this.board = prev.board;
      this.currentTurn = prev.turn;
    }

    this.renderBoard();
    this.updateUI();
  }

  renderBoard(lastFlipped = []) {
    this.boardEl.innerHTML = '';
    const legalMoves = getLegalMoves(this.board, this.currentTurn);
    const legalMap = new Set(legalMoves.map((m) => `${m.r},${m.c}`));

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';

        const pieceVal = this.board[r][c];
        const isLegal = !this.isThinking && pieceVal === EMPTY && legalMap.has(`${r},${c}`);

        if (isLegal) {
          cell.classList.add('valid-move');
        }

        if (pieceVal !== EMPTY) {
          const piece = document.createElement('div');
          piece.className = `piece ${pieceVal === BLACK ? 'black' : 'white'}`;
          piece.textContent = pieceVal === BLACK ? '🐱' : '🐶';

          // Check if newly flipped
          if (lastFlipped.some(([fr, fc]) => fr === r && fc === c)) {
            piece.classList.add('flipping');
          }

          cell.appendChild(piece);
        }

        cell.addEventListener('click', () => {
          if (isLegal) {
            this.handlePlayerMove(r, c);
          }
        });

        this.boardEl.appendChild(cell);
      }
    }
  }

  handlePlayerMove(r, c) {
    sfx.init();
    if (this.isThinking) return;

    const result = applyMove(this.board, r, c, this.currentTurn);
    if (!result) return;

    // Save history
    this.history.push({
      board: this.board.map((row) => [...row]),
      turn: this.currentTurn,
    });

    this.board = result.nextBoard;
    sfx.playPlacePiece();
    if (result.flips.length > 0) {
      setTimeout(() => sfx.playFlip(), 100);
    }

    this.renderBoard(result.flips);
    this.passTurn();
  }

  passTurn() {
    const nextColor = this.currentTurn === BLACK ? WHITE : BLACK;

    // Check if game is over
    if (isGameOver(this.board)) {
      this.finishGame();
      return;
    }

    // Check if next player has moves
    const nextMoves = getLegalMoves(this.board, nextColor);
    if (nextMoves.length === 0) {
      // Must pass!
      sfx.playPass();
      const passerName = nextColor === BLACK ? '咪咪猫' : '汪汪狗';
      this.turnMsgEl.textContent = `⚠️ ${passerName}无子可落，跳过回合！`;
      this.updateUI();

      // Keep turn with current player if they have moves
      const currMoves = getLegalMoves(this.board, this.currentTurn);
      if (currMoves.length === 0) {
        this.finishGame();
        return;
      }

      if (this.mode === 'ai' && this.currentTurn === WHITE) {
        this.scheduleAiTurn();
      }
      return;
    }

    this.currentTurn = nextColor;
    this.updateUI();
    this.renderBoard();

    // If AI's turn
    if (this.mode === 'ai' && this.currentTurn === WHITE) {
      this.scheduleAiTurn();
    }
  }

  scheduleAiTurn() {
    this.isThinking = true;
    this.turnMsgEl.textContent = '🤔 汪汪狗正在思考对策...';

    setTimeout(() => {
      const move = chooseAiMove(this.board, WHITE, this.difficulty);
      this.isThinking = false;
      if (move) {
        const result = applyMove(this.board, move.r, move.c, WHITE);
        if (result) {
          this.history.push({
            board: this.board.map((row) => [...row]),
            turn: WHITE,
          });

          this.board = result.nextBoard;
          sfx.playPlacePiece();
          if (result.flips.length > 0) {
            setTimeout(() => sfx.playFlip(), 100);
          }
          this.renderBoard(result.flips);
          this.passTurn();
        }
      } else {
        this.passTurn();
      }
    }, 550);
  }

  updateUI() {
    const counts = countPieces(this.board);
    this.scoreCatEl.textContent = counts.black;
    this.scoreDogEl.textContent = counts.white;

    this.cardCatEl.classList.toggle('active', this.currentTurn === BLACK);
    this.cardDogEl.classList.toggle('active', this.currentTurn === WHITE);

    if (!this.isThinking) {
      this.turnMsgEl.textContent =
        this.currentTurn === BLACK ? '👉 轮到 咪咪猫 (黑棋) 出手！' : '👉 轮到 汪汪狗 (白棋) 出手！';
    }
  }

  finishGame() {
    const counts = countPieces(this.board);
    let title = '';
    let msg = '';

    if (counts.black > counts.white) {
      title = '🏆 咪咪猫大获全胜！';
      msg = `咪咪猫 ${counts.black} 颗 vs 汪汪狗 ${counts.white} 颗！喵力四射！`;
      this.progress.wins++;
    } else if (counts.white > counts.black) {
      title = '🐶 汪汪狗赢得胜利！';
      msg = `汪汪狗 ${counts.white} 颗 vs 咪咪猫 ${counts.black} 颗！智慧过人！`;
      this.progress.losses++;
    } else {
      title = '🤝 势均力敌，握手言和！';
      msg = `双方各 ${counts.black} 颗，精彩绝伦的巅峰对决！`;
      this.progress.draws++;
    }

    try {
      localStorage.setItem('pet_reversi_progress', JSON.stringify(this.progress));
    } catch {}

    sfx.playWin();
    this.modalTitleEl.textContent = title;
    this.modalScoreEl.textContent = msg;
    this.winModal.classList.add('open');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new PetReversiGame();
});
