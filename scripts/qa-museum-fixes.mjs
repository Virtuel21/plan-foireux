// Inspect the live renderer and actual GLB triangles, including selected/high piles.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const out = process.env.PF_QA_DIR || "test-results/museum-fixes";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
try {
  await page.route("**/@vite/client", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: `
    export const createHotContext=()=>({accept(){},dispose(){},prune(){},invalidate(){},on(){},send(){},data:{}});
    export function updateStyle(id,css){const style=document.createElement('style');style.textContent=css;document.head.append(style);}
    export function removeStyle(){}
  `,
    }),
  );
  await page.route("**/src/main.ts", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/style.css";',
    }),
  );
  await page.goto(process.env.PF_TEST_URL || "http://127.0.0.1:5173");
  await page.evaluate(async () => {
    document.body.innerHTML =
      '<div id="scene" style="position:fixed;inset:0"></div>';
    const { Museum } = await import("/src/scene.ts");
    const engine = await import("/src/engine.ts");
    const players = ["Julien", "Léa", "Max", "Sarah"].map((n, i) => ({
      ...engine.player("p" + i, n, i),
      money: 36,
    }));
    const game = engine.createGame(players, 12, Date.now(), () => 0.99);
    game.layout = 0;
    game.phase = "promise";
    window.qa = { engine, game, players, picks: [] };
    qa.museum = new Museum(document.querySelector("#scene"), (action) =>
      qa.picks.push(action),
    );
    qa.museum.update(engine.publicView(game, "p0"), players, null);
  });
  await page.waitForFunction(
    () =>
      window.qa?.museum.ready &&
      qa.museum.wealth &&
      qa.museum.actors.length === 4,
    null,
    { timeout: 60000 },
  );
  const report = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const m = qa.museum;
    m.suspended = true;
    m.labels.style.display = "none";
    m.scene.updateMatrixWorld(true);
    const backdrop = m.room.getObjectByName("MuseumBackdrop");
    const triangles = [];
    backdrop.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const p = o.geometry.getAttribute("position"),
        index = o.geometry.index;
      for (let i = 0; i < (index?.count ?? p.count); i += 3) {
        const points = [0, 1, 2].map((j) =>
          new T.Vector3()
            .fromBufferAttribute(p, index ? index.getX(i + j) : i + j)
            .applyMatrix4(o.matrixWorld),
        );
        triangles.push(new T.Triangle(...points));
      }
    });
    const piles = [];
    for (const money of [1, 36, 90, 180]) {
      const players = qa.players.map((p) => ({ ...p, money }));
      for (let selected = 0; selected < 4; selected++) {
        m.wealth.update(
          players,
          players.map((_, i) => m.objects["PROP_Wealth_" + i]),
          players[selected].id,
        );
        m.wealth.animate(1, true);
        const boxes = players.map(() => new T.Box3());
        for (const { mesh } of m.wealth.batches) {
          mesh.geometry.computeBoundingBox();
          for (let i = 0; i < mesh.count; i++) {
            const matrix = new T.Matrix4();
            mesh.getMatrixAt(i, matrix);
            const owner = players.findIndex(
              (p) => p.id === mesh.userData.wealthOwners[i],
            );
            boxes[owner].union(
              mesh.geometry.boundingBox.clone().applyMatrix4(matrix),
            );
          }
        }
        const collisions = boxes.map(
          (box) => triangles.filter((t) => box.intersectsTriangle(t)).length,
        );
        const overlap = boxes.some((a, i) =>
          boxes.some((b, j) => i < j && a.intersectsBox(b)),
        );
        piles.push({
          money,
          selected,
          collisions,
          overlap,
          bounds: boxes.map((b) => ({
            min: b.min.toArray(),
            max: b.max.toArray(),
          })),
        });
      }
    }
    const layouts = [];
    for (const layout of [0, 1, 2]) {
      qa.game.layout = layout;
      m.update(qa.engine.publicView(qa.game, "p0"), qa.players, null);
      m.scene.updateMatrixWorld(true);
      layouts.push({
        layout,
        statuePosition: m.objects.POST_Loot.getWorldPosition(
          new T.Vector3(),
        ).toArray(),
      });
    }
    const guard = m.room.getObjectByName("Guard"),
      chair = guard.getObjectByName("Chaise"),
      hips = guard.getObjectByName("Hips"),
      eyelids = [];
    guard.traverse((o) => {
      if (o.morphTargetInfluences) eyelids.push(o);
    });
    const sleeping = [];
    for (const time of [0, 0.9, 1.8, 2.7, 3.6, 7.2, 21.6]) {
      m.roomMixer.setTime(time);
      m.scene.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(guard, true);
      box.min.y += 0.06; // Ignore the supplied soles' tiny native floor overlap.
      sleeping.push({
        time,
        hips: hips.position.toArray(),
        eyelids: eyelids.map((o) => [...o.morphTargetInfluences]),
        chair: chair.matrixWorld.toArray(),
        decorCollisions: triangles.filter((t) => box.intersectsTriangle(t))
          .length,
      });
    }
    const {
      securityPosition,
      statuePosition,
      stationPath,
      returnPath,
      ACTOR_BODY_RADIUS: r,
    } = await import("/src/station-paths.ts");
    const corridor = new T.Box3(
      new T.Vector3(-2.3, 0.2, -1.2),
      new T.Vector3(4.5, 1.8, 1.1),
    );
    const corridorTriangles = triangles.filter((t) =>
      corridor.intersectsTriangle(t),
    );
    qa.navTriangles = corridorTriangles;
    const body = (p) =>
      new T.Box3(
        new T.Vector3(p.x - r, 0.2, p.z - r),
        new T.Vector3(p.x + r, 1.8, p.z + r),
      );
    const cameraPaths = [];
    const homes = [0, 1, 2, 3].map(
      (i) => new T.Vector3(-1.8 + i * 1.4, 0.15, 0.7),
    );
    for (let mask = 1; mask < 16; mask++) {
      const participants = homes
        .map((_, i) => i)
        .filter((i) => mask & (1 << i));
      const paths = participants.map((id, i) =>
        stationPath(homes[id], securityPosition(i, participants.length)),
      );
      let collisions = 0,
        bodyOverlaps = 0;
      for (const leg of [0, 1, 2, 3])
        for (let step = 0; step <= 30; step++) {
          const positions = homes.map((home, id) => {
            const rank = participants.indexOf(id);
            if (rank < 0) return home;
            if (leg < 2)
              return (leg ? paths[rank][0] : home)
                .clone()
                .lerp(paths[rank][leg], step / 30);
            const back = returnPath(paths[rank][1], home, "secure"),
              segment = leg - 2;
            return (segment ? back[0] : paths[rank][1])
              .clone()
              .lerp(back[segment], step / 30);
          });
          const boxes = positions.map(body);
          for (const id of participants)
            collisions += corridorTriangles.filter((t) =>
              boxes[id].intersectsTriangle(t),
            ).length;
          for (let i = 0; i < 4; i++)
            for (let j = i + 1; j < 4; j++)
              if (boxes[i].intersectsBox(boxes[j])) bodyOverlaps++;
        }
      cameraPaths.push({
        mask,
        participants: participants.length,
        targets: paths.map((p) => p[1].toArray()),
        collisions,
        bodyOverlaps,
      });
    }
    const statueWork = [];
    for (let participants = 1; participants <= 4; participants++)
      for (let i = 0; i < participants; i++) {
        const position = statuePosition(i, participants);
        statueWork.push({
          participants,
          index: i,
          position: position.toArray(),
          collisions: triangles.filter((t) =>
            body(position).intersectsTriangle(t),
          ).length,
        });
      }
    const statueRoutes = [];
    const leftAisle = new T.Box3(
      new T.Vector3(-4.5, 0.2, -0.75),
      new T.Vector3(2.9, 1.8, 2.1),
    );
    const leftTriangles = triangles.filter((t) =>
      leftAisle.intersectsTriangle(t),
    );
    for (let mask = 1; mask < 16; mask++) {
      const participants = homes
        .map((_, i) => i)
        .filter((i) => mask & (1 << i));
      let collisions = 0;
      participants.forEach((id, rank) => {
        const target = statuePosition(rank, participants.length);
        for (const points of [
          [homes[id], ...stationPath(homes[id], target, "loot")],
          [target, ...returnPath(target, homes[id], "loot")],
        ])
          for (let leg = 1; leg < points.length; leg++)
            for (let step = 0; step <= 30; step++) {
              const box = body(
                points[leg - 1].clone().lerp(points[leg], step / 30),
              );
              collisions += leftTriangles.filter((t) =>
                box.intersectsTriangle(t),
              ).length;
            }
      });
      statueRoutes.push({
        mask,
        participants: participants.length,
        collisions,
      });
    }
    qa.game.layout = 0;
    m.update(qa.engine.publicView(qa.game, "p0"), qa.players, null);
    m.wealth.animate(1, true);
    m.wealth.update(
      qa.players.map((p) => ({ ...p, money: 0 })),
      qa.players.map((_, i) => m.objects["PROP_Wealth_" + i]),
    );
    m.wealth.animate(1, true);
    m.renderer.render(m.scene, m.camera);
    const baseTriangles = m.renderer.info.render.triangles;
    m.wealth.update(
      qa.players,
      qa.players.map((_, i) => m.objects["PROP_Wealth_" + i]),
    );
    m.wealth.animate(1, true);
    m.renderer.render(m.scene, m.camera);
    const point = m.objects.POST_Painting.localToWorld(
      new T.Vector3(0, 1.65, 0.1),
    ).project(m.camera);
    return {
      piles,
      layouts,
      sleeping,
      cameraPaths,
      statueWork,
      statueRoutes,
      activeRoomClips: m.roomMixer._actions.map((a) => a.getClip().name),
      statue: m.objects.POST_Loot.localToWorld(new T.Vector3(0, 1.65, 0.3))
        .project(m.camera)
        .toArray(),
      painting: {
        x: (point.x * 0.5 + 0.5) * innerWidth,
        y: (0.5 - point.y * 0.5) * innerHeight,
      },
      triangleCount: triangles.length,
      renderedTriangles: m.renderer.info.render.triangles,
      baseTriangles,
      renderedCalls: m.renderer.info.render.calls,
    };
  });
  await page.screenshot({ path: out + "/desktop.png" });
  await page.mouse.click(report.painting.x, report.painting.y);
  const picks = await page.evaluate(() => qa.picks);
  assert.ok(
    picks.includes("painting"),
    "The actual framed canvas must be selectable",
  );
  await page.mouse.click(
    (report.statue[0] * 0.5 + 0.5) * 1440,
    (0.5 - report.statue[1] * 0.5) * 960,
  );
  assert.ok(
    (await page.evaluate(() => qa.picks)).includes("loot"),
    "The original statue must be directly selectable",
  );
  await page.evaluate(() => {
    qa.museum.labels.style.display = "";
    qa.museum.layout();
  });
  await page.screenshot({ path: out + "/desktop-posts.png" });
  await page.evaluate(() => {
    qa.museum.labels.style.display = "none";
  });
  for (const pile of report.piles) {
    assert.deepEqual(
      pile.collisions,
      [0, 0, 0, 0],
      `Piles collide with decor: ${JSON.stringify(pile)}`,
    );
    assert.equal(
      pile.overlap,
      false,
      "Piles of different owners stay separate",
    );
  }
  for (const layout of report.layouts)
    assert.deepEqual(
      layout.statuePosition,
      [-2.05, 0.15, 3.4],
      "Existing statue must remain fixed across layouts",
    );
  assert.deepEqual(report.activeRoomClips, ["GuardSleepLoop"]);
  for (const frame of report.sleeping) {
    assert.ok(
      frame.hips.every(
        (n, i) => Math.abs(n - report.sleeping[0].hips[i]) < 1e-8,
      ),
      "Guard remains seated",
    );
    assert.deepEqual(
      frame.eyelids,
      report.sleeping[0].eyelids,
      "Guard's eyes remain closed",
    );
    assert.deepEqual(
      frame.chair,
      report.sleeping[0].chair,
      "Included chair remains still",
    );
    assert.equal(
      frame.decorCollisions,
      0,
      "Seated guard clears the plant and bench",
    );
  }
  for (const path of report.cameraPaths) {
    assert.equal(
      path.collisions,
      0,
      `Camera path intersects decor: ${path.mask}`,
    );
    assert.equal(
      path.bodyOverlaps,
      0,
      `Camera participants intersect other bodies: ${path.mask}`,
    );
  }
  for (const place of report.statueWork)
    assert.equal(
      place.collisions,
      0,
      `Statue participant intersects decor: ${place.participants}/${place.index}`,
    );
  for (const route of report.statueRoutes)
    assert.equal(
      route.collisions,
      0,
      `Statue outward/return route crosses decor: ${route.mask}`,
    );
  report.runtimeCamera = [];
  for (const participants of [1, 2, 3, 4]) {
    await page.evaluate((count) => {
      const m = qa.museum;
      m.actors.forEach((a, i) => {
        a.root.position.set(-1.8 + i * 1.4, 0.16, 0.7);
        a.target.copy(a.root.position);
        a.route = [];
      });
      const view = qa.engine.publicView(qa.game, "p0");
      view.phase = "reveal";
      view.report = {
        findings: qa.players.slice(0, count).map((p) => ({
          id: p.id,
          choice: { action: "secure" },
          success: true,
          gain: 6,
          loss: 0,
        })),
      };
      m.update(view, qa.players, null);
      m.suspended = false;
    }, participants);
    await page.waitForFunction(
      () =>
        qa.museum.actors.every(
          (a) => a.root.position.distanceTo(a.target) < 0.045,
        ),
      null,
      { timeout: 20000 },
    );
    await page.waitForTimeout(350);
    const snapshot = await page.evaluate(async () => {
      const T = await import("/node_modules/three/build/three.module.js"),
        m = qa.museum;
      m.suspended = true;
      m.scene.updateMatrixWorld(true);
      const boxes = m.actors.map((a) => {
        const box = new T.Box3();
        a.root.traverse((o) => {
          if (o.isSkinnedMesh) box.union(new T.Box3().setFromObject(o, true));
        });
        return box;
      });
      return {
        positions: m.actors.map((a) => a.root.position.toArray()),
        targets: m.actors.map((a) => a.target.toArray()),
        bodyBounds: boxes.map((b) => ({
          min: b.min.toArray(),
          max: b.max.toArray(),
        })),
        decorCollisions: boxes.map(
          (b) => qa.navTriangles.filter((t) => b.intersectsTriangle(t)).length,
        ),
        bodyOverlaps: boxes.some((a, i) =>
          boxes.some((b, j) => i < j && a.intersectsBox(b)),
        ),
      };
    });
    assert.deepEqual(
      snapshot.decorCollisions,
      [0, 0, 0, 0],
      `Rendered camera bodies intersect decor (${participants})`,
    );
    assert.equal(
      snapshot.bodyOverlaps,
      false,
      `Rendered camera bodies overlap (${participants})`,
    );
    report.runtimeCamera.push({ participants, ...snapshot });
    await page.screenshot({
      path: `${out}/camera-${participants}-participants.png`,
    });
  }
  await page.evaluate(() => {
    const m = qa.museum;
    m.update(qa.engine.publicView(qa.game, "p0"), qa.players, null);
    m.actors.forEach((a, i) => {
      a.root.position.set(-1.8 + i * 1.4, 0.16, 0.7);
      a.route = [];
    });
    m.renderer.render(m.scene, m.camera);
  });
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      qa.museum.resize();
      qa.museum.renderer.render(qa.museum.scene, qa.museum.camera);
    });
    await page.screenshot({ path: `${out}/museum-${width}x${height}.png` });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/checks.json",
    JSON.stringify({ ...report, picks, errors }, null, 2),
  );
  console.log(
    `Museum geometry, guard sleep, camera paths and 4 viewports passed: ${out}; ${report.renderedTriangles} triangles / ${report.renderedCalls} calls`,
  );
} finally {
  await browser.close();
}
