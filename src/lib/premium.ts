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

const OPENING_LIMIT_KEY = "chesskit_opening_limit";
export const FREE_OPENING_LIMIT = 3;

export function getOpeningCount(): number {
  return getDailyLimit(OPENING_LIMIT_KEY).count;
}

export function incrementOpeningCount(): number {
  return incrementDailyLimit(OPENING_LIMIT_KEY).count;
}

export function canPlayOpening(): boolean {
  if (!supportsIAP() || isPremium()) return true;
  return getDailyLimit(OPENING_LIMIT_KEY).count < FREE_OPENING_LIMIT;
}

const HINT_LIMIT_KEY = "chesskit_hint_limit";
export const FREE_HINT_LIMIT = 3;

export function getHintCount(): number {
  return getDailyLimit(HINT_LIMIT_KEY).count;
}

export function incrementHintCount(): number {
  return incrementDailyLimit(HINT_LIMIT_KEY).count;
}

export function canUseHint(): boolean {
  if (!supportsIAP() || isPremium()) return true;
  return getDailyLimit(HINT_LIMIT_KEY).count < FREE_HINT_LIMIT;
}

// ── Rewarded Ad Bonuses ────────────────────────────────────────

const REWARDED_AD_KEY = "chesskit_rewarded_ads";
const MAX_REWARDED_ADS_PER_DAY = 3;
const REWARDED_PUZZLE_BONUS = 3;

function getRewardedAdsUsed(): number {
  return getDailyLimit(REWARDED_AD_KEY).count;
}

function supportsRewardedAds(): boolean {
  if (typeof window === "undefined") return false;
  return (window as any)._supportsRewardedAds === true;
}

export function canWatchRewardedAd(): boolean {
  if (!supportsRewardedAds()) return false;
  return getRewardedAdsUsed() < MAX_REWARDED_ADS_PER_DAY;
}

export function getRemainingRewardedAds(): number {
  return Math.max(0, MAX_REWARDED_ADS_PER_DAY - getRewardedAdsUsed());
}

function recordRewardedAdWatched(): void {
  incrementDailyLimit(REWARDED_AD_KEY);
}

export function grantRewardedPuzzles(limitKey: string): void {
  recordRewardedAdWatched();
  const current = getDailyLimit(limitKey);
  const updated = { date: getTodayKey(), count: Math.max(0, current.count - REWARDED_PUZZLE_BONUS) };
  try {
    localStorage.setItem(limitKey, JSON.stringify(updated));
  } catch {}
}

export function grantRewardedHint(): void {
  recordRewardedAdWatched();
  const current = getDailyLimit(HINT_LIMIT_KEY);
  const updated = { date: getTodayKey(), count: Math.max(0, current.count - 1) };
  try {
    localStorage.setItem(HINT_LIMIT_KEY, JSON.stringify(updated));
  } catch {}
}

export const PUZZLE_LIMIT_KEY_PUBLIC = PUZZLE_LIMIT_KEY;
export const CHECKMATE_LIMIT_KEY_PUBLIC = CHECKMATE_LIMIT_KEY;
export const BRILLIANT_LIMIT_KEY_PUBLIC = BRILLIANT_LIMIT_KEY;
