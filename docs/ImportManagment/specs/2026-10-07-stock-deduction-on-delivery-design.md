# Stock Deduction on Delivery — Tiles & Sanitary Only (Revised Design)

**Revises:** this document's own 2026-10-07 draft. No earlier document was touched.
**Scope (confirmed):** Tiles and Sanitary businesses only. Other business types and all historical invoices are unchanged.
**Status:** Design revision. **No application code, schema, or configuration has been changed.** Items marked **[Pending owner approval]** are recommendations, not approved business rules.
**Repository:** `cashbook_api` at `F:\All_Database\www\cashbook_api`, `cashbookbd_react` at `F:\All_Database\cashbookbd_react`.

---

## 0. Correct document path

- Referenced in one place as `docs/specs/2026-10-07-stock-deduction-on-delivery-design.md` — **that path does not exist** (`docs/specs/` is not present).
- The real, and the only, document is `docs/superpowers/specs/2026-10-07-stock-deduction-on-delivery-design.md` (this file).
- A repository-wide search (`**/*stock-deduction*`) returns exactly one file. **No second copy exists; nothing must be merged.**

---

## 1. Verified current behavior (corrected references)

Tiles sales path (code-verified):

```
SalesIndex.tsx:31  → TilesBusinessSales.tsx
  → electronicsSalesSlice.tsx:36/88/137  → /electronics/sales/…
    → ElectronicsSalesController::processSalesTransaction (:49)
         StockShortageGuard::warningFor(...)            (:62)   [before the transaction]
         DB::beginTransaction()                          (:71)
         apiMainTransactionMaster(...)                   (:75)
         SalesService::processSalesMaster()              (Services/ElectronicsSales/SalesService.php:12)
             INSERT inventory_sales_masters              (:16)
             INSERT inventory_sales_details (is_return=0) (:46,:68)
         InventoryService::processInventoryMaster()      (Services/ElectronicsSales/InventoryService.php:13)
             INSERT inventory_masters                     (:17)
             INSERT inventory_details stock_out=qty        (:31-64; stock_in=0 :52; godown via stock_line_godown :48)
         applyTilesSalesManualFields / applySalesReferrer
         DB::commit()                                     (:100)
```

Corrections to the earlier draft's references:

| Earlier draft said | Actual (code-verified) |
|---|---|
| `Inventory/ElectronicsSales/InventoryService.php` | `app/Services/ElectronicsSales/InventoryService.php` |
| "three write-helpers" | Tiles has **one** write path (the Electronics/Tiles services) |
| Return creates `inventory_sales_details.is_return=1` | Returns write `inventory_sales_return_masters` / `inventory_sales_return_details` (`CommonFunction/SalesReturn.php:20,71,94`); `inventory_sales_details` is untouched |
| `TradingStockLedger` must be fixed for Tiles | Tiles branches get a 422 from `TradingDashboardController.php:110-118`; `soldInPeriod()` is trading-only |
| `StockCostLayers` affects returns | Only caller is branch transfer (`InventoryTransferMaster.php:113`) |
| Report Mismatch may flag non-deducting invoices | `ReportMismatchController.php` never reads stock rows |
| `rebuildStockTable` at `:6548-6642`, "stock_in only" | Declared at `:7382`; balance uses `SUM(stock_in)-SUM(stock_out)` (`:7412`) |
| Sidebar at `src/components/modules/Sidebar/…` | `src/components/Sidebar/index.tsx`, `src/components/Sidebar/menuPermissions.ts` |
| `Sales/SalesOrderController.php:1841` | `SalesOrder/SalesOrderController.php`; comment at `:1853-1855` |
| `BranchController::apiUpdate` | method `updateBranch` (`:1307`); stock switches written at `:1358-1359` |

Editing (code-verified): `Services/ElectronicsSales/SalesService.php:125` deletes and re-inserts `inventory_sales_details` (`:128`); `Services/ElectronicsSales/InventoryService.php:88` deletes and re-inserts `inventory_details` (`:92`). **Every edit changes `inventory_sales_details.id`.**

Stock status filtering (code-verified): `TradingStockLedger.php:312,314`, `ReportsController.php:7907` (productStockData), `ReportsController.php:7406,7418` (rebuildStockTable), and `StockShortageGuard.php:214` all require `main_trx_master.status = 1`. So `status = 0` on a voucher removes its movement from those readers.

