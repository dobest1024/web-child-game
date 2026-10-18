import { Game } from "../shared/game.js";
import { RULES } from "../shared/cards.js";

export function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (n) => alphabet[n % alphabet.length],
  ).join("");
}
export class Room {
  constructor(code, mode = "pvp", now = () => Date.now()) {
    this.code = code;
    this.mode = mode;
    this.now = now;
    this.created = now();
    this.lastActive = now();
    this.seats = [null, null];
    this.game = null;
    this.countdown = null;
    this.frame = 0;
  }
  send(socket, data) {
    try {
      if (socket && socket.readyState === 1) socket.send(JSON.stringify(data));
    } catch {
      /* Heartbeat expires failed connections. */
    }
  }
  connect(socket, { token, name }) {
    let team = token ? this.seats.findIndex((s) => s?.token === token) : -1;
    if (team < 0) {
      team = this.seats.findIndex(
        (s, i) => !s && !(this.mode === "bot" && i === 1),
      );
      if (team < 0 || this.game || this.countdown) {
        this.send(socket, {
          type: "error",
          message: "房间已满或比赛已经开始",
          fatal: true,
        });
        socket.close(1008, "Room unavailable");
        return;
      }
      this.seats[team] = {
        token: crypto.randomUUID(),
        name:
          String(name || "挑战者")
            .replace(/[\u0000-\u001f]/g, "")
            .trim()
            .slice(0, 16) || "挑战者",
        ready: false,
      };
    }
    const seat = this.seats[team];
    if (seat.socket && seat.socket !== socket)
      seat.socket.close(1000, "Reconnected elsewhere");
    Object.assign(seat, {
      socket,
      disconnected: null,
      seen: this.now(),
      window: this.now(),
      count: 0,
    });
    this.lastActive = this.now();
    this.send(socket, {
      type: "welcome",
      code: this.code,
      team,
      token: seat.token,
      mode: this.mode,
    });
    this.broadcast();
    if (this.mode === "bot" && !this.game && !this.countdown) this.start();
  }
  receive(socket, raw) {
    const team = this.seats.findIndex((s) => s?.socket === socket);
    if (team < 0) return;
    const seat = this.seats[team];
    if (this.now() - seat.window >= 1000) {
      seat.window = this.now();
      seat.count = 0;
    }
    if (++seat.count > 40 || String(raw).length > 1024) return;
    let data;
    try {
      data = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!data || typeof data !== "object") return;
    seat.seen = this.now();
    this.lastActive = this.now();
    if (data.type === "ping")
      return this.send(socket, { type: "pong", at: data.at });
    if (
      data.type === "ready" &&
      !this.countdown &&
      (!this.game || this.game.phase === "ended")
    ) {
      seat.ready = !seat.ready;
      if (this.mode === "bot" || this.seats.every((s) => s?.ready && s.socket))
        this.start();
      return this.broadcast();
    }
    if (data.type === "play" && this.game && !this.countdown) {
      const error = this.game.deploy(team, data.slot, data.x, data.z);
      if (error) this.send(socket, { type: "error", message: error });
    }
    if (data.type === "surrender" && this.game) this.game.forfeit(team);
    if (data.type === "leave") {
      if (this.game?.phase === "playing") this.game.forfeit(team);
      this.seats[team] = null;
      socket.close(1000, "Left room");
      this.broadcast();
    }
  }
  disconnect(socket) {
    const seat = this.seats.find((s) => s?.socket === socket);
    if (!seat) return;
    seat.socket = null;
    seat.disconnected = this.now();
    seat.ready = false;
    this.broadcast();
  }
  start() {
    this.game = new Game([
      this.seats[0]?.name || "挑战者",
      this.mode === "bot" ? "霜叶骑士 · AI" : this.seats[1]?.name || "挑战者",
    ]);
    this.seats.forEach((s) => {
      if (s) s.ready = false;
    });
    this.countdown = this.now() + 3000;
    this.broadcast();
  }
  tick() {
    const now = this.now();
    this.seats.forEach((s, i) => {
      if (!s) return;
      if (s.socket && now - s.seen > 20000) {
        const socket = s.socket;
        this.disconnect(socket);
        socket.close(1001, "Heartbeat timeout");
      }
      if (
        s.disconnected !== null &&
        s.disconnected !== undefined &&
        now - s.disconnected >= RULES.reconnectSeconds * 1000
      ) {
        if (this.game?.phase === "playing") this.game.forfeit(i);
        if (!this.game || this.game.phase === "ended") this.seats[i] = null;
      }
    });
    if (this.countdown && now >= this.countdown) this.countdown = null;
    if (this.game && !this.countdown) {
      this.game.step();
      if (this.mode === "bot") this.game.bot();
    }
    if (++this.frame % 2 === 0) this.broadcast();
  }
  broadcast() {
    this.seats.forEach((s, team) => {
      if (!s?.socket) return;
      this.send(s.socket, {
        type: "state",
        code: this.code,
        mode: this.mode,
        countdown: this.countdown
          ? Math.max(0, (this.countdown - this.now()) / 1000)
          : 0,
        seats: this.seats.map((seat, i) =>
          this.mode === "bot" && i === 1
            ? { name: "霜叶骑士 · AI", connected: true, ready: true }
            : seat
              ? {
                  name: seat.name,
                  connected: !!seat.socket,
                  ready: seat.ready,
                  reconnect: seat.disconnected
                    ? Math.max(
                        0,
                        RULES.reconnectSeconds -
                          (this.now() - seat.disconnected) / 1000,
                      )
                    : 0,
                }
              : null,
        ),
        game: this.game?.snapshot(team) || null,
      });
    });
  }
  get empty() {
    return !this.seats.some((s) => s?.socket);
  }
  get expired() {
    return this.empty && this.now() - this.lastActive > 120000;
  }
}
