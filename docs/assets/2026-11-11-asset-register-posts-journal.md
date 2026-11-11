# অ্যাসেট রেজিস্টার থেকেই জার্নাল — প্লান

**তারিখ:** 2026-11-11 · **অবস্থা:** প্লান (কোনো কোড বদলানো হয়নি) · **ডাটাবেজ:** কোনো স্কিমা বদল নেই, কোনো patch নেই

## ১. এক নজরে

আজ Register → New Asset-এ সেভ করলে **কোথাও কিছু পোস্ট হয় না** — Register সারিটা কেবল একটা রেকর্ড। বইয়ে আনতে হলে ব্যবহারকারীকে আলাদা করে Journal স্ক্রিনে গিয়ে ডেবিট-ক্রেডিট লাইন হাতে বসাতে হয়, আর দুই জায়গার অঙ্ক হাতে মেলাতে হয়।

এই কাজে Register ফর্মেই একটি **ঐচ্ছিক** অংশ যোগ হবে: টিক দিলে সেভের সঙ্গেই একটি জার্নাল ভাউচার লেখা হবে, আর Register সারিতে সেই ভাউচারের আইডি (`main_trx_id`) বসে যাবে।

```
Cost 20,000 · Depreciation so far 4,000 · Counter account: Capital
    Dr  7813 Fixed Asset            20,000
    Cr  7814 Accumulated Dep.        4,000
    Cr    14 Capital                16,000      → একটি ভাউচার, একই সেভে
```

ক্যাটাগরিতেই হেডগুলো বাঁধা আছে (asset / accum / dep expense / disposal), তাই **হেড বাছতে হয় না** — শুধু “বিপরীত পাশ কোন হিসাবে” সেই একটি ঘর।

## ২. স্ক্রিন

`AssetRegisterForm.tsx`-এ “Brought forward from the old books” বাক্সের **নিচে** নতুন ব্লক:

| ঘর | নিয়ম |
|---|---|
| ☐ **Post this to the books** | default **বন্ধ**। শুধু নতুন সারিতে দেখাবে; edit খোললে লুকানো। |
| **Counter account** | টিক দিলে দেখাবে। `DdlMultiline` (Journal যে পিকার ব্যবহার করে), `acType="3,4,5"` — Income / Expense / Manufacturing বাদ, অর্থাৎ Assets ও Liabilities/Balances থাকে। |
| সারসংক্ষেপ (পড়ার ঘর) | “Dr Fixed Assets 20,000 · Cr Accumulated Dep. 4,000 · Cr Capital 16,000” — সেভের আগে ঠিক এই তিনটি লাইন দেখানো হয়, যাতে ভুলে কেউ অঙ্ক না মেলায়। |

⚠️ এখনকার লেখা — **“Nothing is posted from this box.”** — আর সত্যি থাকবে না। ব্লকের সাহায্য-লেখা হবে শর্তসাপেক্ষ: “পুরোনো বই থেকে আনা হলে এই দুটি সংখ্যা আগেই খতিয়ানে আছে; ওই ক্ষেত্রে টিক দেবেন না। নিজে থেকে বইয়ে আনতে চাইলে টিক দিয়ে বিপরীত হিসাব বাছুন।”

সেভের পর টোস্টে ভাউচার নম্বর: `Asset added — journal 5-261100001` (API থেকে `voucher_no` ফেরত যাবে)।

## ৩. হিসাব কীভাবে বসবে

### লাইন

| ক্রম | হিসাব | ডেবিট | ক্রেডিট |
|---|---|---|---|
| ১ | `category.asset_coa4_id` | `cost` | — |
| ২ | `category.accum_dep_coa4_id` | — | `opening_accum_dep` (শুধু > 0 হলে) |
| ৩ | counter (ব্যবহারকারীর বাছা) | — | `cost − opening_accum_dep` (শুধু > 0 হলে) |

শূন্য-অঙ্কের লাইন লেখা হবে না। `cost ≤ 0` হলে পোস্ট আটকাবে (ভাউচার শূন্য টাকার হতে পারে না — `raise()` নিজেই তা প্রত্যাখ্যান করে)।

