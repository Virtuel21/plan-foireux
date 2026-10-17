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
      const box = new T.Box3().setFromObject(m.objects.POST_Loot);
      box.min.y += 0.025; // The cabinet is deliberately supported by the marble.
      layouts.push({
        layout,
        decorCollisions: triangles.filter((t) => box.intersectsTriangle(t))
          .length,
        min: box.min.toArray(),
        max: box.max.toArray(),
      });
    }
    qa.game.layout = 0;
    m.update(qa.engine.publicView(qa.game, "p0"), qa.players, null);
    m.wealth.animate(1, true);
    m.renderer.render(m.scene, m.camera);
    const point = m.objects.POST_Painting.localToWorld(
      new T.Vector3(0, 1.65, 0.1),
    ).project(m.camera);
    return {
      piles,
      layouts,
      painting: {
        x: (point.x * 0.5 + 0.5) * innerWidth,
        y: (0.5 - point.y * 0.5) * innerHeight,
      },
      triangleCount: triangles.length,
    };
  });
  await page.screenshot({ path: out + "/desktop.png" });
  await page.mouse.click(report.painting.x, report.painting.y);
  const picks = await page.evaluate(() => qa.picks);
  assert.ok(
    picks.includes("painting"),
    "The actual framed canvas must be selectable",
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
    assert.equal(
      layout.decorCollisions,
      0,
      `Lockers intersect plant/decor in layout ${layout.layout}`,
    );
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
    `Museum geometry, direct painting click and 4 viewports passed: ${out}`,
  );
} finally {
  await browser.close();
}
