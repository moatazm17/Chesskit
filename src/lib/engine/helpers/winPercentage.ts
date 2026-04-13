import { ceilsNumber } from "@/lib/math";
import { LineEval, PositionEval } from "@/types/eval";

export const getPositionWinPercentage = (position: PositionEval): number => {
  return getLineWinPercentage(position.lines[0]);
};

export const getLineWinPercentage = (line: LineEval): number => {
  if (line.cp !== undefined) {
    return getWinPercentageFromCp(line.cp);
  }

  if (line.mate !== undefined) {
    return getWinPercentageFromMate(line.mate);
  }

  throw new Error("No cp or mate in line");
};

const getWinPercentageFromMate = (mate: number): number => {
  const mateInf = mate * Infinity;
  return getWinPercentageFromCp(mateInf);
};

// Win percentage sigmoid curve matching Chess.com's model.
let _winPctLogOnce = false;
const getWinPercentageFromCp = (cp: number): number => {
  const cpCeiled = ceilsNumber(cp, -1000, 1000);
  const MULTIPLIER = -0.00368208;
  const winChances = 2 / (1 + Math.exp(MULTIPLIER * cpCeiled)) - 1;
  const result = 50 + 50 * winChances;
  if (!_winPctLogOnce) {
    _winPctLogOnce = true;
    console.log(
      `[WinPct] Using multiplier: ${MULTIPLIER} | Example: cp=100 → ${(50 + 50 * (2 / (1 + Math.exp(MULTIPLIER * 100)) - 1)).toFixed(2)}%`
    );
  }
  return result;
};
