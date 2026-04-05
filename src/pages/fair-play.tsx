import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Stack,
  useTheme,
  useMediaQuery,
  Autocomplete,
  IconButton,
  LinearProgress,
  Chip,
  Collapse,
  Dialog as LimitDialogMui,
  DialogContent as LimitDialogContent,
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useTranslation } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import PremiumNavBar from "@/components/PremiumNavBar";
import { PageTitle } from "@/components/pageTitle";
import {
  getChessComPlayerProfile,
  getChessComPlayerStats,
  getChessComPlayerAllGames,
  getChessComUserRecentGames,
  formatChessComGame,
} from "@/lib/chessCom";
import { getGameFromPgn, getEvaluateGameParams, extractClockTimes } from "@/lib/chess";
import { useEngine } from "@/hooks/useEngine";
import { EngineName } from "@/types/enums";
import { isWasmSupported } from "@/lib/engine/shared";
import { logAnalyticsEvent } from "@/lib/firebase";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { triggerInterstitialAd, showRewardedAd } from "@/lib/ads";
import {
  canAnalyzeFairPlay,
  incrementFairPlayCount,
  shouldGateFeature,
  isPremium,
  canWatchRewardedAd,
  grantRewardedFairPlay,
  FREE_FAIRPLAY_LIMIT,
} from "@/lib/premium";
import PremiumModal from "@/components/PremiumModal";
import {
  extractMetrics,
  computeGameSuspicion,
  buildReport,
  FairPlayGameResult,
  FairPlayReport,
  Verdict,
  Confidence,
  PlayerResult,
  expectedEngineMatch,
  expectedAcplFloor,
  expectedAccuracyCeiling,
} from "@/lib/engine/helpers/cheatDetection";
import { getRecommendedWorkersNb } from "@/lib/engine/worker";

function getPlayerResult(result: string | undefined, playerColor: "white" | "black"): PlayerResult {
  if (!result) return "draw";
  if (result === "1-0") return playerColor === "white" ? "win" : "loss";
  if (result === "0-1") return playerColor === "black" ? "win" : "loss";
  return "draw";
}

function getBestRating(stats: any): number {
  const categories = ["chess_rapid", "chess_blitz", "chess_bullet", "chess_daily"];
  let best = 0;
  for (const cat of categories) {
    const r = stats?.[cat]?.last?.rating;
    if (r && r > best) best = r;
  }
  return best || 1000;
}

const verdictColors: Record<Verdict, string> = {
  unlikely: "#4CAF50",
  questionable: "#FFC107",
  likely: "#FF9800",
  almostCertain: "#F44336",
};

const verdictIcons: Record<Verdict, string> = {
  unlikely: "mdi:shield-check",
  questionable: "mdi:help-circle",
  likely: "mdi:alert",
  almostCertain: "mdi:alert-octagon",
};

const accountFlagColors: Record<string, string> = {
  red: "#F44336",
  orange: "#FF9800",
  yellow: "#FFC107",
  none: "transparent",
};

const confidenceColors: Record<Confidence, string> = {
  low: "#FF9800",
  medium: "#FFC107",
  high: "#4CAF50",
};

const confidenceIcons: Record<Confidence, string> = {
  low: "mdi:signal-cellular-1",
  medium: "mdi:signal-cellular-2",
  high: "mdi:signal-cellular-3",
};

function SuspicionBar({ label, desc, value, expectedLabel, actualLabel }: {
  label: string;
  desc: string;
  value: number;
  expectedLabel: string;
  actualLabel: string;
}) {
  const color = value < 25 ? "#4CAF50" : value < 50 ? "#FFC107" : value < 75 ? "#FF9800" : "#F44336";
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "white" }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.8rem", color }}>{Math.round(value)}%</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.1)",
          "& .MuiLinearProgress-bar": { backgroundColor: color, borderRadius: 3 },
          direction: "ltr",
        }}
      />
      <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", mt: 0.3 }}>
        {desc}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 0.3 }}>
        <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>{expectedLabel}</Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{actualLabel}</Typography>
      </Stack>
    </Box>
  );
}

type Phase = "idle" | "pickGame" | "analyzingSingle" | "singleDone" | "analyzingDeep" | "deepDone";

