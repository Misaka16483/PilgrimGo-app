import client from './client';
import type { ApiResponse, CheckIn, CreateCheckInRequest } from '@/types';

export function getFeed(params: {
  page: number;
  size: number;
  userLat?: number;
  userLon?: number;
  sort?: 'time' | 'distance';
}) {
  return client.get<any, ApiResponse<CheckIn[]>>('/checkins/feed', { params });
}

export function getSpotCheckIns(spotId: number, params: { page: number; size: number }) {
  return client.get<any, ApiResponse<CheckIn[]>>('/checkins', { params: { spotId, ...params } });
}

/** "我的打卡"：当前登录用户自己发布的打卡列表（需登录）。 */
export function getMyCheckIns(params: { page: number; size: number }) {
  return client.get<any, ApiResponse<CheckIn[]>>('/checkins/mine', { params });
}

export function createCheckIn(body: CreateCheckInRequest) {
  return client.post<any, ApiResponse<CheckIn>>('/checkins', body);
}

export function toggleLike(checkInId: number) {
  return client.post<any, ApiResponse<{ liked: boolean; likeCount: number }>>(
    `/checkins/${checkInId}/like`
  );
}

/** 删除自己的打卡（仅作者本人可删，连带点赞记录）。 */
export function deleteCheckIn(checkInId: number) {
  return client.delete<any, ApiResponse<void>>(`/checkins/${checkInId}`);
}

/** 设置自己打卡的可见性：isPublic=false 后其他用户在动态/取景地列表里看不到。 */
export function setCheckInVisibility(checkInId: number, isPublic: boolean) {
  return client.patch<any, ApiResponse<CheckIn>>(
    `/checkins/${checkInId}/visibility`,
    { isPublic }
  );
}
