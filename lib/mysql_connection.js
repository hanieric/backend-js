import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Create a single connection pool for the entire application
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function getConnection() {
  return pool;
}

async function initializeDatabase() {
  try {
    console.log("Connecting to MySQL database...");

    const connection = await getConnection();
    console.log("Connected to MySQL database successfully.");

    // Create tables if they do not exist
    await createTables();

    return connection;
  } catch (error) {
    console.error("Error connecting to MySQL database:", error);
    throw error;
  }
}

async function createTables() {
  try {
    const connection = await getConnection();
    const createUserTableQuery = `
      CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `;
    await connection.execute(createUserTableQuery);
    const createPengeluaranTableQuery = `
      CREATE TABLE IF NOT EXISTS pengeluaran (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama_pengeluaran VARCHAR(255) NOT NULL,
      jumlah_pengeluaran DECIMAL(10, 2) NOT NULL,
      tanggal DATE NOT NULL,
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES user(id)
      )
    `;
    await connection.execute(createPengeluaranTableQuery);

    const createPemasukanTableQuery = `
      CREATE TABLE IF NOT EXISTS pemasukan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama_pemasukan VARCHAR(255) NOT NULL,
      jumlah_pemasukan DECIMAL(10, 2) NOT NULL,
      tanggal DATE NOT NULL,
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES user(id)
      )
    `;

    await connection.execute(createPemasukanTableQuery);

    console.log("Tables created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

async function SELECT(
  table = "",
  { columns = ["*"], whereQuery = [], whereArgs = [] }
) {
  try {
    const connection = await getConnection();

    console.log("Executing SELECT query on table:", table);
    console.log("Columns:", columns);

    // Escape table and column names to prevent SQL injection
    const escapedColumns = columns.map((col) => `\`${col}\``).join(", ");
    const escapedTable = `\`${table}\``;

    let query = `SELECT ${escapedColumns} FROM ${escapedTable}`;
    if (whereQuery.length > 0) {
      query += ` WHERE ${whereQuery.join(" AND ")}`;
    }
    const [rows] = await connection.execute(query, whereArgs);
    return rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

async function INSERT(table = "", data = {}) {
  try {
    const connection = await getConnection();

    const columns = Object.keys(data).join(", ");
    const placeholders = Object.keys(data)
      .map(() => "?")
      .join(", ");
    const values = Object.values(data);

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const [result] = await connection.execute(query, values);
    return result;
  } catch (error) {
    console.error("Database insert error:", error);
    throw error;
  }
}

async function UPDATE(table = "", data = {}, whereQuery = [], whereArgs = []) {
  try {
    const connection = await getConnection();

    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(data);

    let query = `UPDATE ${table} SET ${setClause}`;
    if (whereQuery.length > 0) {
      query += ` WHERE ${whereQuery.join(" AND ")}`;
    }

    const [result] = await connection.execute(query, [...values, ...whereArgs]);
    return result;
  } catch (error) {
    console.error("Database update error:", error);
    throw error;
  }
}

async function DELETE(table = "", whereQuery = [], whereArgs = []) {
  try {
    const connection = await getConnection();

    let query = `DELETE FROM ${table}`;
    if (whereQuery.length > 0) {
      query += ` WHERE ${whereQuery.join(" AND ")}`;
    }

    const [result] = await connection.execute(query, whereArgs);
    return result;
  } catch (error) {
    console.error("Database delete error:", error);
    throw error;
  }
}

async function QUERY(query, params = []) {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export default {
  initializeDatabase,
  SELECT,
  INSERT,
  UPDATE,
  DELETE,
  QUERY,
};
