# ডেলিভারির মাধ্যমে স্টক আউট — বিশ্লেষণ ও নকশা

তারিখ: ৭ অক্টোবর ২০২৬ (সংশোধিত একই দিনে, মালিকের চেকবক্স প্রস্তাবের পরে)
অবস্থা: **বিশ্লেষণ ও সুপারিশ; কোনো কোড, স্কিমা বা মাইগ্রেশন ছোঁয়া হয়নি।** মালিকের রিভিউ ও §১০-এর সিদ্ধান্তের অপেক্ষায়।

**পদ্ধতি বাছাই হয় প্রতি ইনভয়েসে — একটা চেকবক্সে** (মালিক, ৭ অক্টোবর ২০২৬): সেলস ইনভয়েস স্ক্রিনে "Deliver now" টিক = আজকের পথ (স্টক এখনই কাটবে), টিক ছাড়া = স্টক থাকবে, পরে ডেলিভারি চালানে যাবে। ব্রাঞ্চ-সেটিংস `deduct_stock_on_delivery` থাকবে শুধু ওই চেকবক্সের **ডিফল্ট** হিসেবে — ব্রাঞ্চভেদে ভিন্ন ডিফল্ট, তাই "প্রতি ব্রাঞ্চ আলাদা পদ্ধতি" দাবিটাও রক্ষা পায়।

**পথের রীতি:** `cashbook_api/...` = `F:/All_Database/www/cashbook_api` থেকে, `cashbookbd_react/...` = `F:/All_Database/cashbookbd_react` থেকে।

## ০. আগের পরিকল্পনার সঙ্গে সম্পর্ক

এই বিষয়ে [`docs/sales-delivery-challan-plan.md`](../../sales-delivery-challan-plan.md) (২৮ সেপ্টেম্বর ২০২৬) আগেই আছে। উপসংহারে দুটো ডক মেলে (চালান হবে নিজস্ব ডকুমেন্ট, partial ডেলিভারি, পুরনো বিল অটুট, বিল-এডিটের delete/reinsert সমস্যা, TradingStockLedger-এ হাত দিতে হবে)। পার্থক্য তিনটি:

| | ২৮ সেপ্টেম্বরের ডক | এই ডক |
|---|---|---|
| যাচাই | লেখকের ভাষায় "লাইভ ডাটাবেজ বা কার্যকরী ব্যবহার পরীক্ষা করা হয়নি" | লাইভ dev DB + চারটি কোড-স্ক্যান; প্রতিটি দাবির পাশে `file:line` |
| **সংরক্ষিত (reservation)** | মজুত / সংরক্ষিত / বিক্রয়যোগ্য — আলাদা ধারণা | **নেই** — যোগ করলে কাজ অনেক বাড়ে; সিদ্ধান্ত §১০ |
| চালান ড্রাফট | ড্রাফট → নিশ্চিত → বাতিল (তিন ধাপ) | পোস্ট করাই জন্ম; বাতিল = soft-delete (§৪) |
| মেথড বাছাই | ব্রাঞ্চভিত্তিক — গোটা ব্রাঞ্চ এক পদ্ধতিতে | **প্রতি ইনভয়েসে চেকবক্স**; ব্রাঞ্চ-সেটিং শুধু ডিফল্ট (§২) |

আগের ডক মুছে ফেলা হয়নি — কোনটা সত্যি তা মালিকের সিদ্ধান্ত।

---

## ১. আজকের কোড আসলে কী করে

### ১.১ চারটি সেলস-ইনভয়েস পথ, দুইটি স্টক-রাইটার

| কোন স্ক্রিন | ভাউচার বানায় | স্টক লেখে |
|---|---|---|
| General + Trading | `cashbook_api/app/Http/Controllers/Inventory/TradingSalesController.php:583` (`apiTradingSalesInvoiceStore`) | একই ফাইলে `apiInventoryDetails()` :844-860 |
| Electronics + Tiles | `Inventory/ElectronicsSalesController.php:49` (`processSalesTransaction`) | `Inventory/ElectronicsSales/InventoryService.php:31-62` |
| Trading Combined (একসাথে কেনা+বেচা) | `Inventory/TradingCombinedController.php:77` | :1092-1117 |
| পুরনো web ফর্ম (React নয়) | `Inventory/SalesController.php:96` | `inventoryDetails()` :468-486 |

React-এ "General" আলাদা ব্যাকএন্ড নয় — সে-ও `trading/sales/api-store`-ই ডাকে (`cashbookbd_react/src/components/modules/invoices/sales/generalSalesSlice.tsx:3,40`)। স্ক্রিন বাছাই হয় `SalesIndex.tsx:31-40`-এ।

### ১.২ যা জানা থাকলে নকশা বদলায়

