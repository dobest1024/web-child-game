// Web Audio sound effects. Nothing plays before a user gesture unlocks the context.
const soundKey = 'potion-shop:sound:v1';
const dropNotes = [523, 659, 587, 784, 392]; // red, yellow, blue, white, black

export class PotionAudio {
  constructor(storage) {
    this.storage = storage;
    this.enabled = true;
    this.active = new Set();
    try {
      this.enabled = storage.getItem(soundKey) !== 'off';
    } catch {
      /* Storage blocked: keep sound on for this visit. */
    }
  }
  unlock() {
    if (!this.enabled || document.hidden) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch {
      /* Silent fallback. */
    }
  }
  stop() {
    for (const source of this.active) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.active.clear();
  }
  pause() {
    this.stop();
    if (this.context?.state === 'running') this.context.suspend().catch(() => {});
  }
  toggle() {
    this.enabled = !this.enabled;
    this.stop();
    if (this.enabled) this.unlock();
    try {
      this.storage.setItem(soundKey, this.enabled ? 'on' : 'off');
    } catch {
      /* Preference only lasts for this visit. */
    }
  }
  tone(frequency, start, duration, { type = 'sine', volume = 0.05, slide = 0 } = {}) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(frequency * slide, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.context.destination);
    this.active.add(oscillator);
    oscillator.onended = () => {
      this.active.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
  play(name, detail = 0) {
    if (!this.enabled || !this.context || document.hidden) return;
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    const now = this.context.currentTime;
    const notes = {
      drop: () => {
        this.tone(dropNotes[detail] || 600, now, 0.16, { slide: 1.6, volume: 0.06 });
        this.tone(dropNotes[detail] * 2 || 1200, now + 0.06, 0.1, { volume: 0.025 });
      },
      undo: () => this.tone(700, now, 0.14, { slide: 0.6, type: 'triangle' }),
      pour: () => [0, 0.05, 0.1, 0.15].forEach((t, i) => this.tone(420 - i * 50, now + t, 0.18, { slide: 0.7, type: 'triangle', volume: 0.035 })),
      full: () => this.tone(300, now, 0.18, { type: 'triangle', volume: 0.04 }),
      oops: () => [0, 0.14].forEach((t, i) => this.tone([440, 370][i], now + t, 0.2, { type: 'triangle', volume: 0.045 })),
      gulp: () => [0, 0.18, 0.36].forEach((t) => this.tone(240, now + t, 0.12, { slide: 1.8, volume: 0.05 })),
      magic: () => [784, 988, 1175, 1568, 1319, 1760].forEach((f, i) => this.tone(f, now + i * 0.06, 0.28, { volume: 0.035 })),
      win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, now + i * 0.09, 0.32, { volume: 0.045 })),
      click: () => this.tone(660, now, 0.08, { volume: 0.03 }),
    }[name];
    try {
      notes?.();
    } catch {
      /* Audio is optional. */
    }
  }
}
