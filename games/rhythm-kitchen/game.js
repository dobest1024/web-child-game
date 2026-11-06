import { RECIPES } from './levels.js';
import { judgeHit, calculateStars, sanitizeProgress, WINDOWS } from './engine.js';
import { sfx } from './audio.js';

class RhythmKitchenGame {
  constructor() {
    this.currentRecipeIndex = 0;
    this.isPlaying = false;
    this.animationId = null;
    this.startTime = 0;
    this.leadInMs = 0;
    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfects = 0;
    this.goods = 0;
    this.misses = 0;
    this.lastBeatChecked = -1;

    // Load progress
    try {
      const raw = JSON.parse(localStorage.getItem('rhythm_kitchen_progress') || '{}');
      this.progress = sanitizeProgress(raw);
    } catch {
      this.progress = { cleared: {}, highScores: {} };
    }

    this.cacheDOM();
    this.bindEvents();
    this.loadRecipe(0);
  }

  cacheDOM() {
    this.levelNameEl = document.getElementById('level-name');
    this.scoreEl = document.getElementById('score-val');
    this.comboEl = document.getElementById('combo-val');
    this.maxComboEl = document.getElementById('max-combo-val');
    this.tipTextEl = document.getElementById('tip-text');
    this.trackWrapEl = document.getElementById('track-wrap');
    this.targetZoneEl = document.getElementById('target-zone');
    this.knifeBladeEl = document.getElementById('knife-blade');
    this.notesContainerEl = document.getElementById('notes-container');
    this.chefAvatarEl = document.getElementById('chef-avatar');
    this.chefBubbleEl = document.getElementById('chef-bubble');
    this.beatDotEl = document.getElementById('beat-dot');
    this.countInOverlayEl = document.getElementById('count-in-overlay');
    this.countInNumberEl = document.getElementById('count-in-number');
    this.btnChop = document.getElementById('btn-chop');
    this.btnMute = document.getElementById('btn-mute');
    this.btnRecipes = document.getElementById('btn-recipes');
    this.btnRestart = document.getElementById('btn-restart');

    // Modals
    this.winModal = document.getElementById('win-modal');
    this.recipesModal = document.getElementById('recipes-modal');
    this.recipesGridEl = document.getElementById('recipes-grid');
    this.btnNextRecipe = document.getElementById('btn-next-recipe');
    this.btnReplay = document.getElementById('btn-replay');
    this.btnCloseRecipes = document.getElementById('btn-close-recipes');
  }

