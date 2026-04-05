import { ceilsNumber } from "@/lib/math";
import { GameEval, PositionEval } from "@/types/eval";
import { MoveClassification } from "@/types/enums";

export interface FairPlayMetrics {
  engineMatchRate: number;
  acpl: number;
  trimmedAcpl: number;
  cplStdDev: number;
  trimmedCplStdDev: number;
  accuracy: number;
  eloGap: number;
  totalMovesAnalyzed: number;
  gameLength: number;
  moveTimeMean?: number;
  moveTimeStdDev?: number;
  moveTimeConsistency?: number;
  timingComplexityCorr?: number;
  criticalEngineMatch?: number;
  hasTimingData: boolean;
}

export interface FairPlayGameResult {
  metrics: FairPlayMetrics;
  suspicionScores: {
    engineMatch: number;
    acpl: number;
    consistency: number;
    accuracy: number;
    eloGap: number;
    timing?: number;
  };
  compositeSuspicion: number;
  gameInfo: {
    date?: string;
    opponent?: string;
    result?: string;
    timeControl?: string;
    playerColor: "white" | "black";
    playerRating?: number;
  };
}

export type Verdict = "unlikely" | "questionable" | "likely" | "almostCertain";

export interface AccountFlag {
  level: "red" | "orange" | "yellow" | "none";
  daysOld: number;
  labelKey: string;
}

export type AnalysisMode = "single" | "multi";
export type Confidence = "low" | "medium" | "high";

export interface FairPlayReport {
  games: FairPlayGameResult[];
  overallSuspicion: number;
  verdict: Verdict;
  accountFlag: AccountFlag;
  playerRating: number;
  summaryKey: string;
  confidence: Confidence;
  mode: AnalysisMode;
}

// --- THRESHOLDS: 90th percentile of normal play ---
// One set of thresholds for ALL games. Same game = same scores always.
// These represent a strong performance for each rating level.

export function expectedEngineMatch(rating: number): number {
  if (rating <= 600) return 35;
  if (rating <= 800) return 40;
  if (rating <= 1000) return 46;
  if (rating <= 1200) return 53;
  if (rating <= 1500) return 58;
  if (rating <= 1800) return 64;
  if (rating <= 2000) return 70;
  if (rating <= 2200) return 76;
  if (rating <= 2500) return 82;
  return 85;
}

export function expectedAcplFloor(rating: number): number {
  if (rating <= 600) return 80;
  if (rating <= 800) return 60;
  if (rating <= 1000) return 45;
  if (rating <= 1200) return 33;
  if (rating <= 1500) return 25;
  if (rating <= 1800) return 18;
  if (rating <= 2000) return 14;
  if (rating <= 2200) return 11;
  if (rating <= 2500) return 8;
  return 7;
}

export function expectedAccuracyCeiling(rating: number): number {
  if (rating <= 600) return 50;
  if (rating <= 800) return 58;
  if (rating <= 1000) return 66;
  if (rating <= 1200) return 76;
  if (rating <= 1500) return 82;
  if (rating <= 1800) return 87;
  if (rating <= 2000) return 91;
  if (rating <= 2200) return 94;
  if (rating <= 2500) return 96;
  return 97;
}

const CHEATER_ENGINE_MATCH = 92;
const CHEATER_ACPL = 4;
const CHEATER_ACCURACY = 98;
const CHEATER_CPL_STDDEV = 6;
const SUSPICIOUS_ELO_GAP = 700;
const NORMAL_CPL_STDDEV_FLOOR = 30;
const ELO_GAP_THRESHOLD = 250;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function computeEngineMatchSuspicion(rate: number, rating: number): number {
  const ceiling = expectedEngineMatch(rating);
  if (rate <= ceiling) return 0;
  return clamp01((rate - ceiling) / (CHEATER_ENGINE_MATCH - ceiling)) * 100;
}

function computeAcplSuspicion(acpl: number, rating: number): number {
  const floor = expectedAcplFloor(rating);
  if (acpl >= floor) return 0;
  return clamp01((floor - acpl) / (floor - CHEATER_ACPL)) * 100;
}

