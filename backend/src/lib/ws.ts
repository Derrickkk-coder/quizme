import { IncomingMessage } from "http";
import type { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { verifyToken } from "./jwt";
import { prisma } from "./prisma";
import { env } from "./env";

interface Socket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

// groupId -> connected sockets subscribed to that group
const groupRooms = new Map<string, Set<Socket>>();

function joinRoom(groupId: string, socket: Socket) {
  let room = groupRooms.get(groupId);
  if (!room) {
    room = new Set();
    groupRooms.set(groupId, room);
  }
  room.add(socket);
}

function leaveAllRooms(socket: Socket) {
  for (const room of groupRooms.values()) {
    room.delete(socket);
  }
}

async function groupIdsForUser(userId: string, role: string): Promise<string[]> {
  if (role === "TEACHER") {
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return [];
    const assignments = await prisma.teacherClassSubject.findMany({ where: { teacherId: teacher.id }, select: { subjectId: true } });
    const subjectIds = assignments.map((a) => a.subjectId);
    if (subjectIds.length === 0) return [];
    const groups = await prisma.chatGroup.findMany({ where: { subjectId: { in: subjectIds } }, select: { id: true } });
    return groups.map((g) => g.id);
  }
  if (role === "STUDENT") {
    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student?.classId) return [];
    const groups = await prisma.chatGroup.findMany({ where: { classId: student.classId }, select: { id: true } });
    return groups.map((g) => g.id);
  }
  return [];
}

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // non-browser clients (no Origin header)
  return env.corsOrigins.includes(origin);
}

export function initWebSocketServer(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/ws")) return; // let other upgrade handlers (if any) ignore this
    if (!originAllowed(req.headers.origin)) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws: Socket, req: IncomingMessage) => {
    try {
      const url = new URL(req.url ?? "", "http://localhost");
      const token = url.searchParams.get("token");
      if (!token) throw new Error("missing token");
      const payload = verifyToken(token);

      ws.userId = payload.sub;
      ws.isAlive = true;

      const groupIds = await groupIdsForUser(payload.sub, payload.role);
      for (const groupId of groupIds) joinRoom(groupId, ws);

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (raw) => {
        let parsed: { type?: string; groupId?: string };
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          return;
        }
        // Lets the client subscribe to a group it just created without reconnecting.
        if (parsed.type === "join" && typeof parsed.groupId === "string") {
          joinRoom(parsed.groupId, ws);
        }
      });

      ws.on("close", () => leaveAllRooms(ws));
      ws.on("error", () => leaveAllRooms(ws));
    } catch {
      ws.close(4001, "Unauthorized");
    }
  });

  // Drop dead connections so rooms don't accumulate stale sockets.
  const heartbeat = setInterval(() => {
    for (const room of groupRooms.values()) {
      for (const ws of room) {
        if (ws.isAlive === false) {
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }
  }, 30000);
  wss.on("close", () => clearInterval(heartbeat));
}

export function broadcastToGroup(groupId: string, payload: unknown): void {
  const room = groupRooms.get(groupId);
  if (!room?.size) return;
  const data = JSON.stringify(payload);
  for (const ws of room) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}
