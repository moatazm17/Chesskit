import { PageTitle } from "@/components/pageTitle";
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
  Button,
  Stack,
  Chip,
  IconButton,
} from "@mui/material";
import { Icon } from "@iconify/react";
import PremiumNavBar from "@/components/PremiumNavBar";
import { CHESS_BOTS, ChessBot } from "@/data/bots";
import { useState, useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  activeBotAtom,
  engineEloAtom,
  playerColorAtom,
  isGameInProgressAtom,
  gameAtom,
  enginePlayNameAtom,
} from "@/sections/play/states";
import { Color, EngineName } from "@/types/enums";
import { useChessActions } from "@/hooks/useChessActions";
import { useRouter } from "next/router";
import { logAnalyticsEvent } from "@/lib/firebase";

export default function BotsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const router = useRouter();

  const [selectedBot, setSelectedBot] = useState<ChessBot | null>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);

  useEffect(() => {
    logAnalyticsEvent("page_view", { page: "bots" });
  }, []);

  const setActiveBot = useSetAtom(activeBotAtom);
  const setEngineElo = useSetAtom(engineEloAtom);
  const setPlayerColor = useSetAtom(playerColorAtom);
  const setIsGameInProgress = useSetAtom(isGameInProgressAtom);
  const setEngineName = useSetAtom(enginePlayNameAtom);
  const { reset: resetGame } = useChessActions(gameAtom);

  const handleBotClick = (bot: ChessBot) => {
    setSelectedBot(bot);
    setColorDialogOpen(true);
  };

  const handleStartGame = (color: Color) => {
    if (!selectedBot) return;

    // Set bot as active
    setActiveBot(selectedBot);
    setEngineElo(selectedBot.elo);
    setPlayerColor(color);
    setEngineName(EngineName.Stockfish17Lite);

    // Reset game
    resetGame({
      white: {
        name: color === Color.White ? "You" : selectedBot.name,
        rating: color === Color.White ? undefined : selectedBot.elo,
        avatarUrl: color === Color.White ? undefined : selectedBot.image,
      },
      black: {
        name: color === Color.Black ? "You" : selectedBot.name,
        rating: color === Color.Black ? undefined : selectedBot.elo,
        avatarUrl: color === Color.Black ? undefined : selectedBot.image,
      },
    });

    setIsGameInProgress(true);
    setColorDialogOpen(false);

    logAnalyticsEvent("bot_game_start", {
      bot_id: selectedBot.id,
      bot_name: selectedBot.name,
      player_color: color,
    });

    // Navigate to play page
    router.push("/play");
  };

  return (
    <>
      <PremiumNavBar onHomeClick={() => (window.location.href = "/")} />
      <PageTitle title="Play vs Legends" />
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          background:
            "linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.95) 50%, rgba(15,52,96,0.95) 100%)",
          padding: isMobile ? 2 : 4,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 30% 20%, rgba(147, 51, 234, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)
            `,
            zIndex: 0,
          }}
        />

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", marginBottom: isMobile ? 3 : 5 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(45deg, #FFD700, #FFA500, #FF6347)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: isMobile ? "1.8rem" : "3rem",
                marginBottom: 1,
              }}
            >
              Play vs Legends
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "rgba(255,255,255,0.7)",
                fontSize: isMobile ? "0.85rem" : "1.1rem",
              }}
            >
              Challenge the greatest chess players in history
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.35)",
                fontSize: "0.7rem",
                mt: 1,
                display: "block",
                fontStyle: "italic",
              }}
            >
              AI opponents inspired by legendary playing styles
            </Typography>
          </Box>

          {/* Bot Cards Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2, 1fr)"
                : "repeat(4, 1fr)",
              gap: isMobile ? 2 : 3,
              maxWidth: 1000,
              margin: "0 auto",
            }}
          >
            {CHESS_BOTS.map((bot) => (
              <Card
                key={bot.id}
                onClick={() => handleBotClick(bot)}
                sx={{
                  background: `linear-gradient(135deg, ${bot.color}18, ${bot.color}08)`,
                  border: `1px solid ${bot.color}30`,
                  borderRadius: 3,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: `0 4px 20px ${bot.color}15`,
                  "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: `0 12px 40px ${bot.color}35`,
                    border: `1px solid ${bot.color}60`,
                  },
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    padding: isMobile ? "16px 12px" : "24px 16px",
                    "&:last-child": { paddingBottom: isMobile ? "16px" : "24px" },
                  }}
                >
                  {/* Avatar Image */}
                  <Box
                    sx={{
                      width: isMobile ? 80 : 110,
                      height: isMobile ? 45 : 62,
                      borderRadius: 2,
                      overflow: "hidden",
                      marginBottom: 1,
                      border: `2px solid ${bot.color}40`,
                      boxShadow: `0 0 12px ${bot.color}30`,
                    }}
                  >
                    <img
                      src={bot.image}
                      alt={bot.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </Box>

                  {/* Name */}
                  <Typography
                    variant={isMobile ? "body2" : "h6"}
                    sx={{
                      fontWeight: 700,
                      color: "white",
                      lineHeight: 1.2,
                      marginBottom: 0.5,
                      fontSize: isMobile ? "0.8rem" : "1rem",
                    }}
                  >
                    {bot.name}
                  </Typography>

                  {/* Title */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: bot.color,
                      fontStyle: "italic",
                      fontSize: isMobile ? "0.6rem" : "0.75rem",
                      marginBottom: 1,
                    }}
                  >
                    {bot.title}
                  </Typography>

                  {/* ELO & Style chips */}
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ marginBottom: 1, flexWrap: "wrap", justifyContent: "center", gap: 0.5 }}
                  >
                    <Chip
                      label={`${bot.elo}`}
                      size="small"
                      sx={{
                        backgroundColor: `${bot.color}25`,
                        color: bot.color,
                        fontWeight: 700,
                        fontSize: isMobile ? "0.6rem" : "0.7rem",
                        height: isMobile ? 20 : 24,
                      }}
                    />
                    <Chip
                      label={bot.style}
                      size="small"
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.7)",
                        fontSize: isMobile ? "0.55rem" : "0.65rem",
                        height: isMobile ? 20 : 24,
                      }}
                    />
                  </Stack>

                  {/* Description */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: isMobile ? "0.55rem" : "0.7rem",
                      lineHeight: 1.3,
                      display: isMobile ? "none" : "block",
                    }}
                  >
                    {bot.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Color Selection Dialog */}
      <Dialog
        open={colorDialogOpen}
        onClose={() => setColorDialogOpen(false)}
        PaperProps={{
          sx: {
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 4,
            maxWidth: 400,
            width: "90%",
            overflow: "hidden",
          },
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={() => setColorDialogOpen(false)}
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
          {selectedBot && (
            <>
              {/* Bot info */}
              <Box
                sx={{
                  width: 120,
                  height: 68,
                  borderRadius: 3,
                  overflow: "hidden",
                  margin: "0 auto 12px auto",
                  border: `2px solid ${selectedBot.color}50`,
                  boxShadow: `0 0 20px ${selectedBot.color}40`,
                }}
              >
                <img
                  src={selectedBot.image}
                  alt={selectedBot.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "white", marginBottom: 0.5 }}
              >
                {selectedBot.name}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: selectedBot.color,
                  fontStyle: "italic",
                  marginBottom: 0.5,
                }}
              >
                {selectedBot.title}
              </Typography>
              <Chip
                label={`ELO ${selectedBot.elo}`}
                sx={{
                  backgroundColor: `${selectedBot.color}25`,
                  color: selectedBot.color,
                  fontWeight: 700,
                  marginBottom: 3,
                }}
              />

              {/* Choose color */}
              <Typography
                variant="h6"
                sx={{
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                Choose Your Color
              </Typography>

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  onClick={() => handleStartGame(Color.White)}
                  variant="contained"
                  sx={{
                    flex: 1,
                    background:
                      "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
                    color: "#1a1a2e",
                    fontWeight: 700,
                    fontSize: "1rem",
                    padding: "14px 24px",
                    borderRadius: 3,
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(255,255,255,0.3)",
                    },
                  }}
                >
                  <Stack alignItems="center" spacing={0.5}>
                    <Box sx={{ fontSize: "1.5rem" }}>♔</Box>
                    <span>White</span>
                  </Stack>
                </Button>

                <Button
                  onClick={() => handleStartGame(Color.Black)}
                  variant="contained"
                  sx={{
                    flex: 1,
                    background:
                      "linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "1rem",
                    padding: "14px 24px",
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.2)",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #3c3c3c 0%, #2c2c2c 100%)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                    },
                  }}
                >
                  <Stack alignItems="center" spacing={0.5}>
                    <Box sx={{ fontSize: "1.5rem" }}>♚</Box>
                    <span>Black</span>
                  </Stack>
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
