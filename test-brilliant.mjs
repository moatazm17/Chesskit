import { Chess } from "chess.js";
import { readFileSync } from "fs";

const puzzles = JSON.parse(
  readFileSync("public/data/brilliant.json", "utf-8")
);

const getPieceValue = (piece) => {
  switch (piece) {
    case "p": return 1;
    case "n": return 3;
    case "b": return 3;
    case "r": return 5;
    case "q": return 9;
    default: return 0;
  }
};

const uciMoveParams = (uci) => ({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  promotion: uci.length > 4 ? uci.slice(4) : undefined,
});

const getMaterialDifference = (fen) => {
  const game = new Chess(fen);
  const board = game.board().flat();
  return board.reduce((acc, square) => {
    if (!square) return acc;
    return square.color === "w"
      ? acc + getPieceValue(square.type)
      : acc - getPieceValue(square.type);
  }, 0);
};

const getIsPieceSacrifice = (fen, playedMove, bestLinePvToPlay) => {
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
  let pieceIsProtected = false;
  let pvHasPlayerMoveAfterCapture = false;
  let pieceStillOnSquare = true;
  let consecutiveQuietMoves = 0;
  let promotionMaterialShift = 0;
  let opponentDeclinedEnPrise = false;

  const capturedPieces = { w: [], b: [] };

  if (playedMoveResult.captured) {
    capturedPieces[playerColor].push(playedMoveResult.captured);
  }

  if (playedMoveResult.promotion) {
    const promoGain = getPieceValue(playedMoveResult.promotion) - 1;
    promotionMaterialShift += whiteToPlay ? promoGain : -promoGain;
  }

  let firstOpponentMoveChecked = false;
  for (const move of bestLinePvToPlay) {
    try {
      const fullMove = game.move(uciMoveParams(move));

      if (
        !firstOpponentMoveChecked &&
        fullMove.color !== playerColor &&
        enPriseSacrifice > 0 &&
        pieceStillOnSquare
      ) {
        firstOpponentMoveChecked = true;
        if (fullMove.to !== movedToSquare || !fullMove.captured) {
          opponentDeclinedEnPrise = true;
        }
      }

      if (fullMove.from === movedToSquare && fullMove.color === playerColor) {
        pieceStillOnSquare = false;
      }
      if (fullMove.promotion) {
        const promoGain = getPieceValue(fullMove.promotion) - 1;
        promotionMaterialShift += fullMove.color === "w" ? promoGain : -promoGain;
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
          const recaptures = game.moves({ verbose: true }).filter(
            (m) => m.to === movedToSquare && m.captured
          );
          if (recaptures.length > 0) {
            const bestRecaptureValue = Math.max(
              ...recaptures.map((m) => getPieceValue(m.captured))
            );
            if (capturedByMove + bestRecaptureValue >= movedPieceValue) {
              pieceIsProtected = true;
            }
          }
        }
        if (movedPieceCaptured && fullMove.color === playerColor) {
          pvHasPlayerMoveAfterCapture = true;
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
    enPriseSacrifice === 0 &&
    Math.abs(capturedPieces["w"].length - capturedPieces["b"].length) <= 1 &&
    capturedPieces["w"].concat(capturedPieces["b"]).every((p) => p === "p")
  ) {
    return 0;
  }

  const endingMaterialDifference = getMaterialDifference(game.fen());
  const materialDiff =
    endingMaterialDifference - startingMaterialDifference - promotionMaterialShift;
  const materialDiffPlayerRelative = whiteToPlay ? materialDiff : -materialDiff;

  const protectionApplies = pieceIsProtected && !pvHasPlayerMoveAfterCapture;

  const netSacrifice =
    movedPieceCaptured && !protectionApplies && materialDiffPlayerRelative < 0
      ? -materialDiffPlayerRelative
      : 0;

  const tempSacrifice =
    movedPieceCaptured && !protectionApplies && capturedByMove < movedPieceValue
      ? movedPieceValue - capturedByMove
      : 0;

  const effectiveEnPrise =
    enPriseSacrifice > 0 && !pieceStillOnSquare && !movedPieceCaptured && !opponentDeclinedEnPrise
      ? 0
      : enPriseSacrifice;

  return Math.max(netSacrifice, tempSacrifice, effectiveEnPrise);
};

// ---- TEST ----
const MIN_SACRIFICE = 2;
let pass = 0;
let fail = 0;
const failures = [];

for (const puzzle of puzzles) {
  const game = new Chess(puzzle.fen);

  // Play setup move (opponent's move)
  try {
    game.move(uciMoveParams(puzzle.moves[0]));
  } catch {
    continue;
  }

  const fenBeforeBrilliant = game.fen();
  const brilliantMove = puzzle.moves[1];
  // The "best line" after the brilliant move = remaining moves in the puzzle solution
  const bestLine = puzzle.moves.slice(2);

  const sacrificeValue = getIsPieceSacrifice(
    fenBeforeBrilliant,
    brilliantMove,
    bestLine
  );

  if (sacrificeValue >= MIN_SACRIFICE) {
    pass++;
  } else {
    fail++;
    if (failures.length < 30) {
      failures.push({
        id: puzzle.id,
        move: brilliantMove,
        sacrifice: sacrificeValue,
        rating: puzzle.rating,
        themes: puzzle.themes.join(","),
      });
    }
  }
}

console.log(`\n=== BRILLIANT PUZZLE SACRIFICE DETECTION TEST ===`);
console.log(`Total puzzles: ${puzzles.length}`);
console.log(`✅ Sacrifice detected (>= ${MIN_SACRIFICE}): ${pass} (${((pass / puzzles.length) * 100).toFixed(1)}%)`);
console.log(`❌ Sacrifice NOT detected: ${fail} (${((fail / puzzles.length) * 100).toFixed(1)}%)`);
console.log(`\nFirst ${failures.length} failures:`);
for (const f of failures) {
  console.log(`  [${f.id}] Move: ${f.move}, sacrifice: ${f.sacrifice}, rating: ${f.rating}, themes: ${f.themes}`);
}
