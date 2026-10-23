import { expect, test } from "@playwright/test";

test("admin pages require a login", async ({ page }) => {
  for (const path of ["/admin", "/admin/produkte"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Admin-Anmeldung" })).toBeVisible();
  }
});
