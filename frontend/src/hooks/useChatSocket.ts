import { useEffect, useRef } from "react";
import { API_BASE_URL, getToken } from "../api/client";
import { ChatMessage } from "../types";

function wsUrl(): string | null {
  const token = getToken();
  if (!token) return null;
  const httpBase = API_BASE_URL.replace(/\/api\/?$/, "");
  const wsBase = httpBase.replace(/^http/, "ws");
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
}

interface IncomingMessageEvent {
  type: "message";
  groupId: string;
  message: ChatMessage;
}

/**
 * Opens a WebSocket connection for the lifetime of the calling component
 * (scoped to the chat page, not the whole app) and delivers new messages
 * as they're pushed by the server. Reconnects with backoff on drop.
 */
export function useChatSocket(onMessage: (message: ChatMessage) => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let cancelled = false;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      const url = wsUrl();
      if (!url || cancelled) return;

      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        retryDelay = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as IncomingMessageEvent;
          if (data.type === "message") onMessageRef.current(data.message);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  function joinGroup(groupId: string) {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "join", groupId }));
    }
  }

  return { joinGroup };
}
