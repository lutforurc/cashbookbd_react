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
- P&L, আগের কোনো এন্ট্রি ফর্ম, `productValidation`, `StockCostLayers`, `VoucherModificationController`: কিছুই বদলায়নি।

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
| `app/Http/Controllers/Reports/ReportsController.php` | `productLedgerData()` ও `productStatementData()`-এ production শাখা যোগ, `Schema::hasTable('production_master')` দিয়ে সুরক্ষিত; আগের ছয় শাখা অপরিবর্তিত |

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

পাতার ঠিকানা: `/production/entry`, `/production/sales-return`, `/production/register`, `/production/costing/:id`।

## ৩. নতুন কম্পিউটারে চালু করা

1. দুই repo-তে উপরের branch checkout।
2. Backend-এ dependency ও `.env` আগের মতো (DB: `krishibitandatabase` বা যেটা ব্যবহার করেন)।
3. Patch চালানো (দুবার চালালেও ক্ষতি নেই):

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

## ৫. যা বাকি

### যাচাই

- Production ছাড়া ব্রাঞ্চে আগের মাসের P&L / Balance Sheet / Product Ledger সংখ্যা ধরে আগে-পরে তুলনা করা হয়নি। কোড দেখে নিরাপদ: P&L-এ বদল নেই, আর production-এর সারি না থাকলে নতুন শাখা কিছু আনে না।
- একই company-র ভিতরে অন্য branch-এর API call আলাদা করে পরীক্ষা হয়নি (অন্য company-রটা হয়েছে)।
- নিজে মেনু খুলে পুরো ক্রম UI দিয়ে একবার চালানো।

### মালিক / ক্লায়েন্টের কাছ থেকে

- **ক-২ #১২ (gross profit):** কোড প্রস্তাব "ক" ধরে বানানো, Production কোনো ledger লেখে না। চূড়ান্ত সিদ্ধান্ত লেখা বাকি।
- **ক-২ #১৩ (ফেরতের দাম):** নতুন ফর্ম খরচের দামে নেয়। আগের Sales Return-এর সমস্যা আলাদা কাজ হিসেবে ঠিক হবে কি না, ঠিক করা বাকি।
- **ক্লায়েন্ট DB-তে query (v4 গ-৯):** পুরনো Manufacturing module-এর ব্যবহার, id-গুলো, unit/net contents। এখনো চালানো হয়নি।
- ক-২ #৬ (expiry), #১০ (VAT), #১১ (কাঁচামালের উৎস, গুদাম)।

### পরের ধাপ

| ধাপ | কাজ |
| --- | --- |
| ২ | Recipe, version, ঘাটতি দেখা |
| ৩ | নতুন Production Sales (ফ্রি আলাদা রো, দাম ০, "ফ্রি" লেখা), স্কিম, ফ্রিসহ ফেরত |
| ৪ | নতুন Production Purchase (ফ্রি রো) |

### Deploy-এর আগে (ক্লায়েন্ট সার্ভার)

1. Backend আর frontend একসঙ্গে deploy।
2. `php artisan patch:add-unit-type` → `permission:cache-reset` → `route:clear`।
3. শুধু Manufacturing ব্রাঞ্চে "Control Manufacture?" চালু, দরকারি role-কে `production.*` permission।
4. Patch না চালালেও Product Ledger/Statement ভাঙবে না, কিন্তু Production মেনু কাজ করবে না।

## ৬. Command Code-এর সঙ্গে কাজের নিয়ম

নতুন কাজ দেওয়ার আগে Command Code-কে এই ফাইল আর v4 পড়তে বলুন। মূল নিয়ম:

- P&L Account (`profitLossData`, `ProfitLoss*.tsx`) কোনোভাবে বদলাবে না।
- আগের এন্ট্রি ফর্ম বদলাবে না; বদল লাগলে নতুন ফর্ম। ব্যতিক্রম শুধু opening stock-এর দশমিক।
- আগের রিপোর্টে শুধু নতুন শাখা যোগ, আগে অনুমোদন; নতুন টেবিল পড়লে `Schema::hasTable` দিয়ে সুরক্ষা।
- সব SQL এক ফাইলে, আর সেটাই `AddUnitTypeToBuildingUnits`-এ method হিসেবে; নতুন artisan command নয়।
- Voucher type আর account head নাম বা marker দিয়ে খোঁজা, id দিয়ে নয়।
- Commit নিজে নয়; diff দেখে commit।

শুরুর prompt (ইংরেজি):

```text
Read D:\cashbookbd_react\docs\Manufacturing\phase-1-handoff.md and v4-manufacturing-production-plan.md in the same folder before doing anything. Phase 1 is done; follow the rules in section 6 of the handoff file. Then tell me what you understand the next task to be and wait for my go-ahead.
```
