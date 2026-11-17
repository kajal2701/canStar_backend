-- ============================================================================
-- Migration: Create calendar_notes_tbl
-- Description: Stores custom notes for dates in the Install Calendar view.
--              Date is stored in 'YYYY-MM-DD' format (matching quote_tbl.installation_date).
-- ============================================================================

CREATE TABLE IF NOT EXISTS `calendar_notes_tbl` (
  `note_id`      INT AUTO_INCREMENT PRIMARY KEY,
  `date`         DATE NOT NULL           ,
  `title`        VARCHAR(255) NOT NULL     ,
  `description`  TEXT DEFAULT NULL         ,
  `color`        VARCHAR(20) DEFAULT 'blue' ,
  `created_by`   INT NOT NULL               ,
  `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_date` (`date`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

