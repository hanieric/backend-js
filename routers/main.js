import { Router } from "express";
import authMiddleware from "../middleware/auth_middleware.js";

import dotenv from "dotenv";
import mysql_connection from "../lib/mysql_connection.js";
dotenv.config();

const router = Router();

router.use(authMiddleware);

router.post("/create/expense", async (req, res) => {
  const userid = req.userId;
  if (!userid) {
    res.status(400).json({ message: "ID pengguna harus diisi" });
    return;
  }

  const { pengeluaran, jumlah, date } = req.body;

  if (!pengeluaran || !jumlah || !date) {
    res.status(400).json({ message: "Semua field harus diisi" });
    return;
  }

  const parsedJumlah = Number(jumlah);
  if (isNaN(parsedJumlah)) {
    res.status(400).json({ message: "Jumlah harus berupa angka" });
    return;
  }

  await mysql_connection.INSERT("pengeluaran", {
    nama_pengeluaran: pengeluaran,
    jumlah_pengeluaran: parsedJumlah,
    tanggal: date,
    user_id: userid,
  });

  res.status(201).json({ message: "Pengeluaran berhasil disimpan" });
});

router.post("/create/income", async (req, res) => {
  const userid = req.userId;
  if (!userid) {
    res.status(400).json({ message: "ID pengguna harus diisi" });
    return;
  }

  const { pemasukan, jumlah, date } = req.body;

  if (!pemasukan || !jumlah || !date) {
    res.status(400).json({ message: "Semua field harus diisi" });
    return;
  }

  const parsedJumlah = Number(jumlah);
  if (isNaN(parsedJumlah)) {
    res.status(400).json({ message: "Jumlah harus berupa angka" });
    return;
  }

  await mysql_connection.INSERT("pemasukan", {
    nama_pemasukan: pemasukan,
    jumlah_pemasukan: parsedJumlah,
    tanggal: date,
    user_id: userid,
  });

  res.status(201).json({ message: "Pemasukan berhasil disimpan" });
});

router.delete("/delete/income", async (req, res) => {
  const { id } = req.body;

  if (!id) {
    res.status(400).json({ message: "ID pemasukan harus diisi" });
    return;
  }

  try {
    await mysql_connection.DELETE("pemasukan", { id: id });
    res.status(200).json({ message: "Pemasukan berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
    console.error(err);
  }
});

router.delete("/delete/expense", async (req, res) => {
  const { id } = req.body;

  if (!id) {
    res.status(400).json({ message: "ID pengeluaran harus diisi" });
    return;
  }

  try {
    await mysql_connection.DELETE("pengeluaran", { id: id });
    res.status(200).json({ message: "Pengeluaran berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
    console.error(err);
  }
});

router.post("/history", async (req, res) => {
  const { userId } = req.userId;

  if (!userId) {
    res.status(400).json({ message: "ID pengguna harus diisi" });
    return;
  }

  console.log("Fetching history for userId:", userId);

  try {
    const pengeluaran = await mysql_connection.SELECT("pengeluaran", {
      columns: ["id", "nama_pengeluaran", "jumlah_pengeluaran"],
      where: { user_id: id },
    });

    const total = await mysql_connection.QUERY(
      "SELECT SUM(jumlah_pengeluaran) AS total_pengeluaran FROM pengeluaran WHERE user_id = ?",
      [id]
    );

    const pemasukan = await mysql_connection.SELECT("pemasukan", {
      columns: ["id", "nama_pemasukan", "jumlah_pemasukan"],
      where: { user_id: id },
    });

    const totalPemasukan = await mysql_connection.QUERY(
      "SELECT SUM(jumlah_pemasukan) AS total_pemasukan FROM pemasukan WHERE user_id = ?",
      [id]
    );

    res.status(200).json({
      pengeluaran: pengeluaran.map((item) => ({
        id: item.id,
        nama_pengeluaran: item.nama_pengeluaran,
        jumlah_pengeluaran: item.jumlah_pengeluaran,
        tanggal: item.tanggal,
        type: "expense",
      })),
      total_pengeluaran: total[0].total_pengeluaran || 0,
      pemasukan: pemasukan.map((item) => ({
        id: item.id,
        nama_pemasukan: item.nama_pemasukan,
        jumlah_pemasukan: item.jumlah_pemasukan,
        tanggal: item.tanggal,
        type: "income",
      })),
      total_pemasukan: totalPemasukan[0].total_pemasukan || 0,
    });
  } catch (err) {
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
    console.error(err);
  }
});

export default router;
