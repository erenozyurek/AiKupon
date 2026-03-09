import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  couponPanelOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCouponPanel: () => set((s) => ({ couponPanelOpen: !s.couponPanelOpen })),
  setCouponPanelOpen: (open) => set({ couponPanelOpen: open }),
}));
