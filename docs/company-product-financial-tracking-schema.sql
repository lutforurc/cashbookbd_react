-- ============================================================================
--  Company & Product-wise Financial Tracking
--  Product-wise Bill / Cash Received / Cash Payment / Receivable / Payable
-- ============================================================================
--  Target      : MySQL 5.7+ / MariaDB 10.2+ , InnoDB , utf8mb4
--  Companion   : docs/productwise-received-payment-bill.md
--  Inspected   : cashbook_api (backend) + cashbookbd_react (frontend)
--
-- ----------------------------------------------------------------------------
--  SAFETY GUARANTEE
-- ----------------------------------------------------------------------------
--  এই script শুধু নতুন object তৈরি করে:
--      * 3 টি নতুন TABLE
--      * 3 টি READ-ONLY VIEW
--
--  এখানে নেই:  ALTER TABLE / UPDATE / DELETE / DROP / TRUNCATE
--  কোনো legacy table-এ column, index, foreign key বা trigger যোগ করা হয়নি।
--  VIEW গুলো শুধু SELECT করে — কোনো legacy table পরিবর্তন করে না।
--
-- ============================================================================
--  ১. INSPECTION RESULT — এই schema যে বাস্তব structure-এর উপর দাঁড়িয়ে
-- ============================================================================
--
--  Company / Branch / Product
--  --------------------------
--    com_companies              id INT UNSIGNED (PK)
--    com_branches               id INT UNSIGNED (PK), company_id
--    product_items              id INT UNSIGNED (PK), company_id
--    users                      id INT UNSIGNED (PK), company_id, branch_id
--    acc_coa_level4s            id INT UNSIGNED (PK), company_id   -- party/account
--
--  Voucher chain (Received / Payment / Journal)
--  --------------------------------------------
--    main_trx_master            id, company_id, branch_id, vr_no, vr_sl, vr_date,
--                               transaction_type, status
--                               transaction_type: 1 = Received, 2 = Payment, 5 = Journal
--                               status = 1 → live voucher (0 → cancelled/void)
--        └── acc_transaction_master     id, company_id, branch_id, main_trx_id, note
--                └── acc_transaction_details   id, trx_mstr_id, coa4_id,
--                                              remarks, debit, credit, pay_branch
--                                              coa4_id = 17 → Cash contra row
--
--  Invoice chain
--  -------------
--    inventory_sales_masters       id, main_trx_id, branch_id, customer_id,
--                                  total, discount, netpayment, status
--        └── inventory_sales_details      id, sal_mstr_id, product_id, quantity,
--                                         sales_price, weight_variance,
--                                         variance_type, is_return
--    inventory_purchase_masters    id, main_trx_id, branch_id, supplier_id,
--                                  invoice_number, invoice_date,
--                                  total, discount, netpayment
--        └── inventory_purchase_details   id, pur_mstr_id, product_id, quantity,
--                                         purchase_price, weight_variance,
--                                         variance_type, is_return
--    inventory_sales_return_masters      id, main_trx_id, branch_id, customer_id,
--                                        total, discount, netpayment, status
--        └── inventory_sales_return_details   sal_mstr_id, product_id, quantity,
--                                             return_price, return_pct, line_net_total
--    inventory_purchase_return_masters   id, main_trx_id, branch_id, supplier_id,
--                                        total, discount, netpayment, status
--        └── inventory_purchase_return_details  pur_return_mstr_id, product_id,
--                                               quantity, return_price,
--                                               return_pct, line_net_total, is_return
--
-- ============================================================================
--  ২. যে ৩টি সিদ্ধান্ত এই schema-কে আগের খসড়া থেকে আলাদা করেছে
-- ============================================================================
--
--  (ক) acc_transaction_details.id স্থায়ী নয় — তাই anchor হিসেবে ব্যবহার করা হয়নি
--      ------------------------------------------------------------------------
--      Voucher update করলে ReceivedController / PaymentController প্রথমে
--          AccTransactionDetails::where('trx_mstr_id', ...)->delete()
--      চালায়, তারপর নতুন করে insert করে। একই কাজ invoice detail-এও হয়
--      (inventory_sales_details / inventory_purchase_details)।
--
--      অর্থাৎ detail row-এর id প্রতিবার edit-এ বদলে যায়।
--      সেটাকে mapping key বানালে একবার edit করলেই mapping অনাথ হয়ে যেত,
--      product-এর Cash Received কমে যেত এবং Receivable মিথ্যাভাবে বেড়ে যেত।
--
--      যা টিকে থাকে :  main_trx_master.id  এবং  acc_transaction_master.id
--      তাই স্থায়ী key =  (company_id, transaction_type, main_trx_id, row_seq)
--
--  (খ) mapping table নিজেই ledger-ready — amount/date/party এখানেই রাখা হয়
--      ------------------------------------------------------------------------
--      Report-কে প্রতিবার acc_transaction_details-এ ফিরে যেতে হলে সেই
--      churn-হওয়া table-এর উপর নির্ভরশীল হতে হতো। তাই mapped_amount, vr_date,
--      vr_no, coa4_id এখানেই denormalize করা হয়েছে।
--
--      নিয়ম: voucher save/update/delete-এর সঙ্গে একই DB transaction-এ
--             mapping row গুলো সম্পূর্ণ পুনর্লিখন (rewrite) করতে হবে।
--
--  (গ) Journal ও Bank voucher অন্তর্ভুক্ত
--      ------------------------------------------------------------------------
--      বিদ্যমান statement query (ReportsController::ledgerWithProductOpeningBalance)
--      transaction_type = 5 (Journal)-কেও received/payment হিসেবে গোনে, এবং
--      BankReceivedController / BankPaymentController আলাদাভাবে বিদ্যমান।
--      শুধু cash ধরলে product Receivable/Payable overstate হতো।
--
-- ============================================================================

