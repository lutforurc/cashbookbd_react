# কোম্পানি স্কিম বিক্রয় ও নিকট পাওনা ব্যবস্থাপনা — স্পেসিফিকেশন

**তারিখ:** ২৩ সেপ্টেম্বর ২০২৬
**অবস্থা:** পরামর্শ / নকশা — বাস্তবায়ন শুরু হয়নি
**নথির উদ্দেশ্য:** ব্যাকএন্ড ডেভেলপারের জন্য ডেটাবেস স্কিমা ও API চুক্তি

> **সংশোধনের ইতিহাস**
> **সংস্করণ ২ (২৩ সেপ্টেম্বর ২০২৬)** — কোম্পানি আর আলাদা সত্তা নয়; ইনভয়েসের পক্ষই কোম্পানি (§২.১)। ক্রেতার নাম টেক্সট (§২.৬)। পক্ষ-ভিত্তিক লেজার আর খোলা পাওনার মিল বাধ্যতামূলক নিয়ম (§২.২, §৫ নিয়ম ৮)। বাতিল settlement-এর ফাঁক, UNIQUE+NULL সমস্যা, ভাউচারের Dr/Cr — ঠিক করা হয়েছে। IMEI-এর সাথে সংযোগ নতুন করে লেখা (§৭)।

---

## ১. কেন এই কাজ

সিস্টেমে বর্তমানে বিক্রয়ের তিনটি ধরন — `Cash Sales`, `Partial Cash Sales`, `Due Sales` — এবং একটি কিস্তি মডিউল আছে। কিন্তু এগুলো সবই **ক্রেতার কাছে** পাওনা ট্র্যাক করে।

এই ব্যবসার প্রয়োজন এর উল্টো দিকের পাওনা:

- কোম্পানি (ব্র্যান্ড/সরবরাহকারী) পণ্য দেয়, সফটওয়্যার ব্যবহারকারী বিক্রি করেন
- ক্রেতা নগদ অংশ দেয় (যেমন ২০,০০০-এর মধ্যে ৬,০০০)
- বাকি ১৪,০০০ নির্দিষ্ট দিন পর **কোম্পানি** ব্যবহারকারীর ব্যাংক হিসাবে বা নগদে পরিশোধ করে

এখানে ঝুঁকি কোম্পানির, ক্রেতার নয়। দোকান কোম্পানির কাছ থেকে টাকা তোলে; ক্রেতার কাছে তোলার দায় কোম্পানির।

অর্থাৎ প্রতিটি বিক্রীত IMEI-এর বিপরীতে **কোম্পানির নিকট পাওনা** তৈরি হয়, যা বিল-ভিত্তিক পরিশোধে কমতে থাকে। বর্তমানে এর কোনো ট্র্যাকিং নেই।

### যে চারটি প্রশ্নের উত্তর দিতে হবে

1. কোম্পানির নিকট এখন কত টাকা পাওয়া আছে
2. আজকে কোন কোন IMEI/বিলের বিপরীতে কত টাকা পরিশোধ পেল
3. কোন কোন IMEI-এর টাকা এখনও পাওয়া আছে
4. এজিং, স্টেটমেন্ট, প্রিন্ট

---

## ২. সুপারিশকৃত মডেল

### ২.১ "কোম্পানি" = ইনভয়েসের পক্ষ — নতুন সত্তা নয়

সিস্টেমে ইতিমধ্যেই `product-tracking` মডিউল আছে, যা একটি পণ্য + শাখার জন্য একটি `coa4_id` পক্ষের বিপরীতে bill ও cash ট্র্যাক করে।

Electronics Sales ইনভয়েসে চেক করে দেখা গেছে —

- ফিল্ডটির ডেটা নাম **আগেই** `formData.account` / `accountName` (`ElectronicsBusinessSales.tsx:949`)
- ড্রপডাউনটি **আগেই** `acType={'3'}` — অর্থাৎ সবসময়ই একটি সাধারণ পক্ষ-সিলেক্টর

শুধু লেবেলটা "Select Customer" ছিল, যা বিভ্রান্তিকর। তাই:

> **"Select Customer" লেবেলটি "Accounts" করা হবে। ডেটাতে কিছুই বদলাবে না — কোনো মাইগ্রেশন লাগবে না।**

এর ফলে **`company_coa4_id` বলে নতুন ধারণার দরকার নেই** — কোম্পানি স্কিমের ইনভয়েসে পক্ষটি হবে কোম্পানি। চার্ট অব অ্যাকাউন্টসের একটি Level-4 পক্ষ (`acType=3`) হিসেবেই থাকবে, তাই এন্ট্রিগুলো স্বয়ংক্রিয়ভাবে Trial Balance ও Balance Sheet-এ যাবে।

কোন পক্ষগুলো "কোম্পানি", তা ঠিক হবে `company_scheme_settings` সারি দিয়ে (§৪.৪) — অর্থাৎ ইনভয়েসের পক্ষটির সেটিংস থাকলে সেটি কোম্পানি স্কিম।

