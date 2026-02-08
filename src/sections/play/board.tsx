import { useAtomValue } from "jotai";
import {
  engineEloAtom,
  gameAtom,
  playerColorAtom,
  isGameInProgressAtom,
  gameDataAtom,
  enginePlayNameAtom,
  activeBotAtom,
} from "./states";
import { useChessActions } from "@/hooks/useChessActions";
import { useEffect, useMemo } from "react";
import { useScreenSize } from "@/hooks/useScreenSize";
import { useEngine } from "@/hooks/useEngine";
import { uciMoveParams } from "@/lib/chess";
import Board from "@/components/board";
import { useGameData } from "@/hooks/useGameData";
import { usePlayersData } from "@/hooks/usePlayersData";
import { sleep } from "@/lib/helpers";
import { getBookMove, getBotOpeningLines, gameHistoryToUCI } from "@/lib/openingBook";
import { Color } from "@/types/enums";

export default function BoardContainer() {
  const screenSize = useScreenSize();
  const engineName = useAtomValue(enginePlayNameAtom);
  const engine = useEngine(engineName);
  const game = useAtomValue(gameAtom);
  const { white, black } = usePlayersData(gameAtom);
  const playerColor = useAtomValue(playerColorAtom);
  const { playMove } = useChessActions(gameAtom);
  const engineElo = useAtomValue(engineEloAtom);
  const isGameInProgress = useAtomValue(isGameInProgressAtom);
  const activeBot = useAtomValue(activeBotAtom);

  const gameFen = game.fen();
  const isGameFinished = game.isGameOver();

  useEffect(() => {
    const playEngineMove = async () => {
      if (
        game.turn() === playerColor ||
        isGameFinished ||
        !isGameInProgress
      ) {
        return;
      }

      // Check opening book first if a bot is active
      if (activeBot) {
        const botColor = playerColor === Color.White ? "b" : "w";
        const openingLines = getBotOpeningLines(activeBot.openings, botColor as "w" | "b");
        const gameHistory = gameHistoryToUCI(game);
        const bookMove = getBookMove(openingLines, gameHistory);

        if (bookMove) {
          // Play book move with a slight delay for natural feel
          await sleep(800);
          playMove(uciMoveParams(bookMove));
          return;
        }
      }

      // Fall back to Stockfish engine
      if (!engine?.getIsReady()) return;

      const timePromise = sleep(1000);
      const move = await engine.getEngineNextMove(gameFen, engineElo);
      await timePromise;

      if (move) playMove(uciMoveParams(move));
    };
    playEngineMove();

    return () => {
      engine?.stopAllCurrentJobs();
    };
  }, [gameFen, isGameInProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  const boardSize = useMemo(() => {
    const width = screenSize.width;
    const height = screenSize.height;

    // 900 is the md layout breakpoint
    if (window?.innerWidth < 900) {
      return Math.min(width - 8, height - 130);
    }

    return Math.min(width - 300, height * 0.83);
  }, [screenSize]);

  useGameData(gameAtom, gameDataAtom);

  // Override player data with bot avatar when a bot is active
  const whitePlayer = useMemo(() => {
    if (activeBot && playerColor === Color.Black) {
      return { ...white, avatarUrl: activeBot.image };
    }
    return white;
  }, [white, activeBot, playerColor]);

  const blackPlayer = useMemo(() => {
    if (activeBot && playerColor === Color.White) {
      return { ...black, avatarUrl: activeBot.image };
    }
    return black;
  }, [black, activeBot, playerColor]);

  return (
    <Board
      id="PlayBoard"
      canPlay={isGameInProgress ? playerColor : false}
      gameAtom={gameAtom}
      boardSize={boardSize}
      whitePlayer={whitePlayer}
      blackPlayer={blackPlayer}
      boardOrientation={playerColor}
      currentPositionAtom={gameDataAtom}
    />
  );
}
