import { useRouter } from "next/router";
import { useTranslation } from "@/lib/i18n";
import { triggerInterstitialAd, showRewardedAd } from "@/lib/ads";
import { canPlayPuzzle, incrementPuzzleCount, FREE_PUZZLE_LIMIT, shouldGateFeature, canUseHint, incrementHintCount, FREE_HINT_LIMIT, canWatchRewardedAd, grantRewardedPuzzles, grantRewardedHint, PUZZLE_LIMIT_KEY_PUBLIC } from "@/lib/premium";
import PremiumModal from "@/components/PremiumModal";
import { PageTitle } from "@/components/pageTitle";
import {
  Grid2 as Grid,
  Box,
  useTheme,
  useMediaQuery,
  Typography,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
} from "@mui/material";
import { Icon } from "@iconify/react";
import PremiumNavBar from "@/components/PremiumNavBar";
import { usePuzzle } from "@/hooks/usePuzzle";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Square, Arrow, CustomSquareStyles, CustomPieces, Piece } from "react-chessboard/dist/chessboard/types";
import RatingModal, { useRatingPrompt } from "@/components/RatingModal";
import { logAnalyticsEvent } from "@/lib/firebase";
import { BOARD_COLORS } from "@/constants";
import { checkReactionAtom, pieceSetAtom } from "@/components/board/states";
import { useAtomValue } from "jotai";
import LevelProgress from "@/components/LevelProgress";

