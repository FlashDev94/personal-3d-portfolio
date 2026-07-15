import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearPersistedDraft,
  loadPersistedDraft,
  savePersistedDraft,
} from "../../src/utils/history/draftPersist";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { samplePortfolio } from "../fixtures/portfolio";

describe("draftPersist", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
  });

  afterEach(() => {
    restore();
  });

  it("round-trips draft for a profile with icons and theme3d", () => {
    const data = samplePortfolio("DraftUser");
    data.theme3d = { ...data.theme3d, palette: "neon", heroScene: "neon_grid" };
    data.technologies[0].icon = "data:image/png;base64," + "Z".repeat(900);
    const baseFp = portfolioFingerprint(samplePortfolio("Live"));
    expect(savePersistedDraft(data, baseFp, "prof-1")).toBe(true);
    const loaded = loadPersistedDraft("prof-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.baseFingerprint).toBe(baseFp);
    expect(loaded!.data.config.hero.name).toBe("DraftUser");
    expect(loaded!.data.theme3d.palette).toBe("neon");
    expect(loaded!.data.theme3d.heroScene).toBe("neon_grid");
    expect(loaded!.data.technologies[0].icon.startsWith("data:image/")).toBe(
      true
    );
  });

  it("scopes drafts per profile", () => {
    savePersistedDraft(samplePortfolio("A"), "fp", "p-a");
    savePersistedDraft(samplePortfolio("B"), "fp", "p-b");
    expect(loadPersistedDraft("p-a")!.data.config.hero.name).toBe("A");
    expect(loadPersistedDraft("p-b")!.data.config.hero.name).toBe("B");
    clearPersistedDraft("p-a");
    expect(loadPersistedDraft("p-a")).toBeNull();
    expect(loadPersistedDraft("p-b")).not.toBeNull();
  });

  it("returns null for corrupt payload", () => {
    localStorage.setItem(
      "portfolio-draft-v1:p1",
      JSON.stringify({ v: 99, garbage: true })
    );
    expect(loadPersistedDraft("p1")).toBeNull();
  });
});
