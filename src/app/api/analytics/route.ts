import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsCollector, AnalyticsProcessor } from '@/lib/analytics';
import { generateSampleAnalyticsData } from '@/lib/generateSampleData';
import { runAnalyticsTests, generateTestData } from '@/lib/testAnalytics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    switch (type) {
      case 'overview':
        const gameStats = AnalyticsProcessor.calculateGameStats();
        return NextResponse.json(gameStats);

      case 'players':
        const playerStats = AnalyticsProcessor.calculatePlayerStats();
        return NextResponse.json(playerStats);

      case 'response-times':
        const responseTimeData = AnalyticsProcessor.generateResponseTimeChartData();
        return NextResponse.json(responseTimeData);

      case 'all-games':
        const allGames = AnalyticsCollector.getAllAnalytics();
        return NextResponse.json(allGames);

      case 'generate-sample':
        generateSampleAnalyticsData();
        return NextResponse.json({ message: 'Sample data generated successfully' });

      case 'run-tests':
        const testResults = runAnalyticsTests();
        return NextResponse.json({
          success: testResults,
          message: testResults ? 'All tests passed' : 'Some tests failed'
        });

      case 'generate-test-data':
        generateTestData();
        return NextResponse.json({ message: 'Test data generated successfully' });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    AnalyticsCollector.clearAnalytics();
    return NextResponse.json({ message: 'Analytics data cleared successfully' });
  } catch (error) {
    console.error('Analytics clear error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
