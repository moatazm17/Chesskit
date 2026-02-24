import { useAtomValue } from "jotai";
import { gameAtom, isGameInProgressAtom, playerColorAtom, activeBotAtom } from "./states";
import { Button, Typography, Box, useTheme, useMediaQuery } from "@mui/material";
import { Color } from "@/types/enums";
import { setGameHeaders } from "@/lib/chess";
import { useGameDatabase } from "@/hooks/useGameDatabase";
import { useRouter } from "next/router";
import { Icon } from "@iconify/react";
import { useState, useEffect, useRef } from "react";
import GameAnalysisModal from "@/components/GameAnalysisModal";
import { useChessActions } from "@/hooks/useChessActions";
import {
  boardAtom,
  gameAtom as analysisGameAtom,
} from "@/sections/analysis/states";
import { logAnalyticsEvent } from "@/lib/firebase";
import { triggerInterstitialAd } from "@/lib/ads";

export default function GameRecap() {
  const game = useAtomValue(gameAtom);
  const playerColor = useAtomValue(playerColorAtom);
  const isGameInProgress = useAtomValue(isGameInProgressAtom);
  const activeBot = useAtomValue(activeBotAtom);
  const { addGame } = useGameDatabase();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const analyticsLoggedRef = useRef(false);
  
  // Chess actions to set up analysis - use analysis atoms, not play atoms
  const { setPgn: setAnalysisGamePgn } = useChessActions(analysisGameAtom);
  const { resetToStartingPosition: resetAnalysisBoard } = useChessActions(boardAtom);

  // Log game end analytics and show ad
  const moveCount = game.history().length;
  useEffect(() => {
    if (!isGameInProgress && moveCount > 0 && !analyticsLoggedRef.current) {
      analyticsLoggedRef.current = true;
      const result = game.isCheckmate()
        ? (game.turn() === playerColor ? "loss" : "win")
        : game.isGameOver()
        ? "draw"
        : "resigned";
      if (activeBot) {
        logAnalyticsEvent("bot_game_end", {
          bot_id: activeBot.id,
          bot_name: activeBot.name,
          result,
          total_moves: moveCount,
        });
      }
      triggerInterstitialAd();
    }
    if (isGameInProgress) {
      analyticsLoggedRef.current = false;
    }
  }, [isGameInProgress, moveCount, activeBot, game, playerColor]);

  if (isGameInProgress || !moveCount) return null;

  const getResultData = () => {
    const opponentName = activeBot ? activeBot.name : "Stockfish";
    if (game.isCheckmate()) {
      const winnerColor = game.turn() === "w" ? Color.Black : Color.White;
      const isPlayerWinner = winnerColor === playerColor;
      return {
        icon: isPlayerWinner ? "🎉" : "😔",
        title: isPlayerWinner ? "Victory!" : "Defeat",
        message: `${isPlayerWinner ? "You" : opponentName} won by checkmate`,
        color: isPlayerWinner ? "#4CAF50" : "#ff6b6b"
      };
    }
    if (game.isInsufficientMaterial()) return {
      icon: "🤝",
      title: "Draw",
      message: "Insufficient material",
      color: "#45b7d1"
    };
    if (game.isStalemate()) return {
      icon: "🤝", 
      title: "Draw",
      message: "Stalemate",
      color: "#45b7d1"
    };
    if (game.isThreefoldRepetition()) return {
      icon: "🤝",
      title: "Draw", 
      message: "Threefold repetition",
      color: "#45b7d1"
    };
    if (game.isDraw()) return {
      icon: "🤝",
      title: "Draw",
      message: "Fifty-move rule",
      color: "#45b7d1"
    };

    return {
      icon: "🏳️",
      title: "Resigned",
      message: "You resigned the game",
      color: "#ff6b6b"
    };
  };

  const handleOpenGameAnalysis = async () => {
    try {
      // Get the game PGN with proper headers
      const gameToAnalysis = setGameHeaders(game, {
        resigned: !game.isGameOver() ? playerColor : undefined,
      });
      const pgn = gameToAnalysis.pgn();
      
      // Set up the analysis board with this game
      resetAnalysisBoard(pgn);
      setAnalysisGamePgn(pgn);
      
      // Open analysis modal
      setAnalysisModalOpen(true);
      
    } catch (error) {
      console.error('Error setting up game analysis:', error);
    }
  };

  const handleAnalysisComplete = async () => {
    // Close modal
    setAnalysisModalOpen(false);
    
    // Save the game and navigate to analysis
    const gameToAnalysis = setGameHeaders(game, {
      resigned: !game.isGameOver() ? playerColor : undefined,
    });
    const gameId = await addGame(gameToAnalysis);
    router.push({ pathname: "/", query: { gameId } });
  };

  const resultData = getResultData();

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${resultData.color}15 0%, ${resultData.color}05 100%)`,
        borderRadius: '20px',
        padding: isMobile ? '20px' : '24px',
        border: `1px solid ${resultData.color}30`,
        boxShadow: `0 8px 32px ${resultData.color}20`,
        backdropFilter: 'blur(10px)',
        width: '100%',
        maxWidth: '350px',
        margin: '0 auto',
        textAlign: 'center'
      }}
    >
      {/* Game Result */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography 
          sx={{ 
            fontSize: '3rem',
            marginBottom: 1,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}
        >
          {resultData.icon}
        </Typography>
        
        <Typography 
          variant="h5" 
          sx={{ 
            color: resultData.color,
            fontWeight: 700,
            marginBottom: 1,
            textShadow: `0 2px 8px ${resultData.color}40`
          }}
        >
          {resultData.title}
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 2,
            fontWeight: 500
          }}
        >
          {resultData.message}
        </Typography>

        <Typography 
          variant="body2" 
          sx={{ 
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem'
          }}
        >
          Game completed in {moveCount} moves
        </Typography>
      </Box>

      {/* Analyze Button */}
      <Button 
        variant="contained"
        onClick={handleOpenGameAnalysis}
        startIcon={<Icon icon="mdi:chart-line" />}
        sx={{
          background: 'linear-gradient(135deg, #45b7d1 0%, #3894eb 100%)',
          borderRadius: '16px',
          padding: '14px 28px',
          fontSize: '1rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: '0 6px 24px rgba(69, 183, 209, 0.4)',
          width: '100%',
          '&:hover': {
            background: 'linear-gradient(135deg, #3894eb 0%, #2979ff 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 32px rgba(69, 183, 209, 0.5)',
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        Analyze This Game
      </Button>

      {/* Game Analysis Modal */}
      <GameAnalysisModal
        open={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        onAnalyzeComplete={handleAnalysisComplete}
      />
    </Box>
  );
}
