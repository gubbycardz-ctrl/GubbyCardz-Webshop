import { expect, type Page, test } from "@playwright/test";

// Relies on the sample data from `npm run seed`. Each test has its own cart cookie,
// and visitors never write to the database, so the tests can run in parallel.

async function addOffer(page: Page, slug: string, offer: string | RegExp) {
  await page.goto(`/produkte/${slug}`);
  await page.getByRole("listitem").filter({ hasText: offer }).getByRole("button", { name: "In den Warenkorb" }).click();
  await expect(page.getByRole("status")).toBeVisible();
}

test("adding, changing and removing an item", async ({ page }) => {
  await addOffer(page, "sleeves-schwarz-100", "Neu");
  await expect(page.getByRole("link", { name: /Warenkorb\s*1/ })).toBeVisible();

  await page.getByRole("status").click();
  await expect(page).toHaveURL(/\/warenkorb$/);
  await expect(page.getByRole("link", { name: "Sleeves schwarz (100 Stück)" })).toBeVisible();
  await expect(page.getByText(/Zwischensumme \(1 Artikel\):\s*8,99\s€/)).toBeVisible();

  await page.getByLabel("Menge").fill("3");
  await page.getByRole("button", { name: "Ändern" }).click();
  await expect(page.getByText(/Zwischensumme \(3 Artikel\):\s*26,97\s€/)).toBeVisible();

  await page.getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByText("Dein Warenkorb ist leer.")).toBeVisible();
});

test("quantity is capped at the available stock", async ({ page }) => {
  // Only one in stock.
  await addOffer(page, "glurak-ex-199-165", "Light Played");

  await page.getByRole("listitem").filter({ hasText: "Light Played" }).getByRole("button", { name: "In den Warenkorb" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Mehr als 1 haben wir leider nicht auf Lager.");
});

test("cart warns when the maximum order value is exceeded", async ({ page }) => {
  await addOffer(page, "glurak-ex-199-165", "PSA");
  await addOffer(page, "glurak-ex-199-165", "Deutsch");

  await page.goto("/warenkorb");
  await expect(page.getByText(/Zwischensumme \(2 Artikel\):\s*518,99\s€/)).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Wir versenden versichert bis 500,00");
});
