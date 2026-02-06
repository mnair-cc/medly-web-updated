import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL, {
      //   withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
    });

    socketInstance.on("connect", () => {
      console.info("Connected to WebSocket");
      // Clear error on successful connection
      setError(null);
    });

    socketInstance.on("reconnect", () => {
      console.info("Reconnected to WebSocket");
      setError(null);
    });

    socketInstance.on("disconnect", (reason) => {
      console.info("Disconnected from WebSocket:", reason);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setError(error);
    });

    socketInstance.on("error", (error) => {
      console.error("Socket error:", error);
      setError(error);
    });

    socketInstance.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
      setError(error);
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
      setError(new Error("Failed to reconnect to server"));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.close();
    };
  }, []); // Remove error dependency to prevent permanent disconnection

  return { socket, error, setError };
}
