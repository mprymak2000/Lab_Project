-- Initialize lab database with proper schema
CREATE DATABASE lab_db;

-- Connect to lab_db
\c lab_db;

-- Create plasmids table with new schema
CREATE TABLE plasmids (
    lot INTEGER NOT NULL,
    sub_lot INTEGER NOT NULL,
    bag VARCHAR(50),
    volume_1 DECIMAL(10,3),           -- vol1, allow NULL for old records
    volume_2 TEXT,                    -- other_volumes as comma-separated string
    notes TEXT,
    date_added TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (lot, sub_lot)
);

-- Create an index for bag-based queries
CREATE INDEX idx_plasmids_bag ON plasmids(bag);

-- Grant permissions to lab_user
GRANT ALL PRIVILEGES ON DATABASE lab_db TO lab_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lab_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lab_user;

-- Import data from CSV
COPY plasmids (bag, lot, sub_lot, volume_1, volume_2, notes)
FROM '/data/CsCl_Inventory.csv'
WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Update date_added for imported records to mark as old data
UPDATE plasmids SET date_added = '2024-01-01' WHERE date_added > '2024-01-01';