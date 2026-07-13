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
