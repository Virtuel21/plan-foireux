import { test, expect } from "@playwright/test";

for (const [width, height] of [
  [1000, 800],
  [844, 390],
  [320, 740],
]) {
  test(`radio antenna, housed rotary controls and gestures ${width}x${height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await page.goto(process.env.PF_TEST_URL || "/");
      await page.getByRole("button", { name: "Essayer les épreuves" }).click();
      await page.locator('[data-practice="radio"]').click();
      const layout = await page.locator(".walkie-v2").evaluate((walkie) => {
        const bounds = (element: Element) => {
          const r = element.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        };
        return {
          body: bounds(walkie.querySelector(".walkie-body")!),
          antenna: bounds(walkie.querySelector(".walkie-antenna")!),
          parts: [
            ...walkie.querySelectorAll(
              ".walkie-brand, .walkie-knobs, .radio-screen, .walkie-speaker",
            ),
          ].map(bounds),
          controls: [
            ...walkie.querySelectorAll(".radio-knob, .walkie-knobs small"),
          ].map(bounds),
        };
      });
      const body = layout.body;
      expect(layout.antenna.y + layout.antenna.h).toBeGreaterThanOrEqual(
        body.y,
      );
      expect(layout.antenna.y + layout.antenna.h).toBeLessThanOrEqual(
        body.y + 10,
      );
      expect(layout.antenna.x).toBeGreaterThan(body.x);
      expect(layout.antenna.x + layout.antenna.w).toBeLessThan(body.x + body.w);
      for (const part of [...layout.parts, ...layout.controls]) {
        expect(part.x).toBeGreaterThanOrEqual(body.x);
        expect(part.y).toBeGreaterThanOrEqual(body.y);
        expect(part.x + part.w).toBeLessThanOrEqual(body.x + body.w);
        expect(part.y + part.h).toBeLessThanOrEqual(body.y + body.h);
      }
      for (const group of [layout.parts, layout.controls])
        for (let i = 0; i < group.length; i++)
          for (const b of group.slice(i + 1)) {
            const a = group[i];
            expect(
              a.x < b.x + b.w &&
                a.x + a.w > b.x &&
                a.y < b.y + b.h &&
                a.y + a.h > b.y,
            ).toBe(false);
          }
      const coarse = page.getByRole("slider", { name: "Canal", exact: true });
      const fine = page.getByRole("slider", {
        name: "Réglage fin",
        exact: true,
      });
      for (const control of [coarse, fine]) {
        const r = (await control.boundingBox())!;
        expect(r.width).toBeGreaterThanOrEqual(44);
        expect(r.height).toBeGreaterThanOrEqual(44);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.y + r.height).toBeLessThanOrEqual(height);
      }
      await coarse.focus();
      await page.keyboard.press("ArrowRight");
      await expect(coarse).toHaveAttribute("aria-valuenow", "16");
      await fine.focus();
      await page.keyboard.press("ArrowRight");
      await expect(fine).toHaveAttribute("aria-valuenow", "17");
      const r = (await coarse.boundingBox())!;
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 0 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: r.x + r.width / 2, y: r.y + r.height / 2 - 20, id: 0 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      expect(
        Number(await coarse.getAttribute("aria-valuenow")),
      ).toBeGreaterThan(17);
      await page.screenshot({
        path: `work/ui-controls-qa/radio-interaction-${width}x${height}.png`,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    } finally {
      await context.close();
    }
  });
}
