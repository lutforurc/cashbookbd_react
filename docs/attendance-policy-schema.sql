-- Attendance policy, daily labour overtime, and shift roster update SQL
-- Target database: MySQL / MariaDB
-- This file is written for an existing attendance module.
-- Set @company_id before running the seed/update section.

SET @company_id = 1;

-- 1. Update existing employee table
-- Purpose: identify whether an employee is monthly, daily labour, or shift-based.
-- Each statement checks INFORMATION_SCHEMA first, so rerunning the file will not fail on existing columns/indexes.

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND COLUMN_NAME = 'employment_type') = 0,
    'ALTER TABLE `hrm_employees` ADD COLUMN `employment_type` ENUM(''monthly'',''daily'',''shifting'') NOT NULL DEFAULT ''monthly'' AFTER `status`',
    'SELECT ''hrm_employees.employment_type already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND COLUMN_NAME = 'attendance_policy_id') = 0,
    'ALTER TABLE `hrm_employees` ADD COLUMN `attendance_policy_id` INT UNSIGNED NULL DEFAULT NULL AFTER `employment_type`',
    'SELECT ''hrm_employees.attendance_policy_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND COLUMN_NAME = 'default_shift_id') = 0,
    'ALTER TABLE `hrm_employees` ADD COLUMN `default_shift_id` INT UNSIGNED NULL DEFAULT NULL AFTER `attendance_policy_id`',
    'SELECT ''hrm_employees.default_shift_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND COLUMN_NAME = 'attendance_shift_id') = 0,
    'ALTER TABLE `hrm_employees` ADD COLUMN `attendance_shift_id` INT UNSIGNED NULL DEFAULT NULL AFTER `default_shift_id`',
    'SELECT ''hrm_employees.attendance_shift_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND COLUMN_NAME = 'overtime_eligible') = 0,
    'ALTER TABLE `hrm_employees` ADD COLUMN `overtime_eligible` TINYINT(1) NOT NULL DEFAULT 0 AFTER `attendance_shift_id`',
    'SELECT ''hrm_employees.overtime_eligible already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND COLUMN_NAME = 'daily_wage') = 0,
    'ALTER TABLE `hrm_employees` ADD COLUMN `daily_wage` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `overtime_eligible`',
    'SELECT ''hrm_employees.daily_wage already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND COLUMN_NAME = 'ot_rate') = 0,
    'ALTER TABLE `hrm_employees` ADD COLUMN `ot_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `daily_wage`',
    'SELECT ''hrm_employees.ot_rate already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND COLUMN_NAME = 'standard_work_minutes') = 0,
    'ALTER TABLE `hrm_employees` ADD COLUMN `standard_work_minutes` SMALLINT UNSIGNED NULL DEFAULT NULL AFTER `ot_rate`',
    'SELECT ''hrm_employees.standard_work_minutes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND INDEX_NAME = 'idx_hrm_employees_employment_type') = 0,
    'ALTER TABLE `hrm_employees` ADD INDEX `idx_hrm_employees_employment_type` (`employment_type`)',
    'SELECT ''idx_hrm_employees_employment_type already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND INDEX_NAME = 'idx_hrm_employees_attendance_policy_id') = 0,
    'ALTER TABLE `hrm_employees` ADD INDEX `idx_hrm_employees_attendance_policy_id` (`attendance_policy_id`)',
    'SELECT ''idx_hrm_employees_attendance_policy_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND INDEX_NAME = 'idx_hrm_employees_default_shift_id') = 0,
    'ALTER TABLE `hrm_employees` ADD INDEX `idx_hrm_employees_default_shift_id` (`default_shift_id`)',
    'SELECT ''idx_hrm_employees_default_shift_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_employees' AND INDEX_NAME = 'idx_hrm_employees_attendance_shift_id') = 0,
    'ALTER TABLE `hrm_employees` ADD INDEX `idx_hrm_employees_attendance_shift_id` (`attendance_shift_id`)',
    'SELECT ''idx_hrm_employees_attendance_shift_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Attendance policy setup
-- Purpose: keep attendance rules separate from employee master.

