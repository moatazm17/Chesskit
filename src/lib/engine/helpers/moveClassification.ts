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
  let lastClassification: MoveClassification | undefined = undefined;

  const positions = rawPositions.map((rawPosition, index) => {
    if (index === 0) return rawPosition;

    const currentFen = fens[index].split(" ")[0];
    const openingName = openingsByFen.get(currentFen);
    if (openingName) {
      currentOpening = openingName;
      lastClassification = MoveClassification.Book;
      return {
        ...rawPosition,
        opening: openingName,
        moveClassification: MoveClassification.Book,
      };
    }

    const prevPosition = rawPositions[index - 1];

    if (prevPosition.lines.length === 1) {
      lastClassification = MoveClassification.Forced;
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

    const isBestMove = playedMove === prevPosition.bestMove;
    const epLoss = getExpectedPointsLoss(
      lastPositionWinPercentage,
      positionWinPercentage,
      isWhiteMove
    );

    if (
      isBestMove &&
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
      lastClassification = MoveClassification.Brilliant;
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: MoveClassification.Brilliant,
      };
    }

    if (
      isBestMove &&
      isGreatMove(
        lastPositionWinPercentage,
        positionWinPercentage,
        isWhiteMove,
        lastPositionAlternativeLineWinPercentage,
        lastClassification,
        fenTwoMovesAgo,
        uciNextTwoMoves
      )
    ) {
      lastClassification = MoveClassification.Great;
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: MoveClassification.Great,
      };
    }

    // Best move or negligible expected points loss (< 0.5%)
    if (isBestMove || epLoss < 0.5) {
      lastClassification = MoveClassification.Best;
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: MoveClassification.Best,
      };
    }

    const missClassification = getMissClassification(
      lastPositionWinPercentage,
      positionWinPercentage,
      isWhiteMove
    );
    if (missClassification) {
      lastClassification = missClassification;
      return {
        ...rawPosition,
        opening: currentOpening,
        moveClassification: missClassification,
      };
    }

    const moveClassification = getMoveBasicClassification(
      lastPositionWinPercentage,
      positionWinPercentage,
      isWhiteMove
    );

    lastClassification = moveClassification;
    return {
      ...rawPosition,
      opening: currentOpening,
      moveClassification,
    };
  });

  return positions;
};

/**
 * Calculate expected points loss from a move.
 * Expected points = win probability on a 0-1 scale.
 * Win percentage is on a 0-100 scale, so we divide by 100.
 */
const getExpectedPointsLoss = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean
): number => {
  const epBefore = lastPositionWinPercentage / 100;
  const epAfter = positionWinPercentage / 100;
  return isWhiteMove
    ? Math.max(0, epBefore - epAfter) * 100
    : Math.max(0, epAfter - epBefore) * 100;
};

/**
 * Detect "Miss" - a move where the player had a winning position
 * but failed to convert, and the advantage is now significantly reduced or gone.
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

  if (playerWinBefore >= 65 && playerWinAfter < 55 && winLoss >= 10) {
    return MoveClassification.Miss;
  }

  return null;
};

/**
 * Chess.com Expected Points Model thresholds (on 0-100 win% scale):
 *   Best:       0% loss
 *   Excellent:  0–2% loss
 *   Good:       2–5% loss
 *   Inaccuracy: 5–10% loss
 *   Mistake:    10–20% loss
 *   Blunder:    >20% loss
 *
 * Additional context-aware adjustments:
 * - Blunders are downgraded if the player is still clearly winning
 * - Blunders are downgraded if the player was already completely lost
 */
const getMoveBasicClassification = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean
): MoveClassification => {
  const epLoss = getExpectedPointsLoss(
    lastPositionWinPercentage,
    positionWinPercentage,
    isWhiteMove
  );

  let classification: MoveClassification;
  if (epLoss > 20) classification = MoveClassification.Blunder;
  else if (epLoss > 10) classification = MoveClassification.Mistake;
  else if (epLoss > 5) classification = MoveClassification.Inaccuracy;
  else if (epLoss > 2) classification = MoveClassification.Good;
  else return MoveClassification.Excellent;

  const playerWinBefore = isWhiteMove
    ? lastPositionWinPercentage
    : 100 - lastPositionWinPercentage;
  const playerWinAfter = isWhiteMove
    ? positionWinPercentage
    : 100 - positionWinPercentage;

  // Don't call it a blunder if the player is still clearly winning (>= 60%)
  if (classification === MoveClassification.Blunder && playerWinAfter >= 60) {
    return MoveClassification.Good;
  }

  // Don't call it a blunder if the player was already completely lost (<= 40%)
  if (
    classification === MoveClassification.Blunder &&
    playerWinBefore <= 40
  ) {
    return MoveClassification.Good;
  }

  // Soften mistakes when still clearly winning or already losing
  if (
    classification === MoveClassification.Mistake &&
    (playerWinAfter >= 65 || playerWinBefore <= 35)
  ) {
    return MoveClassification.Inaccuracy;
  }

  return classification;
};

