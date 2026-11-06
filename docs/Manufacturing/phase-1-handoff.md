---
title: "Manufacturing Phase 1 — কাজের অবস্থা ও অন্য কম্পিউটারে চালানো"
---

**তারিখ:** ৪ নভেম্বর ২০২৬
**মূল পরিকল্পনা:** [v4-manufacturing-production-plan.md](v4-manufacturing-production-plan.md)। নিয়ম, সিদ্ধান্ত আর Phase 0-এর প্রমাণ সব সেখানে। এই ফাইল শুধু বলে কী হয়েছে, কোথায় আছে, আর অন্য কম্পিউটারে কীভাবে শুরু করবেন।

## ১. এক নজরে

- Phase 1-এর backend আর frontend দুটোই তৈরি ও যাচাই করা (dev DB, test branch 11)।
- কোড লিখেছে Command Code; প্রতিটা ধাপ Claude Code মিলিয়ে দেখেছে।
- ধাপ ১-এ নতুন ফর্ম মাত্র দুটো: **Production Entry** আর **Production Sales Return**। ক্রয়, খরচ/মজুরি, বিক্রি আর Branch Transfer আগের ফর্মেই চলে।
- আগের ফর্মে একটাই অনুমোদিত বদল: **Item opening stock পরিমাণ দুই দশমিকে** নেয়।
- আগের কোনো এন্ট্রি ফর্ম, `productValidation`, `StockCostLayers`, `VoucherModificationController`: কিছুই বদলায়নি।
- P&L-এ একটাই অনুমোদিত বদল, ক-২ #১২ "গ" (৪ নভেম্বর ২০২৬): production-এ বণ্টন করা খরচ COGS-এর **Direct Acquisition Costs** লাইনে যায়, আর একই অঙ্ক Production Cost খরচের group থেকে বাদ যায়। Gross profit আসল দেখায়, net profit বদলায় না, কোনো ledger লেখা হয় না। বিস্তারিত §৪-ক।

## ২. কোড কোথায়

| Repo | Branch | অবস্থা |
| --- | --- | --- |
| `cashbookbd_react` (frontend), `https://github.com/lutforurc/cashbookbd_react` | `Manufacturing-UI` (`Reseller-ui` থেকে) | push করা হয়েছে |
| `cashbook_api` (backend), `https://github.com/lutforurc/cashbook_api` | `Manufacturing-API` | push করা হয়েছে |

অন্য কম্পিউটারে:

```bash
git -C <frontend-folder> fetch origin
```

```bash
git -C <frontend-folder> checkout Manufacturing-UI
```

```bash
git -C <backend-folder> fetch origin
```

```bash
git -C <backend-folder> checkout Manufacturing-API
```

`.commandcode/taste/taste.md` Command Code নিজে বদলায়; এটা commit-এ রাখা হয় না।

### Backend (`cashbook_api`)

| ফাইল | কী |
| --- | --- |
| `database/sql/2026_11_04_manufacturing_production.sql` | এই কাজের সব SQL এক ফাইলে: production টেবিল, voucher type, expense head marker, permission |
| `app/Console/Commands/AddUnitTypeToBuildingUnits.php` | একই SQL patch method হিসেবে (`runProductionSchema()`, `runProductionVoucherTypes()`, `runProductionAccountHeads()`, `grantProductionPermissions()`), `handle()` থেকে Product In/Out-এর পরে ডাকা |
| `app/Services/Production/ProductionPosting.php` | Draft / Post / Reverse; এক transaction; দুই সারির output; negative stock বন্ধ; backdating guard; কোনো ledger লেখে না |
| `app/Services/Production/ProductionCostLayers.php` | তারিখ-নির্ভর FIFO (`vr_date, mtm.id, ids.id`), ঘাটতি ভরে না |
| `app/Services/Production/ProductionCostAllocator.php` | খরচ বণ্টন: row lock, একই মাস, বেশি বণ্টন বন্ধ, released বাদ |
| `app/Services/Production/ProductionSalesReturnPosting.php` | ফেরত মাল original বিক্রির FIFO খরচে stock-এ; ledger আগের Sales Return-এর মতো |
| `app/Services/Production/ProductionAccountHead.php` | `PROD_EXPENSE_*` marker দিয়ে head খোঁজা |
| `app/Http/Controllers/Production/` | `ProductionController`, `ProductionReportController`, `ProductionSalesReturnController` |
| `routes/api.php` | `/api/production/*` (নিচে) |
| `app/Http/Controllers/Products/ItemController.php` | opening stock qty ও মোট টাকা দুই দশমিকে (অনুমোদিত বদল) |
| `app/Http/Controllers/Reports/ReportsController.php` | `productLedgerData()` ও `productStatementData()`-এ production শাখা যোগ, `Schema::hasTable('production_master')` দিয়ে সুরক্ষিত; আগের ছয় শাখা অপরিবর্তিত। "গ": `profitLossData()` নতুন key `production_cost` পাঠায় (`productionCostData()`); পণ্যভিত্তিক লাভের Adjustment আর `apiProfitLossDateWise()` সেটা ধরে |
| `app/Http/Controllers/Reports/MonthlyStatementController.php`, `CashFlowStatementController.php` | "গ": একই নিয়মে gross profit / COGS |
| `resources/views/reports/newreports/profit_loss_print.blade.php` | "গ": পুরনো print-এ "Direct Acquisition Costs (production)" লাইন |

