import { describe, expect, it } from "vitest";
import {
  buildTabConflict,
  conflictFromPeerDraft,
  preferPeerDraft,
  recoverySnapshotLabel,
  shouldSurfaceConflict,
} from "../../src/utils/history/tabConflict";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import { samplePortfolio } from "../fixtures/portfolio";

describe("tabConflict — multi-tab recovery rules", () => {
  it("does not surface when local draft is clean", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    expect(
      shouldSurfaceConflict({
        profileId: "p1",
        localDraftFp: liveFp,
        liveFp,
        isDirty: false,
        remoteFp: portfolioFingerprint(samplePortfolio("Other")),
        kind: "applied",
      })
    ).toBe(false);
  });

  it("surfaces when dirty draft and remote applied differ", () => {
    expect(
      shouldSurfaceConflict({
        profileId: "p1",
        localDraftFp: portfolioFingerprint(samplePortfolio("Mine")),
        liveFp: portfolioFingerprint(samplePortfolio("Live")),
        isDirty: true,
        remoteFp: portfolioFingerprint(samplePortfolio("Peer")),
        kind: "applied",
      })
    ).toBe(true);
  });

  it("does not surface when peer draft matches local draft", () => {
    const draft = samplePortfolio("Same");
    const fp = portfolioFingerprint(draft);
    expect(
      shouldSurfaceConflict({
        profileId: "p1",
        localDraftFp: fp,
        liveFp: portfolioFingerprint(samplePortfolio("Live")),
        isDirty: true,
        remoteFp: fp,
        kind: "draft",
      })
    ).toBe(false);
  });

  it("buildTabConflict retains peer payload and 3D settings", () => {
    const peer = samplePortfolio("Peer");
    peer.theme3d = { ...peer.theme3d, palette: "warm" };
    const c = buildTabConflict({
      profileId: "p1",
      localDraftFp: "a",
      liveFp: "b",
      isDirty: true,
      remoteFp: "c",
      kind: "draft",
      peerDraft: peer,
      peerDraftUpdatedAt: 100,
    });
    expect(c.kind).toBe("draft");
    expect(c.fingerprint).toBe("c");
    expect(c.peerDraft?.theme3d.palette).toBe("warm");
  });

  it("conflictFromPeerDraft preserves theme3d on peer draft", () => {
    const peer = samplePortfolio("PeerDraft");
    peer.theme3d = { ...peer.theme3d, palette: "aurora", heroScene: "abstract_core" };
    const conflict = conflictFromPeerDraft({
      profileId: "p1",
      localDraftFp: portfolioFingerprint(samplePortfolio("Mine")),
      liveFp: portfolioFingerprint(samplePortfolio("Live")),
      isDirty: true,
      peer: {
        v: 1,
        updatedAt: 123,
        baseFingerprint: "base",
        data: peer,
      },
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.kind).toBe("draft");
    expect(conflict!.peerDraft!.theme3d.palette).toBe("aurora");
    expect(conflict!.peerDraft!.theme3d.heroScene).toBe("abstract_core");
  });

  it("returns null when peer payload is missing", () => {
    expect(
      conflictFromPeerDraft({
        profileId: "p1",
        localDraftFp: "x",
        liveFp: "y",
        isDirty: true,
        peer: null,
      })
    ).toBeNull();
  });

  it("preferPeerDraft uses timestamps", () => {
    expect(preferPeerDraft({ localUpdatedAt: 1, peerUpdatedAt: 2 })).toBe(true);
    expect(preferPeerDraft({ localUpdatedAt: 5, peerUpdatedAt: 2 })).toBe(false);
  });

  it("recoverySnapshotLabel formats titles", () => {
    expect(recoverySnapshotLabel("My safety")).toBe("My safety");
    expect(recoverySnapshotLabel()).toMatch(/Recovered draft/);
  });
});
