-- Migration: Add customer_id to quote_tbl
-- Run this manually in phpMyAdmin or MySQL CLI
-- Safe to run: existing quotes will simply have customer_id = NULL

ALTER TABLE `quote_tbl`
ADD COLUMN `customer_id` INT DEFAULT NULL
AFTER `user_id`;
