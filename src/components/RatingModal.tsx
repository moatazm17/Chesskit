import { useState, useEffect, useCallback } from "react";
import { logAnalyticsEvent } from "@/lib/firebase";

const RATING_STORAGE_KEY = "chesskit_rating_prompt";
const PUZZLE_THRESHOLD = 5;

interface RatingState {
  hasRated: boolean;
  dismissCount: number;
  lastDismissed: string | null;
  totalSessions: number;
}

const DEFAULT_STATE: RatingState = {
  hasRated: false,
  dismissCount: 0,
  lastDismissed: null,
  totalSessions: 0,
};

const loadRatingState = (): RatingState => {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const saved = localStorage.getItem(RATING_STORAGE_KEY);
  if (!saved) return DEFAULT_STATE;
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_STATE;
  }
};

const saveRatingState = (state: RatingState) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(state));
};

const canShowAgain = (state: RatingState): boolean => {
  if (state.hasRated) return false;
  if (state.dismissCount >= 3) return false;
  if (!state.lastDismissed) return true;
  const daysSince =
    (Date.now() - new Date(state.lastDismissed).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 3;
};

const requestNativeReview = () => {
  const w = window as any;
  if (w.App && typeof w.App.postMessage === "function") {
    w.App.postMessage("requestReview");
    logAnalyticsEvent("native_review_requested");
    const state = loadRatingState();
    state.hasRated = true;
    saveRatingState(state);
  }
};

const RatingModal: React.FC<{ open: boolean; onClose: () => void }> = () => null;

export const useRatingPrompt = () => {
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    const state = loadRatingState();
    state.totalSessions += 1;
    saveRatingState(state);
  }, []);

  const checkAfterPuzzle = useCallback((solvedCount: number) => {
    const state = loadRatingState();
    if (!canShowAgain(state)) return;
    if (solvedCount === PUZZLE_THRESHOLD || solvedCount === 15 || solvedCount === 30) {
      logAnalyticsEvent("rating_trigger", { trigger: "puzzle", solved_count: solvedCount });
      requestNativeReview();
    }
  }, []);

  const checkAfterAnalysis = useCallback(() => {
    const state = loadRatingState();
    if (!canShowAgain(state)) return;
    setTimeout(() => {
      logAnalyticsEvent("rating_trigger", { trigger: "analysis" });
      requestNativeReview();
    }, 1500);
  }, []);

  const checkOnOpen = useCallback(() => {
    const state = loadRatingState();
    if (!canShowAgain(state)) return;
    if (state.totalSessions >= 5) {
      setTimeout(() => {
        logAnalyticsEvent("rating_trigger", { trigger: "session", total_sessions: state.totalSessions });
        requestNativeReview();
      }, 2000);
    }
  }, []);

  const closeRating = useCallback(() => {
    setShowRating(false);
  }, []);

  return {
    showRating,
    setShowRating,
    checkAfterPuzzle,
    checkAfterAnalysis,
    checkOnOpen,
    closeRating,
  };
};

export default RatingModal;
