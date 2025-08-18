import Board from "@/sections/analysis/board";
import PanelHeader from "@/sections/analysis/panelHeader";
import BoardNavigation from "@/sections/analysis/boardNavigation";
import AnalysisTab from "@/sections/analysis/panelBody/analysisTab";
import ClassificationTab from "@/sections/analysis/panelBody/classificationTab";
import { boardAtom, gameAtom, gameEvalAtom } from "@/sections/analysis/states";
import {
  Box,
  Divider,
  Grid2 as Grid,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import EngineSettingsButton from "@/sections/engineSettings/engineSettingsButton";
import GraphTab from "@/sections/analysis/panelBody/graphTab";
import { PageTitle } from "@/components/pageTitle";
import HomeScreen from "@/components/HomeScreen";
import LoadGameScreen from "@/components/LoadGameScreen";
import PremiumNavBar from "@/components/PremiumNavBar";

import NewGameDialog from "@/sections/loadGame/loadGameDialog";
import GameAnalysisModal from "@/components/GameAnalysisModal";
import { useChessActions } from "@/hooks/useChessActions";
import { Chess } from "chess.js";

export default function GameAnalysis() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'load' | 'analysis'>('home');
  const isLgOrGreater = useMediaQuery(theme.breakpoints.up("lg"));

  const gameEval = useAtomValue(gameEvalAtom);
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);
  const [loadGameDialogOpen, setLoadGameDialogOpen] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  // Add chess actions to handle game loading
  const { setPgn: setGamePgn } = useChessActions(gameAtom);
  const { resetToStartingPosition: resetBoard } = useChessActions(boardAtom);

  const showMovesTab = game.history().length > 0 || board.history().length > 0;

  useEffect(() => {
    if (tab === 1 && !showMovesTab) setTab(0);
    if (tab === 2 && !gameEval) setTab(0);
  }, [showMovesTab, gameEval, tab]);

  // Handle gameId URL parameter
  useEffect(() => {
    const { gameId } = router.query;
    if (gameId && typeof gameId === 'string') {
      // If there's a gameId parameter, go to analysis screen
      setCurrentScreen('analysis');
    }
  }, [router.query]);

  // Navigation handlers
  const handlePlayGame = () => {
    window.location.href = '/play';
  };

  const handleLoadGame = () => {
    setCurrentScreen('load');
  };

  const handleSavedGames = () => {
    window.location.href = '/database';
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToAnalysis = () => {
    setCurrentScreen('analysis');
  };

  // Handle game loading from dialog
  const handleGameLoad = async (game: Chess) => {
    try {
      const pgn = game.pgn();
      resetBoard(pgn);
      setGamePgn(pgn);
      setLoadGameDialogOpen(false);
      setAnalysisModalOpen(true);
    } catch (error) {
      console.error('Error loading game:', error);
    }
  };

  // Handle analysis completion
  const handleAnalysisComplete = () => {
    setAnalysisModalOpen(false);
  };

  // Show home screen
  if (currentScreen === 'home') {
    return (
      <>
        <PremiumNavBar 
          onHomeClick={() => setCurrentScreen('home')} 
          onLoadGameClick={handleLoadGame}
        />
        <HomeScreen
          onPlayGame={handlePlayGame}
          onLoadGame={handleLoadGame}
          onSavedGames={handleSavedGames}
        />
      </>
    );
  }

  // Show load game screen
  if (currentScreen === 'load') {
    return (
      <>
        <PremiumNavBar 
          onHomeClick={() => setCurrentScreen('home')} 
          onLoadGameClick={handleLoadGame}
        />
        <LoadGameScreen
          onChessCom={() => setCurrentScreen('analysis')}
          onLichess={() => setCurrentScreen('analysis')}
          onPastePgn={() => setCurrentScreen('analysis')}
          onBack={handleBackToHome}
          onNavigateToAnalysis={handleNavigateToAnalysis}
        />
      </>
    );
  }

  // Show analysis screen (original content)
  return (
    <>
      <PremiumNavBar onHomeClick={() => setCurrentScreen('home')} />
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          background: `linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.8) 50%, rgba(15,52,96,0.8) 100%), url('/chessreviewbg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          padding: isLgOrGreater ? 0 : '8px'
        }}
      >
        <Grid 
          container 
          gap={isLgOrGreater ? 4 : 2} 
          justifyContent="space-evenly" 
          alignItems="start"
          sx={{
            padding: isLgOrGreater ? 0 : '8px',
            maxWidth: '100vw',
            overflow: 'hidden'
          }}
        >
      <PageTitle title="Chesskit Game Analysis" />



      <Board />

      <BoardNavigation />

      <Grid
        container
        justifyContent="start"
        alignItems="center"
        borderRadius={3}
        border={1}
        borderColor={"secondary.main"}
        sx={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          margin: isLgOrGreater ? 0 : '0 8px',
          width: isLgOrGreater ? 'auto' : 'calc(100% - 16px)',
          backdropFilter: 'blur(10px)'
        }}
        padding={2}
        style={{
          maxWidth: "1200px",
        }}
        rowGap={2}
        height={{ xs: tab === 1 ? "40rem" : "auto", lg: "calc(95vh - 60px)" }}
        display="flex"
        flexDirection="column"
        flexWrap="nowrap"
        size={{
          xs: 12,
          lg: "grow",
        }}
      >
        {isLgOrGreater && (
          <Box width="100%">
            <PanelHeader key="analysis-panel-header" />
            <Divider sx={{ marginX: "5%", marginTop: 2.5 }} />
          </Box>
        )}

        {!isLgOrGreater && !gameEval && <Divider sx={{ marginX: "5%" }} />}
        {!isLgOrGreater && !gameEval && (
          <PanelHeader key="analysis-panel-header" />
        )}

        {!isLgOrGreater && (
          <Box
            width="100%"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              padding: '0 16px',
              marginBottom: 2
            }}
          >
            <Box
              sx={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: '20px',
                padding: '6px',
                backdropFilter: 'blur(15px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                width: '100%',
                maxWidth: '480px'
              }}
            >
              <Tabs
                value={tab}
                onChange={(_, newValue) => setTab(newValue)}
                aria-label="Analysis tabs"
                variant="fullWidth"
                sx={{ 
                  minHeight: 0,
                  '& .MuiTabs-indicator': {
                    display: 'none' // Hide default indicator
                  },
                  '& .MuiTab-root': {
                    minHeight: 52,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    padding: '10px 16px',
                    margin: '0 3px',
                    borderRadius: '14px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: 'rgba(255,255,255,0.6)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(76,175,80,0.05) 100%)',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                      borderRadius: '14px'
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.9)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                      '&:before': {
                        opacity: 1
                      }
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(76,175,80,0.2)',
                      color: '#4CAF50',
                      fontWeight: 700,
                      boxShadow: '0 6px 20px rgba(76,175,80,0.3)',
                      transform: 'translateY(-1px)',
                      '&:before': {
                        opacity: 1
                      },
                      '& .tab-icon': {
                        color: '#4CAF50',
                        filter: 'drop-shadow(0 2px 4px rgba(76,175,80,0.4))'
                      }
                    },
                    '& .tab-icon': {
                      fontSize: '22px',
                      marginRight: '8px',
                      transition: 'all 0.3s ease',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                    }
                  }
                }}
              >
              <Tab
                label="Analysis"
                id="tab0"
                icon={<Icon icon="mdi:chart-box" className="tab-icon" />}
                iconPosition="start"
                disableFocusRipple
              />

              <Tab
                label="Moves"
                id="tab1"
                icon={<Icon icon="mdi:chess-pawn" className="tab-icon" />}
                iconPosition="start"
                sx={{
                  display: showMovesTab ? undefined : "none",
                }}
                disableFocusRipple
              />

              <Tab
                label="Graph"
                id="tab2"
                icon={<Icon icon="mdi:chart-line-variant" className="tab-icon" />}
                iconPosition="start"
                sx={{
                  display: gameEval ? undefined : "none",
                }}
                disableFocusRipple
              />

              <Tab
                label="Notes"
                id="tab3"
                icon={<Icon icon="mdi:note-text" className="tab-icon" />}
                iconPosition="start"
                disableFocusRipple
              />
              </Tabs>
            </Box>
          </Box>
        )}

        <GraphTab
          role="tabpanel"
          hidden={tab !== 2 && !isLgOrGreater}
          id="tabContent2"
        />

        <AnalysisTab
          role="tabpanel"
          hidden={tab !== 0 && !isLgOrGreater}
          id="tabContent0"
        />

        <ClassificationTab
          role="tabpanel"
          hidden={tab !== 1 && !isLgOrGreater}
          id="tabContent1"
        />

        <Box
          role="tabpanel"
          hidden={tab !== 3 && !isLgOrGreater}
          id="tabContent3"
          sx={{
            padding: 2,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            marginTop: 1
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Game comments and annotations will appear here.
          </Typography>
        </Box>



        {!isLgOrGreater && gameEval && (
          <Box width="100%">
            <Divider sx={{ marginX: "5%", marginBottom: 2.5 }} />
            <PanelHeader key="analysis-panel-header" />
          </Box>
        )}
      </Grid>

      <EngineSettingsButton />
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
    </>
  );
}
