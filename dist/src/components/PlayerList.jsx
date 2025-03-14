"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlayerList;
function PlayerList({ players, currentPlayerId }) {
    // Sort players by score in descending order
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (<div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-600 text-white p-3 font-bold">
        Players
      </div>
      <ul className="divide-y">
        {sortedPlayers.map((player) => (<li key={player.id} className={`p-3 flex items-center justify-between ${player.id === currentPlayerId ? 'bg-blue-50' : ''}`}>
            <div className="flex items-center">
              {player.isDrawing && (<span className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                  </svg>
                </span>)}
              <span className="font-medium">
                {player.id === currentPlayerId ? `${player.name} (You)` : player.name}
              </span>
            </div>
            <span className="font-bold">{player.score}</span>
          </li>))}
      </ul>
    </div>);
}
