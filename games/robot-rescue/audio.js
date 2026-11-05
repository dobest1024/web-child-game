// Small original Web Audio effects, activated only by a player's gesture.
export class RobotAudio {
  constructor() {
    this.enabled = true;
    this.active = new Set();
    try {
      this.enabled = localStorage.getItem('robot-rescue:muted') !== 'true';
    } catch {
      /* Optional storage. */
    }
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended')
        this.context.resume().catch(() => {});
    } catch {
      /* Keep playing silently. */
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
      localStorage.setItem('robot-rescue:muted', String(!this.enabled));
    } catch {
      /* Optional storage. */
    }
  }
  play(name) {
    if (!this.enabled || !this.context || document.hidden) return;
    const melodies = {
      add: [620],
      forward: [260, 330],
      left: [440, 330],
      right: [330, 440],
      probe: [700, 800],
      'turn-probe': [800, 500],
      rescue: [523, 659, 784],
      bridge: [220, 330, 440],
      crystal: [880, 1175, 1568],
      error: [240, 180],
      win: [523, 659, 784, 1047, 784, 1047],
    };
    const notes = melodies[name] || [550];
    for (const [i, frequency] of notes.entries()) {
      const start = this.context.currentTime + i * 0.09;
      const duration = name === 'win' ? 0.27 : 0.12;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = name === 'forward' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(this.context.destination);
      this.active.add(oscillator);
      oscillator.onended = () => {
        this.active.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    }
  }
}
