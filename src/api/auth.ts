import client from './client';
import type { User, ApiResponse } from '@/types';

// 注意：client 的 baseURL 已包含 /api，所有路径无需再加 /api 前缀

/** 用户名密码登录 */
export function login(data: { username: string; password: string }) {
  return client.post<any, ApiResponse<{ token: string; user: User }>>('/auth/login', data);
}

/** 用户名密码注册 */
export function register(data: {
  username: string;
  password: string;
  nickname: string;
}) {
  return client.post<any, ApiResponse<{ token: string; user: User }>>('/auth/register', data);
}

/** 获取当前用户信息 */
export function getCurrentUser() {
  return client.get<any, ApiResponse<User>>('/auth/me');
}

// ==================== 短信验证码相关接口 ====================

/** 发送短信验证码 */
export function sendSmsCode(phone: string, type: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' = 'REGISTER') {
  return client.post<any, ApiResponse<{ message: string; bizId: string }>>('/sms/send', {
    phone,
    type,
  });
}

/** 验证短信验证码（调试用） */
export function verifySmsCode(phone: string, code: string, type: 'REGISTER' | 'LOGIN' = 'REGISTER') {
  return client.post<any, ApiResponse<{ verified: boolean }>>('/sms/verify', {
    phone,
    code,
    type,
  });
}

/** 短信验证码注册 */
export function registerWithSms(data: {
  phone: string;
  smsCode: string;
  password: string;
  nickname: string;
}) {
  return client.post<any, ApiResponse<{ token: string; user: User }>>('/auth/register/sms', data);
}

/** 短信验证码登录 */
export function loginWithSms(phone: string, code: string) {
  return client.post<any, ApiResponse<{ token: string; user: User }>>('/auth/login/sms', {
    phone,
    code,
    type: 'LOGIN',
  });
}

// ==================== 密码管理 ====================

/** 忘记密码 - 短信验证码重置 */
export function forgotPassword(data: { phone: string; smsCode: string; newPassword: string }) {
  return client.post<any, ApiResponse<string>>('/auth/forgot-password', data);
}

/** 修改密码（需旧密码验证） */
export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return client.put<any, ApiResponse<string>>('/auth/password', data);
}

// ==================== 用户信息管理 ====================

/** 更新用户资料 */
export function updateUserInfo(data: { nickname?: string; bio?: string }) {
  return client.put<any, ApiResponse<User>>('/user/profile', data);
}

/** 上传头像 */
export async function uploadAvatar(imageUri: string) {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'avatar.jpg';
  const match = /\.([^.]+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  return client.post<any, ApiResponse<{ avatarUrl: string }>>('/user/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/** 绑定手机号 */
export function bindPhone(data: { phone: string; smsCode: string }) {
  return client.post<any, ApiResponse<User>>('/user/bind-phone', data);
}
