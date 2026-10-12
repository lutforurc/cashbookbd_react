# টাইলস ও স্যানিটারি বিক্রয়ে ডেলিভারি-ভিত্তিক স্টক আউট — নকশা রিভিউ

**যাচাই করা ডকুমেন্ট:** `docs/superpowers/specs/2026-10-07-stock-deduction-on-delivery-design.md`
**সংশ্লিষ্ট পুরনো ডক:** `docs/sales-delivery-challan-plan.md`
**যাচাইয়ের উপকরণ:** `cashbook_api` (`F:\All_Database\www\cashbook_api`) ও `cashbookbd_react` — শুধু কোড পাঠ; কোনো কোড/স্কিমা/ডক বদলানো হয়নি।
**সুযোগ (scope) সংশোধন:** মালিকের স্পষ্টীকরণ — ফিচারটি **শুধু Tiles and Sanitary Business**-এ। ডকটি চারটি সেলস-ভ্যারিয়েন্ট (General/Trading/Electronics/Tiles) ধরে লেখা; এই রিভিউ Tiles-এর প্রকৃত পথ ধরে করা।

---

## A. সামগ্রিক মূল্যায়ন (Overall assessment)

মূল স্থাপত্য **যথেষ্ট সঠিক**: (ক) ডেলিভারি হবে নিজস্ব ভাউচার — কারণ স্টকের তারিখ আসে `inventory_masters.main_trx_id → main_trx_master.vr_date` থেকে, তাই বিলের `main_trx_id`-এ পোস্ট করলে স্টক বিলের তারিখে নামত; (খ) ইনভয়েসে জন্মসূত্রে একটা stamp বসানো ও একটাই write-gate রাখা — ডাবল-ডিডাকশন বন্ধ করার এটাই সরল উপায়; (গ) pending জমা না রেখে প্রতিবার হিসাব করা — branch transfer-এর বিদ্যমান ছাঁচ।

তবে Tiles-only সুযোগে ডকটি **দুই দিকে ভুল**: কোথাও **অতিরিক্ত** কাজ ধরেছে (চারটি write-helper, Trading dashboard মেরামত), কোথাও **ভুল সমস্যা** ধরেছে (রিটার্নের `is_return`, Report Mismatch, `StockCostLayers`), আর **আসল বাধাটা কম জোর দিয়ে** বলেছে — ইনভয়েস এডিট হলে `inventory_sales_details.id` বদলে যায়, ফলে `sales_detail_id` এতিম হয় (§C-1)। উপরন্তু §১০-এর চারটি আবশ্যক সিদ্ধান্ত এখনো খালি। তাই **কোড শুরু করার আগে ডক সংশোধন দরকার** — নিচে ঠিক কী ঠিক করতে হবে তা দেওয়া।

---

## B. বর্তমান আচরণ বনাম প্রস্তাবিত আচরণ

### বি.০ Tiles-এর প্রকৃত পথ (যাচাই করা)

```
TilesBusinessSales.tsx  (SalesIndex.tsx:31 — is_tiles_and_sanitary হলে)
   └─ electronicsSalesStore / Update / Edit   (electronicsSalesSlice.tsx:36/88/137)
        └─ API: /electronics/sales/api-store …   (API_ELECTRONICS_SALES_*_URL)
             └─ ElectronicsSalesController::processSalesTransaction   (:49)
                  ├─ StockShortageGuard::warningFor(...)              (:62)  [transaction-এর আগে]
                  ├─ DB::beginTransaction()                           (:71)
                  ├─ apiMainTransactionMaster($transactionType,$voucherType)  (:75)
                  ├─ SalesService::processSalesMaster()               (ElectronicsSales/SalesService.php:12)
                  │     ├─ INSERT inventory_sales_masters             (:16)
                  │     └─ INSERT inventory_sales_details (is_return=0)(:46,:68)
                  ├─ InventoryService::processInventoryMaster()       (ElectronicsSales/InventoryService.php:13)
                  │     ├─ INSERT inventory_masters                    (:17)
                  │     └─ INSERT inventory_details stock_out=qty      (:31-64, stock_in=0 :52)
                  ├─ handleAccounting() / installment / Tiles manual fields / referrer
                  └─ DB::commit()                                     (:100)
```

