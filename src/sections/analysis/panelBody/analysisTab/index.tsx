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
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          width: '100%'
        }}
      >
        {gameEval && (
          <PlayersMetric
            title="🎯 Accuracy"
            whiteValue={`${gameEval.accuracy.white.toFixed(1)}%`}
            blackValue={`${gameEval.accuracy.black.toFixed(1)}%`}
          />
        )}

        {gameEval?.estimatedElo && (
          <PlayersMetric
            title="📊 Game Rating"
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
              fontSize: '1rem',
              color: '#4CAF50',
              fontWeight: 600,
              background: 'rgba(76,175,80,0.1)',
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(76,175,80,0.3)',
              marginTop: 2
            }}
          >
            🏁 Game Completed
          </Typography>
        )}
      </Stack>

      <EngineLines size={{ lg: gameEval ? undefined : 12 }} />
    </Grid>
  );
}