Deploy/setup mechanism (code-verified): `App\Console\Commands\AddUnitTypeToBuildingUnits` — `protected $signature = 'patch:add-unit-type'`, run on every deploy, guarded by `Schema::hasColumn(...)` so it is re-runnable. This is the project's established schema/setup mechanism; the feature must extend it, not add a parallel migration.

Existing concurrency/idempotency precedents (code-verified): `lockForUpdate()` used in `Services\CompanyScheme\CompanySchemeService.php:48,370`, `Services\Hotel\HotelVoucher.php:674`, `HoldSweep.php:95`; a UNIQUE `request_id` idempotency column exists for SMS (`AddUnitTypeToBuildingUnits.php:13523,13547`).

Business-scope predicate (code-verified): `Services\Inventory\TilesType::ofBranch($branchId)` (`TilesType.php:78`). Tiles warehouse routing: `stock_line_godown()` (`helpers.php:737-752`); return routing: `InventoryMasterIn.php:75` (hard-coded godown 1 — a pre-existing inconsistency, see §7).

---

## 2. Proposed behavior and lifecycle

Delivery is its own voucher (its `main_trx_master.vr_date` is when the stock left). The invoice carries a birth stamp `inventory_sales_masters.invoice_deducts_stock` (1 = invoice took the stock; 0 = a delivery will). One write-gate in `Services/ElectronicsSales/InventoryService.php` reads the stamp. Pending is computed, never stored.

Lifecycle states:
- Invoice: `invoice_deducts_stock ∈ {1,0}`; delivery state derived from active deliveries (None / Partial / Full).
- Delivery: posted (active) / cancelled (`main_trx_master.status=0`).
- Mode lock: the stamp is editable only while the invoice has **no posted delivery** and is not otherwise locked. **[Pending owner approval]**

---

## 3. Decision table

| # | Decision | Recommendation | Alternatives | Status |
|---|---|---|---|---|
| 1 | Stable invoice-line identity | Add a stable `line_uid` to `inventory_sales_details`, generated once and preserved across edits; delivery lines reference it | (a) forbid editing invoices with deliveries; (b) make invoice edit update in place; (c) link by `sales_master_id + product` | **[Pending owner approval]** — must not use product alone |
| 2 | Edit restriction while deliveries exist | Once **any delivery is posted**, block edits to delivery-relevant fields; allow ordinary fields | blanket edit ban vs. full in-place rewrite | **[Pending owner approval]** |
| 3 | Mode change before first delivery | Allow, and **reconcile inventory atomically** (see §5) | lock the mode at invoice save | **[Pending owner approval]** |
| 4 | Shortage on a non-deducting invoice | Silent at invoice; enforce at delivery posting | warn at invoice | **[Pending owner approval]** |
| 5 | Delivering an unapproved invoice | Require `is_approved = 1` | allow | **[Pending owner approval]** |
| 6 | Return after delivery vs. pending | Return reduces "delivered-effective"; it does **not** auto-create new pending | auto-regenerate pending | **[Pending owner approval]** |
| 7 | Cancel a posted delivery | Allowed only to correct a posting where goods never left; once goods left, use a sales return | always cancel | **[Pending owner approval]** |
| 8 | Idempotency mechanism | Client `idempotency_key` with UNIQUE + `FOR UPDATE` on the invoice | rely on `UNIQUE(main_trx_id)` alone (insufficient, §5) | **[Pending owner approval]** |
| 9 | New voucher type id | Verify a free id at runtime; reuse existing `21`/`Challan` if free and acceptable | hardcode 24 | **[Pending owner approval]** |
| 10 | Replacement delivery entitlement | Out of scope for v1 | model entitlement | **[Pending owner approval]** |
| 11 | Document language | Keep the design doc in Bengali (matches the repo); English available on request | switch to English | **[Pending owner approval]** |

---

## 4. Data model & setup changes (extend `patch:add-unit-type`)

All additions idempotent (guarded by `Schema::hasColumn` / `information_schema`), re-runnable, preserving existing rows and defaults.