এডিট/আপডেট পথ (`processSalesUpdateTransaction` :486): `SalesService::insertSalesDetailsUpdate` (:125) **আগের `inventory_sales_details` মুছে নতুন row বসায়** (:128), আর `InventoryService::apiInventoryDetailsUpdate` (:88) একইভাবে `inventory_details` মুছে আবার বসায় (:92)। অর্থাৎ **প্রতি এডিটে লাইন-`id` পাল্টায়**।

| বিষয় | আজকের আচরণ (Tiles) | ডকের প্রস্তাব |
|---|---|---|
| স্টক কখন কমে | ইনভয়েস সেভের সময়ই | চেকবক্স টিক থাকলে ইনভয়েসে; না থাকলে ডেলিভারি চালানে |
| কত row স্টক লেখে | প্রতি লাইনে এক `inventory_details`, `stock_out=qty` | ডেলিভারিতে একই রকম এক row |
| স্টকের তারিখ | বিলের `vr_date` | ডেলিভারি ভাউচারের `vr_date` |
| Reservation | নেই | নেই (ডক §০) |
| Pending/ডেলিভারি ধারণা | নেই; `sales_challan` শুধু প্রিন্ট | নতুন `inventory_delivery_masters/details` |
| রিটার্ন | আলাদা টেবিলে `stock_in`, invoice **টেক্সট** নাম্বারে বাঁধা | (ডকে ভুল ধারণা — §C) |
| এডিট | delete-and-reinsert | (ডকে ঝুঁকি ২ — আসল বাধা) |

---

## C. সমস্যা সারণি (Issues)

### C-১ যাচাই করা সমস্যা — ডক ভুল/অসঙ্গত/অতিরিক্ত

| তীব্রতা | সমস্যা | রেফারেন্স | প্রভাব | প্রস্তাবিত সমাধান |
|---|---|---|---|---|
| **উচ্চ (ডক-ত্রুটি)** | ডক বলে "তিনটি write-helper"-এ gate বসবে (Trading/Electronics/legacy)। Tiles-only সুযোগে write-path **একটাই** | `ElectronicsSalesController.php:49,80`; `Services/ElectronicsSales/InventoryService.php:13,31,67,88` | কাজ অকারণে তিন গুণ; ভুল ফাইলেও হাত পড়ার ঝুঁকি | gate শুধু `Services/ElectronicsSales/InventoryService.php`-এর `processInventoryMaster` (:13) ও `processInventoryMasterUpdate` (:67)-এ |
| **উচ্চ (ডক-ত্রুটি)** | ভুল পথ: `Inventory/ElectronicsSales/InventoryService.php` | আসল: `app/Services/ElectronicsSales/InventoryService.php` (namespace `App\Services\ElectronicsSales`) | ভুল ফাইল খুঁজে সময় নষ্ট | পথ সংশোধন |
| **উচ্চ (ডক-ত্রুটি)** | ডক বলে রিটার্ন `inventory_sales_details`-এ `is_return = 1` লাইন জন্মায়, তাই pending থেকে বাদ দিতে হবে | আসল: রিটার্ন লেখে **`inventory_sales_return_masters`/`inventory_sales_return_details`** (`CommonFunction/SalesReturn.php:20,71,94`); `is_return` শর্তসাপেক্ষ (:78), বিলের `inventory_sales_details` ছোঁয়ই না | pending কোয়েরি ও documented "খোলা প্রশ্ন" ভুল ভিত্তিতে দাঁড়ানো | রিটার্নকে আলাদা উৎস ধরে pending-নিয়ম ঠিক করুন (§D) |
| **মধ্যম (ডক-ত্রুটি)** | ডক §৫ ❌: "Trading dashboard-এ হাত দিতেই হবে" | Tiles ব্রাঞ্চে trading dashboard **৪২২ refusal** করে (`TradingDashboardController.php:110-118`, `TradingType.php:51`); `soldInPeriod()` শুধু ওখানেই (:123) | অপ্রয়োজনীয় কাজ ও ভুল প্রত্যাশা | Tiles-এর জন্য এই আইটেম বাদ দিন; `TradingStockLedger::closing()` (generic dashboard, `DashboardSummaryService.php:435`) নিরাপদ |
| **মধ্যম (ডক-ত্রুটি)** | ডক §৫ ⚠️: "`StockCostLayers` রিটার্নে লাগে, ইনসার্শন ক্রমে sort করে, তাই রিটার্নের cost ভুল হতে পারে" | `StockCostLayers` **একমাত্র** ব্যবহার হয় branch transfer-এ (`InventoryTransferMaster.php:113`); রিটার্নে নয় (`SalesReturnController.php:249` শুধু কমেন্ট) | ভুয়া ঝুঁকি | আইটেম বাদ দিন |
| **মধ্যম (ডক-ত্রুটি)** | ডক §৫ ⚠️: "Report Mismatch টিক-ছাড়া বিলকে ভাঙা দেখাতে পারে — রোলআউটের আগে বাধ্যতামূলক চেক" | `Reports/ReportMismatchController.php` শুধু দুইটা চেক করে — company-less (:95-118) ও unbalanced debit/credit (:120-150); `inventory_details`/stock row **কোথাও পড়ে না** (:168-176) | ভুয়া ঝুঁকি | আইটেম বাদ দিন |
| **মধ্যম (ডক-ত্রুটি)** | ডক §৬: Sidebar পথ `src/components/modules/Sidebar/…` | আসল: `src/components/Sidebar/index.tsx`, `src/components/Sidebar/menuPermissions.ts` | ভুল ফাইল | পথ সংশোধন |
| **মধ্যম (ডক-ত্রুটি)** | ডক §১.২/§৫: `rebuildStockTable` `:6548-6642`, "শুধু stock_in লেয়ার পড়ে" | আসল location `:7382`; balance subquery `SUM(stock_in)-SUM(stock_out)` ব্যবহার করে (:7412) | ভুল লাইন/অর্ধ-সত্য | সংখ্যা ও বাক্য ঠিক করুন |
| **নিম্ন (ডক-ত্রুটি)** | ডক §১.৩: `Sales/SalesOrderController.php:1841` | আসল `SalesOrder/SalesOrderController.php`, কমেন্ট `:1853-1855` | — | পথ/লাইন ঠিক করুন |
| **নিম্ন (ডক-ত্রুটি)** | ডক §২.৩ `BranchController::apiUpdate` | মেথডের নাম `updateBranch` (`:1307`); warn/block লেখা `:1358-1359` | — | নাম ঠিক করুন |

