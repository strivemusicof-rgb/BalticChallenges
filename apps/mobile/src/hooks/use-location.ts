import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Location is optional everywhere in the app. This hook never prompts on its own;
 * call `request()` from an explicit user action (onboarding, "use my location", starting a challenge).
 */
export function useLocation() {
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [coords, setCoords] = useState<Coordinates | null>(null);

  const refresh = useCallback(async (): Promise<Coordinates | null> => {
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
      if (last) setCoords({ lat: last.coords.latitude, lng: last.coords.longitude });
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { lat: current.coords.latitude, lng: current.coords.longitude };
      setCoords(next);
      return next;
    } catch {
      // Location services off or timed out; callers fall back to non-location content.
      return null;
    }
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      const granted = status === Location.PermissionStatus.GRANTED;
      setPermission(granted ? 'granted' : status === Location.PermissionStatus.DENIED ? 'denied' : 'unknown');
      if (granted) void refresh();
    });
  }, [refresh]);

  const request = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === Location.PermissionStatus.GRANTED;
    setPermission(granted ? 'granted' : 'denied');
    if (granted) await refresh();
    return granted;
  }, [refresh]);

  return { permission, coords, request, refresh };
}

/** A fresh, high-accuracy fix used as proof when completing a challenge. */
export async function getVerificationFix() {
  const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
  return {
    lat: fix.coords.latitude,
    lng: fix.coords.longitude,
    accuracyM: fix.coords.accuracy ?? 9999,
    isMocked: fix.mocked ?? false,
    recordedAt: new Date(fix.timestamp).toISOString(),
  };
}
