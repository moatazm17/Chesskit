import { Box, Collapse, Stack, Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import {
  boardAtom,
  currentPositionAtom,
  gameEvalAtom,
} from "@/sections/analysis/states";
import { useMemo, useState } from "react";
import {
  getMoveExplanation,
  MoveExplanation as MoveExplanationType,
} from "@/lib/engine/helpers/moveExplanation";
import { MoveClassification } from "@/types/enums";
import { Icon } from "@iconify/react";
import PrettyMoveSan from "@/components/prettyMoveSan";

const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  [MoveClassification.Blunder]: "#e53935",
  [MoveClassification.Mistake]: "#f57c00",
  [MoveClassification.Inaccuracy]: "#ffb74d",
  [MoveClassification.Okay]: "#9ccc65",
  [MoveClassification.Excellent]: "#66bb6a",
  [MoveClassification.Best]: "#4caf50",
  [MoveClassification.Forced]: "#90a4ae",
  [MoveClassification.Opening]: "#78909c",
  [MoveClassification.Perfect]: "#2196f3",
  [MoveClassification.Splendid]: "#00bcd4",
};

const CLASSIFICATION_ICONS: Record<MoveClassification, string> = {
  [MoveClassification.Blunder]: "mdi:close-circle",
  [MoveClassification.Mistake]: "mdi:close",
  [MoveClassification.Inaccuracy]: "mdi:help-circle",
  [MoveClassification.Okay]: "mdi:circle-outline",
  [MoveClassification.Excellent]: "mdi:thumb-up",
  [MoveClassification.Best]: "mdi:check-circle",
  [MoveClassification.Forced]: "mdi:lock",
  [MoveClassification.Opening]: "mdi:book-open-variant",
  [MoveClassification.Perfect]: "mdi:exclamation-thick",
  [MoveClassification.Splendid]: "mdi:star",
};

export default function MoveExplanationComponent() {
  const position = useAtomValue(currentPositionAtom);
  const board = useAtomValue(boardAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const [expanded, setExpanded] = useState(false);

  const explanation = useMemo((): MoveExplanationType | undefined => {
    if (!position?.lastMove || !position?.eval?.moveClassification) {
      return undefined;
    }

    const history = board.history({ verbose: true });
    const currentMoveIdx = history.length;

    const previousFen =
      currentMoveIdx > 0 ? history[currentMoveIdx - 1]?.before : undefined;

    const previousEval = gameEval?.positions?.[currentMoveIdx - 1];

    return getMoveExplanation(position, previousFen, previousEval);
  }, [position, board, gameEval]);

  const moveClassification = position?.eval?.moveClassification;

  if (!explanation || !moveClassification) {
    return null;
  }

  const color = CLASSIFICATION_COLORS[moveClassification];
  const icon = CLASSIFICATION_ICONS[moveClassification];
  const isNegative = [
    MoveClassification.Blunder,
    MoveClassification.Mistake,
    MoveClassification.Inaccuracy,
  ].includes(moveClassification);

  const hasMoreDetails =
    (explanation.details && explanation.details.length > 0) ||
    (explanation.bestLine && explanation.bestLine.length > 0);

  return (
    <Box
      onClick={() => hasMoreDetails && setExpanded(!expanded)}
      sx={{
        width: "100%",
        mt: 0.25,
        mb: 0.25,
        px: 1,
        py: 0.5,
        borderRadius: "8px",
        background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
        border: `1px solid ${color}40`,
        cursor: hasMoreDetails ? "pointer" : "default",
        transition: "all 0.2s ease",
        "&:hover": hasMoreDetails
          ? {
              background: `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)`,
            }
          : {},
      }}
    >
      {/* Main line - always visible */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ minHeight: 24 }}
      >
        <Icon
          icon={icon}
          width={16}
          height={16}
          style={{ color, flexShrink: 0 }}
        />
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{ color, fontSize: "0.75rem", flexShrink: 0 }}
        >
          {explanation.title}:
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.primary",
            fontWeight: 500,
            fontSize: "0.72rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {explanation.description}
        </Typography>
        {hasMoreDetails && (
          <Icon
            icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
            width={16}
            height={16}
            style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }}
          />
        )}
      </Stack>

      {/* Expanded details */}
      <Collapse in={expanded} timeout={150}>
        <Stack spacing={0.5} sx={{ mt: 0.5, pl: 2.5 }}>
          {/* Details list */}
          {explanation.details?.map((detail, idx) => (
            <Stack
              key={idx}
              direction="row"
              alignItems="center"
              spacing={0.5}
            >
              <Icon
                icon={isNegative ? "mdi:arrow-right" : "mdi:check"}
                width={12}
                height={12}
                style={{
                  color: isNegative ? "#ffb74d" : "#66bb6a",
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.7rem",
                }}
              >
                {detail}
              </Typography>
            </Stack>
          ))}

          {/* Best line */}
          {explanation.bestLine && explanation.bestLine.length > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                }}
              >
                Best line:
              </Typography>
              {explanation.bestLine.map((moveSan, idx) => {
                const moveColor =
                  idx % 2 === 0
                    ? (position.lastMove?.color ?? "w")
                    : position.lastMove?.color === "w"
                      ? "b"
                      : "w";
                return (
                  <PrettyMoveSan
                    key={idx}
                    san={moveSan}
                    color={moveColor}
                    additionalText={
                      idx < explanation.bestLine!.length - 1 ? "," : ""
                    }
                    typographyProps={{
                      fontSize: "0.7rem",
                      fontWeight: 500,
                    }}
                  />
                );
              })}
            </Stack>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
