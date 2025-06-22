import { Router } from "express";
import { hash, compare } from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

import mysql from "../lib/mysql_connection.js";

const router = Router();
router.get("/", (_, res) => {
  res.send("Selamat datang di API HANIERICK");
});

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).send("Wajib menyertakan username dan password");
    return;
  }

  try {
    const existingUser = await mysql.SELECT("user", {
      where: { username: username },
    });

    if (existingUser.length > 0) {
      res.status(409).send("Username sudah terdaftar");
      return;
    }

    const hashedPassword = await hash(password, 10);

    const createdUser = await mysql.INSERT("user", {
      username: username,
      password: hashedPassword,
    });

    if (!createdUser || !createdUser.insertId) {
      res.status(500).send("Gagal menyimpan data pengguna");
      return;
    }

    await mysql.INSERT("balance", {
      user_id: createdUser.insertId,
    });
    res.status(201).send("Berhasil mendaftar");
  } catch (err) {
    res.status(500).send("Ada masalah dengan hubungan ke server");
    console.error(err);
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).send("Wajib menyertakan username dan password");
    return;
  }

  try {
    const result = await mysql.SELECT("user", {
      where: { username: username },
    });

    if (result.length === 0) {
      res.status(401).send("Username atau password salah");
      return;
    }

    const dbUser = result[0];
    const isPasswordValid = await compare(password, dbUser.password);
    if (!isPasswordValid) {
      res.status(401).send("Username atau password salah");
      return;
    }

    const token = jwt.sign(
      { userId: dbUser.id, username: dbUser.username },
      process.env.JWT_SECRET,
      {
        expiresIn: "6h",
      }
    );
    req.session.userId = dbUser.id;
    res
      .status(200)
      .send({ token, userId: dbUser.id, username: dbUser.username });
  } catch (err) {
    res.status(500).send("Ada masalah dengan hubungan ke server");
    console.error(err);
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.send("Error saat logout");
      return;
    }
    res.status(200).send("Berhasil logout");
  });
});

export default router;
