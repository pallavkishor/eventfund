import { useEffect, useRef } from "react";

export function useWebSocket(eventId: string | undefined, onMessage: (data: any) => void) {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?eventId=${eventId}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected for event:", eventId);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected for event:", eventId);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [eventId, onMessage]);

  return ws.current;
}
