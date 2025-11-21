import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Icon } from "@iconify/react";
import ChessComIcon from "./ChessComIcon";
import NewGameDialog from "@/sections/loadGame/loadGameDialog";
import GameAnalysisModal from "./GameAnalysisModal";
import { useEffect } from "react";
import { Chess } from "chess.js";
import { useChessActions } from "@/hooks/useChessActions";
import { gameAtom, boardAtom } from "@/sections/analysis/states";
import { useSetAtom } from "jotai";

interface LoadOptionProps {
  title: string;
  description: string;
  icon?: string;
  customIcon?: React.ReactNode;
  color: string;
  onClick: () => void;
}

const LoadOption: React.FC<LoadOptionProps> = ({
  title,
  description,
  icon,
  customIcon,
  color,
  onClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Card
      onClick={onClick}
      sx={{
        width: isMobile ? "100%" : 320,
        height: isMobile ? 140 : 180,
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
        backdropFilter: "blur(20px)",
        border: `1px solid ${color}30`,
        borderRadius: 4,
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: `0 8px 32px ${color}20`,
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: `0 16px 48px ${color}40`,
          border: `1px solid ${color}50`,
        },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
          padding: 3,
        }}
      >
        {customIcon ? (
          <Box
            sx={{
              fontSize: isMobile ? "2.5rem" : "3.5rem",
              color: color,
              marginBottom: isMobile ? "0.5rem" : "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {customIcon}
          </Box>
        ) : icon ? (
          <Icon
            icon={icon}
            style={{
              fontSize: isMobile ? "3.5rem" : "3.5rem",
              color: color,
              marginBottom: isMobile ? "0.5rem" : "1rem",
            }}
          />
        ) : null}
        <Typography
          variant={isMobile ? "subtitle1" : "h6"}
          component="h2"
          sx={{
            fontWeight: 600,
            color: "white",
            marginBottom: isMobile ? 0.5 : 1,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.5,
            fontSize: isMobile ? "0.7rem" : "0.875rem",
            marginTop: isMobile ? 0.5 : 1,
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

interface LoadGameScreenProps {
  onChessCom: () => void;
  onLichess: () => void;
  onPastePgn: () => void;
  onBack: () => void;
  onNavigateToAnalysis: () => void;
}

const LoadGameScreen: React.FC<LoadGameScreenProps> = ({
  onChessCom,
  onLichess,
  onPastePgn,
  onBack,
  onNavigateToAnalysis,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [loadGameDialogOpen, setLoadGameDialogOpen] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  // Add chess actions to handle game loading
  const { setPgn: setGamePgn } = useChessActions(gameAtom);
  const { resetToStartingPosition: resetBoard } = useChessActions(boardAtom);

  // Set the preferred origin when dialog opens
  useEffect(() => {
    if (loadGameDialogOpen && selectedOrigin) {
      // Store the selected origin in localStorage for the dialog
      localStorage.setItem("preferred-game-origin", selectedOrigin);
    }
  }, [loadGameDialogOpen, selectedOrigin]);

  // Handle game loading
  const handleGameLoad = async (game: Chess) => {
    try {
      const pgn = game.pgn();

      // Reset board and set game PGN
      resetBoard(pgn);
      setGamePgn(pgn);

      // Close dialog
      setLoadGameDialogOpen(false);

      // Open analysis modal
      setAnalysisModalOpen(true);
    } catch (error) {
      console.error("Error loading game:", error);
    }
  };

  // Handle analysis completion
  const handleAnalysisComplete = () => {
    // Close the analysis modal
    setAnalysisModalOpen(false);

    // Navigate to analysis screen
    onNavigateToAnalysis();
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 2 : 4,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)
          `,
          zIndex: 0,
        }}
      />

      {/* Content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          width: "100%",
        }}
      >
        {/* Header */}
        <Box sx={{ marginBottom: isMobile ? 2 : 4 }}>
          <Button
            onClick={onBack}
            startIcon={<Icon icon="mdi:arrow-left" />}
            sx={{
              color: "rgba(255,255,255,0.8)",
              marginBottom: 2,
              "&:hover": {
                color: "white",
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Back to Home
          </Button>

          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #45b7d1, #4ecdc4)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 1,
              fontSize: isMobile ? "1.5rem" : "3rem",
            }}
          >
            Review Game
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255,255,255,0.8)",
              fontWeight: 300,
              fontSize: isMobile ? "0.9rem" : "1.25rem",
            }}
          >
            Choose where to load your game from
          </Typography>
        </Box>

        {/* Options Grid */}
        <Grid
          container
          spacing={isMobile ? 2 : 3}
          justifyContent="center"
          sx={{
            maxWidth: 1000,
            paddingBottom: isMobile ? 2 : 0,
          }}
        >
          <Grid item xs={12} sm={6} md={4}>
            <LoadOption
              title="Chess.com"
              description="Import games from your Chess.com account"
              customIcon={<ChessComIcon size={isMobile ? 40 : 56} />}
              color="#4ecdc4"
              onClick={() => {
                setSelectedOrigin("chesscom");
                setLoadGameDialogOpen(true);
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <LoadOption
              title="Lichess.org"
              description="Import games from your Lichess account"
              icon="simple-icons:lichess"
              color="#45b7d1"
              onClick={() => {
                setSelectedOrigin("lichess");
                setLoadGameDialogOpen(true);
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <LoadOption
              title="Paste PGN"
              description="Paste a PGN string directly"
              icon="mdi:content-paste"
              color="#ff6b6b"
              onClick={() => {
                setSelectedOrigin("pgn");
                setLoadGameDialogOpen(true);
              }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Load Game Dialog */}
      <NewGameDialog
        open={loadGameDialogOpen}
        onClose={() => setLoadGameDialogOpen(false)}
        setGame={handleGameLoad}
      />

      {/* Game Analysis Modal */}
      <GameAnalysisModal
        open={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        onAnalyzeComplete={handleAnalysisComplete}
      />
    </Box>
  );
};

export default LoadGameScreen;