### ২.২ লেজার নিজেই মিলে যাবে — এটাই সবচেয়ে বড় লাভ

কোম্পানিকে ইনভয়েসের পক্ষ বানানোয় একটি জিনিস দাবি করা যায়, যা আলাদা টেবিলে কখনোই নিশ্চিত করা যেত না:

> **নিয়ম:** কোনো কোম্পানির লেজার ব্যালেন্স = ওই কোম্পানির সব খোলা পাওনার যোগফল
> `SUM(COALESCE(agreed_amount, expected_amount) − settled_amount)`

এটা তখন আর "চোখে মিলিয়ে দেখা" বিষয় থাকে না (§১২.৭) — **সার্ভারে জোর করে মানানোর মতো নিয়ম** হয়ে যায় (§৫ নিয়ম ৮)। মিল না থাকলে কিছু একটা ভুল হয়েছে, আর সেটা ধরা পড়বে।

### ২.৩ পাওনা থাকবে প্রতি IMEI-এ এক লাইন

চারটি রিপোর্টই IMEI-কেন্দ্রিক। তাই মডেলের মূল একক `IMEI`, ইনভয়েস নয় — এক ইনভয়েসে ২০টি IMEI থাকলে ২০টি পাওনা লাইন হবে।

### ২.৪ পরিশোধের অঙ্ক দুই স্তরে — `expected` ও `agreed`

কোম্পানি পরে চূড়ান্ত অঙ্ক জানায়, তাই শুরুর হিসাব মুছে ফেলা যাবে না:

- `expected_amount` = বিক্রয়মূল্য − ক্রেতার নগদ (সিস্টেম নিজে বসায়)
- `agreed_amount` = কোম্পানি যে অঙ্ক জানায় (পরে বসে, পরিবর্তনযোগ্য)
- পার্থক্য সমন্বয় খাতায় যাবে

**সতর্কতা:** `agreed_amount` বসলে রিপোর্টের মোট পাওনা নিজে থেকেই কমে যায়। এটি কাঙ্ক্ষিত, কিন্তু রিপোর্টে `expected`, `agreed`, `balance` — তিনটিই সবসময় দেখাতে হবে (§৬ সারি ১), যাতে কেউ ভাবতে না পারে টাকা হারিয়ে গেল।

### ২.৫ পেমেন্ট এলোকেশন টেবিল — আসল চাবি

কোম্পানি প্রায়ই একসাথে অনেক IMEI-এর টাকা এক পেমেন্টে দেয়। তাই তিনটি স্তর লাগবে:

```
company_receivables            → প্রতি IMEI-এর পাওনা বিল
company_settlements            → কোম্পানি থেকে পাওয়া একেকটি পেমেন্ট
company_settlement_allocations → কোন পেমেন্ট কোন IMEI-এ কত
```

তৃতীয় টেবিলটিই "কোন কোন বিলের বিপরীতে পেমেন্ট" প্রশ্নের উত্তর দেয় এবং আংশিক পরিশোধ সম্ভব করে।

**অ্যালোকেশন সার্ভার নিজে ঠিক করবে না** — ব্যবহারকারী কোন IMEI-এ কত বসাবে তা পাঠাবেন (§৬.২)। §৬.৪-এর "পুরনো আগে" সাজানো শুধু স্ক্রিনের সুবিধার জন্য, নিয়ম নয়।

### ২.৬ ক্রেতা — পক্ষ, না শুধু নাম?

দোকান ক্রেতার কাছে টাকা তোলে না (§১), তাই ক্রেতাকে লেজার-পক্ষ বানানো জরুরি নয়। এতে দুই সুবিধা — ক্রেতা-পক্ষ প্রতি বিক্রয়ে না বাড়লেই হয়, আর ইনভয়েসে শুধু নাম লিখলেই চলে।

তবে **পক্ষের ঘরটা মুছে ফেলা যাবে না**, কারণ সাধারণ বাকি বিক্রয়ে ক্রেতাই পক্ষ, আর ক্রেতা-ভিত্তিক স্টেটমেন্ট ও এজিং সেই পথেই চলে।

**সিদ্ধান্ত:** দুটো ঘরই থাকবে, তবে অর্থ আলাদা —

| ঘর | কখন ভরে |
|---|---|
| `customer_coa4_id` | ক্রেতা সত্যিই একটি পক্ষ হলে (সাধারণ বাকি বিক্রয়) |
| `customer_name` | শেষ গ্রাহকের নাম — কোম্পানি স্কিমে টেক্সট, পক্ষের দরকার নেই |

---

## ৩. কাজের উদাহরণ

| IMEI | বিক্রয়মূল্য | নগদ | কোম্পানি পরিশোধ করবে | মেয়াদ |
|---|---|---|---|---|
| 12131313131313 | ২০,০০০ | ৬,০০০ | ১৪,০০০ | sale_date + 30 |
| 121313131465464 | ২২,০০০ | ৬,৫০০ | ১৫,৫০০ | sale_date + 30 |
| 121314546565464 | ২৫,০০০ | ৭,০০০ | ১৮,০০০ | sale_date + 30 |

