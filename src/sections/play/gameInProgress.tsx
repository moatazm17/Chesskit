import {
  Button,
  Grid2 as Grid,
  Typography,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useAtom, useAtomValue } from "jotai";
import { gameAtom, isGameInProgressAtom } from "./states";
import { useEffect, useState } from "react";
import UndoMoveButton from "./undoMoveButton";
import { Icon } from "@iconify/react";

export default function GameInProgress() {
  const game = useAtomValue(gameAtom);
  const [isGameInProgress, setIsGameInProgress] = useAtom(isGameInProgressAtom);
  const [pulse, setPulse] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (game.isGameOver()) setIsGameInProgress(false);
  }, [game, setIsGameInProgress]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleResign = () => {
    setIsGameInProgress(false);
  };

  if (!isGameInProgress) return null;

  const moveCount = game.history().length;
  const currentPlayer = game.turn() === 'w' ? 'White' : 'Black';

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(45,125,50,0.1) 100%)',
        borderRadius: '20px',
        padding: isMobile ? '20px' : '24px',
        border: '1px solid rgba(76,175,80,0.3)',
        boxShadow: '0 8px 32px rgba(76,175,80,0.2)',
        backdropFilter: 'blur(10px)',
        width: '100%',
        maxWidth: '350px',
        margin: '0 auto'
      }}
    >
      {/* Header with status */}
      <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 2, 
            marginBottom: 2 
          }}
        >
          <Chip
            icon={
              <Box
                sx={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#4CAF50',
                  animation: pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.7, transform: 'scale(1.2)' },
                    '100%': { opacity: 1, transform: 'scale(1)' }
                  }
                }}
              />
            }
            label="Game Active"
            sx={{
              backgroundColor: 'rgba(76,175,80,0.2)',
              color: '#4CAF50',
              fontWeight: 600,
              border: '1px solid rgba(76,175,80,0.4)',
              '& .MuiChip-icon': {
                marginLeft: '8px'
              }
            }}
          />
        </Box>
        
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'white', 
            fontWeight: 600,
            marginBottom: 1
          }}
        >
          🎮 Battle in Progress
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 2
          }}
        >
          Move {Math.ceil(moveCount / 2)} • {currentPlayer} to play
        </Typography>
      </Box>

      {/* Action buttons */}
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={6}>
          <UndoMoveButton />
        </Grid>
        
        <Grid item xs={6}>
          <Button 
            variant="outlined" 
            onClick={handleResign}
            startIcon={<Icon icon="mdi:flag" />}
            fullWidth
            sx={{
              borderRadius: '12px',
              padding: '12px 16px',
              borderColor: 'rgba(255,107,107,0.5)',
              color: '#ff6b6b',
              fontWeight: 600,
              backgroundColor: 'rgba(255,107,107,0.1)',
              '&:hover': {
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255,107,107,0.2)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(255,107,107,0.3)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            Resign
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
