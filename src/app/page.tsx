'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  
  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    // Redirect to game page with query params
    router.push(`/game?name=${encodeURIComponent(playerName)}`);
  };
  
  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    // Redirect to game page with query params
    router.push(`/game?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}`);
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-400 to-purple-500">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">VibeSkribbl</h1>
          <p className="text-gray-600">Draw, Guess, and Have Fun!</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="mb-6">
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            id="playerName"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>
        
        {isJoining ? (
          <>
            <div className="mb-6">
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                Room ID
              </label>
              <input
                type="text"
                id="roomId"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleJoinRoom}
              >
                Join Room
              </button>
              
              <button
                className="w-full py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setIsJoining(false)}
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col space-y-3">
            <button
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleCreateRoom}
            >
              Create New Room
            </button>
            
            <button
              className="w-full py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              onClick={() => setIsJoining(true)}
            >
              Join Existing Room
            </button>
          </div>
        )}
      </div>
      
      <footer className="mt-8 text-white text-center">
        <p>A Skribbl.io clone with good vibes only!</p>
        <div className="mt-4">
          <a
            href="/analytics"
            className="inline-flex items-center px-4 py-2 bg-gray-800 bg-opacity-80 text-white rounded-lg hover:bg-opacity-90 transition-all duration-200 border border-white border-opacity-30 shadow-lg backdrop-blur-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Analytics
          </a>
        </div>
      </footer>
    </main>
  );
}