### C-২ যাচাই করা — আসল ঝুঁকি (ডকের দুর্বলভাবে ধরা)

| তীব্রতা | সমস্যা | রেফারেন্স | প্রভাব | প্রস্তাবিত সমাধান |
|---|---|---|---|---|
| **অতি-উচ্চ (ব্লকার)** | এডিটে `inventory_sales_details` মুছে-বসানো ⇒ লাইন-`id` পাল্টায় ⇒ `inventory_delivery_details.sales_detail_id` **এতিম**; অতঃপর pending/over-delivery হিসাব ভুল | `Services/ElectronicsSales/SalesService.php:125,128`; ডক ঝুঁকি ২ | ডেলিভারির পর এডিট করলেই হিসাব নীরবে ভুল | v1-এ **ডেলিভারি থাকলে ইনভয়েস এডিট নিষেধ** (সহজ, সৎ); অথবা delivery-কে স্থির `inventory_sales_masters.id + product`-এ বাঁধা (একই প্রোডাক্ট দুই লাইন হলে সমস্যা) |
| **উচ্চ** | gate বসানোর সময় `inventory_masters` row না থাকলে আপডেট পথে `->first()` **null** ফেরে, তারপর `$inventoryMaster->id` → fatal | `Services/ElectronicsSales/InventoryService.php:70,85` | টিক-ছাড়া বিল এডিট করলে ৫০০ | gate-এ null-safe শাখা: master না থাকলে কিছুই না লিখুন |
| **উচ্চ** | স্টক-শর্টেজ চেক এখন ইনভয়েসে (`:62`)। টিক-ছাড়া বিলে স্টক নড়ে না, কিন্তু warningFor তখনো আটকাতে/জিজ্ঞাসা করতে পারে | `ElectronicsSalesController.php:62`; `StockShortageGuard.php:48,200-229` | অন্যায্য block/হুজুগ | টিক-ছাড়া বিলে ইনভয়েস-সময়ের guard skip; guard চালাবে **ডেলিভারি পোস্টিং**-এ |
| **উচ্চ** | পোস্টিং-এর "৪. ইনভয়েস লাইভ ও stamp=0" যাচাই দরকার; নিয়ম ছাড়া দুইবার কাটার পথ | ডক §৪ | ডাবল ডিডাকশন | ডকের ৪-দরজা নীতি রাখুন (stamp + FOR UPDATE + `UNIQUE(main_trx_id)` + soft-delete) |
| **মধ্যম** | ডেলিভারির godown ঠিক রাখা হয়নি ডকে। বিক্রি `stock_line_godown()` দিয়ে Tiles-এর নিজস্ব গুদামে যায় (`InventoryService.php:48`), রিটার্ন হার্ডকোড godown 1 (`CommonFunction/InventoryMasterIn.php:75`) | `helpers.php:746`, `helpers.php:737-752` | গুদাম-স্টক রিপোর্ট ভুল গুদামে | ডেলিভারি `stock_line_godown()`-ই ব্যবহার করবে; রিটার্নের godown-অসঙ্গতি আলাদা করে ঠিক করা |
| **মধ্যম** | `inventory_sales_details.godown_id` (`SalesService.php:59`) আর `inventory_details.godown_id` (`InventoryService.php:48`) ইতিমধ্যে ভিন্ন পথে বসে | উপরের লাইন | আপেক্ষিক godown রিপোর্ট অসঙ্গত | ডেলিভারিতেও একই পথ কঠোরভাবে মানুন |
| **মধ্যম** | ডেলিভারি চালানের driver/vehicle তথ্য আজ `inventory_sales_masters`-এ থাকে (`saveChallanDriver` `SalesController.php:923`; কলাম প্যাচ `2026_08_24_challan_driver_columns.sql`) | ডক §৩.০ columns | দুই জায়গায় একই তথ্যের দ্বিতীয় উৎস | ডেলিভারি চালানের তথ্য নতুন master-এ; checkbox-ON বিলে পুরনো পথ অপরিবর্তিত |
| **নিম্ন** | `inventory_details`-এ নিজের তারিখ নেই; Tiles/Electronics পথে `batch_date` **লেখাই হয় না** (`InventoryService.php:31-64`) | ডক §১.২-এর parenthetical | — | নির্ভুলতা: স্টকের তারিখ সবসময় `vr_date` ধরেই |

