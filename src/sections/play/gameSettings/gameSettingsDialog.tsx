import Slider from "@/components/slider";
import { Color, EngineName } from "@/types/enums";
import {
  MenuItem,
  Select,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  OutlinedInput,
  DialogActions,
  Typography,
  Grid2 as Grid,
  FormGroup,
  FormControlLabel,
  Switch,
  TextField,
} from "@mui/material";
import { useAtomLocalStorage } from "@/hooks/useAtomLocalStorage";
import { useAtom, useSetAtom } from "jotai";
import {
  engineEloAtom,
  playerColorAtom,
  isGameInProgressAtom,
  gameAtom,
  enginePlayNameAtom,
} from "../states";
import { useChessActions } from "@/hooks/useChessActions";
import { logAnalyticsEvent } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { isEngineSupported } from "@/lib/engine/shared";
import { Stockfish16_1 } from "@/lib/engine/stockfish16_1";
import { DEFAULT_ENGINE, ENGINE_LABELS, STRONGEST_ENGINE } from "@/constants";
import { getGameFromPgn } from "@/lib/chess";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GameSettingsDialog({ open, onClose }: Props) {
  const [engineElo, setEngineElo] = useAtomLocalStorage(
    "engine-elo",
    engineEloAtom
  );
  const [engineName, setEngineName] = useAtomLocalStorage(
    "engine-play-name",
    enginePlayNameAtom
  );
  const [playerColor, setPlayerColor] = useAtom(playerColorAtom);
  const setIsGameInProgress = useSetAtom(isGameInProgressAtom);
  const { reset: resetGame } = useChessActions(gameAtom);
  const [startingPositionInput, setStartingPositionInput] = useState("");
  const [parsingError, setParsingError] = useState("");

  const handleGameStart = () => {
    setParsingError("");

    try {
      const input = startingPositionInput.trim();
      const startingFen = input.startsWith("[")
        ? getGameFromPgn(input).fen()
        : input || undefined;

      resetGame({
        white: {
          name:
            playerColor === Color.White
              ? "You"
              : ENGINE_LABELS[engineName].small,
          rating: playerColor === Color.White ? undefined : engineElo,
        },
        black: {
          name:
            playerColor === Color.Black
              ? "You"
              : ENGINE_LABELS[engineName].small,
          rating: playerColor === Color.Black ? undefined : engineElo,
        },
        fen: startingFen,
      });
    } catch (error) {
      console.error(error);
      setParsingError(
        error instanceof Error
          ? `${error.message} !`
          : "Unknown error while parsing input !"
      );
      return;
    }

    setIsGameInProgress(true);
    handleClose();

    logAnalyticsEvent("play_game", {
      engine: engineName,
      engineElo,
      playerColor,
    });
  };

  useEffect(() => {
    if (!isEngineSupported(engineName)) {
      if (Stockfish16_1.isSupported()) {
        setEngineName(EngineName.Stockfish16_1Lite);
      } else {
        setEngineName(EngineName.Stockfish11);
      }
    }
  }, [setEngineName, engineName]);

  const handleClose = () => {
    onClose();
    setStartingPositionInput("");
    setParsingError("");
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle 
        sx={{
          textAlign: 'center',
          padding: '32px 24px 16px 24px',
          background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(76,175,80,0.05) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Typography 
          variant="h4" 
          sx={{
            fontWeight: 700,
            color: 'white',
            marginBottom: 1,
            background: 'linear-gradient(45deg, #4CAF50, #45b7d1)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          🎮 Game Setup
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'rgba(255,255,255,0.7)',
            maxWidth: '400px',
            margin: '0 auto',
            lineHeight: 1.5
          }}
        >
          Configure your game settings and challenge Stockfish
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ padding: '32px 24px' }}>
        <Grid
          container
          spacing={4}
          alignItems="center"
        >
          {/* Engine Selection */}
          <Grid item xs={12}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'white', 
                fontWeight: 600, 
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              🤖 Chess Engine
            </Typography>
            <FormControl fullWidth>
              <Select
                value={engineName}
                onChange={(e) => setEngineName(e.target.value as EngineName)}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid rgba(76,175,80,0.5)'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: '2px solid #4CAF50'
                  },
                  '& .MuiSelect-select': {
                    color: 'white',
                    padding: '16px'
                  }
                }}
              >
                {Object.values(EngineName).map((engine) => (
                  <MenuItem
                    key={engine}
                    value={engine}
                    disabled={!isEngineSupported(engine)}
                    sx={{
                      color: 'white',
                      backgroundColor: 'rgba(26,26,46,0.9)',
                      '&:hover': {
                        backgroundColor: 'rgba(76,175,80,0.1)'
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(76,175,80,0.2)'
                      }
                    }}
                  >
                    {ENGINE_LABELS[engine].full}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* ELO Rating */}
          <Grid item xs={12}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'white', 
                fontWeight: 600, 
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              ⚡ Bot Strength: {engineElo} ELO
            </Typography>
            <Slider
              label=""
              value={engineElo}
              setValue={setEngineElo}
              min={1320}
              max={3190}
              step={10}
              marksFilter={374}
            />
          </Grid>

          {/* Color Selection */}
          <Grid item xs={12}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'white', 
                fontWeight: 600, 
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              ♟️ Your Color
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={playerColor === Color.White}
                    onChange={(e) => {
                      setPlayerColor(
                        e.target.checked ? Color.White : Color.Black
                      );
                    }}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#4CAF50',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#4CAF50',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: 'white', fontSize: '1.1rem' }}>
                    {playerColor === Color.White
                      ? "🔵 You play as White"
                      : "⚫ You play as Black"}
                  </Typography>
                }
              />
            </FormGroup>
          </Grid>

          {/* Starting Position */}
          <Grid item xs={12}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'white', 
                fontWeight: 600, 
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              📋 Starting Position (Optional)
            </Typography>
            <TextField
              fullWidth
              placeholder="Enter FEN or PGN for custom starting position"
              variant="outlined"
              multiline
              rows={3}
              value={startingPositionInput}
              onChange={(e) => setStartingPositionInput(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  '& fieldset': {
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px'
                  },
                  '&:hover fieldset': {
                    border: '1px solid rgba(76,175,80,0.5)'
                  },
                  '&.Mui-focused fieldset': {
                    border: '2px solid #4CAF50'
                  }
                },
                '& .MuiInputBase-input': {
                  color: 'white'
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.5)'
                }
              }}
            />
          </Grid>

          {parsingError && (
            <Grid item xs={12}>
              <Typography 
                sx={{ 
                  color: '#ff6b6b', 
                  textAlign: 'center',
                  backgroundColor: 'rgba(255,107,107,0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,107,107,0.3)'
                }}
              >
                ⚠️ {parsingError}
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions 
        sx={{ 
          padding: '24px 32px 32px 32px',
          gap: 2,
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{
            borderRadius: '12px',
            padding: '12px 24px',
            borderColor: 'rgba(255,255,255,0.3)',
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 600,
            '&:hover': {
              borderColor: 'rgba(255,255,255,0.5)',
              backgroundColor: 'rgba(255,255,255,0.05)'
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleGameStart}
          sx={{
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            borderRadius: '12px',
            padding: '12px 32px',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(76, 175, 80, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
              boxShadow: '0 6px 25px rgba(76, 175, 80, 0.5)',
            }
          }}
        >
          🚀 Start Game
        </Button>
      </DialogActions>
    </Dialog>
  );
}
