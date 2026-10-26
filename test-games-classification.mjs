import { Chess } from "chess.js";
import { readFileSync } from "fs";

const games = JSON.parse(readFileSync("test-games.json", "utf-8"));

// ── Win percentage (matching our app's sigmoid) ──
const ceilsNumber = (n, min, max) => Math.min(max, Math.max(min, n));
const MULTIPLIER = -0.00368208;
const getWinPercentageFromCp = (cp) => {
  const cpCeiled = ceilsNumber(cp, -1000, 1000);
  const winChances = 2 / (1 + Math.exp(MULTIPLIER * cpCeiled)) - 1;
  return 50 + 50 * winChances;
};
const getWinPercentageFromMate = (mate) => getWinPercentageFromCp(mate * Infinity);
const getWinPct = (a) => {
  if (!a) return 50;
  if (a.mate !== undefined) return getWinPercentageFromMate(a.mate);
  if (a.eval !== undefined) return getWinPercentageFromCp(a.eval);
  return 50;
};

const getPieceValue = (p) => ({ p:1, n:3, b:3, r:5, q:9 }[p] || 0);
const uciMoveParams = (uci) => ({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci.length > 4 ? uci.slice(4) : undefined });
const getMaterialDifference = (fen) => {
  const g = new Chess(fen);
  return g.board().flat().reduce((a, s) => {
    if (!s) return a; return s.color === "w" ? a + getPieceValue(s.type) : a - getPieceValue(s.type);
  }, 0);
};
const getPieceCount = (fen) => { let c = 0; for (const ch of fen.split(" ")[0]) if (/[pnbrqPNBRQ]/.test(ch)) c++; return c; };
const isCheck = (fen) => new Chess(fen).inCheck();
const isSimplePieceRecapture = (fen, uciMoves) => {
  const g = new Chess(fen);
  const moves = uciMoves.map(u => uciMoveParams(u));
  if (moves[0].to !== moves[1].to) return false;
  if (g.get(moves[0].to)) return true;
  try { const r = g.move(moves[0]); if (r.captured && g.get(moves[0].to)) return true; } catch { return false; }
  return false;
};

function getIsPieceSacrifice(fen, playedMove, bestLinePvToPlay) {
  if (!bestLinePvToPlay.length) return 0;
  const game = new Chess(fen);
  const whiteToPlay = game.turn() === "w";
  const playerColor = whiteToPlay ? "w" : "b";
  const startMat = getMaterialDifference(fen);
  let result;
  try { result = game.move(uciMoveParams(playedMove)); } catch { return 0; }
  const movedTo = result.to, pVal = getPieceValue(result.piece), capVal = result.captured ? getPieceValue(result.captured) : 0;

  let enPrise = 0;
  if (capVal < pVal) {
    const caps = game.moves({ verbose: true }).filter(m => m.to === movedTo && m.captured);
    if (caps.length > 0 && Math.min(...caps.map(m => getPieceValue(m.piece))) < pVal)
      enPrise = pVal - capVal;
  }

  let captured = false, onSquare = true, quiet = 0, promoShift = 0;
  const capPieces = { w: [], b: [] };
  if (result.captured) capPieces[playerColor].push(result.captured);
  if (result.promotion) promoShift += (whiteToPlay ? 1 : -1) * (getPieceValue(result.promotion) - 1);

  for (const m of bestLinePvToPlay) {
    try {
      const fm = game.move(uciMoveParams(m));
      if (fm.from === movedTo && fm.color === playerColor) onSquare = false;
      if (fm.promotion) promoShift += (fm.color === "w" ? 1 : -1) * (getPieceValue(fm.promotion) - 1);
      if (fm.captured) {
        capPieces[fm.color].push(fm.captured);
        quiet = 0;
        if (fm.to === movedTo && fm.color !== playerColor && onSquare) captured = true;
      } else { quiet++; if (quiet >= 2) break; }
    } catch { break; }
  }

  for (const p of capPieces["w"].slice(0)) {
    if (capPieces["b"].includes(p)) { capPieces["b"].splice(capPieces["b"].indexOf(p), 1); capPieces["w"].splice(capPieces["w"].indexOf(p), 1); }
  }
  if (enPrise === 0 && Math.abs(capPieces["w"].length - capPieces["b"].length) <= 1 && capPieces["w"].concat(capPieces["b"]).every(p => p === "p")) return 0;

  const endMat = getMaterialDifference(game.fen());
  const matDiff = endMat - startMat - promoShift;
  const matPlayer = whiteToPlay ? matDiff : -matDiff;

  const netSac = captured && matPlayer < 0 ? -matPlayer : 0;
  const tempSac = captured && capVal < pVal ? pVal - capVal : 0;
  const effEnPrise = enPrise > 0 && !onSquare && !captured ? 0 : enPrise;

  return Math.max(netSac, tempSac, effEnPrise);
}

