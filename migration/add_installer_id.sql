

ALTER TABLE `quote_tbl` 
ADD COLUMN `installer_id` INT DEFAULT NULL
AFTER `installation_date`;

