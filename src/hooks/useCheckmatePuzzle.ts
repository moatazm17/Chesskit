import { useState, useCallback, useEffect, useRef } from "react";
import { Puzzle, PuzzleState, PuzzleStats } from "@/types/puzzle";
import { Chess } from "chess.js";
import { playSoundFromMove, playIllegalMoveSound } from "@/lib/sounds";
import { logAnalyticsEvent } from "@/lib/firebase";
import {
  fetchPuzzles,
  computeUserLevel,
  getUnlockedLevels,
  getRandomPuzzle as selectPuzzle,
  findPuzzleById as findById,
  getLevels,
  UserLevel,
  LevelDef,
  PuzzleType,
} from "@/lib/puzzleLoader";

interface LastMove {
  from: string;
  to: string;
}

export type MateType = "mateIn2" | "mateIn3";

const STORAGE_KEY = "chesskit_checkmate_stats";
const CURRENT_PUZZLE_KEY = "chesskit_checkmate_current";

interface CheckmateStats {
  mateIn2: PuzzleStats;
  mateIn3: PuzzleStats;
}

const DEFAULT_STATS: PuzzleStats = {
  solved: 0,
  failed: 0,
  streak: 0,
  bestStreak: 0,
  solvedIds: [],
  lastDailyDate: null,
  dailySolved: false,
};

const DEFAULT_CHECKMATE_STATS: CheckmateStats = {
  mateIn2: { ...DEFAULT_STATS },
  mateIn3: { ...DEFAULT_STATS },
};

const loadStats = (): CheckmateStats => {
  if (typeof window === "undefined") return DEFAULT_CHECKMATE_STATS;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_CHECKMATE_STATS;
  try {
    const parsed = JSON.parse(saved);
    return {
      mateIn2: { ...DEFAULT_STATS, ...parsed.mateIn2 },
      mateIn3: { ...DEFAULT_STATS, ...parsed.mateIn3 },
    };
  } catch {
    return DEFAULT_CHECKMATE_STATS;
  }
};

const saveStats = (stats: CheckmateStats) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

// Save/load current puzzle ID per mate type so it persists across tab switches
const saveCurrentPuzzleId = (mateType: MateType, puzzleId: string) => {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(CURRENT_PUZZLE_KEY);
    const current = saved ? JSON.parse(saved) : {};
    current[mateType] = puzzleId;
    localStorage.setItem(CURRENT_PUZZLE_KEY, JSON.stringify(current));
  } catch { /* ignore */ }
};

const loadCurrentPuzzleId = (mateType: MateType): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(CURRENT_PUZZLE_KEY);
    if (!saved) return null;
    const current = JSON.parse(saved);
    return current[mateType] || null;
  } catch { return null; }
};

const clearCurrentPuzzleId = (mateType: MateType) => {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(CURRENT_PUZZLE_KEY);
    const current = saved ? JSON.parse(saved) : {};
    delete current[mateType];
    localStorage.setItem(CURRENT_PUZZLE_KEY, JSON.stringify(current));
  } catch { /* ignore */ }
};

const MATE_TYPE_TO_PUZZLE: Record<MateType, PuzzleType> = {
  mateIn2: "checkmate2",
  mateIn3: "checkmate3",
};

