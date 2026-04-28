import client from './client';
import type { User, ApiResponse } from '@/types';

/** 登录 */
export function login(data: { username: string; password: string }) {
  return client.post<any, ApiResponse<{ token: string; user: User }>>('/auth/login', data);
}

/** 注册 */
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
