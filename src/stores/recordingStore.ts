import { create } from 'zustand';
import type { GeoPoint, Waypoint } from '@/types';

interface RecordingState {
  isRecording: boolean;
  trackPoints: GeoPoint[];
  waypoints: Omit<Waypoint, 'id'>[];
  startTime: number | null;

  startRecording: () => void;
  stopRecording: () => void;
  addTrackPoint: (point: GeoPoint) => void;
  addWaypoint: (waypoint: Omit<Waypoint, 'id'>) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording: false,
  trackPoints: [],
  waypoints: [],
  startTime: null,

  startRecording: () => {
    set({
      isRecording: true,
      trackPoints: [],
      waypoints: [],
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

  reset: () => {
    set({
      isRecording: false,
      trackPoints: [],
      waypoints: [],
      startTime: null,
    });
  },
}));
