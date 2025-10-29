// database.js - Connects to MySQL database
const mysql = require('mysql2/promise');


// Create a connection pool (like having multiple phone lines instead of one)
// This makes your app faster when multiple people use it at once
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // Max 10 connections at once
  queueLimit: 0
});

// Test the connection when app starts
async function testConnection() {
  console.log("Connecting with:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully!');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1); // Stop the app if database won't connect
  }
}

module.exports = { pool, testConnection };