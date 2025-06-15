import { Router } from "express";
import authMiddleware from "../middleware/auth_middleware.js";
import mysql_connection from "../lib/mysql_connection.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (_, res) => {
  try {
    const chats = await mysql_connection.QUERY(
      "SELECT chat.*, user.* FROM chat JOIN user ON chat.user_id = user.id ORDER BY chat.timestamp ASC"
    );

    res.status(200).json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
  }
});

export default router;
