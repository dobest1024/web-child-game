import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { WebSocketServer } from "ws";
import { Room, roomCode } from "./room.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const rooms = new Map();
const rate = new Map();
const port = Number(process.env.PORT || 8790);
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health")
    return json(res, 200, { ok: true, rooms: rooms.size });
  if (url.pathname === "/api/rooms" && req.method === "POST") {
    const key = req.socket.remoteAddress;
    const now = Date.now();
    const entry = rate.get(key) || { count: 0, start: now };
    if (now - entry.start > 60000) {
      entry.count = 0;
      entry.start = now;
    }
    rate.set(key, entry);
    if (++entry.count > 20 || rooms.size >= 500)
      return json(res, 429, { error: "创建房间太频繁，请稍后再试" });
    let code;
    do {
      code = roomCode();
    } while (rooms.has(code));
    rooms.set(
      code,
      new Room(code, url.searchParams.get("mode") === "bot" ? "bot" : "pvp"),
    );
    return json(res, 201, { code });
  }
  if (!["GET", "HEAD"].includes(req.method))
    return json(res, 405, { error: "Method not allowed" });
  let route;
  try {
    route = decodeURIComponent(url.pathname);
  } catch {
    return json(res, 400, { error: "Bad path" });
  }
  if (route === "/") route = "/index.html";
  // Explicit public paths keep server sources, tokens, and local files private.
  if (
    !(
      route === "/index.html" ||
      route === "/style.css" ||
      /^\/(src|shared|public)\/[\w/.-]+$/.test(route) ||
      /^\/vendor\/(three(\.core)?|BufferGeometryUtils)\.js$/.test(route)
    ) ||
    route.includes("..")
  )
    return json(res, 404, { error: "Not found" });
  const file =
    route === "/vendor/BufferGeometryUtils.js"
      ? path.join(
          root,
          "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",
        )
      : route.startsWith("/vendor/")
        ? path.join(
            root,
            "node_modules/three/build",
            path
              .basename(route)
              .replace(".js", ".module.js")
              .replace("three.core.module.js", "three.core.js"),
          )
        : path.join(root, route);
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8`,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    json(res, 404, { error: "Not found" });
  }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");
  const room = rooms.get(url.searchParams.get("code"));
  const origin = req.headers.origin;
  let allowed = !origin;
  try {
    if (origin) allowed = new URL(origin).host === req.headers.host;
  } catch {
    /* Invalid origins are denied. */
  }
  if (url.pathname !== "/ws" || !room || !allowed) {
    socket.end("HTTP/1.1 404 Not Found\r\n\r\n");
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    room.connect(ws, {
      token: url.searchParams.get("token"),
      name: url.searchParams.get("name"),
    });
    ws.on("message", (data) => room.receive(ws, data));
    ws.on("close", () => room.disconnect(ws));
    ws.on("error", () => room.disconnect(ws));
  });
});
const timer = setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.expired) rooms.delete(code);
    else room.tick();
  }
}, 50);
const cleanup = setInterval(() => {
  for (const [ip, entry] of rate)
    if (Date.now() - entry.start > 60000) rate.delete(ip);
}, 60000);
server.listen(port, "0.0.0.0", () => {
  console.log(`王冠峡谷 http://localhost:${port}`);
  for (const entries of Object.values(networkInterfaces()))
    for (const net of entries || [])
      if (net.family === "IPv4" && !net.internal)
        console.log(`局域网 http://${net.address}:${port}`);
});
function shutdown() {
  clearInterval(timer);
  clearInterval(cleanup);
  for (const ws of wss.clients) ws.close(1001);
  server.close();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
