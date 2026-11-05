export class WorkshopAudio {
  constructor() {
    this.enabled = true;
    this.active = new Set();
    try {
      this.enabled = localStorage.getItem('contraption-house:muted') !== 'true';
    } catch {}
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended')
        this.context.resume().catch(() => {});
    } catch {}
  }
  stop() {
    for (const source of this.active) {
      try {
        source.stop();
      } catch {}
    }
    this.active.clear();
  }
  toggle() {
    this.enabled = !this.enabled;
    this.stop();
    this.unlock();
    try {
      localStorage.setItem('contraption-house:muted', String(!this.enabled));
    } catch {}
  }
  play(cue) {
    if (!this.enabled || !this.context || document.hidden) return;
    const notes = {
      place: [650, 420],
      ramp: [330, 280],
      spring: [240, 480, 760],
      fan: [380, 460],
      bridge: [400, 470],
      star: [880, 1175],
      error: [240, 180],
      bell: [784, 1047, 1319],
      win: [523, 659, 784, 1047],
    }[cue] || [500];
    notes.forEach((frequency, i) => {
      const source = this.context.createOscillator(),
        gain = this.context.createGain(),
        start = this.context.currentTime + i * 0.07,
        duration = cue === 'bell' ? 0.65 : 0.17;
      source.type = cue === 'spring' ? 'triangle' : 'sine';
      source.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.05, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      source.connect(gain).connect(this.context.destination);
      this.active.add(source);
      source.onended = () => {
        this.active.delete(source);
        source.disconnect();
        gain.disconnect();
      };
      source.start(start);
      source.stop(start + duration + 0.01);
    });
  }
}