### তারিখ

- **ভাউচারের তারিখ = `opening_as_on`**, না দিলে `purchase_date`।
  কারণ যেটা পুরোনো বইয়ের সত্যিকারের ব্যালান্স, সেটা “As on” তারিখের অবস্থা; আর `purchase_date` ওই ধরনের ক্ষেত্রে বছরেরও আগে হতে পারে।
- পোস্ট করার সময়ই নতুন নিয়ম: `opening_as_on` `purchase_date`-এর আগে হলে সেভ প্রত্যাখ্যাত। (পুরোনো সারি এডিট করার সময় এই নিয়ম লাগবে না।)
- বন্ধ বছর / বন্ধ দিন-ক্লোজ — `assertPeriodOpen`; মাসিক “Txn/Month” কোটা — `assertTransactionQuotaAvailable`। দুটোই reuse করা লেখকের ভেতরেই আছে।

### লেখক ও সিরিজ

`DepreciationRun::raiseFor()` (`app/Services/Asset/DepreciationRun.php:353`) — **public static, নতুন কোড নয়, reuse**:

- একই জায়গায় period-open + কোটা চেক, ডেবিট=ক্রেডিট যাচাই, মাস-ভিত্তিক সিরিয়াল (status ফিল্টার ছাড়া — বাতিল ভাউচারও নাম্বার ধরে রাখে),
- লেখে `main_trx_master` (`transaction_type = 5`, `voucher_type = null`, `vr_no = 5-YYMM#####`) → `acc_transaction_master` (`voucher_type_id = 3`, `is_approved = '0'`, `financial_year_id = 1`) → `acc_transaction_details`।
- অর্থাৎ **Journal স্ক্রিনের মতোই একই সিরিজ ও একই আচরণ** — কোনো নতুন ভাউচার-লেখক বানানো হবে না।

শাখা: Register সারি যে `branch_id` নিয়ে তৈরি হলো (`writeBranch()`-এর ফল), ভাউচারও **সেই শাখায়ই** — দুই জায়গায় আলাদা হিসাব নয়। কোম্পানি: `companyId()`।

ন্যারেশন: `Opening: {code} — {name}`।

> ছোট নোট: `raise()`-এর ভেতরের এরর-লেখাগুলোতে “depreciation voucher” শব্দ আছে। reuse করলে ওই লেখাগুলোই আসবে। বদলানো হলে অন্য পথের (depreciation run, disposal) লেখাও বদলাবে — তাই **এখন ছোঁব না**, ভবিষ্যতে চাইলে এক জায়গায় “journal voucher” করে নেওয়া যাবে।

## ৪. API

`POST /asset/register/store` (একই রুট; `routes/api.php:875`), `AssetRegisterController::store()` (`AssetRegisterController.php:127`)।

- নতুন ইনপুট: `post_to_books` (bool), `counter_coa4_id` (int|nullable)।
- কেবল **নতুন সারির** পথে (আজকের `$asset` null হয়ে যাওয়া শাখা, লাইন ২৬১) পোস্টিং হবে; এডিট পথে (২০৬–২৫৯) `post_to_books` উপেক্ষিত — অর্থাৎ ভাউচার কখনোই দুইবার বসবে না।
- পুরো কাজ **`DB::transaction`**-এর ভেতরে: ভাউচার → Register সারি (`main_trx_id` সহ)। একটুও ব্যর্থ হলে কিছুই থাকবে না।
- ভুল/প্রত্যাখ্যান: `AssetDepreciationController::run()`-এর মতো — `try/catch (Throwable)`, `rethrowIfPeriodClosed($e)` (বন্ধ বছরের প্রত্যাখ্যান গিলে ফেলা যাবে না, §42), বাকি সব `notFound($e->getMessage(), 422)`।
- সফল রেসপন্সে যোগ: `voucher_no` (ও `main_trx_id`)।

### শর্ত ও প্রত্যাখ্যান

