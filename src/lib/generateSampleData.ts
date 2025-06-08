// Generate sample analytics data for testing
import { AnalyticsCollector } from './analytics';
import { Player } from '@/types/game';

export function generateSampleAnalyticsData() {
  console.log('Generating sample analytics data...');

  // Sample players
  const players: Player[] = [
    { id: 'player1', name: 'Alice', score: 0, isDrawing: false },
    { id: 'player2', name: 'Bob', score: 0, isDrawing: false },
    { id: 'player3', name: 'Charlie', score: 0, isDrawing: false },
    { id: 'player4', name: 'Diana', score: 0, isDrawing: false }
  ];

  // Sample words
  const words = ['cat', 'house', 'tree', 'car', 'book', 'phone', 'computer', 'pizza'];

  // Generate 3 sample games
  for (let gameNum = 1; gameNum <= 3; gameNum++) {
    const gameId = AnalyticsCollector.startGame(`room-${gameNum}`, players);
    
    // Generate 3 rounds per game
    for (let roundNum = 1; roundNum <= 3; roundNum++) {
      const word = words[Math.floor(Math.random() * words.length)];
      const drawer = players[(roundNum - 1) % players.length];
      
      // Start round
      AnalyticsCollector.startRound(gameId, roundNum, word, drawer, players.length);
      
      // Generate random guesses for non-drawer players
      const nonDrawerPlayers = players.filter(p => p.id !== drawer.id);
      
      nonDrawerPlayers.forEach((player, index) => {
        // Random guess time between 5-25 seconds
        const guessTime = 5 + Math.random() * 20;
        
        // Points based on guess time (similar to game logic)
        let points = 40;
        if (guessTime <= 10) points = 100;
        else if (guessTime <= 20) points = 80;
        
        // Add first guesser bonus
        if (index === 0) points += 30;
        
        AnalyticsCollector.recordGuess(gameId, roundNum, player, guessTime, points);
        
        // Update player score for next round
        player.score += points;
      });
      
      // End round (30 seconds total round time)
      AnalyticsCollector.endRound(gameId, roundNum, 30);
    }
    
    // End game with winner (highest score)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    AnalyticsCollector.endGame(gameId, sortedPlayers[0]);
    
    // Reset scores for next game
    players.forEach(p => p.score = 0);
  }

  console.log('Sample analytics data generated successfully!');
}

// Function to clear and regenerate sample data
export function resetSampleData() {
  AnalyticsCollector.clearAnalytics();
  generateSampleAnalyticsData();
}
