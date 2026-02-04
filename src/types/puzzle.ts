export interface Puzzle {
  id: string;
  fen: string;
  moves: string[]; // Solution moves in UCI format
  rating: number;
  themes: string[];
  popularity: number;
}

export interface PuzzleStats {
  solved: number;
  failed: number;
  streak: number;
  bestStreak: number;
  solvedIds: string[];
  lastDailyDate: string | null;
  dailySolved: boolean;
}

export type PuzzleState = "playing" | "solved" | "failed";
