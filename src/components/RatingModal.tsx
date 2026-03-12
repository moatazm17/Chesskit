import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { logAnalyticsEvent, submitFeedback } from "@/lib/firebase";

const RATING_STORAGE_KEY = "chesskit_rating_prompt";
const PUZZLE_THRESHOLD = 5;

type Step = "ask" | "feedback" | "thankYou";

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
  }
};

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: string;
}

const RatingModal: React.FC<RatingModalProps> = ({ open, onClose, trigger }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [step, setStep] = useState<Step>("ask");
  const [feedbackText, setFeedbackText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("ask");
      setFeedbackText("");
      setSending(false);
    }
  }, [open]);

  const handleLike = () => {
    logAnalyticsEvent("rating_liked", { trigger: trigger || "unknown" });
    const state = loadRatingState();
    state.hasRated = true;
    saveRatingState(state);
    requestNativeReview();
    setStep("thankYou");
    setTimeout(onClose, 1800);
  };

  const handleDislike = () => {
    logAnalyticsEvent("rating_disliked", { trigger: trigger || "unknown" });
    setStep("feedback");
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSending(true);
    logAnalyticsEvent("feedback_submitted", { trigger: trigger || "unknown" });
    await submitFeedback(feedbackText.trim(), trigger || "unknown");
    const state = loadRatingState();
    state.hasRated = true;
    saveRatingState(state);
    setSending(false);
    setStep("thankYou");
    setTimeout(onClose, 1800);
  };

  const handleDismiss = () => {
    const state = loadRatingState();
    state.dismissCount += 1;
    state.lastDismissed = new Date().toISOString();
    saveRatingState(state);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          borderRadius: "20px",
          overflow: "hidden",
        },
      }}
    >
      <IconButton
        onClick={handleDismiss}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          color: "rgba(255,255,255,0.5)",
          zIndex: 1,
          "&:hover": { color: "white" },
        }}
      >
        <Icon icon="mdi:close" style={{ fontSize: 22 }} />
      </IconButton>

      <DialogContent sx={{ p: 3, textAlign: "center" }}>
        {step === "ask" && (
          <Box>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "16px",
                background: "linear-gradient(135deg, #4ecdc4, #45b7d1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                boxShadow: "0 8px 24px rgba(78, 205, 196, 0.3)",
              }}
            >
              <Icon icon="mdi:chess-pawn" style={{ fontSize: 30, color: "white" }} />
            </Box>
            <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, mb: 1 }}>
              {t("ratingAskTitle")}
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", mb: 3 }}>
              {t("ratingAskSubtitle")}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                onClick={handleDislike}
                sx={{
                  flex: 1,
                  maxWidth: 140,
                  py: 1.5,
                  borderRadius: "14px",
                  border: "2px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                  textTransform: "none",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  "&:hover": {
                    border: "2px solid rgba(239,83,80,0.5)",
                    background: "rgba(239,83,80,0.1)",
                  },
                }}
              >
                <Icon icon="mdi:thumb-down-outline" style={{ fontSize: 28 }} />
                {t("notReally")}
              </Button>
              <Button
                onClick={handleLike}
                sx={{
                  flex: 1,
                  maxWidth: 140,
                  py: 1.5,
                  borderRadius: "14px",
                  border: "2px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                  textTransform: "none",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  "&:hover": {
                    border: "2px solid rgba(76,175,80,0.5)",
                    background: "rgba(76,175,80,0.1)",
                  },
                }}
              >
                <Icon icon="mdi:thumb-up-outline" style={{ fontSize: 28 }} />
                {t("yesLoveIt")}
              </Button>
            </Box>
          </Box>
        )}

        {step === "feedback" && (
          <Box>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "16px",
                background: "linear-gradient(135deg, #FF6B6B, #EE5A24)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                boxShadow: "0 8px 24px rgba(238, 90, 36, 0.3)",
              }}
            >
              <Icon icon="mdi:message-text-outline" style={{ fontSize: 28, color: "white" }} />
            </Box>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, mb: 0.5 }}>
              {t("feedbackTitle")}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", mb: 2 }}>
              {t("feedbackSubtitle")}
            </Typography>
            <TextField
              multiline
              rows={3}
              fullWidth
              placeholder={t("feedbackPlaceholder")}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                  "&.Mui-focused fieldset": { borderColor: "#45b7d1" },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "rgba(255,255,255,0.3)",
                },
              }}
            />
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedbackText.trim() || sending}
              variant="contained"
              fullWidth
              sx={{
                background: "linear-gradient(135deg, #4ecdc4, #45b7d1)",
                color: "white",
                fontWeight: 700,
                py: 1.3,
                borderRadius: "12px",
                textTransform: "none",
                fontSize: "0.95rem",
                "&:hover": {
                  background: "linear-gradient(135deg, #45b7d1, #3da8c4)",
                },
                "&.Mui-disabled": {
                  background: "rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.3)",
                },
              }}
            >
              {sending ? <CircularProgress size={22} sx={{ color: "white" }} /> : t("sendFeedback")}
            </Button>
          </Box>
        )}

        {step === "thankYou" && (
          <Box sx={{ py: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4CAF50, #66BB6A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                boxShadow: "0 8px 24px rgba(76, 175, 80, 0.3)",
              }}
            >
              <Icon icon="mdi:check" style={{ fontSize: 32, color: "white" }} />
            </Box>
            <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, mb: 0.5 }}>
              {t("thankYouTitle")}
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
              {t("thankYouSubtitle")}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const useRatingPrompt = () => {
  const [showRating, setShowRating] = useState(false);
  const [ratingTrigger, setRatingTrigger] = useState("unknown");

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
      setRatingTrigger("puzzle");
      setShowRating(true);
    }
  }, []);

  const checkAfterAnalysis = useCallback(() => {
    const state = loadRatingState();
    if (!canShowAgain(state)) return;
    setTimeout(() => {
      logAnalyticsEvent("rating_trigger", { trigger: "analysis" });
      setRatingTrigger("analysis");
      setShowRating(true);
    }, 1500);
  }, []);

  const checkOnOpen = useCallback(() => {
    const state = loadRatingState();
    if (!canShowAgain(state)) return;
    if (state.totalSessions >= 5) {
      setTimeout(() => {
        logAnalyticsEvent("rating_trigger", { trigger: "session", total_sessions: state.totalSessions });
        setRatingTrigger("session");
        setShowRating(true);
      }, 2000);
    }
  }, []);

  const closeRating = useCallback(() => {
    setShowRating(false);
  }, []);

  return {
    showRating,
    ratingTrigger,
    setShowRating,
    checkAfterPuzzle,
    checkAfterAnalysis,
    checkOnOpen,
    closeRating,
  };
};

export default RatingModal;
