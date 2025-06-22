import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import dotenv from "dotenv";
import mysql_connection from "./mysql_connection.js";
import jwt from "jsonwebtoken";
dotenv.config();

console.log("WebSocket server starting...");

function generateHttpServer(app) {
  const origin = process.env.CORS_ORIGIN || "http://localhost:3000";
  const httpServer = createServer(app);
  httpServer,
    {
      cors: {
        origin: origin,
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
      },
    };

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: origin,
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;

    let userId = null;
    let userName = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        userName = decoded.username;
        socket.userId = userId;
        socket.userName = userName;
        console.log("User authenticated:", userId);
      } catch (err) {
        console.error("Authentication error:", err);
        socket.disconnect();
        return;
      }
    } else {
      console.warn("No authentication token provided");
    }

    socket.on("message", async (data) => {
      console.log("Received message:", data);
      console.log("User ID:", socket.userId);
      // Save to MySQL
      if (socket.userId && data && data.text && data.timestamp) {
        console.log("Hi");
        try {
          const chat = await mysql_connection.INSERT("chat", {
            user_id: socket.userId,
            message: data.text,
            timestamp: new Date(data.timestamp),
          });

          const chatData = {
            chat_id: chat.insertId,
            user_id: socket.userId,
            username: socket.userName,
            text: data.text,
            timestamp: data.timestamp,
          };

          // Broadcast to all except sender
          socket.broadcast.emit("message", chatData);

          // Optionally, send to sender with their own info if needed
          socket.emit("message", chatData);

          console.log("Chat message saved to MySQL");
        } catch (err) {
          console.error("Error saving chat message:", err);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  return httpServer;
}

export default generateHttpServer;
