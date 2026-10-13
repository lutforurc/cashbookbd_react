# Cancel Undelivered Sales Quantity — Deduct-on-Delivery Invoices (Design)

**Status:** **Draft — Pending Review.** Documentation only. **No application code, database schema/data, or configuration has been changed, and nothing has been committed.** Items marked **[Pending owner approval]** are recommendations, not approved business rules.
**Scope:** Tiles & Sanitary branches that use the *Deduct stock on delivery* workflow (branch setting `deduct_stock_on_delivery`, per-invoice stamp `inventory_sales_masters.invoice_deducts_stock = 0`). Other business types and all historical invoices are out of scope.
**Repository:** `cashbookbd_react` at `F:\All_Database\cashbookbd_react`. The Laravel API (`cashbook_api` at `F:\All_Database\www\cashbook_api`) is referenced but **not present in this workspace**; backend references below come from the reference copies under `temp/` and from `docs/`, and are labelled as such.
**Cross-references:**
- `docs/superpowers/specs/2026-10-07-stock-deduction-on-delivery-design.md` — the delivery/stock-on-delivery design (decision 6: returns do not auto-create pending; decision 7: cancel only when goods never left, else use a sales return).
- `docs/sales-delivery-challan-plan.md` — lists "pending cancellation, confirmed reversal" as an **unchecked TODO**.
- `docs/command_code/tiles-delivery-stock-design-revised.md`.

**How to read this document:**
- **Verified** = observed in the code in this repository (file/function cited).
- **Proposed** = recommended design, not built.
- **[Pending owner approval]** = a business decision that must be settled before implementation.

---

## 1. Verified current behavior (with references)

### 1.1 The delivery workflow exists only in deduct-on-delivery mode

Delivery is a self-contained module, Tiles & Sanitary only:

- `src/components/modules/delivery/Delivery.tsx` — load an invoice, see pending, enter *Deliver Now* quantities, save, list, print, cancel.
- `src/components/modules/delivery/deliverySlice.tsx` — thunks: `deliveryLoadPending`, `deliveryStore`, `deliveryEdit` (**exported but never called by any screen**), `deliveryList`, `deliveryCancel`.
- `src/components/modules/delivery/DeliveryReport.tsx` — per-invoice rows `Ordered | Delivered | Pending | Status`.
- `src/components/modules/delivery/DeliveryDashboard.tsx` — tiles + *Partial Deliveries* (`delivered > 0 && pending > 0`) and *Due for Delivery* worklists.
- `src/components/modules/delivery/DeliveryPrint.tsx` — the challan slip.

Endpoints (`src/components/services/apiRoutes.tsx:595-601`): `/delivery/pending`, `/store`, `/edit`, `/cancel`, `/list`, `/report`, `/print-data`.
Routes/permissions: `inv_delivery`, `report_delivery`, `delivery_dashboard`, all gated on `delivery.view`; cancel gated on `delivery.cancel`; create gated on `delivery.create`.

### 1.2 The invoice carries the stock mode; delivery must be enabled per invoice

- `src/components/modules/invoices/sales/TilesBusinessSales.tsx`:
  - `FormData.invoice_deducts_stock` — default `'1'` (`:248`); toggle "Deduct stock on delivery" (`:1249-1268`), gated by the branch setting `settings.data.branch.deduct_stock_on_delivery`.
  - Edit-load reads the **saved stamp** from the server, never the branch default (`:580-588`).
  - `delivery_locked` — once a delivery is posted, the line-removal guard refuses deletion (*"This invoice has a delivery; a delivered line cannot be removed. Post a sales return instead."*, `:1545-1550`), and the stock-mode toggle is disabled.
- In `Delivery.tsx`, loading an invoice that already took its stock returns `deducts_on_invoice === 1`; the create form is **hidden** with the amber notice (`:287-294`) — there is nothing to deliver for such an invoice.

### 1.3 Pending is computed, never stored

