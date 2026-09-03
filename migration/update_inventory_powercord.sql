-- Migration: Update inventory_powercord_tbl for refactored power cord module
-- Adds supplier, pricePerUnit, totalPrice columns; drops notes column

ALTER TABLE inventory_powercord_tbl
  ADD COLUMN supplier VARCHAR(255) DEFAULT NULL AFTER type,
  ADD COLUMN pricePerUnit DECIMAL(10,2) DEFAULT NULL AFTER quantity,
  ADD COLUMN totalPrice DECIMAL(10,2) DEFAULT NULL AFTER pricePerUnit,
  DROP COLUMN notes;
