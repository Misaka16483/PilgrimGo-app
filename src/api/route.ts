import client from './client';
import type { PilgrimRoute, PageResult, ApiResponse, GeoPoint, Waypoint } from '@/types';

/** 获取动画作品的巡礼路径列表 */
export function getRoutesByAnime(animeId: number, params?: {
  page?: number;
  size?: number;
  sort?: 'rating' | 'newest';
}) {
  return client.get<any, ApiResponse<PageResult<PilgrimRoute>>>(
    `/anime/${animeId}/routes`,
    { params }
  );
}

/** 获取路径详情（含完整轨迹点和转折点） */
export function getRouteDetail(id: number) {
  return client.get<any, ApiResponse<PilgrimRoute>>(`/routes/${id}`);
}

/** 上传录制的巡礼路径 */
export function uploadRoute(data: {
  animeId: number;
  title: string;
  description?: string;
  trackPoints: GeoPoint[];
  waypoints: Omit<Waypoint, 'id'>[];
}) {
  return client.post<any, ApiResponse<PilgrimRoute>>('/routes', data);
}

/** 对路径评分 */
export function rateRoute(routeId: number, score: number) {
  return client.post<any, ApiResponse<void>>(`/routes/${routeId}/rate`, { score });
}