function computeConsistencySuspicion(stdDev: number): number {
  if (stdDev >= NORMAL_CPL_STDDEV_FLOOR) return 0;
  return clamp01((NORMAL_CPL_STDDEV_FLOOR - stdDev) / (NORMAL_CPL_STDDEV_FLOOR - CHEATER_CPL_STDDEV)) * 100;
}

function computeAccuracySuspicion(acc: number, rating: number): number {
  const ceiling = expectedAccuracyCeiling(rating);
  if (acc <= ceiling) return 0;
  return clamp01((acc - ceiling) / (CHEATER_ACCURACY - ceiling)) * 100;
}

function computeEloGapSuspicion(estimatedElo: number, actualRating: number): number {
  const gap = estimatedElo - actualRating;
  if (gap <= ELO_GAP_THRESHOLD) return 0;
  return clamp01((gap - ELO_GAP_THRESHOLD) / (SUSPICIOUS_ELO_GAP - ELO_GAP_THRESHOLD)) * 100;
}

function getPositionCp(pos: PositionEval): number {
  const line = pos.lines[0];
  if (line?.cp !== undefined) return ceilsNumber(line.cp, -1000, 1000);
  if (line?.mate !== undefined) return ceilsNumber(line.mate * Infinity, -1000, 1000);
  return 0;
}

function getPerMoveCpl(positions: PositionEval[], side: "white" | "black"): number[] {
  const losses: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    const isWhiteMove = (i - 1) % 2 === 0;
    if ((side === "white" && !isWhiteMove) || (side === "black" && isWhiteMove)) continue;

    const prevCp = getPositionCp(positions[i - 1]);
    const currCp = getPositionCp(positions[i]);

    let loss: number;
    if (isWhiteMove) {
      loss = prevCp > currCp ? Math.min(prevCp - currCp, 1000) : 0;
    } else {
      loss = currCp > prevCp ? Math.min(currCp - prevCp, 1000) : 0;
    }
    losses.push(loss);
  }
  return losses;
}

function computeEngineMatchRate(
  positions: PositionEval[],
  uciMoves: string[],
  side: "white" | "black"
): { rate: number; top2Rate: number; total: number } {
  let matchedTop1 = 0;
  let matchedTop2 = 0;
  let total = 0;

  for (let i = 0; i < uciMoves.length; i++) {
    const isWhiteMove = i % 2 === 0;
    if ((side === "white" && !isWhiteMove) || (side === "black" && isWhiteMove)) continue;

    const posEval = positions[i];
    if (!posEval) continue;

    const cls = posEval.moveClassification;
    if (cls === MoveClassification.Opening || cls === MoveClassification.Forced) continue;

    total++;

    const bestMove = posEval.bestMove || posEval.lines[0]?.pv?.[0];
    if (bestMove && uciMoves[i] === bestMove) {
      matchedTop1++;
      matchedTop2++;
      continue;
    }

    const secondLine = posEval.lines[1];
    if (secondLine?.pv?.[0] && uciMoves[i] === secondLine.pv[0]) {
      matchedTop2++;
    }
  }

  return {
    rate: total > 0 ? (matchedTop1 / total) * 100 : 0,
    top2Rate: total > 0 ? (matchedTop2 / total) * 100 : 0,
    total,
  };
}

// --- TIMING & COMPLEXITY HELPERS ---

function computeThinkTimes(clockTimes: number[], side: "white" | "black"): number[] {
  const startIdx = side === "white" ? 0 : 1;
  const sideTimes: number[] = [];
  for (let i = startIdx; i < clockTimes.length; i += 2) {
    sideTimes.push(clockTimes[i]);
  }
  const thinkTimes: number[] = [];
  for (let i = 1; i < sideTimes.length; i++) {
    const diff = sideTimes[i - 1] - sideTimes[i];
    if (diff >= 0) thinkTimes.push(diff);
  }
  return thinkTimes;
}

