/**
 * Show an interstitial ad via the native Flutter WebView bridge.
 *
 * Returns a promise that resolves when the ad is closed (via callback)
 * or after a fallback timeout so navigation is never blocked forever.
 */
export function showInterstitialAd(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as any;
    const hasNativeBridge =
      w.App && typeof w.App.postMessage === "function";
    const hasFallbackBridge =
      w && typeof w.triggerInterstitialAd === "function";

    if (!hasNativeBridge && !hasFallbackBridge) {
      resolve();
      return;
    }

    // Listen for callback from native side when ad is closed
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      delete w._onAdClosed;
      resolve();
    };

    // Native side can call window._onAdClosed() when ad dismisses
    w._onAdClosed = done;

    // Fallback: resolve after 500ms in case native never calls back
    setTimeout(done, 500);

    // Trigger the ad
    if (hasNativeBridge) {
      w.App.postMessage("showInterstitial");
    } else {
      w.triggerInterstitialAd();
    }
  });
}

/**
 * Fire-and-forget ad trigger for non-navigation contexts
 * (e.g. between puzzles, between analysis steps).
 * Does not block execution.
 */
export function triggerInterstitialAd(): void {
  try {
    const w = window as any;
    if (w.App && typeof w.App.postMessage === "function") {
      w.App.postMessage("showInterstitial");
    } else if (w && typeof w.triggerInterstitialAd === "function") {
      w.triggerInterstitialAd();
    }
  } catch {
    // ignore
  }
}
