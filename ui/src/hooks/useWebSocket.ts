import { useState, useEffect, useRef, useCallback } from 'react';
import type { WsMessage } from '../types';

const WS_URL = `ws://${window.location.host}`;

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const queue = useRef<any[]>([]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.CONNECTING || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      // Enviar mensajes en cola
      while (queue.current.length > 0) {
        const data = queue.current.shift();
        socket.send(JSON.stringify(data));
      }
    };
    socket.onclose = () => {
      setIsConnected(false);
      if (ws.current === socket) {
        setTimeout(() => connect(), 3000);
      }
    };
    socket.onerror = () => setIsConnected(false);
    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        onMessageRef.current(msg);
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      const socket = ws.current;
      ws.current = null;
      socket?.close();
    };
  }, [connect]);

  const send = useCallback((data: Record<string, unknown> | WsMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      queue.current.push(data);
    }
  }, []);

  return { isConnected, send };
}
