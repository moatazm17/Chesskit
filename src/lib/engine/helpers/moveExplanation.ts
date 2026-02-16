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

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const getPieceName = (piece: PieceSymbol): string =>
  PIECE_NAMES[piece] || piece;

const getEvalChangeDescription = (
  prevWinPct: number,
  currWinPct: number,
  isWhiteMove: boolean
): string => {
  const diff = (currWinPct - prevWinPct) * (isWhiteMove ? 1 : -1);
  const absDiff = Math.abs(diff);

  if (absDiff < 2) return "";

  if (diff < 0) {
    if (absDiff > 20)
      return `Lost ${absDiff.toFixed(0)}% winning chances`;
    if (absDiff > 10)
      return `Significantly worse position (−${absDiff.toFixed(0)}%)`;
    return `Slightly worse position (−${absDiff.toFixed(0)}%)`;
  }

  if (absDiff > 20) return `Gained ${absDiff.toFixed(0)}% winning chances`;
  if (absDiff > 10) return `Much better position (+${absDiff.toFixed(0)}%)`;
  return `Improved position (+${absDiff.toFixed(0)}%)`;
};

const detectThreat = (
  fenAfterMove: string,
  opponentBestResponse: string | undefined
): string | undefined => {
  if (!opponentBestResponse) return undefined;

  const game = new Chess(fenAfterMove);

  // Check if opponent can deliver checkmate
  try {
    const testGame = new Chess(fenAfterMove);
    testGame.move(uciMoveParams(opponentBestResponse));
    if (testGame.isCheckmate()) {
      return "This allows checkmate!";
    }
    if (testGame.inCheck()) {
      return "This allows a dangerous check";
    }
  } catch {
    // Move parsing failed, continue
  }

  // Check if the response captures a piece
  try {
    const move = game.move(uciMoveParams(opponentBestResponse));
    if (move.captured) {
      const capturedPiece = getPieceName(move.captured);
      if (move.captured === "q") {
        return "This loses the queen!";
      }
      if (move.captured === "r") {
        return "This loses a rook";
      }
      if (move.captured === "b" || move.captured === "n") {
        return `This loses a ${capturedPiece}`;
      }
    }
    game.undo();
  } catch {
    // Move parsing failed, continue
  }

  return undefined;
};

const detectTactic = (
  fenBefore: string,
  bestMove: string,
  bestLine: string[]
): string | undefined => {
  if (!bestLine || bestLine.length < 2) return undefined;

  const game = new Chess(fenBefore);

  try {
    // Play the best move
    game.move(uciMoveParams(bestMove));

    // Check if it's a check
    if (game.inCheck()) {
      // See if it wins material
      if (bestLine.length >= 2) {
        const responseMove = game.move(uciMoveParams(bestLine[0]));
        if (responseMove && bestLine.length >= 2) {
          const followUp = game.move(uciMoveParams(bestLine[1]));
          if (followUp?.captured) {
            const piece = getPieceName(followUp.captured);
            return `A check that wins the ${piece}`;
          }
        }
      }
    }

    // Reset and check for captures leading to material gain
    game.load(fenBefore);
    const firstMove = game.move(uciMoveParams(bestMove));
    if (firstMove?.captured) {
      return `Wins material by capturing the ${getPieceName(firstMove.captured)}`;
    }
  } catch {
    // Tactic detection failed
  }

  return undefined;
};

export const getMoveExplanation = (
  currentPosition: CurrentPosition,
  previousFen: string | undefined,
  previousEval: PositionEval | undefined
): MoveExplanation | undefined => {
  const { lastMove, eval: currentEval, lastEval } = currentPosition;

  if (!lastMove || !currentEval?.moveClassification) {
    return undefined;
  }

  const moveClassification = currentEval.moveClassification;
  const playedMoveSan = lastMove.san;
  const isWhiteMove = lastMove.color === "w";

  // Get the best move that should have been played
  const bestMove = lastEval?.bestMove;
  const bestMoveSan =
    bestMove && previousFen
      ? moveLineUciToSan(previousFen)(bestMove)
      : undefined;

  // Get win percentage change
  const prevWinPct = previousEval ? getPositionWinPercentage(previousEval) : 50;
  const currWinPct = currentEval ? getPositionWinPercentage(currentEval) : 50;
  const evalChange = getEvalChangeDescription(
    prevWinPct,
    currWinPct,
    isWhiteMove
  );

  // Get the opponent's best response to the played move
  const opponentBestResponse = currentEval.lines?.[0]?.pv?.[0];
  const currentFen = lastMove.after;

  // Detect threats created by the move
  const threat = detectThreat(currentFen, opponentBestResponse);

  // Get the best line continuation
  const bestLine = lastEval?.lines?.[0]?.pv;
  const tactic =
    bestMove && bestLine && previousFen
      ? detectTactic(previousFen, bestMove, bestLine)
      : undefined;

  // Format the best continuation for display
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
        title: "Blunder",
        description: threat || `${playedMoveSan} was a serious mistake`,
        details: [
          bestMoveSan ? `Better was ${bestMoveSan}` : undefined,
          tactic,
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
        consequence: threat,
        evalChange,
      };

    case MoveClassification.Mistake:
      return {
        title: "Mistake",
        description: threat || `${playedMoveSan} loses advantage`,
        details: [
          bestMoveSan ? `${bestMoveSan} was stronger` : undefined,
          tactic,
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
        consequence: threat,
        evalChange,
      };

    case MoveClassification.Miss:
      return {
        title: "Miss",
        description: `${playedMoveSan} lets the winning advantage slip away`,
        details: [
          bestMoveSan ? `${bestMoveSan} would have maintained the advantage` : undefined,
          tactic,
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
        consequence: threat,
        evalChange,
      };

    case MoveClassification.Inaccuracy:
      return {
        title: "Inaccuracy",
        description: `${playedMoveSan} is not the most accurate`,
        details: [
          bestMoveSan ? `Consider ${bestMoveSan} instead` : undefined,
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
        evalChange,
      };

    case MoveClassification.Splendid:
      return {
        title: "Brilliant!",
        description: `${playedMoveSan} is a brilliant sacrifice!`,
        details: [
          tactic || "A deep move that sacrifices material for a winning attack",
          evalChange,
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
      };

    case MoveClassification.Perfect:
      return {
        title: "Great Move!",
        description: `${playedMoveSan} is the only good move here`,
        details: [
          tactic || "Finding this move required deep calculation",
          "All other moves were significantly worse",
        ].filter(Boolean) as string[],
        bestLine: bestLineSan,
      };

    case MoveClassification.Best:
      return {
        title: "Best Move",
        description: `${playedMoveSan} is the engine's top choice`,
        details: tactic ? [tactic] : undefined,
        bestLine: bestLineSan,
      };

    case MoveClassification.Excellent:
      return {
        title: "Excellent",
        description: `${playedMoveSan} is a very strong move`,
        details: tactic ? [tactic] : undefined,
      };

    case MoveClassification.Okay:
      return {
        title: "Good Move",
        description: `${playedMoveSan} is solid`,
        details:
          bestMoveSan && bestMoveSan !== playedMoveSan
            ? [`${bestMoveSan} was slightly better`]
            : undefined,
      };

    case MoveClassification.Forced:
      return {
        title: "Forced",
        description: `${playedMoveSan} was the only legal move`,
      };

    case MoveClassification.Opening:
      return {
        title: "Book Move",
        description: `${playedMoveSan} is a known opening move`,
        details: currentPosition.opening
          ? [`Opening: ${currentPosition.opening}`]
          : undefined,
      };

    default:
      return undefined;
  }
};
