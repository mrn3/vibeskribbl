"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const analytics_1 = require("@/lib/analytics");
const generateSampleData_1 = require("@/lib/generateSampleData");
const testAnalytics_1 = require("@/lib/testAnalytics");
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
            case 'generate-sample':
                (0, generateSampleData_1.generateSampleAnalyticsData)();
                return server_1.NextResponse.json({ message: 'Sample data generated successfully' });
            case 'run-tests':
                const testResults = (0, testAnalytics_1.runAnalyticsTests)();
                return server_1.NextResponse.json({
                    success: testResults,
                    message: testResults ? 'All tests passed' : 'Some tests failed'
                });
            case 'generate-test-data':
                (0, testAnalytics_1.generateTestData)();
                return server_1.NextResponse.json({ message: 'Test data generated successfully' });
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
