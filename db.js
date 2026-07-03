import dotenv from "dotenv";
import mysql from "mysql2/promise";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  connectionLimit: 10,
  waitForConnections: true,
});

// ✅ IMPORTANT: mysql2/promise wraps the pool internally.
// pool.on('connection') does NOT work on PromisePool.
// Must use pool.pool (the underlying raw pool) to listen to connection events.
pool.pool.on("connection", (connection) => {
  connection.query(
    "SET SESSION sql_mode = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION'",
    (err) => {
      if (err) console.error("❌ Failed to set sql_mode:", err);
    }
  );
});

pool
  .getConnection()
  .then((conn) => {
    console.log("✅ Database connected!");
    conn.release();
  })
  .catch((err) => console.error("❌ Connection error", err));

export default pool;
