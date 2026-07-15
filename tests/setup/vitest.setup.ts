import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Deterministic BroadcastChannel for multi-tab unit/integration tests.
 * Always installed so jsdom's incomplete implementation cannot flake.
 */
class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  private static channels = new Map<string, Set<MockBroadcastChannel>>();

  static resetAll() {
    MockBroadcastChannel.channels.clear();
  }

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: unknown) {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    for (const ch of peers) {
      if (ch === this) continue;
      const ev = { data } as MessageEvent;
      ch.onmessage?.(ev);
      // also fire addEventListener handlers if any
      const listeners = (ch as unknown as { _listeners?: Set<(e: MessageEvent) => void> })
        ._listeners;
      listeners?.forEach((fn) => fn(ev));
    }
  }

  close() {
    MockBroadcastChannel.channels.get(this.name)?.delete(this);
  }

  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    if (type !== "message") return;
    const self = this as unknown as {
      _listeners?: Set<(e: MessageEvent) => void>;
    };
    if (!self._listeners) self._listeners = new Set();
    self._listeners.add(fn);
  }

  removeEventListener(type: string, fn: (e: MessageEvent) => void) {
    if (type !== "message") return;
    const self = this as unknown as {
      _listeners?: Set<(e: MessageEvent) => void>;
    };
    self._listeners?.delete(fn);
  }

  dispatchEvent() {
    return true;
  }
}

// Always override (jsdom BC is incomplete for cross-instance delivery)
// @ts-expect-error test polyfill
globalThis.BroadcastChannel = MockBroadcastChannel;
// @ts-expect-error expose for tests
globalThis.__MockBroadcastChannel = MockBroadcastChannel;

// MatchMedia for reduced-motion / theme hooks
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  // @ts-expect-error test helper
  globalThis.__MockBroadcastChannel?.resetAll?.();
});
