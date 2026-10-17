import { test, expect } from "@playwright/test";
test("four WebRTC browsers hosted locally: secret choices, guest reload, synchronized reveal", async ({
  browser,
}) => {
  test.setTimeout(220000);
  const contexts = await Promise.all(
    [0, 1, 2, 3].map(() =>
      browser.newContext({
        viewport: { width: 844, height: 390 },
        hasTouch: true,
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors: string[] = [];
  pages.forEach((p) => p.on("pageerror", (e) => errors.push(e.message)));
  try {
    await pages[0].goto(process.env.PF_TEST_URL || "/");
    await pages[0]
      .getByRole("button", { name: "Inviter mes complices" })
      .click();
    await expect(pages[0]).toHaveURL(/#room=pf-v3-/, { timeout: 30000 });
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
    const agentIndex = (
      await Promise.all(pages.map((p) => p.locator(".role-card.agent").count()))
    ).findIndex((n) => n === 1);
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
    await expect(pages[0].locator('[data-post="painting"]')).toBeVisible();
    await expect(pages[0].locator("#phase-announcement")).toContainText(
      "Annoncez votre poste",
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
    await expect(pages[0].locator("#phase-announcement")).toContainText(
      "Choisissez votre vrai poste",
    );
    await pages[0].screenshot({ path: "test-results/secret-announcement.png" });
    await pages[3].locator('[data-post="loot"]').click();
    await expect(pages[3].locator('[data-post="loot"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      pages[0].locator(".actor-marker").filter({ hasText: "Max" }),
    ).toContainText("Promis : Désactiver les caméras");
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
    await p.getByRole("button", { name: "Valider les circuits" }).tap();
    for (let i = 0; i < 3; i++) {
      await p.locator(`[data-cable="${i}"]`).tap();
      await p
        .getByRole("button", {
          name: `Borne ${["1 △", "2 ○", "3 ╳"][i]}`,
          exact: true,
        })
        .tap();
    }
    await p.getByRole("button", { name: "Valider les circuits" }).tap();
    await expect(p.locator(".trial-status")).toContainText("Réussi");
    await expect(pages[0].locator(".my-money")).toContainText("0");
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "reveal",
      { timeout: 25000 },
    );
    await expect(
      pages[0].locator(".actor-marker").filter({ hasText: "Léa" }),
    ).toContainText("+12");
    await pages[0].screenshot({ path: "test-results/network-reveal.png" });
    const rolesBefore = await pages[0].evaluate(
      () =>
        JSON.parse(JSON.parse(sessionStorage.getItem("pf-v3-host")!).data).game
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
        JSON.parse(JSON.parse(sessionStorage.getItem("pf-v3-host")!).data).game,
    );
    expect(restored.roles).toEqual(rolesBefore);
    expect(restored.report.findings.some((f: any) => f.gain === 12)).toBe(true);
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "debate",
      { timeout: 20000 },
    );
    const candidate = await pages[0]
      .locator("[data-vote]")
      .nth((agentIndex + 2) % 4)
      .getAttribute("data-vote");
    await Promise.all(
      pages
        .slice(0, 3)
        .map((p) => p.locator(`[data-vote="${candidate}"]`).tap()),
    );
    for (const p of pages)
      await expect(p.locator(`[data-count="${candidate}"]`)).toHaveText(
        "3 / 4",
      );
    await expect(pages[0].locator(".alarm-explanation")).toContainText(
      "Temps écoulé",
    );
    await expect(pages[0].locator(".vote-card")).toHaveCount(4);
    await expect(pages[0].locator(".report-clock")).toHaveText(/00:\d{2}/);
    await pages[0].screenshot({ path: "test-results/live-vote-landscape.png" });
    await pages[3].locator('[data-action="pass"]').tap();
    // Next round: the real private radio UI overrides a challenge completed locally.
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "promise",
      { timeout: 3000 },
    );
    await Promise.all(
      pages.map((p) => p.locator('[data-post="secure"]').tap()),
    );
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "secret",
      { timeout: 25000 },
    );
    const victimIndex = (agentIndex + 1) % 4;

    await pages[agentIndex].locator('[data-action="jam"]').tap();
    const targets = pages[agentIndex].locator("[data-jam-target]");
    const targetIndex = Array.from({ length: 4 }, (_, i) => i)
      .filter((i) => i !== agentIndex)
      .indexOf(victimIndex);
    await targets.nth(targetIndex).tap();
    await expect(pages[agentIndex].locator(".transmitter")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "minigame",
      { timeout: 18000 },
    );
    await Promise.all(
      pages.map(async (p, i) => {
        if (i !== agentIndex) {
          for (let panel = 0; panel < 2; panel++) {
            for (let n = 0; n < 3; n++) {
              await p.locator(`[data-cable="${n}"]`).tap();
              await p
                .getByRole("button", {
                  name: `Borne ${["1 △", "2 ○", "3 ╳"][n]}`,
                  exact: true,
                })
                .tap();
            }
            await p.getByRole("button", { name: "Valider les circuits" }).tap();
          }
        } else {
          const knob = p.locator('[data-knob="0"]');
          for (let stage = 0; stage < 3; stage++) {
            let direction = "ArrowRight";
            for (let j = 0; j < 60; j++) {
              if (
                await p
                  .locator(".radio-screen")
                  .evaluate((e) => e.classList.contains("green"))
              )
                break;
              const value = Number(await knob.getAttribute("aria-valuenow"));
              if (value >= 96) direction = "ArrowLeft";
              else if (value <= 3) direction = "ArrowRight";
              await knob.focus();
              await p.keyboard.press(direction);
            }
            await p.waitForTimeout(950);
          }
        }
        await expect(p.locator(".trial-done")).toBeVisible();
      }),
    );
    await expect(pages[0].locator("body")).toHaveAttribute(
      "data-phase",
      "reveal",
      { timeout: 25000 },
    );
    for (const p of pages) {
      await expect(p.locator(".vote-card").nth(victimIndex)).toContainText(
        "Raté",
      );
      await expect(p.locator(".vote-card").nth(agentIndex)).toContainText(
        "Désactiver les caméras · Réussi",
      );
      await expect(p.locator(".vote-card")).toHaveCount(4);
      await expect(p.locator(".alarm-explanation")).toHaveCount(0);
    }
    await pages[0].screenshot({
      path: "test-results/targeted-radio-reveal.png",
    });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
