import express, { text, json, urlencoded } from "express";
import cors from "cors";
import session from "express-session";
import routerfront from "./routers/auth.js";
import routermain from "./routers/main.js";
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

app.use(routerfront);
app.use(routermain);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("=========");
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origin: ${CORS_ORIGIN}`);
  console.log("=========");
});
