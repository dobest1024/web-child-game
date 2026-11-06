// 密码解谜家 - 核心密码学逻辑引擎

export const MORSE_TABLE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
};

export const REVERSE_MORSE = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([k, v]) => [v, k])
);

// 凯撒密码位移
export function caesarShift(text, shift) {
  return text.toUpperCase().split('').map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      // 保证正模取余
      const base = 65;
      const normalizedShift = ((shift % 26) + 26) % 26;
      return String.fromCharCode(((code - base + normalizedShift) % 26) + base);
    }
    return char;
  }).join('');
}

// 凯撒解密 (逆移位)
export function caesarDecrypt(cipherText, shift) {
  return caesarShift(cipherText, -shift);
}

// 摩斯电码编码
export function morseEncode(text) {
  return text.toUpperCase().split('').map((c) => {
    if (c === ' ') return '/';
    return MORSE_TABLE[c] || c;
  }).join(' ');
}

// 摩斯电码解码
export function morseDecode(morse) {
  return morse.trim().split(/\s+/).map((token) => {
    if (token === '/') return ' ';
    return REVERSE_MORSE[token] || '?';
  }).join('');
}

// Atbash 镜像反转密码 (A <-> Z, B <-> Y)
export function atbash(text) {
  return text.toUpperCase().split('').map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(90 - (code - 65));
    }
    return char;
  }).join('');
}

// 验证用户解密答案
export function verifyAnswer(userAnswer, expectedAnswer) {
  if (!userAnswer || !expectedAnswer) return false;
  return userAnswer.trim().toUpperCase() === expectedAnswer.trim().toUpperCase();
}

export function calculateStars(attempts, hintsUsed) {
  if (attempts <= 1 && hintsUsed === 0) return 3;
  if (attempts <= 3) return 2;
  return 1;
}

export function sanitizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(raw)) {
    const levelNum = Number(k);
    const stars = Number(v);
    if (Number.isInteger(levelNum) && levelNum >= 1 && levelNum <= 100) {
      clean[levelNum] = Math.max(1, Math.min(3, Math.floor(stars) || 1));
    }
  }
  return clean;
}
