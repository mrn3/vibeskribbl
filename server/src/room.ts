import type { Server, Socket } from "socket.io";
import type { DrawCommand, GamePhase, ReactionKind, RoomSettings, WordHint } from "./types.js";
import { drawerScoreFromGuesserPoints, guesserScore } from "./scoring.js";
import { parseCustomWords, pickWords } from "./words.js";

type InternalPlayer = {
  id: string;
  token: string;
  socketId: string;
  name: string;
  score: number;
  isHost: boolean;
};

const CHOICE_SECONDS = 15;
const TURN_RESULT_SECONDS = 5;
const REACTION_POINTS = 10;
/** How long a disconnected player's slot (score, identity) is kept for reconnection. */
const RECONNECT_GRACE_MS = 60_000;

function randomId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeGuess(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function buildWordHints(secret: string): WordHint[] {
  const hints: WordHint[] = [];
  for (const ch of secret) {
    if (ch === " ") hints.push({ ch: " ", revealed: false });
    else hints.push({ ch, revealed: false });
  }
  return hints;
}

function defaultSettings(): RoomSettings {
  return {
    drawTime: 60,
    rounds: 3,
    maxPlayers: 12,
    wordChoices: 3,
    hints: 2,
    customWordsOnly: false,
    customWords: []
  };
}

function clampInt(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class Room {
  readonly code: string;
  private io: Server;
  private players = new Map<string, InternalPlayer>();
  private sockets = new Map<string, Socket>();
  settings: RoomSettings = defaultSettings();

  /** Disconnected players awaiting reconnection, keyed by their session token. */
  private pending = new Map<string, { player: InternalPlayer; timer: NodeJS.Timeout }>();
  /** Disposal timer started when the room has no connected players. */
  private disposeTimer: NodeJS.Timeout | null = null;
  /** True while the active turn is frozen waiting for the drawer to reconnect. */
  paused = false;
  private disconnectedDrawerName: string | null = null;

  phase: GamePhase = "lobby";
  private started = false;

  /** 0..(players*rounds-1) */
  private turnCounter = 0;

  private timeLeft = 0;
  private tickTimer: NodeJS.Timeout | null = null;

  private wordOptions: string[] | null = null;
  private secretWord: string | null = null;
  private wordHints: WordHint[] | null = null;
  private hintSlots: number[] = [];
  private hintsRevealed = 0;

  private drawing: DrawCommand[] = [];
  private lastWord: string | null = null;
  private lastTurnReason: "all_guessed" | "time" | "skipped" | null = null;

  private guessed = new Set<string>();
  private turnGuesserPoints: number[] = [];
  private firstGuessAt: number | null = null;

  /** Per-turn reactions: playerId -> kind. Reset each turn. */
  private reactions = new Map<string, ReactionKind>();

  private winners: { name: string; score: number }[] = [];

  /** Secrets already used as the drawn word in the current game; reset between games. */
  private usedWords = new Set<string>();

  private scoreBaseline = new Map<string, number>();
  private drawerDisconnected = false;

  /** Locked at the start of each turn so the drawer cannot shift if a non-drawer disconnects. */
  private currentDrawerId: string | null = null;

  constructor(io: Server, code: string) {
    this.io = io;
    this.code = code;
  }

  dispose() {
    this.stopTick();
    if (this.disposeTimer) {
      clearTimeout(this.disposeTimer);
      this.disposeTimer = null;
    }
    for (const entry of this.pending.values()) clearTimeout(entry.timer);
    this.pending.clear();
  }

  private stopTick() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  private startTick() {
    this.stopTick();
    this.tickTimer = setInterval(() => this.tick(), 1000);
  }

  playerCount() {
    return this.players.size;
  }

  isStarted() {
    return this.started;
  }

  addPlayer(socket: Socket, name: string, makeHost: boolean): string {
    if (this.players.size >= this.settings.maxPlayers) {
      socket.emit("room:error", { message: "Room is full." });
      return "";
    }

    const id = randomId();
    const token = randomId();
    const player: InternalPlayer = {
      id,
      token,
      socketId: socket.id,
      name: name.trim().slice(0, 21) || "Player",
      score: 0,
      isHost: makeHost || this.players.size === 0
    };
    this.players.set(socket.id, player);
    this.sockets.set(socket.id, socket);
    socket.join(this.code);
    this.cancelDispose();
    this.broadcastState();
    return token;
  }

  /**
   * Reattach a previously disconnected player (matched by session token) to a new
   * socket, preserving their identity and score. Returns the player's token on
   * success, or null when no matching pending slot exists.
   */
  tryReconnect(socket: Socket, token: string, name: string): string | null {
    const entry = this.pending.get(token);
    if (!entry) return null;

    clearTimeout(entry.timer);
    this.pending.delete(token);

    const p = entry.player;
    const trimmed = name.trim().slice(0, 21);
    if (trimmed) p.name = trimmed;
    p.socketId = socket.id;
    this.players.set(socket.id, p);
    this.sockets.set(socket.id, socket);
    socket.join(this.code);
    this.cancelDispose();
    this.normalizeHost();

    if (this.paused && this.currentDrawerId === p.id) {
      this.paused = false;
      this.disconnectedDrawerName = null;
      this.startTick();
    }

    this.broadcastState();
    return p.token;
  }

  /**
   * Production disconnect path: keep the player's slot in `pending` for a grace
   * period so they can reconnect and resume. If they were the active drawer, the
   * turn is paused rather than skipped until they return or the grace expires.
   */
  handleDisconnect(socketId: string) {
    const p = this.players.get(socketId);
    if (!p) return;

    const drawer = this.drawerPlayer();
    const isDrawer = !!drawer && drawer.id === p.id;
    const inActiveTurn =
      this.started && (this.phase === "choosing" || this.phase === "drawing") && isDrawer;

    this.players.delete(socketId);
    this.sockets.delete(socketId);

    const timer = setTimeout(() => this.finalizeRemoval(p.token), RECONNECT_GRACE_MS);
    this.pending.set(p.token, { player: p, timer });

    if (inActiveTurn) {
      this.paused = true;
      this.disconnectedDrawerName = p.name;
      this.stopTick();
      this.normalizeHost();
      this.scheduleDisposeIfEmpty();
      this.broadcastState();
      return;
    }

    if (p.isHost) this.normalizeHost();

    if (this.players.size <= 1 && this.started) {
      this.endGameToLobby();
      this.scheduleDisposeIfEmpty();
      return;
    }

    if (this.phase === "drawing" && this.allActiveGuessed()) {
      this.finishDrawing("all_guessed");
    } else {
      this.broadcastState();
    }
    this.scheduleDisposeIfEmpty();
  }

  /** Permanently drop a pending player once their reconnection grace expires. */
  private finalizeRemoval(token: string) {
    const entry = this.pending.get(token);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(token);

    const p = entry.player;
    this.reactions.delete(p.id);
    this.guessed.delete(p.id);

    if (this.paused && this.currentDrawerId === p.id) {
      this.paused = false;
      this.disconnectedDrawerName = null;
      this.skipCurrentTurn();
    }

    this.normalizeHost();

    if (this.players.size <= 1 && this.started && this.pending.size === 0) {
      this.endGameToLobby();
    } else {
      this.broadcastState();
    }
    this.scheduleDisposeIfEmpty();
  }

  private normalizeHost() {
    const list = this.playersList();
    if (!list.length) return;
    if (list.filter((p) => p.isHost).length === 1) return;
    for (const p of list) p.isHost = false;
    list[0].isHost = true;
  }

  private cancelDispose() {
    if (this.disposeTimer) {
      clearTimeout(this.disposeTimer);
      this.disposeTimer = null;
    }
  }

  private scheduleDisposeIfEmpty() {
    if (this.players.size > 0) {
      this.cancelDispose();
      return;
    }
    if (this.disposeTimer) return;
    this.stopTick();
    this.disposeTimer = setTimeout(() => {
      if (this.players.size === 0) {
        this.dispose();
        rooms.delete(this.code);
      }
    }, RECONNECT_GRACE_MS);
  }

  private skipCurrentTurn() {
    this.drawerDisconnected = true;
    this.revertScoresSinceBaseline();
    this.secretWord = null;
    this.wordHints = null;
    this.wordOptions = null;
    this.drawing = [];
    this.guessed.clear();
    this.turnGuesserPoints = [];
    this.lastWord = null;
    this.lastTurnReason = "skipped";
    this.currentDrawerId = null;
    this.phase = "turn_result";
    this.timeLeft = TURN_RESULT_SECONDS;
    this.startTick();
  }

  removePlayer(socketId: string) {
    const p = this.players.get(socketId);
    if (!p) return;
    const wasHost = p.isHost;

    const drawer = this.drawerPlayer();
    const isDrawer = !!drawer && drawer.id === p.id;
    const inActiveTurn =
      this.started && (this.phase === "choosing" || this.phase === "drawing") && isDrawer;

    if (inActiveTurn) {
      this.skipCurrentTurn();
    }

    this.players.delete(socketId);
    this.sockets.delete(socketId);
    this.reactions.delete(p.id);

    if (wasHost) {
      const next = this.players.values().next().value as InternalPlayer | undefined;
      if (next) {
        for (const pl of this.players.values()) pl.isHost = false;
        next.isHost = true;
      }
    }

    if (this.players.size <= 1 && this.started) {
      this.endGameToLobby();
      return;
    }

    this.broadcastState();
  }

  private endGameToLobby() {
    this.stopTick();
    this.started = false;
    this.phase = "lobby";
    this.turnCounter = 0;
    this.secretWord = null;
    this.wordHints = null;
    this.wordOptions = null;
    this.drawing = [];
    this.lastWord = null;
    this.lastTurnReason = null;
    this.guessed.clear();
    this.turnGuesserPoints = [];
    this.scoreBaseline.clear();
    this.reactions.clear();
    this.currentDrawerId = null;
    this.paused = false;
    this.disconnectedDrawerName = null;
    this.broadcastState();
  }

  private playersList(): InternalPlayer[] {
    return [...this.players.values()];
  }

  private drawerIndex(): number {
    const n = this.players.size;
    if (n === 0) return 0;
    return this.turnCounter % n;
  }

  private drawerPlayer(): InternalPlayer | null {
    if (this.currentDrawerId) {
      for (const p of this.players.values()) {
        if (p.id === this.currentDrawerId) return p;
      }
      return null;
    }
    const list = this.playersList();
    if (!list.length) return null;
    return list[this.drawerIndex()] ?? null;
  }

  private currentRound(): number {
    const n = this.players.size;
    if (n === 0) return 1;
    return Math.floor(this.turnCounter / n) + 1;
  }

  private guesserCount() {
    return Math.max(0, this.players.size - 1);
  }

  /** True when every connected guesser has guessed the word this turn. */
  private allActiveGuessed(): boolean {
    const d = this.drawerPlayer();
    const guessers = this.playersList().filter((p) => !d || p.id !== d.id);
    if (!guessers.length) return false;
    return guessers.every((p) => this.guessed.has(p.id));
  }

  private broadcastState() {
    for (const sock of this.sockets.values()) {
      sock.emit("room:state", this.serializeFor(sock.id));
    }
  }

  serializeFor(socketId: string): unknown {
    const self = this.players.get(socketId);
    const listOrdered = this.playersList();
    const dIdx = this.drawerIndex();
    const drawerId = this.drawerPlayer()?.id ?? null;
    const list = listOrdered.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
      guessed: this.guessed.has(p.id),
      rank: 0,
      isDrawer:
        this.started &&
        drawerId === p.id &&
        (this.phase === "choosing" || this.phase === "drawing")
    }));

    list.sort((a, b) => b.score - a.score);
    let rank = 1;
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].score < list[i - 1].score) rank = i + 1;
      list[i].rank = rank;
    }

    const d = this.drawerPlayer();
    const isDrawer = !!self && d?.id === self.id;
    const { likes, dislikes } = this.reactionCounts();
    const selfReaction = self ? (this.reactions.get(self.id) ?? null) : null;

    return {
      selfId: self?.id ?? "",
      roomCode: this.code,
      phase: this.phase,
      players: list,
      settings: this.settings,
      drawerIndex: dIdx,
      currentRound: this.currentRound(),
      totalRounds: this.settings.rounds,
      timeLeft: this.timeLeft,
      wordHints:
        this.phase === "drawing" && this.secretWord
          ? isDrawer
            ? this.wordHints?.map((h) => ({ ch: h.ch, revealed: true }))
            : this.wordHints
          : null,
      wordOptions: this.phase === "choosing" && isDrawer ? this.wordOptions : null,
      lastWord: this.lastWord,
      lastTurnReason: this.lastTurnReason,
      drawing: this.drawing,
      winners: this.winners,
      secretWord:
        this.phase === "turn_result" || this.phase === "game_over" ? this.lastWord : null,
      likes,
      dislikes,
      selfReaction,
      paused: this.paused,
      disconnectedDrawerName: this.paused ? this.disconnectedDrawerName : null
    };
  }

  private reactionCounts() {
    let likes = 0;
    let dislikes = 0;
    for (const r of this.reactions.values()) {
      if (r === "like") likes++;
      else if (r === "dislike") dislikes++;
    }
    return { likes, dislikes };
  }

  react(socketId: string, kind: ReactionKind | null) {
    const p = this.players.get(socketId);
    if (!p) return;
    if (this.phase !== "drawing") return;
    const d = this.drawerPlayer();
    if (!d || p.id === d.id) return;
    if (kind === null) this.reactions.delete(p.id);
    else if (kind === "like" || kind === "dislike") {
      const current = this.reactions.get(p.id);
      if (current === kind) this.reactions.delete(p.id);
      else this.reactions.set(p.id, kind);
    }
    this.broadcastState();
  }

  updateSettings(socketId: string, next: Partial<RoomSettings> & { customWordsText?: string }) {
    const p = this.players.get(socketId);
    if (!p?.isHost || this.started) return;
    if (typeof next.drawTime === "number") this.settings.drawTime = clampInt(next.drawTime, 15, 240);
    if (typeof next.rounds === "number") this.settings.rounds = clampInt(next.rounds, 2, 10);
    if (typeof next.maxPlayers === "number") this.settings.maxPlayers = clampInt(next.maxPlayers, 2, 20);
    if (typeof next.wordChoices === "number") this.settings.wordChoices = clampInt(next.wordChoices, 1, 5);
    if (typeof next.hints === "number") this.settings.hints = clampInt(next.hints, 0, 5);
    if (typeof next.customWordsOnly === "boolean") this.settings.customWordsOnly = next.customWordsOnly;
    if (typeof next.customWordsText === "string") {
      this.settings.customWords = parseCustomWords(next.customWordsText);
    }
    this.broadcastState();
  }

  startGame(socketId: string) {
    const p = this.players.get(socketId);
    if (!p?.isHost) return;
    if (this.players.size < 2) return;

    for (const pl of this.players.values()) pl.score = 0;

    this.started = true;
    this.turnCounter = 0;
    this.winners = [];
    this.usedWords.clear();
    this.beginTurn();
  }

  private captureScoreBaseline() {
    this.scoreBaseline.clear();
    for (const pl of this.players.values()) this.scoreBaseline.set(pl.id, pl.score);
  }

  private revertScoresSinceBaseline() {
    for (const pl of this.players.values()) {
      const base = this.scoreBaseline.get(pl.id);
      if (typeof base === "number") pl.score = base;
    }
  }

  private beginTurn() {
    this.stopTick();
    this.paused = false;
    this.disconnectedDrawerName = null;
    this.drawerDisconnected = false;
    this.lastTurnReason = null;
    this.lastWord = null;
    this.secretWord = null;
    this.wordHints = null;
    this.wordOptions = null;
    this.drawing = [];
    this.guessed.clear();
    this.turnGuesserPoints = [];
    this.firstGuessAt = null;
    this.hintsRevealed = 0;
    this.hintSlots = [];
    this.reactions.clear();
    this.captureScoreBaseline();

    /** Lock the drawer for the duration of this turn so disconnects cannot shift the role. */
    const drawerNow = this.playersList()[this.drawerIndex()] ?? null;
    this.currentDrawerId = drawerNow ? drawerNow.id : null;

    this.phase = "choosing";
    this.wordOptions = pickWords(
      this.settings.wordChoices,
      {
        customWordsOnly: this.settings.customWordsOnly,
        customWords: this.settings.customWords
      },
      this.usedWords
    );
    if (!this.wordOptions.length) {
      this.wordOptions = ["house", "cat", "tree"];
    }
    this.timeLeft = CHOICE_SECONDS;
    this.startTick();
    this.broadcastState();
  }

  chooseWord(socketId: string, index: number) {
    const d = this.drawerPlayer();
    const p = this.players.get(socketId);
    if (!d || !p || p.id !== d.id) return;
    if (this.phase !== "choosing") return;
    const safeIndex = clampInt(Number.isFinite(index) ? index : 0, 0, (this.wordOptions?.length ?? 1) - 1);
    const word = this.wordOptions?.[safeIndex] ?? this.wordOptions?.[0];
    if (!word) return;
    this.secretWord = word;
    this.usedWords.add(word.toLowerCase());
    this.wordHints = buildWordHints(word);
    this.prepareHintSchedule();
    this.phase = "drawing";
    this.timeLeft = this.settings.drawTime;
    this.wordOptions = null;
    this.stopTick();
    this.startTick();
    this.broadcastState();
  }

  private prepareHintSchedule() {
    const secret = this.secretWord ?? "";
    const hintCount = clampInt(this.settings.hints, 0, 5);
    const indices: number[] = [];
    for (let i = 0; i < secret.length; i++) {
      const ch = secret[i];
      if (ch && ch !== " ") indices.push(i);
    }
    shuffle(indices);
    this.hintSlots = indices.slice(0, Math.min(hintCount, indices.length));
    this.hintsRevealed = 0;
  }

  private revealNextHint() {
    if (!this.wordHints) return;
    if (this.hintsRevealed >= this.hintSlots.length) return;
    const idx = this.hintSlots[this.hintsRevealed];
    const slot = this.wordHints[idx];
    if (slot) slot.revealed = true;
    this.hintsRevealed++;
  }

  lobbyChat(socketId: string, raw: string) {
    const p = this.players.get(socketId);
    if (!p || this.started) return;
    const text = String(raw ?? "").trim();
    if (!text) return;
    this.io.to(this.code).emit("room:chat", {
      kind: "message",
      player: { id: p.id, name: p.name },
      text: text.slice(0, 200)
    });
  }

  guess(socketId: string, raw: string) {
    const p = this.players.get(socketId);
    if (!p || this.phase !== "drawing" || !this.secretWord) return null;
    const d = this.drawerPlayer();
    if (!d || p.id === d.id) return null;

    if (this.guessed.has(p.id)) return { kind: "already" as const };

    const guess = normalizeGuess(raw);
    const target = normalizeGuess(this.secretWord);
    if (!guess || guess !== target) {
      this.io.to(this.code).emit("room:chat", {
        kind: "message",
        player: { id: p.id, name: p.name },
        text: raw
      });
      return { kind: "wrong" as const, guess: raw };
    }

    const G = this.guesserCount();
    const already = this.guessed.size;
    const hintsLeft = Math.max(0, this.hintSlots.length - this.hintsRevealed);
    const pts = guesserScore({
      drawTimeSec: this.settings.drawTime,
      secondsLeft: this.timeLeft,
      hintCount: Math.max(1, this.hintSlots.length || 1),
      hintsLeftAtGuess: hintsLeft,
      guesserCount: Math.max(1, G),
      alreadyGuessedBeforeYou: already
    });

    p.score += pts;
    this.guessed.add(p.id);
    this.turnGuesserPoints.push(pts);

    const now = Date.now();
    if (this.firstGuessAt === null) this.firstGuessAt = now;
    const msSinceFirst = now - this.firstGuessAt;

    this.io.to(this.code).emit("room:chat", {
      kind: "correct",
      player: { id: p.id, name: p.name },
      points: pts,
      msSinceFirst
    });

    if (this.allActiveGuessed()) {
      this.finishDrawing("all_guessed");
    } else {
      this.broadcastState();
    }

    return { kind: "ok" as const, points: pts };
  }

  draw(socketId: string, cmd: DrawCommand) {
    const d = this.drawerPlayer();
    const p = this.players.get(socketId);
    if (!d || !p || p.id !== d.id) return;
    if (this.phase !== "drawing") return;
    this.drawing.push(cmd);
    this.io.to(this.code).emit("room:draw", cmd);
  }

  clearCanvas(socketId: string) {
    const d = this.drawerPlayer();
    const p = this.players.get(socketId);
    if (!d || !p || p.id !== d.id) return;
    if (this.phase !== "drawing") return;
    const cmd: DrawCommand = { type: "clear" };
    this.drawing.push(cmd);
    this.io.to(this.code).emit("room:draw", cmd);
  }

  private totalTurns() {
    return Math.max(0, this.players.size * this.settings.rounds);
  }

  private tick() {
    if (this.phase === "choosing") {
      this.timeLeft -= 1;
      if (this.timeLeft <= 0) {
        const opts = this.wordOptions ?? ["house"];
        const w = opts[Math.floor(Math.random() * opts.length)] ?? "house";
        this.secretWord = w;
        this.usedWords.add(w.toLowerCase());
        this.wordHints = buildWordHints(w);
        this.prepareHintSchedule();
        this.phase = "drawing";
        this.timeLeft = this.settings.drawTime;
      }
      this.broadcastState();
      return;
    }

    if (this.phase === "drawing") {
      const prev = this.timeLeft;
      this.timeLeft -= 1;

      const hintBudget = this.hintSlots.length;
      if (hintBudget > 0) {
        const drawT = Math.max(1, this.settings.drawTime);
        for (let i = 1; i <= hintBudget; i++) {
          const threshold = Math.floor((drawT * i) / (hintBudget + 1));
          const crossed = prev > threshold && this.timeLeft <= threshold;
          if (crossed) this.revealNextHint();
        }
      }

      if (this.timeLeft <= 0) {
        this.finishDrawing("time");
      } else {
        this.broadcastState();
      }
      return;
    }

    if (this.phase === "turn_result" || this.phase === "game_over") {
      this.timeLeft -= 1;
      if (this.timeLeft <= 0) {
        if (this.phase === "game_over") {
          this.stopTick();
          this.endGameToLobby();
        } else {
          this.advanceTurn();
        }
      } else {
        this.broadcastState();
      }
    }
  }

  private finishDrawing(reason: "all_guessed" | "time") {
    this.stopTick();

    const d = this.drawerPlayer();
    this.lastWord = this.secretWord;
    this.lastTurnReason = this.drawerDisconnected ? "skipped" : reason;

    if (!this.drawerDisconnected && d && this.secretWord) {
      const drawerPts = drawerScoreFromGuesserPoints(this.turnGuesserPoints);
      if (drawerPts > 0) d.score += drawerPts;
      const { likes, dislikes } = this.reactionCounts();
      const reactionDelta = (likes - dislikes) * REACTION_POINTS;
      if (reactionDelta !== 0) d.score = Math.max(0, d.score + reactionDelta);
    }

    this.secretWord = null;
    this.wordHints = null;
    this.wordOptions = null;

    const total = this.totalTurns();
    const isLastTurn = total > 0 && this.turnCounter >= total - 1;
    if (isLastTurn) {
      const ranked = this.playersList().sort((a, b) => b.score - a.score);
      const top = ranked[0]?.score ?? 0;
      this.winners = ranked.filter((p) => p.score === top).map((p) => ({ name: p.name, score: p.score }));
      this.phase = "game_over";
    } else {
      this.phase = "turn_result";
    }

    this.timeLeft = TURN_RESULT_SECONDS;
    this.startTick();
    this.broadcastState();
  }

  private advanceTurn() {
    this.stopTick();
    const total = this.totalTurns();
    if (total === 0) return;

    if (this.turnCounter >= total - 1) {
      this.phase = "game_over";
      this.timeLeft = TURN_RESULT_SECONDS;
      this.startTick();
      this.broadcastState();
      return;
    }

    this.turnCounter += 1;
    this.beginTurn();
  }
}

export const rooms = new Map<string, Room>();
