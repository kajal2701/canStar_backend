-- Migration script for inventory_lights_tbl
-- Run this SQL on your canstarapp_canster database to update the table structure

-- Drop old columns
ALTER TABLE inventory_lights_tbl DROP COLUMN cost;
ALTER TABLE inventory_lights_tbl DROP COLUMN purchaseInfo;
ALTER TABLE inventory_lights_tbl DROP COLUMN notes;

-- Add new columns
ALTER TABLE inventory_lights_tbl ADD COLUMN supplier VARCHAR(255) NULL DEFAULT NULL;
ALTER TABLE inventory_lights_tbl ADD COLUMN pricePerUnit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE inventory_lights_tbl ADD COLUMN totalPrice DECIMAL(10,2) DEFAULT 0;
