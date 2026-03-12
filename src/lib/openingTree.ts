import { Chess } from "chess.js";
import { ChessComGame } from "@/types/chessCom";
import { openings } from "@/data/openings";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MoveStats {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface OpeningTreeNode {
  fen: string;
  parentFen: string;
  move: string;       // UCI: "e2e4"
  san: string;        // SAN: "e4"
  openingName?: string;
  stats: MoveStats;
  children: OpeningTreeNode[];
}

export interface OpeningWeakness {
  fen: string;
  playerColor: "white" | "black";
  openingName?: string;
  weakMove: { san: string; uci: string; winRate: number; games: number };
  betterMoves: { san: string; uci: string; winRate: number; games: number }[];
}

export interface OpeningTree {
  white: OpeningTreeNode[];
  black: OpeningTreeNode[];
  totalGames: number;
}

// ── Training Line Types ─────────────────────────────────────────────────────

export interface LineMove {
  san: string;
  uci: string;
  fen: string;        // position AFTER this move
  parentFen: string;  // position BEFORE this move
  isPlayerMove: boolean;
  isWeakness: boolean;
  betterSan?: string;
  betterUci?: string;
  weakWinRate?: number;
  betterWinRate?: number;
}

export interface TrainingLine {
  id: string;
  openingName: string;
  playerColor: "white" | "black";
  moves: LineMove[];
}

export interface LineMastery {
  correctStreak: number;
  level: 0 | 1 | 2 | 3 | 4;
  lastPracticed: number;
  totalAttempts: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_OPENING_MOVES = 15;
const MIN_GAMES_FOR_WEAKNESS = 2;
const MAX_WIN_RATE_FOR_WEAKNESS = 40;
const MIN_WIN_RATE_GAP_FOR_WEAKNESS = 10;
const MIN_GAMES_FOR_ABSOLUTE_WEAKNESS = 5;
const MAX_WIN_RATE_ABSOLUTE = 30;

// ── Opening Name Lookup ────────────────────────────────────────────────────

const openingsByFen = new Map<string, string>(
  openings.map((o) => [o.fen.split(" ")[0], o.name])
);

function getOpeningName(fen: string): string | undefined {
  const positionFen = fen.split(" ")[0];
  return openingsByFen.get(positionFen);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getPlayerColor(game: ChessComGame, username: string): "white" | "black" {
  return game.white.username.toLowerCase() === username.toLowerCase()
    ? "white"
    : "black";
}

function getGameResult(game: ChessComGame, username: string): "win" | "loss" | "draw" {
  const color = getPlayerColor(game, username);
  const player = color === "white" ? game.white : game.black;
  const result = player.result?.toLowerCase() ?? "";
  if (result === "win") return "win";
  if (["checkmated", "timeout", "resigned", "abandoned", "lose"].includes(result)) return "loss";
  return "draw";
}

function calcWinRate(stats: { wins: number; games: number }): number {
  return stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
}

// ── Tree Node Helpers ──────────────────────────────────────────────────────

function findOrCreateChild(
  children: OpeningTreeNode[],
  uci: string,
  san: string,
  fen: string,
  parentFen: string
): OpeningTreeNode {
  let node = children.find((c) => c.move === uci && c.parentFen === parentFen);
  if (!node) {
    node = {
      fen,
      parentFen,
      move: uci,
      san,
      openingName: getOpeningName(fen),
      stats: { games: 0, wins: 0, losses: 0, draws: 0, winRate: 0 },
      children: [],
    };
    children.push(node);
  }
  return node;
}

function updateNodeStats(
  node: OpeningTreeNode,
  result: "win" | "loss" | "draw"
): void {
  node.stats.games++;
  if (result === "win") node.stats.wins++;
  else if (result === "loss") node.stats.losses++;
  else node.stats.draws++;
  node.stats.winRate = calcWinRate(node.stats);
}

// ── Tree Builder ───────────────────────────────────────────────────────────

export function buildOpeningTree(
  games: ChessComGame[],
  username: string
): OpeningTree {
  const whiteRoots: OpeningTreeNode[] = [];
  const blackRoots: OpeningTreeNode[] = [];
  let totalGames = 0;

  for (const game of games) {
    if (!game.pgn) continue;

    const chess = new Chess();
    try {
      chess.loadPgn(game.pgn);
    } catch {
      continue;
    }

    const color = getPlayerColor(game, username);
    const result = getGameResult(game, username);
    const history = chess.history({ verbose: true });
    const roots = color === "white" ? whiteRoots : blackRoots;

    // Replay first MAX_OPENING_MOVES half-moves, updating nodes along the way
    const tempGame = new Chess();
    let currentChildren = roots;
    const isPlayerMove = (index: number) =>
      color === "white" ? index % 2 === 0 : index % 2 === 1;

    totalGames++;

    for (let i = 0; i < Math.min(history.length, MAX_OPENING_MOVES * 2); i++) {
      const move = history[i];
      if (!isPlayerMove(i)) {
        tempGame.move(move.san);
        continue;
      }

      const parentFen = tempGame.fen();
      tempGame.move(move.san);
      const fen = tempGame.fen();
      const uci = move.from + move.to + (move.promotion ?? "");

      const node = findOrCreateChild(currentChildren, uci, move.san, fen, parentFen);
      updateNodeStats(node, result);
      currentChildren = node.children;
    }
  }

  return { white: whiteRoots, black: blackRoots, totalGames };
}

// ── Weakness Detection ─────────────────────────────────────────────────────

function collectWeaknessesFromChildren(
  children: OpeningTreeNode[],
  color: "white" | "black",
  weaknesses: OpeningWeakness[]
): void {
  // Group children by parentFen so we only compare moves from the same position
  const byParent = new Map<string, OpeningTreeNode[]>();
  for (const child of children) {
    const group = byParent.get(child.parentFen) ?? [];
    group.push(child);
    byParent.set(child.parentFen, group);
  }

  const addedFens = new Set<string>();

  for (const group of byParent.values()) {
    const qualified = group.filter((c) => c.stats.games >= MIN_GAMES_FOR_WEAKNESS);

    if (qualified.length >= 2) {
      const sorted = [...qualified].sort((a, b) => b.stats.games - a.stats.games);
      const mostPlayed = sorted[0];

      const betterMoves = sorted
        .filter(
          (c) =>
            c.move !== mostPlayed.move &&
            c.stats.winRate >= mostPlayed.stats.winRate + MIN_WIN_RATE_GAP_FOR_WEAKNESS
        )
        .map((c) => ({
          san: c.san,
          uci: c.move,
          winRate: c.stats.winRate,
          games: c.stats.games,
        }));

      const isWeak =
        mostPlayed.stats.winRate <= MAX_WIN_RATE_FOR_WEAKNESS || betterMoves.length > 0;

      if (isWeak && betterMoves.length > 0) {
        const parentFen = mostPlayed.parentFen;
        addedFens.add(parentFen);
        weaknesses.push({
          fen: parentFen,
          playerColor: color,
          openingName: mostPlayed.openingName ?? getOpeningName(parentFen),
          weakMove: {
            san: mostPlayed.san,
            uci: mostPlayed.move,
            winRate: mostPlayed.stats.winRate,
            games: mostPlayed.stats.games,
          },
          betterMoves: betterMoves.sort((a, b) => b.winRate - a.winRate),
        });
      }
    }

    // Absolute weakness: single move with very low win rate, no alternative needed
    for (const node of group) {
      if (
        node.stats.games >= MIN_GAMES_FOR_ABSOLUTE_WEAKNESS &&
        node.stats.winRate <= MAX_WIN_RATE_ABSOLUTE &&
        !addedFens.has(node.parentFen)
      ) {
        const otherMoves = group
          .filter((c) => c.move !== node.move && c.stats.games >= 1)
          .map((c) => ({
            san: c.san,
            uci: c.move,
            winRate: c.stats.winRate,
            games: c.stats.games,
          }))
          .sort((a, b) => b.winRate - a.winRate);

        if (otherMoves.length > 0) {
          addedFens.add(node.parentFen);
          weaknesses.push({
            fen: node.parentFen,
            playerColor: color,
            openingName: node.openingName ?? getOpeningName(node.parentFen),
            weakMove: {
              san: node.san,
              uci: node.move,
              winRate: node.stats.winRate,
              games: node.stats.games,
            },
            betterMoves: otherMoves,
          });
        }
      }
    }
  }

  // Recurse into all children regardless
  for (const child of children) {
    collectWeaknessesFromChildren(child.children, color, weaknesses);
  }
}

export function findWeaknesses(tree: OpeningTree): OpeningWeakness[] {
  const weaknesses: OpeningWeakness[] = [];

  collectWeaknessesFromChildren(tree.white, "white", weaknesses);
  collectWeaknessesFromChildren(tree.black, "black", weaknesses);

  return weaknesses.sort((a, b) => {
    const impactA =
      a.weakMove.games * ((a.betterMoves[0]?.winRate ?? 0) - a.weakMove.winRate);
    const impactB =
      b.weakMove.games * ((b.betterMoves[0]?.winRate ?? 0) - b.weakMove.winRate);
    return impactB - impactA;
  });
}

// ── Training Line Extraction ────────────────────────────────────────────────

let lineCounter = 0;
function uniqueLineId(lineKey: string, color: string): string {
  lineCounter++;
  let h = 0;
  const src = lineKey + color;
  for (let i = 0; i < src.length; i++) {
    h = ((h << 5) - h + src.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36) + "_" + lineCounter.toString(36);
}

const MAX_LINE_HALF_MOVES = 20;
const EXTRA_MOVES_AFTER_WEAKNESS = 4;

export function extractTrainingLines(
  games: ChessComGame[],
  weaknesses: OpeningWeakness[],
  username: string
): TrainingLine[] {
  if (weaknesses.length === 0) return [];

  const weaknessByFen = new Map<string, OpeningWeakness>();
  for (const w of weaknesses) {
    weaknessByFen.set(w.fen, w);
  }

  const linesByKey = new Map<string, { line: TrainingLine; count: number }>();

  for (const game of games) {
    if (!game.pgn) continue;

    const chess = new Chess();
    try {
      chess.loadPgn(game.pgn);
    } catch {
      continue;
    }

    const color = getPlayerColor(game, username);
    const history = chess.history({ verbose: true });
    const isPlayerMove = (i: number) =>
      color === "white" ? i % 2 === 0 : i % 2 === 1;

    const replay = new Chess();
    const movesAccum: LineMove[] = [];
    let foundWeakness = false;
    let movesAfterWeakness = 0;

    for (let i = 0; i < Math.min(history.length, MAX_LINE_HALF_MOVES); i++) {
      const move = history[i];
      const parentFen = replay.fen();

      try {
        replay.move(move.san);
      } catch {
        break;
      }

      const fen = replay.fen();
      const uci = move.from + move.to + (move.promotion ?? "");
      const playerMove = isPlayerMove(i);

      const weakness = playerMove ? weaknessByFen.get(parentFen) : undefined;
      const isWeak = !!weakness && weakness.weakMove.uci === uci;

      movesAccum.push({
        san: move.san,
        uci,
        fen,
        parentFen,
        isPlayerMove: playerMove,
        isWeakness: isWeak,
        betterSan: isWeak ? weakness!.betterMoves[0]?.san : undefined,
        betterUci: isWeak ? weakness!.betterMoves[0]?.uci : undefined,
        weakWinRate: isWeak ? weakness!.weakMove.winRate : undefined,
        betterWinRate: isWeak ? weakness!.betterMoves[0]?.winRate : undefined,
      });

      if (isWeak) foundWeakness = true;
      if (foundWeakness) movesAfterWeakness++;
      if (foundWeakness && movesAfterWeakness >= EXTRA_MOVES_AFTER_WEAKNESS) break;
    }

    if (!foundWeakness || movesAccum.length === 0) continue;

    const lineKey = movesAccum.map((m) => m.uci).join("-");
    const existing = linesByKey.get(lineKey);

    if (existing) {
      existing.count++;
    } else {
      const lastOpeningName = [...movesAccum]
        .reverse()
        .find((m) => getOpeningName(m.fen))?.fen;
      const openingName =
        (lastOpeningName ? getOpeningName(lastOpeningName) : undefined) ??
        weaknessByFen.get(movesAccum.find((m) => m.isWeakness)?.parentFen ?? "")?.openingName ??
        "Opening Position";

      linesByKey.set(lineKey, {
        count: 1,
        line: {
          id: uniqueLineId(lineKey, color),
          openingName,
          playerColor: color,
          moves: movesAccum,
        },
      });
    }
  }

  // Deduplicate: for lines with the same weakness FEN, keep the most common path
  const byWeaknessFen = new Map<string, { line: TrainingLine; count: number }[]>();
  for (const entry of linesByKey.values()) {
    const wFen = entry.line.moves.find((m) => m.isWeakness)?.parentFen ?? "";
    const group = byWeaknessFen.get(wFen) ?? [];
    group.push(entry);
    byWeaknessFen.set(wFen, group);
  }

  const result: TrainingLine[] = [];
  for (const group of byWeaknessFen.values()) {
    group.sort((a, b) => b.count - a.count);
    result.push(group[0].line);
  }

  return result.sort((a, b) => {
    const wA = a.moves.find((m) => m.isWeakness);
    const wB = b.moves.find((m) => m.isWeakness);
    const impactA = (wA?.betterWinRate ?? 0) - (wA?.weakWinRate ?? 0);
    const impactB = (wB?.betterWinRate ?? 0) - (wB?.weakWinRate ?? 0);
    return impactB - impactA;
  });
}
