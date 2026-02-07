import { useState, useCallback, useEffect, useRef } from "react";
import { Puzzle, PuzzleState, PuzzleStats } from "@/types/puzzle";
import { getRandomPuzzle, getDailyPuzzle, PUZZLES } from "@/data/puzzles";
import { Chess } from "chess.js";
import { playMoveSound, playCaptureSound } from "@/lib/sounds";

interface LastMove {
  from: string;
  to: string;
}

const STORAGE_KEY = "chesskit_puzzle_stats";
const CURRENT_PUZZLE_KEY = "chesskit_puzzle_current";

const DEFAULT_STATS: PuzzleStats = {
  solved: 0,
  failed: 0,
  streak: 0,
  bestStreak: 0,
  solvedIds: [],
  lastDailyDate: null,
  dailySolved: false,
};

const loadStats = (): PuzzleStats => {
  if (typeof window === "undefined") return DEFAULT_STATS;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_STATS;
  try {
    return { ...DEFAULT_STATS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_STATS;
  }
};

const saveStats = (stats: PuzzleStats) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

// Save/load current practice puzzle ID so it persists across mode switches
const saveCurrentPuzzleId = (puzzleId: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_PUZZLE_KEY, puzzleId);
};

const loadCurrentPuzzleId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_PUZZLE_KEY);
};

const clearCurrentPuzzleId = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_PUZZLE_KEY);
};

const findPuzzleById = (id: string): Puzzle | null => {
  return PUZZLES.find((p) => p.id === id) || null;
};

