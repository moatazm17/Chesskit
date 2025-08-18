import { Icon } from "@iconify/react";
import { Grid2 as Grid, IconButton, Tooltip } from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom } from "../states";
import { useChessActions } from "@/hooks/useChessActions";
import { useCallback, useEffect } from "react";

export default function NextMoveButton() {
  const { playMove: playBoardMove } = useChessActions(boardAtom);
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);

  const gameHistory = game.history();
  const boardHistory = board.history();

  const isButtonEnabled =
    boardHistory.length < gameHistory.length &&
    gameHistory.slice(0, boardHistory.length).join() === boardHistory.join();

  const addNextGameMoveToBoard = useCallback(() => {
    if (!isButtonEnabled) return;

    const nextMoveIndex = boardHistory.length;
    const nextMove = game.history({ verbose: true })[nextMoveIndex];
    const comment = game
      .getComments()
      .find((c) => c.fen === nextMove.after)?.comment;

    if (nextMove) {
      // Notify Flutter WebView to show an interstitial ad occasionally
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w: any = typeof window !== "undefined" ? window : undefined;
        if (w && w.showInterstitialAd && typeof w.showInterstitialAd.postMessage === "function") {
          // Throttle via random chance (10%) to avoid too frequent ads
          if (Math.random() < 0.1) {
            w.showInterstitialAd.postMessage("next_move");
          }
        }
      } catch {
        // ignore if not in WebView
      }

      playBoardMove({
        from: nextMove.from,
        to: nextMove.to,
        promotion: nextMove.promotion,
        comment,
      });
    }
  }, [isButtonEnabled, boardHistory, game, playBoardMove]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        addNextGameMoveToBoard();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [addNextGameMoveToBoard]);

  return (
    <Tooltip title="Go to next move">
      <Grid>
        <IconButton
          onClick={() => addNextGameMoveToBoard()}
          disabled={!isButtonEnabled}
          sx={{ paddingX: 1.2, paddingY: 0.5 }}
        >
          <Icon icon="ri:arrow-right-s-line" height={24} />
        </IconButton>
      </Grid>
    </Tooltip>
  );
}
