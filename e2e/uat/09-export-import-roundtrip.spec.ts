import { test, expect } from "@playwright/test";
import {
  editHeroName,
  expectUnsavedDraft,
  fieldByLabel,
  goToConfigTab,
  openConfigurator,
  waitForAppReady,
  waitForDraftHistoryCommit,
} from "../helpers/app";

/**
 * UAT: Download draft JSON contains the unsaved hero; load-into-draft restores it.
 */
test.describe("UAT — Export / import roundtrip", () => {
  test("download draft JSON includes hero; load into draft restores name", async ({
    page,
  }) => {
    await waitForAppReady(page);
    await openConfigurator(page);

    const name = `ExportRT-${Date.now().toString(36)}`;
    await editHeroName(page, name);
    await expectUnsavedDraft(page);
    await waitForDraftHistoryCommit(page);
    await page.waitForTimeout(400);

    await goToConfigTab(page, /Import \/ Export/);

    const downloadBtn = page.getByRole("button", {
      name: /Download draft JSON/i,
    });
    await expect(downloadBtn).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      downloadBtn.click({ force: true }),
    ]);

    const stream = await download.createReadStream();
    expect(stream).toBeTruthy();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const exported = Buffer.concat(chunks).toString("utf8");
    expect(exported).toContain(name);
    expect(exported).toMatch(/"hero"/);

    // Wipe field so import is observable
    await openConfigurator(page);
    await goToConfigTab(page, "Profile");
    await editHeroName(page, "WipedBeforeImport");
    await waitForDraftHistoryCommit(page);

    await goToConfigTab(page, /Import \/ Export/);
    const importArea = page.locator("textarea").first();
    await expect(importArea).toBeVisible({ timeout: 8_000 });
    await importArea.fill(exported);

    // Actual button label in UI
    const importDraftBtn = page.getByRole("button", {
      name: /Load into draft only/i,
    });
    await expect(importDraftBtn).toBeVisible({ timeout: 8_000 });
    await importDraftBtn.click({ force: true, noWaitAfter: true });

    await expect(
      page.getByText(/JSON loaded into draft only/i).first()
    ).toBeVisible({ timeout: 12_000 });

    await goToConfigTab(page, "Profile");
    await expect(fieldByLabel(page, /Hero first name/i)).toHaveValue(name, {
      timeout: 12_000,
    });
  });
});
