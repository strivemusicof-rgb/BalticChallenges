import { z } from 'zod';

export const AchievementRuleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('challenges_completed'), count: z.number().int().positive() }),
  z.object({ type: z.literal('category_completed'), category: z.string(), count: z.number().int().positive() }),
  z.object({ type: z.literal('countries_visited'), count: z.number().int().min(1).max(3) }),
  z.object({ type: z.literal('cities_visited'), count: z.number().int().positive() }),
  z.object({ type: z.literal('collection_completed'), collection: z.string() }),
  z.object({ type: z.literal('achievements_unlocked'), achievements: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('streak_days'), count: z.number().int().positive() }),
  // Local (Europe/Riga) hour window; `from` > `to` wraps past midnight.
  z.object({
    type: z.literal('completed_in_hours'),
    from: z.number().int().min(0).max(23),
    to: z.number().int().min(0).max(24),
    count: z.number().int().positive(),
  }),
  z.object({ type: z.literal('goals_completed'), period: z.enum(['weekly', 'monthly']), count: z.number().int().positive() }),
]);

export type AchievementRule = z.infer<typeof AchievementRuleSchema>;

export interface CompletionRecord {
  categoryId: string;
  parentCategoryId: string | null;
  country: string | null;
  city: string | null;
  /** Hour of completion in Europe/Riga, 0–23. */
  localHour: number;
}

export interface PlayerProgress {
  completions: CompletionRecord[];
  completedCollectionSlugs: Set<string>;
  unlockedAchievementIds: Set<string>;
  longestStreak: number;
  goalsCompleted: { weekly: number; monthly: number };
}

export interface RuleProgress {
  current: number;
  target: number;
}

export function hourInWindow(hour: number, from: number, to: number): boolean {
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

export function ruleProgress(rule: AchievementRule, progress: PlayerProgress): RuleProgress {
  const { completions } = progress;
  switch (rule.type) {
    case 'challenges_completed':
      return { current: completions.length, target: rule.count };
    case 'category_completed':
      return {
        current: completions.filter((c) => c.categoryId === rule.category || c.parentCategoryId === rule.category)
          .length,
        target: rule.count,
      };
    case 'countries_visited':
      return { current: new Set(completions.map((c) => c.country).filter(Boolean)).size, target: rule.count };
    case 'cities_visited':
      return {
        current: new Set(completions.map((c) => c.city?.toLocaleLowerCase()).filter(Boolean)).size,
        target: rule.count,
      };
    case 'collection_completed':
      return { current: progress.completedCollectionSlugs.has(rule.collection) ? 1 : 0, target: 1 };
    case 'achievements_unlocked':
      return {
        current: rule.achievements.filter((id) => progress.unlockedAchievementIds.has(id)).length,
        target: rule.achievements.length,
      };
    case 'streak_days':
      return { current: progress.longestStreak, target: rule.count };
    case 'completed_in_hours':
      return {
        current: completions.filter((c) => hourInWindow(c.localHour, rule.from, rule.to)).length,
        target: rule.count,
      };
    case 'goals_completed':
      return { current: progress.goalsCompleted[rule.period], target: rule.count };
  }
}

export function isRuleMet(rule: AchievementRule, progress: PlayerProgress): boolean {
  const { current, target } = ruleProgress(rule, progress);
  return current >= target;
}
