// Game summary card component showing recent games
import React from 'react';
import { GameAnalytics } from '@/types/analytics';

interface GameSummaryCardProps {
  games: GameAnalytics[];
  maxGames?: number;
}

export default function GameSummaryCard({ games, maxGames = 5 }: GameSummaryCardProps) {
  const recentGames = games
    .filter(game => game.endTime) // Only completed games
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
    .slice(0, maxGames);

  const formatDuration = (startTime: number, endTime: number): string => {
    const duration = (endTime - startTime) / 1000 / 60; // Convert to minutes
    return `${duration.toFixed(1)}m`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (recentGames.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Games</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No recent games</h3>
          <p className="mt-1 text-sm text-gray-500">Play some games to see recent activity here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Games</h3>
        <p className="text-sm text-gray-600 mt-1">Latest {maxGames} completed games</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {recentGames.map((game, index) => (
          <div key={game.gameId} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Room: {game.roomId}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500">
                        {game.totalPlayers} players
                      </p>
                      <p className="text-xs text-gray-500">
                        {game.totalRounds} rounds
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDuration(game.startTime, game.endTime!)} duration
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center space-x-2">
                  {game.winner && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        🏆 {game.winner.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {game.winner.score} points
                      </p>
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    {formatTime(game.endTime!)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Round summary */}
            <div className="mt-3 flex flex-wrap gap-1">
              {game.rounds.slice(0, 3).map((round, roundIndex) => (
                <div 
                  key={roundIndex}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                  title={`Round ${round.roundNumber}: ${round.word} (${round.playersWhoGuessed}/${round.totalPlayers - 1} guessed)`}
                >
                  <span className="font-medium">R{round.roundNumber}:</span>
                  <span className="ml-1">{round.word}</span>
                  <span className="ml-1 text-gray-500">
                    ({round.playersWhoGuessed}/{round.totalPlayers - 1})
                  </span>
                </div>
              ))}
              {game.rounds.length > 3 && (
                <div className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-500">
                  +{game.rounds.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {games.length > maxGames && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            Showing {maxGames} of {games.length} total games
          </p>
        </div>
      )}
    </div>
  );
}
