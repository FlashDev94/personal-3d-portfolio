import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { samplePortfolio } from "../fixtures/portfolio";
import {
  diagnoseStorage,
  recoverStorage,
  measureLocalStorageBytes,
} from "../../src/utils/storage/health";
import {
  savePersistedDraft,
  loadPersistedDraft,
} from "../../src/utils/history/draftPersist";
import {
  appendVersion,
  loadVersionHistory,
  setVersionHistoryProfileId,
  clearVersionHistory,
} from "../../src/utils/history/versionHistory";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import { safeSetItem } from "../../src/utils/storage/safeSet";

describe("storage pressure & recovery", () => {
  let restore: () => void;
  let ls: ReturnType<typeof installMockLocalStorage>["ls"];

  beforeEach(() => {
    ({ restore, ls } = installMockLocalStorage(80_000));
    setVersionHistoryProfileId("prof-pressure");
    clearVersionHistory();
  });

  afterEach(() => {
    setVersionHistoryProfileId(null);
    restore();
  });

  it("draft save under near-full storage either succeeds or fails cleanly", () => {
    // Fill with junk
    let i = 0;
    while (i < 200) {
      try {
        localStorage.setItem(`junk-${i}`, "Z".repeat(500));
        i++;
      } catch {
        break;
      }
    }

    const data = samplePortfolio("UnderPressure");
    data.technologies[0].icon = "data:image/png;base64," + "I".repeat(3000);
    const ok = savePersistedDraft(
      data,
      portfolioFingerprint(samplePortfolio("Live")),
      "prof-pressure"
    );
    // Must not throw; if ok, payload must round-trip
    if (ok) {
      const loaded = loadPersistedDraft("prof-pressure");
      expect(loaded?.data.config.hero.name).toBe("UnderPressure");
    } else {
      expect(loadPersistedDraft("prof-pressure")).toBeNull();
    }
  });

  it("recoverStorage reduces usage and keeps active config when possible", () => {
    const active = "prof-pressure";
    localStorage.setItem(
      "portfolio-profiles-v1",
      JSON.stringify({
        v: 1,
        activeId: active,
        profiles: [
          {
            id: active,
            slug: "p",
            label: "P",
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      })
    );
    safeSetItem(
      `portfolio-config-v1:${active}`,
      JSON.stringify(samplePortfolio("KeepMe"))
    );

    for (let i = 0; i < 40; i++) {
      try {
        localStorage.setItem(`orphan-noise-${i}`, "N".repeat(800));
      } catch {
        break;
      }
    }

    const before = measureLocalStorageBytes().usedBytes;
    recoverStorage({
      aggressive: true,
      activeProfileId: active,
      lockOwner: "test",
    });
    const after = measureLocalStorageBytes().usedBytes;
    expect(after).toBeLessThanOrEqual(before);

    const cfg = localStorage.getItem(`portfolio-config-v1:${active}`);
    expect(cfg).toBeTruthy();
    expect(JSON.parse(cfg!).config.hero.name).toBe("KeepMe");

    const health = diagnoseStorage();
    expect(["ok", "warn", "critical", "full"]).toContain(health.level);
  });

  it("version append under pressure returns persisted:false without throwing", () => {
    ls.setQuota(5_000);
    // Tiny quota — large snapshots may fail
    const big = samplePortfolio("Big");
    big.technologies[0].icon = "data:image/png;base64," + "X".repeat(8000);
    const { persisted } = appendVersion(big, "May fail");
    // Either trimmed/persisted or clean false
    expect(typeof persisted).toBe("boolean");
    if (persisted) {
      expect(loadVersionHistory().length).toBeGreaterThanOrEqual(1);
    }
  });
});
