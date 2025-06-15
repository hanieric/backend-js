import express, { text, json, urlencoded } from "express";
import cors from "cors";
import session from "express-session";
import authRouter from "./routers/auth.js";
import mainRouter from "./routers/transaction.js";
import chatRouter from "./routers/chat.js";
import mysql from "./lib/mysql_connection.js";
import startWebSocketServer from "./lib/websocket.js";

import dotenv from "dotenv";
dotenv.config();

const { SESSION_SECRET, CORS_ORIGIN } = process.env;

const app = express();

startWebSocketServer(app);
mysql.initializeDatabase();

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(text());
app.use(json());
app.use(urlencoded({ extended: true }));

app.use(authRouter);
app.use(mainRouter);
app.use("/chat", chatRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("=========");
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origin: ${CORS_ORIGIN}`);
  console.log("=========");
});
