-- Migration script for inventory_tracks_tbl
-- Run this SQL on your database to update the table structure for the new Tracks requirements

-- Rename totalLength → totalFeet
ALTER TABLE inventory_tracks_tbl CHANGE COLUMN totalLength totalFeet VARCHAR(255);

-- Remove old fields
ALTER TABLE inventory_tracks_tbl DROP COLUMN cost;
ALTER TABLE inventory_tracks_tbl DROP COLUMN quantity;

-- Rename price → pricePerUnit  
ALTER TABLE inventory_tracks_tbl CHANGE COLUMN price pricePerUnit DECIMAL(10,2);

-- Add totalPrice
ALTER TABLE inventory_tracks_tbl ADD COLUMN totalPrice DECIMAL(10,2) DEFAULT 0;

-- Make supplier nullable (if not already)
ALTER TABLE inventory_tracks_tbl MODIFY COLUMN supplier VARCHAR(255) NULL DEFAULT NULL;
