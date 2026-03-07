import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Stack,
  TextField,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { Chessboard } from "react-chessboard";
import { CustomPieces, Piece, Square, CustomSquareStyles } from "react-chessboard/dist/chessboard/types";
import { useAtomValue } from "jotai";
import PremiumNavBar from "@/components/PremiumNavBar";
import { PageTitle } from "@/components/pageTitle";
import { pieceSetAtom } from "@/components/board/states";
import { getChessComPlayerAllGames } from "@/lib/chessCom";
import { buildOpeningTree, findWeaknesses, OpeningWeakness } from "@/lib/openingTree";
import { useOpeningTrainer } from "@/hooks/useOpeningTrainer";
import { BOARD_COLORS } from "@/constants";
import { logAnalyticsEvent } from "@/lib/firebase";
import { triggerInterstitialAd } from "@/lib/ads";

const PIECE_CODES: Piece[] = ["wP","wB","wN","wR","wQ","wK","bP","bB","bN","bR","bQ","bK"];

type PageState = "input" | "loading" | "results" | "training";

// ── Weakness Card ──────────────────────────────────────────────────────────

function WeaknessCard({
  weakness,
  index,
  onPractice,
}: {
  weakness: OpeningWeakness;
  index: number;
  onPractice: () => void;
}) {
  const bestMove = weakness.betterMoves[0];
  const colorLabel = weakness.playerColor === "white" ? "as White" : "as Black";

  return (
    <Card
      sx={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 3,
        transition: "all 0.2s ease",
        "&:hover": {
          border: "1px solid rgba(255,255,255,0.25)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f44336, #c62828)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {index + 1}
            </Box>
            <Box>
              <Typography sx={{ color: "white", fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.2 }}>
                {weakness.openingName ?? "Opening Position"}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                {colorLabel}
              </Typography>
            </Box>
          </Stack>
          <Chip
            size="small"
            label={`${weakness.weakMove.games} games`}
            sx={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: "0.7rem" }}
          />
        </Stack>

        {/* Win rate comparison */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography sx={{ color: "#f44336", fontSize: "0.75rem", fontWeight: 600 }}>
                  {weakness.weakMove.san}
                </Typography>
                <Typography sx={{ color: "#f44336", fontSize: "0.75rem", fontWeight: 700 }}>
                  {weakness.weakMove.winRate}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={weakness.weakMove.winRate}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.1)",
                  "& .MuiLinearProgress-bar": { bgcolor: "#f44336", borderRadius: 3 },
                }}
              />
            </Box>
            <Icon icon="mdi:arrow-right" style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }} />
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography sx={{ color: "#4CAF50", fontSize: "0.75rem", fontWeight: 600 }}>
                  {bestMove.san}
                </Typography>
                <Typography sx={{ color: "#4CAF50", fontSize: "0.75rem", fontWeight: 700 }}>
                  {bestMove.winRate}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={bestMove.winRate}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.1)",
                  "& .MuiLinearProgress-bar": { bgcolor: "#4CAF50", borderRadius: 3 },
                }}
              />
            </Box>
          </Stack>
          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
            You usually play <strong style={{ color: "#f44336" }}>{weakness.weakMove.san}</strong>, try <strong style={{ color: "#4CAF50" }}>{bestMove.san}</strong> instead
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          onClick={onPractice}
          startIcon={<Icon icon="mdi:play" />}
          sx={{
            background: "linear-gradient(135deg, #3B9AC6, #2980b9)",
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.85rem",
            py: 0.8,
          }}
        >
          Practice This
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const COMING_SOON = true;

