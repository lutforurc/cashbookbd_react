# ভাউচার নম্বর duplicate — বিশ্লেষণ ও কর্মপরিকল্পনা

**তারিখ:** ২০২৬-০৮-০৮
**অবস্থা:** তদন্ত সম্পূর্ণ, কোড পরিবর্তন শুরু হয়নি (ব্যবহারকারীর অনুমতির অপেক্ষায়)
**সংশ্লিষ্ট রিপোজিটরি:** `F:\All_Database\www\cashbook_api` (ব্রাঞ্চ `Lutfor`)
**পরীক্ষিত ডেটাবেস:** `aftradingdb`

---

## ১. সমস্যার বিবরণ

ভাউচার নম্বর দিয়ে সার্চ করলে সমস্যা হচ্ছে — একই নম্বর একাধিক ভাউচারে পাওয়া যাচ্ছে, এবং সার্চ ধীর।

প্রাথমিক পর্যবেক্ষণ ছিল: নগদ বিক্রি ও বাকী বিক্রি — দুটোতেই `3-260800001` ধরনের একই নম্বর আসে। ক্রয়ের ক্ষেত্রে `4-260800001`।

### ভাউচার নম্বরের গঠন

```
3   -   2608      00001
│       │         └── ক্রমিক (vr_sl), ৫ অঙ্ক
│       └── বছর+মাস (ym)
└── ভাউচার টাইপ (acc_vr_type.id)
```

তৈরি হয় `main_trx_master` টেবিলে, `vr_no` কলামে।

---

## ২. মূল কারণ (নিশ্চিত)

`main_trx_master` টেবিলের সংজ্ঞায়:

```sql
`status` int(3) NOT NULL COMMENT '1 is active 0 is recycle and 2 permanent delete'
```

আর প্রতিটা নম্বর-জেনারেটরে:

```php
$mxVrNo = MainTransactionMaster::where('company_id', ...)->where('branch_id', ...)
    ->where('status', 1)                    // ← সমস্যা এখানে
    ->whereBetween('vr_date', [$firstDate, $lastDate])
    ->where('transaction_type', $transactionType)
    ->orderBy('vr_sl', 'desc')->first();

$vrSlNo = isset($mxVrNo['vr_sl']) == null ? 1 : $mxVrNo['vr_sl'] + 1;
```

**কোনো ভাউচার recycle (status=0) বা delete (status=2) করলে সে আর গোনায় থাকে না। ফলে তার ক্রমিক নম্বরটি খালি হয়ে যায় এবং পরের ভাউচার ঠিক সেই নম্বরটিই পেয়ে যায়।**

ডেটাতেও এর ছাপ স্পষ্ট — duplicate নম্বরগুলো এলোমেলো নয়, পরপর গুচ্ছ আকারে:

```
1-260600123, 1-260600124, 1-260600125 ... 1-260600134
```

অর্থাৎ একদিনে একগুচ্ছ ভাউচার recycle করা হয়েছিল, তারপর পরের ভাউচারগুলো সেই নম্বরগুলোই আবার নিয়েছে।

### বিস্তার

মোট **২৮টি** জায়গায় ভাউচার নম্বর তৈরি হয় (helpers-এ ৪টি, বাকিগুলো কন্ট্রোলার ও সার্ভিসে ছড়ানো)। এর মধ্যে **২৫টিতে** এই `status` ফিল্টার রয়েছে।

<details>
<summary>২৮টি জেনারেটরের তালিকা (app/ থেকে আপেক্ষিক পথ)</summary>

