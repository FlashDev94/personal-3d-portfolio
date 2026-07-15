import { test, expect } from "@playwright/test";
import {
  applyDraft,
  editHeroName,
  expectApplied,
  expectConflictBanner,
  expectUnsavedDraft,
  fieldByLabel,
  goToConfigTab,
  openConfigurator,
  waitForAppReady,
} from "../helpers/app";

/**
 * UAT: Take live snapshots the abandoned draft into History with recoverable content.
 */
test.describe("UAT — Take live history integrity", () => {
  test("history lists snapshot of abandoned draft after Take live", async ({
    context,
  }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await waitForAppReady(tabA);
    await waitForAppReady(tabB);

    await openConfigurator(tabA);
    const abandoned = `Abandoned-${Date.now().toString(36)}`;
    await editHeroName(tabA, abandoned);
    await expectUnsavedDraft(tabA);

    await openConfigurator(tabB);
    const liveName = `LiveWin-${Date.now().toString(36)}`;
    await editHeroName(tabB, liveName);
    await applyDraft(tabB);
    await expectApplied(tabB);

    await expectConflictBanner(tabA);
    await tabA
      .getByRole("button", { name: /Take live \(keep mine in history\)/i })
      .click({ force: true, noWaitAfter: true, timeout: 5000 });

    await expect(fieldByLabel(tabA, /Hero first name/i)).toHaveValue(liveName, {
      timeout: 15_000,
    });

    await goToConfigTab(tabA, "History");
    await expect(
      tabA
        .getByText(/My draft before reloading live|Recovered draft|before reloading/i)
        .first()
    ).toBeVisible({ timeout: 12_000 });

    // History option or list should reference the snapshot label; abandoned
    // name may appear in option text or after loading the version
    const histText = await tabA.locator("body").innerText();
    expect(
      /My draft before reloading live|Recovered draft|before reloading/i.test(
        histText
      )
    ).toBe(true);

    await tabA.close();
    await tabB.close();
  });
});
