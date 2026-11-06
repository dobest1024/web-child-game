// 键盘与曲谱数据（纯数据，不含 DOM / 音频）。
// 白键 13 个：C4 起的两个八度（到 A5）；黑键 9 个，按真实钢琴位置排布。
export const whites = [
  { note: 'C4', solfege: 'do', key: 'a' },
  { note: 'D4', solfege: 're', key: 's' },
  { note: 'E4', solfege: 'mi', key: 'd' },
  { note: 'F4', solfege: 'fa', key: 'f' },
  { note: 'G4', solfege: 'sol', key: 'g' },
  { note: 'A4', solfege: 'la', key: 'h' },
  { note: 'B4', solfege: 'si', key: 'j' },
  { note: 'C5', solfege: 'do', key: 'k' },
  { note: 'D5', solfege: 're', key: 'l' },
  { note: 'E5', solfege: 'mi', key: 'z' },
  { note: 'F5', solfege: 'fa', key: 'x' },
  { note: 'G5', solfege: 'sol', key: 'c' },
  { note: 'A5', solfege: 'la', key: 'v' },
];
// anchor 是黑键左边相邻的白键音名，渲染时黑键骑在两个白键之间。
export const blacks = [
  { note: 'C#4', anchor: 'C4', key: 'w' },
  { note: 'D#4', anchor: 'D4', key: 'e' },
  { note: 'F#4', anchor: 'F4', key: 't' },
  { note: 'G#4', anchor: 'G4', key: 'y' },
  { note: 'A#4', anchor: 'A4', key: 'u' },
  { note: 'C#5', anchor: 'C5', key: 'i' },
  { note: 'D#5', anchor: 'D5', key: 'o' },
  { note: 'F#5', anchor: 'F5', key: 'p' },
  { note: 'G#5', anchor: 'G5', key: 'r' },
];
export const allKeys = [...whites, ...blacks];
export const noteByKey = new Map(allKeys.map((k) => [k.key, k.note]));
export const keyByNote = new Map(allKeys.map((k) => [k.note, k.key]));
export const infoByNote = new Map(allKeys.map((k) => [k.note, k]));
export const isWhiteNote = (note) => whites.some((k) => k.note === note);

const beats = (text) =>
  text
    .trim()
    .split(/\s+/)
    .map((token) => {
      const [note, duration] = token.split(':');
      return { n: note, b: Number(duration) };
    });
const designs = [
  {
    id: 0,
    name: '小星星',
    emoji: '⭐',
    firstLine: '一闪一闪亮晶晶',
    beatsPerBar: 4,
    // 一闪一闪亮晶晶：C C G G A A G
    music: `
      C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2
      F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2
      G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2
      G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2
      C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2
      F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2
    `,
  },
  {
    id: 1,
    name: '小蜜蜂',
    emoji: '🐝',
    firstLine: '嗡嗡嗡，嗡嗡嗡，大家一起勤做工',
    beatsPerBar: 4,
    music: `
      G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 D4:1 E4:1 F4:1 G4:1 G4:1 G4:2
      G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 E4:1 G4:1 G4:1 E4:4
      D4:1 D4:1 D4:1 D4:1 D4:1 E4:1 F4:2 E4:1 E4:1 E4:1 E4:1 E4:1 F4:1 G4:2
      G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 E4:1 G4:1 G4:1 C4:4
    `,
  },
  {
    id: 2,
    name: '粉刷匠',
    emoji: '🎨',
    firstLine: '我是一个粉刷匠，粉刷本领强',
    beatsPerBar: 2,
    music: `
      G4:0.5 E4:0.5 G4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1
      D4:0.5 F4:0.5 E4:0.5 D4:0.5 G4:2
      G4:0.5 E4:0.5 G4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1
      D4:0.5 F4:0.5 E4:0.5 D4:0.5 C4:2
      D4:0.5 D4:0.5 F4:0.5 F4:0.5 E4:0.5 C4:0.5 G4:1
      D4:0.5 D4:0.5 E4:0.5 F4:0.5 E4:1 C4:1
      G4:0.5 E4:0.5 G4:0.5 E4:0.5 G4:0.5 E4:0.5 C4:1
      D4:0.5 F4:0.5 E4:0.5 D4:0.5 C4:2
    `,
  },
  {
    id: 3,
    name: '欢乐颂',
    emoji: '🎼',
    firstLine: '欢乐女神圣洁美丽',
    beatsPerBar: 4,
    music: `
      E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2
      E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2
    `,
  },
  {
    id: 4,
    name: '两只老虎',
    emoji: '🐯',
    firstLine: '两只老虎，两只老虎，跑得快',
    beatsPerBar: 4,
    music: `
      C5:1 D5:1 E5:1 C5:1 C5:1 D5:1 E5:1 C5:1
      E5:1 F5:1 G5:2 E5:1 F5:1 G5:2
      G5:1 A5:1 G5:1 F5:1 E5:2 C5:2
      G5:1 A5:1 G5:1 F5:1 E5:2 C5:2
      C5:1 G4:1 C5:2 C5:1 G4:1 C5:2
    `,
  },
  {
    id: 5,
    name: '找朋友',
    emoji: '🤝',
    firstLine: '找呀找呀找朋友，找到一个好朋友',
    beatsPerBar: 2,
    music: `
      C4:0.5 C4:0.5 C4:0.5 G4:0.5 E4:0.5 G4:0.5 G4:1
      G4:0.5 A4:0.5 G4:0.5 E4:0.5 D4:0.5 E4:0.5 D4:1
      E4:0.5 C4:0.5 C4:1 G4:0.5 E4:0.5 D4:1
      C4:0.5 D4:0.5 E4:0.5 G4:0.5 D4:0.5 E4:0.5 C4:1
    `,
  },
  {
    id: 6,
    name: '生日快乐',
    emoji: '🎂',
    firstLine: '祝你生日快乐',
    beatsPerBar: 3,
    music: `
      G4:0.5 G4:0.5 A4:1 G4:1 C5:1 B4:2
      G4:0.5 G4:0.5 A4:1 G4:1 D5:1 C5:2
      G4:0.5 G4:0.5 G5:1 E5:1 C5:1 B4:1 A4:1
      F5:0.5 F5:0.5 E5:1 C5:1 D5:1 C5:2
    `,
  },
];
export const songs = designs.map((design) => {
  const notes = beats(design.music);
  const totalBeats = notes.reduce((sum, note) => sum + note.b, 0);
  return {
    id: design.id,
    name: design.name,
    emoji: design.emoji,
    firstLine: design.firstLine,
    beatsPerBar: design.beatsPerBar,
    notes,
    totalBeats,
    bars: totalBeats / design.beatsPerBar,
  };
});
