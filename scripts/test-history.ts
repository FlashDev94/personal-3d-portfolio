/**
 * Smoke tests for portfolio history helpers (Node, no Vite asset graph).
 * Run: npx tsx scripts/test-history.ts
 */
import assert from "node:assert/strict";
import type { TPortfolioData } from "../src/types/portfolio";
import { portfolioFingerprint } from "../src/utils/history/fingerprint";
import { defaultTheme3d } from "../src/constants/theme3d";

function clonePortfolio(data: TPortfolioData): TPortfolioData {
  return JSON.parse(JSON.stringify(data)) as TPortfolioData;
}

function sample(): TPortfolioData {
  return {
    config: {
      html: {
        title: "Test — 3D Portfolio",
        fullName: "Test User",
        email: "t@example.com",
      },
      hero: { name: "Test", p: ["line one", "line two"] },
      contact: {
        p: "Get in touch",
        h2: "Contact.",
        form: {
          name: { span: "Name", placeholder: "Name" },
          email: { span: "Email", placeholder: "Email" },
          message: { span: "Message", placeholder: "Message" },
        },
      },
      sections: {
        about: { p: "Intro", h2: "Overview.", content: "About me." },
        experience: { p: "Work", h2: "Experience." },
        feedbacks: { p: "Quotes", h2: "Testimonials." },
        works: { p: "Work", h2: "Projects.", content: "Projects intro." },
      },
    },
    navLinks: [{ id: "about", title: "About" }],
    services: [{ title: "Engineer", icon: "data:image/svg+xml,x" }],
    technologies: [
      { name: "TypeScript", icon: "data:image/png;base64,aaa" },
      { name: "React", icon: "data:image/png;base64,bbb" },
    ],
    experiences: [
      {
        title: "Engineer",
        companyName: "Acme",
        icon: "data:image/svg+xml,c",
        iconBg: "#000",
        date: "2020 – Present",
        points: ["Shipped things."],
      },
    ],
    testimonials: [],
    projects: [
      {
        name: "Demo",
        description: "A demo project",
        tags: [{ name: "react", color: "blue-text-gradient" }],
        image: "data:image/svg+xml,p",
        sourceCodeLink: "https://github.com/",
      },
    ],
    meta: { github: "https://github.com/test" },
    theme3d: { ...defaultTheme3d },
  };
}

function testFingerprintStable() {
  assert.equal(portfolioFingerprint(sample()), portfolioFingerprint(sample()));
}

function testFingerprintDetectsEdit() {
  const a = sample();
  const b = sample();
  b.config.hero.name = "Changed";
  assert.notEqual(portfolioFingerprint(a), portfolioFingerprint(b));
}

function testFingerprintDetectsAboutEyebrow() {
  const a = sample();
  const b = sample();
  b.config.sections.about.p = "Introduction";
  assert.notEqual(portfolioFingerprint(a), portfolioFingerprint(b));
}

function testFingerprintDetectsAboutHeading() {
  const a = sample();
  const b = sample();
  b.config.sections.about.h2 = "About me.";
  assert.notEqual(portfolioFingerprint(a), portfolioFingerprint(b));
}

function testFingerprintDetectsSameLengthPointRewrite() {
  const a = sample();
  const b = sample();
  // same length as "Shipped things."
  b.experiences[0].points = ["Shipped widget!"];
  assert.equal(a.experiences[0].points[0].length, b.experiences[0].points[0].length);
  assert.notEqual(portfolioFingerprint(a), portfolioFingerprint(b));
}

function testFingerprintDetectsIconUpload() {
  const a = sample();
  const b = sample();
  b.technologies[0].icon = "data:image/png;base64," + "x".repeat(200);
  assert.notEqual(portfolioFingerprint(a), portfolioFingerprint(b));
}

function testFingerprintDetectsTheme() {
  const a = sample();
  const b = sample();
  b.theme3d.palette = "neon";
  assert.notEqual(portfolioFingerprint(a), portfolioFingerprint(b));
}

function testCloneIsolation() {
  const a = clonePortfolio(sample());
  const b = clonePortfolio(a);
  b.config.hero.name = "Other";
  b.technologies[0].icon = "data:image/png;base64,zzz";
  assert.notEqual(a.config.hero.name, b.config.hero.name);
  assert.notEqual(a.technologies[0].icon, b.technologies[0].icon);
}

testFingerprintStable();
testFingerprintDetectsEdit();
testFingerprintDetectsAboutEyebrow();
testFingerprintDetectsAboutHeading();
testFingerprintDetectsSameLengthPointRewrite();
testFingerprintDetectsIconUpload();
testFingerprintDetectsTheme();
testCloneIsolation();
console.log("history smoke tests: ok");

// ── Version compare / selective restore ──────────────────────────────────────
import {
  applySelectedDiffs,
  diffPortfolios,
  previewValue,
} from "../src/utils/history/diff";

function testDiffDetectsScalarAndTheme() {
  const a = sample();
  const b = sample();
  b.config.hero.name = "Other";
  b.theme3d.palette = "neon";
  b.theme3d.heroScene = "neon_grid";
  const diffs = diffPortfolios(a, b);
  const ids = new Set(diffs.map((d) => d.id));
  assert.ok(ids.has("config.hero.name"));
  assert.ok(ids.has("theme3d.palette"));
  assert.ok(ids.has("theme3d.heroScene"));
  assert.equal(diffs.find((d) => d.id === "config.hero.name")?.toValue, "Other");
}