function computePositionComplexity(pos: PositionEval): number {
  if (!pos || pos.lines.length < 2) return 0;
  if (pos.moveClassification === MoveClassification.Forced) return 0;

  const line0 = pos.lines[0];
  const line1 = pos.lines[1];

  if (line0.mate !== undefined || line1.mate !== undefined) {
    if (line0.mate !== undefined && line1.mate !== undefined) return 30;
    return 0;
  }
  if (line0.cp === undefined || line1.cp === undefined) return 0;

  const cpGap = Math.abs(line0.cp - line1.cp);
  return Math.max(0, Math.min(100, (1 - cpGap / 200) * 100));
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }
  const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function computeTimingSuspicion(metrics: FairPlayMetrics): number {
  if (!metrics.hasTimingData || metrics.moveTimeMean === undefined || metrics.moveTimeStdDev === undefined) {
    return 0;
  }

  // 1. Timing consistency: low coefficient of variation = bot-like
  let consistencyScore = 0;
  const cv = metrics.moveTimeConsistency ?? (metrics.moveTimeStdDev / Math.max(metrics.moveTimeMean, 0.1));
  if (cv < 0.25) consistencyScore = 80;
  else if (cv < 0.40) consistencyScore = 50;
  else if (cv < 0.55) consistencyScore = 20;

  // 2. Timing-complexity correlation: humans think longer on hard positions
  let correlationScore = 0;
  if (metrics.timingComplexityCorr !== undefined) {
    const corr = metrics.timingComplexityCorr;
    if (corr < 0.05) correlationScore = 70;
    else if (corr < 0.15) correlationScore = 45;
    else if (corr < 0.25) correlationScore = 20;
  }

  // 3. Critical engine match premium: cheaters match engine equally in easy and hard positions
  let criticalMatchScore = 0;
  if (metrics.criticalEngineMatch !== undefined) {
    const premium = metrics.criticalEngineMatch - metrics.engineMatchRate;
    if (premium > 15) criticalMatchScore = 60;
    else if (premium > 8) criticalMatchScore = 30;
  }

  return 0.4 * consistencyScore + 0.4 * correlationScore + 0.2 * criticalMatchScore;
}

