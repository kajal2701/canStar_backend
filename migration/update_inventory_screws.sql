-- Migration script for inventory_screws_tbl
-- Run this SQL on your canstar_2408 database to update the table structure

-- Drop old columns
ALTER TABLE inventory_screws_tbl DROP COLUMN cost;
ALTER TABLE inventory_screws_tbl DROP COLUMN price;

-- Add new columns
ALTER TABLE inventory_screws_tbl ADD COLUMN supplier VARCHAR(255) NULL DEFAULT NULL;
ALTER TABLE inventory_screws_tbl ADD COLUMN pricePerUnit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE inventory_screws_tbl ADD COLUMN totalPrice DECIMAL(10,2) DEFAULT 0;
