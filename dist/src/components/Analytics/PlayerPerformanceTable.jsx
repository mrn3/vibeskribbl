"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlayerPerformanceTable;
// Player performance table component
const react_1 = __importDefault(require("react"));
function PlayerPerformanceTable({ players, sortBy = 'totalPointsEarned', sortOrder = 'desc', onSort }) {
    const formatTime = (seconds) => {
        if (seconds === 0)
            return '-';
        return `${seconds.toFixed(1)}s`;
    };
    const formatPercentage = (value) => {
        return `${value.toFixed(1)}%`;
    };
    const handleSort = (field) => {
        if (onSort) {
            onSort(field);
        }
    };
    const getSortIcon = (field) => {
        if (sortBy !== field) {
            return (<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>);
        }
        return sortOrder === 'asc' ? (<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/>
      </svg>) : (<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
      </svg>);
    };
    const sortedPlayers = [...players].sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortOrder === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });
    if (players.length === 0) {
        return (<div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Player Performance</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No player data</h3>
          <p className="mt-1 text-sm text-gray-500">No games have been played yet.</p>
        </div>
      </div>);
    }
    return (<div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Player Performance</h3>
        <p className="text-sm text-gray-600 mt-1">Detailed statistics for all players</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('playerName')}>
                <div className="flex items-center space-x-1">
                  <span>Player</span>
                  {getSortIcon('playerName')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalGames')}>
                <div className="flex items-center space-x-1">
                  <span>Games</span>
                  {getSortIcon('totalGames')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalCorrectGuesses')}>
                <div className="flex items-center space-x-1">
                  <span>Correct Guesses</span>
                  {getSortIcon('totalCorrectGuesses')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('averageGuessTime')}>
                <div className="flex items-center space-x-1">
                  <span>Avg Response Time</span>
                  {getSortIcon('averageGuessTime')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('fastestGuessTime')}>
                <div className="flex items-center space-x-1">
                  <span>Fastest Guess</span>
                  {getSortIcon('fastestGuessTime')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalPointsEarned')}>
                <div className="flex items-center space-x-1">
                  <span>Total Points</span>
                  {getSortIcon('totalPointsEarned')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('winRate')}>
                <div className="flex items-center space-x-1">
                  <span>Win Rate</span>
                  {getSortIcon('winRate')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPlayers.map((player, index) => (<tr key={player.playerId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {player.playerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{player.playerName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {player.totalGames}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {player.totalCorrectGuesses}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(player.averageGuessTime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(player.fastestGuessTime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {player.totalPointsEarned.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${player.winRate >= 50
                ? 'bg-green-100 text-green-800'
                : player.winRate >= 25
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'}`}>
                    {formatPercentage(player.winRate)}
                  </span>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
