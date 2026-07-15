import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  COMPARE_DRAFT_ID,
  COMPARE_LIVE_ID,
  COMPARE_PEER_DRAFT_ID,
  VersionComparePanel,
} from "../../src/components/configurator/VersionComparePanel";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

describe("VersionComparePanel robustness", () => {
  it("merges a single checkbox field (hero) without theme/email", async () => {
    const user = userEvent.setup();
    const draft = samplePortfolio("Mine");
    draft.config.html.email = "mine@ex.com";
    draft.theme3d.palette = "warm";

    const peer = clonePortfolio(draft);
    peer.config.hero.name = "PeerOnly";
    peer.config.html.email = "peer@ex.com";
    peer.theme3d.palette = "neon";

    const onApplyToDraft = vi.fn();

    render(
      <VersionComparePanel
        versions={[]}
        live={samplePortfolio("Live")}
        draft={draft}
        extraSnapshots={[
          {
            id: COMPARE_PEER_DRAFT_ID,
            label: "Other tab’s draft",
            data: peer,
          },
        ]}
        initialFromId={COMPARE_DRAFT_ID}
        initialToId={COMPARE_PEER_DRAFT_ID}
        onApplyToDraft={onApplyToDraft}
      />
    );

    // Clear auto-selection
    await user.click(screen.getByRole("button", { name: /Select none/i }));

    // Find the hero name row and check only that box
    const heroLabel = screen.getByText("Hero name", { exact: true });
    const row = heroLabel.closest("label") || heroLabel.closest("div");
    expect(row).toBeTruthy();
    const box = within(row as HTMLElement).getByRole("checkbox");
    await user.click(box);

    const merge = screen.getByRole("button", {
      name: /Merge selected into draft/i,
    });
    expect(merge).not.toBeDisabled();
    await user.click(merge);

    expect(onApplyToDraft).toHaveBeenCalledTimes(1);
    const [merged] = onApplyToDraft.mock.calls[0];
    expect(merged.config.hero.name).toBe("PeerOnly");
    expect(merged.config.html.email).toBe("mine@ex.com");
    expect(merged.theme3d.palette).toBe("warm");
  });

  it("can compare draft vs live endpoints", async () => {
    const draft = samplePortfolio("Drafty");
    draft.config.hero.name = "DraftName";
    const live = samplePortfolio("Livey");
    live.config.hero.name = "LiveName";

    render(
      <VersionComparePanel
        versions={[]}
        live={live}
        draft={draft}
        initialFromId={COMPARE_DRAFT_ID}
        initialToId={COMPARE_LIVE_ID}
        onApplyToDraft={vi.fn()}
      />
    );

    expect(screen.getByText("Compare versions")).toBeInTheDocument();
    // Both endpoints appear in selects / labels
    expect(screen.getAllByText(/Current draft|Live portfolio/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Hero name", { exact: true })).toBeInTheDocument();
  });

  it("swap / empty selection keeps merge disabled after select none", async () => {
    const user = userEvent.setup();
    const draft = samplePortfolio("A");
    const peer = clonePortfolio(draft);
    peer.config.hero.name = "B";

    render(
      <VersionComparePanel
        versions={[]}
        live={draft}
        draft={draft}
        extraSnapshots={[
          { id: COMPARE_PEER_DRAFT_ID, label: "Peer", data: peer },
        ]}
        initialFromId={COMPARE_DRAFT_ID}
        initialToId={COMPARE_PEER_DRAFT_ID}
        onApplyToDraft={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Select all/i }));
    expect(
      screen.getByRole("button", { name: /Merge selected into draft/i })
    ).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Select none/i }));
    expect(
      screen.getByRole("button", { name: /Merge selected into draft/i })
    ).toBeDisabled();
  });
});
