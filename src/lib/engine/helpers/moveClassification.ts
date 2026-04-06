import { LineEval, PositionEval } from "@/types/eval";
import {
  getLineWinPercentage,
  getPositionWinPercentage,
} from "./winPercentage";
import { MoveClassification } from "@/types/enums";
import { openingsByFen } from "@/data/openings";
import {
  getIsPieceSacrifice,
  getPieceCount,
  isSimplePieceRecapture,
  isCheck,
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
    const openingName = openingsByFen.get(currentFen);
    if (openingName) {
      currentOpening = openingName;
      return {
        ...rawPosition,
        opening: openingName,
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

    const fenTwoMovesAgo = index > 1 ? fens[index - 2] : null;
    const uciNextTwoMoves: [string, string] | null =
      index > 1 ? [uciMoves[index - 2], uciMoves[index - 1]] : null;

    if (
      isBrilliantMove(
        lastPositionWinPercentage,
        positionWinPercentage,
        isWhiteMove,
        playedMove,
        bestLinePvToPlay,
        fens[index - 1],
        lastPositionAlternativeLineWinPercentage,
        playerRating,
        fenTwoMovesAgo,
        uciNextTwoMoves
      )
    ) {
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: MoveClassification.Brilliant,
      };
    }

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
 * Brilliant move detection aligned with Chess.com's current algorithm.
 * Chess.com uses sacrifice-based detection (not depth-based) and is
 * more generous for lower-rated players.
 */
const isBrilliantMove = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean,
  playedMove: string,
  bestLinePvToPlay: string[],
  fen: string,
  lastPositionAlternativeLineWinPercentage: number | undefined,
  playerRating?: number,
  fenTwoMovesAgo?: string | null,
  uciLastTwoMoves?: [string, string] | null
): boolean => {
  if (lastPositionAlternativeLineWinPercentage === undefined) return false;

  if (isCheck(fen)) return false;

  if (
    fenTwoMovesAgo &&
    uciLastTwoMoves &&
    isSimplePieceRecapture(fenTwoMovesAgo, uciLastTwoMoves)
  )
    return false;

  const winPercentageDiff =
    (positionWinPercentage - lastPositionWinPercentage) *
    (isWhiteMove ? 1 : -1);

  if (winPercentageDiff < -3) return false;

  const minSacrifice = !playerRating || playerRating < 1800 ? 2 : 3;

  const sacrificeValue = getIsPieceSacrifice(fen, playedMove, bestLinePvToPlay);
  if (sacrificeValue < minSacrifice) return false;

  const playerWinBeforeMove = isWhiteMove
    ? lastPositionWinPercentage
    : 100 - lastPositionWinPercentage;

  const maxWinBeforeMove = !playerRating || playerRating < 1200 ? 96
    : playerRating < 1600 ? 94
    : playerRating < 2000 ? 92
    : 90;

  if (playerWinBeforeMove > maxWinBeforeMove) return false;

  const pieceCount = getPieceCount(fen);
  const isEndgame = pieceCount < 10;

  // In endgame: sacrifice must be the only good move (alternative much worse)
  // In opening/middlegame: sacrifice just needs to be strong
  const minAlternativeDiff = isEndgame ? 8 : 2;

  const alternativeDiff =
    (positionWinPercentage - lastPositionAlternativeLineWinPercentage) *
    (isWhiteMove ? 1 : -1);
  if (alternativeDiff < minAlternativeDiff) return false;

  // Don't award in trivial endgames (king + 1 piece)
  if (pieceCount < 5) return false;

  // Don't award if the alternative is already completely winning
  const isAlternateCompletelyWinning = isWhiteMove
    ? lastPositionAlternativeLineWinPercentage > 98
    : lastPositionAlternativeLineWinPercentage < 2;
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
  if (lastPositionAlternativeLineWinPercentage === undefined) return false;

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

  const isStillClearlyLosing = isWhiteMove
    ? positionWinPercentage < 45
    : positionWinPercentage > 55;
  const isAlternateCompletelyWinning = isWhiteMove
    ? lastPositionAlternativeLineWinPercentage > 96
    : lastPositionAlternativeLineWinPercentage < 4;

  if (isStillClearlyLosing || isAlternateCompletelyWinning) {
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

  const playerWinBefore = isWhiteMove
    ? lastPositionWinPercentage
    : 100 - lastPositionWinPercentage;
  const playerWinAfter = isWhiteMove
    ? positionWinPercentage
    : 100 - positionWinPercentage;

  return (
    winPercentageDiff > 10 &&
    ((playerWinBefore < 55 && playerWinAfter > 60) ||
      (playerWinBefore < 40 && playerWinAfter > 45))
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
  return winPercentageDiff > 8;
};