API (সবই permission + branch-এর `manufactur_control` দিয়ে বন্ধ):

- `GET /api/production/list`, `/details/{id}`, `/allocatable-expenses`, `/available-stock`
- `POST /api/production/store`, `/update`, `/post/{id}`, `/reverse/{id}`, `/destroy/{id}`
- `GET /api/production/report/register`, `/report/costing/{id}`
- `POST /api/production/sales-return/store`, `/edit`, `/update`

### Frontend (`cashbookbd_react`)

| ফাইল | কী |
| --- | --- |
| `src/components/modules/production/` | `productionSlice.tsx`, `ProductionEntry.tsx`, `ProductionSalesReturn.tsx`, `ProductionRegister.tsx`, `BatchCosting.tsx` |
| `src/components/Sidebar/index.tsx`, `menuPermissions.ts`, `menuRoutes.ts` | "Production" মেনু গ্রুপ (Requisition আর Real Estate-এর মাঝে) |
| `src/App.tsx`, `services/appRoutes.tsx`, `services/apiRoutes.tsx`, `store.tsx` | route, endpoint, slice যোগ |
| `modules/product/AddProduct.tsx`, `Product.tsx` | opening qty input-এ `step="0.01"` |
| `modules/reports/profit-loss/ProfitLoss.tsx`, `profitLossNotes.ts` | "গ": `directAcquisitionCosts = production_cost.total`, খরচের group থেকে বাদ; note ৩-এর লেখা অঙ্ক থাকলে বদলায় |

পাতার ঠিকানা: `/production/entry`, `/production/sales-return`, `/production/register`, `/production/costing/:id`।

## ৩. নতুন কম্পিউটারে চালু করা

1. দুই repo-তে উপরের branch checkout।
2. Backend-এ dependency ও `.env` আগের মতো (DB: `krishibitandatabase` বা যেটা ব্যবহার করেন)।
3. Patch চালানো (দুবার চালালেও ক্ষতি নেই)। এটাই `cost_share_pct` আর `expiry_date` দুটোই যোগ করে:

```bash
php artisan patch:add-unit-type
```

```bash
php artisan permission:cache-reset
```

```bash
php artisan route:clear
```

4. Frontend dev server চালু।
5. **Edit Branch → "Feature Controls" ধাপ → "Control Manufacture?" চালু → Save।** এটা Basic Info-তে নেই।
6. **Logout করে আবার login।** Branch setting login-এর সময় আসে।
7. Sidebar-এ **Production** মেনু দেখা যাবে। দেখা না গেলে: user-এর `production.*` permission আছে কি না, আর login করা branch-এ `com_branches.manufactur_control = 1` কি না।

### Dev DB-র trigger সমস্যা (শুধু local)

`krishibitandatabase`-এর `main_trx_master`-এ তিনটা trigger (`trg_mtm_closed_year_bi/bu/bd`)-এর definer ছিল `krishibitanuser@%`, যে user local সার্ভারে নেই। ফলে কোনো voucher save হতো না। এই কম্পিউটারে trigger-গুলো একই body দিয়ে `DEFINER=root@localhost`-এ আবার বানানো হয়েছে; আসল definition-এর কপি Command Code-এর scratchpad-এ (`triggers_backup_krishibitandatabase.sql`)।

নতুন কম্পিউটারে DB ক্লায়েন্টের dump থেকে আবার আনলে একই সমস্যা হতে পারে। তখন একই কাজ (শুধু local DB-তে) বা ওই নামের MySQL user বানানো। **ক্লায়েন্টের আসল সার্ভারে trigger বা user-এ হাত নয়।** অন্য local DB-গুলোতেও (`aftradingdb` ইত্যাদি) নিজের নিজের user-এর নামে trigger আছে।

### Test data

- **Branch 11 "PROD-TEST-132454"** (company 1): acceptance-এর পুরো ক্রম এখানে, `manufactur_control` চালু। Production Register-এ batch দেখা যায়। Opening stock পরীক্ষার দুটো সারিও (১২.৫০ @১৭১.১৬, ১০ @১০০) এখানে।
- Branch 1 (Krishibitan Tiles & Sanitary Corner)-এ `manufactur_control` বন্ধ ছিল; মেনু দেখতে চালু করতে হয়।

## ৪. যা যাচাই হয়েছে

