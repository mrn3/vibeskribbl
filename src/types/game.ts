// Shared types for the drawing game

export interface DrawData {
  type: 'start' | 'draw' | 'end';
  x: number;
  y: number;
  color: string;
  lineWidth: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  previousScore?: number;
  isDrawing: boolean;
  hasGuessedCorrectly?: boolean;
}

export interface Room {
  id: string;
  players: Player[];
  currentWord?: string;
  currentDrawer?: string;
  gameState: 'waiting' | 'playing' | 'between-rounds';
  roundTime: number;
  currentRound: number;
  maxRounds: number;
  wordOptions?: string[];
  revealedLetters?: number[];
  hintTimer?: NodeJS.Timeout;
  roundStartTime?: number;
  firstGuesser?: boolean;
  gameId?: string; // Analytics tracking ID
}

export interface Message {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  isSystemMessage?: boolean;
  isCorrectGuess?: boolean;
}

// Socket event data interfaces
export interface RoomJoinedData {
  roomId: string;
  playerId: string;
}

export interface GameStartedData {
  currentRound: number;
  maxRounds: number;
}

export interface NewDrawerData {
  drawerId: string;
  drawerName: string;
  roundNumber: number;
}

export interface WordOptionsData {
  options: string[];
}

export interface WordToDrawData {
  word: string;
}

export interface RoundStartedData {
  drawerId: string;
  wordLength: number;
}

export interface RoundTimerData {
  duration: number;
}

export interface RoundEndedData {
  word: string;
}

export interface GameEndedData {
  players: Player[];
  winner: Player;
}

export interface PlayerGuessedData {
  playerId: string;
  playerName: string;
}

export interface ChatUpdateData {
  playerId: string;
  playerName: string;
  message: string;
}

export interface WordHintData {
  hint: string;
}

export interface RoundSummaryData {
  word: string;
  players: Player[];
  drawer: {
    id: string;
    name: string;
  };
}

export interface WordGuessedData {
  word: string;
  pointsEarned?: number;
  message?: string;
}

// Color validation utility
export function isValidHexColor(color: string): boolean {
  const colorRegex = /^#[0-9A-Fa-f]{6}$/;
  return colorRegex.test(color);
}

// DrawData validation utility
export function validateDrawData(data: unknown): data is DrawData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'type' in data &&
    'x' in data &&
    'y' in data &&
    'color' in data &&
    'lineWidth' in data &&
    typeof (data as Record<string, unknown>).type === 'string' &&
    ['start', 'draw', 'end'].includes((data as Record<string, unknown>).type as string) &&
    typeof (data as Record<string, unknown>).x === 'number' &&
    typeof (data as Record<string, unknown>).y === 'number' &&
    typeof (data as Record<string, unknown>).color === 'string' &&
    isValidHexColor((data as Record<string, unknown>).color as string) &&
    typeof (data as Record<string, unknown>).lineWidth === 'number' &&
    ((data as Record<string, unknown>).lineWidth as number) > 0
  );
}
