import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const vite = `${root}games/cube-game/node_modules/vite/bin/vite.js`;
if (
  !existsSync(vite) ||
  !existsSync(`${root}games/huang/node_modules/ws/package.json`)
) {
  console.error('请先运行 npm run setup 安装游戏依赖。');
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [
    vite,
    'build',
    '--base',
    '/cube-game/',
    '--outDir',
    '../../.cache/cube-game',
    '--emptyOutDir',
  ],
  {
    cwd: `${root}games/cube-game`,
    stdio: 'inherit',
  },
);
process.exit(result.status || (result.error ? 1 : 0));