| যাচাই | ফল |
| --- | --- |
| Worked example (v4 খ-১৩): closing ৮,৫৫৮.০০; net sales ৯,০০০; COGS ৪,৬৪২; gross ৪,৩৫৮; Factory Labour ৩,০৬০; net ১,২৯৮; TB ৩০,০০০ = ৩০,০০০; BS ২১,২৯৮ = ২১,২৯৮; Register আসল gross ১,২৯৮ | পাস, DB-র সারি মিলিয়ে দেখা |
| আগের মাসের খরচ বণ্টন আটকায়; বেশি বণ্টন আটকায় | পাস |
| ৮ kg নষ্ট, ৫% সীমা → অস্বাভাবিক ৪৮৭.৮০, output ১ @১৭১.১৬ + ৯১ @১৭১.৪৪ = ১৫,৭৭২.২০ | পাস |
| Rounding: ১৬,২৬০/৯৫ → ১ @১৭০.৯৬ + ৯৪ @১৭১.১৬; ৬,৯৯৪/১৯৮ → ১ @৩৫.৯৬ + ১৯৭ @৩৫.৩২ | পাস |
| Reversal: কিছু মোছে না; voucher status 0, খরচ released, input layer থাকে, Batch Costing-এ "Reversed" | পাস |
| একাধিক দামের ও আংশিক FIFO layer | পাস |
| দুবার post-এ একবারই movement | পাস |
| Permission ছাড়া, manufacture বন্ধ branch, অন্য company: API প্রত্যাখ্যান | পাস |
| আগের Sales Return বনাম নতুন: ledger হুবহু এক, শুধু stock-এর দাম (২০০ বনাম ১৭১.১৬) আলাদা | পাস |
| Opening stock ১২.৫০ @১৭১.১৬ → stock, purchase সারি, ledger তিনটাই ২,১৩৯.৫০; ১০ @১০০ আগের মতোই | পাস |
| `production_master` না থাকলেও Product Ledger/Statement চলে | পাস |
| Vite build | পাস |

## ৪-ক. Gross profit: সিদ্ধান্ত "গ" (৪ নভেম্বর ২০২৬)

**কেন:** P&L-এর trading অংশ শুধু ক্রয়, বিক্রি, ফেরত আর stock পড়ে। মজুরি বসে নিচে, খরচের তালিকায়। Production মজুরিকে তৈরি মালের দামে (closing stock-এ) ঢোকায়, কিন্তু "ক্রয়"-এ ঢোকায় না। তাই "ক"-তে gross profit মজুরির পুরো টাকা বেশি দেখাত (worked example-এ ৪,৩৫৮, আসল ১,২৯৮), যদিও net profit ঠিক থাকত। "খ" (স্বয়ংক্রিয় Journal দিয়ে মজুরিকে Purchase-এ সরানো) বাদ, কারণ তাতে Purchase-এর অঙ্কে মজুরি মেশে আর ledger লিখতে হয়।

**"গ" কী করে:** কোনো ledger লেখে না। শুধু রিপোর্টে এক অঙ্ক দুই জায়গায় বসায়: COGS-এর "Direct Acquisition Costs"-এ যোগ, আর Production Cost খরচের group থেকে বাদ।

**অঙ্কটা কীভাবে আসে** (`ReportsController::productionCostData()`):

- শুধু `PROD_EXPENSE_*` head (Factory Labour, Packing Labour, Factory Transport)। অফিস খরচ আর 197/199 (Purchase Transportation, Unloading) সরে না।
- Batch `posted`, বণ্টন `active` (বা পুরনো সারিতে NULL)। Reverse করা batch বাদ।
- Production-এর তারিখ আর খরচের voucher-এর তারিখ দুটোই P&L-এর range-এর মধ্যে, একই branch ও company, voucher live (`status = 1`, `is_closing = 0`)।
- প্রতি খরচের সারিতে `LEAST(বণ্টিত টাকা, সারির বর্তমান debit)`, তাই voucher পরে কমালে বেশি সরে না।
- প্রতি group-এ সীমা: সেই group-এর net (debit − credit, ০-এর নিচে নয়)। ফলে যত যোগ হয় ঠিক তত বাদ যায়, net profit কখনো বদলায় না। (প্রথম সংস্করণে এই সীমা ছিল না; group-এ সংশোধনী credit থাকলে net profit কমে যেত। ধরা পড়ে ঠিক করা হয়েছে।)
- টেবিল না থাকলে বা production না থাকলে অঙ্ক ০। তখন সব রিপোর্ট আগের মতো হুবহু।

**কোথায় কোথায় লাগানো:** gross profit যে ছয় জায়গায় আলাদা করে হিসাব হয়, সবগুলোতে একই নিয়ম: P&L স্ক্রিন ও print (`ProfitLoss.tsx`), পুরনো Blade print, Monthly Statement, Cash Flow, পণ্যভিত্তিক লাভের Adjustment, দিনভিত্তিক P&L। কোনো জায়গা বাদ পড়লেও সেখানে net profit ঠিক থাকে, শুধু gross profit "ক"-এর মতো দেখায়।

**বাকি রাখা:** `apiProfitLossExpenseSummary()` (খরচের group-এ ক্লিক করলে head-এর বিস্তারিত) আগের মতো পুরো head দেখায়; Production Cost group আংশিক কমলে বিস্তারিতের যোগফল group-এর লাইনের চেয়ে বেশি দেখাবে। ইচ্ছে করে বদলানো হয়নি।

**যাচাই** (Command Code, `myappsaasdatabase`-এ company 1 / branch 11-এ worked example transaction-এর ভিতরে বানিয়ে আসল controller চালিয়ে roll back; কোনো সারি থেকে যায়নি; Claude Code diff মিলিয়ে দেখেছে):

