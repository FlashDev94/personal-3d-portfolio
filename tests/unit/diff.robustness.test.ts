import { describe, expect, it } from "vitest";
import {
  applyAllDiffs,
  applySelectedDiffs,
  diffPortfolios,
  groupDiffEntries,
  previewValue,
} from "../../src/utils/history/diff";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

/**
 * Robustness: selective restore must never clobber unselected fields,
 * must tolerate list reshape (add/remove), and must leave base immutable.
 */
describe("diff/apply robustness", () => {
  it("applyAllDiffs fully patches base toward peer", () => {
    const base = samplePortfolio("Base");
    const peer = clonePortfolio(base);
    peer.config.hero.name = "Peer";
    peer.config.html.email = "peer@ex.com";
    peer.theme3d = {
      ...peer.theme3d,
      palette: "neon",
      heroScene: "abstract_core",
      quality: "low",
    };
    peer.technologies[0].icon = "data:image/png;base64,PEERICON";
    peer.experiences[0].points = ["New bullet A", "New bullet B"];

    const { data, appliedIds, skipped } = applyAllDiffs(base, base, peer);
    expect(skipped.length).toBe(0);
    expect(appliedIds.length).toBeGreaterThan(3);
    expect(data.config.hero.name).toBe("Peer");
    expect(data.config.html.email).toBe("peer@ex.com");
    expect(data.theme3d.palette).toBe("neon");
    expect(data.theme3d.heroScene).toBe("abstract_core");
    expect(data.technologies[0].icon).toBe("data:image/png;base64,PEERICON");
    expect(data.experiences[0].points).toEqual(["New bullet A", "New bullet B"]);
    // base untouched
    expect(base.config.hero.name).toBe("Base");
  });

  it("selective merge: hero only — preserves email, theme, icons", () => {
    const mine = samplePortfolio("Mine");
    mine.config.html.email = "mine@ex.com";
    mine.theme3d.palette = "warm";
    mine.technologies[0].icon = "data:image/png;base64,MINE";

    const peer = clonePortfolio(mine);
    peer.config.hero.name = "PeerHero";
    peer.config.html.email = "peer@ex.com";
    peer.theme3d.palette = "neon";
    peer.technologies[0].icon = "data:image/png;base64,PEER";

    const diffs = diffPortfolios(mine, peer);
    const heroOnly = new Set(
      diffs.filter((d) => d.id === "config.hero.name").map((d) => d.id)
    );
    expect(heroOnly.size).toBe(1);

    const { data } = applySelectedDiffs(mine, diffs, heroOnly);
    expect(data.config.hero.name).toBe("PeerHero");
    expect(data.config.html.email).toBe("mine@ex.com");
    expect(data.theme3d.palette).toBe("warm");
    expect(data.technologies[0].icon).toBe("data:image/png;base64,MINE");
  });

  it("selective merge: theme only — leaves content text alone", () => {
    const mine = samplePortfolio("Mine");
    const peer = clonePortfolio(mine);
    peer.config.hero.name = "ShouldStayMine";
    peer.theme3d = {
      ...peer.theme3d,
      palette: "aurora",
      heroScene: "neon_grid",
      showStars: false,
      quality: "high",
    };

    const diffs = diffPortfolios(mine, peer);
    const themeIds = new Set(
      diffs.filter((d) => d.id.startsWith("theme3d.")).map((d) => d.id)
    );
    expect(themeIds.size).toBeGreaterThanOrEqual(2);

    const { data } = applySelectedDiffs(mine, diffs, themeIds);
    expect(data.config.hero.name).toBe("Mine");
    expect(data.theme3d.palette).toBe("aurora");
    expect(data.theme3d.heroScene).toBe("neon_grid");
    expect(data.theme3d.showStars).toBe(false);
  });

  it("selective merge: icon only — preserves name and 3D", () => {
    const mine = samplePortfolio("Mine");
    mine.theme3d.heroScene = "desktop_pc";
    const peer = clonePortfolio(mine);
    peer.config.hero.name = "Peer";
    peer.theme3d.heroScene = "abstract_core";
    peer.technologies[0].icon = "data:image/png;base64," + "Z".repeat(2000);

    const diffs = diffPortfolios(mine, peer);
    const iconIds = new Set(
      diffs
        .filter((d) => d.kind === "icon" || d.id.endsWith(":icon"))
        .map((d) => d.id)
    );
    expect(iconIds.size).toBeGreaterThanOrEqual(1);

    const { data } = applySelectedDiffs(mine, diffs, iconIds);
    expect(data.config.hero.name).toBe("Mine");
    expect(data.theme3d.heroScene).toBe("desktop_pc");
    expect(data.technologies[0].icon.length).toBeGreaterThan(1000);
  });

  it("empty selection is a no-op", () => {
    const mine = samplePortfolio("Mine");
    const peer = clonePortfolio(mine);
    peer.config.hero.name = "Peer";
    const diffs = diffPortfolios(mine, peer);
    const { data, appliedIds } = applySelectedDiffs(mine, diffs, new Set());
    expect(appliedIds).toEqual([]);
    expect(data.config.hero.name).toBe("Mine");
  });

  it("groups diffs into labeled sections", () => {
    const a = samplePortfolio("A");
    const b = clonePortfolio(a);
    b.config.hero.name = "B";
    b.theme3d.palette = "neon";
    b.technologies[0].icon = "data:image/png;base64,x";
    const groups = groupDiffEntries(diffPortfolios(a, b));
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const labels = groups.map((g) => g.label || g.group);
    expect(labels.join(" ")).toMatch(/profile|theme|tech|hero|content/i);
  });

  it("previewValue truncates long text and sizes icons", () => {
    expect(previewValue("short")).toBe("short");
    expect(previewValue("x".repeat(500)).length).toBeLessThan(500);
    expect(previewValue("data:image/png;base64," + "A".repeat(5000), "icon")).toMatch(
      /KB|MB|image/i
    );
  });

  it("list add/remove apply in stable order without throwing", () => {
    const a = samplePortfolio("A");
    const b = clonePortfolio(a);
    b.technologies = [
      { name: "Go", icon: "data:image/png;base64,go" },
      { name: "Rust", icon: "data:image/png;base64,rs" },
    ];
    b.projects = [
      ...a.projects,
      {
        name: "New Project",
        description: "Extra",
        tags: [{ name: "go", color: "green-text-gradient" }],
        image: "data:image/svg+xml,np",
        sourceCodeLink: "https://github.com/x",
      },
    ];
    const diffs = diffPortfolios(a, b);
    const { data, skipped } = applySelectedDiffs(
      a,
      diffs,
      diffs.map((d) => d.id)
    );
    expect(skipped.length).toBe(0);
    expect(data.technologies.some((t) => t.name === "Go")).toBe(true);
    expect(data.projects.some((p) => p.name === "New Project")).toBe(true);
  });
});
