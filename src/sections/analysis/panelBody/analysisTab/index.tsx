import {
  Grid2 as Grid,
  Grid2Props as GridProps,
  Stack,
  Typography,
} from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom } from "../../states";
import PlayersMetric from "./playersMetric";
import MoveInfo from "./moveInfo";
import Opening from "./opening";
import EngineLines from "./engineLines";

export default function AnalysisTab(props: GridProps) {
  const gameEval = useAtomValue(gameEvalAtom);
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);

  const boardHistory = board.history();
  const gameHistory = game.history();

  const isGameOver =
    boardHistory.length > 0 &&
    (board.isCheckmate() ||
      board.isDraw() ||
      boardHistory.join() === gameHistory.join());

  return (
    <Grid
      container
      size={12}
      justifyContent={{ xs: "center", lg: gameEval ? "start" : "center" }}
      alignItems="start"
      flexWrap={{ lg: gameEval ? "nowrap" : undefined }}
      gap={3}
      marginY={{ lg: gameEval ? 1 : undefined }}
      paddingX={{ xs: 2, lg: "calc(4% - 2rem)" }}
      {...props}
      sx={props.hidden ? { display: "none" } : { ...props.sx, padding: '16px' }}
    >
      <Stack
        justifyContent="center"
        alignItems="center"
        rowGap={2}
        minWidth={gameEval ? "min(25rem, 95vw)" : undefined}
        sx={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          width: '100%',
        }}
      >
        {gameEval && (
          <PlayersMetric
            title="Accuracy"
            whiteValue={`${gameEval.accuracy.white.toFixed(1)}%`}
            blackValue={`${gameEval.accuracy.black.toFixed(1)}%`}
          />
        )}

        {gameEval?.estimatedElo && (
          <PlayersMetric
            title="Rating"
            whiteValue={Math.round(gameEval.estimatedElo.white)}
            blackValue={Math.round(gameEval.estimatedElo.black)}
          />
        )}

        <MoveInfo />

        <Opening />

        {isGameOver && (
          <Typography 
            align="center" 
            sx={{
              fontSize: '0.85rem',
              color: '#66BB6A',
              fontWeight: 600,
              background: 'rgba(102,187,106,0.08)',
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid rgba(102,187,106,0.2)',
              marginTop: 1,
            }}
          >
            Game Completed
          </Typography>
        )}
      </Stack>

      <EngineLines size={{ lg: gameEval ? undefined : 12 }} />
    </Grid>
  );
}
