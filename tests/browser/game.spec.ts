import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const evidence = "test-results/visual";
async function ready(page: Page) {
  await page.goto(process.env.PF_TEST_URL || "/");
  await expect(page.locator("#scene")).toHaveAttribute(
    "data-triangles",
    /\d+/,
    { timeout: 15000 },
  );
  await expect(page.locator("#scene")).toHaveAttribute(
    "data-character-clips",
    "idle,walk,drill",
    { timeout: 30000 },
  );
  await expect(page.locator(".post-marker")).toHaveCount(4, { timeout: 30000 });
}
async function training(page: Page, action: string) {
  await page.getByRole("button", { name: "Essayer les épreuves" }).click();
  await page.locator(`[data-practice="${action}"]`).click();
}
async function wires(page: Page, drag = false) {
  for (let panel = 0; panel < 2; panel++) {
    for (let i = 0; i < 3; i++) {
      const label = ["1 △", "2 ○", "3 ╳"][i],
        plug = page.locator(`[data-cable="${i}"]`),
        terminal = page.getByRole("button", {
          name: `Borne ${label}`,
          exact: true,
        });
      if (drag && i === 0) {
        const from = (await plug.boundingBox())!,
          to = (await terminal.boundingBox())!;
        await page.mouse.move(
          from.x + from.width / 2,
          from.y + from.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
          steps: 10,
        });
        await page.mouse.up();
      } else {
        await plug.click();
        await terminal.click();
      }
    }
    await page.getByRole("button", { name: "Valider les circuits" }).click();
  }
  await expect(page.locator(".trial-status")).toContainText("Réussi");
}
for (const [width, height] of [
  [1440, 900],
  [844, 390],
  [740, 360],
  [667, 375],
  [390, 844],
  [320, 740],
]) {
  test(`museum, clickable posts and safe layout ${width}x${height}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await ready(page);
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: `${evidence}/lobby-${width}x${height}.png` });
    await page.getByRole("button", { name: /Jouer avec les bots/ }).click();
    await page
      .getByRole("button", { name: "Je garde mon rôle secret" })
      .click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-phase",
      "promise",
      { timeout: 10000 },
    );
    const buttons = page.locator(".world-labels button:visible");
    await expect(buttons).toHaveCount(8);
    const boxes = await buttons.evaluateAll((es) =>
      es.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, name: e.textContent };
      }),
    );
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      expect(a.w, String(a.name)).toBeGreaterThanOrEqual(44);
      expect(a.h).toBeGreaterThanOrEqual(44);
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(width);
      expect(a.y + a.h).toBeLessThanOrEqual(height);
      for (const b of boxes.slice(i + 1))
        expect(
          a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y,
          `${a.name} overlaps ${b.name}`,
        ).toBe(false);
    }
    await page.locator('[data-post="secure"]').click();
    await expect(page.locator("#footer")).toContainText("Alarme −2");
    await expect(page.locator('[data-post="secure"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.screenshot({
      path: `${evidence}/promise-${width}x${height}.png`,
    });
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const triangles = Number(
      await page.locator("#scene").getAttribute("data-triangles"),
    );
    // The native backdrop and characters are intact; the open junction box
    // belongs to the mini-game, and the safe is generated at its budget in Meshy.
    expect(triangles).toBeGreaterThan(180000);
    expect(triangles).toBeLessThan(215000);
  });
}
test("landscape cables playable by taps, mouse drag, and keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await ready(page);
  await training(page, "secure");
  await wires(page, true);
  await page.screenshot({ path: `${evidence}/wires-landscape.png` });
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.locator('[data-practice="secure"]').click();
  for (let panel = 0; panel < 2; panel++) {
    for (let i = 0; i < 3; i++) {
      await page.locator(`[data-cable="${i}"]`).focus();
      await page.keyboard.press("Enter");
      await page
        .getByRole("button", {
          name: `Borne ${["1 △", "2 ○", "3 ╳"][i]}`,
          exact: true,
        })
        .focus();
      await page.keyboard.press("Enter");
    }
    await page.getByRole("button", { name: "Valider les circuits" }).click();
  }
  await expect(page.locator(".trial-status")).toContainText("Réussi");
});
test("drill, pins and pocket are completed through their real controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await ready(page);
  for (const action of ["drill", "loot", "pocket"]) {
    if (action === "drill") await training(page, action);
    else await page.locator(`[data-practice="${action}"]`).click();
    const end = Date.now() + 17000;
    let held = false;
    while (
      Date.now() < end &&
      !(await page.locator("#trial").getAttribute("class"))?.includes(
        "trial-done",
      )
    ) {
      if (action === "loot") {
        const inBand = await page.locator(".meter").evaluate((e) => {
          const a = e.querySelector(".meter-needle")!.getBoundingClientRect(),
            b = e.querySelector(".target-band")!.getBoundingClientRect();
          return a.x > b.x && a.x < b.right;
        });
        if (inBand) await page.keyboard.press("Space");
      } else {
        const press =
          action === "drill"
            ? await page.locator(".meter").evaluate((e) => {
                const a = e
                    .querySelector(".meter-needle")!
                    .getBoundingClientRect(),
                  b = e.querySelector(".target-band")!.getBoundingClientRect();
                return a.x < b.x + b.width * 0.5;
              })
            : await page
                .locator(".target-face")
                .evaluate((e) => e.classList.contains("away"));
        if (press && !held) {
          await page.keyboard.down("Space");
          held = true;
        }
        if (!press && held) {
          await page.keyboard.up("Space");
          held = false;
        }
      }
      await page.waitForTimeout(35);
    }
    await page.keyboard.up("Space");
    await expect(page.locator(".trial-status")).toContainText("Réussi");
    await page.screenshot({ path: `${evidence}/${action}-landscape.png` });
    await page.getByRole("button", { name: "Retour", exact: true }).click();
  }
});
test("reduced motion and role modal keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 844, height: 390 });
  await ready(page);
  await page
    .getByRole("button", { name: "Règles du jeu", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
  ).toBe("Règles du jeu");
});
