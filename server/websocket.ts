import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { getSession } from "./localAuth";
import passport from "passport";
import { storage } from "./storage";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  conversationId?: string;
  isAlive?: boolean;
}

const clients = new Map<string, Set<AuthenticatedWebSocket>>();

export function setupWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const sessionParser = getSession();

  wss.on("connection", (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    const res = {
      setHeader: () => {},
      end: () => {},
      writeHead: () => {},
    } as any;

    sessionParser(req as any, res, () => {
      passport.initialize()(req as any, res, () => {
        passport.session()(req as any, res, () => {
          const user = (req as any).user;
          if (!user) {
            ws.close(4001, "Unauthorized");
            return;
          }

          ws.userId = user.id;
          ws.userRole = user.role;

          ws.on("message", async (data) => {
            try {
              const msg = JSON.parse(data.toString());
              if (msg.type === "join" && msg.conversationId) {
                const conversation = await storage.getConversation(msg.conversationId);
                if (!conversation) {
                  ws.send(JSON.stringify({ type: "error", message: "Conversation not found" }));
                  return;
                }

                const hasAccess = ws.userRole === "admin" ||
                  conversation.buyerId === ws.userId ||
                  conversation.sellerId === ws.userId;

                if (!hasAccess) {
                  ws.send(JSON.stringify({ type: "error", message: "Access denied" }));
                  return;
                }

                if (ws.conversationId) {
                  const oldSet = clients.get(ws.conversationId);
                  if (oldSet) {
                    oldSet.delete(ws);
                    if (oldSet.size === 0) clients.delete(ws.conversationId);
                  }
                }
                ws.conversationId = msg.conversationId;
                if (!clients.has(msg.conversationId)) {
                  clients.set(msg.conversationId, new Set());
                }
                clients.get(msg.conversationId)!.add(ws);
                ws.send(JSON.stringify({ type: "joined", conversationId: msg.conversationId }));
              }
            } catch (e) {
            }
          });

          ws.on("close", () => {
            if (ws.conversationId) {
              const set = clients.get(ws.conversationId);
              if (set) {
                set.delete(ws);
                if (set.size === 0) clients.delete(ws.conversationId);
              }
            }
          });

          ws.send(JSON.stringify({ type: "connected", userId: user.id }));
        });
      });
    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const authWs = ws as AuthenticatedWebSocket;
      if (authWs.isAlive === false) {
        authWs.terminate();
        return;
      }
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  return wss;
}

export function broadcastToConversation(conversationId: string, message: any, excludeUserId?: string) {
  const set = clients.get(conversationId);
  if (!set) return;

  const payload = JSON.stringify(message);
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && ws.userId !== excludeUserId) {
      ws.send(payload);
    }
  });
}
