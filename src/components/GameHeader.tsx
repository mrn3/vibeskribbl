'use client';

import { useEffect, useState } from 'react';

interface GameHeaderProps {
  round: number;
  maxRounds: number;
  timeLeft?: number;
  drawer?: {
    id: string;
    name: string;
  };
  word?: string; // Only shown to drawer
  wordHint?: string; // Partial hint for guessers
  isDrawer: boolean;
}

export default function GameHeader({
  round,
  maxRounds,
  timeLeft,
  drawer,
  word,
  wordHint,
  isDrawer
}: GameHeaderProps) {
  const [timer, setTimer] = useState(timeLeft || 0);
  
  useEffect(() => {
    setTimer(timeLeft || 0);
    
    if (!timeLeft) return;
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timeLeft]);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-lg font-bold">
          Round {round} of {maxRounds}
        </div>
        
        <div className={`text-xl font-bold px-4 py-2 rounded-lg ${
          timer <= 10 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {timer}s
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="font-medium">
          {drawer && (
            isDrawer ? (
              <span>You are drawing now!</span>
            ) : (
              <span><b>{drawer.name}</b> is drawing</span>
            )
          )}
        </div>
        
        <div className="text-lg font-bold tracking-wider">
          {isDrawer && word ? (
            <span className="text-green-600">{word}</span>
          ) : (
            <span>{wordHint || ''}</span>
          )}
        </div>
      </div>
    </div>
  );
} 