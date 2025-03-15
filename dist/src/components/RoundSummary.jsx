"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RoundSummary;
const react_1 = require("react");
function RoundSummary({ word, players, drawer, isVisible, onClose }) {
    const [timeLeft, setTimeLeft] = (0, react_1.useState)(10);
    // Auto-close after timeout
    (0, react_1.useEffect)(() => {
        if (!isVisible) {
            setTimeLeft(10);
            return;
        }
        if (timeLeft <= 0) {
            if (onClose)
                onClose();
            return;
        }
        const timer = setTimeout(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [isVisible, timeLeft, onClose]);
    if (!isVisible)
        return null;
    // Sort players by score
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
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
            return (<div key={player.id} className="py-2 flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium text-gray-800">{player.name}</span>
                  {player.id === drawer.id && (<span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                      Drawer
                    </span>)}
                </div>
                
                <div className="flex items-center">
                  <span className="font-bold text-lg text-gray-800">{player.score}</span>
                  
                  {pointsGained > 0 && (<span className="ml-2 text-green-600 font-medium animate-bounce-once flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
                      </svg>
                      +{pointsGained}
                    </span>)}
                </div>
              </div>);
        })}
        </div>
      </div>
    </div>);
}