function testDiffDetectsIconUpload() {
  const a = sample();
  const b = sample();
  const big = "data:image/png;base64," + "A".repeat(5000);
  b.technologies[0].icon = big;
  const diffs = diffPortfolios(a, b);
  const iconDiff = diffs.find((d) => d.id.includes("technologies") && d.id.endsWith(":icon"));
  assert.ok(iconDiff, "expected icon diff");
  assert.equal(iconDiff!.kind, "icon");
  assert.equal(iconDiff!.toValue, big);
  assert.ok(previewValue(big, "icon").includes("KB"));
}

function testSelectiveRestorePreservesUnselected() {
  const a = sample();
  const b = sample();
  b.config.hero.name = "PatchedName";
  b.config.html.email = "new@example.com";
  b.theme3d.palette = "aurora";
  b.technologies[0].icon = "data:image/png;base64,SELECTIVE";

  const diffs = diffPortfolios(a, b);
  const onlyNameAndIcon = diffs
    .filter(
      (d) =>
        d.id === "config.hero.name" ||
        (d.id.includes("technologies") && d.id.endsWith(":icon"))
    )
    .map((d) => d.id);

  const merged = applySelectedDiffs(a, diffs, onlyNameAndIcon);
  assert.equal(merged.config.hero.name, "PatchedName");
  assert.equal(merged.technologies[0].icon, "data:image/png;base64,SELECTIVE");
  // Unselected must stay at base
  assert.equal(merged.config.html.email, a.config.html.email);
  assert.equal(merged.theme3d.palette, a.theme3d.palette);
}

function testSelectiveRestoreDoesNotMutateInputs() {
  const a = sample();
  const b = sample();
  b.config.hero.name = "X";
  const diffs = diffPortfolios(a, b);
  const before = JSON.stringify(a);
  applySelectedDiffs(a, diffs, diffs.map((d) => d.id));
  assert.equal(JSON.stringify(a), before);
}

function testListAddRemove() {
  const a = sample();
  const b = sample();
  b.technologies = [
    ...b.technologies,
    { name: "Rust", icon: "data:image/svg+xml,rust" },
  ];
  b.technologies = b.technologies.filter((t) => t.name !== "React");
  const diffs = diffPortfolios(a, b);
  const add = diffs.find((d) => d.id.includes(":add:") && d.id.includes("Rust"));
  const remove = diffs.find((d) => d.id.includes(":remove:") && d.id.includes("React"));
  assert.ok(add, "expected add Rust");
  assert.ok(remove, "expected remove React");

  const onlyAdd = applySelectedDiffs(a, diffs, [add!.id]);
  assert.ok(onlyAdd.technologies.some((t) => t.name === "Rust"));
  assert.ok(onlyAdd.technologies.some((t) => t.name === "React"));

  const onlyRemove = applySelectedDiffs(a, diffs, [remove!.id]);
  assert.ok(!onlyRemove.technologies.some((t) => t.name === "React"));
  assert.ok(!onlyRemove.technologies.some((t) => t.name === "Rust"));
}

function testExperiencePointsAndIcon() {
  const a = sample();
  const b = sample();
  b.experiences[0].points = ["New bullet", "Second"];
  b.experiences[0].icon = "data:image/png;base64,companyicon";
  const diffs = diffPortfolios(a, b);
  const points = diffs.find((d) => d.id.endsWith(":points"));
  const icon = diffs.find((d) => d.id.includes("experiences") && d.id.endsWith(":icon"));
  assert.ok(points);
  assert.ok(icon);
  const merged = applySelectedDiffs(a, diffs, [points!.id, icon!.id]);
  assert.deepEqual(merged.experiences[0].points, ["New bullet", "Second"]);
  assert.equal(merged.experiences[0].icon, "data:image/png;base64,companyicon");
}

function testIdenticalSnapshotsEmptyDiff() {
  assert.equal(diffPortfolios(sample(), sample()).length, 0);
}

function testRepeatedSelectiveRestoreStable() {
  let cur = sample();
  const target = sample();
  target.config.hero.name = "Final";
  target.theme3d.quality = "high";
  target.theme3d.colorMode = "light";
  for (let i = 0; i < 25; i++) {
    const diffs = diffPortfolios(cur, target);
    if (diffs.length === 0) break;
    // Apply half the remaining diffs each iteration
    const pick = diffs.filter((_, idx) => idx % 2 === 0).map((d) => d.id);
    cur = applySelectedDiffs(cur, diffs, pick.length ? pick : [diffs[0].id]);
  }
  // Final full apply
  const remaining = diffPortfolios(cur, target);
  cur = applySelectedDiffs(cur, remaining, remaining.map((d) => d.id));
  assert.equal(cur.config.hero.name, "Final");
  assert.equal(cur.theme3d.quality, "high");
  assert.equal(cur.theme3d.colorMode, "light");
  assert.equal(diffPortfolios(cur, target).length, 0);
}

testDiffDetectsScalarAndTheme();
testDiffDetectsIconUpload();
testSelectiveRestorePreservesUnselected();
testSelectiveRestoreDoesNotMutateInputs();
testListAddRemove();
testExperiencePointsAndIcon();
testIdenticalSnapshotsEmptyDiff();
testRepeatedSelectiveRestoreStable();
console.log("version diff / selective restore tests: ok");