export default function Puzzles() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isLgOrGreater = useMediaQuery(theme.breakpoints.up("lg"));
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const {
    puzzle,
    puzzleState,
    game,
    stats,
    showHint,
    isDaily,
    playerColor,
    currentTurn,
    lastMove,
    isSettingUp,
    userLevel,
    unlockedLevels,
    selectedLevel,
    setSelectedLevel,
    typeLevels,
    loadRandomPuzzle,
    loadDailyPuzzle,
    makeMove,
    getHint,
    retry,
  } = usePuzzle();

  const pieceSet = useAtomValue(pieceSetAtom);
  const checkReaction = useAtomValue(checkReactionAtom);
  const { showRating, ratingTrigger, checkAfterPuzzle, closeRating } = useRatingPrompt();
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null);
  const [mode, setMode] = useState<"daily" | "practice">("daily");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [puzzleLoaded, setPuzzleLoaded] = useState(false);
  const puzzleCountRef = useRef(0);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [hintLimitReached, setHintLimitReached] = useState(false);
  const [rewardedAdLoading, setRewardedAdLoading] = useState(false);
  const [checkAnimSquare, setCheckAnimSquare] = useState<Square | null>(null);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPuzzleFenRef = useRef(game.fen());

  useEffect(() => {
    const currentFen = game.fen();
    if (currentFen === prevPuzzleFenRef.current) return;
    prevPuzzleFenRef.current = currentFen;

    if (!checkReaction) {
      setCheckAnimSquare(null);
      return;
    }

    if (game.inCheck() && !game.isGameOver()) {
      const turn = game.turn();
      const files = "abcdefgh";
      let kingSquare: Square | null = null;
      for (let r = 1; r <= 8; r++) {
        for (let f = 0; f < 8; f++) {
          const sq = `${files[f]}${r}` as Square;
          const piece = game.get(sq as any);
          if (piece?.type === "k" && piece.color === turn) {
            kingSquare = sq;
            break;
          }
        }
        if (kingSquare) break;
      }

      if (kingSquare) {
        if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
        setCheckAnimSquare(kingSquare);
        checkTimerRef.current = setTimeout(() => setCheckAnimSquare(null), 2000);
      }
    } else {
      setCheckAnimSquare(null);
    }

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [game, game.fen(), checkReaction]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if we should show rating prompt when puzzle is solved
  useEffect(() => {
    if (puzzleState === "solved") {
      checkAfterPuzzle(stats.solved);
    }
  }, [puzzleState, stats.solved, checkAfterPuzzle]);

  // Load initial puzzle only once per mode change
  useEffect(() => {
    setPuzzleLoaded(false);
  }, [mode]);

  useEffect(() => {
    if (puzzleLoaded) return;
    if (mode === "daily") {
      loadDailyPuzzle();
    } else {
      if (!canPlayPuzzle()) {
        setLimitReached(true);
        setPuzzleLoaded(true);
        return;
      }
      loadRandomPuzzle();
    }
    setPuzzleLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, puzzleLoaded]);

  // Get legal moves for a square
  const getLegalMovesForSquare = useCallback(
    (square: Square): Square[] => {
      const moves = game.moves({ square, verbose: true });
      return moves.map((move) => move.to as Square);
    },
    [game]
  );

  // Handle square click
  const onSquareClick = useCallback(
    (square: Square) => {
      if (puzzleState !== "playing" || isSettingUp) return;

      // If clicking on a legal move square, make the move
      if (selectedSquare && legalMoves.includes(square)) {
        const result = makeMove(selectedSquare, square);
        setSelectedSquare(null);
        setLegalMoves([]);
        setHintArrow(null);
        return;
      }

      // Check if clicking on own piece
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        setLegalMoves(getLegalMovesForSquare(square));
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    },
    [puzzleState, isSettingUp, selectedSquare, legalMoves, makeMove, game, getLegalMovesForSquare]
  );

  // Handle piece drop
  const onDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square): boolean => {
      if (puzzleState !== "playing" || isSettingUp) return false;
      const result = makeMove(sourceSquare, targetSquare);
      setHintArrow(null);
      setSelectedSquare(null);
      setLegalMoves([]);
      return result;
    },
    [makeMove, puzzleState, isSettingUp]
  );

  // Track page open
  useEffect(() => {
    logAnalyticsEvent("page_view", { page: "puzzles" });
  }, []);

  // Handle hint
  const handleHint = useCallback(() => {
    if (!canUseHint()) {
      setHintLimitReached(true);
      return;
    }
    incrementHintCount();
    logAnalyticsEvent("puzzle_hint", { mode, puzzle_id: puzzle?.id });
    const hint = getHint();
    if (hint) {
      setHintArrow([hint.from, hint.to, "rgba(255, 193, 7, 0.8)"] as Arrow);
    }
  }, [getHint, mode, puzzle]);

  // Handle next puzzle
  const handleNext = useCallback(() => {
    setHintArrow(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    if (mode === "practice") {
      incrementPuzzleCount();

      if (!canPlayPuzzle()) {
        setLimitReached(true);
        return;
      }

      puzzleCountRef.current += 1;
      if (puzzleCountRef.current % 3 === 0) {
        triggerInterstitialAd();
      }
      
      setPuzzleLoaded(false);
    }
  }, [mode]);

  // Handle retry
  const handleRetry = useCallback(() => {
    logAnalyticsEvent("puzzle_retry", { mode, puzzle_id: puzzle?.id });
    setHintArrow(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    retry();
  }, [retry, mode, puzzle]);

  // Custom pieces matching the shared board component
  const PIECE_CODES: Piece[] = ["wP","wB","wN","wR","wQ","wK","bP","bB","bN","bR","bQ","bK"];
  const customPieces = useMemo(
    () =>
      PIECE_CODES.reduce<CustomPieces>((acc, piece) => {
        acc[piece] = ({ squareWidth }: { squareWidth: number }) => (
          <div
            style={{
              width: squareWidth,
              height: squareWidth,
              backgroundImage: `url(/piece/${pieceSet}/${piece}.svg)`,
              backgroundSize: "contain",
            }}
          />
        );
        return acc;
      }, {}),
    [pieceSet] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Board size calculation - maximize board on mobile
  const boardSize = useMemo(() => {
    if (typeof window === "undefined") return 400;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < 1200) {
      return Math.min(width - 16, height - 260, 560);
    }
    return Math.min(width - 700, height * 0.7, 560);
  }, []);

  // Custom arrows for hint and solved state
  const customArrows = useMemo(() => {
    const arrows: Arrow[] = [];
    
    // Show hint arrow
    if (hintArrow) {
      arrows.push(hintArrow);
    }
    
    // Show green arrow on winning move when solved
    if (puzzleState === "solved" && lastMove) {
      arrows.push([
        lastMove.from,
        lastMove.to,
        "rgba(76, 175, 80, 0.9)", // Green arrow
      ] as Arrow);
    }
    
    // Show red arrow on failed move
    if (puzzleState === "failed" && lastMove) {
      arrows.push([
        lastMove.from,
        lastMove.to,
        "rgba(244, 67, 54, 0.9)", // Red arrow
      ] as Arrow);
    }
    
    return arrows;
  }, [hintArrow, puzzleState, lastMove]);

  // Custom square styles for highlighting
  const customSquareStyles = useMemo(() => {
    const styles: CustomSquareStyles = {};

    // Highlight last move squares
    if (lastMove) {
      styles[lastMove.from as Square] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };
      
      // If puzzle is solved, add green glow to winning square
      if (puzzleState === "solved") {
        styles[lastMove.to as Square] = {
          backgroundColor: "rgba(76, 175, 80, 0.6)",
          boxShadow: "inset 0 0 20px rgba(76, 175, 80, 0.8), 0 0 15px rgba(76, 175, 80, 0.6)",
        };
      } else if (puzzleState === "failed") {
        styles[lastMove.to as Square] = {
          backgroundColor: "rgba(244, 67, 54, 0.5)",
          boxShadow: "inset 0 0 20px rgba(244, 67, 54, 0.6)",
        };
      } else {
        styles[lastMove.to as Square] = {
          backgroundColor: "rgba(255, 255, 0, 0.5)",
        };
      }
    }

    // Highlight selected square (overrides last move highlight)
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(130, 151, 105, 0.8)",
      };
    }

    // Highlight legal moves
    legalMoves.forEach((square) => {
      const piece = game.get(square);
      if (piece) {
        // Capture move - thick inset ring visible on top of opponent piece
        styles[square] = {
          boxShadow: "inset 0 0 0 5px rgba(0,0,0,0.45)",
          borderRadius: "50%",
        };
      } else {
        // Normal move - dot indicator
        styles[square] = {
          background:
            "radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)",
          borderRadius: "50%",
        };
      }
    });

    return styles;
  }, [selectedSquare, legalMoves, game, lastMove, puzzleState]);

  // Status message and color
  const getStatusInfo = () => {
    if (puzzleState === "solved") {
      return {
        message: t("correct"),
        color: "#4CAF50",
        icon: "mdi:check-circle",
      };
    }
    if (puzzleState === "failed") {
      return {
        message: t("incorrect"),
        color: "#f44336",
        icon: "mdi:close-circle",
      };
    }
    if (isSettingUp) {
      return {
        message: t("watch"),
        color: "#FF9800",
        icon: "mdi:eye",
      };
    }
    return {
      message: currentTurn === "white" ? t("whiteToPlay") : t("blackToPlay"),
      color: currentTurn === "white" ? "#f5f5f5" : "#e0e0e0",
      icon: currentTurn === "white" ? "mdi:chess-king" : "game-icons:chess-king",
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <PremiumNavBar onHomeClick={() => router.push("/")} />
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          background: `linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(22,33,62,0.9) 50%, rgba(15,52,96,0.9) 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: isMobile ? "16px" : "24px",
        }}
      >
        <PageTitle title={t("puzzles")} />

        <Grid
          container
          gap={3}
          justifyContent="center"
          alignItems="start"
          sx={{ maxWidth: "1200px", margin: "0 auto" }}
        >
          {/* Mode Selector */}
          <Grid size={12}>
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              sx={{ mb: 2 }}
            >
              <Button
                variant={mode === "daily" ? "contained" : "outlined"}
                onClick={() => setMode("daily")}
                startIcon={<Icon icon="mdi:calendar-today" />}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  py: 1,
                  background:
                    mode === "daily"
                      ? "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)"
                      : "transparent",
                  borderColor: "#FF9800",
                  color: mode === "daily" ? "white" : "#FF9800",
                  "&:hover": {
                    background:
                      mode === "daily"
                        ? "linear-gradient(135deg, #F57C00 0%, #E65100 100%)"
                        : "rgba(255, 152, 0, 0.1)",
                    borderColor: "#FF9800",
                  },
                }}
              >
                {t("dailyPuzzle")}
              </Button>
              <Button
                variant={mode === "practice" ? "contained" : "outlined"}
                onClick={() => setMode("practice")}
                startIcon={<Icon icon="mdi:dumbbell" />}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  py: 1,
                  background:
                    mode === "practice"
                      ? "linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)"
                      : "transparent",
                  borderColor: "#9C27B0",
                  color: mode === "practice" ? "white" : "#9C27B0",
                  "&:hover": {
                    background:
                      mode === "practice"
                        ? "linear-gradient(135deg, #7B1FA2 0%, #6A1B9A 100%)"
                        : "rgba(156, 39, 176, 0.1)",
                    borderColor: "#9C27B0",
                  },
                }}
              >
                {t("practice")}
              </Button>
            </Stack>
            {mode === "practice" && (
              <Box sx={{ maxWidth: boardSize, width: "100%", mx: "auto" }}>
                <LevelProgress
                  userLevel={userLevel}
                  unlockedLevels={unlockedLevels}
                  selectedLevel={selectedLevel}
                  onSelectLevel={setSelectedLevel}
                  levels={typeLevels}
                />
              </Box>
            )}
          </Grid>

          {/* Puzzle Board Section */}
          <Grid size={12} sx={{ display: "flex", justifyContent: "center" }}>
            <Box sx={{ maxWidth: boardSize }}>
              {/* Header: Turn/Status + Rating */}
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1, px: 0.5 }}
              >
                {/* Turn/Status Indicator */}
                {puzzleState === "solved" ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icon
                      icon="mdi:check-circle"
                      style={{ fontSize: 20, color: "#4CAF50" }}
                    />
                    <Stack>
                      <Typography
                        variant="body1"
                        sx={{
                          color: "#4CAF50",
                          fontWeight: 700,
                        }}
                      >
                        {t("puzzleSolved")}
                      </Typography>
                      {mode === "daily" && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "0.7rem",
                          }}
                        >
                          {t("newPuzzleTomorrow")}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                ) : puzzleState === "failed" ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icon
                      icon="mdi:close-circle"
                      style={{ fontSize: 20, color: "#f44336" }}
                    />
                    <Typography
                      variant="body1"
                      sx={{
                        color: "#f44336",
                        fontWeight: 700,
                      }}
                    >
                      {t("incorrect")}
                    </Typography>
                  </Stack>
                ) : (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        backgroundColor: currentTurn === "white" ? "#fff" : "#333",
                        border: "2px solid #666",
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: statusInfo.color,
                        fontWeight: 600,
                      }}
                    >
                      {statusInfo.message}
                    </Typography>
                  </Stack>
                )}

                {/* Rating */}
                {puzzle && (
                  <Chip
                    size="small"
                    icon={<Icon icon="mdi:star" style={{ fontSize: 14 }} />}
                    label={t("rating", { value: puzzle.rating })}
                    sx={{
                      background: "rgba(255,193,7,0.2)",
                      color: "#FFC107",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      height: 24,
                    }}
                  />
                )}
              </Stack>

              {/* Board with Icon Overlay */}
              <Box
                sx={{
                  borderRadius: "12px",
                  overflow: "visible",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  position: "relative",
                }}
              >
                <Chessboard
                  id="PuzzleBoard"
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  onSquareClick={onSquareClick}
                  boardWidth={boardSize}
                  boardOrientation={playerColor || "white"}
                  customArrows={customArrows}
                  customSquareStyles={customSquareStyles}
                  arePiecesDraggable={puzzleState === "playing" && !isSettingUp}
                  animationDuration={400}
                  customBoardStyle={{
                    borderRadius: "8px",
                  }}
                  customDarkSquareStyle={BOARD_COLORS.darkSquare}
                  customLightSquareStyle={BOARD_COLORS.lightSquare}
                  customPieces={customPieces}
                />
                
                {/* Icon overlay for solved/failed state */}
                {(puzzleState === "solved" || puzzleState === "failed") && lastMove && (
                  <Box
                    sx={{
                      position: "absolute",
                      width: boardSize / 8,
                      height: boardSize / 8,
                      pointerEvents: "none",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                      left: (() => {
                        const file = lastMove.to.charCodeAt(0) - 97;
                        return playerColor === "white" 
                          ? file * (boardSize / 8)
                          : (7 - file) * (boardSize / 8);
                      })(),
                      top: (() => {
                        const rank = parseInt(lastMove.to[1]) - 1;
                        return playerColor === "white"
                          ? (7 - rank) * (boardSize / 8)
                          : rank * (boardSize / 8);
                      })(),
                    }}
                  >
                    <img
                      src={puzzleState === "solved" ? "/icons/best.png" : "/icons/mistake.png"}
                      alt={puzzleState === "solved" ? t("correct") : t("incorrect")}
                      style={{
                        width: boardSize / 8 * 0.4,
                        height: boardSize / 8 * 0.4,
                        marginTop: 2,
                        marginRight: 2,
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                      }}
                    />
                  </Box>
                )}

                {/* Check GIF overlay */}
                {checkAnimSquare && (() => {
                  const sqSize = boardSize / 8;
                  const file = checkAnimSquare.charCodeAt(0) - 97;
                  const rank = parseInt(checkAnimSquare[1]) - 1;
                  const isWhite = playerColor === "white";
                  const x = isWhite ? file * sqSize : (7 - file) * sqSize;
                  const y = isWhite ? (7 - rank) * sqSize : rank * sqSize;
                  return (
                    <Box
                      sx={{
                        position: "absolute",
                        left: x,
                        top: y,
                        width: sqSize,
                        height: sqSize,
                        pointerEvents: "none",
                        zIndex: 100,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        animation: "checkPop 0.3s ease-out",
                        "@keyframes checkPop": {
                          "0%": { transform: "scale(0.3)", opacity: 0 },
                          "50%": { transform: "scale(1.2)", opacity: 1 },
                          "100%": { transform: "scale(1)", opacity: 1 },
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src="/images/check-reaction.gif"
                        alt="Check!"
                        sx={{
                          width: sqSize,
                          height: sqSize,
                          opacity: 0.75,
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                  );
                })()}
              </Box>

              {/* Action Buttons Below Board */}
              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                sx={{ mt: 2 }}
              >
                {puzzleState === "playing" && (
                  <Button
                    variant="outlined"
                    onClick={handleHint}
                    startIcon={<Icon icon="mdi:lightbulb" />}
                    size="small"
                    sx={{
                      borderRadius: "8px",
                      borderColor: "#FFC107",
                      color: "#FFC107",
                      "&:hover": {
                        background: "rgba(255,193,7,0.1)",
                        borderColor: "#FFC107",
                      },
                    }}
                  >
                    {t("hint")}
                  </Button>
                )}

                {puzzleState === "failed" && (
                  <Button
                    variant="contained"
                    onClick={handleRetry}
                    startIcon={<Icon icon="mdi:refresh" />}
                    size="small"
                    sx={{
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
                    }}
                  >
                    {t("retry")}
                  </Button>
                )}

                {puzzleState === "solved" && mode === "practice" && (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    startIcon={<Icon icon="mdi:arrow-right" />}
                    size="small"
                    sx={{
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",
                    }}
                  >
                    {t("nextPuzzle")}
                  </Button>
                )}
              </Stack>

              {/* Stats Row */}
              <Stack
                direction="row"
                spacing={3}
                justifyContent="center"
                sx={{ mt: 2 }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "#4CAF50", fontWeight: 700 }}>
                    {stats.solved}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                    {t("solved")}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "#f44336", fontWeight: 700 }}>
                    {stats.failed}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                    {t("failed")}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "#FF9800", fontWeight: 700 }}>
                    {stats.streak}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                    {t("streak")}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>
      <RatingModal open={showRating} onClose={closeRating} trigger={ratingTrigger} />

      {/* Hint limit reached dialog */}
      <Dialog
        open={hintLimitReached && shouldGateFeature()}
        onClose={() => setHintLimitReached(false)}
        PaperProps={{
          sx: {
            background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            color: "white",
            borderRadius: "20px",
            maxWidth: 360,
          },
        }}
      >
        <IconButton
          onClick={() => setHintLimitReached(false)}
          sx={{ position: "absolute", top: 8, right: 8, color: "rgba(255,255,255,0.5)", zIndex: 1, "&:hover": { color: "white" } }}
        >
          <Icon icon="mdi:close" style={{ fontSize: 22 }} />
        </IconButton>
        <DialogContent sx={{ textAlign: "center", py: 4, px: 3 }}>
          <Icon icon="mdi:lightbulb-off" style={{ fontSize: 48, color: "#FFC107", marginBottom: 12 }} />
          <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, mb: 1 }}>
            {t("hintsUsedUp")}
          </Typography>
          <Typography sx={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", mb: 3 }}>
            {t("hintsUsedUpDesc", { limit: FREE_HINT_LIMIT })}
          </Typography>
          <Button
            onClick={() => {
              setHintLimitReached(false);
              setPremiumModalOpen(true);
            }}
            variant="contained"
            fullWidth
            sx={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              color: "#1a1a2e",
              fontWeight: 700,
              py: 1.5,
              borderRadius: "12px",
              textTransform: "none",
              fontSize: "1rem",
              mb: 1,
            }}
          >
            {t("upgradeToPremium")}
          </Button>
          {canWatchRewardedAd() && (
            <Button
              onClick={async () => {
                setRewardedAdLoading(true);
                const earned = await showRewardedAd();
                setRewardedAdLoading(false);
                if (earned) {
                  grantRewardedHint();
                  setHintLimitReached(false);
                  logAnalyticsEvent("rewarded_ad_hint", { page: "puzzles" });
                }
              }}
              disabled={rewardedAdLoading}
              variant="outlined"
              fullWidth
              startIcon={<Icon icon="mdi:play-circle" />}
              sx={{
                borderColor: "rgba(78,205,196,0.5)",
                color: "#4ecdc4",
                fontWeight: 700,
                py: 1.2,
                borderRadius: "12px",
                textTransform: "none",
                fontSize: "0.95rem",
                "&:hover": { borderColor: "#4ecdc4", background: "rgba(78,205,196,0.1)" },
              }}
            >
              {rewardedAdLoading ? t("adLoading") : t("watchAdForHint")}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Daily limit reached overlay */}
      <Dialog
        open={limitReached && shouldGateFeature()}
        onClose={() => setLimitReached(false)}
        PaperProps={{
          sx: {
            background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            color: "white",
            borderRadius: "20px",
            maxWidth: 360,
          },
        }}
      >
        <IconButton
          onClick={() => setLimitReached(false)}
          sx={{ position: "absolute", top: 8, right: 8, color: "rgba(255,255,255,0.5)", zIndex: 1, "&:hover": { color: "white" } }}
        >
          <Icon icon="mdi:close" style={{ fontSize: 22 }} />
        </IconButton>
        <DialogContent sx={{ textAlign: "center", py: 4, px: 3 }}>
          <Icon icon="mdi:lock" style={{ fontSize: 48, color: "#FFA500", marginBottom: 12 }} />
          <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, mb: 1 }}>
            {t("dailyLimitReached")}
          </Typography>
          <Typography sx={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", mb: 3 }}>
            {t("puzzleLimitDesc", { limit: FREE_PUZZLE_LIMIT })}
          </Typography>
          <Button
            onClick={() => {
              setLimitReached(false);
              setPremiumModalOpen(true);
            }}
            variant="contained"
            fullWidth
            sx={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              color: "#1a1a2e",
              fontWeight: 700,
              py: 1.5,
              borderRadius: "12px",
              textTransform: "none",
              fontSize: "1rem",
              mb: 1,
            }}
          >
            {t("upgradeToPremium")}
          </Button>
          {canWatchRewardedAd() && (
            <Button
              onClick={async () => {
                setRewardedAdLoading(true);
                const earned = await showRewardedAd();
                setRewardedAdLoading(false);
                if (earned) {
                  grantRewardedPuzzles(PUZZLE_LIMIT_KEY_PUBLIC);
                  setLimitReached(false);
                  logAnalyticsEvent("rewarded_ad_puzzles", { page: "puzzles" });
                }
              }}
              disabled={rewardedAdLoading}
              variant="outlined"
              fullWidth
              startIcon={<Icon icon="mdi:play-circle" />}
              sx={{
                borderColor: "rgba(78,205,196,0.5)",
                color: "#4ecdc4",
                fontWeight: 700,
                py: 1.2,
                borderRadius: "12px",
                textTransform: "none",
                fontSize: "0.95rem",
                "&:hover": { borderColor: "#4ecdc4", background: "rgba(78,205,196,0.1)" },
              }}
            >
              {rewardedAdLoading ? t("adLoading") : t("watchAdForPuzzles")}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <PremiumModal
        open={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        trigger="puzzle_limit"
      />
    </>
  );
}