```
Helpers/helpers.php:777
Helpers/helpers.php:811
Helpers/helpers.php:856
Helpers/helpers.php:1929
Http/Controllers/Asset/AssetIssueController.php:197
Http/Controllers/Asset/AssetReceiveController.php:245
Http/Controllers/CommonFunction/Transaction.php:48
Http/Controllers/Inventory/CylinderTransactionController.php:205
Http/Controllers/Inventory/LabourController.php:232
Http/Controllers/Inventory/PurchaseController.php:272
Http/Controllers/Inventory/PurchaseWithCylinderController.php:330
Http/Controllers/Inventory/SalesController.php:377
Http/Controllers/Inventory/SalesWithCylinderController.php:445
Http/Controllers/Inventory/TradingPurchaseController.php:543
Http/Controllers/Inventory/TradingSalesController.php:467
Http/Controllers/Party/PartyController.php:1087
Http/Controllers/Products/ItemUploadController.php:1035
Http/Controllers/Requisition/RequisitionController.php:374
Http/Controllers/Tourism/TourismVisitorController.php:262
Http/Controllers/Tourism/VisaController.php:397
Http/Controllers/Transaction/BankPaymentController.php:211
Http/Controllers/Transaction/BankReceivedController.php:252
Http/Controllers/Transaction/JournalController.php:206
Http/Controllers/Transaction/PaymentController.php:227
Http/Controllers/Transaction/ReceivedController.php:753
Http/Controllers/Transaction/ReceivedController.php:866
Http/Utils/Tourism.php:276
Services/Installment/InstallmentDetailsService.php:414
```

</details>

---

## ৩. পরিমাপ (`aftradingdb`)

| বিষয় | ফল |
|---|---|
| মোট ভাউচার | ৬,৩২৫ |
| duplicate গুচ্ছ (company 1, branch 1) | ৪৩ (প্রতিটি ঠিক ২টি করে) |
| কোম্পানি সংখ্যা | ১ |
| ব্রাঞ্চ সংখ্যা | ১ |
| `company_id` NULL সারি | ০ |
| একাধিক কোম্পানিতে ভাগ হওয়া ব্রাঞ্চ | ০ |

### ব্যবহৃত prefix

| prefix | অর্থ (`acc_vr_type`) | সংখ্যা |
|---|---|---|
| 2 | Cash Payment | ২,০০১ |
| 3 | Sales Invoice | ১,৫২৭ |
| 4 | Purchase Invoice | ১,৫২২ |
| 1 | Cash Receipt | ১,১৬৮ |
| 5 | Journal Voucher | ১০৭ |

`acc_vr_type`-এ ২২টি টাইপ থাকলেও ডেটায় কেবল এই ৫টিই ব্যবহৃত হয়েছে।

---

## ৪. আনুষঙ্গিক আবিষ্কার

### ৪.১ `vr_no`-তে কোনো ইনডেক্স নেই

`main_trx_master`-এ ইনডেক্স আছে তিনটি — `(status, vr_date)`, `(branch_id, vr_date, status)`, `(combined_number)`। **`vr_no`-তে একটিও নেই।**

ফলে ভাউচার নম্বর দিয়ে সার্চ করলে প্রতিবার পুরো টেবিল স্ক্যান হয়। "সার্চে সমস্যা" অভিযোগের একটি বড় অংশ duplicate নয়, নিছক ধীরগতি।

### ৪.২ VoucherModification সরাসরি prefix বদলায়

`Http/Controllers/VoucherModification/VoucherModificationController.php:96-98`

```php
$mainTransaction->vr_no = $voucherChangeType . '-' . $voucherTypes[1];
$mainTransaction->save();
```

ভাউচার রূপান্তরের সময় শুধু সামনের সংখ্যাটি বদলে দেয়, **পুরোনো ক্রমিক নম্বরটি রেখে দেয়** — নতুন ক্রমিক নেয় না। লক্ষ্য নম্বরটি আগে থেকে কারও দখলে থাকলে সেখানেই duplicate জন্মায়। এটি কাউন্টারকে পাশ কাটানোর একমাত্র পথ।

### ৪.৩ prefix আর কাউন্টারের key আলাদা

`apiMainTransactionMaster($transactionType, $voucherType)` — `Helpers/helpers.php:836`

- prefix বসে `$voucherType` থেকে
- কিন্তু ক্রমিক গোনা হয় `transaction_type` দিয়ে
- আর insert-এ `'voucher_type' => null` বসানো হয় (line 867) — অর্থাৎ যে ফিল্ড দিয়ে নম্বর তৈরি, সেটাই সংরক্ষিত হয় না

এর ফলে Sales Invoice (prefix 3) আর Cash Receipt (prefix 1) একই কাউন্টার শেয়ার করে, তাই প্রতিটি সিরিজে ফাঁক পড়ে:

