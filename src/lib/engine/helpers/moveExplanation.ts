import { Chess, PieceSymbol } from "chess.js";
import { MoveClassification } from "@/types/enums";
import { CurrentPosition, PositionEval } from "@/types/eval";
import { getPositionWinPercentage } from "./winPercentage";
import { moveLineUciToSan, uciMoveParams } from "@/lib/chess";

export interface MoveExplanation {
  title: string;
  description: string;
  details?: string[];
  bestLine?: string[];
  consequence?: string;
  evalChange?: string;
}

type T = (key: string, params?: Record<string, string | number>) => string;

const PIECE_KEYS: Record<PieceSymbol, string> = {
  p: "piecePawn",
  n: "pieceKnight",
  b: "pieceBishop",
  r: "pieceRook",
  q: "pieceQueen",
  k: "pieceKing",
};

const getPieceName = (piece: PieceSymbol, t: T): string =>
  t(PIECE_KEYS[piece] || piece);

const getEvalChangeDescription = (
  prevWinPct: number,
  currWinPct: number,
  isWhiteMove: boolean,
  t: T
): string => {
  const diff = (currWinPct - prevWinPct) * (isWhiteMove ? 1 : -1);
  const absDiff = Math.abs(diff);

  if (absDiff < 2) return "";

  const pct = absDiff.toFixed(0);

  if (diff < 0) {
    if (absDiff > 20) return t("explLostWinChances", { pct });
    if (absDiff > 10) return t("explSignificantlyWorse", { pct });
    return t("explSlightlyWorse", { pct });
  }

  if (absDiff > 20) return t("explGainedWinChances", { pct });
  if (absDiff > 10) return t("explMuchBetter", { pct });
  return t("explImproved", { pct });
};

const detectThreat = (
  fenAfterMove: string,
  opponentBestResponse: string | undefined,
  t: T
): string | undefined => {
  if (!opponentBestResponse) return undefined;

  const game = new Chess(fenAfterMove);

  try {
    const testGame = new Chess(fenAfterMove);
    testGame.move(uciMoveParams(opponentBestResponse));
    if (testGame.isCheckmate()) {
      return t("explAllowsCheckmate");
    }
    if (testGame.inCheck()) {
      return t("explAllowsDangerousCheck");
    }
  } catch {
    // Move parsing failed
  }

  try {
    const move = game.move(uciMoveParams(opponentBestResponse));
    if (move.captured) {
      if (move.captured === "q") {
        return t("explLosesQueen");
      }
      if (move.captured === "r") {
        return t("explLosesRook");
      }
      if (move.captured === "b" || move.captured === "n") {
        return t("explLosesPiece", { piece: getPieceName(move.captured, t) });
      }
    }
    game.undo();
  } catch {
    // Move parsing failed
  }

  return undefined;
};

const detectTactic = (
  fenBefore: string,
  bestMove: string,
  bestLine: string[],
  t: T
): string | undefined => {
  if (!bestLine || bestLine.length < 2) return undefined;

  const game = new Chess(fenBefore);

  try {
    game.move(uciMoveParams(bestMove));

    if (game.inCheck()) {
      if (bestLine.length >= 2) {
        const responseMove = game.move(uciMoveParams(bestLine[0]));
        if (responseMove && bestLine.length >= 2) {
          const followUp = game.move(uciMoveParams(bestLine[1]));
          if (followUp?.captured) {
            return t("explCheckWinsPiece", { piece: getPieceName(followUp.captured, t) });
          }
        }
      }
    }

    game.load(fenBefore);
    const firstMove = game.move(uciMoveParams(bestMove));
    if (firstMove?.captured) {
      return t("explWinsMaterial", { piece: getPieceName(firstMove.captured, t) });
    }
  } catch {
    // Tactic detection failed
  }

  return undefined;
};

