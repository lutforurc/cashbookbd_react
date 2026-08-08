# ব্যাংক অ্যাকাউন্টের ওপেনিং ব্যালেন্স — ডিজাইন নোট

**তারিখ:** ২০২৬-০৮-০৮
**অবস্থা:** বাস্তবায়িত (dev ডেটাবেসে যাচাই করা)
**সংশ্লিষ্ট রিপোজিটরি:** `F:\All_Database\www\cashbook_api` (ব্রাঞ্চ `Lutfor`), `F:\All_Database\cashbookbd_react` (ব্রাঞ্চ `Lutfor-Rahman`)
**পরীক্ষিত ডেটাবেস:** `aftradingdb`
**পূর্বসূত্র:** কাস্টমার ও প্রোডাক্টের ওপেনিং ব্যালেন্স ট্র্যাকিং — কমিট `35bf16c7` (API), `a0778a9` (React)

> নথিটি প্রথমে ডিজাইন নোট হিসেবে লেখা হয়েছিল, একটি সিদ্ধান্ত বাকি রেখে। সেই
> সিদ্ধান্ত এখন নেওয়া হয়েছে (§৪) এবং কাজটি করা হয়েছে; কী কী ফাইল হলো তা §১০-এ।

---

## ১. প্রেক্ষাপট — ব্যাংক আলাদা কোনো টেবিল নয়

এই সিস্টেমে ব্যাংক অ্যাকাউন্ট হলো `acc_coa_level4s` এর সারি, যেগুলো Chart of
Accounts Level 3 এর **"Bank Account"** গ্রুপের নিচে বসে। আলাদা কোনো ব্যাংক টেবিল
বা ব্যাংক মডেল নেই।

| বিষয় | মান |
| --- | --- |
| Bank Account গ্রুপ (level 3) | `id = 2` |
| বর্তমান ব্যাংক অ্যাকাউন্ট | ১৬টি |
| Cash গ্রুপ | `id = 1` · ১টি অ্যাকাউন্ট (coa4 17) |
| Mobile Banking গ্রুপ | `id = 28` · ০টি অ্যাকাউন্ট |
| ওপেনিং-এর বিপরীত খাত (contra) | coa4 `14` · Capital Accounts (level 3 = 27) |

`2` সংখ্যাটা নতুন কিছু নয় — `app/Http/Controllers/Reports/ReportsController.php`
এর ভেতরে ইতিমধ্যেই দশের বেশি জায়গায় "ব্যাংক মানে `acc_coa_level3_id = 2`" ধরে
নেওয়া আছে। কনভেনশনটা প্রতিষ্ঠিত, শুধু কোথাও কনফিগে লেখা নেই।

---

## ২. তুলনা — ব্যাংক কাস্টমারের মতো, প্রোডাক্টের মতো নয়

এটাই কাজটা সহজ হওয়ার মূল কারণ। ব্যাংকের ওপেনিং একটা নিছক লেজার এন্ট্রি — পরের
লেনদেনগুলো ওই ওপেনিং থেকে কিছু "খরচ" করে না। প্রোডাক্টের ওপেনিং স্টক করে, তাই
সেখানে ভারী গার্ড লেগেছিল।

| | কাস্টমার | প্রোডাক্ট | ব্যাংক |
| --- | --- | --- | --- |
| যে টেবিলে | `cust_party_infos` | `product_items` | `acc_coa_level4s` |
| অঙ্ক রাখার কলাম | আছে (`int`) | আছে (qty) | **নেই** |
| শাখাভিত্তিক (`branch_id`) | হ্যাঁ | হ্যাঁ | **না** |
| আবার Save করলে | একই ভাউচার, in-place | পুরনোটা trash, নতুন | একই ভাউচার, in-place |
| স্টক-ব্যবহৃত গার্ড | — | লাগে | **লাগে না** |
| Approval / branch গার্ড | লাগে | লাগে | লাগে |
| যত টেবিল ছোঁয় | ৩ | ৫ | ৩ |

