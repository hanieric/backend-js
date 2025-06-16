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
    // Assume authentication payload is sent as a query param or handshake auth
    // For example: socket.handshake.auth.userId
    const token = socket.handshake.auth?.token;

    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId; // Assuming the token contains userId
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

      io.emit("message", data);

      // Save to MySQL
      if (userId && data && data.text && data.timestamp) {
        try {
          await mysql_connection.INSERT("chat", {
            user_id: userId,
            message: data.text,
            timestamp: new Date(data.timestamp),
          });
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
