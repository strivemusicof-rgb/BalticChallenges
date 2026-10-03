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

export type CheckInReason = 'mock_location' | 'low_accuracy' | 'too_far' | 'stale_fix' | 'impossible_speed' | 'late_offline_sync';

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
  /** Check-ins recorded offline may arrive this late; older ones are rejected. */
  maxOfflineAgeMs: 72 * 3_600_000,
  /** Offline check-ins older than this are accepted but reviewed, since device clocks can be changed. */
  offlineReviewAfterMs: 2 * 3_600_000,
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
  /** The fix was recorded without a connection and queued on the device. */
  offline?: boolean;
}): CheckInVerdict {
  const { fix, distanceM, radiusM, previous, now, offline = false } = input;
  const rules = VERIFICATION_RULES;
  const ageMs = now.getTime() - fix.deviceTime.getTime();

  if (fix.isMocked) {
    return {
      verdict: 'rejected',
      reason: 'mock_location',
      message: 'A mock location provider is active. Turn it off to verify challenges.',
    };
  }
  const tooOld = offline ? ageMs > rules.maxOfflineAgeMs : ageMs > rules.maxClockSkewMs;
  if (tooOld || -ageMs > rules.maxClockSkewMs) {
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

  if (offline && ageMs > rules.offlineReviewAfterMs) {
    return {
      verdict: 'flagged',
      reason: 'late_offline_sync',
      message: 'This check-in was saved offline and needs a quick review before XP is awarded.',
    };
  }

  return { verdict: 'accepted' };
}

export interface RoutePoint {
  lat: number;
  lng: number;
  /** Device time in milliseconds. */
  t: number;
  accuracyM: number;
}

export type RouteVerdict =
  | { verdict: 'accepted'; distanceM: number; durationS: number }
  | { verdict: 'rejected' | 'flagged'; reason: string; message: string; distanceM: number; durationS: number };

/**
 * Checks a recorded route: it must start near the place, cover the distance, and never move faster than
 * the challenge allows (cars and trains don't count). Noisy fixes are ignored instead of failing the walk.
 */
export function evaluateRoute(input: {
  points: RoutePoint[];
  start: { lat: number; lng: number };
  startRadiusM: number;
  minDistanceM: number;
  maxSpeedKmh: number;
}): RouteVerdict {
  const points = input.points.filter((point) => point.accuracyM <= 50).sort((a, b) => a.t - b.t);
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 10) {
    return { verdict: 'rejected', reason: 'too_short', message: 'Not enough GPS points were recorded.', distanceM: 0, durationS: 0 };
  }
  let distanceM = 0;
  let fastSegmentsM = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segment = haversineDistanceM(a, b);
    const hours = (b.t - a.t) / 3_600_000;
    if (segment < 3) continue; // standing still: GPS jitter
    const speedKmh = hours > 0 ? segment / 1000 / hours : Number.POSITIVE_INFINITY;
    if (speedKmh > input.maxSpeedKmh) fastSegmentsM += segment;
    else distanceM += segment;
  }
  const durationS = Math.round((last.t - first.t) / 1000);
  const round = Math.round(distanceM);
  if (haversineDistanceM(first, input.start) > input.startRadiusM) {
    return {
      verdict: 'rejected',
      reason: 'wrong_start',
      message: `Start within ${formatDistance(input.startRadiusM)} of the starting point.`,
      distanceM: round,
      durationS,
    };
  }
  if (distanceM < input.minDistanceM) {
    return {
      verdict: 'rejected',
      reason: 'too_short',
      message: `You covered ${formatDistance(distanceM)} of ${formatDistance(input.minDistanceM)}.`,
      distanceM: round,
      durationS,
    };
  }
  if (fastSegmentsM > distanceM * 0.25) {
    return {
      verdict: 'flagged',
      reason: 'too_fast',
      message: 'Part of this route looks too fast for walking or cycling, so it needs a quick review.',
      distanceM: round,
      durationS,
    };
  }
  return { verdict: 'accepted', distanceM: round, durationS };
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
