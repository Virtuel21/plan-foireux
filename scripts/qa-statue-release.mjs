// Public release smoke: real UI and public DOM only, no saved/private state.
// PF_TEST_URL=https://.../?rev=<merged-sha> PF_QA_DIR=<evidence-folder>
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const url = process.env.PF_TEST_URL;
const out = process.env.PF_QA_DIR;
assert.ok(url && out, 'Set PF_TEST_URL and PF_QA_DIR before running this script.');
const releaseSha = process.env.PF_EXPECTED_SHA || new URL(url).searchParams.get('rev');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
const errors = [], failures = [], requests = [], assets = [], checks = {};
let passed = false, failure = null;
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => requests.push(request.url()));
page.on('response', response => {
  if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() });
  if (/\/(assets|models)\/.*\.(js|css|glb)(\?|$)/.test(response.url()))
    assets.push({ url: response.url(), status: response.status() });
});
const oldModels = () => requests.filter(request => /\/models\/(guard|lockers)\.glb$/.test(new URL(request).pathname));
const image = name => page.screenshot({ path: `${out}/${name}.png` });
const openExercise = action => page.locator(`[data-practice="${action}"]`).click();
const returnToExercises = () => page.getByRole('button', { name: 'Retour', exact: true }).click();

async function carryStatue() {
  const carry = page.locator('.statue-carry');
  await expect(carry).toBeVisible();
  const area = await carry.boundingBox();
  const target = () => page.locator('.statue-safe').evaluate(element =>
    (parseFloat(element.style.left) + parseFloat(element.style.width) / 2) / 100);
  await page.mouse.move(area.x + area.width * await target(), area.y + area.height / 2);
  await page.mouse.down();
  try {
    const until = Date.now() + 13000;
    while (Date.now() < until && !(await page.locator('#trial').getAttribute('class'))?.includes('trial-done')) {
      await page.mouse.move(area.x + area.width * await target(), area.y + area.height / 2);
      await page.waitForTimeout(35);
    }
  } finally { await page.mouse.up(); }
  await expect(page.locator('.trial-status')).toContainText('Réussi');
  await expect(page.locator('.statue-steps .complete')).toHaveCount(3);
}

