import { useState, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { OpeningWeakness } from "@/lib/openingTree";
import { playSoundFromMove, playIllegalMoveSound } from "@/lib/sounds";

export type TrainerState = "idle" | "playing" | "wrong" | "correct" | "done";

export interface TrainerProgress {
  practiced: string[];  // FEN keys of practiced weaknesses
  correct: number;
  wrong: number;
}

interface LastMove {
  from: string;
  to: string;
}

const PROGRESS_KEY = "chesskit_opening_trainer_progress";

function loadProgress(): TrainerProgress {
  if (typeof window === "undefined") return { practiced: [], correct: 0, wrong: 0 };
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (!saved) return { practiced: [], correct: 0, wrong: 0 };
    return { ...{ practiced: [], correct: 0, wrong: 0 }, ...JSON.parse(saved) };
  } catch {
    return { practiced: [], correct: 0, wrong: 0 };
  }
}

function saveProgress(p: TrainerProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}

export function useOpeningTrainer(weaknesses: OpeningWeakness[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trainerState, setTrainerState] = useState<TrainerState>("idle");
  const [game, setGame] = useState<Chess>(new Chess());
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [progress, setProgress] = useState<TrainerProgress>(() => loadProgress());
  const [playerFeedback, setPlayerFeedback] = useState<string | null>(null);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentWeakness = weaknesses[currentIndex] ?? null;

  const loadWeakness = useCallback(
    (index: number) => {
      const weakness = weaknesses[index];
      if (!weakness) {
        setTrainerState("done");
        return;
      }

      if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);

      setLastMove(null);
      setPlayerFeedback(null);

      const chess = new Chess(weakness.fen);
      setGame(chess);
      setTrainerState("playing");
    },
    [weaknesses]
  );

  const startTraining = useCallback(() => {
    setCurrentIndex(0);
    loadWeakness(0);
  }, [loadWeakness]);

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (trainerState !== "playing" || !currentWeakness) return false;

      const newGame = new Chess(game.fen());
      const moveResult = newGame.move({ from, to, promotion });
      if (!moveResult) {
        playIllegalMoveSound();
        return false;
      }

      const playedUci = from + to + (promotion ?? "");
      const betterUcis = currentWeakness.betterMoves.map((m) => m.uci);
      const isGoodMove = betterUcis.some((uci) => uci === playedUci);
      const isWeakMove = currentWeakness.weakMove.uci === playedUci;

      setGame(newGame);
      setLastMove({ from, to });
      playSoundFromMove(moveResult, newGame);

      if (isGoodMove) {
        const bestMove = currentWeakness.betterMoves[0];
        setPlayerFeedback(
          `Great choice! ${moveResult.san} wins ${bestMove.winRate}% of the time — much better than the usual ${currentWeakness.weakMove.san} (${currentWeakness.weakMove.winRate}%).`
        );
        setTrainerState("correct");
        const newProgress: TrainerProgress = {
          ...progress,
          correct: progress.correct + 1,
          practiced: [...new Set([...progress.practiced, currentWeakness.fen])],
        };
        setProgress(newProgress);
        saveProgress(newProgress);
      } else if (isWeakMove) {
        const bestMove = currentWeakness.betterMoves[0];
        setPlayerFeedback(
          `You played ${moveResult.san} — this only wins ${currentWeakness.weakMove.winRate}% in your games. Try ${bestMove.san} instead, which wins ${bestMove.winRate}% of the time!`
        );
        setTrainerState("wrong");
        const newProgress: TrainerProgress = {
          ...progress,
          wrong: progress.wrong + 1,
        };
        setProgress(newProgress);
        saveProgress(newProgress);
      } else {
        // Any other move — neutral feedback
        const bestMove = currentWeakness.betterMoves[0];
        setPlayerFeedback(
          `Interesting! The recommended move here is ${bestMove.san}, which wins ${bestMove.winRate}% of the time in your games.`
        );
        setTrainerState("correct");
        const newProgress: TrainerProgress = {
          ...progress,
          correct: progress.correct + 1,
          practiced: [...new Set([...progress.practiced, currentWeakness.fen])],
        };
        setProgress(newProgress);
        saveProgress(newProgress);
      }

      return true;
    },
    [trainerState, currentWeakness, game, progress]
  );

  const nextWeakness = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= weaknesses.length) {
      setTrainerState("done");
      return;
    }
    setCurrentIndex(next);
    loadWeakness(next);
  }, [currentIndex, weaknesses.length, loadWeakness]);

  const retryWeakness = useCallback(() => {
    loadWeakness(currentIndex);
  }, [currentIndex, loadWeakness]);

  const playerColor = currentWeakness?.playerColor ?? "white";

  return {
    currentWeakness,
    currentIndex,
    trainerState,
    game,
    lastMove,
    playerFeedback,
    playerColor,
    progress,
    totalWeaknesses: weaknesses.length,
    startTraining,
    makeMove,
    nextWeakness,
    retryWeakness,
  };
}
