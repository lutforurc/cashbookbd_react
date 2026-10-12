# Stock Deduction on Delivery for Tiles & Sanitary Sales — Design Review

**Document under review:** `docs/superpowers/specs/2026-10-07-stock-deduction-on-delivery-design.md`
**Related earlier doc:** `docs/sales-delivery-challan-plan.md`
**Basis:** code reading in `cashbook_api` (`F:\All_Database\www\cashbook_api`) and `cashbookbd_react` — no code/schema/doc was modified.
**Scope correction:** per the owner's clarification, this feature applies to the **Tiles and Sanitary business only**. The design doc was written for all four sales variants (General/Trading/Electronics/Tiles); this review follows the actual Tiles path.

---

## A. Overall assessment

The core architecture is **sound**: (a) the delivery must be its own voucher — stock dating comes from `inventory_masters.main_trx_id → main_trx_master.vr_date`, so posting to the invoice's `main_trx_id` would date the stock at the invoice, not the delivery; (b) stamping the mode on the invoice at birth and keeping a single write-gate is the simplest way to make double deduction impossible; (c) computing pending each time instead of storing it matches the existing branch-transfer template.

But under the Tiles-only scope the doc errs in **both directions**: it over-scopes (four write-helpers, a "Trading dashboard fix"), mis-diagnoses (return `is_return`, Report Mismatch, `StockCostLayers`), and understates the **real blocker** — an invoice edit rewrites `inventory_sales_details.id`, orphaning `sales_detail_id` (§C-1). Plus the four mandatory §10 decisions are still open. So the doc **needs revision before coding starts**.

---

## B. Current behavior vs. proposed behavior

### B.0 The real Tiles path (verified)

