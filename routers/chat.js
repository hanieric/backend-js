import { Router } from "express";
import authMiddleware from "../middleware/auth_middleware.js";
import mysql_connection from "../lib/mysql_connection.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const { count, lastId } = req.query;
  try {
    let query, params;

    if (lastId) {
      // Cursor-based pagination using lastId
      query =
        "SELECT chat.id AS chat_id, chat.user_id, chat.message, chat.timestamp, user.id AS user_id, user.username FROM chat JOIN user ON chat.user_id = user.id WHERE chat.id < ? ORDER BY chat.timestamp DESC LIMIT ?";
      params = [parseInt(lastId), parseInt(count) || 10];
    } else {
      // First page
      query =
        "SELECT chat.id AS chat_id, chat.user_id, chat.message, chat.timestamp, user.id AS user_id, user.username FROM chat JOIN user ON chat.user_id = user.id ORDER BY chat.timestamp DESC LIMIT ?";
      params = [parseInt(count) || 10];
    }

    const chats = await mysql_connection.QUERY(query, params);
    res.status(200).json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
  }
});

export default router;
