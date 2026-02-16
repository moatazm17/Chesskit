import { LineEval, PositionEval } from "@/types/eval";
import {
  getLineWinPercentage,
  getPositionWinPercentage,
} from "./winPercentage";
import { MoveClassification } from "@/types/enums";
import { openings } from "@/data/openings";
import {
  getIsPieceSacrifice,
  getPieceCount,
  isSimplePieceRecapture,
} from "@/lib/chess";

export const getMovesClassification = (
  rawPositions: PositionEval[],
  uciMoves: string[],
  fens: string[],
  playersRatings?: { white?: number; black?: number }
): PositionEval[] => {
  const positionsWinPercentage = rawPositions.map(getPositionWinPercentage);
  let currentOpening: string | undefined = undefined;

  const positions = rawPositions.map((rawPosition, index) => {
    if (index === 0) return rawPosition;

    const currentFen = fens[index].split(" ")[0];
    const opening = openings.find((opening) => opening.fen === currentFen);
    if (opening) {
      currentOpening = opening.name;
      return {
        ...rawPosition,
        opening: opening.name,
        moveClassification: MoveClassification.Opening,
      };
    }

    const prevPosition = rawPositions[index - 1];

    if (prevPosition.lines.length === 1) {
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: MoveClassification.Forced,
      };
    }

    const playedMove = uciMoves[index - 1];

    const lastPositionAlternativeLine: LineEval | undefined =
      prevPosition.lines.filter((line) => line.pv[0] !== playedMove)?.[0];
    const lastPositionAlternativeLineWinPercentage = lastPositionAlternativeLine
      ? getLineWinPercentage(lastPositionAlternativeLine)
      : undefined;

    const bestLinePvToPlay = rawPosition.lines[0].pv;

    const lastPositionWinPercentage = positionsWinPercentage[index - 1];
    const positionWinPercentage = positionsWinPercentage[index];
    const isWhiteMove = index % 2 === 1;
    const playerRating = isWhiteMove
      ? playersRatings?.white
      : playersRatings?.black;

    if (
      isSplendidMove(
        lastPositionWinPercentage,
        positionWinPercentage,
        isWhiteMove,
        playedMove,
        bestLinePvToPlay,
        fens[index - 1],
        lastPositionAlternativeLineWinPercentage,
        prevPosition.shallowBestMove
      )
    ) {
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: MoveClassification.Splendid,
      };
    }

    const fenTwoMovesAgo = index > 1 ? fens[index - 2] : null;
    const uciNextTwoMoves: [string, string] | null =
      index > 1 ? [uciMoves[index - 2], uciMoves[index - 1]] : null;

    if (
      isPerfectMove(
        lastPositionWinPercentage,
        positionWinPercentage,
        isWhiteMove,
        lastPositionAlternativeLineWinPercentage,
        fenTwoMovesAgo,
        uciNextTwoMoves
      )
    ) {
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: MoveClassification.Perfect,
      };
    }

    if (playedMove === prevPosition.bestMove) {
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: MoveClassification.Best,
      };
    }

    // Check for "Miss" (missed winning opportunity) before basic classification
    const missClassification = getMissClassification(
      lastPositionWinPercentage,
      positionWinPercentage,
      isWhiteMove
    );
    if (missClassification) {
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: missClassification,
      };
    }

    const moveClassification = getMoveBasicClassification(
      lastPositionWinPercentage,
      positionWinPercentage,
      isWhiteMove,
      playerRating
    );

    return {
      ...rawPosition,
      opening: currentOpening,
      moveClassification,
    };
  });

  return positions;
};

/**
 * Detect "Miss" - a move where the player had a winning position
 * but failed to convert, and the advantage is now significantly reduced or gone.
 * Similar to Chess.com's "Miss" (formerly "Missed Win").
 */
const getMissClassification = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean
): MoveClassification | null => {
  const playerWinBefore = isWhiteMove
    ? lastPositionWinPercentage
    : 100 - lastPositionWinPercentage;
  const playerWinAfter = isWhiteMove
    ? positionWinPercentage
    : 100 - positionWinPercentage;

  const winLoss = playerWinBefore - playerWinAfter;

  // Miss = had a strong winning position (>= 65%) but let it slip significantly
  // The position after must no longer be clearly winning (< 55%)
  // And the loss must be at least 10%
  if (playerWinBefore >= 65 && playerWinAfter < 55 && winLoss >= 10) {
    return MoveClassification.Miss;
  }

  return null;
};

/**
 * Basic move classification based on win percentage difference.
 * Thresholds are adjusted based on player rating (higher-rated players
 * are held to stricter standards, matching Chess.com's expected points model).
 */
const getMoveBasicClassification = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean,
  playerRating?: number
): MoveClassification => {
  const winPercentageDiff =
    (positionWinPercentage - lastPositionWinPercentage) *
    (isWhiteMove ? 1 : -1);

  // Rating-based threshold adjustment:
  // Higher-rated players are expected to be more precise.
  // Factor ranges from 1.0 (<=1500) to 0.7 (3000+)
  const ratingFactor = playerRating
    ? Math.max(0.7, 1 - Math.max(0, playerRating - 1500) / 5000)
    : 1;

  if (winPercentageDiff < -20 * ratingFactor) return MoveClassification.Blunder;
  if (winPercentageDiff < -10 * ratingFactor) return MoveClassification.Mistake;
  if (winPercentageDiff < -5 * ratingFactor) return MoveClassification.Inaccuracy;
  if (winPercentageDiff < -2 * ratingFactor) return MoveClassification.Okay;
  return MoveClassification.Excellent;
};

