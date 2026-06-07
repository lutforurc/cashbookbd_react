-- Attendance policy, daily labour overtime, and security guard roster schema
-- Target database: MySQL / MariaDB
-- Review table/column names with the current backend before running in production.
-- No stored routine is used in this file.
-- If any column already exists, remove that ALTER line before running.

-- 1. Update existing employee table
-- Purpose: identify whether an employee is monthly, daily labour, or shift-based security guard.

ALTER TABLE `hrm_employees`
    ADD COLUMN `employment_type` ENUM('monthly','daily','shifting') NOT NULL DEFAULT 'monthly' AFTER `status`,
    ADD COLUMN `attendance_policy_id` BIGINT UNSIGNED NULL AFTER `employment_type`,
    ADD COLUMN `default_shift_id` BIGINT UNSIGNED NULL AFTER `attendance_policy_id`,
    ADD COLUMN `overtime_eligible` TINYINT(1) NOT NULL DEFAULT 0 AFTER `default_shift_id`,
    ADD COLUMN `daily_wage` DECIMAL(12,2) NULL AFTER `overtime_eligible`,
    ADD COLUMN `ot_rate` DECIMAL(12,2) NULL AFTER `daily_wage`,
    ADD COLUMN `standard_work_minutes` INT UNSIGNED NULL AFTER `ot_rate`;

-- 2. Attendance policy setup
-- Purpose: keep attendance rules separate from employee master.

CREATE TABLE IF NOT EXISTS `attendance_policies` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `employment_type` ENUM('monthly','daily','shifting') NOT NULL DEFAULT 'monthly',
    `default_shift_id` BIGINT UNSIGNED NULL,
    `standard_work_minutes` INT UNSIGNED NOT NULL DEFAULT 480,
    `minimum_work_minutes` INT UNSIGNED NOT NULL DEFAULT 240,
    `half_day_minutes` INT UNSIGNED NOT NULL DEFAULT 240,
    `grace_minutes` INT UNSIGNED NOT NULL DEFAULT 15,
    `early_out_minutes` INT UNSIGNED NOT NULL DEFAULT 60,
    `overtime_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `overtime_after_minutes` INT UNSIGNED NULL,
    `late_deduction_after_count` INT UNSIGNED NOT NULL DEFAULT 3,
    `early_out_deduction_after_count` INT UNSIGNED NOT NULL DEFAULT 3,
    `status` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `attendance_policies_employment_type_index` (`employment_type`),
    KEY `attendance_policies_default_shift_id_index` (`default_shift_id`),
    KEY `attendance_policies_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional foreign keys. Enable after confirming referenced table names and column types.
-- ALTER TABLE `attendance_policies`
--   ADD CONSTRAINT `attendance_policies_default_shift_id_foreign`
--   FOREIGN KEY (`default_shift_id`) REFERENCES `attendance_shifts` (`id`) ON DELETE SET NULL;
--
-- ALTER TABLE `hrm_employees`
--   ADD CONSTRAINT `hrm_employees_attendance_policy_id_foreign`
--   FOREIGN KEY (`attendance_policy_id`) REFERENCES `attendance_policies` (`id`) ON DELETE SET NULL;
--
-- ALTER TABLE `hrm_employees`
--   ADD CONSTRAINT `hrm_employees_default_shift_id_foreign`
--   FOREIGN KEY (`default_shift_id`) REFERENCES `attendance_shifts` (`id`) ON DELETE SET NULL;

-- 3. Security guard / shift based employee roster
-- Purpose: assign employee-wise shift by date and branch.

