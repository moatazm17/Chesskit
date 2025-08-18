import { IconButton, Tooltip, Box, Button } from "@mui/material";
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom, evaluationProgressAtom } from "../states";
import { useChessActions } from "@/hooks/useChessActions";
import { useCallback, useEffect, useMemo } from "react";
import { MoveClassification } from "@/types/enums";
import { useGameDatabase } from "@/hooks/useGameDatabase";
import { useRouter } from "next/router";
import { getGameToSave } from "@/lib/chess";

export default function BoardNavigation() {
  const board = useAtomValue(boardAtom);
  const game = useAtomValue(gameAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const evaluationProgress = useAtomValue(evaluationProgressAtom);
  const { undoMove: undoBoardMove, playMove: playBoardMove, resetToStartingPosition: resetBoard, goToMove } = useChessActions(boardAtom);
  const { addGame, setGameEval, gameFromUrl } = useGameDatabase();
  const router = useRouter();

  const boardHistory = board.history();
  const gameHistory = game.history();

  // Get classified moves (the 6 main move types)
  const classifiedMoves = useMemo(() => {
    if (!gameEval?.positions) return [];
    
    const importantClassifications = [
      MoveClassification.Splendid,
      MoveClassification.Perfect, 
      MoveClassification.Best,
      MoveClassification.Mistake,
      MoveClassification.Inaccuracy,
      MoveClassification.Blunder
    ];
    
    return gameEval.positions
      .map((pos, index) => ({ ...pos, moveIndex: index }))
      .filter(pos => 
        pos.moveClassification && 
        importantClassifications.includes(pos.moveClassification)
      );
  }, [gameEval]);

  // Regular next move
  const addNextGameMoveToBoard = useCallback(() => {
    const isButtonEnabled = boardHistory.length < gameHistory.length &&
      gameHistory.slice(0, boardHistory.length).join() === boardHistory.join();
    
    if (!isButtonEnabled) return;

    const nextMoveIndex = boardHistory.length;
    const nextMove = game.history({ verbose: true })[nextMoveIndex];

    if (nextMove) {
      playBoardMove({
        from: nextMove.from,
        to: nextMove.to,
        promotion: nextMove.promotion,
      });
    }
  }, [boardHistory, gameHistory, game, playBoardMove]);

  // Jump to next classified move (using seamless movement like moves tab)
  const jumpToNextClassifiedMove = useCallback(() => {
    const currentMoveIndex = boardHistory.length;
    const nextClassifiedMove = classifiedMoves.find(move => move.moveIndex > currentMoveIndex);
    
    if (nextClassifiedMove) {
      // Use the same seamless goToMove function as the moves tab
      goToMove(nextClassifiedMove.moveIndex, game);
    }
  }, [boardHistory.length, classifiedMoves, game, goToMove]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && boardHistory.length > 0) {
        undoBoardMove();
      } else if (e.key === "ArrowRight") {
        addNextGameMoveToBoard();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoBoardMove, boardHistory.length, addNextGameMoveToBoard]);

  const hasNextMove = boardHistory.length < gameHistory.length &&
    gameHistory.slice(0, boardHistory.length).join() === boardHistory.join();
  const hasNextClassifiedMove = classifiedMoves.some(move => move.moveIndex > boardHistory.length);

  // Save game functionality
  const enableSave = !gameFromUrl && (boardHistory.length || gameHistory.length);
  const handleSave = async () => {
    if (!enableSave) return;
    const gameToSave = getGameToSave(game, board);
    const gameId = await addGame(gameToSave);
    if (gameEval) {
      await setGameEval(gameId, gameEval);
    }
    router.replace({
      query: { gameId: gameId },
      pathname: router.pathname,
    }, undefined, { shallow: true, scroll: false });
  };

  const currentMoveIndex = boardHistory.length;
  const totalMoves = gameHistory.length;

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', marginX: 'auto' }}>
      {/* Main Navigation */}
      <Box 
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          margin: '8px 0',
          width: '100%',
        }}
      >
        {/* Left side - Previous and Reload */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Previous Move">
            <IconButton
              onClick={() => undoBoardMove()}
              disabled={boardHistory.length === 0}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'white',
                width: '48px',
                height: '48px',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  transform: 'scale(1.05)'
                },
                '&:disabled': { opacity: 0.3 },
                transition: 'all 0.2s ease'
              }}
            >
              <Icon icon="mdi:chevron-left" style={{ fontSize: '28px' }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Retry Position">
            <IconButton
              onClick={() => resetBoard()}
              disabled={boardHistory.length === 0}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'white',
                width: '48px',
                height: '48px',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  transform: 'scale(1.05)'
                },
                '&:disabled': { opacity: 0.3 },
                transition: 'all 0.2s ease'
              }}
            >
              <Icon icon="mdi:refresh" style={{ fontSize: '24px' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Center Next button for classified moves */}
        <Button
          variant="contained"
          onClick={jumpToNextClassifiedMove}
          disabled={!hasNextClassifiedMove}
          sx={{
            backgroundColor: '#4CAF50',
            borderRadius: '20px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 600,
            textTransform: 'none',
            minWidth: '100px',
            height: '48px',
            '&:hover': {
              backgroundColor: '#45a049',
              transform: 'scale(1.05)'
            },
            '&:disabled': {
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          Next
        </Button>

        {/* Right side - Next and Save */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Next Move">
            <IconButton
              onClick={() => addNextGameMoveToBoard()}
              disabled={!hasNextMove}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'white',
                width: '48px',
                height: '48px',
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  transform: 'scale(1.05)'
                },
                '&:disabled': { opacity: 0.3 },
                transition: 'all 0.2s ease'
              }}
            >
              <Icon icon="mdi:chevron-right" style={{ fontSize: '28px' }} />
            </IconButton>
          </Tooltip>

          {/* Save Button */}
          {gameFromUrl ? (
            <Tooltip title="Game saved in database">
              <IconButton 
                disabled={true} 
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  width: '48px',
                  height: '48px',
                  opacity: 0.5
                }}
              >
                <Icon icon="mdi:folder-check" style={{ fontSize: '24px' }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Save game">
              <IconButton
                onClick={handleSave}
                disabled={!enableSave}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  width: '48px',
                  height: '48px',
                  '&:hover': { 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    transform: 'scale(1.05)'
                  },
                  '&:disabled': { opacity: 0.3 },
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon icon="mdi:content-save" style={{ fontSize: '24px' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ width: '100%', padding: '0 24px', marginBottom: '8px' }}>
        <Box
          sx={{
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              height: '100%',
              backgroundColor: '#4CAF50',
              width: `${totalMoves > 0 ? (currentMoveIndex / totalMoves) * 100 : 0}%`,
              transition: 'width 0.3s ease',
              borderRadius: '2px'
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