| অবস্থা | আগে: gross / খরচ / net | পরে: gross / খরচ / net | সরানো অঙ্ক |
| --- | --- | --- | --- |
| Worked example | ৪,৩৫৮ / ৩,০৬০ / ১,২৯৮ | ১,২৯৮ / ০ / ১,২৯৮ | ৩,০৬০ |
| Batch reverse / বণ্টন released | ৪,৩৫৮ / ৩,০৬০ / ১,২৯৮ | একই | ০ |
| Range production-এর তারিখের আগে শেষ | ৪,৩৫৮ / ৩,০৬০ / ১,২৯৮ | একই | ০ |
| খরচের voucher ৩,০৬০ → ২,০০০ | ৪,৩৫৮ / ২,০০০ / ২,৩৫৮ | ২,৩৫৮ / ০ / ২,৩৫৮ | ২,০০০ |
| বণ্টন ৫,০০০, voucher-এ ৩,০৬০ | ৪,৩৫৮ / ৩,০৬০ / ১,২৯৮ | ১,২৯৮ / ০ / ১,২৯৮ | ৩,০৬০ |
| অফিস head-এ খরচ (PROD_EXPENSE নয়) | ৪,৩৫৮ / ৩,০৬০ / ১,২৯৮ | একই | ০ |
| Group-এ ৩,০৬০ credit (net ০) | ৪,৩৫৮ / ০ / ৪,৩৫৮ | একই | ০ |
| Group-এ ১,০০০ credit (net ২,০৬০) | ৪,৩৫৮ / ২,০৬০ / ২,২৯৮ | ২,২৯৮ / ০ / ২,২৯৮ | ২,০৬০ |

- Worked example-এ বাকি রিপোর্ট: Monthly Statement COGS ৭,৭০২, gross ১,২৯৮; Cash Flow COGS ৭,৭০২, reconciles; দিনভিত্তিক P&L লাভ ১,২৯৮; TB ৩০,০০০ = ৩০,০০০; BS ২১,২৯৮ = ২১,২৯৮।
- Production নেই এমন branch আর production টেবিল নেই এমন DB: P&L, Monthly, Cash Flow, দিনভিত্তিক, Balance Sheet-এর JSON আগে-পরে হুবহু এক।
- Blade print: অঙ্ক থাকলে "Direct Acquisition Costs (production)" লাইন আসে, Production Cost লাইন যায়; reverse করলে উল্টো।
- `php -l` পাস, `npm run build` exit 0।
- Commit: API `ae55724e`, React `56d63a9f`, দুটোই push করা।

## ৪-খ. পর্যালোচনা ও সংশোধন (৫ নভেম্বর ২০২৬)

v4 আর পুরো কোড মিলিয়ে দেখা হয়েছে (Claude Code)। যা ভুল পাওয়া গেল আর ঠিক হলো:

| # | কোথায় | সমস্যা | ঠিক করা |
| --- | --- | --- | --- |
| ১ | Production Entry (৪ নভেম্বর, commit `bf4a31d7`) | Product-এর ঘরে Chart of Accounts আসত; খরচের তালিকা কখনো ভরত না; Edit draft খুলত না | ProductDropdown; thunk-এর সঠিক ডাক |
| ২ | `ProductionPosting` নষ্টের হিসাব | সব input-এর পরিমাণ যোগ করে tolerance ধরত, তাই repack-এ ৫০ kg + ১৯৮ packet = ২৪৮ "unit"; স্বাভাবিক নষ্ট বেশি, অস্বাভাবিক কম আসত | শুধু loss basis-এর unit-এর input (যেমন "kg" = "Kg.") ধরা হয়; কোনোটা না মিললে আগের মতো সব |
| ৩ | Posting | অস্বাভাবিক নষ্টে কারণ ছাড়াই post হতো (v4 খ-৪-এ বাধ্যতামূলক) | কারণ না লিখলে post আটকায় |
| ৪ | Posting | Batch ref খালি থাকলে stock-এ `date('Ymd')` বসত (v4 খ-১, খ-৬) | খালি থাকলে voucher নম্বরই batch ref |
| ৫ | Posting | Output-এ Non Asset (type 2) পণ্য বা output = নিজের input চলত | দুটোই আটকায় |
| ৬ | Production Register | কোনো draft-এ খরচ বসালেই সারি লাল দেখাত ("no longer posted") | শুধু posted batch পরীক্ষা হয় |
| ৭ | Register | কাঁচামালের ক্রয় edit (দাম/পরিমাণ বদল) ধরা পড়ত না, শুধু মোছা ধরত (v4 Check ১৪) | voucher + product + দাম + পরিমাণ মিলিয়ে দেখে |
| ৮ | Entry-র "On hand" | branch-এর সর্বকালের balance দেখাত, batch-এর তারিখের নয়; post অন্য সংখ্যা ধরত | post যে reader ব্যবহার করে সেটাই, batch-এর তারিখে |
| ৯ | Production Sales Return (টাকা) | `netpayment`-এ সবসময় মোট ফেরত পাঠাত। পুরনো ফর্মে এটা "Cash Payment"। ফলে বাকির কাস্টমারের ফেরতেও ledger-এ নগদ ফেরত লেখা হতো | পুরনো ফর্মের মতো "Cash Payment" ঘর: ক্যাশ কাস্টমারে মোট টাকা (বন্ধ), অন্যদের ০ থেকে শুরু, বদলানো যায় |
| ১০ | Production Sales Return (stock) | একই বিক্রির বিপরীতে বিক্রির চেয়ে বেশি ফেরত নেওয়া যেত | আগের সব ফেরত (পুরনো ও নতুন ফর্ম) মিলিয়ে বিক্রির পরিমাণ ছাড়ালে আটকায় |

