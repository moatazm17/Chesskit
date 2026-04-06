import { EvaluateGameParams, LineEval, PositionEval } from "@/types/eval";
import { Game, Player } from "@/types/game";
import { Chess, PieceSymbol, Square } from "chess.js";
import { getPositionWinPercentage } from "./engine/helpers/winPercentage";
import { Color } from "@/types/enums";
import { Piece } from "react-chessboard/dist/chessboard/types";

export const getEvaluateGameParams = (game: Chess): EvaluateGameParams => {
  const history = game.history({ verbose: true });

  const fens = history.map((move) => move.before);
  fens.push(history[history.length - 1].after);

  const uciMoves = history.map(
    (move) => move.from + move.to + (move.promotion || "")
  );

  return { fens, uciMoves };
};

/**
 * Extract per-half-move remaining clock times (in seconds) from PGN %clk annotations.
 * Chess.com PGNs include {[%clk H:MM:SS]} after each move.
 * Returns null if no clock data is found.
 */
export function extractClockTimes(pgn: string): number[] | null {
  const matches = pgn.match(/\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/g);
  if (!matches || matches.length < 4) return null;

  return matches.map((m) => {
    const parts = m.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!parts) return 0;
    return parseInt(parts[1]) * 3600 + parseInt(parts[2]) * 60 + parseFloat(parts[3]);
  });
}

const MAX_PGN_LENGTH = 50_000; // ~500 moves is extremely long

export const getGameFromPgn = (pgn: string): Chess => {
  if (pgn.length > MAX_PGN_LENGTH) {
    throw new Error("PGN is too large to parse");
  }

  const game = new Chess();
  game.loadPgn(pgn);

  return game;
};

export const formatGameToDatabase = (game: Chess): Omit<Game, "id"> => {
  const headers: Record<string, string | undefined> = game.getHeaders();

  return {
    pgn: game.pgn(),
    event: headers.Event,
    site: headers.Site,
    date: headers.Date,
    round: headers.Round ?? "?",
    white: {
      name: headers.White || "White",
      rating: headers.WhiteElo ? Number(headers.WhiteElo) : undefined,
    },
    black: {
      name: headers.Black || "Black",
      rating: headers.BlackElo ? Number(headers.BlackElo) : undefined,
    },
    result: headers.Result,
    termination: headers.Termination,
    timeControl: headers.TimeControl,
  };
};

export const getGameToSave = (game: Chess, board: Chess): Chess => {
  if (game.history().length) return game;
  return setGameHeaders(board);
};

export const setGameHeaders = (
  game: Chess,
  params: { white?: Player; black?: Player; resigned?: Color } = {}
): Chess => {
  game.setHeader("Event", "Chesskit Game");
  game.setHeader("Site", "Chesskit.org");
  game.setHeader(
    "Date",
    new Date().toISOString().split("T")[0].replace(/-/g, ".")
  );

  const { white, black, resigned } = params;

  const whiteHeader = game.getHeaders().White;
  const blackHeader = game.getHeaders().Black;
  const whiteName =
    white?.name || (whiteHeader !== "?" ? whiteHeader : "White");
  const blackName =
    black?.name || (blackHeader !== "?" ? blackHeader : "Black");

  game.setHeader("White", whiteName);
  game.setHeader("Black", blackName);

  if (white?.rating) game.setHeader("WhiteElo", `${white.rating}`);
  if (black?.rating) game.setHeader("BlackElo", `${black.rating}`);

  if (resigned) {
    game.setHeader("Result", resigned === "w" ? "0-1" : "1-0");
    game.setHeader(
      "Termination",
      `${resigned === "w" ? blackName : whiteName} won by resignation`
    );
  }

  if (!game.isGameOver()) return game;

  if (game.isCheckmate()) {
    game.setHeader("Result", game.turn() === "w" ? "0-1" : "1-0");
    game.setHeader(
      "Termination",
      `${game.turn() === "w" ? blackName : whiteName} won by checkmate`
    );
  }

  if (game.isInsufficientMaterial()) {
    game.setHeader("Result", "1/2-1/2");
    game.setHeader("Termination", "Draw by insufficient material");
  }

  if (game.isStalemate()) {
    game.setHeader("Result", "1/2-1/2");
    game.setHeader("Termination", "Draw by stalemate");
  }

  if (game.isThreefoldRepetition()) {
    game.setHeader("Result", "1/2-1/2");
    game.setHeader("Termination", "Draw by threefold repetition");
  }

  return game;
};

export const moveLineUciToSan = (
  fen: string
): ((moveUci: string) => string) => {
  const game = new Chess(fen);

  return (moveUci: string): string => {
    try {
      const move = game.move(uciMoveParams(moveUci));
      return move.san;
    } catch {
      return moveUci;
    }
  };
};

