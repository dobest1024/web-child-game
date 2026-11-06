// 音效类：WebAudio 振荡器，结构与 water-rescue/audio.js 一致。
export class ZooAudio {
  constructor() {
    this.enabled = true;
    this.active = new Set();
    try {
      this.enabled = localStorage.getItem('zoo-2048:muted') !== 'true';
    } catch {
      /* Optional preference. */
    }
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended')
        this.context.resume().catch(() => {});
    } catch {
      /* Silent fallback. */
    }
  }
  stop() {
    for (const source of this.active) {
      try {
        source.stop();
      } catch {
        /* Ended. */
      }
    }
    this.active.clear();
  }
  toggle() {
    this.enabled = !this.enabled;
    this.stop();
    if (this.enabled) this.unlock();
    try {
      localStorage.setItem('zoo-2048:muted', String(!this.enabled));
    } catch {
      /* Optional preference. */
    }
  }
  play(name, step = 0) {
    if (!this.enabled || !this.context || document.hidden) return;
    const lift = 2 ** (step / 12);
    const notes = {
      move: [330],
      merge: [440, 587],
      undo: [520, 392],
      win: [523, 659, 784, 1047, 784, 1047],
      over: [392, 330, 262],
      error: [240, 200],
    }[name] || [440];
    for (const [i, frequency] of notes.entries()) {
      const start = this.context.currentTime + i * 0.075;
      const duration = name === 'win' ? 0.3 : 0.12;
      const pitch = Math.round(frequency * lift);
      const oscillator = this.context.createOscillator(),
        gain = this.context.createGain();
      oscillator.type =
        name === 'move' || name === 'error' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(pitch, start);
      if (name === 'over')
        oscillator.frequency.exponentialRampToValueAtTime(
          pitch * 0.8,
          start + duration,
        );
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(
        name === 'win' ? 0.05 : 0.045,
        start + 0.014,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
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
  }
}
