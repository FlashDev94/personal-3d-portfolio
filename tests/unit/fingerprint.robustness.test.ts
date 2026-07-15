import { describe, expect, it } from "vitest";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

describe("fingerprint robustness", () => {
  it("is order-stable for equivalent JSON clones", () => {
    const a = samplePortfolio("Same");
    const b = JSON.parse(JSON.stringify(a));
    expect(portfolioFingerprint(a)).toBe(portfolioFingerprint(b));
  });

  it("changes when only meta.github changes", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.meta.github = "https://github.com/other";
    expect(portfolioFingerprint(a)).not.toBe(portfolioFingerprint(b));
  });

  it("changes when nav link title changes", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.navLinks[0].title = "About Me";
    expect(portfolioFingerprint(a)).not.toBe(portfolioFingerprint(b));
  });

  it("changes when project tag list changes", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.projects[0].tags = [
      ...b.projects[0].tags,
      { name: "aws", color: "orange-text-gradient" },
    ];
    expect(portfolioFingerprint(a)).not.toBe(portfolioFingerprint(b));
  });

  it("identical icon bytes → identical fingerprint", () => {
    const icon = "data:image/png;base64," + "Q".repeat(4000);
    const a = samplePortfolio();
    a.technologies[0].icon = icon;
    const b = clonePortfolio(a);
    expect(portfolioFingerprint(a)).toBe(portfolioFingerprint(b));
  });

  it("different icon payload of same length still differs", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    a.technologies[0].icon = "data:image/png;base64," + "A".repeat(300);
    b.technologies[0].icon = "data:image/png;base64," + "B".repeat(300);
    expect(portfolioFingerprint(a)).not.toBe(portfolioFingerprint(b));
  });
});
