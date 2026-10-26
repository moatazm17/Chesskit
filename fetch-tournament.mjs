import { writeFileSync, readFileSync } from "fs";

const existing = JSON.parse(readFileSync("test-games.json", "utf-8"));
const seenIds = new Set(existing.map(g => g.id));
const allGames = [...existing];

async function fetchPlayerGames(player, max = 4) {
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
          id: g.id, white: g.players.white?.user?.name || "?", black: g.players.black?.user?.name || "?",
          whiteRating: wr, blackRating: br, avgRating: Math.round((wr + br) / 2),
          moves: g.moves, analysis: g.analysis, winner: g.winner, status: g.status, speed: g.speed,
        });
        seenIds.add(g.id);
        added++;
      }
    }
    if (added > 0) console.log(`  ${player}: +${added} games`);
    return added;
  } catch { return 0; }
}

// Get players from recent arenas on Lichess
async function getArenaPlayers() {
  const players = new Set();
  try {
    // Get current/recent arenas
    const res = await fetch("https://lichess.org/api/tournament", { headers: { "Accept": "application/json" } });
    const data = await res.json();
    const arenas = [...(data.started || []), ...(data.finished || [])].slice(0, 5);
    
    for (const arena of arenas) {
      try {
        const pRes = await fetch(`https://lichess.org/api/tournament/${arena.id}?page=1`, {
          headers: { "Accept": "application/json" }
        });
        const pData = await pRes.json();
        if (pData.standing && pData.standing.players) {
          for (const p of pData.standing.players) {
            if (p.rating < 2000) players.add(p.name);
          }
        }
      } catch {}
    }
  } catch (e) { console.log("Arena fetch error:", e.message); }
  return [...players];
}

console.log(`Starting with ${allGames.length} games.\n`);
console.log("Finding players from Lichess arenas...");

const arenaPlayers = await getArenaPlayers();
console.log(`Found ${arenaPlayers.length} sub-2000 arena players`);

// Try each player
for (const player of arenaPlayers.slice(0, 40)) {
  await fetchPlayerGames(player, 3);
  if (allGames.length >= 70) break;
}

// Also try the Lichess cloud analysis API to find games with evals
// Alternative: just generate evals ourselves using Lichess cloud eval
// https://lichess.org/api/cloud-eval?fen=...&multiPv=2

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
for (const [b, c] of Object.entries(buckets)) console.log(`  ${b}: ${c}`);
console.log(`Range: ${Math.min(...ratings)} - ${Math.max(...ratings)}`);
