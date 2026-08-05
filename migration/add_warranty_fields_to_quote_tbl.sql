-- Add warranty JSON column and review email tracking to quote_tbl
-- warranty_data stores: { product_years, labour_years, start_date, product_end_date, labour_end_date }
ALTER TABLE quote_tbl
  ADD COLUMN warranty_data JSON DEFAULT NULL AFTER main_total,
  ADD COLUMN review_email_sent_at DATETIME DEFAULT NULL AFTER warranty_data;
