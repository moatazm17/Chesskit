import { Box, Grid2 as Grid } from "@mui/material";
import { Chessboard } from "react-chessboard";
import { PrimitiveAtom, atom, useAtomValue, useSetAtom } from "jotai";
import {
  Arrow,
  CustomPieces,
  CustomSquareRenderer,
  Piece,
  PromotionPieceOption,
  Square,
} from "react-chessboard/dist/chessboard/types";
import { useChessActions } from "@/hooks/useChessActions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, MoveClassification } from "@/types/enums";
import { Chess } from "chess.js";
import { getSquareRenderer } from "./squareRenderer";
import { CurrentPosition } from "@/types/eval";
import EvaluationBar from "./evaluationBar";
import { BOARD_COLORS, CLASSIFICATION_COLORS } from "@/constants";
import { Player } from "@/types/game";
import PlayerHeader from "./playerHeader";
import { pieceSetAtom } from "./states";
import MoveExplanation from "@/components/MoveExplanation";

export interface Props {
  id: string;
  canPlay?: Color | boolean;
  gameAtom: PrimitiveAtom<Chess>;
  boardSize?: number;
  whitePlayer: Player;
  blackPlayer: Player;
  boardOrientation?: Color;
  currentPositionAtom?: PrimitiveAtom<CurrentPosition>;
  showBestMoveArrow?: boolean;
  showPlayerMoveIconAtom?: PrimitiveAtom<boolean>;
  showEvaluationBar?: boolean;
  showMoveExplanation?: boolean;
}

