import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { triggerInterstitialAd } from "@/lib/ads";
import { isPremium, shouldGateFeature } from "@/lib/premium";
import PremiumModal from "@/components/PremiumModal";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Button,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Stack,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  gameAtom,
  gameEvalAtom,
  evaluationProgressAtom,
} from "@/sections/analysis/states";
import { useEngine } from "@/hooks/useEngine";
import {
  engineNameAtom,
  engineMultiPvAtom,
  engineWorkersNbAtom,
} from "@/sections/analysis/states";
import { getEvaluateGameParams } from "@/lib/chess";
import { usePlayersData } from "@/hooks/usePlayersData";
import { logAnalyticsEvent } from "@/lib/firebase";
import { MoveClassification } from "@/types/enums";

interface GameAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  onAnalyzeComplete: () => void;
}

interface MoveStats {
  type: MoveClassification;
  icon: string;
  color: string;
  label: string;
  whiteCount: number;
  blackCount: number;
}

const getMoveClassificationIcon = (classification: MoveClassification) => {
  switch (classification) {
    case MoveClassification.Splendid:
      return { icon: "mdi:star-four-points", color: "#26C6DA", label: "brilliant" };
    case MoveClassification.Perfect:
      return { icon: "mdi:exclamation-thick", color: "#42A5F5", label: "great" };
    case MoveClassification.Best:
      return { icon: "mdi:check-bold", color: "#66BB6A", label: "best" };
    case MoveClassification.Excellent:
      return { icon: "mdi:thumb-up", color: "#9CCC65", label: "excellent" };
    case MoveClassification.Okay:
      return { icon: "mdi:circle-medium", color: "#AED581", label: "good" };
    case MoveClassification.Inaccuracy:
      return { icon: "mdi:help", color: "#FFA726", label: "inaccuracy" };
    case MoveClassification.Miss:
      return { icon: "mdi:target", color: "#FF8F00", label: "miss" };
    case MoveClassification.Mistake:
      return { icon: "mdi:close-thick", color: "#FF7043", label: "mistake" };
    case MoveClassification.Blunder:
      return { icon: "mdi:alert-circle", color: "#EF5350", label: "blunder" };
    case MoveClassification.Opening:
      return { icon: "mdi:book-open-variant", color: "#78909c", label: "book" };
    case MoveClassification.Forced:
      return { icon: "mdi:lock", color: "#90a4ae", label: "forced" };
    default:
      return { icon: "mdi:circle", color: "#9e9e9e", label: "other" };
  }
};

