import { IconButton, Tooltip, Button, Box } from "@mui/material";
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom } from "../states";
import { useChessActions } from "@/hooks/useChessActions";
import { useEffect, useCallback, useMemo } from "react";
import { MoveClassification } from "@/types/enums";

export default function PanelToolBar() {
  const board = useAtomValue(boardAtom);
  const game = useAtomValue(gameAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const { resetToStartingPosition: resetBoard, undoMove: undoBoardMove, playMove: playBoardMove } =
    useChessActions(boardAtom);

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

  // Jump to next classified move
  const jumpToNextClassifiedMove = useCallback(() => {
    const currentMoveIndex = boardHistory.length;
    const nextClassifiedMove = classifiedMoves.find(move => move.moveIndex > currentMoveIndex);
    
    if (nextClassifiedMove) {
      // Reset board first
      resetBoard();
      
      // Play moves up to the classified move
      const movesToPlay = game.history({ verbose: true }).slice(0, nextClassifiedMove.moveIndex);
      movesToPlay.forEach(move => {
        playBoardMove({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });
      });
    }
  }, [boardHistory.length, classifiedMoves, game, resetBoard, playBoardMove]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && boardHistory.length > 0) {
        undoBoardMove();
      } else if (e.key === "ArrowRight") {
        addNextGameMoveToBoard();
      } else if (e.key === "ArrowDown") {
        resetBoard();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoBoardMove, boardHistory.length, addNextGameMoveToBoard, resetBoard]);

  const currentMoveIndex = boardHistory.length;
  const totalMoves = gameHistory.length;
  const hasNextClassifiedMove = classifiedMoves.some(move => move.moveIndex > currentMoveIndex);
  const hasNextMove = boardHistory.length < gameHistory.length &&
    gameHistory.slice(0, boardHistory.length).join() === boardHistory.join();

  return (
        <Box 
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: '12px',
        margin: '16px 0',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        width: '100%',
        maxWidth: '200px',
        marginX: 'auto'
      }}
    >
      <Tooltip title="Retry Position">
        <IconButton
          onClick={() => resetBoard()}
          disabled={boardHistory.length === 0}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'white',
            width: '48px',
            height: '48px',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
            '&:disabled': { opacity: 0.3 }
          }}
        >
          <Icon icon="mdi:refresh" style={{ fontSize: '20px' }} />
        </IconButton>
      </Tooltip>

      {/* Progress bar */}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px' }}>
        <Box
          sx={{
            height: '100%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '0 0 12px 12px',
          }}
        >
          <Box
            sx={{
              height: '100%',
              backgroundColor: '#4CAF50',
              width: `${totalMoves > 0 ? (currentMoveIndex / totalMoves) * 100 : 0}%`,
              borderRadius: '0 0 12px 12px',
              transition: 'width 0.3s ease',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}