**যাচাই:** `myappsaasdatabase`-এ company 18-এ একটা transaction-এর ভিতরে fixture (৫০ kg @১২০ + ১৯৮ packet @২, repack ১৯৬ packet, ৩ kg নষ্ট, ১% সীমা, বিক্রি ১০) বানিয়ে আসল controller ও service চালানো হয়েছে, তারপর roll back। ১৭টা পরীক্ষাই পাস: স্বাভাবিক নষ্ট ০.৫ kg, অস্বাভাবিক ২.৫ kg, অস্বাভাবিক খরচ ৩১৯.৮০, output ৬,০৭৬.২০ (layer মিলে হুবহু), batch ref = voucher নম্বর, ফেরত ৪টা @৩১.০২ (FIFO), আরও ৭টা ফেরত আটকায়, ক্রয়ের দাম বদলালে batch লাল। কোনো সারি থেকে যায়নি। `php -l` পাস, `npm run build` exit 0।

**জেনে রাখা, এখন বদলানো হয়নি:**

- ~~Register-এর "Net sales" branch-এর সব বিক্রি ধরে...~~ **ঠিক করা হয়েছে (§৪-ঘ): Register এখন শুধু batch-এর output পণ্যের বিক্রি ধরে।**
- Production-এর FIFO ক্রয়ের `purchase_pct` (rebate) বাদ দেয় না, closing stock দেয়। কোনো local DB-তে এখন কোনো ক্রয়ে এটা ব্যবহার হয়নি।
- FIFO আর "On hand" গুদাম আলাদা করে না, পুরো branch ধরে।
- Production Sales Return-এর ভাউচার তারিখ "Original Sale Date" ঘর থেকে আসে, পুরনো Sales Return-এর মতোই। আজকের ফেরত পুরনো বিক্রির তারিখে বসতে পারে।
- ~~Production Sales Return খুঁজে edit করার স্ক্রিন নেই।~~ **বানানো হয়েছে (§৪-ঘ): Vr. No. দিয়ে খুঁজে edit/update/cancel।**
- Production-এর পাতায় `thousandSeparator(x, 2)`-এর `2` কাজ করে না; দশমিক branch setting থেকে আসে।

## ৪-গ. এক ব্যাচে একাধিক পণ্য (৫ নভেম্বর ২০২৬)

**মালিকের সিদ্ধান্ত:** Output একাধিক হতে পারে; খরচ ভাগ **বিক্রয়মূল্য অনুপাতে**।

- **নিয়ম:** প্রতিটা output-এর ভাগ = পরিমাণ × পণ্যের sales price ÷ সব output-এর যোগফল। Entry-র Output ট্যাবে ভাগ % নিজে দেখায়; একটা বদলালে সবগুলো "হাতে লেখা" হয়ে যায় (মোট ১০০% হতে হবে), "Use sales value" চাপলে আবার স্বয়ংক্রিয়। কোনো output-এর sales price না থাকলে, আর হাতে ভাগ লেখা না থাকলে, post আটকায়।
- **টাকা:** প্রতিটা output-এর টাকা = output value × ভাগ, পয়সায় গোল; শেষ output বাকিটা নেয়, তাই মোট হুবহু মেলে। প্রতিটা output দুই সারিতে (residual আগে)।
- **Schema:** `production_outputs.cost_share_pct` DECIMAL(9,4) NULL। SQL ফাইল আর `runProductionSchema()` দুই জায়গায় যোগ, দুবার চালালেও ক্ষতি নেই। `myappsaasdatabase`-এ যোগ করা হয়েছে; **অন্য DB-তে `php artisan patch:add-unit-type` চালাতে হবে।**
- **API:** `store`/`update` এখন `outputs: [{product_id, godown_id, qty, share_pct}]` নেয়; পুরনো একক `output` এখনো চলে। `production_master.output_*` ঘরে প্রথম output থাকে। List, Register আর Batch Costing প্রতিটা output দেখায় (`outputs`)।
- **Reverse:** যেকোনো output বিক্রি/স্থানান্তর হলে আটকায়। Backdating-এর পরীক্ষায় সব output ধরা হয়।
- **যাচাই** (একই rollback probe, ২৬টা পরীক্ষা পাস): ৪০ × ২৫০ আর ২০০ × ২৯ → ৬৩.২৯% / ৩৬.৭১%, টাকা ৪,০৪৮.১০ + ২,৩৪৭.৯০ = ৬,৩৯৬.০০; হাতে ৭০/৩০ → ৪,৪৭৭.২০ + ১,৯১৮.৮০; মোট ১০০% না হলে আটকায়; দাম না থাকলে আটকায়; দ্বিতীয় output বিক্রির পর reverse আটকায়; অব্যবহৃত batch reverse হয়।
- **বাকি:** উপজাত/ঝরতি মাল (খরচ ০) আলাদা চিহ্ন নেই; লাগলে বলবেন।

## ৪-ঘ. ২৮- প্রিন্ট, return edit, Register net sales, print ও expiry (৬ নভেম্বর ২০২৬)

