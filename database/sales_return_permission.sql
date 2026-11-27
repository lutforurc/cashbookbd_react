-- Invoice -> Sales Return (and its route guard, global search entry and Edit
-- link) opens on the permission named exactly `sales.return`:
--   src/components/Sidebar/index.tsx, src/App.tsx, Header/globalSearchItems.ts
--
-- This install carries the newer granular toggles instead -- sales.return.view,
-- .create, .edit, .delete -- and has no bare `sales.return` row. A role with all
-- four switched on therefore still gets no menu item.
--
-- This patch registers `sales.return` and grants it to every role that can
-- already work with sales returns. It creates nothing else and changes no
-- existing grant. Safe to run more than once.
--
-- Run it on the server's database for this tenant, e.g.:
--   mysql -u <user> -p <database> < sales_return_permission.sql

-- 1) Register the permission (a no-op where it already exists).
INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'sales.return', 'web', 'Sales Return', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions
  WHERE name = 'sales.return' AND guard_name = 'web'
);

-- 2) Grant it to every role that already holds any sales-return grant.
INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
SELECT DISTINCT p.id, rhp.role_id
FROM permissions p
JOIN permissions src
  ON src.name IN (
       'sales.return.view',
       'sales.return.create',
       'sales.return.edit',
       'sales.return.delete'
     )
 AND src.guard_name = 'web'
JOIN role_has_permissions rhp ON rhp.permission_id = src.id
WHERE p.name = 'sales.return' AND p.guard_name = 'web'
  AND NOT EXISTS (
    SELECT 1 FROM role_has_permissions x
    WHERE x.permission_id = p.id AND x.role_id = rhp.role_id
  );

-- 3) Confirm -- expect the bare row and its role count.
SELECT p.id, p.name, p.group_name, p.guard_name, COUNT(rhp.role_id) AS role_count
FROM permissions p
LEFT JOIN role_has_permissions rhp ON rhp.permission_id = p.id
WHERE p.name IN ('sales.return', 'sales.return.view')
GROUP BY p.id, p.name, p.group_name, p.guard_name;


-- ---------------------------------------------------------------------------
-- Optional: the same mismatch exists for Reports -> Sales Return Ledger, which
-- the sidebar gates on `sales.return.ledger` (App.tsx and globalSearchItems too).
-- If this install has no such row, the block below registers it and gives it to
-- every role that can already read the Sales Ledger -- i.e. the people who could
-- see that report before the key was split out. Delete this block if the row
-- already exists and is assigned.
-- ---------------------------------------------------------------------------

INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'sales.return.ledger', 'web', 'Sales Return', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM permissions
  WHERE name = 'sales.return.ledger' AND guard_name = 'web'
);

INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
SELECT DISTINCT p.id, rhp.role_id
FROM permissions p
JOIN permissions src
  ON src.name = 'sales.ledger'
 AND src.guard_name = 'web'
JOIN role_has_permissions rhp ON rhp.permission_id = src.id
WHERE p.name = 'sales.return.ledger' AND p.guard_name = 'web'
  AND NOT EXISTS (
    SELECT 1 FROM role_has_permissions x
    WHERE x.permission_id = p.id AND x.role_id = rhp.role_id
  );

SELECT p.id, p.name, p.group_name, p.guard_name, COUNT(rhp.role_id) AS role_count
FROM permissions p
LEFT JOIN role_has_permissions rhp ON rhp.permission_id = p.id
WHERE p.name IN ('sales.return.ledger', 'sales.ledger')
GROUP BY p.id, p.name, p.group_name, p.guard_name;
