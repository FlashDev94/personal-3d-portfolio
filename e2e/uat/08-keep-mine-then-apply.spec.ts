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

/**
 * UAT full path: dirty tab keeps local draft on conflict, then applies it live.
 */
test.describe("UAT — Keep mine then apply", () => {
  test("after Keep mine, Apply publishes local draft to live site", async ({
    context,
  }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await waitForAppReady(tabA);
    await waitForAppReady(tabB);

    await openConfigurator(tabA);
    const localName = `KeepApply-${Date.now().toString(36)}`;
    await editHeroName(tabA, localName);
    await expectUnsavedDraft(tabA);

    await openConfigurator(tabB);
    await editHeroName(tabB, `PeerNoise-${Date.now().toString(36)}`);
    await applyDraft(tabB);
    await expectApplied(tabB);

    await expectConflictBanner(tabA);
    await tabA
      .getByRole("button", { name: "Keep mine", exact: true })
      .click({ force: true, noWaitAfter: true, timeout: 5000 });

    await expect(fieldByLabel(tabA, /Hero first name/i)).toHaveValue(localName, {
      timeout: 12_000,
    });

    await applyDraft(tabA);
    await expectApplied(tabA);

    // Live site (closed panel) shows local name
    await tabA
      .getByRole("button", { name: /^Close$/i })
      .first()
      .click({ force: true, noWaitAfter: true });
    await expect(
      tabA.getByText(localName, { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });

    // Peer tab should eventually see remote apply if it has dirty state —
    // at minimum tab B live content updates on reload
    await tabB.reload({ waitUntil: "domcontentloaded" });
    await expect(
      tabB.getByText(localName, { exact: false }).first()
    ).toBeVisible({ timeout: 20_000 });

    await tabA.close();
    await tabB.close();
  });
});
