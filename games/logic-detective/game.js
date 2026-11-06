import { CASES } from './levels.js';
import {
  verifyDeduction,
  markConfirmed,
  calculateStars,
  sanitizeProgress,
} from './engine.js';
import { sfx } from './audio.js';

class LogicDetectiveGame {
  constructor() {
    this.currentCaseIndex = 0;
    this.grid = []; // entity index x attribute index
    this.userAssignments = {};
    this.usedClues = new Set();
    this.hintsUsed = 0;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('logic_detective_progress') || '{}');
      this.progress = sanitizeProgress(raw);
    } catch {
      this.progress = { cleared: {}, stars: {} };
    }

    this.cacheDOM();
    this.bindEvents();
    this.loadCase(0);
  }

  cacheDOM() {
    this.levelNameEl = document.getElementById('level-name');
    this.caseTitleEl = document.getElementById('case-title');
    this.caseDescEl = document.getElementById('case-desc');
    this.cluesListEl = document.getElementById('clues-list');
    this.matrixContainerEl = document.getElementById('matrix-container');
    this.matchesListEl = document.getElementById('matches-list');
    this.btnVerify = document.getElementById('btn-verify');

    // Controls
    this.btnReset = document.getElementById('btn-reset');
    this.btnLevels = document.getElementById('btn-levels');
    this.btnMute = document.getElementById('btn-mute');

    // Modals
    this.winModal = document.getElementById('win-modal');
    this.winStarsEl = document.getElementById('win-stars');
    this.btnNextLevel = document.getElementById('btn-next-level');
    this.btnReplay = document.getElementById('btn-replay');

    this.levelsModal = document.getElementById('levels-modal');
    this.levelsGridEl = document.getElementById('levels-grid');
    this.btnCloseLevels = document.getElementById('btn-close-levels');
  }

  bindEvents() {
    this.btnVerify.addEventListener('click', () => {
      sfx.init();
      this.checkCase();
    });

    this.btnReset.addEventListener('click', () => {
      sfx.init();
      this.loadCase(this.currentCaseIndex);
    });

    this.btnMute.addEventListener('click', () => {
      sfx.init();
      sfx.muted = !sfx.muted;
      this.btnMute.textContent = sfx.muted ? '🔇 静音' : '🔊 声音';
    });

    this.btnLevels.addEventListener('click', () => {
      sfx.init();
      this.renderLevelsGrid();
      this.levelsModal.classList.add('open');
    });

    this.btnCloseLevels.addEventListener('click', () => {
      this.levelsModal.classList.remove('open');
    });

    this.btnReplay.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      this.loadCase(this.currentCaseIndex);
    });

    this.btnNextLevel.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      if (this.currentCaseIndex + 1 < CASES.length) {
        this.loadCase(this.currentCaseIndex + 1);
      } else {
        this.loadCase(0);
      }
    });
  }

  loadCase(index) {
    this.currentCaseIndex = index;
    const c = CASES[index];

    this.levelNameEl.textContent = `第 ${index + 1} 案: ${c.title} (${c.difficulty})`;
    this.caseTitleEl.textContent = `案件档案: ${c.title}`;
    this.caseDescEl.textContent = c.desc;

    this.usedClues.clear();
    this.userAssignments = {};
    this.hintsUsed = 0;

    // Initialize grid
    this.grid = Array.from({ length: c.entities.length }, () =>
      Array(c.attributes.length).fill('')
    );

    this.renderClues();
    this.renderMatrix();
    this.renderMatches();
  }

  renderClues() {
    const c = CASES[this.currentCaseIndex];
    this.cluesListEl.innerHTML = '';

    c.clues.forEach((clueText, idx) => {
      const item = document.createElement('div');
      item.className = `clue-item ${this.usedClues.has(idx) ? 'used' : ''}`;
      item.innerHTML = `
        <span style="color: #fbbf24; font-weight: 800;">线索 ${idx + 1}:</span>
        <span>${clueText}</span>
      `;

      item.addEventListener('click', () => {
        sfx.init();
        sfx.playClue();
        if (this.usedClues.has(idx)) {
          this.usedClues.delete(idx);
        } else {
          this.usedClues.add(idx);
        }
        item.classList.toggle('used', this.usedClues.has(idx));
      });

      this.cluesListEl.appendChild(item);
    });
  }

  renderMatrix() {
    const c = CASES[this.currentCaseIndex];
    this.matrixContainerEl.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'matrix-table';

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>人物 / 属性</th>';
    c.attributes.forEach((attr) => {
      const th = document.createElement('th');
      th.innerHTML = `${attr.icon}<br>${attr.name}`;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
    c.entities.forEach((entity, r) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.innerHTML = `${entity.icon} ${entity.name}`;
      tr.appendChild(th);

      c.attributes.forEach((attr, col) => {
        const td = document.createElement('td');
        const val = this.grid[r][col];

        if (val === 'yes') {
          td.className = 'cell-yes';
          td.textContent = '✔️';
        } else if (val === 'no') {
          td.className = 'cell-no';
          td.textContent = '❌';
        } else {
          td.textContent = '';
        }

        td.addEventListener('click', () => {
          this.handleCellClick(r, col);
        });

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    this.matrixContainerEl.appendChild(table);
  }

  handleCellClick(r, col) {
    sfx.init();
    sfx.playStamp();
    const curr = this.grid[r][col];
    const c = CASES[this.currentCaseIndex];

    if (curr === '') {
      this.grid[r][col] = 'no';
    } else if (curr === 'no') {
      this.grid = markConfirmed(this.grid, r, col);
      // Automatically assign to player conclusion form
      const entityId = c.entities[r].id;
      const attrGroup = Object.keys(c.solution[entityId])[0];
      const attrId = c.attributes[col].id;
      if (!this.userAssignments[entityId]) this.userAssignments[entityId] = {};
      this.userAssignments[entityId][attrGroup] = attrId;
      this.renderMatches();
    } else {
      this.grid[r][col] = '';
    }

    this.renderMatrix();
  }

  renderMatches() {
    const c = CASES[this.currentCaseIndex];
    this.matchesListEl.innerHTML = '';

    c.entities.forEach((entity) => {
      const row = document.createElement('div');
      row.className = 'match-row';

      const attrGroup = Object.keys(c.solution[entity.id])[0];
      const selectedAttr = this.userAssignments[entity.id]
        ? this.userAssignments[entity.id][attrGroup]
        : '';

      row.innerHTML = `
        <span class="entity-label">${entity.icon} ${entity.name}</span>
      `;

      const select = document.createElement('select');
      select.className = 'attr-select';
      select.innerHTML = '<option value="">-- 选择结论 --</option>';

      c.attributes.forEach((attr) => {
        const opt = document.createElement('option');
        opt.value = attr.id;
        opt.textContent = `${attr.icon} ${attr.name}`;
        if (selectedAttr === attr.id) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', (e) => {
        sfx.init();
        if (!this.userAssignments[entity.id]) this.userAssignments[entity.id] = {};
        this.userAssignments[entity.id][attrGroup] = e.target.value;
      });

      row.appendChild(select);
      this.matchesListEl.appendChild(row);
    });
  }

  checkCase() {
    const c = CASES[this.currentCaseIndex];
    const res = verifyDeduction(c.solution, this.userAssignments);

    if (res.solved) {
      sfx.playWin();
      const stars = calculateStars(res.errors, this.hintsUsed);

      const lId = String(c.id);
      const prevStars = this.progress.stars[lId] || 0;
      if (stars > prevStars) {
        this.progress.stars[lId] = stars;
        this.progress.cleared[lId] = true;
        try {
          localStorage.setItem('logic_detective_progress', JSON.stringify(this.progress));
        } catch {}
      }

      this.winStarsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      document.getElementById('res-verdict').textContent = '逻辑缜密，铁证如山！';
      this.winModal.classList.add('open');
    } else {
      sfx.playStamp();
      alert(`推理结论中还有 ${res.errors} 处不符合所有线索，请再次审查逻辑矩阵！`);
    }
  }

  renderLevelsGrid() {
    this.levelsGridEl.innerHTML = '';
    CASES.forEach((c, idx) => {
      const btn = document.createElement('div');
      btn.className = `level-btn ${idx === this.currentCaseIndex ? 'active' : ''}`;
      const lId = String(c.id);
      const stars = this.progress.stars[lId] || 0;

      btn.innerHTML = `
        <span>第 ${idx + 1} 案</span>
        <span style="font-size: 11px;">${c.title}</span>
        <span style="color: #fbbf24; font-size: 11px;">${stars > 0 ? '⭐'.repeat(stars) : '·'}</span>
      `;

      btn.addEventListener('click', () => {
        this.levelsModal.classList.remove('open');
        this.loadCase(idx);
      });

      this.levelsGridEl.appendChild(btn);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new LogicDetectiveGame();
});
