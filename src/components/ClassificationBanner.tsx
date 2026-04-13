import { Box, Collapse, Stack, Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import {
  boardAtom,
  currentPositionAtom,
  gameEvalAtom,
} from "@/sections/analysis/states";
import { memo, useMemo, useState } from "react";
import {
  getMoveExplanation,
  MoveExplanation as MoveExplanationType,
} from "@/lib/engine/helpers/moveExplanation";
import { MoveClassification } from "@/types/enums";
import { Icon } from "@iconify/react";
import PrettyMoveSan from "@/components/prettyMoveSan";
import { useTranslation } from "@/lib/i18n";
import { getEvaluationBarValue } from "@/lib/chess";

const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  [MoveClassification.Brilliant]: "#26C6DA",
  [MoveClassification.Great]: "#42A5F5",
  [MoveClassification.Best]: "#66BB6A",
  [MoveClassification.Excellent]: "#8BC34A",
  [MoveClassification.Good]: "#9ccc65",
  [MoveClassification.Forced]: "#78909c",
  [MoveClassification.Book]: "#78909c",
  [MoveClassification.Inaccuracy]: "#F9A825",
  [MoveClassification.Miss]: "#FF8F00",
  [MoveClassification.Mistake]: "#FF6D00",
  [MoveClassification.Blunder]: "#E53935",
};

const CLASSIFICATION_ICONS: Record<MoveClassification, string> = {
  [MoveClassification.Brilliant]: "mdi:star-four-points",
  [MoveClassification.Great]: "mdi:exclamation-thick",
  [MoveClassification.Best]: "mdi:check-bold",
  [MoveClassification.Excellent]: "mdi:thumb-up",
  [MoveClassification.Good]: "mdi:circle-outline",
  [MoveClassification.Forced]: "mdi:lock",
  [MoveClassification.Book]: "mdi:book-open-variant",
  [MoveClassification.Inaccuracy]: "mdi:help-circle",
  [MoveClassification.Miss]: "mdi:target",
  [MoveClassification.Mistake]: "mdi:close",
  [MoveClassification.Blunder]: "mdi:close-circle",
};

const CLASSIFICATION_LABELS: Record<MoveClassification, string> = {
  [MoveClassification.Brilliant]: "brilliant",
  [MoveClassification.Great]: "great",
  [MoveClassification.Best]: "best",
  [MoveClassification.Excellent]: "excellent",
  [MoveClassification.Good]: "good",
  [MoveClassification.Forced]: "forced",
  [MoveClassification.Book]: "book",
  [MoveClassification.Inaccuracy]: "inaccuracy",
  [MoveClassification.Miss]: "miss",
  [MoveClassification.Mistake]: "mistake",
  [MoveClassification.Blunder]: "blunder",
};

