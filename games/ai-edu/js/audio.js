// 音效（WebAudio 合成，无需素材）+ 中文语音朗读（给还不太识字的小朋友）
let ctx = null;
let muted = false;

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  if (v && 'speechSynthesis' in window) speechSynthesis.cancel();
}

function tone(freq, dur, { type = 'sine', gain = 0.15, when = 0 } = {}) {
  if (muted) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch { /* 不支持音频就静音 */ }
}

export const sfx = {
  tap: () => tone(660, 0.08, { type: 'triangle', gain: 0.1 }),
  turn: () => tone(240, 0.08, { type: 'square', gain: 0.04 }),
  good: () => { tone(784, 0.12); tone(1046, 0.2, { when: 0.1 }); },
  bad: () => tone(180, 0.25, { type: 'sawtooth', gain: 0.05 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, { when: i * 0.12 })),
};

const clean = text => text
  .replace(/\p{Extended_Pictographic}/gu, '')
  .replace(/[⬆⬇⬅➡↻↺✚]/g, '')
  .replace(/([RLUDFBr])'/g, '$1反')
  .replace(/([RLUDFBr])2/g, '$1两下');

export function speak(text) {
  if (muted || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean(text));
    u.lang = 'zh-CN';
    u.rate = 0.95;
    u.pitch = 1.15;
    speechSynthesis.speak(u);
  } catch { /* 忽略 */ }
}