**মোট পাওনা ৪৭,৫০০**

কোম্পানি ৩০,০০০ দিলে: প্রথম দুটি সম্পূর্ণ মিটবে (১৪,০০০ + ১৫,৫০০ = ২৯,৫০০), তৃতীয়টিতে ৫০০ বসবে → **অবশিষ্ট ১৭,৫০০**

> নগদ তিনটিতে ভিন্ন (৩০% / ২৯.৫% / ২৮%) — আনুপাতিক নয়। তাই এই হিসাব বিদ্যমান ইনভয়েস থেকে নিজে বের করা সম্ভব নয়। §৭ দেখুন।

---

## ৪. ডেটাবেস টেবিল (৫টি)

> সব টেবিলে `company_id` থাকবে। কারণ এখনই দেখা গেছে একই ডেটাবেসে অনেক প্রতিষ্ঠান থাকে — `main_trx_master.company_id = auth()->user()->company_id` (`temp/ReportsController.php:4901`)। এটা না থাকলে ক্রস-টেন্যান্ট ডেটা লিক হবে।

### ৪.১ `company_receivables` — প্রতি IMEI-এর পাওনা

```sql
id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
company_id        BIGINT UNSIGNED NOT NULL,   -- টেন্যান্ট
branch_id         BIGINT UNSIGNED NOT NULL,
party_coa4_id     BIGINT UNSIGNED NOT NULL,   -- ইনভয়েসের পক্ষই কোম্পানি
customer_coa4_id  BIGINT UNSIGNED NULL,       -- ক্রেতা পক্ষ হলে
customer_name     VARCHAR(150) NULL,          -- শেষ গ্রাহকের নাম (টেক্সট)
invoice_id        BIGINT UNSIGNED NULL,       -- Electronics বিক্রয় ইনভয়েস
invoice_no        VARCHAR(50)  NULL,
item_id           BIGINT UNSIGNED NOT NULL,
imei              VARCHAR(20)  NOT NULL,
sale_date         DATE         NOT NULL,
sale_price        DECIMAL(15,2) NOT NULL,             -- 20000
customer_cash     DECIMAL(15,2) NOT NULL DEFAULT 0,   -- 6000
expected_amount   DECIMAL(15,2) NOT NULL,             -- sale_price - customer_cash = 14000
agreed_amount     DECIMAL(15,2) NULL,                 -- কোম্পানি পরে যা জানায়
settled_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
due_date          DATE          NOT NULL,             -- sale_date + N
status            ENUM('pending','partial','settled','on_hold','cancelled') DEFAULT 'pending',
source            ENUM('sale','import','manual') DEFAULT 'sale',
remarks           TEXT NULL,
created_by BIGINT UNSIGNED NULL,
updated_by BIGINT UNSIGNED NULL,
created_at TIMESTAMP NULL,
updated_at TIMESTAMP NULL,

INDEX idx_outstanding (company_id, party_coa4_id, status, due_date),
INDEX idx_imei (company_id, imei),
INDEX idx_invoice (invoice_id)
```

> **বাকি** = `COALESCE(agreed_amount, expected_amount) − settled_amount`

### ৪.২ `company_settlements` — কোম্পানি থেকে পাওয়া একেকটি পেমেন্ট

```sql
id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
company_id        BIGINT UNSIGNED NOT NULL,
branch_id         BIGINT UNSIGNED NOT NULL,
party_coa4_id     BIGINT UNSIGNED NOT NULL,
payment_date      DATE NOT NULL,
amount            DECIMAL(15,2) NOT NULL,
payment_method    ENUM('cash','bank','cheque','adjustment') NOT NULL,
deposit_coa4_id   BIGINT UNSIGNED NULL,   -- টাকা যে নগদ/ব্যাংক খাতে ঢুকল
reference_no      VARCHAR(100) NULL,      -- চেক নম্বর / ট্রানজ্যাকশন আইডি
voucher_master_id BIGINT UNSIGNED NULL,   -- যে রিসিভ ভাউচার তৈরি হলো
remarks           TEXT NULL,
status            ENUM('posted','cancelled') DEFAULT 'posted',
created_by BIGINT UNSIGNED NULL,
created_at TIMESTAMP NULL,
updated_at TIMESTAMP NULL,

INDEX idx_party_date (company_id, party_coa4_id, payment_date)
```

### ৪.৩ `company_settlement_allocations` — কোন পেমেন্ট কোন IMEI-এ কত

```sql
id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
settlement_id   BIGINT UNSIGNED NOT NULL,
receivable_id   BIGINT UNSIGNED NOT NULL,
amount          DECIMAL(15,2) NOT NULL,

UNIQUE KEY uniq_alloc (settlement_id, receivable_id),
FOREIGN KEY (settlement_id) REFERENCES company_settlements(id) ON DELETE CASCADE,
FOREIGN KEY (receivable_id) REFERENCES company_receivables(id)
```

### ৪.৪ `company_scheme_settings` — কোম্পানি-প্রতি মেয়াদ (N দিন)

