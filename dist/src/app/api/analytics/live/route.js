"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
// This would typically connect to your real-time game server
// For now, we'll simulate live statistics
async function GET(request) {
    try {
        // In a real implementation, this would query:
        // - Active WebSocket connections
        // - Current game states from the socket server
        // - Real-time player counts
        // - Active room information
        // Simulate live stats
        const liveStats = {
            activeGames: Math.floor(Math.random() * 5), // 0-4 active games
            activePlayers: Math.floor(Math.random() * 20), // 0-19 active players
            activeRooms: Math.floor(Math.random() * 8), // 0-7 active rooms
            averagePlayersPerRoom: 2.5,
            peakPlayersToday: 15,
            gamesStartedToday: Math.floor(Math.random() * 10) + 5,
            currentServerLoad: Math.random() * 100, // 0-100%
            uptime: Date.now() - (24 * 60 * 60 * 1000), // 24 hours ago
            lastUpdated: Date.now(),
            // Recent activity (last 5 minutes)
            recentActivity: [
                {
                    type: 'game_started',
                    roomId: 'happy-panda',
                    playerCount: 3,
                    timestamp: Date.now() - 120000 // 2 minutes ago
                },
                {
                    type: 'player_joined',
                    roomId: 'silly-dragon',
                    playerName: 'Alice',
                    timestamp: Date.now() - 180000 // 3 minutes ago
                },
                {
                    type: 'game_completed',
                    roomId: 'funny-tiger',
                    winner: 'Bob',
                    duration: 180, // 3 minutes
                    timestamp: Date.now() - 240000 // 4 minutes ago
                }
            ],
            // Server health metrics
            serverHealth: {
                status: 'healthy',
                responseTime: Math.floor(Math.random() * 50) + 10, // 10-60ms
                memoryUsage: Math.random() * 80 + 10, // 10-90%
                cpuUsage: Math.random() * 60 + 5, // 5-65%
                activeConnections: Math.floor(Math.random() * 50) + 10
            }
        };
        return server_1.NextResponse.json(liveStats);
    }
    catch (error) {
        console.error('Live analytics API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
