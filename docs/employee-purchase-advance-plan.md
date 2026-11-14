---
title: "কর্মচারীর ক্রয় অগ্রিম (Purchase Advance) — পরিকল্পনা"
---

**তারিখ:** ১৪ নভেম্বর ২০২৬
**অবস্থা:** ধাপ ১ বানানো হয়েছে (১৪ নভেম্বর ২০২৬), মালিকের সম্মতিতে, §৩-এর ধরে নেওয়া পাঁচটা মান অনুযায়ী। যাচাই আর পরিকল্পনা থেকে যেখানে সরা হয়েছে, তা §১২-তে।

## ১. কী চাওয়া হয়েছে

1. কর্মচারীকে হোটেলের পণ্য কেনার জন্য **অগ্রিম** টাকা দেওয়া হবে।
2. সে পণ্য কিনে ভাউচার (দোকানের মেমো) জমা দেবে। সেটা **পণ্য ক্রয়** হিসেবে এন্ট্রি হবে আর ওই কর্মচারীর অগ্রিমের সঙ্গে সমন্বয় হবে।
3. ক্রয় অগ্রিমের চেয়ে বেশি হলে বাড়তি টাকা কর্মচারীকে দিতে হবে; কম হলে সে বাকিটা ফেরত দেবে।
4. **এটা বেতনের বিপরীতে নেওয়া লোনের সঙ্গে কোনোভাবেই সমন্বয় হবে না।**

## ২. মূল সিদ্ধান্ত: লোন নয়, আলাদা হিসাব

লোন এখন থাকে `hrm_loan_master` / `hrm_loan_details` টেবিলে, নিজের খাতে; বেতন তৈরির সময় সেখান থেকেই কাটে। ক্রয় অগ্রিম থাকবে **নিজের খাতে আর নিজের টেবিলে**। লোনের কোনো কোড এই টেবিল পড়বে না, আর এই মডিউল লোনের টেবিল ছোঁবে না। ফলে দুটো মেশার কোনো পথই থাকে না; আলাদা করে আটকাতে হয় না।

## ৩. যে পাঁচটা বিষয়ে মালিকের উত্তর দরকার

উত্তর না পাওয়া পর্যন্ত নিচের "ধরে নেওয়া" অনুযায়ী পরিকল্পনা লেখা। কোনোটা বদলালে সংশ্লিষ্ট অংশ বদলাবে।

| # | প্রশ্ন | ধরে নেওয়া | বদলালে কী হবে |
| --- | --- | --- | --- |
| ১ | এক অগ্রিমে কয়টা ভাউচার? | **চলতি হিসাব।** কর্মচারীর একটাই balance; অগ্রিম তাতে যোগ হয়, প্রতিটা বিল তা থেকে কমে। কোন বিল কোন অগ্রিমের, তা আলাদা করে মেলানো হয় না। | প্রতিটা অগ্রিম আলাদা করে মেলাতে হলে টেবিলে "কোন অগ্রিমের বিপরীতে" ঘর আর স্ক্রিনে বাছাই লাগবে; কাজ প্রায় দেড় গুণ। |
| ২ | পুরনো অগ্রিম খোলা থাকলে নতুন অগ্রিম? | **দেওয়া যাবে, তবে সতর্ক করবে** ("এর কাছে ৩,২০০ টাকা খোলা আছে")। | আটকাতে চাইলে ব্রাঞ্চ সেটিংয়ে একটা সুইচ। |
| ৩ | কোন ক্রয়ে লাগবে? | **ধাপ ১:** Hotel → Accounts Transaction (খরচের জিনিস আর সম্পদ, দুটোই এই এক স্ক্রিনে)। **ধাপ ২:** সাধারণ Purchase Invoice। | শুধু হোটেল হলে ধাপ ২ বাদ। |
| ৪ | আসল দোকানের নাম রাখতে হবে? | **হ্যাঁ, লেখা হিসেবে।** বিলে "Bought from" ঘরে দোকানের নাম; supplier-এর খাতা খোলা হয় না, কারণ দোকান টাকা পেয়ে গেছে। | supplier তালিকা থেকে বাছতে চাইলে একটা dropdown যোগ। |
| ৫ | কর্মচারী চলে গেলে খোলা অগ্রিম? | **স্বয়ংক্রিয় কিছু নয়।** রিপোর্টে দেখাবে; ফেরত নেওয়া হাতে হাতে। বেতন থেকে কাটা হয় না। | শেষ বেতন থেকে কাটতে চাইলে সেটা আলাদা সিদ্ধান্ত ও আলাদা কাজ। |

