import { TrainingLine, LineMastery } from "./openingTree";

// ── Mastery Level Thresholds ────────────────────────────────────────────────

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 1,  // 1 correct streak → Learning
  2: 3,  // 3 correct streak → Practiced
  3: 5,  // 5 correct streak → Learned
  4: 8,  // 8 correct streak → Mastered
};

export const MASTERY_LABELS: Record<number, string> = {
  0: "New",
  1: "Learning",
  2: "Practiced",
  3: "Learned",
  4: "Mastered",
};

export const MASTERY_COLORS: Record<number, string> = {
  0: "#9E9E9E",
  1: "#CD7F32",
  2: "#C0C0C0",
  3: "#FFD700",
  4: "#4CAF50",
};

const SESSION_SIZE = 12;
const REANALYZE_INTERVAL_MS = 24 * 60 * 60 * 1000;

// ── localStorage Keys ───────────────────────────────────────────────────────

function linesKey(username: string): string {
  return `chesskit_opening_lines_${username.toLowerCase()}`;
}

function masteryKey(username: string): string {
  return `chesskit_opening_mastery_${username.toLowerCase()}`;
}

function analyzedKey(username: string): string {
  return `chesskit_opening_analyzed_${username.toLowerCase()}`;
}

// ── Persistence ─────────────────────────────────────────────────────────────

export function loadCachedLines(username: string): TrainingLine[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(linesKey(username));
    if (!raw) return null;
    return JSON.parse(raw) as TrainingLine[];
  } catch {
    return null;
  }
}

export function saveCachedLines(username: string, lines: TrainingLine[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(linesKey(username), JSON.stringify(lines));
    localStorage.setItem(analyzedKey(username), Date.now().toString());
  } catch { /* ignore */ }
}

export function shouldReanalyze(username: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const ts = localStorage.getItem(analyzedKey(username));
    if (!ts) return true;
    return Date.now() - parseInt(ts, 10) > REANALYZE_INTERVAL_MS;
  } catch {
    return true;
  }
}

export function loadMastery(username: string): Record<string, LineMastery> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(masteryKey(username));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LineMastery>;
  } catch {
    return {};
  }
}

export function saveMastery(username: string, mastery: Record<string, LineMastery>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(masteryKey(username), JSON.stringify(mastery));
  } catch { /* ignore */ }
}

// ── Mastery Update ──────────────────────────────────────────────────────────

function computeLevel(streak: number): 0 | 1 | 2 | 3 | 4 {
  if (streak >= LEVEL_THRESHOLDS[4]) return 4;
  if (streak >= LEVEL_THRESHOLDS[3]) return 3;
  if (streak >= LEVEL_THRESHOLDS[2]) return 2;
  if (streak >= LEVEL_THRESHOLDS[1]) return 1;
  return 0;
}

export function updateMastery(
  mastery: Record<string, LineMastery>,
  lineId: string,
  wasCorrect: boolean
): Record<string, LineMastery> {
  const current = mastery[lineId] ?? {
    correctStreak: 0,
    level: 0 as const,
    lastPracticed: 0,
    totalAttempts: 0,
  };

  const newStreak = wasCorrect ? current.correctStreak + 1 : 0;
  const newLevel = wasCorrect
    ? computeLevel(newStreak)
    : (Math.max(0, current.level - 1) as 0 | 1 | 2 | 3 | 4);

  return {
    ...mastery,
    [lineId]: {
      correctStreak: newStreak,
      level: newLevel,
      lastPracticed: Date.now(),
      totalAttempts: current.totalAttempts + 1,
    },
  };
}

// ── Session Queue Builder ───────────────────────────────────────────────────

export function buildSessionQueue(
  lines: TrainingLine[],
  mastery: Record<string, LineMastery>
): string[] {
  const scored = lines
    .filter((l) => {
      const m = mastery[l.id];
      return !m || m.level < 4;
    })
    .map((l) => {
      const m = mastery[l.id];
      const level = m?.level ?? 0;
      const lastPracticed = m?.lastPracticed ?? 0;
      return { id: l.id, level, lastPracticed };
    });

  scored.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.lastPracticed - b.lastPracticed;
  });

  return scored.slice(0, SESSION_SIZE).map((s) => s.id);
}

// ── Stats ───────────────────────────────────────────────────────────────────

export function getMasteryStats(
  lines: TrainingLine[],
  mastery: Record<string, LineMastery>
): { total: number; mastered: number; learned: number; avgLevel: number } {
  const total = lines.length;
  let mastered = 0;
  let learned = 0;
  let levelSum = 0;

  for (const line of lines) {
    const m = mastery[line.id];
    const level = m?.level ?? 0;
    levelSum += level;
    if (level >= 4) mastered++;
    if (level >= 3) learned++;
  }

  return {
    total,
    mastered,
    learned,
    avgLevel: total > 0 ? levelSum / total : 0,
  };
}
