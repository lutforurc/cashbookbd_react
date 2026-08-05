-- Company & Product-wise Bill / Cash Received / Cash Payment tracking
-- Target database: MySQL 5.7+ / MariaDB with InnoDB
--
-- SAFETY GUARANTEE
-- ----------------
-- This script only creates new tables. It does not ALTER, UPDATE, DELETE,
-- or add foreign keys to any existing/legacy table.
--
-- Existing application tables referenced logically (no FK dependency):
--   com_companies, com_branches, product_items, users, transaction tables,
--   sales/purchase invoice master and detail tables.
--
-- Scope convention:
--   branch_id = 0 means the setting applies to every branch of the company.
--   A positive branch_id means branch-specific scope.

SET NAMES utf8mb4;

-- ================================================================
-- 1. Selects exactly which Company + Product combinations are tracked.
-- ================================================================
CREATE TABLE IF NOT EXISTS `company_product_tracking_settings` (
    `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id`              INT UNSIGNED NOT NULL,
    `branch_id`               INT UNSIGNED NOT NULL DEFAULT 0,
    `product_id`              BIGINT UNSIGNED NOT NULL,

    `track_sales_bill`        TINYINT(1) NOT NULL DEFAULT 1,
    `track_purchase_bill`     TINYINT(1) NOT NULL DEFAULT 1,
    `track_cash_received`     TINYINT(1) NOT NULL DEFAULT 1,
    `track_cash_payment`      TINYINT(1) NOT NULL DEFAULT 1,
    `is_active`               TINYINT(1) NOT NULL DEFAULT 1,

    `effective_from`          DATETIME NULL DEFAULT NULL,
    `effective_to`            DATETIME NULL DEFAULT NULL,
    `created_by`              BIGINT UNSIGNED NULL DEFAULT NULL,
    `updated_by`              BIGINT UNSIGNED NULL DEFAULT NULL,
    `created_at`              TIMESTAMP NULL DEFAULT NULL,
    `updated_at`              TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_cpts_company_branch_product`
        (`company_id`, `branch_id`, `product_id`),
    KEY `idx_cpts_company_active`
        (`company_id`, `is_active`),
    KEY `idx_cpts_company_received`
        (`company_id`, `track_cash_received`, `is_active`),
    KEY `idx_cpts_company_payment`
        (`company_id`, `track_cash_payment`, `is_active`),
    KEY `idx_cpts_product`
        (`product_id`),
    KEY `idx_cpts_effective_period`
        (`effective_from`, `effective_to`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Opt-in product financial tracking settings scoped by company and branch';

-- ================================================================
-- 2. Connects one legacy Cash Received/Payment row to one Product.
--
-- transaction_type examples: cash_received, cash_payment
-- source_type examples: sales_invoice, purchase_invoice, sales_order,
--                       purchase_order, manual, historical
-- mapping_method examples: manual, automatic_single_tracked_product,
--                          historical_backfill, reconciliation
--
-- transaction_row_id must contain the permanent ID of the individual
-- Received/Payment detail row discovered from the existing application.
-- transaction_id may hold its voucher/master ID when available.
-- ================================================================
CREATE TABLE IF NOT EXISTS `transaction_product_maps` (
    `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id`              INT UNSIGNED NOT NULL,
    `branch_id`               INT UNSIGNED NOT NULL DEFAULT 0,

    `transaction_type`        VARCHAR(40) NOT NULL,
    `transaction_id`          BIGINT UNSIGNED NULL DEFAULT NULL,
    `transaction_row_id`      BIGINT UNSIGNED NOT NULL,
    `product_id`              BIGINT UNSIGNED NOT NULL,

    `source_type`             VARCHAR(40) NULL DEFAULT NULL,
    `source_id`               BIGINT UNSIGNED NULL DEFAULT NULL,
    `mapping_method`          VARCHAR(50) NOT NULL DEFAULT 'manual',

    `created_by`              BIGINT UNSIGNED NULL DEFAULT NULL,
    `updated_by`              BIGINT UNSIGNED NULL DEFAULT NULL,
    `created_at`              TIMESTAMP NULL DEFAULT NULL,
    `updated_at`              TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tpm_company_type_row`
        (`company_id`, `transaction_type`, `transaction_row_id`),
    KEY `idx_tpm_product_activity`
        (`company_id`, `product_id`, `transaction_type`, `created_at`),
    KEY `idx_tpm_branch_product`
        (`company_id`, `branch_id`, `product_id`),
    KEY `idx_tpm_transaction_master`
        (`transaction_type`, `transaction_id`),
    KEY `idx_tpm_source`
        (`source_type`, `source_id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Maps legacy received/payment rows to opted-in products without altering legacy tables';

-- ================================================================
-- 3. Audit/reconciliation queue for historical or ambiguous transactions.
--
-- status examples: pending, auto_mapped, manually_mapped, ambiguous,
--                  source_not_found, ignored
-- ================================================================
CREATE TABLE IF NOT EXISTS `product_tracking_reconciliation_logs` (
    `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id`              INT UNSIGNED NOT NULL,
    `branch_id`               INT UNSIGNED NOT NULL DEFAULT 0,

    `transaction_type`        VARCHAR(40) NOT NULL,
    `transaction_id`          BIGINT UNSIGNED NULL DEFAULT NULL,
    `transaction_row_id`      BIGINT UNSIGNED NOT NULL,
    `source_type`             VARCHAR(40) NULL DEFAULT NULL,
    `source_id`               BIGINT UNSIGNED NULL DEFAULT NULL,

    `suggested_product_id`    BIGINT UNSIGNED NULL DEFAULT NULL,
    `resolved_product_id`     BIGINT UNSIGNED NULL DEFAULT NULL,
    `status`                  VARCHAR(30) NOT NULL DEFAULT 'pending',
    `reason`                  VARCHAR(500) NULL DEFAULT NULL,
    `metadata`                JSON NULL,

    `resolved_by`             BIGINT UNSIGNED NULL DEFAULT NULL,
    `resolved_at`             DATETIME NULL DEFAULT NULL,
    `created_at`              TIMESTAMP NULL DEFAULT NULL,
    `updated_at`              TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ptrl_company_type_row`
        (`company_id`, `transaction_type`, `transaction_row_id`),
    KEY `idx_ptrl_resolution_queue`
        (`company_id`, `status`, `branch_id`),
    KEY `idx_ptrl_suggested_product`
        (`company_id`, `suggested_product_id`, `status`),
    KEY `idx_ptrl_resolved_product`
        (`company_id`, `resolved_product_id`, `status`),
    KEY `idx_ptrl_source`
        (`source_type`, `source_id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit and manual reconciliation queue for historical product mappings';

-- Verification: these should return the three newly created tables.
SHOW TABLES LIKE 'company_product_tracking_settings';
SHOW TABLES LIKE 'transaction_product_maps';
SHOW TABLES LIKE 'product_tracking_reconciliation_logs';
