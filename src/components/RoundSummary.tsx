'use client';

import { useEffect, useState } from 'react';

interface Player {
  id: string;
  name: string;
  score: number;
  previousScore?: number;
  isDrawing: boolean;
}

interface RoundSummaryProps {
  word: string;
  players: Player[];
  drawer: {
    id: string;
    name: string;
  };
  isVisible: boolean;
  onClose?: () => void;
}

export default function RoundSummary({ word, players, drawer, isVisible, onClose }: RoundSummaryProps) {
  const [timeLeft, setTimeLeft] = useState(10);
  
  // Auto-close after timeout
  useEffect(() => {
    if (!isVisible) {
      setTimeLeft(10);
      return;
    }
    
    if (timeLeft <= 0) {
      if (onClose) onClose();
      return;
    }
    
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isVisible, timeLeft, onClose]);
  
  if (!isVisible) return null;
  
  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Round Summary</h2>
          <div className="px-3 py-1 bg-blue-100 rounded-full text-blue-800 font-medium">
            Closing in {timeLeft}s
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
          <p className="font-medium text-gray-700">
            The word was: <span className="font-bold text-indigo-700">{word}</span>
          </p>
          <p className="text-gray-600">
            Drawn by: <span className="font-medium">{drawer.name}</span>
          </p>
        </div>
        
        <h3 className="font-semibold text-lg mb-2 text-gray-700">Player Scores</h3>
        <div className="divide-y">
          {sortedPlayers.map(player => {
            const pointsGained = player.score - (player.previousScore || 0);
            
            return (
              <div key={player.id} className="py-2 flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium text-gray-800">{player.name}</span>
                  {player.id === drawer.id && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                      Drawer
                    </span>
                  )}
                </div>
                
                <div className="flex items-center">
                  <span className="font-bold text-lg text-gray-800">{player.score}</span>
                  
                  {pointsGained > 0 && (
                    <span className="ml-2 text-green-600 font-medium animate-bounce-once flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                      +{pointsGained}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Add scoring explanation */}
        <div className="mt-5 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Scoring System</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Fast guess (0-10 sec): <strong>100 points</strong></span>
            </li>
            <li className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>Quick guess (10-20 sec): <strong>80 points</strong></span>
            </li>
            <li className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Standard guess (20-30 sec): <strong>40 points</strong></span>
            </li>
            <li className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
              <span>First correct guess: <strong>+30 bonus points</strong></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 