অর্থাৎ ভাউচারের যে যন্ত্রটা কাস্টমারের জন্য লেখা হয়েছে, ব্যাংকে সেটা প্রায় হুবহু
চলবে — নম্বর তৈরি, dayclose তারিখ, দুই লাইনের ডেবিট-ক্রেডিট, in-place রিরাইট,
soft delete, approval ও branch গার্ড।

---

## ৩. তিনটি স্থির সিদ্ধান্ত

### ৩.১ স্কিমা — `main_trx_id` রাখুন, `openingbalance` রাখবেন না

কাস্টমারকে হুবহু নকল করার লোভ সামলান। ওখানে অঙ্কটা দুই জায়গায় আছে — কলামে আর
ভাউচারে — আর সেই দুটো যে বেমিল হতে পারে, সেটা ধরার জন্যই তো `main_trx_id` লাগল।
ব্যাংকে কলামটা এখনো নেই, তাই দ্বিতীয় সত্য উৎসটা *তৈরিই করবেন না*।

অঙ্ক পড়ুন ভাউচারের নিজের সারি থেকে। বাড়তি লাভ:
`acc_transaction_details.debit` হলো `decimal(12,2)` — কাস্টমারের `int(11)` এ যে
পয়সা কেটে যায়, সে সমস্যাটাই এখানে আসবে না।

### ৩.২ পরিধি — "ব্যাংক" নয়, "গ্রুপ" ধরে বানান

Cash (level 3 = 1) আর Mobile Banking (level 3 = 28) একই কাঠামো, একই অভাব। স্ক্রিনটা
level-3 গ্রুপের একটা তালিকা ধরে বানালে তিনটাই একসাথে হয়ে যাবে, বাড়তি পরিশ্রম প্রায়
শূন্য। গ্রুপের তালিকাটা যাবে `config/accounts.php` এ — যে ফাইলটা ওপেনিং contra
অ্যাকাউন্টের জন্য ইতিমধ্যে তৈরি হয়েছে।

### ৩.৩ কোড — ভাউচারের যন্ত্রটা আলাদা করুন

`app/Services/OpeningBalance/PartyOpeningBalanceService.php` এর প্রায় ৮০% হলো ভাউচার
প্লাম্বিং, যা party-নির্দিষ্ট কিছুই নয়। ওটুকু একটা `OpeningVoucher` ক্লাসে সরান;
তারপর party আর account — দুটোই পাতলা র‍্যাপার হবে। নতুন করে লেখার কিছু নেই, শুধু
ভাগ করার আছে।

---

## ৪. শাখার সিদ্ধান্ত — **পথ ক** (নেওয়া হয়েছে)

> **সিদ্ধান্ত:** এক অ্যাকাউন্ট, এক ওপেনিং। `acc_coa_level4s` এ একটাই `main_trx_id`
> কলাম। প্রতি শাখায় আলাদা ওপেনিং নয়।

কারণটা কেবল "এখন এক শাখা" নয়। `acc_coa_level4s` এ `company_id` আছে, `branch_id`
নেই — অর্থাৎ ব্যাংক অ্যাকাউন্টটাই কোম্পানির, কোনো শাখার নয়। যে জিনিস কোম্পানির,
তার ১ তারিখের ব্যালেন্সও কোম্পানির — একটাই সংখ্যা। শাখাভিত্তিক করলে একই
অ্যাকাউন্টে দুই শাখা টাকা বসিয়ে দ্বিগুণ গোনার ঝুঁকি তৈরি হতো।

ভাউচারটা যে শাখা তোলে সেখানেই ওঠে, আর §৬.১ এর branch গার্ড অন্য শাখাকে সেটা
বদলাতে দেয় না।

নিচের মূল প্রশ্ন ও দুই পথের তুলনা ইতিহাস হিসেবে রইল।

### ৪.১ মূল প্রশ্ন যেভাবে দাঁড়িয়েছিল

`acc_coa_level4s` এ `branch_id` **নেই** — কাস্টমার ও প্রোডাক্ট দুটোতেই আছে। মানে
একটা ব্যাংক অ্যাকাউন্ট পুরো কোম্পানির, কোনো নির্দিষ্ট শাখার নয়। কিন্তু ভাউচার
সবসময় কোনো এক শাখায় ওঠে।

