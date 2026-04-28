/** 动画作品 */
export interface Anime {
  id: number;
  title: string;
  titleJp?: string;
  coverUrl: string;
  spotCount: number;
  region?: string;
}

/** 取景地 */
export interface Spot {
  id: number;
  animeId: number;
  animeTitle: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  animeImageUrl: string;
  realImageUrl?: string;
  episode?: string;
}

/** GPS 坐标点 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
}

/** 路径转折点标注 */
export interface Waypoint {
  id: number;
  location: GeoPoint;
  imageUrl: string;
  description: string;
  orderIndex: number;
}

/** 巡礼路径 */
export interface PilgrimRoute {
  id: number;
  animeId: number;
  animeTitle: string;
  authorId: number;
  authorName: string;
  title: string;
  description?: string;
  trackPoints: GeoPoint[];
  waypoints: Waypoint[];
  distance: number;
  duration: number;
  rating: number;
  ratingCount: number;
  spotCount: number;
  createdAt: string;
}

/** 打卡记录 */
export interface CheckIn {
  id: number;
  spotId: number;
  spot: Spot;
  realImageUrl: string;
  comparisonImageUrl?: string;
  content?: string;
  createdAt: string;
}

/** 用户信息 */
export interface User {
  id: number;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  checkInCount: number;
  routeCount: number;
}

/** 通用分页响应 */
export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}

/** 通用 API 响应 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