CREATE TABLE IF NOT EXISTS `hrm_attendance_policies` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED NOT NULL,
    `branch_id` INT UNSIGNED NULL DEFAULT NULL,
    `branch_type_id` INT UNSIGNED NULL DEFAULT NULL,
    `name` VARCHAR(150) NOT NULL,
    `employment_type` ENUM('monthly','daily','shifting') NOT NULL DEFAULT 'monthly',
    `shift_id` INT UNSIGNED NULL DEFAULT NULL,
    `default_shift_id` INT UNSIGNED NULL DEFAULT NULL,
    `standard_work_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 480,
    `minimum_work_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 240,
    `half_day_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 240,
    `grace_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 15,
    `early_out_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    `overtime_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `overtime_after_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 480,
    `late_deduction_after_count` SMALLINT UNSIGNED NOT NULL DEFAULT 3,
    `early_out_deduction_after_count` SMALLINT UNSIGNED NOT NULL DEFAULT 3,
    `status` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT UNSIGNED NULL DEFAULT NULL,
    `updated_by` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_hrm_attendance_policies_company` (`company_id`),
    KEY `idx_hrm_attendance_policies_branch` (`branch_id`),
    KEY `idx_hrm_attendance_policies_type` (`employment_type`),
    KEY `idx_hrm_attendance_policies_default_shift` (`default_shift_id`),
    KEY `idx_hrm_attendance_policies_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If the policy table already existed from an earlier attendance version, add the new columns safely.

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_policies' AND COLUMN_NAME = 'employment_type') = 0,
    'ALTER TABLE `hrm_attendance_policies` ADD COLUMN `employment_type` ENUM(''monthly'',''daily'',''shifting'') NOT NULL DEFAULT ''monthly'' AFTER `name`',
    'SELECT ''hrm_attendance_policies.employment_type already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_policies' AND COLUMN_NAME = 'default_shift_id') = 0,
    'ALTER TABLE `hrm_attendance_policies` ADD COLUMN `default_shift_id` INT UNSIGNED NULL DEFAULT NULL AFTER `shift_id`',
    'SELECT ''hrm_attendance_policies.default_shift_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_policies' AND COLUMN_NAME = 'standard_work_minutes') = 0,
    'ALTER TABLE `hrm_attendance_policies` ADD COLUMN `standard_work_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 480 AFTER `default_shift_id`',
    'SELECT ''hrm_attendance_policies.standard_work_minutes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_policies' AND COLUMN_NAME = 'minimum_work_minutes') = 0,
    'ALTER TABLE `hrm_attendance_policies` ADD COLUMN `minimum_work_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 240 AFTER `standard_work_minutes`',
    'SELECT ''hrm_attendance_policies.minimum_work_minutes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_policies' AND COLUMN_NAME = 'overtime_after_minutes') = 0,
    'ALTER TABLE `hrm_attendance_policies` ADD COLUMN `overtime_after_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 480 AFTER `overtime_enabled`',
    'SELECT ''hrm_attendance_policies.overtime_after_minutes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Security guard / shift-based employee roster
-- Purpose: assign employee-wise shift by date and branch.

CREATE TABLE IF NOT EXISTS `hrm_employee_shift_rosters` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED NOT NULL,
    `employee_id` INT UNSIGNED NOT NULL,
    `branch_id` INT UNSIGNED NULL DEFAULT NULL,
    `shift_id` INT UNSIGNED NOT NULL,
    `duty_date` DATE NOT NULL,
    `status` ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
    `remarks` VARCHAR(255) NULL DEFAULT NULL,
    `created_by` INT UNSIGNED NULL DEFAULT NULL,
    `updated_by` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_hrm_shift_roster_employee_date` (`employee_id`, `duty_date`),
    KEY `idx_hrm_shift_rosters_company_date` (`company_id`, `duty_date`),
    KEY `idx_hrm_shift_rosters_branch_date` (`branch_id`, `duty_date`),
    KEY `idx_hrm_shift_rosters_shift` (`shift_id`),
    KEY `idx_hrm_shift_rosters_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Overtime records
-- Purpose: store calculated/approved overtime separately from raw attendance entry when approval workflow is needed.

