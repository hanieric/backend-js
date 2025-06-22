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
  const nameField = `nama_${tableName}`;
  const amountField = `jumlah_${tableName}`;
  const totalField = `total_${tableName}`;

  try {
    const insertResult = await mysql_connection.INSERT(tableName, {
      [nameField]: keterangan,
      [amountField]: parsedJumlah,
      tanggal: new Date(date),
      user_id: userid,
    });

    if (!insertResult || !insertResult.insertId) {
      res.status(500).json({ message: "Gagal menyimpan data" });
      return;
    }

    const balanceRecord = await mysql_connection.SELECT("balance", {
      columns: ["id", "total_pengeluaran", "total_pemasukan", "saldo"],
      where: { user_id: userid },
    });

    await mysql_connection.UPDATE("balance", {
      data: {
        [totalField]: balanceRecord[0][totalField] + parsedJumlah,
        saldo:
          balanceRecord[0].saldo +
          (type === "income" ? parsedJumlah : -parsedJumlah),
      },
      where: { user_id: userid },
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
  const amountField = `jumlah_${tableName}`;
  const message =
    type === "income"
      ? "Pemasukan berhasil dihapus"
      : "Pengeluaran berhasil dihapus";

  try {
    const existingRecord = await mysql_connection.SELECT(tableName, {
      columns: ["id", amountField],
      where: { id: id },
    });
    if (existingRecord.length === 0) {
      res.status(404).json({ message: "Data tidak ditemukan" });
      return;
    }

    const deletePromise = mysql_connection.DELETE(tableName, {
      where: { id: id },
    });

    const balance = await mysql_connection.SELECT("balance", {
      columns: ["id", "total_pengeluaran", "total_pemasukan", "saldo"],
      where: { user_id: req.userId },
    });

    const newSaldo =
      type === "income"
        ? balance[0].saldo - existingRecord[0][amountField]
        : balance[0].saldo + existingRecord[0][amountField];

    const newTotalTransaction =
      type === "income"
        ? balance[0].total_pemasukan - existingRecord[0][amountField]
        : balance[0].total_pengeluaran + existingRecord[0][amountField];

    const updateBalancePromise = mysql_connection.UPDATE("balance", {
      data: {
        [type === "income" ? "total_pemasukan" : "total_pengeluaran"]:
          newTotalTransaction,
        saldo: newSaldo,
      },
      where: { user_id: req.userId },
    });

    await Promise.all([deletePromise, updateBalancePromise]);

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
  const nameField = `nama_${tableName}`;
  const amountField = `jumlah_${tableName}`;
  const balanceField = `total_${tableName}`;
  const message =
    type === "income"
      ? "Pemasukan berhasil diperbarui"
      : "Pengeluaran berhasil diperbarui";

  try {
    let existingRecord = await mysql_connection.SELECT(tableName, {
      columns: ["id", nameField, amountField, "tanggal"],
      where: { id: id },
    });

    let isTypeChanged = false;
    let newTableName = tableName;
    if (existingRecord.length === 0) {
      newTableName = type === "income" ? "pengeluaran" : "pemasukan";
      existingRecord = await mysql_connection.SELECT(newTableName, {
        columns: [
          "id",
          `nama_${newTableName}`,
          `jumlah_${newTableName}`,
          "tanggal",
        ],
        where: { id: id },
      });
      if (existingRecord.length > 0) {
        isTypeChanged = true;
      } else {
        res.status(404).json({ message: "Data tidak ditemukan" });
        return;
      }
    }

    let updatePromise;

    if (isTypeChanged) {
      updatePromise = handleMoveTable(
        newTableName,
        tableName,
        id,
        req.userId,
        keterangan,
        parsedJumlah,
        date
      );
    } else {
      updatePromise = mysql_connection.UPDATE(tableName, {
        data: {
          [nameField]: keterangan,
          [amountField]: parsedJumlah,
          tanggal: new Date(date),
        },
        where: { id: id },
      });
    }

    const balance = await mysql_connection.SELECT("balance", {
      columns: ["id", "total_pengeluaran", "total_pemasukan", "saldo"],
      where: { user_id: req.userId },
    });

    let balanceUpdates = {};
    let newSaldo = balance[0].saldo;

    if (isTypeChanged) {
      // Remove from old type and add to new type
      const oldAmountField = `jumlah_${newTableName}`;
      const oldAmount = existingRecord[0][oldAmountField];

      // Remove from old type totals
      if (newTableName === "pemasukan") {
        balanceUpdates.total_pemasukan = balance[0].total_pemasukan - oldAmount;
        balanceUpdates.total_pengeluaran =
          balance[0].total_pengeluaran + parsedJumlah;
        newSaldo = newSaldo - oldAmount - parsedJumlah;
      } else {
        balanceUpdates.total_pengeluaran =
          balance[0].total_pengeluaran - oldAmount;
        balanceUpdates.total_pemasukan =
          balance[0].total_pemasukan + parsedJumlah;
        newSaldo = newSaldo + oldAmount + parsedJumlah;
      }
    } else {
      // Same type, just update amount
      const oldAmount = existingRecord[0][amountField];
      const amountDifference = parsedJumlah - oldAmount;

      balanceUpdates[balanceField] =
        balance[0][balanceField] + amountDifference;

      if (type === "income") {
        newSaldo = balance[0].saldo + amountDifference;
      } else {
        newSaldo = balance[0].saldo - amountDifference;
      }
    }

    balanceUpdates.saldo = newSaldo;

    const updateBalancePromise = mysql_connection.UPDATE("balance", {
      data: balanceUpdates,
      where: { user_id: req.userId },
    });

    await Promise.all([updatePromise, updateBalancePromise]);
    res.status(200).json({ message: message });
  } catch (err) {
    res.status(500).json({ message: "Ada masalah dengan hubungan ke server" });
    console.error(err);
  }
});

async function handleMoveTable(
  oldTable,
  newTable,
  id,
  userId,
  keterangan,
  jumlah,
  date
) {
  await mysql_connection.DELETE(oldTable, {
    where: { id: id, user_id: userId },
  });

  return mysql_connection.INSERT(newTable, {
    [`nama_${newTable}`]: keterangan,
    [`jumlah_${newTable}`]: jumlah,
    tanggal: new Date(date),
    user_id: userId,
  });
}

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