| # | কোথায় | সমস্যা | ঠিক করা |
| --- | --- | --- | --- |
| ১ | ২৮- Production Sales Return-এর প্রিন্ট | ভয় ছিল voucher_type বা `13` prefix-এর ওপর নির্ভর করে | **নির্ভর করে না।** `electronics/sales/invoice-print` নম্বর ধরে voucher পড়ে, type জিজ্ঞেস করে না; `salesPrintData()` `sales_return_master.details` ও ledger-এর customer leg দুটোই পাঠায়। `ReturnPrint` সেটাই আঁকে। কোনো কোড বদল লাগেনি; শুধু যাচাই হয়েছে |
| ২ | `ProductionSalesReturnPosting::rebuild()` | প্রতিবার edit-এ পুরনো `inventory_sales_return_masters/_details` রয়ে যেত; edit/print পুরনো সারি পড়তে পারত। এছাড়া cash payment বদলালেও `main_trx_master.transaction_type` বদলাত না, তাই Cash Book ধরত না | `clearVoucher()` এখন voucher-এর নিজের return master/details-ও মুছে নতুন করে লেখে; `transaction_type` = ২ (নগদ) / ৫ (বাকি) হয়, `vr_no` অপরিবর্তিত |
| ৩ | `ProductionReportController::periodSummary()` | net sales পুরো branch-এর Sales head (১৫/১৯) ধরত, খরচ ধরত শুধু output পণ্যের | net sales এখন `inventory_sales_details` ও `inventory_sales_return_details` থেকে, শুধু batch-এর output পণ্যের জন্য (§ নিচে) |
| ৪ | Production Register / Batch Costing-এর print | Register-এ ধূসর লেখার ঝুঁকি; Batch Costing-এ print-ই ছিল না | Register-এর print কঠোরভাবে solid black; Batch Costing-এ Print বোতাম ও সম্পূর্ণ কালো কাগজ যোগ |
| ৫ | Expiry | কোথাও ঘর ছিল না | `production_outputs.expiry_date` DATE NULL (ঐচ্ছিক), output-ভিত্তিক; Entry-র Products out-এ ঘর ও কলাম, Recent batches / Register / Batch Costing-এ দেখা যায়; উৎপাদনের তারিখের আগে হলে স্ক্রিনে ও সার্ভারে আটকায় |

### ২৮- প্রিন্ট (টাস্ক ১)

`ProductionSalesReturnPosting::store()` আগের Sales Return-এরই `SalesReturn::SalesReturnMaster()` দিয়ে `inventory_sales_return_masters/_details` লেখে, `main_trx_id` সহ। `ElectronicsSalesController::salesPrintData()` (`:167`) কোনো type/prefix পরীক্ষা করে না; `salesReturnMaster.details.product.*` আর `AccTransactionMaster...coaL4.custPartyInfos` একসাথে আনে। `VoucherPrintRegistry`-র `default` শাখা `GET production/voucher-types` থেকে **নাম ধরে** production return-এর id নিয়ে `ReturnPrint kind="sales_return"` প্রিন্ট করে। ফলে `২৮-` voucher কাগজে ঠিক লাইন আর customer দেখায়; `১৩-` voucher-এর উত্তর হুবহু আগের মতোই থাকে।

সীমাবদ্ধতা: Cash head (`coa4 17`) দিয়ে করা return-এ কাগজে `Name : -` আসে, ঠিক যেমন `১৩-` return-এ আসে; ledger-এ ওই head-এর কোনো party record নেই।

### Production Sales Return edit (টাস্ক ২)

- স্ক্রিনে **Vr. No.** লিখে **Find**; পাওয়া গেলে form ভরে যায়, **Update Return** দিয়ে একই নম্বরে save, **Cancel edit** দিয়ে নতুন return-এ ফেরা।
- `edit()` এখন `cash_payment` (আসল নগদ ফেরত, `netpayment`-এরই নামান্তর) আর `sale_date` (মূল বিক্রির `vr_date`) পাঠায়; stored date খালি হলে `invoice_date`-ও ওই তারিখই হয়। reload করা বাকি return-এ আসল নগদ ফেরত দেখায়, refund total নয়।
- Cash Payment নিয়ম অপরিবর্তিত: account 17-এ refund total বাঁধা, অন্যরা ০ থেকে শুরু করে বদলানো যায়।
- Over-return guard আগের মতোই edit-কৃত voucher বাদ দেয় (`mtm.id <> $mtmId`); edit-এ qty বাড়ালে বিক্রির বাকি পরিমাণের বেশি হলে আটকায়।

### Register net sales (টাস্ক ৩)

`periodSummary()`-র net sales এখন শুধু batch-এর **output পণ্য** পড়ে (double-check: branch-এর অন্য পণ্য বাদ):

| কী | কোথা থেকে | কীভাবে |
| --- | --- | --- |
| বিক্রির লাইন | `inventory_sales_details.quantity`, `.sales_price`, `.sales_pct`, `.line_net_total` | line net = `line_net_total` (থাকলে ও > ০), নয়তো `qty × price × (1 − sales_pct/100)`; কলাম না থাকলে `qty × price` |
| বিক্রির invoice discount | `inventory_sales_masters.discount` | invoice-এর line net অনুপাতে ভাগ; output পণ্যের ভাগটুকুই বাদ |
| ফেরতের লাইন | `inventory_sales_return_details.quantity`, `.return_price` | `qty × return_price` |
| ফেরতের discount | `inventory_sales_return_masters.discount` | line value অনুপাতে ভাগ; output ভাগটুকু ফেরত যোগ (head ২৩ credit-এর মতো) |

