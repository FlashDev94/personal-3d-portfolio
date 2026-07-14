/**
 * Storage health / recovery smoke tests (Node localStorage mock).
 * Run: npx tsx scripts/test-storage-health.ts
 */
import assert from "node:assert/strict";
import type { TPortfolioData } from "../src/types/portfolio";
import { defaultTheme3d } from "../src/constants/theme3d";

const mem = new Map<string, string>();
// Soft quota for simulated pressure
const quotaChars = 180_000;
// @ts-expect-error mock
globalThis.localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => {
    const next = new Map(mem);
    next.set(k, String(v));
    let total = 0;
    for (const [kk, vv] of next) total += kk.length + vv.length;
    if (total > quotaChars) {
      const err = new Error("QuotaExceededError");
      (err as { name: string }).name = "QuotaExceededError";
      throw err;
    }
    mem.set(k, String(v));
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
  get length() {
    return mem.size;
  },
  key: (i: number) => [...mem.keys()][i] ?? null,
  clear: () => mem.clear(),
};

function sample(icon = "data:image/png;base64,AAA"): TPortfolioData {
  return {
    config: {
      html: {
        title: "Test",
        fullName: "Test User",
        email: "t@example.com",
        lang: "en",
      },
      hero: { name: "Test", p: ["line1", "line2"] },
      sections: {
        about: { p: "about", h2: "About." },
        experience: { p: "", h2: "" },
        works: { p: "", h2: "" },
        contact: {
          p: "",
          form: {
            name: { span: "", placeholder: "" },
            email: { span: "", placeholder: "" },
            message: { span: "", placeholder: "" },
          },
        },
        tech: { h2: "" },
        feedbacks: { h2: "" },
      },
      contact: {
        p: "",
        form: {
          name: { span: "", placeholder: "" },
          email: { span: "", placeholder: "" },
          message: { span: "", placeholder: "" },
        },
      },
      socialLinks: [],
      navLinks: [],
    },
    services: [{ title: "S", icon }],
    technologies: [{ name: "T", icon }],
    experiences: [
      {
        title: "Dev",
        company_name: "Co",
        icon,
        iconBg: "#000",
        date: "2020",
        points: [],
      },
    ],
    testimonials: [],
    projects: [
      {
        name: "P",
        description: "d",
        tags: [],
        image: icon,
        source_code_link: "",
      },
    ],
    meta: {},
    theme3d: { ...defaultTheme3d },
  } as unknown as TPortfolioData;
}

const {
  diagnoseStorage,
  recoverStorage,
  gcOrphanAssets,
  bootStorageMaintenance,
  measureLocalStorageBytes,
  dropOrphanProfileKeys,
  safeSetItem,
} = await import("../src/utils/storage");
// Re-import health pieces that aren't on index for orphans test
const health = await import("../src/utils/storage/health");
const { internAsset, assetStoreStats, internPortfolioAssets } = await import(
  "../src/utils/profiles/assets"
);

// --- Asset orphan GC ---
const big = "data:image/png;base64," + "A".repeat(12_000);
const ref = internAsset(big);
assert.ok(ref.startsWith("asset:h1:"), "interned");
assert.ok(assetStoreStats().count >= 1, "blob stored");
// No portfolio references this blob → orphan
const freed = gcOrphanAssets();
assert.ok(freed > 0, "orphan assets freed");
assert.equal(assetStoreStats().count, 0, "store empty after GC");

// --- Registry + orphan profile keys ---
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
const interned = internPortfolioAssets(sample(big));
localStorage.setItem(
  `portfolio-config-v1:${profileId}`,
  JSON.stringify(interned)
);
localStorage.setItem(
  `portfolio-config-v1:${orphanId}`,
  JSON.stringify(sample("data:image/png;base64," + "B".repeat(8_000)))
);
localStorage.setItem(
  `portfolio-draft-v1:${orphanId}`,
  JSON.stringify({ v: 1, updatedAt: 1, baseFingerprint: "x", data: sample() })
);

const dropped = dropOrphanProfileKeys();
assert.ok(dropped.dropped.length >= 2, "orphan keys removed");
assert.equal(
  localStorage.getItem(`portfolio-config-v1:${orphanId}`),
  null,
  "orphan config gone"
);
assert.ok(
  localStorage.getItem(`portfolio-config-v1:${profileId}`),
  "active config kept"
);

// --- Quota pressure + safeSet recovery ---
// Fill near quota
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
          data: sample("data:image/png;base64," + "C".repeat(2_000)),
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
assert.ok(result.actions.length >= 1, "recovery actions");
const after = measureLocalStorageBytes();
assert.ok(after.usedBytes <= before.usedBytes + 1000, "usage not ballooned");

// safeSetItem with recovery callback
const ok = safeSetItem(
  `portfolio-config-v1:${profileId}`,
  JSON.stringify(internPortfolioAssets(sample(big))),
  {
    onQuota: () => {
      recoverStorage({ aggressive: true, activeProfileId: profileId });
    },
  }
);
assert.equal(ok, true, "safeSet after recovery");

const healthReport = diagnoseStorage();
assert.ok(["ok", "warn", "critical", "full"].includes(healthReport.level));

const boot = bootStorageMaintenance(profileId);
assert.ok(boot);

// Lock mutual exclusion smoke
assert.equal(health.tryAcquireStorageLock("a"), true);
assert.equal(health.tryAcquireStorageLock("b"), false);
health.releaseStorageLock("a");
assert.equal(health.tryAcquireStorageLock("b"), true);
health.releaseStorageLock("b");

console.log("storage health tests: ok", {
  level: healthReport.level,
  actions: result.actions,
  freed: result.freedApproxBytes,
  usedKB: Math.round(after.usedBytes / 1024),
});
