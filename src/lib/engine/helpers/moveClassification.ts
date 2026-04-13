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

    const winPercentageDiff =
      (positionWinPercentage - lastPositionWinPercentage) *
      (isWhiteMove ? 1 : -1);

    // Near-best: move loses no meaningful win probability (matches Chess.com's
    // definition where Best = 0% expected points lost, with tolerance for
    // engine differences)
    if (winPercentageDiff >= -0.5) {
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

  const ratingFactor = playerRating
    ? Math.max(0.7, 1 - Math.max(0, playerRating - 1500) / 5000)
    : 1;

  let classification: MoveClassification;
  if (winPercentageDiff < -20 * ratingFactor) classification = MoveClassification.Blunder;
  else if (winPercentageDiff < -10 * ratingFactor) classification = MoveClassification.Mistake;
  else if (winPercentageDiff < -5 * ratingFactor) classification = MoveClassification.Inaccuracy;
  else if (winPercentageDiff < -2 * ratingFactor) classification = MoveClassification.Okay;
  else return MoveClassification.Excellent;

  const playerWinBefore = isWhiteMove
    ? lastPositionWinPercentage
    : 100 - lastPositionWinPercentage;
  const playerWinAfter = isWhiteMove
    ? positionWinPercentage
    : 100 - positionWinPercentage;

  console.log(
    `[Classification] winDiff: ${winPercentageDiff.toFixed(2)}, ratingFactor: ${ratingFactor.toFixed(2)}, raw: ${classification}, playerWinBefore: ${playerWinBefore.toFixed(1)}%, playerWinAfter: ${playerWinAfter.toFixed(1)}%`
  );

  if (
    (classification === MoveClassification.Blunder ||
      classification === MoveClassification.Mistake) &&
    ((playerWinBefore > 60 && playerWinAfter > 55) ||
      (playerWinBefore < 40 && playerWinAfter < 40))
  ) {
    console.log(
      `[Classification] ⚡ Still-winning filter: ${classification} → Inaccuracy`
    );
    return MoveClassification.Inaccuracy;
  }

  return classification;
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
  const log = (msg: string) =>
    console.log(`[Brilliant] Move: ${playedMove} | ${msg}`);

  if (lastPositionAlternativeLineWinPercentage === undefined) {
    log("SKIP: no alternative line");
    return false;
  }

  if (isCheck(fen)) {
    log("SKIP: position is check");
    return false;
  }

  if (
    fenTwoMovesAgo &&
    uciLastTwoMoves &&
    isSimplePieceRecapture(fenTwoMovesAgo, uciLastTwoMoves)
  ) {
    log("SKIP: simple recapture");
    return false;
  }

  const minSacrifice = !playerRating || playerRating < 1800 ? 2 : 3;

  const sacrificeValue = getIsPieceSacrifice(fen, playedMove, bestLinePvToPlay);
  log(
    `sacrifice: ${sacrificeValue}, minSacrifice: ${minSacrifice}, bestPv: ${bestLinePvToPlay.slice(0, 5).join(",")}`
  );
  if (sacrificeValue < minSacrifice) {
    log("FAIL: not enough sacrifice");
    return false;
  }

  const winPercentageDiff =
    (positionWinPercentage - lastPositionWinPercentage) *
    (isWhiteMove ? 1 : -1);

  const playerWinAfter = isWhiteMove
    ? positionWinPercentage
    : 100 - positionWinPercentage;

  log(
    `winDiff: ${winPercentageDiff.toFixed(2)}, playerWinAfter: ${playerWinAfter.toFixed(2)}%, lastWin%: ${lastPositionWinPercentage.toFixed(2)}, curWin%: ${positionWinPercentage.toFixed(2)}`
  );

  if (playerWinAfter < 25) {
    log("FAIL: position lost after sacrifice (playerWinAfter < 25%)");
    return false;
  }

  if (winPercentageDiff < -15) {
    log("FAIL: eval collapsed (winDiff < -15%, safety net)");
    return false;
  }

  const playerWinBeforeMove = isWhiteMove
    ? lastPositionWinPercentage
    : 100 - lastPositionWinPercentage;

  const maxWinBeforeMove = !playerRating || playerRating < 1200 ? 96
    : playerRating < 1600 ? 94
    : playerRating < 2000 ? 92
    : 90;

  log(
    `playerWinBefore: ${playerWinBeforeMove.toFixed(2)}, maxWinBefore: ${maxWinBeforeMove}, rating: ${playerRating}`
  );
  if (playerWinBeforeMove > maxWinBeforeMove) {
    log("FAIL: already winning too much");
    return false;
  }

  const pieceCount = getPieceCount(fen);
  const isEndgame = pieceCount < 10;

  const minAlternativeDiff = isEndgame ? 6 : 1;

  const alternativeDiff =
    (positionWinPercentage - lastPositionAlternativeLineWinPercentage) *
    (isWhiteMove ? 1 : -1);
  log(
    `altDiff: ${alternativeDiff.toFixed(2)}, minAltDiff: ${minAlternativeDiff}, altWin%: ${lastPositionAlternativeLineWinPercentage.toFixed(2)}, pieces: ${pieceCount}, endgame: ${isEndgame}`
  );
  if (alternativeDiff < minAlternativeDiff) {
    log("FAIL: alternative too close");
    return false;
  }

  if (pieceCount < 5) {
    log("FAIL: too few pieces");
    return false;
  }

  const isAlternateCompletelyWinning = isWhiteMove
    ? lastPositionAlternativeLineWinPercentage > 98
    : lastPositionAlternativeLineWinPercentage < 2;
  if (isAlternateCompletelyWinning) {
    log("FAIL: alternate is completely winning anyway");
    return false;
  }

  log("✅ BRILLIANT!");
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