CREATE TABLE IF NOT EXISTS `hrm_employee_shift_rosters` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `branch_id` BIGINT UNSIGNED NULL,
    `shift_id` BIGINT UNSIGNED NOT NULL,
    `duty_date` DATE NOT NULL,
    `status` ENUM('assigned','completed','cancelled') NOT NULL DEFAULT 'assigned',
    `remarks` TEXT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `employee_shift_rosters_unique` (`employee_id`, `duty_date`, `shift_id`),
    KEY `employee_shift_rosters_employee_id_index` (`employee_id`),
    KEY `employee_shift_rosters_branch_id_index` (`branch_id`),
    KEY `employee_shift_rosters_shift_id_index` (`shift_id`),
    KEY `employee_shift_rosters_duty_date_index` (`duty_date`),
    KEY `employee_shift_rosters_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional foreign keys. Enable after confirming referenced table names and column types.
-- ALTER TABLE `hrm_employee_shift_rosters`
--   ADD CONSTRAINT `employee_shift_rosters_employee_id_foreign`
--   FOREIGN KEY (`employee_id`) REFERENCES `hrm_employees` (`id`) ON DELETE CASCADE;
--
-- ALTER TABLE `hrm_employee_shift_rosters`
--   ADD CONSTRAINT `employee_shift_rosters_shift_id_foreign`
--   FOREIGN KEY (`shift_id`) REFERENCES `attendance_shifts` (`id`) ON DELETE RESTRICT;
--
-- ALTER TABLE `hrm_employee_shift_rosters`
--   ADD CONSTRAINT `employee_shift_rosters_branch_id_foreign`
--   FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL;

-- 4. Overtime records
-- Purpose: store calculated/approved overtime separately from raw attendance entry.

CREATE TABLE IF NOT EXISTS `attendance_overtimes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `attendance_entry_id` BIGINT UNSIGNED NULL,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `branch_id` BIGINT UNSIGNED NULL,
    `attendance_date` DATE NOT NULL,
    `overtime_minutes` INT UNSIGNED NOT NULL DEFAULT 0,
    `ot_rate` DECIMAL(12,2) NULL,
    `overtime_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `approval_status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    `approved_by` BIGINT UNSIGNED NULL,
    `approved_at` TIMESTAMP NULL DEFAULT NULL,
    `remarks` TEXT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `attendance_overtimes_attendance_entry_id_index` (`attendance_entry_id`),
    KEY `attendance_overtimes_employee_id_index` (`employee_id`),
    KEY `attendance_overtimes_branch_id_index` (`branch_id`),
    KEY `attendance_overtimes_attendance_date_index` (`attendance_date`),
    KEY `attendance_overtimes_approval_status_index` (`approval_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional foreign keys. Enable after confirming referenced table names and column types.
-- ALTER TABLE `attendance_overtimes`
--   ADD CONSTRAINT `attendance_overtimes_employee_id_foreign`
--   FOREIGN KEY (`employee_id`) REFERENCES `hrm_employees` (`id`) ON DELETE CASCADE;
--
-- ALTER TABLE `attendance_overtimes`
--   ADD CONSTRAINT `attendance_overtimes_attendance_entry_id_foreign`
--   FOREIGN KEY (`attendance_entry_id`) REFERENCES `attendance_entries` (`id`) ON DELETE SET NULL;
--
-- ALTER TABLE `attendance_overtimes`
--   ADD CONSTRAINT `attendance_overtimes_branch_id_foreign`
--   FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL;

-- 5. Seed default attendance policies

INSERT INTO `attendance_policies` (
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
    'Monthly Staff Policy',
    'monthly',
    480,
    240,
    240,
    15,
    60,
    0,
    NULL,
    3,
    3,
    1,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM `attendance_policies` WHERE `employment_type` = 'monthly'
);

INSERT INTO `attendance_policies` (
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
    SELECT 1 FROM `attendance_policies` WHERE `employment_type` = 'daily'
);

INSERT INTO `attendance_policies` (
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
    SELECT 1 FROM `attendance_policies` WHERE `employment_type` = 'shifting'
);

-- 6. Set policy id for existing employees by current employment_type.

UPDATE `hrm_employees` e
JOIN `attendance_policies` p ON p.`employment_type` = e.`employment_type`
SET e.`attendance_policy_id` = p.`id`
WHERE e.`attendance_policy_id` IS NULL;
