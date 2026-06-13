import client from './client';
import type {
  PilgrimRoute,
  PageResult,
  ApiResponse,
  GeoPoint,
  Waypoint,
  RouteReview,
  RouteRatingSummary,
} from '@/types';

/** 获取动画作品的巡礼路径列表（接口在 /api/routes 下，统一走鉴权） */
export function getRoutesByAnime(animeId: number, params?: {
  page?: number;
  size?: number;
  sort?: 'rating' | 'newest';
}) {
  return client.get<any, ApiResponse<PageResult<PilgrimRoute>>>(
    `/routes`,
    { params: { animeId, ...params } }
  );
}

/** 获取当前登录用户发布的全部巡礼路径（"我的路径"，需登录）。 */
export function getMyRoutes(params?: { page?: number; size?: number }) {
  return client.get<any, ApiResponse<PageResult<PilgrimRoute>>>(
    `/routes/mine`,
    { params }
  );
}

/** 获取路径详情（含完整轨迹点和转折点） */
export function getRouteDetail(id: number) {
  return client.get<any, ApiResponse<PilgrimRoute>>(`/routes/${id}`);
}

/** 上传录制的巡礼路径
 *  - spotIds：录制时用户在 SpotPickerModal 选中的目标取景地（按选择顺序）。
 *    后端写入 route_spot，跟走时显示完整观景点清单。
 *  - checkInIds：录制期间在 /ar/compare 完成的打卡 id；后端会把它们的
 *    route_id 回填成当前 route，从而把作者照片关联到这条路径。 */
export function uploadRoute(data: {
  animeId: number;
  title: string;
  description?: string;
  trackPoints: GeoPoint[];
  waypoints: Omit<Waypoint, 'id'>[];
  spotIds?: number[];
  checkInIds?: number[];
}) {
  return client.post<any, ApiResponse<PilgrimRoute>>('/routes', data);
}

/** 对路径评分，可附文字评论；同一用户重复提交会覆盖上一条。 */
export function rateRoute(routeId: number, score: number, comment?: string) {
  return client.post<any, ApiResponse<RouteRatingSummary>>(
    `/routes/${routeId}/rate`,
    { score, comment }
  );
}

/** 获取路径的评价列表（评分 + 评论） */
export function getRouteReviews(routeId: number, params?: { page?: number; size?: number }) {
  return client.get<any, ApiResponse<RouteReview[]>>(`/routes/${routeId}/reviews`, { params });
}

/** 删除自己的路径（仅作者本人可删，连带轨迹/标注/评分；打卡仅解绑不删除）。 */
export function deleteRoute(routeId: number) {
  return client.delete<any, ApiResponse<void>>(`/routes/${routeId}`);
}

/** 设置自己路径的可见性：isPublic=false 后其他用户在作品路径列表/详情里看不到。 */
export function setRouteVisibility(routeId: number, isPublic: boolean) {
  return client.patch<any, ApiResponse<PilgrimRoute>>(
    `/routes/${routeId}/visibility`,
    { isPublic }
  );
}