export const getMoveExplanation = (
  currentPosition: CurrentPosition,
  previousFen: string | undefined,
  previousEval: PositionEval | undefined,
  t: T
): MoveExplanation | undefined => {
  const { lastMove, eval: currentEval, lastEval } = currentPosition;

  if (!lastMove || !currentEval?.moveClassification) {
    return undefined;
  }

  const moveClassification = currentEval.moveClassification;
  const playedMoveSan = lastMove.san;
  const isWhiteMove = lastMove.color === "w";

  const bestMove = lastEval?.bestMove;
  const bestMoveSan =
    bestMove && previousFen
      ? moveLineUciToSan(previousFen)(bestMove)
      : undefined;

  const prevWinPct = previousEval ? getPositionWinPercentage(previousEval) : 50;
  const currWinPct = currentEval ? getPositionWinPercentage(currentEval) : 50;
  const evalChange = getEvalChangeDescription(
    prevWinPct,
    currWinPct,
    isWhiteMove,
    t
  );

  const opponentBestResponse = currentEval.lines?.[0]?.pv?.[0];
  const currentFen = lastMove.after;
  const threat = detectThreat(currentFen, opponentBestResponse, t);

  const bestLine = lastEval?.lines?.[0]?.pv;
  const tactic =
    bestMove && bestLine && previousFen
      ? detectTactic(previousFen, bestMove, bestLine, t)
      : undefined;

  const bestLineSan =
    bestLine && previousFen
      ? bestLine.slice(0, 4).map((uci, idx) => {
          try {
            const game = new Chess(previousFen);
            for (let i = 0; i < idx; i++) {
              game.move(uciMoveParams(bestLine[i]));
            }
            return moveLineUciToSan(game.fen())(uci);
          } catch {
            return uci;
          }
        })
      : undefined;

  switch (moveClassification) {
    case MoveClassification.Blunder:
      return {
        title: t("explBlunderTitle"),
        description: threat || t("explBlunderDesc", { move: playedMoveSan }),
        details: [
          bestMoveSan ? t("explBetterWas", { move: bestMoveSan }) : undefined,
          tactic,
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
        consequence: threat,
        evalChange,
      };

    case MoveClassification.Mistake:
      return {
        title: t("explMistakeTitle"),
        description: threat || t("explMistakeDesc", { move: playedMoveSan }),
        details: [
          bestMoveSan ? t("explWasStronger", { move: bestMoveSan }) : undefined,
          tactic,
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
        consequence: threat,
        evalChange,
      };

    case MoveClassification.Miss:
      return {
        title: t("explMissTitle"),
        description: t("explMissDesc", { move: playedMoveSan }),
        details: [
          bestMoveSan ? t("explWouldMaintain", { move: bestMoveSan }) : undefined,
          tactic,
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
        consequence: threat,
        evalChange,
      };

    case MoveClassification.Inaccuracy:
      return {
        title: t("explInaccuracyTitle"),
        description: t("explInaccuracyDesc", { move: playedMoveSan }),
        details: [
          bestMoveSan ? t("explConsider", { move: bestMoveSan }) : undefined,
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
        evalChange,
      };

    case MoveClassification.Splendid:
      return {
        title: t("explBrilliantTitle"),
        description: t("explBrilliantDesc", { move: playedMoveSan }),
        details: [
          tactic || t("explDeepSacrifice"),
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
      };

    case MoveClassification.Perfect:
      return {
        title: t("explGreatTitle"),
        description: t("explGreatDesc", { move: playedMoveSan }),
        details: [
          tactic || t("explRequiredCalc"),
          t("explAllOthersWorse"),
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
      };

    case MoveClassification.Best:
      return {
        title: t("explBestTitle"),
        description: t("explBestDesc", { move: playedMoveSan }),
        details: tactic ? [tactic] : undefined,
        bestLine: bestLineSan,
      };

    case MoveClassification.Excellent:
      return {
        title: t("explExcellentTitle"),
        description: t("explExcellentDesc", { move: playedMoveSan }),
        details: tactic ? [tactic] : undefined,
      };

    case MoveClassification.Okay:
      return {
        title: t("explGoodTitle"),
        description: t("explGoodDesc", { move: playedMoveSan }),
        details:
          bestMoveSan && bestMoveSan !== playedMoveSan
            ? [t("explSlightlyBetter", { move: bestMoveSan })]
            : undefined,
      };

    case MoveClassification.Forced:
      return {
        title: t("explForcedTitle"),
        description: t("explForcedDesc", { move: playedMoveSan }),
      };

    case MoveClassification.Opening:
      return {
        title: t("explBookTitle"),
        description: t("explBookDesc", { move: playedMoveSan }),
        details: currentPosition.opening
          ? [t("explOpening", { name: currentPosition.opening })]
          : undefined,
      };

    default:
      return undefined;
  }
};
