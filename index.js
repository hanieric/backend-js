const express = require("express");
const cors = require("cors");
const session = require("express-session");
const routerfront = require("./routers/front.js");
const routermain = require("./routers/main.js");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

app.use(
  session({
    secret: dotenv.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(cors());
app.use(express.text());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routerfront);
app.use(routermain);

const { createServer } = require("http");
const httpServer = createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: dotenv.CORS_ORIGIN,
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
  console.log(`SERVER REALTIME DIJALANKAN DI PORT 3001`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SERVER DIJALANKAN DI PORT ${PORT}`);
});
