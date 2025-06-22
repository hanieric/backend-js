import { Router } from "express";
import mysql_connection from "../lib/mysql_connection.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await mysql_connection.SELECT("balance", {
      where: { user_id: userId },
    });

    if (balance.length === 0) {
      return res.status(404).json({ message: "Saldo tidak ditemukan" });
    }

    res.status(200).json(balance[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
  }
});

export default router;
