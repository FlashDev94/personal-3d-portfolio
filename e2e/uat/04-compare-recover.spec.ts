import { test, expect } from "@playwright/test";
import {
  applyDraft,
  editHeroName,
  expectApplied,
  expectConflictBanner,
  expectUnsavedDraft,
  openConfigurator,
  waitForAppReady,
} from "../helpers/app";

test.describe("UAT — Compare & selective recover", () => {
  test("Compare & recover opens history compare panel", async ({ context }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await waitForAppReady(tabA);
    await waitForAppReady(tabB);

    await openConfigurator(tabA);
    await editHeroName(tabA, `CmpA-${Date.now().toString(36)}`);
    await expectUnsavedDraft(tabA);

    await openConfigurator(tabB);
    await editHeroName(tabB, `CmpB-${Date.now().toString(36)}`);
    await applyDraft(tabB);
    await expectApplied(tabB);

    await expectConflictBanner(tabA);
    await tabA
      .getByRole("button", { name: /Compare & recover/i })
      .click({ force: true, noWaitAfter: true, timeout: 5000 });

    await expect(tabA.getByText(/Compare versions/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      tabA.getByRole("button", { name: /Select all/i })
    ).toBeVisible();
    await expect(
      tabA.getByRole("button", { name: /Merge selected into draft/i })
    ).toBeVisible();

    await tabA.getByRole("button", { name: /Select all/i }).click({ force: true, noWaitAfter: true, timeout: 5000 });
    const merge = tabA.getByRole("button", {
      name: /Merge selected into draft/i,
    });
    if (await merge.isEnabled()) {
      await merge.click({ force: true, noWaitAfter: true, timeout: 5000 });
      await expect(
        tabA.getByText(/Merged .* into your draft|Selective restore/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }

    await tabA.close();
    await tabB.close();
  });
});
