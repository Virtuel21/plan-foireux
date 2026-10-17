import {
  advance,
  apply,
  createGame,
  player,
  publicView,
  setOnline,
  type Command,
  type Game,
  type Player,
} from "./engine";
import { normalizeTrial } from "./trial";
const secretRandom = () =>
  crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
export class HostRoom {
  players: Player[];
  game: Game | null = null;
  tokens = new Map<string, string>();
  constructor(
    public owner: string,
    name: string,
  ) {
    this.players = [player(owner, name, 0)];
  }
  join(token: string, name: string, now = Date.now()) {
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(token))
      throw Error("Identité de reconnexion invalide.");
    const existing = this.tokens.get(token);
    if (existing) {
      const p = this.players.find((p) => p.id === existing)!;
      p.online = true;
      if (this.game) setOnline(this.game, existing, true, now);
      return existing;
    }
    if (this.game) throw Error("Ce casse a déjà commencé.");
    if (this.players.length >= 4)
      throw Error("Le salon est complet (quatre complices).");
    const id = crypto.randomUUID();
    this.tokens.set(token, id);
    this.players.push(player(id, name, this.players.length));
    return id;
  }
  offline(id: string, now = Date.now()) {
    const p = this.players.find((p) => p.id === id);
    if (p) p.online = false;
    if (this.game) setOnline(this.game, id, false, now);
  }
  ready(id: string, ready: boolean) {
    if (!this.game) {
      const p = this.players.find((p) => p.id === id);
      if (p) p.ready = ready;
    }
  }
  start(id: string, now = Date.now()) {
    if (
      id !== this.owner ||
      this.game ||
      this.players.length !== 4 ||
      !this.players.every((p) => p.ready && p.online)
    )
      return false;
    this.game = createGame(
      this.players,
      Math.floor(secretRandom() * 0x100000000),
      now,
      secretRandom,
    );
    this.players = this.game.players;
    return true;
  }
  command(id: string, command: Command, now = Date.now()) {
    return !!this.game && apply(this.game, id, command, now);
  }
  tick(now = Date.now()) {
    if (this.game) advance(this.game, now, secretRandom);
  }
  view(id: string, now = Date.now()) {
    return this.game ? publicView(this.game, id, now) : null;
  }
  lobby(id: string) {
    if (id !== this.owner || this.game?.phase !== "ended") return;
    this.game = null;
    this.players.forEach((p) => {
      p.money = 0;
      p.promise = null;
      p.exposed = null;
      p.ready = false;
    });
  }
  serialize() {
    return JSON.stringify({
      owner: this.owner,
      players: this.players,
      game: this.game,
      tokens: [...this.tokens],
      savedAt: Date.now(),
    });
  }
  static restore(text: string) {
    const data = JSON.parse(text);
    if (
      !data ||
      typeof data.owner !== "string" ||
      !Array.isArray(data.players) ||
      data.players.length > 4 ||
      !Array.isArray(data.tokens) ||
      Date.now() - data.savedAt > 90_000
    )
      throw Error("Sauvegarde du salon expirée.");
    const room = new HostRoom(data.owner, "");
    room.players = data.players;
    room.game = data.game;
    if (room.game) {
      room.players = room.game.players;
      Object.values(room.game.trials).forEach(normalizeTrial);
    }
    room.tokens = new Map(data.tokens);
    room.players
      .filter((p) => p.id !== room.owner)
      .forEach((p) => room.offline(p.id));
    const owner = room.players.find((p) => p.id === room.owner);
    if (owner) owner.online = true;
    if (room.game) setOnline(room.game, room.owner, true);
    return room;
  }
}
