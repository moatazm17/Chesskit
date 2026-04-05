import { Puzzle } from "@/types/puzzle";

export type PuzzleType = "regular" | "brilliant" | "checkmate2" | "checkmate3";

const FILE_MAP: Record<PuzzleType, string> = {
  regular: "/data/puzzles.json",
  brilliant: "/data/brilliant.json",
  checkmate2: "/data/checkmate2.json",
  checkmate3: "/data/checkmate3.json",
};

const cache = new Map<PuzzleType, Puzzle[]>();

export async function fetchPuzzles(type: PuzzleType): Promise<Puzzle[]> {
  const cached = cache.get(type);
  if (cached) return cached;

  const res = await fetch(FILE_MAP[type]);
  const data: Puzzle[] = await res.json();
  cache.set(type, data);
  return data;
}

// ── Level system ──────────────────────────────────────────────

export interface LevelDef {
  level: number;
  name: string;
  nameAr: string;
  minRating: number;
  maxRating: number;
  required: number;
}

const LEVEL_META = [
  { name: "Beginner",     nameAr: "مبتدئ" },
  { name: "Elementary",   nameAr: "أساسي" },
  { name: "Intermediate", nameAr: "متوسط" },
  { name: "Advanced",     nameAr: "متقدم" },
  { name: "Expert",       nameAr: "خبير" },
  { name: "Master",       nameAr: "ماستر" },
  { name: "Grandmaster",  nameAr: "جراند ماستر" },
];

const LEVELS_REGULAR: LevelDef[] = [
  { level: 1, ...LEVEL_META[0], minRating: 0,    maxRating: 700,  required: 15 },
  { level: 2, ...LEVEL_META[1], minRating: 700,  maxRating: 1000, required: 20 },
  { level: 3, ...LEVEL_META[2], minRating: 1000, maxRating: 1300, required: 25 },
  { level: 4, ...LEVEL_META[3], minRating: 1300, maxRating: 1600, required: 30 },
  { level: 5, ...LEVEL_META[4], minRating: 1600, maxRating: 1900, required: 35 },
  { level: 6, ...LEVEL_META[5], minRating: 1900, maxRating: 2200, required: 20 },
  { level: 7, ...LEVEL_META[6], minRating: 2200, maxRating: 9999, required: 10 },
];

const LEVELS_BRILLIANT: LevelDef[] = [
  { level: 1, ...LEVEL_META[0], minRating: 800,  maxRating: 1050, required: 15 },
  { level: 2, ...LEVEL_META[1], minRating: 1050, maxRating: 1300, required: 20 },
  { level: 3, ...LEVEL_META[2], minRating: 1300, maxRating: 1550, required: 25 },
  { level: 4, ...LEVEL_META[3], minRating: 1550, maxRating: 1800, required: 30 },
  { level: 5, ...LEVEL_META[4], minRating: 1800, maxRating: 2050, required: 35 },
  { level: 6, ...LEVEL_META[5], minRating: 2050, maxRating: 2300, required: 20 },
  { level: 7, ...LEVEL_META[6], minRating: 2300, maxRating: 9999, required: 10 },
];

const LEVELS_CHECKMATE2: LevelDef[] = [
  { level: 1, ...LEVEL_META[0], minRating: 400,  maxRating: 650,  required: 15 },
  { level: 2, ...LEVEL_META[1], minRating: 650,  maxRating: 900,  required: 20 },
  { level: 3, ...LEVEL_META[2], minRating: 900,  maxRating: 1150, required: 25 },
  { level: 4, ...LEVEL_META[3], minRating: 1150, maxRating: 1400, required: 30 },
  { level: 5, ...LEVEL_META[4], minRating: 1400, maxRating: 1650, required: 35 },
  { level: 6, ...LEVEL_META[5], minRating: 1650, maxRating: 1900, required: 20 },
  { level: 7, ...LEVEL_META[6], minRating: 1900, maxRating: 9999, required: 6 },
];

const LEVELS_CHECKMATE3: LevelDef[] = [
  { level: 1, ...LEVEL_META[0], minRating: 400,  maxRating: 650,  required: 15 },
  { level: 2, ...LEVEL_META[1], minRating: 650,  maxRating: 900,  required: 20 },
  { level: 3, ...LEVEL_META[2], minRating: 900,  maxRating: 1150, required: 25 },
  { level: 4, ...LEVEL_META[3], minRating: 1150, maxRating: 1400, required: 30 },
  { level: 5, ...LEVEL_META[4], minRating: 1400, maxRating: 1650, required: 35 },
  { level: 6, ...LEVEL_META[5], minRating: 1650, maxRating: 1900, required: 20 },
  { level: 7, ...LEVEL_META[6], minRating: 1900, maxRating: 9999, required: 10 },
];

const LEVELS_MAP: Record<PuzzleType, LevelDef[]> = {
  regular: LEVELS_REGULAR,
  brilliant: LEVELS_BRILLIANT,
  checkmate2: LEVELS_CHECKMATE2,
  checkmate3: LEVELS_CHECKMATE3,
};

