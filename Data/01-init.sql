-- Database initialization script for PostgreSQL
-- This runs when the Docker container first starts

-- Create plasmids table with new schema (allowing duplicates)
CREATE TABLE plasmids (
    id SERIAL PRIMARY KEY,            -- Auto-increment ID as primary key
    lot INTEGER NOT NULL,
    sub_lot INTEGER NOT NULL,
    bag VARCHAR(50),
    volume_1 DECIMAL(10,3),           -- vol1, allow NULL for old records
    volume_2 TEXT,                    -- other_volumes as comma-separated string
    notes TEXT,
    date_added TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_plasmids_bag ON plasmids(bag);
CREATE INDEX idx_plasmids_date ON plasmids(date_added);

-- Import data from CSV file using a temporary table first
CREATE TEMP TABLE temp_plasmids (
    bag VARCHAR(50),
    lot VARCHAR(10),
    sub_lot VARCHAR(10),
    volume_1 VARCHAR(20),
    volume_2 VARCHAR(20),
    notes TEXT
);

-- Import all data as text first
COPY temp_plasmids (bag, lot, sub_lot, volume_1, volume_2, notes)
FROM '/data/CsCl_Inventory.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Clean and insert data with proper type conversion
INSERT INTO plasmids (bag, lot, sub_lot, volume_1, volume_2, notes)
SELECT 
    bag,
    lot::INTEGER,
    sub_lot::INTEGER,
    CASE 
        WHEN TRIM(volume_1) = '' OR volume_1 IS NULL THEN NULL 
        ELSE TRIM(volume_1)::DECIMAL(10,3) 
    END,
    CASE 
        WHEN TRIM(volume_2) = '' OR volume_2 IS NULL THEN NULL 
        ELSE TRIM(volume_2) 
    END,
    CASE 
        WHEN TRIM(notes) = '' THEN NULL 
        ELSE notes 
    END
FROM temp_plasmids;

-- Mark imported records as old data (before new schema requirements)
UPDATE plasmids SET date_added = '2024-01-01';