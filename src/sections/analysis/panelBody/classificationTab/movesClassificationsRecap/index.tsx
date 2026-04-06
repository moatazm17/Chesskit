import { usePlayersData } from "@/hooks/usePlayersData";
import { Box, Grid2 as Grid, Typography, useMediaQuery, useTheme } from "@mui/material";
import { gameAtom, gameEvalAtom } from "../../../states";
import { MoveClassification } from "@/types/enums";
import ClassificationRow from "./classificationRow";
import { useAtomValue } from "jotai";

export default function MovesClassificationsRecap() {
  const { white, black } = usePlayersData(gameAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (!gameEval?.positions.length) return null;

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      rowGap={0.5}
      sx={{
        scrollbarWidth: "thin",
        overflowY: "auto",
        ...(isMobile
          ? {
              width: "100%",
              maxHeight: "none",
              pb: 1,
            }
          : {
              height: "100%",
              maxHeight: "22rem",
            }),
      }}
      size={isMobile ? 12 : 6}
    >
      {/* Header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          width: "100%",
          px: 1,
          py: 0.8,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          mb: 0.5,
        }}
      >
        <Typography
          align="center"
          noWrap
          sx={{
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.5)",
            fontWeight: 600,
          }}
        >
          {white.name}
        </Typography>

        <Box sx={{ width: "7rem" }} />

        <Typography
          align="center"
          noWrap
          sx={{
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.5)",
            fontWeight: 600,
          }}
        >
          {black.name}
        </Typography>
      </Box>

      {sortedMoveClassfications.map((classification) => (
        <ClassificationRow
          key={classification}
          classification={classification}
        />
      ))}
    </Grid>
  );
}

export const sortedMoveClassfications = [
  MoveClassification.Brilliant,
  MoveClassification.Perfect,
  MoveClassification.Best,
  MoveClassification.Excellent,
  MoveClassification.Okay,
  MoveClassification.Opening,
  MoveClassification.Inaccuracy,
  MoveClassification.Miss,
  MoveClassification.Mistake,
  MoveClassification.Blunder,
];
