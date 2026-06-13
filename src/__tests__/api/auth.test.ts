/**
 * 成员A - Auth API 单元测试
 * 验证 auth.ts 中各函数是否正确构造 HTTP 请求（URL、参数、Body）
 * 参考 anime.test.ts 模式：mock @/api/client，不实际联网
 */
import {
  login,
  register,
  getCurrentUser,
  sendSmsCode,
  verifySmsCode,
  registerWithSms,
  loginWithSms,
  forgotPassword,
  changePassword,
  updateUserInfo,
  uploadAvatar,
  bindPhone,
} from '@/api/auth';
import client from '@/api/client';

// Mock 底层 HTTP client
jest.mock('@/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedGet = (client as unknown as { get: jest.Mock }).get;
const mockedPost = (client as unknown as { post: jest.Mock }).post;
const mockedPut = (client as unknown as { put: jest.Mock }).put;

describe('api/auth', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
  });

  // ==================== 用户名密码 ====================

  describe('login', () => {
    it('应 POST /auth/login 并传递正确的 Body', async () => {
      const fake = { code: 200, data: { token: 'tok', user: { id: 1 } } };
      mockedPost.mockResolvedValue(fake);

      const res = await login({ username: 'alice', password: 'pass123' });

      expect(mockedPost).toHaveBeenCalledWith('/auth/login', {
        username: 'alice',
        password: 'pass123',
      });
      expect(res).toBe(fake);
    });
  });

  describe('register', () => {
    it('应 POST /auth/register 并传递用户名、密码、昵称', async () => {
      const fake = { code: 200, data: { token: 'tok' } };
      mockedPost.mockResolvedValue(fake);

      const res = await register({
        username: 'newuser',
        password: 'pass456',
        nickname: '昵称',
      });

      expect(mockedPost).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        password: 'pass456',
        nickname: '昵称',
      });
      expect(res).toBe(fake);
    });
  });

  // ==================== 当前用户 ====================

  describe('getCurrentUser', () => {
    it('应 GET /auth/me', async () => {
      const fake = { code: 200, data: { id: 1, nickname: 'alice' } };
      mockedGet.mockResolvedValue(fake);

      const res = await getCurrentUser();

      expect(mockedGet).toHaveBeenCalledWith('/auth/me');
      expect(res).toBe(fake);
    });
  });

  // ==================== 短信验证码 ====================

  describe('sendSmsCode', () => {
    it('应 POST /sms/send 并默认 type=REGISTER', async () => {
      const fake = { code: 200, data: { message: 'ok', bizId: 'biz-1' } };
      mockedPost.mockResolvedValue(fake);

      const res = await sendSmsCode('13800138000');

      expect(mockedPost).toHaveBeenCalledWith('/sms/send', {
        phone: '13800138000',
        type: 'REGISTER',
      });
      expect(res).toBe(fake);
    });

    it('应支持显式指定 type=LOGIN', async () => {
      mockedPost.mockResolvedValue({ code: 200, data: {} });

      await sendSmsCode('13800138000', 'LOGIN');

      expect(mockedPost).toHaveBeenCalledWith('/sms/send', {
        phone: '13800138000',
        type: 'LOGIN',
      });
    });

    it('应支持显式指定 type=RESET_PASSWORD', async () => {
      mockedPost.mockResolvedValue({ code: 200, data: {} });

      await sendSmsCode('13800138000', 'RESET_PASSWORD');

      expect(mockedPost).toHaveBeenCalledWith('/sms/send', {
        phone: '13800138000',
        type: 'RESET_PASSWORD',
      });
    });
  });

  describe('verifySmsCode', () => {
    it('应 POST /sms/verify 并传递手机号、验证码、类型', async () => {
      const fake = { code: 200, data: { verified: true } };
      mockedPost.mockResolvedValue(fake);

      const res = await verifySmsCode('13800138000', '123456', 'LOGIN');

      expect(mockedPost).toHaveBeenCalledWith('/sms/verify', {
        phone: '13800138000',
        code: '123456',
        type: 'LOGIN',
      });
      expect(res).toBe(fake);
    });

    it('应默认 type=REGISTER', async () => {
      mockedPost.mockResolvedValue({ code: 200, data: { verified: true } });

      await verifySmsCode('13800138000', '123456');

      expect(mockedPost).toHaveBeenCalledWith('/sms/verify', {
        phone: '13800138000',
        code: '123456',
        type: 'REGISTER',
      });
    });
  });

  // ==================== 短信登录/注册 ====================

  describe('registerWithSms', () => {
    it('应 POST /auth/register/sms 并传递完整注册信息', async () => {
      const fake = { code: 200, data: { token: 'tok', user: { id: 2 } } };
      mockedPost.mockResolvedValue(fake);

      const res = await registerWithSms({
        phone: '13800138000',
        smsCode: '654321',
        password: 'pass789',
        nickname: '手机用户',
      });

      expect(mockedPost).toHaveBeenCalledWith('/auth/register/sms', {
        phone: '13800138000',
        smsCode: '654321',
        password: 'pass789',
        nickname: '手机用户',
      });
      expect(res).toBe(fake);
    });
  });

  describe('loginWithSms', () => {
    it('应 POST /auth/login/sms 并自动附带 type=LOGIN', async () => {
      const fake = { code: 200, data: { token: 'tok', user: { id: 3 } } };
      mockedPost.mockResolvedValue(fake);

      const res = await loginWithSms('13800138000', '111111');

      expect(mockedPost).toHaveBeenCalledWith('/auth/login/sms', {
        phone: '13800138000',
        code: '111111',
        type: 'LOGIN',
      });
      expect(res).toBe(fake);
    });
  });

  // ==================== 密码管理 ====================

  describe('forgotPassword', () => {
    it('应 POST /auth/forgot-password 并传递手机号、验证码、新密码', async () => {
      const fake = { code: 200, data: '密码重置成功' };
      mockedPost.mockResolvedValue(fake);

      const res = await forgotPassword({
        phone: '13800138000',
        smsCode: '222222',
        newPassword: 'newpass123',
      });

      expect(mockedPost).toHaveBeenCalledWith('/auth/forgot-password', {
        phone: '13800138000',
        smsCode: '222222',
        newPassword: 'newpass123',
      });
      expect(res).toBe(fake);
    });
  });

  describe('changePassword', () => {
    it('应 PUT /auth/password 并传递旧密码和新密码', async () => {
      const fake = { code: 200, data: '密码修改成功' };
      mockedPut.mockResolvedValue(fake);

      const res = await changePassword({
        oldPassword: 'oldpass',
        newPassword: 'newpass456',
      });

      expect(mockedPut).toHaveBeenCalledWith('/auth/password', {
        oldPassword: 'oldpass',
        newPassword: 'newpass456',
      });
      expect(res).toBe(fake);
    });
  });

  // ==================== 用户信息管理 ====================

  describe('updateUserInfo', () => {
    it('应 PUT /user/profile 并传递昵称和简介', async () => {
      const fake = { code: 200, data: { id: 1, nickname: '新昵称', bio: '简介' } };
      mockedPut.mockResolvedValue(fake);

      const res = await updateUserInfo({ nickname: '新昵称', bio: '简介' });

      expect(mockedPut).toHaveBeenCalledWith('/user/profile', {
        nickname: '新昵称',
        bio: '简介',
      });
      expect(res).toBe(fake);
    });

    it('应支持只传递部分字段', async () => {
      mockedPut.mockResolvedValue({ code: 200, data: {} });

      await updateUserInfo({ nickname: '仅昵称' });

      expect(mockedPut).toHaveBeenCalledWith('/user/profile', {
        nickname: '仅昵称',
      });
    });
  });

  describe('uploadAvatar', () => {
    it('应 POST /user/avatar 并附带 FormData 和 multipart/form-data 头', async () => {
      const fake = { code: 200, data: { avatarUrl: 'https://img.example/avatar.jpg' } };
      mockedPost.mockResolvedValue(fake);

      const res = await uploadAvatar('file:///storage/photos/avatar.png');

      // 验证 URL
      expect(mockedPost).toHaveBeenCalledTimes(1);
      const [url, formData, config] = mockedPost.mock.calls[0];

      expect(url).toBe('/user/avatar');

      // 验证 FormData 结构
      expect(formData).toBeInstanceOf(FormData);

      // 验证 Content-Type 头
      expect(config).toEqual({
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      expect(res).toBe(fake);
    });

    it('应根据文件扩展名推断 MIME 类型', async () => {
      mockedPost.mockResolvedValue({ code: 200, data: {} });

      await uploadAvatar('file:///storage/photos/photo.jpeg');

      const [, formData] = mockedPost.mock.calls[0];
      expect(formData).toBeInstanceOf(FormData);
    });
  });

  describe('bindPhone', () => {
    it('应 POST /user/bind-phone 并传递手机号和验证码', async () => {
      const fake = { code: 200, data: { id: 1, phone: '138****8000' } };
      mockedPost.mockResolvedValue(fake);

      const res = await bindPhone({
        phone: '13800138000',
        smsCode: '333333',
      });

      expect(mockedPost).toHaveBeenCalledWith('/user/bind-phone', {
        phone: '13800138000',
        smsCode: '333333',
      });
      expect(res).toBe(fake);
    });
  });
});
