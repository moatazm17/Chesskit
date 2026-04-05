import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
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
import { Arrow, CustomPieces, Piece, Square, CustomSquareStyles } from "react-chessboard/dist/chessboard/types";
import { useAtomValue } from "jotai";
import PremiumNavBar from "@/components/PremiumNavBar";
import { PageTitle } from "@/components/pageTitle";
import { pieceSetAtom } from "@/components/board/states";
import { getChessComPlayerAllGames } from "@/lib/chessCom";
import {
  buildOpeningTree,
  findWeaknesses,
  extractTrainingLines,
  TrainingLine,
} from "@/lib/openingTree";
import { useOpeningTrainer } from "@/hooks/useOpeningTrainer";
import {
  loadCachedLines,
  saveCachedLines,
  shouldReanalyze,
  loadMastery,
  getMasteryStats,
  MASTERY_LABELS,
  MASTERY_COLORS,
} from "@/lib/openingMastery";
import { BOARD_COLORS } from "@/constants";
import { logAnalyticsEvent } from "@/lib/firebase";
import { triggerInterstitialAd } from "@/lib/ads";
import {
  canPlayOpening,
  incrementOpeningCount,
  FREE_OPENING_LIMIT,
  getOpeningCount,
} from "@/lib/premium";
import { useTranslation } from "@/lib/i18n";

const PIECE_CODES: Piece[] = ["wP","wB","wN","wR","wQ","wK","bP","bB","bN","bR","bQ","bK"];

type PageState = "input" | "loading" | "results" | "training" | "sessionDone";

// ── Line Card ───────────────────────────────────────────────────────────────

function LineCard({
  line,
  masteryLevel,
  onPractice,
}: {
  line: TrainingLine;
  masteryLevel: number;
  onPractice: () => void;
}) {
  const { t } = useTranslation();
  const weakMove = line.moves.find((m) => m.isWeakness);
  const colorLabel = line.playerColor === "white" ? t("asWhite") : t("asBlack");
  const mColor = MASTERY_COLORS[masteryLevel] ?? MASTERY_COLORS[0];
  const mLabel = MASTERY_LABELS[masteryLevel] ?? MASTERY_LABELS[0];

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
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: "white", fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.2 }} noWrap>
              {line.openingName}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
              {colorLabel} · {line.moves.length} moves
            </Typography>
          </Box>
          <Chip
            size="small"
            label={mLabel}
            sx={{
              background: `${mColor}22`,
              color: mColor,
              fontWeight: 700,
              fontSize: "0.7rem",
              border: `1px solid ${mColor}55`,
              ml: 1,
            }}
          />
        </Stack>

        {weakMove && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography sx={{ color: "#f44336", fontSize: "0.75rem", fontWeight: 600 }}>
                    {weakMove.san}
                  </Typography>
                  <Typography sx={{ color: "#f44336", fontSize: "0.75rem", fontWeight: 700 }}>
                    {weakMove.weakWinRate}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={weakMove.weakWinRate ?? 0}
                  sx={{
                    height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.1)",
                    "& .MuiLinearProgress-bar": { bgcolor: "#f44336", borderRadius: 3 },
                  }}
                />
              </Box>
              <Icon icon="mdi:arrow-right" style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }} />
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography sx={{ color: "#4CAF50", fontSize: "0.75rem", fontWeight: 600 }}>
                    {weakMove.betterSan}
                  </Typography>
                  <Typography sx={{ color: "#4CAF50", fontSize: "0.75rem", fontWeight: 700 }}>
                    {weakMove.betterWinRate}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={weakMove.betterWinRate ?? 0}
                  sx={{
                    height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.1)",
                    "& .MuiLinearProgress-bar": { bgcolor: "#4CAF50", borderRadius: 3 },
                  }}
                />
              </Box>
            </Stack>
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={onPractice}
          startIcon={<Icon icon="mdi:play" />}
          sx={{
            background: "linear-gradient(135deg, #3B9AC6, #2980b9)",
            borderRadius: 2, textTransform: "none", fontWeight: 600, fontSize: "0.85rem", py: 0.8,
          }}
        >
          {t("practiceLine")}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Move Notation Display ───────────────────────────────────────────────────

