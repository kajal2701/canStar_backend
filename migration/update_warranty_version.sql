-- SQL migration to add warranty versioning support
-- 1. Add the warranty_version column with a default of 'old'
ALTER TABLE quote_tbl ADD COLUMN warranty_version VARCHAR(10) DEFAULT 'old';

-- 2. Backfill any quotes created on or after August 19, 2026 to be 'new'
UPDATE quote_tbl SET warranty_version = 'new' WHERE created_at >= '2026-08-19';
