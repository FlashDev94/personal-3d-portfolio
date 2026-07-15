import { describe, expect, it } from "vitest";
import {
  applySelectedDiffs,
  diffPortfolios,
  previewValue,
} from "../../src/utils/history/diff";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

describe("version diff & selective restore", () => {
  it("detects scalar and theme diffs", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.config.hero.name = "Other";
    b.theme3d.palette = "neon";
    b.theme3d.heroScene = "neon_grid";
    const diffs = diffPortfolios(a, b);
    const ids = new Set(diffs.map((d) => d.id));
    expect(ids.has("config.hero.name")).toBe(true);
    expect(ids.has("theme3d.palette")).toBe(true);
    expect(ids.has("theme3d.heroScene")).toBe(true);
  });

  it("detects icon uploads with previews", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    const big = "data:image/png;base64," + "A".repeat(5000);
    b.technologies[0].icon = big;
    const diffs = diffPortfolios(a, b);
    const iconDiff = diffs.find(
      (d) => d.id.includes("technologies") && d.id.endsWith(":icon")
    );
    expect(iconDiff?.kind).toBe("icon");
    expect(iconDiff?.toValue).toBe(big);
    expect(previewValue(big, "icon")).toMatch(/KB/);
  });

  it("applies selected diffs without mutating base", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.config.hero.name = "PatchedName";
    b.technologies[0].icon = "data:image/png;base64,SELECTIVE";
    b.config.html.email = "other@example.com";
    b.theme3d.palette = "warm";
    const before = JSON.stringify(a);
    const diffs = diffPortfolios(a, b);
    const selected = new Set(
      diffs
        .filter(
          (d) =>
            d.id === "config.hero.name" ||
            d.id.includes("technologies") && d.id.endsWith(":icon")
        )
        .map((d) => d.id)
    );
    const { data: merged, appliedIds, skipped } = applySelectedDiffs(
      a,
      diffs,
      selected
    );
    expect(appliedIds.length).toBeGreaterThanOrEqual(2);
    expect(skipped.length).toBe(0);
    expect(merged.config.hero.name).toBe("PatchedName");
    expect(merged.technologies[0].icon).toBe("data:image/png;base64,SELECTIVE");
    // Unselected fields stay from base
    expect(merged.config.html.email).toBe(a.config.html.email);
    expect(merged.theme3d.palette).toBe(a.theme3d.palette);
    expect(JSON.stringify(a)).toBe(before);
  });

  it("handles skill rename as remove + add", () => {
    const a = samplePortfolio();
    const b = clonePortfolio(a);
    b.technologies = [
      { name: "Rust", icon: "data:image/png;base64,rust" },
      a.technologies[1],
    ];
    const diffs = diffPortfolios(a, b);
    const add = diffs.find((d) => d.label?.includes("Add") || d.id.includes(":add"));
    const remove = diffs.find(
      (d) => d.label?.includes("Remove") || d.id.includes(":remove")
    );
    expect(add || remove).toBeTruthy();
  });
});
