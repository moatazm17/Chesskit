import { Button, useTheme, useMediaQuery } from "@mui/material";
import { useState } from "react";
import GameSettingsDialog from "./gameSettingsDialog";
import { gameAtom } from "../states";
import { useAtomValue } from "jotai";
import { Icon } from "@iconify/react";

export default function GameSettingsButton() {
  const [openDialog, setOpenDialog] = useState(false);
  const game = useAtomValue(gameAtom);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
        {game.history().length ? "Start New Game" : "Start Game"}
      </Button>

      <GameSettingsDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      />
    </>
  );
}
