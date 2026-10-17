import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { sleepingGuardClip } from "../src/sleeping-guard";
import {
  ACTOR_BODY_RADIUS,
  returnPath,
  securityPosition,
  stationPath,
} from "../src/station-paths";

test("sleep loop keeps the seated pose and closed eyelids without mutating the wake clip", () => {
  const source = new T.AnimationClip("Reveil_Sursaut_Debout", 1, [
    new T.VectorKeyframeTrack("Hips.position", [0, 1], [0, 0.7, 0, 0, 1.2, 0]),
    new T.QuaternionKeyframeTrack(
      "Head.quaternion",
      [0, 1],
      [0, 0, 0, 1, 0.5, 0, 0, Math.sqrt(0.75)],
    ),
    new T.NumberKeyframeTrack(
      "Paupiere_D.morphTargetInfluences",
      [0, 1],
      [0, 1],
    ),
  ]);
  const before = JSON.stringify(source.toJSON());
  const loop = sleepingGuardClip(source),
    root = new T.Group();
  const hips = new T.Bone(),
    head = new T.Bone();
  hips.name = "Hips";
  head.name = "Head";
  const eyelid = new T.Mesh();
  eyelid.name = "Paupiere_D";
  eyelid.morphTargetInfluences = [0];
  root.add(hips, head, eyelid);
  const mixer = new T.AnimationMixer(root);
  mixer.clipAction(loop).setLoop(T.LoopRepeat, Infinity).play();
  for (const time of [0, 0.9, 1.8, 2.7, 3.6, 8.1, 21.6]) {
    mixer.setTime(time);
    assert.deepEqual(hips.position.toArray(), [0, Math.fround(0.7), 0]);
    assert.deepEqual(eyelid.morphTargetInfluences, [0]);
    assert.ok(head.quaternion.angleTo(new T.Quaternion()) <= 0.015);
  }
  mixer.setTime(1.8);
  assert.ok(head.quaternion.angleTo(new T.Quaternion()) > 0.01);
  mixer.setTime(3.6);
  assert.ok(head.quaternion.angleTo(new T.Quaternion()) < 1e-6);
  assert.equal(JSON.stringify(source.toJSON()), before);
  assert.equal(loop.name, "GuardSleepLoop");
});

test("one to four camera accomplices clear each other and players staying at home along both path legs", () => {
  const homes = [0, 1, 2, 3].map(
    (i) => new T.Vector3(-1.8 + i * 1.4, 0.16, 0.7),
  );
  for (let mask = 1; mask < 16; mask++) {
    const participants = homes.map((_, i) => i).filter((i) => mask & (1 << i));
    const paths = participants.map((id, i) =>
      stationPath(homes[id], securityPosition(i, participants.length)),
    );
    for (const leg of [0, 1, 2, 3])
      for (let step = 0; step <= 30; step++) {
        const positions = homes.map((home, id) => {
          const rank = participants.indexOf(id);
          if (rank < 0) return home;
          if (leg < 2) {
            const from = leg ? paths[rank][0] : home;
            return from.clone().lerp(paths[rank][leg], step / 30);
          }
          const back = returnPath(paths[rank][1], home, "secure"),
            segment = leg - 2;
          return (segment ? back[0] : paths[rank][1])
            .clone()
            .lerp(back[segment], step / 30);
        });
        positions.forEach((a, i) =>
          positions.slice(i + 1).forEach((b) => {
            assert.ok(
              Math.hypot(a.x - b.x, a.z - b.z) >= ACTOR_BODY_RADIUS * 2,
            );
          }),
        );
      }
  }
});