async function solveRadio() {
  const radio = page.locator('.walkie-v2');
  await expect(radio).toBeVisible();
  const layout = await radio.evaluate(element => {
    const box = node => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    return {
      body: box(element.querySelector('.walkie-body')),
      antenna: box(element.querySelector('.walkie-antenna')),
      controls: [...element.querySelectorAll('.radio-knob')].map(box),
    };
  });
  const body = layout.body;
  assert.ok(layout.antenna.y + layout.antenna.h >= body.y && layout.antenna.y + layout.antenna.h <= body.y + 10, 'Antenna must be attached to its housing.');
  for (const control of layout.controls) {
    assert.ok(control.w >= 44 && control.h >= 44);
    assert.ok(control.x >= body.x && control.y >= body.y && control.x + control.w <= body.x + body.w && control.y + control.h <= body.y + body.h, 'Radio controls must stay inside their housing.');
  }
  const knob = page.getByRole('slider', { name: 'Canal', exact: true });
  for (let stage = 0; stage < 3; stage++) {
    let direction = 'ArrowRight';
    for (let scan = 0; scan < 60; scan++) {
      if (await page.locator('.radio-screen').evaluate(element => element.classList.contains('green'))) break;
      const value = Number(await knob.getAttribute('aria-valuenow'));
      if (value >= 96) direction = 'ArrowLeft';
      else if (value <= 3) direction = 'ArrowRight';
      await knob.focus();
      await page.keyboard.press(direction);
    }
    await expect(page.locator('.radio-screen')).toHaveClass(/green/);
    await page.waitForTimeout(950);
  }
  await expect(page.locator('.trial-status')).toContainText('Réussi');
  await expect(page.locator('.trial-dots .on')).toHaveCount(3);
  return layout;
}

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await expect(page.locator('#scene')).toHaveAttribute('data-character-clips', 'idle,walk,drill', { timeout: 60000 });
  await expect(page.locator('.scene-error')).toHaveCount(0);
  await expect.poll(() => assets.some(asset => /\/models\/guard-sleeping\.glb$/.test(new URL(asset.url).pathname) && asset.status === 200), { timeout: 60000 }).toBe(true);
  assert.deepEqual(oldModels(), [], 'Old standing guard and lockers must never be requested.');
  checks.sleepingGuardLoaded = true;

  await page.getByRole('button', { name: 'Essayer les épreuves' }).click();
  await expect(page.locator('[data-practice="loot"]')).toHaveText('Voler la statue');
  await openExercise('loot');
  await expect(page.locator('[data-pin]')).toHaveCount(0);
  await expect(page.locator('.trial-reward')).toContainText('16 pièces');
  await image('statue-depart');
  await carryStatue();
  checks.statueSteps = 3;
  await image('statue-reussie');
  await returnToExercises();

  await openExercise('secure');
  await expect(page.locator('.electrical-board')).toHaveAttribute('data-model-ready', 'true', { timeout: 60000 });
  for (let panel = 0; panel < 2; panel++) {
    for (let cable = 0; cable < 3; cable++) {
      await page.locator(`[data-cable="${cable}"]`).tap();
      await page.getByRole('button', { name: `Borne ${['1 △', '2 ○', '3 ╳'][cable]}`, exact: true }).tap();
    }
    await page.getByRole('button', { name: 'Valider les circuits', exact: true }).tap();
  }
  await expect(page.locator('.trial-status')).toContainText('Réussi');
  const switchTriangles = Number(await page.locator('.electrical-board').getAttribute('data-switch-native-triangles'));
  assert.equal(switchTriangles, 87);
  checks.electricalPanels = 2;
  checks.switchTriangles = switchTriangles;
  await image('boitier-natif-reussi');
  await returnToExercises();

  await page.setViewportSize({ width: 844, height: 390 });
  await openExercise('radio');
  checks.radioLayout = await solveRadio();
  checks.radioFrequencies = 3;
  await image('radio-paysage-reussie');
  await returnToExercises();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Jouer avec les bots/ }).click();
  await page.getByRole('button', { name: 'Je garde mon rôle secret' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'promise', { timeout: 15000 });
  await page.locator('[data-mobile-post="loot"]').tap();
  await expect(page.locator('[data-mobile-post="loot"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#footer')).toContainText('16 pièces');
  for (const [action, pool] of [['drill', 10], ['secure', 6], ['loot', 16], ['painting', 24]])
    await expect(page.locator(`[data-mobile-post="${action}"] .coin-amount`)).toHaveAttribute('aria-label', `${pool} pièces`);
  await expect(page.locator('.world-labels')).toBeHidden();
  await expect(page.locator('.mobile-player')).toHaveCount(4);
  await expect(page.locator('#phase-announcement')).toBeHidden();
  await image('mobile-390x844');
  await page.setViewportSize({ width: 320, height: 740 });
  for (const player of await page.locator('.mobile-player').all()) {
    const bounds = await player.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 320 && bounds.y + bounds.height <= 740, 'All mobile accomplices must fit in the viewport.');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await image('mobile-320x740');
  checks.mobilePost = 'loot';
  checks.mobilePools = [10, 6, 16, 24];
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.world-labels')).toBeVisible();
  await expect(page.locator('[data-post="loot"]')).toContainText('Voler la statue');
  await expect(page.locator('#scene')).not.toContainText('Casiers');
  await page.waitForTimeout(500);
  await image('musee-desktop');
  assert.deepEqual(oldModels(), []);
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  passed = true;
  console.log('STATUE_RELEASE_SMOKE_OK', JSON.stringify({ releaseSha, statueSteps: 3, electricalPanels: 2, radioFrequencies: 3, switchTriangles: 87, errors, failures }));
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  await image('echec').catch(() => {});
  throw error;
} finally {
  await writeFile(`${out}/controle-version-statue.json`, JSON.stringify({ url, releaseSha, passed, checks, assets: [...new Map(assets.map(asset => [asset.url, asset])).values()], oldModelRequests: oldModels(), errors, failures, failure }, null, 2));
  await browser.close();
}
