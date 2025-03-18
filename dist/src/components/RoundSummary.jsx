"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RoundSummary;
const react_1 = require("react");
function RoundSummary({ word, players, drawer, isVisible, onClose }) {
    const [timeLeft, setTimeLeft] = (0, react_1.useState)(10);
    // Sort players by score in descending order
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    // Auto-close after 10 seconds
    (0, react_1.useEffect)(() => {
        if (isVisible && timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
        else if (isVisible && timeLeft === 0 && onClose) {
            onClose();
        }
    }, [isVisible, timeLeft, onClose]);
    if (!isVisible)
        return null;
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Round Summary</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-lg">
            The word was: <span className="font-bold text-blue-600">{word}</span>
          </p>
          <p className="text-sm text-gray-600">
            Drawn by: <span className="font-medium">{drawer.name}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Auto-closing in {timeLeft} seconds...
          </p>
        </div>
        
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
            <li className="flex items-center">
              <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
              <span>Drawer reward: <strong>+20 points per correct guess</strong></span>
            </li>
          </ul>
        </div>
      </div>
    </div>);
}
