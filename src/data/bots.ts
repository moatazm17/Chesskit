export interface ChessBot {
  id: string;
  name: string;
  title: string;
  elo: number;
  description: string;
  style: string;
  avatar: string;
  image: string;
  color: string;
  openings: {
    white: string[][];
    black: string[][];
  };
}

/**
 * Celebrity chess bots with real opening repertoires.
 *
 * Opening data sourced from:
 * - chessgames.com game databases (game counts per opening)
 * - 365chess.com opening explorer
 * - chess.com opening articles & player profiles
 * - Published opening books by the players themselves
 *
 * Each opening line is an array of UCI moves representing
 * the full move sequence (both sides alternating).
 * After the book moves run out, Stockfish takes over at the bot's ELO.
 */
export const CHESS_BOTS: ChessBot[] = [
  {
    id: "capablanca",
    name: "Capablanca",
    title: "The Chess Machine",
    elo: 2725,
    description: "Legendary endgame wizard with flawless technique",
    style: "Positional",
    avatar: "♚",
    image: "/bots/capablanca.png",
    color: "#B8860B",
    openings: {
      // Capablanca overwhelmingly played 1.d4 and the Queen's Gambit
      // 31/34 games in his 1927 WC match were QGD
      white: [
        // Queen's Gambit: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7", "e2e3"],
        // Queen's Gambit: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "b8d7"],
        // Queen's Gambit Exchange: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c4d5", "e6d5"],
        // QG vs Slav: 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3
        ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6", "b1c3"],
        // Ruy Lopez (classical): 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1"],
        // 1.d4 Nf6 2.c4 e6 3.Nf3 (flexible QG)
        ["d2d4", "g8f6", "c2c4", "e7e6", "g1f3"],
      ],
      black: [
        // QGD Orthodox: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7", "e2e3", "e8g8", "g1f3", "b8d7"],
        // QGD: 1.d4 d5 2.c4 e6
        ["d2d4", "d7d5", "c2c4", "e7e6"],
        // Nimzo-Indian (adopted post-1927): 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4
        ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"],
        // vs 1.e4: 1...e5 2.Nf3 Nc6 (classical)
        ["e2e4", "e7e5", "g1f3", "b8c6"],
        // Caro-Kann (solid choice): 1.e4 c6 2.d4 d5
        ["e2e4", "c7c6", "d2d4", "d7d5"],
      ],
    },
  },
  {
    id: "tal",
    name: "Tal",
    title: "The Magician from Riga",
    elo: 2700,
    description: "Ultra-aggressive sacrificial genius, 362 Sicilian games as White",
    style: "Aggressive",
    avatar: "♞",
    image: "/bots/tal.png",
    color: "#DC143C",
    openings: {
      // Tal's most played: Sicilian (362), Ruy Lopez (264), Caro-Kann responses
      white: [
        // Open Sicilian (362 games!): 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3"],
        // Open Sicilian vs Nc6: 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4
        ["e2e4", "c7c5", "g1f3", "b8c6", "d2d4", "c5d4", "f3d4"],
        // Ruy Lopez (264 games): 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1", "f8e7"],
        // Ruy Lopez: 1.e4 e5 2.Nf3 Nc6 3.Bb5
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"],
        // Against Caro-Kann (key in 1960 WC): 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4
        ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4"],
        // Against Caro-Kann advance: 1.e4 c6 2.d4 d5 3.e5
        ["e2e4", "c7c6", "d2d4", "d7d5", "e4e5"],
        // Evans Gambit: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4"],
        // King's Gambit: 1.e4 e5 2.f4
        ["e2e4", "e7e5", "f2f4"],
      ],
      black: [
        // Sicilian (336 games as Black!): 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"],
        // Sicilian Dragon: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "g7g6"],
        // Sicilian Scheveningen: 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 d6
        ["e2e4", "c7c5", "g1f3", "e7e6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "d7d6"],
        // King's Indian: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O
        ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "g1f3", "e8g8"],
        // Modern Benoni: 1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6
        ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "e7e6", "b1c3", "e6d5", "c4d5", "d7d6"],
      ],
    },
  },
  {
    id: "karpov",
    name: "Karpov",
    title: "The Boa Constrictor",
    elo: 2780,
    description: "Positional mastery, 242 Sicilian games and Caro-Kann specialist",
    style: "Positional",
    avatar: "♜",
    image: "/bots/karpov.png",
    color: "#4682B4",
    openings: {
      // Early career: 1.e4 (Sicilian 242, Ruy Lopez 143, KID 191)
      // Later career: 1.d4 systems, English, Catalan
      white: [
        // 1.d4 Nf6 2.c4 e6 3.Nf3 (QI/Bogo systems - his late favorite)
        ["d2d4", "g8f6", "c2c4", "e7e6", "g1f3"],
        // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 (QGD Bg5 - key weapon)
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5"],
        // QGD Exchange: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c4d5", "e6d5"],
        // English Opening: 1.c4
        ["c2c4"],
        // 1.e4 Ruy Lopez (early career - 143 games): 1.e4 e5 2.Nf3 Nc6 3.Bb5
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"],
        // Open Sicilian (242 games): 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4"],
        // Anti-Meran Semi-Slav: 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6 5.Bg5
        ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6", "b1c3", "e7e6", "c1g5"],
      ],
      black: [
        // Caro-Kann (signature!): 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7
        ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "b8d7"],
        // Caro-Kann Classical: 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5
        ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "c8f5"],
        // Caro-Kann: 1.e4 c6
        ["e2e4", "c7c6"],
        // QGD: 1.d4 d5 2.c4 e6 3.Nc3 Be7
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "f8e7"],
        // Nimzo-Indian: 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4
        ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"],
        // Petroff (solid): 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4
        ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "d7d6", "e5f3", "f6e4"],
        // vs English: 1.c4 e5
        ["c2c4", "e7e5"],
      ],
    },
  },
  {
    id: "fischer",
    name: "Fischer",
    title: "The Greatest Prodigy",
    elo: 2785,
    description: "1.e4 devotee, Najdorf master, 'Best by test'",
    style: "Classical",
    avatar: "♗",
    image: "/bots/fischer.png",
    color: "#228B22",
    openings: {
      // Fischer almost exclusively played 1.e4
      // Only played 1.d4 once in a serious game!
      white: [
        // Ruy Lopez (main weapon): 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1", "f8e7", "f1e1"],
        // Ruy Lopez Exchange ("Fischer Variation"): 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5c6", "d7c6", "e1g1"],
        // Fischer-Sozin vs Sicilian: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bc4
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "b8c6", "f1c4"],
        // Fischer-Sozin vs Najdorf: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bc4
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6", "f1c4"],
        // vs French Winawer: 1.e4 e6 2.d4 d5 3.Nc3 Bb4
        ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "f8b4"],
        // vs Caro-Kann Panov: 1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4
        ["e2e4", "c7c6", "d2d4", "d7d5", "e4d5", "c6d5", "c2c4"],
        // vs Caro-Kann Two Knights: 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4
        ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4"],
        // King's Indian Attack: 1.e4 ... 2.d3 (flexible)
        ["e2e4", "e7e6", "d2d3", "d7d5", "b1d2", "g8f6", "g1f3"],
      ],
      black: [
        // Najdorf Sicilian (Fischer's signature!): full main line
        // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Be7
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6", "c1g5", "e7e6", "f2f4", "f8e7"],
        // Najdorf Poisoned Pawn (Fischer proved it sound - 70%!):
        // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Qb6
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6", "c1g5", "e7e6", "f2f4", "d8b6"],
        // King's Indian Classical: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5
        ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "g1f3", "e8g8", "f1e2", "e7e5"],
        // Grunfeld: 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5
        ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "d7d5", "c4d5", "f6d5"],
        // Nimzo-Indian (rare but Fischer line): 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 b6
        ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4", "e2e3", "b7b6"],
      ],
    },
  },
  {
    id: "kasparov",
    name: "Kasparov",
    title: "The Beast from Baku",
    elo: 2851,
    description: "Opening mastermind, 158 KID games and deep preparation",
    style: "Dynamic",
    avatar: "♛",
    image: "/bots/kasparov.png",
    color: "#8B0000",
    openings: {
      // Kasparov: Sicilian (192 as White), Ruy Lopez (104), QGD (91), Scotch
      white: [
        // Open Sicilian (192 games!): 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3"],
        // English Attack vs Najdorf: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6", "c1e3"],
        // Maroczy Bind vs Accelerated Dragon: 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4
        ["e2e4", "c7c5", "g1f3", "b8c6", "d2d4", "c5d4", "f3d4", "g7g6", "c2c4"],
        // Scotch (Kasparov revived this!): 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4
        ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f3d4"],
        // Ruy Lopez (104 games): 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1"],
        // QGD (91 games): 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c4d5", "e6d5"],
        // Catalan: 1.d4 d5 2.c4 e6 3.Nf3 Nf6 4.g3
        ["d2d4", "d7d5", "c2c4", "e7e6", "g1f3", "g8f6", "g2g3"],
      ],
      black: [
        // King's Indian Classical (158 games! - his signature):
        // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6
        ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "g1f3", "e8g8", "f1e2", "e7e5", "e1g1", "b8c6"],
        // King's Indian shorter: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6
        ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6"],
        // Najdorf Sicilian: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"],
        // Grunfeld: 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7
        ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "d7d5", "c4d5", "f6d5", "e2e4", "d5c3", "b2c3", "f8g7"],
        // QGD Tartakower: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 b6
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7", "e2e3", "e8g8", "g1f3", "b7b6"],
      ],
    },
  },
  {
    id: "anand",
    name: "Anand",
    title: "The Lightning Kid",
    elo: 2800,
    description: "652 Sicilian games, rapid calculation master",
    style: "Tactical",
    avatar: "♝",
    image: "/bots/anand.png",
    color: "#FF8C00",
    openings: {
      // Anand: Sicilian (652!), Ruy Lopez (488), Najdorf specialist (165)
      white: [
        // Open Sicilian (652 games!): 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3"],
        // vs Najdorf (165 games): 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6", "c1e3"],
        // Ruy Lopez (488 games!): 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1", "f8e7", "f1e1", "b7b5", "a4b3"],
        // Ruy Lopez closed: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1"],
        // Sicilian vs e6: 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4
        ["e2e4", "c7c5", "g1f3", "e7e6", "d2d4", "c5d4", "f3d4"],
        // 1.d4 (occasional): 1.d4 d5 2.c4 e6 3.Nf3 Nf6
        ["d2d4", "d7d5", "c2c4", "e7e6", "g1f3", "g8f6"],
      ],
      black: [
        // Najdorf Sicilian: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"],
        // Taimanov Sicilian: 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6
        ["e2e4", "c7c5", "g1f3", "e7e6", "d2d4", "c5d4", "f3d4", "b8c6"],
        // Slav Defense: 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6
        ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6", "b1c3", "e7e6"],
        // QGD: 1.d4 d5 2.c4 e6 3.Nc3 Nf6
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6"],
        // Berlin Defense: 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8f6"],
      ],
    },
  },
  {
    id: "nakamura",
    name: "Hikaru",
    title: "The Speed King",
    elo: 2780,
    description: "1.b3 specialist, bullet chess master, Dutch Defense player",
    style: "Unorthodox",
    avatar: "♘",
    image: "/bots/nakamura.png",
    color: "#9400D3",
    openings: {
      // Nakamura: 1.b3 (signature!), King's Gambit, 1.e4
      white: [
        // Nimzovich-Larsen Attack (signature!): 1.b3
        ["b2b3"],
        // Nimzovich-Larsen Indian: 1.b3 Nf6 2.Bb2 g6 3.Bxf6 exf6
        ["b2b3", "g8f6", "c1b2"],
        // Nimzovich-Larsen: 1.b3 d5 2.Bb2
        ["b2b3", "d7d5", "c1b2"],
        // 1.e4 Ruy Lopez: 1.e4 e5 2.Nf3 Nc6 3.Bb5
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"],
        // King's Gambit: 1.e4 e5 2.f4
        ["e2e4", "e7e5", "f2f4"],
        // Open Sicilian: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4"],
        // London System: 1.d4 d5 2.Bf4
        ["d2d4", "d7d5", "c1f4"],
        // London System: 1.d4 Nf6 2.Bf4
        ["d2d4", "g8f6", "c1f4"],
      ],
      black: [
        // Sicilian (243 games): 1.e4 c5 2.Nf3 Nc6
        ["e2e4", "c7c5", "g1f3", "b8c6"],
        // Sicilian Najdorf: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"],
        // Dutch Defense (41 games - unusual!): 1.d4 f5
        ["d2d4", "f7f5"],
        // Dutch Leningrad: 1.d4 f5 2.c4 Nf6 3.g3 g6
        ["d2d4", "f7f5", "c2c4", "g8f6", "g2g3", "g7g6"],
        // King's Indian: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6
        ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6"],
        // Semi-Slav: 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6
        ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6", "b1c3", "e7e6"],
      ],
    },
  },
  {
    id: "carlsen",
    name: "Magnus",
    title: "The World Champion",
    elo: 2850,
    description: "Universal player, London System expert, Berlin endgame master",
    style: "Universal",
    avatar: "♔",
    image: "/bots/carlsen.png",
    color: "#1E90FF",
    openings: {
      // Carlsen: London System, Ruy Lopez, English, Italian, Catalan
      white: [
        // London System (main weapon): 1.d4 d5 2.Bf4
        ["d2d4", "d7d5", "c1f4"],
        // London System: 1.d4 Nf6 2.Bf4 d5 3.e3 c5 4.c3
        ["d2d4", "g8f6", "c1f4", "d7d5", "e2e3", "c7c5", "c2c3"],
        // London System: 1.d4 Nf6 2.Bf4
        ["d2d4", "g8f6", "c1f4"],
        // Ruy Lopez: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1"],
        // Italian (modern Magnus): 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O Nf6 5.d3
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "e1g1", "g8f6", "d2d3"],
        // English: 1.c4 e5 2.Nc3
        ["c2c4", "e7e5", "b1c3"],
        // Catalan: 1.d4 d5 2.c4 e6 3.Nf3 Nf6 4.g3
        ["d2d4", "d7d5", "c2c4", "e7e6", "g1f3", "g8f6", "g2g3"],
        // Reti: 1.Nf3 d5 2.g3
        ["g1f3", "d7d5", "g2g3"],
      ],
      black: [
        // Berlin Defense (signature!): 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8f6", "e1g1", "f6e4"],
        // Berlin shorter: 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6
        ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8f6"],
        // Sveshnikov Sicilian: 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5
        ["e2e4", "c7c5", "g1f3", "b8c6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "e7e5"],
        // QGD: 1.d4 d5 2.c4 e6 3.Nc3 Nf6
        ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6"],
        // Nimzo-Indian: 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4
        ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"],
        // King's Indian: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7
        ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7"],
        // Caro-Kann (occasional): 1.e4 c6
        ["e2e4", "c7c6"],
      ],
    },
  },
];

export const getBotById = (id: string): ChessBot | undefined =>
  CHESS_BOTS.find((bot) => bot.id === id);
