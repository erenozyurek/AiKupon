import { create } from 'zustand';

const MAX_MATCHES = 8;

export const useCouponStore = create((set, get) => ({
  matches: [],
  stake: '',

  addMatch: (match) => {
    const { matches } = get();
    if (matches.length >= MAX_MATCHES) return false;
    if (matches.some((m) => m.fixtureId === match.fixtureId)) return false;
    set({ matches: [...matches, match] });
    return true;
  },

  removeMatch: (fixtureId) => {
    set((s) => ({ matches: s.matches.filter((m) => m.fixtureId !== fixtureId) }));
  },

  toggleMatch: (match) => {
    const { matches } = get();
    if (matches.some((m) => m.fixtureId === match.fixtureId)) {
      get().removeMatch(match.fixtureId);
      return 'removed';
    }
    if (matches.length >= MAX_MATCHES) return 'full';
    get().addMatch(match);
    return 'added';
  },

  isSelected: (fixtureId) => {
    return get().matches.some((m) => m.fixtureId === fixtureId);
  },

  isFull: () => get().matches.length >= MAX_MATCHES,

  setStake: (stake) => set({ stake }),

  clearAll: () => set({ matches: [], stake: '' }),

  totalOdds: () => get().matches.reduce((acc, m) => acc * (m.odds || 1), 1),
}));
