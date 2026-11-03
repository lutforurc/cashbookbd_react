-- ppdhotelmoteldb — ধাপ ২: নষ্ট L3 ঠিক করা
-- চালানো হয়েছে: 2026-11-03
-- বিশ্লেষণ: docs/2026-11-03-ppdhotelmoteldb-chart-of-accounts-analysis.md (§২-ক, §৫ ধাপ ২)
--
-- সমস্যা: UI থেকে বানানো L3 49, 50, 51, 52, 54 status='0' (বন্ধ) আর acc_source_id=7 (Cash) অবস্থায় ছিল।
-- ফলে L4 366 Food Management আর 367 Washing & Cleaning Cash গোষ্ঠীতে পড়ে ছিল।
-- status একটা enum('0','1'), তাই মান অবশ্যই string '1' হিসেবে লিখতে হবে।

USE ppdhotelmoteldb;

START TRANSACTION;

-- 49 Food Management A/c: শীট অনুযায়ী Operating Expense (L2 8)-এ সরানো
UPDATE acc_coa_level3s SET status='1', acc_source_id=12, acc_coa_level2_id=8,  updated_at=NOW() WHERE id=49;
-- 50 Room Rent (AC), 51 Room Rent (Non AC), 54 Washing & Cleaning A/c
UPDATE acc_coa_level3s SET status='1', acc_source_id=12,                       updated_at=NOW() WHERE id IN (50,51,54);
-- 52 Fuel & Lubricate: শীট অনুযায়ী Overhead Expense (L2 13)-এ সরানো
UPDATE acc_coa_level3s SET status='1', acc_source_id=12, acc_coa_level2_id=13, updated_at=NOW() WHERE id=52;

COMMIT;

-- যাচাই: source 7-এ শুধু L3 1 / L4 17 (Cash) থাকার কথা, আর কোনো L3 বন্ধ থাকার কথা না
SELECT id, name, acc_coa_level2_id, acc_source_id, status FROM acc_coa_level3s WHERE id IN (49,50,51,52,54);
SELECT l3.id, l3.name, l4.id AS l4_id, l4.name AS l4_name
  FROM acc_coa_level3s l3 LEFT JOIN acc_coa_level4s l4 ON l4.acc_coa_level3_id = l3.id
 WHERE l3.acc_source_id = 7;
SELECT COUNT(*) AS disabled_l3 FROM acc_coa_level3s WHERE status='0';

-- ---------------------------------------------------------------------------
-- ROLLBACK (আগের অবস্থায় ফেরাতে হলে)
-- ---------------------------------------------------------------------------
-- UPDATE acc_coa_level3s SET status='0', acc_source_id=7, acc_coa_level2_id=13 WHERE id IN (49,54);
-- UPDATE acc_coa_level3s SET status='0', acc_source_id=7, acc_coa_level2_id=6  WHERE id IN (50,51);
-- UPDATE acc_coa_level3s SET status='0', acc_source_id=7, acc_coa_level2_id=8  WHERE id=52;
