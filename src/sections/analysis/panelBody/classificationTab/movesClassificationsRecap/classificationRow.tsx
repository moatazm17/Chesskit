import { Color, MoveClassification } from "@/types/enums";
import { Box, Grid2 as Grid, Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom } from "../../../states";
import { useMemo } from "react";
import Image from "next/image";
import { capitalize } from "@/lib/helpers";
import { useChessActions } from "@/hooks/useChessActions";
import { CLASSIFICATION_COLORS } from "@/constants";

interface Props {
  classification: MoveClassification;
}

export default function ClassificationRow({ classification }: Props) {
  const gameEval = useAtomValue(gameEvalAtom);
  const board = useAtomValue(boardAtom);
  const game = useAtomValue(gameAtom);
  const { goToMove } = useChessActions(boardAtom);

  const whiteNb = useMemo(() => {
    if (!gameEval) return 0;
    return gameEval.positions.filter(
      (position, idx) =>
        idx % 2 !== 0 && position.moveClassification === classification
    ).length;
  }, [gameEval, classification]);

  const blackNb = useMemo(() => {
    if (!gameEval) return 0;
    return gameEval.positions.filter(
      (position, idx) =>
        idx % 2 === 0 && position.moveClassification === classification
    ).length;
  }, [gameEval, classification]);

  const handleClick = (color: Color) => {
    if (
      !gameEval ||
      (color === Color.White && !whiteNb) ||
      (color === Color.Black && !blackNb)
    ) {
      return;
    }

    const filterColor = (idx: number) =>
      (idx % 2 !== 0 && color === Color.White) ||
      (idx % 2 === 0 && color === Color.Black);
    const moveIdx = board.history().length;

    const nextPositionIdx = gameEval.positions.findIndex(
      (position, idx) =>
        filterColor(idx) &&
        position.moveClassification === classification &&
        idx > moveIdx
    );

    if (nextPositionIdx > 0) {
      goToMove(nextPositionIdx, game);
    } else {
      const firstPositionIdx = gameEval.positions.findIndex(
        (position, idx) =>
          filterColor(idx) && position.moveClassification === classification
      );
      if (firstPositionIdx > 0 && firstPositionIdx !== moveIdx) {
        goToMove(firstPositionIdx, game);
      }
    }
  };

  const classColor = CLASSIFICATION_COLORS[classification];

  return (
    <Grid
      container
      justifyContent="space-evenly"
      alignItems="center"
      wrap="nowrap"
      size={12}
      sx={{ py: 0.3 }}
    >
      {/* White count */}
      <Box
        onClick={() => handleClick(Color.White)}
        sx={{
          width: "3rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: whiteNb ? "pointer" : "default",
          opacity: whiteNb ? 1 : 0.3,
          "&:hover": whiteNb ? { opacity: 0.8 } : {},
        }}
      >
        <Box
          sx={{
            background: whiteNb ? `${classColor}22` : "transparent",
            borderRadius: "6px",
            px: 1,
            py: 0.3,
            minWidth: 28,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: whiteNb ? classColor : "rgba(255,255,255,0.2)",
            }}
          >
            {whiteNb}
          </Typography>
        </Box>
      </Box>

      {/* Classification label with icon */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          width: "7rem",
          justifyContent: "flex-start",
        }}
      >
        <Image
          src={`/icons/${classification}.png`}
          alt="move-icon"
          width={18}
          height={18}
          style={{
            maxWidth: "3.5vw",
            maxHeight: "3.5vw",
          }}
        />

        <Typography
          sx={{
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.75)",
            fontWeight: 500,
          }}
        >
          {capitalize(classification)}
        </Typography>
      </Box>

      {/* Black count */}
      <Box
        onClick={() => handleClick(Color.Black)}
        sx={{
          width: "3rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: blackNb ? "pointer" : "default",
          opacity: blackNb ? 1 : 0.3,
          "&:hover": blackNb ? { opacity: 0.8 } : {},
        }}
      >
        <Box
          sx={{
            background: blackNb ? `${classColor}22` : "transparent",
            borderRadius: "6px",
            px: 1,
            py: 0.3,
            minWidth: 28,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: blackNb ? classColor : "rgba(255,255,255,0.2)",
            }}
          >
            {blackNb}
          </Typography>
        </Box>
      </Box>
    </Grid>
  );
}
