import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { networkInterfaces } from 'node:os';
import { createGateway } from './gateway.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const reserve = createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const crownPort = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const crown = spawn(process.execPath, ['server/local.js'], {
  cwd: `${root}games/huang`,
  env: { ...process.env, PORT: String(crownPort) },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let server;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server?.close();
  crown.kill('SIGTERM');
  setTimeout(() => {
    crown.kill('SIGKILL');
    process.exit(code);
  }, 1200).unref();
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
crown.on('error', (error) => {
  console.error(error.message);
  stop(1);
});
crown.on('exit', (code) => {
  if (!stopping) {
    console.error(`对战服务退出 (${code})`);
    stop(1);
  }
});
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('对战服务启动超时')),
      10000,
    );
    crown.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('http://localhost:')) {
        clearTimeout(timer);
        resolve();
      }
    });
    crown.once('exit', () => {
      clearTimeout(timer);
      reject(new Error('请运行 npm run setup 检查游戏依赖'));
    });
  });
  const port = Number(process.env.PORT || 8780);
  server = createGateway({ root, crownPort });
  server.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  server.listen(port, process.env.HOST || '0.0.0.0', () => {
    console.log(`\n小小游乐岛已启动：http://localhost:${port}`);
    if (!process.env.HOST || process.env.HOST === '0.0.0.0') {
      for (const entries of Object.values(networkInterfaces())) {
        for (const net of entries || [])
          if (net.family === 'IPv4' && !net.internal)
            console.log(`同一 Wi-Fi 访问：http://${net.address}:${port}`);
      }
    }
  });
} catch (error) {
  console.error(error.message);
  stop(1);
}
