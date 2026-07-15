import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendVersion,
  clearVersionHistory,
  deleteVersion,
  ensureSeedVersion,
  getVersion,
  isTrimmedIconPlaceholder,
  loadVersionHistory,
  setVersionHistoryProfileId,
  TRIMMED_ICON_PLACEHOLDER,
} from "../../src/utils/history/versionHistory";
import { profileVersionsKey } from "../../src/utils/profiles/types";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

describe("versionHistory", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
    setVersionHistoryProfileId(null);
    clearVersionHistory();
  });

  afterEach(() => {
    clearVersionHistory();
    setVersionHistoryProfileId(null);
    restore();
  });

  it("append / load / get / delete round-trip", () => {
    const data = samplePortfolio("V1");
    const { entry, persisted } = appendVersion(data, "Applied from configurator");
    expect(persisted).toBe(true);
    expect(entry.label).toBe("Applied from configurator");
    expect(entry.id).toBeTruthy();

    const list = loadVersionHistory();
    expect(list).toHaveLength(1);
    expect(list[0].data.config.hero.name).toBe("V1");

    expect(getVersion(entry.id)?.label).toBe("Applied from configurator");
    expect(getVersion("missing")).toBeNull();

    const afterDelete = deleteVersion(entry.id);
    expect(afterDelete).toHaveLength(0);
    expect(loadVersionHistory()).toHaveLength(0);
  });

  it("ensureSeedVersion only seeds when empty", () => {
    const first = samplePortfolio("Seed");
    const seeded = ensureSeedVersion(first, "Initial");
    expect(seeded).toHaveLength(1);
    expect(seeded[0].label).toBe("Initial");

    const again = ensureSeedVersion(samplePortfolio("Other"), "Again");
    expect(again).toHaveLength(1);
    expect(again[0].data.config.hero.name).toBe("Seed");
  });

  it("scopes history by profile id", () => {
    setVersionHistoryProfileId("prof-a");
    appendVersion(samplePortfolio("A"), "A apply");
    expect(loadVersionHistory()).toHaveLength(1);

    setVersionHistoryProfileId("prof-b");
    expect(loadVersionHistory()).toHaveLength(0);
    appendVersion(samplePortfolio("B"), "B apply");
    expect(loadVersionHistory()[0].data.config.hero.name).toBe("B");

    setVersionHistoryProfileId("prof-a");
    expect(loadVersionHistory()[0].data.config.hero.name).toBe("A");

    // Storage keys are profile-scoped
    expect(localStorage.getItem(profileVersionsKey("prof-a"))).toBeTruthy();
    expect(localStorage.getItem(profileVersionsKey("prof-b"))).toBeTruthy();
  });

  it("detects trimmed icon placeholders", () => {
    expect(isTrimmedIconPlaceholder(TRIMMED_ICON_PLACEHOLDER)).toBe(true);
    expect(isTrimmedIconPlaceholder("data:image/png;base64,abc")).toBe(false);
    expect(isTrimmedIconPlaceholder(null)).toBe(false);
  });

  it("keeps multiple snapshots in order (newest last)", () => {
    appendVersion(samplePortfolio("One"), "One");
    appendVersion(samplePortfolio("Two"), "Two");
    appendVersion(samplePortfolio("Three"), "Three");
    const labels = loadVersionHistory().map((e) => e.label);
    expect(labels).toEqual(["One", "Two", "Three"]);
  });

  it("survives corrupt storage JSON", () => {
    localStorage.setItem("portfolio-versions-v1", "{not-json");
    expect(loadVersionHistory()).toEqual([]);
    const data = clonePortfolio(samplePortfolio("Recover"));
    const { persisted } = appendVersion(data, "After corrupt");
    expect(persisted).toBe(true);
    expect(loadVersionHistory()).toHaveLength(1);
  });
});
