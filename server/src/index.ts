import http from "node:http";
import path from "node:path";
import url from "node:url";
import fs from "node:fs";

import express from "express";
import { Server } from "socket.io";

import type { DrawCommand } from "./types.js";
import { Room, rooms } from "./room.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..", "..");
const clientDist = path.join(rootDir, "client", "dist");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

function createRoom() {
  for (let i = 0; i < 100; i++) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let j = 0; j < 6; j++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!rooms.has(code)) {
      const room = new Room(io, code);
      rooms.set(code, room);
      return room;
    }
  }
  throw new Error("No room code");
}

function findRoom(code: string) {
  return rooms.get(code.trim().toUpperCase()) ?? null;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

io.on("connection", (socket) => {
  let attached: Room | null = null;

  socket.on(
    "room:hello",
    (payload: { name: string; roomCode?: string; create?: boolean }, ack?: (a: unknown) => void) => {
      try {
        const name = String(payload?.name ?? "Player");
        const wantCreate = Boolean(payload?.create);
        const code = payload?.roomCode?.trim().toUpperCase();

        if (attached) {
          ack?.({ ok: false, error: "Already joined." });
          return;
        }

        let room: Room | null = null;
        if (wantCreate) room = createRoom();
        else if (code) room = findRoom(code);
        else {
          ack?.({ ok: false, error: "Missing room code." });
          return;
        }

        if (!room) {
          ack?.({ ok: false, error: "Room not found." });
          return;
        }

        if (room.playerCount() >= room.settings.maxPlayers) {
          ack?.({ ok: false, error: "Room is full." });
          return;
        }

        if (room.isStarted()) {
          ack?.({ ok: false, error: "Game already in progress." });
          return;
        }

        attached = room;
        room.addPlayer(socket, name, wantCreate);
        ack?.({ ok: true, roomCode: room.code });
      } catch (e) {
        ack?.({ ok: false, error: e instanceof Error ? e.message : "error" });
      }
    }
  );

  socket.on("room:updateSettings", (payload: unknown) => {
    if (!attached) return;
    attached.updateSettings(socket.id, (payload ?? {}) as never);
  });

  socket.on("room:start", () => {
    if (!attached) return;
    attached.startGame(socket.id);
  });

  socket.on("game:chooseWord", (index: number) => {
    if (!attached) return;
    attached.chooseWord(socket.id, index);
  });

  socket.on("game:draw", (cmd: DrawCommand) => {
    if (!attached) return;
    attached.draw(socket.id, cmd);
  });

  socket.on("game:clear", () => {
    if (!attached) return;
    attached.clearCanvas(socket.id);
  });

  socket.on("game:guess", (text: string) => {
    if (!attached) return;
    attached.guess(socket.id, String(text ?? ""));
  });

  socket.on("room:lobbyMessage", (text: string) => {
    if (!attached) return;
    attached.lobbyChat(socket.id, String(text ?? ""));
  });

  socket.on("disconnect", () => {
    if (!attached) return;
    const room = attached;
    room.removePlayer(socket.id);
    if (room.playerCount() === 0) {
      room.dispose();
      rooms.delete(room.code);
    }
    attached = null;
  });
});

const port = Number(process.env.PORT ?? 3001);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`VibeSkribbl server listening on http://127.0.0.1:${port}`);
});