- **স্টক কোথাও জমা থাকে না।** প্রতিবার `SUM(stock_in) − SUM(stock_out)` — `Services/Inventory/StockShortageGuard.php:200-229`।
- **`inventory_details`-এ নিজের কোনো তারিখ কলাম নেই** (শুধু `batch_date`, যেটা কেউ পড়েই না — লেখা হয় `date('Y-m-d')`)। স্টকের তারিখ আসে `inventory_details.inv_mstr_id → inventory_masters.main_trx_id → main_trx_master.vr_date` দিয়ে। অর্থাৎ *স্টক কমা মানে ভাউচার যেদিনের, সেদিন* — এটা stored নয়, গঠনগত।
- বিক্রির প্রতিটি লাইনে **একটাই `inventory_details` row**, `stock_out = qty`, `purchase_price = 0`। per-FIFO-layer row শুধু branch transfer-এ (`CommonFunction/InventoryTransferMaster.php:101-151`)।
- **ডিলিট = soft** — `main_trx_master.status = 0` (`settings/VoucherSettingsController.php:204`), স্টকও হিসাব থেকে বাদ পড়ে কারণ সব কোয়েরি `mtm.status = 1` ফিল্টার করে। recycle-bin থেকে ফিরলে স্টকও ফেরে।
- **এডিট = delete-and-reinsert**, reverse নয় — `TradingSalesController.php:1272-1313`, `InventoryService.php:88-127`। ⚠️ এটাই সবচেয়ে বড় ফাঁদ (§৮ ঝুঁকি ২)।
- **অনুমোদন** = `main_trx_master.is_approved` (`ApprovalCenterController::voucherAction:265-291`)। এডিট-লোড, renumber ও delete আটকায়; স্টক ছোঁয় না। `acc_transaction_master.is_approved` সবসময় `'0'`, মরা।
- **§42 বন্ধ বছর**: helper `Helpers/helpers.php:2623` (`assertVoucherOpen`) + DB ট্রিগার `trg_mtm_closed_year_*` → `PERIOD_CLOSED`, `bootstrap/app.php:129-142`-এ ৪২২ বাক্যে অনূদিত।
- **ভাউচার নম্বর**: `Services/Voucher/VoucherSerial.php:126` — `prefix + '-' + ym + 5-সংখ্যার সিরিয়াল`; `vr_no`-তে UNIQUE নেই (ইচ্ছাকৃত)।
- **শাখা-সেটিংস** `metas`-এ EAV row, `identify_id == branch_id`. `meta()` (`Helpers/helpers.php:227`) প্রতিবার টাটকা পড়ে — **সার্ভারে কোনো ক্যাশ নেই**, তাই সুইচ বদলালে সার্ভারে কিছু clear করার দরকার নেই। লেখা `BranchController::saveBranchMetas:780`, `apiUpdate` :1399-1550, `apiStore` :1611+; পড়া `getBranchEdit:920`। দুটো স্টক-সুইচ ব্যতিক্রম — `warn_negative_stock_sale` / `block_negative_stock_sale` **`com_branches`-এর কলাম** (`BranchController.php:1351-1358`, পড়া `StockShortageGuard.php:109,122`)।

### ১.৩ ডেলিভারি/চালান নামে যা কিছু নেই

- কোনো `delivery`, `challan`, `chalan`, `shipment`, `dispatch`, `grn`, `goods_received` টেবিল নেই; `delivered_qty`/`pending_qty`/`received_qty` কলাম নেই (একমাত্র `inventory_transfer_details.received_qty`, শুধু branch transfer)।
- `challan` মানে আজ **শুধু প্রিন্ট**: ডিজাইনারে `sales_challan` নামে কাগজ আগেই আছে — নাম "Delivery Challan", বর্ণনা "What goes out with the goods." (`cashbookbd_react/src/components/utils/print-designer/printTemplate.ts:66-71`)। ওটা বিদ্যমান ইনভয়েস থেকে ছাপে (`Inventory/SalesController.php:1021,1086`); ড্রাইভার/গাড়ি ফিল্ড ইনভয়েসের *পরে* গেটে বসে (`saveChallanDriver:923`)।
- `orders`/`order_details`-এ ordered qty আছে, delivered **নেই** — সেটা ইনভয়েস লাইন থেকে হিসাব করা, আর লিংকটা **প্রোডাক্ট দিয়ে**, লাইন দিয়ে নয় (`Sales/SalesOrderController.php:1841` নিজেই লিখে রেখেছে "Until invoice lines carry an `order_detail_id` … the link back to a line is the product itself")।
- **branch transfer-ই একমাত্র দুই-ধাপের স্টক পথ**: `inventory_transfer_masters` (`transfer_type` ১ issue/২ receive, `transfer_status` ১/২/৩, `source_transfer_id`, `challan_number`, `receiver_name`, `issued_at`, `received_at`) + `inventory_transfer_details` (`issued_qty`, `received_qty`, `damaged_qty`, `short_qty`)। over-receipt আটকায় :440-485-এ, স্ট্যাটাস প্রতিবার হিসাব করে `updateIssueTransferStatus:1361-1390`। **এই ছাঁচই কপি করার যোগ্য।**

---

## ২. সুপারিশ (সংক্ষেপে)

> ডেলিভারি হবে **নিজের একটা ভাউচার**; ইনভয়েসে পদ্ধতির সিদ্ধান্ত **জন্মসূত্রে স্ট্যাম্প** হয়ে বসবে; স্টক লেখা/না-লেখার সিদ্ধান্ত **write-helper-এ একটাই gate**; pending কখনো জমা নয় — **প্রতিবার হিসাব**।

1. **মেথড বাছাই — প্রতি ইনভয়েসে, একটা চেকবক্সে** (সেলস ইনভয়েস স্ক্রিন): "Deliver now (স্টক এখনই কাটবে)"। টিক = আজকের পথ; টিক ছাড়া = ইনভয়েস স্টক ছোঁবে না, পরে চালানে যাবে। ফলে **একই ব্রাঞ্চে দুই পদ্ধতি পাশাপাশি চলতে পারে** — গোটা ব্রাঞ্চকে একটা পদ্ধতিতে বাঁধতে হয় না।
2. **ডিফল্ট**: `metas`-এ `deduct_stock_on_delivery` (per branch) — নতুন ইনভয়েসে চেকবক্সটা টিক হয়ে আসবে কি না। অনুপস্থিত = `false` = টিক = আজকের আচরণ ⇒ **পুরনো ব্রাঞ্চে চেহারা হুবহু একই**।
3. **স্ট্যাম্প**: `inventory_sales_masters.invoice_deducts_stock tinyint(1) NOT NULL DEFAULT 1` — চেকবক্সের ফল, উল্টো নয় (টিক = `1`)। `1` = ইনভয়েসই কাটে, `0` = ডেলিভারিতে কাটবে। পুরনো সব সারি ডিফল্টে `1` ⇒ **backfill নেই, ইতিহাসে হাত নেই।**
4. **Gate**: উপরের তিনটি write-helper-এ (প্রতি ভ্যারিয়েন্টে একবার, প্রতিটি caller-এ নয়) — স্ট্যাম্প `0` হলে `inventory_masters` ও `inventory_details` **কিছুই লেখা হবে না**।
5. **ডেলিভারি ডকুমেন্ট**: `inventory_delivery_masters` + `inventory_delivery_details`, branch-transfer-এর ছাঁচে (§৩)।
6. **পোস্টিং**: §৪-এর সাত ধাপ, এক ট্রানজেকশনে, `FOR UPDATE` সহ।

