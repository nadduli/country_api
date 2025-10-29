// routes.js - Defines all the API endpoints (URLs)
const express = require('express');
const router = express.Router();
const {
  refreshCountries,
  getAllCountries,
  getCountryByName,
  deleteCountry,
  getStatus,
  getSummaryImage
} = require('./controllers');

// Think of routes like different doors in a building
// Each door (route) leads to a different room (function)

// POST /countries/refresh - Fetch fresh data from external APIs
router.post('/countries/refresh', refreshCountries);

// GET /countries - Get all countries (with optional filters)
// Examples: 
//   /countries
//   /countries?region=Africa
//   /countries?currency=NGN
//   /countries?sort=gdp_desc
router.get('/countries', getAllCountries);

// GET /countries/image - Get the summary image (MUST be before /:name route!)
router.get('/countries/image', getSummaryImage);

// GET /countries/:name - Get one specific country
// Example: /countries/Nigeria
router.get('/countries/:name', getCountryByName);

// DELETE /countries/:name - Delete a country
// Example: DELETE /countries/Nigeria
router.delete('/countries/:name', deleteCountry);

// GET /status - Get total countries and last refresh time
router.get('/status', getStatus);

// Home route - Just to check if API is running
router.get('/', (req, res) => {
  res.json({
    message: 'Country Currency API is running!',
    version: '1.0.0',
    endpoints: {
      refresh: 'POST /countries/refresh',
      all_countries: 'GET /countries',
      filter_by_region: 'GET /countries?region=Africa',
      filter_by_currency: 'GET /countries?currency=NGN',
      sort_by_gdp: 'GET /countries?sort=gdp_desc',
      single_country: 'GET /countries/:name',
      delete_country: 'DELETE /countries/:name',
      status: 'GET /status',
      image: 'GET /countries/image'
    },
    documentation: 'See README.md for full documentation'
  });
});

module.exports = router;