একটামাত্র `main_trx_id` কলাম রাখলে **একটি শাখাই** ওই অ্যাকাউন্টের ওপেনিং ধরে
রাখতে পারবে। এখন এক শাখা, তাই আজ কোনো সমস্যা নেই — কিন্তু শাখা বাড়লে এটা ভাঙবে,
আর তখন ডেটা সরাতে হবে।

- **পথ ক (সহজ)** — এক শাখা ধরে নিয়ে একটা কলাম
- **পথ খ (নিরাপদ)** — আলাদা টেবিল, শাখাভিত্তিক

বাকি সবকিছু এই উত্তরের উপর নির্ভর করে, তাই এটাই প্রথম ধাপ।

---

## ৫. স্কিমা

### ৫.১ পথ ক · এক কলাম — **যেটা বসানো হয়েছে**

ফাইল: `cashbook_api/account_opening_balance_tracking.sql` (চালানো হয়েছে)।

```sql
ALTER TABLE `acc_coa_level4s`
  ADD COLUMN IF NOT EXISTS `main_trx_id` INT(11) NULL DEFAULT NULL
    COMMENT 'main_trx_master.id of the opening voucher; NULL = none yet'
    AFTER `acc_reporting_to_id`;

ALTER TABLE `acc_coa_level4s`
  ADD INDEX IF NOT EXISTS `idx_acc_coa_level4s_main_trx_id` (`main_trx_id`);

ALTER TABLE `acc_coa_level4s`
  ADD CONSTRAINT `fk_acc_coa_level4s_main_trx`
  FOREIGN KEY IF NOT EXISTS (`main_trx_id`) REFERENCES `main_trx_master` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
```

`INT(11)` **signed** — `main_trx_master.id` এর সাথে মেলাতে হবে, নইলে ফরেন কী বসবে
না। স্কিমার বাকি সব `main_trx_id` কলামও তাই। `IF NOT EXISTS` ধারাগুলো MariaDB-র,
MySQL-এ চলবে না (এই সার্ভার MariaDB 12.0.2)।

### ৫.২ পথ খ · আলাদা টেবিল — *নেওয়া হয়নি, তুলনার জন্য রাখা*

```sql
CREATE TABLE `acc_coa_level4_openings` (
  `id`          INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `coa4_id`     INT(10) UNSIGNED NOT NULL,
  `branch_id`   INT(11) NOT NULL,
  `main_trx_id` INT(11) NOT NULL,
  `created_by`  INT(11) NOT NULL,
  `created_at`  TIMESTAMP NULL DEFAULT NULL,
  `updated_at`  TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coa4_branch` (`coa4_id`, `branch_id`),
  KEY `idx_main_trx` (`main_trx_id`),
  CONSTRAINT `fk_coa4_opening_main_trx`
    FOREIGN KEY (`main_trx_id`) REFERENCES `main_trx_master` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
```

`uq_coa4_branch` ইউনিক কী-টাই "এক অ্যাকাউন্ট, এক শাখা, এক ভাউচার" নিয়মটা
ডাটাবেইজ পর্যায়ে ধরে রাখবে।

### ৫.৩ কনফিগ

```php
// config/accounts.php
'opening_account_groups' => [1, 2, 28],  // Cash, Bank Account, Mobile Banking
'bank_coa3_id'           => 2,           // ReportsController-এ হার্ডকোড ছিল
```

দুটোই `.env` দিয়ে বদলানো যায় (`OPENING_ACCOUNT_GROUPS`, `BANK_COA3_ID`)। গ্রুপের
তালিকায় একটা আইডি যোগ করলেই সেই গ্রুপের অ্যাকাউন্ট স্ক্রিনে চলে আসবে — আর কোথাও
হাত দিতে হবে না।

### ৫.৪ অঙ্ক ফেরত পড়া

```sql
SELECT atd.debit - atd.credit AS opening
FROM   main_trx_master         mtm
JOIN   acc_transaction_master  atm ON atm.main_trx_id = mtm.id
JOIN   acc_transaction_details atd ON atd.trx_mstr_id = atm.id
WHERE  mtm.id      = :main_trx_id
  AND  mtm.status  = 1
  AND  atd.coa4_id = :coa4_id;
