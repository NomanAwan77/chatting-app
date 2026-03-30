import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "../lib/config";
import { getCookie } from "../lib/cookies";

type ReceivePayload = { senderId: string; message: string };
type TypingPayload = { userId: string };

export function useChatSocket(
  enabled: boolean,
  onReceive: (payload: ReceivePayload) => void,
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const onReceiveRef = useRef(onReceive);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    onReceiveRef.current = onReceive;
  }, [onReceive]);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      setConnected(false);
      setSocketError(null);
      return;
    }

    const token = getCookie("token");
    if (!token) {
      setSocketError("No session token for realtime connection");
      setSocket(null);
      setConnected(false);
      return;
    }

    const s = io(API_BASE || undefined, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
    });

    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      setSocketError(null);
    });

    s.on("connect_error", (err) => {
      console.error("Socket connect_error:", err.message);
      setSocketError(err.message);
      setConnected(false);
    });

    s.on("disconnect", () => {
      setConnected(false);
    });

    s.on("receive_message", (payload: ReceivePayload) => {
      onReceiveRef.current(payload);
    });
    s.on("online_users", (users: string[]) => {
      setOnlineUsers(users);
    });

    s.on("user_online", (userId: string) => {
      setOnlineUsers((prev) =>
        prev.includes(userId) ? prev : [...prev, userId],
      );
    });
    s.on("user_offline", (userId: string) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    s.on("typing_start", ({ userId }: TypingPayload) => {
      setTypingUsers((prev) =>
        prev.includes(userId) ? prev : [...prev, userId],
      );
    });
    s.on("typing_stop", ({ userId }: TypingPayload) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      s.off("receive_message");
      s.off("typing_start");
      s.off("typing_stop");
      s.off("online_users");
      s.off("user_online");
      s.off("user_offline");
      s.disconnect();
      setSocket(null);
      setConnected(false);
      setTypingUsers([]);
    };
  }, [enabled]);

  return { socket, connected, socketError, onlineUsers, typingUsers };
}

export function emitSendMessage(
  socket: Socket | null,
  receiverId: string,
  message: string,
) {
  if (!socket?.connected) return;
  socket.emit("send_message", { receiverId, message });
}

export function emitTypingStart(socket: Socket | null, receiverId: string) {
  if (!socket?.connected) return;
  socket.emit("typing_start", { receiverId });
}

export function emitTypingStop(socket: Socket | null, receiverId: string) {
  if (!socket?.connected) return;
  socket.emit("typing_stop", { receiverId });
}
