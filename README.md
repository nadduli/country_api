# 🌍 Country Currency & Exchange Rate API

A RESTful API that fetches country data from external sources, calculates estimated GDP using exchange rates, and provides comprehensive country information with filtering and sorting capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- ✅ Fetch 250+ countries from REST Countries API
- ✅ Real-time exchange rate integration
- ✅ Automatic GDP estimation calculation
- ✅ MySQL database caching
- ✅ Filter by region (Africa, Europe, Asia, etc.)
- ✅ Filter by currency code (NGN, USD, EUR, etc.)
- ✅ Sort by GDP (ascending/descending)
- ✅ Sort by name (A-Z or Z-A)
- ✅ Full CRUD operations
- ✅ Comprehensive error handling
- ✅ Image generation (optional, requires canvas)

---

## Tech Stack

- **Runtime:** Node.js (v16+)
- **Framework:** Express.js
- **Database:** MySQL
- **External APIs:**
  - [REST Countries API](https://restcountries.com)
  - [Exchange Rates API](https://open.er-api.com)
- **Dependencies:**
  - `express` - Web framework
  - `mysql2` - MySQL client
  - `axios` - HTTP client
  - `dotenv` - Environment variables
  - `cors` - Cross-origin resource sharing
  - `canvas` - Image generation (optional)
- **DEv Dependencies:**
  - `nodemon`- Automatically restarts Node.js server whenever you make changes to your code

---

##  Prerequisites

Before you begin, ensure you have:

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **MySQL** database (local or cloud):
  - Local: [MySQL Installer](https://dev.mysql.com/downloads/installer/)
  - Cloud: [Railway](https://railway.app), [PlanetScale](https://planetscale.com), or [Aiven](https://aiven.io)

---

## Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd country-currency-api
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- express
- mysql2
- axios
- dotenv
- cors
- nodemon (dev dependency)

**Note:** Canvas is optional. If you encounter installation issues on Windows, the API works fine without it (image generation will be skipped).

---

## 🗄️ Database Setup

### Option 1: Using Railway (Recommended - No Local MySQL Needed)

1. Sign up at [railway.app](https://railway.app)
2. Create new project → Add MySQL database
3. Copy connection details from Variables tab
4. Create `run-setup.js` in your project root:

```javascript
require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

async function runSetup() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      multipleStatements: true
    });

    const sql = fs.readFileSync('setup.sql', 'utf8');
    await connection.query(sql);
    console.log('Tables created successfully!');
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables:', tables);
    
    await connection.end();
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

runSetup();
```

5. Run once:
```bash
node run-setup.js
```

6. Delete `run-setup.js` after setup completes

### Option 2: Local MySQL

```bash
# Run setup script
mysql -u root -p < setup.sql

# Or using MySQL Workbench:
# 1. Open MySQL Workbench
# 2. File → Open SQL Script → select setup.sql
# 3. Execute (⚡ icon)
```

### Database Tables Created:

- **`countries`** - Stores all country information
- **`app_status`** - Tracks last data refresh timestamp

---

## Configuration

### 1. Create `.env` File

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000

# Database Configuration (Railway Example)
DB_HOST=your-railway-host.railway.app
DB_USER=root
DB_PASSWORD=your-railway-password
DB_NAME=railway
DB_PORT=13241

# For Local MySQL:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_local_password
# DB_NAME=countries_db
# DB_PORT=3306
```

### 2. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_HOST` | MySQL host | `localhost` or Railway host |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | Your password |
| `DB_NAME` | Database name | `countries_db` or `railway` |
| `DB_PORT` | MySQL port | `3306` or Railway port |

---

## Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Expected Output:

```
 Testing database connection...
Connecting with: { host: '...', user: 'root', ... }
  Database connected successfully!

   Country Currency API Server is Running!
   Local:    http://localhost:3000
   Network:  http://0.0.0.0:3000
```

---

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API information |
| `POST` | `/countries/refresh` | Fetch and cache country data |
| `GET` | `/countries` | Get all countries (supports filters) |
| `GET` | `/countries/:name` | Get specific country by name |
| `DELETE` | `/countries/:name` | Delete a country |
| `GET` | `/status` | Get API status and total countries |
| `GET` | `/countries/image` | Get summary image (if canvas installed) |

---

## API Documentation

### 1. Refresh Country Data

Fetches fresh data from external APIs and stores in database.

**Endpoint:** `POST /countries/refresh`

**Response:**
```json
{
  "message": "Countries data refreshed successfully",
  "total_processed": 250
}
```

**What it does:**
1. Fetches 250+ countries from REST Countries API
2. Fetches current exchange rates
3. Calculates estimated GDP for each country
4. Updates database (inserts new or updates existing)
5. Generates summary image (if canvas available)

**Time:** Takes 30-60 seconds to complete

---

### 2. Get All Countries

Retrieve all countries with optional filtering and sorting.

**Endpoint:** `GET /countries`

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `region` | string | Filter by region | `?region=Africa` |
| `currency` | string | Filter by currency code | `?currency=NGN` |
| `sort` | string | Sort results | `?sort=gdp_desc` |

**Sort Options:**
- `gdp_desc` - Highest GDP first
- `gdp_asc` - Lowest GDP first
- `name_asc` - Alphabetical A-Z
- `name_desc` - Alphabetical Z-A

**Examples:**

```bash
# Get all countries
GET /countries

# Get African countries
GET /countries?region=Africa

# Get countries using Nigerian Naira
GET /countries?currency=NGN

# Get countries sorted by GDP (highest first)
GET /countries?sort=gdp_desc

# Combine filters
GET /countries?region=Africa&sort=gdp_desc
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Nigeria",
    "capital": "Abuja",
    "region": "Africa",
    "population": 206139589,
    "currency_code": "NGN",
    "exchange_rate": 1600.23,
    "estimated_gdp": 193217527.82,
    "flag_url": "https://flagcdn.com/ng.svg",
    "last_refreshed_at": "2025-10-27T10:30:00Z"
  },
  {
    "id": 2,
    "name": "Ghana",
    "capital": "Accra",
    "region": "Africa",
    "population": 31072940,
    "currency_code": "GHS",
    "exchange_rate": 15.34,
    "estimated_gdp": 3029834520.6,
    "flag_url": "https://flagcdn.com/gh.svg",
    "last_refreshed_at": "2025-10-27T10:30:00Z"
  }
]
```

---

### 3. Get Single Country

Retrieve detailed information about a specific country.

**Endpoint:** `GET /countries/:name`

**Example:**
```bash
GET /countries/Nigeria
```

**Response:**
```json
{
  "id": 1,
  "name": "Nigeria",
  "capital": "Abuja",
  "region": "Africa",
  "population": 206139589,
  "currency_code": "NGN",
  "exchange_rate": 1600.23,
  "estimated_gdp": 193217527.82,
  "flag_url": "https://flagcdn.com/ng.svg",
  "last_refreshed_at": "2025-10-27T10:30:00Z"
}
```

**Error Response (404):**
```json
{
  "error": "Country not found"
}
```

---

### 4. Delete Country

Remove a country from the database.

**Endpoint:** `DELETE /countries/:name`

**Example:**
```bash
DELETE /countries/TestCountry
```

**Response:**
```json
{
  "message": "Country deleted successfully"
}
```

**Error Response (404):**
```json
{
  "error": "Country not found"
}
```

---

### 5. Get Status

Get total number of countries and last refresh timestamp.

**Endpoint:** `GET /status`

**Response:**
```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-27T10:30:00Z"
}
```

---

### 6. Get Summary Image

Returns a PNG image with top 5 countries by GDP.

**Endpoint:** `GET /countries/image`

**Response:** PNG image file

**Requirements:** Canvas must be installed

**Error Response (404):**
```json
{
  "error": "Summary image not found"
}
```

**Note:** If canvas is not installed, this endpoint returns JSON data instead of an image.

---

## Project Structure

```
country-currency-api/
├── app.js                  # Main application entry point
├── database.js             # MySQL connection configuration
├── controllers.js          # Business logic and route handlers
├── routes.js               # API route definitions
├── setup.sql               # Database schema
├── package.json            # Project dependencies
├── .env                    # Environment variables (not committed)           
├── .gitignore             # Git ignore rules
├── README.md              # Project documentation
├── cache/                 # Generated images (auto-created)
│   └── summary.png
└── node_modules/          # Dependencies (auto-installed)
```

---

## Deployment

### Deploying to Railway

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository
   - Railway auto-detects Node.js

3. **Add MySQL Database:**
   - In your project, click "New" → "Database" → "Add MySQL"
   - Railway creates database automatically

4. **Set Environment Variables:**
   - Click on your app service
   - Go to "Variables" tab
   - Add all variables from your `.env` file
   - Railway auto-fills database variables

5. **Run Database Setup:**
   - Use the `run-setup.js` method described in Database Setup
   - Or use Railway's Data tab to paste SQL

## Testing

### Manual Testing with cURL

```bash
# Test server is running
curl http://localhost:3000

# Refresh data (takes 30-60 seconds)
curl -X POST http://localhost:3000/countries/refresh

# Get all countries
curl http://localhost:3000/countries

# Filter by region
curl "http://localhost:3000/countries?region=Africa"

# Get one country
curl http://localhost:3000/countries/Nigeria

# Check status
curl http://localhost:3000/status

# Download image
curl http://localhost:3000/countries/image --output summary.png
```

### Using Browser

Open these URLs in your browser:
- http://localhost:3000
- http://localhost:3000/status
- http://localhost:3000/countries
- http://localhost:3000/countries?region=Africa
- http://localhost:3000/countries/image

### Using Postman

1. Import requests or create manually
2. Test each endpoint
3. Verify response format and status codes

---

## Troubleshooting

### Database Connection Issues

**Problem:** "Database connection failed"

**Solutions:**
- Check `.env` file has correct credentials
- Verify MySQL is running: `mysql -u root -p`
- Test connection with Railway/MySQL Workbench
- Ensure `countries_db` database exists

### Port Already in Use

**Problem:** "Port 3000 already in use"

**Solutions:**
```powershell
# Windows - Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in .env
PORT=3001
```

### Canvas Installation Errors

**Problem:** Canvas won't install on Windows

**Solutions:**
- Skip canvas (API works without it)
- Deploy to Railway (canvas works automatically there)
- Or follow canvas installation guide

### No Data After Refresh

**Problem:** `/countries` returns empty array

**Solutions:**
- Call `POST /countries/refresh` first
- Wait 30-60 seconds for it to complete
- Check external APIs are accessible
- Verify database tables exist: `SHOW TABLES;`

### Module Not Found

**Problem:** "Cannot find module 'express'"

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Security Notes

- ✅ Never commit `.env` file to Git
- ✅ Use environment variables for all secrets
- ✅ Validate all user inputs
- ✅ Use prepared statements (prevents SQL injection)
- ✅ Keep dependencies updated: `npm audit fix`
- ✅ Use HTTPS in production
- ✅ Implement rate limiting for production

---

## API Response Formats

### Success Response
```json
{
  "id": 1,
  "name": "Nigeria",
  "capital": "Abuja",
  ...
}
```

### Error Responses

**404 Not Found:**
```json
{
  "error": "Country not found"
}
```

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": {
    "currency_code": "is required"
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

**503 Service Unavailable:**
```json
{
  "error": "External data source unavailable",
  "details": "Could not fetch data from https://restcountries.com"
}
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Author

Created for HNG12 Backend Stage 2 Task

---

## Acknowledgments

- [REST Countries API](https://restcountries.com) - Country data
- [Exchange Rates API](https://open.er-api.com) - Currency exchange rates
- [Railway](https://railway.app) - Hosting platform
- [HNG Internship](https://hng.tech) - Project assignment

---

**Built  using Node.js, Express, and MySQL**