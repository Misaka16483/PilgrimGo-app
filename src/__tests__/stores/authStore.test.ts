/**
 * 成员A - AuthStore 状态管理单元测试
 * 测试 Zustand store 中所有方法的状态转换和副作用
 * 参考 recordingStore.test.ts 模式：直接操作 getState()/setState()
 */

// 必须在 import 之前 mock AsyncStorage，否则 NativeModule 不存在
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiMerge: jest.fn(() => Promise.resolve()),
}));

// Mock auth API
jest.mock('@/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  loginWithSms: jest.fn(),
  registerWithSms: jest.fn(),
  sendSmsCode: jest.fn(),
  updateUserInfo: jest.fn(),
  uploadAvatar: jest.fn(),
  forgotPassword: jest.fn(),
  changePassword: jest.fn(),
  getCurrentUser: jest.fn(),
}));

import { useAuthStore } from '@/stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';
import * as authApi from '@/api/auth';

const api = authApi as jest.Mocked<typeof authApi>;

const get = () => useAuthStore.getState();

const mockUser: User = {
  id: 1,
  username: 'alice',
  nickname: 'Alice',
  avatarUrl: undefined,
  bio: 'Hello',
  checkInCount: 5,
  routeCount: 3,
};

// store 是单例，每个用例前重置
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    isLoading: false,
  });
  jest.clearAllMocks();
});

// ==================== 初始状态 ====================

describe('authStore 初始状态', () => {
  it('未登录时 user 和 token 为 null', () => {
    const s = get();
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
  });
});

// ==================== 用户名密码登录/注册 ====================

describe('login', () => {
  it('登录成功后保存 token 到 AsyncStorage 并设置 user', async () => {
    api.login.mockResolvedValue({
      code: 200,
      message: 'success',
      data: { token: 'tok-abc', user: mockUser },
    });

    await get().login('alice', 'pass123');

    const s = get();
    expect(s.token).toBe('tok-abc');
    expect(s.user).toEqual(mockUser);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'tok-abc');
  });

  it('登录失败时不应修改状态', async () => {
    api.login.mockRejectedValue(new Error('用户名或密码错误'));

    await expect(get().login('alice', 'wrong')).rejects.toThrow('用户名或密码错误');

    const s = get();
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
  });
});

describe('register', () => {
  it('注册成功后自动登录（保存 token 和 user）', async () => {
    api.register.mockResolvedValue({
      code: 200,
      message: 'success',
      data: { token: 'tok-new', user: { ...mockUser, id: 2, nickname: '新人' } },
    });

    await get().register('newuser', 'pass456', '新人');

    const s = get();
    expect(s.token).toBe('tok-new');
    expect(s.user?.nickname).toBe('新人');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'tok-new');
  });

  it('注册失败时不应修改状态', async () => {
    api.register.mockRejectedValue(new Error('用户名已存在'));

    await expect(get().register('existing', 'pass', '昵称')).rejects.toThrow('用户名已存在');

    expect(get().token).toBeNull();
  });
});

// ==================== 手机号登录/注册 ====================

describe('loginWithPhone', () => {
  it('短信登录成功后设置 token 和 user', async () => {
    api.loginWithSms.mockResolvedValue({
      code: 200,
      message: 'success',
      data: { token: 'tok-sms', user: { ...mockUser, id: 3 } },
    });

    await get().loginWithPhone('13800138000', '123456');

    expect(get().token).toBe('tok-sms');
    expect(get().user?.id).toBe(3);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'tok-sms');
  });
});

describe('registerWithPhone', () => {
  it('短信注册成功后自动登录', async () => {
    api.registerWithSms.mockResolvedValue({
      code: 200,
      message: 'success',
      data: { token: 'tok-sms-reg', user: { ...mockUser, id: 4 } },
    });

    await get().registerWithPhone('13800138000', '654321', 'pass789', '手机党');

    expect(get().token).toBe('tok-sms-reg');
    expect(get().user?.id).toBe(4);
  });
});

// ==================== 短信验证码 ====================

describe('sendSmsCode', () => {
  it('发送验证码后不修改 user/token 状态', async () => {
    api.sendSmsCode.mockResolvedValue({
      code: 200,
      message: 'success',
      data: { message: 'ok', bizId: 'biz-1' },
    });

    // 先设置登录状态
    useAuthStore.setState({ user: mockUser, token: 'tok' });

    await get().sendSmsCode('13800138000', 'REGISTER');

    // 验证码发送不应影响现有登录状态
    expect(get().token).toBe('tok');
    expect(get().user).toEqual(mockUser);
  });
});

// ==================== 用户信息管理 ====================

