import { useAtomValue } from "jotai";
import {
  boardAtom,
  boardOrientationAtom,
  currentPositionAtom,
  gameAtom,
  showBestMoveArrowAtom,
  showPlayerMoveIconAtom,
} from "../states";
import { useMemo } from "react";
import { useScreenSize } from "@/hooks/useScreenSize";
import { Color } from "@/types/enums";
import Board from "@/components/board";
import { usePlayersData } from "@/hooks/usePlayersData";

export default function BoardContainer() {
  const screenSize = useScreenSize();
  const boardOrientation = useAtomValue(boardOrientationAtom);
  const showBestMoveArrow = useAtomValue(showBestMoveArrowAtom);
  const { white, black } = usePlayersData(gameAtom);

  const boardSize = useMemo(() => {
    const width = screenSize.width;
    const height = screenSize.height;

    if (width < 810) {
      return Math.min(width - 16, height - 220);
    }

    // Desktop/iPad: board on left, panel on right
    return Math.min(width * 0.45, height - 160);
  }, [screenSize]);

  return (
    <Board
      id="AnalysisBoard"
      boardSize={boardSize}
      canPlay={true}
      gameAtom={boardAtom}
      whitePlayer={white}
      blackPlayer={black}
      boardOrientation={boardOrientation ? Color.White : Color.Black}
      currentPositionAtom={currentPositionAtom}
      showBestMoveArrow={showBestMoveArrow}
      showPlayerMoveIconAtom={showPlayerMoveIconAtom}
    />
  );
}