```sql
id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
company_id       BIGINT UNSIGNED NOT NULL,
party_coa4_id    BIGINT UNSIGNED NOT NULL,
branch_id        BIGINT UNSIGNED NOT NULL DEFAULT 0,  -- 0 = সব শাখায় প্রযোজ্য
due_days         SMALLINT UNSIGNED NOT NULL DEFAULT 30,
shortfall_coa4_id BIGINT UNSIGNED NULL,   -- agreed < expected হলে পার্থক্য যে খাতে (§১১.৩)
is_active        TINYINT(1) NOT NULL DEFAULT 1,

UNIQUE KEY uniq_company_branch (company_id, party_coa4_id, branch_id)
```

> **`branch_id` এখানে NULL নয়, `0`।** MySQL-এ UNIQUE ইনডেক্সে NULL কখনো NULL-এর সমান নয় — তাই `branch_id` NULL রাখলে "সব শাখা" সারি একই কোম্পানির জন্য যতবার খুশি বসে যেত। `0` sentinel দিয়ে সেটা বন্ধ।

### ৪.৫ `company_receivable_adjustments` — `agreed_amount` বদলের ইতিহাস

```sql
id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
receivable_id  BIGINT UNSIGNED NOT NULL,
old_amount     DECIMAL(15,2) NULL,
new_amount     DECIMAL(15,2) NOT NULL,
reason         VARCHAR(255) NULL,
adjusted_by    BIGINT UNSIGNED NULL,
created_at     TIMESTAMP NULL
```

---

## ৫. অলঙ্ঘনীয় নিয়ম (সার্ভারে জোর করে মানাতে হবে)

1. `settled_amount` সবসময় = ওই পাওনার **`posted` অবস্থার** settlement-গুলোর সব allocation-এর যোগফল।
   *(`cancelled` বাদ যাবে — নইলে নিয়ম ৬ ভেঙে পড়ে; নিচে দেখুন)*
2. `settled_amount ≤ COALESCE(agreed_amount, expected_amount)` — বেশি পরিশোধ বসানো যাবে না
3. `pending` / `partial` / `settled` — এই তিনটি অবস্থা উপরোক্ত অঙ্ক থেকেই নিজে ঠিক হবে (০ = `pending`, আংশিক = `partial`, পূর্ণ = `settled`)। `on_hold` ও `cancelled` কেবল হাতে দেওয়া যাবে।
4. **একটি ট্রানজ্যাকশনে** settlement + allocations + ভাউচার + `settled_amount` হালনাগাদ — একটাও ব্যর্থ হলে কিছুই সেভ হবে না
5. একটি settlement-এর allocations-এর যোগফল = `settlement.amount`
6. **Settlement বাতিল করা** = ওই settlement-এর সব allocation মুছে ফেলা + আক্রান্ত প্রতিটি পাওনার `settled_amount` ও `status` নতুন করে হিসাব করা + ভাউচার বাতিল — সবই **একই ট্রানজ্যাকশনে**।
   *শুধু `status='cancelled'` বসালে হবে না — সারি থেকে যায়, তাই allocation-ও থেকে যায়, আর নিয়ম ১ অনুযায়ী পাওনা "মিটে গেছে" দেখাতেই থাকবে।*
7. একই settlement-এ একই IMEI দুইবার আসবে না (UNIQUE key এ আটকাবে)
8. **মিল নিয়ম:** প্রতি কোম্পানির লেজার ব্যালেন্স = তার খোলা পাওনার যোগফল (§২.২)। ঘন ঘন যাচাই করার একটি কমান্ড/চেক থাকা ভালো।
9. `party_coa4_id` — একটি settlement-এর সব পাওনা একই কোম্পানির হতে হবে, আর settlement-এর পক্ষটিও তাই

---

## ৬. API এন্ডপয়েন্ট (৯টি)

**ভিত্তি:** `{host}/api/company-scheme`
**Auth:** বিদ্যমান Sanctum
**Response খাম:** `{ "success": true, "data": { "data": [...], "meta": {...} } }`
**ত্রুটি:** `{ "success": false, "error": { "message": "..." } }`