  bindEvents() {
    // Chop actions
    this.btnChop.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.handleChop();
    });

    this.trackWrapEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      this.handleChop();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'KeyJ' || e.key === 'Enter') {
        e.preventDefault();
        this.handleChop();
      }
    });

    // Mute toggle
    this.btnMute.addEventListener('click', () => {
      sfx.init();
      sfx.muted = !sfx.muted;
      this.btnMute.textContent = sfx.muted ? '🔇 静音' : '🔊 声音';
    });

    // Recipes dialog
    this.btnRecipes.addEventListener('click', () => {
      this.stop();
      this.renderRecipesGrid();
      this.recipesModal.classList.add('open');
    });

    this.btnCloseRecipes.addEventListener('click', () => {
      this.recipesModal.classList.remove('open');
      this.startCurrentRecipe();
    });

    // Restart
    this.btnRestart.addEventListener('click', () => {
      this.startCurrentRecipe();
    });

    // Win dialog actions
    this.btnReplay.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      this.startCurrentRecipe();
    });

    this.btnNextRecipe.addEventListener('click', () => {
      this.winModal.classList.remove('open');
      if (this.currentRecipeIndex + 1 < RECIPES.length) {
        this.loadRecipe(this.currentRecipeIndex + 1);
      } else {
        this.loadRecipe(0);
      }
    });
  }

  loadRecipe(index) {
    this.currentRecipeIndex = index;
    const recipe = RECIPES[index];
    this.levelNameEl.textContent = `第 ${index + 1} 关: ${recipe.title} - ${recipe.dish}`;
    this.tipTextEl.textContent = recipe.tip;
    this.startCurrentRecipe();
  }

  startCurrentRecipe() {
    this.stop();
    sfx.init();

    const recipe = RECIPES[this.currentRecipeIndex];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfects = 0;
    this.goods = 0;
    this.misses = 0;
    this.lastBeatChecked = -1;
    this.updateStats();

    // 4 lead-in count-in beats
    const beatInterval = 60000 / recipe.bpm;
    this.leadInMs = beatInterval * 4;

    this.notes = recipe.beats.map((b, i) => ({
      id: i,
      beat: b.beat,
      icon: b.icon,
      targetMs: this.leadInMs + b.beat * beatInterval,
      hit: null, // null | 'PERFECT' | 'GOOD' | 'MISS'
      el: null,
    }));

    // Clear existing sprites
    this.notesContainerEl.innerHTML = '';
    this.notes.forEach((note) => {
      const el = document.createElement('div');
      el.className = 'food-note';
      el.textContent = note.icon;
      this.notesContainerEl.appendChild(el);
      note.el = el;
    });

    this.setChefState('normal', '准备切菜啦！');
    this.isPlaying = true;
    this.startTime = performance.now();

    this.loop();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.countInOverlayEl.classList.remove('active');
  }

  loop() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    const recipe = RECIPES[this.currentRecipeIndex];
    const beatInterval = 60000 / recipe.bpm;

    // Track beat for metronome flash & count-in
    const currentBeat = Math.floor(elapsed / beatInterval);
    if (currentBeat !== this.lastBeatChecked) {
      this.lastBeatChecked = currentBeat;
      this.onBeat(currentBeat);
    }

    // Update food note positions
    const trackWidth = this.trackWrapEl.clientWidth;
    const targetX = this.targetZoneEl.offsetLeft + this.targetZoneEl.offsetWidth / 2;
    const scrollTravelTime = beatInterval * 3.5; // travel time across screen

    let activeCount = 0;

    for (const note of this.notes) {
      if (note.hit) continue;

      const timeDiff = note.targetMs - elapsed; // >0 means upcoming, <0 passed

      // Check for automatic miss when passing good window
      if (timeDiff < -WINDOWS.GOOD) {
        note.hit = 'MISS';
        this.misses++;
        this.combo = 0;
        this.updateStats();
        this.triggerMissFeedback();
        if (note.el) {
          note.el.classList.add('hit-miss');
        }
        continue;
      }

      activeCount++;

      // Position note
      if (note.el) {
        const x = targetX + (timeDiff / scrollTravelTime) * (trackWidth - targetX);
        if (x > trackWidth + 50 || x < -50) {
          note.el.style.display = 'none';
        } else {
          note.el.style.display = 'flex';
          note.el.style.left = `${x}px`;
        }
      }
    }

    // Check completion condition
    const lastNote = this.notes[this.notes.length - 1];
    if (elapsed > lastNote.targetMs + 1000 || activeCount === 0 && elapsed > lastNote.targetMs) {
      this.completeRecipe();
      return;
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  onBeat(beat) {
    // Flash visual metronome dot
    this.beatDotEl.classList.add('flash');
    setTimeout(() => this.beatDotEl.classList.remove('flash'), 90);

    // Count in phase (beats 0, 1, 2, 3)
    if (beat < 4) {
      const remaining = 4 - beat;
      this.countInOverlayEl.classList.add('active');
      this.countInNumberEl.textContent = remaining > 1 ? `${remaining - 1}` : '准备！';
      sfx.playMetronome(remaining === 1);
    } else if (beat === 4) {
      this.countInOverlayEl.classList.remove('active');
      sfx.playMetronome(true);
    }
  }

  handleChop() {
    sfx.init();

    // Knife chop animation
    this.knifeBladeEl.classList.add('chop');
    setTimeout(() => this.knifeBladeEl.classList.remove('chop'), 110);

    if (!this.isPlaying) return;

    const elapsed = performance.now() - this.startTime;

    // Find the closest unhit note
    let candidate = null;
    let minDiff = Infinity;

    for (const note of this.notes) {
      if (note.hit) continue;
      const diff = Math.abs(elapsed - note.targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        candidate = note;
      }
    }

    if (candidate && minDiff <= WINDOWS.GOOD) {
      const judgment = judgeHit(candidate.targetMs, elapsed);
      candidate.hit = judgment.rating;

      if (judgment.rating === 'PERFECT') {
        this.perfects++;
        this.score += 100 + this.combo * 5;
        this.combo++;
        if (candidate.el) candidate.el.classList.add('hit-perfect');
      } else {
        this.goods++;
        this.score += 60 + this.combo * 2;
        this.combo++;
        if (candidate.el) candidate.el.classList.add('hit-good');
      }

      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      this.updateStats();
      this.showPopFeedback(judgment.rating);
      this.showSlashFx();
      sfx.playChop(judgment.rating);
      this.setChefState('happy', this.combo >= 5 ? `🔥 ${this.combo} 连击！神准！` : '好刀法！');
    } else {
      // Empty chop
      sfx.playChop('GOOD');
    }
  }

  showSlashFx() {
    const fx = document.createElement('div');
    fx.className = 'slice-fx';
    this.trackWrapEl.appendChild(fx);
    setTimeout(() => fx.remove(), 200);
  }

  showPopFeedback(rating) {
    const pop = document.createElement('div');
    pop.className = `judgement-pop ${rating.toLowerCase()}`;
    pop.textContent = rating === 'PERFECT' ? 'PERFECT! ★' : 'GOOD!';
    this.trackWrapEl.appendChild(pop);
    setTimeout(() => pop.remove(), 600);
  }

  triggerMissFeedback() {
    sfx.playMiss();
    const pop = document.createElement('div');
    pop.className = 'judgement-pop miss';
    pop.textContent = 'MISS';
    this.trackWrapEl.appendChild(pop);
    setTimeout(() => pop.remove(), 600);
    this.setChefState('sad', '哎呀，拍子慢啦！');
  }

  setChefState(mood, text) {
    if (mood === 'happy') {
      this.chefAvatarEl.textContent = '🧑‍🍳';
      this.chefAvatarEl.classList.add('bounce');
      setTimeout(() => this.chefAvatarEl.classList.remove('bounce'), 250);
    } else if (mood === 'sad') {
      this.chefAvatarEl.textContent = '🥺';
    } else {
      this.chefAvatarEl.textContent = '🧑‍🍳';
    }
    if (text) this.chefBubbleEl.textContent = text;
  }

  updateStats() {
    this.scoreEl.textContent = this.score;
    this.comboEl.textContent = this.combo;
    this.maxComboEl.textContent = this.maxCombo;
  }

  completeRecipe() {
    this.stop();
    const recipe = RECIPES[this.currentRecipeIndex];
    const maxScore = recipe.beats.length * 100 + (recipe.beats.length * (recipe.beats.length - 1) / 2) * 5;
    const stars = calculateStars(this.score, maxScore, this.misses);

    // Save record
    const rId = String(recipe.id);
    const prevStars = this.progress.cleared[rId] || 0;
    if (stars > prevStars) {
      this.progress.cleared[rId] = stars;
    }
    const prevHigh = this.progress.highScores[rId] || 0;
    if (this.score > prevHigh) {
      this.progress.highScores[rId] = this.score;
    }
    try {
      localStorage.setItem('rhythm_kitchen_progress', JSON.stringify(this.progress));
    } catch {}

    sfx.playWinFanfare();

    // Fill win dialog
    const starsStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('win-stars').textContent = starsStr;
    document.getElementById('res-score').textContent = this.score;
    document.getElementById('res-combo').textContent = this.maxCombo;
    document.getElementById('res-perfect').textContent = this.perfects;
    document.getElementById('res-miss').textContent = this.misses;

    this.winModal.classList.add('open');
  }

  renderRecipesGrid() {
    this.recipesGridEl.innerHTML = '';
    RECIPES.forEach((r, idx) => {
      const card = document.createElement('div');
      card.className = `recipe-btn ${idx === this.currentRecipeIndex ? 'active' : ''}`;
      
      const rId = String(r.id);
      const stars = this.progress.cleared[rId] || 0;
      const starsText = stars > 0 ? '⭐'.repeat(stars) : '未完成';
      const high = this.progress.highScores[rId] ? `${this.progress.highScores[rId]}分` : '';

      card.innerHTML = `
        <div class="recipe-btn-title">第 ${idx + 1} 道: ${r.title}</div>
        <div class="recipe-btn-dish">${r.dish} (BPM ${r.bpm})</div>
        <div class="recipe-btn-meta">
          <span>${starsText}</span>
          <span>${high}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.recipesModal.classList.remove('open');
        this.loadRecipe(idx);
      });

      this.recipesGridEl.appendChild(card);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new RhythmKitchenGame();
});
