-- ============================================================================
--  Product Tracking — Invoice Opt-in Patch
--  Companion : docs/company-product-financial-tracking-schema.sql
--  Target    : MySQL 5.7+ / MariaDB 10.2+
-- ============================================================================
--
--  কী বদলাচ্ছে
--  ------------
--  মালিকের নিয়ম: যে লেনদেনে Product হাতে বেছে দেওয়া হয়েছে, শুধু সেটাই
--  Product Financial Statement ও Product-wise Receivable & Payable-এ আসবে।
--  Cash ও Bank Received/Payment-এ এটি আগে থেকেই সত্য ছিল। এই patch ইনভয়েসকেও
--  একই নিয়মে আনে।
--
--  আগে v_product_bill_lines উল্টোটা করত — inventory_sales_details.product_id
--  ধরে *প্রতিটি* পণ্যের ইনভয়েস টানত, সে পণ্য tracked হোক বা না হোক। প্রমাণ:
--  patch-এর আগে ঐ view ফেরত দিত product 3, 4, 8 — অথচ configure করা ছিল
--  কেবল product 1।
--
--  sales_return ও purchase_return সম্পূর্ণ বাদ (মালিকের সিদ্ধান্ত)। তাই সূত্র:
--      Receivable = sales_bill    − received
--      Payable    = purchase_bill − payment
--
-- ----------------------------------------------------------------------------
--  SAFETY GUARANTEE
-- ----------------------------------------------------------------------------
--  এই script শুধু দুটি VIEW প্রতিস্থাপন করে।
--
--      * কোনো TABLE তৈরি, পরিবর্তন বা মুছে ফেলা হয় না
--      * কোনো ALTER TABLE / UPDATE / DELETE / TRUNCATE নেই
--      * কোনো column, index বা foreign key যোগ হয় না
--      * কোনো ডেটা লেখা বা মুছে ফেলা হয় না
--
--  VIEW শুধু SELECT করে — নিজে কিছু জমা রাখে না, তাই ফিরিয়ে নেওয়া (rollback)
--  মানে কেবল পুরোনো সংজ্ঞা আবার বসানো। ডেটার কোনো ঝুঁকি নেই।
--
--  টেবিল কেন বদলাতে হলো না (যাচাইকৃত):
--      transaction_product_maps.transaction_type = varchar(30), ENUM নয়, এবং
--      কোনো CHECK constraint নেই — তাই 'sales_bill' / 'purchase_bill' নতুন মান
--      হিসেবে সরাসরি বসে। ইনভয়েসের নিজস্ব main_trx_id আছে
--      (inventory_sales_masters, inventory_purchase_masters), তাই ভাউচারের
--      মতো একই stable anchor ব্যবহার করা যায়। Unique key-তে transaction_type
--      থাকায় একই main_trx_id-তে bill ও voucher map পাশাপাশি থাকতে পারে।
--      company_product_tracking_settings-এ track_sales_bill ও
--      track_purchase_bill কলাম দুটি আগে থেকেই আছে।
--
-- ============================================================================

SET NAMES utf8mb4;


-- ============================================================================
--  ধাপ ০ : mysqldump-এর stub পরিষ্কার  (প্রয়োজন হলে)
-- ============================================================================
--  mysqldump প্রতিটি view-এর জন্য আগে একটি অস্থায়ী BASE TABLE লেখে, শেষে সেটিকে
--  আসল CREATE VIEW দিয়ে বদলায়। CREATE VIEW ধাপটি fail করলে (সাধারণত DEFINER
--  ইউজার target সার্ভারে না থাকলে) ঐ stub টেবিলগুলোই থেকে যায় — আর তখন
--  CREATE OR REPLACE VIEW কাজ করে না, কারণ টেবিলকে view দিয়ে বদলানো যায় না।
--
--  নিচের জোড়া দুই অবস্থাতেই নিরাপদ (পরীক্ষিত): নামটি TABLE হলে DROP VIEW শুধু
--  warning দেয়, VIEW হলে DROP TABLE শুধু warning দেয়। তাই দুটোই চালানো যায়।
--
--  চালানোর আগে দেখে নিতে পারেন কোনটি কী অবস্থায় আছে:
--      SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES
--       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'v\_product\_%';

