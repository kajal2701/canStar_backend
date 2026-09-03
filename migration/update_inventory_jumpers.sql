ALTER TABLE inventory_jumpers_tbl DROP COLUMN notes;
ALTER TABLE inventory_jumpers_tbl ADD COLUMN supplier VARCHAR(255) NULL;
ALTER TABLE inventory_jumpers_tbl ADD COLUMN pricePerUnit DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE inventory_jumpers_tbl ADD COLUMN totalPrice DECIMAL(10,2) NOT NULL DEFAULT 0.00;
