if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
// ADD THESE DEBUG LINES HERE:
console.log('=== ENVIRONMENT CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'MISSING');
console.log('========================');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { testConnection, pool } = require('./database');
const routes = require('./routes');


// Create the Express app (like building a house)
const app = express();
const PORT = process.env.PORT || 3000;


// MIDDLEWARE (Security guards and helpers)

// Enable CORS - Allows other websites to use your API
app.use(cors());

// Parse JSON data in request body
app.use(express.json());

// Parse URL-encoded data (form submissions)
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests (helpful for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});


// ROUTES - All  API endpoints
// Use all routes from routes.js
app.use('/', routes);


// 404 handler - When someone tries to access a route that doesn't exist
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: 'Please check the API documentation for valid endpoints',
    available_endpoints: {
      refresh: 'POST /countries/refresh',
      all_countries: 'GET /countries',
      single_country: 'GET /countries/:name',
      delete_country: 'DELETE /countries/:name',
      status: 'GET /status',
      image: 'GET /countries/image'
    }
  });
});

// Global error handler - Catches any unexpected errors
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// START SERVER

async function startServer() {
  try {
    // First, test if database connection works
    console.log('Testing database connection...');
    await testConnection();
    
    //Then start listening for requests
    app.listen(PORT, () => {
      console.log(`
        Country Currency API Server is Running! 
        Local:    http://localhost:${PORT}                    
        Network:  http://0.0.0.0:${PORT}
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    console.error('Please check your database connection settings in .env file');
    process.exit(1); // Exit if we can't connect to database
  }
}

// script to run sql server
async function runSetup() {
  const sql = fs.readFileSync('setup.sql', 'utf8');
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      await pool.query(statement);
    }
  }
  console.log('Setup complete!');
}
//Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n Shutting down gracefully...');
  process.exit(0);
});

// Call before startServer()
runSetup().then(() => startServer());

