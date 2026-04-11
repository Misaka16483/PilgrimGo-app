import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';
import * as authApi from '@/api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (username, password) => {
    const res = await authApi.login({ username, password });
    await AsyncStorage.setItem('token', res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  register: async (username, password, nickname) => {
    const res = await authApi.register({ username, password, nickname });
    await AsyncStorage.setItem('token', res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({ user: null, token: null });
  },

  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await authApi.getCurrentUser();
        set({ user: res.data, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await AsyncStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
