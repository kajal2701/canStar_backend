-- Add JSON column to quote_tbl to store items unchecked by customer during deposit
ALTER TABLE `quote_tbl` 
ADD COLUMN `unchecked_items_data` JSON DEFAULT NULL 
AFTER `warranty_data`;