DROP TABLE IF EXISTS `v_product_bill_lines`;
DROP VIEW  IF EXISTS `v_product_bill_lines`;

DROP TABLE IF EXISTS `v_product_cash_lines`;
DROP VIEW  IF EXISTS `v_product_cash_lines`;


-- ============================================================================
--  VIEW 1 : v_product_bill_lines   —  নতুন সংজ্ঞা
--  হাতে ম্যাপ করা Sales / Purchase ইনভয়েস
-- ============================================================================
--  আগে: inventory_sales_details / inventory_purchase_details থেকে সরাসরি,
--        চারটি UNION শাখায় (sales bill, sales return, purchase bill,
--        purchase return), ট্র্যাকিং সেটিংসের সঙ্গে কোনো সম্পর্ক ছাড়াই।
--
--  এখন: শুধুমাত্র transaction_product_maps — অর্থাৎ যে ইনভয়েসে ব্যবহারকারী
--        নিজে Product বেছে দিয়েছেন কেবল সেটিই। Return শাখা দুটি নেই।
--
--  কলামের তালিকা ও ক্রম অপরিবর্তিত (১৬টি), তাই v_product_ledger_lines এবং
--  ProductFinancialStatementController-এ কোনো পরিবর্তন লাগে না।
--
--  quantity ও rate এখন NULL — map row-তে পরিমাণ বা দর নেই, কারণ Product
--  ইনভয়েস-স্তরে হাতে বাছা হয়, কোনো একটি লাইন থেকে আসে না। v_product_cash_lines
--  শুরু থেকেই এভাবে NULL দেয়, controller তা `null` হিসেবে পাঠায়, আর UI ঘরে
--  '-' দেখায় — তাই এটি ইতিমধ্যেই সমর্থিত পথ। CAST রাখা হয়েছে যাতে কলামের
--  ঘোষিত ধরন অক্ষত থাকে।
--
--  bill_sign স্থির 1 — এর অর্থ ছিল "bill হলে 1, return হলে -1", আর return
--  এখন নেই। direction বহন করাতে একে ব্যবহার করা হয়নি; অর্থ অটুট রাখাই সৎ।
--
--  m.status = 1 অপরিহার্য: ইনভয়েস delete এই সিস্টেমে main_trx_master-এর উপর
--  soft flag, আর restore সেটিকে ফিরিয়ে আনে। join এখানে থাকায় delete ও restore
--  দুটোই আপনাআপনি কাজ করে — কোথাও cleanup hook বসাতে হয় না, mapping অক্ষত
--  থাকে, শুধু report থেকে বাদ যায়।
--
--  সতর্কতা: main_trx_master.transaction_type দেখে bill চেনা যাবে না — sales
--  ইনভয়েস type 1 (Cash Received-এর মতোই) আর purchase ইনভয়েস type 2 (Payment-এর
--  মতোই) নিয়ে চলে। transaction_product_maps.transaction_type-ই একমাত্র নির্ভরযোগ্য।
-- ============================================================================
CREATE OR REPLACE VIEW `v_product_bill_lines` AS
    SELECT
        t.company_id                          AS company_id,
        t.branch_id                           AS branch_id,
        t.product_id                          AS product_id,
        t.main_trx_id                         AS main_trx_id,
        t.vr_no                               AS vr_no,
        t.vr_date                             AS vr_date,
        t.transaction_type                    AS line_type,
        1                                     AS bill_sign,
        t.source_type                         AS source_type,
        t.source_id                           AS source_id,
        t.coa4_id                             AS coa4_id,
        CAST(NULL AS DECIMAL(12,2))           AS quantity,
        CAST(NULL AS DECIMAL(18,2))           AS rate,
        t.mapped_amount                       AS gross_amount,
        0                                     AS discount_share,
        t.mapped_amount                       AS net_amount
    FROM `transaction_product_maps` t
    JOIN `main_trx_master` m ON m.id = t.main_trx_id
    WHERE m.status = 1
      AND t.transaction_type IN ('sales_bill', 'purchase_bill');