function classifyBrilliant(lastWin, curWin, isWhite, move, pv, fen, altWin, rating, fenTwoAgo, uciTwo) {
  const r = (ok, reason, extra = {}) => ({ brilliant: ok, reason, ...extra });
  if (altWin === undefined) return r(false, "no alt");
  if (isCheck(fen)) return r(false, "check");
  if (fenTwoAgo && uciTwo && isSimplePieceRecapture(fenTwoAgo, uciTwo)) return r(false, "recapture");

  const minSac = !rating || rating < 1800 ? 2 : 3;
  const sac = getIsPieceSacrifice(fen, move, pv);
  if (sac < minSac) return r(false, `sac=${sac}<${minSac}`, { sac });

  const winDiff = (curWin - lastWin) * (isWhite ? 1 : -1);
  const playerAfter = isWhite ? curWin : 100 - curWin;
  if (winDiff < -3) return r(false, `winDiff=${winDiff.toFixed(1)}`, { sac });
  if (playerAfter < 25) return r(false, `losing=${playerAfter.toFixed(0)}%`, { sac });

  const playerBefore = isWhite ? lastWin : 100 - lastWin;
  const maxWin = !rating || rating < 1200 ? 96 : rating < 1600 ? 94 : rating < 2000 ? 92 : 90;
  if (playerBefore > maxWin) return r(false, `winning=${playerBefore.toFixed(0)}%`, { sac });

  const pc = getPieceCount(fen);
  const endgame = pc < 10;
  const minAlt = endgame ? 6 : 0;
  const altDiff = (curWin - altWin) * (isWhite ? 1 : -1);
  if (altDiff < minAlt) return r(false, `alt=${altDiff.toFixed(1)}<${minAlt}`, { sac });
  if (pc < 5) return r(false, "few pieces", { sac });

  const altWinning = isWhite ? altWin > 98 : altWin < 2;
  if (altWinning) return r(false, "alt winning", { sac });

  return r(true, "BRILLIANT", { sac, winDiff, altDiff, playerBefore, playerAfter });
}

// ── Main ──
console.log("=== BRILLIANT CLASSIFICATION TEST - DIVERSE GAMES ===\n");

let totalMoves = 0, totalBrilliants = 0;
const results = [];
const brilliantsByRating = { "<1200": { moves: 0, brilliants: 0 }, "1200-1600": { moves: 0, brilliants: 0 }, "1600-2000": { moves: 0, brilliants: 0 }, "2000-2400": { moves: 0, brilliants: 0 }, "2400+": { moves: 0, brilliants: 0 } };

const getRatingBucket = (r) => {
  if (r < 1200) return "<1200";
  if (r < 1600) return "1200-1600";
  if (r < 2000) return "1600-2000";
  if (r < 2400) return "2000-2400";
  return "2400+";
};