`POST /delivery/pending` returns, per line, `{ sales_line_uid, ordered, delivered, pending }` plus `mtmId`, `returned`, `deducts_on_invoice`. The frontend only displays and sums these (`Delivery.tsx:118-140`, `:304-345`; `DeliveryDashboard.tsx`; `DeliveryReport.tsx`). `pending = ordered − delivered` (reconciled with returns/cancels server-side) — the design doc states explicitly *"Pending is computed, never stored."*

### 1.4 What each document actually moves

| Document | Stock (`inventory_masters` / `inventory_details`) | Customer ledger (`acc_transaction_details`) |
|---|---|---|
| Sales invoice, stamp `1` (default) | `stock_out = qty` at invoice save | **Debits** the customer by the bill |
| Sales invoice, stamp `0` | **no stock rows written** | **Debits** the customer by the bill (revenue stays on the invoice date) |
| Delivery voucher | `stock_out = qty`, dated by the delivery `vr_date` | **nothing** |
| Sales return (`TilesBusinessSalesReturn.tsx`, `/sales-return/api-store`) | **`stock_in`** (goods come back) | **Credits** the customer |
| Delivery cancel (`/delivery/cancel`) | voucher `main_trx_master.status = 0` ⇒ movement excluded | **nothing** |

Sources: stock gate and `status = 1` readers per `2026-10-07-stock-deduction-on-delivery-design.md` §1; customer balance = `SUM(debit) − SUM(credit)` on the party's COA head (`temp/DailyAccountBook.php` `balanceOf`, `:576-589`; `src/components/utils/utils-functions/generateTableData.tsx:44-197`); invoice debits the customer (`src/components/modules/invoices/sales/TilesBusinessSales.tsx:600-618`, pinned by `_invoice_balance_rule_check.mjs`).

### 1.5 Returns are not linked to delivery, and always move stock

- The sales return stores `sales_invoice_number` **as free text** (`TilesBusinessSalesReturn.tsx:563-586`); there is no FK to the invoice, and no link at all to a delivery.
- A sales return is defined as a **`stock_in`** movement. The godown field on the return line is currently dropped ("carried for the API's sake and lands nowhere", `:581-584`).
- The delivery read-model knows how much has been returned (`returned`) and shows *"Returned against this invoice: {returned}"* (`Delivery.tsx:341-345`), but the return never reduces pending and never creates pending.

### 1.6 There is NO feature to close / cancel the remaining undelivered quantity — verified

- The Delivery module's only lifecycle actions are: save a delivery, print, and **cancel an entire delivery** (`Delivery.tsx` `handleCancel` `:219-231` → `deliveryCancel` → `/delivery/cancel`).
- A repository-wide search for `remaining`, `undelivered`, `short delivery`, `cancel remaining`, `close pending` finds **nothing** in the delivery module. The only nearby hits are the `Not delivered` status label, the unrelated Orders "remaining qty", and write-offs in the asset/product-out modules.
- There is no button, thunk, endpoint, or field to write off the undelivered remainder of an invoice. `deliveryEdit` exists but is unused.
- The design docs acknowledge the gap: `2026-10-07-...-design.md` decision 7 (cancel only when goods never left) and `docs/sales-delivery-challan-plan.md:214` (a TODO for pending cancellation).
- The Sales-Ledger "Delivery Challan" (`ChallanDriverDialog.tsx`, `/sales/challan*`) is **print-only** — it records a driver and prints paper, moves no stock and closes nothing.

**Check scripts that pin the current behavior:** `_delivery_system_check.ts` (delivery slice reducer, endpoints, routes, permissions), `_invoice_balance_rule_check.mjs` (sale debits the customer), `_return_print_fields_check.mjs` (return paper fields).

---

## 2. The gap this document addresses

In deduct-on-delivery mode, when a customer accepts fewer goods than were invoiced, the system has **no way to close the undelivered remainder**:

1. The 100 undelivered pieces remain `pending` **forever**; the invoice shows **Partial** permanently in the delivery report/dashboard.
2. The invoice remains **billed at 500** and continues to **debit the customer for the full value** — delivery never touches the ledger.
3. The stock side is correct (the 100 were never deducted) — **but there is no document that says "these 100 will never ship."**
4. The only adjustment tool is a **Sales Return**, which is semantically wrong for goods that never left: it would post `stock_in`, creating **phantom stock** on top of crediting the customer.