/**
 * Brilliant move detection aligned with Chess.com's algorithm:
 * - Must be a piece sacrifice (not a simple recapture)
 * - Must be the best or near-best move
 * - Player must not be in a bad position after the move
 * - Player must not have been in a completely winning position before
 * - More generous for lower-rated players
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
  ) {
    return false;
  }

  // Promotions are excluded (matching WintrChess behavior)
  if (playedMove.length > 4) return false;

  const minSacrifice = !playerRating || playerRating < 1800 ? 2 : 3;

  const sacrificeValue = getIsPieceSacrifice(fen, playedMove, bestLinePvToPlay);
  if (sacrificeValue < minSacrifice) return false;

  const epLoss = getExpectedPointsLoss(
    lastPositionWinPercentage,
    positionWinPercentage,
    isWhiteMove
  );

  // Must be best or near-best (within "Good" range: ≤5% EP loss)
  if (epLoss > 5) return false;

  const playerWinAfter = isWhiteMove
    ? positionWinPercentage
    : 100 - positionWinPercentage;

  // Must not be in a bad position after the sacrifice
  if (playerWinAfter < 25) return false;

  const playerWinBeforeMove = isWhiteMove
    ? lastPositionWinPercentage
    : 100 - lastPositionWinPercentage;

  // Must not have been in a completely winning position already
  // (more generous thresholds for lower-rated players)
  const maxWinBeforeMove = !playerRating || playerRating < 1200 ? 96
    : playerRating < 1600 ? 94
    : playerRating < 2000 ? 92
    : 90;

  if (playerWinBeforeMove > maxWinBeforeMove) return false;

  const pieceCount = getPieceCount(fen);
  if (pieceCount < 5) return false;

  // In endgames, require the sacrifice to be clearly better than alternatives
  if (pieceCount < 10) {
    const alternativeDiff =
      (positionWinPercentage - lastPositionAlternativeLineWinPercentage) *
      (isWhiteMove ? 1 : -1);
    if (alternativeDiff < 6) return false;
  }

  // If the second-best line is already completely winning, not brilliant
  const isAlternateCompletelyWinning = isWhiteMove
    ? lastPositionAlternativeLineWinPercentage > 98
    : lastPositionAlternativeLineWinPercentage < 2;
  if (isAlternateCompletelyWinning) return false;

  return true;
};

/**
 * Great move (!) detection - matches Chess.com's "GreatFind":
 * - A move critical to the game's outcome
 * - Turning a losing position into equal, or equal into winning
 * - Or finding the only viable move in a critical position
 * - Must be best or near-best
 * - Opponent must have just made a mistake (blunder)
 */
const isGreatMove = (
  lastPositionWinPercentage: number,
  positionWinPercentage: number,
  isWhiteMove: boolean,
  lastPositionAlternativeLineWinPercentage: number | undefined,
  lastClassification: MoveClassification | undefined,
  fenTwoMovesAgo: string | null,
  uciMoves: [string, string] | null
): boolean => {
  if (lastPositionAlternativeLineWinPercentage === undefined) return false;

  const epLoss = getExpectedPointsLoss(
    lastPositionWinPercentage,
    positionWinPercentage,
    isWhiteMove
  );
  if (epLoss > 1) return false;

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

  if (isStillClearlyLosing || isAlternateCompletelyWinning) return false;

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

  // Require opponent's last move to have been a blunder (matching WintrChess)
  const afterOpponentBlunder = lastClassification === MoveClassification.Blunder;
  if (hasChangedGameOutcome && afterOpponentBlunder) return true;

  return isTheOnlyGoodMove;
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