```

ধনাত্মক মানে ব্যাংকে টাকা আছে (ডেবিট); ঋণাত্মক মানে ওভারড্রাফট (ক্রেডিট) —
কাস্টমারের সাথে একই নিয়ম।

---

## ৬. আচরণ — Save ও Delete

কাস্টমারের সাথে হুবহু এক, নতুন কোনো নিয়ম নেই।

| অবস্থা | ফল |
| --- | --- |
| ভাউচার নেই, অঙ্ক ≠ 0 | ভাউচার তৈরি, লিঙ্ক সংরক্ষিত |
| ভাউচার আছে, অঙ্ক বদলেছে | একই ভাউচারের দুই লাইন নতুন করে লেখা, `vr_no` অপরিবর্তিত |
| অঙ্ক 0 | ভাউচার trash, লিঙ্ক NULL |
| Delete | `main_trx_master.status = 0` + `delete_by` + `delete_at` |

### ৬.১ যে গার্ডগুলো লাগবে

- ভাউচার **approved** হলে edit ও delete দুটোই বন্ধ। অবশ্যই
  `main_trx_master.is_approved` দেখতে হবে — `acc_transaction_master` এর একই নামের
  কলামটা নয়, ওখানে কেউ কখনো `1` বসায় না (Approval Center লেখে
  `main_trx_master` এ)।
- ভাউচার **অন্য শাখার** হলে বন্ধ।
- ট্রানজেকশনের ভেতরে **row lock** (`lockForUpdate`), নইলে দুজন একসাথে Save চাপলে
  দুটো ভাউচার হবে।
- Delete-এ `voucher.delete` পারমিশন — API ও UI দুই জায়গাতেই একই পারমিশন।

### ৬.২ যে গার্ডটা লাগবে না

প্রোডাক্টের "স্টক ইতিমধ্যে বিক্রি হয়ে গেছে কিনা" চেকটা এখানে অপ্রাসঙ্গিক। ব্যাংকের
পরবর্তী লেনদেনগুলো ওপেনিং থেকে কিছু নেয় না — ওরা নিজেরাই আলাদা ডেবিট-ক্রেডিট।
তাই ব্যাংকে ইতিমধ্যে হাজারটা লেনদেন থাকলেও ওপেনিং সংশোধন করা নিরাপদ।

---

## ৭. ইন্টারফেস

Chart of Accounts Level 4 এর তালিকায় ওপেনিং কলাম **যোগ করবেন না** — ওখানে খরচের
খাত, বিক্রয়ের খাত সবই আছে, যেগুলোয় ওপেনিং অর্থহীন। বরং একটা আলাদা *Opening
Balance* স্ক্রিন, যা শুধু কনফিগে দেওয়া গ্রুপগুলোর অ্যাকাউন্ট দেখাবে।

সারির বিন্যাস কাস্টমার লিস্টের হুবহু — কম্পোনেন্টগুলো তৈরিই আছে:

```
Jamuna Bank Ltd -C/A-13771    [   1,284,697 ]  [Save] [Cancel] [Delete]
                                 5-260800012 →
