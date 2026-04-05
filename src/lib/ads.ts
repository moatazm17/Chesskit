import { isPremium } from "./premium";

let lastAdTime = 0;
const AD_COOLDOWN_MS = 60_000;
const GRACE_PERIOD_KEY = "chesskit_grace_period_done";

function isGracePeriodOver(): boolean {
  try {
    return localStorage.getItem(GRACE_PERIOD_KEY) === "true";
  } catch {
    return true;
  }
}

export function markGracePeriodDone(): void {
  try {
    localStorage.setItem(GRACE_PERIOD_KEY, "true");
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
    if (isPremium() || isCooldownActive() || !isGracePeriodOver()) {
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
    if (isPremium() || isCooldownActive() || !isGracePeriodOver()) return;
    sendAdMessage();
  } catch {
    // ignore
  }
}

/**
 * Show a rewarded ad. Returns a promise that resolves to true if the user
 * earned the reward, or false if the ad failed/was unavailable.
 */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isPremium()) {
      resolve(true);
      return;
    }

    const w = window as any;
    const hasNativeBridge =
      w.App && typeof w.App.postMessage === "function";

    if (!hasNativeBridge) {
      resolve(false);
      return;
    }

    let resolved = false;
    const cleanup = () => {
      delete w._onRewardEarned;
      delete w._onRewardFailed;
    };

    w._onRewardEarned = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(true);
    };

    w._onRewardFailed = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(false);
    };

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    }, 30000);

    w.App.postMessage("showRewarded");
  });
}
