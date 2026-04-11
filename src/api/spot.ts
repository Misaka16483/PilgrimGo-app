import client from './client';
import type { Spot, ApiResponse } from '@/types';

/** 获取附近的取景地 */
export function getNearbySpots(params: {
  latitude: number;
  longitude: number;
  radius?: number;
}) {
  return client.get<any, ApiResponse<Spot[]>>('/spots/nearby', { params });
}

/** 获取取景地详情 */
export function getSpotDetail(id: number) {
  return client.get<any, ApiResponse<Spot>>(`/spots/${id}`);
}
