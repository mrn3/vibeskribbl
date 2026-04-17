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
  isDrawer: boolean;
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
  drawerIndex: number;
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  wordHints: WordHint[] | null;
  wordOptions: string[] | null;
  lastWord: string | null;
  lastTurnReason: "all_guessed" | "time" | "skipped" | null;
  drawing: DrawCommand[];
  winners: { name: string; score: number }[];
  secretWord: string | null;
};

export type ChatEvent =
  | {
      kind: "message";
      player: { id: string; name: string };
      text: string;
    }
  | {
      kind: "correct";
      player: { id: string; name: string };
      points: number;
    };
