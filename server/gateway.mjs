import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};
const staticGames = new Set([
  'ai-edu',
  'earth',
  'edu-game',
  'fanyingnengli',
  'mini-game',
  'tanke',
  'zhili',
]);
const crownRoutes =
  /^\/(api\/|src\/|shared\/|public\/|vendor\/|style\.css$|health$)/;
const reply = (res, code, text) => {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
};

export function createGateway({ root, crownPort }) {
  const server = http.createServer(async (req, res) => {
    let url, route;
    try {
      url = new URL(req.url, 'http://localhost');
      route = decodeURIComponent(url.pathname);
    } catch {
      return reply(res, 400, '无效的地址');
    }
    if (
      route
        .split('/')
        .some((part) => part.startsWith('.') || part === 'node_modules') ||
      route.includes('\\') ||
      route.includes('\0')
    ) {
      return reply(res, 404, '页面不存在');
    }
    // Existing Crown Gorge invitation links use the origin root.
    if (route === '/' && url.searchParams.has('room')) {
      res.writeHead(302, {
        Location: `/play.html?game=crown&room=${encodeURIComponent(url.searchParams.get('room'))}`,
      });
      return res.end();
    }
    if (
      route === '/huang' ||
      route === '/cube-game' ||
      staticGames.has(route.slice(1))
    ) {
      res.writeHead(302, { Location: `${url.pathname}/${url.search}` });
      return res.end();
    }
    if (route.startsWith('/huang/') || crownRoutes.test(route)) {
      const upstream = http.request(
        {
          hostname: '127.0.0.1',
          port: crownPort,
          method: req.method,
          path: route.startsWith('/huang/')
            ? req.url.slice('/huang'.length)
            : req.url,
          headers: req.headers,
        },
        (response) => {
          res.writeHead(response.statusCode, response.headers);
          response.pipe(res);
        },
      );
      upstream.on('error', () => {
        if (!res.headersSent)
          reply(res, 502, '对战服务暂时不可用，请稍后重试。');
        else res.destroy();
      });
      req.pipe(upstream);
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method))
      return reply(res, 405, '不支持的请求方式');
    let base, relative;
    const first = route.split('/')[1];
    if (route === '/' || route === '/index.html' || route === '/play.html') {
      base = root;
      relative = route === '/' ? 'index.html' : route.slice(1);
    } else if (first === 'portal') {
      base = path.join(root, 'portal');
      relative = route.slice('/portal/'.length);
    } else if (first === 'cube-game' || first === 'audio') {
      base = path.join(root, '.cache/cube-game');
      relative =
        first === 'audio' ? route.slice(1) : route.slice('/cube-game/'.length);
    } else if (staticGames.has(first)) {
      base = path.join(root, 'games', first);
      relative = route.slice(first.length + 2);
    } else {
      return reply(res, 404, '页面不存在');
    }
    try {
      let filename = path.resolve(base, relative || '.');
      let info = await stat(filename);
      if (info.isDirectory()) {
        if (!route.endsWith('/')) {
          res.writeHead(302, { Location: `${url.pathname}/${url.search}` });
          return res.end();
        }
        filename = path.join(filename, 'index.html');
        info = await stat(filename);
      }
      const actual = await realpath(filename);
      const basePath = await realpath(base);
      const type = types[path.extname(actual)];
      if (
        !actual.startsWith(`${basePath}${path.sep}`) ||
        !info.isFile() ||
        !type
      )
        return reply(res, 404, '页面不存在');
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': info.size,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') return res.end();
      createReadStream(actual)
        .on('error', () => res.destroy())
        .pipe(res);
    } catch {
      reply(res, 404, '页面不存在');
    }
  });
  server.on('upgrade', (req, socket, head) => {
    if (new URL(req.url, 'http://localhost').pathname !== '/ws')
      return socket.destroy();
    const upstream = http.request({
      hostname: '127.0.0.1',
      port: crownPort,
      path: req.url,
      headers: req.headers,
    });
    upstream.on('upgrade', (response, peer, peerHead) => {
      socket.write(
        `HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`,
      );
      for (let i = 0; i < response.rawHeaders.length; i += 2)
        socket.write(
          `${response.rawHeaders[i]}: ${response.rawHeaders[i + 1]}\r\n`,
        );
      socket.write('\r\n');
      if (peerHead.length) socket.write(peerHead);
      if (head.length) peer.write(head);
      peer.on('error', () => socket.destroy());
      socket.on('error', () => peer.destroy());
      socket.on('close', () => peer.destroy());
      peer.on('close', () => socket.destroy());
      socket.pipe(peer).pipe(socket);
    });
    upstream.on('response', (response) => {
      response.resume();
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    upstream.end();
  });
  return server;
}
