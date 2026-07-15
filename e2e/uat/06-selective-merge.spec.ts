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
 * UAT: Compare & recover must support selective field merge —
 * adopting only the peer hero name while keeping the rest of the local draft.
 */
test.describe("UAT — Selective field merge", () => {
  test("merge only peer hero name into local draft", async ({ context }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await waitForAppReady(tabA);
    await waitForAppReady(tabB);

    await openConfigurator(tabA);
    const localName = `LocalSel-${Date.now().toString(36)}`;
    await editHeroName(tabA, localName);
    await expectUnsavedDraft(tabA);

    await openConfigurator(tabB);
    const peerName = `PeerSel-${Date.now().toString(36)}`;
    await editHeroName(tabB, peerName);
    await applyDraft(tabB);
    await expectApplied(tabB);

    await expectConflictBanner(tabA);
    await tabA
      .getByRole("button", { name: /Compare & recover/i })
      .click({ force: true, noWaitAfter: true, timeout: 5000 });

    await expect(tabA.getByText(/Compare versions/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Clear auto-selection then pick only Hero name
    await tabA
      .getByRole("button", { name: /Select none/i })
      .click({ force: true, noWaitAfter: true, timeout: 5000 });

    // Checkbox next to "Hero name" row in compare panel
    const heroCheckbox = tabA
      .locator("label")
      .filter({ hasText: /^Hero name$/ })
      .getByRole("checkbox")
      .or(
        tabA
          .locator("div")
          .filter({ has: tabA.getByText("Hero name", { exact: true }) })
          .getByRole("checkbox")
          .first()
      )
      .first();

    await expect(heroCheckbox).toBeVisible({ timeout: 8_000 });
    await heroCheckbox.check({ force: true }).catch(async () => {
      await heroCheckbox.click({ force: true });
    });

    const merge = tabA.getByRole("button", {
      name: /Merge selected into draft/i,
    });
    await expect(merge).toBeEnabled({ timeout: 8_000 });
    await merge.click({ force: true, noWaitAfter: true, timeout: 5000 });

    await expect(
      tabA.getByText(/Merged .* into your draft|Selective restore/i).first()
    ).toBeVisible({ timeout: 12_000 });

    // Compare lives on History tab — switch back to Profile to assert field
    await goToConfigTab(tabA, "Profile");
    await expect(fieldByLabel(tabA, /Hero first name/i)).toHaveValue(peerName, {
      timeout: 12_000,
    });

    await tabA.close();
    await tabB.close();
  });
});
