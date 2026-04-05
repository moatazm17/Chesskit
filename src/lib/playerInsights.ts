import { ChessComGame } from "@/types/chessCom";

// ── Types ──────────────────────────────────────────────────────────────────

export interface OpeningStats {
  name: string;
  eco: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface RatingPoint {
  date: number;
  rating: number;
  label: string;
}

export interface LossBreakdown {
  checkmate: number;
  resignation: number;
  timeout: number;
  abandoned: number;
  other: number;
  total: number;
}

export interface ColorPerformance {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
}

export interface TimeControlPerformance {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
}

export interface PlayerInsightsData {
  totalGames: number;
  overallWinRate: number;
  ratingHistory: RatingPoint[];
  openingsAsWhite: OpeningStats[];
  openingsAsBlack: OpeningStats[];
  lossBreakdown: LossBreakdown;
  whitePerformance: ColorPerformance;
  blackPerformance: ColorPerformance;
  avgMovesInWins: number;
  avgMovesInLosses: number;
  timeControlPerformance: TimeControlPerformance[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractPgnHeader(pgn: string, header: string): string | null {
  const regex = new RegExp(`\\[${header}\\s+"(.*?)"\\]`);
  const match = pgn.match(regex);
  return match ? match[1] : null;
}

function extractOpeningName(pgn: string): string | null {
  const opening = extractPgnHeader(pgn, "Opening");
  if (opening) return opening;

  const ecoUrl = extractPgnHeader(pgn, "ECOUrl");
  if (ecoUrl) {
    const slug = ecoUrl.split("/").pop();
    if (slug) return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

function getPlayerColor(
  game: ChessComGame,
  username: string
): "white" | "black" {
  return game.white.username.toLowerCase() === username.toLowerCase()
    ? "white"
    : "black";
}

function getGameResult(
  game: ChessComGame,
  username: string
): "win" | "loss" | "draw" {
  const color = getPlayerColor(game, username);
  const player = color === "white" ? game.white : game.black;
  const result = player.result?.toLowerCase() ?? "";

  if (result === "win") return "win";
  if (
    result === "checkmated" ||
    result === "timeout" ||
    result === "resigned" ||
    result === "abandoned" ||
    result === "lose"
  )
    return "loss";
  return "draw";
}

function countMoves(pgn: string): number {
  const moveSection = pgn.split(/\n\n/)?.[1] ?? pgn;
  const moves = moveSection.match(/\d+\.\s/g);
  return moves ? moves.length : 0;
}

function getTimeControlCategory(timeControl: string): string {
  if (!timeControl) return "Other";
  const [basePart] = timeControl.split("+");
  const base = Number(basePart);
  if (isNaN(base)) return "Daily";
  if (base < 180) return "Bullet";
  if (base < 600) return "Blitz";
  if (base < 1800) return "Rapid";
  return "Classical";
}

function getTerminationType(game: ChessComGame, username: string): string {
  const color = getPlayerColor(game, username);
  const player = color === "white" ? game.white : game.black;
  const result = player.result?.toLowerCase() ?? "";

  if (result === "checkmated") return "checkmate";
  if (result === "timeout") return "timeout";
  if (result === "resigned") return "resignation";
  if (result === "abandoned") return "abandoned";
  return "other";
}

// ── Main Analysis Function ─────────────────────────────────────────────────

export function calculateInsights(
  games: ChessComGame[],
  username: string
): PlayerInsightsData {
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;

  const whitePerf = { wins: 0, losses: 0, draws: 0, total: 0 };
  const blackPerf = { wins: 0, losses: 0, draws: 0, total: 0 };

  const openingMapWhite = new Map<
    string,
    { name: string; eco: string; wins: number; losses: number; draws: number }
  >();
  const openingMapBlack = new Map<
    string,
    { name: string; eco: string; wins: number; losses: number; draws: number }
  >();

  const lossBreakdown: LossBreakdown = {
    checkmate: 0,
    resignation: 0,
    timeout: 0,
    abandoned: 0,
    other: 0,
    total: 0,
  };

  const tcMap = new Map<
    string,
    { wins: number; losses: number; draws: number; total: number }
  >();

  let movesInWins = 0;
  let winsCount = 0;
  let movesInLosses = 0;
  let lossesCount = 0;

  const ratingHistory: RatingPoint[] = [];

  for (const game of games) {
    const color = getPlayerColor(game, username);
    const result = getGameResult(game, username);
    const moves = countMoves(game.pgn);
    const tc = getTimeControlCategory(game.time_control);

    // Overall stats
    if (result === "win") totalWins++;
    else if (result === "loss") totalLosses++;
    else totalDraws++;

    // Color performance
    const perf = color === "white" ? whitePerf : blackPerf;
    perf.total++;
    if (result === "win") perf.wins++;
    else if (result === "loss") perf.losses++;
    else perf.draws++;

    // Opening stats
    const eco = extractPgnHeader(game.pgn, "ECO") ?? "Unknown";
    const openingName = extractOpeningName(game.pgn) ?? eco;
    const openingKey = eco !== "Unknown" ? eco : openingName;
    const openingMap = color === "white" ? openingMapWhite : openingMapBlack;

    if (!openingMap.has(openingKey)) {
      openingMap.set(openingKey, {
        name: openingName,
        eco,
        wins: 0,
        losses: 0,
        draws: 0,
      });
    }
    const entry = openingMap.get(openingKey)!;
    if (result === "win") entry.wins++;
    else if (result === "loss") entry.losses++;
    else entry.draws++;

    // Loss breakdown
    if (result === "loss") {
      const termType = getTerminationType(game, username);
      lossBreakdown[termType as keyof Omit<LossBreakdown, "total">]++;
      lossBreakdown.total++;
    }

    // Time control performance
    if (!tcMap.has(tc)) {
      tcMap.set(tc, { wins: 0, losses: 0, draws: 0, total: 0 });
    }
    const tcEntry = tcMap.get(tc)!;
    tcEntry.total++;
    if (result === "win") tcEntry.wins++;
    else if (result === "loss") tcEntry.losses++;
    else tcEntry.draws++;

    // Average moves
    if (result === "win") {
      movesInWins += moves;
      winsCount++;
    } else if (result === "loss") {
      movesInLosses += moves;
      lossesCount++;
    }

    // Rating history
    const player = color === "white" ? game.white : game.black;
    if (player.rating && game.end_time) {
      ratingHistory.push({
        date: game.end_time * 1000,
        rating: player.rating,
        label: new Date(game.end_time * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }
  }

  const totalGames = totalWins + totalLosses + totalDraws;

  // Sort and limit openings
  const sortOpenings = (
    map: Map<
      string,
      { name: string; eco: string; wins: number; losses: number; draws: number }
    >
  ): OpeningStats[] => {
    return Array.from(map.values())
      .map((o) => {
        const games = o.wins + o.losses + o.draws;
        return {
          ...o,
          games,
          winRate: games > 0 ? Math.round((o.wins / games) * 100) : 0,
        };
      })
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);
  };

  // Time control performance
  const timeControlPerformance: TimeControlPerformance[] = Array.from(
    tcMap.entries()
  )
    .map(([name, data]) => ({
      name,
      ...data,
      winRate:
        data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalGames,
    overallWinRate:
      totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
    ratingHistory: ratingHistory.reverse(),
    openingsAsWhite: sortOpenings(openingMapWhite),
    openingsAsBlack: sortOpenings(openingMapBlack),
    lossBreakdown,
    whitePerformance: {
      ...whitePerf,
      winRate:
        whitePerf.total > 0
          ? Math.round((whitePerf.wins / whitePerf.total) * 100)
          : 0,
    },
    blackPerformance: {
      ...blackPerf,
      winRate:
        blackPerf.total > 0
          ? Math.round((blackPerf.wins / blackPerf.total) * 100)
          : 0,
    },
    avgMovesInWins: winsCount > 0 ? Math.round(movesInWins / winsCount) : 0,
    avgMovesInLosses:
      lossesCount > 0 ? Math.round(movesInLosses / lossesCount) : 0,
    timeControlPerformance,
  };
}
