import { create } from 'zustand';
import type { GeoPoint, Spot, Waypoint } from '@/types';

interface RecordingState {
  isRecording: boolean;
  /** 当前录制归属的作品 ID。可由路由参数 ?animeId= 注入，或上传弹窗里手填。 */
  animeId: number | null;
  trackPoints: GeoPoint[];
  waypoints: Omit<Waypoint, 'id'>[];
  /** 开始录制前从作品取景地列表中选择的目标取景地（用于地图标记 + 邻近提醒） */
  targetSpots: Spot[];
  /** 已经触发过邻近提醒的 spot id，避免重复弹窗 */
  alertedSpotIds: number[];
  /** 本次录制中通过 /ar/compare 完成的打卡 id，上传路径时一并回填 route_id */
  checkInIds: number[];
  startTime: number | null;

  startRecording: () => void;
  stopRecording: () => void;
  addTrackPoint: (point: GeoPoint) => void;
  addWaypoint: (waypoint: Omit<Waypoint, 'id'>) => void;
  setAnimeId: (animeId: number | null) => void;
  setTargetSpots: (spots: Spot[]) => void;
  markSpotAlerted: (spotId: number) => void;
  addCheckInId: (id: number) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  animeId: null,
  trackPoints: [],
  waypoints: [],
  targetSpots: [],
  alertedSpotIds: [],
  checkInIds: [],
  startTime: null,

  startRecording: () => {
    // 开录时清空轨迹/标注/已提醒标记/打卡缓存，但保留预选的 targetSpots
    set({
      isRecording: true,
      trackPoints: [],
      waypoints: [],
      alertedSpotIds: [],
      checkInIds: [],
      startTime: Date.now(),
    });
  },

  stopRecording: () => {
    set({ isRecording: false });
  },

  addTrackPoint: (point) => {
    set((state) => ({
      trackPoints: [...state.trackPoints, point],
    }));
  },

  addWaypoint: (waypoint) => {
    set((state) => ({
      waypoints: [...state.waypoints, waypoint],
    }));
  },

  setAnimeId: (animeId) => {
    // 切换作品时把预选的取景地一并清空，避免跨作品残留
    set((state) => ({
      animeId,
      targetSpots: state.animeId === animeId ? state.targetSpots : [],
      alertedSpotIds: state.animeId === animeId ? state.alertedSpotIds : [],
    }));
  },

  setTargetSpots: (spots) => {
    set({ targetSpots: spots });
  },

  markSpotAlerted: (spotId) => {
    set((state) =>
      state.alertedSpotIds.includes(spotId)
        ? state
        : { alertedSpotIds: [...state.alertedSpotIds, spotId] }
    );
  },

  addCheckInId: (id) => {
    set((state) =>
      state.checkInIds.includes(id)
        ? state
        : { checkInIds: [...state.checkInIds, id] }
    );
  },

  reset: () => {
    set({
      isRecording: false,
      animeId: null,
      trackPoints: [],
      waypoints: [],
      targetSpots: [],
      alertedSpotIds: [],
      checkInIds: [],
      startTime: null,
    });
  },
}));