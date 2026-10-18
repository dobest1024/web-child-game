// Used only by the static preview build. The live server adapter stays unchanged.
import { Room } from '../server/room.js';

export class Connection {
  constructor(callbacks) {
    Object.assign(this, callbacks);
    this.room = null;
    this.socket = null;
    this.timer = null;
  }

  async create(mode, name) {
    if (mode !== 'bot') throw new Error('此预览仅开放单人 AI 练习');
    this.leave();
    this.onStatus('connecting');
    const room = new Room('SOLO01', 'bot');
    const socket = {
      readyState: 1,
      send: (raw) => {
        const data = JSON.parse(raw);
        queueMicrotask(() => {
          if (this.socket !== socket) return;
          if (data.type === 'welcome') this.onWelcome(data);
          if (data.type === 'state') this.onState(data);
          if (data.type === 'error') this.onError(data.message);
        });
      },
      close: () => { socket.readyState = 3; },
    };
    this.room = room;
    this.socket = socket;
    room.connect(socket, { name });
    this.onStatus('connected');
    this.timer = setInterval(() => {
      room.receive(socket, JSON.stringify({ type: 'ping', at: Date.now() }));
      room.tick();
    }, 50);
  }

  join() {
    this.onError('此预览暂不支持好友房间，请选择单人 AI 练习');
  }

  send(data) {
    if (!this.room || this.socket?.readyState !== 1) return false;
    this.room.receive(this.socket, JSON.stringify(data));
    return true;
  }

  leave() {
    clearInterval(this.timer);
    this.timer = null;
    this.socket?.close();
    this.socket = null;
    this.room = null;
  }
}
