-- ============================================================================
-- Migration: Create install_process_tbl
-- Description: Stores installation process data (7-step wizard) per quote.
--              Each step's data is saved as JSON when the installer clicks Save.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `install_process_tbl` (
  `install_process_id` INT AUTO_INCREMENT PRIMARY KEY,
  `quote_id` INT NOT NULL,
  `installer_id` INT DEFAULT NULL,
  `current_step` TINYINT NOT NULL DEFAULT 1,

  -- Step data (JSON columns)
  `prep_data` JSON DEFAULT NULL COMMENT 'Step 1: Prep Stage — lights, tracks, checklist',
  `on_the_way_data` JSON DEFAULT NULL COMMENT 'Step 2: On the Way — ETA sent, minutes, timestamp',
  `controller_box_data` JSON DEFAULT NULL COMMENT 'Step 3: Controller Box — photo, confirmation, pre-assessment',
  `post_install_data` JSON DEFAULT NULL COMMENT 'Step 4: Post Installation — checklist, images, notes',
  `drop_off_data` JSON DEFAULT NULL COMMENT 'Step 5: Supplies & Drop-off — items, travel time, notes',
  `time_entry_data` JSON DEFAULT NULL COMMENT 'Step 6: Time Entry — start/end time, expenses',

  -- Status & timestamps
  `status` ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  `started_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE KEY `uq_quote` (`quote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