| অবস্থা | ফল |
|---|---|
| টিক দেওয়া, কিন্তু `counter_coa4_id` নেই | 422 — “Which account is the other side of this entry?” |
| টিক দেওয়া, ব্যবহারকারীর `journal.create` নেই | 422/403 — পুরো সেভ আটকাবে (নীরবে সারি সেভ করে পোস্ট না করা আরও খারাপ) |
| ক্যাটাগরির `asset_coa4_id` নেই | 422। `opening_accum_dep > 0` হলে `accum_dep_coa4_id`-ও লাগবে। (`readyToPost()` তিনটি হেড চায় — পোস্টিংয়ের জন্য দরকার নেই `dep_expense`, তাই ওটা ব্যবহার করব না; বেশি কড়া নিয়ম দিয়ে বৈধ কাজ আটকানো ঠিক নয়।) |
| `counter_coa4_id` এই কোম্পানির লেভেল-৪ নয় | 422 |
| `cost = 0`, বা `cost = opening` ও opening = 0 | 422 — পোস্ট করার কিছু নেই |
| বন্ধ বছর / কোটা শেষ | 422 (period-close হলে §42-এর নিজস্ব রেসপন্স) |
| কোড ডুপ্লিকেট / opening > cost | আজকের মতোই আগে আটকাবে |

## ৫. লক (এই কাজের সবচেয়ে জরুরি অংশ)

`main_trx_id` থাকা মানে ওই সারির পিছনে বইয়ে একটা ভাউচার আছে। তাই:

| কাজ | নিয়ম |
|---|---|
| Edit — `cost`, `opening_accum_dep`, `purchase_date`, `opening_as_on`, `category_id` | **বন্ধ**, `main_trx_id` থাকলেই (`years_charged` শূন্য হলেও)। ৪২২: “এটি ঢোকার সময়ই বইয়ে পোস্ট হয়েছে; অঙ্কগুলো আর বদলানো যাবে না।” |
| Edit — `code`, `name`, `serial_no`, `location`, `notes` | খোলা (বইয়ে যায় না) |
| Branch সরানো | `main_trx_id` থাকলে বন্ধ — আজ কেবল “এক বছর চার্জ হলে” বন্ধ (লাইন ২২৫–২৩৩); সেটাও একই কারণে বাড়াতে হবে |
| Delete | `main_trx_id` থাকলে বন্ধ (আজ কেবল depreciation থাকলে; লাইন ২৯১–২৯৮)। আসল পথ = Disposal |

UI: API `index`/`edit`-এ `main_trx_id` ফেরত দেয়; `AssetRegisterTab`-এর `locked` এখন কেবল `years_charged` থেকে আসে (`AssetRegisterTab.tsx:102`, `:198`) — সেটিতে `posted` যোগ হবে, অর্থাৎ `locked = posted || years_charged > 0`। `AssetRegisterForm`-এর `form.locked` আগেই আছে, নতুন কিছু লাগবে না।

**পাশাপাশি একটা পুরোনো ফাঁকও বন্ধ হবে:** এখন কেনার পথে তৈরি Register সারির (`main_trx_id` আছে) cost/তারিখ Register স্ক্রিন থেকে এডিট হয়ে যায়, বইয়ের ভাউচার অপরিবর্তিত রেখেই। নতুন নিয়মে ওগুলোও লক হবে। পুরোনো কোনো সারি backfill করা লাগবে না।

## ৬. যা বদলাবে না

- **অবচয়ের অঙ্ক** — `DepreciationRun` আগেই `cost − opening_accum_dep − আগের চার্জ` ধরে চলে (`DepreciationRun.php:104`)। তাই opening-এ পোস্ট করলেও রান দ্বিগুণ চার্জ করবে না; `opening_accum_dep` রেজিস্টারের অঙ্কের জন্য আগের মতোই “স্মৃতি”। ✅ যাচাই করা হয়েছে।
- **কেনা (Accounts Transaction)** — অপরিবর্তিত; আইটেম, পরিমাণ, সরবরাহকারীর বাকি সব আগের মতো।
- **Balance Sheet** — contra exemption (`ReportsController::balanceSheetCreditBalances()`) ২০২৬-১১-১১-তেই বসানো হয়েছে; এই পোস্টিং ঠিক সেই কাঠামোতেই ধরবে (Fixed Assets → Less: Accumulated Depreciation → Net)।
- **`asset_registers` স্কিমা** — `main_trx_id` কলাম আগেই আছে (`AssetRegister` fillable, লাইন ৫৫)। শুধু ওই কলামের COMMENT এখন “The purchase voucher…” — প্লান অনুযায়ী “The voucher this asset entered the books with (purchase or opening)” করা ভালো (মন্তব্য, স্কিমা নয়)।

