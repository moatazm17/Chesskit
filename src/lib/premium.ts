const PREMIUM_STORAGE_KEY = "chesskit_premium_status";

export function supportsIAP(): boolean {
  if (typeof window === "undefined") return false;
  return (window as any)._supportsIAP === true;
}

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (w._isPremium === true) return true;
  try {
    return localStorage.getItem(PREMIUM_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function shouldGateFeature(): boolean {
  if (!supportsIAP()) return false;
  return !isPremium();
}

export function setPremiumStatus(status: boolean): void {
  if (typeof window === "undefined") return;
  (window as any)._isPremium = status;
  try {
    if (status) {
      localStorage.setItem(PREMIUM_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(PREMIUM_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function requestPurchase(productId: "premium_monthly" | "premium_yearly"): void {
  const w = window as any;
  if (w.App && typeof w.App.postMessage === "function") {
    w.App.postMessage(productId);
  }
}

export function requestRestore(): void {
  const w = window as any;
  if (w.App && typeof w.App.postMessage === "function") {
    w.App.postMessage("restore_purchases");
  }
}

const PUZZLE_LIMIT_KEY = "chesskit_puzzle_limit";
const CHECKMATE_LIMIT_KEY = "chesskit_checkmate_limit";
const BRILLIANT_LIMIT_KEY = "chesskit_brilliant_limit";

interface DailyLimit {
  date: string;
  count: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyLimit(key: string): DailyLimit {
  if (typeof window === "undefined") return { date: getTodayKey(), count: 0 };
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return { date: getTodayKey(), count: 0 };
    const parsed: DailyLimit = JSON.parse(saved);
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: getTodayKey(), count: 0 };
  }
}

function incrementDailyLimit(key: string): DailyLimit {
  const current = getDailyLimit(key);
  const updated = { date: getTodayKey(), count: current.count + 1 };
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export const FREE_PUZZLE_LIMIT = 5;
export const FREE_CHECKMATE_LIMIT = 3;
export const FREE_BRILLIANT_LIMIT = 5;

export function getPuzzleCount(): number {
  return getDailyLimit(PUZZLE_LIMIT_KEY).count;
}

export function incrementPuzzleCount(): number {
  return incrementDailyLimit(PUZZLE_LIMIT_KEY).count;
}

export function canPlayPuzzle(): boolean {
  if (!supportsIAP() || isPremium()) return true;
  return getDailyLimit(PUZZLE_LIMIT_KEY).count < FREE_PUZZLE_LIMIT;
}

export function getCheckmateCount(): number {
  return getDailyLimit(CHECKMATE_LIMIT_KEY).count;
}

export function incrementCheckmateCount(): number {
  return incrementDailyLimit(CHECKMATE_LIMIT_KEY).count;
}

export function canPlayCheckmate(): boolean {
  if (!supportsIAP() || isPremium()) return true;
  return getDailyLimit(CHECKMATE_LIMIT_KEY).count < FREE_CHECKMATE_LIMIT;
}

export function getBrilliantCount(): number {
  return getDailyLimit(BRILLIANT_LIMIT_KEY).count;
}

export function incrementBrilliantCount(): number {
  return incrementDailyLimit(BRILLIANT_LIMIT_KEY).count;
}

export function canPlayBrilliant(): boolean {
  if (!supportsIAP() || isPremium()) return true;
  return getDailyLimit(BRILLIANT_LIMIT_KEY).count < FREE_BRILLIANT_LIMIT;
}