## ৪. হিসাব (ledger)

নতুন একটা খাত: **Employee Purchase Advance** (সম্পদ, Current Asset)। সব কর্মচারীর অগ্রিম এই এক খাতে; কার কত, তা রাখে মডিউলের নিজের টেবিল (§৫)। লোনও এই ধরনে চলে: একটা খাত, কর্মচারী ধরে হিসাব টেবিলে।

| ধাপ | ঘটনা | Debit | Credit | ভাউচার |
| --- | --- | --- | --- | --- |
| ১ | কর্মচারীকে অগ্রিম ৫,০০০ | Employee Purchase Advance ৫,০০০ | Cash (বা Bank) ৫,০০০ | `2-` Payment |
| ২ | সে ৪,২০০ টাকার পণ্য কিনে মেমো দিল | খরচ/সম্পদের খাত ৪,২০০ | Employee Purchase Advance ৪,২০০ | `9-` (টাকা নড়েনি, তাই journal) |
| ৩-ক | বাকি ৮০০ ফেরত দিল | Cash ৮০০ | Employee Purchase Advance ৮০০ | `1-` Received |
| ৩-খ | অথবা কিনেছিল ৫,৬০০; ৬০০ তাকে দেওয়া হলো | Employee Purchase Advance ৬০০ | Cash ৬০০ | `2-` Payment |

- কর্মচারীর balance **debit** (ধনাত্মক) মানে তার হাতে প্রতিষ্ঠানের টাকা আছে; **credit** (ঋণাত্মক) মানে প্রতিষ্ঠান তার কাছে দেনা।
- **নতুন কোনো ভাউচার কোড নয়।** পুরনো `1-`, `2-`, `9-`-ই ব্যবহার হবে (Production-এর সিদ্ধান্তের মতোই), যাতে Cash Book, Ledger আর Trial Balance কিছু না শিখেই ঠিক দেখায়।
- ধাপ ২-এর বিল `9-` কেন: এই স্ক্রিনে নগদ/ব্যাংকের ক্রয় `4-`, আর যে ক্রয়ে টাকা নড়ে না সেটা `9-`। অগ্রিম থেকে কেনায় সেই দিন till থেকে টাকা যায় না (টাকা গেছে অগ্রিম দেওয়ার দিন), তাই এটা journal।

### একটা জিনিস আগে ঠিক করতে হবে

`9-`-এর নাম "Credit Purchase", আর Daily Account Book একে "Today Due Purchase"-এ দেখায়। কিন্তু অগ্রিম থেকে কেনা বিল কারও কাছে **বাকি নয়**। তাই Daily Account Book-এ এই বিলের জন্য আলাদা ভাগ লাগবে ("Purchase from employee advance"), নইলে দিনের বাকির অঙ্ক ভুল দেখাবে। Purchase Ledger-এও এই সারিতে "বাকি" না দেখিয়ে "অগ্রিম থেকে" লিখতে হবে। এটা ধাপ ১-এর কাজের মধ্যে ধরা আছে (§৮)।

## ৫. ডেটা

একটাই নতুন টেবিল। প্রতিটা সারি একটা নড়াচড়া, আর প্রতিটা সারির পেছনে একটা ভাউচার থাকে।

