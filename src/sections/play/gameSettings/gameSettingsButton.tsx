import { Button, Stack, useTheme, useMediaQuery } from "@mui/material";
import { useState } from "react";
import GameSettingsDialog from "./gameSettingsDialog";
import {
  gameAtom,
  activeBotAtom,
  playerColorAtom,
  isGameInProgressAtom,
} from "../states";
import { useAtomValue, useSetAtom } from "jotai";
import { Icon } from "@iconify/react";
import { Color } from "@/types/enums";
import { useChessActions } from "@/hooks/useChessActions";
import { useRouter } from "next/router";
import { logAnalyticsEvent } from "@/lib/firebase";

export default function GameSettingsButton() {
  const [openDialog, setOpenDialog] = useState(false);
  const game = useAtomValue(gameAtom);
  const activeBot = useAtomValue(activeBotAtom);
  const playerColor = useAtomValue(playerColorAtom);
  const setPlayerColor = useSetAtom(playerColorAtom);
  const setIsGameInProgress = useSetAtom(isGameInProgressAtom);
  const { reset: resetGame } = useChessActions(gameAtom);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const hasHistory = game.history().length > 0;

  // Rematch with same bot
  const handleRematch = () => {
    if (!activeBot) return;

    // Swap colors for variety
    const newColor = playerColor === Color.White ? Color.Black : Color.White;
    setPlayerColor(newColor);

    resetGame({
      white: {
        name: newColor === Color.White ? "You" : activeBot.name,
        rating: newColor === Color.White ? undefined : activeBot.elo,
        avatarUrl: newColor === Color.White ? undefined : activeBot.image,
      },
      black: {
        name: newColor === Color.Black ? "You" : activeBot.name,
        rating: newColor === Color.Black ? undefined : activeBot.elo,
        avatarUrl: newColor === Color.Black ? undefined : activeBot.image,
      },
    });

    setIsGameInProgress(true);

    logAnalyticsEvent("bot_game_start", {
      bot_id: activeBot.id,
      bot_name: activeBot.name,
      player_color: newColor,
      is_rematch: true,
    });
  };

  const handleChangeOpponent = () => {
    router.push("/bots");
  };

  // If a bot is active and game ended, show rematch + change opponent buttons
  if (activeBot && hasHistory) {
    return (
      <Stack spacing={1.5} sx={{ width: "100%", maxWidth: isMobile ? 280 : 320 }}>
        <Button
          variant="contained"
          onClick={handleRematch}
          startIcon={
            <img
              src={activeBot.image}
              alt=""
              style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
            />
          }
          sx={{
            background: `linear-gradient(135deg, ${activeBot.color} 0%, ${activeBot.color}CC 100%)`,
            borderRadius: "16px",
            padding: isMobile ? "14px 24px" : "16px 32px",
            fontSize: isMobile ? "1rem" : "1.1rem",
            fontWeight: 700,
            textTransform: "none",
            boxShadow: `0 8px 32px ${activeBot.color}50`,
            border: "1px solid rgba(255,255,255,0.15)",
            height: isMobile ? "52px" : "58px",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: `0 12px 40px ${activeBot.color}70`,
            },
            transition: "all 0.3s ease",
          }}
        >
          Rematch {activeBot.name.split(" ").pop()}
        </Button>

        <Button
          variant="outlined"
          onClick={handleChangeOpponent}
          startIcon={<Icon icon="mdi:account-switch" />}
          sx={{
            borderRadius: "12px",
            padding: "10px 20px",
            borderColor: "rgba(255,255,255,0.25)",
            color: "rgba(255,255,255,0.8)",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": {
              borderColor: "rgba(255,255,255,0.5)",
              backgroundColor: "rgba(255,255,255,0.05)",
            },
          }}
        >
          Change Opponent
        </Button>
      </Stack>
    );
  }

  // Default: regular game settings button
  return (
    <>
      <Button 
        variant="contained" 
        onClick={() => setOpenDialog(true)}
        startIcon={<Icon icon="mdi:chess-king" />}
        sx={{
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          borderRadius: '16px',
          padding: isMobile ? '16px 32px' : '18px 40px',
          fontSize: isMobile ? '1.1rem' : '1.2rem',
          fontWeight: 700,
          textTransform: 'none',
          boxShadow: '0 8px 32px rgba(76, 175, 80, 0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          minWidth: isMobile ? '280px' : '320px',
          height: isMobile ? '56px' : '64px',
          '&:hover': {
            background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px rgba(76, 175, 80, 0.5)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiButton-startIcon': {
            marginRight: '12px',
            fontSize: '24px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }
        }}
      >
        {hasHistory ? "Start New Game" : "Start Game"}
      </Button>

      <GameSettingsDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      />
    </>
  );
}
