import { Router } from "express";
import authMiddleware from "../middleware/auth_middleware.js";

import dotenv from "dotenv";
import mysql_connection from "../lib/mysql_connection.js";
dotenv.config();

const router = Router();

router.use(authMiddleware);

router.post("/create/:type", async (req, res) => {
  const { type } = req.params;
  const userid = req.userId;

  if (!userid) {
    res.status(400).json({ message: "ID pengguna harus diisi" });
    return;
  }

  if (type !== "income" && type !== "expense") {
    res
      .status(400)
      .json({ message: "Tipe harus berupa 'income' atau 'expense'" });
    return;
  }

  const { keterangan, jumlah, date } = req.body;

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

  const tableName = type === "income" ? "pemasukan" : "pengeluaran";
  const nameField = type === "income" ? "nama_pemasukan" : "nama_pengeluaran";
  const amountField =
    type === "income" ? "jumlah_pemasukan" : "jumlah_pengeluaran";

  try {
    const insertResult = await mysql_connection.INSERT(tableName, {
      [nameField]: keterangan,
      [amountField]: parsedJumlah,
      tanggal: new Date(date),
      user_id: userid,
    });

    res.status(201).json({
      id: insertResult.insertId,
      [nameField]: keterangan,
      [amountField]: parsedJumlah,
      tanggal: date,
      user_id: userid,
    });
  } catch (err) {
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
    console.error(err);
  }
});

router.delete("/delete/:type", async (req, res) => {
  const { type } = req.params;
  const { id } = req.body;

  if (!id) {
    res.status(400).json({
      message: `ID ${
        type === "income" ? "pemasukan" : "pengeluaran"
      } harus diisi`,
    });
    return;
  }

  if (type !== "income" && type !== "expense") {
    res
      .status(400)
      .json({ message: "Tipe harus berupa 'income' atau 'expense'" });
    return;
  }

  const tableName = type === "income" ? "pemasukan" : "pengeluaran";
  const message =
    type === "income"
      ? "Pemasukan berhasil dihapus"
      : "Pengeluaran berhasil dihapus";

  try {
    await mysql_connection.DELETE(tableName, {
      where: { id: id },
    });
    res.status(200).json({ message: message });
  } catch (err) {
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
    console.error(err);
  }
});

router.put("/update/:type", async (req, res) => {
  const { type } = req.params;
  const { id, keterangan, jumlah, date } = req.body;

  if (!id || !keterangan || !jumlah || !date) {
    res.status(400).json({ message: "Semua field harus diisi" });
    return;
  }

  if (type !== "income" && type !== "expense") {
    res
      .status(400)
      .json({ message: "Tipe harus berupa 'income' atau 'expense'" });
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

  const tableName = type === "income" ? "pemasukan" : "pengeluaran";
  const nameField = type === "income" ? "nama_pemasukan" : "nama_pengeluaran";
  const amountField =
    type === "income" ? "jumlah_pemasukan" : "jumlah_pengeluaran";
  const message =
    type === "income"
      ? "Pemasukan berhasil diperbarui"
      : "Pengeluaran berhasil diperbarui";

  try {
    await mysql_connection.UPDATE(tableName, {
      data: {
        [nameField]: keterangan,
        [amountField]: parsedJumlah,
        tanggal: new Date(date),
      },
      where: { id: id },
    });

    res.status(200).json({ message: message });
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