/**
 * Brilliant move detection with depth-based counterintuitive check.
 * A move is brilliant only if:
 * 1. It's a significant piece sacrifice (>= minor piece)
 * 2. The engine didn't find it at shallow depth (counterintuitive)
 * 3. The position is not already very winning
 * 4. The alternative is significantly worse
 * 5. The position has enough complexity (not a simplified endgame)
 */
const isSplendidMove = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean,
  playedMove: string,
  bestLinePvToPlay: string[],
  fen: string,
  lastPositionAlternativeLineWinPercentage: number | undefined,
  shallowBestMove: string | undefined
): boolean => {
  if (!lastPositionAlternativeLineWinPercentage) return false;

  const winPercentageDiff =
    (positionWinPercentage - lastPositionWinPercentage) *
    (isWhiteMove ? 1 : -1);

  // Move must not lose more than 1% win probability
  if (winPercentageDiff < -1) return false;

  // Must be a significant piece sacrifice (at least minor piece value = 3 material points)
  const sacrificeValue = getIsPieceSacrifice(fen, playedMove, bestLinePvToPlay);
  if (sacrificeValue < 3) return false;

  // DEPTH-BASED COUNTERINTUITIVE CHECK:
  // If the engine found this move at shallow depth (depth 8), it's "obvious" - not brilliant.
  // A truly brilliant move is one the engine struggles to find at lower depths.
  // If shallowBestMove is undefined (e.g., cloud eval), we skip this check.
  if (shallowBestMove && playedMove === shallowBestMove) return false;

  // Player win% from the moving side's perspective
  const playerWinPercent = isWhiteMove
    ? positionWinPercentage
    : 100 - positionWinPercentage;

  // Don't award brilliant in already very winning positions
  if (playerWinPercent > 75) return false;

  // Don't award brilliant in simplified endgame positions
  const pieceCount = getPieceCount(fen);
  if (pieceCount < 10) return false;

  // The alternative line must be significantly worse
  const alternativeDiff =
    (positionWinPercentage - lastPositionAlternativeLineWinPercentage) *
    (isWhiteMove ? 1 : -1);
  if (alternativeDiff < 8) return false;

  // Don't award if the alternative is already completely winning
  const isAlternateCompletelyWinning = isWhiteMove
    ? lastPositionAlternativeLineWinPercentage > 93
    : lastPositionAlternativeLineWinPercentage < 7;
  if (isAlternateCompletelyWinning) return false;

  return true;
};

const isPerfectMove = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean,
  lastPositionAlternativeLineWinPercentage: number | undefined,
  fenTwoMovesAgo: string | null,
  uciMoves: [string, string] | null
): boolean => {
  if (!lastPositionAlternativeLineWinPercentage) return false;

  const winPercentageDiff =
    (positionWinPercentage - lastPositionWinPercentage) *
    (isWhiteMove ? 1 : -1);

  // Move must not lose more than 1% win probability
  if (winPercentageDiff < -1) return false;

  if (
    fenTwoMovesAgo &&
    uciMoves &&
    isSimplePieceRecapture(fenTwoMovesAgo, uciMoves)
  )
    return false;

  // Don't award in losing positions or when the alternative is completely winning
  const isLosing = isWhiteMove
    ? positionWinPercentage < 50
    : positionWinPercentage > 50;
  const isAlternateCompletelyWinning = isWhiteMove
    ? lastPositionAlternativeLineWinPercentage > 93
    : lastPositionAlternativeLineWinPercentage < 7;

  if (isLosing || isAlternateCompletelyWinning) {
    return false;
  }

  const hasChangedGameOutcome = getHasChangedGameOutcome(
    lastPositionWinPercentage,
    positionWinPercentage,
    isWhiteMove
  );

  const isTheOnlyGoodMove = getIsTheOnlyGoodMove(
    positionWinPercentage,
    lastPositionAlternativeLineWinPercentage,
    isWhiteMove
  );

  return hasChangedGameOutcome || isTheOnlyGoodMove;
};

const getHasChangedGameOutcome = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean
): boolean => {
  const winPercentageDiff =
    (positionWinPercentage - lastPositionWinPercentage) *
    (isWhiteMove ? 1 : -1);
  // Require larger swing (15%) to count as game-changing
  return (
    winPercentageDiff > 15 &&
    ((lastPositionWinPercentage < 50 && positionWinPercentage > 50) ||
      (lastPositionWinPercentage > 50 && positionWinPercentage < 50))
  );
};

const getIsTheOnlyGoodMove = (
  positionWinPercentage: number,
  lastPositionAlternativeLineWinPercentage: number,
  isWhiteMove: boolean
): boolean => {
  const winPercentageDiff =
    (positionWinPercentage - lastPositionAlternativeLineWinPercentage) *
    (isWhiteMove ? 1 : -1);
  // The alternative must be at least 12% worse
  return winPercentageDiff > 12;
};
