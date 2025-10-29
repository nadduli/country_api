-- setup.sql - Database Setup Script
-- Run this file to create the database and tables

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  capital VARCHAR(255),
  region VARCHAR(100),
  population BIGINT NOT NULL,
  currency_code VARCHAR(10),
  exchange_rate DECIMAL(20, 6),
  estimated_gdp DECIMAL(30, 2),
  flag_url TEXT,
  last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_region (region),
  INDEX idx_currency (currency_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create app status table (stores last refresh timestamp)
CREATE TABLE IF NOT EXISTS app_status (
  id INT PRIMARY KEY DEFAULT 1,
  last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial status record
INSERT INTO app_status (id, last_refreshed_at) 
VALUES (1, CURRENT_TIMESTAMP) 
ON DUPLICATE KEY UPDATE last_refreshed_at = CURRENT_TIMESTAMP;

-- Verify tables were created
SHOW TABLES;

-- Show table structure
DESCRIBE countries;
DESCRIBE app_status;

-- Success message
SELECT 'Database setup completed successfully!' AS message;