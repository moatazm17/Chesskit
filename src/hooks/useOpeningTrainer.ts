import { useState, useCallback, useRef, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { TrainingLine, LineMastery } from "@/lib/openingTree";
import {
  buildSessionQueue,
  updateMastery,
  saveMastery,
  loadMastery,
} from "@/lib/openingMastery";
import { playSoundFromMove, playIllegalMoveSound } from "@/lib/sounds";

// ── Types ───────────────────────────────────────────────────────────────────

export type TrainerPhase =
  | "idle"
  | "playing"
  | "opponentTurn"
  | "wrong"
  | "correct"
  | "lineComplete"
  | "sessionDone";

export interface SessionStats {
  linesCompleted: number;
  linesCorrect: number;
  linesWrong: number;
  masteryChanges: { lineId: string; oldLevel: number; newLevel: number }[];
}

interface LastMove {
  from: string;
  to: string;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useOpeningTrainer(
  lines: TrainingLine[],
  username: string
) {
  const [phase, setPhase] = useState<TrainerPhase>("idle");
  const [game, setGame] = useState<Chess>(new Chess());
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [hadMistake, setHadMistake] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [retryFen, setRetryFen] = useState<string | null>(null);
  const [isRetry, setIsRetry] = useState(false);
  const retriedLinesRef = useRef<Set<string>>(new Set());
  const [mastery, setMastery] = useState<Record<string, LineMastery>>({});

  const [queue, setQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    linesCompleted: 0,
    linesCorrect: 0,
    linesWrong: 0,
    masteryChanges: [],
  });

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [playableSquares, setPlayableSquares] = useState<Square[]>([]);
  const [captureSquares, setCaptureSquares] = useState<Square[]>([]);
  const [correctArrow, setCorrectArrow] = useState<[string, string] | null>(null);

  const opponentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  useEffect(() => {
    if (username) setMastery(loadMastery(username));
  }, [username]);

  const currentLineId = queue[queueIndex] ?? null;
  const currentLine = lines.find((l) => l.id === currentLineId) ?? null;
  const currentMoveData = currentLine?.moves[moveIndex] ?? null;
  const totalLinesInSession = queue.length;

  // ── Selection helpers ───────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setPlayableSquares([]);
    setCaptureSquares([]);
  }, []);

  const selectSquare = useCallback(
    (sq: Square, g: Chess) => {
      const moves = g.moves({ square: sq, verbose: true });
      if (moves.length === 0) {
        clearSelection();
        return;
      }
      setSelectedSquare(sq);
      setPlayableSquares(moves.map((m) => m.to as Square));
      setCaptureSquares(moves.filter((m) => m.captured).map((m) => m.to as Square));
    },
    [clearSelection]
  );

  // ── Advance to next move (handles opponent auto-play) ─────────────────

  const advanceLine = useCallback(
    (g: Chess, nextIdx: number, line: TrainingLine) => {
      if (nextIdx >= line.moves.length) {
        setPhase("lineComplete");
        return;
      }

      const nextMove = line.moves[nextIdx];
      setMoveIndex(nextIdx);

      if (!nextMove.isPlayerMove) {
        setPhase("opponentTurn");
        opponentTimerRef.current = setTimeout(() => {
          const newG = new Chess(g.fen());
          try {
            const result = newG.move({ from: nextMove.uci.slice(0, 2), to: nextMove.uci.slice(2, 4), promotion: nextMove.uci[4] });
            if (result) {
              setGame(newG);
              setLastMove({ from: nextMove.uci.slice(0, 2), to: nextMove.uci.slice(2, 4) });
              playSoundFromMove(result, newG);
            }
          } catch { /* skip bad move */ }
          advanceLine(newG, nextIdx + 1, line);
        }, 500);
      } else {
        setPhase("playing");
        setFeedback(null);
        clearSelection();
      }
    },
    [clearSelection]
  );

  const loadLine = useCallback(
    (line: TrainingLine) => {
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
      setHadMistake(false);
      setFeedback(null);
      setLastMove(null);
      setCorrectArrow(null);
      setRetryFen(null);
      setIsRetry(retriedLinesRef.current.has(line.id));
      clearSelection();

      const startFen = line.moves.length > 0 ? line.moves[0].parentFen : new Chess().fen();
      const g = new Chess(startFen);
      setGame(g);
      advanceLine(g, 0, line);
    },
    [advanceLine, clearSelection]
  );

  // ── Start session ─────────────────────────────────────────────────────

  const startSession = useCallback(() => {
    const m = loadMastery(username);
    setMastery(m);
    const q = buildSessionQueue(linesRef.current, m);
    if (q.length === 0) {
      setPhase("sessionDone");
      return;
    }
    setQueue(q);
    setQueueIndex(0);
    setSessionStats({ linesCompleted: 0, linesCorrect: 0, linesWrong: 0, masteryChanges: [] });
    retriedLinesRef.current.clear();

    const firstLine = linesRef.current.find((l) => l.id === q[0]);
    if (!firstLine) { setPhase("sessionDone"); return; }
    loadLine(firstLine);
  }, [username, loadLine]);

  // ── Handle line completion ────────────────────────────────────────────

  const finishLine = useCallback(() => {
    if (!currentLine) return;
    const wasCorrect = !hadMistake;
    const oldLevel = mastery[currentLine.id]?.level ?? 0;
    const newMastery = updateMastery(mastery, currentLine.id, wasCorrect);
    const newLevel = newMastery[currentLine.id].level;

    setMastery(newMastery);
    saveMastery(username, newMastery);

    setSessionStats((prev) => ({
      linesCompleted: prev.linesCompleted + 1,
      linesCorrect: prev.linesCorrect + (wasCorrect ? 1 : 0),
      linesWrong: prev.linesWrong + (wasCorrect ? 0 : 1),
      masteryChanges: [
        ...prev.masteryChanges,
        { lineId: currentLine.id, oldLevel, newLevel },
      ],
    }));

    if (!wasCorrect) {
      setQueue((prev) => [...prev, currentLine.id]);
      retriedLinesRef.current.add(currentLine.id);
    }
  }, [currentLine, hadMistake, mastery, username]);

  // ── Next line in queue ────────────────────────────────────────────────

  const nextLine = useCallback(() => {
    finishLine();
    const nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length + (hadMistake && currentLine ? 1 : 0)) {
      setPhase("sessionDone");
      return;
    }
    setQueueIndex(nextIdx);

    const updatedQueue = hadMistake && currentLine ? [...queue, currentLine.id] : queue;
    const nextId = updatedQueue[nextIdx];
    const next = linesRef.current.find((l) => l.id === nextId);
    if (!next) { setPhase("sessionDone"); return; }
    loadLine(next);
  }, [finishLine, queueIndex, queue, hadMistake, currentLine, loadLine]);

  // ── Apply a player move ───────────────────────────────────────────────

  const applyMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (phase !== "playing" || !currentLine || !currentMoveData) return false;

      const newG = new Chess(game.fen());
      let moveResult;
      try {
        moveResult = newG.move({ from, to, promotion });
      } catch {
        playIllegalMoveSound();
        return false;
      }
      if (!moveResult) {
        playIllegalMoveSound();
        return false;
      }

      const playedUci = from + to + (promotion ?? "");

      let expectedUci: string;
      let expectedSan: string;
      if (currentMoveData.isWeakness && currentMoveData.betterUci) {
        expectedUci = currentMoveData.betterUci;
        expectedSan = currentMoveData.betterSan ?? currentMoveData.san;
      } else {
        expectedUci = currentMoveData.uci;
        expectedSan = currentMoveData.san;
      }

      const isCorrect = playedUci === expectedUci;
      const preFen = game.fen();

      clearSelection();
      setGame(newG);
      setLastMove({ from, to });
      playSoundFromMove(moveResult, newG);

      if (isCorrect) {
        setCorrectArrow(null);
        setRetryFen(null);
        if (currentMoveData.isWeakness) {
          setFeedback(
            `${moveResult.san} — win rate ${currentMoveData.betterWinRate}% vs ${currentMoveData.weakWinRate}% with ${currentMoveData.san}.`
          );
        }
        setPhase("correct");
        setTimeout(() => {
          advanceLine(newG, moveIndex + 1, currentLine);
        }, currentMoveData.isWeakness ? 1200 : 400);
      } else {
        setHadMistake(true);
        setFeedback(`Play ${expectedSan} instead.`);
        setCorrectArrow([expectedUci.slice(0, 2), expectedUci.slice(2, 4)]);
        setRetryFen(preFen);
        setPhase("wrong");
      }

      return true;
    },
    [phase, currentLine, currentMoveData, game, moveIndex, advanceLine, clearSelection]
  );

  // ── Retry after wrong move (undo and let user try again) ──────────────

  const retryMove = useCallback(() => {
    if (!retryFen) return;
    const g = new Chess(retryFen);
    setGame(g);
    setLastMove(null);
    setFeedback(null);
    setCorrectArrow(null);
    setRetryFen(null);
    clearSelection();
    setPhase("playing");
  }, [retryFen, clearSelection]);

  // ── Click-to-move ─────────────────────────────────────────────────────

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (phase !== "playing") return;

      const piece = game.get(square);
      const playerPrefix = currentLine?.playerColor === "white" ? "w" : "b";

      if (!selectedSquare) {
        if (piece && piece.color === playerPrefix) selectSquare(square, game);
        return;
      }

      if (square === selectedSquare) {
        clearSelection();
        return;
      }

      if (playableSquares.includes(square)) {
        const sel = game.get(selectedSquare);
        const isPawn = sel?.type === "p";
        const isPromoRank = square[1] === "8" || square[1] === "1";
        applyMove(selectedSquare, square, isPawn && isPromoRank ? "q" : undefined);
        return;
      }

      if (piece && piece.color === playerPrefix) {
        selectSquare(square, game);
      } else {
        clearSelection();
      }
    },
    [phase, game, currentLine, selectedSquare, playableSquares, selectSquare, clearSelection, applyMove]
  );

  const handlePieceDrop = useCallback(
    (from: string, to: string, piece: string): boolean => {
      if (phase !== "playing") return false;
      const isPawn = piece[1]?.toLowerCase() === "p";
      const isPromoRank = to[1] === "8" || to[1] === "1";
      return applyMove(from, to, isPawn && isPromoRank ? "q" : undefined);
    },
    [phase, applyMove]
  );

  // ── Cleanup ───────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    };
  }, []);

  return {
    phase,
    game,
    lastMove,
    feedback,
    currentLine,
    currentMoveData,
    moveIndex,
    hadMistake,
    mastery,
    queue,
    queueIndex,
    totalLinesInSession,
    sessionStats,

    selectedSquare,
    playableSquares,
    captureSquares,
    correctArrow,
    isRetry,
    isAtWeakness: currentMoveData?.isWeakness ?? false,

    startSession,
    nextLine,
    retryMove,
    handleSquareClick,
    handlePieceDrop,

    playerColor: currentLine?.playerColor ?? "white",
  };
}
