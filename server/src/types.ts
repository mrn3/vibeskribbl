export type GamePhase =
  | "lobby"
  | "choosing"
  | "drawing"
  | "turn_result"
  | "game_over";

export type WordHint = {
  ch: string;
  revealed: boolean;
};

export type LineCmd = {
  type: "line";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  c: number;
  w: number;
};

export type FillCmd = {
  type: "fill";
  x: number;
  y: number;
  c: number;
};

export type ClearCmd = { type: "clear" };

export type DrawCommand = LineCmd | FillCmd | ClearCmd;

export type PublicPlayer = {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  guessed: boolean;
  rank: number;
};

export type RoomSettings = {
  drawTime: number;
  rounds: number;
  maxPlayers: number;
  wordChoices: number;
  hints: number;
  customWordsOnly: boolean;
  customWords: string[];
};

export type ClientState = {
  selfId: string;
  roomCode: string;
  phase: GamePhase;
  players: PublicPlayer[];
  settings: RoomSettings;
  /** Index of drawer in players[] during choosing/drawing */
  drawerIndex: number;
  currentRound: number;
  totalRounds: number;
  turnIndex: number;
  /** Seconds left for word choice or drawing */
  timeLeft: number;
  /** Word length and hint slots for guessers */
  wordHints: WordHint[] | null;
  /** Drawer sees options while choosing */
  wordOptions: string[] | null;
  /** Shown after turn for everyone */
  lastWord: string | null;
  lastTurnReason: "all_guessed" | "time" | "skipped" | null;
  drawing: DrawCommand[];
  /** Winner names for simple podium */
  winners: { name: string; score: number }[];
};
