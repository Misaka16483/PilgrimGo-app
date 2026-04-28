import { useEffect, useState, useRef } from 'react';
import * as Location from 'expo-location';
import type { GeoPoint } from '@/types';

/**
 * 获取当前位置（一次性）
 */
export function useCurrentLocation() {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('需要位置权限才能使用巡礼功能');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude ?? undefined,
        timestamp: loc.timestamp,
      });
    })();
  }, []);

  return { location, error };
}

/**
 * 持续监听位置变化（用于路径录制和跟走导航）
 */
export function useLocationTracking(
  enabled: boolean,
  onLocationUpdate: (point: GeoPoint) => void,
  distanceInterval: number = 5
) {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval,
          timeInterval: 1000,
        },
        (loc) => {
          onLocationUpdate({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude ?? undefined,
            timestamp: loc.timestamp,
          });
        }
      );
    })();

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [enabled]);
}