---

## 3. The example: 500 invoiced, 400 delivered, 100 declined

Invoice: 500 pieces, deduct-on-delivery (stamp `0`). Delivery posted for 400. Customer declines the remaining 100.

| Aspect | **Verified — today** |
|---|---|
| Undelivered 100 | Remain `pending`; invoice stays **Partial** indefinitely |
| Stock | Only **400** deducted (delivery `vr_date`); 100 never deducted, still in godown |
| Invoice qty / amount | **500 unchanged**; no auto-adjustment; delivered lines are locked from removal |
| Customer balance | **Full 500-value debited** on the invoice date; delivery adds nothing; 100 do not reduce it |
| If customer already paid in full | Balance nets to zero; nothing auto-refunds |
| Required to adjust | A credit to the customer (there is no correct document today) |
| Reports | Sales/Customer Sales and Sales Ledger show **500**; Delivery report shows Ordered 500 / Delivered 400 / Pending 100 / **Partial** |

In the **non-delivery mode (stamp `1`)**, the same scenario differs: all 500 were deducted at invoice time (so the 100 are gone from stock), and the Delivery screen refuses the invoice entirely — there is no pending concept to cancel. This document targets the stamp-`0` case.

---

## 4. Proposed "Cancel Undelivered Quantity" workflow (deduct-on-delivery only)

### 4.1 Concept

A **Cancel Undelivered Quantity** action closes the undelivered remainder of a posted invoice **without moving stock**, and produces a **linked Credit Note** that adjusts the customer's balance for the cancelled value. The invoice itself is **preserved** (not deleted, not rewritten in place).

New vocabulary, per invoice line and in the delivery read-model:

- `ordered` — invoiced quantity
- `delivered` — sum of active delivery quantities
- `cancelled` — sum of cancelled remainder (this feature)
- `pending` = `ordered − delivered − cancelled`
- `returned` — kept distinct (goods that physically came back)

**Invariant:** cancelled quantity **never** creates a stock movement and is **not** a return. Returned quantity **always** creates a stock movement.

### 4.2 Entry point and flow

1. From the Delivery screen or Delivery Report, on an invoice with `delivered > 0` (or `≥ 0`) and `pending > 0`, the user opens **Cancel Undelivered Quantity**.
2. Per line: current `ordered / delivered / pending` are shown read-only; the user enters **Cancel Qty** (default = pending) and a **Reason** (required).
3. A **preview** shows the credit value to be raised for the cancelled quantity (see §6).
4. Confirm → server posts, in **one transaction**: a *cancellation record* (no stock rows) and a **Credit Note** voucher (ledger legs only). The client sends an `idempotency_key`.
5. The invoice's delivery state becomes **"Closed — Partially Delivered"**; `pending` drops to 0 for the cancelled portion; the dashboard worklist no longer lists it as Partial.
6. Cancel/reverse of a cancellation is **not** proposed in v1 (see §12).

**Whole remainder vs partial remainder:** allowed to cancel all or some of the pending. Cancelling the full pending when nothing was delivered yields *"Closed — Not Delivered"*; cancelling the full pending when delivered > 0 yields *"Closed — Partially Delivered"*.

### 4.3 Why not reuse "cancel delivery" or "sales return"

- **Cancel delivery** is all-or-nothing on a *posted delivery voucher* and reverses stock; it cannot express "the customer will never take 100 that never shipped."
- **Sales return** posts `stock_in`; using it here would create phantom stock. (Only when goods *already left* is a return correct — "once goods left, use a sales return.")

---

## 5. Proposed data model (extend `patch:add-unit-type`) — [Pending owner approval]

All additions idempotent (`Schema::hasColumn` / `information_schema` guarded), re-runnable, preserving rows/defaults, matching `ENGINE`/`CHARSET`/`COLLATE` of `inventory_delivery_masters`.

