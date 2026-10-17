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
class SoundBank {
  muted = localStorage.getItem("pf-muted") === "1";
  loops = new Map<Cue, HTMLAudioElement>();
  musicAudio: HTMLAudioElement | null = null;
  musicInGame = false;
  musicPaused = false;
  musicIndex = 0;
  unlocked = false;
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
      this.musicAudio.volume = inGame ? 0.16 : 0.22;
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
    audio.volume = cue === "siren" ? 0.1 : 0.18;
    void audio.play().catch(() => {});
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
      audio.volume = cue === "ambience" ? 0.05 : 0.08;
      this.loops.set(cue, audio);
    }
    if (audio.paused) void audio.play().catch(() => {});
  }
  silence() {
    this.loops.forEach((audio) => audio.pause());
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
