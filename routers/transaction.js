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

  const { keterangan, jumlah, date } = req.body;

  console.log(req.body);
  if (!keterangan || !jumlah || !date) {
    res.status(400).json({ message: "Semua field harus diisi" });
    return;
  }

  if (jumlah.toString().length > 18) {
    res.status(400).json({ message: "Jumlah tidak boleh lebih dari 18 digit" });
    return;
  }

  const parsedJumlah = Number(jumlah);
  if (isNaN(parsedJumlah)) {
    res.status(400).json({ message: "Jumlah harus berupa angka" });
    return;
  }

  await mysql_connection.INSERT("pengeluaran", {
    nama_pengeluaran: keterangan,
    jumlah_pengeluaran: parsedJumlah,
    tanggal: new Date(date),
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
  const { keterangan, jumlah, date } = req.body;

  console.log(req.body);

  if (!keterangan || !jumlah || !date) {
    res.status(400).json({ message: "Semua field harus diisi" });
    return;
  }

  if (jumlah.toString().length > 18) {
    res.status(400).json({ message: "Jumlah tidak boleh lebih dari 18 digit" });
    return;
  }

  const parsedJumlah = Number(jumlah);
  if (isNaN(parsedJumlah)) {
    res.status(400).json({ message: "Jumlah harus berupa angka" });
    return;
  }

  await mysql_connection.INSERT("pemasukan", {
    nama_pemasukan: keterangan,
    jumlah_pemasukan: parsedJumlah,
    tanggal: new Date(date),
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

router.get("/history", async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    res.status(400).json({ message: "ID pengguna harus diisi" });
    return;
  }

  console.log("Fetching history for userId:", userId);

  const { start_date: startDate, end_date: endDate } = req.query;

  const whereConditions = { user_id: userId };
  if (startDate) {
    whereConditions.tanggal = { $gte: new Date(startDate) };
  }

  if (endDate) {
    whereConditions.tanggal = {
      ...whereConditions.tanggal,
      $lte: new Date(endDate),
    };
  }

  try {
    const expense = await mysql_connection.SELECT("pengeluaran", {
      columns: ["id", "nama_pengeluaran", "jumlah_pengeluaran", "tanggal"],
      where: whereConditions,
    });

    const income = await mysql_connection.SELECT("pemasukan", {
      columns: ["id", "nama_pemasukan", "jumlah_pemasukan", "tanggal"],
      where: whereConditions,
    });

    res.status(200).json({
      expense: expense,
      expense_total: expense.reduce(
        (total, item) => total + Number(item.jumlah_pengeluaran),
        0
      ),
      income: income,
      income_total: income.reduce(
        (total, item) => total + Number(item.jumlah_pemasukan),
        0
      ),
    });
  } catch (err) {
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
    console.error(err);
  }
});

export default router;
