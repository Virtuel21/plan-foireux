import * as T from "three";

/** Derive a quiet breathing loop from the supplied seated, eyes-closed pose.
 * The original wake-up clip and rig are never edited or played in the museum.
 */
export function sleepingGuardClip(source: T.AnimationClip) {
  const times = [0, 0.9, 1.8, 2.7, 3.6],
    breath = [0, 0.65, 1, 0.65, 0];
  const tracks = source.tracks.map((original) => {
    const track = original.clone(),
      size = original.getValueSize(),
      start = Array.from(original.values.slice(0, size));
    const values = times.flatMap((_, i) => {
      const pose = [...start];
      if (
        original.name === "Spine.quaternion" ||
        original.name === "Head.quaternion"
      ) {
        const q = new T.Quaternion().fromArray(start);
        q.multiply(
          new T.Quaternion().setFromAxisAngle(
            new T.Vector3(1, 0, 0),
            breath[i] * (original.name === "Head.quaternion" ? 0.014 : 0.009),
          ),
        );
        return q.toArray();
      }
      return pose;
    });
    track.times = new Float32Array(times);
    track.values = new Float32Array(values);
    track.setInterpolation(T.InterpolateLinear);
    return track;
  });
  return new T.AnimationClip("GuardSleepLoop", 3.6, tracks);
}
