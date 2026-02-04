import { useState, useCallback, useEffect, useRef } from "react";
import { Puzzle, PuzzleState, PuzzleStats } from "@/types/puzzle";
import { getRandomPuzzle, getDailyPuzzle } from "@/data/puzzles";
import { Chess } from "chess.js";
import { playMoveSound, playCaptureSound } from "@/lib/sounds";

interface LastMove {
  from: string;
  to: string;
}

const STORAGE_KEY = "chesskit_puzzle_stats";

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

  // Load a new random puzzle
  const loadRandomPuzzle = useCallback(() => {
    // Clear any pending setup timeout
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
    }

    const newPuzzle = getRandomPuzzle(stats.solvedIds);
    if (newPuzzle) {
      setPuzzle(newPuzzle);
      setLastMove(null);
      setIsSettingUp(true);
      
      // First show the initial position (before opponent's move)
      const initialGame = new Chess(newPuzzle.fen);
      setGame(initialGame);
      setPuzzleState("playing");
      setMoveIndex(1);
      setShowHint(false);
      setIsDaily(false);
      
      // Determine player color: it's the color that plays AFTER the setup move
      // If FEN shows White to move, White plays setup, so player is Black
      const setupColor = initialGame.turn();
      setFixedPlayerColor(setupColor === "w" ? "black" : "white");

      // After a delay, animate the opponent's setup move
      if (newPuzzle.moves.length > 0) {
        const firstMove = newPuzzle.moves[0];
        setupTimeoutRef.current = setTimeout(() => {
          try {
            const gameAfterSetup = new Chess(newPuzzle.fen);
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
            console.error("Invalid setup move:", firstMove, "in puzzle:", newPuzzle.id);
            setIsSettingUp(false);
          }
        }, 800); // Delay before showing opponent's move
      } else {
        setIsSettingUp(false);
      }
    }
    return newPuzzle;
  }, [stats.solvedIds]);

  // Load daily puzzle
  const loadDailyPuzzle = useCallback(() => {
    // Clear any pending setup timeout
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
    }

    const dailyPuzzle = getDailyPuzzle();
    setPuzzle(dailyPuzzle);
    setLastMove(null);
    setIsSettingUp(true);
    
    // First show the initial position
    const initialGame = new Chess(dailyPuzzle.fen);
    setGame(initialGame);
    setPuzzleState(stats.dailySolved ? "solved" : "playing");
    setMoveIndex(1);
    setShowHint(false);
    setIsDaily(true);
    
    // Determine player color: it's the color that plays AFTER the setup move
    const setupColor = initialGame.turn();
    setFixedPlayerColor(setupColor === "w" ? "black" : "white");

    // After a delay, animate the opponent's setup move
    if (dailyPuzzle.moves.length > 0) {
      const firstMove = dailyPuzzle.moves[0];
      setupTimeoutRef.current = setTimeout(() => {
        try {
          const gameAfterSetup = new Chess(dailyPuzzle.fen);
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
          console.error("Invalid setup move:", firstMove, "in daily puzzle:", dailyPuzzle.id);
          setIsSettingUp(false);
        }
      }, 800);
    } else {
      setIsSettingUp(false);
    }
    
    return dailyPuzzle;
  }, [stats.dailySolved]);

  // Make a move
  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!puzzle || puzzleState !== "playing") return false;

      const expectedMove = puzzle.moves[moveIndex];
      if (!expectedMove) return false;

      const userMove = from + to + (promotion || "");
      const expectedFrom = expectedMove.slice(0, 2);
      const expectedTo = expectedMove.slice(2, 4);
      const expectedPromotion = expectedMove.slice(4) || undefined;

      // Check if move is correct
      const isCorrect =
        from === expectedFrom &&
        to === expectedTo &&
        (promotion || undefined) === expectedPromotion;

      if (isCorrect) {
        // Play user's move
        const newGame = new Chess(game.fen());
        const userMoveResult = newGame.move({ from, to, promotion });
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
