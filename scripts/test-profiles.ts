/**
 * Smoke tests for shared asset internment (Node localStorage mock).
 * Run: npx tsx scripts/test-profiles.ts
 */
import assert from "node:assert/strict";
import type { TPortfolioData } from "../src/types/portfolio";
import { defaultTheme3d } from "../src/constants/theme3d";

const mem = new Map<string, string>();
// @ts-expect-error mock
globalThis.localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => {
    mem.set(k, String(v));
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
};

const {
  internAsset,
  resolveAsset,
  internPortfolioAssets,
  resolvePortfolioAssets,
  isAssetRef,
  assetStoreStats,
} = await import("../src/utils/profiles/assets");

function sample(icon: string): TPortfolioData {
  return {
    config: {
      html: { title: "T", fullName: "T", email: "t@e.com" },
      hero: { name: "T", p: ["a", "b"] },
      contact: {
        p: "c",
        h2: "C",
        form: {
          name: { span: "n", placeholder: "n" },
          email: { span: "e", placeholder: "e" },
          message: { span: "m", placeholder: "m" },
        },
      },
      sections: {
        about: { p: "a", h2: "A", content: "x" },
        experience: { p: "e", h2: "E" },
        feedbacks: { p: "f", h2: "F" },
        works: { p: "w", h2: "W", content: "w" },
      },
    },
    navLinks: [{ id: "about", title: "About" }],
    services: [],
    technologies: [
      { name: "React", icon },
      { name: "Vue", icon },
    ],
    experiences: [],
    testimonials: [],
    projects: [],
    meta: {},
    theme3d: { ...defaultTheme3d },
  };
}

function testAssetDedupeAcrossProfiles() {
  mem.clear();
  const big = "data:image/png;base64," + "X".repeat(800);
  const r1 = internAsset(big);
  const r2 = internAsset(big);
  assert.ok(isAssetRef(r1));
  assert.equal(r1, r2);
  assert.equal(resolveAsset(r1), big);

  const profileA = internPortfolioAssets(sample(big));
  const profileB = internPortfolioAssets(sample(big));
  assert.equal(profileA.technologies[0].icon, profileB.technologies[0].icon);
  assert.equal(profileA.technologies[0].icon, profileA.technologies[1].icon);
  const stats = assetStoreStats();
  assert.equal(stats.count, 1, "same upload must not duplicate blobs");
  assert.equal(resolvePortfolioAssets(profileA).technologies[0].icon, big);
}

function testSmallIconsStayInline() {
  mem.clear();
  const small = "data:image/svg+xml,x";
  assert.equal(internAsset(small), small);
  assert.equal(assetStoreStats().count, 0);
}

testAssetDedupeAcrossProfiles();
testSmallIconsStayInline();
console.log("profile asset tests: ok");