1. **`inventory_delivery_cancel_masters`** — own `main_trx_id` (UNIQUE, the cancellation voucher); `invoice_mstr_id`; `branch_id`; `company_id`; `customer_id`; `idempotency_key` (UNIQUE); `cancel_date`; `reason_id` / `reason_note`; `status` (1 active / 0 cancelled); audit columns.
2. **`inventory_delivery_cancel_details`** — `cancel_mstr_id`; `sales_detail_id` **and** `sales_line_uid` (same stable line identity the delivery uses); `product_id`; `cancelled_quantity`; `rate`; `cancelled_value`; `status`.
3. **Credit Note voucher** — a ledger voucher type (`acc_vr_type`) resolved at runtime (do **not** hardcode an id); linked to the invoice and the cancellation. **No `inventory_masters` / `inventory_details` rows.**
4. Optional: `inventory_delivery_cancel_masters.credit_note_trx_id` to point at the credit note voucher (or the reverse FK).
5. Permission keys: `delivery.cancel_remaining` (see §10).

> Migration path alternative: a single `cancelled_quantity` column on delivery details is *not* recommended — a per-cancel master/detail pair gives the audit trail, reasons, and one-to-many history the requirement calls for.

---

## 6. Proposed credit-note / billing adjustment — [Pending owner approval]

The requirement: preserve the original invoice and raise a **linked credit note** for the cancelled quantity's value, including its share of discounts/taxes, adjusting the customer balance.

- **Line value:** `cancelled_quantity × sales_price` for each cancelled line.
- **Discount:** the invoice discount is a **header** amount. Proposal: allocate the invoice-level discount to cancelled lines **pro-rata by cancelled value** (or by quantity — **[Pending owner approval]**). Credit the discount share back to the customer.
- **Taxes / other invoice-level charges** (TDS, service charge, transportation, in the Tiles model): allocate **pro-rata** to the cancelled fraction and reverse the same share. If any tax is not line-level in the schema, this allocation is a **[Pending owner approval]** business rule.
- **Customer balance:** the credit note posts ledger legs that **credit** the customer by the net cancelled value (value − its discount/tax share), i.e. the mirror of the sale's debit.
- **Rounding:** allocate on unrounded totals, round once for display (same principle as `_stock_details_group_summary_check.ts`).

**Fully-paid case:** a customer who has already paid in full will, after the credit note, show a **credit balance** (an *Advance*, represented as a negative balance on the same party head — see `TilesBusinessSales.tsx:306-309` and the `Advance` party type). **No money moves automatically.** Any actual cash/bank refund is a **separate refund entry** (cash/bank payment to the customer, e.g. `/trading/cash/payment`), entered deliberately by a user.

**Do not reuse the existing Sales Return document** for this: it posts `stock_in`. Either add an explicit "no stock movement / not shipped" flag to the return path, or (recommended) introduce a dedicated **Credit Note** document that posts ledger legs only. **[Pending owner approval]**

---

## 7. Proposed status model — [Pending owner approval]

Delivery state per invoice (derived from active deliveries + cancellations, never a stored mutable field on the invoice itself — consistent with "pending is computed"):

