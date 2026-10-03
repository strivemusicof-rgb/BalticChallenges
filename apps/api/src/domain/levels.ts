export interface LevelRow {
  level: number;
  xpRequired: number;
  title: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  levelXp: number;
  nextLevelXp: number | null;
  /** 0..1 progress from the current level to the next. */
  progress: number;
}

/** `levels` must be sorted ascending by level. */
export function levelForXp(levels: readonly LevelRow[], xp: number): LevelInfo {
  let currentIndex = 0;
  for (let i = 0; i < levels.length; i += 1) {
    if (levels[i]!.xpRequired <= xp) currentIndex = i;
    else break;
  }
  const current = levels[currentIndex] ?? { level: 1, xpRequired: 0, title: 'Newcomer' };
  const next = levels[currentIndex + 1] ?? null;
  const span = next ? next.xpRequired - current.xpRequired : 0;
  return {
    level: current.level,
    title: current.title,
    xp,
    levelXp: current.xpRequired,
    nextLevelXp: next?.xpRequired ?? null,
    progress: next && span > 0 ? Math.min(1, (xp - current.xpRequired) / span) : 1,
  };
}
