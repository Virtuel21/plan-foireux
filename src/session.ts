import Peer, { type DataConnection } from "peerjs";
import {
  advance,
  apply,
  botAct,
  createGame,
  player,
  publicView,
  CONFIG,
  type Command,
  type Game,
  type Player,
  type View,
} from "./engine";
import { HostRoom } from "./host";
export type Snapshot = {
  players: Player[];
  view: View | null;
  myId: string;
  host: boolean;
  room: string;
  status: string;
  error: string;
};
export class Session {
  game: Game | null = null;
  authority: HostRoom | null = null;
  peer: Peer | null = null;
  connection: DataConnection | null = null;
  clients = new Map<string, DataConnection>();
  seen = new Map<string, number>();
  sent = new Map<string, string>();
  room = "";
  online = false;
  offset = 0;
  stopped = false;
  reconnecting = false;
  absentSince = 0;
  lastHostSeen = 0;
  lastPing = 0;
  state: Snapshot;
  last = "";
  token = sessionStorage.getItem("pf-v2-token") || crypto.randomUUID();
  constructor(
    public name: string,
    public changed: (s: Snapshot) => void,
  ) {
    sessionStorage.setItem("pf-v2-token", this.token);
    this.state = {
      players: this.soloPlayers(),
      view: null,
      myId: "you",
      host: true,
      room: "",
      status: "local",
      error: "",
    };
    setInterval(() => this.tick(), 100);
    window.addEventListener("pagehide", () => {
      if (this.authority) {
        this.clients.forEach((conn) => {
          if (conn.open) conn.send({ type: "host-away" });
        });
        this.authority.players.forEach((p) => this.authority!.offline(p.id));
        this.save();
      } else this.send({ type: "away" });
      this.peer?.destroy();
    });
  }
  soloPlayers() {
    return [
      player("you", this.name, 0),
      ...["Léa", "Sarah", "Max"].map((n, i) =>
        player(`bot${i}`, n, i + 1, true),
      ),
    ];
  }
  now() {
    return Date.now() + this.offset;
  }
  save() {
    if (this.authority)
      try {
        sessionStorage.setItem(
          "pf-v2-host",
          JSON.stringify({ room: this.room, data: this.authority.serialize() }),
        );
      } catch {}
  }
  emit() {
    if (this.authority) {
      this.state.players = this.authority.players;
      this.state.view = this.authority.view(this.state.myId);
      this.save();
    }
    const key = JSON.stringify(this.state);
    if (key !== this.last) {
      this.last = key;
      this.changed(this.state);
    }
    if (this.authority)
      for (const [id, conn] of this.clients) {
        const data = {
          players: this.authority.players,
          view: this.authority.view(id),
          myId: id,
          host: false,
          room: this.room,
          status: "online",
          error: "",
        };
        const k = JSON.stringify(data);
        if (conn.open && this.sent.get(id) !== k) {
          this.sent.set(id, k);
          conn.send({ type: "snapshot", data, hostNow: Date.now() });
        }
      }
  }
  solo() {
    if (this.online) return;
    this.state.players = this.soloPlayers();
    this.game = createGame(
      this.state.players,
      crypto.getRandomValues(new Uint32Array(1))[0],
      Date.now(),
      () => crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000,
    );
    this.state.view = publicView(this.game, "you");
    this.emit();
  }
  command(c: Omit<Command, "turn">) {
    const v = this.state.view;
    if (!v) return;
    const command = { ...c, turn: v.turn } as Command;
    if (this.game) {
      if (apply(this.game, "you", command)) {
        this.state.view = publicView(this.game, "you");
        this.emit();
      }
    } else if (this.authority) {
      if (this.authority.command(this.state.myId, command)) this.emit();
    } else this.send({ type: "command", command });
  }
  createRoom(restore = false) {
    if (this.online && !restore) return;
    this.stopped = false;
    this.online = true;
    this.state.status = "connecting";
    this.state.error = "";
    this.game = null;
    if (restore) {
      try {
        const saved = JSON.parse(sessionStorage.getItem("pf-v2-host") || "");
        this.room = saved.room;
        this.authority = HostRoom.restore(saved.data);
        this.state.myId = this.authority.owner;
      } catch {
        this.online = false;
        sessionStorage.removeItem("pf-v2-host");
        this.state.error = "L’ancien salon a expiré. Créez un nouveau casse.";
        this.emit();
        return;
      }
    } else {
      this.room = `pf-v2-${crypto.randomUUID().slice(0, 8)}`;
      this.state.myId = crypto.randomUUID();
      this.authority = new HostRoom(this.state.myId, this.name);
    }
    this.state.host = true;
    this.state.room = this.room;
    this.emit();
    this.openHostPeer();
  }
  openHostPeer() {
    const peer = new Peer(this.room);
    this.peer = peer;
    peer.on("open", () => {
      this.state.status = "online";
      this.state.error = "";
      history.replaceState(
        null,
        "",
        `${location.pathname}?v=2.0.0#room=${this.room}`,
      );
      this.emit();
    });
    peer.on("connection", (conn) => this.accept(conn));
    peer.on("disconnected", () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        peer.destroy();
        setTimeout(() => {
          if (this.peer === peer && !this.stopped) this.openHostPeer();
        }, 2500);
      } else {
        this.state.error = `Le salon n’a pas pu se connecter (${err.type}). Le mode bots reste disponible.`;
        this.state.status = "error";
        this.emit();
      }
    });
  }
  accept(conn: DataConnection) {
    let assigned = "",
      count = 0,
      windowAt = Date.now();
    const intro = setTimeout(() => {
      if (!assigned) conn.close();
    }, 10000);
    conn.on("data", (raw: unknown) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      const m = raw as Record<string, any>;
      if (Date.now() - windowAt > 1000) {
        count = 0;
        windowAt = Date.now();
      }
      if (++count > 40) return;
      if (
        m.type === "hello" &&
        !assigned &&
        typeof m.token === "string" &&
        typeof m.name === "string"
      ) {
        try {
          assigned = this.authority!.join(m.token, m.name);
        } catch (e) {
          conn.send({ type: "rejected", text: (e as Error).message });
          setTimeout(() => conn.close(), 100);
          return;
        }
        clearTimeout(intro);
        const previous = this.clients.get(assigned);
        this.clients.set(assigned, conn);
        this.sent.delete(assigned);
        previous?.close();
        this.seen.set(assigned, Date.now());
        this.emit();
        return;
      }
      if (!assigned || this.clients.get(assigned) !== conn) return;
      this.seen.set(assigned, Date.now());
      if (m.type === "away") {
        this.authority?.offline(assigned);
        this.emit();
        conn.close();
        return;
      }
      if (m.type === "ping") {
        conn.send({ type: "pong", hostNow: Date.now() });
        return;
      }
      if (m.type === "command" && this.authority!.command(assigned, m.command))
        this.emit();
      if (m.type === "ready") {
        this.authority!.ready(assigned, m.ready === true);
        this.emit();
      }
    });
    conn.on("close", () => {
      clearTimeout(intro);
      if (assigned && this.clients.get(assigned) === conn) {
        this.clients.delete(assigned);
        this.seen.delete(assigned);
        this.sent.delete(assigned);
        this.authority?.offline(assigned);
        this.emit();
      }
    });
    conn.on("error", () => conn.close());
  }
  join(room: string) {
    if (!/^pf-v2-[a-f0-9]{8}$/.test(room)) {
      this.state.error = "Code de salon invalide.";
      this.emit();
      return;
    }
    this.online = true;
    this.stopped = false;
    this.room = room;
    this.game = null;
    this.state = {
      ...this.state,
      host: false,
      status: "connecting",
      room,
      error: "",
      players: [],
    };
    this.lastHostSeen = Date.now();
    this.emit();
    const peer = new Peer();
    this.peer = peer;
    peer.on("open", () => this.connect());
    peer.on("disconnected", () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on("error", (err) => {
      if (err.type === "peer-unavailable" || err.type === "network")
        this.queueReconnect();
      else {
        this.state.error = `Connexion au salon impossible (${err.type}).`;
        this.state.status = "error";
        this.emit();
      }
    });
  }
  connect() {
    if (!this.peer || this.peer.destroyed || this.stopped) return;
    this.reconnecting = false;
    const previous = this.connection;
    this.connection = null;
    previous?.close();
    const conn = this.peer.connect(this.room, { reliable: true });
    this.connection = conn;
    conn.on("open", () =>
      conn.send({ type: "hello", token: this.token, name: this.name }),
    );
    conn.on("data", (raw: unknown) => {
      if (this.connection !== conn || !raw || typeof raw !== "object") return;
      const m = raw as Record<string, any>;
      this.lastHostSeen = Date.now();
      this.absentSince = 0;
      if (typeof m.hostNow === "number") this.offset = m.hostNow - Date.now();
      if (m.type === "host-away") {
        this.queueReconnect();
        return;
      }
      if (m.type === "snapshot" && m.data) {
        sessionStorage.setItem("pf-v2-joined", this.room);
        this.state = m.data;
        history.replaceState(
          null,
          "",
          `${location.pathname}?v=2.0.0#room=${this.room}`,
        );
        this.emit();
      }
      if (m.type === "rejected") {
        this.stopped = true;
        this.state.error = m.text;
        this.state.status = "error";
        this.state.view = null;
        this.emit();
      }
    });
    conn.on("close", () => {
      if (this.connection === conn) this.queueReconnect();
    });
    conn.on("error", () => {
      if (this.connection === conn) this.queueReconnect();
    });
  }
  queueReconnect() {
    if (this.reconnecting || this.stopped) return;
    this.reconnecting = true;
    this.absentSince ||= Date.now();
    this.state.status = "reconnecting";
    this.state.error = "Connexion à l’hôte interrompue. Le casse est en pause.";
    this.emit();
    setTimeout(() => {
      this.reconnecting = false;
      this.connect();
    }, 2000);
  }
  send(data: unknown) {
    if (this.connection?.open) this.connection.send(data);
  }
  start() {
    if (this.authority?.start(this.state.myId)) this.emit();
  }
  ready(ready: boolean) {
    if (this.authority) {
      this.authority.ready(this.state.myId, ready);
      this.emit();
    } else this.send({ type: "ready", ready });
  }
  lobby() {
    if (this.authority) {
      this.authority.lobby(this.state.myId);
      this.emit();
    } else if (!this.online) {
      this.game = null;
      this.state.view = null;
      this.state.players = this.soloPlayers();
      this.emit();
    }
  }
  resume() {
    if (sessionStorage.getItem("pf-v2-host")) this.createRoom(true);
  }
  leave() {
    this.stopped = true;
    this.online = false;
    this.peer?.destroy();
    this.clients.clear();
    this.authority = null;
    this.game = null;
    this.room = "";
    sessionStorage.removeItem("pf-v2-host");
    sessionStorage.removeItem("pf-v2-joined");
    this.state = {
      players: this.soloPlayers(),
      view: null,
      myId: "you",
      host: true,
      room: "",
      status: "local",
      error: "",
    };
    this.emit();
  }
  tick() {
    const now = Date.now();
    if (this.game) {
      this.game.players
        .filter((p) => p.bot)
        .forEach((p) => botAct(this.game!, p, now));
      advance(this.game, now);
      this.state.players = this.game.players;
      this.state.view = publicView(this.game, "you");
      this.emit();
      return;
    }
    if (this.authority) {
      for (const [id, conn] of this.clients)
        if (now - (this.seen.get(id) ?? now) > 15000) {
          conn.close();
          this.authority.offline(id, now);
          this.clients.delete(id);
        }
      this.authority.tick(now);
      this.emit();
      return;
    }
    if (!this.online || this.stopped) return;
    if (this.absentSince && now - this.absentSince >= CONFIG.reconnect) {
      this.stopped = true;
      if (this.state.view) {
        this.state.view.phase = "ended";
        this.state.view.turn++;
        this.state.view.pausedAt = null;
        this.state.view.result = {
          kind: "aborted",
          winners: [],
          kings: [],
          text: "Reconnexion expirée. Partie terminée sans classement.",
        };
        this.state.status = "online";
        this.emit();
      }
      return;
    }
    if (now - this.lastHostSeen > 15000) {
      this.connection?.close();
      this.queueReconnect();
    }
    if (now - this.lastPing > 4000) {
      this.lastPing = now;
      this.send({ type: "ping" });
    }
  }
}
