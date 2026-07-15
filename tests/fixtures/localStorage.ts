/**
 * In-memory localStorage with optional soft quota (chars of key+value).
 */
export type MockLocalStorage = Storage & {
  _mem: Map<string, string>;
  _quotaChars: number | null;
  setQuota(chars: number | null): void;
  clearAll(): void;
};

export function createMockLocalStorage(
  quotaChars: number | null = null
): MockLocalStorage {
  const mem = new Map<string, string>();
  let quota = quotaChars;

  const api: MockLocalStorage = {
    _mem: mem,
    get _quotaChars() {
      return quota;
    },
    setQuota(chars) {
      quota = chars;
    },
    clearAll() {
      mem.clear();
    },
    get length() {
      return mem.size;
    },
    clear() {
      mem.clear();
    },
    getItem(k: string) {
      return mem.has(k) ? mem.get(k)! : null;
    },
    setItem(k: string, v: string) {
      const next = new Map(mem);
      next.set(k, String(v));
      if (quota != null) {
        let total = 0;
        for (const [kk, vv] of next) total += kk.length + vv.length;
        if (total > quota) {
          const err = new Error("QuotaExceededError");
          (err as DOMException).name = "QuotaExceededError";
          throw err;
        }
      }
      mem.set(k, String(v));
    },
    removeItem(k: string) {
      mem.delete(k);
    },
    key(i: number) {
      return [...mem.keys()][i] ?? null;
    },
  };

  return api;
}

/** Install mock as global localStorage (returns restore fn). */
export function installMockLocalStorage(
  quotaChars: number | null = null
): { ls: MockLocalStorage; restore: () => void } {
  const prev = globalThis.localStorage;
  const ls = createMockLocalStorage(quotaChars);
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
    writable: true,
  });
  return {
    ls,
    restore: () => {
      Object.defineProperty(globalThis, "localStorage", {
        value: prev,
        configurable: true,
        writable: true,
      });
    },
  };
}
