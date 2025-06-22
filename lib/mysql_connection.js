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
  decimalNumbers: true,
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

    const createPengeluaranTableQuery = `
      CREATE TABLE IF NOT EXISTS pengeluaran (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama_pengeluaran VARCHAR(255) NOT NULL,
      jumlah_pengeluaran DECIMAL(18, 2) NOT NULL,
      tanggal DATE NOT NULL,
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES user(id)
      )
    `;

    const createPemasukanTableQuery = `
      CREATE TABLE IF NOT EXISTS pemasukan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama_pemasukan VARCHAR(255) NOT NULL,
      jumlah_pemasukan DECIMAL(18, 2) NOT NULL,
      tanggal DATE NOT NULL,
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES user(id)
      )
    `;

    const createChatTableQuery = `
      CREATE TABLE IF NOT EXISTS chat (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user(id)
      )
          `;

    const creatBalanceTableQuery = `
      CREATE TABLE IF NOT EXISTS balance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      total_pengeluaran DECIMAL(18, 2) DEFAULT 0,
      total_pemasukan DECIMAL(18, 2) DEFAULT 0,
      saldo DECIMAL(18, 2) DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES user(id)
      )`;

    // DROP ALL TABLE

    await connection.execute(createUserTableQuery);
    await connection.execute(createPengeluaranTableQuery);
    await connection.execute(createPemasukanTableQuery);
    await connection.execute(createChatTableQuery);
    await connection.execute(creatBalanceTableQuery);

    console.log("Tables created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

function generateWhereClause(where) {
  const whereClauses = [];
  const whereArgs = [];
  console.log("Generating where clause for:", where);
  for (const [key, value] of Object.entries(where)) {
    if (typeof value === "object" && value !== null) {
      Object.entries(value).forEach(([op, val]) => {
        switch (op) {
          case "$gte":
            whereClauses.push(`\`${key}\` >= ?`);
            whereArgs.push(val);
            break;
          case "$lte":
            whereClauses.push(`\`${key}\` <= ?`);
            whereArgs.push(val);
            break;
          case "$gt":
            whereClauses.push(`\`${key}\` > ?`);
            whereArgs.push(val);
            break;
          case "$lt":
            whereClauses.push(`\`${key}\` < ?`);
            whereArgs.push(val);
            break;
          case "$eq":
            whereClauses.push(`\`${key}\` = ?`);
            whereArgs.push(val);
            break;
          case "$ne":
            whereClauses.push(`\`${key}\` != ?`);
            whereArgs.push(val);
            break;
          case "$in":
            if (Array.isArray(val)) {
              whereClauses.push(
                `\`${key}\` IN (${val.map(() => "?").join(", ")})`
              );
              whereArgs.push(...val);
            }
            break;
          default:
            break;
        }
      });
    } else {
      whereClauses.push(`\`${key}\` = ?`);
      whereArgs.push(value);
    }
  }

  return {
    whereQuery: whereClauses,
    whereArgs: whereArgs,
  };
}

function generateEscapedColumns(columns) {
  if (columns.indexOf("*") !== -1) {
    return "*";
  } else {
    return columns.map((col) => `\`${col}\``).join(", ");
  }
}

const escapedTable = (table) => `\`${table}\``;

async function SELECT(table = "", { columns = ["*"], where = {} } = {}) {
  try {
    const connection = await getConnection();
    const escapedColumns = generateEscapedColumns(columns);

    let query = `SELECT ${escapedColumns} FROM ${escapedTable(table)}`;

    const { whereQuery, whereArgs } = generateWhereClause(where);

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

    const query = `INSERT INTO ${escapedTable(
      table
    )} (${columns}) VALUES (${placeholders})`;
    const [result] = await connection.execute(query, values);
    return result;
  } catch (error) {
    console.error("Database insert error:", error);
    throw error;
  }
}

async function UPDATE(table = "", { data = {}, where = {} } = {}) {
  try {
    const connection = await getConnection();

    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(data);

    const { whereQuery, whereArgs } = generateWhereClause(where);
    let query = `UPDATE ${escapedTable(table)} SET ${setClause}`;

    console.log("Where clause:", whereQuery, "Where args:", whereArgs);
    if (whereQuery.length > 0) {
      query += ` WHERE ${whereQuery.join(" AND ")}`;
      values.push(...whereArgs);
    }

    console.log("Executing query:", query, "with values:", values);

    const [result] = await connection.execute(query, values);
    return result;
  } catch (error) {
    console.error("Database update error:", error);
    throw error;
  }
}

async function DELETE(table = "", { where = {} } = {}) {
  try {
    const connection = await getConnection();

    const { whereQuery, whereArgs } = generateWhereClause(where);
    let query = `DELETE FROM ${escapedTable(table)}`;

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
    if (query.includes("LIMIT ?")) {
      const limitIndex = query.indexOf("LIMIT ?");
      const limitValue = params.pop(); // Remove the last parameter (LIMIT value)
      query =
        query.slice(0, limitIndex) +
        `LIMIT ${limitValue}` +
        query.slice(limitIndex + 7);
    }
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
