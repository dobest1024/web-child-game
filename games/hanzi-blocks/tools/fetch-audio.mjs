// 从 audio-cmn（CC BY-SA）下载字音和组词录音，写 audio/manifest.json 和 js/audio-list.js
// 用法：node tools/fetch-audio.mjs   （需要联网；文件已存在就跳过）
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { CHARS, charAudio, wordAudio } = require('../js/chars.js');
const RAW = 'https://raw.githubusercontent.com/hugolpz/audio-cmn/master/64k';
const root = new URL('../', import.meta.url);

// 多音字：HSK 单字录音不知道读的是哪个音，改用带声调的音节录音
const POLYPHONES = new Set(['好', '地', '红']);
const MARKS = { a: 'āáǎà', o: 'ōóǒò', e: 'ēéěè', i: 'īíǐì', u: 'ūúǔù', v: 'ǖǘǚǜ' };
function numbered(py) {
  let tone = 5, base = '';
  for (const ch of py.replace('ü', 'v')) {
    const hit = Object.entries(MARKS).find(([, m]) => m.includes(ch));
    if (hit) { tone = hit[1].indexOf(ch) + 1; base += hit[0]; } else base += ch;
  }
  return base + tone;
}

// 文件清单：可以用 AUDIO_CMN_TREE 指定一个本地清单文件（每行一个路径），否则走 GitHub API（未登录每小时 60 次）
async function listFiles() {
  if (process.env.AUDIO_CMN_TREE) return readFileSync(process.env.AUDIO_CMN_TREE, 'utf8').split('\n').map((l) => l.trim());
  const tree = await (await fetch('https://api.github.com/repos/hugolpz/audio-cmn/git/trees/master?recursive=1')).json();
  if (!tree.tree) throw new Error(`GitHub API：${tree.message}`);
  return tree.tree.map((t) => t.path);
}
const files = new Set(await listFiles());
const previous = JSON.parse(readFileSync(new URL('audio/manifest.json', root), 'utf8'));
async function get(src, dest) {
  if (existsSync(new URL(dest, root)) && previous.some(m => m.file === dest && m.source === `64k/${src}`)) return;
  const res = await fetch(`${RAW}/${src}`);
  if (!res.ok) throw new Error(`${src}: ${res.status}`);
  await writeFile(new URL(dest, root), Buffer.from(await res.arrayBuffer()));
}

const manifest = [];
const words = [];
for (const ch of Object.values(CHARS)) {
  const hsk = `hsk/cmn-${ch.c}.mp3`;
  let syl = `syllabs/cmn-${numbered(ch.py)}.mp3`;
  if (ch.py === 'jù') syl = 'syllabs/cmn-jv4.mp3';
  const src = ch.source.startsWith('一') && !POLYPHONES.has(ch.c) && files.has(`64k/${hsk}`) ? hsk : syl;
  if (!files.has(`64k/${src}`)) throw new Error(`缺录音：${ch.c} ${src}`);
  await get(src, `audio/${charAudio(ch.c)}.mp3`);
  manifest.push({ text: ch.c, py: ch.py, file: `audio/${charAudio(ch.c)}.mp3`, source: `64k/${src}`, speaker: src.startsWith('hsk') ? 'Yue Tan' : 'Chen Wang' });
  const w = `hsk/cmn-${ch.word}.mp3`;
  if (files.has(`64k/${w}`) && !words.includes(ch.word)) {
    await get(w, `audio/${wordAudio(ch.word)}.mp3`);
    words.push(ch.word);
    manifest.push({ text: ch.word, file: `audio/${wordAudio(ch.word)}.mp3`, source: `64k/${w}`, speaker: 'Yue Tan' });
  }
}
writeFileSync(new URL('audio/manifest.json', root), JSON.stringify(manifest, null, 1) + '\n');
writeFileSync(new URL('js/audio-list.js', root), `'use strict';
// 由 tools/fetch-audio.mjs 生成：有组词录音的词（字音每个字都有）
const WORD_AUDIO = ${JSON.stringify(words)};
if (typeof module === 'object') module.exports = { WORD_AUDIO };
`);
console.log(`字音 ${Object.keys(CHARS).length} 个，组词录音 ${words.length} 个`);
