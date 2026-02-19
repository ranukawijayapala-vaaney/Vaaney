import { useEffect, useRef, useCallback, useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  conversationId?: string;
  message?: any;
  userId?: string;
}

export function useConversationWebSocket(conversationId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingJoinRef = useRef<string | undefined>();
  const [isConnected, setIsConnected] = useState(false);

  const joinConversation = useCallback((ws: WebSocket, convId: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "join", conversationId: convId }));
      pendingJoinRef.current = undefined;
    } else {
      pendingJoinRef.current = convId;
    }
  }, []);

  const connect = useCallback(() => {
    if (!conversationId) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      joinConversation(wsRef.current, conversationId);
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      pendingJoinRef.current = conversationId;
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;
    pendingJoinRef.current = conversationId;

    ws.onopen = () => {
      setIsConnected(true);
      if (pendingJoinRef.current) {
        ws.send(JSON.stringify({ type: "join", conversationId: pendingJoinRef.current }));
        pendingJoinRef.current = undefined;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        if (data.type === "new_message" && data.conversationId) {
          queryClient.setQueryData(
            ["/api/conversations", data.conversationId],
            (old: any) => {
              if (!old) return old;
              const existingIds = new Set(old.messages?.map((m: any) => m.id) || []);
              if (existingIds.has(data.message?.id)) return old;
              return {
                ...old,
                messages: [...(old.messages || []), data.message],
              };
            }
          );
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        }
      } catch (e) {
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      wsRef.current = null;
      if (event.code !== 4001 && event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [conversationId, joinConversation]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    if (conversationId && wsRef.current) {
      joinConversation(wsRef.current, conversationId);
    }
  }, [conversationId, joinConversation]);

  return { isConnected };
}
