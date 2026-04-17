import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import type { ChatEvent, ClientState, DrawCommand } from "./types";
import { CANVAS_H, CANVAS_W, PALETTE, replay } from "./canvas";

function fmtReason(r: ClientState["lastTurnReason"]) {
  if (r === "all_guessed") return "Everyone guessed it!";
  if (r === "time") return "Time is up!";
  if (r === "skipped") return "The drawer disconnected.";
  return "";
}

export function App() {
  const socket = useMemo(() => io({ path: "/socket.io" }), []);

  const [connected, setConnected] = useState(false);
  const [helloError, setHelloError] = useState<string | null>(null);

  const [name, setName] = useState(() => localStorage.getItem("vs_name") ?? "");
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem("vs_room") ?? "");

  const [state, setState] = useState<ClientState | null>(null);
  const [chat, setChat] = useState<{ key: string; html: string }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cmdsRef = useRef<DrawCommand[]>([]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    replay(ctx, cmdsRef.current);
  }, []);

  const [tool, setTool] = useState<"pen" | "fill">("pen");
  const [color, setColor] = useState(11); // black-ish in palette
  const [width, setWidth] = useState(4);

  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) setRoomCode(room.trim().toUpperCase());
  }, []);

  useEffect(() => {
    const onState = (s: ClientState) => {
      setState(s);
      cmdsRef.current = s.drawing ?? [];
      redraw();
    };
    const onDraw = (cmd: DrawCommand) => {
      cmdsRef.current = [...cmdsRef.current, cmd];
      redraw();
    };
    const onChat = (evt: ChatEvent) => {
      const key = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      if (evt.kind === "message") {
        setChat((c) =>
          [
            ...c,
            { key, html: `<span class="who">${escapeHtml(evt.player.name)}:</span>${escapeHtml(evt.text)}` }
          ].slice(-200)
        );
      } else {
        setChat((c) =>
          [
            ...c,
            {
              key,
              html: `<span class="good">${escapeHtml(evt.player.name)} guessed the word!</span>`
            }
          ].slice(-200)
        );
      }
    };

    socket.on("room:state", onState);
    socket.on("room:draw", onDraw);
    socket.on("room:chat", onChat);
    return () => {
      socket.off("room:state", onState);
      socket.off("room:draw", onDraw);
      socket.off("room:chat", onChat);
    };
  }, [socket, redraw]);

  useEffect(() => {
    redraw();
  }, [redraw, state?.phase, state?.drawing]);

  useEffect(() => {
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redraw]);

  const join = (create: boolean) => {
    setHelloError(null);
    localStorage.setItem("vs_name", name);
    localStorage.setItem("vs_room", roomCode);
    socket.emit(
      "room:hello",
      { name, roomCode: create ? undefined : roomCode, create },
      (ack: any) => {
        if (!ack?.ok) setHelloError(String(ack?.error ?? "Could not join."));
        else if (ack.roomCode) setRoomCode(String(ack.roomCode));
      }
    );
  };

  const self = state?.players.find((p) => p.id === state.selfId) ?? null;
  const isHost = Boolean(self?.isHost);
  const isDrawer = Boolean(self?.isDrawer);

  const clientToCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    return {
      x: ((e.clientX - rect.left) / rw) * canvas.width,
      y: ((e.clientY - rect.top) / rh) * canvas.height
    };
  };

  const emitLine = (x0: number, y0: number, x1: number, y1: number) => {
    const cmd: DrawCommand = { type: "line", x0, y0, x1, y1, c: color, w: width };
    socket.emit("game:draw", cmd);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!state || state.phase !== "drawing" || !isDrawer) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const { x, y } = clientToCanvas(e);
    if (tool === "fill") {
      socket.emit("game:draw", { type: "fill", x, y, c: color } satisfies DrawCommand);
      return;
    }
    drawingRef.current = true;
    lastRef.current = { x, y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !state || state.phase !== "drawing" || !isDrawer) return;
    if (tool !== "pen") return;
    const { x, y } = clientToCanvas(e);
    const last = lastRef.current;
    if (!last) return;
    const dx = x - last.x;
    const dy = y - last.y;
    if (dx * dx + dy * dy < 1) return;
    emitLine(last.x, last.y, x, y);
    lastRef.current = { x, y };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    drawingRef.current = false;
    lastRef.current = null;
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const updateSettings = (patch: Record<string, unknown>) => {
    socket.emit("room:updateSettings", patch);
  };

  const wordHints = state?.wordHints ?? null;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <h1>VibeSkribbl</h1>
          <span>No ads. Private rooms. Skribbl-style rounds and scoring.</span>
        </div>
        <div className="pill">{connected ? "Connected" : "Offline"}</div>
      </div>

      {!state ? (
        <div className="panel" style={{ maxWidth: 720 }}>
          <h2>Join</h2>
          <div className="body join">
            {helloError ? <div className="note" style={{ color: "var(--bad)" }}>{helloError}</div> : null}
            <div className="field">
              <div className="label">Name</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={21} />
            </div>
            <div className="field">
              <div className="label">Room code (join)</div>
              <input
                className="input"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="ABCD12"
              />
            </div>
            <div className="row">
              <button className="btn" type="button" onClick={() => join(true)}>
                Create private room
              </button>
              <button className="btn secondary" type="button" onClick={() => join(false)} disabled={!roomCode.trim()}>
                Join room
              </button>
            </div>
            <div className="note">
              Tip: the host starts the match after everyone joins. Default rules mirror skribbl private rooms: multiple
              rounds, everyone draws each round, draw time affects points, and the drawer earns the average of
              guessers’ points when people guess correctly.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid">
          <div className="panel">
            <h2>Players</h2>
            <div className="body players">
              {(state.players ?? []).map((p) => (
                <div key={p.id} className="player">
                  <div className="left">
                    <div className="name">
                      {p.name}
                      {p.id === state.selfId ? " (you)" : ""}
                    </div>
                    <div className="badges">
                      {p.isHost ? <span className="badge host">Host</span> : null}
                      {p.isDrawer ? <span className="badge drawer">Drawing</span> : null}
                      {p.guessed ? <span className="badge guessed">Guessed</span> : null}
                    </div>
                  </div>
                  <div className="score">{p.score}</div>
                </div>
              ))}
            </div>

            {state.phase === "lobby" ? (
              <div className="body">
                {isHost ? (
                  <>
                    <div className="settingsGrid">
                      <div className="settingsRow">
                        <div className="field">
                          <div className="label">Draw time (seconds)</div>
                          <select
                            className="select"
                            value={state.settings.drawTime}
                            onChange={(e) => updateSettings({ drawTime: Number(e.target.value) })}
                          >
                            {[15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 180, 210, 240].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <div className="label">Rounds</div>
                          <select
                            className="select"
                            value={state.settings.rounds}
                            onChange={(e) => updateSettings({ rounds: Number(e.target.value) })}
                          >
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="settingsRow">
                        <div className="field">
                          <div className="label">Max players</div>
                          <select
                            className="select"
                            value={state.settings.maxPlayers}
                            onChange={(e) => updateSettings({ maxPlayers: Number(e.target.value) })}
                          >
                            {Array.from({ length: 19 }, (_, i) => i + 2).map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <div className="label">Word choices</div>
                          <select
                            className="select"
                            value={state.settings.wordChoices}
                            onChange={(e) => updateSettings({ wordChoices: Number(e.target.value) })}
                          >
                            {[1, 2, 3, 4, 5].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="settingsRow">
                        <div className="field">
                          <div className="label">Hints</div>
                          <select
                            className="select"
                            value={state.settings.hints}
                            onChange={(e) => updateSettings({ hints: Number(e.target.value) })}
                          >
                            {[0, 1, 2, 3, 4, 5].map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <div className="label">Custom words only</div>
                          <select
                            className="select"
                            value={state.settings.customWordsOnly ? "1" : "0"}
                            onChange={(e) => updateSettings({ customWordsOnly: e.target.value === "1" })}
                          >
                            <option value="0">Off</option>
                            <option value="1">On</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <div className="label">Custom words (comma-separated)</div>
                        <textarea
                          className="textarea"
                          defaultValue={state.settings.customWords.join(", ")}
                          onBlur={(e) => updateSettings({ customWordsText: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ height: 10 }} />
                    <button className="btn" type="button" onClick={() => socket.emit("room:start")}>
                      Start game
                    </button>
                  </>
                ) : (
                  <div className="note">Waiting for the host to start…</div>
                )}
                <div style={{ height: 10 }} />
                <div className="note">
                  Invite link:{" "}
                  <span style={{ fontFamily: "var(--mono)", color: "rgba(255,255,255,0.85)" }}>
                    {`${window.location.origin}?room=${encodeURIComponent(state.roomCode)}`}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="panel">
            <div className="hud">
              <div className="meta">
                <div className="title">
                  Room <span style={{ fontFamily: "var(--mono)" }}>{state.roomCode}</span>
                </div>
                <div className="sub">
                  {state.phase === "lobby"
                    ? "Lobby"
                    : state.phase === "game_over"
                      ? "Game over"
                      : `Round ${state.currentRound} / ${state.totalRounds}`}
                </div>
              </div>
              <div className="timer">{Math.max(0, state.timeLeft)}s</div>
            </div>

            {wordHints && state.phase === "drawing" ? (
              <div className="hints" aria-label="Word hints">
                {wordHints.map((h, idx) => (
                  <div key={idx} className={`hintSlot ${h.revealed ? "" : "hidden"}`}>
                    {h.ch === " " ? "·" : h.revealed ? h.ch : "_"}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="canvasWrap">
              <canvas
                ref={canvasRef}
                className={
                  "game" +
                  (state.phase === "drawing" && isDrawer
                    ? ` canvas--drawer${tool === "fill" ? " canvas--fill-tool" : ""}`
                    : "")
                }
                width={CANVAS_W}
                height={CANVAS_H}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />

              {state.phase === "choosing" && !isDrawer ? (
                <div className="overlay">
                  <div className="card">
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Word choice</div>
                    <div className="note">Waiting for the drawer to pick a word…</div>
                  </div>
                </div>
              ) : null}

              {state.phase === "choosing" && isDrawer ? (
                <div className="overlay">
                  <div className="card">
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Choose a word</div>
                    <div className="wordPick">
                      {(state.wordOptions ?? []).map((w, i) => (
                        <button key={`${w}_${i}`} type="button" onClick={() => socket.emit("game:chooseWord", i)}>
                          {w}
                        </button>
                      ))}
                    </div>
                    <div className="note" style={{ marginTop: 10 }}>
                      If you do not choose in time, a random word is picked for you.
                    </div>
                  </div>
                </div>
              ) : null}

              {state.phase === "turn_result" || state.phase === "game_over" ? (
                <div className="overlay">
                  <div className="card">
                    <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>
                      {state.phase === "game_over" ? "Match results" : "Round result"}
                    </div>
                    <div className="note" style={{ marginBottom: 10 }}>
                      {fmtReason(state.lastTurnReason)}
                    </div>
                    {state.secretWord ? (
                      <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 900 }}>
                        Word: {state.secretWord}
                      </div>
                    ) : (
                      <div className="note">No word this turn.</div>
                    )}
                    {state.phase === "game_over" ? (
                      <div style={{ marginTop: 12 }}>
                        <div className="note" style={{ marginBottom: 8 }}>
                          Winner(s)
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {(state.winners ?? []).map((w) => (
                            <div key={w.name} className="player">
                              <div className="name">{w.name}</div>
                              <div className="score">{w.score}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {state.phase === "drawing" && isDrawer ? (
              <div className="toolbar">
                <div className="row" style={{ alignItems: "center" }}>
                  <button className={`btn secondary`} type="button" onClick={() => setTool("pen")} disabled={tool === "pen"}>
                    Pen
                  </button>
                  <button className={`btn secondary`} type="button" onClick={() => setTool("fill")} disabled={tool === "fill"}>
                    Fill
                  </button>
                  <button className="btn secondary" type="button" onClick={() => socket.emit("game:clear")}>
                    Clear
                  </button>
                </div>
                <div className="row" style={{ alignItems: "center" }}>
                  <div className="row">
                    {PALETTE.map((hex, idx) => (
                      <button
                        key={hex}
                        type="button"
                        className={`swatch ${idx === color ? "active" : ""}`}
                        style={{ background: hex }}
                        title={hex}
                        onClick={() => setColor(idx)}
                      />
                    ))}
                  </div>
                  <div className="sizes">
                    {[2, 4, 8, 14].map((w) => (
                      <button
                        key={w}
                        type="button"
                        className={`sizeDot ${width === w ? "active" : ""}`}
                        style={{ width: 10 + w / 2, height: 10 + w / 2 }}
                        onClick={() => setWidth(w)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="panel">
            <h2>Chat / Guesses</h2>
            <div className="chat">
              <div className="chatLines">
                {chat.map((m) => (
                  <div key={m.key} className="chatLine" dangerouslySetInnerHTML={{ __html: m.html }} />
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--border)", padding: 10 }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const text = String(fd.get("g") ?? "").trim();
                    if (!text) return;
                    if (state.phase === "lobby") socket.emit("room:lobbyMessage", text);
                    else if (state.phase === "drawing" && !isDrawer && !self?.guessed) socket.emit("game:guess", text);
                    e.currentTarget.reset();
                  }}
                >
                  <input
                    className="input"
                    name="g"
                    placeholder={
                      state.phase === "lobby"
                        ? "Lobby chat…"
                        : state.phase === "drawing" && !isDrawer
                          ? "Type your guess…"
                          : "Chat is disabled here…"
                    }
                    maxLength={100}
                    autoComplete="off"
                    disabled={
                      state.phase !== "lobby" && !(state.phase === "drawing" && !isDrawer && !self?.guessed)
                    }
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