হিসাব: `net sales = (output বিক্রির line net − output-এর invoice discount share) − (output ফেরতের মান − output-এর return discount share)`। v4 খ-১৩-এ আগের মতোই **net sales ৯,০০০, true gross profit ১,২৯৮**।

### Print (টাস্ক ৪)

- `ProductionRegister.tsx`: print কাগজে সব লেখা `#000 !important`, `print-color-adjust: exact`; Expiry কলাম যোগ। স্ক্রিনের theme অপরিবর্তিত।
- `BatchCosting.tsx`: **Print** বোতাম যোগ; আলাদা লুকানো কাগজে batch-এর সব section (Inputs, layers, allocations, Output layers) solid black; Output layers-এ Expiry কলাম। স্ক্রিনের theme অপরিবর্তিত।

### Expiry (টাস্ক ৫)

- **Schema:** `production_outputs.expiry_date` DATE NULL — `database/sql/2026_11_04_manufacturing_production.sql`-এ information_schema-guarded ALTER, আর `runProductionSchema()`-এ CREATE + guarded ALTER (cost_share_pct-এর মতোই)। `inventory_details` বা অন্য টেবিলে হাত নেই; নতুন artisan command নেই।
- **API:** store/update-এ `outputs[].expiry_date`; post-এ planned সারি মুছে যে দুই rounded সারি লেখা হয় দুটোতেই expiry থাকে; `details`, `outputsByBatch` (তাই list/Recent batches/Register), `costing`—সবই ফেরত দেয়।
- **স্ক্রিন:** Production Entry → Products out-এ ঐচ্ছিক তারিখ ও টেবিলে কলাম; Recent batches, Register (প্রতি output), Batch Costing-এ দেখা যায়।
- **নিয়ম:** মেয়াদ ঐচ্ছিক; উৎপাদনের তারিখের আগে হলে স্ক্রিনে (save/add-এ) ও সার্ভারে (store/update এবং post) আটকায়।
- **Reverse:** output সারি মোছে না, তাই reversed batch-এও expiry থাকে।

**যাচাই** (rolled-back probe, `myappsaasdatabase`, company 18 / branch 18; কোনো test সারি থেকে যায়নি):

| যাচাই | ফল |
| --- | --- |
| v4 খ-১৩ "গ": Register net sales ৯,০০০ / COGS ৭,৭০২ / true gross ১,২৯৮; P&L gross = net = ১,২৯৮; TB ৩০,০০০ = ৩০,০০০; BS ২১,২৯৮ = ২১,২৯৮ | পাস |
| `২৮-` voucher-এর print payload: `sales_return_master.details` + ledger customer; `১৩-`-এর উত্তর অপরিবর্তিত | পাস |
| Edit: qty কম/বেশি, নগদ ফেরত বদল — stock, head ১৯, head ১৭, Cash Book অনুসরণ করে; `vr_no` অপরিবর্তিত; return master একটি-ই থাকে | পাস |
| Edit: বিক্রির বাকি পরিমাণের বেশি ফেরত চাইলে আটকায় | পাস |
| একই period-এ production নয় এমন দ্বিতীয় পণ্য বিক্রি — Register net sales-এ ঢোকে না | পাস |
| Expiry: draft-এ save, post-এ দুই সারিতে, reverse-এ টিকে থাকে; উৎপাদনের আগের তারিখ আটকায় | পাস |
| Production নেই এমন branch: P&L / Monthly / Cash Flow / Product Ledger আগে-পরে হুবহু এক | পাস |
| `php -l` (সব বদলানো PHP), `npm run build` exit 0, production ফাইলে নতুন TS error নেই | পাস |

**ব্রাউজারে দেখা যায়নি:** ReturnPrint-এর কাগজ, Register/Batch Costing-এর print preview আর নতুন edit স্ক্রিনের চেহারা — কোড ও JSON payload দিয়ে যাচাই, ব্রাউজারে খুলে দেখা হয়নি। Cash head ১৭-এর return-এ কাগজের নাম `-`—এটাও ব্রাউজারে দেখা হয়নি।

## ৫. যা বাকি

### যাচাই

- Production ছাড়া ব্রাঞ্চে P&L / Monthly / Cash Flow / দিনভিত্তিক / Balance Sheet আগে-পরে হুবহু এক (§৪-ক)। Product Ledger-এর কোডও এই কাজে বদলায়নি; non-production branch-এ চালিয়ে দেখা গেছে (§৪-ঘ)।
- "গ"-এর সংখ্যা Command Code-এর বানানো fixture-এ যাচাই; branch 11-এর আসল test data (অন্য কম্পিউটারের `krishibitandatabase`)-তে P&L একবার খুলে gross ১,২৯৮ আর net ১,২৯৮ মিলিয়ে দেখা বাকি।
- একই company-র ভিতরে অন্য branch-এর API call আলাদা করে পরীক্ষা হয়নি (অন্য company-রটা হয়েছে)।
- নিজে মেনু খুলে পুরো ক্রম UI দিয়ে একবার চালানো।

### Phase 1-এর কাজ যা এখনো হয়নি