export const getEvaluationBarValue = (
  position: PositionEval
): { whiteBarPercentage: number; label: string } => {
  const whiteBarPercentage = getPositionWinPercentage(position);
  const bestLine = position.lines[0];

  if (bestLine.mate) {
    return { label: `M${Math.abs(bestLine.mate)}`, whiteBarPercentage };
  }

  const cp = bestLine.cp;
  if (!cp) return { whiteBarPercentage, label: "0.0" };

  const pEval = Math.abs(cp) / 100;
  let label = pEval.toFixed(1);

  if (label.toString().length > 3) {
    label = pEval.toFixed(0);
  }

  return { whiteBarPercentage, label };
};

export const getIsStalemate = (fen: string): boolean => {
  const game = new Chess(fen);
  return game.isStalemate();
};

export const getWhoIsCheckmated = (fen: string): "w" | "b" | null => {
  const game = new Chess(fen);
  if (!game.isCheckmate()) return null;
  return game.turn();
};

export const uciMoveParams = (
  uciMove: string
): {
  from: Square;
  to: Square;
  promotion?: string | undefined;
} => ({
  from: uciMove.slice(0, 2) as Square,
  to: uciMove.slice(2, 4) as Square,
  promotion: uciMove.slice(4, 5) || undefined,
});

export const isSimplePieceRecapture = (
  fen: string,
  uciMoves: [string, string]
): boolean => {
  const game = new Chess(fen);
  const moves = uciMoves.map((uciMove) => uciMoveParams(uciMove));

  if (moves[0].to !== moves[1].to) return false;

  if (game.get(moves[0].to)) return true;

  try {
    game.move(moves[0]);
    if (game.get(moves[0].to)) return true;
  } catch {
    return false;
  }

  return false;
};

/**
 * Returns the material value of the sacrifice (in piece value points).
 * Returns 0 if the move is not a sacrifice.
 * e.g., knight sacrifice = 3, rook sacrifice = 5, queen sacrifice = 9
 */
export const getIsPieceSacrifice = (
  fen: string,
  playedMove: string,
  bestLinePvToPlay: string[]
): number => {
  if (!bestLinePvToPlay.length) return 0;

  const game = new Chess(fen);
  const whiteToPlay = game.turn() === "w";
  const playerColor = whiteToPlay ? "w" : "b";
  const startingMaterialDifference = getMaterialDifference(fen);

  let playedMoveResult;
  try {
    playedMoveResult = game.move(uciMoveParams(playedMove));
  } catch {
    return 0;
  }

  const movedToSquare = playedMoveResult.to;
  const movedPieceValue = getPieceValue(playedMoveResult.piece);
  const capturedByMove = playedMoveResult.captured
    ? getPieceValue(playedMoveResult.captured)
    : 0;

  // Check if the moved piece is en prise (attacked by a lower-value piece)
  let enPriseSacrifice = 0;
  if (capturedByMove < movedPieceValue) {
    const opponentMoves = game.moves({ verbose: true });
    const captures = opponentMoves.filter(
      (m) => m.to === movedToSquare && m.captured
    );
    if (captures.length > 0) {
      const lowestAttacker = Math.min(
        ...captures.map((m) => getPieceValue(m.piece))
      );
      if (lowestAttacker < movedPieceValue) {
        enPriseSacrifice = movedPieceValue - capturedByMove;
      }
    }
  }

  let movedPieceCaptured = false;
  let pieceStillOnSquare = true;
  let consecutiveQuietMoves = 0;

  const capturedPieces: { w: PieceSymbol[]; b: PieceSymbol[] } = {
    w: [],
    b: [],
  };

  if (playedMoveResult.captured) {
    capturedPieces[playerColor].push(playedMoveResult.captured);
  }

  for (const move of bestLinePvToPlay) {
    try {
      const fullMove = game.move(uciMoveParams(move));

      if (fullMove.from === movedToSquare && fullMove.color === playerColor) {
        pieceStillOnSquare = false;
      }

      if (fullMove.captured) {
        capturedPieces[fullMove.color].push(fullMove.captured);
        consecutiveQuietMoves = 0;

        if (
          fullMove.to === movedToSquare &&
          fullMove.color !== playerColor &&
          pieceStillOnSquare
        ) {
          movedPieceCaptured = true;
        }
      } else {
        consecutiveQuietMoves++;
        if (consecutiveQuietMoves >= 2) break;
      }
    } catch {
      break;
    }
  }

  for (const p of capturedPieces["w"].slice(0)) {
    if (capturedPieces["b"].includes(p)) {
      capturedPieces["b"].splice(capturedPieces["b"].indexOf(p), 1);
      capturedPieces["w"].splice(capturedPieces["w"].indexOf(p), 1);
    }
  }

  if (
    Math.abs(capturedPieces["w"].length - capturedPieces["b"].length) <= 1 &&
    capturedPieces["w"].concat(capturedPieces["b"]).every((p) => p === "p")
  ) {
    return 0;
  }

  const endingMaterialDifference = getMaterialDifference(game.fen());
  const materialDiff = endingMaterialDifference - startingMaterialDifference;
  const materialDiffPlayerRelative = whiteToPlay ? materialDiff : -materialDiff;
  const netSacrifice = materialDiffPlayerRelative < 0 ? -materialDiffPlayerRelative : 0;

  const tempSacrifice =
    movedPieceCaptured && capturedByMove < movedPieceValue
      ? movedPieceValue - capturedByMove
      : 0;

  return Math.max(netSacrifice, tempSacrifice, enPriseSacrifice);
};

