import { MoveClassification } from "@/types/enums";
import { Grid2 as Grid } from "@mui/material";
import Image from "next/image";
import { useAtomValue } from "jotai";
import { boardAtom, currentPositionAtom, gameAtom } from "../../../states";
import { useChessActions } from "@/hooks/useChessActions";
import { memo, useEffect } from "react";
import { isInViewport } from "@/lib/helpers";
import { CLASSIFICATION_COLORS } from "@/constants";
import PrettyMoveSan from "@/components/prettyMoveSan";

interface Props {
  san: string;
  moveClassification?: MoveClassification;
  moveIdx: number;
  moveColor: "w" | "b";
}

function MoveItem({
  san,
  moveClassification,
  moveIdx,
  moveColor,
}: Props) {
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);
  const { goToMove } = useChessActions(boardAtom);
  const position = useAtomValue(currentPositionAtom);
  const color = getMoveColor(moveClassification);

  const isCurrentMove = position?.currentMoveIdx === moveIdx;

  useEffect(() => {
    if (!isCurrentMove) return;
    const moveItem = document.getElementById(`move-${moveIdx}`);
    if (!moveItem) return;

    const movePanel = document.getElementById("moves-panel");
    if (!movePanel || !isInViewport(movePanel)) return;

    moveItem.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isCurrentMove, moveIdx]);

  const handleClick = () => {
    if (isCurrentMove) return;
    const gameToUse = game.moveNumber() > 1 ? game : board;
    goToMove(moveIdx, gameToUse);
  };

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      gap={1}
      width="5rem"
      wrap="nowrap"
      onClick={handleClick}
      paddingY={0.5}
      sx={{
        cursor: isCurrentMove ? undefined : "pointer",
        backgroundColor: isCurrentMove
          ? "rgba(255,255,255,0.08)"
          : undefined,
        borderRadius: "6px",
        transition: "background-color 0.15s ease",
        "&:hover": !isCurrentMove
          ? { backgroundColor: "rgba(255,255,255,0.04)" }
          : {},
      }}
      id={`move-${moveIdx}`}
    >
      {color && (
        <Image
          src={`/icons/${moveClassification}.png`}
          alt="move-icon"
          width={14}
          height={14}
          style={{
            maxWidth: "3.5vw",
            maxHeight: "3.5vw",
          }}
        />
      )}

      <PrettyMoveSan
        san={san}
        color={moveColor}
        typographyProps={{ fontSize: "0.9rem" }}
      />
    </Grid>
  );
}

export default memo(MoveItem);

const getMoveColor = (moveClassification?: MoveClassification) => {
  if (
    !moveClassification ||
    moveClassificationsToIgnore.includes(moveClassification)
  ) {
    return undefined;
  }

  return CLASSIFICATION_COLORS[moveClassification];
};

const moveClassificationsToIgnore: MoveClassification[] = [
  MoveClassification.Okay,
  MoveClassification.Excellent,
  MoveClassification.Forced,
];
