export interface LocationFix {
  lat: number;
  lng: number;
  accuracyM: number;
  isMocked: boolean;
  deviceTime: Date;
}

export interface PreviousCheckIn {
  lat: number;
  lng: number;
  at: Date;
}

export type CheckInVerdict =
  | { verdict: 'accepted' }
  | { verdict: 'rejected' | 'flagged'; reason: CheckInReason; message: string };

export type CheckInReason = 'mock_location' | 'low_accuracy' | 'too_far' | 'stale_fix' | 'impossible_speed';

export const VERIFICATION_RULES = {
  /** Fixes worse than this are too vague to prove presence. */
  maxAccuracyM: 150,
  /** At most this much of the reported accuracy is added to the place radius. */
  maxAccuracyAllowanceM: 50,
  /** Device time may differ from server time by this much. */
  maxClockSkewMs: 10 * 60 * 1000,
  /** Travel between check-ins faster than this is flagged for review. */
  maxPlausibleSpeedKmh: 250,
  /** Short hops are ignored by the speed check, since GPS jitter inflates speed over tiny distances. */
  minDistanceForSpeedCheckM: 20_000,
} as const;

const EARTH_RADIUS_M = 6_371_008.8;

export function haversineDistanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function evaluateCheckIn(input: {
  fix: LocationFix;
  distanceM: number;
  radiusM: number;
  previous: PreviousCheckIn | null;
  now: Date;
}): CheckInVerdict {
  const { fix, distanceM, radiusM, previous, now } = input;
  const rules = VERIFICATION_RULES;

  if (fix.isMocked) {
    return {
      verdict: 'rejected',
      reason: 'mock_location',
      message: 'A mock location provider is active. Turn it off to verify challenges.',
    };
  }
  if (Math.abs(now.getTime() - fix.deviceTime.getTime()) > rules.maxClockSkewMs) {
    return {
      verdict: 'rejected',
      reason: 'stale_fix',
      message: 'This location reading is too old. Refresh your location and try again.',
    };
  }
  if (fix.accuracyM > rules.maxAccuracyM) {
    return {
      verdict: 'rejected',
      reason: 'low_accuracy',
      message: `GPS accuracy is ${Math.round(fix.accuracyM)} m. Move to open sky and try again.`,
    };
  }

  const allowedM = radiusM + Math.min(fix.accuracyM, rules.maxAccuracyAllowanceM);
  if (distanceM > allowedM) {
    return {
      verdict: 'rejected',
      reason: 'too_far',
      message: `You are ${formatDistance(distanceM)} away. Get within ${formatDistance(radiusM)} to complete.`,
    };
  }

  if (previous) {
    const travelledM = haversineDistanceM(previous, fix);
    const hours = (fix.deviceTime.getTime() - previous.at.getTime()) / 3_600_000;
    if (travelledM >= rules.minDistanceForSpeedCheckM) {
      const speedKmh = hours > 0 ? travelledM / 1000 / hours : Number.POSITIVE_INFINITY;
      if (speedKmh > rules.maxPlausibleSpeedKmh) {
        return {
          verdict: 'flagged',
          reason: 'impossible_speed',
          message: 'This check-in needs a quick review before XP is awarded.',
        };
      }
    }
  }

  return { verdict: 'accepted' };
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
