import {
  ChessComGame,
  ChessComProfile,
  ChessComPlayerStats,
} from "@/types/chessCom";
import { getPaddedNumber } from "./helpers";
import { LoadedGame } from "@/types/game";

export const getChessComUserRecentGames = async (
  username: string,
  signal?: AbortSignal
): Promise<LoadedGame[]> => {
  const usernameParam = encodeURIComponent(username.trim().toLowerCase());
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const paddedMonth = getPaddedNumber(month);

  const res = await fetch(
    `https://api.chess.com/pub/player/${usernameParam}/games/${year}/${paddedMonth}`,
    { method: "GET", signal }
  );

  const data = await res.json();

  if (
    res.status >= 400 &&
    data.message !== "Date cannot be set in the future"
  ) {
    throw new Error("Error fetching games from Chess.com");
  }

  const games: ChessComGame[] = data?.games ?? [];

  if (games.length < 50) {
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousPaddedMonth = getPaddedNumber(previousMonth);
    const yearToFetch = previousMonth === 12 ? year - 1 : year;

    const resPreviousMonth = await fetch(
      `https://api.chess.com/pub/player/${usernameParam}/games/${yearToFetch}/${previousPaddedMonth}`
    );

    const dataPreviousMonth = await resPreviousMonth.json();

    games.push(...(dataPreviousMonth?.games ?? []));
  }

  const gamesToReturn = games
    .filter((game) => game.pgn && game.end_time)
    .sort((a, b) => b.end_time - a.end_time)
    .slice(0, 50)
    .map(formatChessComGame);

  return gamesToReturn;
};

export const getChessComUserAvatar = async (
  username: string
): Promise<string | null> => {
  const usernameParam = encodeURIComponent(username.trim().toLowerCase());

  const res = await fetch(`https://api.chess.com/pub/player/${usernameParam}`);
  const data = await res.json();
  const avatarUrl = data?.avatar;

  return typeof avatarUrl === "string" ? avatarUrl : null;
};

export const getChessComPlayerProfile = async (
  username: string,
  signal?: AbortSignal
): Promise<ChessComProfile> => {
  const usernameParam = encodeURIComponent(username.trim().toLowerCase());
  const res = await fetch(
    `https://api.chess.com/pub/player/${usernameParam}`,
    { signal }
  );
  if (res.status >= 400) {
    throw new Error("Player not found");
  }
  return res.json();
};

export const getChessComPlayerStats = async (
  username: string,
  signal?: AbortSignal
): Promise<ChessComPlayerStats> => {
  const usernameParam = encodeURIComponent(username.trim().toLowerCase());
  const res = await fetch(
    `https://api.chess.com/pub/player/${usernameParam}/stats`,
    { signal }
  );
  if (res.status >= 400) {
    throw new Error("Could not fetch player stats");
  }
  return res.json();
};

export const getChessComPlayerAllGames = async (
  username: string,
  months: number = 3,
  signal?: AbortSignal
): Promise<ChessComGame[]> => {
  const usernameParam = encodeURIComponent(username.trim().toLowerCase());
  const allGames: ChessComGame[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = getPaddedNumber(d.getMonth() + 1);

    try {
      const res = await fetch(
        `https://api.chess.com/pub/player/${usernameParam}/games/${year}/${month}`,
        { signal }
      );
      if (res.ok) {
        const data = await res.json();
        allGames.push(...(data?.games ?? []));
      }
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }

  return allGames
    .filter((g) => g.pgn && g.end_time)
    .sort((a, b) => b.end_time - a.end_time);
};

const formatChessComGame = (data: ChessComGame): LoadedGame => {
  const result = data.pgn.match(/\[Result "(.*?)"]/)?.[1];
  const movesNb = data.pgn.match(/\d+?\. /g)?.length;

  return {
    id: data.uuid || data.url?.split("/").pop() || data.id,
    pgn: data.pgn || "",
    white: {
      name: data.white?.username || "White",
      rating: data.white?.rating || 0,
      title: data.white?.title,
    },
    black: {
      name: data.black?.username || "Black",
      rating: data.black?.rating || 0,
      title: data.black?.title,
    },
    result,
    timeControl: getGameTimeControl(data),
    date: data.end_time
      ? new Date(data.end_time * 1000).toLocaleDateString()
      : new Date().toLocaleDateString(),
    movesNb: movesNb ? movesNb * 2 : undefined,
    url: data.url,
  };
};

const getGameTimeControl = (game: ChessComGame): string | undefined => {
  const rawTimeControl = game.time_control;
  if (!rawTimeControl) return undefined;

  const [firstPart, secondPart] = rawTimeControl.split("+");
  if (!firstPart) return undefined;

  const timeControl = Number(firstPart);
  const increment = secondPart ? `+${secondPart}` : "";
  if (timeControl < 60) return `${timeControl}s${increment}`;

  if (timeControl < 3600) {
    const minutes = Math.floor(timeControl / 60);
    const seconds = timeControl % 60;

    return seconds
      ? `${minutes}m${getPaddedNumber(seconds)}s${increment}`
      : `${minutes}m${increment}`;
  }

  const hours = Math.floor(timeControl / 3600);
  const minutes = Math.floor((timeControl % 3600) / 60);
  return minutes
    ? `${hours}h${getPaddedNumber(minutes)}m${increment}`
    : `${hours}h${increment}`;
};
