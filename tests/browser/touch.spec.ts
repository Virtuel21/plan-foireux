import { test, expect } from "@playwright/test";
test("landscape mobile: real touch hold and release completes drill and pocket; taps complete pins", async ({
  browser,
}) => {
  test.setTimeout(45000);
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  try {
    await page.goto(process.env.PF_TEST_URL || "/");
    await page.getByRole("button", { name: "Essayer les épreuves" }).tap();
    for (const action of ["drill", "pocket", "loot"]) {
      await page.locator(`[data-practice="${action}"]`).tap();
      const operate = page.locator(".operate");
      const rect = (await operate.boundingBox())!;
      let held = false;
      const limit = Date.now() + 16500;
      while (
        Date.now() < limit &&
        !(await page.locator("#trial").getAttribute("class"))?.includes(
          "trial-done",
        )
      ) {
        if (action === "loot") {
          const hit = await page.locator(".meter").evaluate((e) => {
            const n = e.querySelector(".meter-needle")!.getBoundingClientRect(),
              b = e.querySelector(".target-band")!.getBoundingClientRect();
            return n.x > b.x && n.x < b.right;
          });
          if (hit) await operate.tap();
        } else {
          const press =
            action === "drill"
              ? await page.locator(".meter").evaluate((e) => {
                  const n = e
                      .querySelector(".meter-needle")!
                      .getBoundingClientRect(),
                    b = e
                      .querySelector(".target-band")!
                      .getBoundingClientRect();
                  return n.x < b.x + b.width * 0.5;
                })
              : await page
                  .locator(".target-face")
                  .evaluate((e) => e.classList.contains("away"));
          if (press !== held) {
            await cdp.send("Input.dispatchTouchEvent", {
              type: press ? "touchStart" : "touchEnd",
              touchPoints: press
                ? [
                    {
                      x: rect.x + rect.width / 2,
                      y: rect.y + rect.height / 2,
                      radiusX: 8,
                      radiusY: 8,
                      force: 1,
                      id: 0,
                    },
                  ]
                : [],
            });
            held = press;
          }
        }
        await page.waitForTimeout(35);
      }
      if (held)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      await expect(page.locator(".trial-status")).toContainText("Réussi");
      await page.getByRole("button", { name: "Retour", exact: true }).tap();
    }
  } finally {
    await context.close();
  }
});
