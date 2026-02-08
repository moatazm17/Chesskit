import { Chess } from "chess.js";

/**
 * Convert a Chess.js game history (verbose moves) to UCI move strings.
 * e.g., { from: "e2", to: "e4" } -> "e2e4"
 */
export function gameHistoryToUCI(game: Chess): string[] {
  const moves = game.history({ verbose: true });
  return moves.map((move) => {
    const uci = move.from + move.to;
    return move.promotion ? uci + move.promotion : uci;
  });
}

/**
 * Look up a book move from the opening lines.
 *
 * @param openingLines - Array of opening lines, each line is an array of UCI moves
 *   representing the full sequence (both sides' moves alternating).
 * @param gameHistory - Current game history as UCI move strings.
 * @returns The next book move (UCI string), or null if out of book.
 */
export function getBookMove(
  openingLines: string[][],
  gameHistory: string[]
): string | null {
  // Find all opening lines that match the game history so far
  const matchingLines = openingLines.filter((line) => {
    // The line must be at least as long as the current history
    if (line.length <= gameHistory.length) return false;

    // Every move played so far must match this line
    for (let i = 0; i < gameHistory.length; i++) {
      if (line[i] !== gameHistory[i]) return false;
    }
    return true;
  });

  if (matchingLines.length === 0) return null;

  // Pick a random matching line and return its next move
  const line = matchingLines[Math.floor(Math.random() * matchingLines.length)];
  return line[gameHistory.length];
}

/**
 * Get the appropriate opening lines for a bot based on its color.
 * 
 * @param botOpenings - The bot's opening repertoire (white and black lines)
 * @param botColor - "w" for white, "b" for black
 * @returns The opening lines for the bot's color
 */
export function getBotOpeningLines(
  botOpenings: { white: string[][]; black: string[][] },
  botColor: "w" | "b"
): string[][] {
  return botColor === "w" ? botOpenings.white : botOpenings.black;
}