```

- ভাউচার নম্বরটা ক্লিকযোগ্য, সরাসরি ওই অ্যাকাউন্টের লেজারে নিয়ে যাবে — কাস্টমার
  লিস্টে যেভাবে কাজ করে (`Ledger.tsx` এর `location.state.ledgerAccount`)।
- Delete বাটন কেবল তখনই দেখাবে যখন সত্যিই একটা ভাউচার আছে।
- কনফার্মেশনে অ্যাকাউন্টের নাম, অঙ্ক আর ভাউচার নম্বর — তিনটাই।
- গ্রুপ অনুযায়ী ভাগ করে দেখানো ভালো (Cash / Bank Account / Mobile Banking), ঠিক
  যেভাবে প্রোডাক্ট লিস্ট ক্যাটাগরি অনুযায়ী ভাগ হয়।

---

## ৮. বাস্তবায়নের ক্রম

সাতটি ধাপই সম্পন্ন।

| # | কাজ | কোথায় / নোট | |
| --- | --- | --- | --- |
| ১ | শাখার প্রশ্নের উত্তর | পথ ক — §৪ | ✅ |
| ২ | স্কিমা বসানো | `account_opening_balance_tracking.sql`, সরাসরি চালানো | ✅ |
| ৩ | ভাউচার যন্ত্র আলাদা করা | `PartyOpeningBalanceService` → `OpeningVoucher` + দুটি র‍্যাপার | ✅ |
| ৪ | গ্রুপ ও contra কনফিগে | `config/accounts.php` · `config:clear` চালানো | ✅ |
| ৫ | লিস্ট, Save, Delete এন্ডপয়েন্ট | `routes/api.php` · `route:clear` চালানো | ✅ |
| ৬ | স্ক্রিন ও redux thunk | কাস্টমার লিস্টের কম্পোনেন্ট পুনর্ব্যবহার | ✅ |
| ৭ | dev ডেটায় যাচাই | তৈরি · পুনরায় Save · Delete · approved · অন্য শাখা · গ্রুপের বাইরে · নিষ্ক্রিয় | ✅ |

---

## ৯. সতর্কতা

### ৯.১ ১৬টি ব্যাংক অ্যাকাউন্টেরই `status = 0` — **স্ক্রিন খালি দেখাবে**

সিদ্ধান্ত: স্ক্রিন শুধু **সক্রিয়** অ্যাকাউন্ট দেখাবে। আজকের `aftradingdb`-তে
১৬টি ব্যাংকের সবগুলোই নিষ্ক্রিয়, তাই স্ক্রিনে **কেবল Cash** আসবে। যে ব্যাংকগুলো
ব্যবহার হবে সেগুলো আগে CoA L4 থেকে সক্রিয় করতে হবে।

তবে যে অ্যাকাউন্টে ইতিমধ্যে একটা জীবিত ওপেনিং ভাউচার আছে, সেটা নিষ্ক্রিয় হলেও
তালিকায় থাকবে — "Inactive" ব্যাজসহ, শুধু Delete করা যাবে। নইলে ব্যাংক বন্ধ করে
দিলে তার ওপেনিং টাকাটা লেজারে থেকে যেত অথচ কোথাও দেখা যেত না।

> **আলাদা একটা বাগ যা এই কাজে ধরা পড়েছে:** `status` কলামটা `enum('0','1')`, আর
> ENUM-কে সংখ্যার সাথে মেলালে MariaDB **মান নয়, ইনডেক্স** মেলায়। তাই
> `getCoal4()`-এর `where('status', '!=', 0)` আসলে **কিছুই ফিল্টার করে না** —
> ২৮৮টা সারির সবগুলোই পাস করে। আর `status = 1` লিখলে ঠিক উল্টোটা হয়: কেবল
> নিষ্ক্রিয় ২৮টা আসে। নতুন কোডে স্ট্রিং `'1'` ব্যবহার করা হয়েছে।
> `Coal4Controller::getCoal4()` এখনো পুরনো লেখাটাই বহন করছে — আলাদা কাজ।

### ৯.২ ভাউচার নম্বর পুনর্ব্যবহার

ভাউচার trash করলে তার নম্বরটা আবার খালি হয়ে যায়, কারণ সিরিয়াল গোনা হয় কেবল
সক্রিয় (`status = 1`) ভাউচার থেকে। ব্যাংকেও একই ঘটনা ঘটবে। এটা আগে থেকেই থাকা
আচরণ — দেখুন `docs/voucher-number-duplicate-analysis.md`, আলাদা কাজ হিসেবে
বিবেচ্য।

### ৯.৩ contra অ্যাকাউন্ট

ওপেনিং-এর বিপরীত দিকটা যায় **Capital Accounts** (coa4 14) এ, যা হিসাবের দিক থেকে
সঠিক — ব্যাংকে টাকা ঢুকল, মালিকের মূলধন বাড়ল। কাস্টমারের জন্য যে কনফিগ ভ্যালু
(`accounts.opening_contra_coa4_id`) ব্যবহার হচ্ছে, ব্যাংকেও সেটাই চলবে; নতুন কিছু
লাগবে না।

### ৯.৪ `can()` এই ডেটাবেসে চলে না

পারমিশন যাচাইয়ে `auth()->user()->can(...)` ব্যবহার করা যাবে না। `User` মডেল
Spatie-র `permissions()` রিলেশনকে `user_permissions` টেবিলের দিকে ঘুরিয়ে দিয়েছে
(`app/Models/User.php:103`), আর সেই টেবিল `aftradingdb`-তে **নেই** — তাই `can()`
উত্তর না দিয়ে `QueryException` ছোড়ে।

তাই নতুন কন্ট্রোলার `CompanyRoleScope::visiblePermissionNames()` ব্যবহার করে —
`BranchController` যা করে, আর `SettingsController` যেটা দিয়েই ফ্রন্টএন্ডের
পারমিশন তালিকা বানায়। ফলে স্ক্রিনের বাটন আর API একই তালিকা দেখে।

> **সাবধান:** `PartyController::apiDeleteOpeningBalance()` (`:1032`) এবং
> `ItemController::deleteProductOpening()` (`:1534`) এখনো `can('voucher.delete')`
> লিখে রেখেছে, অর্থাৎ এই ডেটাবেসে কাস্টমার ও প্রোডাক্টের ওপেনিং Delete দুটোই
> 500 দেবে। আলাদা কাজ, কিন্তু কাছাকাছি।

---

## ১০. যে ফাইলগুলো হলো

### API — `cashbook_api`

| ফাইল | কী |
| --- | --- |
| `account_opening_balance_tracking.sql` | নতুন · স্কিমা (চালানো হয়েছে) |
| `app/Services/OpeningBalance/OpeningVoucher.php` | নতুন · ভাউচারের সব যন্ত্র, একবার লেখা |
| `app/Services/OpeningBalance/AccountOpeningBalanceService.php` | নতুন · অ্যাকাউন্টের র‍্যাপার + তালিকা |
| `app/Services/OpeningBalance/PartyOpeningBalanceService.php` | ২৮৯ → ৯৩ লাইন · আচরণ অপরিবর্তিত |
| `app/Http/Controllers/Coa/OpeningBalance/AccountOpeningBalanceController.php` | নতুন · তিনটি এন্ডপয়েন্ট |
| `config/accounts.php` | `opening_account_groups`, `bank_coa3_id` |
| `routes/api.php` | `account/opening-balance/{list,update/{id},delete/{id}}` |

### React — `cashbookbd_react`

| ফাইল | কী |
| --- | --- |
| `.../chartofaccounts/opening-balance/AccountOpeningBalance.tsx` | নতুন · স্ক্রিন |
| `.../chartofaccounts/opening-balance/accountOpeningSlice.tsx` | নতুন · RTK thunk |
| `services/apiRoutes.tsx`, `services/appRoutes.tsx` | তিনটি URL + `/coal4/opening-balance` |
| `App.tsx`, `store.tsx` | রুট (`coa.l4.view` গার্ড) + রিডিউসার |
| `Sidebar/index.tsx`, `Header/globalSearchItems.ts` | মেনু ও গ্লোবাল সার্চ |

### যা মনে রাখতে হবে

- `foundData()` **দুইবার** মোড়ে: `{ success, message, data: { data, transaction_date } }`।
  তালিকা পড়তে হয় `response.data.data.data` থেকে।
- ওপেনিং ব্যালেন্স ব্রাঞ্চ মেটা `is_opening = 1` না হলে স্ক্রিন ও API দুটোই বন্ধ।
- পারমিশন: দেখা `coa.l4.view`, লেখা `coa.l4.edit`, মোছা `coa.l4.edit` + `voucher.delete`।
