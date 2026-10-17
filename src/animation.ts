import * as T from "three";

export const CLIPS = ["idle", "walk", "drill"] as const;
export type Clip = (typeof CLIPS)[number];

/** The three approved skeletal clips are shared by the four appearances. */
export class CharacterAnimation {
  readonly mixer: T.AnimationMixer;
  readonly actions: Record<Clip, T.AnimationAction>;
  current: Clip = "idle";

  constructor(root: T.Object3D, clips: T.AnimationClip[], offset = 0) {
    this.mixer = new T.AnimationMixer(root);
    this.actions = Object.fromEntries(
      CLIPS.map((name) => {
        const clip = clips.find((c) => c.name === name);
        if (!clip) throw new Error(`Animation absente : ${name}`);
        return [name, this.mixer.clipAction(clip)];
      }),
    ) as Record<Clip, T.AnimationAction>;
    this.actions.idle.play();
    this.actions.idle.time = offset % this.actions.idle.getClip().duration;
    this.mixer.update(0);
  }

  update(clip: Clip, dt: number, reduced: boolean) {
    if (reduced) {
      this.mixer.stopAllAction();
      this.actions.idle.reset().setEffectiveWeight(1).play();
      this.actions.idle.time = 0.35;
      this.current = "idle";
      this.mixer.update(0);
      return;
    }
    const next = clip;
    if (next !== this.current) {
      this.actions[this.current].fadeOut(0.18);
      this.actions[next].reset().fadeIn(0.18).play();
      this.current = next;
    }
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
