import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import './build-static.mjs';

// cf deploy --prebuilt consumes Cloudflare's v0 Build Output Specification.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.cloudflare/output');
const worker = path.join(output, 'v0/workers/default');
await rm(output, { recursive: true, force: true });
await mkdir(worker, { recursive: true });
await cp(path.join(root, 'dist'), path.join(worker, 'assets'), { recursive: true });
await writeFile(path.join(output, 'v0/config.json'), JSON.stringify({
  accountId: 'f182db92caee55b876494571e9103c0a',
  buildContext: { isPreview: false },
}, null, 2));
await writeFile(path.join(worker, 'worker.config.json'), JSON.stringify({
  name: 'web-child-game',
  compatibilityDate: '2026-10-01',
  domains: ['game.930316.xyz'],
  assets: {
    htmlHandling: 'auto-trailing-slash',
    notFoundHandling: 'none',
  },
}, null, 2));
console.log('Cloudflare assets ready; deploy with cf deploy --prebuilt --profile work');
