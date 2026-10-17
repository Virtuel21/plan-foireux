import { test, expect } from "@playwright/test";
import { carryStatue } from "./statue-controls";

for (const [width, height, mode] of [
  [1440, 900, "mouse"],
  [844, 390, "keyboard"],
  [320, 740, "touch"],
] as const) {
  test(`statue can be lifted, carried and bagged ${width}x${height} ${mode}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: mode === "touch",
      isMobile: mode === "touch",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(process.env.PF_TEST_URL || "/", {
        waitUntil: "domcontentloaded",
      });
      await page.getByRole("button", { name: "Essayer les épreuves" }).click();
      await expect(page.locator('[data-practice="loot"]')).toHaveText(
        "Voler la statue",
      );
      await page.locator('[data-practice="loot"]').click();
      await expect(page.locator(".statue-workbench")).toBeVisible();
      await expect(page.locator("[data-pin]")).toHaveCount(0);
      const carry = (await page.locator(".statue-carry").boundingBox())!;
      expect(carry.height).toBeGreaterThanOrEqual(44);
      expect(carry.x).toBeGreaterThanOrEqual(0);
      expect(carry.y + carry.height).toBeLessThanOrEqual(height);
      await page.screenshot({
        path: `work/statue-qa/start-${width}x${height}.png`,
      });
      await carryStatue(page, mode);
      await expect(page.locator(".statue-steps .complete")).toHaveCount(3);
      await page.screenshot({
        path: `work/statue-qa/done-${width}x${height}.png`,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("statue support can be released and a noisy attempt can still be completed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(process.env.PF_TEST_URL || "/", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Essayer les épreuves" }).click();
  await page.locator('[data-practice="loot"]').click();
  const carry = (await page.locator(".statue-carry").boundingBox())!;
  await page.mouse.move(carry.x + 3, carry.y + carry.height / 2);
  await page.mouse.down();
  await expect(page.locator(".trial-status")).toContainText("grincé", {
    timeout: 4000,
  });
  await page.mouse.up();
  await expect(page.locator(".statue-workbench")).not.toHaveClass(/carrying/);
  await expect(page.locator(".statue-workbench")).toHaveAttribute(
    "data-stage",
    "0",
  );
  await carryStatue(page, "mouse");
});

test("a second finger cannot interrupt the finger carrying the statue", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await page.goto(process.env.PF_TEST_URL || "/", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Essayer les épreuves" }).click();
    await page.locator('[data-practice="loot"]').click();
    const area = (await page.locator(".statue-carry").boundingBox())!;
    const client = await context.newCDPSession(page);
    const first = {
      x: area.x + area.width * 0.3,
      y: area.y + area.height / 2,
      id: 1,
    };
    const second = { ...first, x: area.x + area.width * 0.8, id: 2 };
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first],
    });
    await expect(page.locator(".statue-workbench")).toHaveClass(/carrying/);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first, second],
    });
    await client.send("Input.dispatchTouchEvent", {
      // CDP takes the active touch set on move; touchEnd releases every finger.
      type: "touchMove",
      touchPoints: [first],
    });
    await expect(page.locator(".statue-workbench")).toHaveClass(/carrying/);
    await expect(page.locator(".statue-support")).toHaveValue("30");
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...first, x: area.x + area.width * 0.4 }],
    });
    await expect(page.locator(".statue-support")).toHaveValue("40");
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".statue-workbench")).not.toHaveClass(/carrying/);
    await client.detach();
  } finally {
    await context.close();
  }
});
