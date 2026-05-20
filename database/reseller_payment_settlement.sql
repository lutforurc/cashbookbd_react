-- Reseller Payment Settlement SQL Patch
-- Target: MySQL / MariaDB
-- Run this once if reseller_system.sql was already run before payment settlement fields were added.
-- No stored procedures are used.

ALTER TABLE `reseller_commission_ledgers`
  ADD COLUMN `payment_method` ENUM('bkash', 'nagad', 'bank', 'cash', 'other') DEFAULT NULL AFTER `ledger_type`,
  ADD COLUMN `paid_to_account` VARCHAR(120) DEFAULT NULL AFTER `payment_method`,
  ADD COLUMN `payment_reference` VARCHAR(120) DEFAULT NULL AFTER `paid_to_account`,
  ADD INDEX `idx_reseller_commission_payment_method` (`payment_method`);