export function extractMetrics(
  gameEval: GameEval,
  uciMoves: string[],
  side: "white" | "black",
  playerRating: number,
  clockTimes?: number[] | null
): FairPlayMetrics {
  const { positions, accuracy, estimatedElo } = gameEval;
  const { rate, total } = computeEngineMatchRate(positions, uciMoves, side);

  const perMoveCpl = getPerMoveCpl(positions, side);
  const acpl = perMoveCpl.length > 0 ? perMoveCpl.reduce((a, b) => a + b, 0) / perMoveCpl.length : 0;

  let cplStdDev = 0;
  if (perMoveCpl.length > 1) {
    const variance = perMoveCpl.reduce((sum, v) => sum + (v - acpl) ** 2, 0) / perMoveCpl.length;
    cplStdDev = Math.sqrt(variance);
  }

  // Trimmed metrics: remove the worst 1-2 moves to detect deliberate blunders
  // A cheater may intentionally play 1-2 terrible moves to inflate ACPL and StdDev
  const sortedCpl = [...perMoveCpl].sort((a, b) => a - b);
  const trimCount = perMoveCpl.length <= 10 ? 1 : 2;
  const trimmedCpl = sortedCpl.slice(0, Math.max(1, sortedCpl.length - trimCount));
  const trimmedAcpl = trimmedCpl.length > 0 ? trimmedCpl.reduce((a, b) => a + b, 0) / trimmedCpl.length : acpl;

  let trimmedCplStdDev = cplStdDev;
  if (trimmedCpl.length > 1) {
    const tVariance = trimmedCpl.reduce((sum, v) => sum + (v - trimmedAcpl) ** 2, 0) / trimmedCpl.length;
    trimmedCplStdDev = Math.sqrt(tVariance);
  }

  const playerAccuracy = side === "white" ? accuracy.white : accuracy.black;
  const estimatedPlayerElo = estimatedElo ? (side === "white" ? estimatedElo.white : estimatedElo.black) : playerRating;

  // --- Position complexity per move ---
  const perMoveComplexity: number[] = [];
  for (let i = 0; i < uciMoves.length; i++) {
    const isWhiteMove = i % 2 === 0;
    if ((side === "white" && !isWhiteMove) || (side === "black" && isWhiteMove)) continue;
    const posEval = positions[i];
    if (!posEval) continue;
    const cls = posEval.moveClassification;
    if (cls === MoveClassification.Opening || cls === MoveClassification.Forced) continue;
    perMoveComplexity.push(computePositionComplexity(posEval));
  }

  // --- Critical engine match: engine match in complex positions only ---
  let criticalMatched = 0;
  let criticalTotal = 0;
  for (let i = 0; i < uciMoves.length; i++) {
    const isWhiteMove = i % 2 === 0;
    if ((side === "white" && !isWhiteMove) || (side === "black" && isWhiteMove)) continue;
    const posEval = positions[i];
    if (!posEval) continue;
    const cls = posEval.moveClassification;
    if (cls === MoveClassification.Opening || cls === MoveClassification.Forced) continue;
    const complexity = computePositionComplexity(posEval);
    if (complexity < 40) continue;
    criticalTotal++;
    const bestMove = posEval.bestMove || posEval.lines[0]?.pv?.[0];
    if (bestMove && uciMoves[i] === bestMove) criticalMatched++;
  }
  const criticalEngineMatch = criticalTotal >= 3 ? (criticalMatched / criticalTotal) * 100 : undefined;

  // --- Timing metrics ---
  const hasTimingData = !!clockTimes && clockTimes.length >= 6;
  let moveTimeMean: number | undefined;
  let moveTimeStdDev: number | undefined;
  let moveTimeConsistency: number | undefined;
  let timingComplexityCorr: number | undefined;

  if (hasTimingData && clockTimes) {
    const thinkTimes = computeThinkTimes(clockTimes, side);
    if (thinkTimes.length >= 5) {
      moveTimeMean = thinkTimes.reduce((a, b) => a + b, 0) / thinkTimes.length;
      const mtVariance = thinkTimes.reduce((s, v) => s + (v - moveTimeMean!) ** 2, 0) / thinkTimes.length;
      moveTimeStdDev = Math.sqrt(mtVariance);
      moveTimeConsistency = moveTimeMean > 0.5 ? moveTimeStdDev / moveTimeMean : undefined;

      // Correlation between think time and position complexity
      // Align arrays: both should have one entry per non-opening, non-forced move
      const alignedLen = Math.min(thinkTimes.length, perMoveComplexity.length);
      if (alignedLen >= 5) {
        timingComplexityCorr = pearsonCorrelation(
          thinkTimes.slice(0, alignedLen),
          perMoveComplexity.slice(0, alignedLen)
        );
      }
    }
  }

  return {
    engineMatchRate: rate,
    acpl,
    trimmedAcpl,
    cplStdDev,
    trimmedCplStdDev,
    accuracy: playerAccuracy,
    eloGap: estimatedPlayerElo - playerRating,
    totalMovesAnalyzed: total,
    gameLength: uciMoves.length,
    moveTimeMean,
    moveTimeStdDev,
    moveTimeConsistency,
    timingComplexityCorr,
    criticalEngineMatch,
    hasTimingData,
  };
}

export type PlayerResult = "win" | "loss" | "draw";