1. `inventory_sales_masters.invoice_deducts_stock TINYINT(1) NOT NULL DEFAULT 1` — no backfill; DEFAULT 1 reproduces today's behavior for history and for tenants that never run the patch.
2. `inventory_sales_details.line_uid` — a stable line identity (e.g. `CHAR(36)`/binary), backfilled once for existing rows, generated on insert, and **preserved** through edit re-insert. *(Ties to decision 1.)*
3. `inventory_delivery_masters` (own `main_trx_id`, UNIQUE; `sales_mstr_id`; `branch_id`; `company_id`; `customer_id`; `idempotency_key` UNIQUE; challan/vehicle/driver/acc/fare/receiver/notes; `status`; audit columns).
4. `inventory_delivery_details` (`del_mstr_id`; `sales_detail_id` **and** `sales_line_uid`; `product_id`; `quantity`; `godown_id`; `status`).
5. Voucher type: resolve a free `acc_vr_type` id at runtime rather than assuming 21 or 24; insert guarded; **verify** with a query before use.
6. Permission keys `delivery.create/.edit/.view/.cancel` into the legacy list, the live `permissions` table, and roles (the patch already does permission sync).

⚠️ Match `ENGINE`/`CHARSET`/`COLLATE` to `inventory_sales_masters` (some text columns in this DB are `latin1`).

---

## 5. Backend changes

**Stamp + gate**
- `Services/ElectronicsSales/SalesService.php:processSalesMaster` (:12) / `processSalesMasterUpdate` (:93): persist `invoice_deducts_stock` (absent key ⇒ 1).
- `Services/ElectronicsSales/InventoryService.php:processInventoryMaster` (:13) / `processInventoryMasterUpdate` (:67): when the stamp is 0, write **no** `inventory_masters`/`inventory_details`. On update, handle a missing `inventory_masters` row null-safely (`:70,85`).
- `ElectronicsSalesController.php:62`: skip the invoice-time `StockShortageGuard::warningFor` when the stamp is 0.

**Mode change reconcile (concern 2)** — one transaction, reusing the same voucher/date:
- **1 → 0**: delete the invoice's `inventory_details` rows (`InventoryService` path), set stamp 0.
- **0 → 1**: run `StockShortageGuard` + §42 closed-period check against the **invoice's `vr_date`**, insert the invoice's `inventory_details` (`stock_out=qty`), set stamp 1.
- Either way: `VoucherTrail::snapshot` for audit; idempotent on repeated saves; refuse if a delivery is posted (mode locked).

**Delivery posting (concern 5)** — single transaction:
1. `SELECT … FOR UPDATE` the invoice's `main_trx_master` (and its live `inventory_sales_details`) to serialize same-invoice deliveries.
2. Verify: invoice live (`status=1`), stamp = 0, Tiles branch (`TilesType::ofBranch`), branch in caller scope, approval per decision 5.
3. Per line: `already_delivered + qty ≤ line.qty` (over-delivery refusal) — using `line_uid`.
4. `StockShortageGuard` (branch warn/block `StockShortageGuard.php:111,124`) at this moment.
5. `apiMainTransactionMaster()` for the delivery's own voucher; insert `inventory_masters` + one `inventory_details` row per line (`stock_out=qty`, `godown_id = stock_line_godown(...)`).
6. Commit; on error roll back fully and `rethrowIfPeriodClosed`.

**Idempotency (concern 5)** — `UNIQUE(main_trx_id)` cannot stop two requests creating two different vouchers (each gets a new `main_trx_id`). Add a client `idempotency_key` UNIQUE; on a repeat, return the existing delivery without re-posting. Combined with `FOR UPDATE`, concurrent duplicates serialize and the second observes the first.

**Cancellation vs. return (concern 3)**
- Cancel = `main_trx_master.status=0` on the delivery voucher ⇒ movement excluded (verified in §1). Valid **only** when goods never left.
- If goods left: record a **sales return** (`stock_in`) linked to the invoice; do **not** restore stock by cancelling.
- Repeated cancel: no-op if already 0. Permission `delivery.cancel`.

---

## 6. Frontend / UI & printing

- `TilesBusinessSales.tsx`: add the checkbox to `FormData` (:186-210)/`initialFormData` (:212) and the JSX; payload already spreads `formData` (:760,:825). On **edit-load**, read the value from the **stamp**, not the branch default (edit effect :470-535). Locked state when a delivery exists.
- Add vs Edit: default from branch setting on Add; on Edit reflect the stored stamp; show validation errors; never silently flip the mode.
- Branch setting in `AddBranch.tsx` ("Invoice Setup → Stock", :1644-1665): `FormToggleField`; key added in interface (:49-238), `initialBranch` (:447-584), edit effect (:761-902); `buildBranchFormData` (:249-269) already sends every key.
- Menu/routes/permissions: `Sidebar/index.tsx` (:260-282), `menuPermissions.ts` (:20 — add the new key to the `invoice` group), `App.tsx` (:1239-1263), `services/appRoutes.tsx` (:258-278).
- Printing: keep the existing `sales_challan` doc type and saved layouts (`printTemplate.ts:66-71`); add a delivery data endpoint in the shape of `SalesController.php:1086`; include **partial quantities**. Keep manual challan numbers visually distinct from the system delivery voucher number.

