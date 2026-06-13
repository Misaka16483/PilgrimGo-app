import client from './client';
import type { ApiResponse } from '@/types';

export function generateFusion(animeUrl: string, realUrl: string) {
  return client.post<any, ApiResponse<{ fusionImage: string }>>('/fusion', {
    animeUrl,
    realUrl,
  }, { timeout: 120000 });
}
