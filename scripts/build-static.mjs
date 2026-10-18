import { cp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
function run(script, cwd) {
  const result = spawnSync(process.execPath, [script], { cwd, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Build failed: ${script}`);
}
run('scripts/build.mjs', root);
run('tools/build.js', path.join(root, 'games/huang'));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'play.html', 'portal']) {
  await cp(path.join(root, file), path.join(output, file), { recursive: true });
}
const publicExtensions = new Set(['.html', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.mp3', '.wav', '.ogg', '.woff', '.woff2', '.ttf', '.wasm', '.txt']);
async function copyPublic(source, target) {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'dist', 'docs', 'tests', 'tools', 'artifacts'].includes(entry.name)) continue;
    const from = path.join(source, entry.name), to = path.join(target, entry.name);
    if (entry.isDirectory()) await copyPublic(from, to);
    else if (entry.isFile() && publicExtensions.has(path.extname(entry.name))) await cp(from, to);
  }
}
for (const game of ['ai-edu', 'earth', 'edu-game', 'fanyingnengli', 'mini-game', 'tanke', 'zhili']) {
  await copyPublic(path.join(root, 'games', game), path.join(output, game));
}
await cp(path.join(root, '.cache/cube-game'), path.join(output, 'cube-game'), { recursive: true });
// The original voice manifest uses /audio, shared by all Cube Island lessons.
await cp(path.join(root, '.cache/cube-game/audio'), path.join(output, 'audio'), { recursive: true });
await cp(path.join(root, 'games/huang/dist'), path.join(output, 'huang'), { recursive: true });
await mkdir(path.join(output, 'huang/server'), { recursive: true });
await cp(path.join(root, 'games/huang/server/room.js'), path.join(output, 'huang/server/room.js'));
await cp(path.join(root, 'games/huang/src/network-local.js'), path.join(output, 'huang/src/network.js'));

async function edit(relative, transform) {
  const file = path.join(output, relative);
  await writeFile(file, transform(await readFile(file, 'utf8')));
}
await edit('huang/index.html', (html) => html
  .replaceAll('"/public/', '"/huang/public/')
  .replaceAll('"/vendor/', '"/huang/vendor/')
  .replaceAll('"/src/', '"/huang/src/')
  .replace('href="/style.css"', 'href="/huang/style.css"')
  .replace('href="/" aria-label="王冠峡谷首页"', 'href="/huang/" aria-label="王冠峡谷首页"')
  .replace('好友房间 / AI 练习', '单人 AI 练习 · 好友联机暂未开放')
  .replace('<div class="divider">', '<p class="intro">预览版开放单人 AI 练习，好友联机暂未开放。</p><div class="divider">')
  .replace('</head>', '<style>#create,#join-form,.divider,.room-code-row{display:none!important}</style></head>'));
await edit('huang/src/scene.js', (source) => source.replace('"/vendor/BufferGeometryUtils.js"', '"../vendor/BufferGeometryUtils.js"'));
await edit('portal/games.js', (source) => source
  .replace('安排你的卡牌小队，和 AI 或朋友来一场对决。', '安排你的卡牌小队，和 AI 来一场策略对决。')
  .replace('可以好友联机', '单人 AI 练习')
  .replace('卡牌 联机 策略 战斗 双人', '卡牌 单人 AI 策略 战斗')
  .replace('策略 · 实时对战', '策略 · AI 对战'));
console.log(`Static preview ready: ${output} (14 games; Crown Gorge AI practice)`);
