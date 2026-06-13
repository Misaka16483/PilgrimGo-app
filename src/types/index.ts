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
  episodeNumber?: number;
  sceneSeconds?: number;
  sceneTime?: string;
  origin?: string;
  originUrl?: string;
}

/** GPS 坐标点 */
export interface MapSpotItem {
  type: 'cluster' | 'spot';
  id?: number;
  count: number;
  latitude: number;
  longitude: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  name?: string;
  animeTitle?: string;
  sceneTime?: string;
  origin?: string;
}

export interface MapAnimeOption {
  id: number;
  title: string;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  latitude: number;
  longitude: number;
  count: number;
}

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

/** 路径关联观景点中，作者本人留下的实拍照 */
export interface RouteSpotAuthorPhoto {
  id: number;
  photoUrl: string;
  content?: string;
  createdAt?: string;
}

/** 路径关联的观景点（录制时勾选 / 实际打卡） */
export interface RouteSpot {
  spotId: number;
  name: string;
  /** Anitabi 动画截图原图 URL */
  animeImageUrl?: string;
  latitude?: number;
  longitude?: number;
  visitOrder: number;
  episodeNumber?: number;
  /** "mm:ss" 形式的场景时间 */
  sceneTime?: string;
  /** 作者本人在该观景点的打卡照片，可能多张；空数组表示作者未在此点拍照 */
  authorPhotos: RouteSpotAuthorPhoto[];
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
  /** 录制时关联的观景点列表（按 visit_order） */
  spots: RouteSpot[];
  distance: number;
  duration: number;
  rating: number;
  ratingCount: number;
  spotCount: number;
  /** 是否对其他用户可见；false 时仅作者本人可见 */
  isPublic: boolean;
  createdAt: string;
}

/** 打卡记录（对应后端 CheckInVO） */
export interface CheckIn {
  id: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  spotId: number;
  spotName: string;
  spotNameCn?: string;
  routeId?: number;
  photoUrl?: string;
  comparisonUrl?: string;
  content?: string;
  latitude?: number;
  longitude?: number;
  likeCount: number;
  liked: boolean;
  /** 是否对其他用户可见；false 时仅作者本人可见 */
  isPublic: boolean;
  createdAt: string;
}

/** 路径评价（对应后端 RouteReviewVO）：一条评分 + 可选文字评论 */
export interface RouteReview {
  id: number;
  routeId: number;
  userId: number;
  authorName: string;
  authorAvatar?: string;
  score: number;
  comment?: string;
  createdAt: string;
}

/** 提交评分/评价后的统计摘要（对应后端 RouteService.RatingSummary） */
export interface RouteRatingSummary {
  rating: number;
  ratingCount: number;
  myScore: number;
  myComment?: string;
}

/** 创建打卡请求体 */
export interface CreateCheckInRequest {
  spotId: number;
  routeId?: number;
  photoUrl?: string;
  comparisonUrl?: string;
  content?: string;
  latitude?: number;
  longitude?: number;
  /** 是否对其他用户可见，不传默认公开 */
  isPublic?: boolean;
}

/** 用户信息 */
export interface User {
  id: number;
  username: string;
  nickname: string;
  phone?: string;
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