| ক্রম | কাজ | vr_no |
|---|---|---|
| ১ | বিক্রি | 3-260800001 |
| ২ | নগদ প্রাপ্তি | 1-260800002 |
| ৩ | বিক্রি | 3-260800003 |

বিক্রির সিরিজ দাঁড়ায় ১, ৩, ৫… — অটুট নয়।

### ৪.৪ দুটি ভিন্ন নম্বর-স্কেল একই নামে

| মান | `acc_vr_type` | `acc_transaction_master.voucher_type_id` |
|---|---|---|
| 1 | Cash Receipt | Cash |
| 2 | Cash Payment | Bank |
| 3 | Sales Invoice | Journal |
| 4 | Purchase Invoice | Non-Accounts |

`acc_transaction_master.voucher_type_id` কলামটি `acc_vr_type`-কে পয়েন্ট **করে না** — কোনো FK নেই, শুধু একটি কমেন্ট। অথচ নামটি পড়ে কোডও ধরে নেয় এটি `acc_vr_type.id`।

এই বিভ্রান্তি থেকে ইতিমধ্যেই বাস্তব বাগ তৈরি হয়েছে:

- `Inventory/WarehouseTransferController.php:95` — `$voucherType = 4` বসানো হয়েছে "4 Non Accounts Transaction" মনে করে, অথচ `acc_vr_type`-এ 4 = Purchase Invoice
- `Inventory/MaterialIssueController.php:28` — একই ভুল
- `Transaction::mainTransactionMaster($branchId, $transactionType, $voucherType)` সিগনেচার, কিন্তু `WarehouseTransferController` ও `SalesReturnController` আর্গুমেন্ট **উল্টো ক্রমে** পাঠায়

### ৪.৫ ছোটখাটো

- `Http/Utils/Tourism.php:244` — prefix-এ `date('ym')` (সিস্টেমের আজকের তারিখ) ব্যবহার করে, অথচ `vr_date` বসে day-close তারিখ। দুটি ভিন্ন মাস হলে নম্বর আর মাস মিলবে না।
- `Asset/AssetIssueController.php` ও `AssetReceiveController.php` — `date('Y-m-d')` ব্যবহার করে ও `company_id` বসায় না।
- `Helpers/helpers.php`-এ `mainTransactionMasterByRequest` নামে **দুটি** ফাংশন (line 796 ও 1917), ভিন্ন signature। `function_exists` গার্ডের কারণে দ্বিতীয়টি কখনো রেজিস্টার হয় না — মৃত কোড।
- `main_trx_master.financial_year_id` কোডে সর্বত্র হার্ডকোড `1`।
- ২০টি জেনারেটর `company_id` ছাড়া গোনে, আর তাদের **১৪টি** সেভের সময় `company_id` লেখেই না।

---

## ৫. গৃহীত সিদ্ধান্ত

| # | সিদ্ধান্ত | কারণ |
|---|---|---|
| ১ | **পুরোনো duplicate গুলো renumber করা হবে না** | গ্রাহকের হাতে যাওয়া ছাপানো কাগজ ও অন্য ক্লায়েন্টের চালু ডেটা অক্ষত রাখতে হবে |
| ২ | **ভাউচার নম্বর অপরিবর্তনীয় থাকবে** | নম্বর ভাউচারের স্থায়ী পরিচয়; নগদ/বাকি তার পরিবর্তনশীল অবস্থা মাত্র |
| ৩ | **প্রতিটি টাইপের নিজস্ব অটুট সিরিজ** (Tally-র মতো) | নগদ ১,২,৩ / জার্নাল ১,২,৩ |
| ৪ | `UNIQUE (company_id, branch_id, vr_no)` **বাদ** | পুরোনো duplicate না সরিয়ে বসানো যায় না; বিকল্প হিসেবে counter টেবিল (ধাপ ৪) |
| ৫ | নতুন টাইপ 23=Credit Sales, 24=Credit Purchase — **স্থগিত** | সুবিধা মাত্র, বাগ ফিক্স নয় |
| ৬ | `acc_vr_type`-এর ১–২২ ক্রম বদলানো বা মুছে ফেলা **হবে না** | ৭, ৮, ৯, ১২, ১৩, ১৬, ২০, ২২ কন্ট্রোলারে হার্ডকোড করা আছে (যদিও এই ডেটাবেসে অব্যবহৃত) |
| ৭ | `company_id` ফিল্টার যোগ করা — **বাতিল** | ২০টির ১৪টি সেভের সময় `company_id` লেখে না, তাই ফিল্টার বসালে সিরিজ ১ থেকে শুরু হয়ে নতুন duplicate তৈরি হতো; আর কোনো ব্রাঞ্চ দুই কোম্পানিতে ভাগ না হওয়ায় লাভও নেই |

