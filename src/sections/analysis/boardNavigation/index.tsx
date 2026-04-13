import { IconButton, Box, Button } from "@mui/material";
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom } from "../states";
import { useChessActions } from "@/hooks/useChessActions";
import { useCallback, useEffect, useMemo } from "react";
import { MoveClassification } from "@/types/enums";
import { useTranslation } from "@/lib/i18n";
import MoveWheel from "../moveWheel";

export default function BoardNavigation() {
  const { t } = useTranslation();
  const board = useAtomValue(boardAtom);
  const game = useAtomValue(gameAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const {
    undoMove: undoBoardMove,
    playMove: playBoardMove,
    goToMove,
    resetToStartingPosition: resetBoard,
  } = useChessActions(boardAtom);

  const boardHistory = board.history();
  const gameHistory = game.history();

  const classifiedMoves = useMemo(() => {
    if (!gameEval?.positions) return [];

    const importantClassifications = [
      MoveClassification.Brilliant,
      MoveClassification.Great,
      MoveClassification.Best,
      MoveClassification.Miss,
      MoveClassification.Mistake,
      MoveClassification.Inaccuracy,
      MoveClassification.Blunder,
    ];

    return gameEval.positions
      .map((pos, index) => ({ ...pos, moveIndex: index }))
      .filter(
        (pos) =>
          pos.moveClassification &&
          importantClassifications.includes(pos.moveClassification)
      );
  }, [gameEval]);

  const addNextGameMoveToBoard = useCallback(() => {
    const isButtonEnabled =
      boardHistory.length < gameHistory.length &&
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

  const jumpToNextClassifiedMove = useCallback(() => {
    const currentMoveIndex = boardHistory.length;
    const nextClassifiedMove = classifiedMoves.find(
      (move) => move.moveIndex > currentMoveIndex
    );

    if (nextClassifiedMove) {
      goToMove(nextClassifiedMove.moveIndex, game);
    }
  }, [boardHistory.length, classifiedMoves, game, goToMove]);

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

  const hasNextClassifiedMove = classifiedMoves.some(
    (move) => move.moveIndex > boardHistory.length
  );

  return (
    <Box sx={{ width: "100%", maxWidth: "600px", marginX: "auto" }}>
      {/* Move strip */}
      {gameEval && <MoveWheel />}

      {/* Navigation row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          px: 2,
          pb: 1,
        }}
      >
        <IconButton
          onClick={() => resetBoard()}
          disabled={boardHistory.length === 0}
          sx={{
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: "12px",
            color: "white",
            width: 40,
            height: 40,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.15)",
            },
            "&:disabled": { opacity: 0.25 },
          }}
        >
          <Icon icon="mdi:refresh" style={{ fontSize: "20px" }} />
        </IconButton>

        <IconButton
          onClick={() => undoBoardMove()}
          disabled={boardHistory.length === 0}
          sx={{
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: "12px",
            color: "white",
            width: 40,
            height: 40,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.15)",
            },
            "&:disabled": { opacity: 0.25 },
          }}
        >
          <Icon icon="mdi:chevron-left" style={{ fontSize: "24px" }} />
        </IconButton>

        <Button
          variant="contained"
          onClick={jumpToNextClassifiedMove}
          disabled={!hasNextClassifiedMove}
          sx={{
            backgroundColor: "#4CAF50",
            borderRadius: "16px",
            px: 3,
            py: 1,
            fontSize: "0.95rem",
            fontWeight: 700,
            textTransform: "none",
            minWidth: 100,
            height: 40,
            flex: 1,
            maxWidth: 180,
            "&:hover": {
              backgroundColor: "#45a049",
            },
            "&:disabled": {
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.25)",
            },
          }}
        >
          {t("next")}
        </Button>

        <IconButton
          onClick={() => addNextGameMoveToBoard()}
          disabled={
            !(
              boardHistory.length < gameHistory.length &&
              gameHistory.slice(0, boardHistory.length).join() ===
                boardHistory.join()
            )
          }
          sx={{
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: "12px",
            color: "white",
            width: 40,
            height: 40,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.15)",
            },
            "&:disabled": { opacity: 0.25 },
          }}
        >
          <Icon icon="mdi:chevron-right" style={{ fontSize: "24px" }} />
        </IconButton>
      </Box>
    </Box>
  );
}
