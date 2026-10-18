import { test, expect, type Locator, type Page } from "@playwright/test";

async function openRadio(page: Page) {
  await page.goto(process.env.PF_TEST_URL || "/");
  await page.getByRole("button", { name: "Essayer les épreuves" }).click();
  await page.locator('[data-practice="radio"]').click();
}

async function turn(knob: Locator, direction: number, touch = false) {
  const bounds = (await knob.boundingBox())!;
  const position = {
    x: bounds.width * (direction > 0 ? 0.7 : 0.3),
    y: bounds.height / 2,
  };
  if (touch) await knob.tap({ position });
  else await knob.click({ position });
}

test("radio clicks turn both knobs in both directions; releasing a drag adds no click", async ({
  page,
}) => {
  await openRadio(page);
  const coarse = page.getByRole("slider", { name: "Canal", exact: true });
  const fine = page.getByRole("slider", { name: "Réglage fin", exact: true });
  const rotation = await coarse.evaluate(
    (el) => getComputedStyle(el.querySelector("span")!).transform,
  );
  await coarse.click();
  await expect(coarse).toHaveAttribute("aria-valuenow", "16");
  expect(
    await coarse.evaluate(
      (el) => getComputedStyle(el.querySelector("span")!).transform,
    ),
  ).not.toBe(rotation);
  await expect(page.locator(".frequency")).toContainText("119.6");
  await turn(coarse, -1);
  await expect(coarse).toHaveAttribute("aria-valuenow", "12");
  await turn(fine, 1);
  await expect(fine).toHaveAttribute("aria-valuenow", "13");
  await turn(fine, -1);
  await expect(fine).toHaveAttribute("aria-valuenow", "12");

  const bounds = (await coarse.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 20, { steps: 5 });
  await expect(coarse).toHaveAttribute("aria-valuenow", "22");
  await page.mouse.up();
  await expect(coarse).toHaveAttribute("aria-valuenow", "22");
  await turn(coarse, -1);
  await expect(coarse).toHaveAttribute("aria-valuenow", "18");
  await coarse.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(coarse).toHaveAttribute("aria-valuenow", "14");
});

for (const touch of [false, true]) {
  test(`radio completes three frequencies using only ${touch ? "touch taps" : "mouse clicks"}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: touch
        ? { width: 844, height: 390 }
        : { width: 1280, height: 900 },
      hasTouch: touch,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await openRadio(page);
      const coarse = page.getByRole("slider", { name: "Canal", exact: true });
      const fine = page.getByRole("slider", {
        name: "Réglage fin",
        exact: true,
      });
      await turn(fine, 1, touch);
      await expect(fine).toHaveAttribute("aria-valuenow", "13");
      await turn(fine, -1, touch);
      await expect(fine).toHaveAttribute("aria-valuenow", "12");
      for (let stage = 0; stage < 3; stage++) {
        let direction = 1;
        for (let attempt = 0; attempt < 55; attempt++) {
          if (
            await page
              .locator(".radio-screen")
              .evaluate((el) => el.classList.contains("green"))
          )
            break;
          const value = Number(await coarse.getAttribute("aria-valuenow"));
          if (value >= 96) direction = -1;
          else if (value <= 4) direction = 1;
          await turn(coarse, direction, touch);
        }
        await expect(page.locator(".radio-screen")).toHaveClass(/green/);
        if (stage < 2)
          await expect(page.locator(".radio-channel")).toHaveText(
            `FRÉQUENCE ${stage + 2} / 3`,
          );
        else
          await expect(page.locator(".trial-status")).toContainText("Réussi");
      }
      await page.screenshot({
        path: `work/radio-fix/${touch ? "touch" : "mouse"}-complete.png`,
      });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