for (const game of games) {
  const sanMoves = game.moves.split(" ");
  const analysis = game.analysis;
  if (!analysis || analysis.length < sanMoves.length) continue;

  const chess = new Chess();
  const fens = [chess.fen()];
  const uciMoves = [];
  for (const san of sanMoves) {
    try {
      const r = chess.move(san);
      uciMoves.push(r.from + r.to + (r.promotion || ""));
      fens.push(chess.fen());
    } catch { break; }
  }

  const winPcts = [50];
  for (let i = 0; i < analysis.length; i++) winPcts.push(getWinPct(analysis[i]));

  const brilliants = [];
  const bucket = getRatingBucket(game.avgRating);

  for (let i = 1; i < uciMoves.length; i++) {
    totalMoves++;
    brilliantsByRating[bucket].moves++;
    const isW = i % 2 === 1;
    const rating = isW ? game.whiteRating : game.blackRating;
    const lastW = winPcts[i - 1] ?? 50;
    const curW = winPcts[i] ?? 50;

    let altW;
    if (analysis[i - 1]?.best) {
      altW = lastW;
    } else {
      altW = isW ? curW - 2 : curW + 2;
    }

    const pv = uciMoves.slice(i, i + 10);
    const fenBefore = fens[i - 1];
    const fenTwo = i > 1 ? fens[i - 2] : null;
    const uciTwo = i > 1 ? [uciMoves[i - 2], uciMoves[i - 1]] : null;

    const res = classifyBrilliant(lastW, curW, isW, uciMoves[i - 1], pv, fenBefore, altW, rating, fenTwo, uciTwo);
    if (res.brilliant) {
      totalBrilliants++;
      brilliantsByRating[bucket].brilliants++;
      const moveNum = Math.ceil(i / 2);
      brilliants.push({
        move: `${moveNum}${isW ? "." : "..."} ${sanMoves[i - 1]}`,
        sac: res.sac,
        winDiff: res.winDiff?.toFixed(1),
        winBefore: res.playerBefore?.toFixed(0),
        winAfter: res.playerAfter?.toFixed(0),
      });
    }
  }

  results.push({
    id: game.id,
    white: `${game.white}(${game.whiteRating})`,
    black: `${game.black}(${game.blackRating})`,
    avg: game.avgRating,
    speed: game.speed,
    nMoves: uciMoves.length,
    nBrilliants: brilliants.length,
    details: brilliants,
  });
}

// ── Report ──
console.log(`Games: ${results.length}`);
console.log(`Total moves: ${totalMoves}`);
console.log(`Total Brilliants: ${totalBrilliants}`);
console.log(`Avg Brilliants/game: ${(totalBrilliants / results.length).toFixed(2)}`);
console.log(`Brilliant rate: ${(totalBrilliants / totalMoves * 100).toFixed(2)}% of moves\n`);

console.log("── By Rating ──");
for (const [bucket, data] of Object.entries(brilliantsByRating)) {
  const gamesInBucket = results.filter(r => getRatingBucket(r.avg) === bucket).length;
  if (gamesInBucket === 0) continue;
  const avgPerGame = data.brilliants / gamesInBucket;
  console.log(`  ${bucket}: ${gamesInBucket} games, ${data.brilliants} Brilliants (${avgPerGame.toFixed(1)}/game, ${(data.brilliants / data.moves * 100).toFixed(2)}% of moves)`);
}

console.log("\n── By Brilliant Count ──");
const countDist = {};
for (const r of results) { countDist[r.nBrilliants] = (countDist[r.nBrilliants] || 0) + 1; }
for (const [n, c] of Object.entries(countDist).sort((a, b) => a[0] - b[0])) {
  console.log(`  ${n} Brilliants: ${c} games (${(c / results.length * 100).toFixed(0)}%)`);
}

console.log("\n── Games with Brilliants ──");
for (const r of results.filter(g => g.nBrilliants > 0)) {
  const flag = r.nBrilliants > 3 ? " ⚠️ SUSPICIOUS" : "";
  console.log(`  [${r.id}] ${r.white} vs ${r.black} (${r.speed}) → ${r.nBrilliants} Brilliant${flag}`);
  for (const b of r.details) {
    console.log(`      ${b.move} | sac:${b.sac} | winDiff:${b.winDiff}% | ${b.winBefore}%→${b.winAfter}%`);
  }
}

// Sanity check: flag potential false positives
const suspicious = results.filter(r => r.nBrilliants > 3);
if (suspicious.length) {
  console.log(`\n⚠️ ${suspicious.length} games with >3 Brilliants (investigate!)`);
} else {
  console.log(`\n✅ No game has more than 3 Brilliants - looks clean!`);
}
