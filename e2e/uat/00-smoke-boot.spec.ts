import { test, expect } from "@playwright/test";
import { waitForAppReady } from "../helpers/app";

test.describe("UAT — App boot smoke", () => {
  test("portfolio boots and shows customize + main sections", async ({
    page,
  }) => {
    await waitForAppReady(page);
    await expect(
      page.getByRole("button", { name: /Customize portfolio/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /About/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
