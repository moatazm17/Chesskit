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
    if (!sq) return acc; return sq.color === "w" ? acc + getPieceValue(sq.type) : acc - getPieceValue(sq.type);
  }, 0);
};

function getIsPieceSacrifice(fen, playedMove, bestLinePvToPlay) {
  if (!bestLinePvToPlay.length) return 0;
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

  for (const move of bestLinePvToPlay) {
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
  const effectiveEnPrise = enPriseSacrifice > 0 && !pieceStillOnSquare && !movedPieceCaptured ? 0 : enPriseSacrifice;

  return Math.max(netSacrifice, tempSacrifice, effectiveEnPrise);
}

const MIN = 2;
let passFirstMove = 0;
let passAnyMove = 0;
let passFirstMoveOnly = 0;
let passLaterMoveOnly = 0;
let failAll = 0;
const failAllExamples = [];

for (const puzzle of puzzles) {
  const game = new Chess(puzzle.fen);
  try { game.move(uciMoveParams(puzzle.moves[0])); } catch { continue; }

  // Test move[1] (first player move)
  const fen1 = game.fen();
  const sac1 = getIsPieceSacrifice(fen1, puzzle.moves[1], puzzle.moves.slice(2));
  const firstPasses = sac1 >= MIN;
  if (firstPasses) passFirstMove++;

  // Test ALL player moves (moves[1], moves[3], moves[5], ...)
  let anyPasses = firstPasses;
  let laterPasses = false;

  const gameSim = new Chess(puzzle.fen);
  for (let i = 0; i < puzzle.moves.length; i++) {
    try { gameSim.move(uciMoveParams(puzzle.moves[i])); } catch { break; }
    // Player moves are at odd indices (1, 3, 5...)
    if (i > 0 && i % 2 === 1) {
      // Already tested index 1, test 3, 5, etc.
      if (i > 1) {
        const fenBefore = new Chess(puzzle.fen);
        for (let j = 0; j < i; j++) {
          try { fenBefore.move(uciMoveParams(puzzle.moves[j])); } catch { break; }
        }
        const sacN = getIsPieceSacrifice(fenBefore.fen(), puzzle.moves[i], puzzle.moves.slice(i + 1));
        if (sacN >= MIN) {
          anyPasses = true;
          if (!firstPasses) laterPasses = true;
        }
      }
    }
  }

  if (anyPasses) passAnyMove++;
  if (firstPasses && !laterPasses) passFirstMoveOnly++;
  if (!firstPasses && laterPasses) passLaterMoveOnly++;
  if (!anyPasses) {
    failAll++;
    if (failAllExamples.length < 15) {
      failAllExamples.push({
        id: puzzle.id,
        moves: puzzle.moves.join(" "),
        themes: puzzle.themes.join(","),
        rating: puzzle.rating,
      });
    }
  }
}

console.log(`\n=== SMART BRILLIANT PUZZLE TEST ===`);
console.log(`Total puzzles: ${puzzles.length}`);
console.log(`\n--- First player move (moves[1]) ---`);
console.log(`  ✅ Sacrifice detected: ${passFirstMove} (${(passFirstMove/puzzles.length*100).toFixed(1)}%)`);
console.log(`\n--- ANY player move in puzzle ---`);
console.log(`  ✅ Sacrifice detected: ${passAnyMove} (${(passAnyMove/puzzles.length*100).toFixed(1)}%)`);
console.log(`\n--- Breakdown ---`);
console.log(`  Only first move has sacrifice: ${passFirstMoveOnly}`);
console.log(`  Sacrifice found in LATER move: ${passLaterMoveOnly}`);
console.log(`  ❌ No sacrifice in ANY move: ${failAll} (${(failAll/puzzles.length*100).toFixed(1)}%)`);
console.log(`\nExamples with NO sacrifice detected anywhere:`);
for (const f of failAllExamples) {
  console.log(`  [${f.id}] rating:${f.rating} moves: ${f.moves} | themes: ${f.themes}`);
}
