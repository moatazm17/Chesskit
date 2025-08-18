import { Button, Typography } from "@mui/material";
import { useState } from "react";
import NewGameDialog from "./loadGameDialog";
import GameAnalysisModal from "@/components/GameAnalysisModal";
import { Chess } from "chess.js";
import { useChessActions } from "@/hooks/useChessActions";
import { gameAtom, boardAtom } from "@/sections/analysis/states";

interface Props {
  setGame?: (game: Chess) => Promise<void>;
  label?: string;
  size?: "small" | "medium" | "large";
}

export default function LoadGameButton({ setGame, label, size }: Props) {
  const [openDialog, setOpenDialog] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  
  // Add chess actions to handle game loading
  const { setPgn: setGamePgn } = useChessActions(gameAtom);
  const { resetToStartingPosition: resetBoard } = useChessActions(boardAtom);

  // Handle game loading
  const handleGameLoad = async (game: Chess) => {
    try {
      const pgn = game.pgn();
      
      // Reset board and set game PGN
      resetBoard(pgn);
      setGamePgn(pgn);
      
      // Close dialog
      setOpenDialog(false);
      
      // Open analysis modal
      setAnalysisModalOpen(true);
      
    } catch (error) {
      console.error('Error loading game:', error);
    }
  };

  // Handle analysis completion
  const handleAnalysisComplete = () => {
    setAnalysisModalOpen(false);
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setOpenDialog(true)}
        size={size}
        data-testid="load-game-button"
        sx={{
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          '&:hover': {
            background: 'linear-gradient(45deg, #ff5252, #26a69a)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.3s ease'
        }}
      >
        <Typography 
          fontSize="0.9em" 
          fontWeight="600" 
          lineHeight="1.4em"
          sx={{ color: 'white' }}
        >
          {label || "Add game"}
        </Typography>
      </Button>

      <NewGameDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        setGame={handleGameLoad}
      />

      <GameAnalysisModal
        open={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        onAnalyzeComplete={handleAnalysisComplete}
      />
    </>
  );
}