### ৫.১ বাতিল হওয়া প্রস্তাব: "বাকী → নগদ রূপান্তরে নম্বর বদল"

প্রস্তাব ছিল — বাকী বিক্রি `7-` দিয়ে শুরু হবে, পরে নগদে রূপান্তরিত হলে `3-` হয়ে যাবে।

বাতিলের কারণ: **এটি সিদ্ধান্ত ৩-কেই ভাঙে।** `7-` সিরিজের মাঝখান থেকে একটি নম্বর সরালে ওখানে ফাঁক পড়ে। Tally-ও এই সমস্যার সমাধান করে পরের সব ভাউচার renumber করে — যা সিদ্ধান্ত ১ ও ২-এর বিরোধী।

**বিকল্প ব্যবস্থা (কোডে ইতিমধ্যেই আছে):**

- গ্রাহক একই বসায় মত বদলালে → ভাউচার এডিট করে Received Amount বসান। নম্বর অপরিবর্তিত। `Inventory/TradingSalesController.php:628-633` ঠিক এটিই করে — একই `main_trx_id`-তে Credit ও Cash Received দুটি এন্ট্রি লেখে।
- টাকা পরে এলে → আলাদা আদায় ভাউচার (`1-`), যা ইনভয়েসকে reference করে।

বাড়তি লাভ: পার্টি অ্যাকাউন্ট ব্যবহার করলে গ্রাহকের লেজারে লেনদেনের ইতিহাস থেকে যায়; খাঁটি নগদ বিক্রিতে (account = 17) পার্টির নামই ওঠে না।

---

## ৬. কর্মপরিকল্পনা

### ধাপ ১ — ইনডেক্স (শুধু ডেটাবেস, কোড অপরিবর্তিত)

```sql
ALTER TABLE main_trx_master ADD INDEX idx_mtm_vr_no (vr_no);
```

ঝুঁকি নেই, দরকারে `DROP INDEX` দিয়ে ফিরিয়ে নেওয়া যায়।

### ধাপ ২ — আসল ফিক্স

২৫টি জেনারেটর থেকে শুধু এই লাইনটি বাদ:

```php
->where('status', 1)
```

ফাংশনের গঠন, প্যারামিটার, রিটার্ন — সব অপরিবর্তিত। পুরোনো ডেটায় একটি অক্ষরও বদলাবে না।

এরপর recycle করা ভাউচার তার নম্বর **ধরে রাখবে**, তাই রেজিস্টারে ১, ২, ৩, ৪ সবই থাকবে (একটি "বাতিল" চিহ্নিত) — ফাঁকও নেই, duplicate-ও নেই।

### ধাপ ৩ — VoucherModification

`VoucherModificationController.php:97`-এর সরাসরি prefix বদল বন্ধ করা।

**খোলা সিদ্ধান্ত:**

- **(ক)** রূপান্তরের সময় নম্বর অপরিবর্তিত থাকবে — *সুপারিশকৃত*, সিদ্ধান্ত ২-এর সাথে সঙ্গতিপূর্ণ
- **(খ)** নতুন সিরিজে নতুন ক্রমিক নেবে — পুরোনো সিরিজে ফাঁক পড়বে, সিদ্ধান্ত ৩-এর বিরোধী

### ধাপ ৪ — পরে, আলাদা সিদ্ধান্তে

২৮টি জেনারেটরকে একটি ফাংশনে আনা, সাথে একটি counter টেবিল:

```
voucher_counters (company_id, branch_id, voucher_type, period, last_no)
UNIQUE (company_id, branch_id, voucher_type, period)
```

ট্রানজেকশনের ভেতরে `SELECT ... FOR UPDATE` করে `last_no + 1`। প্রথমবার শুরুর মান বসবে `MAX(vr_sl)` থেকে — **status যাই হোক সব ধরে**।

