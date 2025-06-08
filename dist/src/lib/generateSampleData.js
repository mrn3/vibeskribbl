"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSampleAnalyticsData = generateSampleAnalyticsData;
exports.resetSampleData = resetSampleData;
// Generate sample analytics data for testing
const analytics_1 = require("./analytics");
function generateSampleAnalyticsData() {
    console.log('Generating sample analytics data...');
    // Sample players
    const players = [
        { id: 'player1', name: 'Alice', score: 0, isDrawing: false },
        { id: 'player2', name: 'Bob', score: 0, isDrawing: false },
        { id: 'player3', name: 'Charlie', score: 0, isDrawing: false },
        { id: 'player4', name: 'Diana', score: 0, isDrawing: false }
    ];
    // Sample words
    const words = ['cat', 'house', 'tree', 'car', 'book', 'phone', 'computer', 'pizza'];
    // Generate 3 sample games
    for (let gameNum = 1; gameNum <= 3; gameNum++) {
        const gameId = analytics_1.AnalyticsCollector.startGame(`room-${gameNum}`, players);
        // Generate 3 rounds per game
        for (let roundNum = 1; roundNum <= 3; roundNum++) {
            const word = words[Math.floor(Math.random() * words.length)];
            const drawer = players[(roundNum - 1) % players.length];
            // Start round
            analytics_1.AnalyticsCollector.startRound(gameId, roundNum, word, drawer, players.length);
            // Generate random guesses for non-drawer players
            const nonDrawerPlayers = players.filter(p => p.id !== drawer.id);
            nonDrawerPlayers.forEach((player, index) => {
                // Random guess time between 5-25 seconds
                const guessTime = 5 + Math.random() * 20;
                // Points based on guess time (similar to game logic)
                let points = 40;
                if (guessTime <= 10)
                    points = 100;
                else if (guessTime <= 20)
                    points = 80;
                // Add first guesser bonus
                if (index === 0)
                    points += 30;
                analytics_1.AnalyticsCollector.recordGuess(gameId, roundNum, player, guessTime, points);
                // Update player score for next round
                player.score += points;
            });
            // End round (30 seconds total round time)
            analytics_1.AnalyticsCollector.endRound(gameId, roundNum, 30);
        }
        // End game with winner (highest score)
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        analytics_1.AnalyticsCollector.endGame(gameId, sortedPlayers[0]);
        // Reset scores for next game
        players.forEach(p => p.score = 0);
    }
    console.log('Sample analytics data generated successfully!');
}
// Function to clear and regenerate sample data
function resetSampleData() {
    analytics_1.AnalyticsCollector.clearAnalytics();
    generateSampleAnalyticsData();
}