export const useCheckmatePuzzle = (mateType: MateType) => {
  const [allStats, setAllStats] = useState<CheckmateStats>(DEFAULT_CHECKMATE_STATS);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [puzzleState, setPuzzleState] = useState<PuzzleState>("playing");
  const [moveIndex, setMoveIndex] = useState(0);
  const [game, setGame] = useState<Chess>(new Chess());
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [fixedPlayerColor, setFixedPlayerColor] = useState<"white" | "black" | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [unlockedLevels, setUnlockedLevels] = useState<LevelDef[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LevelDef | null>(null);
  const [typeLevels, setTypeLevels] = useState<LevelDef[]>([]);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stats = allStats[mateType];

  // Load stats on mount
  useEffect(() => {
    const loadedStats = loadStats();
    setAllStats(loadedStats);
  }, []);

  // Setup and animate a puzzle on the board
  const setupPuzzleOnBoard = useCallback((puzzleToLoad: Puzzle) => {
    // Clear any pending setup timeout
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
    }

    setPuzzle(puzzleToLoad);
    setLastMove(null);
    setIsSettingUp(true);

    // First show the initial position (before opponent's move)
    const initialGame = new Chess(puzzleToLoad.fen);
    setGame(initialGame);
    setPuzzleState("playing");
    setMoveIndex(1);
    setShowHint(false);

    // Determine player color
    const setupColor = initialGame.turn();
    setFixedPlayerColor(setupColor === "w" ? "black" : "white");

    // Save current puzzle ID
    saveCurrentPuzzleId(mateType, puzzleToLoad.id);

    // After a delay, animate the opponent's setup move
    if (puzzleToLoad.moves.length > 0) {
      const firstMove = puzzleToLoad.moves[0];
      setupTimeoutRef.current = setTimeout(() => {
        try {
          const gameAfterSetup = new Chess(puzzleToLoad.fen);
          const moveResult = gameAfterSetup.move({
            from: firstMove.slice(0, 2),
            to: firstMove.slice(2, 4),
            promotion: firstMove.slice(4) || undefined,
          });
          setGame(gameAfterSetup);
          setLastMove({
            from: firstMove.slice(0, 2),
            to: firstMove.slice(2, 4),
          });
          setIsSettingUp(false);
          // No sound for setup move (first automatic move)
        } catch (e) {
          console.error("Invalid setup move:", firstMove, "in puzzle:", puzzleToLoad.id);
          setIsSettingUp(false);
        }
      }, 800);
    } else {
      setIsSettingUp(false);
    }
  }, [mateType]);

  const loadPuzzle = useCallback(async () => {
    const puzzleType = MATE_TYPE_TO_PUZZLE[mateType];
    const puzzles = await fetchPuzzles(puzzleType);
    const levels = getLevels(puzzleType);
    setTypeLevels(levels);

    // Read directly from localStorage to avoid race condition with React state
    const freshStats = loadStats();
    setAllStats(freshStats);
    const mateStats = freshStats[mateType];

    const level = computeUserLevel(mateStats.solvedIds, puzzles, levels);
    setUserLevel(level);
    setUnlockedLevels(getUnlockedLevels(mateStats.solvedIds, puzzles, levels));

    const activeLevelDef = selectedLevel || level.levelDef;

    const savedPuzzleId = loadCurrentPuzzleId(mateType);
    if (savedPuzzleId && !mateStats.solvedIds.includes(savedPuzzleId)) {
      const savedPuzzle = findById(puzzles, savedPuzzleId);
      if (savedPuzzle) {
        setupPuzzleOnBoard(savedPuzzle);
        return;
      }
    }

    const newPuzzle = selectPuzzle(puzzles, mateStats.solvedIds, activeLevelDef);
    if (newPuzzle) {
      setupPuzzleOnBoard(newPuzzle);
    }
  }, [mateType, setupPuzzleOnBoard, selectedLevel]);

  // Make a move
  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!puzzle || puzzleState !== "playing") return false;

      const expectedMove = puzzle.moves[moveIndex];
      if (!expectedMove) return false;

      const expectedFrom = expectedMove.slice(0, 2);
      const expectedTo = expectedMove.slice(2, 4);
      const expectedPromotion = expectedMove.slice(4) || undefined;

      // Auto-fill promotion if expected move requires it
      const effectivePromotion = promotion || expectedPromotion;

      // Check if move is correct
      const isCorrect =
        from === expectedFrom &&
        to === expectedTo &&
        (effectivePromotion || undefined) === expectedPromotion;

      if (isCorrect) {
        // Play user's move
        const newGame = new Chess(game.fen());
        const userMoveResult = newGame.move({ from, to, promotion: effectivePromotion });
        const fenAfterUserMove = newGame.fen();
        setGame(newGame);
        setLastMove({ from, to });

        playSoundFromMove(userMoveResult, newGame);

        const nextMoveIndex = moveIndex + 1;
        const opponentMove = puzzle.moves[nextMoveIndex];

        // Check if puzzle is solved
        if (nextMoveIndex >= puzzle.moves.length) {
          setPuzzleState("solved");
          clearCurrentPuzzleId(mateType);
          logAnalyticsEvent("checkmate_solved", {
            puzzle_id: puzzle.id,
            puzzle_rating: puzzle.rating,
            mate_type: mateType,
            total_solved: stats.solved + 1,
            streak: stats.streak + 1,
          });
          const newStats = {
            ...allStats,
            [mateType]: {
              ...stats,
              solved: stats.solved + 1,
              streak: stats.streak + 1,
              bestStreak: Math.max(stats.bestStreak, stats.streak + 1),
              solvedIds: [...stats.solvedIds, puzzle.id],
            },
          };
          setAllStats(newStats);
          saveStats(newStats);
        } else if (opponentMove) {
          // Play opponent's response
          // Longer delay if the user's move caused a check (to show GIF animation)
          const isCheck = newGame.inCheck();
          const delay = isCheck ? 2200 : 600;
          setMoveIndex(nextMoveIndex);
          setTimeout(() => {
            try {
              const responseGame = new Chess(fenAfterUserMove);
              const opponentMoveResult = responseGame.move({
                from: opponentMove.slice(0, 2),
                to: opponentMove.slice(2, 4),
                promotion: opponentMove.slice(4) || undefined,
              });
              setGame(responseGame);
              setLastMove({
                from: opponentMove.slice(0, 2),
                to: opponentMove.slice(2, 4),
              });
              setMoveIndex(nextMoveIndex + 1);
              playSoundFromMove(opponentMoveResult, responseGame);
            } catch (e) {
              console.error("Invalid opponent move:", opponentMove, "marking as solved");
              setPuzzleState("solved");
            }
          }, delay);
        }
        return true;
      } else {
        // Wrong move - play error sound
        playIllegalMoveSound();
        setLastMove({ from, to });
        setPuzzleState("failed");
        logAnalyticsEvent("checkmate_failed", {
          puzzle_id: puzzle.id,
          puzzle_rating: puzzle.rating,
          mate_type: mateType,
          total_failed: stats.failed + 1,
        });
        const newStats = {
          ...allStats,
          [mateType]: {
            ...stats,
            failed: stats.failed + 1,
            streak: 0,
          },
        };
        setAllStats(newStats);
        saveStats(newStats);
        return false;
      }
    },
    [puzzle, puzzleState, moveIndex, game, stats, allStats, mateType]
  );

  // Get hint
  const getHint = useCallback(() => {
    if (!puzzle || puzzleState !== "playing") return null;
    setShowHint(true);
    const nextMove = puzzle.moves[moveIndex];
    if (nextMove) {
      const from = nextMove.slice(0, 2);
      const to = nextMove.slice(2, 4);
      const legalMoves = game.moves({ verbose: true });
      const isLegal = legalMoves.some((m) => m.from === from && m.to === to);
      if (isLegal) {
        return { from, to };
      }
      console.warn("Hint move is not legal:", nextMove, "in position:", game.fen());
    }
    return null;
  }, [puzzle, puzzleState, moveIndex, game]);

  // Retry current puzzle
  const retry = useCallback(() => {
    if (!puzzle) return;

    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
    }

    setLastMove(null);
    setIsSettingUp(true);

    const initialGame = new Chess(puzzle.fen);
    setGame(initialGame);
    setPuzzleState("playing");
    setMoveIndex(1);
    setShowHint(false);

    if (puzzle.moves.length > 0) {
      const firstMove = puzzle.moves[0];
      setupTimeoutRef.current = setTimeout(() => {
        try {
          const gameAfterSetup = new Chess(puzzle.fen);
          const moveResult = gameAfterSetup.move({
            from: firstMove.slice(0, 2),
            to: firstMove.slice(2, 4),
            promotion: firstMove.slice(4) || undefined,
          });
          setGame(gameAfterSetup);
          setLastMove({
            from: firstMove.slice(0, 2),
            to: firstMove.slice(2, 4),
          });
          setIsSettingUp(false);
          // No sound for setup move on retry
        } catch (e) {
          console.error("Invalid setup move on retry:", firstMove);
          setIsSettingUp(false);
        }
      }, 800);
    } else {
      setIsSettingUp(false);
    }
  }, [puzzle]);

  // Current turn
  const currentTurn = game.turn() === "w" ? "white" : "black";

  return {
    puzzle,
    puzzleState,
    game,
    stats,
    showHint,
    playerColor: fixedPlayerColor,
    currentTurn,
    lastMove,
    isSettingUp,
    userLevel,
    unlockedLevels,
    selectedLevel,
    setSelectedLevel,
    typeLevels,
    loadPuzzle,
    makeMove,
    getHint,
    retry,
  };
};
