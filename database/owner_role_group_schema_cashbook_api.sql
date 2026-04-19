-- Owner Role Group
-- Additive schema for globally managed Owner permissions without breaking
-- the current role/permission system.
--
-- Assumptions:
-- 1. Existing tables:
--    roles(id, name, ...)
--    permissions(id, name, group_name, ...)
--    role_has_permissions(role_id, permission_id, created_at, updated_at)
-- 2. Company registration already creates an `Owner` role in the `roles` table.
-- 3. No database triggers are used. After creating a new Owner role,
--    call OwnerRoleGroupService::registerOwnerRole($roleId) from backend code.
--
-- If your pivot table name differs, replace `role_has_permissions` below.

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS role_group_code VARCHAR(100) NULL AFTER name,
  ADD COLUMN IF NOT EXISTS role_group_sync_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER role_group_code;

CREATE INDEX idx_roles_role_group_code ON roles (role_group_code);
CREATE INDEX idx_roles_role_group_sync_enabled ON roles (role_group_sync_enabled);

UPDATE roles
SET role_group_code = 'owner',
    role_group_sync_enabled = 1
WHERE LOWER(name) = 'owner';

CREATE TABLE IF NOT EXISTS owner_role_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owner_role_group_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_owner_role_group_permission (group_id, permission_id),
  CONSTRAINT fk_owner_role_group_permissions_group
    FOREIGN KEY (group_id) REFERENCES owner_role_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_owner_role_group_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS owner_role_group_audits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id BIGINT UNSIGNED NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NULL,
  permission_ids JSON NULL,
  action VARCHAR(50) NOT NULL DEFAULT 'update',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_owner_role_group_audits_group
    FOREIGN KEY (group_id) REFERENCES owner_role_groups(id) ON DELETE CASCADE
);

INSERT INTO owner_role_groups (code, name, description)
SELECT 'owner', 'Owner Role Group', 'Global permission template applied to every company owner role.'
WHERE NOT EXISTS (
  SELECT 1 FROM owner_role_groups WHERE code = 'owner'
);

-- Initial seed:
-- copy the first existing managed Owner role permissions into the owner group once.
INSERT IGNORE INTO owner_role_group_permissions (group_id, permission_id)
SELECT og.id, rhp.permission_id
FROM owner_role_groups og
JOIN roles r ON r.role_group_code = 'owner' AND r.role_group_sync_enabled = 1
JOIN role_has_permissions rhp ON rhp.role_id = r.id
WHERE og.code = 'owner'
LIMIT 1000000;

-- Optional one-time backfill for existing Owner roles:
INSERT IGNORE INTO role_has_permissions (permission_id, role_id, created_at, updated_at)
SELECT orgp.permission_id, r.id, NOW(), NOW()
FROM roles r
JOIN owner_role_groups og ON og.code = 'owner'
JOIN owner_role_group_permissions orgp ON orgp.group_id = og.id
WHERE r.role_group_code = 'owner'
  AND r.role_group_sync_enabled = 1;