describe('updateUserInfo', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockUser, token: 'tok' });
  });

  it('更新成功后合并新的用户信息', async () => {
    api.updateUserInfo.mockResolvedValue({
      code: 200,
      message: 'success',
      data: { ...mockUser, nickname: '新昵称', bio: '新简介' },
    });

    await get().updateUserInfo({ nickname: '新昵称', bio: '新简介' });

    const s = get();
    expect(s.user?.nickname).toBe('新昵称');
    expect(s.user?.bio).toBe('新简介');
  });
});

describe('uploadAvatar', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockUser, token: 'tok' });
  });

  it('上传头像成功后更新 user.avatarUrl', async () => {
    const newUrl = 'https://cdn.example/avatars/alice.png';
    api.uploadAvatar.mockResolvedValue({
      code: 200,
      message: 'success',
      data: { ...mockUser, avatarUrl: newUrl },
    });

    await get().uploadAvatar('file:///photos/avatar.jpg');

    expect(get().user?.avatarUrl).toBe(newUrl);
  });

  it('未登录时上传头像仍应正常执行', async () => {
    useAuthStore.setState({ user: null, token: null });
    api.uploadAvatar.mockResolvedValue({
      code: 200,
      message: 'success',
      data: { ...mockUser, avatarUrl: 'https://cdn.example/avatar.jpg' },
    });

    await get().uploadAvatar('file:///photos/avatar.jpg');

    // user 仍为 null（因为 currentUser 为 null 时不合并）
    expect(get().user).toBeNull();
  });
});

describe('updateUser', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockUser, token: 'tok' });
  });

  it('应合并部分字段到当前 user', () => {
    get().updateUser({ nickname: '直接更新', checkInCount: 10 });

    const s = get();
    expect(s.user?.nickname).toBe('直接更新');
    expect(s.user?.checkInCount).toBe(10);
    // 未更新的字段保持不变
    expect(s.user?.id).toBe(1);
    expect(s.user?.bio).toBe('Hello');
  });

  it('currentUser 为 null 时不应抛错', () => {
    useAuthStore.setState({ user: null });

    expect(() => get().updateUser({ nickname: 'test' })).not.toThrow();
  });
});

// ==================== 密码管理 ====================

describe('forgotPassword', () => {
  it('应调用 API 但不修改状态', async () => {
    api.forgotPassword.mockResolvedValue({ code: 200, message: 'success', data: '密码重置成功' });
    useAuthStore.setState({ user: mockUser, token: 'tok' });

    await get().forgotPassword('13800138000', '222222', 'newpass');

    // 密码重置不影响当前登录状态
    expect(get().token).toBe('tok');
    expect(get().user).toEqual(mockUser);
  });
});

describe('changePassword', () => {
  it('应调用 API 但不修改状态', async () => {
    api.changePassword.mockResolvedValue({ code: 200, message: 'success', data: '密码修改成功' });
    useAuthStore.setState({ user: mockUser, token: 'tok' });

    await get().changePassword('oldpass', 'newpass');

    expect(get().token).toBe('tok');
  });
});

// ==================== 调试登录 ====================

describe('devLogin', () => {
  it('应设置 dev_token 和调试用户数据', async () => {
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    await get().devLogin();

    const s = get();
    expect(s.token).toBe('dev_token_1700000000000');
    expect(s.user?.username).toBe('test_user');
    expect(s.user?.nickname).toBe('测试用户');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'dev_token_1700000000000');

    dateSpy.mockRestore();
  });
});

// ==================== 登出 ====================

describe('logout', () => {
  it('应清除 AsyncStorage 和状态', async () => {
    useAuthStore.setState({ user: mockUser, token: 'tok' });

    await get().logout();

    const s = get();
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });
});

// ==================== Token 恢复 ====================

describe('loadToken', () => {
  it('没有 token 时应设置 isLoading=false', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await get().loadToken();

    expect(get().isLoading).toBe(false);
    expect(get().user).toBeNull();
    expect(get().token).toBeNull();
  });

  it('dev_token 应直接恢复调试用户', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dev_token_12345');

    await get().loadToken();

    const s = get();
    expect(s.token).toBe('dev_token_12345');
    expect(s.user?.username).toBe('test_user');
    expect(s.isLoading).toBe(false);
  });

  it('普通 token 应调用 getCurrentUser 恢复用户', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('tok-real');
    api.getCurrentUser.mockResolvedValue({
      code: 200,
      message: 'success',
      data: mockUser,
    });

    await get().loadToken();

    const s = get();
    expect(s.token).toBe('tok-real');
    expect(s.user).toEqual(mockUser);
    expect(s.isLoading).toBe(false);
    expect(api.getCurrentUser).toHaveBeenCalled();
  });

  it('token 有效但 API 返回错误时应清除 token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('tok-expired');
    api.getCurrentUser.mockRejectedValue(new Error('401'));

    await get().loadToken();

    const s = get();
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });
});
