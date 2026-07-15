import { describe, expect, it } from "vitest";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

describe("portfolioFingerprint", () => {
  it("is stable for identical snapshots", () => {
    expect(portfolioFingerprint(samplePortfolio())).toBe(
      portfolioFingerprint(samplePortfolio())
    );
  });

  it("detects hero name edits", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.config.hero.name = "Changed";
    expect(portfolioFingerprint(a)).not.toBe(portfolioFingerprint(b));
  });

  it("detects icon uploads", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.technologies[0].icon = "data:image/png;base64," + "X".repeat(500);
    expect(portfolioFingerprint(a)).not.toBe(portfolioFingerprint(b));
  });

  it("detects theme3d changes", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.theme3d.palette = "neon";
    expect(portfolioFingerprint(a)).not.toBe(portfolioFingerprint(b));
  });

  it("detects same-length experience point rewrites", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    const point = a.experiences[0].points[0];
    b.experiences[0].points[0] = "x".repeat(point.length);
    expect(point.length).toBe(b.experiences[0].points[0].length);
    expect(portfolioFingerprint(a)).not.toBe(portfolioFingerprint(b));
  });
});