---

## 7. Reporting

Code-verified: quantities in Product Stock (`productStockData`), Closing Stock (`rebuildStockTable`), and the trading ledger follow `main_trx_master.vr_date` and require `status=1`. Product Profit/Loss (`apiProductProfitLoss` :8940) reads sales details + `stock_in` layers. The generic dashboard's stock value uses `TradingStockLedger::closing()` (`DashboardSummaryService.php:435`), which sums all `stock_out` regardless of sale.

Worked example — invoice 100 units on 2026‑10‑01 (stamp 0), deliveries 40 on 10‑05 and 60 on 10‑10:
- Quantity: closing stock on 10‑01…10‑04 still counts the 100 (goods in godown); 10‑05 counts 60; 10‑10 counts 0.
- Revenue/AR: recognized on 10‑01 (invoice), unchanged.
- COGS/P&L: the main P&L is ledger-based; the trading-ledger COGS is not used by Tiles (dashboard refused). Product Profit/Loss follows sales details.

Marked: **code-verified** — quantity timing via `vr_date`, and `status=1` exclusion. **Still unverified** — Godown Stock (`apiGodownStockData` :5875) and dashboard valuation under a split delivery, and the Sales Ledger `challan_no` column; these need live/test verification before go-live.

---

## 8. Ordered implementation plan

| # | Step | Where | Notes |
|---|---|---|---|
| 0 | Owner decisions (§3) | — | Blocks step 1 |
| 1 | Extend `patch:add-unit-type`: stamp + `line_uid` + two tables + voucher-type resolution + permissions (all idempotent) | `Console/Commands/AddUnitTypeToBuildingUnits.php` (+ optional `database/sql/` mirror) | Verify ids at runtime |
| 2 | Stamp + gate + skip invoice-time guard | `SalesService.php:12/93`, `InventoryService.php:13/67`, `ElectronicsSalesController.php:62` | Tiles-only |
| 3 | Branch default toggle | `BranchController.php` + `AddBranch.tsx` | |
| 4 | Checkbox + edit-load + lock state | `TilesBusinessSales.tsx` | |
| 5 | Mode-change reconcile | new service | one transaction |
| 6 | Delivery CRUD + posting + idempotency + cancel/return | new controller/service | `FOR UPDATE` + `idempotency_key` |
| 7 | Pending/delivered/returned math + list screen | React + read endpoint | returns rules §3 |
| 8 | Print data endpoint incl. partial quantities | `SalesController.php:1086` shape | saved layouts kept |
| 9 | Menu/routes/permissions | Sidebar/App/routes | |
| 10 | Reporting verification (godown, dashboard, ledger challan) | Reports | before go-live |
| 11 | Harness + manual verification | §9 tests | owner's hands |

---

## 9. Acceptance tests

Edits: edit a delivered invoice → blocked for delivery-relevant fields; `line_uid` unchanged across a permitted edit; no orphan delivery lines.
Mode change: 1→0 removes the invoice's stock rows and sets stamp 0; 0→1 posts stock at the invoice date with shortage + closed-period checks; repeated saves are idempotent.
Partial deliveries: 100 in 40+60 → pending 100→60→0; the stock rows' `vr_date` = each delivery date.
Returns: full delivery then full return → stock returns via `stock_in`; partial delivery then partial return → delivered-effective and returned quantities correct; return does **not** auto-create pending.
Cancellation: cancel an undelivered posting → stock returns; cancel a dispatched delivery is refused (return required); repeated cancel is a no-op.
Duplicate requests: same `idempotency_key` twice → one delivery; two concurrent keys against one invoice → serialize, no over-delivery.
Concurrency: two different invoices drawing the same warehouse stock respect the branch warn/block.
Historical: old invoices (DEFAULT 1) behave identically; other business types untouched (Tiles gate).
Accounting: revenue on the invoice date; stock quantity moves to the delivery dates; report reconciliation.

---

## 10. Open decisions — [Pending owner approval]

All eleven items in §3 are unresolved recommendations. Nothing here is an approved business rule.
