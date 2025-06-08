// Analytics data collection and processing utilities
import { 
  GameAnalytics, 
  RoundAnalytics, 
  PlayerGuessAnalytics, 
  PlayerPerformanceStats, 
  GamePerformanceStats,
  AnalyticsChartData,
  AnalyticsFilters
} from '@/types/analytics';
import { Player, Room } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for analytics data
// In a production environment, this would be replaced with a database
let gameAnalytics: Map<string, GameAnalytics> = new Map();
let playerGuesses: PlayerGuessAnalytics[] = [];

export class AnalyticsCollector {
  
  // Start tracking a new game
  static startGame(roomId: string, players: Player[]): string {
    const gameId = uuidv4();
    const gameAnalytic: GameAnalytics = {
      gameId,
      roomId,
      startTime: Date.now(),
      totalRounds: 0,
      totalPlayers: players.length,
      rounds: []
    };
    
    gameAnalytics.set(gameId, gameAnalytic);
    console.log(`Analytics: Started tracking game ${gameId} in room ${roomId}`);
    return gameId;
  }

  // End game tracking
  static endGame(gameId: string, winner: Player): void {
    const game = gameAnalytics.get(gameId);
    if (game) {
      game.endTime = Date.now();
      game.winner = {
        id: winner.id,
        name: winner.name,
        score: winner.score
      };
      console.log(`Analytics: Ended tracking game ${gameId}, winner: ${winner.name}`);
    }
  }

  // Start tracking a round
  static startRound(gameId: string, roundNumber: number, word: string, drawer: Player, totalPlayers: number): void {
    const game = gameAnalytics.get(gameId);
    if (game) {
      const roundAnalytic: RoundAnalytics = {
        gameId,
        roundNumber,
        word,
        drawerId: drawer.id,
        drawerName: drawer.name,
        roundDuration: 0,
        totalPlayers,
        playersWhoGuessed: 0,
        averageGuessTime: 0,
        fastestGuessTime: 0,
        slowestGuessTime: 0,
        timestamp: Date.now(),
        guesses: []
      };
      
      game.rounds.push(roundAnalytic);
      game.totalRounds = roundNumber;
      console.log(`Analytics: Started tracking round ${roundNumber} for game ${gameId}`);
    }
  }

  // Record a player guess
  static recordGuess(gameId: string, roundNumber: number, player: Player, guessTime: number, pointsEarned: number): void {
    const game = gameAnalytics.get(gameId);
    if (game) {
      const round = game.rounds.find(r => r.roundNumber === roundNumber);
      if (round) {
        const guess: PlayerGuessAnalytics = {
          playerId: player.id,
          playerName: player.name,
          word: round.word,
          guessTime,
          pointsEarned,
          roundNumber,
          gameId,
          timestamp: Date.now()
        };
        
        round.guesses.push(guess);
        playerGuesses.push(guess);
        round.playersWhoGuessed = round.guesses.length;
        
        // Update round statistics
        const guessTimes = round.guesses.map(g => g.guessTime);
        round.averageGuessTime = guessTimes.reduce((a, b) => a + b, 0) / guessTimes.length;
        round.fastestGuessTime = Math.min(...guessTimes);
        round.slowestGuessTime = Math.max(...guessTimes);
        
        console.log(`Analytics: Recorded guess for ${player.name} in ${guessTime}s, earned ${pointsEarned} points`);
      }
    }
  }

  // End round tracking
  static endRound(gameId: string, roundNumber: number, roundDuration: number): void {
    const game = gameAnalytics.get(gameId);
    if (game) {
      const round = game.rounds.find(r => r.roundNumber === roundNumber);
      if (round) {
        round.roundDuration = roundDuration;
        console.log(`Analytics: Ended round ${roundNumber} for game ${gameId}, duration: ${roundDuration}s`);
      }
    }
  }

  // Get all analytics data
  static getAllAnalytics(): GameAnalytics[] {
    return Array.from(gameAnalytics.values());
  }

  // Get analytics for a specific game
  static getGameAnalytics(gameId: string): GameAnalytics | undefined {
    return gameAnalytics.get(gameId);
  }

  // Clear all analytics data (for testing/reset)
  static clearAnalytics(): void {
    gameAnalytics.clear();
    playerGuesses = [];
    console.log('Analytics: Cleared all analytics data');
  }
}

// Analytics processing functions
export class AnalyticsProcessor {
  