export default function Board({
  id: boardId,
  canPlay,
  gameAtom,
  boardSize,
  whitePlayer,
  blackPlayer,
  boardOrientation = Color.White,
  currentPositionAtom = atom({}),
  showBestMoveArrow = false,
  showPlayerMoveIconAtom,
  showEvaluationBar = false,
  showMoveExplanation = false,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const game = useAtomValue(gameAtom);
  const { playMove } = useChessActions(gameAtom);
  const clickedSquaresAtom = useMemo(() => atom<Square[]>([]), []);
  const setClickedSquares = useSetAtom(clickedSquaresAtom);
  const playableSquaresAtom = useMemo(() => atom<Square[]>([]), []);
  const setPlayableSquares = useSetAtom(playableSquaresAtom);
  const position = useAtomValue(currentPositionAtom);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [moveClickFrom, setMoveClickFrom] = useState<Square | null>(null);
  const [moveClickTo, setMoveClickTo] = useState<Square | null>(null);
  const pieceSet = useAtomValue(pieceSetAtom);
  const captureSquaresAtom = useMemo(() => atom<Square[]>([]), []);

  const gameFen = game.fen();

  useEffect(() => {
    setClickedSquares([]);
  }, [gameFen, setClickedSquares]);

  const isPiecePlayable = useCallback(
    ({ piece }: { piece: string }): boolean => {
      if (game.isGameOver() || !canPlay) return false;
      if (canPlay === true || canPlay === piece[0]) return true;
      return false;
    },
    [canPlay, game]
  );

  // Convert king-to-rook drops into proper castling moves
  const getCastlingTarget = useCallback(
    (source: Square, target: Square, piece: string): Square => {
      // Only applies to king moves
      if (piece[1] !== "K") return target;
      const isWhite = piece[0] === "w";
      const kingStart = isWhite ? "e1" : "e8";
      if (source !== kingStart) return target;

      // King dropped on rook's square → convert to castling destination
      if (isWhite) {
        if (target === "h1" || target === "g1") return "g1" as Square;
        if (target === "a1" || target === "c1") return "c1" as Square;
      } else {
        if (target === "h8" || target === "g8") return "g8" as Square;
        if (target === "a8" || target === "c8") return "c8" as Square;
      }
      return target;
    },
    []
  );

  const onPieceDrop = useCallback(
    (source: Square, target: Square, piece: string): boolean => {
      if (!isPiecePlayable({ piece })) return false;

      const actualTarget = getCastlingTarget(source, target, piece);

      const result = playMove({
        from: source,
        to: actualTarget,
        promotion: piece[1]?.toLowerCase() ?? "q",
      });

      return !!result;
    },
    [isPiecePlayable, playMove, getCastlingTarget]
  );

  const setCaptureSquares = useSetAtom(captureSquaresAtom);

  const resetMoveClick = useCallback(
    (square?: Square | null) => {
      setMoveClickFrom(square ?? null);
      setMoveClickTo(null);
      setShowPromotionDialog(false);
      if (square) {
        const moves = game.moves({ square, verbose: true });
        const targets = moves.map((m) => m.to);

        // If king is selected and can castle, also show the rook squares as targets
        const piece = game.get(square);
        if (piece && piece.type === "k") {
          const isWhite = piece.color === "w";
          if (isWhite && square === "e1") {
            if (targets.includes("g1" as Square) && !targets.includes("h1" as Square))
              targets.push("h1" as Square);
            if (targets.includes("c1" as Square) && !targets.includes("a1" as Square))
              targets.push("a1" as Square);
          } else if (!isWhite && square === "e8") {
            if (targets.includes("g8" as Square) && !targets.includes("h8" as Square))
              targets.push("h8" as Square);
            if (targets.includes("c8" as Square) && !targets.includes("a8" as Square))
              targets.push("a8" as Square);
          }
        }

        setPlayableSquares(targets);
        setCaptureSquares(
          moves.filter((m) => m.captured).map((m) => m.to)
        );
      } else {
        setPlayableSquares([]);
        setCaptureSquares([]);
      }
    },
    [setMoveClickFrom, setMoveClickTo, setPlayableSquares, setCaptureSquares, game]
  );

  const handleSquareLeftClick = useCallback(
    (square: Square, piece?: string) => {
      setClickedSquares([]);

      if (!moveClickFrom) {
        if (piece && !isPiecePlayable({ piece })) return;
        resetMoveClick(square);
        return;
      }

      const validMoves = game.moves({ square: moveClickFrom, verbose: true });
      // Check direct match or castling via rook square
      let move = validMoves.find((m) => m.to === square);
      if (!move) {
        // Handle clicking on rook square for castling
        const selectedPiece = game.get(moveClickFrom);
        if (selectedPiece && selectedPiece.type === "k") {
          const isWhite = selectedPiece.color === "w";
          if (isWhite && moveClickFrom === "e1") {
            if (square === "h1") move = validMoves.find((m) => m.to === "g1");
            else if (square === "a1") move = validMoves.find((m) => m.to === "c1");
          } else if (!isWhite && moveClickFrom === "e8") {
            if (square === "h8") move = validMoves.find((m) => m.to === "g8");
            else if (square === "a8") move = validMoves.find((m) => m.to === "c8");
          }
        }
      }

      if (!move) {
        resetMoveClick(square);
        return;
      }

      const actualTarget = move.to as Square;
      setMoveClickTo(actualTarget);

      if (
        move.piece === "p" &&
        ((move.color === "w" && actualTarget[1] === "8") ||
          (move.color === "b" && actualTarget[1] === "1"))
      ) {
        setShowPromotionDialog(true);
        return;
      }

      const result = playMove({
        from: moveClickFrom,
        to: actualTarget,
      });

      resetMoveClick(result ? undefined : square);
    },
    [
      game,
      isPiecePlayable,
      moveClickFrom,
      playMove,
      resetMoveClick,
      setClickedSquares,
    ]
  );

  const handleSquareRightClick = useCallback(
    (square: Square) => {
      setClickedSquares((prev) =>
        prev.includes(square)
          ? prev.filter((s) => s !== square)
          : [...prev, square]
      );
    },
    [setClickedSquares]
  );

  const handlePieceDragBegin = useCallback(
    (_: string, square: Square) => {
      resetMoveClick(square);
    },
    [resetMoveClick]
  );

  const handlePieceDragEnd = useCallback(() => {
    resetMoveClick();
  }, [resetMoveClick]);

  const onPromotionPieceSelect = useCallback(
    (piece?: PromotionPieceOption, from?: Square, to?: Square) => {
      if (!piece) return false;
      const promotionPiece = piece[1]?.toLowerCase() ?? "q";

      if (moveClickFrom && moveClickTo) {
        const result = playMove({
          from: moveClickFrom,
          to: moveClickTo,
          promotion: promotionPiece,
        });
        resetMoveClick();
        return !!result;
      }

      if (from && to) {
        const result = playMove({
          from,
          to,
          promotion: promotionPiece,
        });
        resetMoveClick();
        return !!result;
      }

      resetMoveClick(moveClickFrom);
      return false;
    },
    [moveClickFrom, moveClickTo, playMove, resetMoveClick]
  );

  const customArrows: Arrow[] = useMemo(() => {
    const bestMove = position?.lastEval?.bestMove;
    const moveClassification = position?.eval?.moveClassification;

    if (
      bestMove &&
      showBestMoveArrow &&
      moveClassification !== MoveClassification.Best &&
      moveClassification !== MoveClassification.Opening &&
      moveClassification !== MoveClassification.Forced &&
      moveClassification !== MoveClassification.Perfect
    ) {
      const bestMoveArrow = [
        bestMove.slice(0, 2),
        bestMove.slice(2, 4),
        CLASSIFICATION_COLORS[MoveClassification.Best],
      ] as Arrow;

      return [bestMoveArrow];
    }

    return [];
  }, [position, showBestMoveArrow]);

  const SquareRenderer: CustomSquareRenderer = useMemo(() => {
    return getSquareRenderer({
      currentPositionAtom: currentPositionAtom,
      clickedSquaresAtom,
      playableSquaresAtom,
      captureSquaresAtom,
      showPlayerMoveIconAtom,
    });
  }, [
    currentPositionAtom,
    clickedSquaresAtom,
    playableSquaresAtom,
    captureSquaresAtom,
    showPlayerMoveIconAtom,
  ]);

  const customPieces = useMemo(
    () =>
      PIECE_CODES.reduce<CustomPieces>((acc, piece) => {
        acc[piece] = ({ squareWidth }) => (
          <Box
            width={squareWidth}
            height={squareWidth}
            sx={{
              backgroundImage: `url(/piece/${pieceSet}/${piece}.svg)`,
              backgroundSize: "contain",
            }}
          />
        );

        return acc;
      }, {}),
    [pieceSet]
  );

  const customBoardStyle = useMemo(() => ({
    borderRadius: "5px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
  }), []);

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      width={boardSize}
      gap={1}
    >
      {showEvaluationBar && (
        <EvaluationBar
          height={boardRef?.current?.offsetHeight || boardSize || 400}
          boardOrientation={boardOrientation}
          currentPositionAtom={currentPositionAtom}
        />
      )}

      <Grid
        container
        rowGap={1.5}
        justifyContent="center"
        alignItems="center"
        size="grow"
      >
        <PlayerHeader
          color={boardOrientation === Color.White ? Color.Black : Color.White}
          gameAtom={gameAtom}
          player={boardOrientation === Color.White ? blackPlayer : whitePlayer}
        />

        {showMoveExplanation && <MoveExplanation />}

        <Grid
          container
          justifyContent="center"
          alignItems="center"
          ref={boardRef}
          size={12}
        >
          <Chessboard
            id={`${boardId}-${canPlay}`}
            position={gameFen}
            onPieceDrop={onPieceDrop}
            boardOrientation={
              boardOrientation === Color.White ? "white" : "black"
            }
            customBoardStyle={customBoardStyle}
            customDarkSquareStyle={BOARD_COLORS.darkSquare}
            customLightSquareStyle={BOARD_COLORS.lightSquare}
            customArrows={customArrows}
            isDraggablePiece={isPiecePlayable}
            customSquare={SquareRenderer}
            onSquareClick={handleSquareLeftClick}
            onSquareRightClick={handleSquareRightClick}
            onPieceDragBegin={handlePieceDragBegin}
            onPieceDragEnd={handlePieceDragEnd}
            onPromotionPieceSelect={onPromotionPieceSelect}
            showPromotionDialog={showPromotionDialog}
            promotionToSquare={moveClickTo}
            animationDuration={200}
            customPieces={customPieces}
          />
        </Grid>

        <PlayerHeader
          color={boardOrientation}
          gameAtom={gameAtom}
          player={boardOrientation === Color.White ? whitePlayer : blackPlayer}
        />
      </Grid>
    </Grid>
  );
}

export const PIECE_CODES = [
  "wP",
  "wB",
  "wN",
  "wR",
  "wQ",
  "wK",
  "bP",
  "bB",
  "bN",
  "bR",
  "bQ",
  "bK",
] as const satisfies Piece[];