**যা বদলাবে না:** টাকা, ভ্যাট, receivable, due, cash-book — সব ইনভয়েসের দিনেই। সেলস রেজিস্টার/লেজার/রিটার্ন-কাগজ অপরিবর্তিত।

---

## ৩. প্রস্তাবিত ডাটা কাঠামো

**দুটো নতুন টেবিল, একটা নতুন কলাম, একটা নতুন ভাউচার prefix — এর বেশি কিছু নয়।** `inventory_masters` ও `inventory_details`-এর গঠন এক বিন্দুও বদলায় না; `inventory_sales_masters`/`inventory_sales_details`-এর একটি পুরনো সারিও বদলায় না (**backfill শূন্য**)। নাম প্রস্তাবিত। সবই raw SQL প্যাচ হিসেবে `cashbook_api/database/sql/`-এ (এই রেপোতে স্কিমা বদল মাইগ্রেশনে হয় না), আর **প্রতি DB-তে আলাদা চালাতে হবে** (per-tenant DB)।

⚠️ নিচের `ENGINE`/`CHARSET`/`COLLATE` হুবহু `inventory_sales_masters`-এর `SHOW CREATE TABLE` থেকে নিতে হবে — এই ডাটাবেসে কিছু টেক্সট কলাম `latin1` (মেমরি `latin1-column-locate-1267`), তাই blind `utf8mb4` লিখলে JOIN-এ 1267 ফিরে আসবে।

### ৩.০ চূড়ান্ত DDL (খসড়া)

```sql
-- ১) বিলটি নিজেই স্টক কেটেছে কি না। টিক = 1।
--    DEFAULT 1 মানে পুরনো প্রতিটি সারি এবং যেসব DB-তে প্যাচ চলে না সেগুলো
--    আজকের মতোই আচরণ করে -- কোনো UPDATE লাগে না।
ALTER TABLE `inventory_sales_masters`
  ADD COLUMN `invoice_deducts_stock` TINYINT(1) NOT NULL DEFAULT 1
      COMMENT '1 = the invoice took the stock out; 0 = a delivery challan will',
  ADD KEY `sales_invoice_deducts_stock` (`company_id`, `branch_id`, `invoice_deducts_stock`);

-- ২) ডেলিভারি চালানের হেডার -- এক চালান = এক row, নিজের ভাউচার
CREATE TABLE `inventory_delivery_masters` (
  `id`              INT(11)       NOT NULL AUTO_INCREMENT,
  `main_trx_id`     INT(11)       NOT NULL COMMENT 'own voucher: its vr_date is when the stock left',
  `sales_mstr_id`   INT(11)       NOT NULL COMMENT 'inventory_sales_masters.id',
  `branch_id`       INT(11)       NOT NULL,
  `company_id`      INT(11)       DEFAULT NULL,
  `customer_id`     INT(11)       NOT NULL,
  `challan_number`  VARCHAR(50)   DEFAULT NULL COMMENT 'the paper',
  `challan_date`    DATE          DEFAULT NULL COMMENT 'the paper only -- stock is dated by vr_date',
  `vehicle_no`      VARCHAR(200)  DEFAULT NULL,
  `driver_name`     VARCHAR(128)  DEFAULT NULL,
  `driver_mobile`   VARCHAR(32)   DEFAULT NULL,
  `acc_name`        VARCHAR(128)  DEFAULT NULL,
  `truck_fare`      DECIMAL(12,2) DEFAULT NULL,
  `receiver_name`   VARCHAR(128)  DEFAULT NULL,
  `receiver_mobile` VARCHAR(32)   DEFAULT NULL,
  `notes`           VARCHAR(256)  DEFAULT NULL,
  `status`          TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '1 = posted, 0 = cancelled',
  `created_by`      INT(11)       NOT NULL,
  `updated_by`      INT(11)       NOT NULL DEFAULT 0,
  `delete_by`       INT(11)       NOT NULL DEFAULT 0,
  `created_at`      TIMESTAMP     NULL DEFAULT NULL,
  `updated_at`      TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `delivery_main_trx_unique` (`main_trx_id`),
  KEY `delivery_sales_master` (`sales_mstr_id`),
  KEY `delivery_branch_date` (`branch_id`, `challan_date`)
) ENGINE=InnoDB;

-- ৩) ডেলিভারির লাইন -- কোন বিল-লাইনের কতটা গেল
CREATE TABLE `inventory_delivery_details` (
  `id`              INT(11)       NOT NULL AUTO_INCREMENT,
  `del_mstr_id`     INT(11)       NOT NULL COMMENT 'inventory_delivery_masters.id',
  `sales_detail_id` INT(11)       NOT NULL COMMENT 'inventory_sales_details.id -- the LINE, never product_id',
  `product_id`      INT(11)       NOT NULL,
  `quantity`        DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status`          TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `delivery_detail_master` (`del_mstr_id`),
  KEY `delivery_detail_sales_line` (`sales_detail_id`)
) ENGINE=InnoDB;