### C-৩ অনিশ্চিত / যাচাই করা যায়নি (unverified)

| বিষয় | কেন অনিশ্চিত | কী লাগবে |
|---|---|---|
| `acc_vr_type`-এ `id 21 = "Challan"` আছে কি না | কোড/SQL প্যাচে পাওয়া যায় না; সম্ভবত লাইভ DB-তে | লাইভ dev DB-তে `SELECT id,name FROM acc_vr_type;` — max id ও 21 যাচাই |
| প্যাচে proposed `id 24` ফাঁকা কি না (ডক বলে "২৩টা row, শেষটা ২৩") | লাইভ DB ছাড়া প্রমাণ হয়নি | উপরের কুয়েরিতে ২৩/২৪ যাচাই; প্রতি DB-তে আলাদা |
| `DC-` prefix কোনো ব্রাঞ্চে ব্যবহৃত কি না | কোডে সেটা নেই | `SELECT vr_no FROM main_trx_master WHERE vr_no LIKE 'DC-%'` প্রতি DB-তে |
| Tiles ব্রাঞ্চের React মেনুতে ঠিক কোন রিপোর্ট স্ক্রিন দেখানো হয় | মেনু-ম্যাপ frontend-নির্ভর | `Sidebar`/`App.tsx` ম্যাপ যাচাই |
| ডকের §১.২ "৪২ ত্রুটি ট্রিগার" ইত্যাদির লাইনগুলো | আংশিক যাচাই হয়েছে, বিস্তারিত নেই | রোলআউটের আগে চেক |

---

## D. অনুপস্থিত চাহিদা ও সিদ্ধান্ত-প্রয়োজন (Missing requirements / decisions)