/**
 * Count non-king pieces on the board from a FEN string.
 */
export const getPieceCount = (fen: string): number => {
  const placement = fen.split(" ")[0];
  let count = 0;
  for (const c of placement) {
    if (/[pnbrqPNBRQ]/.test(c)) count++;
  }
  return count;
};

export const getMaterialDifference = (fen: string): number => {
  const game = new Chess(fen);
  const board = game.board().flat();

  return board.reduce((acc, square) => {
    if (!square) return acc;
    const piece = square.type;

    if (square.color === "w") {
      return acc + getPieceValue(piece);
    }

    return acc - getPieceValue(piece);
  }, 0);
};

const getPieceValue = (piece: PieceSymbol): number => {
  switch (piece) {
    case "p":
      return 1;
    case "n":
      return 3;
    case "b":
      return 3;
    case "r":
      return 5;
    case "q":
      return 9;
    default:
      return 0;
  }
};

export const isCheck = (fen: string): boolean => {
  const game = new Chess(fen);
  return game.inCheck();
};

export const getCapturedPieces = (
  fen: string,
  color: Color
): {
  piece: string;
  count: number;
}[] => {
  const capturedPieces =
    color === Color.White
      ? [
          { piece: "p", count: 8 },
          { piece: "b", count: 2 },
          { piece: "n", count: 2 },
          { piece: "r", count: 2 },
          { piece: "q", count: 1 },
        ]
      : [
          { piece: "P", count: 8 },
          { piece: "B", count: 2 },
          { piece: "N", count: 2 },
          { piece: "R", count: 2 },
          { piece: "Q", count: 1 },
        ];

  const fenPiecePlacement = fen.split(" ")[0];

  return capturedPieces.map(({ piece, count }) => {
    const piecesLeftCount = fenPiecePlacement.match(
      new RegExp(piece, "g")
    )?.length;
    const newPiece = pieceFenToSymbol[piece] ?? piece;

    return {
      piece: newPiece,
      count: Math.max(0, count - (piecesLeftCount ?? 0)),
    };
  });
};

const pieceFenToSymbol: Record<string, Piece | undefined> = {
  p: "bP",
  b: "bB",
  n: "bN",
  r: "bR",
  q: "bQ",
  k: "bK",
  P: "wP",
  B: "wB",
  N: "wN",
  R: "wR",
  Q: "wQ",
  K: "wK",
};

export const getLineEvalLabel = (
  line: Pick<LineEval, "cp" | "mate">
): string => {
  if (line.cp !== undefined) {
    return `${line.cp > 0 ? "+" : ""}${(line.cp / 100).toFixed(2)}`;
  }

  if (line.mate) {
    return `${line.mate > 0 ? "+" : "-"}M${Math.abs(line.mate)}`;
  }

  return "?";
};

export const formatUciPv = (fen: string, uciMoves: string[]): string[] => {
  const castlingRights = fen.split(" ")[2];

  let canWhiteCastleKingSide = castlingRights.includes("K");
  let canWhiteCastleQueenSide = castlingRights.includes("Q");
  let canBlackCastleKingSide = castlingRights.includes("k");
  let canBlackCastleQueenSide = castlingRights.includes("q");

  return uciMoves.map((uci) => {
    if (uci === "e1h1" && canWhiteCastleKingSide) {
      canWhiteCastleKingSide = false;
      return "e1g1";
    }
    if (uci === "e1a1" && canWhiteCastleQueenSide) {
      canWhiteCastleQueenSide = false;
      return "e1c1";
    }

    if (uci === "e8h8" && canBlackCastleKingSide) {
      canBlackCastleKingSide = false;
      return "e8g8";
    }
    if (uci === "e8a8" && canBlackCastleQueenSide) {
      canBlackCastleQueenSide = false;
      return "e8c8";
    }

    return uci;
  });
};