-- ৪) নম্বরের মুখ -- প্রতি DB-তে একবার। `acc_vr_type`-এ এখন ২৩টা row, শেষটা ২৩।
INSERT INTO `acc_vr_type` (`id`, `name`, `description`, `created_by`, `status`)
VALUES (24, 'Delivery Challan', 'Goods out against a sale whose invoice did not deduct the stock.', 1, 1);
```

কলাম কেন, meta row কেন নয় (§৩.০-এর ১): "কোন কোন লাইভ বিলের মাল এখনো গুদামে" প্রশ্নটা তালিকা ও রিপোর্টে বারবার আসবে — `WHERE invoice_deducts_stock = 0` কলামে ইনডেক্স নিয়ে সরাসরি চলে, `metas.meta_value` TEXT-এ জোড়া লাগিয়ে নয়।

⚠️ লাইনে `damaged_qty`/`short_qty`/`bag`/`serial_no` **ইচ্ছাকৃতভাবে বাদ**: কম গেলে কম ডেলিভারি দিলেই বাকিটা pending-এ থাকে — আলাদা short হিসাব লাগে না। সিরিয়াল-ভিত্তিক ডেলিভারি চাইলে তখন যোগ হবে।

### ৩.১ চালানের নিজের ভাউচার কেন দরকার

স্টকের তারিখ `inventory_details`-এ নেই — ওটা আসে `inv_mstr_id → inventory_masters.main_trx_id → main_trx_master.vr_date` থেকে। তাই চালান যদি **বিলের** `main_trx_id`-এ পোস্ট হত, স্টকটা বিলের তারিখে নামত, ডেলিভারির তারিখে নয় — Closing Stock-এর প্রতিটি মাসিক রিপোর্ট ভুল মাসে যেত। এজন্যই চালানের নিজের ভাউচার।

`acc_vr_type`-এর দুটো ধারণা আলাদা, গুলিয়ে ফেলা যায় না:
- **`voucher_type`** = নম্বরের মুখ/নাম (৩ = Sales, ৪ = Purchase, ৫ = Journal …) — `VoucherSerial::open()`-এ `$prefix`
- **`transaction_type`** = নম্বর কোন **run**-এ গোনা হবে (এক ব্রাঞ্চ, এক মাস, এক run)

`apiMainTransactionMaster($transactionType, $voucherType, $vrDate)` দুটোই আলাদা নেয়। চালান নিজের run পাবে (`transaction_type = 24`), যাতে ক্যাশ/জার্নাল রানের নম্বর না খায় — branch transfer ঠিক এটাই করে (নিজের ১৪/১৫)।

**বিকল্প, শূন্য নতুন lookup row:** `acc_vr_type`-এ **id 21 = "Challan" আগেই আছে** এবং কোথাও ব্যবহৃত নয়। ওটাই ব্যবহার করলে উপরের INSERT লাগে না — দাম এই যে ভাউচার রেজিস্টারে নাম "Challan" দেখাবে, "Delivery Challan" নয়।

⚠️ `VoucherSerial::open()` প্রতিটি ভাউচারে §৪২-এর বন্ধ-বছর check এবং **মাসিক Txn কোটা** খরচ করে — অর্থাৎ প্রতিটি ডেলিভারি চালান plan-এর মাসিক voucher কোটা থেকে একটা খাবে।

চালানে `acc_transaction_master`-এর কোনো লেগ থাকবে না (টাকা বিলেই হয়ে গেছে), আর ক্যাশবুক/ডেইলি অ্যাকাউন্ট বুক prefix ধরে চলে — তাই চালান ওখানে আসবে না, কিছু ভাঙবেও না।

### ৩.২ লাইনকে `sales_detail_id`-এ বাঁধতেই হবে

`product_id` দিয়ে নয় — orders মডিউল ঠিক এই ভুলটা করে বসে আছে (§১.৩)। একই বিলে একই প্রোডাক্ট ৩টা এখন ২টা পরে — product দিয়ে বাঁধলে দুই লাইন মিশে যায়। আর `inventory_details`-ও নয়: ওতে এক FIFO layer = এক row (মেমরি `inventory-details-one-row-per-fifo-layer`), তাই ওটা join করলে গোনা কয়েকগুণ হয়ে যায়।

### ৩.৩ Pending — জমা নয়, হিসাব

কোনো `pending_qty`/`delivered_qty` কলাম রাখা হবে না — দুটো সত্যের উৎস রাখলে একটা দিন ঠিক থাকবে না। এটাই branch transfer-এর করা পথ। "ডেলিভারি বাকি" তালিকা এই একটি কোয়েরি:

```sql
SELECT d.id AS sales_detail_id, d.product_id, d.quantity AS billed,
       COALESCE(x.delivered, 0)              AS delivered,
       d.quantity - COALESCE(x.delivered, 0) AS pending
FROM   inventory_sales_details d
JOIN   inventory_sales_masters m   ON m.id   = d.sal_mstr_id
JOIN   main_trx_master         mtm ON mtm.id = m.main_trx_id AND mtm.status = 1
LEFT JOIN (
         SELECT dd.sales_detail_id, SUM(dd.quantity) AS delivered
         FROM   inventory_delivery_details dd
         JOIN   inventory_delivery_masters dm   ON dm.id   = dd.del_mstr_id
         JOIN   main_trx_master            dmtm ON dmtm.id = dm.main_trx_id AND dmtm.status = 1
         WHERE  dd.status = 1 AND dm.status = 1
         GROUP  BY dd.sales_detail_id
       ) x ON x.sales_detail_id = d.id
