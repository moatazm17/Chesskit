import { useState, useCallback, useEffect, useRef } from "react";
import { Puzzle, PuzzleState, PuzzleStats } from "@/types/puzzle";
import { getRandomMateIn2, getRandomMateIn3, MATE_IN_2_PUZZLES, MATE_IN_3_PUZZLES } from "@/data/checkmatePuzzles";
import { Chess } from "chess.js";
import { playMoveSound, playCaptureSound } from "@/lib/sounds";
import { logAnalyticsEvent } from "@/lib/firebase";

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

const findPuzzleById = (mateType: MateType, id: string): Puzzle | null => {
  const puzzles = mateType === "mateIn2" ? MATE_IN_2_PUZZLES : MATE_IN_3_PUZZLES;
  return puzzles.find((p) => p.id === id) || null;
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
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stats = allStats[mateType];

  // Load stats on mount
  useEffect(() => {
    const loadedStats = loadStats();
    setAllStats(loadedStats);
  }, []);

  // Get random puzzle based on mate type
  const getRandomPuzzle = useCallback(
    (solvedIds: string[]) => {
      if (mateType === "mateIn2") {
        return getRandomMateIn2(solvedIds);
      }
      return getRandomMateIn3(solvedIds);
    },
    [mateType]
  );

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

  // Load a puzzle - restore saved one or get a new one
  const loadPuzzle = useCallback(() => {
    // Try to restore the saved puzzle for this tab
    const savedPuzzleId = loadCurrentPuzzleId(mateType);
    if (savedPuzzleId) {
      // Check if it's not already solved
      if (!stats.solvedIds.includes(savedPuzzleId)) {
        const savedPuzzle = findPuzzleById(mateType, savedPuzzleId);
        if (savedPuzzle) {
          setupPuzzleOnBoard(savedPuzzle);
          return savedPuzzle;
        }
      }
    }

    // No saved puzzle or it's already solved - get a new one
    const newPuzzle = getRandomPuzzle(stats.solvedIds);
    if (newPuzzle) {
      setupPuzzleOnBoard(newPuzzle);
    }
    return newPuzzle;
  }, [mateType, getRandomPuzzle, stats.solvedIds, setupPuzzleOnBoard]);

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

        if (userMoveResult?.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }

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
              if (opponentMoveResult?.captured) {
                playCaptureSound();
              } else {
                playMoveSound();
              }
            } catch (e) {
              console.error("Invalid opponent move:", opponentMove, "marking as solved");
              setPuzzleState("solved");
            }
          }, 600);
        }
        return true;
      } else {
        // Wrong move
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
    loadPuzzle,
    makeMove,
    getHint,
    retry,
  };
};
