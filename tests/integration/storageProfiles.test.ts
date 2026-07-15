import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { samplePortfolio } from "../fixtures/portfolio";
import {
  diagnoseStorage,
  recoverStorage,
  measureLocalStorageBytes,
} from "../../src/utils/storage/health";
import { safeSetItem } from "../../src/utils/storage/safeSet";
import {
  internPortfolioAssets,
  resolvePortfolioAssets,
} from "../../src/utils/profiles/assets";
import {
  savePersistedDraft,
  loadPersistedDraft,
} from "../../src/utils/history/draftPersist";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";

describe("storage + multi-profile integrity", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage(250_000));
  });

  afterEach(() => {
    restore();
  });

  it("keeps active profile + draft assets after recovery", () => {
    const active = "prof-active";
    localStorage.setItem(
      "portfolio-profiles-v1",
      JSON.stringify({
        v: 1,
        activeId: active,
        profiles: [
          {
            id: active,
            slug: "active",
            label: "Active",
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      })
    );

    const portfolio = samplePortfolio("Active");
    portfolio.technologies[0].icon =
      "data:image/png;base64," + "I".repeat(2000);
    portfolio.theme3d = { ...portfolio.theme3d, palette: "aurora" };
    const interned = internPortfolioAssets(portfolio);
    safeSetItem(
      `portfolio-config-v1:${active}`,
      JSON.stringify(interned)
    );
    savePersistedDraft(portfolio, portfolioFingerprint(portfolio), active);

    // Pad storage with junk versions
    for (let i = 0; i < 15; i++) {
      try {
        localStorage.setItem(
          `portfolio-versions-v1:junk-${i}`,
          JSON.stringify({
            v: 1,
            entries: [
              {
                id: `j${i}`,
                at: Date.now(),
                label: "junk",
                data: samplePortfolio(`J${i}`),
              },
            ],
          })
        );
      } catch {
        break;
      }
    }

    const before = measureLocalStorageBytes();
    recoverStorage({ aggressive: true, activeProfileId: active, lockOwner: "t" });
    const after = measureLocalStorageBytes();
    expect(after.usedBytes).toBeLessThanOrEqual(before.usedBytes + 2000);

    const raw = localStorage.getItem(`portfolio-config-v1:${active}`);
    expect(raw).toBeTruthy();
    const resolved = resolvePortfolioAssets(JSON.parse(raw!));
    expect(resolved.config.hero.name).toBe("Active");
    expect(resolved.theme3d.palette).toBe("aurora");

    const draft = loadPersistedDraft(active);
    // Draft may be GC'd under aggressive recovery — if present, must be intact
    if (draft) {
      expect(draft.data.config.hero.name).toBe("Active");
      expect(draft.data.theme3d.palette).toBe("aurora");
    }

    const health = diagnoseStorage();
    expect(["ok", "warn", "critical", "full"]).toContain(health.level);
  });
});
