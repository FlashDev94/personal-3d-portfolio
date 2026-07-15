import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearPersistedDraft,
  loadPersistedDraft,
  savePersistedDraft,
} from "../../src/utils/history/draftPersist";
import {
  appendVersion,
  clearVersionHistory,
  loadVersionHistory,
  setVersionHistoryProfileId,
} from "../../src/utils/history/versionHistory";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { samplePortfolio } from "../fixtures/portfolio";

/**
 * Profile A drafts/history must never clobber Profile B — critical for
 * multi-profile portfolio switchers.
 */
describe("multi-profile draft & history isolation", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
  });

  afterEach(() => {
    setVersionHistoryProfileId(null);
    restore();
  });

  it("draft keys are isolated per profile", () => {
    const liveA = samplePortfolio("LiveA");
    const liveB = samplePortfolio("LiveB");
    const draftA = samplePortfolio("DraftA");
    const draftB = samplePortfolio("DraftB");

    expect(
      savePersistedDraft(draftA, portfolioFingerprint(liveA), "prof-a")
    ).toBe(true);
    expect(
      savePersistedDraft(draftB, portfolioFingerprint(liveB), "prof-b")
    ).toBe(true);

    expect(loadPersistedDraft("prof-a")!.data.config.hero.name).toBe("DraftA");
    expect(loadPersistedDraft("prof-b")!.data.config.hero.name).toBe("DraftB");

    clearPersistedDraft("prof-a");
    expect(loadPersistedDraft("prof-a")).toBeNull();
    expect(loadPersistedDraft("prof-b")!.data.config.hero.name).toBe("DraftB");
  });

  it("version history is isolated per profile", () => {
    setVersionHistoryProfileId("prof-a");
    clearVersionHistory();
    appendVersion(samplePortfolio("A1"), "A apply 1");
    appendVersion(samplePortfolio("A2"), "A apply 2");
    expect(loadVersionHistory()).toHaveLength(2);

    setVersionHistoryProfileId("prof-b");
    clearVersionHistory();
    appendVersion(samplePortfolio("B1"), "B apply 1");
    expect(loadVersionHistory()).toHaveLength(1);
    expect(loadVersionHistory()[0].data.config.hero.name).toBe("B1");

    setVersionHistoryProfileId("prof-a");
    expect(loadVersionHistory()).toHaveLength(2);
    expect(loadVersionHistory()[0].data.config.hero.name).toBe("A1");
  });

  it("writing draft for B does not change fingerprint of A storage", () => {
    const a = samplePortfolio("A");
    savePersistedDraft(a, "fp-a", "prof-a");
    const rawBefore = localStorage.getItem("portfolio-draft-v1:prof-a");

    savePersistedDraft(samplePortfolio("B"), "fp-b", "prof-b");
    const rawAfter = localStorage.getItem("portfolio-draft-v1:prof-a");
    expect(rawAfter).toBe(rawBefore);
  });
});