```sql
CREATE TABLE IF NOT EXISTS `employee_purchase_advances` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id`  BIGINT UNSIGNED NOT NULL,
  `branch_id`   BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,           -- hrm_employees.id
  `main_trx_id` BIGINT UNSIGNED NOT NULL,           -- যে ভাউচার এটা লিখেছে
  `kind`        VARCHAR(12)     NOT NULL,           -- advance | bill | refund | topup
  `given`       DECIMAL(16,2)   NOT NULL DEFAULT 0, -- কর্মচারীর হাতে গেল (advance, topup)
  `used`        DECIMAL(16,2)   NOT NULL DEFAULT 0, -- হাত থেকে বেরোল (bill, refund)
  `bought_from` VARCHAR(191)    NULL,               -- দোকানের নাম (bill-এ)
  `note`        VARCHAR(255)    NULL,
  `created_by`  BIGINT UNSIGNED NULL,
  `created_at`  TIMESTAMP       NULL,
  PRIMARY KEY (`id`),
  KEY `epa_employee_idx` (`company_id`, `branch_id`, `employee_id`),
  KEY `epa_voucher_idx` (`main_trx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Balance = SUM(given) − SUM(used)**, শুধু যেসব সারির ভাউচার live (`main_trx_master.status = 1`)। ভাউচার মুছলে সারি মোছা হয় না; balance নিজে থেকেই ঠিক হয়ে যায়, আর Recycle Bin থেকে ফেরালে আবার গোনা হয়।
- **খাতটা নাম দিয়ে নয়, চিহ্ন দিয়ে খোঁজা হবে:** `acc_coa_level4s.sku_code = 'EMP_PURCHASE_ADVANCE'` (হোটেল আর Production-এর খাত যেভাবে খোঁজা হয়)। হিসাবরক্ষক নাম বদলালেও কাজ করবে।
- **নিয়ম অনুযায়ী:** SQL একটা ফাইলে (`database/sql/2026_11_xx_employee_purchase_advance.sql`), আর একই জিনিস `AddUnitTypeToBuildingUnits`-এ method হিসেবে; নতুন artisan command নয়। দুবার চালালেও ক্ষতি নেই।

## ৬. স্ক্রিন

### ৬-ক. নতুন স্ক্রিন: Purchase Advance

মেনু: HRM-এর নিচে, Employee Loan-এর পাশে। (হোটেলের মেনুতেও একই স্ক্রিনের লিংক রাখা যায়।)

- **উপরে তালিকা:** প্রতিটা কর্মচারী, তার খোলা balance, শেষ অগ্রিমের তারিখ, কত দিন ধরে খোলা। ঋণাত্মক balance (প্রতিষ্ঠান দেনা) আলাদা রঙে।
- **Give advance:** কর্মচারী, তারিখ, টাকা, Cash নাকি Bank (Bank হলে কোন account), Note। সেভ করার আগে খোলা balance থাকলে সতর্কবার্তা।
- **Settle:** কর্মচারী বাছলে balance দেখায়। ধনাত্মক হলে "Receive back" (টাকা ফেরত নেওয়া), ঋণাত্মক হলে "Pay the difference" (বাড়তি টাকা দেওয়া)। অঙ্ক নিজে থেকে balance-এর সমান বসে, কমানো যায় (আংশিক ফেরত), বাড়ানো যায় না।
- **Statement:** একজন কর্মচারীর সব নড়াচড়া তারিখ ধরে: অগ্রিম, বিল (দোকানের নামসহ), ফেরত, চলতি balance। প্রিন্ট করা যায়। সারিতে ক্লিক করলে ভাউচার খোলে।

### ৬-খ. Hotel → Accounts Transaction-এ একটা নতুন পছন্দ (ধাপ ১)

এই স্ক্রিনে এখন টাকা কীভাবে গেল তার তিনটা পছন্দ আছে: **Cash, Bank, Credit**। চতুর্থ একটা যোগ হবে: **Employee advance**।

- বাছলে দুটো ঘর আসে: **Employee** (dropdown, পাশে তার খোলা balance) আর **Bought from** (দোকানের নাম, লেখা)।
- বাকি স্ক্রিন যেমন আছে তেমন: item, quantity, rate, খরচ নাকি সম্পদ। stock আর সম্পদের register আগের মতোই লেখা হয়।
- বিল অগ্রিমের চেয়ে বেশি হলে **আটকায় না**; balance ঋণাত্মক হয়, আর স্ক্রিন বলে দেয় "এই বিলের পরে প্রতিষ্ঠান তার কাছে ৬০০ টাকা দেনা থাকবে"।
- সার্ভারে এটা `resolvePayment`-এর চতুর্থ শাখা: journal master, credit যায় Employee Purchase Advance খাতে, আর টেবিলে একটা `bill` সারি।

### ৬-গ. সাধারণ Purchase Invoice (ধাপ ২)

একই পছন্দ সাধারণ ক্রয়ের ফর্মেও। নিয়ম অনুযায়ী পুরনো ফর্ম বদলানো হয় না; তাই এটা আলাদা সিদ্ধান্ত: পুরনো ফর্মে একটা ঘর যোগ করার অনুমতি, নাকি নতুন ফর্ম। হোটেলের চাহিদা ধাপ ১-এই মিটে যায়, তাই এটা পরে।

## ৭. নিয়ম ও বাধা

| নিয়ম | কীভাবে |
| --- | --- |
| লোনের সঙ্গে না মেশা | আলাদা খাত, আলাদা টেবিল। বেতন তৈরি আর Loan Balance শুধু `hrm_loan_*` পড়ে; এই মডিউল সেগুলো ছোঁয় না। পরীক্ষা: খোলা অগ্রিম থাকা কর্মচারীর বেতন আগে-পরে হুবহু এক। |
| খাতে সরাসরি এন্ট্রি বন্ধ | Employee Purchase Advance খাত Cash Payment, Journal ইত্যাদির dropdown থেকে বাদ। সরাসরি এন্ট্রি হলে খাতের balance আর টেবিলের যোগফল মিলবে না; Statement স্ক্রিন দুটো মিলিয়ে দেখায় আর না মিললে লাল সতর্কতা দেয়। |
| ভাউচার সংশোধন | অগ্রিম, ফেরত আর বাড়তি দেওয়ার ভাউচার এই স্ক্রিন থেকেই সংশোধন হয়; Cash Payment/Received স্ক্রিন থেকে নয় (সেখান থেকে খুললে "Purchase Advance স্ক্রিন থেকে সংশোধন করুন")। বিল সংশোধন Accounts Transaction-এর নিয়মে (এখন ওই স্ক্রিনের বিল edit হয় না, মুছে আবার লিখতে হয়)। |
| ভাউচার মোছা | মোছা যায়; balance নিজে থেকে ঠিক হয় (§৫)। |
| অন্য শাখা | কর্মচারী আর ভাউচার একই শাখার হতে হবে; সার্ভারে পরীক্ষা। |
| বন্ধ বছর | বন্ধ করা বছরের তারিখে কোনো এন্ট্রি নয় (বাকি সব ভাউচারের মতোই, `VoucherSerial` নিজে আটকায়)। |
| Permission | নতুন দুটো: `purchase.advance.view` (তালিকা, statement) আর `purchase.advance.create` (দেওয়া, সমন্বয়)। Patch-এ Owner ও Administrator-কে দেওয়া হয়, নইলে কেউ পাবে না। |

## ৮. রিপোর্টে প্রভাব

| রিপোর্ট | কী হবে | কাজ লাগবে? |
| --- | --- | --- |
| Cash Book | অগ্রিম দেওয়া (`2-`), ফেরত (`1-`) আর বাড়তি দেওয়া (`2-`) নিজে থেকেই আসে। বিল আসে না, কারণ সেদিন নগদ নড়েনি। | না |
| Ledger, Trial Balance, Balance Sheet | Employee Purchase Advance খাত সম্পদ হিসেবে দেখায়; মোট = সব কর্মচারীর খোলা balance। | না |
| P&L | খরচ ধরা হয় **বিল এন্ট্রির দিন**, অগ্রিম দেওয়ার দিন নয়। মাসের শেষে খোলা অগ্রিম খরচে যায় না, সম্পদে থাকে। | না |
| Daily Account Book | বিলের জন্য নতুন ভাগ, নইলে "Today Due Purchase"-এ পড়ে (§৪)। | **হ্যাঁ** |
| Purchase Ledger | বিলের সারিতে "বাকি" নয়, "Employee advance: নাম"। | **হ্যাঁ** |
| Loan Balance, Loan Ledger, বেতন | কিছুই বদলায় না। | না |

## ৯. কাজের ধাপ

| ধাপ | কাজ | শেষের প্রমাণ |
| --- | --- | --- |
| ১ | টেবিল, খাত, permission (SQL ফাইল + patch command); Purchase Advance স্ক্রিন (দেওয়া, সমন্বয়, তালিকা, statement); Accounts Transaction-এ "Employee advance"; Daily Account Book ও Purchase Ledger-এর দুটো বদল; help topic | §১০-এর সব পরীক্ষা পাস |
| ২ | সাধারণ Purchase Invoice-এ একই পছন্দ | আলাদা সম্মতির পরে |
| ৩ (ঐচ্ছিক) | খোলা অগ্রিমের সীমা, অনুমোদন, পুরনো অগ্রিমের সতর্কতা dashboard-এ | চাহিদা এলে |

## ১০. গ্রহণযোগ্যতার পরীক্ষা (ধাপ ১)

আলাদা test শাখায়, rollback করা যায় এমনভাবে।

1. অগ্রিম ৫,০০০ → balance ৫,০০০; ledger Dr Advance / Cr Cash; Cash Book-এ `2-` সারি।
2. ৪,২০০ টাকার বিল (খরচের জিনিস) → balance ৮০০; ledger Dr খরচ / Cr Advance; stock-এ পরিমাণ যোগ; Cash Book-এ কোনো সারি নয়।
3. ফেরত ৮০০ → balance ০; ledger Dr Cash / Cr Advance।
4. অগ্রিম ৫,০০০, বিল ৫,৬০০ → balance −৬০০; "Pay the difference" ৬০০ → balance ০।
5. একই কর্মচারীর খোলা লোন থাকলে: Loan Balance আর বেতনের অঙ্ক আগে-পরে হুবহু এক; লোনের টেবিলে নতুন সারি নেই।
6. বিল মুছলে balance আগের জায়গায় ফেরে; Recycle Bin থেকে ফেরালে আবার কমে।
7. খাতের ledger balance = টেবিলের যোগফল, প্রতিটা ধাপের পরে।
8. সম্পদের বিল (যেমন ২টা চেয়ার) → register-এ ২ সারি, credit যায় Advance খাতে।
9. Trial Balance মেলে; Balance Sheet-এ খোলা অগ্রিম সম্পদে।
10. Daily Account Book-এ বিল নতুন ভাগে, "Today Due Purchase"-এ নয়।
11. Permission ছাড়া বা অন্য শাখার কর্মচারী দিয়ে API প্রত্যাখ্যান।
12. টেবিল বা খাত নেই এমন DB-তে Accounts Transaction আগের তিন পছন্দে আগের মতোই চলে।

## ১১. যা এই পরিকল্পনায় নেই

- বেতন থেকে অগ্রিম কাটা (মালিকের শর্ত: লোনের সঙ্গে মিলবে না; বেতনের ক্ষেত্রে সিদ্ধান্ত বাকি, §৩ #৫)।
- এক কর্মচারীর অগ্রিম অন্য কর্মচারীর নামে সরানো।
- অগ্রিমের অনুমোদন (approval) ধাপ।
- মোবাইল অ্যাপ।

## ১২. ধাপ ১: যা বানানো হলো (১৪ নভেম্বর ২০২৬)

### কোথায় কী

| Repo | ফাইল | কী |
| --- | --- | --- |
| API | `app/Services/PurchaseAdvance/PurchaseAdvance.php` | খাত (চিহ্ন `EMP_PURCHASE_ADVANCE`), balance, সারি লেখা |
| API | `app/Http/Controllers/PurchaseAdvance/PurchaseAdvanceController.php` | তালিকা, statement, অগ্রিম দেওয়া, সমন্বয় |
| API | `app/Http/Controllers/Hotel/AssetPurchaseController.php` | চতুর্থ পছন্দ `advance` |
| API | `app/Services/Reports/DailyAccountBook.php` | নতুন ভাগ PURCHASE FROM EMPLOYEE ADVANCE |
| API | `app/Helpers/helpers.php` | `purchaseAdvanceRefusal()`: Cash Payment/Received থেকে সংশোধন বন্ধ |
| API | `database/sql/2026_11_14_employee_purchase_advance.sql`, `AddUnitTypeToBuildingUnits` | টেবিল আর দুটো permission |
| API | `routes/api.php` | `/api/purchase-advance/list`, `/statement`, `/give`, `/settle` |
| React | `src/components/modules/purchase-advance/PurchaseAdvance.tsx` | নতুন স্ক্রিন, `/accounts/purchase-advance` |
| React | `src/components/modules/hotel/assets/HotelAssetPurchase.tsx` | Payment Details-এ "Advance" |
| React | Sidebar, route, help | Transaction মেনুতে Employee Loan-এর নিচে; help topic `purchase-advance` |

### পরিকল্পনা থেকে যেখানে সরা হয়েছে

| পরিকল্পনায় ছিল | যা হয়েছে | কেন |
| --- | --- | --- |
| অগ্রিম দেওয়ার সময় তারিখ দেওয়া যাবে (§৬-ক) | তারিখের ঘর নেই; সব এন্ট্রি ব্রাঞ্চের লেনদেনের তারিখে | হোটেলের Payment Entry আর Accounts Transaction একই নিয়মে চলে; আলাদা তারিখ দিলে বন্ধ করা দিনে এন্ট্রি ঢুকত |
| ভাউচার এই স্ক্রিন থেকে সংশোধন (§৭) | সংশোধন নেই; Voucher Delete দিয়ে মুছে আবার এন্ট্রি | Accounts Transaction-এর বিলও এভাবেই চলে; মুছলে balance নিজে থেকে ঠিক হয় |
| খাত patch-এ তৈরি হবে (§৫) | খাত তৈরি হয় প্রথম অগ্রিম দেওয়ার সময় | যে কোম্পানি এটা ব্যবহার করে না, তার chart-এ নতুন খাত ঢোকে না |
| Purchase Ledger-এ বদল (§৪, §৮) | করা হয়নি | Accounts Transaction-এর বিল Purchase Ledger-এ আসেই না (ওটা সাধারণ Purchase Invoice-এর রিপোর্ট); বদলের কিছু নেই |
| খাত সব dropdown থেকে বাদ (§৭) | শুধু Accounts Transaction-এর Credit-এ এই খাত বাছা আটকানো | অন্য স্ক্রিনের dropdown ছোঁয়া হয়নি; সরাসরি এন্ট্রি হলে স্ক্রিনের লাল সতর্কতা তা ধরে |
| Statement প্রিন্ট (§৬-ক) | Statement এখন পূর্ণ **Ledger** (১৪ নভেম্বর): From/To, Opening Balance, Debit/Credit, মোট ও Closing Balance, বিলের পণ্যের তালিকা, আর প্রিন্ট (পণ্যের তালিকাসহ বা ছাড়া) | মালিকের অনুরোধ |
| Permission Owner ও Administrator-কে (§৭) | যাদের `hrm.loan.create` বা `hotel.accounts.transaction.create` আছে, তারা পায় | একই মানুষ এই কাজ করেন; patch-এর চালু ব্যবস্থাটাই ব্যবহার করা হয়েছে |

### যাচাই

`stagingdatabase`, branch 2। আসল controller চালিয়ে, এক transaction-এর ভিতরে, শেষে rollback। টেবিল আর দুটো permission schema হিসেবে থেকে গেছে।

| # | পরীক্ষা | ফল |
| --- | --- | --- |
| ১ | অগ্রিম ৫,০০০ | `2-260900008`, Dr Advance / Cr Cash, balance ৫,০০০; খাত প্রথম ব্যবহারে নিজের group-এ তৈরি |
| ২ | ৪,২০০ টাকার বিল (খরচের জিনিস) | `9-260900006`, Dr খরচের খাত / Cr Advance, নগদের কোনো leg নেই, balance ৮০০ |
| ৩ | ৮০০ ফেরত | `1-` receipt, Dr Cash / Cr Advance, balance ০ |
| ৪ | অগ্রিম ৫,০০০, বিল ৫,৬০০ | balance −৬০০; ৭০০ দিতে গেলে আটকায়; ৬০০ দিলে `2-`, balance ০ |
| ৫ | লোনের টেবিল | আগে-পরে হুবহু এক (এই DB-তে কোনো লোন নেই, তাই শুধু "নতুন সারি পড়েনি" দেখা গেছে) |
| ৬ | বিল মোছা ও ফেরানো | মুছলে ৫,৬০০ হাতে ফেরে; ফেরালে আবার ০ |
| ৭ | খাতের ledger = সারির যোগফল | মেলে; তালিকা আর statement একই balance দেখায় |
| ৮ | ২টা সম্পদ @১,৫০০ | register-এ ২ সারি, Cr Advance ৩,০০০ |
| ৯ | সব ভাউচার balanced | হ্যাঁ |
| ১০ | Daily Account Book | বিল PURCHASE FROM EMPLOYEE ADVANCE-এ, Today Due Purchase-এ নয় |
| ১১ | প্রত্যাখ্যান | Cash Payment থেকে সংশোধন, অন্য শাখার কর্মচারী, ভুল ব্যাংক, permission ছাড়া: চারটাই আটকায় |
| ১২ | পুরনো তিন পছন্দ | নগদ বিল আগের মতোই `4-`, অগ্রিমের কোনো সারি পড়ে না |

মোট ২৪টা পরীক্ষা পাস। Production-এর আগের তিন দফাও (১৬ + ২২ + ২৮) আবার পাস। Frontend build exit 0, `help:check` পাস (২৭৪ বিষয়)।

**যাচাই হয়নি:**

- কোনো স্ক্রিন ব্রাউজারে খুলে দেখা হয়নি।
- বেতন তৈরি চালিয়ে দেখা হয়নি; লোনের টেবিল না ছোঁয়াটাই প্রমাণ (কোড এই টেবিল পড়ে না)।
- Bank দিয়ে অগ্রিম দেওয়া আর ফেরত নেওয়া চালানো হয়নি (staging-এ ভুল ব্যাংক আটকানো দেখা হয়েছে, সঠিক ব্যাংকে save নয়)।
- staging-এর branch 2-এ কোনো কর্মচারী ছিল না; পরীক্ষার জন্য একজনকে সাময়িকভাবে ওই শাখায় আনা হয়েছিল (rollback করা)।