ডকের §১০-এর চারটি সিদ্ধান্ত **এখনো খালি**, এবং Tiles-এর জন্য নতুন কিছু যোগ হচ্ছে:

**আবশ্যক (শুরু করার আগেই দরকার):**
1. **এডিট বনাম ডেলিভারি-করা লাইন** — ডেলিভারি থাকলে এডিট নিষেধ (প্রস্তাব v1), নাকি in-place update?
2. **চেকবক্স কখন লক** — প্রথম নিশ্চিত ডেলিভারির আগ পর্যন্ত এডিটে বদলানো যাবে (প্রস্তাব)।
3. **টিক-ছাড়া বিলে স্টক-শর্টেজ** — ইনভয়েসে চুপ, নাকি শুধু তথ্য; ডেলিভারিতে বাধ্যতামূলক। (Tiles-এ আজ `stock_shortage`/`allow_negative` modal আছে — `TilesBusinessSales.tsx:125,782-792`।)
4. **অনুমোদন** — অননুমোদিত বিলের ডেলিভারি হবে কি না।

**Tiles-নির্দিষ্ট নতুন সিদ্ধান্ত:**
5. **রিটার্নের প্রভাব** — ডেলিভারির পর গ্রাহক ফেরত দিলে ওই লাইনের **pending** কমবে কি? রিটার্ন আলাদা টেবিলে যায় বলে আজ এমনিতেই কমে না; নিয়ম স্পষ্ট হওয়া দরকার।
6. **গুদাম/warehouse** — ডেলিভারি `tiles_single_warehouse_id`-ভিত্তিক `stock_line_godown()`-ই ব্যবহার করবে (এক গুদামী Tiles ব্রাঞ্চে এটাই একমাত্র সঠিক পথ)।
7. **একাধিক ডেলিভারি / draft** — পোস্ট করাই জন্ম (ডক), না draft→confirm? এক বিলে একাধিক ডেলিভারি হ্যাঁ।
8. **বাতিল বনাম ফেরত** — পণ্য বেরিয়ে গেলে শুধু বাতিল নয়, **ফেরত** রেকর্ড দরকার (ডক §১১)। কে বাতিল করতে পারবে?
9. **ভাউচার type/নাম** — নতুন id (24) না বিদ্যমান 21/"Challan"? রেজিস্টারে নাম কী দেখাবে?
10. **প্রিন্ট** — বিদ্যমান `sales_challan` লে-আউটই ব্যাখ্যা করবে; ডেলিভারির data endpoint-এর আকার ঠিক করা।
11. **পারমিশন** — `delivery.create/.edit/.view/.cancel` (আজ কেবল `print.delivery.challan` আছে)।
12. **বন্ধ বছর / কোটা** — প্রতিটি ডেলিভারি ভাউচার §৪২-এর বন্ধ-বছর চেক ও মাসিক ভাউচার কোটা খরচ করবে (ডক §৩.১)।

**যা ধরে নেওয়া হচ্ছে (ভুল হলে জানান):** টাকা/ভ্যাট/receivable সব বিলের দিনেই; partial ডেলিভারি প্রতি লাইনে হবে; বিল হয়ে কিন্তু মাল না গেলে closing stock-এ থাকবে (গুদামেই আছে)।

---

## E. প্রয়োজনীয় পরিবর্তন (DB / Backend / UI / Report)

### E-১ ডাটাবেজ (প্রতি tenant DB-তে আলাদা SQL প্যাচ, `database/sql/`)
- `inventory_sales_masters.invoice_deducts_stock TINYINT(1) NOT NULL DEFAULT 1` — backfill নেই (ডিফল্ট 1 = আজকের আচরণ)।
- নতুন `inventory_delivery_masters` ও `inventory_delivery_details` (branch-transfer ছাঁচে; `main_trx_id` UNIQUE; delivery line → sales line বাঁধা)।
- `acc_vr_type`-এ নতুন row (id যাচাই করে; 9=Credit Purchase, 10=Credit Sales, 23=Requisition আগে থেকেই আছে)।
- নতুন permission key লাইভ `permissions` টেবিলে + legacy তালিকায় + role-এ।
- ENGINE/CHARSET/COLLATE হুবহু `inventory_sales_masters`-এর `SHOW CREATE TABLE` থেকে (ডকের latin1 সতর্কতা সঠিক)।

