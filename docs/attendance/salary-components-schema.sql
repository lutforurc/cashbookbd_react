-- ============================================================================
-- Flexible Salary Components / Payroll schema  (revision 2)
-- Target: per-tenant database (company_id still follows existing convention)
-- Companion design: docs/attendance/salary-management-flexible-components.md
--
-- Layer 1: hrm_salary_components          -> pay-head master (tenant defines)
-- Layer 2: hrm_salary_structures          -> reusable templates
--          hrm_salary_structure_components
-- Layer 3: hrm_employee_salary_revisions  -> employee entitlement, effective dated
--          hrm_employee_salary_revision_components
-- Layer 4: EXISTING hrm_salary_payments   -> one row per employee per sheet (unchanged)
--          hrm_salary_payment_components  -> NEW: frozen per-pay-head lines under it
--          hrm_payroll_runs               -> NEW (small): sheet-level status draft/approved/paid
-- Settings: hrm_payroll_settings          -> deduction divisor and rounding policy
--
-- Revision 2 changes:
--   * No parallel hrm_payroll_items table. The existing hrm_salary_payments row
--     (with its main_trx_id voucher, payment_main_trx_id, history, attendance
--     columns and hrm_salary_payment_histories) stays the single source of truth.
--   * include_in_deduction_base: which pay heads the late/early-out deduction is
--     priced against.
--   * overtime is a system earning component.
--   * expense_ledger_id: which account head each pay head posts to.
--   * is_taxable defaults to 0.
--
-- HOW TO APPLY: this file is the reference DDL. On tenants, apply it through
-- the AddUnitTypeToBuildingUnits patch command, guarding every CREATE with
-- Schema::hasTable() and every ALTER with Schema::hasColumn(), like the other
-- hrm_salary_payments patches there. Only the ALTERs in section 4 touch an
-- existing table: they add a nullable payroll_run_id and a generated period_ym.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- 0. Payroll settings (one row per company)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hrm_payroll_settings` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED NOT NULL,
    `deduction_day_divisor` ENUM('fixed','month_days') NOT NULL DEFAULT 'fixed'
        COMMENT 'Per-day salary for late/early-out deduction: fixed divisor or actual month days',
    `deduction_fixed_divisor` TINYINT UNSIGNED NOT NULL DEFAULT 30
        COMMENT 'Used when deduction_day_divisor = fixed (current engine uses 30)',
    `deduction_rounding` ENUM('none','nearest_1','nearest_10','up_10') NOT NULL DEFAULT 'nearest_10',
    `full_month_skip_rounding` TINYINT(1) NOT NULL DEFAULT 1
        COMMENT '1 = when payable days >= month days, pay the full amount without rounding (current engine)',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_payroll_settings_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 1. Pay-head master
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hrm_salary_components` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `short_name` VARCHAR(40) NULL DEFAULT NULL COMMENT 'Salary sheet column label',
    `code` VARCHAR(60) NOT NULL COMMENT 'Stable machine key, e.g. mobile_bill',
    `component_type` ENUM('earning','deduction','employer_contribution') NOT NULL DEFAULT 'earning',
    `category` ENUM('basic','allowance','bonus','benefit','overtime','statutory','loan','other') NOT NULL DEFAULT 'allowance',
    `calculation_type` ENUM('fixed','percent','per_day','formula','system') NOT NULL DEFAULT 'fixed',
    `percent_base` ENUM('basic','gross') NULL DEFAULT NULL COMMENT 'Only for calculation_type = percent',
    `day_basis` ENUM('payable_days','present_days','month_days') NOT NULL DEFAULT 'payable_days' COMMENT 'Only for per_day',
    `default_amount` DECIMAL(12,2) NULL DEFAULT NULL,
    `default_percent` DECIMAL(6,2) NULL DEFAULT NULL,
    `formula` VARCHAR(500) NULL DEFAULT NULL COMMENT 'Only for calculation_type = formula; never eval() raw input',
    `prorate` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = fixed amount prorated by payable days',
    `rounding` ENUM('none','nearest_1','nearest_10','up_10') NOT NULL DEFAULT 'none',
    `include_in_gross` TINYINT(1) NOT NULL DEFAULT 1,
    `include_in_deduction_base` TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '1 = counted in the per-day salary that late/early-out deduction is priced against',
    `salary_sheet_types` SET('monthly','overtime') NOT NULL DEFAULT 'monthly'
        COMMENT 'Which sheet types this pay head appears on',
    `is_taxable` TINYINT(1) NOT NULL DEFAULT 0,
    `include_in_pf` TINYINT(1) NOT NULL DEFAULT 0,
    `expense_ledger_id` INT UNSIGNED NULL DEFAULT NULL
        COMMENT 'Account head this line posts to in the salary voucher (main_trx). NULL = default salary expense head',
    `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = code/type locked, cannot be deleted',
    `status` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT UNSIGNED NULL DEFAULT NULL,
    `updated_by` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_salary_components_company_code` (`company_id`, `code`),
    KEY `idx_salary_components_company_status` (`company_id`, `status`),
    KEY `idx_salary_components_type` (`component_type`),
    KEY `idx_salary_components_category` (`category`),
    KEY `idx_salary_components_ledger` (`expense_ledger_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Salary structures (reusable templates)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hrm_salary_structures` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(60) NOT NULL,
    `description` VARCHAR(255) NULL DEFAULT NULL,
    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `status` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT UNSIGNED NULL DEFAULT NULL,
    `updated_by` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_salary_structures_company_code` (`company_id`, `code`),
    KEY `idx_salary_structures_company_status` (`company_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hrm_salary_structure_components` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `structure_id` INT UNSIGNED NOT NULL,
    `component_id` INT UNSIGNED NOT NULL,
    `calculation_type` ENUM('fixed','percent','per_day','formula','system') NULL DEFAULT NULL COMMENT 'NULL = inherit master',
    `percent_base` ENUM('basic','gross') NULL DEFAULT NULL,
    `amount` DECIMAL(12,2) NULL DEFAULT NULL,
    `percent` DECIMAL(6,2) NULL DEFAULT NULL,
    `formula` VARCHAR(500) NULL DEFAULT NULL,
    `day_basis` ENUM('payable_days','present_days','month_days') NULL DEFAULT NULL,
    `prorate` TINYINT(1) NULL DEFAULT NULL,
    `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `is_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = every employee on this structure must have it',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_structure_component` (`structure_id`, `component_id`),
    KEY `idx_structure_components_component` (`component_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Employee salary revisions (effective dated, never overwritten)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hrm_employee_salary_revisions` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED NOT NULL,
    `employee_id` INT UNSIGNED NOT NULL,
    `structure_id` INT UNSIGNED NULL DEFAULT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL DEFAULT NULL COMMENT 'NULL = open ended',
    `gross_salary` DECIMAL(12,2) NOT NULL DEFAULT 0,
    `status` ENUM('draft','active','closed') NOT NULL DEFAULT 'active',
    `note` VARCHAR(255) NULL DEFAULT NULL,
    `created_by` INT UNSIGNED NULL DEFAULT NULL,
    `updated_by` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_salary_revisions_employee_date` (`employee_id`, `effective_from`, `effective_to`),
    KEY `idx_salary_revisions_company_date` (`company_id`, `effective_from`),
    KEY `idx_salary_revisions_structure` (`structure_id`),
    KEY `idx_salary_revisions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hrm_employee_salary_revision_components` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `revision_id` INT UNSIGNED NOT NULL,
    `component_id` INT UNSIGNED NOT NULL,
    `calculation_type` ENUM('fixed','percent','per_day','formula','system') NOT NULL DEFAULT 'fixed',
    `percent_base` ENUM('basic','gross') NULL DEFAULT NULL,
    `amount` DECIMAL(12,2) NULL DEFAULT NULL,
    `percent` DECIMAL(6,2) NULL DEFAULT NULL,
    `formula` VARCHAR(500) NULL DEFAULT NULL,
    `day_basis` ENUM('payable_days','present_days','month_days') NULL DEFAULT NULL,
    `prorate` TINYINT(1) NOT NULL DEFAULT 0,
    `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_revision_component` (`revision_id`, `component_id`),
    KEY `idx_revision_components_component` (`component_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Payroll snapshot — built on the EXISTING hrm_salary_payments
-- ----------------------------------------------------------------------------

-- 4.1 Sheet-level header: status and totals only. Employee rows stay in
--     hrm_salary_payments; this table never duplicates them.
CREATE TABLE IF NOT EXISTS `hrm_payroll_runs` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED NOT NULL,
    `branch_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = consolidated run',
    `salary_sheet_type` ENUM('monthly','overtime') NOT NULL DEFAULT 'monthly',
    `payment_month` VARCHAR(6) NOT NULL COMMENT 'mmyyyy, same as hrm_salary_payments.payment_month',
    `period_ym` CHAR(6) AS (CONCAT(RIGHT(`payment_month`, 4), LEFT(`payment_month`, 2))) STORED
        COMMENT 'yyyymm, derived; use this for ORDER BY and month-range filters',
    `month_days` TINYINT UNSIGNED NOT NULL DEFAULT 30,
    `status` ENUM('draft','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
    `employee_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `gross_total` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `deduction_total` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `net_total` DECIMAL(14,2) NOT NULL DEFAULT 0,
    `generated_by` INT UNSIGNED NULL DEFAULT NULL,
    `generated_at` TIMESTAMP NULL DEFAULT NULL,
    `approved_by` INT UNSIGNED NULL DEFAULT NULL,
    `approved_at` TIMESTAMP NULL DEFAULT NULL,
    `note` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_payroll_period` (`company_id`, `branch_id`, `payment_month`, `salary_sheet_type`),
    KEY `idx_payroll_runs_status` (`status`),
    KEY `idx_payroll_runs_period_ym` (`company_id`, `period_ym`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.2 Link existing employee rows to their run (nullable: legacy sheets have none).
--     Patch command: guard with Schema::hasColumn('hrm_salary_payments', 'payroll_run_id').
ALTER TABLE `hrm_salary_payments`
    ADD COLUMN `payroll_run_id` INT UNSIGNED NULL DEFAULT NULL,
    ADD INDEX `idx_hrm_salary_payments_payroll_run_id` (`payroll_run_id`);

-- 4.2b Sortable month on the existing table.
--      payment_month is mmyyyy, so string ORDER BY / BETWEEN is wrong across years
--      ('012027' < '122026'). A STORED generated column gives yyyymm without
--      changing payment_month or any code that writes it: MySQL fills it on
--      every INSERT/UPDATE and back-fills existing rows during the ALTER.
--      Patch command: guard with Schema::hasColumn('hrm_salary_payments', 'period_ym').
--      Rows whose payment_month is not exactly 6 digits get a wrong period_ym;
--      check first:  SELECT id, payment_month FROM hrm_salary_payments
--                    WHERE payment_month NOT REGEXP '^(0[1-9]|1[0-2])[0-9]{4}$';
ALTER TABLE `hrm_salary_payments`
    ADD COLUMN `period_ym` CHAR(6)
        AS (CONCAT(RIGHT(`payment_month`, 4), LEFT(`payment_month`, 2))) STORED
        COMMENT 'yyyymm derived from payment_month; use for ordering and ranges',
    ADD INDEX `idx_hrm_salary_payments_period_ym` (`period_ym`);

-- 4.3 Frozen per-pay-head lines under each hrm_salary_payments row.
--     Legacy columns on hrm_salary_payments (basic_salary, others_allowance,
--     overtime_amount, loan_deduction, attendance_deduction_amount, gross_salary,
--     net_salary) keep being written during transition (dual-write), so old
--     screens and reports keep working.
CREATE TABLE IF NOT EXISTS `hrm_salary_payment_components` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `salary_payment_id` INT(10) UNSIGNED NOT NULL,
    `component_id` INT UNSIGNED NULL DEFAULT NULL COMMENT 'NULL only for a one-off adjustment',
    `component_code` VARCHAR(60) NOT NULL,
    `component_name` VARCHAR(120) NOT NULL COMMENT 'Frozen name: a later rename must not rewrite history',
    `component_type` ENUM('earning','deduction','employer_contribution') NOT NULL,
    `category` ENUM('basic','allowance','bonus','benefit','overtime','statutory','loan','other') NOT NULL DEFAULT 'allowance',
    `calculation_type` ENUM('fixed','percent','per_day','formula','system') NOT NULL DEFAULT 'fixed',
    `monthly_amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Entitlement before proration (revision amount)',
    `base_amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Basic/gross base for percent lines',
    `rate` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Per-day, per-hour or per-unit rate',
    `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Days, OT hours or units',
    `amount` DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Final frozen line amount',
    `expense_ledger_id` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Frozen copy of the ledger the line was posted to',
    `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `note` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_salary_payment_component` (`salary_payment_id`, `component_code`),
    KEY `idx_spc_code` (`component_code`),
    KEY `idx_spc_component` (`component_id`),
    KEY `idx_spc_type` (`component_type`),
    CONSTRAINT `fk_hrm_salary_payment_components_payment`
        FOREIGN KEY (`salary_payment_id`) REFERENCES `hrm_salary_payments` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Seed data
--
-- IMPORTANT: change @company_id to the tenant's com_companies.id.
-- The default structure intentionally contains only:
--   basic          <- hrm_employees.basic_salary
--   mobile_bill    <- hrm_employees.others_allowance (the sheet labels it Mobile Bill)
-- House Rent and Medical Allowance are seeded as available pay heads but are NOT
-- added to the default structure, because the current payroll engine does not pay
-- them. Adding them blindly would increase every employee's salary.
--
-- include_in_deduction_base = 1 only on basic and mobile_bill, matching today's
-- late/early-out formula: (prorated basic + prorated mobile) / 30 x days.
-- ============================================================================
SET @company_id = 1;

INSERT IGNORE INTO `hrm_payroll_settings`
(`company_id`, `deduction_day_divisor`, `deduction_fixed_divisor`, `deduction_rounding`, `full_month_skip_rounding`)
VALUES (@company_id, 'fixed', 30, 'nearest_10', 1);

INSERT IGNORE INTO `hrm_salary_components`
(`company_id`, `name`, `short_name`, `code`, `component_type`, `category`, `calculation_type`,
 `percent_base`, `day_basis`, `default_amount`, `default_percent`, `prorate`, `rounding`,
 `include_in_gross`, `include_in_deduction_base`, `salary_sheet_types`,
 `is_taxable`, `include_in_pf`, `sort_order`, `is_system`, `status`)
VALUES
(@company_id, 'Basic',                'Basic',      'basic',                'earning',   'basic',     'fixed',   NULL, 'payable_days', NULL, NULL, 1, 'up_10',      1, 1, 'monthly,overtime', 0, 0, 10,  1, 1),
(@company_id, 'House Rent',           'House',      'house_rent',           'earning',   'allowance', 'fixed',   NULL, 'payable_days', NULL, NULL, 1, 'up_10',      1, 1, 'monthly',  0, 0, 20,  0, 1),
(@company_id, 'Medical Allowance',    'Medical',    'medical_allowance',    'earning',   'allowance', 'fixed',   NULL, 'payable_days', NULL, NULL, 0, 'none',       1, 0, 'monthly',  0, 0, 30,  0, 1),
(@company_id, 'Mobile Bill',          'Mobile',     'mobile_bill',          'earning',   'allowance', 'fixed',   NULL, 'payable_days', NULL, NULL, 1, 'up_10',      1, 1, 'monthly',  0, 0, 40,  0, 1),
(@company_id, 'Lunch Bill',           'Lunch',      'lunch_bill',           'earning',   'allowance', 'per_day', NULL, 'present_days', NULL, NULL, 0, 'nearest_1',  1, 0, 'monthly',  0, 0, 50,  0, 1),
(@company_id, 'Attendance Bonus',     'Att. Bonus', 'attendance_bonus',     'earning',   'bonus',     'per_day', NULL, 'present_days', NULL, NULL, 0, 'nearest_1',  1, 0, 'monthly',  0, 0, 60,  0, 1),
(@company_id, 'Mid Day Meal',         'Mid Meal',   'mid_day_meal',         'earning',   'benefit',   'per_day', NULL, 'present_days', NULL, NULL, 0, 'nearest_1',  1, 0, 'monthly',  0, 0, 70,  0, 1),
(@company_id, 'Conveyance',           'Conveyance', 'conveyance',           'earning',   'allowance', 'fixed',   NULL, 'payable_days', NULL, NULL, 1, 'none',       1, 0, 'monthly',  0, 0, 80,  0, 1),
(@company_id, 'Overtime',             'OT',         'overtime',             'earning',   'overtime',  'system',  NULL, 'payable_days', NULL, NULL, 0, 'none',       1, 0, 'overtime', 0, 0, 90,  1, 1),
(@company_id, 'Loan Deduction',       'Loan',       'loan_deduction',       'deduction', 'loan',      'system',  NULL, 'payable_days', NULL, NULL, 0, 'nearest_1',  0, 0, 'monthly',  0, 0, 910, 1, 1),
(@company_id, 'Attendance Deduction', 'Att. Ded',   'attendance_deduction', 'deduction', 'statutory', 'system',  NULL, 'payable_days', NULL, NULL, 0, 'nearest_10', 0, 0, 'monthly',  0, 0, 920, 1, 1),
(@company_id, 'Other Deduction',      'Other Ded',  'other_deduction',      'deduction', 'other',     'fixed',   NULL, 'payable_days', NULL, NULL, 0, 'nearest_1',  0, 0, 'monthly',  0, 0, 930, 0, 1);

INSERT INTO `hrm_salary_structures` (`company_id`, `name`, `code`, `description`, `is_default`, `status`)
SELECT @company_id, 'Default Salary Structure', 'default',
       'Migration baseline: Basic + Mobile Bill, matching the old payroll engine', 1, 1
WHERE NOT EXISTS (
    SELECT 1 FROM `hrm_salary_structures`
    WHERE `company_id` = @company_id AND `code` = 'default'
);

INSERT INTO `hrm_salary_structure_components` (`structure_id`, `component_id`, `sort_order`)
SELECT s.`id`, c.`id`, c.`sort_order`
FROM `hrm_salary_structures` s
JOIN `hrm_salary_components` c
  ON c.`company_id` = s.`company_id` AND c.`code` IN ('basic', 'mobile_bill')
WHERE s.`company_id` = @company_id AND s.`code` = 'default'
  AND NOT EXISTS (
      SELECT 1 FROM `hrm_salary_structure_components` x
      WHERE x.`structure_id` = s.`id` AND x.`component_id` = c.`id`
  );

-- ============================================================================
-- Legacy backfill (dry-run first; wrap in a transaction on production)
--
-- Fixed effective date means every legacy employee resolves to this revision
-- for any payroll date. Do not use joning_dt here: it is stored as a display
-- string in some tenants (DD/MM/YYYY), not a DATE.
--
-- Existing hrm_salary_payments rows are NOT backfilled into
-- hrm_salary_payment_components. Old sheets keep reading their legacy columns;
-- only sheets generated by the new engine get component lines.
-- ============================================================================
INSERT INTO `hrm_employee_salary_revisions`
(`company_id`, `employee_id`, `structure_id`, `effective_from`, `gross_salary`, `status`, `note`)
SELECT e.`company_id`, e.`id`, s.`id`, '2000-01-01', 0, 'active', 'Backfilled from legacy salary columns'
FROM `hrm_employees` e
JOIN `hrm_salary_structures` s
  ON s.`company_id` = e.`company_id` AND s.`code` = 'default'
WHERE NOT EXISTS (
    SELECT 1 FROM `hrm_employee_salary_revisions` r WHERE r.`employee_id` = e.`id`
);

INSERT INTO `hrm_employee_salary_revision_components`
(`revision_id`, `component_id`, `calculation_type`, `amount`, `prorate`, `sort_order`)
SELECT r.`id`, c.`id`, 'fixed',
       CASE c.`code`
           WHEN 'basic' THEN COALESCE(e.`basic_salary`, 0)
           WHEN 'mobile_bill' THEN COALESCE(e.`others_allowance`, 0)
           ELSE 0
       END,
       c.`prorate`, c.`sort_order`
FROM `hrm_employee_salary_revisions` r
JOIN `hrm_employees` e ON e.`id` = r.`employee_id`
JOIN `hrm_salary_components` c
  ON c.`company_id` = r.`company_id` AND c.`code` IN ('basic', 'mobile_bill')
WHERE r.`effective_from` = '2000-01-01'
  AND NOT EXISTS (
      SELECT 1 FROM `hrm_employee_salary_revision_components` rc
      WHERE rc.`revision_id` = r.`id` AND rc.`component_id` = c.`id`
  );

UPDATE `hrm_employee_salary_revisions` r
SET `gross_salary` = (
    SELECT COALESCE(SUM(rc.`amount`), 0)
    FROM `hrm_employee_salary_revision_components` rc
    JOIN `hrm_salary_components` c ON c.`id` = rc.`component_id`
    WHERE rc.`revision_id` = r.`id` AND c.`component_type` = 'earning'
)
WHERE r.`effective_from` = '2000-01-01';
