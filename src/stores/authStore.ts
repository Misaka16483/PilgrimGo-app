import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';
import * as authApi from '@/api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  // 用户名密码登录/注册
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname: string) => Promise<void>;

  // 手机号短信登录/注册
  loginWithPhone: (phone: string, smsCode: string) => Promise<void>;
  registerWithPhone: (phone: string, smsCode: string, password: string, nickname: string) => Promise<void>;

  // 发送短信验证码
  sendSmsCode: (phone: string, type: 'REGISTER' | 'LOGIN') => Promise<void>;

  // 用户信息管理
  updateUserInfo: (data: { nickname?: string; bio?: string }) => Promise<void>;
  uploadAvatar: (imageUri: string) => Promise<void>;
  updateUser: (user: Partial<User>) => void;

  // 密码管理
  forgotPassword: (phone: string, smsCode: string, newPassword: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;

  // 调试功能
  devLogin: () => Promise<void>;

  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

// 调试用的模拟用户数据
const DEV_USER: User = {
  id: 1,
  username: 'test_user',
  nickname: '测试用户',
  avatarUrl: undefined,
  bio: '这是一个调试账号，用于开发测试',
  checkInCount: 12,
  routeCount: 5,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  // 用户名密码登录
  login: async (username, password) => {
    const res = await authApi.login({ username, password });
    await AsyncStorage.setItem('token', res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  // 用户名密码注册
  register: async (username, password, nickname) => {
    const res = await authApi.register({ username, password, nickname });
    await AsyncStorage.setItem('token', res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  // 手机号短信登录
  loginWithPhone: async (phone, smsCode) => {
    const res = await authApi.loginWithSms(phone, smsCode);
    await AsyncStorage.setItem('token', res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  // 手机号短信注册
  registerWithPhone: async (phone, smsCode, password, nickname) => {
    const res = await authApi.registerWithSms({
      phone,
      smsCode,
      password,
      nickname,
    });
    await AsyncStorage.setItem('token', res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  // 发送短信验证码
  sendSmsCode: async (phone, type) => {
    await authApi.sendSmsCode(phone, type);
  },

  // 更新用户信息
  updateUserInfo: async (data) => {
    const res = await authApi.updateUserInfo(data);
    set({ user: res.data });
  },

  // 上传头像
  uploadAvatar: async (imageUri) => {
    const res = await authApi.uploadAvatar(imageUri);
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, avatarUrl: res.data.avatarUrl } });
    }
  },

  // 直接更新用户状态
  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...userData } });
    }
  },

  // 忘记密码
  forgotPassword: async (phone, smsCode, newPassword) => {
    await authApi.forgotPassword({ phone, smsCode, newPassword });
  },

  // 修改密码
  changePassword: async (oldPassword, newPassword) => {
    await authApi.changePassword({ oldPassword, newPassword });
  },

  // 调试登录 - 无需后端，直接设置模拟用户
  devLogin: async () => {
    const devToken = 'dev_token_' + Date.now();
    await AsyncStorage.setItem('token', devToken);
    set({ user: DEV_USER, token: devToken });
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({ user: null, token: null });
  },

  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // 如果是调试token，直接恢复模拟用户
        if (token.startsWith('dev_token_')) {
          set({ user: DEV_USER, token, isLoading: false });
          return;
        }
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
