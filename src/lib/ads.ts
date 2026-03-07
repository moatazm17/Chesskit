import { isPremium } from "./premium";

let lastAdTime = 0;
const AD_COOLDOWN_MS = 60_000;
const FIRST_ANALYSIS_KEY = "chesskit_first_analysis_done";

function isFirstAnalysisDone(): boolean {
  try {
    return localStorage.getItem(FIRST_ANALYSIS_KEY) === "true";
  } catch {
    return true;
  }
}

export function markFirstAnalysisDone(): void {
  try {
    localStorage.setItem(FIRST_ANALYSIS_KEY, "true");
  } catch {
    // ignore
  }
}

function sendAdMessage(): void {
  const w = window as any;
  if (w.App && typeof w.App.postMessage === "function") {
    w.App.postMessage("showInterstitial");
  } else if (w && typeof w.triggerInterstitialAd === "function") {
    w.triggerInterstitialAd();
  }
  lastAdTime = Date.now();
}

function isCooldownActive(): boolean {
  return Date.now() - lastAdTime < AD_COOLDOWN_MS;
}

/**
 * Show an interstitial ad and wait for it to close before proceeding.
 * Used before navigation so the ad has time to display.
 */
export function showInterstitialAd(): Promise<void> {
  return new Promise((resolve) => {
    if (isPremium() || isCooldownActive() || !isFirstAnalysisDone()) {
      resolve();
      return;
    }

    const w = window as any;
    const hasNativeBridge =
      w.App && typeof w.App.postMessage === "function";
    const hasFallbackBridge =
      w && typeof w.triggerInterstitialAd === "function";

    if (!hasNativeBridge && !hasFallbackBridge) {
      resolve();
      return;
    }

    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      delete w._onAdClosed;
      resolve();
    };

    w._onAdClosed = done;
    setTimeout(done, 500);
    sendAdMessage();
  });
}

/**
 * Fire-and-forget ad trigger. Does not block execution.
 */
export function triggerInterstitialAd(): void {
  try {
    if (isPremium() || isCooldownActive() || !isFirstAnalysisDone()) return;
    sendAdMessage();
  } catch {
    // ignore
  }
}