## ৭. ছুঁতে হবে এমন ফাইল

| ফাইল | কাজ |
|---|---|
| `cashbook_api/app/Http/Controllers/Asset/AssetRegisterController.php` | store-এ পোস্টিং পথ, validation, লক, destroy, class-doc (৩১–৩৩ লাইনের “posts NOTHING” এখন শর্তসাপেক্ষ) |
| `cashbook_api/app/Services/Asset/DepreciationRun.php` | কিছুই নয় — শুধু `raiseFor()` reuse |
| `cashbook_api/app/Http/Controllers/Asset/AssetCategoryController.php` | কিছুই নয় (হেড মডেল থেকেই) |
| `cashbook_react/src/components/modules/asset/AssetRegisterForm.tsx` | নতুন ব্লক, শর্তসাপেক্ষ সাহায্য-লেখা |
| `cashbook_react/src/components/modules/asset/AssetRegisterTab.tsx` | draft ফিল্ড, payload, `locked` ডেরিভেশন, টোস্ট |
| `cashbook_react/public/help/assets.json` | নতুন টপিক `asset-register` (Register ট্যাবের কোনো help টপিক আজ নেই) |
| `cashbook_react/public/help/index.json` | Assets মডিউলের topics-এ `asset-register` |
| `cashbook_react/src/components/modules/asset/AssetSetup.tsx:181` | `helpTopic` — register ট্যাবে নতুন টপিক |

তারপর `npm run help:check` (CLAUDE.md-এর নিয়ম: লেবেল/আচরণ বদলালে একই কাজে help)।

## ৮. যাচাই (কোড লেখার পর ঠিক এই ক্রমে)

1. **টিক ছাড়া** — Register সেভ → কোনো `main_trx_master` তৈরি হয়নি, `main_trx_id` NULL।
2. **টিক দিয়ে** (একই কোম্পানি/শাখা, cost 20,000, opening 4,000, counter = Capital) →
   ```sql
   SELECT id, vr_no, vr_date, transaction_type, voucher_type FROM main_trx_master WHERE id = <trx>;
   -- transaction_type 5, vr_no 5-YYMM#####, vr_date = as-on/purchase date
   SELECT coa4_id, debit, credit FROM acc_transaction_details
    WHERE trx_mstr_id = (SELECT id FROM acc_transaction_master WHERE main_trx_id = <trx>);
   -- 7813 Dr 20000 · 7814 Cr 4000 · Capital Cr 16000 · debit = credit
   ```
3. **Edit** — cost বদলে সেভ → ৪২২; `serial_no` বদলানো → সেভ হয়।
4. **Delete** — ৪২২।
5. **Balance Sheet** — ভাউচারের তারিখ বা তার পরের End Date দিয়ে: Fixed Assets 20,000, Less: Accumulated Depreciation (4,000), Net 16,000; দায়ে “Accumulated Depreciation” নেই।
6. **Depreciation run** — ওই বছরের রান: `opening_wdv = 16,000` (দ্বিগুণ নয়), ভাউচার আলাদা।
7. **রেজিস্টার ↔ খতিয়ান মিল** (শুধু পোস্ট হওয়া সারিতে, হাতে দেওয়া পুরোনো সারি বাদে):
   ```sql
   SELECT r.category_id, SUM(r.cost) cost, SUM(r.opening_accum_dep) dep
     FROM asset_registers r
    WHERE r.company_id = ? AND r.main_trx_id IS NOT NULL GROUP BY r.category_id;

   SELECT d.coa4_id, ROUND(SUM(d.debit - d.credit), 2) bal
     FROM acc_transaction_details d
     JOIN acc_transaction_master m ON m.id = d.trx_mstr_id
    WHERE m.main_trx_id IN (SELECT main_trx_id FROM asset_registers
                             WHERE company_id = ? AND main_trx_id IS NOT NULL)
    GROUP BY d.coa4_id;   -- asset হেডে +cost, accum হেডে −dep
   ```