| Condition (per invoice) | Status label |
|---|---|
| `cancelled ≥ ordered` | **Closed — Not Delivered** |
| `delivered ≥ ordered` | **Complete** |
| `delivered > 0` and (`delivered + cancelled) ≥ ordered` | **Closed — Partially Delivered** |
| `delivered > 0` and `pending > 0` | **Partial** |
| `delivered = 0` and `pending = ordered` | **Not delivered** |
| stamp = 1 (invoice took its stock) | **Invoice (stock taken)** |

Add the **Cancelled** column alongside Ordered / Delivered / Pending on the Delivery screen, report, and dashboard.

---

## 8. Proposed reporting & ledger changes

> **Do not assume existing reports pick up credit notes.** Each surface below is stated with what it reads today and what must change. Sales/Customer-Sales and Sales Ledger currently read **invoice lines**, so a credit note will **not** appear until the report is changed to account for it.

| Surface | File(s) / source today | Proposed change |
|---|---|---|
| **Customer Sales report** | `reports/customer-sales/customerSalesGroups.ts` `buildCustomerSalesRows`; reads invoice lines `quantity`, `amount` | Show **500 ordered − 100 cancelled = 400 net**, or add a separate "Cancelled" line/column. Requires the report to read cancellations. **[Pending owner approval]** on net-vs-gross presentation. |
| **Sales Ledger** | `reports/salesledger/salesLedgerDocumentData.ts`, `SalesLedgerCalculator.ts`; reads `sales_master.details` | Decide whether to show the invoice gross with a credit-note row, or net. Must be changed to include the credit note. |
| **Customer Ledger** (plain & with-product) | `reports/ledger/ledgerDocumentData.ts`, `reports/ledger-with-product/ledgerWithProductUtils.ts`; reads `acc_transaction_details` | **Automatic** once the credit note posts ledger legs — but verify the credit-note voucher type renders correctly and is included in the running balance. |
| **Delivery Report** | `DeliveryReport.tsx`; `statusMeta` `complete/partial/none` | Add **Cancelled** column and the **Closed — …** statuses; foot totals include cancelled; default filter excludes fully closed invoices from "Partial". |
| **Delivery Dashboard** | `DeliveryDashboard.tsx`; `partialRows` / `dueRows` | Exclude cancelled/closed invoices from the Partial worklist; add a "Closed" tile/list and a Cancelled total. |
| **Stock / Inventory reports** | `reports/productstock/*`, `reports/closing-stock/*` (backend `productStockData`, `closingStock`) | **No change expected** — no stock movement; must be **verified** to remain unchanged after a cancellation. |
| **Due List / Ageing** | `reports/duelist/*`, `accounts/AgeingReport.tsx` | Credit reduces the party's outstanding; a fully-paid customer becomes an **Advance**. Verify the sign handling. |
| **Daily Account Book** | `_daily_account_book_check.mjs` sections | Confirm whether the credit note appears as its own section/line. |

---

## 9. Proposed validation, duplicate protection, permissions, and audit

### 9.1 Validation rules

- Only **stamp `0`** (deduct-on-delivery) invoices may be cancelled; refuse stamp `1`.
- `cancel_qty ≤ pending` per line; refuse over-cancellation (`delivered + cancelled + qty ≤ ordered`).
- **Reason is required**; reason list configurable (e.g. customer refused / short / order cancelled).
- Refuse if the invoice is not **live** (`main_trx_master.status = 1`).
- Refuse if the invoice is **fully delivered** (delivered = ordered) — that is a return scenario, not a cancellation.
- Branch-scope and **closed-period** checks (`rethrowIfPeriodClosed`); the cancellation/credit-note date must be in an open period.
- Cannot cancel a line whose entire quantity was delivered; cannot double-count a quantity that is already returned.

### 9.2 Duplicate-submission protection

- Client `idempotency_key` with a **UNIQUE** constraint; a repeat returns the existing cancellation/credit note without re-posting.
- `SELECT … FOR UPDATE` on the invoice (and its live `inventory_sales_details`) to serialize concurrent cancellations against the same invoice; the second observes the first's `cancelled` quantity and cannot over-cancel.
- Once `pending = 0` for a line, further cancellation is refused.

### 9.3 Permissions

- New key **`delivery.cancel_remaining`** (preferred over overloading `delivery.cancel`, which means "cancel a whole delivery"). Add to the legacy list, the live `permissions` table, roles, and the `invoice` menu group (`Sidebar/menuPermissions.ts`).
- Refund remains a **separate** permission on the payment screen; cancelling does not refund.

### 9.4 Audit history

- Reuse the `VoucherTrail::snapshot` pattern (per `2026-10-07-...-design.md` §5) to record before/after quantities, actor, timestamp, reason, and the linked invoice/credit note.
- The cancellation voucher's `main_trx_master` carries `status`; cancelling the *cancellation* (reversal) is **[Pending owner approval]** and, if added, would reverse the credit note and restore `pending` — still with **no stock movement**.
- List the cancellation history on the invoice/delivery view (who, when, why, how many, credit-note number).

---

## 10. Acceptance criteria (proposed)

1. **Pending closes:** after cancelling 100 of a 500/400 invoice, `pending` = 0 and status = **Closed — Partially Delivered**.
2. **No stock movement:** stock `in`/`out` rows are **identical** before and after a cancellation; closing stock for the product is unchanged; Product Stock and Stock Details reports do not move.
3. **Invoice preserved:** the invoice's `quantity`/`amount` and its lines are unchanged; the original invoice remains retrievable and printable; the credit note is linked.
4. **Credit note value:** equals the cancelled line value adjusted by the allocated discount/tax share; the customer balance drops by exactly that net value.
5. **Fully-paid case:** the customer balance becomes a **credit/advance**; **no** cash moves; a refund requires a separate, explicit entry.
6. **Quantities displayed separately:** Ordered / Delivered / Cancelled / Pending shown independently on Delivery screen, report, and dashboard.
7. **Ordered vs delivered validation:** over-cancellation and cancellation on a fully delivered line are refused with a clear message.
8. **Duplicate protection:** the same `idempotency_key` posts once; two concurrent cancellations for one invoice serialize and cannot over-cancel.
9. **Permissions:** a user without `delivery.cancel_remaining` cannot cancel; a user without the refund permission cannot refund.
10. **Audit:** cancellation history shows actor, time, reason, quantities, and the linked credit-note number.
11. **Reports:** Customer Sales and Sales Ledger reflect the adjustment (net or with a credit-note row, per decision); Customer Ledger includes the credit note; Delivery Report/Dashboard show the new status and column.
12. **Scope guard:** stamp-`1` invoices and non-Tiles branches are unaffected; historical invoices behave exactly as before.

---

## 11. Ordered implementation plan (proposed — not authorized)

| # | Step | Where |
|---|---|---|
| 0 | Owner decisions (§12) | — |
| 1 | Extend `patch:add-unit-type`: cancel master/detail tables, credit-note voucher type resolution, permission key (idempotent) | `Console/Commands/AddUnitTypeToBuildingUnits.php` |
| 2 | Cancellation posting service (no stock): transaction, `FOR UPDATE`, `idempotency_key`, period check, audit | new controller/service |
| 3 | Credit-note posting (ledger only) + pro-rata discount/tax allocation | new service |
| 4 | Pending math: `ordered − delivered − cancelled`; new statuses | read endpoint |
| 5 | Cancel-remaining UI + preview + reason + permission gate | `delivery/Delivery.tsx`, `DeliveryReport.tsx` |
| 6 | Report/dashboard changes (Cancelled column, Closed statuses) | `DeliveryReport.tsx`, `DeliveryDashboard.tsx` |
| 7 | Sales/Customer-Sales and Sales Ledger inclusion of credit notes | `reports/customer-sales/*`, `reports/salesledger/*` |
| 8 | Refund entry guidance (separate payment) | payment screens |
| 9 | Reports verification (stock unchanged; ledger/due/ageing correct) | `reports/*` |
| 10 | Harness + manual verification | §10 tests |

---

## 12. Open decisions — [Pending owner approval]

1. **Credit note vs flagged return:** dedicated credit-note document, or a "not shipped" flag on the existing sales return that suppresses `stock_in`?
2. **Discount/tax allocation:** pro-rata by value, by quantity, or exact line allocation?
3. **Report presentation:** show invoices net of cancellations, or gross plus a separate credit-note row?
4. **Status naming:** confirm the exact labels ("Closed — Partially Delivered", "Closed — Not Delivered").
5. **Reversal:** may a cancellation be reversed (reopening pending), and by whom?
6. **Reason list:** fixed list vs configurable; is a free-text note also required?
7. **Permission granularity:** one `delivery.cancel_remaining` key, or split "request" vs "approve"?
8. **Period/approval gating:** must the invoice be approved (`is_approved = 1`) before cancelling?
9. **Partial-line cancellation:** allowed to cancel part of a single line's pending, or whole lines only?
10. **Backend field naming / voucher-type id:** confirm at runtime against the live schema.

---

*Draft — Pending Review. This document records analysis and a proposed solution only. It does not authorize or perform any change to application code, database schema or data, configuration, or version control.*
