import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, REQUEST_TIMEOUT } from '@/constants/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截：自动携带 JWT token
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一处理错误
client.interceptors.response.use(
  (response) => {
    const data = response.data;
    // 后端统一返回 ApiResponse，code !== 200 时报错
    if (data && typeof data === 'object' && 'code' in data && data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return data;
  },
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('token');
      // TODO: 跳转登录页
    }
    // 尝试从响应体中提取后端错误消息
    const data = error.response?.data;
    if (data && data.message) {
      return Promise.reject(new Error(data.message));
    }
    return Promise.reject(error);
  }
);

export default client;