// Scores a game consistently — same game always produces same scores
export function computeGameSuspicion(
  metrics: FairPlayMetrics,
  playerRating: number,
  playerResult?: PlayerResult
): { scores: FairPlayGameResult["suspicionScores"]; composite: number } {
  const engineMatch = computeEngineMatchSuspicion(metrics.engineMatchRate, playerRating);
  const acpl = computeAcplSuspicion(metrics.acpl, playerRating);
  const consistency = computeConsistencySuspicion(metrics.cplStdDev);
  const accuracy = computeAccuracySuspicion(metrics.accuracy, playerRating);
  const eloGap = computeEloGapSuspicion(playerRating + metrics.eloGap, playerRating);
  const timing = metrics.hasTimingData ? computeTimingSuspicion(metrics) : undefined;

  let composite: number;
  if (timing !== undefined) {
    composite =
      0.25 * engineMatch +
      0.20 * acpl +
      0.10 * consistency +
      0.10 * accuracy +
      0.15 * eloGap +
      0.20 * timing;
  } else {
    composite =
      0.30 * engineMatch +
      0.25 * acpl +
      0.15 * consistency +
      0.15 * accuracy +
      0.15 * eloGap;
  }

  // If multiple direct metrics (engine match, acpl, accuracy) are elevated, boost
  const directSuspicion = [engineMatch, acpl, accuracy].filter((s) => s > 15).length;
  if (directSuspicion >= 2) {
    composite = Math.min(100, composite + 8);
  }

  // Deliberate blunder masking: detect when 1-2 catastrophic moves inflate ACPL
  const acplFloor = expectedAcplFloor(playerRating);
  if (
    metrics.trimmedAcpl < acplFloor &&
    metrics.acpl > metrics.trimmedAcpl * 2.5 &&
    metrics.acpl < acplFloor * 1.5
  ) {
    const maskingAcpl = computeAcplSuspicion(metrics.trimmedAcpl, playerRating);
    composite = Math.min(100, composite + maskingAcpl * 0.15);
  }

  // Consistency masking
  if (
    metrics.trimmedCplStdDev < NORMAL_CPL_STDDEV_FLOOR &&
    metrics.cplStdDev > metrics.trimmedCplStdDev * 3
  ) {
    const maskingCons = computeConsistencySuspicion(metrics.trimmedCplStdDev);
    composite = Math.min(100, composite + maskingCons * 0.10);
  }

  // Short game dampening
  if (metrics.totalMovesAnalyzed < 20) {
    composite *= 0.75;
  }

  // Game result factor
  if (playerResult === "loss") {
    composite *= 0.7;
  } else if (playerResult === "draw") {
    composite *= 0.85;
  }

  return {
    scores: { engineMatch, acpl, consistency, accuracy, eloGap, timing },
    composite: Math.round(composite * 10) / 10,
  };
}

// Verdict: mode controls how strict the labels are
// Single-game: can reach "likely" but never "almostCertain" (needs multi-game confirmation)
export function getVerdict(suspicion: number, mode: AnalysisMode = "multi"): Verdict {
  if (mode === "single") {
    if (suspicion < 20) return "unlikely";
    if (suspicion < 45) return "questionable";
    return "likely";
  }
  if (suspicion < 28) return "unlikely";
  if (suspicion < 55) return "questionable";
  if (suspicion < 75) return "likely";
  return "almostCertain";
}

function getSummaryKey(verdict: Verdict, mode: AnalysisMode): string {
  if (mode === "single") {
    if (verdict === "unlikely") return "fairPlayCleanSingle";
    if (verdict === "likely") return "fairPlayLikelySingle";
    return "fairPlayQuestionableSingle";
  }
  const keys: Record<Verdict, string> = {
    unlikely: "fairPlayClean",
    questionable: "fairPlayQuestionable",
    likely: "fairPlayLikely",
    almostCertain: "fairPlayAlmostCertain",
  };
  return keys[verdict];
}

export function getAccountFlag(joinedTimestamp: number): AccountFlag {
  const daysOld = Math.floor((Date.now() - joinedTimestamp * 1000) / (1000 * 60 * 60 * 24));
  if (daysOld < 7) return { level: "red", daysOld, labelKey: "accountVeryNew" };
  if (daysOld < 30) return { level: "orange", daysOld, labelKey: "accountNew" };
  if (daysOld < 90) return { level: "yellow", daysOld, labelKey: "accountRecent" };
  return { level: "none", daysOld, labelKey: "" };
}

