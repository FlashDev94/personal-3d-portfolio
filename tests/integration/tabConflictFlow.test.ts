import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildTabConflict,
  conflictFromPeerDraft,
  shouldSurfaceConflict,
} from "../../src/utils/history/tabConflict";
import {
  loadPersistedDraft,
  savePersistedDraft,
} from "../../src/utils/history/draftPersist";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import {
  applySelectedDiffs,
  diffPortfolios,
} from "../../src/utils/history/diff";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

/**
 * End-to-end of the recovery decision matrix without mounting React:
 * dirty local + peer draft → conflict → selective merge → keep theme/icons.
 */
describe("tab conflict recovery flow (integration)", () => {
  let restore: () => void;
  const profileId = "prof-conflict";

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
  });

  afterEach(() => {
    restore();
  });

  it("UAT: dirty draft + peer overwrite → compare → selective adopt", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);

    const mine = clonePortfolio(live);
    mine.config.hero.name = "MyDraft";
    mine.config.html.email = "mine@example.com";
    mine.theme3d = { ...mine.theme3d, palette: "cool" };
    const mineFp = portfolioFingerprint(mine);

    const peer = clonePortfolio(live);
    peer.config.hero.name = "PeerDraft";
    peer.technologies[0].icon = "data:image/png;base64," + "P".repeat(800);
    peer.theme3d = {
      ...peer.theme3d,
      palette: "neon",
      heroScene: "abstract_core",
    };

    savePersistedDraft(peer, liveFp, profileId);
    const peerLoaded = loadPersistedDraft(profileId);
    expect(peerLoaded).not.toBeNull();

    const conflict = conflictFromPeerDraft({
      profileId,
      localDraftFp: mineFp,
      liveFp,
      isDirty: true,
      peer: peerLoaded,
      label: "Draft changed in another tab",
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.kind).toBe("draft");
    expect(conflict!.peerDraft!.theme3d.palette).toBe("neon");
    expect(conflict!.peerDraft!.theme3d.heroScene).toBe("abstract_core");

    const diffs = diffPortfolios(mine, conflict!.peerDraft!);
    const selected = new Set(
      diffs
        .filter(
          (d) =>
            d.id === "config.hero.name" ||
            d.id === "theme3d.palette" ||
            d.id === "theme3d.heroScene" ||
            (d.id.includes("technologies") && d.id.endsWith(":icon"))
        )
        .map((d) => d.id)
    );
    const { data: merged } = applySelectedDiffs(mine, diffs, selected);
    expect(merged.config.hero.name).toBe("PeerDraft");
    expect(merged.config.html.email).toBe("mine@example.com");
    expect(merged.theme3d.palette).toBe("neon");
    expect(merged.theme3d.heroScene).toBe("abstract_core");
    expect(merged.technologies[0].icon.includes("P")).toBe(true);
  });

  it("UAT: clean local never conflicts — auto-sync path", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const remote = samplePortfolio("Remote");
    expect(
      shouldSurfaceConflict({
        profileId,
        localDraftFp: liveFp,
        liveFp,
        isDirty: false,
        remoteFp: portfolioFingerprint(remote),
        kind: "applied",
      })
    ).toBe(false);
  });

  it("UAT: applied conflict when dirty + remote live", () => {
    const mine = samplePortfolio("Mine");
    const live = samplePortfolio("OldLive");
    const remote = samplePortfolio("NewLive");
    const mineFp = portfolioFingerprint(mine);
    const liveFp = portfolioFingerprint(live);
    const remoteFp = portfolioFingerprint(remote);

    const c = buildTabConflict({
      kind: "applied",
      profileId,
      localDraftFp: mineFp,
      liveFp,
      isDirty: true,
      remoteFp,
      label: "Applied from configurator",
    });
    expect(c.kind).toBe("applied");
    expect(c.fingerprint).toBe(remoteFp);
    expect(
      shouldSurfaceConflict({
        profileId,
        localDraftFp: mineFp,
        liveFp,
        isDirty: true,
        remoteFp,
        kind: "applied",
      })
    ).toBe(true);
  });
});
