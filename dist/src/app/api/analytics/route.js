"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const analytics_1 = require("@/lib/analytics");
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'overview';
        switch (type) {
            case 'overview':
                const gameStats = analytics_1.AnalyticsProcessor.calculateGameStats();
                return server_1.NextResponse.json(gameStats);
            case 'players':
                const playerStats = analytics_1.AnalyticsProcessor.calculatePlayerStats();
                return server_1.NextResponse.json(playerStats);
            case 'response-times':
                const responseTimeData = analytics_1.AnalyticsProcessor.generateResponseTimeChartData();
                return server_1.NextResponse.json(responseTimeData);
            case 'all-games':
                const allGames = analytics_1.AnalyticsCollector.getAllAnalytics();
                return server_1.NextResponse.json(allGames);
            default:
                return server_1.NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
        }
    }
    catch (error) {
        console.error('Analytics API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function DELETE() {
    try {
        analytics_1.AnalyticsCollector.clearAnalytics();
        return server_1.NextResponse.json({ message: 'Analytics data cleared successfully' });
    }
    catch (error) {
        console.error('Analytics clear error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
