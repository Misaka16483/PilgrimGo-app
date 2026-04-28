import client from './client';
import type { Anime, Spot, PageResult, ApiResponse } from '@/types';

/** 获取动画作品列表 */
export function getAnimeList(params: {
  page?: number;
  size?: number;
  keyword?: string;
  region?: string;
}) {
  return client.get<any, ApiResponse<PageResult<Anime>>>('/anime', { params });
}

/** 获取动画作品详情 */
export function getAnimeDetail(id: number) {
  return client.get<any, ApiResponse<Anime>>(`/anime/${id}`);
}

/** 获取动画作品的取景地列表 */
export function getAnimeSpots(animeId: number) {
  return client.get<any, ApiResponse<Spot[]>>(`/anime/${animeId}/spots`);
}
