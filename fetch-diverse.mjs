import { writeFileSync, readFileSync } from "fs";

const existing = JSON.parse(readFileSync("test-games.json", "utf-8"));
const seenIds = new Set(existing.map(g => g.id));
const allGames = [...existing];

async function fetchPlayerGames(player, max = 8) {
  try {
    const url = `https://lichess.org/api/games/user/${player}?max=${max}&evals=true&analysed=true&perfType=blitz,rapid,bullet&rated=true&clocks=false`;
    const res = await fetch(url, { headers: { "Accept": "application/x-ndjson" } });
    if (!res.ok) return 0;
    const text = await res.text();
    const games = text.trim().split("\n").filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    let added = 0;
    for (const g of games) {
      if (seenIds.has(g.id)) continue;
      if (g.analysis && g.analysis.length > 15) {
        const wr = g.players.white?.rating || 0;
        const br = g.players.black?.rating || 0;
        allGames.push({
          id: g.id,
          white: g.players.white?.user?.name || "?",
          black: g.players.black?.user?.name || "?",
          whiteRating: wr, blackRating: br,
          avgRating: Math.round((wr + br) / 2),
          moves: g.moves, analysis: g.analysis,
          winner: g.winner, status: g.status, speed: g.speed,
        });
        seenIds.add(g.id);
        added++;
      }
    }
    if (added > 0) console.log(`  ${player}: +${added} (total: ${allGames.length})`);
    return added;
  } catch { return 0; }
}

// Strategy: search for players at various levels via Lichess leaderboard pages
// and also known streamers/players at mid-levels
const midPlayers = [
  // Known mid-level active players / streamers
  "Nojokeknight", "chesscoachnet", "tryinghard_chess",
  "thibault", // Lichess founder ~2000
  "somethingpretentious", "german11",
  // Try some random common names that might have analyzed games
  "player1234", "chessplayer99", "kingslayer", "checkmate101",
  "pawnstorm", "bishopman", "rookietake", "knightfork",
];

// Also get opponents from existing games who might be lower rated
const opponents = new Set();
for (const g of allGames) {
  if (g.whiteRating < 2400 && g.whiteRating > 0) opponents.add(g.white);
  if (g.blackRating < 2400 && g.blackRating > 0) opponents.add(g.black);
}

console.log(`Starting with ${allGames.length} games. Found ${opponents.size} sub-2400 opponents.`);
console.log("\nFetching from opponents with lower ratings...");

for (const opp of [...opponents].slice(0, 15)) {
  await fetchPlayerGames(opp, 6);
  if (allGames.length >= 60) break;
}

if (allGames.length < 55) {
  console.log("\nTrying mid-level players...");
  for (const p of midPlayers) {
    await fetchPlayerGames(p, 6);
    if (allGames.length >= 60) break;
  }
}

// Last resort: get from Lichess puzzle players by browsing activity
// Try fetching from Lichess "storm" leaderboard players (varied ratings)
if (allGames.length < 55) {
  console.log("\nTrying Lichess active users...");
  try {
    // Get some users from the Lichess player search
    for (const rating of [1200, 1500, 1800]) {
      const term = `chess${rating}`;
      const res = await fetch(`https://lichess.org/api/user/autocomplete?term=${term}&object=true`, {
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();
      if (data.result) {
        for (const user of data.result.slice(0, 3)) {
          await fetchPlayerGames(user.id, 4);
          if (allGames.length >= 60) break;
        }
      }
      if (allGames.length >= 60) break;
    }
  } catch {}
}

writeFileSync("test-games.json", JSON.stringify(allGames, null, 2));

const ratings = allGames.map(g => g.avgRating).filter(r => r > 0);
const buckets = { "< 1200": 0, "1200-1600": 0, "1600-2000": 0, "2000-2400": 0, "2400+": 0 };
for (const r of ratings) {
  if (r < 1200) buckets["< 1200"]++;
  else if (r < 1600) buckets["1200-1600"]++;
  else if (r < 2000) buckets["1600-2000"]++;
  else if (r < 2400) buckets["2000-2400"]++;
  else buckets["2400+"]++;
}

console.log(`\n=== FINAL SUMMARY ===`);
console.log(`Total games: ${allGames.length}`);
console.log(`Rating distribution:`);
for (const [b, c] of Object.entries(buckets)) console.log(`  ${b}: ${c} games`);
console.log(`Rating range: ${Math.min(...ratings)} - ${Math.max(...ratings)}`);
