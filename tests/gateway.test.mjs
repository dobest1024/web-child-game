import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createGateway } from '../server/gateway.mjs';
import { games } from '../portal/games.js';

test('unified game gateway', async (t) => {
  const upstream = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        path: req.url,
        method: req.method,
        host: req.headers.host,
      }),
    );
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const gateway = createGateway({
    root: fileURLToPath(new URL('../', import.meta.url)),
    crownPort: upstream.address().port,
  });
  await new Promise((resolve) => gateway.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${gateway.address().port}`;
  t.after(() => {
    gateway.closeAllConnections();
    upstream.closeAllConnections();
    gateway.close();
    upstream.close();
  });

  await t.test(
    'all 14 game entries open, including the built cube game',
    async () => {
      assert.equal(games.length, 14);
      assert.equal(new Set(games.map((game) => game.id)).size, games.length);
      for (const game of games) {
        const response = await fetch(`${base}${game.path}`);
        assert.equal(response.status, 200, game.title);
        const body = await response.text();
        if (game.id !== 'crown')
          assert.ok(
            /<title[>\s]/i.test(body),
            `${game.title} should return its HTML entry point`,
          );
      }
    },
  );
  await t.test(
    'home and player are served; HTML HEAD has no body',
    async () => {
      for (const route of ['/', '/play.html?game=cube']) {
        const response = await fetch(`${base}${route}`, { method: 'HEAD' });
        assert.equal(response.status, 200);
        assert.equal(await response.text(), '');
        assert.match(response.headers.get('content-type'), /text\/html/);
      }
    },
  );
  await t.test(
    'Crown HTTP proxy preserves API paths, query parameters, methods and host',
    async () => {
      const response = await fetch(`${base}/api/rooms?mode=bot`, {
        method: 'POST',
      });
      assert.deepEqual(await response.json(), {
        path: '/api/rooms?mode=bot',
        method: 'POST',
        host: new URL(base).host,
      });
      assert.equal(
        (await (await fetch(`${base}/huang/?room=ABC123`)).json()).path,
        '/?room=ABC123',
      );
    },
  );
  await t.test(
    'invitation links return through the portal player',
    async () => {
      const response = await fetch(`${base}/?room=ABC123`, {
        redirect: 'manual',
      });
      assert.equal(response.status, 302);
      assert.equal(
        response.headers.get('location'),
        '/play.html?game=crown&room=ABC123',
      );
    },
  );
  await t.test(
    'directory redirects preserve relative asset loading',
    async () => {
      for (const route of [
        '/cube-game',
        '/earth',
        '/huang',
        '/mini-game/weiqi',
      ]) {
        const response = await fetch(`${base}${route}`, { redirect: 'manual' });
        assert.equal(response.status, 302, route);
        assert.equal(response.headers.get('location'), `${route}/`);
      }
    },
  );
  await t.test(
    'private files, unknown routes and malformed paths are not served',
    async () => {
      for (const route of [
        '/package.json',
        '/.git/config',
        '/games/huang/server/local.js',
        '/tanke/docs/01-设计理念.md',
        '/ai-edu/%2e%2e%2fpackage.json',
        '/cube-game/node_modules/ws/package.json',
        '/missing',
      ]) {
        assert.equal((await fetch(`${base}${route}`)).status, 404, route);
      }
      assert.equal((await fetch(`${base}/%E0%A4`)).status, 400);
      assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
    },
  );
});
