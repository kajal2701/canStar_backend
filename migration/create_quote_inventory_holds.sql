-- Create the table for inventory holds
CREATE TABLE IF NOT EXISTS quote_inventory_holds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  inventory_category ENUM('TRACK', 'LIGHT', 'CONTROLLER') NOT NULL,
  inventory_id INT NOT NULL,
  held_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('HELD', 'RELEASED', 'USED') NOT NULL DEFAULT 'HELD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  released_at TIMESTAMP NULL,
  used_at TIMESTAMP NULL,
  INDEX idx_quote (quote_id),
  INDEX idx_status (status)
);

-- Add held_quantity and used_quantity to the Tracks table
ALTER TABLE inventory_tracks_tbl 
ADD COLUMN held_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN used_quantity DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add held_quantity and used_quantity to the Lights table
ALTER TABLE inventory_lights_tbl 
ADD COLUMN held_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN used_quantity DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add held_quantity and used_quantity to the Controllers table
ALTER TABLE inventory_controllers_tbl 
ADD COLUMN held_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN used_quantity DECIMAL(10,2) NOT NULL DEFAULT 0;
