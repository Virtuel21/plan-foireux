import { test, expect } from "@playwright/test";

for (const [width, height] of [
  [844, 390],
  [320, 740],
]) {
  test(`audio settings remain usable on mobile ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto(process.env.PF_TEST_URL || "/");
    await page.getByRole("button", { name: "Réglages", exact: true }).click();
    const slider = page.locator("#volume-effects");
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(slider).toHaveValue("0");
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("100");
    await expect(slider).toHaveAttribute("aria-valuetext", "100 %");
    const bounds = (await slider.boundingBox())!;
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `test-results/visual/settings-${width}x${height}.png`,
    });
    await page.getByRole("button", { name: "Fermer", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Réglages", exact: true }),
    ).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}

test("audio settings change playing music and effects immediately, persist, and stay available in game", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    (window as any).__sounds = [];
    HTMLMediaElement.prototype.play = function () {
      if (!(window as any).__sounds.includes(this))
        (window as any).__sounds.push(this);
      return play.call(this);
    };
  });
  await page.goto(process.env.PF_TEST_URL || "/");
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  for (const [name, value] of [
    ["master", "40"],
    ["music", "20"],
    ["effects", "30"],
  ]) {
    const input = page.locator(`#volume-${name}`);
    await input.fill(value);
    await input.dispatchEvent("input");
    await expect(input).toHaveAttribute("aria-valuetext", `${value} %`);
  }
  const musicVolume = () =>
    page.evaluate(
      () =>
        (window as any).__sounds.find((a: HTMLAudioElement) =>
          a.src.includes("/music/"),
        )?.volume,
    );
  await expect.poll(musicVolume).toBeCloseTo(0.45 * 0.4 * 0.2);
  await page
    .getByRole("button", { name: "Couper tous les sons", exact: true })
    .click();
  expect(await musicVolume()).toBe(0);
  await page
    .getByRole("button", { name: "Réactiver le son", exact: true })
    .click();
  await expect.poll(musicVolume).toBeCloseTo(0.036);
  expect(
    await page.evaluate(() => {
      const effects = (window as any).__sounds.filter((a: HTMLAudioElement) =>
        a.src.includes("/audio/ui.wav"),
      );
      return effects.at(-1)?.volume;
    }),
  ).toBeCloseTo(0.3 * 0.4 * 0.3);
  await page.reload();
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await expect(page.locator("#volume-master")).toHaveValue("40");
  await expect(page.locator("#volume-music")).toHaveValue("20");
  await expect(page.locator("#volume-effects")).toHaveValue("30");
  await page.screenshot({ path: "test-results/visual/audio-settings.png" });
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: /Jouer avec les bots/ }).click();
  await page.getByRole("button", { name: "Je garde mon rôle secret" }).click();
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await expect(page.locator("#volume-master")).toHaveValue("40");
});

for (const [width, height] of [
  [844, 390],
  [390, 844],
  [320, 740],
]) {
  test(`touch pinch, pan, tap protection and reset ${width}x${height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(process.env.PF_TEST_URL || "/");
      await expect(page.locator("#scene")).toHaveAttribute(
        "data-character-clips",
        "idle,walk,drill",
        { timeout: 30000 },
      );
      await page.getByRole("button", { name: /Jouer avec les bots/ }).tap();
      await page
        .getByRole("button", { name: "Je garde mon rôle secret" })
        .tap();
      await page.locator('[data-mobile-post="secure"]').tap();
      const canvas = page.locator("#scene > canvas");
      const r = (await canvas.boundingBox())!;
      const cdp = await context.newCDPSession(page);
      const cx = r.x + r.width * 0.5,
        cy = r.y + r.height * 0.35;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: cx - 22, y: cy, id: 0 },
          { x: cx + 22, y: cy, id: 1 },
        ],
      });
      for (let gap = 24; gap <= 44; gap += 4)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: cx - gap, y: cy, id: 0 },
            { x: cx + gap, y: cy, id: 1 },
          ],
        });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      expect(
        Number(await page.locator("#scene").getAttribute("data-zoom")),
      ).toBeGreaterThan(1.6);
      const before = await page.locator("#scene").getAttribute("data-pan");
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: cx, y: cy, id: 0 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: cx + 38, y: cy + 15, id: 0 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      expect(await page.locator("#scene").getAttribute("data-pan")).not.toBe(
        before,
      );
      await expect(page.locator('[data-mobile-post="secure"]')).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      const zoom = await page.locator("#scene").getAttribute("data-zoom");
      await page.screenshot({
        path: `test-results/visual/zoom-${width}x${height}.png`,
      });
      await page.reload();
      await expect(page.locator("#scene")).toHaveAttribute("data-zoom", zoom!);
      // A solo reload returns to the lobby; the personal camera preference stays.
      const solo = page.getByRole("button", { name: /Jouer avec les bots/ });
      if (await solo.isVisible()) await solo.tap();
      const role = page.getByRole("button", {
        name: "Je garde mon rôle secret",
      });
      if (await role.isVisible()) await role.tap();
      await page
        .getByRole("button", { name: "Recentrer la scène", exact: true })
        .tap();
      await expect(page.locator("#scene")).toHaveAttribute(
        "data-zoom",
        "1.000",
      );
      await expect(page.locator("#scene")).toHaveAttribute(
        "data-pan",
        "0.000,0.000",
      );
      await page
        .getByRole("button", { name: "Zoomer la scène", exact: true })
        .tap();
      await expect(page.locator("#scene")).toHaveAttribute(
        "data-zoom",
        "1.200",
      );
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    } finally {
      await context.close();
    }
  });
}

test("desktop detailed cards sit outside the scene and only eligible rivals show Voler", async ({
  page,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(process.env.PF_TEST_URL || "/");
  await expect(page.locator("#scene")).toHaveAttribute(
    "data-character-clips",
    "idle,walk,drill",
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: /Jouer avec les bots/ }).click();
  await page.getByRole("button", { name: "Je garde mon rôle secret" }).click();
  await page.clock.fastForward(3000);
  await expect(page.locator("#crew-controls .crew-card")).toHaveCount(4);
  const scene = (await page.locator("#scene").boundingBox())!;
  const crew = (await page.locator("#crew-controls").boundingBox())!;
  expect(crew.x).toBeGreaterThanOrEqual(scene.x + scene.width);
  await expect(page.locator(".actor-marker.stealable")).toHaveCount(0);
  await page.clock.fastForward(21000);
  await expect(page.locator("body")).toHaveAttribute("data-phase", "secret");
  await expect(page.locator(".actor-marker.stealable")).toHaveCount(3);
  for (const marker of await page.locator(".actor-marker.stealable").all()) {
    await expect(marker.locator(".steal-label")).toHaveText("Voler");
    await expect(marker.locator(".coin-amount .icon")).toBeVisible();
  }
  await page.locator(".actor-marker.stealable").first().click();
  await expect(page.locator("#footer")).toContainText("Volez 90 %");
  await expect(page.locator("#crew-controls .selected")).toHaveCount(1);
  await page.clock.fastForward(3000);
  await page.screenshot({ path: "test-results/visual/desktop-steal.png" });
});

test("reopening the cutting challenge changes the actual visible outline", async ({
  page,
}) => {
  await page.goto(process.env.PF_TEST_URL || "/");
  await page.getByRole("button", { name: "Essayer les épreuves" }).click();
  const contours = new Set<string>();
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.locator('[data-practice="painting"]').click();
    contours.add((await page.locator(".cut-outline").getAttribute("points"))!);
    await page.getByRole("button", { name: "Retour", exact: true }).click();
  }
  expect(contours.size).toBe(4);
});
