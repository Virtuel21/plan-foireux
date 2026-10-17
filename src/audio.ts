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
  }
}
export const soundBank = new SoundBank();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) soundBank.silence();
});
