import { create } from 'zustand';

interface DiscoveryState {
  keyword: string;
  setKeyword: (keyword: string) => void;
  clearKeyword: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  keyword: '',
  setKeyword: (keyword) => set({ keyword }),
  clearKeyword: () => set({ keyword: '' }),
}));