| # | এন্ডপয়েন্ট | ইনপুট | আউটপুট |
|---|---|---|---|
| ১ | `GET /receivables` | `branch_id, party_coa4_id, imei, status, from_date, to_date, page, per_page` | `id, imei, item_name, company, customer_name, invoice_no, sale_date, sale_price, customer_cash, expected_amount, agreed_amount, settled_amount, balance, due_date, days_overdue, status` + `meta.totals` |
| ২ | `GET /receivables/due` | উপরের + মেয়াদী ফিল্টার | উপরের + `aging_bucket` (`0-30`, `31-60`, `61-90`, `90+`) ও বাকেট-ভিত্তিক যোগফল |
| ৩ | `POST /receivables/adjust` | `{ receivable_id, agreed_amount, reason }` | adjustment সারি লেখে, `agreed_amount` ও `status` হালনাগাদ |
| ৪ | `GET /settlements/open-receivables` | `party_coa4_id, branch_id, as_of_date` | পুরনো আগে সাজানো — এলোকেশন স্ক্রিনের জন্য |
| ৫ | `POST /settlements/store` | §৬.২ দেখুন | `{ settlement_id, voucher_no, allocations }` |
| ৬ | `GET /settlements/daily` | `from_date, to_date, party_coa4_id, branch_id` | settlement + তার allocation লাইন (কোন IMEI, কত) |
| ৭ | `GET /statement/{partyCoa4Id}` | `from_date, to_date` | `opening_balance, rows[{date, particulars, debit, credit, balance, type}], closing_balance` |
| ৮ | `GET/POST /settings` | `{ party_coa4_id, branch_id, due_days, shortfall_coa4_id, is_active }` | তালিকা / upsert |
| ৯ | `POST /import` | Excel + `party_coa4_id, branch_id` | `{ inserted, skipped, errors[{row, message}] }` |
| ১০ | `GET /reconcile` | `party_coa4_id, branch_id` | `{ ledger_balance, open_receivables, difference }` — §৫ নিয়ম ৮ যাচাইয়ের জন্য |

### ৬.১ এন্ডপয়েন্ট ৩ — `adjust` এর নিয়ম

`agreed_amount < settled_amount` হলে আটকাতে হবে:

> "এই IMEI-এর ইতিমধ্যে ৫,০০০ টাকা পরিশোধ হয়ে গেছে; তার কম অঙ্ক বসানো যাবে না।"

### ৬.২ এন্ডপয়েন্ট ৫ — `settlements/store` (সবচেয়ে গুরুত্বপূর্ণ)

```json
{
  "party_coa4_id": 123,
  "branch_id": 4,
  "payment_date": "2026-09-23",
  "amount": 30000,
  "payment_method": "bank",
  "deposit_coa4_id": 55,
  "reference_no": "CHQ-8842",
  "remarks": "",
  "allocations": [
    { "receivable_id": 901, "amount": 14000 },
    { "receivable_id": 902, "amount": 15500 },
    { "receivable_id": 903, "amount": 500 }
  ]
}
```

**যাচাই:**

- allocations-এর যোগফল = `amount`
- সব পাওনা একই কোম্পানির, আর সেটি `party_coa4_id`-এর সমান
- প্রতি লাইন তার নিজের বাকির চেয়ে বেশি নয়
- একই পাওনা একাধিকবার নেই

**প্রভাব (এক ট্রানজ্যাকশনে):**

1. `company_settlements` সারি তৈরি
2. `company_settlement_allocations` সারি তৈরি
3. প্রতি পাওনার `settled_amount` ও `status` হালনাগাদ
4. **নগদ/ব্যাংক রিসিভ ভাউচার** — ব্যাকএন্ড ডেভেলপারের জন্য স্পষ্ট করে:

   ```
   Dr  deposit_coa4_id  (নগদ/ব্যাংক)   amount
       Cr  party_coa4_id (কোম্পানি)        amount
   ```

   `payment_method = adjustment` হলে ব্যাংক/নগদ নয়, সমন্বয় খাত বসবে।

### ৬.৩ এন্ডপয়েন্ট ৯ — Excel ইমপোর্টের কলাম

`IMEI` · `Item/Model` · `Sale Date` · `Sale Price` · `Customer Cash` · `Company Amount` · `Due Date` *(না থাকলে হিসাব হবে)* · `Invoice No` · `Customer Name`

কলামের অর্থ স্পষ্ট করতে হবে:

- `expected_amount` = `Sale Price` − `Customer Cash`
- `Company Amount` → **`agreed_amount`** (কোম্পানি যে অঙ্ক জানিয়েছে)
- `Sale Price` বা `Customer Cash` না থাকলে কী হবে — হয় খালি ঘর `0` ধরে নেওয়া, নয়তো ওই সারিটি `errors[]`-এ ফেরা। **নীরবে ফেল করা যাবে না** — কলাম দুটি `NOT NULL`।

`?dry_run=1` থাকলে কিছুই সেভ না করে শুধু কী হবে তা দেখাবে — ব্যবহারকারী মিলিয়ে দেখে তারপর চূড়ান্ত করবেন।

### ৬.৪ ইমপোর্ট আর Trial Balance — **এই প্রশ্নের উত্তর চাই**

§৭-এর যাচাই ধাপ (§১২.৭) বলছে Trial Balance মিলতে হবে। কিন্তু ইমপোর্ট যদি শুধু `company_receivables`-এ সারি ঢোকায়, কোনো ভাউচার না বানায়, তাহলে লেজারে কিছুই যোগ হয় না — মিলবে না।

দুটো পরিস্থিতি সম্ভব, আর এদের ব্যবহার একেবারে আলাদা:

