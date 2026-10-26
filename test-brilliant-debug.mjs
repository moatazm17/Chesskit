import { Chess } from "chess.js";
import { readFileSync } from "fs";

const puzzles = JSON.parse(readFileSync("public/data/brilliant.json", "utf-8"));

const getPieceValue = (piece) => {
  switch (piece) { case "p": return 1; case "n": return 3; case "b": return 3; case "r": return 5; case "q": return 9; default: return 0; }
};
const uciMoveParams = (uci) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4) : undefined });

const failures = [];

for (const puzzle of puzzles) {
  const game = new Chess(puzzle.fen);
  try { game.move(uciMoveParams(puzzle.moves[0])); } catch { continue; }
  const fen = game.fen();
  const brilliantMove = puzzle.moves[1];
  const bestLine = puzzle.moves.slice(2);

  const g = new Chess(fen);
  let moveResult;
  try { moveResult = g.move(uciMoveParams(brilliantMove)); } catch { continue; }

  const movedPiece = moveResult.piece;
  const movedPieceValue = getPieceValue(movedPiece);
  const captured = moveResult.captured;
  const capturedValue = captured ? getPieceValue(captured) : 0;

  // Check en prise
  const opponentMoves = g.moves({ verbose: true });
  const captures = opponentMoves.filter(m => m.to === moveResult.to && m.captured);
  const canBeRecaptured = captures.length > 0;
  const lowestAttacker = canBeRecaptured ? Math.min(...captures.map(m => getPieceValue(m.piece))) : 0;
  const enPrise = canBeRecaptured && lowestAttacker < movedPieceValue ? movedPieceValue - capturedValue : 0;

  // For failures, figure out WHY it fails
  // Sacrifice detection depends on: enPrise, netMaterial loss, tempSacrifice
  // If enPrise = 0, the piece is NOT en prise (not attacked by lower value piece)
  // This means:
  //   1. Piece isn't attacked at all
  //   2. Piece is attacked but only by equal/higher value pieces

  if (enPrise < 2) {
    const isAttacked = opponentMoves.some(m => m.to === moveResult.to);
    const attackers = opponentMoves.filter(m => m.to === moveResult.to).map(m => `${m.piece}(${getPieceValue(m.piece)})`);
    
    failures.push({
      id: puzzle.id,
      move: brilliantMove,
      movedPiece: `${movedPiece}(${movedPieceValue})`,
      captured: captured ? `${captured}(${capturedValue})` : "none",
      enPrise,
      isAttacked,
      attackers: attackers.join(","),
      canRecapture: canBeRecaptured,
      lowestAttacker,
      bestLine: bestLine.join(" "),
      themes: puzzle.themes.join(","),
    });
  }
}

// Categorize failures
const notAttacked = failures.filter(f => !f.isAttacked);
const attackedByEqualOrHigher = failures.filter(f => f.isAttacked && f.enPrise === 0);
const enPrise1 = failures.filter(f => f.enPrise === 1);

console.log(`\n=== FAILURE ANALYSIS ===`);
console.log(`Total failures (enPrise < 2): ${failures.length}`);
console.log(`  Not attacked after move: ${notAttacked.length}`);
console.log(`  Attacked by equal/higher only: ${attackedByEqualOrHigher.length}`);
console.log(`  En prise = 1 (pawn sacrifice): ${enPrise1.length}`);

console.log(`\n--- NOT ATTACKED (${notAttacked.length}) ---`);
for (const f of notAttacked.slice(0, 10)) {
  console.log(`  [${f.id}] ${f.move} | ${f.movedPiece} captures ${f.captured} | themes: ${f.themes}`);
}

console.log(`\n--- ATTACKED BY EQUAL/HIGHER (${attackedByEqualOrHigher.length}) ---`);
for (const f of attackedByEqualOrHigher.slice(0, 10)) {
  console.log(`  [${f.id}] ${f.move} | ${f.movedPiece} captures ${f.captured} | attackers: ${f.attackers}`);
}

console.log(`\n--- PAWN SACRIFICE enPrise=1 (${enPrise1.length}) ---`);
for (const f of enPrise1.slice(0, 10)) {
  console.log(`  [${f.id}] ${f.move} | ${f.movedPiece} captures ${f.captured} | attackers: ${f.attackers}`);
}

// Also show piece distribution for non-attacked failures
const pieceDistNotAttacked = {};
for (const f of notAttacked) {
  const p = f.movedPiece;
  pieceDistNotAttacked[p] = (pieceDistNotAttacked[p] || 0) + 1;
}
console.log(`\nPiece distribution (not attacked):`, JSON.stringify(pieceDistNotAttacked));

const pieceDistEqHigher = {};
for (const f of attackedByEqualOrHigher) {
  const p = f.movedPiece;
  pieceDistEqHigher[p] = (pieceDistEqHigher[p] || 0) + 1;
}
console.log(`Piece distribution (attacked by equal/higher):`, JSON.stringify(pieceDistEqHigher));
