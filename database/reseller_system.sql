-- Reseller System SQL Patch
-- Target: MySQL / MariaDB
-- Project: CashBookBD API
--
-- Run this file once against the API database.
-- It does not require Laravel migrations.
-- No stored procedures are used, so database backups stay clean.

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `resellers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(120) NOT NULL,
  `business_name` VARCHAR(150) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `commission_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `commission_value` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `updated_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_resellers_user_id` (`user_id`),
  KEY `idx_resellers_status` (`status`),
  KEY `idx_resellers_phone` (`phone`),
  CONSTRAINT `fk_resellers_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reseller_company_assignments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reseller_id` BIGINT UNSIGNED NOT NULL,
  `company_id` INT UNSIGNED NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` INT UNSIGNED DEFAULT NULL,
  `status` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reseller_company_assignment` (`reseller_id`, `company_id`),
  KEY `idx_reseller_company_assignments_reseller_id` (`reseller_id`),
  KEY `idx_reseller_company_assignments_company_id` (`company_id`),
  KEY `idx_reseller_company_assignments_status` (`status`),
  CONSTRAINT `fk_reseller_company_assignments_reseller`
    FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_reseller_company_assignments_company`
    FOREIGN KEY (`company_id`) REFERENCES `com_companies` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reseller_commission_ledgers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reseller_id` BIGINT UNSIGNED NOT NULL,
  `company_id` INT UNSIGNED DEFAULT NULL,
  `subscription_id` BIGINT UNSIGNED DEFAULT NULL,
  `payment_id` BIGINT UNSIGNED DEFAULT NULL,
  `ledger_type` ENUM('earned', 'paid', 'adjustment') NOT NULL DEFAULT 'earned',
  `payment_method` ENUM('bkash', 'nagad', 'bank', 'cash', 'other') DEFAULT NULL,
  `paid_to_account` VARCHAR(120) DEFAULT NULL,
  `payment_reference` VARCHAR(120) DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'BDT',
  `status` ENUM('pending', 'approved', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `reference_no` VARCHAR(120) DEFAULT NULL,
  `ledger_date` DATE NOT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `updated_by` INT UNSIGNED DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reseller_commission_reseller_id` (`reseller_id`),
  KEY `idx_reseller_commission_company_id` (`company_id`),
  KEY `idx_reseller_commission_subscription_id` (`subscription_id`),
  KEY `idx_reseller_commission_payment_id` (`payment_id`),
  KEY `idx_reseller_commission_payment_method` (`payment_method`),
  KEY `idx_reseller_commission_status` (`status`),
  KEY `idx_reseller_commission_ledger_date` (`ledger_date`),
  CONSTRAINT `fk_reseller_commission_reseller`
    FOREIGN KEY (`reseller_id`) REFERENCES `resellers` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_reseller_commission_company`
    FOREIGN KEY (`company_id`) REFERENCES `com_companies` (`id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_reseller_commission_subscription`
    FOREIGN KEY (`subscription_id`) REFERENCES `saas_tenant_subscriptions` (`id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_reseller_commission_payment`
    FOREIGN KEY (`payment_id`) REFERENCES `saas_subscription_payments` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `users`
  ADD COLUMN `reseller_id` BIGINT UNSIGNED DEFAULT NULL AFTER `company_id`,
  ADD INDEX `idx_users_reseller_id` (`reseller_id`);

ALTER TABLE `com_companies`
  ADD COLUMN `reseller_id` BIGINT UNSIGNED DEFAULT NULL AFTER `id`,
  ADD INDEX `idx_com_companies_reseller_id` (`reseller_id`);

ALTER TABLE `saas_tenant_subscriptions`
  ADD COLUMN `reseller_id` BIGINT UNSIGNED DEFAULT NULL AFTER `company_id`,
  ADD INDEX `idx_saas_tenant_subscriptions_reseller_id` (`reseller_id`);

ALTER TABLE `saas_subscription_payments`
  ADD COLUMN `reseller_id` BIGINT UNSIGNED DEFAULT NULL AFTER `company_id`,
  ADD COLUMN `commission_type` ENUM('percentage', 'fixed') DEFAULT NULL AFTER `reseller_id`,
  ADD COLUMN `commission_value` DECIMAL(12,2) DEFAULT NULL AFTER `commission_type`,
  ADD COLUMN `commission_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `commission_value`,
  ADD INDEX `idx_saas_subscription_payments_reseller_id` (`reseller_id`);

UPDATE `saas_tenant_subscriptions` ts
INNER JOIN `com_companies` c ON c.id = ts.company_id
SET ts.reseller_id = c.reseller_id
WHERE ts.reseller_id IS NULL
  AND c.reseller_id IS NOT NULL;

UPDATE `saas_subscription_payments` sp
INNER JOIN `com_companies` c ON c.id = sp.company_id
LEFT JOIN `resellers` r ON r.id = c.reseller_id
SET
  sp.reseller_id = c.reseller_id,
  sp.commission_type = COALESCE(sp.commission_type, r.commission_type),
  sp.commission_value = COALESCE(sp.commission_value, r.commission_value),
  sp.commission_amount = CASE
    WHEN COALESCE(sp.commission_type, r.commission_type) = 'fixed'
      THEN COALESCE(sp.commission_value, r.commission_value, 0)
    WHEN COALESCE(sp.commission_type, r.commission_type) = 'percentage'
      THEN ROUND(sp.amount * COALESCE(sp.commission_value, r.commission_value, 0) / 100, 2)
    ELSE sp.commission_amount
  END
WHERE sp.reseller_id IS NULL
  AND c.reseller_id IS NOT NULL;

DROP VIEW IF EXISTS `vw_reseller_companies`;
CREATE VIEW `vw_reseller_companies` AS
SELECT
  r.id AS reseller_id,
  r.name AS reseller_name,
  r.business_name AS reseller_business_name,
  r.phone AS reseller_phone,
  r.email AS reseller_email,
  c.id AS company_id,
  c.name AS company_name,
  c.phone AS company_phone,
  c.email AS company_email,
  c.status AS company_status,
  rca.status AS assignment_status,
  rca.assigned_at
FROM `resellers` r
LEFT JOIN `reseller_company_assignments` rca ON rca.reseller_id = r.id
LEFT JOIN `com_companies` c ON c.id = rca.company_id;

DROP VIEW IF EXISTS `vw_reseller_payment_summary`;
CREATE VIEW `vw_reseller_payment_summary` AS
SELECT
  r.id AS reseller_id,
  r.name AS reseller_name,
  COUNT(DISTINCT c.id) AS total_companies,
  COUNT(sp.id) AS total_payments,
  SUM(CASE WHEN sp.payment_status = 'pending' THEN 1 ELSE 0 END) AS pending_payments,
  SUM(CASE WHEN sp.payment_status = 'approved' THEN 1 ELSE 0 END) AS approved_payments,
  COALESCE(SUM(CASE WHEN sp.payment_status = 'approved' THEN sp.amount ELSE 0 END), 0) AS approved_amount,
  COALESCE(SUM(CASE WHEN sp.payment_status = 'approved' THEN sp.commission_amount ELSE 0 END), 0) AS approved_commission
FROM `resellers` r
LEFT JOIN `com_companies` c ON c.reseller_id = r.id
LEFT JOIN `saas_subscription_payments` sp ON sp.reseller_id = r.id
GROUP BY r.id, r.name;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
