import { describe, expect, it } from "vitest";
import {
  clonePortfolio,
  normalizePortfolio,
  parsePortfolioJson,
} from "../../src/utils/history/clone";
import { samplePortfolio } from "../fixtures/portfolio";

describe("clone / normalize / parsePortfolioJson", () => {
  it("clonePortfolio deep-copies nested arrays", () => {
    const a = samplePortfolio("A");
    const b = clonePortfolio(a);
    b.experiences[0].points[0] = "mutated";
    expect(a.experiences[0].points[0]).not.toBe("mutated");
  });

  it("normalizePortfolio accepts valid shapes", () => {
    const raw = samplePortfolio("N");
    const n = normalizePortfolio(raw);
    expect(n?.config.hero.name).toBe("N");
    expect(n?.theme3d).toBeTruthy();
  });

  it("normalizePortfolio rejects garbage", () => {
    expect(normalizePortfolio(null)).toBeNull();
    expect(normalizePortfolio("nope")).toBeNull();
    expect(normalizePortfolio({ foo: 1 })).toBeNull();
    expect(normalizePortfolio({ config: {} })).toBeNull();
  });

  it("parsePortfolioJson handles corrupt JSON", () => {
    expect(parsePortfolioJson(null)).toBeNull();
    expect(parsePortfolioJson("{broken")).toBeNull();
    expect(parsePortfolioJson(JSON.stringify(samplePortfolio("P")))?.config.hero
      .name).toBe("P");
  });
});
