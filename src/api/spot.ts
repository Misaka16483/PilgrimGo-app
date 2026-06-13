import client from './client';
import type { Spot, ApiResponse, MapAnimeOption, MapBounds, MapSpotItem } from '@/types';

export function getMapSpotItems(params: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  zoom: number;
  limit?: number;
  animeId?: number;
}) {
  return client.get<any, ApiResponse<MapSpotItem[]>>('/spots/map', { params });
}

export function getSpotDetail(id: number) {
  return client.get<any, ApiResponse<Spot>>(`/spots/${id}`);
}

export function getMapAnimeOptions(params?: { limit?: number }) {
  return client.get<any, ApiResponse<MapAnimeOption[]>>('/spots/map/anime', { params });
}

export function getMapAnimeBounds(animeId: number) {
  return client.get<any, ApiResponse<MapBounds>>(`/spots/map/anime/${animeId}/bounds`);
}
