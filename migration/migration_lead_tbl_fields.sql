ALTER TABLE `lead_tbl`
  ADD `preferred_contact_method` VARCHAR(50) DEFAULT NULL AFTER `address`,
  ADD `financing_option` VARCHAR(50) DEFAULT 'No' AFTER `preferred_contact_method`;
