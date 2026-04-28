import { create } from 'zustand';
import type { Spot } from '@/types';

/**
 * 用户跨屏选择的取景地集合。
 * - 顺序 = 选择顺序，决定大地图上折线连接的顺序
 * - has() 用于在 UI 上标记复选状态
 */
interface SelectedSpotsState {
  spots: Spot[];
  toggle: (spot: Spot) => void;
  add: (spot: Spot) => void;
  remove: (spotId: number) => void;
  clear: () => void;
  has: (spotId: number) => boolean;
  setOrder: (spots: Spot[]) => void;
}

export const useSelectedSpotsStore = create<SelectedSpotsState>((set, get) => ({
  spots: [],

  toggle: (spot) => {
    const exists = get().spots.some((s) => s.id === spot.id);
    set((state) => ({
      spots: exists
        ? state.spots.filter((s) => s.id !== spot.id)
        : [...state.spots, spot],
    }));
  },

  add: (spot) => {
    if (get().spots.some((s) => s.id === spot.id)) return;
    set((state) => ({ spots: [...state.spots, spot] }));
  },

  remove: (spotId) => {
    set((state) => ({ spots: state.spots.filter((s) => s.id !== spotId) }));
  },

  clear: () => set({ spots: [] }),

  has: (spotId) => get().spots.some((s) => s.id === spotId),

  setOrder: (spots) => set({ spots }),
}));
