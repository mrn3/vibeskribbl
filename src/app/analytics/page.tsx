'use client';

import React, { useState, useEffect } from 'react';
import { AnalyticsProcessor } from '@/lib/analytics';
import { GamePerformanceStats, PlayerPerformanceStats, AnalyticsFilters } from '@/types/analytics';
import StatsCard from '@/components/Analytics/StatsCard';
import SimpleChart from '@/components/Analytics/SimpleChart';
import PlayerPerformanceTable from '@/components/Analytics/PlayerPerformanceTable';
import GameSummaryCard from '@/components/Analytics/GameSummaryCard';
import WordAnalyticsCard from '@/components/Analytics/WordAnalyticsCard';
import LiveStatsCard from '@/components/Analytics/LiveStatsCard';
import SystemHealthCard from '@/components/Analytics/SystemHealthCard';

export default function AnalyticsPage() {
  const [gameStats, setGameStats] = useState<GamePerformanceStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerPerformanceStats[]>([]);
  const [sortBy, setSortBy] = useState<keyof PlayerPerformanceStats>('totalPointsEarned');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [loading, setLoading] = useState(true);
  const [responseTimeChartData, setResponseTimeChartData] = useState<any>(null);
  const [allGames, setAllGames] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load overview stats
      const overviewResponse = await fetch('/api/analytics?type=overview');
      if (overviewResponse.ok) {
        const stats = await overviewResponse.json();
        setGameStats(stats);
        setPlayerStats(stats.playerStats);
      }

      // Load response time chart data
      const responseTimeResponse = await fetch('/api/analytics?type=response-times');
      if (responseTimeResponse.ok) {
        const chartData = await responseTimeResponse.json();
        setResponseTimeChartData(chartData);
      }

      // Load all games data
      const allGamesResponse = await fetch('/api/analytics?type=all-games');
      if (allGamesResponse.ok) {
        const gamesData = await allGamesResponse.json();
        setAllGames(gamesData);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof PlayerPerformanceStats) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Remove the direct call since we're now loading from API

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!gameStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
          <p className="mt-1 text-sm text-gray-500">Start playing games to see analytics data here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Game Analytics</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Player response times and game performance insights
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={loadAnalytics}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={async () => {
                    await fetch('/api/analytics?type=generate-sample');
                    loadAnalytics();
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Generate Sample Data
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all analytics data? This action cannot be undone.')) {
                      try {
                        const response = await fetch('/api/analytics', { method: 'DELETE' });
                        if (response.ok) {
                          loadAnalytics();
                          alert('All analytics data has been cleared successfully.');
                        } else {
                          alert('Failed to clear analytics data. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error clearing analytics data:', error);
                        alert('An error occurred while clearing analytics data.');
                      }
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All Data
                </button>
                <button
                  onClick={async () => {
                    const response = await fetch('/api/analytics?type=run-tests');
                    const result = await response.json();
                    alert(result.message);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Tests
                </button>
                <a
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Game
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Live Stats and Quick Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <LiveStatsCard />
          </div>
          <div className="lg:col-span-1">
            <SystemHealthCard />
          </div>
          <div className="lg:col-span-2">
            <GameSummaryCard games={allGames} maxGames={3} />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Games"
            value={gameStats.totalGames}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <StatsCard
            title="Total Players"
            value={gameStats.totalPlayers}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Avg Game Duration"
            value={`${(gameStats.averageGameDuration / 60).toFixed(1)}m`}
            subtitle="minutes"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Avg Players/Game"
            value={gameStats.averagePlayersPerGame.toFixed(1)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Response Time Distribution */}
          {responseTimeChartData && (
            <SimpleChart
              data={responseTimeChartData}
              type="bar"
              title="Response Time Distribution"
              width={500}
              height={300}
            />
          )}

          {/* Word Analytics */}
          <WordAnalyticsCard
            words={gameStats.mostPopularWords}
            title="Word Analytics"
          />
        </div>

        {/* Player Performance Table */}
        <PlayerPerformanceTable
          players={playerStats}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      </div>
    </div>
  );
}
