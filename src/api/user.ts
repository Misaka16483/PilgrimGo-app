import client from './client';
import type { ApiResponse, PageResult } from '@/types';

/**
 * 用户巡礼统计
 */
export interface UserStats {
  totalAnimes: number;
  totalSpots: number;
  totalRoutes: number;
  totalDistance: number;
  totalDuration: number;
  currentStreak: number;
  monthlyStats: {
    month: string;
    checkInCount: number;
    distance: number;
  }[];
}

/**
 * 打卡记录（扩展类型）
 */
export interface CheckInRecord {
  id: number;
  spotId: number;
  animeId: number;
  animeTitle: string;
  spotName: string;
  spotImageUrl: string;
  photoUrl: string;
  comparisonUrl?: string;
  content?: string;
  latitude?: number;
  longitude?: number;
  likeCount: number;
  createdAt: string;
}

/**
 * 路径记录（扩展类型）
 */
export interface RouteRecord {
  id: number;
  animeId: number;
  animeTitle: string;
  animeCoverUrl?: string;
  authorId: number;
  authorName: string;
  title: string;
  description?: string;
  difficulty?: string;
  estimatedMinutes?: number;
  distance?: number;
  rating: number;
  ratingCount: number;
  spotCount: number;
  status: string;
  createdAt: string;
}

/** 获取用户巡礼统计 */
export function getUserStats() {
  return client.get<any, ApiResponse<UserStats>>('/user/me/stats');
}

/** 获取我的路径列表 */
export function getMyRoutes(params?: {
  page?: number;
  size?: number;
}) {
  return client.get<any, ApiResponse<PageResult<RouteRecord>>>(
    '/user/me/routes',
    { params }
  );
}

/** 获取我的打卡记录 */
export function getMyCheckIns(params?: {
  page?: number;
  size?: number;
}) {
  return client.get<any, ApiResponse<PageResult<CheckInRecord>>>(
    '/user/me/checkins',
    { params }
  );
}
