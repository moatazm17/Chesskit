import { Chess } from "chess.js";
import { readFileSync } from "fs";

const puzzles = JSON.parse(readFileSync("public/data/brilliant.json", "utf-8"));

const getPieceValue = (piece) => {
  switch (piece) { case "p": return 1; case "n": return 3; case "b": return 3; case "r": return 5; case "q": return 9; default: return 0; }
};
const uciMoveParams = (uci) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4) : undefined });
const getMaterialDifference = (fen) => {
  const game = new Chess(fen);
  return game.board().flat().reduce((acc, sq) => {
    if (!sq) return acc;
    return sq.color === "w" ? acc + getPieceValue(sq.type) : acc - getPieceValue(sq.type);
  }, 0);
};

function testSacrifice(fen, playedMove, bestLine, useEffectiveEnPrise) {
  if (!bestLine.length) return 0;
  const game = new Chess(fen);
  const whiteToPlay = game.turn() === "w";
  const playerColor = whiteToPlay ? "w" : "b";
  const startMat = getMaterialDifference(fen);
  let playedMoveResult;
  try { playedMoveResult = game.move(uciMoveParams(playedMove)); } catch { return 0; }

  const movedToSquare = playedMoveResult.to;
  const movedPieceValue = getPieceValue(playedMoveResult.piece);
  const capturedByMove = playedMoveResult.captured ? getPieceValue(playedMoveResult.captured) : 0;

  let enPriseSacrifice = 0;
  if (capturedByMove < movedPieceValue) {
    const opponentMoves = game.moves({ verbose: true });
    const captures = opponentMoves.filter(m => m.to === movedToSquare && m.captured);
    if (captures.length > 0) {
      const lowestAttacker = Math.min(...captures.map(m => getPieceValue(m.piece)));
      if (lowestAttacker < movedPieceValue) enPriseSacrifice = movedPieceValue - capturedByMove;
    }
  }

  let movedPieceCaptured = false, pieceStillOnSquare = true, consecutiveQuietMoves = 0, promotionMaterialShift = 0;
  const capturedPieces = { w: [], b: [] };
  if (playedMoveResult.captured) capturedPieces[playerColor].push(playedMoveResult.captured);
  if (playedMoveResult.promotion) { promotionMaterialShift += (whiteToPlay ? 1 : -1) * (getPieceValue(playedMoveResult.promotion) - 1); }

  for (const move of bestLine) {
    try {
      const fullMove = game.move(uciMoveParams(move));
      if (fullMove.from === movedToSquare && fullMove.color === playerColor) pieceStillOnSquare = false;
      if (fullMove.promotion) promotionMaterialShift += (fullMove.color === "w" ? 1 : -1) * (getPieceValue(fullMove.promotion) - 1);
      if (fullMove.captured) {
        capturedPieces[fullMove.color].push(fullMove.captured);
        consecutiveQuietMoves = 0;
        if (fullMove.to === movedToSquare && fullMove.color !== playerColor && pieceStillOnSquare) movedPieceCaptured = true;
      } else { consecutiveQuietMoves++; if (consecutiveQuietMoves >= 2) break; }
    } catch { break; }
  }

  for (const p of capturedPieces["w"].slice(0)) {
    if (capturedPieces["b"].includes(p)) { capturedPieces["b"].splice(capturedPieces["b"].indexOf(p), 1); capturedPieces["w"].splice(capturedPieces["w"].indexOf(p), 1); }
  }
  if (enPriseSacrifice === 0 && Math.abs(capturedPieces["w"].length - capturedPieces["b"].length) <= 1 && capturedPieces["w"].concat(capturedPieces["b"]).every(p => p === "p")) return 0;

  const endMat = getMaterialDifference(game.fen());
  const matDiff = endMat - startMat - promotionMaterialShift;
  const matDiffPlayer = whiteToPlay ? matDiff : -matDiff;

  const netSacrifice = movedPieceCaptured && matDiffPlayer < 0 ? -matDiffPlayer : 0;
  const tempSacrifice = movedPieceCaptured && capturedByMove < movedPieceValue ? movedPieceValue - capturedByMove : 0;

  let effectiveEnPrise;
  if (useEffectiveEnPrise) {
    effectiveEnPrise = enPriseSacrifice > 0 && !pieceStillOnSquare && !movedPieceCaptured ? 0 : enPriseSacrifice;
  } else {
    effectiveEnPrise = enPriseSacrifice;
  }

  return Math.max(netSacrifice, tempSacrifice, effectiveEnPrise);
}

const MIN = 2;
let passNew = 0, passOld = 0;

for (const puzzle of puzzles) {
  const game = new Chess(puzzle.fen);
  try { game.move(uciMoveParams(puzzle.moves[0])); } catch { continue; }
  const fen = game.fen();
  const bm = puzzle.moves[1];
  const bl = puzzle.moves.slice(2);

  if (testSacrifice(fen, bm, bl, true) >= MIN) passNew++;
  if (testSacrifice(fen, bm, bl, false) >= MIN) passOld++;
}

console.log(`\n=== COMPARISON ===`);
console.log(`With effectiveEnPrise (current):    ${passNew}/${puzzles.length} (${(passNew/puzzles.length*100).toFixed(1)}%)`);
console.log(`Without effectiveEnPrise (reverted): ${passOld}/${puzzles.length} (${(passOld/puzzles.length*100).toFixed(1)}%)`);
console.log(`Difference: +${passOld - passNew} puzzles`);
