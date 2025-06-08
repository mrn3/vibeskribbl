// Analytics types for tracking game performance and player behavior

export interface PlayerGuessAnalytics {
  playerId: string;
  playerName: string;
  word: string;
  guessTime: number; // Time in seconds from round start to correct guess
  pointsEarned: number;
  roundNumber: number;
  gameId: string;
  timestamp: number;
}

export interface RoundAnalytics {
  gameId: string;
  roundNumber: number;
  word: string;
  drawerId: string;
  drawerName: string;
  roundDuration: number; // Total round time in seconds
  totalPlayers: number;
  playersWhoGuessed: number;
  averageGuessTime: number;
  fastestGuessTime: number;
  slowestGuessTime: number;
  timestamp: number;
  guesses: PlayerGuessAnalytics[];
}

export interface GameAnalytics {
  gameId: string;
  roomId: string;
  startTime: number;
  endTime?: number;
  totalRounds: number;
  totalPlayers: number;
  winner?: {
    id: string;
    name: string;
    score: number;
  };
  rounds: RoundAnalytics[];
}

export interface PlayerPerformanceStats {
  playerId: string;
  playerName: string;
  totalGames: number;
  totalRounds: number;
  totalCorrectGuesses: number;
  averageGuessTime: number;
  fastestGuessTime: number;
  totalPointsEarned: number;
  averagePointsPerGame: number;
  winRate: number; // Percentage of games won
}

export interface GamePerformanceStats {
  totalGames: number;
  totalRounds: number;
  totalPlayers: number;
  averageGameDuration: number;
  averageRoundDuration: number;
  averagePlayersPerGame: number;
  mostPopularWords: Array<{
    word: string;
    timesUsed: number;
    averageGuessTime: number;
  }>;
  playerStats: PlayerPerformanceStats[];
}

export interface AnalyticsChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export interface AnalyticsFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  playerIds?: string[];
  gameIds?: string[];
  minPlayers?: number;
  maxPlayers?: number;
}