export const usePuzzle = () => {
  const [stats, setStats] = useState<PuzzleStats>(DEFAULT_STATS);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [puzzleState, setPuzzleState] = useState<PuzzleState>("playing");
  const [moveIndex, setMoveIndex] = useState(0);
  const [game, setGame] = useState<Chess>(new Chess());
  const [showHint, setShowHint] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [fixedPlayerColor, setFixedPlayerColor] = useState<"white" | "black" | null>(null);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load stats on mount
  useEffect(() => {
    const loadedStats = loadStats();

    // Check if daily puzzle should reset
    const today = new Date().toDateString();
    if (loadedStats.lastDailyDate !== today) {
      loadedStats.dailySolved = false;
      loadedStats.lastDailyDate = today;
      saveStats(loadedStats);
    }

    setStats(loadedStats);
  }, []);

  // Setup and animate a puzzle on the board
  const setupPuzzleOnBoard = useCallback((puzzleToLoad: Puzzle, daily: boolean) => {
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
    setPuzzleState(daily && stats.dailySolved ? "solved" : "playing");
    setMoveIndex(1);
    setShowHint(false);
    setIsDaily(daily);
    
    // Determine player color
    const setupColor = initialGame.turn();
    setFixedPlayerColor(setupColor === "w" ? "black" : "white");

    // Save current puzzle ID for practice mode
    if (!daily) {
      saveCurrentPuzzleId(puzzleToLoad.id);
    }

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
          if (moveResult?.captured) {
            playCaptureSound();
          } else {
            playMoveSound();
          }
        } catch (e) {
          console.error("Invalid setup move:", firstMove, "in puzzle:", puzzleToLoad.id);
          setIsSettingUp(false);
        }
      }, 800);
    } else {
      setIsSettingUp(false);
    }
  }, [stats.dailySolved]);

  // Load a random puzzle - restore saved one or get new
  const loadRandomPuzzle = useCallback(() => {
    // Try to restore saved puzzle
    const savedPuzzleId = loadCurrentPuzzleId();
    if (savedPuzzleId && !stats.solvedIds.includes(savedPuzzleId)) {
      const savedPuzzle = findPuzzleById(savedPuzzleId);
      if (savedPuzzle) {
        setupPuzzleOnBoard(savedPuzzle, false);
        return savedPuzzle;
      }
    }

    // No saved puzzle or already solved - get new one
    const newPuzzle = getRandomPuzzle(stats.solvedIds);
    if (newPuzzle) {
      setupPuzzleOnBoard(newPuzzle, false);
    }
    return newPuzzle;
  }, [stats.solvedIds, setupPuzzleOnBoard]);

  // Load daily puzzle
  const loadDailyPuzzle = useCallback(() => {
    const dailyPuzzle = getDailyPuzzle();
    setupPuzzleOnBoard(dailyPuzzle, true);
    return dailyPuzzle;
  }, [setupPuzzleOnBoard]);

  // Make a move
  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!puzzle || puzzleState !== "playing") return false;

      const expectedMove = puzzle.moves[moveIndex];
      if (!expectedMove) return false;

      const expectedFrom = expectedMove.slice(0, 2);
      const expectedTo = expectedMove.slice(2, 4);
      const expectedPromotion = expectedMove.slice(4) || undefined;

      // Auto-fill promotion if expected move requires it (UI may not provide promotion dialog)
      const effectivePromotion = promotion || expectedPromotion;

      // Check if move is correct
      const isCorrect =
        from === expectedFrom &&
        to === expectedTo &&
        (effectivePromotion || undefined) === expectedPromotion;

      if (isCorrect) {
        // Play user's move (use effectivePromotion for auto-promotion)
        const newGame = new Chess(game.fen());
        const userMoveResult = newGame.move({ from, to, promotion: effectivePromotion });
        const fenAfterUserMove = newGame.fen(); // Capture FEN immediately
        setGame(newGame);
        setLastMove({ from, to });
        
        // Play sound for user's move
        if (userMoveResult?.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }

        const nextMoveIndex = moveIndex + 1;
        const opponentMove = puzzle.moves[nextMoveIndex]; // Capture now

        // Check if puzzle is solved
        if (nextMoveIndex >= puzzle.moves.length) {
          // Puzzle solved!
          setPuzzleState("solved");
          if (!isDaily) {
            clearCurrentPuzzleId(); // Clear saved puzzle so next load gets a new one
          }
          const newStats = {
            ...stats,
            solved: stats.solved + 1,
            streak: stats.streak + 1,
            bestStreak: Math.max(stats.bestStreak, stats.streak + 1),
            solvedIds: isDaily
              ? stats.solvedIds
              : [...stats.solvedIds, puzzle.id],
            dailySolved: isDaily ? true : stats.dailySolved,
          };
          setStats(newStats);
          saveStats(newStats);
        } else if (opponentMove) {
          // Play opponent's response with a visible delay
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
              // Play sound for opponent's move
              if (opponentMoveResult?.captured) {
                playCaptureSound();
              } else {
                playMoveSound();
              }
            } catch (e) {
              // If opponent move fails, puzzle is solved (bad puzzle data)
              console.error("Invalid opponent move:", opponentMove, "marking as solved");
              setPuzzleState("solved");
            }
          }, 600); // Longer delay for visible opponent response
        }
        return true;
      } else {
        // Wrong move - but still track where user tried to move
        setLastMove({ from, to });
        setPuzzleState("failed");
        const newStats = {
          ...stats,
          failed: stats.failed + 1,
          streak: 0,
        };
        setStats(newStats);
        saveStats(newStats);
        return false;
      }
    },
    [puzzle, puzzleState, moveIndex, game, stats, isDaily]
  );

  // Get hint (next correct move)
  const getHint = useCallback(() => {
    if (!puzzle || puzzleState !== "playing") return null;
    setShowHint(true);
    const nextMove = puzzle.moves[moveIndex];
    if (nextMove) {
      const from = nextMove.slice(0, 2);
      const to = nextMove.slice(2, 4);
      // Verify it's a legal move
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
    
    // Clear any pending setup timeout
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
    }
    
    setLastMove(null);
    setIsSettingUp(true);
    
    // Show initial position first
    const initialGame = new Chess(puzzle.fen);
    setGame(initialGame);
    setPuzzleState("playing");
    setMoveIndex(1);
    setShowHint(false);

    // After delay, animate the setup move
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
          // Play sound
          if (moveResult?.captured) {
            playCaptureSound();
          } else {
            playMoveSound();
          }
        } catch (e) {
          console.error("Invalid setup move on retry:", firstMove);
          setIsSettingUp(false);
        }
      }, 800);
    } else {
      setIsSettingUp(false);
    }
  }, [puzzle]);

  // Current turn (for display purposes)
  const currentTurn = game.turn() === "w" ? "white" : "black";

  return {
    puzzle,
    puzzleState,
    game,
    stats,
    showHint,
    isDaily,
    playerColor: fixedPlayerColor, // Fixed orientation - doesn't change during puzzle
    currentTurn, // Whose turn it is right now
    lastMove,
    isSettingUp,
    loadRandomPuzzle,
    loadDailyPuzzle,
    makeMove,
    getHint,
    retry,
  };
};