- **Unit conversion / net contents (v4 খ-৪, গ-৭):** "১ বস্তা = ৫০ kg" ধরনের রূপান্তর নেই। Input-এর পরিমাণ পণ্যের নিজের stock unit-এ লিখতে হয়; `entered_unit_id` ঘর আছে কিন্তু ব্যবহার হয় না। কোন পথ (`measurement` ঘর নাকি নতুন টেবিল) তা ক্লায়েন্ট DB-র query (গ-৯) দেখে ঠিক হবে।
- **মেয়াদ শেষের কাছাকাছি রিপোর্ট/সতর্কতা:** expiry এখন output-এ আছে (§৪-ঘ), কিন্তু near-expiry রিপোর্ট এখনো নেই; আলাদা কাজ।

### সিদ্ধান্ত হয়ে গেছে (৪ নভেম্বর ২০২৬)

- **ক-২ #১২ (gross profit):** **"গ"**, §৪-ক দেখুন। বানানো ও push করা।
- **ক-২ #১৩ (ফেরতের দাম):** গ্রাহককে টাকা ফেরত বিক্রির দামে (ledger আজকের মতোই), ফেরত মাল stock-এ original বিক্রির FIFO খরচে। নতুন Production Sales Return ফর্ম এটাই করে; কোনো বদল লাগেনি।

### মালিক / ক্লায়েন্টের কাছ থেকে

- **পুরনো Sales Return ফর্ম:** এটা ফেরত মাল stock-এ ফেরতের টাকার দামে ঢোকায় (যেমন ২০০, খরচ ১৭১.১৬), আর `(int)` দিয়ে ভগ্নাংশ কাটে; সব branch-এ লাভ বাড়িয়ে দেখায় (v4 গ-৪)। আলাদা কাজ হিসেবে ঠিক হবে কি না, সিদ্ধান্ত বাকি।
- **ক্লায়েন্ট DB-তে query (v4 গ-৯):** পুরনো Manufacturing module-এর ব্যবহার, id-গুলো, unit/net contents। এখনো চালানো হয়নি।
- ক-২ #১০ (VAT), #১১ (কাঁচামালের উৎস, গুদাম)। #৬ (expiry) সিদ্ধান্ত হয়ে বানানো হয়েছে (§৪-ঘ)।

### পরের ধাপ

| ধাপ | কাজ |
| --- | --- |
| ২ | Recipe, version, ঘাটতি দেখা |
| ৩ | নতুন Production Sales (ফ্রি আলাদা রো, দাম ০, "ফ্রি" লেখা), স্কিম, ফ্রিসহ ফেরত |
| ৪ | নতুন Production Purchase (ফ্রি রো) |

### Deploy-এর আগে (ক্লায়েন্ট সার্ভার)

1. Backend আর frontend একসঙ্গে deploy।
2. `php artisan patch:add-unit-type` → `permission:cache-reset` → `route:clear`। **এই patch-এ `cost_share_pct` আর `expiry_date` দুটোই যোগ হয়** (দুবার চালালেও ক্ষতি নেই); `route:clear` নতুন `GET production/voucher-types` route-এর জন্য।
3. শুধু Manufacturing ব্রাঞ্চে "Control Manufacture?" চালু, দরকারি role-কে `production.*` permission।
4. Patch না চালালেও Product Ledger/Statement ভাঙবে না, কিন্তু Production মেনু কাজ করবে না।
5. "গ"-এর জন্য আলাদা patch লাগে না। Phase 1-এর patch না চালানো ক্লায়েন্টে `production_cost` ০ আসে, P&L আগের মতোই।

## ৬. Command Code-এর সঙ্গে কাজের নিয়ম

নতুন কাজ দেওয়ার আগে Command Code-কে এই ফাইল আর v4 পড়তে বলুন। মূল নিয়ম:

- P&L Account (`profitLossData`, `ProfitLoss*.tsx`) বদলাবে না। একমাত্র ব্যতিক্রম ক-২ #১২ "গ" (৪ নভেম্বর ২০২৬): allocated production cost COGS-এর Direct Acquisition Costs-এ যোগ, আর একই অঙ্ক Production Cost expense group থেকে বাদ; এর বাইরে কোনো P&L বদল নয়।
- আগের এন্ট্রি ফর্ম বদলাবে না; বদল লাগলে নতুন ফর্ম। ব্যতিক্রম শুধু opening stock-এর দশমিক।
- আগের রিপোর্টে শুধু নতুন শাখা যোগ, আগে অনুমোদন; নতুন টেবিল পড়লে `Schema::hasTable` দিয়ে সুরক্ষা।
- সব SQL এক ফাইলে, আর সেটাই `AddUnitTypeToBuildingUnits`-এ method হিসেবে; নতুন artisan command নয়।
- Voucher type আর account head নাম বা marker দিয়ে খোঁজা, id দিয়ে নয়।
- Commit নিজে নয়; diff দেখে commit।

শুরুর prompt (ইংরেজি):

```text
Read D:\cashbookbd_react\docs\Manufacturing\phase-1-handoff.md and v4-manufacturing-production-plan.md in the same folder before doing anything. Phase 1 is done; follow the rules in section 6 of the handoff file. Then tell me what you understand the next task to be and wait for my go-ahead.
```