// Circular accuracy ring component
function AccuracyRing({
  value,
  playerName,
  color,
}: {
  value: number;
  playerName: string;
  color: "white" | "black";
}) {
  const { t } = useTranslation();
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const ringColor = value >= 80 ? "#66BB6A" : value >= 50 ? "#FFA726" : "#EF5350";

  return (
    <Stack alignItems="center" spacing={1.5}>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        {/* Center text */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "white",
              lineHeight: 1,
            }}
          >
            {value.toFixed(1)}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 500,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {t("accuracy")}
          </Typography>
        </Box>
      </Box>
      {/* Player chip */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          background:
            color === "white"
              ? "rgba(255,255,255,0.15)"
              : "rgba(0,0,0,0.3)",
          borderRadius: "10px",
          px: 1.5,
          py: 0.6,
          border:
            color === "white"
              ? "1px solid rgba(255,255,255,0.2)"
              : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "3px",
            backgroundColor: color === "white" ? "#fff" : "#333",
            border: "1px solid #666",
          }}
        />
        <Typography
          sx={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            maxWidth: 100,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {playerName}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function GameAnalysisModal({
  open,
  onClose,
  onAnalyzeComplete,
}: GameAnalysisModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const game = useAtomValue(gameAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const evaluationProgress = useAtomValue(evaluationProgressAtom);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { white, black } = usePlayersData(gameAtom);

  // Engine setup for analysis
  const engineName = useAtomValue(engineNameAtom);
  const engine = useEngine(engineName);
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const [selectedDepth, setSelectedDepth] = useState<number | null>(null);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const engineMultiPv = useAtomValue(engineMultiPvAtom);
  const engineWorkersNb = useAtomValue(engineWorkersNbAtom);
  const setGameEval = useSetAtom(gameEvalAtom);
  const setEvaluationProgress = useSetAtom(evaluationProgressAtom);

  const moveStats = useMemo(() => {
    if (!gameEval?.positions?.length) return [];

    const stats = new Map<MoveClassification, MoveStats>();

    Object.values(MoveClassification).forEach((classification) => {
      const iconData = getMoveClassificationIcon(classification);
      stats.set(classification, {
        type: classification,
        ...iconData,
        whiteCount: 0,
        blackCount: 0,
      });
    });

    gameEval.positions.forEach((position, index) => {
      if (position.moveClassification && index > 0) {
        const isWhiteMove = index % 2 === 1;
        const stat = stats.get(position.moveClassification);
        if (stat) {
          if (isWhiteMove) stat.whiteCount++;
          else stat.blackCount++;
        }
      }
    });

    return Array.from(stats.values()).filter(
      (stat) => stat.whiteCount > 0 || stat.blackCount > 0
    );
  }, [gameEval]);

  useEffect(() => {
    if (open) {
      setIsAnalyzing(false);
      setAnalysisComplete(false);
      setShowMore(false);
      setSelectedDepth(null);
    }
  }, [open]);

  useEffect(() => {
    if (
      open &&
      selectedDepth &&
      game.history().length > 0 &&
      !isAnalyzing &&
      !analysisComplete
    ) {
      setIsAnalyzing(true);

      const startAnalysis = async () => {
        const currentEngine = engineRef.current;
        if (!currentEngine?.getIsReady()) {
          setTimeout(startAnalysis, 100);
          return;
        }

        try {
          const params = getEvaluateGameParams(game);
          if (params.fens.length === 0) {
            setIsAnalyzing(false);
            setAnalysisComplete(true);
            return;
          }

          const isQuick = selectedDepth === 14;
          const newGameEval = await currentEngine.evaluateGame({
            ...params,
            depth: selectedDepth,
            multiPv: isQuick ? 2 : engineMultiPv,
            setEvaluationProgress,
            playersRatings: {
              white: white?.rating,
              black: black?.rating,
            },
            workersNb: engineWorkersNb,
          });

          setGameEval(newGameEval);
          setEvaluationProgress(0);
          setIsAnalyzing(false);
          setAnalysisComplete(true);
          logAnalyticsEvent("analysis_complete", {
            total_moves: game.history().length,
            depth: selectedDepth,
            white_player: game.getHeaders()["White"] || "unknown",
            black_player: game.getHeaders()["Black"] || "unknown",
          });
        } catch (error) {
          console.error("Analysis error:", error);
          setIsAnalyzing(false);
          setAnalysisComplete(true);
        }
      };

      startAnalysis();
    }
  }, [open, selectedDepth, game.pgn(), isAnalyzing, analysisComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPlayerName = (color: "white" | "black") => {
    const headers = game.getHeaders();
    return (
      headers[color === "white" ? "White" : "Black"] ||
      (color === "white" ? "White" : "Black")
    );
  };

  const getDisplayStats = () => {
    const priorityOrder = [
      MoveClassification.Splendid,
      MoveClassification.Perfect,
      MoveClassification.Best,
      MoveClassification.Inaccuracy,
      MoveClassification.Miss,
      MoveClassification.Mistake,
      MoveClassification.Blunder,
    ];

    const byType = new Map(moveStats.map((s) => [s.type, s]));

    const fixedStats = priorityOrder.map((type) => {
      const existing = byType.get(type);
      if (existing) return existing;
      const iconData = getMoveClassificationIcon(type);
      return { type, ...iconData, whiteCount: 0, blackCount: 0 };
    });

    const otherStats = moveStats.filter(
      (s) => !priorityOrder.includes(s.type)
    );

    return showMore ? [...fixedStats, ...otherStats] : fixedStats;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background:
            "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          color: "white",
          borderRadius: isMobile ? 0 : "16px",
          overflow: "hidden",
        },
      }}
    >
      {/* Clean top bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: "rgba(255,255,255,0.7)",
            minWidth: 0,
            p: 0.5,
            "&:hover": { color: "white" },
          }}
        >
          <Icon icon="mdi:close" style={{ fontSize: 24 }} />
        </Button>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          {t("gameReview")}
        </Typography>
        <Box sx={{ width: 36 }} />
      </Box>

      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {!selectedDepth && !isAnalyzing && !analysisComplete ? (
          /* --- Depth Choice Screen --- */
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              px: 3,
              py: 6,
              minHeight: 400,
              gap: 3,
            }}
          >
            <Icon
              icon="mdi:chart-line"
              style={{ fontSize: 48, color: "rgba(255,255,255,0.6)" }}
            />
            <Typography sx={{ fontSize: "1.3rem", fontWeight: 700, textAlign: "center" }}>
              {t("chooseAnalysisType")}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", maxWidth: 320 }}>
              <Button
                variant="contained"
                onClick={() => setSelectedDepth(14)}
                sx={{
                  background: "linear-gradient(135deg, #66BB6A, #43A047)",
                  borderRadius: "14px",
                  py: 2,
                  px: 3,
                  textTransform: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  "&:hover": {
                    background: "linear-gradient(135deg, #43A047, #2E7D32)",
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.2s",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <Icon icon="mdi:lightning-bolt" style={{ fontSize: 22 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>{t("quickAnalysis")}</Typography>
                  <Box sx={{
                    ml: "auto",
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    px: 1,
                    py: 0.2,
                  }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 600 }}>{t("recommended")}</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: "0.8rem", opacity: 0.85, mt: 0.5 }}>
                  {t("fastAndAccurate")}
                </Typography>
              </Button>

              <Button
                variant="outlined"
                onClick={() => {
                  if (!shouldGateFeature()) {
                    setSelectedDepth(18);
                  } else {
                    setPremiumModalOpen(true);
                  }
                }}
                sx={{
                  borderColor: !shouldGateFeature()
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(255,165,0,0.3)",
                  borderRadius: "14px",
                  py: 2,
                  px: 3,
                  textTransform: "none",
                  color: "white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  "&:hover": {
                    borderColor: !shouldGateFeature()
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,165,0,0.5)",
                    background: "rgba(255,255,255,0.04)",
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.2s",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <Icon icon="mdi:microscope" style={{ fontSize: 22 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>{t("deepAnalysis")}</Typography>
                  {shouldGateFeature() && (
                    <Box sx={{
                      ml: "auto",
                      background: "linear-gradient(135deg, #FFD700, #FFA500)",
                      borderRadius: "8px",
                      px: 1,
                      py: 0.2,
                    }}>
                      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#1a1a2e" }}>
                        {t("pro")}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Typography sx={{ fontSize: "0.8rem", opacity: 0.6, mt: 0.5 }}>
                  {t("morePrecise")}
                </Typography>
              </Button>
            </Box>
          </Box>
        ) : isAnalyzing ? (
          /* --- Analyzing Screen --- */
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              px: 4,
              py: 8,
              minHeight: 400,
            }}
          >
            <Box sx={{ position: "relative", mb: 4 }}>
              <CircularProgress
                variant="determinate"
                value={evaluationProgress}
                size={100}
                thickness={3}
                sx={{
                  color: "#66BB6A",
                  "& .MuiCircularProgress-circle": {
                    strokeLinecap: "round",
                  },
                }}
              />
              <CircularProgress
                variant="indeterminate"
                size={100}
                thickness={3}
                sx={{
                  color: "rgba(255,255,255,0.08)",
                  position: "absolute",
                  left: 0,
                }}
                disableShrink
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  icon="mdi:chess-knight"
                  style={{ fontSize: 36, color: "rgba(255,255,255,0.6)" }}
                />
              </Box>
            </Box>
            <Typography
              sx={{ fontSize: "1.3rem", fontWeight: 700, mb: 2, textAlign: "center" }}
            >
              {t("analyzingGame")}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={evaluationProgress}
              sx={{
                width: "80%",
                maxWidth: 300,
                height: 6,
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.08)",
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(90deg, #66BB6A, #42A5F5)",
                  borderRadius: 3,
                },
              }}
            />
            <Typography
              sx={{
                mt: 2,
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.9rem",
              }}
            >
              {evaluationProgress.toFixed(0)}%
            </Typography>
          </Box>
        ) : analysisComplete && gameEval ? (
          /* --- Results Screen --- */
          <Box sx={{ px: 2.5, py: 3 }}>
            {/* Accuracy Rings */}
            <Stack
              direction="row"
              justifyContent="center"
              spacing={4}
              sx={{ mb: 4 }}
            >
              <AccuracyRing
                value={gameEval.accuracy.white}
                playerName={getPlayerName("white")}
                color="white"
              />
              <AccuracyRing
                value={gameEval.accuracy.black}
                playerName={getPlayerName("black")}
                color="black"
              />
            </Stack>

            {/* Move Stats */}
            <Box
              sx={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              {/* Stats header */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 50px 40px 50px",
                  alignItems: "center",
                  px: 2,
                  py: 1.2,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {t("moveType")}
                </Typography>
                <Typography
                  noWrap
                  sx={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    maxWidth: 50,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {getPlayerName("white")}
                </Typography>
                <Box />
                <Typography
                  noWrap
                  sx={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    maxWidth: 50,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {getPlayerName("black")}
                </Typography>
              </Box>

              {/* Stats rows */}
              {getDisplayStats().map((stat, i) => (
                <Box
                  key={stat.type}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 50px 40px 50px",
                    alignItems: "center",
                    px: 2,
                    py: 1,
                    borderBottom:
                      i < getDisplayStats().length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    "&:hover": {
                      background: "rgba(255,255,255,0.02)",
                    },
                  }}
                >
                  {/* Label with icon */}
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.2 }}
                  >
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "7px",
                        background: stat.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {stat.type === MoveClassification.Splendid ? (
                        <Typography
                          sx={{
                            color: "white",
                            fontWeight: 900,
                            fontSize: "11px",
                          }}
                        >
                          !!
                        </Typography>
                      ) : (
                        <Icon
                          icon={stat.icon}
                          style={{ fontSize: 14, color: "white" }}
                        />
                      )}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.85)",
                      }}
                    >
                      {t(stat.label)}
                    </Typography>
                  </Box>

                  {/* White count */}
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      textAlign: "center",
                      color:
                        stat.whiteCount > 0
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {stat.whiteCount}
                  </Typography>

                  {/* Divider */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 1,
                        height: 20,
                        background: "rgba(255,255,255,0.08)",
                      }}
                    />
                  </Box>

                  {/* Black count */}
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      textAlign: "center",
                      color:
                        stat.blackCount > 0
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {stat.blackCount}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Show more toggle */}
            {moveStats.length > 6 && (
              <Box sx={{ textAlign: "center", mt: 1.5 }}>
                <Button
                  onClick={() => setShowMore(!showMore)}
                  size="small"
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: "0.8rem",
                    "&:hover": {
                      color: "rgba(255,255,255,0.8)",
                      background: "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  {showMore ? t("showLess") : t("showMore")}
                  <Icon
                    icon={showMore ? "mdi:chevron-up" : "mdi:chevron-down"}
                    style={{ fontSize: 18, marginLeft: 4 }}
                  />
                </Button>
              </Box>
            )}

            {/* Spacer for bottom button */}
            <Box sx={{ height: 80 }} />
          </Box>
        ) : null}

        {/* Fixed bottom button */}
        {analysisComplete && (
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              pt: 4,
              background:
                "linear-gradient(180deg, transparent 0%, #1a1a2e 60%)",
            }}
          >
            <Button
              onClick={() => {
                triggerInterstitialAd();
                onAnalyzeComplete();
                onClose();
              }}
              variant="contained"
              fullWidth
              size="large"
              sx={{
                background: "linear-gradient(135deg, #66BB6A, #42A5F5)",
                color: "white",
                fontWeight: 700,
                py: 1.8,
                borderRadius: "14px",
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: "0 8px 24px rgba(66, 165, 245, 0.3)",
                "&:hover": {
                  background: "linear-gradient(135deg, #4CAF50, #1E88E5)",
                  boxShadow: "0 12px 32px rgba(66, 165, 245, 0.4)",
              },
            }}
          >
            {t("startReview")}
          </Button>
          </Box>
        )}
      </DialogContent>

      <PremiumModal
        open={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        trigger="deep_analysis"
      />
    </Dialog>
  );
}
