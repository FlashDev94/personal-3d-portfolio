import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  COMPARE_DRAFT_ID,
  COMPARE_PEER_DRAFT_ID,
  VersionComparePanel,
} from "../../src/components/configurator/VersionComparePanel";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

describe("VersionComparePanel — selective recovery", () => {
  it("shows peer draft endpoint and merges selected fields only", async () => {
    const user = userEvent.setup();
    const draft = samplePortfolio("Mine");
    draft.theme3d = { ...draft.theme3d, palette: "cool" };
    const peer = clonePortfolio(draft);
    peer.config.hero.name = "PeerName";
    peer.theme3d = { ...peer.theme3d, palette: "neon", heroScene: "neon_grid" };
    peer.technologies[0].icon = "data:image/png;base64,PEERICON";

    const onApplyToDraft = vi.fn();
    const onStatus = vi.fn();

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
        onStatus={onStatus}
      />
    );

    expect(screen.getByText("Compare versions")).toBeInTheDocument();
    expect(screen.getByText("Hero name", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Palette", { exact: true })).toBeInTheDocument();
    expect(screen.getAllByText(/Other tab/).length).toBeGreaterThanOrEqual(1);

    // Panel may auto-select; ensure all selected then merge
    await user.click(screen.getByRole("button", { name: /Select all/i }));
    const mergeBtn = screen.getByRole("button", {
      name: /Merge selected into draft/i,
    });
    expect(mergeBtn).not.toBeDisabled();
    await user.click(mergeBtn);

    expect(onApplyToDraft).toHaveBeenCalledTimes(1);
    const [merged, label] = onApplyToDraft.mock.calls[0];
    expect(merged.config.hero.name).toBe("PeerName");
    expect(merged.theme3d.palette).toBe("neon");
    expect(merged.theme3d.heroScene).toBe("neon_grid");
    expect(String(label)).toMatch(/Selective restore/i);
    expect(onStatus).toHaveBeenCalled();
  });

  it("does not merge when nothing selected", async () => {
    const user = userEvent.setup();
    const draft = samplePortfolio("A");
    const peer = clonePortfolio(draft);
    peer.config.hero.name = "B";
    const onApplyToDraft = vi.fn();

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
        onApplyToDraft={onApplyToDraft}
      />
    );

    // Clear auto-selection if any
    await user.click(screen.getByRole("button", { name: /Select none/i }));
    const mergeBtn = screen.getByRole("button", {
      name: /Merge selected into draft/i,
    });
    expect(mergeBtn).toBeDisabled();
    expect(onApplyToDraft).not.toHaveBeenCalled();
  });
});
