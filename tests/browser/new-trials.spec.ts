import { test, expect } from "@playwright/test";

test("landscape touchscreen: generous canvas cutting and three rotary radio frequencies", async ({
  browser,
}) => {
  test.setTimeout(60000);
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        (window as any).__music = this.src.includes("/music/")
          ? this
          : (window as any).__music;
        return original.call(this);
      };
    });
    await page.goto(process.env.PF_TEST_URL || "/");
    await page.getByRole("button", { name: "Essayer les épreuves" }).tap();
    await page.locator('[data-practice="painting"]').tap();
    const board = page.locator(".cut-board");
    const rect = (await board.boundingBox())!;
    const points = await page.locator(".cut-outline").evaluate((e) =>
      e
        .getAttribute("points")!
        .split(" ")
        .map((p) => p.split(",").map(Number)),
    );
    const cdp = await ctx.newCDPSession(page);
    // Inaccurate touch trace, then a single tap must reset it without an extra attempt.
    const bad = [
      ...Array.from({ length: 160 }, (_, i) => [30 + (i % 2) * 15, 40]),
      ...points,
    ];
    for (let i = 0; i < bad.length; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: i ? "touchMove" : "touchStart",
        touchPoints: [
          {
            x: rect.x + (bad[i][0] / 500) * rect.width,
            y: rect.y + (bad[i][1] / 300) * rect.height,
            id: 0,
          },
        ],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".trial-status")).toContainText("trop imprécise");
    await page.locator(".restart-cut").tap();
    await expect(page.locator(".cut-percent")).toHaveText("0 %");
    // Deliberately sparse samples and about 4.5% thumb drift from the outline.
    const generous = [
      points[0],
      ...points
        .filter((_, i) => i % 2 === 1)
        .map(([x, y], i) => [x + 22.5 * Math.sin(i), y + 13.5 * Math.cos(i)]),
      points.at(-1)!,
    ];
    for (let i = 0; i < generous.length; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: i === 0 ? "touchStart" : "touchMove",
        touchPoints: [
          {
            x: rect.x + (generous[i][0] / 500) * rect.width,
            y: rect.y + (generous[i][1] / 300) * rect.height,
            radiusX: 5,
            radiusY: 5,
            id: 0,
            force: 1,
          },
        ],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".trial-status")).toContainText("Réussi");
    expect(
      Number(
        (await page.locator(".cut-accuracy").innerText()).replace(" %", ""),
      ),
    ).toBeGreaterThanOrEqual(70);
    await page.screenshot({ path: "test-results/cutting-landscape.png" });
    await page.getByRole("button", { name: "Retour", exact: true }).tap();
    await page.locator('[data-practice="radio"]').tap();
    const knob = page.locator('[data-knob="0"]');
    for (let stage = 0; stage < 3; stage++) {
      let direction = "ArrowRight";
      for (let i = 0; i < 60; i++) {
        if (
          await page
            .locator(".radio-screen")
            .evaluate((e) => e.classList.contains("green"))
        )
          break;
        const value = Number(await knob.getAttribute("aria-valuenow"));
        if (value >= 96) direction = "ArrowLeft";
        else if (value <= 3) direction = "ArrowRight";
        if (stage === 0) {
          const r = (await knob.boundingBox())!;
          const x = r.x + r.width / 2,
            y = r.y + r.height / 2;
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y, id: 0 }],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              { x, y: y + (direction === "ArrowRight" ? -8 : 8), id: 0 },
            ],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        } else {
          await knob.focus();
          await page.keyboard.press(direction);
        }
      }
      await expect(page.locator(".radio-screen")).toHaveClass(/green/);
      await page.waitForTimeout(950);
    }
    await expect(page.locator(".trial-status")).toContainText("Réussi");
    await page.screenshot({ path: "test-results/radio-landscape.png" });
    for (const k of await page.locator(".radio-knob").all()) {
      const r = (await k.boundingBox())!;
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
    }
    expect(errors).toEqual([]);
    const audio = await page.evaluate(() => {
      const a = (window as any).__music;
      return { src: a?.src, paused: a?.paused };
    });
    expect(audio.src).toContain("sneaky-museum-heist.mp3");
    expect(audio.paused).toBe(false);
    await page.getByRole("button", { name: "Retour", exact: true }).tap();
    await page.getByRole("button", { name: "Fermer", exact: true }).tap();
    await page.getByRole("button", { name: /Jouer avec les bots/ }).tap();
    await page.getByRole("button", { name: "Je garde mon rôle secret" }).tap();
    await expect
      .poll(() => page.evaluate(() => (window as any).__music?.src))
      .toContain("sneaking-motif-1.mp3");
    await page.waitForFunction(() =>
      Number.isFinite((window as any).__music?.duration),
    );
    await page.evaluate(() => {
      const a = (window as any).__music;
      a.currentTime = a.duration - 0.1;
    });
    await expect
      .poll(() => page.evaluate(() => (window as any).__music?.src))
      .toContain("sneaking-motif-2.mp3");
    await page.waitForFunction(() => {
      const a = (window as any).__music;
      return a?.readyState >= 2 && !a.paused;
    });
    await page.getByRole("button", { name: "Couper les sons" }).tap();
    expect(await page.evaluate(() => (window as any).__music?.paused)).toBe(
      true,
    );
  } finally {
    await ctx.close();
  }
});

test("each training attempt owns its timer after changing exercise", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(process.env.PF_TEST_URL || "/");
  await page.getByRole("button", { name: "Essayer les épreuves" }).click();
  await page.locator('[data-practice="secure"]').click();
  await page.clock.fastForward(17000);
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.locator('[data-practice="loot"]').click();
  await page.clock.fastForward(3000);
  const before = await page.locator(".statue-safe").getAttribute("style");
  await page.clock.fastForward(400);
  const after = await page.locator(".statue-safe").getAttribute("style");
  expect(after).not.toEqual(before);
  await expect(page.locator(".trial-clock")).not.toHaveText("00:00");
});