### E-২ Backend (`cashbook_api`)
- **Stamp:** `Services/ElectronicsSales/SalesService.php:processSalesMaster` (:12) ও `processSalesMasterUpdate` (:93) — `invoice_deducts_stock` লেখা; অনুপস্থিত key = 1।
- **Gate:** `Services/ElectronicsSales/InventoryService.php:processInventoryMaster` (:13) ও `processInventoryMasterUpdate` (:67) — stamp 0 হলে `inventory_masters`/`inventory_details` **কিছুই লেখা হবে না** (আপডেট-পথে null-safe)।
- **Guard:** `ElectronicsSalesController.php:62` — stamp 0 হলে ইনভয়েস-সময়ের `StockShortageGuard` skip; guard চালাবে ডেলিভারি পোস্টিং-এ।
- **Delivery service/controller:** নতুন; নিজস্ব ভাউচার `apiMainTransactionMaster()`; `FOR UPDATE` দিয়ে sales-line lock; over-delivery refusal; `StockShortageGuard` (+ branch warn/block `StockShortageGuard.php:111,124`); `inventory_details.stock_out=qty` `stock_line_godown()` দিয়ে; এক ট্রানজেকশন; `rethrowIfPeriodClosed`।
- **সুযোগ-সীমানা:** সব নতুন যুক্তি `TilesType::ofBranch($branchId)` (`TilesType.php:78`) দিয়ে গেট; অন্য trade অপরিবর্তিত।
- **ব্রাঞ্চ-ডিফল্ট:** checkbox-এর ডিফল্ট পড়া `getBranchEdit` (`BranchController.php:920`) ও লিখা `updateBranch`/`apiStore` (:1307/:1591); `meta()` ক্যাশহীন (`helpers.php:227`)। (সিদ্ধান্ত: meta key, নাকি `com_branches` কলাম — warn/block-এর মতো।)
- **রিটার্ন:** ডেলিভারির পরে ফেরতের interaction নিয়মিত (নতুন FK ছাড়াই)।
- **রিপোর্ট-বিপত্তি যাচাই:** godown stock, Product Stock, Closing Stock delivery-তারিখে ঠিক আসে কি না।

### E-৩ UI (`cashbookbd_react`)
- **চেকবক্স:** `TilesBusinessSales.tsx` — `FormData` (:186-210)/`initialFormData` (:212) + JSX; payload `{...formData}` (:760, :825) স্বয়ংক্রিয়ভাবে বহন করে; **এডিট-লোডে stamp থেকে পড়া** (edit-effect :470-535; নজির `referrer_id`/`manual_voucher_no`)।
- **ব্রাঞ্চ-সেটিং:** `AddBranch.tsx` — "Invoice Setup → Stock" (:1644-1665)-এর পাশে `FormToggleField`; `buildBranchFormData` (:249-269) নিজেই key পাঠায়, তাই payload বদলাতে হবে না; edit-effect (:761-902) ও `initialBranch` (:447-584) ও interface (:49-238) — তিন জায়গায় key।
- **ডেলিভারি মডিউল:** তালিকা/detail/create-edit/cancel/print + "ডেলিভারি বাকি (pending)" তালিকা (Orders-এর "Remaining Qty" ঘর নজির: `Orders.tsx:1217-1263`)।
- **মেনু/রুট/পারমিশন:** `Sidebar/index.tsx` (:260-282), `Sidebar/menuPermissions.ts` (:20 — `invoice`-এ নতুন key যোগ না করলে শুধু নতুন key-ধারী গ্রুপ দেখবে না), `Sidebar/hasMenuPermission.ts:19-22`, `App.tsx:1239-1263`, `services/appRoutes.tsx:258-278`। দুটি ভিন্ন `hasPermission` implementation-এ সাবধান (`utils/permissionChecker.tsx` বনাম `Sidebar/permissionUtils.ts`)।
- **প্রিন্ট:** নতুন কাগজ লাগবে না — `printTemplate.ts:66-71`-এ `sales_challan` = "Delivery Challan" আগেই আছে; নজির `SalesLedger.tsx:647,668`।

