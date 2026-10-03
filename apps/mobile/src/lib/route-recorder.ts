import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { distanceM } from '@/lib/geo';

export interface RoutePoint {
  lat: number;
  lng: number;
  /** Device time in milliseconds. */
  t: number;
  accuracyM: number;
}

/**
 * Records a walk while the screen is open (foreground GPS, about every 5 s or 10 m).
 * Distance ignores jitter below 3 m and fixes worse than 50 m, like the server does.
 */
export function useRouteRecorder() {
  const [recording, setRecording] = useState(false);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const last = useRef<RoutePoint | null>(null);

  const stop = useCallback(() => {
    subscription.current?.remove();
    subscription.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return false;
    setPoints([]);
    setDistance(0);
    last.current = null;
    setStartedAt(Date.now());
    setRecording(true);
    subscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10, timeInterval: 5000 },
      (position) => {
        const point: RoutePoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          t: position.timestamp,
          accuracyM: position.coords.accuracy ?? 999,
        };
        setPoints((current) => [...current, point]);
        if (point.accuracyM > 50) return;
        const previous = last.current;
        if (previous) {
          const step = distanceM(previous, point);
          if (step >= 3) setDistance((current) => current + step);
        }
        last.current = point;
      },
    );
    return true;
  }, []);

  useEffect(() => () => subscription.current?.remove(), []);

  return { recording, points, distance, startedAt, start, stop };
}
