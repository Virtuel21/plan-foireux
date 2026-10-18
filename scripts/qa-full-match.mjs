// Browser-only acceptance run with real timers and real controls, no state injection.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = process.env.PF_QA_DIR || 'test-results/full-match'; await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const errors = [], phases = []; page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;window.__musicSources=[];HTMLMediaElement.prototype.play=function(){if(this.src.includes('/music/')&&!window.__musicSources.includes(this.src))window.__musicSources.push(this.src);return play.call(this);};});
await page.goto(process.env.PF_TEST_URL || 'http://127.0.0.1:5173'); await page.waitForTimeout(2000);
await page.getByRole('button', { name: /Jouer avec les bots/ }).tap(); await page.getByRole('button', { name: 'Je garde mon rôle secret' }).tap();
const started = Date.now(); let lastPhase = '', action = 'drill', held = false, attempts = 0;
try {
  while (Date.now() - started < 10 * 60_000) {
    const phase = await page.locator('body').getAttribute('data-phase');
    if (phase !== lastPhase) {
      const heading = await page.locator('#phase').innerText(); phases.push({ phase, heading, seconds: (Date.now() - started) / 1000 }); console.log(phase, heading.replaceAll('\n', ' ')); lastPhase = phase; held = false; attempts = 0;
      await page.screenshot({ path: `${output}/${phases.length}-${phase}.png` });
      if (phase === 'promise' || phase === 'secret') {
        const vaultDone = await page.locator('[data-mobile-post="drill"]').isDisabled(); action = vaultDone ? 'secure' : 'drill';
        await page.locator(`[data-mobile-post="${action}"]`).tap();
      }
      if (phase === 'ended') break;
      if (phase === 'debate') await page.getByRole('button', { name: /^(Passer|Continuer)/ }).tap();
    }
    if (phase === 'minigame') {
      if (action === 'secure' && attempts++ === 0) {
        for(let panel=0;panel<2;panel++){ for (let i = 0; i < 3; i++) { await page.locator(`[data-cable="${i}"]`).tap(); await page.getByRole('button', { name: `Borne ${['1 △', '2 ○', '3 ╳'][i]}`, exact: true }).tap(); }
         }
      } else if (action === 'drill') {
        const done = (await page.locator('#trial').getAttribute('class'))?.includes('trial-done');
        const press = !done && await page.locator('.meter').evaluate(e => { const n = e.querySelector('.meter-needle').getBoundingClientRect(), b = e.querySelector('.target-band').getBoundingClientRect(); return n.x < b.x + b.width * .5; });
        if (press && !held) { await page.keyboard.down('Space'); held = true; } else if (!press && held) { await page.keyboard.up('Space'); held = false; }
      }
    }
    await page.waitForTimeout(50);
  }
  await page.keyboard.up('Space'); const result = await page.getByRole('dialog', { name: 'Résultats du casse' }).innerText();
  await page.screenshot({ path: `${output}/result.png` });
  await writeFile(`${output}/report.json`, JSON.stringify({ elapsedSeconds: (Date.now() - started) / 1000, phases, result, musicSources:await page.evaluate(()=>window.__musicSources), errors }, null, 2));
  if (errors.length) throw Error(errors.join('\n')); console.log('FULL_MATCH_COMPLETE', result.replaceAll('\n', ' '));
} finally { await browser.close(); }
