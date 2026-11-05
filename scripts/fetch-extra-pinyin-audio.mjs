import { createRequire } from 'node:module';
import { readFile, writeFile, access } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { WORLDS } = require('../games/pinyin-adventure/js/levels.js');
const base = new URL('../games/pinyin-adventure/audio/', import.meta.url);
const ids = [...new Set(WORLDS.flatMap(w => w.levels.flatMap(l => Object.values(l.pools).flat().map(i => i.audio))))];
const manifest = [];
for (let i = 0; i < ids.length; i += 6) {
  await Promise.all(ids.slice(i, i + 6).map(async id => {
    const file = new URL(`syl/${id}.mp3`, base);
    const source = `https://raw.githubusercontent.com/hugolpz/audio-cmn/master/64k/syllabs/cmn-${id}.mp3`;
    try { await access(file); } catch {
      const r = await fetch(source, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`${id}: ${r.status}`);
      await writeFile(file, Buffer.from(await r.arrayBuffer()));
    }
    manifest.push({ id, source, speaker: 'Chen Wang', license: 'CC BY-SA', file: `syl/${id}.mp3` });
  }));
  console.log(`${Math.min(i + 6, ids.length)}/${ids.length}`);
}
await writeFile(new URL('manifest.json', base), JSON.stringify(manifest.sort((a,b)=>a.id.localeCompare(b.id)), null, 2));