  // Calculate overall game performance statistics
  static calculateGameStats(filters?: AnalyticsFilters): GamePerformanceStats {
    let games = Array.from(gameAnalytics.values());
    
    // Apply filters
    if (filters) {
      if (filters.dateRange) {
        games = games.filter(game => 
          game.startTime >= filters.dateRange!.start.getTime() &&
          game.startTime <= filters.dateRange!.end.getTime()
        );
      }
      if (filters.gameIds) {
        games = games.filter(game => filters.gameIds!.includes(game.gameId));
      }
      if (filters.minPlayers) {
        games = games.filter(game => game.totalPlayers >= filters.minPlayers!);
      }
      if (filters.maxPlayers) {
        games = games.filter(game => game.totalPlayers <= filters.maxPlayers!);
      }
    }

    const totalGames = games.length;
    const totalRounds = games.reduce((sum, game) => sum + game.totalRounds, 0);
    const totalPlayers = games.reduce((sum, game) => sum + game.totalPlayers, 0);
    
    const completedGames = games.filter(game => game.endTime);
    const averageGameDuration = completedGames.length > 0 
      ? completedGames.reduce((sum, game) => sum + (game.endTime! - game.startTime), 0) / completedGames.length / 1000
      : 0;

    const allRounds = games.flatMap(game => game.rounds);
    const averageRoundDuration = allRounds.length > 0
      ? allRounds.reduce((sum, round) => sum + round.roundDuration, 0) / allRounds.length
      : 0;

    const averagePlayersPerGame = totalGames > 0 ? totalPlayers / totalGames : 0;

    // Calculate most popular words
    const wordStats = new Map<string, { count: number, totalGuessTime: number, guesses: number }>();
    allRounds.forEach(round => {
      if (!wordStats.has(round.word)) {
        wordStats.set(round.word, { count: 0, totalGuessTime: 0, guesses: 0 });
      }
      const stats = wordStats.get(round.word)!;
      stats.count++;
      stats.totalGuessTime += round.guesses.reduce((sum, guess) => sum + guess.guessTime, 0);
      stats.guesses += round.guesses.length;
    });

    const mostPopularWords = Array.from(wordStats.entries())
      .map(([word, stats]) => ({
        word,
        timesUsed: stats.count,
        averageGuessTime: stats.guesses > 0 ? stats.totalGuessTime / stats.guesses : 0
      }))
      .sort((a, b) => b.timesUsed - a.timesUsed)
      .slice(0, 10);

    // Calculate player statistics
    const playerStats = this.calculatePlayerStats(filters);

    return {
      totalGames,
      totalRounds,
      totalPlayers,
      averageGameDuration,
      averageRoundDuration,
      averagePlayersPerGame,
      mostPopularWords,
      playerStats
    };
  }

  // Calculate player performance statistics
  static calculatePlayerStats(filters?: AnalyticsFilters): PlayerPerformanceStats[] {
    let games = Array.from(gameAnalytics.values());
    
    // Apply filters (same as above)
    if (filters) {
      if (filters.dateRange) {
        games = games.filter(game => 
          game.startTime >= filters.dateRange!.start.getTime() &&
          game.startTime <= filters.dateRange!.end.getTime()
        );
      }
      if (filters.gameIds) {
        games = games.filter(game => filters.gameIds!.includes(game.gameId));
      }
      if (filters.playerIds) {
        games = games.filter(game => 
          game.rounds.some(round => 
            round.guesses.some(guess => filters.playerIds!.includes(guess.playerId))
          )
        );
      }
    }

    const playerStatsMap = new Map<string, {
      name: string;
      games: Set<string>;
      rounds: number;
      correctGuesses: number;
      totalGuessTime: number;
      fastestGuessTime: number;
      totalPoints: number;
      wins: number;
    }>();

    games.forEach(game => {
      game.rounds.forEach(round => {
        round.guesses.forEach(guess => {
          if (!playerStatsMap.has(guess.playerId)) {
            playerStatsMap.set(guess.playerId, {
              name: guess.playerName,
              games: new Set(),
              rounds: 0,
              correctGuesses: 0,
              totalGuessTime: 0,
              fastestGuessTime: Infinity,
              totalPoints: 0,
              wins: 0
            });
          }
          
          const stats = playerStatsMap.get(guess.playerId)!;
          stats.games.add(guess.gameId);
          stats.rounds++;
          stats.correctGuesses++;
          stats.totalGuessTime += guess.guessTime;
          stats.fastestGuessTime = Math.min(stats.fastestGuessTime, guess.guessTime);
          stats.totalPoints += guess.pointsEarned;
          
          // Check if this player won the game
          if (game.winner && game.winner.id === guess.playerId) {
            stats.wins++;
          }
        });
      });
    });

    return Array.from(playerStatsMap.entries()).map(([playerId, stats]) => ({
      playerId,
      playerName: stats.name,
      totalGames: stats.games.size,
      totalRounds: stats.rounds,
      totalCorrectGuesses: stats.correctGuesses,
      averageGuessTime: stats.correctGuesses > 0 ? stats.totalGuessTime / stats.correctGuesses : 0,
      fastestGuessTime: stats.fastestGuessTime === Infinity ? 0 : stats.fastestGuessTime,
      totalPointsEarned: stats.totalPoints,
      averagePointsPerGame: stats.games.size > 0 ? stats.totalPoints / stats.games.size : 0,
      winRate: stats.games.size > 0 ? (stats.wins / stats.games.size) * 100 : 0
    }));
  }

  // Generate chart data for response times
  static generateResponseTimeChartData(filters?: AnalyticsFilters): AnalyticsChartData {
    let guesses = [...playerGuesses];
    
    if (filters) {
      if (filters.dateRange) {
        guesses = guesses.filter(guess => 
          guess.timestamp >= filters.dateRange!.start.getTime() &&
          guess.timestamp <= filters.dateRange!.end.getTime()
        );
      }
      if (filters.playerIds) {
        guesses = guesses.filter(guess => filters.playerIds!.includes(guess.playerId));
      }
    }

    // Group by time ranges (0-5s, 5-10s, 10-15s, 15-20s, 20+s)
    const timeRanges = ['0-5s', '5-10s', '10-15s', '15-20s', '20+s'];
    const counts = [0, 0, 0, 0, 0];

    guesses.forEach(guess => {
      if (guess.guessTime <= 5) counts[0]++;
      else if (guess.guessTime <= 10) counts[1]++;
      else if (guess.guessTime <= 15) counts[2]++;
      else if (guess.guessTime <= 20) counts[3]++;
      else counts[4]++;
    });

    return {
      labels: timeRanges,
      datasets: [{
        label: 'Number of Guesses',
        data: counts,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    };
  }
}
