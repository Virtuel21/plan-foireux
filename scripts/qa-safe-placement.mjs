// Capture the actual Museum renderer; no asset export or image retouching.
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const out = process.env.PF_QA_DIR || 'test-results/safe-placement';
await mkdir(out, { recursive: true });
const source = JSON.parse(await readFile('scenes/safe-hinge.json', 'utf8'));
const hash = createHash('sha256').update(await readFile('public/models/safe-box.glb')).digest('hex');
assert.equal(hash, source.sourceSha256, 'Meshy source must remain unchanged');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.route('**/src/main.ts', route => route.fulfill({ contentType: 'application/javascript', body: 'import "/src/style.css";' }));
  await page.goto(process.env.PF_TEST_URL || 'http://127.0.0.1:5187');
  await page.evaluate(async () => {
    document.body.innerHTML = '<div id="scene" style="position:fixed;inset:0"></div>';
    const { Museum } = await import('/src/scene.ts');
    const engine = await import('/src/engine.ts');
    const players = ['Julien', 'Léa', 'Max', 'Sarah'].map((n, i) => engine.player('p' + i, n, i));
    const game = engine.createGame(players, 12, Date.now(), () => .99);
    game.layout = 0; game.phase = 'promise';
    window.qa = { museum: new Museum(document.querySelector('#scene'), () => {}), game, engine };
    qa.museum.update(engine.publicView(game, 'p0'), players, null);
  });
  await page.waitForFunction(() => qa.museum.ready && qa.museum.actors.length === 4 && qa.museum.drill && qa.museum.wealth, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const placement = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const m = qa.museum;
    m.suspended = true; m.labels.style.display = 'none';
    for (const a of m.actors) {
      a.animation.mixer.stopAllAction();
      a.animation.actions.idle.reset().setEffectiveWeight(1).play().time = .35;
      a.animation.mixer.update(0);
    }
    m.scene.updateMatrixWorld(true);
    const root = m.objects.POST_Vault;
    const body = new T.Box3().setFromObject(m.room.getObjectByName('SafeNativeBody'));
    m.renderer.render(m.scene, m.camera);
    return { position: root.position.toArray(), rotationY: root.rotation.y, scale: root.scale.toArray(), body: { min: body.min.toArray(), max: body.max.toArray() } };
  });
  await page.screenshot({ path: out + '/desktop-closed.png' });
  for (const view of [
    { name: 'close-front-closed', eye: [-.5, 1.5, -1.15], target: [-5.5, 1.5, -1.15], height: 3.1, open: false },
    { name: 'close-side-closed', eye: [-2.0, 2.3, 1.0], target: [-5.4, 1.3, -1.15], height: 3.1, open: false },
    { name: 'close-front-open', eye: [-.5, 1.5, -1.15], target: [-5.5, 1.5, -1.15], height: 3.1, open: true },
    { name: 'close-side-open', eye: [-2.0, 2.3, 1.0], target: [-5.4, 1.3, -1.15], height: 3.1, open: true },
  ]) {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForTimeout(100);
    await page.evaluate(v => {
      const m = qa.museum;
      for (const a of m.actors) a.root.visible = false;
      m.room.getObjectByName('Guard').visible = false;
      const cam = m.camera;
      cam.position.fromArray(v.eye); cam.lookAt(...v.target);
      cam.left = -v.height * innerWidth / innerHeight / 2;
      cam.right = -cam.left; cam.top = v.height / 2; cam.bottom = -cam.top;
      cam.updateProjectionMatrix();
      const pivot = m.objects.VaultDoorPivot;
      pivot.rotation.y = v.open ? pivot.userData.openAngle : 0;
      m.renderer.render(m.scene, cam);
    }, view);
    await page.screenshot({ path: out + '/' + view.name + '.png' });
  }
  await page.evaluate(() => {
    const m = qa.museum;
    for (const a of m.actors) a.root.visible = true;
    m.room.getObjectByName('Guard').visible = true;
    m.objects.VaultDoorPivot.rotation.y = 0;
    m.camera.position.set(8.2, 11, 15.5); m.camera.lookAt(0, .6, 0);
  });
  for (const [width, height] of [[844, 390], [390, 844], [320, 740]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await page.evaluate(() => { const m = qa.museum; m.resize(); m.renderer.render(m.scene, m.camera); });
    await page.screenshot({ path: `${out}/museum-${width}x${height}.png` });
  }
  assert.deepEqual(errors, []);
  await writeFile(out + '/browser-placement.json', JSON.stringify({ placement, sourceSha256: hash, errors, closeViews: 'Actors and labels hidden only for unobstructed close inspection; original room and safe rendered directly', viewports: [[1440, 960], [1200, 900], [844, 390], [390, 844], [320, 740]] }, null, 2));
  console.log('Safe placement captures saved: ' + out);
} finally {
  await browser.close();
}
