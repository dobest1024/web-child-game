export class Connection {
  constructor({ onState, onStatus, onError, onWelcome, onPing }) {
    Object.assign(this, { onState, onStatus, onError, onWelcome, onPing });
    this.socket = null;
    this.room = null;
    this.attempt = 0;
    this.closed = true;
    this.timer = null;
    this.heartbeat = null;
  }
  async create(mode, name) {
    const response = await fetch(`/api/rooms?mode=${mode}`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "无法创建房间");
    this.join(data.code, name);
  }
  join(code, name, token = null) {
    this.leave();
    this.closed = false;
    this.room = { code, name, token };
    this.attempt = 0;
    this.open();
  }
  open() {
    if (this.closed) return;
    this.onStatus(this.attempt ? "reconnecting" : "connecting");
    const url = new URL("/ws", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("code", this.room.code);
    url.searchParams.set("name", this.room.name);
    if (this.room.token) url.searchParams.set("token", this.room.token);
    const socket = new WebSocket(url);
    this.socket = socket;
    this.timer = setTimeout(() => socket.close(), 8000);
    socket.addEventListener("message", (event) => {
      if (socket !== this.socket) return;
      const data = JSON.parse(event.data);
      if (data.type === "welcome") {
        clearTimeout(this.timer);
        this.attempt = 0;
        this.room.token = data.token;
        sessionStorage.setItem("crown-room", JSON.stringify(this.room));
        this.onWelcome(data);
        this.onStatus("connected");
        clearInterval(this.heartbeat);
        this.send({ type: "ping", at: Date.now() });
        this.heartbeat = setInterval(
          () => this.send({ type: "ping", at: Date.now() }),
          5000,
        );
      } else if (data.type === "state") this.onState(data);
      else if (data.type === "pong")
        this.onPing(Math.max(0, Date.now() - data.at));
      else if (data.type === "error") {
        this.onError(data.message);
        if (data.fatal) {
          this.closed = true;
          sessionStorage.removeItem("crown-room");
          this.onStatus("failed");
        }
      }
    });
    socket.addEventListener("close", () => {
      if (socket !== this.socket) return;
      clearTimeout(this.timer);
      clearInterval(this.heartbeat);
      if (this.closed) return;
      if (++this.attempt > 8) {
        this.closed = true;
        sessionStorage.removeItem("crown-room");
        this.onStatus("failed");
        this.onError("房间不存在或连接已失效，请重新创建或加入");
        return;
      }
      this.onStatus("reconnecting");
      this.timer = setTimeout(() => this.open(), this.room.token ? 2000 : 1000);
    });
    socket.addEventListener("error", () => {
      /* close schedules retry and surfaces final error. */
    });
  }
  send(data) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(data));
    return true;
  }
  leave() {
    this.closed = true;
    clearTimeout(this.timer);
    clearInterval(this.heartbeat);
    this.send({ type: "leave" });
    this.socket?.close();
    this.socket = null;
    this.room = null;
    sessionStorage.removeItem("crown-room");
  }
}
