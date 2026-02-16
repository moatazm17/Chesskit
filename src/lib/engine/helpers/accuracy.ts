import {
  ceilsNumber,
  getHarmonicMean,
  getStandardDeviation,
  getWeightedMean,
} from "@/lib/math";
import { Accuracy, PositionEval } from "@/types/eval";
import { getPositionWinPercentage } from "./winPercentage";

export const computeAccuracy = (
  positions: PositionEval[],
  playersRatings?: { white?: number; black?: number }
): Accuracy => {
  const positionsWinPercentage = positions.map(getPositionWinPercentage);

  const weights = getAccuracyWeights(positionsWinPercentage);

  const movesAccuracy = getMovesAccuracy(positionsWinPercentage);

  const whiteAccuracy = getPlayerAccuracy(
    movesAccuracy,
    weights,
    "white",
    playersRatings?.white
  );
  const blackAccuracy = getPlayerAccuracy(
    movesAccuracy,
    weights,
    "black",
    playersRatings?.black
  );

  return {
    white: whiteAccuracy,
    black: blackAccuracy,
  };
};

const getPlayerAccuracy = (
  movesAccuracy: number[],
  weights: number[],
  player: "white" | "black",
  playerRating?: number
): number => {
  const remainder = player === "white" ? 0 : 1;
  const playerAccuracies = movesAccuracy.filter(
    (_, index) => index % 2 === remainder
  );
  const playerWeights = weights.filter((_, index) => index % 2 === remainder);

  const weightedMean = getWeightedMean(playerAccuracies, playerWeights);
  const harmonicMean = getHarmonicMean(playerAccuracies);

  // Heavier weight on harmonic mean to penalize bad moves more (closer to Chess.com CAPS2)
  // Harmonic mean is always <= arithmetic mean and penalizes outliers (blunders) heavily
  let accuracy = (weightedMean + 2 * harmonicMean) / 3;

  // Rating-based adjustment: higher-rated players are expected to play more accurately,
  // so the same centipawn loss results in a slightly lower accuracy score
  if (playerRating && playerRating > 1500) {
    const ratingPenalty = Math.min(0.04, (playerRating - 1500) / 25000);
    accuracy = accuracy * (1 - ratingPenalty);
  }

  return Math.max(0, Math.min(100, accuracy));
};

const getAccuracyWeights = (movesWinPercentage: number[]): number[] => {
  const windowSize = ceilsNumber(
    Math.ceil(movesWinPercentage.length / 10),
    2,
    8
  );

  const windows: number[][] = [];
  const halfWindowSize = Math.round(windowSize / 2);

  for (let i = 1; i < movesWinPercentage.length; i++) {
    const startIdx = i - halfWindowSize;
    const endIdx = i + halfWindowSize;

    if (startIdx < 0) {
      windows.push(movesWinPercentage.slice(0, windowSize));
      continue;
    }

    if (endIdx > movesWinPercentage.length) {
      windows.push(movesWinPercentage.slice(-windowSize));
      continue;
    }

    windows.push(movesWinPercentage.slice(startIdx, endIdx));
  }

  const weights = windows.map((window) => {
    const std = getStandardDeviation(window);
    return ceilsNumber(std, 0.5, 12);
  });

  return weights;
};

const getMovesAccuracy = (movesWinPercentage: number[]): number[] =>
  movesWinPercentage.slice(1).map((winPercent, index) => {
    const lastWinPercent = movesWinPercentage[index];
    const isWhiteMove = index % 2 === 0;
    const winDiff = isWhiteMove
      ? Math.max(0, lastWinPercent - winPercent)
      : Math.max(0, winPercent - lastWinPercent);

    // Chess.com CAPS2-like accuracy curve
    // Steeper decay than Lichess to produce more realistic accuracy scores (typically 50-95%)
    // Original Lichess multiplier: -0.04354, adjusted to -0.055 for stricter scoring
    const rawAccuracy =
      103.1668100711649 * Math.exp(-0.055 * winDiff) - 3.166924740191411;

    return Math.min(100, Math.max(0, rawAccuracy + 1));
  });
