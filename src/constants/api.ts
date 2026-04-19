/**
 * API 相关常量配置
 * 开发时指向本地后端，发布时替换为生产地址
 */

// 开发环境后端地址（根据实际情况修改）
export const API_BASE_URL = __DEV__
  ? 'http://10.61.200.174:8080/api'
  : 'https://api.pilgrimgo.com/api';

// 请求超时时间（毫秒）
export const REQUEST_TIMEOUT = 15000;

// 分页默认大小
export const DEFAULT_PAGE_SIZE = 20;
