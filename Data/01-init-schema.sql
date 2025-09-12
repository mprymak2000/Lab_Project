-- Lab Plasmid Database Schema Initialization
-- This script creates the basic database schema if it doesn't exist
-- if new container is started (hard delete -v which deletes volume or docker system prune -a --volumes with deletes containers, images networks and volumes)
-- then this will run. then migration script populates it.

-- Create plasmids table (without volume columns)
CREATE TABLE IF NOT EXISTS plasmids (
    id SERIAL PRIMARY KEY,
    lot INTEGER NOT NULL,
    sublot INTEGER NOT NULL,
    bag VARCHAR(50) NOT NULL,
    notes TEXT,
    date_added TIMESTAMP DEFAULT NOW(),
    UNIQUE(lot, sublot, bag)
);

-- Create samples table with metadata
CREATE TABLE IF NOT EXISTS samples (
    id SERIAL PRIMARY KEY,
    plasmid_id INTEGER NOT NULL REFERENCES plasmids(id) ON DELETE CASCADE,
    volume DECIMAL(10,1) NOT NULL,
    date_created TIMESTAMP DEFAULT NOW(),
    date_modified TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plasmids_lot_sublot ON plasmids(lot, sublot);
CREATE INDEX IF NOT EXISTS idx_plasmids_bag ON plasmids(bag);
CREATE INDEX IF NOT EXISTS idx_samples_plasmid ON samples(plasmid_id);

-- Create a flag table to track if CSV migration has been completed
CREATE TABLE IF NOT EXISTS migration_status (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(100) UNIQUE NOT NULL,
    completed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);