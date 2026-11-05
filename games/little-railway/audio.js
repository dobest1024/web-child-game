// Original synthesized effects: no downloads, external recordings, or autoplay.
export class RailwayAudio {
  constructor() {
    this.enabled = true;
    this.volume = 0.45;
    this.context = null;
    this.active = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem('little-railway:audio:v1'));
      if (typeof saved?.enabled === 'boolean') this.enabled = saved.enabled;
      if (Number.isFinite(saved?.volume))
        this.volume = Math.max(0, Math.min(1, saved.volume));
    } catch {
      /* Use the defaults if storage is unavailable. */
    }
  }
  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
      this.master.gain.value = document.hidden ? 0 : this.volume;
      if (this.context.state === 'suspended')
        this.context.resume().catch(() => {});
    } catch {
      /* The game remains playable without audio support. */
    }
  }
  save() {
    try {
      localStorage.setItem(
        'little-railway:audio:v1',
        JSON.stringify({ enabled: this.enabled, volume: this.volume }),
      );
    } catch {
      /* Optional preference. */
    }
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    this.stop();
    if (enabled) this.unlock();
    this.save();
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master)
      this.master.gain.value =
        this.enabled && !document.hidden ? this.volume : 0;
    this.save();
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
  note(
    frequency,
    duration,
    delay = 0,
    type = 'sine',
    amplitude = 0.16,
    end = frequency,
  ) {
    const context = this.context;
    const start = context.currentTime + delay;
    const source = context.createOscillator();
    const gain = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(end, start + duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(
      amplitude,
      start + Math.min(0.025, duration / 4),
    );
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(gain).connect(this.master);
    this.active.add(source);
    source.onended = () => {
      this.active.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(start);
    source.stop(start + duration + 0.02);
  }
  play(cue) {
    if (!this.enabled || !this.context || document.hidden || this.volume === 0)
      return;
    switch (cue) {
      case 'place':
        this.note(720, 0.065, 0, 'triangle', 0.16, 360);
        this.note(1100, 0.05, 0.045, 'sine', 0.07);
        break;
      case 'undo':
        this.note(520, 0.13, 0, 'sine', 0.12, 270);
        break;
      case 'error':
        this.note(210, 0.14, 0, 'triangle', 0.1, 160);
        this.note(180, 0.16, 0.13, 'sine', 0.08);
        break;
      case 'whistle':
        for (const frequency of [520, 655, 780]) {
          this.note(frequency, 0.32, 0, 'sine', 0.07, frequency * 1.02);
          this.note(frequency, 0.48, 0.4, 'sine', 0.07, frequency * 0.96);
        }
        break;
      case 'roll':
        this.note(100, 0.055, 0, 'triangle', 0.08, 50);
        this.note(155, 0.04, 0.055, 'triangle', 0.045, 75);
        break;
      case 'board':
        [523, 659, 784].forEach((n, i) =>
          this.note(n, 0.16, i * 0.09, 'sine', 0.12),
        );
        break;
      case 'star':
        [880, 1175, 1568].forEach((n, i) =>
          this.note(n, 0.25, i * 0.075, 'sine', 0.1),
        );
        break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047].forEach((n, i) =>
          this.note(n, i === 5 ? 0.65 : 0.22, i * 0.15, 'triangle', 0.12),
        );
        break;
      case 'stop':
        this.note(330, 0.25, 0, 'sine', 0.1, 220);
        break;
      default:
        this.note(660, 0.1, 0, 'sine', 0.1);
    }
  }
}
