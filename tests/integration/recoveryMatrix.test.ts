import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildTabConflict,
  conflictFromPeerDraft,
  preferPeerDraft,
  recoverySnapshotLabel,
  shouldSurfaceConflict,
} from "../../src/utils/history/tabConflict";
import {
  clearPersistedDraft,
  loadPersistedDraft,
  savePersistedDraft,
} from "../../src/utils/history/draftPersist";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import {
  applySelectedDiffs,
  diffPortfolios,
} from "../../src/utils/history/diff";
import {
  appendVersion,
  clearVersionHistory,
  loadVersionHistory,
  setVersionHistoryProfileId,
} from "../../src/utils/history/versionHistory";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

/**
 * Full decision matrix for cross-tab conflict recovery — the product
 * contract that UAT depends on, exercised without the browser.
 */
describe("recovery decision matrix (integration)", () => {
  let restore: () => void;
  const profileId = "prof-matrix";

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
    setVersionHistoryProfileId(profileId);
    clearVersionHistory();
    clearPersistedDraft(profileId);
  });

  afterEach(() => {
    clearVersionHistory();
    clearPersistedDraft(profileId);
    setVersionHistoryProfileId(null);
    restore();
  });

  it("clean tab: remote apply does NOT surface conflict (auto-sync path)", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const remote = samplePortfolio("RemoteLive");
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

  it("dirty tab + remote apply → applied conflict with remote fingerprint", () => {
    const mine = samplePortfolio("MyDraft");
    const oldLive = samplePortfolio("OldLive");
    const remote = samplePortfolio("PeerApplied");
    const c = buildTabConflict({
      kind: "applied",
      profileId,
      localDraftFp: portfolioFingerprint(mine),
      liveFp: portfolioFingerprint(oldLive),
      isDirty: true,
      remoteFp: portfolioFingerprint(remote),
      label: "Applied from configurator",
    });
    expect(c.kind).toBe("applied");
    expect(c.fingerprint).toBe(portfolioFingerprint(remote));
    expect(c.label).toMatch(/Applied/i);
  });

  it("identical fingerprints never surface (even if dirty flag true)", () => {
    const p = samplePortfolio("Same");
    const fp = portfolioFingerprint(p);
    expect(
      shouldSurfaceConflict({
        profileId,
        localDraftFp: fp,
        liveFp: fp,
        isDirty: true,
        remoteFp: fp,
        kind: "applied",
      })
    ).toBe(false);
  });

  it("peer draft overwrite → draft conflict retaining full peer payload + 3D", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const mine = clonePortfolio(live);
    mine.config.hero.name = "LocalOnly";
    mine.theme3d.palette = "warm";

    const peer = clonePortfolio(live);
    peer.config.hero.name = "PeerDraft";
    peer.theme3d = {
      ...peer.theme3d,
      palette: "neon",
      heroScene: "neon_grid",
      quality: "high",
    };
    peer.technologies[0].icon = "data:image/png;base64," + "P".repeat(500);

    savePersistedDraft(peer, liveFp, profileId);
    const loaded = loadPersistedDraft(profileId)!;

    const conflict = conflictFromPeerDraft({
      profileId,
      localDraftFp: portfolioFingerprint(mine),
      liveFp,
      isDirty: true,
      peer: loaded,
      label: "Another tab saved a different draft",
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.kind).toBe("draft");
    expect(conflict!.peerDraft!.config.hero.name).toBe("PeerDraft");
    expect(conflict!.peerDraft!.theme3d.palette).toBe("neon");
    expect(conflict!.peerDraft!.theme3d.heroScene).toBe("neon_grid");
    expect(conflict!.peerDraft!.technologies[0].icon.length).toBeGreaterThan(100);
  });

  it("Keep mine path: re-persist local draft wins shared key over peer", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const mine = clonePortfolio(live);
    mine.config.hero.name = "KeepLocal";
    const peer = clonePortfolio(live);
    peer.config.hero.name = "PeerWinsStorage";

    savePersistedDraft(peer, liveFp, profileId);
    expect(loadPersistedDraft(profileId)!.data.config.hero.name).toBe(
      "PeerWinsStorage"
    );

    // Keep mine = force-write local draft back
    const ok = savePersistedDraft(mine, liveFp, profileId);
    expect(ok).toBe(true);
    expect(loadPersistedDraft(profileId)!.data.config.hero.name).toBe(
      "KeepLocal"
    );
  });

  it("Take live path: snapshot local draft into history then adopt live", () => {
    const live = samplePortfolio("LivePeer");
    const mine = samplePortfolio("MyUnsaved");
    mine.theme3d.palette = "warm";

    const snapLabel = recoverySnapshotLabel("My draft before reloading live");
    const { entry, persisted } = appendVersion(mine, snapLabel);
    expect(persisted).toBe(true);
    expect(entry.label).toMatch(/draft|reload|recover|live/i);

    // Adopt live into draft (simulate resetDraft)
    const adopted = clonePortfolio(live);
    savePersistedDraft(adopted, portfolioFingerprint(live), profileId);

    const hist = loadVersionHistory();
    expect(hist.some((e) => e.data.config.hero.name === "MyUnsaved")).toBe(
      true
    );
    expect(loadPersistedDraft(profileId)!.data.config.hero.name).toBe(
      "LivePeer"
    );
    // History retains my theme snapshot
    const snap = hist.find((e) => e.data.config.hero.name === "MyUnsaved");
    expect(snap!.data.theme3d.palette).toBe("warm");
  });

  it("Take other draft: adopt peer including icons, preserve live fingerprint base", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const peer = clonePortfolio(live);
    peer.config.hero.name = "OtherDraft";
    peer.technologies[0].icon = "data:image/png;base64,OTHERICON";
    peer.theme3d.heroScene = "abstract_core";

    savePersistedDraft(peer, liveFp, profileId);
    const adopted = loadPersistedDraft(profileId)!;
    expect(adopted.baseFingerprint).toBe(liveFp);
    expect(adopted.data.config.hero.name).toBe("OtherDraft");
    expect(adopted.data.technologies[0].icon).toContain("OTHERICON");
    expect(adopted.data.theme3d.heroScene).toBe("abstract_core");
  });

  it("preferPeerDraft uses newer updatedAt", () => {
    expect(
      preferPeerDraft({
        localUpdatedAt: 1000,
        peerUpdatedAt: 2000,
      })
    ).toBe(true);
    expect(
      preferPeerDraft({
        localUpdatedAt: 3000,
        peerUpdatedAt: 2000,
      })
    ).toBe(false);
  });

  it("Compare path: merge only email from peer, keep local hero + theme", () => {
    const mine = samplePortfolio("LocalHero");
    mine.config.html.email = "local@ex.com";
    mine.theme3d.palette = "warm";

    const peer = clonePortfolio(mine);
    peer.config.hero.name = "PeerHero";
    peer.config.html.email = "peer@ex.com";
    peer.theme3d.palette = "neon";

    const diffs = diffPortfolios(mine, peer);
    const emailOnly = new Set(
      diffs
        .filter(
          (d) =>
            d.id === "config.html.email" ||
            d.id.includes("email") ||
            d.label?.toLowerCase().includes("email")
        )
        .map((d) => d.id)
    );
    // Fallback if id naming differs
    if (emailOnly.size === 0) {
      const emailDiff = diffs.find(
        (d) =>
          String(d.toValue).includes("peer@") ||
          String(d.fromValue).includes("local@")
      );
      if (emailDiff) emailOnly.add(emailDiff.id);
    }
    expect(emailOnly.size).toBeGreaterThanOrEqual(1);

    const { data } = applySelectedDiffs(mine, diffs, emailOnly);
    expect(data.config.html.email).toBe("peer@ex.com");
    expect(data.config.hero.name).toBe("LocalHero");
    expect(data.theme3d.palette).toBe("warm");
  });

  it("missing peer draft → no conflict object", () => {
    const live = samplePortfolio("Live");
    const c = conflictFromPeerDraft({
      profileId,
      localDraftFp: portfolioFingerprint(samplePortfolio("Mine")),
      liveFp: portfolioFingerprint(live),
      isDirty: true,
      peer: null,
      label: "x",
    });
    expect(c).toBeNull();
  });
});