export default function OpeningTrainer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const pieceSet = useAtomValue(pieceSetAtom);

  useEffect(() => {
    if (COMING_SOON) window.location.href = "/";
  }, []);

  const [pageState, setPageState] = useState<PageState>("input");
  const [username, setUsername] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");
  const [weaknesses, setWeaknesses] = useState<OpeningWeakness[]>([]);
  const [analyzedGames, setAnalyzedGames] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fill username from localStorage (same key as stats page)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("insights-username");
      if (saved) {
        const usernames = JSON.parse(saved) as string[];
        if (Array.isArray(usernames) && usernames.length > 0) {
          setUsername(usernames[0]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const trainer = useOpeningTrainer(weaknesses);

  const customPieces = useMemo<CustomPieces>(
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
    [pieceSet]
  );

  const boardSize = useMemo(() => {
    if (typeof window === "undefined") return 360;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < 1200) return Math.min(width - 32, height - 300, 480);
    return Math.min(500, height * 0.65);
  }, []);

  const handleAnalyze = useCallback(async () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    setErrorMsg(null);
    setPageState("loading");
    setLoadingStatus("Fetching your games from Chess.com...");
    logAnalyticsEvent("opening_trainer_analyze", { username: trimmed });

    try {
      const games = await getChessComPlayerAllGames(trimmed, 3);
      if (games.length === 0) {
        setErrorMsg("No games found for this username. Make sure your Chess.com username is correct.");
        setPageState("input");
        return;
      }

      setLoadingStatus(`Analyzing ${games.length} games...`);
      await new Promise((r) => setTimeout(r, 50)); // Let UI update

      const tree = buildOpeningTree(games, trimmed);
      const found = findWeaknesses(tree);
      setWeaknesses(found);
      setAnalyzedGames(games.length);
      setPageState("results");
    } catch {
      setErrorMsg("Could not fetch games. Please check the username and try again.");
      setPageState("input");
    }
  }, [username]);

  const handlePracticeWeakness = useCallback(
    (index: number) => {
      trainer.startTraining(index);
      triggerInterstitialAd();
      setPageState("training");
      logAnalyticsEvent("opening_trainer_start", { weakness_index: index });
    },
    [trainer]
  );

  const handlePracticeAll = useCallback(() => {
    trainer.startTraining();
    triggerInterstitialAd();
    setPageState("training");
    logAnalyticsEvent("opening_trainer_start_all", { total: weaknesses.length });
  }, [trainer, weaknesses.length]);

  // Square highlight styles for trainer
  const customSquareStyles = useMemo<CustomSquareStyles>(() => {
    const styles: CustomSquareStyles = {};
    if (trainer.lastMove) {
      styles[trainer.lastMove.from as Square] = { backgroundColor: "rgba(255,255,0,0.4)" };
      if (trainer.trainerState === "correct") {
        styles[trainer.lastMove.to as Square] = {
          backgroundColor: "rgba(76,175,80,0.6)",
          boxShadow: "inset 0 0 20px rgba(76,175,80,0.8)",
        };
      } else if (trainer.trainerState === "wrong") {
        styles[trainer.lastMove.to as Square] = {
          backgroundColor: "rgba(244,67,54,0.5)",
          boxShadow: "inset 0 0 20px rgba(244,67,54,0.6)",
        };
      } else {
        styles[trainer.lastMove.to as Square] = { backgroundColor: "rgba(255,255,0,0.5)" };
      }
    }
    return styles;
  }, [trainer.lastMove, trainer.trainerState]);

  const onDrop = useCallback(
    (from: Square, to: Square, piece: Piece): boolean => {
      if (trainer.trainerState !== "playing") return false;
      const isPawn = piece[1]?.toLowerCase() === "p";
      const isPromotionRank = to[1] === "8" || to[1] === "1";
      const promotion = isPawn && isPromotionRank ? "q" : undefined;
      return trainer.makeMove(from, to, promotion);
    },
    [trainer]
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      // Simple click-to-move handled by onDrop; this is a no-op placeholder
      void square;
    },
    []
  );

  // ── Render: Input ──────────────────────────────────────────────────────

  const renderInput = () => (
    <Box sx={{ maxWidth: 480, mx: "auto", textAlign: "center", pt: 4 }}>
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3B9AC6, #2980b9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 3,
          boxShadow: "0 8px 32px rgba(59,154,198,0.4)",
        }}
      >
        <Icon icon="mdi:chess-knight" style={{ fontSize: 40, color: "white" }} />
      </Box>
      <Typography variant="h5" sx={{ color: "white", fontWeight: 700, mb: 1 }}>
        Opening Trainer
      </Typography>
      <Typography sx={{ color: "rgba(255,255,255,0.6)", mb: 4, fontSize: "0.95rem" }}>
        Analyze your Chess.com games and discover which opening moves you should improve.
      </Typography>
      <TextField
        fullWidth
        placeholder="Chess.com username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
        InputProps={{
          startAdornment: (
            <Icon icon="mdi:account" style={{ color: "rgba(255,255,255,0.4)", marginRight: 8, fontSize: 20 }} />
          ),
        }}
        sx={{
          mb: 2,
          "& .MuiOutlinedInput-root": {
            color: "white",
            background: "rgba(255,255,255,0.07)",
            borderRadius: 2,
            "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
            "&.Mui-focused fieldset": { borderColor: "#3B9AC6" },
          },
          "& input::placeholder": { color: "rgba(255,255,255,0.4)", opacity: 1 },
        }}
      />
      {errorMsg && (
        <Typography sx={{ color: "#f44336", fontSize: "0.85rem", mb: 2 }}>
          {errorMsg}
        </Typography>
      )}
      <Button
        variant="contained"
        fullWidth
        onClick={handleAnalyze}
        disabled={!username.trim()}
        size="large"
        startIcon={<Icon icon="mdi:magnify" />}
        sx={{
          background: "linear-gradient(135deg, #3B9AC6, #2980b9)",
          borderRadius: 2,
          textTransform: "none",
          fontWeight: 700,
          fontSize: "1rem",
          py: 1.5,
        }}
      >
        Analyze My Openings
      </Button>
    </Box>
  );

  // ── Render: Loading ────────────────────────────────────────────────────

  const renderLoading = () => (
    <Box sx={{ textAlign: "center", pt: 8 }}>
      <CircularProgress sx={{ color: "#3B9AC6", mb: 3 }} size={56} />
      <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem" }}>
        {loadingStatus}
      </Typography>
    </Box>
  );

  // ── Render: Results ────────────────────────────────────────────────────

  const renderResults = () => (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      {/* Summary header */}
      <Card
        sx={{
          background: "linear-gradient(135deg, rgba(59,154,198,0.2), rgba(41,128,185,0.1))",
          border: "1px solid rgba(59,154,198,0.3)",
          borderRadius: 3,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Icon icon="mdi:chess-knight" style={{ fontSize: 36, color: "#3B9AC6" }} />
            <Box>
              <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>
                Analysis Complete
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                {analyzedGames} games analyzed · {weaknesses.length} weakness{weaknesses.length !== 1 ? "es" : ""} found for <strong style={{ color: "#3B9AC6" }}>{username}</strong>
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {weaknesses.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Icon icon="mdi:trophy" style={{ fontSize: 64, color: "#FFD700", marginBottom: 16 }} />
          <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1.1rem", mb: 1 }}>
            No weaknesses found!
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
            You need more games with the same openings (3+) for a pattern to emerge.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setPageState("input")}
            sx={{ mt: 3, borderColor: "rgba(255,255,255,0.3)", color: "white", borderRadius: 2, textTransform: "none" }}
          >
            Try Another Username
          </Button>
        </Box>
      ) : (
        <>
          <Button
            variant="contained"
            fullWidth
            onClick={handlePracticeAll}
            size="large"
            startIcon={<Icon icon="mdi:play-circle" />}
            sx={{
              background: "linear-gradient(135deg, #4CAF50, #388E3C)",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              fontSize: "1rem",
              py: 1.4,
              mb: 3,
            }}
          >
            Practice All Weaknesses ({weaknesses.length})
          </Button>

          <Stack spacing={2}>
            {weaknesses.map((w, i) => (
              <WeaknessCard
                key={`${w.fen}-${i}`}
                weakness={w}
                index={i}
                onPractice={() => handlePracticeWeakness(i)}
              />
            ))}
          </Stack>

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Button
              variant="text"
              onClick={() => setPageState("input")}
              sx={{ color: "rgba(255,255,255,0.4)", textTransform: "none" }}
            >
              Analyze a different username
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  // ── Render: Training ───────────────────────────────────────────────────

  const renderTraining = () => {
    const { currentWeakness, trainerState, game, playerColor, playerFeedback, currentIndex, totalWeaknesses, progress } = trainer;

    if (trainerState === "done" || !currentWeakness) {
      return (
        <Box sx={{ textAlign: "center", pt: 6, maxWidth: 480, mx: "auto" }}>
          <Icon icon="mdi:trophy" style={{ fontSize: 72, color: "#FFD700", marginBottom: 16 }} />
          <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1.3rem", mb: 1 }}>
            Training Complete!
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.6)", mb: 4 }}>
            You practiced {progress.correct + progress.wrong} position{progress.correct + progress.wrong !== 1 ? "s" : ""}. Keep it up!
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ color: "#4CAF50", fontWeight: 700, fontSize: "1.5rem" }}>{progress.correct}</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>Correct</Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography sx={{ color: "#f44336", fontWeight: 700, fontSize: "1.5rem" }}>{progress.wrong}</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>Wrong</Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            onClick={() => setPageState("results")}
            sx={{ background: "linear-gradient(135deg, #3B9AC6, #2980b9)", borderRadius: 2, textTransform: "none", fontWeight: 700 }}
          >
            Back to Results
          </Button>
        </Box>
      );
    }

    const statusColor = trainerState === "correct" ? "#4CAF50" : trainerState === "wrong" ? "#f44336" : "#3B9AC6";
    const statusIcon = trainerState === "correct" ? "mdi:check-circle" : trainerState === "wrong" ? "mdi:close-circle" : "mdi:chess-knight";
    const statusText = trainerState === "correct" ? "Well played!" : trainerState === "wrong" ? "Not quite..." : `Find the best move as ${playerColor}`;

    return (
      <Box sx={{ maxWidth: 640, mx: "auto" }}>
        {/* Progress bar */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
              Position {currentIndex + 1} of {totalWeaknesses}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
              {currentWeakness.openingName ?? "Opening Position"} · as {playerColor}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={((currentIndex) / totalWeaknesses) * 100}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.1)",
              "& .MuiLinearProgress-bar": { bgcolor: "#3B9AC6", borderRadius: 2 },
            }}
          />
        </Box>

        {/* Status */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Icon icon={statusIcon} style={{ fontSize: 20, color: statusColor }} />
          <Typography sx={{ color: statusColor, fontWeight: 600, fontSize: "0.95rem" }}>
            {statusText}
          </Typography>
        </Stack>

        {/* Board */}
        <Box sx={{ borderRadius: 2, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", mb: 2 }}>
          <Chessboard
            id="OpeningTrainerBoard"
            position={game.fen()}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardWidth={boardSize}
            boardOrientation={playerColor}
            customSquareStyles={customSquareStyles}
            arePiecesDraggable={trainerState === "playing"}
            animationDuration={300}
            customBoardStyle={{ borderRadius: "8px" }}
            customDarkSquareStyle={BOARD_COLORS.darkSquare}
            customLightSquareStyle={BOARD_COLORS.lightSquare}
            customPieces={customPieces}
          />
        </Box>

        {/* Feedback */}
        {playerFeedback && (
          <Card
            sx={{
              background: trainerState === "correct"
                ? "rgba(76,175,80,0.15)"
                : "rgba(244,67,54,0.15)",
              border: `1px solid ${trainerState === "correct" ? "rgba(76,175,80,0.4)" : "rgba(244,67,54,0.4)"}`,
              borderRadius: 2,
              mb: 2,
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
              <Typography sx={{ color: "white", fontSize: "0.9rem" }}>
                {playerFeedback}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <Stack direction="row" spacing={1.5}>
          {trainerState === "playing" ? (
            <Button
              variant="outlined"
              onClick={() => setPageState("results")}
              sx={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", borderRadius: 2, textTransform: "none", flex: 1 }}
            >
              Back to List
            </Button>
          ) : (
            <>
              {trainerState === "wrong" && (
                <Button
                  variant="outlined"
                  onClick={trainer.retryWeakness}
                  startIcon={<Icon icon="mdi:refresh" />}
                  sx={{ borderColor: "#f44336", color: "#f44336", borderRadius: 2, textTransform: "none", flex: 1 }}
                >
                  Try Again
                </Button>
              )}
              <Button
                variant="contained"
                onClick={trainer.nextWeakness}
                startIcon={<Icon icon="mdi:arrow-right" />}
                sx={{
                  background: "linear-gradient(135deg, #3B9AC6, #2980b9)",
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  flex: 1,
                }}
              >
                {currentIndex + 1 >= totalWeaknesses ? "Finish" : "Next Position"}
              </Button>
            </>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <>
      <PremiumNavBar onHomeClick={() => (window.location.href = "/")} />
      <PageTitle title="Opening Trainer" />
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          background: "linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.95) 50%, rgba(15,52,96,0.95) 100%)",
          px: isMobile ? 2 : 4,
          py: 3,
        }}
      >
        {pageState === "input" && renderInput()}
        {pageState === "loading" && renderLoading()}
        {pageState === "results" && renderResults()}
        {pageState === "training" && renderTraining()}
      </Box>
    </>
  );
}
