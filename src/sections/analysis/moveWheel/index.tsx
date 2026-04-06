import { Box, IconButton, Typography } from "@mui/material";
import { Icon } from "@iconify/react";
import { useAtomValue } from "jotai";
import { boardAtom, gameAtom, gameEvalAtom, currentPositionAtom } from "../states";
import { useChessActions } from "@/hooks/useChessActions";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { MoveClassification } from "@/types/enums";
import { CLASSIFICATION_COLORS } from "@/constants";
import Image from "next/image";

interface WheelMove {
  san: string;
  moveIndex: number;
  moveClassification?: MoveClassification;
  moveColor: "w" | "b";
  moveNumber?: number;
}

const classificationsToHide: MoveClassification[] = [
  MoveClassification.Okay,
  MoveClassification.Excellent,
  MoveClassification.Forced,
];

export default function MoveWheel() {
  const game = useAtomValue(gameAtom);
  const board = useAtomValue(boardAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const position = useAtomValue(currentPositionAtom);
  const { goToMove } = useChessActions(boardAtom);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMoveRef = useRef<HTMLDivElement>(null);

  const currentMoveIdx = position?.currentMoveIdx ?? board.history().length;

  const moves = useMemo<WheelMove[]>(() => {
    const gameHistory = game.history();
    const boardHistory = board.history();
    const history = gameHistory.length ? gameHistory : boardHistory;

    if (!history.length) return [];

    return history.map((san, i) => ({
      san,
      moveIndex: i + 1,
      moveClassification: gameHistory.length
        ? gameEval?.positions[i + 1]?.moveClassification
        : undefined,
      moveColor: (i % 2 === 0 ? "w" : "b") as "w" | "b",
      moveNumber: i % 2 === 0 ? Math.floor(i / 2) + 1 : undefined,
    }));
  }, [game, board, gameEval]);

  useEffect(() => {
    if (!currentMoveRef.current || !scrollRef.current) return;
    currentMoveRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentMoveIdx]);

  const handleMoveClick = useCallback(
    (moveIndex: number) => {
      const gameToUse = game.moveNumber() > 1 ? game : board;
      goToMove(moveIndex, gameToUse);
    },
    [game, board, goToMove]
  );

  const scrollBy = useCallback((direction: number) => {
    scrollRef.current?.scrollBy({ left: direction * 160, behavior: "smooth" });
  }, []);

  if (!moves.length) return null;

  return (
    <Box
      sx={{
        width: "100%",
        padding: "0 24px",
        marginBottom: "8px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.4)",
          borderRadius: "10px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <IconButton
          onClick={() => scrollBy(-1)}
          size="small"
          sx={{
            color: "rgba(255,255,255,0.5)",
            borderRadius: 0,
            minWidth: "28px",
            height: "36px",
            flexShrink: 0,
            "&:hover": { color: "white", backgroundColor: "rgba(255,255,255,0.08)" },
          }}
        >
          <Icon icon="mdi:chevron-left" style={{ fontSize: "18px" }} />
        </IconButton>

        <Box
          ref={scrollRef}
          sx={{
            display: "flex",
            alignItems: "center",
            overflowX: "auto",
            flex: 1,
            gap: "2px",
            padding: "4px 0",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {moves.map((move) => {
            const isCurrent = currentMoveIdx === move.moveIndex;
            const classification = move.moveClassification;
            const showIcon =
              classification && !classificationsToHide.includes(classification);
            const color = showIcon
              ? CLASSIFICATION_COLORS[classification!]
              : undefined;

            return (
              <Box
                key={move.moveIndex}
                ref={isCurrent ? currentMoveRef : undefined}
                onClick={() => handleMoveClick(move.moveIndex)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "4px 6px",
                  borderRadius: "6px",
                  cursor: isCurrent ? "default" : "pointer",
                  backgroundColor: isCurrent
                    ? "rgba(76,175,80,0.25)"
                    : "transparent",
                  border: isCurrent
                    ? "1px solid rgba(76,175,80,0.4)"
                    : "1px solid transparent",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                  "&:hover": !isCurrent
                    ? { backgroundColor: "rgba(255,255,255,0.08)" }
                    : {},
                }}
              >
                {move.moveNumber && (
                  <Typography
                    component="span"
                    sx={{
                      fontSize: "0.65rem",
                      color: "rgba(255,255,255,0.35)",
                      fontWeight: 600,
                      marginRight: "1px",
                    }}
                  >
                    {move.moveNumber}.
                  </Typography>
                )}

                {showIcon && (
                  <Image
                    src={`/icons/${classification}.png`}
                    alt=""
                    width={12}
                    height={12}
                    style={{ flexShrink: 0 }}
                  />
                )}

                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.8rem",
                    fontWeight: isCurrent ? 700 : 500,
                    color: color ?? (isCurrent ? "#fff" : "rgba(255,255,255,0.75)"),
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                  }}
                >
                  {move.san}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <IconButton
          onClick={() => scrollBy(1)}
          size="small"
          sx={{
            color: "rgba(255,255,255,0.5)",
            borderRadius: 0,
            minWidth: "28px",
            height: "36px",
            flexShrink: 0,
            "&:hover": { color: "white", backgroundColor: "rgba(255,255,255,0.08)" },
          }}
        >
          <Icon icon="mdi:chevron-right" style={{ fontSize: "18px" }} />
        </IconButton>
      </Box>
    </Box>
  );
}
