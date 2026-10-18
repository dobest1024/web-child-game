import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const game of ['cube-game', 'huang']) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['ci'],
    {
      cwd: fileURLToPath(new URL(`../games/${game}/`, import.meta.url)),
      stdio: 'inherit',
    },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
