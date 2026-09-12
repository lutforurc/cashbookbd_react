-- Register SMS settings permissions; assign them to the appropriate roles afterwards.
INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'branch.sms.received.update', 'web', 'SMS Service', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'branch.sms.received.update' AND guard_name = 'web');

INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'branch.sms.payment.update', 'web', 'SMS Service', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'branch.sms.payment.update' AND guard_name = 'web');

INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'branch.sms.sales.update', 'web', 'SMS Service', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'branch.sms.sales.update' AND guard_name = 'web');

INSERT INTO permissions (name, guard_name, group_name, created_at, updated_at)
SELECT 'branch.sms.purchase.update', 'web', 'SMS Service', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'branch.sms.purchase.update' AND guard_name = 'web');

-- Also regroup permissions registered by an earlier version.
UPDATE permissions SET group_name = 'SMS Service', updated_at = NOW()
WHERE guard_name = 'web' AND name IN (
  'branch.sms.received.update', 'branch.sms.payment.update',
  'branch.sms.sales.update', 'branch.sms.purchase.update'
);
