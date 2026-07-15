import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMockLocalStorage } from "../fixtures/localStorage";

describe("multiTabSync", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
    sessionStorage.setItem("portfolio-tab-id", "tab-self");
    vi.resetModules();
  });

  afterEach(() => {
    restore();
  });

  it("identifies foreign tabs", async () => {
    const { isForeignTab, getTabId } = await import(
      "../../src/utils/history/multiTabSync"
    ).then(async (m) => ({
      ...m,
      getTabId: (await import("../../src/utils/history/tabId")).getTabId,
    }));
    expect(isForeignTab({ type: "versions", tabId: "other", rev: 1 })).toBe(
      true
    );
    expect(
      isForeignTab({ type: "versions", tabId: getTabId(), rev: 1 })
    ).toBe(false);
  });

  it("delivers broadcast messages to other channel subscribers", async () => {
    const { subscribePortfolioSync } = await import(
      "../../src/utils/history/multiTabSync"
    );
    const received: unknown[] = [];
    const unsub = subscribePortfolioSync((msg) => {
      received.push(msg);
    });

    const peer = new BroadcastChannel("portfolio-sync-v1");
    peer.postMessage({
      type: "draft",
      tabId: "peer-tab",
      rev: 99,
      profileId: "p1",
      fingerprint: "fp-peer",
      updatedAt: 1,
    });

    expect(received.length).toBe(1);
    expect((received[0] as { type: string }).type).toBe("draft");
    expect((received[0] as { fingerprint: string }).fingerprint).toBe(
      "fp-peer"
    );

    peer.close();
    unsub();
  });

  it("broadcastPortfolioSync stamps tabId", async () => {
    const { broadcastPortfolioSync } = await import(
      "../../src/utils/history/multiTabSync"
    );
    const { getTabId } = await import("../../src/utils/history/tabId");

    const peer = new BroadcastChannel("portfolio-sync-v1");
    const peerMsgs: unknown[] = [];
    peer.onmessage = (ev) => peerMsgs.push(ev.data);

    // Ensure internal channel is open after peer so both share the mock registry
    broadcastPortfolioSync({
      type: "applied",
      rev: 1,
      fingerprint: "fp",
      label: "test",
      profileId: "p1",
    });

    expect(peerMsgs.length).toBe(1);
    expect((peerMsgs[0] as { tabId: string }).tabId).toBe(getTabId());
    peer.close();
  });
});
