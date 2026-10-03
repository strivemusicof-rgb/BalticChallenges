import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { distanceM } from '@/lib/geo';

/** Watches the device position while `active` and reports the distance to `target`. */
export function useLiveDistance(place: { lat: number; lng: number } | null, active: boolean) {
  const [distance, setDistance] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const lat = place?.lat;
  const lng = place?.lng;

  useEffect(() => {
    if (!active || lat === undefined || lng === undefined) return;
    const target = { lat, lng };
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED || cancelled) return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
        (position) => {
          setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
          setDistance(distanceM({ lat: position.coords.latitude, lng: position.coords.longitude }, target));
          setAccuracy(position.coords.accuracy ?? null);
        },
      );
      if (cancelled) subscription.remove();
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active, lat, lng]);

  return { distance, accuracy, coords };
}