| পরিস্থিতি | ইমপোর্টের কাজ |
|---|---|
| পুরনো Excel-এর পাওনা লেজারে **আগেই আছে** (কোনো পক্ষের ব্যালেন্স হিসেবে) | ইমপোর্ট শুধু তার **ভাঙিয়ে দেখানো** — লেজারে হাত দেওয়া যাবে না |
| লেজারে **নেই** | ইমপোর্টকে **opening journal entry**-ও বানাতে হবে, নইলে §১২.৭ কখনো পাস করবে না |

**ঠিক করা দরকার:** কোনটি? নাকি দুটোই — ইমপোর্টের সময় ব্যবহারকারী টিক দিয়ে বেছে নেবেন?

---

## ৭. বিক্রয়ের সাথে সংযোগ — IMEI-এর প্রশ্ন

স্পেকের আগের সংস্করণে লেখা ছিল "ইনভয়েসে কোম্পানি স্কিম লাইন থাকলে একই ট্রানজ্যাকশনে সারি তৈরি হবে, আলাদা করে কিছু যোগ করতে হবে না"। **কোড ঘেঁটে দেখা গেছে এত সহজ নয়।**

### ৭.১ যা পাওয়া গেল

- IMEI আছে `inventory_sales_details.serial_no`-তে — **কমা/স্পেসে লেখা একটি লম্বা স্ট্রিং**, IMEI-প্রতি সারি নয় (`temp/ReportsController.php:4920`)
- স্টক হিসাব হয় সেট বিয়োগে: purchase IMEI − sales IMEI (`temp/ReportsController.php:4943`)
- ইনভয়েসের নগদ (`receivedAmt`) **হেডার লেভেলে**, লাইন-প্রতি নয় (`ElectronicsBusinessSales.tsx:893`)
- ইনভয়েসে `due_date` ও কিস্তির তালিকা আছে — কিন্তু সেগুলো ইনভয়েস-ভিত্তিক, IMEI-ভিত্তিক নয়

### ৭.২ ফলে যা আটকায়

§৪.১ চায় IMEI-প্রতি `sale_price` ও `customer_cash`। কিন্তু §৩-এর উদাহরণে নগদ তিন IMEI-তে আলাদা (৬,০০০ / ৬,৫০০ / ৭,০০০), যা আনুপাতিকও নয়। তাই বিদ্যমান ইনভয়েস থেকে এই দুটি সংখ্যা বের করার **উপায় নেই**।

### ৭.৩ দুটো পথ — **সিদ্ধান্ত চাই**

**(ক) ইনভয়েস থেকেই অটো** — কোম্পানি স্কিম ইনভয়েসে IMEI-প্রতি আলাদা লাইন (qty ১) আর লাইন-প্রতি নগদ ইনপুট যোগ করতে হবে। বিক্রয়ের সাথে হিসাব অটো মিলবে, হাতে কিছু করতে হবে না।

**(খ) ইনভয়েসের সাথে সংযোগ ছাড়া** — IMEI-পাওনা তৈরি হবে Excel ইমপোর্ট (§৬.৩) বা আলাদা এন্ট্রি স্ক্রিন দিয়ে। ইনভয়েস স্ক্রিন ছোঁয়া লাগবে না। পুরনো ডেটার জন্য এই পথ যেচেই লাগবে।

**সুপারিশ: প্রথম ধাপে (খ)।** কারণ (ক) মানে দোকানের সবচেয়ে ব্যস্ত স্ক্রিনটাই পাল্টে ফেলা — লাইন-প্রতি নগদ, IMEI-প্রতি লাইন, আর তার প্রভাব বিদ্যমান ইনভয়েস প্রিন্ট ও কিস্তির উপর। আর (খ) পুরনো ডেটার জন্যও লাগবেই, তাই ওটা বাদ পড়ে না। (ক) পরে, দরকার হলে।

**একটি সীমাবদ্ধতা দুই ক্ষেত্রেই:** ইনভয়েস আর `company_receivables` সারির মধ্যে সরাসরি লিংক থাকবে না (খ)-তে — শুধু `invoice_no` টেক্সট। মিলিয়ে দেখার জন্য `invoice_no` + `imei` দিয়ে খোঁজার সুবিধা রাখতে হবে।

---

## ৮. ফ্রন্টএন্ড পরিধি (এই রিপোতে যা বানানো হবে)

নতুন মডিউল: `src/components/modules/company-settlement/`

| ফাইল | কাজ |
|---|---|
| `companySettlementSlice.tsx` | Redux Toolkit slice |
| `CompanyReceivable.tsx` | রিপোর্ট ১ — কোম্পানির নিকট পাওনা (IMEI-ভিত্তিক) |
| `CompanyPaymentEntry.tsx` | পেমেন্ট এন্ট্রি + এলোকেশন |
| `CompanySettlementDaily.tsx` | রিপোর্ট ২ — তারিখ-ভিত্তিক পরিশোধ |
| `CompanyReceivableDue.tsx` | রিপোর্ট ৩ — মেয়াদী/এজিং |
| `CompanyStatement.tsx` | রিপোর্ট ৪ — কোম্পানি স্টেটমেন্ট |
| `companySchemeConfig.tsx` | কোম্পানি-প্রতি মেয়াদ-দিন সেটিংস |

