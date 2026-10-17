import { test, expect } from "@playwright/test";
test("four WebRTC browsers hosted locally: secret choices, guest reload, synchronized reveal", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const contexts = await Promise.all(
    [0, 1, 2, 3].map(() =>
      browser.newContext({
        viewport: { width: 844, height: 390 },
        hasTouch: true,
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  try {
    await pages[0].goto("/");
    await pages[0]
      .getByRole("button", { name: "Inviter mes complices" })
      .click();
    await expect(pages[0]).toHaveURL(/#room=pf-v1-/, { timeout: 30000 });
    const url = pages[0].url();
    for (let i = 1; i < 4; i++) {
      await pages[i].goto(url);
      await pages[i].locator("#nickname").fill(["Léa", "Sarah", "Max"][i - 1]);
      await pages[i]
        .getByRole("button", { name: "Rejoindre les complices" })
        .click();
      await expect(pages[i].locator(".lobby-roster")).toContainText("Julien", {
        timeout: 30000,
      });
    }
    await expect(pages[0].locator(".lobby-roster")).toContainText(
      "4/4 complices",
    );
    await Promise.all(
      pages.map((p) =>
        p.getByRole("button", { name: "Je suis prêt", exact: true }).click(),
      ),
    );
    await expect(
      pages[0].getByRole("button", { name: "Lancer le casse" }),
    ).toBeEnabled();
    await pages[0].getByRole("button", { name: "Lancer le casse" }).click();
    await Promise.all(
      pages.map((p) =>
        p.getByRole("button", { name: "Je garde mon rôle secret" }).click(),
      ),
    );
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "promise",
      { timeout: 10000 },
    );
    await Promise.all(
      pages.map((p, i) =>
        p
          .locator(`[data-post="${["drill", "secure", "loot", "secure"][i]}"]`)
          .click(),
      ),
    );
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "secret",
      { timeout: 25000 },
    );
    await pages[3].locator('[data-post="loot"]').click();
    await expect(pages[3].locator('[data-post="loot"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      pages[0].locator(".actor-marker").filter({ hasText: "Max" }),
    ).toContainText("Promis : Sécuriser");
    await expect(pages[1].locator("body")).toHaveAttribute(
      "data-phase",
      "minigame",
      { timeout: 18000 },
    );
    const p = pages[1];
    await p.locator('[data-cable="0"]').tap();
    await p.getByRole("button", { name: "Borne 1 △", exact: true }).tap();
    await p.waitForTimeout(400);
    await p.goto("about:blank");
    await expect(pages[0].locator("#pause-root")).toBeVisible({
      timeout: 20000,
    });
    await p.goto(url);
    if (
      await p
        .getByRole("button", { name: "Rejoindre les complices" })
        .isVisible()
    )
      await p.getByRole("button", { name: "Rejoindre les complices" }).click();
    await expect(p.locator("body")).toHaveAttribute("data-phase", "minigame", {
      timeout: 30000,
    });
    await expect(pages[0].locator("#pause-root")).toBeHidden({
      timeout: 15000,
    });
    await expect(p.locator('[data-cable="0"]')).toHaveCSS("left", /px/);
    for (let i = 1; i < 3; i++) {
      await p.locator(`[data-cable="${i}"]`).tap();
      await p
        .getByRole("button", {
          name: `Borne ${["1 △", "2 ○", "3 ╳"][i]}`,
          exact: true,
        })
        .tap();
    }
    await p.getByRole("button", { name: "Abaisser le levier" }).tap();
    await expect(p.locator(".trial-status")).toContainText("Réussi");
    await expect(pages[0].locator(".my-money")).toContainText("0");
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "reveal",
      { timeout: 25000 },
    );
    await expect(
      pages[0].locator(".actor-marker").filter({ hasText: "Léa" }),
    ).toContainText("+6");
    await pages[0].screenshot({ path: "test-results/network-reveal.png" });
    const rolesBefore = await pages[0].evaluate(
      () =>
        JSON.parse(JSON.parse(sessionStorage.getItem("pf-v1-host")!).data).game
          .roles,
    );
    await pages[0].reload();
    await expect(pages[0].locator("body")).toHaveClass(/in-game/, {
      timeout: 30000,
    });
    await expect(pages[0].locator("#pause-root")).toBeHidden({
      timeout: 30000,
    });
    const restored = await pages[0].evaluate(
      () =>
        JSON.parse(JSON.parse(sessionStorage.getItem("pf-v1-host")!).data).game,
    );
    expect(restored.roles).toEqual(rolesBefore);
    expect(restored.report.findings.some((f: any) => f.gain === 6)).toBe(true);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
