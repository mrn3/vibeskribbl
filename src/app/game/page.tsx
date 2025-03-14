'use client';

import { Suspense } from 'react';
import GamePageContent from './GamePageContent';

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-400 to-purple-500">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Loading game...</h1>
          <p>Please wait while we set up the game.</p>
        </div>
      </div>
    }>
      <GamePageContent />
    </Suspense>
  );
} 