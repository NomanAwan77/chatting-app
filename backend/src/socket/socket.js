const { Server } = require("socket.io");
const MessageModel = require("../models/message.model");
const jwt = require("jsonwebtoken");
let io;

// store userId -> socketId
const onlineUsers = new Map();

const initSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.userId;
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    socket.emit("online_users", Array.from(onlineUsers.keys()));

    const isFirstConnection = onlineUsers.get(userId).size === 1;

    if (isFirstConnection) {
      socket.broadcast.emit("user_online", { userId });
    }
    socket.on("typing_start", ({ receiverId }) => {
      const sockets = onlineUsers.get(receiverId);

      if (sockets) {
        for (let socketId of sockets) {
          io.to(socketId).emit("typing_start", { userId });
          console.log("Typing start event:", { receiverId, userId });
        }
      }
    });

    socket.on("typing_stop", ({ receiverId }) => {
      const sockets = onlineUsers.get(receiverId);

      if (sockets) {
        for (let socketId of sockets) {
          io.to(socketId).emit("typing_stop", { userId });
        }
      }
    });
    // ✅ private message
    socket.on("send_message", async ({ receiverId, message }) => {
      if (!receiverId || !message) {
        console.log("Invalid message data");
        return;
      }
      const senderId = userId;
      console.log("Message event:", { senderId, receiverId, message });

      // save message to database
      try {
        const newMessage = await MessageModel.create({
          senderId,
          receiverId,
          message,
        });
        console.log("New message saved:", newMessage);
      } catch (error) {
        console.log("Error saving message:", error);
        return;
      }

      const receiverSockets = onlineUsers.get(receiverId);

      if (receiverSockets) {
        for (let socketId of receiverSockets) {
          io.to(socketId).emit("receive_message", {
            senderId,
            message,
          });
        }
      } else {
        console.log("Receiver not online");
      }
    });

    // disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      const userSockets = onlineUsers.get(userId);

      if (userSockets) {
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          socket.broadcast.emit("user_offline", { userId });
        }
      }
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = { initSocket, getIO };
