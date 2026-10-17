import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.PF_OUTPUT;
if (!out) throw Error('PF_OUTPUT required');
await mkdir(out + '/portraits', { recursive: true });
await mkdir(out + '/renders', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.route('**/src/main.ts', r => r.fulfill({ contentType: 'application/javascript', body: 'import "/src/style.css";' }));
  await page.goto(process.env.PF_TEST_URL || 'http://127.0.0.1:5187');
  await page.evaluate(async () => {
    document.body.innerHTML = '<div id="scene" style="position:fixed;inset:0"></div>';
    const { Museum } = await import('/src/scene.ts');
    const engine = await import('/src/engine.ts');
    window.preview = new Museum(document.querySelector('#scene'), () => {});
    preview.setPlayers(['Julien','Léa','Max','Sarah'].map((name,i) => engine.player('p'+i,name,i)));
  });
  await page.waitForFunction(() => preview.ready && preview.actors.length === 4, null, { timeout: 60000 });
  await page.evaluate(() => {
    preview.suspended = true;
    for (const actor of preview.actors) {
      actor.animation.mixer.stopAllAction();
      const action = actor.animation.actions.idle;
      action.reset().setEffectiveWeight(1).play();action.time = .35;
      actor.animation.mixer.update(0);
    }
  });
  const portraits = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { clone } = await import('/node_modules/three/examples/jsm/utils/SkeletonUtils.js');
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(512,512);
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight('#ffffff', '#756050', 2.5));
    const light = new T.DirectionalLight('#fff2db',3.0);light.position.set(-2,4,4);scene.add(light);
    const camera = new T.OrthographicCamera(-.36,.36,.36,-.36,.1,20);
    camera.position.set(.20,1.34,3.5);camera.lookAt(0,1.29,0);
    const results = [];
    for (const actor of preview.actors) {
      const model = clone(actor.root);model.position.set(0,0,0);model.rotation.set(0,0,0);
      scene.add(model);scene.updateMatrixWorld(true);renderer.render(scene,camera);
      results.push(renderer.domElement.toDataURL('image/png').split(',')[1]);
      scene.remove(model);
    }
    renderer.dispose();
    return results;
  });
  for (let i = 0; i < portraits.length; i++)
    await writeFile(`${out}/portraits/${i}.png`, Buffer.from(portraits[i], 'base64'));
  await page.evaluate(() => { preview.labels.style.display = 'none'; });
  await page.screenshot({ path: out + '/renders/game-originals.png' });
} finally { await browser.close(); }
