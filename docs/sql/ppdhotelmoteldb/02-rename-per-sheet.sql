-- ppdhotelmoteldb — ধাপ ৩: Excel শীট (Chart of Accounts.xlsx) অনুযায়ী নাম বদলানো
-- চালানো হয়েছে: 2026-11-03
-- বিশ্লেষণ: docs/2026-11-03-ppdhotelmoteldb-chart-of-accounts-analysis.md (§৩, §৫ ধাপ ৩)
--
-- শুধু name কলাম বদলানো হয়েছে। id, acc_source_id, sku_code marker একই আছে।
-- শীটের বানান ভুল ঠিক করে নাম দেওয়া হয়েছে।
--
-- ইচ্ছা করে বাদ রাখা হয়েছে:
--   334 Hotel Service Charge  — "Service Charge" করলে 42-এর সাথে নাম মিলে যায়
--   333                       — "(AC)" দেওয়া হয়নি; AC/Non-AC আলাদা হবে কিনা মালিকের সিদ্ধান্ত বাকি
--   L3 27 Directors Equity    — "Capital" করলে L3 12-এর সাথে নাম মিলে যায়; L2 5 বনাম L2 14 সিদ্ধান্ত বাকি
--   345 Gain / Loss on Disposal — লাভ ও ক্ষতি দুটোই এক খাতে যায়, তাই নাম যেমন আছে
--   L4 99 Staff Loan          — ধাপ ৭-এ বন্ধ করা হবে

USE ppdhotelmoteldb;

START TRANSACTION;

-- L1
UPDATE acc_coa_level1s SET name='Asset',                updated_at=NOW() WHERE id=1;
UPDATE acc_coa_level1s SET name='Liability',            updated_at=NOW() WHERE id=2;

-- L2
UPDATE acc_coa_level2s SET name='Current Asset',        updated_at=NOW() WHERE id=1;
UPDATE acc_coa_level2s SET name='Operating Income',     updated_at=NOW() WHERE id=6;
UPDATE acc_coa_level2s SET name='Non Operating Income', updated_at=NOW() WHERE id=7;
UPDATE acc_coa_level2s SET name='Operating Expense',    updated_at=NOW() WHERE id=8;
UPDATE acc_coa_level2s SET name='Other Expense',        updated_at=NOW() WHERE id=10;
UPDATE acc_coa_level2s SET name='Overhead Expense',     updated_at=NOW() WHERE id=13;

-- L3
UPDATE acc_coa_level3s SET name='Cash in Hand',          updated_at=NOW() WHERE id=1;   -- source 7
UPDATE acc_coa_level3s SET name='Balance at Bank',       updated_at=NOW() WHERE id=2;   -- source 8
UPDATE acc_coa_level3s SET name='Salaries & Allowances', updated_at=NOW() WHERE id=16;
UPDATE acc_coa_level3s SET name='Office Rent',           updated_at=NOW() WHERE id=20;
UPDATE acc_coa_level3s SET name='Stationery',            updated_at=NOW() WHERE id=21;
UPDATE acc_coa_level3s SET name='Advance Paid to Staff', updated_at=NOW() WHERE id=35;
UPDATE acc_coa_level3s SET name='Fuel & Lubricants',     updated_at=NOW() WHERE id=52;

-- L4
UPDATE acc_coa_level4s SET name='Cash in Hand',                            updated_at=NOW() WHERE id=17;
UPDATE acc_coa_level4s SET name='A/c Receivable',                          updated_at=NOW() WHERE id=12;
UPDATE acc_coa_level4s SET name='A/c Payable',                             updated_at=NOW() WHERE id=13;
UPDATE acc_coa_level4s SET name='Capital',                                 updated_at=NOW() WHERE id=14;
UPDATE acc_coa_level4s SET name='Advance Paid to Staff',                   updated_at=NOW() WHERE id=39;
UPDATE acc_coa_level4s SET name='Travelling Allowance A/c',                updated_at=NOW() WHERE id=127;
UPDATE acc_coa_level4s SET name='Bank Charge & Comm A/c',                  updated_at=NOW() WHERE id=132;
UPDATE acc_coa_level4s SET name='Office Rent A/c',                         updated_at=NOW() WHERE id=146;
UPDATE acc_coa_level4s SET name='Salaries & Allowances',                   updated_at=NOW() WHERE id=148;
UPDATE acc_coa_level4s SET name='Stationery',                              updated_at=NOW() WHERE id=191;
UPDATE acc_coa_level4s SET name='Electric Bill',                           updated_at=NOW() WHERE id=207;
UPDATE acc_coa_level4s SET name='Income from Guest Room Rent',             updated_at=NOW() WHERE id=333; -- HOTEL_ROOM_RENT_INCOME
UPDATE acc_coa_level4s SET name='Advance A/c',                             updated_at=NOW() WHERE id=336; -- HOTEL_ADVANCE_BOOKING
UPDATE acc_coa_level4s SET name='Other Income',                            updated_at=NOW() WHERE id=339; -- HOTEL_OTHER_INCOME
UPDATE acc_coa_level4s SET name='Furniture & Fixture',                     updated_at=NOW() WHERE id=346;
UPDATE acc_coa_level4s SET name='Acc. Depreciation - Furniture & Fixture', updated_at=NOW() WHERE id=347;
UPDATE acc_coa_level4s SET name='Acc. Depreciation - Office Equipment',    updated_at=NOW() WHERE id=351;

