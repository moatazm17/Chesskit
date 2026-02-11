interface ChessComPlayer {
  username: string;
  rating: number;
  result?: string;
  title?: string;
}

export interface ChessComGame {
  uuid: string;
  id: string;
  url: string;
  pgn: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
  result: string;
  time_control: string;
  end_time: number;
  eco?: string;
  termination?: string;
}

export interface ChessComProfile {
  avatar?: string;
  player_id: number;
  url: string;
  name?: string;
  username: string;
  title?: string;
  followers?: number;
  country?: string;
  location?: string;
  last_online: number;
  joined: number;
  status: string;
  is_streamer?: boolean;
  verified?: boolean;
}

export interface ChessComStatsCategory {
  last?: { rating: number; date: number; rd?: number };
  best?: { rating: number; date: number; game?: string };
  record?: { win: number; loss: number; draw: number };
}

export interface ChessComPlayerStats {
  chess_rapid?: ChessComStatsCategory;
  chess_blitz?: ChessComStatsCategory;
  chess_bullet?: ChessComStatsCategory;
  chess_daily?: ChessComStatsCategory;
  puzzle?: ChessComStatsCategory;
  tactics?: { highest?: { rating: number }; lowest?: { rating: number } };
}
