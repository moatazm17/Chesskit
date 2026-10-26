import { writeFileSync, readFileSync } from "fs";

const existing = JSON.parse(readFileSync("test-games.json", "utf-8"));
const seenIds = new Set(existing.map(g => g.id));
const allGames = [...existing];

async function fetchPlayerGames(player, max = 6) {
  try {
    const url = `https://lichess.org/api/games/user/${player}?max=${max}&evals=true&analysed=true&rated=true&clocks=false`;
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
    if (added > 0) console.log(`  ${player}: +${added} (avg rating: ${allGames.slice(-added).map(g=>g.avgRating).join(",")})`);
    return added;
  } catch { return 0; }
}

// Use Lichess autocomplete to find real users at various name patterns
async function findAndFetchPlayers(searchTerms) {
  for (const term of searchTerms) {
    try {
      const res = await fetch(`https://lichess.org/api/user/autocomplete?term=${term}&object=true`);
      const data = await res.json();
      if (data.result) {
        for (const user of data.result.slice(0, 5)) {
          if (allGames.length >= 70) return;
          await fetchPlayerGames(user.id, 4);
        }
      }
    } catch {}
  }
}

console.log(`Starting with ${allGames.length} games.\n`);

// Search for common patterns that lower-rated players might use
const searches = [
  "beginner", "newbie", "learning", "noob", "casual",
  "pawn", "chess1", "play", "fun", "hobby",
  "student", "practice", "amateur", "starter",
  "king1", "queen1", "rook1", "bishop1", "knight1",
];

console.log("Searching for players via autocomplete...");
await findAndFetchPlayers(searches);

// Also try the Lichess puzzle race / storm leaderboards for active users
// These tend to have diverse ratings
if (allGames.length < 70) {
  console.log("\nTrying more search terms...");
  const moreSearches = [
    "alex", "john", "mike", "david", "chess_", "the_", 
    "my_", "im_", "dark", "light", "fast", "slow",
    "master_", "blitz_", "rapid_",
  ];
  await findAndFetchPlayers(moreSearches);
}

writeFileSync("test-games.json", JSON.stringify(allGames, null, 2));

const ratings = allGames.map(g => g.avgRating).filter(r => r > 0);
const buckets = { "< 1000": 0, "1000-1400": 0, "1400-1800": 0, "1800-2200": 0, "2200+": 0 };
for (const r of ratings) {
  if (r < 1000) buckets["< 1000"]++;
  else if (r < 1400) buckets["1000-1400"]++;
  else if (r < 1800) buckets["1400-1800"]++;
  else if (r < 2200) buckets["1800-2200"]++;
  else buckets["2200+"]++;
}

console.log(`\n=== FINAL ===`);
console.log(`Total games: ${allGames.length}`);
console.log(`Rating distribution:`);
for (const [b, c] of Object.entries(buckets)) console.log(`  ${b}: ${c} (${(c/allGames.length*100).toFixed(0)}%)`);
console.log(`Rating range: ${Math.min(...ratings)} - ${Math.max(...ratings)}`);
