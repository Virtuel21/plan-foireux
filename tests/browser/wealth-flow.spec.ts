import { test, expect } from "@playwright/test";
import { HostRoom } from "../../src/host";
import { player, createGame, resolve } from "../../src/engine";
import { newTrial } from "../../src/trial";
import { writeFile } from "node:fs/promises";

// A known saved host game exercises presentation of gains/losses without a debug API.
test("restored host: money piles grow and shrink and a silent alarm has no explanation", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 844, height: 390 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const host = new HostRoom("0", "Julien");
  const players = [3, 12, 24, 48].map((money, i) => ({
    ...player(String(i), ["Julien", "Léa", "Sarah", "Max"][i], i, i !== 0),
    money,
  }));
  const g = createGame(players, 1, Date.now(), () => 0.99);
  g.players.forEach((p, i) => (p.money = players[i].money));
  host.game = g;
  host.players = g.players;
  g.phase = "secret";
  g.turn = 3;
  g.phaseStarted = Date.now();
  g.deadline = Date.now() + 12000;
  g.choices = {
    "0": { action: "pocket", target: "1" },
    "1": { action: "loot" },
    "2": { action: "secure" },
    "3": { action: "painting" },
  };
  g.successes = { "0": true, "1": false, "2": true, "3": true };
  g.players.forEach((p) => {
    g.wallets[p.id] = p.money;
    g.trials[p.id] = newTrial(g.choices[p.id].action, 1);
    g.trials[p.id].done = true;
  });
  const room = "pf-v3-qa-" + crypto.randomUUID().slice(0, 8);
  await page.addInitScript(
    ({ data, room }) =>
      sessionStorage.setItem("pf-v3-host", JSON.stringify({ data, room })),
    { data: host.serialize(), room },
  );
  await page.goto(process.env.PF_TEST_URL || "/");
  await expect(page.locator("#scene")).toHaveAttribute(
    "data-wealth-coins",
    "[3,12,24,48]",
    { timeout: 10000 },
  );
  await expect(page.locator("#scene")).toHaveAttribute(
    "data-wealth-units",
    "[1,4,8,12]",
  );
  await expect(page.locator("#phase-announcement")).toBeHidden();
  await page.screenshot({ path: "test-results/wealth-before.png" });
  await expect(page.locator("body")).toHaveAttribute("data-phase", "reveal", {
    timeout: 30000,
  });
  await expect(page.locator("#scene")).toHaveAttribute(
    "data-wealth-coins",
    "[7,8,36,60]",
    { timeout: 7000 },
  );
  await expect(page.locator(".alarm-explanation")).toHaveCount(0);
  await expect(page.locator(".report-context")).not.toContainText(
    "Défis ratés",
  );
  await expect(page.locator(".vote-card").nth(1)).toContainText("Volé −4");
  await page.screenshot({ path: "test-results/wealth-silent-report.png" });
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.screenshot({ path: "test-results/wealth-after.png" });
  const stats = await page
    .locator("#scene")
    .evaluate((e) => ({ ...(e as HTMLElement).dataset }));
  await writeFile(
    "test-results/wealth-stats.json",
    JSON.stringify(stats, null, 2),
  );
  await test.info().attach("scene-stats", {
    body: JSON.stringify(stats, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("restored secret choice warns of repeat theft, central announcement stays centered and hard trial survives reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const host = new HostRoom("0", "Julien");
  const g = createGame(
    [0, 1, 2, 3].map((i) =>
      player(String(i), ["Julien", "Léa", "Sarah", "Max"][i], i, i !== 0),
    ),
    1,
    Date.now(),
    () => 0.99,
  );
  host.game = g;
  host.players = g.players;
  g.phase = "secret";
  g.turn = 3;
  g.deadline = Date.now() + 8500;
  g.lastThefts = { "0": "1" };
  g.choices = { "0": { action: "pocket", target: "1" } };
  g.players.forEach((p, i) => {
    p.money = [36, 12, 24, 48][i];
    p.promise = { action: "secure" };
  });
  const room = "pf-v3-qa-" + crypto.randomUUID().slice(0, 8);
  await page.addInitScript(
    ({ data, room }) => {
      if (!sessionStorage.getItem("pf-v3-host"))
        sessionStorage.setItem("pf-v3-host", JSON.stringify({ data, room }));
    },
    { data: host.serialize(), room },
  );
  await page.goto(process.env.PF_TEST_URL || "/");
  const banner = page.locator("#phase-announcement");
  await expect(banner).toContainText("Choisissez votre vrai poste");
  await page.waitForTimeout(350);
  const r = (await banner.boundingBox())!;
  expect(Math.abs(r.x + r.width / 2 - 422)).toBeLessThan(3);
  expect(Math.abs(r.y + r.height / 2 - 390 * 0.48)).toBeLessThan(3);
  expect(r.width).toBeGreaterThan(700);
  await expect(page.locator("#footer")).toContainText("CIBLE TRÈS VIGILANTE");
  await page.screenshot({ path: "test-results/wealth-vigilance.png" });
  await expect(page.locator("body")).toHaveAttribute("data-phase", "minigame", {
    timeout: 13000,
  });
  await expect(page.locator("#trial")).toContainText("une prise perdue");
  await page.reload();
  await expect(page.locator("#trial")).toContainText("une prise perdue");
});

test("same-round theft report shows 11 stolen out of a successful reward of 12", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const host = new HostRoom("0", "Julien");
  const g = createGame(
    [0, 1, 2, 3].map((i) =>
      player(String(i), ["Julien", "Léa", "Sarah", "Max"][i], i, i !== 0),
    ),
    1,
    Date.now(),
    () => 0.99,
  );
  host.game = g;
  host.players = g.players;
  g.choices = {
    "0": { action: "pocket", target: "1" },
    "1": { action: "drill" },
    "2": { action: "secure" },
    "3": { action: "painting" },
  };
  g.successes = { "0": true, "1": true, "2": true, "3": true };
  resolve(g);
  g.phase = "reveal";
  g.turn = 6;
  g.deadline = Date.now() + 60000;
  const room = "pf-v3-qa-" + crypto.randomUUID().slice(0, 8);
  await page.addInitScript(
    ({ data, room }) =>
      sessionStorage.setItem("pf-v3-host", JSON.stringify({ data, room })),
    { data: host.serialize(), room },
  );
  await page.goto(process.env.PF_TEST_URL || "/");
  const victim = page.locator(".vote-card").nth(1);
  await expect(victim).toContainText("Forer · Réussi");
  await expect(victim).toContainText("Gain +12 · Volé −11 · Solde du tour +1");
  await expect(victim).toContainText("1 pièces");
  await expect(page.locator(".alarm-explanation")).toHaveCount(0);
  await page.screenshot({ path: "test-results/eleven-stolen.png" });
});
