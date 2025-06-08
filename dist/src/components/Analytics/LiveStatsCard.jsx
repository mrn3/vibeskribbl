"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LiveStatsCard;
// Live statistics component showing real-time game activity
const react_1 = __importStar(require("react"));
function LiveStatsCard({ refreshInterval = 30000 }) {
    const [stats, setStats] = (0, react_1.useState)({
        activeGames: 0,
        activePlayers: 0,
        gamesCompletedToday: 0,
        averageResponseTime: 0,
        lastUpdated: Date.now()
    });
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [lastRefresh, setLastRefresh] = (0, react_1.useState)(new Date());
    const fetchLiveStats = async () => {
        var _a;
        setIsLoading(true);
        try {
            // In a real implementation, this would fetch from a live stats endpoint
            // For now, we'll simulate with some mock data based on current analytics
            const response = await fetch('/api/analytics?type=overview');
            if (response.ok) {
                const data = await response.json();
                // Simulate live stats based on existing data
                const mockStats = {
                    activeGames: Math.floor(Math.random() * 5), // 0-4 active games
                    activePlayers: Math.floor(Math.random() * 20), // 0-19 active players
                    gamesCompletedToday: data.totalGames || 0,
                    averageResponseTime: ((_a = data.playerStats) === null || _a === void 0 ? void 0 : _a.length) > 0
                        ? data.playerStats.reduce((sum, p) => sum + p.averageGuessTime, 0) / data.playerStats.length
                        : 0,
                    lastUpdated: Date.now()
                };
                setStats(mockStats);
                setLastRefresh(new Date());
            }
        }
        catch (error) {
            console.error('Error fetching live stats:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchLiveStats();
        const interval = setInterval(fetchLiveStats, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);
    const formatTime = (date) => {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    const getStatusColor = (value, thresholds) => {
        if (value === 0)
            return 'text-gray-500';
        if (value <= thresholds.low)
            return 'text-yellow-600';
        if (value >= thresholds.high)
            return 'text-green-600';
        return 'text-blue-600';
    };
    const getStatusIcon = (value) => {
        if (value === 0) {
            return (<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/>
        </svg>);
        }
        return (<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>);
    };
    return (<div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
            <p className="text-sm text-gray-600 mt-1">Real-time game statistics</p>
          </div>
          <div className="flex items-center space-x-2">
            {isLoading ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>) : (<div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>)}
            <span className="text-xs text-gray-500">
              Live
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Main stats grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Active Games */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              {getStatusIcon(stats.activeGames)}
            </div>
            <div className={`text-2xl font-bold ${getStatusColor(stats.activeGames, { low: 1, high: 3 })}`}>
              {stats.activeGames}
            </div>
            <div className="text-sm text-gray-600">Active Games</div>
            {stats.activeGames > 0 && (<div className="text-xs text-green-600 mt-1">
                🎮 Games in progress
              </div>)}
          </div>

          {/* Active Players */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>
            </div>
            <div className={`text-2xl font-bold ${getStatusColor(stats.activePlayers, { low: 2, high: 10 })}`}>
              {stats.activePlayers}
            </div>
            <div className="text-sm text-gray-600">Active Players</div>
            {stats.activePlayers > 0 && (<div className="text-xs text-green-600 mt-1">
                👥 Players online
              </div>)}
          </div>
        </div>

        {/* Secondary stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <div>
                <div className="text-sm font-medium text-gray-900">Games Today</div>
                <div className="text-xs text-gray-500">Completed games</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {stats.gamesCompletedToday}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <div className="text-sm font-medium text-gray-900">Avg Response Time</div>
                <div className="text-xs text-gray-500">All players</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {stats.averageResponseTime > 0 ? `${stats.averageResponseTime.toFixed(1)}s` : '-'}
            </div>
          </div>
        </div>

        {/* Status indicators */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>System Online</span>
            </div>
            <div>
              Last updated: {formatTime(lastRefresh)}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex space-x-2">
          <button onClick={fetchLiveStats} disabled={isLoading} className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Refreshing...' : 'Refresh Now'}
          </button>
          <button onClick={() => window.location.href = '/game'} className="flex-1 px-3 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100">
            Join Game
          </button>
        </div>
      </div>
    </div>);
}
