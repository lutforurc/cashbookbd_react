-- Cashbook API aligned subscription schema notes
-- Existing company table: com_companies
-- Existing branch table: com_branches
-- saas_tenant_subscriptions.company_id should store com_companies.id

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS saas_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  billing_interval ENUM('monthly', 'quarterly', 'yearly') NOT NULL DEFAULT 'monthly',
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  trial_days INT UNSIGNED NOT NULL DEFAULT 0,
  max_employees INT UNSIGNED DEFAULT NULL,
  max_customers INT UNSIGNED DEFAULT NULL,
  max_users INT UNSIGNED DEFAULT NULL,
  max_branches INT UNSIGNED DEFAULT NULL,
  max_transactions_per_month INT UNSIGNED DEFAULT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_saas_plans_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saas_plan_features (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id BIGINT UNSIGNED NOT NULL,
  feature_key VARCHAR(120) NOT NULL,
  feature_name VARCHAR(150) NOT NULL,
  feature_value VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_saas_plan_feature (plan_id, feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saas_tenant_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT(10) UNSIGNED NOT NULL COMMENT 'References com_companies.id',
  plan_id BIGINT UNSIGNED NOT NULL,
  subscription_code VARCHAR(80) NOT NULL,
  status ENUM('trialing', 'active', 'pending_payment', 'expired', 'suspended', 'cancelled') NOT NULL DEFAULT 'pending_payment',
  access_status ENUM('full', 'limited', 'billing_only', 'blocked') NOT NULL DEFAULT 'billing_only',
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  trial_start_at DATETIME DEFAULT NULL,
  trial_end_at DATETIME DEFAULT NULL,
  grace_period_end_at DATETIME DEFAULT NULL,
  next_billing_date DATE DEFAULT NULL,
  renewal_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_payment_id BIGINT UNSIGNED DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by INT(11) DEFAULT NULL,
  updated_by INT(11) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_saas_subscription_code (subscription_code),
  KEY idx_saas_tenant_subscriptions_company_id (company_id),
  KEY idx_saas_tenant_subscriptions_plan_id (plan_id),
  KEY idx_saas_tenant_subscriptions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saas_subscription_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  company_id INT(10) UNSIGNED NOT NULL COMMENT 'References com_companies.id',
  payment_method ENUM('bkash', 'nagad', 'bank', 'cash') NOT NULL,
  payment_status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  billing_months INT UNSIGNED NOT NULL DEFAULT 1,
  paid_at DATETIME DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  transaction_id VARCHAR(120) DEFAULT NULL,
  sender_number VARCHAR(30) DEFAULT NULL,
  receiver_account VARCHAR(60) DEFAULT NULL,
  submitted_by_user_id INT(11) DEFAULT NULL,
  approved_by_user_id INT(11) DEFAULT NULL,
  proof_attachment VARCHAR(255) DEFAULT NULL,
  admin_note TEXT DEFAULT NULL,
  customer_note TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_saas_subscription_payments_subscription_id (subscription_id),
  KEY idx_saas_subscription_payments_company_id (company_id),
  KEY idx_saas_subscription_payments_status (payment_status),
  KEY idx_saas_subscription_payments_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saas_subscription_activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id BIGINT UNSIGNED NOT NULL,
  company_id INT(10) UNSIGNED NOT NULL COMMENT 'References com_companies.id',
  action VARCHAR(120) NOT NULL,
  action_details JSON DEFAULT NULL,
  acted_by_user_id INT(11) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_saas_subscription_activity_logs_subscription_id (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO saas_plans
  (id, name, slug, billing_interval, price, currency, trial_days, max_employees, max_customers, max_users, max_branches, max_transactions_per_month, sort_order, is_active, description)
VALUES
  (1, 'Starter', 'starter-monthly', 'monthly', 999.00, 'BDT', 15, 10, 100, 3, 1, 3000, 1, 1, 'Small business starter plan'),
  (2, 'Business', 'business-monthly', 'monthly', 2499.00, 'BDT', 15, 30, 1000, 10, 3, 15000, 2, 1, 'Growing business plan'),
  (3, 'Enterprise', 'enterprise-monthly', 'monthly', 5999.00, 'BDT', 30, 100, 10000, 50, 10, 100000, 3, 1, 'Large organization plan')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  price = VALUES(price),
  trial_days = VALUES(trial_days),
  max_employees = VALUES(max_employees),
  max_customers = VALUES(max_customers),
  max_users = VALUES(max_users),
  max_branches = VALUES(max_branches),
  max_transactions_per_month = VALUES(max_transactions_per_month),
  is_active = VALUES(is_active),
  description = VALUES(description);
