import { writeFileSync, readFileSync } from "fs";

const existing = JSON.parse(readFileSync("test-games.json", "utf-8"));
const seenIds = new Set(existing.map(g => g.id));
const allGames = [...existing];

async function fetchPlayerGames(player, max = 4) {
  try {
    const url = `https://lichess.org/api/games/user/${player}?max=${max}&evals=true&analysed=true&clocks=false`;
    const res = await fetch(url, { headers: { "Accept": "application/x-ndjson" } });
    if (!res.ok) return 0;
    const text = await res.text();
    const games = text.trim().split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    let added = 0;
    for (const g of games) {
      if (seenIds.has(g.id) || !g.analysis || g.analysis.length < 15) continue;
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
    if (added > 0) {
      const last = allGames.slice(-added);
      const avgR = Math.round(last.reduce((s,g)=>s+g.avgRating,0)/added);
      console.log(`  ${player}: +${added} (avg ${avgR})`);
    }
    return added;
  } catch { return 0; }
}

// Get players from more arenas including lower-rated ones
async function getPlayersFromArena(arenaId) {
  const players = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`https://lichess.org/api/tournament/${arenaId}?page=${page}`, { headers: { "Accept": "application/json" } });
      const data = await res.json();
      if (data.standing?.players) {
        for (const p of data.standing.players) {
          players.push({ name: p.name, rating: p.rating });
        }
      }
    }
  } catch {}
  return players;
}

// Find current arenas
async function findArenas() {
  try {
    const res = await fetch("https://lichess.org/api/tournament", { headers: { "Accept": "application/json" } });
    const data = await res.json();
    return [...(data.started || []), ...(data.created || []), ...(data.finished || [])];
  } catch { return []; }
}

console.log(`Starting with ${allGames.length} games.\n`);

const arenas = await findArenas();
console.log(`Found ${arenas.length} arenas`);

// Get players from arenas sorted by lowest rating
const allPlayers = [];
for (const arena of arenas.slice(0, 8)) {
  const players = await getPlayersFromArena(arena.id);
  allPlayers.push(...players);
}

// Sort by rating ascending to get lowest rated first
allPlayers.sort((a, b) => a.rating - b.rating);
const uniquePlayers = [...new Set(allPlayers.map(p => p.name))];

console.log(`Found ${uniquePlayers.length} unique players. Lowest ratings: ${allPlayers.slice(0, 10).map(p => `${p.name}(${p.rating})`).join(", ")}`);

console.log("\nFetching from lowest-rated players...");
for (const player of uniquePlayers.slice(0, 80)) {
  await fetchPlayerGames(player, 3);
  if (allGames.length >= 80) break;
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

console.log(`\n=== FINAL ===`);
console.log(`Total games: ${allGames.length}`);
for (const [b, c] of Object.entries(buckets)) console.log(`  ${b}: ${c} (${(c/allGames.length*100).toFixed(0)}%)`);
console.log(`Rating range: ${Math.min(...ratings)} - ${Math.max(...ratings)}`);
const speeds = {};
for (const g of allGames) speeds[g.speed] = (speeds[g.speed] || 0) + 1;
console.log("Speeds:", JSON.stringify(speeds));
