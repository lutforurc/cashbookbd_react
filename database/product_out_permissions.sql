-- The permissions behind the Product Out screens -- damaged / lost stock
-- written off, the register that reads it back, and the reasons list.
--
--   product.out.create         open Product Out and write stock off
--   product.out.report.view    read the Write-off Register
--   product.out.reason.manage  keep the Out Reasons list
--   product.out.approve        approve a write-off in the list
--
-- The React sidebar (Sidebar/index.tsx) and the route guards in App.tsx gate on
-- these exact names, so a role without them sees no Product Out rows at all --
-- and the Branch Transfer group itself stays shut when nothing else in it is
-- held either. The same four keys are listed in the AddUnitTypeToBuildingUnits
-- patch command's syncPermissions(), which is the authoritative list: that sync
-- deletes every permission it does not name, so a row created here alone would
-- be swept away on the next patch run, taking every role's grant with it.
--
-- Assign them to roles afterwards -- User Management -> Roles -> the role, or
-- the commented grant at the foot of this file.
--
-- Safe to run twice: each INSERT is guarded on the name already being present.

INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'product.out.create', 'web', 'Product Out', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'product.out.create' AND guard_name = 'web');

INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'product.out.report.view', 'web', 'Product Out', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'product.out.report.view' AND guard_name = 'web');

INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'product.out.reason.manage', 'web', 'Product Out', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'product.out.reason.manage' AND guard_name = 'web');

INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'product.out.approve', 'web', 'Product Out', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'product.out.approve' AND guard_name = 'web');


-- Confirm -- expect four rows.
SELECT id, name, group_name, guard_name
FROM permissions
WHERE name LIKE 'product.out.%';


-- ---------------------------------------------------------------------------
-- Giving them to somebody
--
-- A permission nobody holds shows nothing. The ordinary way is the Role screen
-- (User Management -> Roles -> the role -> tick the product.out.* keys under
-- "Product Out"), and that stays visible afterwards to whoever wonders who may
-- write stock off, so it is the way to prefer.
--
-- The patch command grants all four to Super Administrator and Administrator on
-- its own; this is only for a server that would rather do it here. Roles are
-- per company, so on a shared database this reaches every company's role of that
-- name -- check the SELECT first.
--
-- SELECT DISTINCT r.id, r.name
-- FROM roles r
-- WHERE r.name IN ('Super Administrator', 'Administrator');
--
-- INSERT INTO role_has_permissions (permission_id, role_id)
-- SELECT p.id, r.id
-- FROM permissions p
-- JOIN roles r ON r.guard_name = p.guard_name
-- WHERE p.name LIKE 'product.out.%'
--   AND r.name IN ('Super Administrator', 'Administrator');
--
--
-- Who holds them, once granted:
--
-- SELECT p.name, r.id, r.name
-- FROM role_has_permissions rhp
-- JOIN permissions p ON p.id = rhp.permission_id
-- JOIN roles r       ON r.id = rhp.role_id
-- WHERE p.name LIKE 'product.out.%';
-- ---------------------------------------------------------------------------
