import { Router } from "express";
import mysql_connection from "../lib/mysql_connection.js";
import authMiddleware from "../middleware/auth_middleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const balance = await mysql_connection.SELECT("balance", {
      where: { user_id: userId },
    });

    if (balance.length === 0) {
      return res.status(404).send("Saldo tidak ditemukan untuk pengguna ini");
    }

    res.status(200).json(balance[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ada masalah dengan hubungan ke server");
  }
});

export default router;
