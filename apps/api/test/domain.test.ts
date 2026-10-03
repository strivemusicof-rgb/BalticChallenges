import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hourInWindow, isRuleMet, ruleProgress, type PlayerProgress } from '../src/domain/achievements.js';
import { levelForXp } from '../src/domain/levels.js';
import { evaluateCheckIn, evaluateRoute, haversineDistanceM } from '../src/domain/verification.js';

const now = new Date('2026-10-02T12:00:00Z');
const cesis = { lat: 57.313, lng: 25.2705 };

function fix(overrides: Partial<Parameters<typeof evaluateCheckIn>[0]['fix']> = {}) {
  return { ...cesis, accuracyM: 10, isMocked: false, deviceTime: now, ...overrides };
}

describe('haversineDistanceM', () => {
  it('measures Riga to Vilnius at roughly 262 km', () => {
    const km = haversineDistanceM({ lat: 56.9496, lng: 24.1052 }, { lat: 54.6872, lng: 25.2797 }) / 1000;
    assert.ok(km > 255 && km < 270, `got ${km}`);
  });
});

describe('evaluateCheckIn', () => {
  it('accepts a precise fix inside the radius', () => {
    assert.deepEqual(evaluateCheckIn({ fix: fix(), distanceM: 80, radiusM: 150, previous: null, now }), {
      verdict: 'accepted',
    });
  });

  it('adds at most 50 m of GPS accuracy to the radius', () => {
    const inside = evaluateCheckIn({ fix: fix({ accuracyM: 120 }), distanceM: 199, radiusM: 150, previous: null, now });
    const outside = evaluateCheckIn({ fix: fix({ accuracyM: 120 }), distanceM: 201, radiusM: 150, previous: null, now });
    assert.equal(inside.verdict, 'accepted');
    assert.equal(outside.verdict, 'rejected');
  });

  it('rejects mock locations, vague fixes and stale readings', () => {
    const cases = [
      [fix({ isMocked: true }), 'mock_location'],
      [fix({ accuracyM: 400 }), 'low_accuracy'],
      [fix({ deviceTime: new Date(now.getTime() - 30 * 60 * 1000) }), 'stale_fix'],
    ] as const;
    for (const [input, reason] of cases) {
      const result = evaluateCheckIn({ fix: input, distanceM: 10, radiusM: 150, previous: null, now });
      assert.equal(result.verdict, 'rejected');
      assert.equal('reason' in result ? result.reason : null, reason);
    }
  });

  it('flags teleporting from Tallinn to Cēsis in 10 minutes', () => {
    const previous = { lat: 59.437, lng: 24.745, at: new Date(now.getTime() - 10 * 60 * 1000) };
    const result = evaluateCheckIn({ fix: fix(), distanceM: 10, radiusM: 150, previous, now });
    assert.equal(result.verdict, 'flagged');
  });

  it('allows a realistic drive from Riga to Cēsis in 1.5 hours', () => {
    const previous = { lat: 56.9496, lng: 24.1052, at: new Date(now.getTime() - 90 * 60 * 1000) };
    assert.equal(evaluateCheckIn({ fix: fix(), distanceM: 10, radiusM: 150, previous, now }).verdict, 'accepted');
  });
});

describe('levelForXp', () => {
  const levels = [
    { level: 1, xpRequired: 0, title: 'Newcomer' },
    { level: 2, xpRequired: 100, title: 'Newcomer' },
    { level: 3, xpRequired: 250, title: 'Newcomer' },
  ];

  it('places XP between level thresholds', () => {
    const info = levelForXp(levels, 175);
    assert.equal(info.level, 2);
    assert.equal(info.nextLevelXp, 250);
    assert.equal(info.progress, 0.5);
  });

  it('caps at the max level', () => {
    const info = levelForXp(levels, 10_000);
    assert.equal(info.level, 3);
    assert.equal(info.nextLevelXp, null);
    assert.equal(info.progress, 1);
  });
});

