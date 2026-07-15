import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  internAsset,
  resolveAsset,
  internPortfolioAssets,
  resolvePortfolioAssets,
  isAssetRef,
} from "../../src/utils/profiles/assets";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { samplePortfolio } from "../fixtures/portfolio";

describe("shared asset store", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
  });

  afterEach(() => {
    restore();
  });

  it("interns large data-URLs and resolves them back", () => {
    const big = "data:image/png;base64," + "X".repeat(800);
    const ref = internAsset(big);
    expect(isAssetRef(ref)).toBe(true);
    expect(resolveAsset(ref)).toBe(big);
  });

  it("dedupes identical blobs", () => {
    const big = "data:image/png;base64," + "Y".repeat(800);
    const a = internAsset(big);
    const b = internAsset(big);
    expect(a).toBe(b);
  });

  it("interns and resolves portfolio icons without dropping other fields", () => {
    const p = samplePortfolio("Assets");
    p.technologies[0].icon = "data:image/png;base64," + "Z".repeat(900);
    p.theme3d.palette = "neon";
    const interned = internPortfolioAssets(p);
    expect(isAssetRef(interned.technologies[0].icon)).toBe(true);
    expect(interned.theme3d.palette).toBe("neon");
    const resolved = resolvePortfolioAssets(interned);
    expect(resolved.technologies[0].icon.startsWith("data:image/")).toBe(true);
    expect(resolved.theme3d.palette).toBe("neon");
  });
});