পরিবর্তন হবে: `apiRoutes.tsx` · `appRoutes.tsx` · `App.tsx` · `store.tsx` · `menuRoutes.ts` · `menuPermissions.ts` · `dropdownData.tsx` · `ElectronicsBusinessSales.tsx` *(শুধু লেবেল "Select Customer" → "Accounts"; §৭.৩-এ (ক) বাছলে আরও)*

**পারমিশন (প্রচলিত রীতিতে — `product.tracking.report.view` ধরনের):**

| slug | কী খোলে |
|---|---|
| `company.scheme.receivable.view` | রিপোর্ট ১ ও ৩ |
| `company.scheme.settlement.view` | রিপোর্ট ২ ও ৪, স্টেটমেন্ট |
| `company.scheme.payment.create` | পেমেন্ট এন্ট্রি (এন্ডপয়েন্ট ৫) |
| `company.scheme.settings.view` | সেটিংস স্ক্রিন |
| `company.scheme.import.create` | Excel ইমপোর্ট |

> `menuPermissions.ts`-এ মেনু `company_scheme` খুলবে উপরের যেকোনো একটি থাকলেই — নইলে যে ব্যবহারকারীর শুধু একটি পারমিশন আছে, তিনি মেনুই দেখবেন না (একই সমস্যা `product_tracking`-এ মোকাবিলা করা হয়েছে)।

**পুনর্ব্যবহারযোগ্য বিদ্যমান উপাদান:**

- `DdlMultiline` (`acType='3'`) — পক্ষ ড্রপডাউন
- `BranchDropdown` + `getDdlProtectedBranch` — শাখা
- `InputDatePicker` · `Input` · `Select` — `utils/fields/`
- `ButtonLoading` · `thousandSeparator` · `Loader` · `HelmetTitle`
- `httpService` · `RequirePermission`
- `useReactToPrint` / `useVoucherPrint` — প্রিন্ট
- কিস্তির গ্রহণ-ফ্লো (`API_INSTALLMENT_RECEIVED_URL`) — এলোকেশন স্ক্রিনের নিকটতম পূর্বসূরি, গঠন দেখে নেওয়া ভালো

**নমুনা টেমপ্লেট:** `src/components/modules/product-tracking/ProductTrackingSummary.tsx` — একই ঘরানার পাওনা রিপোর্ট (ফিল্টার সারি → টেবিল → প্রিন্ট)। নতুন স্ক্রিনগুলো এর গঠন অনুসরণ করবে।

**তারিখের সতর্কতা:** `toISOString()` ব্যবহার করা যাবে না — GMT+6 এ এক দিন পিছিয়ে যায়। বিদ্যমান `toIsoDate()` হেল্পার কপি করতে হবে (`ProductTrackingSummary.tsx:50`)।

**কোড কমেন্ট:** নতুন ফাইলে ইংরেজি কমেন্ট — কোডবেসের প্রচলিত রীতি।

---

## ৯. কাজের ধাপ

| ধাপ | কাজ |
|---|---|
| **০** | ডেটাবেস স্কিমা ও API চুক্তি চূড়ান্ত — **এই নথি** |
| **১** | পক্ষ-লেবেল "Accounts" · কোম্পানিকে সেটিংসে চিহ্নিত করা · রিপোর্ট ১ · Excel ইমপোর্ট |
| **২** | পেমেন্ট এন্ট্রি + এলোকেশন · নগদ/ব্যাংক ভাউচার · রিপোর্ট ২ ও ৩ |
| **৩** | `agreed_amount` সংশোধন · রিপোর্ট ৪ (স্টেটমেন্ট) · মিল-যাচাই · প্রিন্ট |
| **৪** *(ঐচ্ছিক)* | §৭.৩ (ক) — ইনভয়েস থেকে অটো-সংযোগ |

---

## ১০. সিদ্ধান্ত হয়ে গেছে

| বিষয় | সিদ্ধান্ত |
|---|---|
| সম্পর্ক | পরিস্থিতি-নির্ভর — কোথাও ক্রয়, কোথাও কনসাইনমেন্ট। উভয় অবস্থাতেই কাজ করবে এমন মডেল |
| কোম্পানি কী | **ইনভয়েসের পক্ষ।** আলাদা সত্তা নয়, আলাদা কলামও নয় (§২.১) |
| ইনভয়েসের লেবেল | "Select Customer" → "Accounts"। ডেটা অপরিবর্তিত, মাইগ্রেশন নেই |
| ক্রেতা | টেক্সট নাম, পক্ষ নয় — তবে পক্ষের ঘরটি থাকছে (§২.৬) |
| পরিশোধের অঙ্ক | কোম্পানি চূড়ান্ত অঙ্ক জানায় → `expected` ও `agreed` দুটোই থাকবে |
| মেয়াদ | বিক্রয় তারিখ + N দিন (কোম্পানি-প্রতি সেটিংস) |
| স্ক্রিন | আলাদা নতুন মডিউল `company-settlement` |
| পুরনো ডেটা | Excel ইমপোর্ট লাগবে |
| পেমেন্ট | বাস্তব নগদ/ব্যাংক ভাউচার তৈরি হবে — হিসাবের বইয়ের সাথে মিলবে |
| টেন্যান্ট | একই ডেটাবেসে অনেক প্রতিষ্ঠান → সব টেবিলে `company_id` |

