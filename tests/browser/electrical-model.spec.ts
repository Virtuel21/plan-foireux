import { test, expect, type Page } from "@playwright/test";

async function openBoard(page: Page) {
  await page.goto(process.env.PF_TEST_URL || "/");
  await page.getByRole("button", { name: "Essayer les épreuves" }).click();
  await page.locator('[data-practice="secure"]').click();
  await expect(page.locator(".electrical-board")).toHaveAttribute(
    "data-model-ready",
    "true",
    { timeout: 30000 },
  );
}

async function connectPanel(page: Page, mode: "tap" | "drag" | "keyboard") {
  for (let i = 0; i < 3; i++) {
    const plug = page.locator(`[data-cable="${i}"]`);
    const terminal = page.getByRole("button", {
      name: `Borne ${["1 △", "2 ○", "3 ╳"][i]}`,
      exact: true,
    });
    if (mode === "keyboard") {
      await plug.focus();
      await page.keyboard.press("Enter");
      await terminal.focus();
      await page.keyboard.press("Enter");
    } else if (mode === "drag" && i === 0) {
      const a = (await plug.boundingBox())!,
        b = (await terminal.boundingBox())!;
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {
        steps: 8,
      });
      await page.mouse.up();
    } else {
      await plug.click();
      await terminal.click();
    }
  }
}

async function plateCircuits(page: Page) {
  const board = (await page.locator(".electrical-board").boundingBox())!;
  const plates = await page.locator("[data-terminal]").evaluateAll((buttons) =>
    buttons.map((button) => {
      const label = button.querySelector("span")!.getBoundingClientRect();
      return {
        circuit: Number(button.dataset.circuit),
        color: button.style.getPropertyValue("--wire"),
        x: label.x + label.width / 2,
        y: label.y + label.height / 2,
        expectedX: Number(button.dataset.plateX),
        expectedY: Number(button.dataset.plateY),
      };
    }),
  );
  for (const plate of plates) {
    expect(plate.x).toBeCloseTo(board.x + plate.expectedX, 1);
    expect(plate.y).toBeCloseTo(board.y + plate.expectedY, 1);
    expect(plate.color).toBe(["#edb844", "#ef896a", "#47d8ca"][plate.circuit]);
  }
  return plates.map((plate) => plate.circuit);
}

for (const [width, height] of [
  [1000, 800],
  [844, 390],
  [320, 740],
]) {
  test(`native electrical model, physical controls and both panels ${width}x${height}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await openBoard(page);
    const board = page.locator(".electrical-board");
    await expect(board.locator("canvas")).toHaveCount(1);
    await expect(board.locator("img")).toHaveCount(0);
    expect(
      Number(await board.getAttribute("data-switch-native-triangles")),
    ).toBeGreaterThan(0);
    await expect(page.locator(".trial-reward")).toHaveText(
      "6 pièces à partager",
    );
    const bounds = (await board.boundingBox())!;
    const targets = await board.locator("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const r = button.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          ax: Number(button.dataset.anchorX),
          ay: Number(button.dataset.anchorY),
        };
      }),
    );
    for (const target of targets) {
      expect(target.w).toBeGreaterThanOrEqual(44);
      expect(target.h).toBeGreaterThanOrEqual(44);
      expect(target.x).toBeGreaterThanOrEqual(bounds.x);
      expect(target.y).toBeGreaterThanOrEqual(bounds.y);
      expect(target.x + target.w).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(target.y + target.h).toBeLessThanOrEqual(bounds.y + bounds.height);
      // Each physical model part is inside its own generous hit area.
      expect(bounds.x + target.ax).toBeGreaterThanOrEqual(target.x);
      expect(bounds.x + target.ax).toBeLessThanOrEqual(target.x + target.w);
      expect(bounds.y + target.ay).toBeGreaterThanOrEqual(target.y);
      expect(bounds.y + target.ay).toBeLessThanOrEqual(target.y + target.h);
    }
    for (let i = 0; i < targets.length; i++)
      for (const b of targets.slice(i + 1)) {
        const a = targets[i];
        expect(
          a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y,
          `overlapping controls ${i}`,
        ).toBe(false);
      }
    // All validation is automatic; the native switch is decorative.
    await expect(
      board.getByRole("button", { name: "Valider les circuits" }),
    ).toHaveCount(0);
    const firstPanel = await plateCircuits(page);
    await page.screenshot({
      path: `work/ui-controls-qa/electrical-initial-${width}x${height}.png`,
    });
    await connectPanel(page, width === 320 ? "tap" : "drag");
    await expect(board).toHaveAttribute("data-panel", "2");
    expect(await plateCircuits(page)).toEqual(
      firstPanel.map((circuit) => (circuit + 1) % 3),
    );
    await page.screenshot({
      path: `work/ui-controls-qa/electrical-reordered-${width}x${height}.png`,
    });
    await connectPanel(page, "keyboard");
    await expect(page.locator(".trial-status")).toContainText("Réussi");
    await page.screenshot({
      path: `work/electrical-qa/electrical-model-${width}x${height}.png`,
    });
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}

test("wrong full panels release only wrong wires automatically and sockets allow unplugging", async ({
  page,
}) => {
  await openBoard(page);
  const board = page.locator(".electrical-board");
  const socket = page.locator('[data-terminal="0"]');
  const first = Number(await socket.getAttribute("data-circuit"));
  const wrong = (first + 1) % 3;
  await page.locator(`[data-cable="${wrong}"]`).click();
  await socket.click();
  await expect(board).not.toHaveAttribute("data-connections", "-1,-1,-1");
  await socket.click();
  await expect(board).toHaveAttribute("data-connections", "-1,-1,-1");
  // Fill all three with the same wrong cyclic permutation; no button to press.
  for (let terminal = 0; terminal < 3; terminal++) {
    const target = page.locator(`[data-terminal="${terminal}"]`);
    const circuit = Number(await target.getAttribute("data-circuit"));
    await page.locator(`[data-cable="${(circuit + 1) % 3}"]`).click();
    await target.click();
  }
  await expect(board).toHaveAttribute("data-connections", "-1,-1,-1");
  await expect(board).toHaveAttribute("data-panel", "1");
  await connectPanel(page, "tap");
  await expect(board).toHaveAttribute("data-panel", "2");
});

test("a failed model request can be retried by reopening training", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/electrical-box*.glb*", async (route) => {
    requests++;
    if (requests <= 2) await route.abort();
    else await route.continue();
  });
  await page.goto(process.env.PF_TEST_URL || "/");
  await expect.poll(() => requests).toBe(1);
  await page.getByRole("button", { name: "Essayer les épreuves" }).click();
  await page.locator('[data-practice="secure"]').click();
  await expect(page.locator(".electrical-board")).toHaveAttribute(
    "data-model-ready",
    "error",
  );
  await page.getByRole("button", { name: "Retour", exact: true }).click();
  await page.locator('[data-practice="secure"]').click();
  await expect(page.locator(".electrical-board")).toHaveAttribute(
    "data-model-ready",
    "true",
    { timeout: 30000 },
  );
  expect(requests).toBe(3);
});
