import { expect, test } from "@playwright/test";

// Relies on the sample data from `npm run seed`.

test("visitors find a card from the game list", async ({ page }) => {
  await page.goto("/spiele");
  await page.getByRole("link", { name: "Pokémon" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Pokémon" })).toBeVisible();
  await page.getByRole("link", { name: /Glurak ex/ }).click();

  await expect(page).toHaveURL(/\/produkte\/glurak-ex-199-165$/);
  await expect(page.getByRole("heading", { level: 1, name: "Glurak ex" })).toBeVisible();
  await expect(page.getByText("Karmesin & Purpur – 151 (MEW)")).toBeVisible();
  await expect(page.getByText(/119,99\s€/)).toBeVisible();
  // Legally required price note (PAngV).
  await expect(page.getByText(/zzgl\. Versandkosten/i)).toBeVisible();
});

test("sold-out products cannot be bought", async ({ page }) => {
  await page.goto("/produkte/bisasam-166-165");

  await expect(page.getByText("Derzeit ausverkauft.")).toBeVisible();
  await expect(page.getByRole("button", { name: "In den Warenkorb" })).toHaveCount(0);
});

test("unknown products show the not-found page", async ({ page }) => {
  await page.goto("/produkte/gibt-es-nicht");

  await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
  // The page streams, so the status is already 200 – search engines rely on noindex instead.
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});