8. **পারমিশন** — `journal.create` নেই এমন ব্যবহারকারী টিক দিয়ে সেভ → ৪২২, কিছুই লেখা হয়নি।
9. **বন্ধ বছর** — রেজিস্টার-ডেট বন্ধ বছরে → §42 রেসপন্স, কিছুই লেখা হয়নি।
10. **Help** — `npm run help:check` সবুজ; Register ট্যাবে help বাটন নতুন টপিক খোলে; `npm run build` আলাদা করে চালানো (build টাইপ-চেক করে না — `npx tsc` এখানে নেই, তাই এডিটরে চোখ রাখুন)।

## ৯. ডিপ্লয় ও রোলব্যাক

- **API আগে, React পরে।** পুরোনো API নতুন ফিল্ড চিনবে না → ব্যবহারকারী টিক দিয়ে সেভ করেও কিছু পোস্ট না হয়ে ভাববে হয়েছে। সুতরাং UI আগে গেলে এই নীরব মিথ্যা।
- **কোনো patch/migration নেই**, কোনো নতুন permission সারি নেই (`journal.create` reuse), কোনো নতুন টেবিল নেই। প্রতি-টেন্যান্ট ডাটাবেজে কিছু চালানো লাগবে না।
- Rollback = দুই ফাইলের রিভার্ট। ইতিমধ্যে পোস্ট হওয়া ভাউচার রিভার্টে মুছবে না — আর মুছবেও না; ভুল পোস্ট হলে হাতে correcting journal / disposal দিয়ে ঠিক করতে হবে (এই স্কোপে auto-unwind নেই)।

## ১০. এই কাজে নেই (আলাদা সিদ্ধান্ত হলে)

- Register-এ আইটেম স্বয়ংক্রিয়ভাবে তৈরি (Items ক্যাটালগ বস্তুর নামে ভরে যাবে — আলাদা আলোচনা)।
- সরবরাহকারীর বাকিতে Register থেকেই পোস্ট (তখন পরিমাণ/আইটেমের দাগ থাকে না — কেনার স্ক্রিনই ঠিক)।
- পোস্ট হওয়া সারি ভাঙার UI (reversal)।
- `opening_account_groups`-এ Fixed Assets যোগ করে Opening Balance স্ক্রিনে আনা।
- পুরোনো (হাতে জার্নাল দেওয়া) সারিতে `main_trx_id` backfill।

## ১১. ঝুঁকি

| ঝুঁকি | প্রতিকার |
|---|---|
| মাইগ্রেশনের সময় কেউ অভ্যাসবশত টিক দেয়, অথচ বইয়ে ওপেনিং আগেই আছে → দ্বিগুণ পোস্ট | default বন্ধ; বিপরীত হিসাব বাধ্যতামূলক; সেভের আগে তিন লাইনের সারসংক্ষেপ; help-এ সতর্কতা |
| Register আর খতিয়ান আলাদা হয়ে যাওয়া (এটাই মূল ভয়) | `main_trx_id` থাকলে অঙ্ক-তারিখ-ক্যাটাগরি এডিট ও ডিলিট বন্ধ |
| ডাবল-ক্লিকে দুটি ভাউচার | `saving` অবস্থায় বাটন বন্ধ (আজই আছে); ভাউচার-সিরিয়াল `lockForUpdate` নিয়ে লেখা হয় |
| ভুল ক্যাটাগরি বাছা → ভুল হেডে পোস্ট | ক্যাটাগরি রিপোর্টে সারসংক্ষেপে হেডের নাম দেখানো হবে (আইডি নয়) |

---

**পরের ধাপ:** এই প্লান অনুমোদন করলে কোড লেখা শুরু হবে। বদলাতে চাইলে সবচেয়ে আগে ঠিক করুন — (ক) ভাউচারের তারিখ `opening_as_on` হবে কি না, (খ) পোস্টিংয়ের গেট `journal.create` হবে কি না।
