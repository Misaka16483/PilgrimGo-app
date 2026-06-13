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

export function getCachedAnimeOptions(params?: { limit?: number }) {
  return client.get<any, ApiResponse<Anime[]>>('/anime/cached', { params });
}

export function getExternalAnimeList(params: {
  page?: number;
  size?: number;
  keyword: string;
}) {
  return client.get<any, ApiResponse<PageResult<Anime>>>('/anime/external', { params });
}

/** 获取动画作品详情 */
export function getAnimeDetail(id: number) {
  return client.get<any, ApiResponse<Anime>>(`/anime/${id}`);
}

export function getExternalAnimeDetail(id: number) {
  return client.get<any, ApiResponse<Anime>>(`/anime/external/${id}`);
}

/** 一键收录外部作品（含全部取景地）到本地库，需登录 */
export function syncExternalAnime(id: number) {
  return client.post<any, ApiResponse<Anime>>(`/anime/${id}/sync`);
}

/** 获取动画作品的取景地列表 */
export function getAnimeSpots(animeId: number): Promise<ApiResponse<Spot[]>>;
export function getAnimeSpots(
  animeId: number,
  params: {
    page?: number;
    size?: number;
    sync?: boolean;
  }
): Promise<ApiResponse<PageResult<Spot>>>;
export function getAnimeSpots(
  animeId: number,
  params?: {
    page?: number;
    size?: number;
    sync?: boolean;
  }
) {
  const url = `/anime/${animeId}/spots`;
  if (params) {
    return client.get<any, ApiResponse<PageResult<Spot>>>(url, { params });
  }
  return client.get<any, ApiResponse<Spot[]>>(url);
}

export function getExternalAnimeSpots(
  animeId: number,
  params: {
    page?: number;
    size?: number;
  }
) {
  return client.get<any, ApiResponse<PageResult<Spot>>>(`/anime/external/${animeId}/spots`, { params });
}