এতে যা পাওয়া যাবে:

- পুরোনো ভাউচারের দিকে আর কখনো তাকাতে হবে না → পুরোনো duplicate অপ্রাসঙ্গিক
- একসাথে একাধিক ব্যবহারকারী সেভ করলেও নিরাপদ
- prefix ও কাউন্টারের key এক হবে (সিদ্ধান্ত ৩ পূর্ণাঙ্গভাবে পূরণ)
- `company_id` আপনাআপনি ঠিক জায়গায় বসবে (সিদ্ধান্ত ৭-এর কাজ এখানেই মিটবে)

---

## ৭. পুরোনো duplicate গুলো নিয়ে

ওগুলো থেকে যাবে। সমাধান ডেটাবেসে নয়, **পর্দায়** — সার্চের ফলাফলে ব্রাঞ্চ, তারিখ, ভাউচার টাইপ ও পার্টির নাম কলাম দেখালে একই নম্বরের দুটি সারি এলেও সহজে আলাদা করা যাবে।

মনে রাখতে হবে, দুই রকম "duplicate" আছে:

- **আসল duplicate** — দুটি ভিন্ন ভাউচারের একই নম্বর। ধাপ ২-এ সমাধান।
- **আপাত duplicate** — একই ভাউচারের একাধিক accounting সারি। `acc_transaction_master.main_trx_id`-তে UNIQUE নেই, আর আংশিক আদায়ে ইচ্ছাকৃতভাবেই দুটি সারি লেখা হয়। ডেটা ঠিকই আছে; রিপোর্ট কোয়েরিতে `GROUP BY m.id` না থাকলে দুইবার দেখায়।

---

## ৮. যাচাইয়ের কোয়েরি

```sql
-- আসল duplicate কতগুলো
SELECT company_id, branch_id, vr_no, COUNT(*) c
FROM main_trx_master
GROUP BY 1,2,3 HAVING c > 1 ORDER BY c DESC;

-- কোন prefix কতবার ব্যবহৃত
SELECT SUBSTRING_INDEX(vr_no,'-',1) AS prefix, COUNT(*) total
FROM main_trx_master GROUP BY 1 ORDER BY total DESC;

-- এক ভাউচারে একাধিক accounting সারি (আপাত duplicate)
SELECT m.vr_no, COUNT(a.id) c, GROUP_CONCAT(a.voucher_type_id) AS modes
FROM main_trx_master m
JOIN acc_transaction_master a ON a.main_trx_id = m.id
GROUP BY m.id HAVING c > 1 ORDER BY c DESC LIMIT 50;

-- company_id NULL আছে কিনা (অন্য ক্লায়েন্টের ডেটাবেসে চালানোর আগে)
SELECT COUNT(*) FROM main_trx_master WHERE company_id IS NULL;

-- কোনো ব্রাঞ্চ একাধিক কোম্পানিতে আছে কিনা
SELECT branch_id, COUNT(DISTINCT company_id) c
FROM main_trx_master GROUP BY branch_id HAVING c > 1;
```

---

## ৯. কাজ করার নিয়ম

- আলাদা ব্রাঞ্চে কাজ হবে, সরাসরি `main`/`react-main`-এ নয়
- **স্পষ্ট নির্দেশ ছাড়া commit বা push নয়**
- প্রতিটি ধাপ শেষে দেখিয়ে অনুমতি নিয়ে পরেরটিতে যাওয়া
- ডেটা মুছে ফেলা বা পুরোনো সারি বদলানো হবে না
- স্কিমা পরিবর্তন সরাসরি SQL-এ, migration-এ নয়

### যাচাই পদ্ধতি

একটি টেস্ট ভাউচার তৈরি → recycle → আরেকটি তৈরি → নম্বরটি আগেরটির পুনরাবৃত্তি হলো কিনা দেখা।
ফিক্সের আগে হবে, পরে হবে না।

---

## ১০. পরবর্তী পদক্ষেপ

১. ধাপ ১ ও ধাপ ২ শুরুর অনুমতি
২. ধাপ ৩-এর (ক)/(খ) সিদ্ধান্ত