WHERE  m.invoice_deducts_stock = 0 AND m.branch_id = :branch
HAVING pending > 0;
```

⚠️ **খোলা প্রশ্ন:** বিলের পরে গ্রাহক কিছু ফেরত দিলে `inventory_sales_details`-এ `is_return = 1` লাইন জন্মায়। ওই পরিমাণ pending থেকে কমাতে হবে, নইলে ফেরত দেওয়া মালও "ডেলিভারি বাকি" তালিকায় বসে থাকবে।

### ৩.৪ যা বদলাবে না

| জিনিস | কেন |
|---|---|
| `inventory_masters`, `inventory_details`-এর গঠন | চালান শুধু নতুন row যোগ করে (`stock_out`), বিদ্যমান নিয়মেই |
| পুরনো যেকোনো সারি | backfill নেই — ডিফল্ট ১ নিজেই আজকের আচরণ |
| Closing Stock / Stock Details / Product Stock | সবাই `SUM(stock_in) − SUM(stock_out)` করে; নতুন row ওরা এমনিতেই গোনে |
| চালান বাতিল | নিজের ভাউচারের `main_trx_master.status = 0` → স্টক নিজে থেকেই ফিরে আসে, নতুন reversal কোড ছাড়া |
| Cash Book / Daily Account Book | prefix ধরে চলে, চালানের prefix আলাদা |

⚠️ `inventory_masters.approved` কলামটা **কোথাও ব্যবহৃত হয় না** (যাচাই করা) — আসল approval `main_trx_master.is_approved`-এ। তাই চালানের inventory_masters সারিতে ওটা ওই মানেই বসবে যা sales invoice বসায়, কোনো নতুন যুক্তি নয়।

---

## ৪. পোস্টিংয়ের নিয়ম — ডাবল ডিডাকশন কীভাবে অসম্ভব

### ৪.১ টিক দেওয়া (ডিফল্ট, আজকের)

ইনভয়েসই স্টক কাটে। কোডের একটি নতুন লাইনও চলে না — স্ট্যাম্প ডিফল্ট `1`, আর gate কেবল `0` দেখে।

### ৪.২ টিক ছাড়া

ইনভয়েস লেখে: `main_trx_master`, `inventory_sales_masters`, `inventory_sales_details`, `acc_transaction_master/dtls` — **কিন্তু `inventory_masters`/`inventory_details` নয়**।

### ৪.৩ ডেলিভারি পোস্ট — সাত ধাপ, এক ট্রানজেকশনে

1. ইনভয়েস লাইভ (`main_trx_master.status = 1`) এবং `invoice_deducts_stock = 0`? না হলে সাফ refusal — "এই বিলটি স্টক এখনই কেটেছে, এর ডেলিভারি হয় না।"
2. ইনভয়েসের `inventory_sales_details` rows `SELECT … FOR UPDATE` — এই বিলে একসাথে দুই ডেলিভারি সিরিয়ালাইজ হবে।
3. প্রতি লাইনে `already_delivered + এবারের qty ≤ line.quantity`, নচেৎ over-delivery refusal।
4. `StockShortageGuard::warningFor()` — **স্টক অপর্যাপ্ত হওয়ার আসল মুহূর্ত এখন এটাই**; ব্রাঞ্চের warn/block সুইচ এখানে কাজ করবে।
5. `apiMainTransactionMaster()` দিয়ে নিজের ভাউচার (নতুন voucher type; prefix যেমন `DC-`)। নজির: `cashbook_api/database/sql/2026_09_04_requisition_voucher_type_23.sql`।
6. `inventory_masters` + প্রতি লাইনে এক `inventory_details` row, `stock_out = qty`, `purchase_price = 0` — **হুবহু বিক্রির মতো**, যাতে প্রতিটি cost/FIFO রিপোর্ট একইভাবে পড়ে।
7. commit। catch-এ `rethrowIfPeriodClosed` (বন্ধ বছর গিলে ফেলা যাবে না)।

### ৪.৪ ডাবল ডিডাকশন অসম্ভব — চার দরজা

1. **চেকবক্সের স্ট্যাম্প**: `invoice_deducts_stock = 1` মানে ইনভয়েস স্টক কেটেই ফেলেছে, আর ধাপ ১ ওই বিলের ডেলিভারিই প্রত্যাখ্যান করে ⇒ একই লাইন দুইবার কাটার দ্বিতীয় পথটাই নেই।
2. **over-delivery ও concurrent submission** — দুটোই `FOR UPDATE`-এর ভিতরে আটকায়।
3. **`UNIQUE(main_trx_id)`** — একই ডেলিভারি ভাউচার দুইবার পোস্ট হয় না (আজ সেলস স্টোরে এই সুরক্ষাটাই নেই)।
4. বাতিল = ডেলিভারি ভাউচারের `status = 0` ⇒ বিদ্যমান `mtm.status = 1` ফিল্টারই স্টক ফিরিয়ে দেয় — **নতুন reversal কোড শূন্য**; pending-ও এমনিতেই ফিরে আসে।

---

## ৫. রিপোর্টে প্রভাব (যাচাই করা)

✅ **নিজে থেকেই ঠিক:** stock-on-hand, closing stock qty, stock details, product stock, low stock, godown/branch stock — সব ভাউচারের `vr_date` পড়ে, আর স্টক এখন ডেলিভারির তারিখে কমবে (এটাই চাওয়া)।

✅ **স্টকের মূল্য ও P&L:** `Reports/ReportsController.php:6548-6642` (`rebuildStockTable`) শুধু `stock_in` লেয়ার পড়ে ⇒ অপরিবর্তিত। বিল হয়ে গেছে কিন্তু মাল যায়নি — মাল গুদামেই আছে, তাই closing stock-এ থাকাই সঠিক। মূল P&L লেজার-ভিত্তিক, COGS স্টক থেকে বানায় না।

✅ **Product Profit/Loss-এর FIFO:** ইনভয়েসের `vr_date` দিয়ে লেয়ার মেলায়, সেলসের `stock_out` row পড়েই না ⇒ অপরিবর্তিত।

❌ **Trading dashboard — এটায় হাত দিতেই হবে।** `Services/Inventory/TradingStockLedger.php:304-331` "এটা কি বিক্রি?" ঠিক করে `LEFT JOIN inventory_sales_masters` দিয়ে, আর `soldInPeriod:170-172` non-sale বাদ দেয়। ডেলিভারি ভাউচার sales master নয় ⇒ টিক ছাড়া বিলে **sold qty ও COGS ভুল দেখাবে, কোনো এরর ছাড়াই**। সমাধান: ওই join-এ `inventory_delivery_masters`-ও ধরতে হবে।

⚠️ **`StockCostLayers` — চতুর্থ FIFO পাঠক, ইনসার্শন-ক্রমে সাজায়।** `Services/Inventory/StockCostLayers.php:112` লেয়ার সাজায় `ids.id` দিয়ে, **তারিখ দেখেই না** — আর এটা শুধু ট্রান্সফারে নয়, **সেলস রিটার্নেও** লাগে (`SalesReturnController.php:249`)। টিক ছাড়া বিলে ডেলিভারি-রো পরে ইনসার্ট হয় কিন্তু তারিখ আগের হতে পারে ⇒ ইনসার্শনের ক্রম আর তারিখের ক্রম আলাদা ⇒ **রিটার্ন করা মালের cost ভুল লেয়ার থেকে আসতে পারে**, চুপচাপ।

⚠️ **Report Mismatch (VR Settings → `Reports/ReportMismatchController.php`)** — এটা "লাইভ সেলস ভাউচার কিন্তু স্টক row নেই" কে ক্ষতিগ্রস্ত ধরে কি না, **যাচাই করা হয়নি**। ধরলে প্রতিটি টিক-ছাড়া ইনভয়েস ওখানে ভেসে উঠবে। **রোলআউটের আগে বাধ্যতামূলক চেক।**

⚠️ কয়েকটা স্টক-কোয়েরিতে **তারিখ ফিল্টারই নেই** (`Products/ItemController.php:887,1067`, `NotificationController.php:100`, `StockShortageGuard:200`) — আজও তাই, নতুন ঝুঁকি নয়।

⚠️ **Order-এর billed vs delivered আলাদা হয় না।** অর্ডার-লিংক প্রোডাক্ট-ভিত্তিক, আর ডেলিভারি যোগ হলে ওই হিসাব বদলাবে কি না তা ঠিক করতে হবে।

---

## ৬. UI, রুট, পারমিশন, প্রিন্ট

- **চেকবক্স (নতুন — ইনভয়েসেই)**: প্রতিটি সেলস ইনভয়েস স্ক্রিনে (General/Trading/Electronics/Tiles) একটা টগল — "Deliver now (স্টক এখনই কাটবে)"। খোলার সময় অবস্থা আসে ব্রাঞ্চ-সেটিংস থেকে; সেভের সময় সিদ্ধান্তটা স্ট্যাম্পে যায়। ⚠️ **উল্টো করবেন না**: টিক = `invoice_deducts_stock = 1`। আর এডিট-লোডে মানটা **স্ট্যাম্প থেকেই** পড়তে হবে, ডিফল্ট থেকে নয় — নচেৎ এডিটে সেভ করলেই পদ্ধতি নিজে থেকে বদলে যাবে।
- **ব্রাঞ্চ-সেটিং (এখন কেবল চেকবক্সের ডিফল্ট)**: `cashbookbd_react/src/components/modules/branch/AddBranch.tsx` — Feature Controls ধাপে FormToggleField; `buildBranchFormData` নিজেই সব key পাঠায়, তাই payload-এ হাত দিতে হয় না। সেভের পরে স্ক্রিন `getSettings` রিফ্রেশ করে, তাই সার্ভারে কিছু clear করার নেই।
- **মেনু**: `Sidebar/index.tsx`-এর `SIDEBAR_MENUS` (Invoices গ্রুপ) **আর** `Sidebar/menuPermissions.ts` — key বাদ পড়লে গ্রুপটা চুপচাপ সবাই থেকে লুকিয়ে যায়, কোনো এরর নেই।
- **রুট**: `App.tsx`-এর invoices ব্লক + `services/appRoutes.tsx` constant।
- **পারমিশন**: আজ **`delivery.*` বলতে কিছুই নেই** — শুধু `print.delivery.challan` (`AddUnitTypeToBuildingUnits.php:2252`)। নতুন key (`delivery.create/.edit/.view/.cancel`) legacy তালিকায় + লাইভ `permissions` টেবিলে + রোলে দিতে হবে।
  ⚠️ **সৎ সীমা:** `api/trading/`, `api/electronics/`, `api/sales-return/`-এ সার্ভার-সাইড পারমিশন **এখন বলবৎ নয়** (`cashbook_api/config/route_permission_enforcement.php:43,55-66`; সেলস কন্ট্রোলারে ভিতরের চেকও নেই)। নতুন পারমিশনও তাই আজ React-এর গেট — আজকের `sales.create`-এর মতোই। সার্ভারে বলবৎ করা আলাদা সিদ্ধান্ত।
  ⚠️ **branch-transfer-এর ছাঁচে বানাবেন না**: আসল transfer endpoint দুটো (`POST api/warehouse/transfer/issue|receive`) গেট করা `warehouse.create` দিয়ে, আর `branch.transfer.create` বসে আছে একটা *রিপোর্টে* (`config/route_permissions.php:1099-1100` বনাম `:1005`)। ডেলিভারির পারমিশন `sales.*`-এর মতো করাই ঠিক।
- **প্রিন্ট**: **নতুন কাগজ লাগবে না।** বিদ্যমান `sales_challan`-ই ডেলিভারি চালান ছাপবে, শুধু একটা নতুন data endpoint — `Inventory/SalesController.php:1086-1142` (`apiSalesChallanData`)-এর আকারেই (invoice/basic/product/payment) — যাতে **মালিকের সেভ করা সব লে-আউট হুবহু কাজ করতে থাকে**। বিকল্প: আলাদা doc_type → দুই তালিকায় নাম + মালিককে নতুন লে-আউট বানাতে হবে। দুই ক্ষেত্রেই **কোনো SQL নেই** (`print_templates`-এর row সেভ করার সময় তৈরি হয়; না থাকলে built-in default)।
- `saveChallanDriver` (`SalesController.php:923`) টিক দেওয়া পথে অপরিবর্তিত থাকবে; টিক ছাড়া বিলে ওই তথ্য ডেলিভারি মাস্টারে যাবে।

---

## ৭. বিকল্প

| | কী | রায় |
|---|---|---|
| **A** | নতুন ডকুমেন্ট নেই — ইনভয়েসে "Delivered" ফ্ল্যাগ + qty | সবচেয়ে সস্তা, কিন্তু partial চালান ও প্রতি-ট্রিপ কাগজ নেই ⇒ মালিকের উত্তরেই বাদ |
| **B** | `inventory_transfer_masters`-এ নতুন `transfer_type = 3` | আংশিক/over-receipt কোড ফ্রি, কিন্তু টেবিলটা branch-to-branch (`from/to_branch`, `InterBranchPosting`, `branchTransferReport` :7240) ⇒ রিপোর্টে লিক করবে। **ছাঁচ কপি, টেবিল নয়** |
| **C** | ইনভয়েসে কেটে ডেলিভারিতে ফেরত (+/− এন্ট্রি) | মাঝখানে স্টক মিথ্যা, একই পরিমাণে দুই ডকুমেন্ট হাত দেয় ⇒ সবচেয়ে খারাপ |

---

## ৮. ঝুঁকি

1. **ডেলিভারির মুহূর্তে নেগেটিভ স্টক।** stock guard সরানোর সিদ্ধান্ত মালিকের।
2. ⚠️ **ইনভয়েস এডিট বনাম ডেলিভারি-করা লাইন।** আজকের এডিট `inventory_sales_details` মুছে আবার বসায় ⇒ **id পাল্টায়** ⇒ `sales_detail_id` এতিম। সমাধান: (a) ডেলিভারি আছে এমন লাইনে এডিট নিষেধ — সহজ, সৎ; (b) টিক-ছাড়া ইনভয়েসে delete-reinsert বাদ দিয়ে in-place update — বড়, চার ভ্যারিয়েন্ট ছোঁবে; (c) orders-এর মতো product দিয়ে বাঁধা — একই প্রোডাক্টের দুই লাইন মিশে যাবে। একই কারণে **চেকবক্সও প্রথম নিশ্চিত ডেলিভারির পরে বদলানো যাবে না** (§১০ সিদ্ধান্ত ২)।
3. **Trading dashboard চুপচাপ ভুল** (§৫ ❌) — এরর নেই, শুধু ভুল সংখ্যা। রিলিজের আগে।
4. **Sales return ক্যাপহীন ও ইনভয়েসের সাথে অলিংকড** (শুধু টেক্সট `sales_invoice_number`, `CommonFunction/SalesReturn.php:39-40`) ⇒ টিক ছাড়া পদ্ধতিতে "যা পাঠানোই হয়নি" ফেরত দিয়ে স্টক বানানো যাবে। পুরনো দোষ, কিন্তু এই পদ্ধতি সেটা খোলা দরজায় পরিণত করে। §৫-এর `StockCostLayers` ফাঁদও এখানেই।
5. **Report Mismatch** — যাচাই করা হয়নি (§৫ ⚠️)।
6. **পুরনো মডিউল**: IMEI/serial-যুক্ত প্রোডাক্ট, Company Scheme, product tracking, Manufacturing, Hotel — কোনটায় নতুন মোড দেখানো হবে তা আলাদা করে ঠিক করতে হবে; সমর্থন না থাকলে ওই মডিউলে সুইচ প্রকাশ করা যাবে না।

সান্ত্বনা: আজ সেলস স্টোরে **কোনো idempotency guard নেই**, `vr_no`-তে UNIQUE নেই — ডাবল-ক্লিকে দুই ইনভয়েস বসে। ডেলিভারির প্রস্তাবিত `UNIQUE(main_trx_id)` + `FOR UPDATE` আজকের সেলস পথের চেয়ে **বেশি** সুরক্ষা দেবে।

---

## ৯. ধাপে ধাপে পরিকল্পনা

| ধাপ | কী | কোথায় | নোট |
|---|---|---|---|
| **০** | §১০-এর আটকে দেওয়া সিদ্ধান্তগুলোর উত্তর | — | এর আগে কিছু নয় |
| **১** | SQL প্যাচ: `invoice_deducts_stock` কলাম + দুই নতুন টেবিল + নতুন voucher type | `cashbook_api/database/sql/` | **প্রতি DB-তে আলাদা** |
| **২** | ব্রাঞ্চ-সেটিং — চেকবক্সের ডিফল্ট | `Company/BranchController.php` (৩ জায়গা) + `AddBranch.tsx` | কোনো SQL নেই |
| **৩** | ইনভয়েসে চেকবক্স + gate + স্ট্যাম্প | write-helper ৩টা + master builder + ৪টি সেলস স্ক্রিন | ডিফল্ট `1` ⇒ ঝুঁকি শূন্য |
| **৪** | Delivery CRUD + posting + cancellation | নতুন কন্ট্রোলার/সার্ভিস, `TradingSalesController`-এর ছাঁচে | ⚠️ `FOR UPDATE` এখানেই |
| **৫** | Pending/delivered কলাম + "ডেলিভারি বাকি" তালিকা স্ক্রিন | React | orders-এর "Remaining Qty" ঘরটাই নকল |
| **৬** | প্রিন্ট — `sales_challan`-এর নতুন data endpoint | `Inventory/SalesController.php` | সেভ করা লে-আউট বাঁচে |
| **৭** | মেনু, রুট, পারমিশন | `SIDEBAR_MENUS`, `menuPermissions.ts`, `App.tsx`, `appRoutes.tsx`, permission তালিকা | key বাদ পড়লে গ্রুপ অদৃশ্য |
| **৮** | Trading ledger-এর `is_sale` মেরামত + Report Mismatch যাচাই + `StockCostLayers` ফাঁদ দেখা | `TradingStockLedger.php:304-331` | ৭-এর পর, চালুর আগে |
| **৯** | হ্যার্নেস + স্ক্রিন যাচাই | একটা চেক স্ক্রিপ্ট: ডেলিভারিতে স্টক কমে, বাতিলে ফেরে, over-delivery আটকায়, টিক-দেওয়া ইনভয়েসে refusal | তারপর মালিকের হাতে |

পুরনো বিলের জন্য **কোনো নতুন stock movement বা নকল delivery row তৈরি করা যাবে না** — পুরনো প্রতিটি সারিতে ডিফল্ট `1`, তাই সেগুলো "টিক দেওয়া" বলেই ব্যাখ্যা হয়, আর ডেলিভারি তালিকায় কখনো আসে না।

---

## ১০. সিদ্ধান্ত বাকি

### যে উত্তরগুলো ছাড়া ধাপ ১ শুরু করা যায় না

1. **ইনভয়েস এডিটে** ডেলিভারি-করা লাইন নিয়ে কী হবে — নিষেধ (a), নাকি in-place update (b)? (§৮ ঝুঁকি ২)
2. **চেকবক্স কখন বদলানো যাবে?** প্রস্তাব: **প্রথম নিশ্চিত ডেলিভারির আগে পর্যন্ত** এডিটে বদলানো যাবে, তারপর লক। (§৮ ঝুঁকি ২-এর সঙ্গে একই কারণ।)
3. **টিক-ছাড়া ইনভয়েসে স্টক-শর্টেজ চেক** — ইনভয়েসের সময় নিছক সতর্কবার্তা, নাকি একেবারে চুপ? (ডেলিভারিতে অবশ্যই চেক হবে।)
4. **অনুমোদন** — অননুমোদিত ইনভয়েসের ডেলিভারি হবে কি না?

### বাকি প্রশ্ন

- **সংরক্ষিত (reservation)** লাগবে কি? (আগের ডকের মডেল — §০) লাগলে কাজ অনেক বাড়বে।
- **নতুন ব্রাঞ্চে চেকবক্সের ডিফল্ট কী** — টিক করা (আজকের আচরণ) না খালি? প্রস্তাব: টিক করা, যাতে কেউ না ভেবেই পদ্ধতি বদলে না ফেলে।
- **টিক দিলে চালানের কাগজ তখনই ছাপবে কি?** আজ চালান আলাদা বাটন, Sales Ledger-এ (§৬) — সেটাই থাকবে, নাকি ইনভয়েস সেভের পরেই ছাপার সুযোগ?
- এক ইনভয়েসের জন্য একসাথে কয়েকটি খোলা (draft) ডেলিভারি থাকবে, নাকি একটা শেষ করে পরেরটা? (আগের ডকে draft → confirm ছিল; এই নকশায় পোস্ট করাই জন্ম।)
- ডেলিভারি বাতিলের অনুমতি কার? পণ্য বেরিয়ে গেলে শুধু বাতিল নয়, ফেরত রেকর্ড দরকার (§১১)।
- চালানে গ্রহণকারীর সই/ছবি লাগবে কি?
- ইনভয়েস স্ক্রিনেও per-line "Delivered/Pending" কলাম লাগবে কি?
- ডেলিভারি কোনো নির্দিষ্ট গুদাম থেকে হবে কি? (`have_warehouse == 0` হলে গুদাম ১, আজকের মতোই।)
- বন্ধ বছরে ডেলিভারি — §42 ট্রিগার আটকালেই হবে, নাকি `is_closing`-এর মতো override লাগবে?

**যা ধরে নেওয়া হয়েছে** (ভুল হলে জানান): টাকা/ভ্যাট/র receivable ইনভয়েসের দিনেই বসবে; partial ডেলিভারি প্রতি লাইনে হবে; ডেলিভারি বাতিল করলে স্টক ফিরবে।

---

## ১১. যাচাইয়ের পদ্ধতি ও যাচাই-বাকি

**কীভাবে জানা হলো:** এই রেপোর কোড পাঠ + লাইভ dev DB (`krishibitandatabase`, ২৬৮ টেবিল) read-only কোয়েরি, চারটি স্বাধীন স্ক্যানে ভাগ করে — (১) সেলস-ইনভয়েস → স্টক call-chain, (২) স্কিমা ও ডেলিভারি-টেবিল খোঁজা, (৩) Branch Settings + স্টক-রিপোর্ট পাঠক, (৪) ইনভয়েস জীবনচক্র ও analogue।

**যাচাই করা হয়নি — চালুর আগে করতে হবে:**

- [ ] Report Mismatch টিক-ছাড়া ইনভয়েসকে ভাঙা ভাবে কি না (§৫)।
- [ ] `StockCostLayers`-এর ইনসার্শন-ক্রম ফাঁদ আসলে রিটার্নে কত টাকার ভুল করাতে পারে (§৫)।
- [ ] নতুন ভাউচার টাইপ/prefix খালি আছে কি না (কোনো ব্রাঞ্চে `DC-` ব্যবহৃত কি না)।
- [ ] `inventory_sales_details`-এ এমন কোনো লাইভ লাইন আছে কি না যার `id` বদলে গেছে (এডিটের ফলে) — ডেলিভারি লিংকের জন্য।
- [ ] সেলস-রিটার্ন ও ভাউচারডিলিট/recycle-bin-এর সাথে টিক ছাড়া ইনভয়েসের মিথস্ক্রিয়া।

** গ্রহণযোগ্যতার মাপকাঠি (হ্যার্নেসে যা প্রমাণ করতে হবে):**

1. টিক দেওয়া ইনভয়েসে স্টক আগের মতোই একবার কমে; টিক ছাড়া ইনভয়েসে গুদাম **একটুও** কমে না।
2. ৩০ পিসের বিল ২০ + ১০ দুই চালানে শেষ হয়, pending ঠিক থাকে।
3. over-delivery, ডাবল-সাবমিট ও concurrent confirm — কোনোটাতেই দ্বিতীয়বার স্টক আউট হয় না।
4. ডেলিভারি বাতিলে স্টক হুবহু ফেরে; pending-ও ফেরে।
5. টিক দেওয়া ইনভয়েসে ডেলিভারি পোস্ট করার চেষ্টা সাফ refusal পায়।
6. বিলের তারিখের পরদিন ডেলিভারি হলে আগের দিনের স্টক অপরিবর্তিত থাকে; বন্ধ বছরে আটকায়।
7. চালান প্রিন্ট/রিপ্রিন্টে কোনো স্টক নড়াচড়া হয় না।