export function buildReport(
  gameResults: FairPlayGameResult[],
  joinedTimestamp: number,
  playerRating: number,
  mode: AnalysisMode = "multi"
): FairPlayReport {
  const validGames = gameResults.filter((g) => g.metrics.totalMovesAnalyzed >= 5);
  const accountFlag = getAccountFlag(joinedTimestamp);

  if (validGames.length === 0) {
    return {
      games: gameResults,
      overallSuspicion: 0,
      verdict: "unlikely",
      accountFlag,
      playerRating,
      summaryKey: "fairPlayNoData",
      confidence: "low",
      mode,
    };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  for (const g of validGames) {
    const weight = g.metrics.gameLength < 30 ? 0.6 : 1;
    weightedSum += g.compositeSuspicion * weight;
    totalWeight += weight;
  }
  let overallSuspicion = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Multi-game boosts — consistency and account age only apply with multiple games
  if (mode === "multi" && validGames.length >= 3) {
    const composites = validGames.map((g) => g.compositeSuspicion);
    const mean = composites.reduce((a, b) => a + b, 0) / composites.length;
    const variance = composites.reduce((s, v) => s + (v - mean) ** 2, 0) / composites.length;
    const stdDev = Math.sqrt(variance);

    // Low variance across elevated games = pattern, not luck
    if (stdDev < 12 && mean > 25) {
      overallSuspicion = Math.min(100, overallSuspicion + 15);
    } else if (stdDev < 18 && mean > 30) {
      overallSuspicion = Math.min(100, overallSuspicion + 8);
    }

    // Even the "worst" game shows signal
    const minComposite = Math.min(...composites);
    if (mean > 30 && minComposite > 15) {
      overallSuspicion = Math.min(100, overallSuspicion + 10);
    }

    // Selective cheating detection: a cheater who only cheats some games
    // will have a few very suspicious games dragged down by clean ones.
    // Blend the peak average with the overall to catch this pattern.
    if (validGames.length >= 5) {
      const sorted = [...composites].sort((a, b) => b - a);
      const peakCount = validGames.length >= 8 ? 4 : 3;
      const topGames = sorted.slice(0, peakCount);
      const peakAvg = topGames.reduce((a, b) => a + b, 0) / topGames.length;

      const peakBlended = 0.5 * overallSuspicion + 0.5 * peakAvg;
      overallSuspicion = Math.max(overallSuspicion, peakBlended);

      const flaggedCount = composites.filter((c) => c >= 25).length;
      const highlySuspicious = composites.filter((c) => c >= 40).length;

      if (highlySuspicious >= 2) {
        overallSuspicion = Math.min(100, overallSuspicion + 8);
      } else if (highlySuspicious >= 1 && flaggedCount >= 3) {
        overallSuspicion = Math.min(100, overallSuspicion + 5);
      } else if (flaggedCount >= 3) {
        overallSuspicion = Math.min(100, overallSuspicion + 3);
      }
    }
  }

  // Account age amplifier (multi-game only)
  if (mode === "multi" && validGames.length >= 2) {
    if (accountFlag.level === "red" && overallSuspicion > 30) {
      overallSuspicion = Math.min(100, overallSuspicion + 12);
    } else if (accountFlag.level === "orange" && overallSuspicion > 30) {
      overallSuspicion = Math.min(100, overallSuspicion + 6);
    } else if (accountFlag.level === "yellow" && overallSuspicion > 40) {
      overallSuspicion = Math.min(100, overallSuspicion + 3);
    }
  }

  overallSuspicion = Math.round(overallSuspicion * 10) / 10;
  const verdict = getVerdict(overallSuspicion, mode);

  let confidence: Confidence;
  if (mode === "single" || validGames.length <= 1) {
    confidence = "low";
  } else if (validGames.length <= 4) {
    confidence = "medium";
  } else {
    confidence = "high";
  }

  return {
    games: gameResults,
    overallSuspicion,
    verdict,
    accountFlag,
    playerRating,
    summaryKey: getSummaryKey(verdict, mode),
    confidence,
    mode,
  };
}