COMMIT;

-- যাচাই
SELECT id, name FROM acc_coa_level1s WHERE id IN (1,2);
SELECT id, name FROM acc_coa_level2s WHERE id IN (1,6,7,8,10,13);
SELECT id, name, acc_source_id FROM acc_coa_level3s WHERE id IN (1,2,16,20,21,35,52);
SELECT id, name, sku_code FROM acc_coa_level4s
 WHERE id IN (12,13,14,17,39,127,132,146,148,191,207,333,336,339,346,347,351);

-- ---------------------------------------------------------------------------
-- ROLLBACK (আগের নামে ফেরাতে হলে)
-- ---------------------------------------------------------------------------
-- UPDATE acc_coa_level1s SET name='Assets'      WHERE id=1;
-- UPDATE acc_coa_level1s SET name='Liabilities' WHERE id=2;
-- UPDATE acc_coa_level2s SET name='Current Assets'                    WHERE id=1;
-- UPDATE acc_coa_level2s SET name='Direct Income'                     WHERE id=6;
-- UPDATE acc_coa_level2s SET name='Indirect Income'                   WHERE id=7;
-- UPDATE acc_coa_level2s SET name='Direct Expense'                    WHERE id=8;
-- UPDATE acc_coa_level2s SET name='Others Expense'                    WHERE id=10;
-- UPDATE acc_coa_level2s SET name='Administrative & General Expenses' WHERE id=13;
-- UPDATE acc_coa_level3s SET name='Cash'                WHERE id=1;
-- UPDATE acc_coa_level3s SET name='Bank Account'        WHERE id=2;
-- UPDATE acc_coa_level3s SET name='Salary & Allowances' WHERE id=16;
-- UPDATE acc_coa_level3s SET name='Office & House Rent' WHERE id=20;
-- UPDATE acc_coa_level3s SET name='Paper & Periodical'  WHERE id=21;
-- UPDATE acc_coa_level3s SET name='Staff Loan'          WHERE id=35;
-- UPDATE acc_coa_level3s SET name='Fuel & Lubricate'    WHERE id=52;
-- UPDATE acc_coa_level4s SET name='Cash'                                 WHERE id=17;
-- UPDATE acc_coa_level4s SET name='Account Receivable'                   WHERE id=12;
-- UPDATE acc_coa_level4s SET name='Account Payable'                      WHERE id=13;
-- UPDATE acc_coa_level4s SET name='Capital Accounts'                     WHERE id=14;
-- UPDATE acc_coa_level4s SET name='Staff Loan'                           WHERE id=39;
-- UPDATE acc_coa_level4s SET name='Conveyance & Traveling'               WHERE id=127;
-- UPDATE acc_coa_level4s SET name='Bank Charge'                          WHERE id=132;
-- UPDATE acc_coa_level4s SET name='Office & House Rent'                  WHERE id=146;
-- UPDATE acc_coa_level4s SET name='Salary'                               WHERE id=148;
-- UPDATE acc_coa_level4s SET name='Stationary Items'                     WHERE id=191;
-- UPDATE acc_coa_level4s SET name='Electricity Bill'                     WHERE id=207;
-- UPDATE acc_coa_level4s SET name='Room Rent Income'                     WHERE id=333;
-- UPDATE acc_coa_level4s SET name='Advance Against Booking'              WHERE id=336;
-- UPDATE acc_coa_level4s SET name='Hotel Other Income'                   WHERE id=339;
-- UPDATE acc_coa_level4s SET name='Furniture & Fixtures'                 WHERE id=346;
-- UPDATE acc_coa_level4s SET name='Accumulated Depreciation — Furniture' WHERE id=347;
-- UPDATE acc_coa_level4s SET name='Accumulated Depreciation — Equipment' WHERE id=351;
