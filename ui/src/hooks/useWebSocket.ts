import { useState, useEffect, useRef, useCallback } from 'react';
import type { WsMessage } from '../types';

const WS_URL = `ws://${window.location.host}`;

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 3000);
    };
    socket.onerror = () => setIsConnected(false);
    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);

  const send = useCallback((data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { isConnected, send };
}