CREATE TABLE IF NOT EXISTS `hrm_attendance_overtimes` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` INT UNSIGNED NOT NULL,
    `attendance_entry_id` INT UNSIGNED NULL DEFAULT NULL,
    `employee_id` INT UNSIGNED NOT NULL,
    `branch_id` INT UNSIGNED NULL DEFAULT NULL,
    `attendance_date` DATE NOT NULL,
    `overtime_minutes` INT UNSIGNED NOT NULL DEFAULT 0,
    `ot_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `overtime_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `approval_status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    `approved_by` INT UNSIGNED NULL DEFAULT NULL,
    `approved_at` DATETIME NULL DEFAULT NULL,
    `remarks` TEXT NULL,
    `created_by` INT UNSIGNED NULL DEFAULT NULL,
    `updated_by` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_hrm_attendance_overtimes_company_date` (`company_id`, `attendance_date`),
    KEY `idx_hrm_attendance_overtimes_entry` (`attendance_entry_id`),
    KEY `idx_hrm_attendance_overtimes_employee` (`employee_id`),
    KEY `idx_hrm_attendance_overtimes_branch` (`branch_id`),
    KEY `idx_hrm_attendance_overtimes_approval` (`approval_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Update attendance entry and monthly summary tables for payable overtime.

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_entries' AND COLUMN_NAME = 'overtime_minutes') = 0,
    'ALTER TABLE `hrm_attendance_entries` ADD COLUMN `overtime_minutes` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `work_minutes`',
    'SELECT ''hrm_attendance_entries.overtime_minutes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_entries' AND COLUMN_NAME = 'overtime_amount') = 0,
    'ALTER TABLE `hrm_attendance_entries` ADD COLUMN `overtime_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `overtime_minutes`',
    'SELECT ''hrm_attendance_entries.overtime_amount already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_monthly_summaries' AND COLUMN_NAME = 'overtime_minutes') = 0,
    'ALTER TABLE `hrm_attendance_monthly_summaries` ADD COLUMN `overtime_minutes` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `early_out_deduction_days`',
    'SELECT ''hrm_attendance_monthly_summaries.overtime_minutes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_attendance_monthly_summaries' AND COLUMN_NAME = 'overtime_amount') = 0,
    'ALTER TABLE `hrm_attendance_monthly_summaries` ADD COLUMN `overtime_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `overtime_minutes`',
    'SELECT ''hrm_attendance_monthly_summaries.overtime_amount already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Seed default policies.
-- Change @company_id at the top of the file before running this section.

INSERT INTO `hrm_attendance_policies` (
    `company_id`,
    `name`,
    `employment_type`,
    `standard_work_minutes`,
    `minimum_work_minutes`,
    `half_day_minutes`,
    `grace_minutes`,
    `early_out_minutes`,
    `overtime_enabled`,
    `overtime_after_minutes`,
    `late_deduction_after_count`,
    `early_out_deduction_after_count`,
    `status`,
    `created_at`,
    `updated_at`
)
SELECT
    @company_id,
    'Monthly Staff Policy',
    'monthly',
    480,
    240,
    240,
    15,
    60,
    0,
    480,
    3,
    3,
    1,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM `hrm_attendance_policies` WHERE `company_id` = @company_id AND `employment_type` = 'monthly'
);

INSERT INTO `hrm_attendance_policies` (
    `company_id`,
    `name`,
    `employment_type`,
    `standard_work_minutes`,
    `minimum_work_minutes`,
    `half_day_minutes`,
    `grace_minutes`,
    `early_out_minutes`,
    `overtime_enabled`,
    `overtime_after_minutes`,
    `late_deduction_after_count`,
    `early_out_deduction_after_count`,
    `status`,
    `created_at`,
    `updated_at`
)
SELECT
    @company_id,
    'Daily Labour Policy',
    'daily',
    480,
    240,
    240,
    15,
    60,
    1,
    480,
    3,
    3,
    1,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM `hrm_attendance_policies` WHERE `company_id` = @company_id AND `employment_type` = 'daily'
);

INSERT INTO `hrm_attendance_policies` (
    `company_id`,
    `name`,
    `employment_type`,
    `standard_work_minutes`,
    `minimum_work_minutes`,
    `half_day_minutes`,
    `grace_minutes`,
    `early_out_minutes`,
    `overtime_enabled`,
    `overtime_after_minutes`,
    `late_deduction_after_count`,
    `early_out_deduction_after_count`,
    `status`,
    `created_at`,
    `updated_at`
)
SELECT
    @company_id,
    'Shifting Duty Policy',
    'shifting',
    480,
    240,
    240,
    15,
    60,
    1,
    480,
    3,
    3,
    1,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM `hrm_attendance_policies` WHERE `company_id` = @company_id AND `employment_type` = 'shifting'
);

-- 7. Link existing employees to default policy.

UPDATE `hrm_employees` e
JOIN `hrm_attendance_policies` p
    ON p.`company_id` = @company_id
    AND p.`employment_type` = e.`employment_type`
SET e.`attendance_policy_id` = p.`id`
WHERE e.`attendance_policy_id` IS NULL;
