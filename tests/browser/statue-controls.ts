import { expect, type Page } from "@playwright/test";

/** Follow the same visible balance band a human uses; no game state is injected. */
export async function carryStatue(
  page: Page,
  mode: "mouse" | "touch" | "keyboard",
) {
  const carry = page.locator(".statue-carry");
  const area = (await carry.boundingBox())!;
  const cdp =
    mode === "touch" ? await page.context().newCDPSession(page) : null;
  const target = () =>
    page.locator(".statue-safe").evaluate((el) => {
      const style = (el as HTMLElement).style;
      return (parseFloat(style.left) + parseFloat(style.width) / 2) / 100;
    });
  const touch = async (first: boolean, x: number) =>
    cdp!.send("Input.dispatchTouchEvent", {
      type: first ? "touchStart" : "touchMove",
      touchPoints: [
        {
          x,
          y: area.y + area.height / 2,
          id: 1,
          radiusX: 7,
          radiusY: 7,
          force: 1,
        },
      ],
    });
  if (mode === "keyboard") {
    await carry.focus();
    await page.keyboard.down("Space");
  } else {
    const x = area.x + area.width * (await target());
    if (mode === "touch") await touch(true, x);
    else {
      await page.mouse.move(x, area.y + area.height / 2);
      await page.mouse.down();
    }
  }
  try {
    const until = Date.now() + 13000;
    while (
      Date.now() < until &&
      !(await page.locator("#trial").getAttribute("class"))?.includes(
        "trial-done",
      )
    ) {
      const position = await target();
      if (mode === "keyboard") {
        const current =
          Number(await page.locator(".statue-support").inputValue()) / 100;
        if (Math.abs(current - position) > 0.018)
          await page.keyboard.press(
            current < position ? "ArrowRight" : "ArrowLeft",
          );
      } else if (mode === "touch")
        await touch(false, area.x + area.width * position);
      else
        await page.mouse.move(
          area.x + area.width * position,
          area.y + area.height / 2,
        );
      await page.waitForTimeout(mode === "touch" ? 10 : 35);
    }
  } finally {
    if (mode === "keyboard") await page.keyboard.up("Space");
    else if (mode === "touch")
      await cdp!.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    else await page.mouse.up();
    await cdp?.detach();
  }
  await expect(page.locator(".trial-status")).toContainText("Réussi");
}
