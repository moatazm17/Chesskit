import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
} from "@mui/material";
import { Icon } from "@iconify/react";

const RATING_STORAGE_KEY = "chesskit_rating_prompt";
const PUZZLE_THRESHOLD = 5; // Show after solving 5 puzzles
const SESSION_THRESHOLD = 3; // Show after 3 sessions

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

// Check if enough time has passed since last dismiss (3 days)
const canShowAgain = (state: RatingState): boolean => {
  if (state.hasRated) return false;
  if (state.dismissCount >= 3) return false; // Stop asking after 3 dismissals
  if (!state.lastDismissed) return true;
  const daysSince =
    (Date.now() - new Date(state.lastDismissed).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 3;
};

// App Store URLs
const APP_STORE_URL =
  "https://apps.apple.com/us/app/chess-analysis/id6751201688";
const APP_STORE_ITMS =
  "itms-apps://itunes.apple.com/app/id6751201688";

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ open, onClose }) => {
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStars, setHoveredStars] = useState(0);

  const handleRate = () => {
    const state = loadRatingState();
    state.hasRated = true;
    saveRatingState(state);

    // Try native bridge first (Flutter app), then fallback to URL
    const w = window as any;
    if (w.App && typeof w.App.postMessage === "function") {
      w.App.postMessage("requestReview");
    }

    // Also open App Store as fallback
    // Try itms:// scheme first (opens App Store directly on iOS)
    const link = document.createElement("a");
    link.href = APP_STORE_ITMS;
    link.click();

    // Fallback to web URL after short delay
    setTimeout(() => {
      window.open(APP_STORE_URL, "_blank");
    }, 500);

    onClose();
  };

  const handleDismiss = () => {
    const state = loadRatingState();
    state.dismissCount += 1;
    state.lastDismissed = new Date().toISOString();
    saveRatingState(state);
    onClose();
  };

  const handleMaybeLater = () => {
    const state = loadRatingState();
    state.lastDismissed = new Date().toISOString();
    saveRatingState(state);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      PaperProps={{
        sx: {
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 4,
          maxWidth: 380,
          width: "90%",
          overflow: "hidden",
        },
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={handleDismiss}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          color: "rgba(255,255,255,0.5)",
          "&:hover": { color: "white" },
        }}
      >
        <Icon icon="mdi:close" />
      </IconButton>

      <DialogContent sx={{ padding: "32px 24px", textAlign: "center" }}>
        {/* Chess icon */}
        <Box
          sx={{
            fontSize: "3.5rem",
            marginBottom: 2,
          }}
        >
          ♟️
        </Box>

        {/* Title */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: "white",
            marginBottom: 1.5,
          }}
        >
          Enjoying Chess Analysis?
        </Typography>

        {/* Message */}
        <Typography
          variant="body1"
          sx={{
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.7,
            marginBottom: 3,
            fontSize: "0.95rem",
          }}
        >
          Your support means a lot! A quick rating helps us keep improving and bringing you new features.
        </Typography>

        {/* Stars */}
        <Stack
          direction="row"
          justifyContent="center"
          spacing={0.5}
          sx={{ marginBottom: 3 }}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <IconButton
              key={star}
              onMouseEnter={() => setHoveredStars(star)}
              onMouseLeave={() => setHoveredStars(0)}
              onClick={() => {
                setSelectedStars(star);
                // Auto-trigger rating after selecting stars
                setTimeout(() => handleRate(), 300);
              }}
              sx={{
                padding: 0.5,
                transition: "transform 0.2s ease",
                "&:hover": {
                  transform: "scale(1.2)",
                  background: "transparent",
                },
              }}
            >
              <Icon
                icon={
                  star <= (hoveredStars || selectedStars)
                    ? "mdi:star"
                    : "mdi:star-outline"
                }
                style={{
                  fontSize: "2.5rem",
                  color:
                    star <= (hoveredStars || selectedStars)
                      ? "#FFD700"
                      : "rgba(255,255,255,0.3)",
                  transition: "color 0.2s ease",
                }}
              />
            </IconButton>
          ))}
        </Stack>

        {/* Rate button */}
        <Button
          onClick={handleRate}
          variant="contained"
          fullWidth
          sx={{
            background: "linear-gradient(135deg, #4ecdc4, #45b7d1)",
            color: "white",
            fontWeight: 600,
            fontSize: "1rem",
            padding: "12px 24px",
            borderRadius: 3,
            textTransform: "none",
            marginBottom: 1.5,
            "&:hover": {
              background: "linear-gradient(135deg, #45b7d1, #4ecdc4)",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 15px rgba(78, 205, 196, 0.4)",
            },
          }}
        >
          ⭐ Rate on App Store
        </Button>

        {/* Maybe later */}
        <Button
          onClick={handleMaybeLater}
          sx={{
            color: "rgba(255,255,255,0.5)",
            textTransform: "none",
            fontSize: "0.85rem",
            "&:hover": {
              color: "rgba(255,255,255,0.8)",
              background: "transparent",
            },
          }}
        >
          Maybe later
        </Button>
      </DialogContent>
    </Dialog>
  );
};

// Hook to manage when to show the rating modal
export const useRatingPrompt = () => {
  const [showRating, setShowRating] = useState(false);

  // Track session on mount
  useEffect(() => {
    const state = loadRatingState();
    state.totalSessions += 1;
    saveRatingState(state);
  }, []);

  // Check if should show rating based on puzzle completion
  const checkAfterPuzzle = useCallback((solvedCount: number) => {
    const state = loadRatingState();
    if (!canShowAgain(state)) return;

    // Show after solving 5, 15, 30 puzzles
    if (
      solvedCount === PUZZLE_THRESHOLD ||
      solvedCount === 15 ||
      solvedCount === 30
    ) {
      setShowRating(true);
    }
  }, []);

  // Check if should show rating based on game analysis
  const checkAfterAnalysis = useCallback(() => {
    const state = loadRatingState();
    if (!canShowAgain(state)) return;

    // Show rating after completing any analysis
    // Small delay so it doesn't overlap with the analysis completion UI
    setTimeout(() => {
      setShowRating(true);
    }, 1500);
  }, []);

  // Check on app open (after enough sessions)
  const checkOnOpen = useCallback(() => {
    const state = loadRatingState();
    if (!canShowAgain(state)) return;

    // Show if user has had 5+ sessions
    if (state.totalSessions >= 5) {
      // Small delay so it doesn't pop up immediately
      setTimeout(() => {
        setShowRating(true);
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
