import { useState, useCallback, useEffect, useRef } from "react";
import { Puzzle, PuzzleState, PuzzleStats } from "@/types/puzzle";
import { getRandomBrilliantPuzzle, findBrilliantPuzzleById } from "@/data/brilliantPuzzles";
import { Chess } from "chess.js";
import { playSoundFromMove, playIllegalMoveSound } from "@/lib/sounds";
import { logAnalyticsEvent } from "@/lib/firebase";

interface LastMove {
  from: string;
  to: string;
}

const STORAGE_KEY = "chesskit_brilliant_stats";
const CURRENT_PUZZLE_KEY = "chesskit_brilliant_current";

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

export const useBrilliantPuzzle = () => {
  const [stats, setStats] = useState<PuzzleStats>(DEFAULT_STATS);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [puzzleState, setPuzzleState] = useState<PuzzleState>("playing");
  const [moveIndex, setMoveIndex] = useState(0);
  const [game, setGame] = useState<Chess>(new Chess());
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [fixedPlayerColor, setFixedPlayerColor] = useState<"white" | "black" | null>(null);
  const [brilliantSquare, setBrilliantSquare] = useState<string | null>(null);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const setupPuzzleOnBoard = useCallback((puzzleToLoad: Puzzle) => {
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
    }

    setPuzzle(puzzleToLoad);
    setLastMove(null);
    setIsSettingUp(true);
    setBrilliantSquare(null);
    
    const initialGame = new Chess(puzzleToLoad.fen);
    setGame(initialGame);
    setPuzzleState("playing");
    setMoveIndex(1);
    setShowHint(false);
    
    const setupColor = initialGame.turn();
    setFixedPlayerColor(setupColor === "w" ? "black" : "white");
    saveCurrentPuzzleId(puzzleToLoad.id);

    if (puzzleToLoad.moves.length > 0) {
      const firstMove = puzzleToLoad.moves[0];
      setupTimeoutRef.current = setTimeout(() => {
        try {
          const gameAfterSetup = new Chess(puzzleToLoad.fen);
          gameAfterSetup.move({
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
        } catch (e) {
          console.error("Invalid setup move:", firstMove);
          setIsSettingUp(false);
        }
      }, 800);
    } else {
      setIsSettingUp(false);
    }
  }, []);

  const loadPuzzle = useCallback(() => {
    const savedPuzzleId = loadCurrentPuzzleId();
    if (savedPuzzleId && !stats.solvedIds.includes(savedPuzzleId)) {
      const savedPuzzle = findBrilliantPuzzleById(savedPuzzleId);
      if (savedPuzzle) {
        setupPuzzleOnBoard(savedPuzzle);
        return savedPuzzle;
      }
    }

    const newPuzzle = getRandomBrilliantPuzzle(stats.solvedIds);
    if (newPuzzle) {
      setupPuzzleOnBoard(newPuzzle);
    }
    return newPuzzle;
  }, [stats.solvedIds, setupPuzzleOnBoard]);

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!puzzle || puzzleState !== "playing") return false;

      const expectedMove = puzzle.moves[moveIndex];
      if (!expectedMove) return false;

      const expectedFrom = expectedMove.slice(0, 2);
      const expectedTo = expectedMove.slice(2, 4);
      const expectedPromotion = expectedMove.slice(4) || undefined;
      const effectivePromotion = promotion || expectedPromotion;

      let isCorrect =
        from === expectedFrom &&
        to === expectedTo &&
        (effectivePromotion || undefined) === expectedPromotion;

      if (!isCorrect && moveIndex === puzzle.moves.length - 1) {
        const testGame = new Chess(game.fen());
        const testMove = testGame.move({ from, to, promotion: effectivePromotion });
        if (testMove && testGame.isCheckmate()) {
          isCorrect = true;
        }
      }

      if (isCorrect) {
        const newGame = new Chess(game.fen());
        const userMoveResult = newGame.move({ from, to, promotion: effectivePromotion });
        const fenAfterUserMove = newGame.fen();
        setGame(newGame);
        setLastMove({ from, to });
        playSoundFromMove(userMoveResult, newGame);

        // Show !! only if this move is a real sacrifice (losing material)
        if (userMoveResult) {
          const isSacrifice = (() => {
            const moved = userMoveResult.piece;
            const captured = userMoveResult.captured;
            const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
            // Sacrifice = moved piece is worth more than what it captured (or captured nothing)
            // AND the piece can be recaptured by opponent
            if (!captured || pieceValues[moved] > pieceValues[captured]) {
              const opponentMoves = newGame.moves({ verbose: true });
              const canRecapture = opponentMoves.some(m => m.to === to);
              if (canRecapture) return true;
            }
            return false;
          })();
          if (isSacrifice) {
            setBrilliantSquare(to);
          }
        }

        const nextMoveIndex = moveIndex + 1;
        const opponentMove = puzzle.moves[nextMoveIndex];

        if (nextMoveIndex >= puzzle.moves.length) {
          setPuzzleState("solved");
          clearCurrentPuzzleId();
          logAnalyticsEvent("brilliant_solved", {
            puzzle_id: puzzle.id,
            puzzle_rating: puzzle.rating,
            total_solved: stats.solved + 1,
          });
          const newStats = {
            ...stats,
            solved: stats.solved + 1,
            streak: stats.streak + 1,
            bestStreak: Math.max(stats.bestStreak, stats.streak + 1),
            solvedIds: [...stats.solvedIds, puzzle.id],
          };
          setStats(newStats);
          saveStats(newStats);
        } else if (opponentMove) {
          const isCheck = newGame.inCheck();
          const delay = isCheck ? 2200 : 600;
          setMoveIndex(nextMoveIndex);
          setTimeout(() => {
            try {
              setBrilliantSquare(null);
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
              console.error("Invalid opponent move:", opponentMove);
              setPuzzleState("solved");
            }
          }, delay);
        }
        return true;
      } else {
        playIllegalMoveSound();
        setLastMove({ from, to });
        setPuzzleState("failed");
        logAnalyticsEvent("brilliant_failed", {
          puzzle_id: puzzle.id,
          puzzle_rating: puzzle.rating,
        });
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
    [puzzle, puzzleState, moveIndex, game, stats]
  );

  const getHint = useCallback(() => {
    if (!puzzle || puzzleState !== "playing") return null;
    setShowHint(true);
    const nextMove = puzzle.moves[moveIndex];
    if (nextMove) {
      const from = nextMove.slice(0, 2);
      const to = nextMove.slice(2, 4);
      const legalMoves = game.moves({ verbose: true });
      const isLegal = legalMoves.some((m) => m.from === from && m.to === to);
      if (isLegal) return { from, to };
    }
    return null;
  }, [puzzle, puzzleState, moveIndex, game]);

  const retry = useCallback(() => {
    if (!puzzle) return;
    if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
    
    setLastMove(null);
    setIsSettingUp(true);
    setBrilliantSquare(null);
    
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
          gameAfterSetup.move({
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
        } catch (e) {
          setIsSettingUp(false);
        }
      }, 800);
    } else {
      setIsSettingUp(false);
    }
  }, [puzzle]);

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
    brilliantSquare,
    loadPuzzle,
    makeMove,
    getHint,
    retry,
  };
};
