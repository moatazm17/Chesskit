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
  parentFen: string;  // Position before this move was played
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
  white: OpeningTreeNode[];  // root children (moves after starting position)
  black: OpeningTreeNode[];
  totalGames: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_OPENING_MOVES = 15;  // half-moves per side (first 15 moves of the game)
const MIN_GAMES_FOR_WEAKNESS = 3;
const MAX_WIN_RATE_FOR_WEAKNESS = 40;
const MIN_WIN_RATE_GAP_FOR_WEAKNESS = 15;

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

  // Sort by impact: more games + bigger win-rate gap = higher priority
  return weaknesses.sort((a, b) => {
    const impactA =
      a.weakMove.games * ((a.betterMoves[0]?.winRate ?? 0) - a.weakMove.winRate);
    const impactB =
      b.weakMove.games * ((b.betterMoves[0]?.winRate ?? 0) - b.weakMove.winRate);
    return impactB - impactA;
  });
}
