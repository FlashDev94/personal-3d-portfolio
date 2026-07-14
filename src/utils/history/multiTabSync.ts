import { getTabId } from "./tabId";
import { SYNC_CHANNEL_NAME, type SyncMessage } from "./types";

type Listener = (msg: SyncMessage) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channel.onmessage = (ev: MessageEvent<SyncMessage>) => {
      const msg = ev.data;
      if (!msg || typeof msg !== "object" || !("type" in msg)) return;
      listeners.forEach((fn) => {
        try {
          fn(msg);
        } catch (err) {
          console.warn("portfolio sync listener failed", err);
        }
      });
    };
  }
  return channel;
}

export function subscribePortfolioSync(listener: Listener): () => void {
  getChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // Close the singleton when the last subscriber leaves so HMR / remounts
    // do not keep a stale channel with zero listeners alive.
    if (listeners.size === 0 && channel) {
      try {
        channel.close();
      } catch {
        /* ignore */
      }
      channel = null;
    }
  };
}

export function broadcastPortfolioSync(
  message:
    | {
        type: "applied";
        rev: number;
        fingerprint: string;
        label?: string;
        tabId?: string;
      }
    | {
        type: "versions";
        rev: number;
        tabId?: string;
      }
): void {
  const tabId = message.tabId ?? getTabId();
  const full = { ...message, tabId } as SyncMessage;
  try {
    getChannel()?.postMessage(full);
  } catch (err) {
    console.warn("portfolio sync broadcast failed", err);
  }
}

export function isForeignTab(msg: SyncMessage): boolean {
  return msg.tabId !== getTabId();
}
