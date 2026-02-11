import { useState, useMemo, useCallback, useEffect } from "react";
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
} from "@mui/material";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import PremiumNavBar from "@/components/PremiumNavBar";
import { PageTitle } from "@/components/pageTitle";
import PlayerInsights from "@/components/PlayerInsights";
import {
  getChessComPlayerProfile,
  getChessComPlayerStats,
  getChessComPlayerAllGames,
} from "@/lib/chessCom";
import { calculateInsights } from "@/lib/playerInsights";
import { logAnalyticsEvent } from "@/lib/firebase";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function StatsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [rawStoredValue, setStoredValues] = useLocalStorage<string>(
    "insights-username",
    ""
  );
  const [inputUsername, setInputUsername] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [hasEdited, setHasEdited] = useState(false);

  const storedValues = useMemo(() => {
    if (typeof rawStoredValue === "string") {
      return rawStoredValue
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [rawStoredValue]);

  const [autoSearched, setAutoSearched] = useState(false);

  // Auto-fill and auto-search with the most recent username
  useEffect(() => {
    if (!hasEdited && storedValues.length > 0 && !inputUsername) {
      setInputUsername(storedValues[0]);
    }
  }, [storedValues, hasEdited, inputUsername]);

  // Auto-search on page load if we have a saved username
  useEffect(() => {
    if (
      !autoSearched &&
      !hasEdited &&
      storedValues.length > 0 &&
      !searchUsername
    ) {
      const saved = storedValues[0].trim();
      if (saved) {
        setSearchUsername(saved);
        setAutoSearched(true);
      }
    }
  }, [storedValues, autoSearched, hasEdited, searchUsername]);

  const updateHistory = useCallback(
    (username: string) => {
      const trimmed = username.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      const updated = [
        trimmed,
        ...storedValues.filter((u) => u.toLowerCase() !== lower),
      ].slice(0, 8);
      setStoredValues(updated.join(","));
    },
    [storedValues, setStoredValues]
  );

  const deleteUsername = useCallback(
    (usernameToDelete: string) => {
      const updated = storedValues.filter((u) => u !== usernameToDelete);
      setStoredValues(updated.join(","));
    },
    [storedValues, setStoredValues]
  );

  const handleSearch = useCallback(() => {
    const trimmed = inputUsername.trim();
    if (!trimmed) return;
    setSearchUsername(trimmed);
    updateHistory(trimmed);
    logAnalyticsEvent("insights_search", { username: trimmed });
  }, [inputUsername, updateHistory]);

  // ── Queries ────────────────────────────────────────────────────

  const profileQuery = useQuery({
    queryKey: ["chesscom-profile", searchUsername],
    enabled: !!searchUsername,
    queryFn: ({ signal }) => getChessComPlayerProfile(searchUsername, signal),
    retry: 1,
  });

  const statsQuery = useQuery({
    queryKey: ["chesscom-stats", searchUsername],
    enabled: !!searchUsername,
    queryFn: ({ signal }) => getChessComPlayerStats(searchUsername, signal),
    retry: 1,
  });

  const gamesQuery = useQuery({
    queryKey: ["chesscom-all-games", searchUsername],
    enabled: !!searchUsername,
    queryFn: ({ signal }) =>
      getChessComPlayerAllGames(searchUsername, 3, signal),
    retry: 1,
  });

  const isLoading =
    profileQuery.isFetching ||
    statsQuery.isFetching ||
    gamesQuery.isFetching;

  const isError =
    profileQuery.isError || statsQuery.isError || gamesQuery.isError;

  // ── Calculate insights ─────────────────────────────────────────

  const insights = useMemo(() => {
    if (!gamesQuery.data || gamesQuery.data.length === 0) return null;
    return calculateInsights(gamesQuery.data, searchUsername);
  }, [gamesQuery.data, searchUsername]);

  const allDataReady =
    profileQuery.data && statsQuery.data && insights && !isLoading;

  // Track page open
  useEffect(() => {
    logAnalyticsEvent("page_view", { page: "stats" });
  }, []);

  return (
    <>
      <PremiumNavBar onHomeClick={() => (window.location.href = "/")} />
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          background:
            "linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(22,33,62,0.9) 50%, rgba(15,52,96,0.9) 100%)",
          padding: isMobile ? "16px" : "24px",
        }}
      >
        <PageTitle title="Player Insights" />

        <Box sx={{ maxWidth: 600, margin: "0 auto" }}>
          {/* ── Search Section ──────────────────────────────── */}
          <Box
            sx={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: 2.5,
              mb: 3,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Icon
                icon="mdi:account-search"
                style={{ fontSize: 20, color: "#4ecdc4" }}
              />
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: "white" }}
              >
                Chess.com Username
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Autocomplete
                freeSolo
                fullWidth
                options={storedValues}
                inputValue={inputUsername}
                onInputChange={(_, newValue) => {
                  setInputUsername(newValue ?? "");
                  setHasEdited(true);
                }}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li
                      key={key}
                      {...rest}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingRight: 8,
                      }}
                    >
                      <span>{option}</span>
                      <Icon
                        icon="mdi:close"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUsername(option);
                        }}
                      />
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="e.g. hikaru"
                    size="small"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        color: "white",
                        "& fieldset": {
                          borderColor: "rgba(255,255,255,0.2)",
                        },
                        "&:hover fieldset": {
                          borderColor: "rgba(255,255,255,0.4)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#4ecdc4",
                        },
                      },
                      "& .MuiInputBase-input::placeholder": {
                        color: "rgba(255,255,255,0.4)",
                      },
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
                  background:
                    "linear-gradient(135deg, #4ecdc4 0%, #44b8b0 100%)",
                  minWidth: 50,
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #44b8b0 0%, #3aa39c 100%)",
                  },
                  "&.Mui-disabled": {
                    background: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <Icon icon="mdi:magnify" style={{ fontSize: 22 }} />
              </Button>
            </Stack>
          </Box>

          {/* ── Loading ────────────────────────────────────── */}
          {isLoading && (
            <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
              <CircularProgress sx={{ color: "#4ecdc4" }} />
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.6)" }}
              >
                Analyzing games...
              </Typography>
            </Stack>
          )}

          {/* ── Error ──────────────────────────────────────── */}
          {isError && !isLoading && (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
                background: "rgba(244,67,54,0.1)",
                borderRadius: "12px",
                border: "1px solid rgba(244,67,54,0.2)",
              }}
            >
              <Icon
                icon="mdi:alert-circle"
                style={{ fontSize: 40, color: "#f44336" }}
              />
              <Typography
                variant="body1"
                sx={{ color: "#f44336", mt: 1, fontWeight: 600 }}
              >
                Player not found
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.5)", mt: 0.5 }}
              >
                Please check the username and try again
              </Typography>
            </Box>
          )}

          {/* ── No games ───────────────────────────────────── */}
          {!isLoading &&
            !isError &&
            searchUsername &&
            gamesQuery.data &&
            gamesQuery.data.length === 0 && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 4,
                  background: "rgba(255,152,0,0.1)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,152,0,0.2)",
                }}
              >
                <Icon
                  icon="mdi:chess-knight"
                  style={{ fontSize: 40, color: "#FF9800" }}
                />
                <Typography
                  variant="body1"
                  sx={{ color: "#FF9800", mt: 1, fontWeight: 600 }}
                >
                  No recent games found
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.5)", mt: 0.5 }}
                >
                  This player hasn&apos;t played any games in the last 3 months
                </Typography>
              </Box>
            )}

          {/* ── Insights ───────────────────────────────────── */}
          {allDataReady && (
            <PlayerInsights
              profile={profileQuery.data}
              stats={statsQuery.data}
              insights={insights}
            />
          )}
        </Box>
      </Box>
    </>
  );
}