### E-৪ রিপোর্ট (যাচাই করা)
- **নিজে থেকেই ঠিক:** `productStockData` (`ReportsController.php:7861`), Closing Stock (`rebuildStockTable` :7382, balance :7412), Product Profit/Loss (:8940 — ঋণাত্মক প্রভাব নেই; "sold" সেলস-ডিটেইল থেকে, closing `product_closing_stock` থেকে), Dashboard stock value (`TradingStockLedger::closing`; `DashboardSummaryService.php:435`), low-stock (:535-547)।
- **যাচাই করতে হবে:** Godown Stock (`apiGodownStockData` :5875) delivery-godown ঠিক পায় কি না; Sales Ledger-এর `challan_no` কলাম।
- **Tiles-এ অপ্রয়োজনীয়:** `TradingStockLedger::soldInPeriod` (trading dashboard Tiles-এ refusal)।

---

## F. ধাপে ধাপে বাস্তবায়ন পরিকল্পনা (Tiles-only)

| ধাপ | কী | কোথায় | নোট |
|---|---|---|---|
| ০ | §১০ ও §D-এর সিদ্ধান্তগুলোর উত্তর | — | এর আগে কোড নয় |
| ১ | SQL প্যাচ: `invoice_deducts_stock` কলাম + দুই নতুন টেবিল + `acc_vr_type` row + permission key | `cashbook_api/database/sql/` | **প্রতি DB-তে আলাদা**; id/prefix আগে যাচাই |
| ২ | ব্রাঞ্চ-ডিফল্ট (checkbox-এর ডিফল্ট) | `BranchController.php` (৩ জায়গা) + `AddBranch.tsx` | SQL নেই |
| ৩ | Stamp + Gate + ইনভয়েস-সময়ের guard skip | `SalesService.php:12/93`, `InventoryService.php:13/67`, `ElectronicsSalesController.php:62` | শুধু Electronics/Tiles পথ |
| ৪ | ইনভয়েসে চেকবক্স (Tiles স্ক্রিন) | `TilesBusinessSales.tsx` | edit-load stamp থেকে |
| ৫ | Delivery CRUD + posting + cancellation | নতুন controller/service, `InventoryTransferMaster` ছাঁচে | ⚠️ `FOR UPDATE` + `UNIQUE(main_trx_id)` এখানেই |
| ৬ | Pending/delivered হিসাব + "ডেলিভারি বাকি" তালিকা | React + একটা read endpoint | returns-নিয়ম মেনে |
| ৭ | প্রিন্ট — `sales_challan`-এর নতুন data endpoint | `SalesController.php:1086` ছাঁচে | সেভ করা লে-আউট বাঁচে |
| ৮ | মেনু, রুট, পারমিশন | `Sidebar/index.tsx`, `menuPermissions.ts`, `App.tsx`, `appRoutes.tsx`, permission তালিকা | key বাদ পড়লে গ্রুপ অদৃশ্য |
| ৯ | হ্যারেস + স্ক্রিন যাচাই | G-এর চেক-স্ক্রিপ্ট | তারপর মালিকের হাতে |
| ১০ | (প্রয়োজন হলে) রিটার্ন-godown অসঙ্গতি ঠিক | `CommonFunction/InventoryMasterIn.php:75` | আলাদা সিদ্ধান্ত |

পুরনো বিলের জন্য **কোনো নতুন stock movement বা নকল delivery row নয়** — ডিফল্ট 1 সব পুরনো সারিকে "টিক দেওয়া" বলেই ব্যাখ্যা করে।

---

## G. অর্থপূর্ণ টেস্ট ও গ্রহণযোগ্যতার মাপকাঠি

