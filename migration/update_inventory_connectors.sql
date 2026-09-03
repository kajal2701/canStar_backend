TRUNCATE TABLE inventory_connectors_tbl;
ALTER TABLE inventory_connectors_tbl DROP COLUMN name;
ALTER TABLE inventory_connectors_tbl DROP COLUMN notes;
ALTER TABLE inventory_connectors_tbl DROP COLUMN cost;
ALTER TABLE inventory_connectors_tbl ADD COLUMN supplier VARCHAR(255) DEFAULT NULL;
ALTER TABLE inventory_connectors_tbl ADD COLUMN quantity INT NOT NULL;
ALTER TABLE inventory_connectors_tbl ADD COLUMN pricePerUnit DECIMAL(10, 2) NOT NULL;
ALTER TABLE inventory_connectors_tbl ADD COLUMN totalPrice DECIMAL(10, 2) NOT NULL;
