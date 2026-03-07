import { isPremium } from "./premium";

let lastAdTime = 0;
const AD_COOLDOWN_MS = 60_000;
const GRACE_PERIOD_KEY = "chesskit_grace_period_done";
const DEBUG = true;

function adLog(...args: unknown[]) {
  if (DEBUG) console.log("[ADS]", ...args);
}

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
    adLog("Grace period marked as done");
  } catch {
    // ignore
  }
}

function sendAdMessage(): void {
  const w = window as any;
  if (w.App && typeof w.App.postMessage === "function") {
    adLog("Sending ad via App.postMessage");
    w.App.postMessage("showInterstitial");
  } else if (w && typeof w.triggerInterstitialAd === "function") {
    adLog("Sending ad via triggerInterstitialAd");
    w.triggerInterstitialAd();
  } else {
    adLog("No native bridge found");
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
    const premium = isPremium();
    const cooldown = isCooldownActive();
    const graceOver = isGracePeriodOver();
    adLog("showInterstitialAd called", { premium, cooldown, gracePeriodOver: graceOver });

    if (premium || cooldown || !graceOver) {
      adLog("Ad skipped:", premium ? "premium" : cooldown ? "cooldown" : "grace period");
      resolve();
      return;
    }

    const w = window as any;
    const hasNativeBridge =
      w.App && typeof w.App.postMessage === "function";
    const hasFallbackBridge =
      w && typeof w.triggerInterstitialAd === "function";

    if (!hasNativeBridge && !hasFallbackBridge) {
      adLog("Ad skipped: no native bridge");
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
    const premium = isPremium();
    const cooldown = isCooldownActive();
    const graceOver = isGracePeriodOver();
    adLog("triggerInterstitialAd called", { premium, cooldown, gracePeriodOver: graceOver });

    if (premium || cooldown || !graceOver) {
      adLog("Ad skipped:", premium ? "premium" : cooldown ? "cooldown" : "grace period");
      return;
    }
    sendAdMessage();
  } catch {
    // ignore
  }
}
