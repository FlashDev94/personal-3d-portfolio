import { test, expect } from "@playwright/test";
import {
  applyDraft,
  editHeroName,
  expectApplied,
  expectConflictBanner,
  expectUnsavedDraft,
  fieldByLabel,
  openConfigurator,
  waitForAppReady,
} from "../helpers/app";

test.describe("UAT — Multi-tab applied conflict recovery", () => {
  test("dirty tab sees conflict when peer applies live changes", async ({
    context,
  }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await waitForAppReady(tabA);
    await waitForAppReady(tabB);

    await openConfigurator(tabA);
    const draftName = `DraftA-${Date.now().toString(36)}`;
    await editHeroName(tabA, draftName);
    await expectUnsavedDraft(tabA);

    await openConfigurator(tabB);
    const liveName = `LiveB-${Date.now().toString(36)}`;
    await editHeroName(tabB, liveName);
    await applyDraft(tabB);
    await expectApplied(tabB);

    await expectConflictBanner(tabA);

    await expect(
      tabA.getByRole("button", { name: /Compare & recover/i })
    ).toBeVisible();
    // exact: true — "Keep mine" ≠ "Take live (keep mine in history)"
    await expect(
      tabA.getByRole("button", { name: "Keep mine", exact: true })
    ).toBeVisible();

    await tabA
      .getByRole("button", { name: "Keep mine", exact: true })
      .click({ force: true, noWaitAfter: true, timeout: 5000 });
    await expect(fieldByLabel(tabA, /Hero first name/i)).toHaveValue(draftName);
    await expect(
      tabA.getByText(/Keeping your local draft/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await tabA.close();
    await tabB.close();
  });

  test("Take live (keep mine in history) reloads live and snapshots draft", async ({
    context,
  }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await waitForAppReady(tabA);
    await waitForAppReady(tabB);

    await openConfigurator(tabA);
    await editHeroName(tabA, `KeepHist-${Date.now().toString(36)}`);
    await expectUnsavedDraft(tabA);

    await openConfigurator(tabB);
    const liveName = `PeerLive-${Date.now().toString(36)}`;
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

    await tabA.getByRole("button", { name: /^History$/i }).first().click({
      force: true,
    });
    await expect(
      tabA.getByText(/My draft before reloading live|Recovered draft/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await tabA.close();
    await tabB.close();
  });
});
