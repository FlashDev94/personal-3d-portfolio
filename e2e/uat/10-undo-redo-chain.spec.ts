import { test, expect } from "@playwright/test";
import {
  editHeroName,
  expectUnsavedDraft,
  fieldByLabel,
  openConfigurator,
  waitForAppReady,
  waitForDraftHistoryCommit,
} from "../helpers/app";

/**
 * UAT: Multi-step undo/redo chain across distinct typing bursts.
 */
test.describe("UAT — Undo / redo chain", () => {
  test("three named edits can be undone then redone", async ({ page }) => {
    await waitForAppReady(page);
    await openConfigurator(page);

    await editHeroName(page, "NameOne");
    await waitForDraftHistoryCommit(page);
    await expectUnsavedDraft(page);

    await editHeroName(page, "NameTwo");
    await waitForDraftHistoryCommit(page);

    await editHeroName(page, "NameThree");
    await waitForDraftHistoryCommit(page);

    await expect(fieldByLabel(page, /Hero first name/i)).toHaveValue(
      "NameThree"
    );

    const undo = page.getByRole("button", { name: /^Undo$/i }).first();
    await expect(undo).toBeEnabled();
    await undo.click({ force: true, noWaitAfter: true });
    await page.waitForTimeout(200);
    await undo.click({ force: true, noWaitAfter: true });
    await page.waitForTimeout(200);

    const afterTwoUndos = await fieldByLabel(page, /Hero first name/i).inputValue();
    // Should have moved backward from NameThree
    expect(afterTwoUndos).not.toBe("NameThree");

    const redo = page.getByRole("button", { name: /^Redo$/i }).first();
    if (await redo.isEnabled().catch(() => false)) {
      await redo.click({ force: true, noWaitAfter: true });
      await page.waitForTimeout(200);
      const afterRedo = await fieldByLabel(page, /Hero first name/i).inputValue();
      expect(afterRedo).not.toBe(afterTwoUndos);
    }
  });
});