**চেক-স্ক্রিপ্ট যা প্রমাণ করতে হবে (API লেভেলে, Tiles ব্রাঞ্চে):**
1. টিক-দেওয়া Tiles বিল: `inventory_details` আগের মতোই একবার `stock_out` লেখে; `invoice_deducts_stock = 1`।
2. টিক-ছাড়া Tiles বিল: `inventory_masters`/`inventory_details` **একটিও row নেই**; মজুত অপরিবর্তিত; stamp `0`।
3. ৩০-এর বিল ২০ + ১০ দুই ডেলিভারিতে শেষ হয়; pending ৩০→১০→০ ঠিক থাকে; স্টক-কাটা row-এর `vr_date` = **ডেলিভারির** তারিখ।
4. Over-delivery, ডাবল-সাবমিট, concurrent confirm — কোনোটাতেই দ্বিতীয়বার স্টক আউট হয় না (`UNIQUE(main_trx_id)` + `FOR UPDATE`)।
5. টিক-দেওয়া বিলে ডেলিভারি পোস্ট করার চেষ্টা সাফ refusal পায়।
6. ডেলিভারি বাতিলে (`main_trx_master.status=0`) স্টক হুবহু ফেরে এবং pending-ও ফেরে — নতুন reversal কোড ছাড়া।
7. ডেলিভারি-সময়ের স্টক ঘাটতিতে ব্রাঞ্চের warn/block (`warn_negative_stock_sale`/`block_negative_stock_sale`) ও `allow_negative` ফ্লো ঠিকভাবে চলে; ইনভয়েস-সময়ে আর অন্যায্য block হয় না।
8. বিলের পরদিন ডেলিভারি হলে আগের দিনের stock রিপোর্ট অপরিবর্তিত; বন্ধ বছরে ডেলিভারি আটকায় (PERIOD_CLOSED)।
9. ডেলিভারি-থাকা বিল এডিটে বাধা (v1 নিয়ম); বিল-এডিট কোন `sales_detail_id` এতিম করে না।
10. চালান প্রিন্ট/রিপ্রিন্টে কোনো স্টক নড়াচড়া হয় না; পুরনো `sales_challan` লে-আউট হুবহু ছাপে।
11. পুরনো সব বিল (ডিফল্ট 1) আচরণ অভিন্ন; Electronics/Trading/General অপরিবর্তিত।
12. রিপোর্ট মিলে: Product Stock, Closing Stock, Dashboard stock value, (Tiles-প্রযোজ্য) Godown Stock — ডেলিভারির পর সঠিক; রিটার্নের পরও সামঞ্জস্যপূর্ণ।
13. **রিগ্রেশন:** বিদ্যমান `tiles_return_check.php`, `tiles_sales_manual_fields_check.php` পাস করে।

---

## চূড়ান্ত রায় (Verdict)

**ডকটি এখনই বাস্তবায়নের জন্য প্রস্তুত নয় — আগে সংশোধন দরকার।**

মূল কারণ:
1. **সুযোগ-অসঙ্গতি:** ডক চারটি sেলস-ভ্যারিয়েন্ট ধরে লিখা; ফিচার শুধু Tiles-এ। write-helper তিনটি নয়, **একটি**; "Trading dashboard মেরামত" Tiles-এ অপ্রয়োজনীয়।
2. **আসল ব্লকার স্পষ্ট নয়:** ইনভয়েস এডিটের delete-and-reinsert `sales_detail_id` এতিম করে (`Services/ElectronicsSales/SalesService.php:125-128`) — এই সিদ্ধান্ত (§১০.১/২) ছাড়া কোড শুরু করা যায় না।
3. **ভুল সমস্যা-নির্ণয়:** রিটার্নের `is_return` (আসলে আলাদা টেবিল), Report Mismatch ও `StockCostLayers` ঝুঁকি — ডকের ভিত্তি ভুল, বাদ দিতে হবে।
4. **অনিশ্চিত id/prefix:** `acc_vr_type` id 21/24 ও `DC-` prefix প্রতি DB-তে যাচাই করা হয়নি (§C-৩)।
5. **নতুন Tiles-নির্দিষ্ট সিদ্ধান্ত:** রিটার্নের সাথে pending, godown নির্বাচন, বাতিল বনাম ফেরত — স্থির হওয়া দরকার।

**সংশোধন-পরবর্তী করণীয়:** §C-এর ডক-ত্রুটি ঠিক করে, §D-এর সিদ্ধান্তগুলো লিখে নিলে এবং §F-এর ক্রম মেনে অগ্রসর হলে স্থাপত্য (নিজস্ব ডেলিভারি ভাউচার + stamp + এক gate + হিসাব-করা pending) **Tiles-এর জন্য সরল ও নির্ভরযোগ্য**।
