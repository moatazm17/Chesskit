import { CurrentPosition } from "@/types/eval";
import { MoveClassification } from "@/types/enums";
import { PrimitiveAtom, atom, useAtomValue } from "jotai";
import Image from "next/image";
import { CSSProperties, forwardRef, memo, useMemo } from "react";
import {
  CustomSquareProps,
  Square,
} from "react-chessboard/dist/chessboard/types";
import { CLASSIFICATION_COLORS } from "@/constants";

export interface Props {
  currentPositionAtom: PrimitiveAtom<CurrentPosition>;
  clickedSquaresAtom: PrimitiveAtom<Square[]>;
  playableSquaresAtom: PrimitiveAtom<Square[]>;
  captureSquaresAtom?: PrimitiveAtom<Square[]>;
  showPlayerMoveIconAtom?: PrimitiveAtom<boolean>;
}

export function getSquareRenderer({
  currentPositionAtom,
  clickedSquaresAtom,
  playableSquaresAtom,
  captureSquaresAtom = atom<Square[]>([]),
  showPlayerMoveIconAtom = atom(false),
}: Props) {
  const squareRenderer = memo(forwardRef<HTMLDivElement, CustomSquareProps>(
    (props, ref) => {
      const { children, square, style } = props;
      const showPlayerMoveIcon = useAtomValue(showPlayerMoveIconAtom);
      const position = useAtomValue(currentPositionAtom);
      const clickedSquares = useAtomValue(clickedSquaresAtom);
      const playableSquares = useAtomValue(playableSquaresAtom);
      const captureSquares = useAtomValue(captureSquaresAtom);

      const fromSquare = position.lastMove?.from;
      const toSquare = position.lastMove?.to;
      const moveClassification = position?.eval?.moveClassification;
      const isEvaluating =
        showPlayerMoveIcon &&
        square === toSquare &&
        position.lastMove &&
        !moveClassification;

      const highlightSquareStyle: CSSProperties | undefined = useMemo(
        () =>
          clickedSquares.includes(square)
            ? rightClickSquareStyle
            : fromSquare === square || toSquare === square
              ? previousMoveSquareStyle(moveClassification)
              : undefined,
        [clickedSquares, square, fromSquare, toSquare, moveClassification]
      );

      const isPlayable = playableSquares.includes(square);
      const isCapture = captureSquares.includes(square);

      const playableSquareStyle: CSSProperties | undefined = useMemo(
        () =>
          isPlayable
            ? isCapture
              ? captureSquareStyles
              : playableSquareStyles
            : undefined,
        [isPlayable, isCapture]
      );

      return (
        <div
          ref={ref}
          style={{
            ...style,
            position: "relative",
          }}
        >
          {children}
          {highlightSquareStyle && <div style={highlightSquareStyle} />}
          {playableSquareStyle && <div style={playableSquareStyle} />}
          {moveClassification && showPlayerMoveIcon && square === toSquare && (
            <Image
              src={`/icons/${moveClassification}.png`}
              alt="move-icon"
              width={50}
              height={50}
              style={{
                position: "absolute",
                top: "max(-16px, -2.5vw)",
                right: "max(-16px, -2.5vw)",
                maxWidth: "5vw",
                maxHeight: "5vw",
                zIndex: 100,
              }}
            />
          )}
          {isEvaluating && (
            <div style={spinnerContainerStyle}>
              <div style={spinnerStyle} />
            </div>
          )}
        </div>
      );
    }
  ));

  squareRenderer.displayName = "SquareRenderer";

  return squareRenderer;
}

const rightClickSquareStyle: CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "100%",
  backgroundColor: "#eb6150",
  opacity: "0.8",
};

// Dot indicator for empty squares
const playableSquareStyles: CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,.18)",
  padding: "35%",
  backgroundClip: "content-box",
  borderRadius: "50%",
  boxSizing: "border-box",
};

// Ring indicator for capture squares (visible on top of opponent pieces)
const captureSquareStyles: CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "100%",
  background:
    "radial-gradient(transparent 0%, transparent 74%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.45) 82%, transparent 83%)",
  boxSizing: "border-box",
  zIndex: 1,
};

const previousMoveSquareStyle = (
  moveClassification?: MoveClassification
): CSSProperties => ({
  position: "absolute",
  width: "100%",
  height: "100%",
  backgroundColor: moveClassification
    ? CLASSIFICATION_COLORS[moveClassification]
    : "#fad541",
  opacity: 0.5,
});

const spinnerContainerStyle: CSSProperties = {
  position: "absolute",
  top: "max(-14px, -2.2vw)",
  right: "max(-14px, -2.2vw)",
  maxWidth: "4.5vw",
  maxHeight: "4.5vw",
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  background: "rgba(40, 40, 50, 0.85)",
  borderRadius: "50%",
  border: "2px solid rgba(255,255,255,0.15)",
};

const spinnerStyle: CSSProperties = {
  width: "60%",
  height: "60%",
  border: "3px solid rgba(255,255,255,0.2)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "sq-spin 0.7s linear infinite",
};

if (typeof document !== "undefined" && !document.getElementById("sq-spin-keyframes")) {
  const styleEl = document.createElement("style");
  styleEl.id = "sq-spin-keyframes";
  styleEl.textContent = "@keyframes sq-spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(styleEl);
}
