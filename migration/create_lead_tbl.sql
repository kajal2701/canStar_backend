-- Migration: Create lead_tbl for public enquiries / leads
-- Run this SQL against the database before using the lead module.

CREATE TABLE IF NOT EXISTS lead_tbl (
  lead_id       INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255)  NULL,
  phone         VARCHAR(50)   NULL,
  note          TEXT          NULL,
  address       TEXT          NULL,
  status        VARCHAR(50)   NOT NULL DEFAULT 'New',
  active_state  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL,
  updated_at    DATETIME      NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
