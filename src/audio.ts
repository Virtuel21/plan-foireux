export const CUES = [
  "ui",
  "confirm",
  "deny",
  "phase",
  "drill",
  "overheat",
  "plug",
  "current",
  "lever",
  "lock",
  "coin",
  "cloth",
  "signal",
  "siren",
  "van",
  "arrest",
  "ambience",
] as const;
type Cue = (typeof CUES)[number];
export type AudioChannel = "master" | "music" | "effects";
const defaults = { master: 80, music: 55, effects: 75 };
function readLevels(): typeof defaults {
  try {
    const saved = JSON.parse(localStorage.getItem("pf-audio-levels") || "{}");
    return Object.fromEntries(
      Object.entries(defaults).map(([key, fallback]) => [
        key,
        typeof saved[key] === "number" && Number.isFinite(saved[key])
          ? Math.max(0, Math.min(100, saved[key]))
          : fallback,
      ]),
    ) as typeof defaults;
  } catch {
    return { ...defaults };
  }
}
class SoundBank {
  muted = localStorage.getItem("pf-muted") === "1";
  levels = readLevels();
  private playing = new Map<HTMLAudioElement, Cue>();
  loops = new Map<Cue, HTMLAudioElement>();
  musicAudio: HTMLAudioElement | null = null;
  musicInGame = false;
  musicPaused = false;
  musicIndex = 0;
  unlocked = false;
  private volume(channel: "music" | "effects", base: number) {
    return this.muted
      ? 0
      : base * (this.levels.master / 100) * (this.levels[channel] / 100);
  }
  setLevel(channel: AudioChannel, value: number) {
    if (!Number.isFinite(value)) return;
    this.levels[channel] = Math.max(0, Math.min(100, value));
    localStorage.setItem("pf-audio-levels", JSON.stringify(this.levels));
    this.refreshVolumes();
  }
  setMuted(value: boolean) {
    this.muted = value;
    localStorage.setItem("pf-muted", value ? "1" : "0");
    this.refreshVolumes();
    if (value) this.silence();
    else this.unlock();
  }
  refreshVolumes() {
    if (this.musicAudio) this.musicAudio.volume = this.volume("music", 0.45);
    this.loops.forEach((audio, cue) => {
      audio.volume = this.volume("effects", cue === "ambience" ? 0.09 : 0.14);
    });
    this.playing.forEach((cue, audio) => {
      audio.volume = this.volume("effects", cue === "siren" ? 0.17 : 0.3);
    });
  }
  music(inGame: boolean, paused = false) {
    const changed = this.musicInGame !== inGame;
    this.musicInGame = inGame;
    this.musicPaused = paused;
    if (changed) {
      this.musicAudio?.pause();
      this.musicAudio = null;
      this.musicIndex = 0;
    }
    if (this.muted || paused || document.hidden || !this.unlocked) {
      this.musicAudio?.pause();
      return;
    }
    if (!this.musicAudio) {
      const name = inGame
        ? `sneaking-motif-${this.musicIndex + 1}`
        : "sneaky-museum-heist";
      this.musicAudio = new Audio(
        `${import.meta.env.BASE_URL}music/${name}.mp3`,
      );
      this.musicAudio.preload = "none";
      this.musicAudio.volume = this.volume("music", 0.45);
      this.musicAudio.addEventListener("ended", () => {
        this.musicIndex = (this.musicIndex + 1) % 2;
        this.musicAudio = null;
        this.music(this.musicInGame, this.musicPaused);
      });
    }
    if (this.musicAudio.paused) void this.musicAudio.play().catch(() => {});
  }
  unlock() {
    this.unlocked = true;
    this.music(this.musicInGame, this.musicPaused);
  }
  play(cue: Cue) {
    if (this.muted || document.hidden) return;
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/${cue}.wav`);
    audio.volume = this.volume("effects", cue === "siren" ? 0.17 : 0.3);
    this.playing.set(audio, cue);
    const release = () => this.playing.delete(audio);
    audio.addEventListener("ended", release, { once: true });
    audio.addEventListener("error", release, { once: true });
    void audio.play().catch(release);
  }
  loop(cue: Cue, enabled: boolean) {
    let audio = this.loops.get(cue);
    if (!enabled || this.muted || document.hidden) {
      audio?.pause();
      return;
    }
    if (!audio) {
      audio = new Audio(`${import.meta.env.BASE_URL}audio/${cue}.wav`);
      audio.loop = true;
      audio.volume = this.volume("effects", cue === "ambience" ? 0.09 : 0.14);
      this.loops.set(cue, audio);
    }
    if (audio.paused) void audio.play().catch(() => {});
  }
  silence() {
    this.loops.forEach((audio) => audio.pause());
    this.playing.forEach((_, audio) => audio.pause());
    this.playing.clear();
    this.musicAudio?.pause();
  }
}
export const soundBank = new SoundBank();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) soundBank.silence();
  else soundBank.music(soundBank.musicInGame, soundBank.musicPaused);
});
document.addEventListener("pointerdown", () => soundBank.unlock(), {
  capture: true,
});
document.addEventListener("keydown", () => soundBank.unlock(), {
  capture: true,
});
