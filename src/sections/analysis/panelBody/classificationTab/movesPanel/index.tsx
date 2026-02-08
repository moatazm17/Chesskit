import { Grid2 as Grid, useMediaQuery, useTheme } from "@mui/material";
import MovesLine from "./movesLine";
import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom } from "../../../states";
import { MoveClassification } from "@/types/enums";

export default function MovesPanel() {
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const gameMoves = useMemo(() => {
    const gameHistory = game.history();
    const boardHistory = board.history();
    const history = gameHistory.length ? gameHistory : boardHistory;

    if (!history.length) return undefined;

    const moves: { san: string; moveClassification?: MoveClassification }[][] =
      [];

    for (let i = 0; i < history.length; i += 2) {
      const items = [
        {
          san: history[i],
          moveClassification: gameHistory.length
            ? gameEval?.positions[i + 1]?.moveClassification
            : undefined,
        },
      ];

      if (history[i + 1]) {
        items.push({
          san: history[i + 1],
          moveClassification: gameHistory.length
            ? gameEval?.positions[i + 2]?.moveClassification
            : undefined,
        });
      }

      moves.push(items);
    }

    return moves;
  }, [game, board, gameEval]);

  if (!gameMoves?.length) return null;

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="start"
      gap={0.3}
      paddingY={1}
      sx={{
        scrollbarWidth: "thin",
        overflowY: "auto",
        ...(isMobile
          ? {
              borderTop: "1px solid rgba(255,255,255,0.06)",
              pt: 1.5,
            }
          : {}),
      }}
      maxHeight="100%"
      size={isMobile ? 12 : 6}
      id="moves-panel"
    >
      {gameMoves?.map((moves, idx) => (
        <MovesLine
          key={`${moves.map(({ san }) => san).join()}-${idx}`}
          moves={moves}
          moveNb={idx + 1}
        />
      ))}
    </Grid>
  );
}
