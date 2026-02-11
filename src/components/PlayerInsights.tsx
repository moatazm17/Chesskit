import React, { useMemo, useState, useCallback, ReactNode } from "react";
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Stack,
  LinearProgress,
  Button,
} from "@mui/material";
import { Icon } from "@iconify/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChessComProfile, ChessComPlayerStats } from "@/types/chessCom";
import { PlayerInsightsData, OpeningStats } from "@/lib/playerInsights";

// ── Glassmorphism card wrapper ─────────────────────────────────────────────

const GlassCard: React.FC<{
  children: React.ReactNode;
  sx?: object;
}> = ({ children, sx }) => (
  <Box
    sx={{
      background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(10px)",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.1)",
      padding: 2.5,
      ...sx,
    }}
  >
    {children}
  </Box>
);

const SectionTitle: React.FC<{
  icon: string;
  title: string;
  color?: string;
}> = ({ icon, title, color = "#4ecdc4" }) => (
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
    <Icon icon={icon} style={{ fontSize: 20, color }} />
    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "white" }}>
      {title}
    </Typography>
  </Stack>
);

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  profile: ChessComProfile;
  stats: ChessComPlayerStats;
  insights: PlayerInsightsData;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PlayerInsights({ profile, stats, insights }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  // ── Rating cards data ────────────────────────────────────────────────────

  const ratingCards = useMemo(() => {
    const cards: {
      label: string;
      key: string;
      color: string;
      icon: string;
      data: typeof stats.chess_bullet;
    }[] = [
      {
        label: "Bullet",
        key: "chess_bullet",
        color: "#f44336",
        icon: "mdi:lightning-bolt",
        data: stats.chess_bullet,
      },
      {
        label: "Blitz",
        key: "chess_blitz",
        color: "#FFC107",
        icon: "mdi:flash",
        data: stats.chess_blitz,
      },
      {
        label: "Rapid",
        key: "chess_rapid",
        color: "#2196F3",
        icon: "mdi:timer",
        data: stats.chess_rapid,
      },
      {
        label: "Daily",
        key: "chess_daily",
        color: "#4CAF50",
        icon: "mdi:calendar",
        data: stats.chess_daily,
      },
    ];
    return cards.filter((c) => c.data?.last);
  }, [stats]);

  // ── Rating history for chart ─────────────────────────────────────────────

  const chartData = useMemo(() => {
    return insights.ratingHistory;
  }, [insights.ratingHistory]);

  // ── Loss pie data ────────────────────────────────────────────────────────

  const lossPieData = useMemo(() => {
    const b = insights.lossBreakdown;
    const data = [
      { name: "Checkmate", value: b.checkmate, color: "#f44336" },
      { name: "Resigned", value: b.resignation, color: "#FF9800" },
      { name: "Timeout", value: b.timeout, color: "#9C27B0" },
      { name: "Abandoned", value: b.abandoned, color: "#607D8B" },
      { name: "Other", value: b.other, color: "#78909C" },
    ];
    return data.filter((d) => d.value > 0);
  }, [insights.lossBreakdown]);

  // ── Best time control ────────────────────────────────────────────────────

  const bestTC = useMemo(() => {
    if (insights.timeControlPerformance.length === 0) return null;
    return insights.timeControlPerformance.reduce((best, tc) =>
      tc.winRate > best.winRate && tc.total >= 5 ? tc : best
    );
  }, [insights.timeControlPerformance]);

  // ── Build steps dynamically ──────────────────────────────────────────────

  const steps = useMemo(() => {
    const s: { title: string; content: ReactNode }[] = [];

    // Step 0: Profile + Quick Stats
    s.push({
      title: "Overview",
      content: (
        <Stack spacing={2.5}>
          <GlassCard>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={profile.avatar}
                alt={profile.username}
                sx={{
                  width: 64,
                  height: 64,
                  border: "2px solid rgba(255,255,255,0.2)",
                }}
              >
                {profile.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {profile.title && (
                    <Chip
                      label={profile.title}
                      size="small"
                      sx={{
                        background: "rgba(255,193,7,0.2)",
                        color: "#FFC107",
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        height: 22,
                      }}
                    />
                  )}
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "white" }}
                  >
                    {profile.username}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    Joined{" "}
                    {new Date(profile.joined * 1000).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short" }
                    )}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {insights.totalGames} games analyzed
                  </Typography>
                </Stack>
              </Box>
            </Stack>
            <Stack
              direction="row"
              spacing={0}
              sx={{
                mt: 2,
                borderTop: "1px solid rgba(255,255,255,0.1)",
                pt: 2,
              }}
              justifyContent="space-around"
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#4CAF50" }}
                >
                  {insights.overallWinRate}%
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Win Rate
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "#4ecdc4" }}
                >
                  {insights.avgMovesInWins}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Avg Moves/Win
                </Typography>
              </Box>
              {bestTC && (
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "#FF9800" }}
                  >
                    {bestTC.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    Best Format
                  </Typography>
                </Box>
              )}
            </Stack>
          </GlassCard>
        </Stack>
      ),
    });

    // Step 1: Rating Cards
    if (ratingCards.length > 0) {
      s.push({
        title: "Ratings",
        content: (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.5,
            }}
          >
            {ratingCards.map((card) => {
              const current = card.data?.last?.rating ?? 0;
              const best = card.data?.best?.rating ?? 0;
              const record = card.data?.record;
              const total =
                (record?.win ?? 0) +
                (record?.loss ?? 0) +
                (record?.draw ?? 0);
              const winPct =
                total > 0
                  ? Math.round(((record?.win ?? 0) / total) * 100)
                  : 0;

              return (
                <GlassCard key={card.key}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Icon
                      icon={card.icon}
                      style={{ fontSize: 16, color: card.color }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: card.color,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {card.label}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "white", mt: 0.5 }}
                  >
                    {current}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Best: {best}
                  </Typography>
                  {record && (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={winPct}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "rgba(244,67,54,0.3)",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: "#4CAF50",
                            borderRadius: 2,
                          },
                        }}
                      />
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mt: 0.5 }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "#4CAF50", fontSize: "0.65rem" }}
                        >
                          W:{record.win}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.65rem",
                          }}
                        >
                          D:{record.draw}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#f44336", fontSize: "0.65rem" }}
                        >
                          L:{record.loss}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                </GlassCard>
              );
            })}
          </Box>
        ),
      });
    }

    // Step 2: Rating Progress Chart
    if (chartData.length > 2) {
      s.push({
        title: "Rating Progress",
        content: (
          <GlassCard>
            <SectionTitle
              icon="mdi:chart-line"
              title="Rating Progress"
              color="#45b7d1"
            />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(26,26,46,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="#4ecdc4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#4ecdc4" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        ),
      });
    }

    // Step 3: Color Performance
    s.push({
      title: "By Color",
      content: (
        <GlassCard>
          <SectionTitle
            icon="mdi:chess-pawn"
            title="Performance by Color"
            color="#9C27B0"
          />
          <Stack direction="row" spacing={2}>
            <Box
              sx={{
                flex: 1,
                textAlign: "center",
                p: 1.5,
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#f5f5f5",
                  border: "2px solid #ccc",
                  margin: "0 auto 8px",
                }}
              />
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "#4CAF50" }}
              >
                {insights.whitePerformance.winRate}%
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.6)" }}
              >
                {insights.whitePerformance.wins}W /{" "}
                {insights.whitePerformance.draws}D /{" "}
                {insights.whitePerformance.losses}L
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                textAlign: "center",
                p: 1.5,
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#333",
                  border: "2px solid #555",
                  margin: "0 auto 8px",
                }}
              />
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "#4CAF50" }}
              >
                {insights.blackPerformance.winRate}%
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.6)" }}
              >
                {insights.blackPerformance.wins}W /{" "}
                {insights.blackPerformance.draws}D /{" "}
                {insights.blackPerformance.losses}L
              </Typography>
            </Box>
          </Stack>
        </GlassCard>
      ),
    });

    // Step 4: Openings
    if (
      insights.openingsAsWhite.length > 0 ||
      insights.openingsAsBlack.length > 0
    ) {
      s.push({
        title: "Openings",
        content: (
          <Stack spacing={2.5}>
            {insights.openingsAsWhite.length > 0 && (
              <GlassCard>
                <SectionTitle
                  icon="mdi:book-open-variant"
                  title="Openings as White"
                  color="#45b7d1"
                />
                <Stack spacing={1.5}>
                  {insights.openingsAsWhite.map((opening) => (
                    <OpeningRow key={opening.eco} opening={opening} />
                  ))}
                </Stack>
              </GlassCard>
            )}
            {insights.openingsAsBlack.length > 0 && (
              <GlassCard>
                <SectionTitle
                  icon="mdi:book-open-variant"
                  title="Openings as Black"
                  color="#FF9800"
                />
                <Stack spacing={1.5}>
                  {insights.openingsAsBlack.map((opening) => (
                    <OpeningRow key={opening.eco} opening={opening} />
                  ))}
                </Stack>
              </GlassCard>
            )}
          </Stack>
        ),
      });
    }

    // Step 5: How You Lose + Game Length
    s.push({
      title: "Loss Analysis",
      content: (
        <Stack spacing={2.5}>
          {lossPieData.length > 0 && (
            <GlassCard>
              <SectionTitle
                icon="mdi:alert-circle"
                title="How You Lose"
                color="#f44336"
              />
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ width: 120, height: 120, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lossPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        dataKey="value"
                        stroke="none"
                      >
                        {lossPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Stack spacing={0.5} sx={{ flex: 1 }}>
                  {lossPieData.map((item) => {
                    const pct =
                      insights.lossBreakdown.total > 0
                        ? Math.round(
                            (item.value / insights.lossBreakdown.total) * 100
                          )
                        : 0;
                    return (
                      <Stack
                        key={item.name}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: item.color,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ color: "rgba(255,255,255,0.8)", flex: 1 }}
                        >
                          {item.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255,255,255,0.5)",
                            fontWeight: 600,
                          }}
                        >
                          {pct}%
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
              {insights.lossBreakdown.timeout > 0 &&
                insights.lossBreakdown.timeout /
                  insights.lossBreakdown.total >
                  0.3 && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      borderRadius: "8px",
                      background: "rgba(156,39,176,0.1)",
                      border: "1px solid rgba(156,39,176,0.2)",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Icon
                        icon="mdi:clock-alert"
                        style={{ color: "#CE93D8", fontSize: 16 }}
                      />
                      <Typography variant="caption" sx={{ color: "#CE93D8" }}>
                        You lose on time often. Try playing with more time or
                        work on your time management.
                      </Typography>
                    </Stack>
                  </Box>
                )}
            </GlassCard>
          )}

          <GlassCard>
            <SectionTitle
              icon="mdi:counter"
              title="Game Length"
              color="#FF9800"
            />
            <Stack direction="row" spacing={2} justifyContent="center">
              <Box
                sx={{
                  textAlign: "center",
                  flex: 1,
                  p: 1.5,
                  borderRadius: "12px",
                  background: "rgba(76,175,80,0.1)",
                  border: "1px solid rgba(76,175,80,0.2)",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "#4CAF50" }}
                >
                  {insights.avgMovesInWins}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Avg Moves in Wins
                </Typography>
              </Box>
              <Box
                sx={{
                  textAlign: "center",
                  flex: 1,
                  p: 1.5,
                  borderRadius: "12px",
                  background: "rgba(244,67,54,0.1)",
                  border: "1px solid rgba(244,67,54,0.2)",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "#f44336" }}
                >
                  {insights.avgMovesInLosses}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Avg Moves in Losses
                </Typography>
              </Box>
            </Stack>
            {insights.avgMovesInLosses > 0 &&
              insights.avgMovesInWins > 0 &&
              insights.avgMovesInWins < insights.avgMovesInLosses && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: "8px",
                    background: "rgba(76,175,80,0.1)",
                    border: "1px solid rgba(76,175,80,0.2)",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Icon
                      icon="mdi:lightbulb"
                      style={{ color: "#81C784", fontSize: 16 }}
                    />
                    <Typography variant="caption" sx={{ color: "#81C784" }}>
                      You tend to win shorter games. You might be stronger in
                      tactics than endgames.
                    </Typography>
                  </Stack>
                </Box>
              )}
          </GlassCard>
        </Stack>
      ),
    });

    // Step 6: Time Control Performance
    if (insights.timeControlPerformance.length > 1) {
      s.push({
        title: "Time Controls",
        content: (
          <GlassCard>
            <SectionTitle
              icon="mdi:timer-cog"
              title="By Time Control"
              color="#2196F3"
            />
            <Stack spacing={1.5}>
              {insights.timeControlPerformance.map((tc) => (
                <Box key={tc.name}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "white", fontWeight: 600 }}
                    >
                      {tc.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {tc.total} games
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={tc.winRate}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "rgba(244,67,54,0.2)",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: "#4CAF50",
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#4CAF50",
                        fontWeight: 700,
                        minWidth: 35,
                        textAlign: "right",
                      }}
                    >
                      {tc.winRate}%
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </GlassCard>
        ),
      });
    }

    return s;
  }, [
    profile,
    stats,
    insights,
    ratingCards,
    chartData,
    lossPieData,
    bestTC,
  ]);

  // ── Navigation ───────────────────────────────────────────────────────────

  const totalSteps = steps.length;
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  const triggerAd = useCallback(() => {
    const w = window as any;
    if (w.App && typeof w.App.postMessage === "function") {
      w.App.postMessage("showInterstitial");
    } else if (w && typeof w.triggerInterstitialAd === "function") {
      w.triggerInterstitialAd();
    }
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) return;
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    // Show ad every 2 steps
    if (nextStep % 2 === 0 && nextStep > 0) {
      triggerAd();
    }
  }, [currentStep, isLast, triggerAd]);

  const handleBack = useCallback(() => {
    if (isFirst) return;
    setCurrentStep(currentStep - 1);
  }, [currentStep, isFirst]);

  return (
    <Box sx={{ maxWidth: 600, margin: "0 auto", pb: 4 }}>
      {/* Step indicator dots */}
      <Stack
        direction="row"
        justifyContent="center"
        spacing={0.75}
        sx={{ mb: 2 }}
      >
        {steps.map((_, i) => (
          <Box
            key={i}
            onClick={() => setCurrentStep(i)}
            sx={{
              width: currentStep === i ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                currentStep === i
                  ? "#4ecdc4"
                  : "rgba(255,255,255,0.2)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
          />
        ))}
      </Stack>

      {/* Step title */}
      <Typography
        variant="caption"
        sx={{
          color: "rgba(255,255,255,0.4)",
          display: "block",
          textAlign: "center",
          mb: 2,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {currentStep + 1} / {totalSteps} &mdash; {steps[currentStep]?.title}
      </Typography>

      {/* Current step content */}
      <Box
        key={currentStep}
        sx={{
          animation: "fadeIn 0.3s ease-in-out",
          "@keyframes fadeIn": {
            "0%": { opacity: 0, transform: "translateY(10px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {steps[currentStep]?.content}
      </Box>

      {/* Navigation buttons */}
      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{ mt: 3 }}
      >
        <Button
          onClick={handleBack}
          disabled={isFirst}
          startIcon={<Icon icon="mdi:chevron-left" />}
          sx={{
            color: isFirst ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
            borderRadius: "12px",
            px: 2.5,
            "&:hover": {
              background: "rgba(255,255,255,0.05)",
            },
          }}
        >
          Back
        </Button>

        {isLast ? (
          <Button
            onClick={() => setCurrentStep(0)}
            endIcon={<Icon icon="mdi:refresh" />}
            sx={{
              color: "#4ecdc4",
              borderRadius: "12px",
              px: 2.5,
              border: "1px solid rgba(78,205,196,0.3)",
              "&:hover": {
                background: "rgba(78,205,196,0.1)",
              },
            }}
          >
            Start Over
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            variant="contained"
            endIcon={<Icon icon="mdi:chevron-right" />}
            sx={{
              borderRadius: "12px",
              px: 3,
              background:
                "linear-gradient(135deg, #4ecdc4 0%, #44b8b0 100%)",
              "&:hover": {
                background:
                  "linear-gradient(135deg, #44b8b0 0%, #3aa39c 100%)",
              },
            }}
          >
            Next
          </Button>
        )}
      </Stack>
    </Box>
  );
}

// ── Opening Row Sub-component ──────────────────────────────────────────────

function OpeningRow({ opening }: { opening: OpeningStats }) {
  const winPct =
    opening.games > 0 ? (opening.wins / opening.games) * 100 : 0;
  const drawPct =
    opening.games > 0 ? (opening.draws / opening.games) * 100 : 0;
  const lossPct =
    opening.games > 0 ? (opening.losses / opening.games) * 100 : 0;

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: "white",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {opening.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.4)" }}
          >
            {opening.eco} - {opening.games} games
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{ color: "#4CAF50", fontWeight: 700, ml: 1 }}
        >
          {opening.winRate}%
        </Typography>
      </Stack>
      <Box
        sx={{
          mt: 0.5,
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          display: "flex",
          background: "rgba(255,255,255,0.05)",
        }}
      >
        <Box
          sx={{
            width: `${winPct}%`,
            backgroundColor: "#4CAF50",
            transition: "width 0.3s",
          }}
        />
        <Box
          sx={{
            width: `${drawPct}%`,
            backgroundColor: "#9E9E9E",
            transition: "width 0.3s",
          }}
        />
        <Box
          sx={{
            width: `${lossPct}%`,
            backgroundColor: "#f44336",
            transition: "width 0.3s",
          }}
        />
      </Box>
    </Box>
  );
}