```
TilesBusinessSales.tsx  (SalesIndex.tsx:31 — when is_tiles_and_sanitary)
   └─ electronicsSalesStore / Update / Edit   (electronicsSalesSlice.tsx:36/88/137)
        └─ API: /electronics/sales/api-store …   (API_ELECTRONICS_SALES_*_URL)
             └─ ElectronicsSalesController::processSalesTransaction   (:49)
                  ├─ StockShortageGuard::warningFor(...)              (:62)  [before the transaction]
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

Edit/update path (`processSalesUpdateTransaction` :486): `SalesService::insertSalesDetailsUpdate` (:125) **deletes the old `inventory_sales_details` and re-inserts** (:128), and `InventoryService::apiInventoryDetailsUpdate` (:88) likewise deletes and re-inserts `inventory_details` (:92). In short, **every edit changes the line `id`**.

| Aspect | Today (Tiles) | Doc's proposal |
|---|---|---|
| When stock is deducted | At invoice save | At invoice if checkbox ticked; otherwise at the delivery challan |
| Rows written | One `inventory_details` per line, `stock_out=qty` | Same shape, one row at delivery |
| Stock date | The invoice's `vr_date` | The delivery voucher's `vr_date` |
| Reservation | None | None (doc §0) |
| Pending/delivery concept | None; `sales_challan` is print-only | New `inventory_delivery_masters/details` |
| Returns | Separate table, `stock_in`, linked by **text** invoice no. | (Doc misunderstands — see §C) |
| Edit | delete-and-reinsert | (Doc risk 2 — the real blocker) |

---

## C. Issues

### C-1 Verified issues — doc wrong/inconsistent/over-scoped

| Severity | Issue | Reference | Impact | Recommended fix |
|---|---|---|---|---|
| **High (doc error)** | Doc says a gate goes in "three write-helpers". Tiles-only means **one** | `ElectronicsSalesController.php:49,80`; `Services/ElectronicsSales/InventoryService.php:13,31,67,88` | Triple work; risk of touching wrong files | Gate only in `Services/ElectronicsSales/InventoryService.php` at `processInventoryMaster` (:13) and `processInventoryMasterUpdate` (:67) |
| **High (doc error)** | Wrong path: `Inventory/ElectronicsSales/InventoryService.php` | Real: `app/Services/ElectronicsSales/InventoryService.php` | Wasted hunting | Correct the path |
| **High (doc error)** | Doc says a return creates `inventory_sales_details.is_return = 1` lines | Real: returns write **`inventory_sales_return_masters`/`inventory_sales_return_details`** (`CommonFunction/SalesReturn.php:20,71,94`); `is_return` is conditional (:78) | The pending query and its "open question" rest on a false premise | Treat returns as a separate source when defining pending (§D) |
| **Medium (doc error)** | Doc §5: "the Trading dashboard must be fixed" | A Tiles branch gets a **422 refusal** (`TradingDashboardController.php:110-118`, `TradingType.php:51`); `soldInPeriod()` is used only there (:123) | Needless work; wrong expectation | Drop it for Tiles; `TradingStockLedger::closing()` (generic dashboard, `DashboardSummaryService.php:435`) is safe |
| **Medium (doc error)** | Doc §5: "`StockCostLayers` is used in returns, so return cost can be wrong" | `StockCostLayers` is used **only** by branch transfer (`InventoryTransferMaster.php:113`); not by returns (`SalesReturnController.php:249` is just a comment) | Phantom risk | Drop it |
| **Medium (doc error)** | Doc §5: "Report Mismatch may flag non-deducting invoices — mandatory check" | `ReportMismatchController.php` checks only company-less (:95-118) and unbalanced (:120-150); it never reads `inventory_details`/stock rows (:168-176) | Phantom risk | Drop it |
| **Medium (doc error)** | Doc §6: Sidebar path `src/components/modules/Sidebar/…` | Real: `src/components/Sidebar/index.tsx`, `src/components/Sidebar/menuPermissions.ts` | Wrong files | Correct the path |
| **Medium (doc error)** | Doc §5: `rebuildStockTable` `:6548-6642`, "reads stock_in layers only" | Real location `:7382`; the balance subquery uses `SUM(stock_in)-SUM(stock_out)` (:7412) | Wrong line/half-truth | Fix the number and sentence |
| **Low (doc error)** | Doc §1.3: `Sales/SalesOrderController.php:1841` | Real `SalesOrder/SalesOrderController.php`, comment `:1853-1855` | — | Fix the path/line |
| **Low (doc error)** | Doc §2.3 `BranchController::apiUpdate` | Method is `updateBranch` (`:1307`); warn/block written at `:1358-1359` | — | Fix the name |

### C-2 Verified — real risks (doc understates these)

| Severity | Issue | Reference | Impact | Recommended fix |
|---|---|---|---|---|
| **Critical (blocker)** | An edit deletes/re-inserts `inventory_sales_details` ⇒ the line `id` changes ⇒ `inventory_delivery_details.sales_detail_id` **orphans**; pending/over-delivery math goes wrong | `Services/ElectronicsSales/SalesService.php:125,128` | Editing after a delivery silently corrupts the math | In v1, **forbid editing an invoice that has deliveries**; or bind deliveries to a stable `inventory_sales_masters.id + product` |
| **High** | On the update path, if no `inventory_masters` row exists, `->first()` returns **null**, then `$inventoryMaster->id` → fatal | `Services/ElectronicsSales/InventoryService.php:70,85` | Editing a non-deducting invoice throws 500 | Null-safe branch in the gate |
| **High** | The shortage check sits at invoice time (:62); a non-deducting invoice doesn't move stock, yet `warningFor` can still block | `ElectronicsSalesController.php:62`; `StockShortageGuard.php:48,200-229` | Unfair block | Skip the invoice-time guard when not deducting; run the guard at **delivery posting** |
| **High** | Posting must verify "invoice live and stamp=0"; without the rule there's a second deduction path | doc §4 | Double deduction | Keep the doc's four-door rule |
| **Medium** | Delivery godown isn't specified in the doc. The sale goes to the Tiles godown via `stock_line_godown()` (`InventoryService.php:48`), but the return hardcodes godown 1 (`InventoryMasterIn.php:75`) | `helpers.php:746,737-752` | Godown-stock reports land in the wrong store | Delivery must use `stock_line_godown()` |
| **Medium** | `inventory_sales_details.godown_id` (`SalesService.php:59`) and `inventory_details.godown_id` (`InventoryService.php:48`) already diverge | above | Inconsistent godown reports | Keep the same path for delivery |
| **Medium** | The delivery's driver/vehicle data lives today on `inventory_sales_masters` (`saveChallanDriver` `SalesController.php:923`) | doc §3.0 columns | Two sources for the same fact | Put it on the new master; leave the checkbox-ON path untouched |
| **Low** | The Tiles/Electronics path never writes `batch_date` (`InventoryService.php:31-64`) | doc §1.2 | — | Always date stock by `vr_date` |

### C-3 Uncertain / unverified

| Item | Why uncertain | What's needed |
|---|---|---|
| Whether `acc_vr_type` has `id 21 = "Challan"` | Not found in code/SQL patches | On the live dev DB: `SELECT id,name FROM acc_vr_type;` |
| Whether proposed `id 24` is free ("23 rows, last is 23") | Can't prove without the live DB | Same query; per DB |
| Whether the `DC-` prefix is used in any branch | Absent from code | `... WHERE vr_no LIKE 'DC-%'` per DB |
| Which report screens a Tiles branch is shown | Menu map is front-end | Check `Sidebar`/`App.tsx` |

---

## D. Missing requirements & decisions needed

**Mandatory (needed before starting):**
1. **Edit vs. delivered lines** — forbid editing when deliveries exist (proposed v1), or in-place update?
2. **When the checkbox locks** — until the first confirmed delivery (proposed).
3. **Shortage on a non-deducting invoice** — silent at invoice, or informational; mandatory at delivery. (Tiles already has a `stock_shortage`/`allow_negative` modal — `TilesBusinessSales.tsx:125,782-792`.)
4. **Approval** — may an unapproved invoice be delivered against?

**New, Tiles-specific:**
5. **Return effect** — after a delivery, if the customer returns goods, does that line's pending drop? (It doesn't today, since returns go to a separate table.)
6. **Warehouse** — the delivery must use `stock_line_godown()` based on `tiles_single_warehouse_id`.
7. **Multiple deliveries / draft** — post-is-birth (doc), or draft→confirm?
8. **Cancel vs. return** — once goods have left, a cancel isn't enough; a **return** record is needed. Who may cancel?
9. **Voucher type/name** — new id (24) or the existing 21/"Challan"?
10. **Print** — the existing `sales_challan` layout should serve it; define the data-endpoint shape.
11. **Permissions** — `delivery.create/.edit/.view/.cancel` (today only `print.delivery.challan` exists).
12. **Closed year / quota** — each delivery voucher consumes a §42 closed-year check and a monthly voucher quota.

**Assumptions (tell me if wrong):** money/VAT/receivable stay on the invoice date; partial delivery is per line; billed-but-not-shipped goods remain in closing stock.

---

## E. Required changes (DB / Backend / UI / Reports)

### E-1 Database (per-tenant SQL patch, `database/sql/`)
- `inventory_sales_masters.invoice_deducts_stock TINYINT(1) NOT NULL DEFAULT 1` — no backfill.
- New `inventory_delivery_masters` and `inventory_delivery_details` (branch-transfer template; `main_trx_id` UNIQUE; delivery line → sales line).
- New `acc_vr_type` row (verify the id; 9=Credit Purchase, 10=Credit Sales, 23=Requisition already exist).
- New permission keys in the live `permissions` table + legacy list + roles.
- ENGINE/CHARSET/COLLATE copied exactly from `inventory_sales_masters` (the doc's latin1 warning is correct).

### E-2 Backend (`cashbook_api`)
- **Stamp:** `Services/ElectronicsSales/SalesService.php:processSalesMaster` (:12) and `processSalesMasterUpdate` (:93).
- **Gate:** `Services/ElectronicsSales/InventoryService.php:processInventoryMaster` (:13) and `processInventoryMasterUpdate` (:67) — when stamp is 0, write nothing (null-safe).
- **Guard:** `ElectronicsSalesController.php:62` — skip the invoice-time guard when stamp is 0; run the guard at delivery posting.
- **Delivery service/controller:** own voucher via `apiMainTransactionMaster()`; `FOR UPDATE`; over-delivery refusal; `StockShortageGuard` (+ branch warn/block `:111,124`); `inventory_details.stock_out=qty` via `stock_line_godown()`; one transaction; `rethrowIfPeriodClosed`.
- **Scope boundary:** gate all new logic behind `TilesType::ofBranch($branchId)` (`TilesType.php:78`).
- **Branch default:** read in `getBranchEdit` (`BranchController.php:920`), write in `updateBranch`/`apiStore` (:1307/:1591); `meta()` is uncached (`helpers.php:227`).

### E-3 UI (`cashbookbd_react`)
- **Checkbox:** `TilesBusinessSales.tsx` — `FormData` (:186-210)/`initialFormData` (:212) + JSX; payload `{...formData}` (:760, :825); **read the stamp back on edit-load** (edit effect :470-535).
- **Branch setting:** `AddBranch.tsx` — a `FormToggleField` beside "Invoice Setup → Stock" (:1644-1665); `buildBranchFormData` (:249-269) already sends every key; add the key in three places — interface (:49-238), `initialBranch` (:447-584), edit effect (:761-902).
- **Delivery module:** list/detail/create-edit/cancel/print + a "pending delivery" list (Orders' "Remaining Qty" is the pattern: `Orders.tsx:1217-1263`).
- **Menu/route/permission:** `Sidebar/index.tsx` (:260-282), `Sidebar/menuPermissions.ts` (:20), `Sidebar/hasMenuPermission.ts:19-22`, `App.tsx:1239-1263`, `services/appRoutes.tsx:258-278`. Beware two different `hasPermission` implementations.
- **Print:** no new paper needed — `printTemplate.ts:66-71` already has `sales_challan` = "Delivery Challan"; pattern at `SalesLedger.tsx:647,668`.

### E-4 Reports
- **Correct already:** `productStockData` (`ReportsController.php:7861`), Closing Stock (`rebuildStockTable` :7382, balance :7412), Product Profit/Loss (:8940), Dashboard stock value (`DashboardSummaryService.php:435`), low-stock (:535-547).
- **To verify:** Godown Stock (`apiGodownStockData` :5875); the Sales Ledger `challan_no` column.
- **Not needed for Tiles:** `TradingStockLedger::soldInPeriod`.

---

## F. Ordered implementation plan (Tiles-only)

| Step | What | Where | Notes |
|---|---|---|---|
| 0 | Answer the §10 / §D decisions | — | Nothing before this |
| 1 | SQL patch: `invoice_deducts_stock` column + two new tables + `acc_vr_type` row + permission keys | `cashbook_api/database/sql/` | **Per DB**; verify id/prefix first |
| 2 | Branch default (the checkbox default) | `BranchController.php` (3 places) + `AddBranch.tsx` | No SQL |
| 3 | Stamp + Gate + skip invoice-time guard | `SalesService.php:12/93`, `InventoryService.php:13/67`, `ElectronicsSalesController.php:62` | Electronics/Tiles path only |
| 4 | Checkbox on the invoice (Tiles screen) | `TilesBusinessSales.tsx` | edit-load from the stamp |
| 5 | Delivery CRUD + posting + cancellation | New controller/service, `InventoryTransferMaster` template | `FOR UPDATE` + `UNIQUE(main_trx_id)` here |
| 6 | Pending/delivered math + "pending delivery" list | React + one read endpoint | Honor the returns rule |
| 7 | Print — new data endpoint for `sales_challan` | `SalesController.php:1086` template | Saved layouts keep working |
| 8 | Menu, routes, permissions | `Sidebar/index.tsx`, `menuPermissions.ts`, `App.tsx`, `appRoutes.tsx`, permission list | A missing key hides the group |
| 9 | Harness + screen verification | The §G check script | Then the owner's hands |
| 10 | (If needed) fix the return-godown mismatch | `CommonFunction/InventoryMasterIn.php:75` | Separate decision |

For old invoices, **no new stock movement or duplicate delivery row** — DEFAULT 1 interprets every existing row as "deducted at invoice".

---

## G. Meaningful tests & acceptance criteria

1. A ticked Tiles invoice writes exactly one `stock_out` in `inventory_details` as before; `invoice_deducts_stock = 1`.
2. An unticked Tiles invoice writes **no** `inventory_masters`/`inventory_details` rows; stock unchanged; stamp `0`.
3. A 30-unit invoice completes in two deliveries, 20 + 10; pending goes 30→10→0; the `stock_out` row's `vr_date` = the **delivery** date.
4. Over-delivery, double-submit, and concurrent confirm never deduct stock twice.
5. Delivering against a ticked invoice is cleanly refused.
6. Cancelling a delivery (`main_trx_master.status=0`) restores stock exactly, and pending returns.
7. A delivery-time shortage respects the branch's warn/block and the `allow_negative` flow; no unfair block at invoice time.
8. A next-day delivery leaves the previous day's stock reports unchanged; a closed-year delivery is blocked.
9. Editing an invoice that has deliveries is blocked (v1 rule); no `sales_detail_id` is orphaned.
10. Printing/reprinting the challan moves no stock; old `sales_challan` layouts print unchanged.
11. All old invoices (DEFAULT 1) behave identically; Electronics/Trading/General untouched.
12. Reports reconcile: Product Stock, Closing Stock, Dashboard stock value, Godown Stock — after delivery and after a return.
13. **Regression:** `tiles_return_check.php`, `tiles_sales_manual_fields_check.php` pass.

---

## Final verdict

**Not ready to implement — the doc needs revision first.**

1. **Scope mismatch:** written for four variants; only Tiles applies ⇒ **one** write-helper, no Trading-dashboard fix.
2. **Real blocker not stated:** edit delete-and-reinsert orphans `sales_detail_id` (`Services/ElectronicsSales/SalesService.php:125-128`) — coding can't start without decisions §10.1/2.
3. **Wrong diagnoses to drop:** return `is_return`, Report Mismatch, `StockCostLayers`.
4. **Unverified id/prefix:** `acc_vr_type` 21/24 and the `DC-` prefix per DB.
5. **New Tiles-specific decisions:** returns vs. pending, godown, cancel vs. return.

After fixing those, the architecture (own delivery voucher + stamp + one gate + computed pending) is **simple and reliable** for Tiles.
