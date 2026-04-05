import { boardAtom, gameAtom } from "@/sections/analysis/states";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";
import HomeScreen from "@/components/HomeScreen";
import PremiumNavBar from "@/components/PremiumNavBar";
import { useChessActions } from "@/hooks/useChessActions";
import { Chess } from "chess.js";
import RatingModal, { useRatingPrompt } from "@/components/RatingModal";
import { logAnalyticsEvent } from "@/lib/firebase";
import { showInterstitialAd, triggerInterstitialAd, markGracePeriodDone } from "@/lib/ads";

function ChunkLoader() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <CircularProgress sx={{ color: "#4CAF50" }} />
    </Box>
  );
}

const AnalysisView = dynamic(
  () => import("@/components/AnalysisView"),
  { ssr: false, loading: () => <ChunkLoader /> }
);
const NewGameDialog = dynamic(
  () => import("@/sections/loadGame/loadGameDialog"),
  { ssr: false }
);
const LoadGameScreen = dynamic(
  () => import("@/components/LoadGameScreen"),
  { ssr: false, loading: () => <ChunkLoader /> }
);
const GameAnalysisModal = dynamic(
  () => import("@/components/GameAnalysisModal"),
  { ssr: false }
);

export default function GameAnalysis() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<'home' | 'load' | 'analysis'>('home');

  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);
  const [loadGameDialogOpen, setLoadGameDialogOpen] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  const { setPgn: setGamePgn } = useChessActions(gameAtom);
  const { resetToStartingPosition: resetBoard } = useChessActions(boardAtom);

  const { showRating, ratingTrigger, checkOnOpen, checkAfterAnalysis, checkAfterLanguageSwitch, closeRating } = useRatingPrompt();
  const showMovesTab = game.history().length > 0 || board.history().length > 0;

  useEffect(() => {
    checkOnOpen();
  }, [checkOnOpen]);

  useEffect(() => {
    markGracePeriodDone();
  }, []);

  useEffect(() => {
    const { gameId } = router.query;
    if (gameId && typeof gameId === 'string') {
      setCurrentScreen('analysis');
    }
  }, [router.query]);

  const handlePlayGame = async () => {
    logAnalyticsEvent("card_click", { card: "play_game" });
    await showInterstitialAd();
    router.push('/play');
  };

  const handleLoadGame = () => {
    logAnalyticsEvent("card_click", { card: "review_game" });
    triggerInterstitialAd();
    setCurrentScreen('load');
  };

  const handleSavedGames = () => {
    logAnalyticsEvent("card_click", { card: "saved_games" });
    router.push('/database');
  };

  const handlePuzzles = async () => {
    logAnalyticsEvent("card_click", { card: "puzzles" });
    await showInterstitialAd();
    router.push('/puzzles');
  };

  const handleCheckmate = async () => {
    logAnalyticsEvent("card_click", { card: "checkmate" });
    await showInterstitialAd();
    router.push('/checkmate');
  };

  const handleBots = async () => {
    logAnalyticsEvent("card_click", { card: "play_vs_legends" });
    await showInterstitialAd();
    router.push('/bots');
  };

  const handleBrilliant = async () => {
    logAnalyticsEvent("card_click", { card: "brilliant" });
    await showInterstitialAd();
    router.push('/brilliant');
  };

  const handleOpenings = async () => {
    logAnalyticsEvent("card_click", { card: "opening_trainer" });
    await showInterstitialAd();
    router.push('/openings');
  };

  const handleBackToHome = () => {
    if (currentScreen === 'analysis') {
      checkAfterAnalysis();
    }
    setCurrentScreen('home');
  };

  const handleNavigateToAnalysis = () => {
    setCurrentScreen('analysis');
  };

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

  const handleAnalysisComplete = () => {
    setAnalysisModalOpen(false);
  };

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
          onPuzzles={handlePuzzles}
          onCheckmate={handleCheckmate}
          onBots={handleBots}
          onBrilliant={handleBrilliant}
          onOpenings={handleOpenings}
          onLanguageSwitched={checkAfterLanguageSwitch}
        />
        <RatingModal open={showRating} onClose={closeRating} trigger={ratingTrigger} />
      </>
    );
  }

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

  return (
    <>
      <PremiumNavBar onHomeClick={() => setCurrentScreen('home')} />
      <AnalysisView showMovesTab={showMovesTab} />

      <NewGameDialog
        open={loadGameDialogOpen}
        onClose={() => setLoadGameDialogOpen(false)}
        setGame={handleGameLoad}
      />

      <GameAnalysisModal
        open={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        onAnalyzeComplete={handleAnalysisComplete}
      />

      <RatingModal open={showRating} onClose={closeRating} trigger={ratingTrigger} />
    </>
  );
}
