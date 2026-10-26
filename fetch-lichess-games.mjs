import { writeFileSync } from "fs";

// Mix of all rating levels and game types
const players = [
  // Super GMs (2700+)
  "DrNykterstein", "alireza2003",
  // GMs (2400-2600)
  "GMBenjaminBok", "Zhigalko_Sergei", "EricRosen",
  // IMs / strong players (2000-2400)
  "Lance5500", "penguingm1", "RebeccaHarris",
  // Club players (1500-2000)
  "chessbrahs", "annacramling",
  // Casual / lower rated - we'll search for these via Lichess TV games
];

const allGames = [];
const seenIds = new Set();

async function fetchPlayerGames(player, max = 8) {
  try {
    const url = `https://lichess.org/api/games/user/${player}?max=${max}&evals=true&analysed=true&perfType=blitz,rapid,classical&rated=true&opening=true&clocks=false`;
    const res = await fetch(url, {
      headers: { "Accept": "application/x-ndjson" }
    });
    const text = await res.text();
    const games = text.trim().split("\n").filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    let added = 0;
    for (const g of games) {
      if (seenIds.has(g.id)) continue;
      if (g.analysis && g.analysis.length > 20) {
        const whiteRating = g.players.white?.rating || 0;
        const blackRating = g.players.black?.rating || 0;
        const avgRating = Math.round((whiteRating + blackRating) / 2);
        allGames.push({
          id: g.id,
          white: g.players.white?.user?.name || "?",
          black: g.players.black?.user?.name || "?",
          whiteRating,
          blackRating,
          avgRating,
          moves: g.moves,
          analysis: g.analysis,
          winner: g.winner,
          status: g.status,
          speed: g.speed,
        });
        seenIds.add(g.id);
        added++;
      }
    }
    console.log(`  ${player}: +${added} games (total: ${allGames.length})`);
  } catch (e) {
    console.log(`  ${player}: error - ${e.message}`);
  }
}

// Also fetch from Lichess database of analyzed games at various rating levels
async function fetchLichessExport(minRating, maxRating, max = 6) {
  // Use lichess puzzle/game API to get games from various ratings
  // We'll get top games from the TV channels
  try {
    const channels = ["bullet", "blitz", "rapid", "classical"];
    for (const ch of channels) {
      const url = `https://lichess.org/api/tv/${ch}?nb=5&evals=true`;
      const res = await fetch(url, { headers: { "Accept": "application/x-ndjson" } });
      const text = await res.text();
      const games = text.trim().split("\n").filter(Boolean).map(line => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);

      for (const g of games) {
        if (seenIds.has(g.id) || !g.analysis || g.analysis.length < 15) continue;
        allGames.push({
          id: g.id,
          white: g.players?.white?.user?.name || "?",
          black: g.players?.black?.user?.name || "?",
          whiteRating: g.players?.white?.rating || 0,
          blackRating: g.players?.black?.rating || 0,
          avgRating: Math.round(((g.players?.white?.rating || 0) + (g.players?.black?.rating || 0)) / 2),
          moves: g.moves,
          analysis: g.analysis,
          winner: g.winner,
          status: g.status,
          speed: g.speed || ch,
        });
        seenIds.add(g.id);
      }
    }
  } catch (e) {
    console.log(`  TV games: error - ${e.message}`);
  }
}

// Fetch from specific lower-rated players by searching recent games
async function fetchByRatingRange(targetRating, count = 5) {
  // Use lichess API to get recent analyzed games in a rating range
  // Strategy: search for players at specific rating levels
  const searchPlayers = {
    800: ["chessNewbie123", "beginner_chess"],
    1000: ["casual_player1", "chess_fun_1000"],
    1200: ["improving_player", "club_chess_12"],
    1400: ["mid_player_14", "chess_enthusiast"],
    1600: ["rising_star_16", "tactical_player"],
  };

  // Instead, let's use the Lichess game export with rating filters
  // This isn't directly supported, so let's try tournament games
  try {
    // Get from swiss/arena tournaments which have diverse ratings
    const url = `https://lichess.org/api/games/user/lichess?max=${count}&evals=true&analysed=true&perfType=blitz&rated=true&clocks=false`;
    const res = await fetch(url, { headers: { "Accept": "application/x-ndjson" } });
    const text = await res.text();
    // Just try, might not work for "lichess" user
  } catch {}
}

console.log("Fetching analyzed games from diverse players...\n");

// Fetch from known players at various levels
for (const player of players) {
  await fetchPlayerGames(player, 8);
  if (allGames.length >= 55) break;
}

// If we need more, try additional players
const extraPlayers = [
  "LiamChess", "GothamChess", "BotezLive", "chessbrah",
  "Fins", "Nemo7777777", "mishanick", "IM_Not_A_GM",
  "opperwezen", "Dansen99", "lovlas", "German11",
  "Fsjansen", "Jsjsjsisisi", "ilBaffone", "Morasek",
];

if (allGames.length < 50) {
  console.log("\nFetching more from additional players...");
  for (const player of extraPlayers) {
    await fetchPlayerGames(player, 6);
    if (allGames.length >= 55) break;
  }
}

writeFileSync("test-games.json", JSON.stringify(allGames, null, 2));

// Stats
const ratings = allGames.map(g => g.avgRating).filter(r => r > 0);
const ratingBuckets = { "< 1200": 0, "1200-1600": 0, "1600-2000": 0, "2000-2400": 0, "2400+": 0 };
for (const r of ratings) {
  if (r < 1200) ratingBuckets["< 1200"]++;
  else if (r < 1600) ratingBuckets["1200-1600"]++;
  else if (r < 2000) ratingBuckets["1600-2000"]++;
  else if (r < 2400) ratingBuckets["2000-2400"]++;
  else ratingBuckets["2400+"]++;
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total games: ${allGames.length}`);
console.log(`Rating distribution:`);
for (const [bucket, count] of Object.entries(ratingBuckets)) {
  console.log(`  ${bucket}: ${count} games`);
}
console.log(`\nGames by speed:`);
const speeds = {};
for (const g of allGames) { speeds[g.speed] = (speeds[g.speed] || 0) + 1; }
for (const [s, c] of Object.entries(speeds)) console.log(`  ${s}: ${c}`);
console.log(`\nRating range: ${Math.min(...ratings)} - ${Math.max(...ratings)}`);