export function getLevels(type: PuzzleType): LevelDef[] {
  return LEVELS_MAP[type];
}

// Keep backward-compatible export for components that don't know the type
export const LEVELS = LEVELS_REGULAR;

export interface UserLevel {
  currentLevel: number;
  levelDef: LevelDef;
  solvedInLevel: number;
  requiredForNext: number;
  progress: number;
}

export function computeUserLevel(
  solvedIds: string[],
  allPuzzles: Puzzle[],
  levels: LevelDef[]
): UserLevel {
  const solvedSet = new Set(solvedIds);

  let maxSolvedRating = 0;
  for (const p of allPuzzles) {
    if (solvedSet.has(p.id) && p.rating > maxSolvedRating) {
      maxSolvedRating = p.rating;
    }
  }

  for (const lvl of levels) {
    const puzzlesInRange = allPuzzles.filter(
      (p) => p.rating >= lvl.minRating && p.rating < lvl.maxRating
    );

    if (puzzlesInRange.length === 0) continue;

    if (maxSolvedRating >= lvl.maxRating) continue;

    const solvedInRange = puzzlesInRange.filter((p) => solvedSet.has(p.id)).length;
    const required = Math.min(lvl.required, puzzlesInRange.length);

    if (solvedInRange < required) {
      return {
        currentLevel: lvl.level,
        levelDef: lvl,
        solvedInLevel: solvedInRange,
        requiredForNext: required,
        progress: solvedInRange / required,
      };
    }
  }

  const last = levels[levels.length - 1];
  const solvedInLast = allPuzzles.filter(
    (p) =>
      solvedSet.has(p.id) &&
      p.rating >= last.minRating &&
      p.rating < last.maxRating
  ).length;

  return {
    currentLevel: last.level,
    levelDef: last,
    solvedInLevel: solvedInLast,
    requiredForNext: last.required,
    progress: 1.0,
  };
}

export function getUnlockedLevels(
  solvedIds: string[],
  allPuzzles: Puzzle[],
  levels: LevelDef[]
): LevelDef[] {
  const solvedSet = new Set(solvedIds);
  const unlocked: LevelDef[] = [];

  let maxSolvedRating = 0;
  for (const p of allPuzzles) {
    if (solvedSet.has(p.id) && p.rating > maxSolvedRating) {
      maxSolvedRating = p.rating;
    }
  }

  for (const lvl of levels) {
    const puzzlesInRange = allPuzzles.filter(
      (p) => p.rating >= lvl.minRating && p.rating < lvl.maxRating
    );

    if (puzzlesInRange.length === 0) {
      if (maxSolvedRating >= lvl.maxRating) {
        unlocked.push(lvl);
      }
      continue;
    }

    unlocked.push(lvl);

    if (maxSolvedRating >= lvl.maxRating) continue;

    const solvedInRange = puzzlesInRange.filter((p) => solvedSet.has(p.id)).length;
    const required = Math.min(lvl.required, puzzlesInRange.length);
    if (solvedInRange < required) break;
  }

  return unlocked;
}

const LEVEL_I18N_KEYS: Record<number, string> = {
  1: "levelBeginner",
  2: "levelElementary",
  3: "levelIntermediate",
  4: "levelAdvanced",
  5: "levelExpert",
  6: "levelMaster",
  7: "levelGrandmaster",
};

export function getLevelNameKey(level: number): string {
  return LEVEL_I18N_KEYS[level] || "levelBeginner";
}

// ── Puzzle selection helpers ──────────────────────────────────

export function getRandomPuzzle(
  puzzles: Puzzle[],
  solvedIds: string[],
  levelDef: LevelDef
): Puzzle | null {
  const unsolved = puzzles.filter(
    (p) =>
      !solvedIds.includes(p.id) &&
      p.rating >= levelDef.minRating &&
      p.rating < levelDef.maxRating
  );

  if (unsolved.length === 0) return null;

  const sorted = [...unsolved].sort((a, b) => a.rating - b.rating);
  const poolSize = Math.min(5, sorted.length);
  return sorted[Math.floor(Math.random() * poolSize)];
}

const DAILY_POOL_SIZE = 400;

export function getDailyPuzzle(puzzles: Puzzle[]): Puzzle {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return puzzles[dayOfYear % DAILY_POOL_SIZE];
}

export function findPuzzleById(
  puzzles: Puzzle[],
  id: string
): Puzzle | undefined {
  return puzzles.find((p) => p.id === id);
}

export function getPuzzleByRating(
  puzzles: Puzzle[],
  minRating: number,
  maxRating: number,
  solvedIds: string[]
): Puzzle | null {
  const filtered = puzzles.filter(
    (p) =>
      p.rating >= minRating &&
      p.rating <= maxRating &&
      !solvedIds.includes(p.id)
  );
  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