describe('achievement rules', () => {
  const progress: PlayerProgress = {
    completions: [
      { categoryId: 'castles', parentCategoryId: 'history', country: 'LV', city: 'Cēsis', localHour: 6 },
      { categoryId: 'castles', parentCategoryId: 'history', country: 'LT', city: 'Trakai', localHour: 14 },
      { categoryId: 'beaches', parentCategoryId: 'coast', country: 'EE', city: 'Pärnu', localHour: 23 },
    ],
    completedCollectionSlugs: new Set(['discover-latvia']),
    unlockedAchievementIds: new Set(['latvia-explorer']),
    longestStreak: 7,
    goalsCompleted: { weekly: 3, monthly: 0 },
  };

  it('handles hour windows that wrap past midnight', () => {
    assert.ok(hourInWindow(23, 21, 3));
    assert.ok(hourInWindow(2, 21, 3));
    assert.ok(!hourInWindow(3, 21, 3));
    assert.ok(isRuleMet({ type: 'completed_in_hours', from: 4, to: 8, count: 1 }, progress));
    assert.ok(isRuleMet({ type: 'completed_in_hours', from: 21, to: 3, count: 1 }, progress));
  });

  it('evaluates streaks and goal counts', () => {
    assert.ok(isRuleMet({ type: 'streak_days', count: 7 }, progress));
    assert.ok(!isRuleMet({ type: 'streak_days', count: 30 }, progress));
    assert.deepEqual(ruleProgress({ type: 'goals_completed', period: 'weekly', count: 4 }, progress), {
      current: 3,
      target: 4,
    });
  });

  it('counts child categories toward their parent', () => {
    assert.deepEqual(ruleProgress({ type: 'category_completed', category: 'history', count: 5 }, progress), {
      current: 2,
      target: 5,
    });
  });

  it('evaluates countries, collections and achievement chains', () => {
    assert.ok(isRuleMet({ type: 'countries_visited', count: 3 }, progress));
    assert.ok(isRuleMet({ type: 'collection_completed', collection: 'discover-latvia' }, progress));
    assert.ok(
      !isRuleMet(
        { type: 'achievements_unlocked', achievements: ['latvia-explorer', 'lithuania-explorer'] },
        progress,
      ),
    );
  });
});

describe('offline check-ins', () => {
  const base = { distanceM: 10, radiusM: 100, previous: null, now };
  it('accepts a fix queued an hour ago', () => {
    const deviceTime = new Date(now.getTime() - 3_600_000);
    assert.equal(evaluateCheckIn({ ...base, fix: fix({ deviceTime }), offline: true }).verdict, 'accepted');
  });
  it('flags a fix queued a day ago and rejects one older than three days', () => {
    const day = new Date(now.getTime() - 24 * 3_600_000);
    const old = new Date(now.getTime() - 80 * 3_600_000);
    assert.equal(evaluateCheckIn({ ...base, fix: fix({ deviceTime: day }), offline: true }).verdict, 'flagged');
    assert.equal(evaluateCheckIn({ ...base, fix: fix({ deviceTime: old }), offline: true }).verdict, 'rejected');
  });
  it('still rejects a stale fix that was not queued offline', () => {
    const deviceTime = new Date(now.getTime() - 3_600_000);
    assert.equal(evaluateCheckIn({ ...base, fix: fix({ deviceTime }) }).verdict, 'rejected');
  });
});

describe('route verification', () => {
  // A straight walk east from Cēsis: ~70 m every minute.
  const walk = (count: number, stepDeg = 0.001, stepMs = 60_000) =>
    Array.from({ length: count }, (_, i) => ({ lat: cesis.lat, lng: cesis.lng + i * stepDeg, t: i * stepMs, accuracyM: 8 }));
  const rules = { start: cesis, startRadiusM: 300, maxSpeedKmh: 20 };

  it('accepts a long enough walk that starts at the place', () => {
    const result = evaluateRoute({ ...rules, points: walk(60), minDistanceM: 3000 });
    assert.equal(result.verdict, 'accepted');
    assert.ok(result.distanceM > 3000);
  });
  it('rejects a walk that is too short or starts elsewhere', () => {
    assert.equal(evaluateRoute({ ...rules, points: walk(20), minDistanceM: 3000 }).verdict, 'rejected');
    const away = walk(60).map((p) => ({ ...p, lat: p.lat + 0.1 }));
    assert.equal(evaluateRoute({ ...rules, points: away, minDistanceM: 3000 }).verdict, 'rejected');
  });
  it('does not count driving towards the distance', () => {
    const drive = walk(60, 0.01); // ~600 m per minute = 36 km/h
    const result = evaluateRoute({ ...rules, points: drive, minDistanceM: 3000 });
    assert.equal(result.verdict, 'rejected');
    assert.equal(result.distanceM, 0);
  });
});
