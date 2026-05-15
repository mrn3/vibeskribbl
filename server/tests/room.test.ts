import test from "node:test";
import assert from "node:assert/strict";
import type { Server, Socket } from "socket.io";

import { Room } from "../src/room.js";
import type { DrawCommand } from "../src/types.js";

type EmitCall = { event: string; payload: unknown };
type Broadcast = { code: string; event: string; payload: unknown };

function makeSocket(id: string) {
  const calls: EmitCall[] = [];
  const socket = {
    id,
    emit(event: string, payload: unknown) {
      calls.push({ event, payload });
    },
    join(_code: string) {}
  } as unknown as Socket;
  return { socket, calls };
}

function makeServer() {
  const broadcasts: Broadcast[] = [];
  const server = {
    to(code: string) {
      return {
        emit(event: string, payload: unknown) {
          broadcasts.push({ code, event, payload });
        }
      };
    }
  } as unknown as Server;
  return { server, broadcasts };
}

type SnapPlayer = { id: string; name: string; isDrawer: boolean; guessed: boolean };
type Snap = {
  selfId: string;
  phase: string;
  players: SnapPlayer[];
  wordOptions: string[] | null;
  lastTurnReason: string | null;
};

function snapshot(room: Room, socketId: string): Snap {
  return room.serializeFor(socketId) as Snap;
}

function setupRoom(numPlayers: number) {
  const { server, broadcasts } = makeServer();
  const room = new Room(server, "TEST01");
  const players = [] as { socket: Socket; calls: EmitCall[] }[];
  for (let i = 0; i < numPlayers; i++) {
    const { socket, calls } = makeSocket(`s${i}`);
    room.addPlayer(socket, `P${i}`, false);
    players.push({ socket, calls });
  }
  return { room, players, broadcasts };
}

const LINE: DrawCommand = { type: "line", x0: 0, y0: 0, x1: 1, y1: 1, c: 0, w: 2 };

test("drawer is locked at turn start; non-drawer disconnect does not transfer drawing rights", (t) => {
  const { room, players, broadcasts } = setupRoom(4);
  t.after(() => room.dispose());

  room.startGame(players[0].socket.id);

  let snap = snapshot(room, players[0].socket.id);
  assert.equal(snap.phase, "choosing");
  const drawerBefore = snap.players.find((p) => p.isDrawer);
  assert.ok(drawerBefore, "should have a drawer in choosing phase");
  assert.equal(drawerBefore!.name, "P0");

  room.chooseWord(players[0].socket.id, 0);
  snap = snapshot(room, players[0].socket.id);
  assert.equal(snap.phase, "drawing");

  // Non-drawer (P1) disconnects mid-turn.
  room.removePlayer(players[1].socket.id);

  snap = snapshot(room, players[0].socket.id);
  assert.equal(snap.phase, "drawing", "phase should remain drawing after non-drawer leaves");
  const drawers = snap.players.filter((p) => p.isDrawer);
  assert.equal(drawers.length, 1, "exactly one drawer should remain");
  assert.equal(drawers[0].name, "P0", "drawer should still be the original drawer");

  // A guesser must not gain draw access just because their list index now matches turnCounter % n.
  const beforeDraws = broadcasts.filter((b) => b.event === "room:draw").length;
  room.draw(players[2].socket.id, LINE);
  room.draw(players[3].socket.id, LINE);
  const afterGuesserDraws = broadcasts.filter((b) => b.event === "room:draw").length;
  assert.equal(afterGuesserDraws, beforeDraws, "non-drawer draw commands must not be broadcast");

  // The locked drawer's draw command is still accepted.
  room.draw(players[0].socket.id, LINE);
  const afterDrawerDraw = broadcasts.filter((b) => b.event === "room:draw").length;
  assert.equal(afterDrawerDraw, beforeDraws + 1, "drawer's draw command should be broadcast");
});

test("drawer disconnect mid-turn produces a skipped turn result", (t) => {
  const { room, players } = setupRoom(3);
  t.after(() => room.dispose());

  room.startGame(players[0].socket.id);
  room.chooseWord(players[0].socket.id, 0);

  room.removePlayer(players[0].socket.id);

  const snap = snapshot(room, players[1].socket.id);
  assert.equal(snap.phase, "turn_result");
  assert.equal(snap.lastTurnReason, "skipped");
});

test("non-drawer cannot draw even before any disconnect", (t) => {
  const { room, players, broadcasts } = setupRoom(3);
  t.after(() => room.dispose());

  room.startGame(players[0].socket.id);
  room.chooseWord(players[0].socket.id, 0);

  const before = broadcasts.filter((b) => b.event === "room:draw").length;
  room.draw(players[1].socket.id, LINE);
  room.draw(players[2].socket.id, LINE);
  const after = broadcasts.filter((b) => b.event === "room:draw").length;
  assert.equal(after, before, "non-drawer draws must never broadcast");
});

test("drawer's clearCanvas is broadcast; non-drawer's is ignored", (t) => {
  const { room, players, broadcasts } = setupRoom(3);
  t.after(() => room.dispose());

  room.startGame(players[0].socket.id);
  room.chooseWord(players[0].socket.id, 0);

  const before = broadcasts.filter((b) => b.event === "room:draw").length;
  room.clearCanvas(players[1].socket.id);
  assert.equal(
    broadcasts.filter((b) => b.event === "room:draw").length,
    before,
    "non-drawer clear must be ignored"
  );
  room.clearCanvas(players[0].socket.id);
  assert.equal(
    broadcasts.filter((b) => b.event === "room:draw").length,
    before + 1,
    "drawer clear should be broadcast"
  );
});

/**
 * Regression for the rotation-shift bug: if `drawerPlayer()` is computed as
 * `playersList[turnCounter % n]` dynamically, then on turn 2 a non-drawer with
 * a lower list index leaving will shift the drawer role to the next player.
 */
