import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { samplePortfolio } from "../fixtures/portfolio";
import {
  diagnoseStorage,
  recoverStorage,
  gcOrphanAssets,
  bootStorageMaintenance,
  measureLocalStorageBytes,
  dropOrphanProfileKeys,
  tryAcquireStorageLock,
  releaseStorageLock,
} from "../../src/utils/storage/health";
import { safeSetItem } from "../../src/utils/storage/safeSet";
import {
  internAsset,
  assetStoreStats,
  internPortfolioAssets,
} from "../../src/utils/profiles/assets";

describe("storage health & recovery", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage(180_000));
  });

  afterEach(() => {
    restore();
  });

  it("GCs unreferenced asset blobs", () => {
    const big = "data:image/png;base64," + "A".repeat(12_000);
    const ref = internAsset(big);
    expect(ref.startsWith("asset:h1:")).toBe(true);
    expect(assetStoreStats().count).toBeGreaterThanOrEqual(1);
    const freed = gcOrphanAssets();
    expect(freed).toBeGreaterThan(0);
    expect(assetStoreStats().count).toBe(0);
  });

  it("drops orphan profile keys but keeps active config", () => {
    const profileId = "prof-active";
    const orphanId = "prof-orphan";
    localStorage.setItem(
      "portfolio-profiles-v1",
      JSON.stringify({
        v: 1,
        activeId: profileId,
        profiles: [
          {
            id: profileId,
            slug: "active",
            label: "Active",
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      })
    );
    const big = "data:image/png;base64," + "A".repeat(4_000);
    localStorage.setItem(
      `portfolio-config-v1:${profileId}`,
      JSON.stringify(internPortfolioAssets(samplePortfolio("Active")))
    );
    localStorage.setItem(
      `portfolio-config-v1:${orphanId}`,
      JSON.stringify(samplePortfolio("Orphan"))
    );
    localStorage.setItem(
      `portfolio-draft-v1:${orphanId}`,
      JSON.stringify({
        v: 1,
        updatedAt: 1,
        baseFingerprint: "x",
        data: samplePortfolio(),
      })
    );

    const dropped = dropOrphanProfileKeys();
    expect(dropped.dropped.length).toBeGreaterThanOrEqual(2);
    expect(localStorage.getItem(`portfolio-config-v1:${orphanId}`)).toBeNull();
    expect(localStorage.getItem(`portfolio-config-v1:${profileId}`)).toBeTruthy();
  });

  it("recovers under quota pressure without ballooning usage", () => {
    const profileId = "prof-active";
    localStorage.setItem(
      "portfolio-profiles-v1",
      JSON.stringify({
        v: 1,
        activeId: profileId,
        profiles: [
          {
            id: profileId,
            slug: "active",
            label: "Active",
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      })
    );
    localStorage.setItem(
      `portfolio-config-v1:${profileId}`,
      JSON.stringify(samplePortfolio("Keep"))
    );

    for (let i = 0; i < 20; i++) {
      try {
        localStorage.setItem(
          `portfolio-versions-v1:pad-${i}`,
          JSON.stringify({
            v: 1,
            entries: Array.from({ length: 3 }, (_, j) => ({
              id: `v${i}-${j}`,
              at: Date.now(),
              label: "pad",
              data: samplePortfolio(`Pad${i}${j}`),
            })),
          })
        );
      } catch {
        break;
      }
    }

    const before = measureLocalStorageBytes();
    const result = recoverStorage({
      aggressive: true,
      activeProfileId: profileId,
      lockOwner: "test",
    });
    expect(result.actions.length).toBeGreaterThanOrEqual(1);
    const after = measureLocalStorageBytes();
    expect(after.usedBytes).toBeLessThanOrEqual(before.usedBytes + 1000);

    const ok = safeSetItem(
      `portfolio-config-v1:${profileId}`,
      JSON.stringify(internPortfolioAssets(samplePortfolio("After"))),
      {
        onQuota: () => {
          recoverStorage({ aggressive: true, activeProfileId: profileId });
        },
      }
    );
    expect(ok).toBe(true);

    const healthReport = diagnoseStorage();
    expect(["ok", "warn", "critical", "full"]).toContain(healthReport.level);
    expect(bootStorageMaintenance(profileId)).toBeTruthy();
  });

  it("enforces multi-tab recovery lock", () => {
    expect(tryAcquireStorageLock("a")).toBe(true);
    expect(tryAcquireStorageLock("b")).toBe(false);
    releaseStorageLock("a");
    expect(tryAcquireStorageLock("b")).toBe(true);
    releaseStorageLock("b");
  });
});