---

## ১১. ঝুঁকি ও খোলা বিষয়

### ১১.১ উত্তর পেয়ে গেছে

**একাধিক প্রতিষ্ঠান একই ডেটাবেসে, না আলাদা?** — **একই ডেটাবেসে।** `main_trx_master.company_id = auth()->user()->company_id` (`temp/ReportsController.php:4901`)। তাই সব নতুন টেবিলে `company_id` বাধ্যতামূলক (§৪)।

### ১১.২ চুক্তির আগে ঠিক করা দরকার

1. **§৭.৩ — ইনভয়েস থেকে অটো (ক), না আলাদা এন্ট্রি (খ)?** এই নথির সবচেয়ে বড় খোলা প্রশ্ন। সুপারিশ: প্রথমে (খ)।
2. **§৬.৪ — ইমপোর্ট কি লেজার ব্যালেন্সের বিশ্লেষণ, নাকি নতুন এন্ট্রি?** না ঠিক করলে §১২.৭ কখনো মিলবে না।
3. **কমিশন/চার্জ** — কোম্পানি অঙ্ক জানানোর সময় কমিশন কাটলে সেটি কোন খাতে বসবে — কম প্রাপ্তি, নাকি খরচ? `company_scheme_settings.shortfall_coa4_id` ঘরটি এজন্য রাখা হয়েছে, কিন্তু **খালি থাকলে কী হবে** সেটাও ঠিক করতে হবে (সুপারিশ: খালি থাকলে কোনো লেজার এন্ট্রি নয়, শুধু তথ্য)।
4. **কোম্পানির সাথে ক্রয়ের হিসাব** — পণ্য কিনে নেওয়ার সময় সেই দেনা এই মডিউলে আসবে, নাকি বিদ্যমান Purchase-এই থাকবে?

### ১১.৩ অন্যান্য ঝুঁকি

- **ব্যাকএন্ড ব্যতীত কিছুই চলবে না** — এই রিপোতে শুধু ফ্রন্টএন্ড; API আলাদা Laravel রিপোতে তৈরি করতে হবে
- **একই IMEI একাধিকবার** — রিটার্ন বা পুনঃবিক্রয় হলে পাওনা কীভাবে কমবে/বাড়বে। `status='cancelled'` দিয়ে আপাতত ঢাকা পড়ে, কিন্তু ইতিমধ্যে allocation হয়ে গেলে সেটা ভেঙে মেলাতে হবে — এখনো নিয়ম নেই
- **একই কোম্পানি, একই IMEI, দুই ইনভয়েস** — UNIQUE বাধা নেই, খেয়াল রাখতে হবে
- **`serial_no` স্ট্রিং পার্সিং** — কমা/স্পেস দুইভাবেই ভাঙা হয় (`preg_split('/[,\s]+/')`)। নতুন কোডে একই রকম ধরে নিলে ভুল হবে না, তবে স্ট্রিংয়ের ভেতরে ফাঁকা IMEI বা ট্রেইলিং কমা থাকলে খেয়াল রাখতে হবে
- **ইমপোর্টের মিল** — পুরনো Excel-এর মোট পাওনা আর নতুন সিস্টেমের হিসাব মিলিয়ে দেখতে হবে; না মিললে সমন্বয় এন্ট্রি লাগবে (§৬.৪)

---

## ১২. যাচাই (বাস্তবায়নের পর)

1. একটি Electronics বিক্রয় করুন — পক্ষ হিসেবে কোম্পানি বেছে, §৩-এর তিনটি IMEI দিয়ে
2. রিপোর্ট ১ দেখুন — মোট পাওনা **৪৭,৫০০** দেখানো উচিত
3. ৩০,০০০ টাকার একটি পেমেন্ট যোগ করুন — প্রথম দুটি IMEI পূর্ণ মিটবে, তৃতীয়টিতে ৫০০ বসবে
4. রিপোর্ট ২ দেখুন — সেই তারিখে কোন কোন IMEI, কত
5. রিপোর্ট ১ আবার — অবশিষ্ট **১৭,৫০০**
6. মেয়াদ তারিখ বদলে রিপোর্ট ৩-এ এজিং যাচাই করুন
7. Accounts-এ রিসিভ ভাউচার তৈরি হয়েছে কিনা এবং Trial Balance মিলছে কিনা দেখুন — সঙ্গে `GET /reconcile`-এ `difference = 0` (§৫ নিয়ম ৮)
8. **সেই পেমেন্টটি বাতিল করুন** — পাওনা আবার **৪৭,৫০০**-এ ফিরে আসা উচিত, আর ভাউচারটিও বাতিল হওয়া উচিত (নিয়ম ৬)