-- ============================================================================
--  VIEW 2 : v_product_cash_lines   —  সংকুচিত
-- ============================================================================
--  এটিই এই patch-এর সবচেয়ে ঝুঁকিপূর্ণ অংশ, তাই একই সঙ্গে চালানো বাধ্যতামূলক।
--
--  আগে এই view কোনো transaction_type ফিল্টার ছাড়াই transaction_product_maps-এর
--  *সব* row নিত — কারণ তখন ঐ টেবিলে কেবল voucher-ই থাকত। এখন সেখানে bill-ও
--  থাকবে, তাই ফিল্টার না দিলে একই bill row **দুই view-তেই** আসত এবং
--  v_product_ledger_lines-এ **দ্বিগুণ গোনা** হতো।
--
--  তালিকাটি স্পষ্ট করে লেখা (NOT IN নয়), যাতে ভবিষ্যতে নতুন কোনো
--  transaction_type যোগ হলে সে নিঃশব্দে cash হিসেবে গণ্য না হয়।
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
    WHERE m.status = 1
      AND t.transaction_type IN (
          'cash_received',    'cash_payment',
          'bank_received',    'bank_payment',
          'journal_received', 'journal_payment'
      );


-- ============================================================================
--  VIEW 3 : v_product_ledger_lines   —  অপরিবর্তিত
-- ============================================================================
--  এটি বদলানোর দরকার নেই এবং এখানে রাখাও হয়নি। MySQL query-র সময় নাম ধরে
--  ভেতরের view resolve করে, তাই v_product_bill_lines বদলালে সেটি আপনাআপনিই
--  ধরা পড়ে। কলামও একই ২০টি।
--
--  sales_return / purchase_return কলাম দুটি ledger view-তে থাকছে, কিন্তু এখন
--  সেগুলো প্রমাণিতভাবে স্থির 0 — কারণ ঐ দুটি line_type আর তৈরিই হতে পারে না।
--  ফলে controller, JSON, TypeScript type এবং UI কিছুই বদলাতে হয়নি, আর
--  receivable()/payable()-এ ঐ পদ দুটি বিয়োগ করা এখন নিরীহ no-op।
-- ============================================================================


-- ============================================================================
--  VERIFICATION
-- ============================================================================

-- ১. তিনটিই VIEW হয়েছে কি না (BASE TABLE দেখালে stub রয়ে গেছে)
SELECT TABLE_NAME, TABLE_TYPE
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME LIKE 'v\_product\_%'
 ORDER BY TABLE_NAME;

-- ২. এটিই মূল প্রমাণ।
--    patch-এর আগে v_product_bill_lines ইনভয়েস থেকে সরাসরি টানত, তাই কোনো
--    mapping না থাকলেও row ফেরত দিত (এই ডেটাবেসে ছিল 42)। patch-এর পরে
--    transaction_product_maps-এ যতগুলো bill map আছে ঠিক ততগুলোই আসবে —
--    ম্যাপিং শূন্য হলে 0। শূন্যে নামাটাই ফিচারটি কাজ করার প্রমাণ।
SELECT
    (SELECT COUNT(*) FROM `transaction_product_maps`
      WHERE transaction_type IN ('sales_bill','purchase_bill'))       AS bill_maps,
    (SELECT COUNT(*) FROM `v_product_bill_lines`)                     AS bill_lines,
    (SELECT COUNT(*) FROM `transaction_product_maps`
      WHERE transaction_type NOT IN ('sales_bill','purchase_bill'))   AS voucher_maps,
    (SELECT COUNT(*) FROM `v_product_cash_lines`)                     AS cash_lines;

-- ৩. একই row যেন দুই view-তে না থাকে (দ্বিগুণ গণনার পাহারা)। 0 আসতে হবে।
SELECT COUNT(*) AS must_be_zero
  FROM `v_product_bill_lines` b
  JOIN `v_product_cash_lines` c
    ON  c.main_trx_id = b.main_trx_id
   AND  c.line_type   = b.line_type;

-- ৪. প্রমাণ: এই ফাইলে কোনো টেবিল স্পর্শ করা হয়নি। নিচের command চালালে
--    কোনো output আসা উচিত নয় (VIEW-এর নামের সঙ্গে মিলে যাওয়া DROP TABLE
--    দুটি ধাপ ০-এর stub পরিষ্কার, টেবিল নয়):
--
--      grep -inE "alter table|^update |^delete |truncate|create table" \
--           docs/product-tracking-invoice-optin.sql
