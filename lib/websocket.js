import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

console.log("WebSocket server starting...");

function startWebSocketServer(app) {
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
    console.log("Client connected");

    socket.on("message", (data) => {
      console.log("Message from client:", data);
      io.emit("message", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  httpServer.listen(3001, () => {
    console.log("=========");
    console.log(`WebSocket server running on port 3001`);
    console.log(`CORS enabled for origin: ${origin}`);
    console.log("=========");
  });
}

export default startWebSocketServer;
