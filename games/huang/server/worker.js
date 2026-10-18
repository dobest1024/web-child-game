import { Room, roomCode } from "./room.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ ok: true });
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const code = roomCode();
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      const result = await stub.fetch(
        new Request(
          `https://room/init?code=${code}&mode=${url.searchParams.get("mode") === "bot" ? "bot" : "pvp"}`,
          { method: "POST" },
        ),
      );
      if (!result.ok) return result;
      return Response.json({ code }, { status: 201 });
    }
    if (url.pathname === "/ws") {
      const code = url.searchParams.get("code");
      if (!/^[A-Z2-9]{6}$/.test(code || ""))
        return new Response("Invalid room", { status: 400 });
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin)
        return new Response("Invalid origin", { status: 403 });
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
export class BattleRoom {
  constructor() {
    this.room = null;
    this.timer = null;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/init" && request.method === "POST") {
      if (this.room) return new Response("Room exists", { status: 409 });
      this.room = new Room(
        url.searchParams.get("code"),
        url.searchParams.get("mode"),
      );
      return new Response("Created");
    }
    if (!this.room || this.room.expired)
      return new Response("Room expired", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket")
      return new Response("Expected websocket", { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.room.connect(server, {
      token: url.searchParams.get("token"),
      name: url.searchParams.get("name"),
    });
    server.addEventListener("message", (e) =>
      this.room.receive(server, e.data),
    );
    server.addEventListener("close", () => this.room.disconnect(server));
    server.addEventListener("error", () => this.room.disconnect(server));
    if (!this.timer)
      this.timer = setInterval(() => {
        this.room.tick();
        if (this.room.expired) {
          clearInterval(this.timer);
          this.timer = null;
          this.room = null;
        }
      }, 50);
    return new Response(null, { status: 101, webSocket: client });
  }
}
