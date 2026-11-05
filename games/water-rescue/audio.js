export class WaterAudio {
  constructor() {
    this.enabled = true;
    this.active = new Set();
    try {
      this.enabled = localStorage.getItem('water-rescue:muted') !== 'true';
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
      localStorage.setItem('water-rescue:muted', String(!this.enabled));
    } catch {
      /* Optional preference. */
    }
  }
  play(name) {
    if (!this.enabled || !this.context || document.hidden) return;
    const notes = {
      turn: [520, 700],
      valve: [260, 390],
      flow: [880, 620],
      bloom: [523, 659, 784],
      win: [523, 659, 784, 1047, 784, 1047],
      error: [270, 220],
    }[name] || [660];
    for (const [i, frequency] of notes.entries()) {
      const start = this.context.currentTime + i * 0.075;
      const duration = name === 'win' ? 0.3 : 0.13;
      const oscillator = this.context.createOscillator(),
        gain = this.context.createGain();
      oscillator.type = name === 'valve' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      if (name === 'flow')
        oscillator.frequency.exponentialRampToValueAtTime(
          frequency / 2,
          start + duration,
        );
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(
        name === 'flow' ? 0.022 : 0.05,
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
