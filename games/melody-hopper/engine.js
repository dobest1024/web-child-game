// 音符跳跃岛 - 核心逻辑计算引擎
export const NOTE_DEFINITIONS = [
  { id: 'C4', name: 'Do', solfege: '1', freq: 261.63, staffLine: -1, isLedger: true },
  { id: 'D4', name: 'Re', solfege: '2', freq: 293.66, staffLine: -0.5, isLedger: false },
  { id: 'E4', name: 'Mi', solfege: '3', freq: 329.63, staffLine: 0, isLedger: false },
  { id: 'F4', name: 'Fa', solfege: '4', freq: 349.23, staffLine: 0.5, isLedger: false },
  { id: 'G4', name: 'Sol', solfege: '5', freq: 392.00, staffLine: 1, isLedger: false },
  { id: 'A4', name: 'La', solfege: '6', freq: 440.00, staffLine: 1.5, isLedger: false },
  { id: 'B4', name: 'Ti', solfege: '7', freq: 493.88, staffLine: 2, isLedger: false },
  { id: 'C5', name: 'Do’', solfege: 'i', freq: 523.25, staffLine: 2.5, isLedger: false },
  { id: 'D5', name: 'Re’', solfege: '2̇', freq: 587.33, staffLine: 3, isLedger: false },
  { id: 'E5', name: 'Mi’', solfege: '3̇', freq: 659.25, staffLine: 3.5, isLedger: false },
  { id: 'F5', name: 'Fa’', solfege: '4̇', freq: 698.46, staffLine: 4, isLedger: false },
];

export const NOTE_MAP = Object.fromEntries(
  NOTE_DEFINITIONS.map((n) => [n.id, n])
);

export function getStaffPosition(noteId) {
  const note = NOTE_MAP[noteId];
  return note ? note.staffLine : 0;
}

export function checkNoteMatch(targetNoteId, inputNoteId) {
  return targetNoteId === inputNoteId;
}

export function calculateStars(wrongAttempts, hintsUsed) {
  if (wrongAttempts === 0 && hintsUsed === 0) return 3;
  if (wrongAttempts <= 2) return 2;
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