function MoveNotation({
  line,
  currentMoveIdx,
}: {
  line: TrainingLine;
  currentMoveIdx: number;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.3,
        p: 1.5,
        background: "rgba(0,0,0,0.3)",
        borderRadius: 2,
        mb: 2,
        fontSize: "0.82rem",
        lineHeight: 1.8,
      }}
    >
      {line.moves.map((m, i) => {
        const isWhite = i % 2 === 0;
        const moveNum = Math.floor(i / 2) + 1;
        const played = i < currentMoveIdx;
        const isCurrent = i === currentMoveIdx;
        const isWeak = m.isWeakness;

        return (
          <Box key={i} component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.3 }}>
            {isWhite && (
              <Box component="span" sx={{ color: "rgba(255,255,255,0.35)", fontWeight: 600, mr: 0.2 }}>
                {moveNum}.
              </Box>
            )}
            <Box
              component="span"
              sx={{
                px: 0.6,
                py: 0.15,
                borderRadius: 1,
                fontWeight: isCurrent ? 700 : played ? 500 : 400,
                color: isCurrent
                  ? (isWeak ? "#4CAF50" : "#fff")
                  : played
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(255,255,255,0.25)",
                background: isCurrent ? "rgba(59,154,198,0.35)" : "transparent",
                textDecoration: isWeak && played ? "line-through" : "none",
              }}
            >
              {isWeak && played ? m.betterSan ?? m.san : played || isCurrent ? m.san : "?"}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function OpeningTrainer() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const pieceSet = useAtomValue(pieceSetAtom);

  useEffect(() => {
    const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
    if (!isLocal) router.push("/");
  }, []);

  const [pageState, setPageState] = useState<PageState>("input");
  const [username, setUsername] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");
  const [trainingLines, setTrainingLines] = useState<TrainingLine[]>([]);
  const [analyzedGames, setAnalyzedGames] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasCachedData, setHasCachedData] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("insights-username");
      if (saved) {
        const usernames = JSON.parse(saved) as string[];
        if (Array.isArray(usernames) && usernames.length > 0) {
          const u = usernames[0];
          setUsername(u);
          const cached = loadCachedLines(u);
          if (cached && cached.length > 0) {
            setTrainingLines(cached);
            setHasCachedData(true);
          }
        }
      }
    } catch { /* ignore */ }
  }, []);

  const trainer = useOpeningTrainer(trainingLines, username);

  const masteryData = useMemo(
    () => getMasteryStats(trainingLines, trainer.mastery),
    [trainingLines, trainer.mastery]
  );

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
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < 1200) return Math.min(w - 32, h - 340, 480);
    return Math.min(500, h * 0.6);
  }, []);

  // ── Analysis ────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    setErrorMsg(null);
    setPageState("loading");
    setLoadingStatus(t("fetchingGames"));
    logAnalyticsEvent("opening_trainer_analyze", { username: trimmed });

    try {
      const games = await getChessComPlayerAllGames(trimmed, 3);
      if (games.length === 0) {
        setErrorMsg(t("noGamesFound"));
        setPageState("input");
        return;
      }

      setLoadingStatus(t("analyzingCount", { count: games.length }));
      await new Promise((r) => setTimeout(r, 50));

      const tree = buildOpeningTree(games, trimmed);
      const weaknesses = findWeaknesses(tree);
      const lines = extractTrainingLines(games, weaknesses, trimmed);

      setTrainingLines(lines);
      setAnalyzedGames(games.length);
      saveCachedLines(trimmed, lines);
      setHasCachedData(true);
      setPageState("results");
    } catch {
      setErrorMsg(t("couldNotFetch"));
      setPageState("input");
    }
  }, [username]);

  const handleContinueTraining = useCallback(() => {
    setPageState("results");
  }, []);

  // ── Training Controls ─────────────────────────────────────────────────

  const handleStartSession = useCallback(() => {
    if (!canPlayOpening()) {
      setErrorMsg(t("dailyLimitReachedOpening", { limit: FREE_OPENING_LIMIT }));
      return;
    }
    trainer.startSession();
    triggerInterstitialAd();
    setPageState("training");
    logAnalyticsEvent("opening_trainer_session_start", { lines: trainingLines.length });
  }, [trainer, trainingLines.length]);

  const handleNextLine = useCallback(() => {
    incrementOpeningCount();
    trainer.nextLine();
  }, [trainer]);

  // ── Square Styles ─────────────────────────────────────────────────────

  const customSquareStyles = useMemo<CustomSquareStyles>(() => {
    const styles: CustomSquareStyles = {};

    if (trainer.selectedSquare) {
      styles[trainer.selectedSquare as Square] = { backgroundColor: "rgba(255,255,0,0.45)" };
    }
    for (const sq of trainer.playableSquares) {
      const isCapture = trainer.captureSquares.includes(sq);
      styles[sq as Square] = isCapture
        ? { background: "radial-gradient(transparent 0%, transparent 74%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.45) 82%, transparent 83%)", zIndex: 1 }
        : { background: "radial-gradient(rgba(0,0,0,.2) 25%, transparent 25%)", borderRadius: "50%" };
    }

    if (trainer.lastMove) {
      styles[trainer.lastMove.from as Square] = { backgroundColor: "rgba(255,255,0,0.4)" };
      const toColor = trainer.phase === "correct"
        ? "rgba(76,175,80,0.6)"
        : trainer.phase === "wrong"
          ? "rgba(244,67,54,0.5)"
          : "rgba(255,255,0,0.5)";
      styles[trainer.lastMove.to as Square] = { backgroundColor: toColor };
    }

    if (trainer.correctArrow && trainer.phase === "wrong") {
      const [from, to] = trainer.correctArrow;
      styles[from as Square] = { backgroundColor: "rgba(76,175,80,0.35)" };
      styles[to as Square] = {
        backgroundColor: "rgba(76,175,80,0.5)",
        boxShadow: "inset 0 0 16px rgba(76,175,80,0.7)",
      };
    }
    return styles;
  }, [trainer.lastMove, trainer.phase, trainer.selectedSquare, trainer.playableSquares, trainer.captureSquares, trainer.correctArrow]);

  const onDrop = useCallback(
    (from: Square, to: Square, piece: Piece): boolean => trainer.handlePieceDrop(from, to, piece),
    [trainer]
  );

  const onSquareClick = useCallback(
    (square: Square) => trainer.handleSquareClick(square),
    [trainer]
  );

  // ── Render: Input ─────────────────────────────────────────────────────

  const renderInput = () => (
    <Box sx={{ maxWidth: 480, mx: "auto", textAlign: "center", pt: 4 }}>
      <Box
        sx={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg, #3B9AC6, #2980b9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          mx: "auto", mb: 3, boxShadow: "0 8px 32px rgba(59,154,198,0.4)",
        }}
      >
        <Icon icon="mdi:chess-knight" style={{ fontSize: 40, color: "white" }} />
      </Box>
      <Typography variant="h5" sx={{ color: "white", fontWeight: 700, mb: 1 }}>
        {t("openingTrainer")}
      </Typography>
      <Typography sx={{ color: "rgba(255,255,255,0.6)", mb: 4, fontSize: "0.95rem" }}>
        {t("masterOpenings")}
      </Typography>
      <TextField
        fullWidth
        placeholder={t("chessComUsernamePlaceholder")}
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
            color: "white", background: "rgba(255,255,255,0.07)", borderRadius: 2,
            "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
            "&.Mui-focused fieldset": { borderColor: "#3B9AC6" },
          },
          "& input::placeholder": { color: "rgba(255,255,255,0.4)", opacity: 1 },
        }}
      />
      {errorMsg && (
        <Typography sx={{ color: "#f44336", fontSize: "0.85rem", mb: 2 }}>{errorMsg}</Typography>
      )}
      <Stack spacing={1.5}>
        <Button
          variant="contained" fullWidth onClick={handleAnalyze} disabled={!username.trim()} size="large"
          startIcon={<Icon icon="mdi:magnify" />}
          sx={{
            background: "linear-gradient(135deg, #3B9AC6, #2980b9)", borderRadius: 2,
            textTransform: "none", fontWeight: 700, fontSize: "1rem", py: 1.5,
          }}
        >
          {hasCachedData && !shouldReanalyze(username) ? t("reAnalyze") : t("analyzeMyOpenings")}
        </Button>
        {hasCachedData && (
          <Button
            variant="outlined" fullWidth onClick={handleContinueTraining} size="large"
            startIcon={<Icon icon="mdi:play-circle" />}
            sx={{
              borderColor: "rgba(76,175,80,0.5)", color: "#4CAF50", borderRadius: 2,
              textTransform: "none", fontWeight: 700, fontSize: "1rem", py: 1.5,
            }}
          >
            {t("continueTraining")} ({trainingLines.length})
          </Button>
        )}
      </Stack>
    </Box>
  );

  // ── Render: Loading ───────────────────────────────────────────────────

  const renderLoading = () => (
    <Box sx={{ textAlign: "center", pt: 8 }}>
      <CircularProgress sx={{ color: "#3B9AC6", mb: 3 }} size={56} />
      <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem" }}>{loadingStatus}</Typography>
    </Box>
  );

  // ── Render: Results ───────────────────────────────────────────────────

  const renderResults = () => {
    const mastery = trainer.mastery;

    return (
      <Box sx={{ maxWidth: 700, mx: "auto" }}>
        {/* Summary */}
        <Card sx={{ background: "linear-gradient(135deg, rgba(59,154,198,0.2), rgba(41,128,185,0.1))", border: "1px solid rgba(59,154,198,0.3)", borderRadius: 3, mb: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Icon icon="mdi:chess-knight" style={{ fontSize: 36, color: "#3B9AC6" }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>
                  {t("linesToMaster", { count: trainingLines.length, s: trainingLines.length !== 1 ? "s" : "" })}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                  {analyzedGames > 0 && `${analyzedGames} games analyzed · `}
                  {masteryData.mastered} mastered · {masteryData.learned} learned
                </Typography>
              </Box>
            </Stack>
            {trainingLines.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem" }}>{t("overallMastery")}</Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem" }}>
                    {Math.round((masteryData.avgLevel / 4) * 100)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(masteryData.avgLevel / 4) * 100}
                  sx={{
                    height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.1)",
                    "& .MuiLinearProgress-bar": { bgcolor: "#4CAF50", borderRadius: 3 },
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {trainingLines.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Icon icon="mdi:trophy" style={{ fontSize: 64, color: "#FFD700", marginBottom: 16 }} />
            <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1.1rem", mb: 1 }}>
              {t("noWeaknessesFound")}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
              {t("playMoreGames")}
            </Typography>
            <Button
              variant="outlined" onClick={() => setPageState("input")}
              sx={{ mt: 3, borderColor: "rgba(255,255,255,0.3)", color: "white", borderRadius: 2, textTransform: "none" }}
            >
              {t("tryAnotherUsername")}
            </Button>
          </Box>
        ) : (
          <>
            <Button
              variant="contained" fullWidth onClick={handleStartSession} size="large"
              startIcon={<Icon icon="mdi:play-circle" />}
              sx={{
                background: "linear-gradient(135deg, #4CAF50, #388E3C)", borderRadius: 2,
                textTransform: "none", fontWeight: 700, fontSize: "1rem", py: 1.4, mb: 3,
              }}
            >
              {t("startTrainingSession")}
            </Button>

            <Stack spacing={2}>
              {trainingLines.map((line) => (
                <LineCard
                  key={line.id}
                  line={line}
                  masteryLevel={mastery[line.id]?.level ?? 0}
                  onPractice={handleStartSession}
                />
              ))}
            </Stack>

            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Button
                variant="text" onClick={() => setPageState("input")}
                sx={{ color: "rgba(255,255,255,0.4)", textTransform: "none" }}
              >
                {t("analyzeDifferent")}
              </Button>
            </Box>
          </>
        )}
      </Box>
    );
  };

  // ── Render: Training ──────────────────────────────────────────────────

  const renderTraining = () => {
    const {
      phase, game, playerColor, feedback, currentLine,
      moveIndex: mIdx, queueIndex: qIdx, totalLinesInSession,
    } = trainer;

    if (phase === "sessionDone" || !currentLine) {
      return renderSessionDone();
    }

    const { isRetry, isAtWeakness, currentMoveData: moveData } = trainer;

    const phaseColor = phase === "correct" ? "#4CAF50" : phase === "wrong" ? "#f44336" : isAtWeakness ? "#FF9800" : "#3B9AC6";
    const phaseIcon = phase === "correct" ? "mdi:check-circle"
      : phase === "wrong" ? "mdi:close-circle"
        : phase === "opponentTurn" ? "mdi:timer-sand"
          : isAtWeakness ? "mdi:alert-circle"
            : "mdi:chess-knight";
    const phaseText = phase === "correct" ? t("correct")
      : phase === "wrong" ? t("tryAgain")
        : phase === "opponentTurn" ? t("opponentPlaying")
          : phase === "lineComplete"
            ? (trainer.hadMistake ? t("lineCompleteRepeat") : t("lineComplete"))
            : isAtWeakness
              ? t("keyMove")
              : t("yourTurnAs", { color: playerColor });

    return (
      <Box sx={{ maxWidth: 640, mx: "auto" }}>
        {/* Session progress */}
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
              {t("lineOf", { current: qIdx + 1, total: totalLinesInSession })}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
              {currentLine.openingName} · {playerColor}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={((qIdx) / totalLinesInSession) * 100}
            sx={{
              height: 4, borderRadius: 2, bgcolor: "rgba(255,255,255,0.1)",
              "& .MuiLinearProgress-bar": { bgcolor: "#3B9AC6", borderRadius: 2 },
            }}
          />
        </Box>

        {/* Move notation */}
        <MoveNotation line={currentLine} currentMoveIdx={mIdx} />

        {/* Retry / New badge */}
        {isRetry && phase === "playing" && mIdx === 0 && (
          <Card sx={{ background: "rgba(255,152,0,0.12)", border: "1px solid rgba(255,152,0,0.3)", borderRadius: 2, mb: 1.5, px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Icon icon="mdi:refresh" style={{ fontSize: 18, color: "#FF9800" }} />
              <Typography sx={{ color: "#FF9800", fontSize: "0.85rem", fontWeight: 600 }}>
                {t("rememberLine")}
              </Typography>
            </Stack>
          </Card>
        )}

        {/* Status */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Icon icon={phaseIcon} style={{ fontSize: 20, color: phaseColor }} />
          <Typography sx={{ color: phaseColor, fontWeight: 600, fontSize: "0.95rem" }}>
            {phaseText}
          </Typography>
        </Stack>

        {/* Weakness hint */}
        {isAtWeakness && phase === "playing" && moveData && (
          <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", mb: 1.5, ml: 3.5 }}>
            {t("weakMoveHint", { san: moveData.san, winRate: moveData.weakWinRate })}
          </Typography>
        )}
        {!isAtWeakness && phase === "playing" && (
          <Box sx={{ mb: 1.5 }} />
        )}

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
            arePiecesDraggable={phase === "playing"}
            animationDuration={300}
            customBoardStyle={{ borderRadius: "8px" }}
            customDarkSquareStyle={BOARD_COLORS.darkSquare}
            customLightSquareStyle={BOARD_COLORS.lightSquare}
            customPieces={customPieces}
            customArrows={trainer.correctArrow ? [[trainer.correctArrow[0], trainer.correctArrow[1], "#4CAF50"] as Arrow] : []}
          />
        </Box>

        {/* Feedback */}
        {feedback && (
          <Card
            sx={{
              background: phase === "correct" ? "rgba(76,175,80,0.15)" : "rgba(244,67,54,0.15)",
              border: `1px solid ${phase === "correct" ? "rgba(76,175,80,0.4)" : "rgba(244,67,54,0.4)"}`,
              borderRadius: 2, mb: 2,
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
              <Typography sx={{ color: "white", fontSize: "0.9rem" }}>{feedback}</Typography>
            </CardContent>
          </Card>
        )}

        {/* Buttons */}
        <Stack direction="row" spacing={1.5}>
          {phase === "playing" || phase === "opponentTurn" ? (
            <Button
              variant="outlined" onClick={() => setPageState("results")}
              sx={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", borderRadius: 2, textTransform: "none", flex: 1 }}
            >
              {t("exitSession")}
            </Button>
          ) : phase === "wrong" ? (
            <Button
              variant="contained" fullWidth onClick={trainer.retryMove}
              startIcon={<Icon icon="mdi:refresh" />}
              sx={{ background: "linear-gradient(135deg, #f44336, #c62828)", borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              {t("playCorrectMove")}
            </Button>
          ) : phase === "lineComplete" ? (
            <Button
              variant="contained" fullWidth onClick={handleNextLine}
              startIcon={<Icon icon={qIdx + 1 >= totalLinesInSession ? "mdi:flag-checkered" : "mdi:arrow-right"} />}
              sx={{ background: "linear-gradient(135deg, #3B9AC6, #2980b9)", borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              {qIdx + 1 >= totalLinesInSession ? t("finishSession") : t("nextLine")}
            </Button>
          ) : null}
        </Stack>
      </Box>
    );
  };

  // ── Render: Session Done ──────────────────────────────────────────────

  const renderSessionDone = () => {
    const { sessionStats } = trainer;

    return (
      <Box sx={{ textAlign: "center", pt: 6, maxWidth: 480, mx: "auto" }}>
        <Icon icon="mdi:trophy" style={{ fontSize: 72, color: "#FFD700", marginBottom: 16 }} />
        <Typography sx={{ color: "white", fontWeight: 700, fontSize: "1.3rem", mb: 1 }}>
          {t("sessionComplete")}
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.6)", mb: 3 }}>
          {t("youPracticed", { count: sessionStats.linesCompleted, s: sessionStats.linesCompleted !== 1 ? "s" : "" })}
        </Typography>

        <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 4 }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ color: "#4CAF50", fontWeight: 700, fontSize: "1.8rem" }}>{sessionStats.linesCorrect}</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{t("perfect")}</Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ color: "#f44336", fontWeight: 700, fontSize: "1.8rem" }}>{sessionStats.linesWrong}</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{t("hadMistakes")}</Typography>
          </Box>
        </Stack>

        {sessionStats.masteryChanges.length > 0 && (
          <Card sx={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, mb: 3, textAlign: "left" }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 600, mb: 1 }}>
                {t("masteryChanges")}
              </Typography>
              <Stack spacing={0.8}>
                {sessionStats.masteryChanges.map((c, i) => {
                  const line = trainingLines.find((l) => l.id === c.lineId);
                  const went = c.newLevel > c.oldLevel ? "up" : c.newLevel < c.oldLevel ? "down" : "same";
                  const color = went === "up" ? "#4CAF50" : went === "down" ? "#f44336" : "rgba(255,255,255,0.4)";
                  const icon = went === "up" ? "mdi:arrow-up-bold" : went === "down" ? "mdi:arrow-down-bold" : "mdi:minus";
                  return (
                    <Stack key={i} direction="row" alignItems="center" spacing={1}>
                      <Icon icon={icon} style={{ fontSize: 14, color }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", flex: 1 }} noWrap>
                        {line?.openingName ?? "Line"}
                      </Typography>
                      <Chip
                        size="small"
                        label={MASTERY_LABELS[c.newLevel]}
                        sx={{
                          background: `${MASTERY_COLORS[c.newLevel]}22`,
                          color: MASTERY_COLORS[c.newLevel],
                          fontWeight: 700, fontSize: "0.65rem",
                          border: `1px solid ${MASTERY_COLORS[c.newLevel]}55`,
                        }}
                      />
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Stack spacing={1.5}>
          <Button
            variant="contained" fullWidth onClick={() => { trainer.startSession(); setPageState("training"); }}
            startIcon={<Icon icon="mdi:play-circle" />}
            sx={{ background: "linear-gradient(135deg, #4CAF50, #388E3C)", borderRadius: 2, textTransform: "none", fontWeight: 700, py: 1.2 }}
          >
            {t("trainAgain")}
          </Button>
          <Button
            variant="outlined" fullWidth onClick={() => setPageState("results")}
            sx={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)", borderRadius: 2, textTransform: "none" }}
          >
            {t("backToLines")}
          </Button>
        </Stack>
      </Box>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────

  return (
    <>
      <PremiumNavBar onHomeClick={() => router.push("/")} />
      <PageTitle title={t("openingTrainer")} />
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
        {pageState === "sessionDone" && renderSessionDone()}
      </Box>
    </>
  );
}
