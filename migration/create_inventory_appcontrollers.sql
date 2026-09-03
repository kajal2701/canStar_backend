CREATE TABLE `inventory_appcontrollers_tbl` (
  `appcontroller_id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT '0',
  `pricePerUnit` decimal(10,2) NOT NULL DEFAULT '0.00',
  `totalPrice` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`appcontroller_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
