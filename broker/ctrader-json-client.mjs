import { randomUUID } from "node:crypto";

const HEARTBEAT_PAYLOAD_TYPE = 51;

export class CTraderJsonClient {
  constructor({ endpoint, port = 5036, onEvent } = {}) {
    this.endpoint = endpoint;
    this.port = port;
    this.onEvent = onEvent;
    this.socket = null;
    this.pending = new Map();
    this.heartbeat = null;
  }

  get connected() { return this.socket?.readyState === 1; }

  async connect() {
    if (this.connected) return;
    const url = `wss://${this.endpoint}:${this.port}`;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event) => this.#receive(String(event.data));
    this.socket.onerror = () => this.#fail(new Error("cTrader WebSocket connection failed."));
    this.socket.onclose = () => { this.#fail(new Error("cTrader WebSocket connection closed.")); this.socket = null; this.#stopHeartbeat(); };
    await new Promise((resolve, reject) => {
      const socket = this.socket;
      const timeout = setTimeout(() => reject(new Error("Timed out connecting to cTrader.")), 15000);
      socket.addEventListener("open", () => { clearTimeout(timeout); this.#startHeartbeat(); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("cTrader WebSocket connection failed.")); }, { once: true });
    });
  }

  async request(payloadType, payload = {}, timeoutMs = 15000) {
    await this.connect();
    const clientMsgId = randomUUID();
    const message = { clientMsgId, payloadType, payload };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(clientMsgId); reject(new Error(`cTrader request ${payloadType} timed out.`)); }, timeoutMs);
      this.pending.set(clientMsgId, { resolve, reject, timeout });
      this.socket.send(JSON.stringify(message));
    });
  }

  #receive(raw) {
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    if (message.clientMsgId && this.pending.has(message.clientMsgId)) {
      const pending = this.pending.get(message.clientMsgId);
      this.pending.delete(message.clientMsgId);
      clearTimeout(pending.timeout);
      if (message.payloadType === 50 || message.errorCode || message.payload?.errorCode) pending.reject(new Error(message.payload?.description || message.description || `cTrader rejected request ${message.payloadType}.`));
      else pending.resolve(message.payload || message);
      return;
    }
    if (message.payloadType !== HEARTBEAT_PAYLOAD_TYPE) this.onEvent?.(message);
  }

  #startHeartbeat() { this.#stopHeartbeat(); this.heartbeat = setInterval(() => { if (this.connected) this.socket.send(JSON.stringify({ payloadType: HEARTBEAT_PAYLOAD_TYPE, payload: {} })); }, 10000); }
  #stopHeartbeat() { if (this.heartbeat) clearInterval(this.heartbeat); this.heartbeat = null; }
  #fail(error) { for (const [id, pending] of this.pending) { clearTimeout(pending.timeout); pending.reject(error); this.pending.delete(id); } }
  close() { this.#stopHeartbeat(); this.#fail(new Error("cTrader client closed.")); this.socket?.close(); this.socket = null; }
}