test("non-drawer disconnect on a later turn does not promote anyone else to drawer", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const { room, players, broadcasts } = setupRoom(3);
  t.after(() => room.dispose());

  room.startGame(players[0].socket.id);
  room.chooseWord(players[0].socket.id, 0);

  // End turn 1 by making both non-drawers guess correctly.
  const secret = (room as unknown as { secretWord: string | null }).secretWord;
  assert.ok(secret, "secret word should be set during drawing phase");
  room.guess(players[1].socket.id, secret!);
  room.guess(players[2].socket.id, secret!);

  // turn_result lasts 5s; tick the room timer until the next turn begins.
  let snap = snapshot(room, players[0].socket.id);
  for (let i = 0; i < 10 && snap.phase !== "choosing"; i++) {
    t.mock.timers.tick(1000);
    snap = snapshot(room, players[0].socket.id);
  }
  assert.equal(snap.phase, "choosing", "should have advanced to the next turn");

  // Turn 2: drawer should be P1.
  const drawerNow = snap.players.find((p) => p.isDrawer);
  assert.ok(drawerNow);
  assert.equal(drawerNow!.name, "P1");

  room.chooseWord(players[1].socket.id, 0);

  // P0 (non-drawer with lower list index than P1) disconnects mid-turn.
  // With buggy index-based resolution, dIdx = 1 % 2 = 1 → list[1] = P2,
  // which would incorrectly promote P2 to drawer.
  room.removePlayer(players[0].socket.id);

  snap = snapshot(room, players[1].socket.id);
  assert.equal(snap.phase, "drawing", "phase should remain drawing after non-drawer leaves");
  const drawers = snap.players.filter((p) => p.isDrawer);
  assert.equal(drawers.length, 1);
  assert.equal(drawers[0].name, "P1", "drawer must remain P1, not shift to P2");

  // P2 (still a guesser) must not be allowed to draw.
  const beforeDraws = broadcasts.filter((b) => b.event === "room:draw").length;
  room.draw(players[2].socket.id, LINE);
  assert.equal(
    broadcasts.filter((b) => b.event === "room:draw").length,
    beforeDraws,
    "P2 must not be able to draw"
  );

  // The locked drawer P1 still can.
  room.draw(players[1].socket.id, LINE);
  assert.equal(
    broadcasts.filter((b) => b.event === "room:draw").length,
    beforeDraws + 1,
    "P1 should still be able to draw"
  );
});

type CorrectChat = {
  kind: "correct";
  player: { id: string; name: string };
  points: number;
  msSinceFirst: number;
};

test("correct-guess chat events include msSinceFirst measured from the first guesser", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"] });
  const { room, players, broadcasts } = setupRoom(4);
  t.after(() => room.dispose());

  room.startGame(players[0].socket.id);
  room.chooseWord(players[0].socket.id, 0);

  const secret = (room as unknown as { secretWord: string | null }).secretWord;
  assert.ok(secret, "secret word should be set during drawing phase");

  room.guess(players[1].socket.id, secret!);
  t.mock.timers.tick(250);
  room.guess(players[2].socket.id, secret!);
  t.mock.timers.tick(750);
  room.guess(players[3].socket.id, secret!);

  const corrects = broadcasts
    .filter((b) => b.event === "room:chat" && (b.payload as { kind: string }).kind === "correct")
    .map((b) => b.payload as CorrectChat);

  assert.equal(corrects.length, 3, "expected one correct-chat broadcast per guesser");
  assert.equal(corrects[0].player.name, "P1");
  assert.equal(corrects[0].msSinceFirst, 0, "first guesser's delta should be 0");
  assert.equal(corrects[1].player.name, "P2");
  assert.equal(corrects[1].msSinceFirst, 250, "second guesser's delta should be 250ms");
  assert.equal(corrects[2].player.name, "P3");
  assert.equal(corrects[2].msSinceFirst, 1000, "third guesser's delta should be 1000ms");
});

test("msSinceFirst resets between turns", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"] });
  const { room, players, broadcasts } = setupRoom(3);
  t.after(() => room.dispose());

  room.startGame(players[0].socket.id);
  room.chooseWord(players[0].socket.id, 0);

  const secret1 = (room as unknown as { secretWord: string | null }).secretWord;
  assert.ok(secret1);
  room.guess(players[1].socket.id, secret1!);
  t.mock.timers.tick(400);
  room.guess(players[2].socket.id, secret1!);

  // Advance through the turn_result phase to begin the next turn.
  let snap = snapshot(room, players[0].socket.id);
  for (let i = 0; i < 10 && snap.phase !== "choosing"; i++) {
    t.mock.timers.tick(1000);
    snap = snapshot(room, players[0].socket.id);
  }
  assert.equal(snap.phase, "choosing", "should have advanced to the next turn");

  room.chooseWord(players[1].socket.id, 0);
  const secret2 = (room as unknown as { secretWord: string | null }).secretWord;
  assert.ok(secret2);

  // First guess of the second turn must reset the baseline back to 0.
  room.guess(players[0].socket.id, secret2!);
  t.mock.timers.tick(123);
  room.guess(players[2].socket.id, secret2!);

  const corrects = broadcasts
    .filter((b) => b.event === "room:chat" && (b.payload as { kind: string }).kind === "correct")
    .map((b) => b.payload as CorrectChat);

  assert.equal(corrects.length, 4);
  assert.equal(corrects[2].player.name, "P0");
  assert.equal(corrects[2].msSinceFirst, 0, "first guesser of turn 2 should reset delta to 0");
  assert.equal(corrects[3].player.name, "P2");
  assert.equal(corrects[3].msSinceFirst, 123);
});
