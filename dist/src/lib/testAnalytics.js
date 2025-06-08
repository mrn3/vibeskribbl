"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAnalyticsTests = runAnalyticsTests;
exports.generateTestData = generateTestData;
// Test suite for analytics functionality
const analytics_1 = require("./analytics");
function runAnalyticsTests() {
    console.log('🧪 Running Analytics Test Suite...');
    let testsPassed = 0;
    let totalTests = 0;
    // Helper function to run a test
    const runTest = (testName, testFn) => {
        totalTests++;
        try {
            const result = testFn();
            if (result) {
                console.log(`✅ ${testName}`);
                testsPassed++;
            }
            else {
                console.log(`❌ ${testName}`);
            }
        }
        catch (error) {
            console.log(`❌ ${testName} - Error: ${error}`);
        }
    };
    // Clear any existing data
    analytics_1.AnalyticsCollector.clearAnalytics();
    // Test 1: Basic game tracking
    runTest('Basic game tracking', () => {
        const players = [
            { id: 'p1', name: 'Alice', score: 0, isDrawing: false },
            { id: 'p2', name: 'Bob', score: 0, isDrawing: false }
        ];
        const gameId = analytics_1.AnalyticsCollector.startGame('test-room', players);
        const analytics = analytics_1.AnalyticsCollector.getGameAnalytics(gameId);
        return analytics !== undefined &&
            analytics.roomId === 'test-room' &&
            analytics.totalPlayers === 2;
    });
    // Test 2: Round tracking
    runTest('Round tracking', () => {
        const players = [
            { id: 'p1', name: 'Alice', score: 0, isDrawing: false },
            { id: 'p2', name: 'Bob', score: 0, isDrawing: false }
        ];
        const gameId = analytics_1.AnalyticsCollector.startGame('test-room-2', players);
        analytics_1.AnalyticsCollector.startRound(gameId, 1, 'cat', players[0], 2);
        const analytics = analytics_1.AnalyticsCollector.getGameAnalytics(gameId);
        return analytics !== undefined &&
            analytics.rounds.length === 1 &&
            analytics.rounds[0].word === 'cat' &&
            analytics.rounds[0].drawerId === 'p1';
    });
    // Test 3: Player guess tracking
    runTest('Player guess tracking', () => {
        const players = [
            { id: 'p1', name: 'Alice', score: 0, isDrawing: false },
            { id: 'p2', name: 'Bob', score: 0, isDrawing: false }
        ];
        const gameId = analytics_1.AnalyticsCollector.startGame('test-room-3', players);
        analytics_1.AnalyticsCollector.startRound(gameId, 1, 'dog', players[0], 2);
        analytics_1.AnalyticsCollector.recordGuess(gameId, 1, players[1], 15.5, 80);
        const analytics = analytics_1.AnalyticsCollector.getGameAnalytics(gameId);
        return analytics !== undefined &&
            analytics.rounds[0].guesses.length === 1 &&
            analytics.rounds[0].guesses[0].guessTime === 15.5 &&
            analytics.rounds[0].guesses[0].pointsEarned === 80;
    });
    // Test 4: Round completion
    runTest('Round completion', () => {
        const players = [
            { id: 'p1', name: 'Alice', score: 0, isDrawing: false },
            { id: 'p2', name: 'Bob', score: 0, isDrawing: false }
        ];
        const gameId = analytics_1.AnalyticsCollector.startGame('test-room-4', players);
        analytics_1.AnalyticsCollector.startRound(gameId, 1, 'tree', players[0], 2);
        analytics_1.AnalyticsCollector.recordGuess(gameId, 1, players[1], 12.0, 100);
        analytics_1.AnalyticsCollector.endRound(gameId, 1, 30);
        const analytics = analytics_1.AnalyticsCollector.getGameAnalytics(gameId);
        return analytics !== undefined &&
            analytics.rounds[0].roundDuration === 30 &&
            analytics.rounds[0].playersWhoGuessed === 1 &&
            analytics.rounds[0].averageGuessTime === 12.0;
    });
    // Test 5: Game completion
    runTest('Game completion', () => {
        var _a, _b;
        const players = [
            { id: 'p1', name: 'Alice', score: 100, isDrawing: false },
            { id: 'p2', name: 'Bob', score: 80, isDrawing: false }
        ];
        const gameId = analytics_1.AnalyticsCollector.startGame('test-room-5', players);
        analytics_1.AnalyticsCollector.endGame(gameId, players[0]); // Alice wins
        const analytics = analytics_1.AnalyticsCollector.getGameAnalytics(gameId);
        return analytics !== undefined &&
            analytics.endTime !== undefined &&
            ((_a = analytics.winner) === null || _a === void 0 ? void 0 : _a.id) === 'p1' &&
            ((_b = analytics.winner) === null || _b === void 0 ? void 0 : _b.name) === 'Alice';
    });
    // Test 6: Statistics calculation
    runTest('Statistics calculation', () => {
        // Create a complete game for stats testing
        const players = [
            { id: 'p1', name: 'Alice', score: 0, isDrawing: false },
            { id: 'p2', name: 'Bob', score: 0, isDrawing: false },
            { id: 'p3', name: 'Charlie', score: 0, isDrawing: false }
        ];
        const gameId = analytics_1.AnalyticsCollector.startGame('stats-test', players);
        // Round 1
        analytics_1.AnalyticsCollector.startRound(gameId, 1, 'house', players[0], 3);
        analytics_1.AnalyticsCollector.recordGuess(gameId, 1, players[1], 8.0, 100);
        analytics_1.AnalyticsCollector.recordGuess(gameId, 1, players[2], 15.0, 80);
        analytics_1.AnalyticsCollector.endRound(gameId, 1, 30);
        // Round 2
        analytics_1.AnalyticsCollector.startRound(gameId, 2, 'car', players[1], 3);
        analytics_1.AnalyticsCollector.recordGuess(gameId, 2, players[0], 20.0, 40);
        analytics_1.AnalyticsCollector.endRound(gameId, 2, 30);
        players[0].score = 40;
        players[1].score = 100;
        players[2].score = 80;
        analytics_1.AnalyticsCollector.endGame(gameId, players[1]); // Bob wins
        const stats = analytics_1.AnalyticsProcessor.calculateGameStats();
        return stats.totalGames > 0 &&
            stats.totalRounds > 0 &&
            stats.playerStats.length > 0 &&
            stats.mostPopularWords.length > 0;
    });
    // Test 7: Player performance stats
    runTest('Player performance stats', () => {
        const playerStats = analytics_1.AnalyticsProcessor.calculatePlayerStats();
        // Should have stats for Alice, Bob, and Charlie from previous tests
        const aliceStats = playerStats.find(p => p.playerName === 'Alice');
        const bobStats = playerStats.find(p => p.playerName === 'Bob');
        return aliceStats !== undefined &&
            bobStats !== undefined &&
            aliceStats.totalCorrectGuesses > 0 &&
            bobStats.totalCorrectGuesses > 0;
    });
    // Test 8: Chart data generation
    runTest('Chart data generation', () => {
        const chartData = analytics_1.AnalyticsProcessor.generateResponseTimeChartData();
        return chartData.labels.length > 0 &&
            chartData.datasets.length > 0 &&
            chartData.datasets[0].data.length === chartData.labels.length;
    });
    // Test 9: Word analytics
    runTest('Word analytics', () => {
        const stats = analytics_1.AnalyticsProcessor.calculateGameStats();
        const words = stats.mostPopularWords;
        // Should have words from our test games
        const houseWord = words.find(w => w.word === 'house');
        const carWord = words.find(w => w.word === 'car');
        return houseWord !== undefined &&
            carWord !== undefined &&
            houseWord.timesUsed > 0 &&
            houseWord.averageGuessTime > 0;
    });
    // Test 10: Data persistence
    runTest('Data persistence', () => {
        const allAnalytics = analytics_1.AnalyticsCollector.getAllAnalytics();
        return allAnalytics.length > 0 &&
            allAnalytics.every(game => game.gameId && game.roomId);
    });
    // Summary
    console.log(`\n📊 Test Results: ${testsPassed}/${totalTests} tests passed`);
    if (testsPassed === totalTests) {
        console.log('🎉 All analytics tests passed!');
        return true;
    }
    else {
        console.log(`⚠️  ${totalTests - testsPassed} tests failed`);
        return false;
    }
}
// Function to generate comprehensive test data
function generateTestData() {
    console.log('🎲 Generating comprehensive test data...');
    analytics_1.AnalyticsCollector.clearAnalytics();
    const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
    const words = ['cat', 'dog', 'house', 'tree', 'car', 'book', 'phone', 'computer', 'pizza', 'rainbow'];
    // Generate 5 test games
    for (let gameNum = 1; gameNum <= 5; gameNum++) {
        const numPlayers = Math.floor(Math.random() * 3) + 3; // 3-5 players
        const players = [];
        for (let i = 0; i < numPlayers; i++) {
            players.push({
                id: `player-${gameNum}-${i}`,
                name: playerNames[i % playerNames.length],
                score: 0,
                isDrawing: false
            });
        }
        const gameId = analytics_1.AnalyticsCollector.startGame(`test-room-${gameNum}`, players);
        // Generate 3-4 rounds per game
        const numRounds = Math.floor(Math.random() * 2) + 3;
        for (let roundNum = 1; roundNum <= numRounds; roundNum++) {
            const word = words[Math.floor(Math.random() * words.length)];
            const drawerIndex = (roundNum - 1) % players.length;
            const drawer = players[drawerIndex];
            analytics_1.AnalyticsCollector.startRound(gameId, roundNum, word, drawer, players.length);
            // Generate guesses for non-drawer players
            const nonDrawerPlayers = players.filter(p => p.id !== drawer.id);
            const numGuessers = Math.floor(Math.random() * nonDrawerPlayers.length) + 1;
            for (let i = 0; i < numGuessers; i++) {
                const player = nonDrawerPlayers[i];
                const guessTime = 5 + Math.random() * 20; // 5-25 seconds
                let points = 40;
                if (guessTime <= 10)
                    points = 100;
                else if (guessTime <= 20)
                    points = 80;
                if (i === 0)
                    points += 30; // First guesser bonus
                analytics_1.AnalyticsCollector.recordGuess(gameId, roundNum, player, guessTime, points);
                player.score += points;
            }
            analytics_1.AnalyticsCollector.endRound(gameId, roundNum, 30);
        }
        // End game with winner
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        analytics_1.AnalyticsCollector.endGame(gameId, sortedPlayers[0]);
    }
    console.log('✅ Test data generated successfully!');
}
