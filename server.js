// server.js

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // <-- Use the promise-based version
const fs = require('fs').promises;     // <-- Use promises for fs module too
const path = require('path');

// App configuration
const app = express();
const PORT = 3000;
app.use(bodyParser.json());

// --- MODIFIED: Create a connection pool instead of a single connection ---

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
  waitForConnections: true, // Wait for a connection to be available
  connectionLimit: 10,      // Max number of connections in pool
  queueLimit: 0             // No limit on queued queries
});

console.log('✅ Connection pool created.');

// Basic route to check server status
app.get('/', (req, res) => {
  res.json({ message: 'Hello from the Node.js Express server!' });
});
// Route to check database connection status
app.get('/status', async (req, res) => { // Using async/await for cleaner code
  try {
    const connection = await pool.getConnection(); // Get a connection from the pool
    await connection.ping();
    connection.release(); // IMPORTANT: Release the connection back to the pool
    res.json({ status: 'ok', message: 'Database connection is healthy' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// --- MODIFIED: New route to execute SQL file using the pool ---
app.get('/run-query', async (req, res) => { // Using async/await
  try {
    const sqlFilePath = path.join(__dirname, 'query.sql');
    const sqlQuery = await fs.readFile(sqlFilePath, 'utf8');

    // Get a connection, execute the query, and release the connection
    const [results] = await pool.query(sqlQuery);

    res.json({ message: 'Query executed successfully!', results });
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'Database query failed.', details: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
