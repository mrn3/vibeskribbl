"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AnalyticsPage;
const react_1 = __importStar(require("react"));
const StatsCard_1 = __importDefault(require("@/components/Analytics/StatsCard"));
const SimpleChart_1 = __importDefault(require("@/components/Analytics/SimpleChart"));
const PlayerPerformanceTable_1 = __importDefault(require("@/components/Analytics/PlayerPerformanceTable"));
function AnalyticsPage() {
    const [gameStats, setGameStats] = (0, react_1.useState)(null);
    const [playerStats, setPlayerStats] = (0, react_1.useState)([]);
    const [sortBy, setSortBy] = (0, react_1.useState)('totalPointsEarned');
    const [sortOrder, setSortOrder] = (0, react_1.useState)('desc');
    const [filters, setFilters] = (0, react_1.useState)({});
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [responseTimeChartData, setResponseTimeChartData] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
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
        }
        catch (error) {
            console.error('Error loading analytics:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };
    // Remove the direct call since we're now loading from API
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>);
    }
    if (!gameStats) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
          <p className="mt-1 text-sm text-gray-500">Start playing games to see analytics data here.</p>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50">
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
                <button onClick={loadAnalytics} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Refresh
                </button>
                <a href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Back to Game
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard_1.default title="Total Games" value={gameStats.totalGames} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>}/>
          <StatsCard_1.default title="Total Players" value={gameStats.totalPlayers} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>}/>
          <StatsCard_1.default title="Avg Game Duration" value={`${(gameStats.averageGameDuration / 60).toFixed(1)}m`} subtitle="minutes" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>}/>
          <StatsCard_1.default title="Avg Players/Game" value={gameStats.averagePlayersPerGame.toFixed(1)} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>}/>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Response Time Distribution */}
          {responseTimeChartData && (<SimpleChart_1.default data={responseTimeChartData} type="bar" title="Response Time Distribution" width={500} height={300}/>)}

          {/* Most Popular Words */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Words</h3>
            {gameStats.mostPopularWords.length > 0 ? (<div className="space-y-3">
                {gameStats.mostPopularWords.slice(0, 5).map((word, index) => (<div key={word.word} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 w-8">#{index + 1}</span>
                      <span className="text-sm text-gray-700 ml-2">{word.word}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{word.timesUsed} times</div>
                      <div className="text-xs text-gray-500">
                        Avg: {word.averageGuessTime.toFixed(1)}s
                      </div>
                    </div>
                  </div>))}
              </div>) : (<p className="text-gray-500 text-center py-4">No word data available</p>)}
          </div>
        </div>

        {/* Player Performance Table */}
        <PlayerPerformanceTable_1.default players={playerStats} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}/>
      </div>
    </div>);
}
