// controllers.js - All the logic for handling requests
const axios = require('axios');
const { pool } = require('./database');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// URLs for external APIs
const COUNTRIES_API = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
const EXCHANGE_API = 'https://open.er-api.com/v6/latest/USD';

// Helper: Generate random number between min and max
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// 1. REFRESH DATA - Fetch from external APIs and save to database
async function refreshCountries(req, res) {
  try {
    console.log('Starting data refresh...');
    
    // Step 1: Fetch countries data
    // const countriesResponse = await axios.get(COUNTRIES_API, { timeout: 15000 });
  // STEP 1: Fetch countries data
    let countriesResponse;
    try {
      countriesResponse = await axios.get(COUNTRIES_API, { timeout: 15000 });
    } catch (err) {
      console.error(' Countries API failed:', err.code || err.message);
      throw new Error(`Failed to fetch from ${COUNTRIES_API}`);
    }

    // STEP 2: Fetch exchange rates
    let exchangeResponse;
    try {
      exchangeResponse = await axios.get(EXCHANGE_API, { timeout: 30000 });
    } catch (err) {
      console.error('Exchange API failed:', err.code || err.message);
      throw new Error(`Failed to fetch from ${EXCHANGE_API}`);
    }

    const countries = countriesResponse.data;
    const exchangeRates = exchangeResponse.data.rates;

    
    // Step 2: Fetch exchange rates
    // const exchangeResponse = await axios.get(EXCHANGE_API, { timeout: 15000 });
    // const exchangeRates = exchangeResponse.data.rates;
    
    console.log(` Fetched ${countries.length} countries and ${Object.keys(exchangeRates).length} exchange rates`);
    
    // Step 3: Process each country
    let successCount = 0;
    
    for (const country of countries) {
      try {
        // Extract currency code (first one if multiple)
        let currencyCode = null;
        let exchangeRate = null;
        let estimatedGdp = null;
        
        if (country.currencies && country.currencies.length > 0) {
          currencyCode = country.currencies[0].code;
          
          // Find exchange rate for this currency
          if (exchangeRates[currencyCode]) {
            exchangeRate = exchangeRates[currencyCode];
            
            // Calculate GDP: population × random(1000-2000) ÷ exchange_rate
            const randomMultiplier = randomBetween(1000, 2000);
            estimatedGdp = (country.population * randomMultiplier) / exchangeRate;
          }
        }
        
        // Check if country already exists (case-insensitive)
        const [existing] = await pool.query(
          'SELECT id FROM countries WHERE LOWER(name) = LOWER(?)',
          [country.name]
        );
        
        if (existing.length > 0) {
          // Update existing country
          await pool.query(
            `UPDATE countries SET 
              capital = ?, region = ?, population = ?, 
              currency_code = ?, exchange_rate = ?, estimated_gdp = ?, 
              flag_url = ?, last_refreshed_at = NOW()
             WHERE id = ?`,
            [
              country.capital || null,
              country.region || null,
              country.population,
              currencyCode,
              exchangeRate,
              estimatedGdp || 0,
              country.flag || null,
              existing[0].id
            ]
          );
        } else {
          // Insert new country
          await pool.query(
            `INSERT INTO countries 
              (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              country.name,
              country.capital || null,
              country.region || null,
              country.population,
              currencyCode,
              exchangeRate,
              estimatedGdp || 0,
              country.flag || null
            ]
          );
        }
        
        successCount++;
      } catch (err) {
        console.error(`Failed to process ${country.name}:`, err.message);
      }
    }
    
    // Step 4: Update global refresh timestamp
    await pool.query('UPDATE app_status SET last_refreshed_at = NOW() WHERE id = 1');
    
    // Step 5: Generate summary image
    await generateSummaryImage();
    
    console.log(`Successfully refreshed ${successCount} countries`);
    
    res.json({
      message: 'Countries data refreshed successfully',
      total_processed: successCount
    });
    
  } catch (error) {
    console.error('Refresh failed:', error.message);
    
    // Check if it's an external API error
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'External data source unavailable',
        details: `Could not fetch data from ${error.config?.url || 'external API'}`
      });
    }
    
    res.status(503).json({
      error: 'External data source unavailable',
      details: error.message
    });
  }
}

// 2. GET ALL COUNTRIES - With filters and sorting
async function getAllCountries(req, res) {
  try {
    const { region, currency, sort } = req.query;
    
    // Start building SQL query
    let query = 'SELECT * FROM countries WHERE 1=1';
    const params = [];
    
    // Add region filter if provided
    if (region) {
      query += ' AND LOWER(region) = LOWER(?)';
      params.push(region);
    }
    
    // Add currency filter if provided
    if (currency) {
      query += ' AND LOWER(currency_code) = LOWER(?)';
      params.push(currency);
    }
    
    // Add sorting
    if (sort === 'gdp_desc') {
      query += ' ORDER BY estimated_gdp DESC';
    } else if (sort === 'gdp_asc') {
      query += ' ORDER BY estimated_gdp ASC';
    } else if (sort === 'name_asc') {
      query += ' ORDER BY name ASC';
    } else if (sort === 'name_desc') {
      query += ' ORDER BY name DESC';
    } else {
      query += ' ORDER BY name ASC'; // Default sort
    }
    
    const [countries] = await pool.query(query, params);
    
    res.json(countries);
    
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 3. GET ONE COUNTRY by name
async function getCountryByName(req, res) {
  try {
    const { name } = req.params;
    
    const [countries] = await pool.query(
      'SELECT * FROM countries WHERE LOWER(name) = LOWER(?)',
      [name]
    );
    
    if (countries.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    
    res.json(countries[0]);
    
  } catch (error) {
    console.error('Error fetching country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 4. DELETE COUNTRY by name
async function deleteCountry(req, res) {
  try {
    const { name } = req.params;
    
    const [result] = await pool.query(
      'DELETE FROM countries WHERE LOWER(name) = LOWER(?)',
      [name]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    
    res.json({ message: 'Country deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 5. GET STATUS - Total countries and last refresh time
async function getStatus(req, res) {
  try {
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM countries');
    const [statusResult] = await pool.query('SELECT last_refreshed_at FROM app_status WHERE id = 1');
    
    res.json({
      total_countries: countResult[0].total,
      last_refreshed_at: statusResult[0]?.last_refreshed_at || null
    });
    
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 6. GENERATE SUMMARY IMAGE
async function generateSummaryImage() {
  try {
    // Get top 5 countries by GDP
    const [top5] = await pool.query(
      'SELECT name, estimated_gdp FROM countries WHERE estimated_gdp IS NOT NULL ORDER BY estimated_gdp DESC LIMIT 5'
    );
    
    // Get total count and last refresh time
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM countries');
    const [statusResult] = await pool.query('SELECT last_refreshed_at FROM app_status WHERE id = 1');
    
    const total = countResult[0].total;
    const lastRefresh = statusResult[0]?.last_refreshed_at || new Date();
    
    // Create canvas (like a blank paper to draw on)
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Country Data Summary', width / 2, 60);
    
    // Total countries
    ctx.font = '24px Arial';
    ctx.fillText(`Total Countries: ${total}`, width / 2, 120);
    
    // Last refresh time
    ctx.font = '18px Arial';
    ctx.fillText(`Last Updated: ${new Date(lastRefresh).toLocaleString()}`, width / 2, 160);
    
    // Top 5 header
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Top 5 Countries by GDP', width / 2, 220);
    
    // Draw top 5 countries
    let yPosition = 270;
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    
    top5.forEach((country, index) => {
      const gdpFormatted = country.estimated_gdp 
        ? `$${(country.estimated_gdp / 1e9).toFixed(2)}B`
        : 'N/A';
      
      ctx.fillText(
        `${index + 1}. ${country.name}: ${gdpFormatted}`,
        100,
        yPosition
      );
      yPosition += 40;
    });
    
    // Save image
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(cacheDir, 'summary.png'), buffer);
    
    console.log('Summary image generated successfully');
    
  } catch (error) {
    console.error('Error generating image:', error);
  }
}

// 7. SERVE SUMMARY IMAGE
async function getSummaryImage(req, res) {
  try {
    const imagePath = path.join(__dirname, 'cache', 'summary.png');
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Summary image not found' });
    }
    
    res.sendFile(imagePath);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  refreshCountries,
  getAllCountries,
  getCountryByName,
  deleteCountry,
  getStatus,
  getSummaryImage
};