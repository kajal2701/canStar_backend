-- Change column types to VARCHAR(255) to support JSON arrays of installer IDs
ALTER TABLE `quote_tbl` MODIFY `installer_id` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `install_process_tbl` MODIFY `installer_id` VARCHAR(255) DEFAULT NULL;

-- Migrate existing integer values to JSON array strings
-- Update only if it doesn't already start with '['
UPDATE `quote_tbl` 
SET `installer_id` = CONCAT('[', `installer_id`, ']') 
WHERE `installer_id` IS NOT NULL AND `installer_id` != '' AND `installer_id` NOT LIKE '[%';

UPDATE `install_process_tbl` 
SET `installer_id` = CONCAT('[', `installer_id`, ']') 
WHERE `installer_id` IS NOT NULL AND `installer_id` != '' AND `installer_id` NOT LIKE '[%';