SET NAMES utf8mb4;


-- ============================================================================
--  TABLE 1 : company_product_tracking_settings
--  কোন Company-এর কোন Product track হবে — opt-in configuration
-- ============================================================================
--
--  BRANCH SCOPE নিয়ম (আগে অসংজ্ঞায়িত ছিল, এখন নির্দিষ্ট):
--      branch_id = 0   → ঐ Company-র সব branch-এ প্রযোজ্য (company-wide)
--      branch_id > 0   → শুধু ঐ branch-এ প্রযোজ্য
--      দুটোই থাকলে branch-specific row জেতে; না থাকলে branch_id = 0 fallback.
--
--  EFFECTIVE PERIOD নিয়ম (আগে opening balance-এর সঙ্গে স্ববিরোধী ছিল):
--      effective_from / effective_to শুধু *নতুন mapping তৈরি* নিয়ন্ত্রণ করে।
--      Report সবসময় সম্পূর্ণ history পড়বে।
--      কারণ: পুরোনো bill বাদ দিয়ে পুরোনো cash রেখে দিলে
--            Opening Receivable ঋণাত্মক হয়ে যেত।
-- ============================================================================
CREATE TABLE IF NOT EXISTS `company_product_tracking_settings` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- com_companies.id (INT UNSIGNED) — logical reference, কোনো FK নয়
    `company_id`            INT UNSIGNED NOT NULL,
    -- com_branches.id ; 0 = সব branch
    `branch_id`             INT UNSIGNED NOT NULL DEFAULT 0,
    -- acc_coa_level4s.id (Customer/Supplier) ; 0 = সব পার্টি
    `coa4_id`               INT UNSIGNED NOT NULL DEFAULT 0,
    -- product_items.id (INT UNSIGNED) — type মিলিয়ে রাখা হয়েছে
    `product_id`            INT UNSIGNED NOT NULL,

    `track_sales_bill`      TINYINT(1) NOT NULL DEFAULT 1,
    `track_purchase_bill`   TINYINT(1) NOT NULL DEFAULT 1,
    `track_cash_received`   TINYINT(1) NOT NULL DEFAULT 1,
    `track_cash_payment`    TINYINT(1) NOT NULL DEFAULT 1,
    `is_active`             TINYINT(1) NOT NULL DEFAULT 1,

    `effective_from`        DATE NULL DEFAULT NULL,
    `effective_to`          DATE NULL DEFAULT NULL,

    `created_by`            INT UNSIGNED NULL DEFAULT NULL,
    `updated_by`            INT UNSIGNED NULL DEFAULT NULL,
    `created_at`            TIMESTAMP NULL DEFAULT NULL,
    `updated_at`            TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),

    -- একই Company + Branch + Party scope + Product দুইবার configure করা যাবে না
    UNIQUE KEY `uq_cpts_scope` (`company_id`, `branch_id`, `coa4_id`, `product_id`),

    -- dropdown ও settings list-এর প্রধান query path
    KEY `idx_cpts_company_active` (`company_id`, `is_active`, `branch_id`),
    -- Received/Payment form-এ Account বাছলে ঐ পার্টির Product খোঁজা
    KEY `idx_cpts_party` (`company_id`, `coa4_id`, `is_active`),
    -- product ownership validation ও reverse lookup
    KEY `idx_cpts_product` (`company_id`, `product_id`, `is_active`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Opt-in product financial tracking config, scoped by company and branch';


-- ============================================================================
--  TABLE 2 : transaction_product_maps
--  একটি Received/Payment/Journal voucher row  ←→  একটি tracked Product
--  (ledger-ready: amount, date, party এখানেই সংরক্ষিত)
-- ============================================================================
--
--  STABLE ANCHOR
--  -------------
--      main_trx_id  = main_trx_master.id    (voucher edit-এ টিকে থাকে)
--      row_seq      = ঐ voucher-এর party row গুলোর (coa4_id <> 17)
--                     1-ভিত্তিক ক্রমিক নম্বর, controller যে ক্রমে save করে
--                     সেই একই ক্রম — save, edit এবং update তিন জায়গায়
--                     অবশ্যই একই ordering ব্যবহার করতে হবে।
--
--      acc_transaction_details.id কেবল তথ্য হিসেবে রাখা হয় (trx_detail_id),
--      কখনো key বা join basis হিসেবে ব্যবহার করা যাবে না — এটি volatile.
--
--  REWRITE CONTRACT
--  ----------------
--      voucher store   → mapping insert
--      voucher update  → ঐ main_trx_id-এর সব mapping delete + নতুন করে insert
--      voucher delete  → ঐ main_trx_id-এর সব mapping delete
--      তিনটিই voucher-এর নিজের DB transaction-এর ভিতরে হতে হবে।
--
--  transaction_type মান:
--      cash_received     cash_payment
--      bank_received     bank_payment
--      journal_received  journal_payment
--
--  source_type মান:
--      sales_invoice  purchase_invoice  sales_order  purchase_order
--      manual         historical
--
--  mapping_method মান:
--      manual  automatic_single_tracked_product  historical_backfill  reconciliation
-- ============================================================================
CREATE TABLE IF NOT EXISTS `transaction_product_maps` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    `company_id`        INT UNSIGNED NOT NULL,
    `branch_id`         INT UNSIGNED NOT NULL DEFAULT 0,
    `product_id`        INT UNSIGNED NOT NULL,

    -- ---- stable anchor ----
    `main_trx_id`       INT UNSIGNED NOT NULL,
    `row_seq`           SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    -- ---- informational only, volatile, join করা নিষিদ্ধ ----
    `trx_mstr_id`       INT UNSIGNED NULL DEFAULT NULL,
    `trx_detail_id`     INT UNSIGNED NULL DEFAULT NULL,

    `transaction_type`  VARCHAR(30) NOT NULL,
    -- 1 = টাকা এসেছে (received) , -1 = টাকা গেছে (payment)
    `direction`         TINYINT NOT NULL,

    -- ---- ledger projection (voucher-এর সঙ্গে rewrite হয়) ----
    `vr_date`           DATE NOT NULL,
    `vr_no`             VARCHAR(64) NULL DEFAULT NULL,
    `coa4_id`           INT UNSIGNED NULL DEFAULT NULL,   -- party account
    `mapped_amount`     DECIMAL(20,4) NOT NULL DEFAULT 0.0000,
    `remarks`           VARCHAR(255) NULL DEFAULT NULL,

    `source_type`       VARCHAR(30) NULL DEFAULT NULL,
    `source_id`         INT UNSIGNED NULL DEFAULT NULL,
    `mapping_method`    VARCHAR(40) NOT NULL DEFAULT 'manual',

    `created_by`        INT UNSIGNED NULL DEFAULT NULL,
    `updated_by`        INT UNSIGNED NULL DEFAULT NULL,
    `created_at`        TIMESTAMP NULL DEFAULT NULL,
    `updated_at`        TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),

    -- একটি voucher row-এর বিপরীতে সর্বোচ্চ একটি Product
    UNIQUE KEY `uq_tpm_voucher_row`
        (`company_id`, `transaction_type`, `main_trx_id`, `row_seq`),

    -- Product Financial Statement-এর প্রধান path (date range + running balance)
    KEY `idx_tpm_ledger`   (`company_id`, `product_id`, `vr_date`, `id`),
    -- branch-filtered statement
    KEY `idx_tpm_branch`   (`company_id`, `branch_id`, `product_id`, `vr_date`),
    -- product + party statement ("কোন পার্টির কাছে কোন পণ্যের কত পাওনা")
    KEY `idx_tpm_party`    (`company_id`, `product_id`, `coa4_id`, `vr_date`),
    -- voucher lifecycle: edit/delete-এ ঐ voucher-এর mapping খোঁজা
    KEY `idx_tpm_voucher`  (`main_trx_id`),
    -- backfill ও invoice-ভিত্তিক reconciliation
    KEY `idx_tpm_source`   (`source_type`, `source_id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Ledger-ready map: voucher row to tracked product, legacy tables untouched';


-- ============================================================================
--  TABLE 3 : product_tracking_reconciliation_logs
--  Append-only AUDIT TRAIL — প্রতিটি mapping সিদ্ধান্তের ইতিহাস
-- ============================================================================
--
--  আগের খসড়ায় এখানে UNIQUE KEY ছিল, ফলে প্রতি transaction-এ মাত্র একটি row
--  থাকতে পারত — সেটা audit log নয়, state table হয়ে যেত। এখন unique key
--  সরিয়ে এটিকে সত্যিকারের append-only history বানানো হয়েছে।
--
--  "Unmapped queue" আলাদা table নয় — সেটা একটি query:
--      যেসব live voucher row-এর বিপরীতে transaction_product_maps-এ
--      কোনো row নেই, সেগুলোই pending।
--
--  action মান:
--      auto_mapped  manually_mapped  remapped  cleared
--      ambiguous    source_not_found ignored
-- ============================================================================
CREATE TABLE IF NOT EXISTS `product_tracking_reconciliation_logs` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    `company_id`            INT UNSIGNED NOT NULL,
    `branch_id`             INT UNSIGNED NOT NULL DEFAULT 0,

    `main_trx_id`           INT UNSIGNED NOT NULL,
    `row_seq`               SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `transaction_type`      VARCHAR(30) NOT NULL,

    `source_type`           VARCHAR(30) NULL DEFAULT NULL,
    `source_id`             INT UNSIGNED NULL DEFAULT NULL,

    `previous_product_id`   INT UNSIGNED NULL DEFAULT NULL,
    `suggested_product_id`  INT UNSIGNED NULL DEFAULT NULL,
    `resolved_product_id`   INT UNSIGNED NULL DEFAULT NULL,
    `mapped_amount`         DECIMAL(20,4) NULL DEFAULT NULL,

    `action`                VARCHAR(30) NOT NULL DEFAULT 'ambiguous',
    `reason`                VARCHAR(500) NULL DEFAULT NULL,
    `metadata`              JSON NULL,

    `acted_by`              INT UNSIGNED NULL DEFAULT NULL,
    `created_at`            TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (`id`),

    -- একই voucher row-এর পূর্ণ ইতিহাস সময়ক্রমে
    KEY `idx_ptrl_row`      (`company_id`, `main_trx_id`, `row_seq`, `id`),
    -- reconciliation screen-এর filter
    KEY `idx_ptrl_action`   (`company_id`, `action`, `branch_id`, `id`),
    KEY `idx_ptrl_product`  (`company_id`, `resolved_product_id`, `id`),
    KEY `idx_ptrl_source`   (`source_type`, `source_id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Append-only audit trail of every product mapping decision';


-- ============================================================================
--  VIEW 1 : v_product_bill_lines
--  Product-wise Sales/Purchase Bill ও Return — existing invoice data থেকে
-- ============================================================================
--
--  BILL FORMULA (এই system-এ line-level discount/tax/charge column নেই)
--  --------------------------------------------------------------------
--      gross_amount   = quantity × rate
--      discount_share = master.discount × gross_amount / master.total
--                       (master.total = ঐ invoice-এর সব line-এর gross যোগফল,
--                        controller নিজেই এভাবে হিসাব করে রাখে)
--      net_amount     = gross_amount − discount_share
--
--  Return line-এ line_net_total ব্যবহার করা হয়, কিন্তু সব writer সেটি
--  populate করে না (PurchaseReturn.php করে না, CommissionSalesMaster.php করে)।
--  তাই COALESCE দিয়ে fallback হিসাব রাখা হয়েছে।
--
--  Cancelled/void voucher বাদ:  main_trx_master.status = 1
-- ============================================================================
CREATE OR REPLACE VIEW `v_product_bill_lines` AS

    -- ---------- Sales Bill ----------
    SELECT
        m.company_id                                                   AS company_id,
        m.branch_id                                                    AS branch_id,
        d.product_id                                                   AS product_id,
        m.id                                                           AS main_trx_id,
        m.vr_no                                                        AS vr_no,
        m.vr_date                                                      AS vr_date,
        'sales_bill'                                                   AS line_type,
        1                                                              AS bill_sign,
        'sales_invoice'                                                AS source_type,
        s.id                                                           AS source_id,
        s.customer_id                                                  AS coa4_id,
        d.quantity                                                     AS quantity,
        d.sales_price                                                  AS rate,
        ROUND(d.quantity * d.sales_price, 4)                           AS gross_amount,
        ROUND(COALESCE(s.discount, 0) * (d.quantity * d.sales_price)
              / NULLIF(s.total, 0), 4)                                 AS discount_share,
        ROUND(d.quantity * d.sales_price
              - COALESCE(s.discount, 0) * (d.quantity * d.sales_price)
                / NULLIF(s.total, 0), 4)                               AS net_amount
    FROM `main_trx_master` m
    JOIN `inventory_sales_masters`  s ON s.main_trx_id = m.id
    JOIN `inventory_sales_details`  d ON d.sal_mstr_id = s.id
    WHERE m.status = 1
      AND COALESCE(d.is_return, 0) = 0

    UNION ALL

    -- ---------- Sales Return ----------
    SELECT
        m.company_id, m.branch_id, rd.product_id, m.id, m.vr_no, m.vr_date,
        'sales_return', -1, 'sales_return', rm.id, rm.customer_id,
        rd.quantity, rd.return_price,
        ROUND(rd.quantity * rd.return_price, 4),
        0,
        ROUND(COALESCE(
            rd.line_net_total,
            rd.quantity * rd.return_price
              - (rd.quantity * rd.return_price * COALESCE(rd.return_pct, 0) / 100)
        ), 4)
    FROM `main_trx_master` m
    JOIN `inventory_sales_return_masters` rm ON rm.main_trx_id = m.id
    JOIN `inventory_sales_return_details` rd ON rd.sal_mstr_id = rm.id
    WHERE m.status = 1

    UNION ALL

    -- ---------- Purchase Bill ----------
    SELECT
        m.company_id, m.branch_id, pd.product_id, m.id, m.vr_no, m.vr_date,
        'purchase_bill', 1, 'purchase_invoice', p.id, p.supplier_id,
        pd.quantity, pd.purchase_price,
        ROUND(pd.quantity * pd.purchase_price, 4),
        ROUND(COALESCE(p.discount, 0) * (pd.quantity * pd.purchase_price)
              / NULLIF(p.total, 0), 4),
        ROUND(pd.quantity * pd.purchase_price
              - COALESCE(p.discount, 0) * (pd.quantity * pd.purchase_price)
                / NULLIF(p.total, 0), 4)
    FROM `main_trx_master` m
    JOIN `inventory_purchase_masters` p  ON p.main_trx_id = m.id
    JOIN `inventory_purchase_details` pd ON pd.pur_mstr_id = p.id
    WHERE m.status = 1
      AND COALESCE(pd.is_return, 0) = 0

    UNION ALL

    -- ---------- Purchase Return ----------
    SELECT
        m.company_id, m.branch_id, prd.product_id, m.id, m.vr_no, m.vr_date,
        'purchase_return', -1, 'purchase_return', prm.id, prm.supplier_id,
        prd.quantity, prd.return_price,
        ROUND(prd.quantity * prd.return_price, 4),
        0,
        ROUND(COALESCE(
            prd.line_net_total,
            prd.quantity * prd.return_price
              - (prd.quantity * prd.return_price * COALESCE(prd.return_pct, 0) / 100)
        ), 4)
    FROM `main_trx_master` m
    JOIN `inventory_purchase_return_masters` prm ON prm.main_trx_id = m.id
    JOIN `inventory_purchase_return_details` prd ON prd.pur_return_mstr_id = prm.id
    WHERE m.status = 1;


-- ============================================================================
--  VIEW 2 : v_product_cash_lines
--  Product-wise Cash/Bank/Journal movement — শুধু mapped row
-- ============================================================================
--  Unmapped voucher row এখানে আসে না — এটি ইচ্ছাকৃত।
--  Product statement কখনো অনুমান করে টাকা দেখাবে না।
--
--  main_trx_master.status = 1 filter অপরিহার্য: voucher delete এই system-এ
--  soft delete (status = 0, delete_at সেট), আর restore সেটাকে 1-এ ফিরিয়ে আনে।
--  Filter এখানে থাকায় delete ও restore দুটোই আপনাআপনি কাজ করে এবং
--  VoucherModificationController-এ কোনো cleanup hook বসাতে হয় না —
--  mapping অক্ষত থাকে, শুধু report থেকে বাদ যায়।
-- ============================================================================
CREATE OR REPLACE VIEW `v_product_cash_lines` AS
    SELECT
        t.company_id                          AS company_id,
        t.branch_id                           AS branch_id,
        t.product_id                          AS product_id,
        t.main_trx_id                         AS main_trx_id,
        t.vr_no                               AS vr_no,
        t.vr_date                             AS vr_date,
        t.transaction_type                    AS line_type,
        t.direction                           AS direction,
        t.source_type                         AS source_type,
        t.source_id                           AS source_id,
        t.coa4_id                             AS coa4_id,
        t.remarks                             AS remarks,
        t.mapped_amount                       AS net_amount,
        CASE WHEN t.direction = 1  THEN t.mapped_amount ELSE 0 END AS received_amount,
        CASE WHEN t.direction = -1 THEN t.mapped_amount ELSE 0 END AS payment_amount
    FROM `transaction_product_maps` t
    JOIN `main_trx_master` m ON m.id = t.main_trx_id
    WHERE m.status = 1;


-- ============================================================================
--  VIEW 3 : v_product_ledger_lines
--  Bill + Cash একত্রে — এটাই Product Financial Statement-এর row source
-- ============================================================================
--  ব্যবহার:
--      Opening  → WHERE vr_date <  :start_date
--      Range    → WHERE vr_date BETWEEN :start_date AND :end_date
--      দুটোতেই একই company_id / branch_id / product_id filter দিতে হবে।
--
--  Receivable = SUM(sales_bill) − SUM(sales_return) − SUM(*_received)
--  Payable    = SUM(purchase_bill) − SUM(purchase_return) − SUM(*_payment)
-- ============================================================================
CREATE OR REPLACE VIEW `v_product_ledger_lines` AS

    SELECT
        company_id, branch_id, product_id, main_trx_id, vr_no, vr_date,
        line_type, source_type, source_id, coa4_id,
        NULL                                            AS remarks,
        quantity, rate, net_amount,
        CASE WHEN line_type = 'sales_bill'      THEN net_amount ELSE 0 END AS sales_bill,
        CASE WHEN line_type = 'sales_return'    THEN net_amount ELSE 0 END AS sales_return,
        CASE WHEN line_type = 'purchase_bill'   THEN net_amount ELSE 0 END AS purchase_bill,
        CASE WHEN line_type = 'purchase_return' THEN net_amount ELSE 0 END AS purchase_return,
        0 AS cash_received,
        0 AS cash_payment
    FROM `v_product_bill_lines`

    UNION ALL

    SELECT
        company_id, branch_id, product_id, main_trx_id, vr_no, vr_date,
        line_type, source_type, source_id, coa4_id,
        remarks,
        NULL AS quantity, NULL AS rate, net_amount,
        0 AS sales_bill,
        0 AS sales_return,
        0 AS purchase_bill,
        0 AS purchase_return,
        received_amount AS cash_received,
        payment_amount  AS cash_payment
    FROM `v_product_cash_lines`;


-- ============================================================================
--  VERIFICATION
-- ============================================================================

-- নতুন object তৈরি হয়েছে কি না
SHOW TABLES LIKE 'company_product_tracking_settings';
SHOW TABLES LIKE 'transaction_product_maps';
SHOW TABLES LIKE 'product_tracking_reconciliation_logs';
SELECT TABLE_NAME, TABLE_TYPE
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME LIKE 'v\_product\_%';

-- প্রমাণ: কোনো legacy table স্পর্শ করা হয়নি।
-- এই ফাইলে ALTER TABLE / UPDATE / DELETE / DROP / TRUNCATE একটিও নেই —
-- নিচের command চালিয়ে যাচাই করা যাবে (কোনো output আসা উচিত নয়):
--
--   grep -inE "alter table|^update |^delete |drop |truncate" \
--        docs/company-product-financial-tracking-schema.sql
--
-- deploy-এর আগে যাচাই করতে হবে (writer-ভেদে column ভিন্ন থাকায়):
--   SHOW COLUMNS FROM inventory_purchase_return_details LIKE 'pur_return_mstr_id';
--   SHOW COLUMNS FROM inventory_purchase_return_details LIKE 'line_net_total';
--   SHOW COLUMNS FROM inventory_sales_return_details    LIKE 'sal_mstr_id';