export default function FairPlayPage() {
  const { t, dir } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [rawStoredValue, setStoredValues] = useLocalStorage<string>("fairplay-username", "");
  const [inputUsername, setInputUsername] = useState("");
  const [searchUsername, setSearchUsername] = useState("");

  const storedValues = useMemo(() => {
    if (typeof rawStoredValue === "string") {
      return rawStoredValue.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [rawStoredValue]);

  const updateHistory = useCallback(
    (username: string) => {
      const trimmed = username.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      const updated = [trimmed, ...storedValues.filter((u) => u.toLowerCase() !== lower)].slice(0, 8);
      setStoredValues(updated.join(","));
    },
    [storedValues, setStoredValues]
  );

  const handleSearch = useCallback(() => {
    const trimmed = inputUsername.trim();
    if (!trimmed) return;
    setSearchUsername(trimmed);
    updateHistory(trimmed);
    setPhase("pickGame");
    setSelectedGameId(null);
    setSingleReport(null);
    setDeepReport(null);
    setDeepResults([]);
    logAnalyticsEvent("fairplay_search", { username: trimmed });
  }, [inputUsername, updateHistory]);

  // Queries — fetch the USER's data
  const profileQuery = useQuery({
    queryKey: ["fp-profile", searchUsername],
    enabled: !!searchUsername,
    queryFn: ({ signal }) => getChessComPlayerProfile(searchUsername, signal),
    retry: 1,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const statsQuery = useQuery({
    queryKey: ["fp-stats", searchUsername],
    enabled: !!searchUsername,
    queryFn: ({ signal }) => getChessComPlayerStats(searchUsername, signal),
    retry: 1,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const gamesQuery = useQuery({
    queryKey: ["fp-games", searchUsername],
    enabled: !!searchUsername,
    queryFn: async ({ signal }) => {
      const rawGames = await getChessComPlayerAllGames(searchUsername, 3, signal);
      return rawGames.map(formatChessComGame);
    },
    retry: 1,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const isLoading =
    (profileQuery.isPending && profileQuery.isFetching) ||
    (statsQuery.isPending && statsQuery.isFetching) ||
    (gamesQuery.isPending && gamesQuery.isFetching);
  const isError = profileQuery.isError || statsQuery.isError || gamesQuery.isError;

  // Single game selection
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");

  // Analysis state
  const [gameProgress, setGameProgress] = useState(0);
  const [currentGameIdx, setCurrentGameIdx] = useState(0);
  const [totalDeepGames, setTotalDeepGames] = useState(0);
  const [singleReport, setSingleReport] = useState<FairPlayReport | null>(null);
  const [deepResults, setDeepResults] = useState<FairPlayGameResult[]>([]);
  const [deepReport, setDeepReport] = useState<FairPlayReport | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<{ username: string; joined: number; rating: number } | null>(null);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [rewardedAdLoading, setRewardedAdLoading] = useState(false);
  const abortRef = useRef(false);

  const engineName = useMemo(() => {
    if (!isWasmSupported()) return EngineName.Stockfish11;
    return EngineName.Stockfish17Lite;
  }, []);
  const engine = useEngine(engineName);

  const selectedGame = useMemo(() => {
    if (!gamesQuery.data || !selectedGameId) return null;
    return gamesQuery.data.find((g) => g.id === selectedGameId) || null;
  }, [gamesQuery.data, selectedGameId]);

  // PHASE 1: Analyze the single selected game (opponent's moves)
  const analyzeSingleGame = useCallback(async () => {
    if (!engine || !selectedGame || !profileQuery.data || !statsQuery.data) return;

    if (shouldGateFeature() && !canAnalyzeFairPlay()) {
      setLimitReached(true);
      return;
    }

    if (shouldGateFeature() && !isPremium()) {
      triggerInterstitialAd();
    }

    if (shouldGateFeature()) {
      incrementFairPlayCount();
    }

    abortRef.current = false;
    setPhase("analyzingSingle");
    setGameProgress(0);
    setSingleReport(null);

    const myUsername = searchUsername.toLowerCase();
    const depth = isMobile ? 14 : 16;
    const workersNb = Math.min(getRecommendedWorkersNb(), isMobile ? 1 : 2);

    try {
      const chess = getGameFromPgn(selectedGame.pgn);
      const params = getEvaluateGameParams(chess);
      const headers = chess.getHeaders() as Record<string, string>;
      const whitePlayer = (headers.White || "").toLowerCase();

      const mySide: "white" | "black" = whitePlayer === myUsername ? "white" : "black";
      const opponentSide: "white" | "black" = mySide === "white" ? "black" : "white";
      const oppName = opponentSide === "white" ? headers.White : headers.Black;
      const oppRating = opponentSide === "white" ? (selectedGame.white?.rating || 1000) : (selectedGame.black?.rating || 1000);

      // Fetch opponent profile for account age
      let oppJoined = 0;
      if (oppName) {
        try {
          const oppProfile = await getChessComPlayerProfile(oppName);
          oppJoined = oppProfile.joined || 0;
        } catch { /* skip */ }
      }

      setOpponentInfo({ username: oppName || "?", joined: oppJoined, rating: oppRating });

      const gameEval = await engine.evaluateGame({
        ...params,
        depth,
        multiPv: 2,
        workersNb,
        setEvaluationProgress: (v: number) => setGameProgress(v),
        playersRatings: {
          white: selectedGame.white?.rating,
          black: selectedGame.black?.rating,
        },
      });

      const clockTimes = extractClockTimes(selectedGame.pgn);
      const metrics = extractMetrics(gameEval, params.uciMoves, opponentSide, oppRating, clockTimes);
      const oppResult = getPlayerResult(selectedGame.result, opponentSide);
      const { scores, composite } = computeGameSuspicion(metrics, oppRating, oppResult);

      const result: FairPlayGameResult = {
        metrics,
        suspicionScores: scores,
        compositeSuspicion: composite,
        gameInfo: {
          date: selectedGame.date,
          opponent: oppName,
          result: selectedGame.result,
          timeControl: selectedGame.timeControl,
          playerColor: opponentSide,
          playerRating: oppRating,
        },
      };

      const report = buildReport([result], oppJoined, oppRating, "single");
      setSingleReport(report);
      setPhase("singleDone");

      logAnalyticsEvent("fairplay_single_done", {
        username: searchUsername,
        opponent: oppName,
        verdict: report.verdict,
        suspicion: report.overallSuspicion,
      });
    } catch (err) {
      console.error("Fair play single analysis error", err);
      setPhase("pickGame");
    }
  }, [engine, selectedGame, profileQuery.data, statsQuery.data, searchUsername, isMobile]);

  // PHASE 2: Deep analysis — fetch and analyze opponent's recent games
  const analyzeDeep = useCallback(async () => {
    if (!engine || !opponentInfo) return;

    if (shouldGateFeature() && !isPremium()) {
      triggerInterstitialAd();
    }

    abortRef.current = false;
    setPhase("analyzingDeep");
    setGameProgress(0);
    setCurrentGameIdx(0);
    setDeepResults([]);
    setDeepReport(null);

    const depth = isMobile ? 14 : 16;
    const workersNb = Math.min(getRecommendedWorkersNb(), isMobile ? 1 : 2);

    try {
      const oppGames = await getChessComUserRecentGames(opponentInfo.username);

      // Skip the game already analyzed in single step (match by user + date)
      const alreadyAnalyzedGame = singleReport?.games[0]?.gameInfo;
      const ratedGames = oppGames
        .filter((g) => {
          if (!g.timeControl || g.timeControl === "daily") return false;
          if (alreadyAnalyzedGame) {
            const oppLower = opponentInfo.username.toLowerCase();
            const isWhite = (g.white?.name || "").toLowerCase() === oppLower;
            const rivalInGame = isWhite ? g.black?.name : g.white?.name;
            if (
              rivalInGame?.toLowerCase() === searchUsername.toLowerCase() &&
              g.date === alreadyAnalyzedGame.date
            ) return false;
          }
          return true;
        })
        .slice(0, 10);

      setTotalDeepGames(ratedGames.length);

      const results: FairPlayGameResult[] = [];

      for (let i = 0; i < ratedGames.length; i++) {
        if (abortRef.current) break;
        setCurrentGameIdx(i);
        setGameProgress(0);

        const game = ratedGames[i];
        try {
          const chess = getGameFromPgn(game.pgn);
          const params = getEvaluateGameParams(chess);
          const headers = chess.getHeaders() as Record<string, string>;
          const oppLower = opponentInfo.username.toLowerCase();
          const whitePlayer = (headers.White || "").toLowerCase();

          const oppSide: "white" | "black" = whitePlayer === oppLower ? "white" : "black";
          const rivalName = oppSide === "white" ? headers.Black : headers.White;
          const oppRating = oppSide === "white" ? (game.white?.rating || opponentInfo.rating) : (game.black?.rating || opponentInfo.rating);

          const gameEval = await engine.evaluateGame({
            ...params,
            depth,
            multiPv: 2,
            workersNb,
            setEvaluationProgress: (v: number) => setGameProgress(v),
            playersRatings: {
              white: game.white?.rating,
              black: game.black?.rating,
            },
          });

          const deepClockTimes = extractClockTimes(game.pgn);
          const metrics = extractMetrics(gameEval, params.uciMoves, oppSide, oppRating, deepClockTimes);
          const deepOppResult = getPlayerResult(game.result, oppSide);
          const { scores, composite } = computeGameSuspicion(metrics, oppRating, deepOppResult);

          results.push({
            metrics,
            suspicionScores: scores,
            compositeSuspicion: composite,
            gameInfo: {
              date: game.date,
              opponent: rivalName,
              result: game.result,
              timeControl: game.timeControl,
              playerColor: oppSide,
              playerRating: oppRating,
            },
          });

          setDeepResults([...results]);
        } catch (err) {
          console.error("Deep analysis error for game", game.id, err);
        }
      }

      if (!abortRef.current) {
        // Include the single report's game (already analyzed) + new games
        const allResults = [...(singleReport?.games || []), ...results];
        const fullReport = buildReport(allResults, opponentInfo.joined, opponentInfo.rating, "multi");
        setDeepReport(fullReport);
        setPhase("deepDone");

        logAnalyticsEvent("fairplay_deep_done", {
          opponent: opponentInfo.username,
          verdict: fullReport.verdict,
          suspicion: fullReport.overallSuspicion,
          gamesAnalyzed: allResults.length,
        });
      }
    } catch (err) {
      console.error("Deep analysis fetch error", err);
      setPhase("singleDone");
    }
  }, [engine, opponentInfo, singleReport, isMobile, searchUsername]);

  useEffect(() => {
    logAnalyticsEvent("page_view", { page: "fair-play" });
  }, []);

  const dataReady = profileQuery.data && statsQuery.data && gamesQuery.data && !isLoading;

  const resetAll = () => {
    setPhase("pickGame");
    setSelectedGameId(null);
    setSingleReport(null);
    setDeepReport(null);
    setDeepResults([]);
    setOpponentInfo(null);
  };

  // Active report = deep if done, otherwise single
  const activeReport = deepReport || singleReport;
  const showReport = (phase === "singleDone" || phase === "deepDone") && activeReport;

  return (
    <>
      <PremiumNavBar onHomeClick={() => (window.location.href = "/")} />
      <Box
        dir={dir}
        sx={{
          minHeight: "calc(100vh - 64px)",
          background: "linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(22,33,62,0.9) 50%, rgba(15,52,96,0.9) 100%)",
          padding: isMobile ? "16px" : "24px",
          textAlign: dir === "rtl" ? "right" : "left",
        }}
      >
        <PageTitle title={t("fairPlayTitle")} />
        <Box sx={{ maxWidth: 600, margin: "0 auto" }}>

          {/* Intro — only show before search */}
          {phase === "idle" && !searchUsername && (
            <Box sx={{ background: "rgba(255,152,0,0.08)", borderRadius: "16px", border: "1px solid rgba(255,152,0,0.15)", padding: 2.5, mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Icon icon="mdi:shield-search" style={{ fontSize: 24, color: "#FF9800" }} />
                <Typography sx={{ fontWeight: 700, color: "white", fontSize: "1.1rem" }}>
                  {t("fairPlay")}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", mb: 2, lineHeight: 1.6 }}>
                {t("fairPlayIntro")}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#FF9800", mb: 1 }}>
                {t("fairPlayHowTitle")}
              </Typography>
              {["fairPlayHow1", "fairPlayHow2", "fairPlayHow3", "fairPlayHow4"].map((key) => (
                <Stack key={key} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Icon icon="mdi:check-circle" style={{ fontSize: 16, color: "#FF9800", flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>{t(key)}</Typography>
                </Stack>
              ))}
            </Box>
          )}

          {/* Search */}
          <Box sx={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", padding: 2.5, mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Icon icon="mdi:account" style={{ fontSize: 20, color: "#FF9800" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "white", flex: 1 }}>
                {t("enterYourUsername")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Autocomplete
                freeSolo
                fullWidth
                options={storedValues}
                inputValue={inputUsername}
                onInputChange={(_, v) => setInputUsername(v ?? "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={t("egHikaru")}
                    size="small"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        color: "white",
                        "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                        "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                        "&.Mui-focused fieldset": { borderColor: "#FF9800" },
                      },
                      "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,0.4)" },
                    }}
                  />
                )}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={!inputUsername.trim() || isLoading}
                sx={{
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
                  minWidth: 50,
                  "&:hover": { background: "linear-gradient(135deg, #F57C00 0%, #E65100 100%)" },
                  "&.Mui-disabled": { background: "rgba(255,255,255,0.1)" },
                }}
              >
                <Icon icon="mdi:magnify" style={{ fontSize: 22 }} />
              </Button>
            </Stack>
          </Box>

          {/* Loading */}
          {isLoading && (
            <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
              <CircularProgress sx={{ color: "#FF9800" }} />
            </Stack>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <Box sx={{ textAlign: "center", py: 4, background: "rgba(244,67,54,0.1)", borderRadius: "12px", border: "1px solid rgba(244,67,54,0.2)" }}>
              <Icon icon="mdi:alert-circle" style={{ fontSize: 40, color: "#f44336" }} />
              <Typography sx={{ color: "#f44336", mt: 1, fontWeight: 600 }}>{t("playerNotFound")}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", mt: 0.5 }}>{t("checkUsernameError")}</Typography>
            </Box>
          )}

          {/* STEP 1: Pick ONE game */}
          {dataReady && phase === "pickGame" && (
            <>
              {/* Profile header */}
              <Box sx={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", padding: 2.5, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  {profileQuery.data?.avatar && (
                    <Box component="img" src={profileQuery.data.avatar} sx={{ width: 48, height: 48, borderRadius: "12px" }} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, color: "white", fontSize: "1.1rem" }}>
                      {profileQuery.data?.username}
                      {profileQuery.data?.title && (
                        <Chip label={profileQuery.data.title} size="small" sx={{ marginInlineStart: 1, height: 20, fontSize: "0.7rem", backgroundColor: "#FFA500", color: "#1a1a2e", fontWeight: 700 }} />
                      )}
                    </Typography>
                    <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                      {t("playerRating")}: {getBestRating(statsQuery.data)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Game list — single select */}
              <Box sx={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", padding: 2.5, mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: "white", mb: 0.5, fontSize: "0.95rem" }}>
                  {t("pickSuspiciousGame")}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", mb: 1.5 }}>
                  {t("pickSuspiciousGameDesc")}
                </Typography>

                {/* Filter by opponent name */}
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t("filterByOpponent")}
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  sx={{
                    mb: 1.5,
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                      "&.Mui-focused fieldset": { borderColor: "#FF9800" },
                    },
                    "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,0.3)" },
                  }}
                  InputProps={{
                    startAdornment: <Icon icon="mdi:magnify" style={{ fontSize: 18, color: "rgba(255,255,255,0.3)", marginInlineEnd: 6 }} />,
                  }}
                />

                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", mb: 1 }}>
                  {gamesQuery.data?.length || 0} {t("gamesLoaded")}
                </Typography>

                <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
                  {gamesQuery.data
                    ?.filter((game) => {
                      if (!gameFilter.trim()) return true;
                      const myLower = searchUsername.toLowerCase();
                      const isWhite = (game.white?.name || "").toLowerCase() === myLower;
                      const opponentName = (isWhite ? game.black?.name : game.white?.name) || "";
                      return opponentName.toLowerCase().includes(gameFilter.trim().toLowerCase());
                    })
                    .map((game) => {
                      const myLower = searchUsername.toLowerCase();
                      const isWhite = (game.white?.name || "").toLowerCase() === myLower;
                      const opponentName = isWhite ? game.black?.name : game.white?.name;
                      const opponentRating = isWhite ? game.black?.rating : game.white?.rating;
                      const isSelected = selectedGameId === game.id;
                      return (
                        <Box
                          key={game.id}
                          onClick={() => setSelectedGameId(isSelected ? null : game.id)}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            py: 1.2,
                            px: 1.5,
                            borderRadius: "10px",
                            cursor: "pointer",
                            mb: 0.5,
                            background: isSelected ? "rgba(255,152,0,0.15)" : "transparent",
                            border: isSelected ? "2px solid rgba(255,152,0,0.5)" : "2px solid transparent",
                            "&:hover": { background: isSelected ? "rgba(255,152,0,0.15)" : "rgba(255,255,255,0.05)" },
                            transition: "all 0.15s",
                          }}
                        >
                          <Icon
                            icon={isSelected ? "mdi:radiobox-marked" : "mdi:radiobox-blank"}
                            style={{ fontSize: 20, color: isSelected ? "#FF9800" : "rgba(255,255,255,0.3)", flexShrink: 0 }}
                          />
                          <Box sx={{ flex: 1, marginInlineStart: 1.5 }}>
                            <Typography sx={{ fontSize: "0.85rem", color: "white", fontWeight: isSelected ? 600 : 500 }}>
                              {t("vs")} {opponentName} ({opponentRating})
                            </Typography>
                            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                              {game.result} | {game.timeControl} | {game.date}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                </Box>
              </Box>

            </>
          )}

          {/* Sticky analyze button — visible when picking a game */}
          {dataReady && phase === "pickGame" && (
            <Box
              sx={{
                position: "sticky",
                bottom: 0,
                zIndex: 10,
                pt: 1.5,
                pb: 2,
                background: "linear-gradient(to top, rgba(26,26,46,1) 60%, rgba(26,26,46,0))",
              }}
            >
              <Button
                variant="contained"
                fullWidth
                onClick={analyzeSingleGame}
                disabled={!selectedGameId || !engine}
                sx={{
                  py: 1.5,
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #FF9800, #F57C00)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "1rem",
                  textTransform: "none",
                  boxShadow: "0 -4px 20px rgba(255,152,0,0.3)",
                  "&:hover": { background: "linear-gradient(135deg, #F57C00, #E65100)" },
                  "&.Mui-disabled": { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)", boxShadow: "none" },
                }}
              >
                <Icon icon="mdi:shield-search" style={{ fontSize: 22, marginInlineEnd: 8 }} />
                {t("analyzeThisMatch")}
              </Button>
            </Box>
          )}

          {/* Analyzing single game progress */}
          {phase === "analyzingSingle" && (
            <Box sx={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", padding: 3, mb: 2 }}>
              <Stack alignItems="center" spacing={2}>
                <CircularProgress sx={{ color: "#FF9800" }} />
                <Typography sx={{ color: "white", fontWeight: 600 }}>
                  {t("analyzingSingleGame")}
                </Typography>
                <Box sx={{ width: "100%" }}>
                  <LinearProgress
                    variant="determinate"
                    value={gameProgress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      "& .MuiLinearProgress-bar": { backgroundColor: "#FF9800", borderRadius: 3 },
                      direction: "ltr",
                    }}
                  />
                  <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textAlign: "center", mt: 0.5 }}>
                    {Math.round(gameProgress)}%
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}

          {/* Analyzing deep progress */}
          {phase === "analyzingDeep" && (
            <Box sx={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", padding: 3, mb: 2 }}>
              <Stack alignItems="center" spacing={2}>
                <CircularProgress sx={{ color: "#FF9800" }} />
                <Typography sx={{ color: "white", fontWeight: 600 }}>
                  {t("analyzingOpponent", { current: currentGameIdx + 1, total: totalDeepGames })}
                </Typography>
                <Box sx={{ width: "100%" }}>
                  <LinearProgress
                    variant="determinate"
                    value={gameProgress}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      "& .MuiLinearProgress-bar": { backgroundColor: "#FF9800", borderRadius: 3 },
                      direction: "ltr",
                    }}
                  />
                  <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textAlign: "center", mt: 0.5 }}>
                    {Math.round(gameProgress)}%
                  </Typography>
                </Box>
              </Stack>

              {/* Show partial deep results */}
              {deepResults.map((res, idx) => (
                <Box key={idx} sx={{ mt: 1.5 }}>
                  <GameResultCard result={res} index={idx} t={t} />
                </Box>
              ))}
            </Box>
          )}

          {/* REPORT (single or deep) */}
          {showReport && activeReport && (
            <Box>
              {/* Label: which report phase */}
              {phase === "singleDone" && (
                <Box sx={{ mb: 2, p: 2, background: "rgba(255,152,0,0.08)", borderRadius: "12px", border: "1px solid rgba(255,152,0,0.15)" }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icon icon="mdi:chess-pawn" style={{ fontSize: 20, color: "#FF9800" }} />
                    <Typography sx={{ fontWeight: 600, color: "white", fontSize: "0.9rem" }}>
                      {t("preliminaryAnalysis")} — {t("vs")} {opponentInfo?.username}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", mt: 0.5 }}>
                    {t("singleGameDisclaimer")}
                  </Typography>
                </Box>
              )}
              {phase === "deepDone" && (
                <Box sx={{ mb: 2, p: 2, background: "rgba(255,152,0,0.08)", borderRadius: "12px", border: "1px solid rgba(255,152,0,0.15)" }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icon icon="mdi:magnify-expand" style={{ fontSize: 20, color: "#FF9800" }} />
                    <Typography sx={{ fontWeight: 600, color: "white", fontSize: "0.9rem" }}>
                      {t("deepReportTitle")} — {opponentInfo?.username}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* Verdict */}
              <Box sx={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "16px",
                border: `1px solid ${verdictColors[activeReport.verdict]}40`,
                padding: 3,
                mb: 2,
                textAlign: "center",
              }}>
                <Box sx={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: `${verdictColors[activeReport.verdict]}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px auto",
                  border: `3px solid ${verdictColors[activeReport.verdict]}`,
                }}>
                  <Icon icon={verdictIcons[activeReport.verdict]} style={{ fontSize: 40, color: verdictColors[activeReport.verdict] }} />
                </Box>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: verdictColors[activeReport.verdict], mb: 0.5 }}>
                  {t(`verdict${activeReport.verdict.charAt(0).toUpperCase() + activeReport.verdict.slice(1)}`)}
                </Typography>
                <Typography sx={{ fontSize: "2rem", fontWeight: 800, color: "white", mb: 1 }}>
                  {activeReport.overallSuspicion}%
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", mb: 1 }}>
                  {t(activeReport.summaryKey)}
                </Typography>

                {/* Confidence + Account age */}
                <Stack direction="column" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                  <Chip
                    icon={<Icon icon={confidenceIcons[activeReport.confidence]} style={{ fontSize: 16, color: confidenceColors[activeReport.confidence] }} />}
                    label={t(`confidence${activeReport.confidence.charAt(0).toUpperCase() + activeReport.confidence.slice(1)}`)}
                    size="small"
                    sx={{
                      backgroundColor: `${confidenceColors[activeReport.confidence]}15`,
                      color: confidenceColors[activeReport.confidence],
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      border: `1px solid ${confidenceColors[activeReport.confidence]}40`,
                    }}
                  />
                  {activeReport.accountFlag.level !== "none" ? (
                    <Chip
                      icon={<Icon icon="mdi:alert" style={{ fontSize: 16, color: accountFlagColors[activeReport.accountFlag.level] }} />}
                      label={`${t(activeReport.accountFlag.labelKey)} (${t("accountAge", { days: activeReport.accountFlag.daysOld })})`}
                      size="small"
                      sx={{
                        backgroundColor: `${accountFlagColors[activeReport.accountFlag.level]}20`,
                        color: accountFlagColors[activeReport.accountFlag.level],
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    />
                  ) : (
                    <Chip
                      icon={<Icon icon="mdi:calendar-clock" style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }} />}
                      label={t("accountAge", { days: activeReport.accountFlag.daysOld })}
                      size="small"
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.6)",
                        fontWeight: 500,
                        fontSize: "0.75rem",
                      }}
                    />
                  )}
                </Stack>
              </Box>

              {/* Single-game: show exact metrics */}
              {activeReport.mode === "single" && activeReport.games.length === 1 && (
                <Box sx={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", padding: 2.5, mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: "white", mb: 2, fontSize: "0.95rem" }}>
                    {t("suspicionScore")}
                  </Typography>
                  {(() => {
                    const game = activeReport.games[0];
                    const pr = activeReport.playerRating;
                    const engExpLow = Math.round(expectedEngineMatch(pr) - 10);
                    const engExpHigh = Math.round(expectedEngineMatch(pr));
                    const acplExpLow = Math.round(expectedAcplFloor(pr));
                    const acplExpHigh = Math.round(expectedAcplFloor(pr) + 20);
                    const accExpLow = Math.round(expectedAccuracyCeiling(pr) - 10);
                    const accExpHigh = Math.round(expectedAccuracyCeiling(pr));

                    return (
                      <>
                        <SuspicionBar
                          label={t("engineMatchRate")}
                          desc={t("engineMatchDesc")}
                          value={game.suspicionScores.engineMatch}
                          expectedLabel={t("expectedRange", { range: `${engExpLow}-${engExpHigh}%` })}
                          actualLabel={t("actual", { value: `${Math.round(game.metrics.engineMatchRate)}%` })}
                        />
                        <SuspicionBar
                          label={t("avgCentipawnLoss")}
                          desc={t("acplDesc")}
                          value={game.suspicionScores.acpl}
                          expectedLabel={t("expectedRange", { range: `${acplExpLow}-${acplExpHigh}` })}
                          actualLabel={t("actual", { value: `${Math.round(game.metrics.acpl)}` })}
                        />
                        <SuspicionBar
                          label={t("cplConsistency")}
                          desc={t("consistencyDesc")}
                          value={game.suspicionScores.consistency}
                          expectedLabel={t("expectedRange", { range: "25-80" })}
                          actualLabel={t("actual", { value: `${Math.round(game.metrics.cplStdDev)}` })}
                        />
                        <SuspicionBar
                          label={t("accuracyLabel")}
                          desc={t("accuracyDesc")}
                          value={game.suspicionScores.accuracy}
                          expectedLabel={t("expectedRange", { range: `${accExpLow}-${accExpHigh}%` })}
                          actualLabel={t("actual", { value: `${Math.round(game.metrics.accuracy)}%` })}
                        />
                        <SuspicionBar
                          label={t("eloGapLabel")}
                          desc={t("eloGapDesc")}
                          value={game.suspicionScores.eloGap}
                          expectedLabel={t("expectedRange", { range: "±200" })}
                          actualLabel={t("actual", { value: `+${Math.round(game.metrics.eloGap)}` })}
                        />
                        {game.metrics.hasTimingData && game.suspicionScores.timing !== undefined && (
                          <SuspicionBar
                            label={t("timingSuspicion")}
                            desc={t("timingDesc")}
                            value={game.suspicionScores.timing}
                            expectedLabel={t("expectedRange", { range: "< 20%" })}
                            actualLabel={t("actual", { value: `${Math.round(game.suspicionScores.timing)}%` })}
                          />
                        )}
                      </>
                    );
                  })()}
                </Box>
              )}

              {/* Multi-game: show peak indicators — what made us flag this player */}
              {activeReport.mode === "multi" && activeReport.games.length > 1 && (
                <Box sx={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", padding: 2.5, mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: "white", mb: 1.5, fontSize: "0.95rem" }}>
                    {t("keyFindings")}
                  </Typography>
                  {(() => {
                    const games = activeReport.games;
                    const pr = activeReport.playerRating;
                    const flaggedCount = games.filter((g) => g.compositeSuspicion >= 28).length;
                    const engExpLow = Math.round(expectedEngineMatch(pr) - 10);
                    const engExpHigh = Math.round(expectedEngineMatch(pr));
                    const acplExpLow = Math.round(expectedAcplFloor(pr));
                    const acplExpHigh = Math.round(expectedAcplFloor(pr) + 20);
                    const accExpLow = Math.round(expectedAccuracyCeiling(pr) - 10);
                    const accExpHigh = Math.round(expectedAccuracyCeiling(pr));

                    const peakEng = games.reduce((best, g) => g.suspicionScores.engineMatch > best.suspicionScores.engineMatch ? g : best);
                    const peakAcpl = games.reduce((best, g) => g.suspicionScores.acpl > best.suspicionScores.acpl ? g : best);
                    const peakCons = games.reduce((best, g) => g.suspicionScores.consistency > best.suspicionScores.consistency ? g : best);
                    const peakAcc = games.reduce((best, g) => g.suspicionScores.accuracy > best.suspicionScores.accuracy ? g : best);
                    const peakElo = games.reduce((best, g) => g.suspicionScores.eloGap > best.suspicionScores.eloGap ? g : best);
                    const gamesWithTiming = games.filter((g) => g.metrics.hasTimingData && g.suspicionScores.timing !== undefined);
                    const peakTiming = gamesWithTiming.length > 0
                      ? gamesWithTiming.reduce((best, g) => (g.suspicionScores.timing ?? 0) > (best.suspicionScores.timing ?? 0) ? g : best)
                      : null;

                    return (
                      <>
                        <Box sx={{
                          background: flaggedCount > 0 ? "rgba(255,152,0,0.12)" : "rgba(76,175,80,0.12)",
                          borderRadius: "10px",
                          border: flaggedCount > 0 ? "1px solid rgba(255,152,0,0.3)" : "1px solid rgba(76,175,80,0.3)",
                          p: 1.5, mb: 2,
                          display: "flex", alignItems: "center", gap: 1,
                        }}>
                          <Icon
                            icon={flaggedCount > 0 ? "mdi:alert-circle" : "mdi:check-circle"}
                            style={{ fontSize: 20, color: flaggedCount > 0 ? "#FF9800" : "#4CAF50", flexShrink: 0 }}
                          />
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: flaggedCount > 0 ? "#FF9800" : "#4CAF50" }}>
                            {flaggedCount > 0
                              ? t("flaggedGamesCount", { count: flaggedCount, total: games.length })
                              : t("noFlaggedGames")}
                          </Typography>
                        </Box>
                        <SuspicionBar
                          label={t("engineMatchRate")}
                          desc={t("engineMatchDesc")}
                          value={peakEng.suspicionScores.engineMatch}
                          expectedLabel={t("expectedRange", { range: `${engExpLow}-${engExpHigh}%` })}
                          actualLabel={t("peakValue", { value: `${Math.round(peakEng.metrics.engineMatchRate)}%` })}
                        />
                        <SuspicionBar
                          label={t("avgCentipawnLoss")}
                          desc={t("acplDesc")}
                          value={peakAcpl.suspicionScores.acpl}
                          expectedLabel={t("expectedRange", { range: `${acplExpLow}-${acplExpHigh}` })}
                          actualLabel={t("peakValue", { value: `${Math.round(peakAcpl.metrics.acpl)}` })}
                        />
                        <SuspicionBar
                          label={t("cplConsistency")}
                          desc={t("consistencyDesc")}
                          value={peakCons.suspicionScores.consistency}
                          expectedLabel={t("expectedRange", { range: "25-80" })}
                          actualLabel={t("peakValue", { value: `${Math.round(peakCons.metrics.cplStdDev)}` })}
                        />
                        <SuspicionBar
                          label={t("accuracyLabel")}
                          desc={t("accuracyDesc")}
                          value={peakAcc.suspicionScores.accuracy}
                          expectedLabel={t("expectedRange", { range: `${accExpLow}-${accExpHigh}%` })}
                          actualLabel={t("peakValue", { value: `${Math.round(peakAcc.metrics.accuracy)}%` })}
                        />
                        <SuspicionBar
                          label={t("eloGapLabel")}
                          desc={t("eloGapDesc")}
                          value={peakElo.suspicionScores.eloGap}
                          expectedLabel={t("expectedRange", { range: "±200" })}
                          actualLabel={t("peakValue", { value: `+${Math.round(peakElo.metrics.eloGap)}` })}
                        />
                        {peakTiming && (
                          <SuspicionBar
                            label={t("timingSuspicion")}
                            desc={t("timingDesc")}
                            value={peakTiming.suspicionScores.timing ?? 0}
                            expectedLabel={t("expectedRange", { range: "< 20%" })}
                            actualLabel={t("peakValue", { value: `${Math.round(peakTiming.suspicionScores.timing ?? 0)}%` })}
                          />
                        )}
                      </>
                    );
                  })()}
                </Box>
              )}

              {/* Per-game breakdown */}
              <Box sx={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", padding: 2.5, mb: 2 }}>
                <Typography sx={{ fontWeight: 700, color: "white", mb: 2, fontSize: "0.95rem" }}>
                  {t("gameBreakdown")}
                </Typography>
                {activeReport.games.map((result, idx) => (
                  <GameResultCard key={idx} result={result} index={idx} t={t} isHighlighted={idx === 0 && phase === "deepDone"} />
                ))}
              </Box>

              {/* Disclaimer */}
              <Box sx={{
                background: phase === "singleDone" ? "rgba(255,152,0,0.12)" : "rgba(255,152,0,0.08)",
                borderRadius: "12px",
                border: phase === "singleDone" ? "1px solid rgba(255,152,0,0.35)" : "1px solid rgba(255,152,0,0.2)",
                p: 2, mb: 2,
              }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Icon icon={phase === "singleDone" ? "mdi:alert-circle" : "mdi:information"} style={{ fontSize: 20, color: "#FF9800", marginTop: 2, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                    {phase === "singleDone" ? t("fairPlayDisclaimerSingle") : t("fairPlayDisclaimer")}
                  </Typography>
                </Stack>
              </Box>

              {/* New analysis button */}
              <Button
                fullWidth
                onClick={resetAll}
                sx={{
                  py: 1.2, borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.7)",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": { background: "rgba(255,255,255,0.05)" },
                }}
              >
                {t("newAnalysis")}
              </Button>
            </Box>
          )}

          {/* Sticky "Analyze Deeper" button — visible after single game report */}
          {phase === "singleDone" && opponentInfo && (
            <Box
              sx={{
                position: "sticky",
                bottom: 0,
                zIndex: 10,
                pt: 1.5,
                pb: 2,
                background: "linear-gradient(to top, rgba(26,26,46,1) 60%, rgba(26,26,46,0))",
              }}
            >
              <Button
                variant="contained"
                fullWidth
                onClick={analyzeDeep}
                sx={{
                  py: 1.8,
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #E65100, #BF360C) !important",
                  backgroundColor: "#E65100 !important",
                  color: "white !important",
                  fontWeight: 700,
                  fontSize: "1rem",
                  textTransform: "none",
                  boxShadow: "0 -4px 20px rgba(255,152,0,0.3)",
                  "&:hover": { background: "linear-gradient(135deg, #BF360C, #8D2200) !important" },
                }}
              >
                <Stack alignItems="center" spacing={0.3}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icon icon="mdi:magnify-expand" style={{ fontSize: 24 }} />
                    <span>{t("analyzeDeeper")}</span>
                  </Stack>
                  <span style={{ fontSize: "0.72rem", opacity: 0.9, fontWeight: 400 }}>
                    {t("analyzeDeeperDesc", { opponent: opponentInfo.username })}
                  </span>
                </Stack>
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Limit reached dialog */}
      <LimitDialog
        open={limitReached}
        onClose={() => setLimitReached(false)}
        onUpgrade={() => { setLimitReached(false); setPremiumModalOpen(true); }}
        rewardedAdLoading={rewardedAdLoading}
        onWatchAd={async () => {
          setRewardedAdLoading(true);
          const earned = await showRewardedAd();
          setRewardedAdLoading(false);
          if (earned) {
            grantRewardedFairPlay();
            setLimitReached(false);
            logAnalyticsEvent("rewarded_ad_fairplay");
          }
        }}
        t={t}
      />

      <PremiumModal open={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} trigger="fairplay_limit" />
    </>
  );
}

function GameResultCard({ result, index, t, isHighlighted }: {
  result: FairPlayGameResult;
  index: number;
  t: (key: string, params?: any) => string;
  isHighlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const verdict = result.compositeSuspicion < 25 ? "unlikely" : result.compositeSuspicion < 50 ? "questionable" : result.compositeSuspicion < 75 ? "likely" : "almostCertain";
  const color = verdictColors[verdict];

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: "10px",
        border: isHighlighted ? `2px solid ${color}60` : `1px solid ${color}30`,
        background: isHighlighted ? `${color}12` : `${color}08`,
        overflow: "hidden",
      }}
    >
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{ p: 1.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 1.5 }}
      >
        <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, minWidth: 20 }}>
          #{index + 1}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "white", fontWeight: 500 }}>
            {t("vs")} {result.gameInfo.opponent} ({result.gameInfo.playerRating || "?"})
          </Typography>
          <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
            {result.gameInfo.result} | {result.gameInfo.timeControl} | {result.gameInfo.date}
          </Typography>
        </Box>
        <Chip
          label={`${Math.round(result.compositeSuspicion)}%`}
          size="small"
          sx={{ backgroundColor: `${color}25`, color, fontWeight: 700, fontSize: "0.8rem" }}
        />
        <Icon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} style={{ color: "rgba(255,255,255,0.4)", fontSize: 20 }} />
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
          <Stack spacing={0.8}>
            <MetricRow label={t("engineMatchRate")} value={`${Math.round(result.metrics.engineMatchRate)}%`} suspicion={result.suspicionScores.engineMatch} />
            <MetricRow label={t("avgCentipawnLoss")} value={`${Math.round(result.metrics.acpl)}`} suspicion={result.suspicionScores.acpl} />
            <MetricRow label={t("cplConsistency")} value={`σ ${Math.round(result.metrics.cplStdDev)}`} suspicion={result.suspicionScores.consistency} />
            <MetricRow label={t("accuracyLabel")} value={`${Math.round(result.metrics.accuracy)}%`} suspicion={result.suspicionScores.accuracy} />
            <MetricRow label={t("eloGapLabel")} value={`+${Math.round(result.metrics.eloGap)}`} suspicion={result.suspicionScores.eloGap} />
            {result.metrics.hasTimingData && result.suspicionScores.timing !== undefined && (
              <MetricRow label={t("timingSuspicion")} value={`${Math.round(result.suspicionScores.timing)}%`} suspicion={result.suspicionScores.timing} />
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

function MetricRow({ label, value, suspicion }: { label: string; value: string; suspicion: number }) {
  const color = suspicion < 25 ? "#4CAF50" : suspicion < 50 ? "#FFC107" : suspicion < 75 ? "#FF9800" : "#F44336";
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontSize: "0.75rem", color: "white", fontWeight: 600 }}>{value}</Typography>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden", direction: "ltr" }}>
          <Box sx={{ width: `${Math.min(suspicion, 100)}%`, height: "100%", backgroundColor: color, borderRadius: 2 }} />
        </Box>
      </Stack>
    </Stack>
  );
}

function LimitDialog({ open, onClose, onUpgrade, rewardedAdLoading, onWatchAd, t }: {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  rewardedAdLoading: boolean;
  onWatchAd: () => void;
  t: (key: string, params?: any) => string;
}) {
  return (
    <LimitDialogMui open={open} onClose={onClose} PaperProps={{ sx: { background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", color: "white", borderRadius: "20px", maxWidth: 360 } }}>
      <IconButton onClick={onClose} sx={{ position: "absolute", top: 8, insetInlineEnd: 8, color: "rgba(255,255,255,0.5)", zIndex: 1, "&:hover": { color: "white" } }}>
        <Icon icon="mdi:close" style={{ fontSize: 22 }} />
      </IconButton>
      <LimitDialogContent sx={{ textAlign: "center", py: 4, px: 3 }}>
        <Icon icon="mdi:shield-lock" style={{ fontSize: 48, color: "#FF9800", marginBottom: 12 }} />
        <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, mb: 1 }}>{t("fairPlayLimitReached")}</Typography>
        <Typography sx={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", mb: 3 }}>
          {t("fairPlayLimitDesc", { limit: FREE_FAIRPLAY_LIMIT })}
        </Typography>
        <Button
          onClick={onUpgrade}
          variant="contained"
          fullWidth
          sx={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#1a1a2e", fontWeight: 700, py: 1.5, borderRadius: "12px", textTransform: "none", fontSize: "1rem", mb: 1 }}
        >
          {t("upgradeToPremium")}
        </Button>
        {canWatchRewardedAd() && (
          <Button
            onClick={onWatchAd}
            disabled={rewardedAdLoading}
            variant="outlined"
            fullWidth
            startIcon={<Icon icon="mdi:play-circle" />}
            sx={{
              borderColor: "rgba(78,205,196,0.5)", color: "#4ecdc4", fontWeight: 700, py: 1.2, borderRadius: "12px", textTransform: "none", fontSize: "0.95rem",
              "&:hover": { borderColor: "#4ecdc4", background: "rgba(78,205,196,0.1)" },
            }}
          >
            {rewardedAdLoading ? t("adLoading") : t("watchAdForFairPlay")}
          </Button>
        )}
      </LimitDialogContent>
    </LimitDialogMui>
  );
}

