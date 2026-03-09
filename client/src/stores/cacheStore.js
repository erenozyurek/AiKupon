import { create } from 'zustand';

const CACHE_TTL = 3 * 60 * 1000; // 3 dakika

export const useCacheStore = create((set, get) => ({
  cache: {},

  get: (key) => {
    const entry = get().cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
      get().invalidate(key);
      return null;
    }
    return entry.data;
  },

  set: (key, data) => {
    set((s) => ({ cache: { ...s.cache, [key]: { data, ts: Date.now() } } }));
  },

  invalidate: (key) => {
    set((s) => {
      const next = { ...s.cache };
      delete next[key];
      return { cache: next };
    });
  },

  invalidatePrefix: (prefix) => {
    set((s) => {
      const next = {};
      for (const [k, v] of Object.entries(s.cache)) {
        if (!k.startsWith(prefix)) next[k] = v;
      }
      return { cache: next };
    });
  },
}));