function ClassificationBannerComponent() {
  const position = useAtomValue(currentPositionAtom);
  const board = useAtomValue(boardAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const { t } = useTranslation();
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

    return getMoveExplanation(position, previousFen, previousEval, t);
  }, [position, board, gameEval, t]);

  const moveClassification = position?.eval?.moveClassification;

  const evalLabel = useMemo(() => {
    const bestLine = position?.eval?.lines?.[0];
    if (!bestLine || !position?.eval) return null;

    const evalData = getEvaluationBarValue(position.eval);
    const cp = bestLine.cp;
    const prefix = cp !== undefined && cp > 0 ? "+" : "";
    return `${prefix}${evalData.label}`;
  }, [position]);

  if (!explanation || !moveClassification) {
    return (
      <Box
        sx={{
          width: "100%",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
        }}
      >
        <Typography
          sx={{
            color: "rgba(255,255,255,0.3)",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          {t("gameReview")}
        </Typography>
      </Box>
    );
  }

  const color = CLASSIFICATION_COLORS[moveClassification];
  const icon = CLASSIFICATION_ICONS[moveClassification];
  const label = CLASSIFICATION_LABELS[moveClassification];
  const moveSan = position.lastMove?.san;

  const hasDetails =
    (explanation.details && explanation.details.length > 0) ||
    (explanation.bestLine && explanation.bestLine.length > 0);

  const isNegative = [
    MoveClassification.Blunder,
    MoveClassification.Mistake,
    MoveClassification.Miss,
    MoveClassification.Inaccuracy,
  ].includes(moveClassification);

  return (
    <Box
      onClick={() => hasDetails && setExpanded(!expanded)}
      sx={{
        width: "100%",
        borderRadius: "12px",
        background: `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)`,
        border: `1.5px solid ${color}50`,
        cursor: hasDetails ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {/* Main row - fixed height, never changes */}
      <Box sx={{ display: "flex", alignItems: "center", height: 56, px: 1.5, direction: "rtl" }}>
        {/* Icon */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            backgroundColor: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: `0 2px 8px ${color}60`,
          }}
        >
          {moveClassification === MoveClassification.Brilliant ? (
            <Typography
              sx={{ color: "white", fontWeight: 900, fontSize: "14px" }}
            >
              !!
            </Typography>
          ) : (
            <Icon icon={icon} style={{ fontSize: 20, color: "white" }} />
          )}
        </Box>

        {/* Title + Description */}
        <Stack sx={{ mr: 1.2, flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography
              sx={{
                color,
                fontWeight: 800,
                fontSize: "0.95rem",
                lineHeight: 1.2,
              }}
            >
              {t(label)}
            </Typography>
            {moveSan && (
              <PrettyMoveSan
                san={moveSan}
                color={position.lastMove?.color ?? "w"}
                typographyProps={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color,
                }}
              />
            )}
          </Stack>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.72rem",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {explanation.description}
          </Typography>
        </Stack>

        {/* Eval badge */}
        {evalLabel && (
          <Box
            sx={{
              backgroundColor: "rgba(255,255,255,0.12)",
              borderRadius: "8px",
              px: 1,
              py: 0.4,
            mr: 1,
            flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                color: "white",
                fontWeight: 700,
                fontSize: "0.85rem",
                fontFamily: "monospace",
              }}
            >
              {evalLabel}
            </Typography>
          </Box>
        )}

        {/* Expand chevron */}
        {hasDetails && (
          <Icon
            icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
            width={20}
            height={20}
            style={{
              color: "rgba(255,255,255,0.4)",
              flexShrink: 0,
              marginRight: 4,
            }}
          />
        )}
      </Box>

      {/* Expanded details */}
      <Collapse in={expanded} timeout={150}>
        <Box sx={{ px: 1.5, pb: 1.2, direction: "rtl" }}>
          {/* Details as a single paragraph */}
          {explanation.details && explanation.details.length > 0 && (
            <Typography
              sx={{
                color: "rgba(255,255,255,0.65)",
                fontSize: "0.76rem",
                lineHeight: 1.6,
                mt: 0.3,
              }}
            >
              {explanation.details.join(" · ")}
            </Typography>
          )}

          {/* Best line - LTR since it's chess notation */}
          {explanation.bestLine && explanation.bestLine.length > 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                mt: 0.5,
                direction: "ltr",
                justifyContent: "flex-end",
              }}
            >
              <Typography
                component="span"
                sx={{
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                  fontSize: "0.72rem",
                }}
              >
                {t("explBestLine")}
              </Typography>
              {explanation.bestLine.map((san, idx) => {
                const moveColor =
                  idx % 2 === 0
                    ? (position.lastMove?.color ?? "w")
                    : position.lastMove?.color === "w"
                      ? "b"
                      : "w";
                return (
                  <PrettyMoveSan
                    key={idx}
                    san={san}
                    color={moveColor}
                    additionalText={
                      idx < explanation.bestLine!.length - 1 ? "," : ""
                    }
                    typographyProps={{
                      fontSize: "0.73rem",
                      fontWeight: 500,
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

export default memo(ClassificationBannerComponent);
