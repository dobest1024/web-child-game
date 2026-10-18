export class Audio {
  constructor() {
    this.enabled = false;
    this.context = null;
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.context ||= new AudioContext();
      this.context.resume();
      this.play("select");
    }
    return this.enabled;
  }
  play(type) {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    gain.connect(this.context.destination);
    const osc = this.context.createOscillator();
    osc.connect(gain);
    const settings = {
      select: [440, 660, 0.09, "sine"],
      deploy: [220, 460, 0.16, "triangle"],
      fireball: [130, 38, 0.4, "sawtooth"],
      arrows: [600, 190, 0.2, "triangle"],
      collapse: [90, 30, 0.45, "sawtooth"],
      victory: [523, 1046, 0.6, "triangle"],
      defeat: [330, 130, 0.5, "sine"],
    };
    const [from, to, duration, wave] = settings[type] || settings.deploy;
    osc.type = wave;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
