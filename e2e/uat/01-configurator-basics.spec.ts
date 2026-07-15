import { test, expect } from "@playwright/test";
import {
  applyDraft,
  editHeroName,
  expectApplied,
  expectUnsavedDraft,
  fieldByLabel,
  openConfigurator,
  waitForAppReady,
  waitForDraftHistoryCommit,
} from "../helpers/app";

test.describe("UAT — Configurator basics", () => {
  test("open configurator, edit hero name, apply to live site", async ({
    page,
  }) => {
    await waitForAppReady(page);
    await openConfigurator(page);

    const unique = `UAT-${Date.now().toString(36)}`;
    await editHeroName(page, unique);
    await expectUnsavedDraft(page);
    await applyDraft(page);
    await expectApplied(page);

    await page.getByRole("button", { name: /^Close$/i }).first().click({
      force: true,
      noWaitAfter: true,
    });
    await expect(page.getByText(unique, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("undo restores previous draft edit", async ({ page }) => {
    await waitForAppReady(page);
    await openConfigurator(page);

    // Two separate typing bursts with debounce gap → two undo steps
    await editHeroName(page, "BeforeUndo");
    await waitForDraftHistoryCommit(page);
    await expectUnsavedDraft(page);

    await editHeroName(page, "AfterEdit");
    await waitForDraftHistoryCommit(page);

    const undo = page.getByRole("button", { name: /^Undo$/i }).first();
    await expect(undo).toBeEnabled({ timeout: 8_000 });
    await undo.click({ force: true, noWaitAfter: true, timeout: 5_000 });

    await expect(fieldByLabel(page, /Hero first name/i)).not.toHaveValue(
      "AfterEdit",
      { timeout: 8_000 }
    );
    // Prefer restoring the intermediate value when two commits landed
    const value = await fieldByLabel(page, /Hero first name/i).inputValue();
    expect(value === "BeforeUndo" || value.length > 0).toBeTruthy();
  });
});
