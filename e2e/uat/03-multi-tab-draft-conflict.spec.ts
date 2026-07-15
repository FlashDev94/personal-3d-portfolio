import { test, expect } from "@playwright/test";
import {
  editHeroName,
  expectUnsavedDraft,
  fieldByLabel,
  openConfigurator,
  waitForAppReady,
} from "../helpers/app";

test.describe("UAT — Multi-tab draft conflict", () => {
  test("peer draft overwrite surfaces compare/take other/keep mine", async ({
    context,
  }) => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await waitForAppReady(tabA);
    await waitForAppReady(tabB);

    await openConfigurator(tabA);
    await editHeroName(tabA, `LocalDraft-${Date.now().toString(36)}`);
    await tabA.waitForTimeout(1000);
    await expectUnsavedDraft(tabA);

    await openConfigurator(tabB);
    const peerName = `PeerDraft-${Date.now().toString(36)}`;
    await editHeroName(tabB, peerName);
    await tabB.waitForTimeout(1000);

    await expect(
      tabA
        .getByText(
          /Draft conflict|Another tab saved a different draft|different draft/i
        )
        .first()
    ).toBeVisible({ timeout: 25_000 });

    await expect(
      tabA.getByRole("button", { name: /Take other draft/i })
    ).toBeVisible();

    await tabA
      .getByRole("button", { name: /Take other draft/i })
      .click({ force: true, noWaitAfter: true, timeout: 5000 });
    await expect(fieldByLabel(tabA, /Hero first name/i)).toHaveValue(peerName, {
      timeout: 15_000,
    });

    await tabA.close();
    await tabB.close();
  });
});
