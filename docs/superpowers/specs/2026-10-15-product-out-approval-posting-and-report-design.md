# Product Out — Approval-Based Posting Integrity & Product In Out Report (Design)

**Status:** **Draft — Pending Review. All seven owner rulings are final and incorporated; no phase is authorised to execute.** Documentation only. **No application code, schema, configuration or data has been changed. No migration, repair command, commit or push has been made.** Each phase requires its own go-ahead.
**Repositories:** `cashbook_api` at `F:\All_Database\www\cashbook_api` (branch `Reseller`), `cashbookbd_react` at `F:\All_Database\cashbookbd_react` (branch `vite-8`).
**Supersedes:** the investigation plan previously held in the agent plans directory.
**How to read this document:** *Verified* = read in the code, with file/function/line citations. *Proposed* = agreed design, not yet built. Every owner ruling is final and incorporated (§0); the only open matters are the technical blockers in §16.2.

---

## 0. Owner decisions — FINAL (incorporated)

All items are settled and applied in this revision. Nothing here remains open; the only outstanding matters are the technical blockers listed in §16.2.

| # | Decision | Final ruling | Applied in |
|---|---|---|---|
| 1 | Approval transaction shape | **Per-voucher atomic transactions** returning explicit **success / skipped / failed** results. One failed voucher must not leave an inconsistent approval or stock state. | §3 (Phase A), §5 (Phase C) |
| 2 | Quantity mismatch | **Throw and roll back the affected voucher. No automatic repair.** | §4 B2 (Phase B) |
| 3 | Optional `product_out_master` UNIQUE index | **Omitted for now.** Transaction-scoped locking and quantity validation carry the guarantee on their own. | §4 B3, §12 |
| 4 | Godown Stock label | **"No Warehouse / Unassigned"** — a category of its own; never auto-assigned to a real warehouse; branch-level totals preserved. | §8 (Phase F) |
| 5 | Date-aware FIFO | **Design only.** No implementation; impact to be reviewed separately. | §9 (Phase G) |
| 6 | Database access | **Not authorised.** No connection and no query will be run. | §16.2 (TB1) |
| 7 | Implementation sequence | **A + B together → C + D → E → F.** Phase G requires separate approval. | §13 |

**Carried forward from the earlier rulings:** deduct stock only after approval (never at save); approval + posting + rollback atomic; row-level locking covering the whole decision and write; do not rely on a UNIQUE constraint alone; validate expected vs posted quantity per product and per voucher; preserve existing FIFO valuation until the separate design is approved; fix Product In Out including running stock, totals and print; never auto-run `product-out:resync`; include a deployment, verification and rollback strategy; never access the database with discovered credentials.

---

## 1. Business rule invariants (unchanged, must hold after every phase)

1. **Save** → no `inventory_masters`, no `inventory_details`.
2. **Pending** → no stock movement.
3. **Approved** → exactly one posting; `stock_out` equals the typed quantity, split across FIFO cost layers.
4. **Rejected** → no stock movement. (Today the Approval Center refuses `reject`/`clear` for vouchers — `ApprovalCenterController::voucherAction()` :346 — so this holds trivially and must stay that way if a reject path is ever added.)
5. **Approval removed** → the movement is reversed by `ProductOutPosting::unpost()` (:190-202), which deletes details then masters for the voucher.
6. **Posting failure** → the approval must not persist (Phase A makes this true).
7. **`product.out.approve`** remains the permission that governs moving write-off stock (Phase D).

### 1.1 Guarantees required by the owner, and how the design delivers them

| Required property | Mechanism | Where |
|---|---|---|
| Approval, removal and bulk approval **preserve stock consistency** | The `is_approved` write, the trail and `ProductOutPosting::sync()` commit or roll back together, **per voucher**; a failure returns that voucher to its original state and is reported | §3, §5 |
| Posting errors are **never silently swallowed** | `post()` throws instead of returning early (:136, :146); `sync()` cannot return `true` having written nothing; `syncMany()` catches per id and returns the failure list rather than aborting the loop | §4 B2, §5 |
| Concurrent approval **cannot deduct stock twice** | `SELECT … FOR UPDATE` on the voucher row is taken **before** the `isPosted()` read and held across the write, so only one of two racing approvals can observe `posted = false` | §4 B1 |
| **Existing legitimate permissions are preserved** | `product.out.approve` is required **in addition to** `voucher.approval` / `remove.approval`, and only for batches that actually contain a write-off — no other document's gate changes | §6 |
| Product In Out calculations, totals and printing stay **consistent** | The new branch is sourced from the same `inventory_details` ledger as Opening, over a non-overlapping `vr_date` window; screen, totals and print share one running-stock rule | §7 |
| Historical reconciliation is **never executed automatically** | Detection is read-only queries only; `product-out:resync` is not run; no phase alters any record's approval, quantity or classification | §10 |

---

## 2. Confirmed defects (verified)

| # | Sev | Defect | Evidence |
|---|---|---|---|
| D1 | Critical | Approval is committed outside any transaction, then posting runs after it; no `try/catch`. | `ApprovalCenterController::voucherAction()` :259-347 — update :279-287, `syncMany()` :300, no transaction/catch |
| D2 | Critical | Same on removal: `is_approved = 0` committed first (:321-329), sync after (:338). | `voucherAction('remove')` :308-344 |
| D3 | Critical | Bulk sweep updates then posts, no transaction; `syncMany()` has no per-item `try/catch`. | `VoucherModificationController::approvalAllVoucher()` :2699-2702 → :2710; `ProductOutPosting::syncMany()` :61-72 |
| D4 | High | Posting can silently write nothing and still report success. | `ProductOutPosting::post()` early `return;` :136, :146; `sync()` returns `true` :118 |
| D5 | High | Idempotency is single-threaded: `exists()` read before the write, no lock. | `isPosted()` :176-179 read at :92 before `DB::transaction(post())` :116 |
| D6 | High | `inventory_masters.main_trx_id` is a non-unique KEY (`inv_mstr_fr_key`). | `AddUnitTypeToBuildingUnits` :5535-5536 |
| D7 | High | A partial post is undetectable and unrepairable — "posted" means only "a master row exists". | `isPosted()` :176-179; `ResyncProductOut::handle()` :54 uses the same answer |
| D8 | Medium | FIFO pricing is not date-aware. | `StockCostLayers::forIssue()` :33-55 (no date bound) vs `TradingStockLedger::soldInPeriod()` :153-171 |
| D9 | Medium | Godown Stock inner-joins `inventory_godown`; Product Out may write a NULL `godown_id`. | `ReportsController::apiGodownStockData()` :5895; `ProductOutController::apiStore()` :142 |
| D10 | Medium | Posting/shortage read `inventory_details.branch_id`; every report reads `main_trx_master.branch_id`. | `StockCostLayers::forIssue()` :124, `StockShortageGuard::availableStockFor()` :212 vs report queries; `ProductOutPosting::post()` :134; `postTransferStock` :135 |
| D11 | Medium | Product In Out has no Product Out branch; running Stock overstates. | `ReportsController::productLedgerData()` :5942-6061 (branches :5969, :5990, :6011, :6032; opening :5951-5960) |
| D12 | Low | Bulk-approval and removal endpoints are not gated on `product.out.approve`. | `config/route_permissions.php` :667-670; `denyWriteOffApproval()` :361-373 covers the Approval Center only |

**Confirmed NOT the cause:** there is **no DB trigger on `inventory_masters`/`inventory_details`** (trigger set at `AddUnitTypeToBuildingUnits` :9287-9349) — nothing refuses the posting insert. Side effect noted: approving a closed-year write-off is permitted, because `trg_mtm_closed_year_bu` only fires when `is_approved` goes 1→0.

**D12 precision:** the Approval Center **action** *is* already gated — `denyWriteOffApproval()` :361-373 is called from both the approve (:275) and remove (:317) branches. The ungoverned paths are `approvalAllVoucher()` and the two `removeApproval*` methods, which currently require only `remove.approval` / `voucher.approval`.

---

## 3. Phase A — Atomic approval and removal (P0)

**Goal:** approval, trail and posting share one failure domain. Satisfies invariant 6.

**Design (Approval Center).** Replace the single bulk update with a **per-voucher transaction loop** returning explicit success / skipped / failed results (ruling 1 — final), because `action` already accepts up to 500 ids (:241):

```
$targets = ids where company, status = 1, is_approved = 0
if ($denied = denyWriteOffApproval($targets)) return $denied;   // unchanged, whole-batch refusal

foreach ($targets as $id) {
    try {
        DB::transaction(function () use ($id) {                 // one fate per voucher
            MainTransactionMaster::where('id', $id)->where('is_approved', 0)
                ->update(['is_approved' => 1, 'approved_by' => $userId, 'approved_date' => now()]);
            VoucherTrail::recordApproval([$id], true);
            ProductOutPosting::sync($id);                        // nested → savepoint
        });
        $approved[] = $id;
    } catch (Throwable $e) {
        rethrowIfPeriodClosed($e);                               // §42 passes through
        $failed[] = ['id' => $id, 'message' => $e->getMessage()];
    }
}
```

The response reports **updated / skipped / failed**. When `$failed` is non-empty the payload must not read as an unqualified success — the UI has to show which write-offs still need attention.

**Removal** gets the identical shape with `is_approved = 0` and `sync()` doing the unpost, so a failed reversal cannot leave the voucher un-approved with stock still posted (D2).

**Why not one transaction for the whole batch:** decision A; a 500-voucher batch holding row locks for its full duration invites lock-wait timeouts, and one bad voucher would roll back 499 good ones.

**Files:** `app/Http/Controllers/ApprovalCenterController.php` → `voucherAction()` approve :261-306, remove :308-344.
**Risk:** an approval that previously appeared to succeed while posting nothing will now surface as a failure. That is the intent; the operator-facing message must be human-readable.

---

## 4. Phase B — Locking and quantity validation (P0)

**Goal:** exactly-once posting, with the lock covering the **entire** decision and write; and "posted" stops meaning only "a row exists".

### B1. Lock the decision and the write

Restructure `ProductOutPosting::sync()` so the whole unit runs inside one transaction that begins with a row lock:

```
return DB::transaction(function () use ($mainTrxId) {
    $voucher = DB::table('main_trx_master')->where('id', $mainTrxId)
                    ->lockForUpdate()                      // ← the lock
                    ->first(['id','transaction_type','is_approved','status']);

    if (!$voucher || (int) $voucher->transaction_type !== self::TRANSACTION_TYPE) return false;

    $posted = self::isPosted($mainTrxId);
    $wanted = (int) $voucher->is_approved === 1 && (int) $voucher->status === 1;

    if ($wanted === $posted) {
        // posted and wanted: verify the quantities actually agree (B2)
        self::assertQuantitiesMatch($mainTrxId);
        return false;
    }
    if (!$wanted) { self::unpost($mainTrxId); return true; }
    self::post($mainTrxId);
    return true;
});
```

`lockForUpdate()` serialises concurrent approvals of the **same** voucher only — it is not a global lock, and it is taken before the decision, so two racing approvals cannot both observe `posted = false`. This is the primary defence; the constraint in B3 is secondary only.

### B2. Validate expected vs posted, per product and per voucher

Two new public helpers on `ProductOutPosting`:

- `expectedQuantity(int $mainTrxId): array` — `product_id => SUM(product_out_details.quantity)` where `out_mstr_id = master.id`, `status = 1`.
- `postedQuantity(int $mainTrxId): array` — `product_id => SUM(inventory_details.stock_out)` joined through `inventory_masters.main_trx_id = $mainTrxId`.

`assertQuantitiesMatch()` compares them. **A mismatch throws and rolls back the affected voucher** (ruling 2 — final) — it does not auto-repair, and it does not silently pass:

- Duplicate post → posted > expected → throw (operator must use the documented removal path).
- Partial post → posted < expected → throw.
- Wrong product / wrong branch → keys or branch differ → throw.

This is the change that makes D7 detectable. It also means `sync()` can no longer return `true` having written nothing (D4): `post()` must **throw** instead of the silent `return;` at :136 and :146.

**Deliberate consequence:** the state "approved, posted, but quantities disagree" becomes a loud failure that only a removal + re-approval can clear. That preserves requirement 9 (no automatic historical stock modification).

### B3. Secondary guard — OMITTED (ruling 3 — final)

**No index is added in this phase.** The guarantee rests entirely on the transaction-scoped row lock (B1) and the expected-vs-posted validation (B2). A `UNIQUE (main_trx_id)` on `product_out_master` is deliberately deferred: it is not required for correctness now, and omitting it keeps phases A–F entirely schema-free and trivially reversible.

Recorded for any future revisit: such an index is safe by construction (one slip, one voucher — today only a non-unique `KEY pom_main_trx_idx`, SQL file :103) and would need `information_schema.STATISTICS` guarding plus a soft failure when duplicates already exist, mirroring the trigger-creation guard at `AddUnitTypeToBuildingUnits` :9363-9374.

A **global** `UNIQUE` on `inventory_masters.main_trx_id` is **rejected**. Audit of the master-inserting sites: `TradingCombinedController` creates **two vouchers, not two masters** (`apiTradingCombinedStore()` :119-122 → `Transaction::mainTransactionMaster` :476 and :529), and three flows assume one master per voucher by reading `where('main_trx_id')->value('id')` (:899-904, :929-934) or re-summarising under the existing master (`Manufacturing::InventoryMaster()` :176-186). But the negative is unproven: `VoucherModificationController::voucherTypeChangeInventoryMaster()` :2768-2783 (called :206) inserts a master for an existing voucher without checking or clearing one, and Warehouse Transfer's edit path is the only place that clears before re-posting (`clearTransferPostings()` :1203-1210 ← :1097). Compatibility is therefore **not proven**.

**Files:** `app/Services/Inventory/ProductOutPosting.php` → `sync()` :80, `syncMany()` :61, `post()` :129, `isPosted()` :176, `unpost()` :190, plus the two new helpers.

---

## 5. Phase C — Bulk approval safety (P1)

`VoucherModificationController::approvalAllVoucher()` (:2674-2719) sweeps every voucher of the branch in a date range. Replace the mass update (:2699-2702) with a **per-voucher transaction loop** identical in shape to Phase A, collecting failures:

- Each voucher: `DB::transaction` → guarded update → `VoucherTrail::recordApproval([$id], true)` → `ProductOutPosting::sync($id)`.
- `syncMany()` stops throwing mid-loop: it catches per id and returns a failure list.
- Response reports `approved`, `failed[]` (`id`, `vr_no`, `message`). A partial batch must be visible, never silent.

**Files:** `app/Http/Controllers/VoucherModification/VoucherModificationController.php` → `approvalAllVoucher()` :2674-2719; `app/Services/Inventory/ProductOutPosting.php` → `syncMany()` :61-72.

---

## 6. Phase D — Product Out approval permissions across all paths (P1)

Today only `ApprovalCenterController::denyWriteOffApproval()` :361-373 enforces `product.out.approve` for write-offs, and only for the Approval Center. Extend the same whole-batch-refusal semantics to:

- `VoucherModificationController::approvalAllVoucher()` — if the swept set contains any `transaction_type = 17` voucher and the caller lacks `product.out.approve`, refuse the whole batch (never silently drop the write-offs and report "19 approved" over 20 ticked).
- `VoucherModificationController::postRemoveApproval()` (:650, currently `remove.approval` :652).
- `VoucherModificationController::removeApprovalById()` (:774, currently `remove.approval` :776).

**Preservation:** `remove.approval` and `voucher.approval` continue to govern every other voucher type exactly as now — a write-off simply requires **both** when it is involved, matching the established `denyWriteOffApproval()` pattern. Reuse `ProductOutPosting::APPROVE_PERMISSION` (:48), never a second copy of the string.

**Files:** `VoucherModificationController.php` (three methods); `ProductOutPosting.php` (constant already exists); no new permission row is needed.

---

## 7. Phase E — Product In Out report (P1)

### E1. Backend — a fifth UNION branch, sourced from the stock ledger

Add to `ReportsController::productLedgerData()` (:5942-6061) a Product Out branch built from `main_trx_master` + `inventory_masters` + `inventory_details` where `mtm.transaction_type = 17`, mirroring the sales branch exactly:

- Filters: `mtm.company_id`, branch scope, `mtm.status = 1`, the selected `product_id`, and the **same** `whereBetween('mtm.vr_date', [$startDate, $endDate])` the other branches use.
- Measure: `SUM(inventory_details.stock_out)` as the `product_out` column.
- Display: `LEFT JOIN product_out_master` on `main_trx_id` only to pick up `out_no` (the shop's `DMG-…` number) alongside `mtm.vr_no`.
- Select `0 as product_out` in the four existing branches — **in the same column position** (this codebase warns that a UNION aligns by position, not name: :7949-7954, :8038-8040).

**Why the ledger and not `product_out_details`:** Opening is computed from `inventory_details` (:5951-5960). Matching its basis guarantees `Opening + movements = true closing`. It also means a **pending or un-approved slip contributes nothing**, because it has no `inventory_details` rows — the report can never show a movement that has not happened.

**Why no double count:** Opening covers strictly `vr_date < startDate`; the branch covers `[startDate, endDate]`. The partitions do not overlap. A write-off before the range appears in Opening and never again; one inside the range appears once, as a row.

**Why `mtm.vr_date` and not `pom.out_date`:** Opening and all four branches date on the voucher. The two coincide at creation (`apiMainTransactionMaster(17, 4, $outDate)` :134) but the change-date module can move one without the other.

**Untouched:** the `$ledger` summary queries (:581-637), `total_cost`, and every existing column.

### E2. Frontend — screen, running stock, totals, print

`ProductLedgerData.tsx`

- New **Product Out** column between *Purchase Return* and *Stock* (`columns` :292-384).
- Running stock (`reportRows` :156-197): `runningStock += purchase + salesReturn − sales − purchaseReturn − productOut`.
- A `totalProductOut` in `totals` and a new footer cell.
- **Column arithmetic:** the table has 9 columns today and the footer supplies 9 cells (`colSpan: 3` + 6) at :386-420. Adding Product Out makes **10 columns → the footer must become `colSpan: 3` + 7**, or the footer will misalign.

`ProductLedgerDataPrint.tsx`

- `ProductLedgerPrintRow` type (:7-32) gains `product_out` (+ alias twins alongside the existing `purchase_qty`-style keys).
- `detailRows` running-stock walk (:100-115), `printableRows` (:117-142) and `summary` (:145-150).
- The `<thead>` (:175-203), the detail row cells (:206+), the Opening row and the footer/total row.

**Print layouts / saved templates:** there are **none to migrate** — `printTemplate.ts` defines no `product_ledger` / `product_in_out` / `item_ledger` document type, and this report prints through its own bespoke component (`ProductLedgerDataPrint`, `PadPrinting`). The `sales_ledger`/`purchase_ledger` designer is a different report and is untouched.

**Left separate:** the financial product ledger (`transaction_product_maps`, `ProductLedgerLines::base()` :70, written by `ProductTrackingService::syncVoucherMappings()` :261 for `sales_bill`/`purchase_bill`/cash/bank/journal) stores **money** per product. A write-off has no money and must never be added there.

---

## 8. Phase F — Godown Stock: an explicit unassigned bucket (P2)

`apiGodownStockData()` (:5875-5925) inner-joins `inventory_godown` (:5895) on `inventory_details.godown_id`. Product Out writes `godown_id = from_warehouse_id`, which is nullable (`ProductOutController::apiStore()` :142), so warehouse-less write-offs vanish from the report while Product Stock still counts them.

**Design (ruling 4 — final):** change the join to `leftJoin`, and select `COALESCE(ig.name, 'No Warehouse / Unassigned') as warehouse`. Rows are never dropped and are never attributed to a real warehouse; the branch stays in the `GROUP BY` (:5904), so **branch-level totals are preserved**.

**Frontend:** no structural change — `GodownStockReport.tsx` renders `row.warehouse` (:239, :281) and the label flows through. The Warehouse filter is unaffected (when a specific godown is chosen, `godown_id > 0` already excludes NULLs, which is correct).

**Behaviour change to acknowledge:** every `godown_id IS NULL` row in the system (not only write-offs) now appears in an explicit bucket instead of being invisible. This is the outcome you chose in decision C.

---

## 9. Phase G — Date-aware FIFO (DESIGN ONLY — ruling 5 — final, do not implement)

**Problem (D8):** `StockCostLayers::forIssue()` (:33-55) prices against the layers standing at **post time**, with no `vr_date` bound. A write-off approved later than its slip date — or re-posted after a correction — can consume layers that arrived **after** the write-off. `TradingStockLedger::soldInPeriod()` (:153-171) already solves the same problem correctly, releasing a layer only once `on <= vr_date`.

**Proposed design (not built):** add an optional `?string $asOf = null` to `forIssue()`; when supplied, bound `receiptRows()` by `mtm.vr_date <= $asOf` **and** bound the `consumed` sum the same way so the skip and the take are on one time base. Callers pass the voucher's `vr_date`.

**Impact to verify before any implementation:**

| Caller | Site | Effect of the change |
|---|---|---|
| Material Issue | `MaterialIssueController::apiStore()` :171 | Cost of newly posted issues would follow the issue date |
| Warehouse Transfer issue | `WarehouseTransferController` :353, :1159 (`'out'`), plus :511 (`'in'` → `forReceive`, separate method) | Same |
| Product Out | `ProductOutPosting::post()` :158 | The write-off's FIFO cost follows the slip date |
| Historical valuation | all of the above already posted | **Unchanged** — the design must not re-price existing rows |
| Closing Stock / Trading dashboard | `rebuildStockTable()` :7414, `TradingStockLedger::closing()` | Must be re-verified for agreement after the change |

**Risk if done carelessly:** it changes the value of *future* postings for three documents, so it needs its own approval, its own regression set, and a clear statement that historical rows are not re-valued. **No work starts on this phase under the current authorisation.**

---

## 10. Historical reconciliation — report only

**Rule: detect, classify, report. Do not repair. Do not run `product-out:resync` automatically. Do not touch `is_approved` or any quantity.**

**Step 1 — classify** with the read-only queries in the Appendix (§14).

| Category | Query | Safest recommended action |
|---|---|---|
| Approved, never posted (D1/D3) | A | Candidate for `product-out:resync` **after** Phases A–C are deployed, run deliberately and per tenant — never automatically. Re-run C and D afterwards to prove quantity and absence of duplicates. |
| Posted, not/no longer approved (D2) | B | **Needs your ruling per tenant:** either the removal was accidental → re-approve, or it was intended → unpost. Both are approvals; neither is automatic. |
| Partial / short post (D4/D7) | C | Removal → re-approval is the only correct path. `resync` cannot fix it. |
| Duplicate post (D5/D6) | D | Same: removal (`unpost()` deletes *all* masters for the voucher, :190-202) then re-approval. |
| Wrong product / branch / godown (D9/D10) | E, F | Removal → re-approval, once the branch mapping is understood. |
| Re-valued FIFO cost after a re-post (D8) | — | **Not corrected.** Historical costs are not rewritten; state the re-valued figure. |

**Step 2 — record.** Per tenant: voucher numbers, `out_no`, category, quantity deltas, and the action taken. The reconciliation report is a deliverable in its own right and needs no schema change.

**Step 3 — never** edit a record to make a report agree (standing rule).

---

## 11. Affected files and functions

| File | Function / site | Phase |
|---|---|---|
| `app/Http/Controllers/ApprovalCenterController.php` | `voucherAction()` :259-347 (approve :261-306, remove :308-344) | A |
| `app/Http/Controllers/VoucherModification/VoucherModificationController.php` | `approvalAllVoucher()` :2674-2719 | C, D |
| `app/Http/Controllers/VoucherModification/VoucherModificationController.php` | `postRemoveApproval()` :650, `removeApprovalById()` :774 | D |
| `app/Services/Inventory/ProductOutPosting.php` | `sync()` :80, `syncMany()` :61, `post()` :129, `isPosted()` :176, `unpost()` :190, + new `expectedQuantity()` / `postedQuantity()` / `assertQuantitiesMatch()` | A, B, C |
| `app/Console/Commands/ResyncProductOut.php` | `handle()` :38-106 | B (report discrepancies; no auto-run) |
| `app/Http/Controllers/Reports/ReportsController.php` | `productLedgerData()` :5942-6061 | E |
| `app/Http/Controllers/Reports/ReportsController.php` | `apiGodownStockData()` :5875-5925 | F |
| `app/Services/Inventory/StockCostLayers.php` | `forIssue()` :33-55 | G (design only) |
| `src/components/modules/reports/product-ledger-data/ProductLedgerData.tsx` | `reportRows` :156-197, `columns` :292-384, `footerRows` :386-420 | E |
| `src/components/modules/reports/product-ledger-data/ProductLedgerDataPrint.tsx` | type :7-32, `detailRows` :100-115, `printableRows` :117-142, `summary` :145-150, `<thead>` :175-203, rows/footer | E |
| schema (per tenant, `patch:add-unit-type`) | `product_out_master` — optional `UNIQUE (main_trx_id)`, **not in scope** | B3 (omitted, ruling 3) |

**Unchanged on purpose:** `ProductOutController::apiStore()` (the :166 no-post gap), the `is_approved` gate in `sync()` :98, `InventoryTransferMaster::postTransferStock()`, `transaction_product_maps`, and every save-time deduction path.

---

## 12. Schema / database impact

- **No column added, altered or dropped. No backfill. No historical row rewritten.**
- **No schema touch remains in scope.** The optional `product_out_master` index is omitted (ruling 3 — final), so phases A–F change no table, no column and no index — nothing to migrate, and nothing to roll back at the schema level.
- If an index is ever revisited, it must extend the existing `patch:add-unit-type` command (mirroring `runProductOutSchema()` :5211) rather than add a migration, guarded by `information_schema.STATISTICS` and failing soft when duplicates already exist.
- Phase E adds a JSON key to `productLedgerData`'s response — an older cached front-end bundle simply ignores it.

---

## 13. Deployment, verification and rollback

**Order (ruling 7 — final):** A + B together → C + D → E (E1 backend ships before or with E2 frontend) → F. Phase G only after separate approval. Within every phase, backend before frontend.

**Per-phase verification (PASS / FAIL / NOT TESTED — no phase is "verified" on the strength of a build alone):**

| Phase | Check |
|---|---|
| A | Approve a write-off → rows written and `is_approved = 1` commit together. Force a failure inside `post()` → `is_approved` stays 0 and no rows exist. Same for removal. |
| B | Approve twice → one post. Two concurrent approvals → one post. Manually tamper a posted quantity → `sync()` throws. |
| C | Bulk-approve a month containing ≥2 write-offs with one forced to fail → the others post, the failure is reported, no voucher is left half-approved. |
| D | A user with `voucher.approval` but without `product.out.approve` is refused on a batch containing a write-off, and unrefused on one containing none. |
| E | Product Stock `balance`, Closing Stock, Godown Stock and Product In Out closing stock agree for one product after a write-off; a pending slip shows no Product Out row; a pre-range write-off appears in Opening only; the column foots; screen and printed Running Stock match page by page. |
| F | A warehouse-less write-off appears in the "No Warehouse / Unassigned" bucket and branch totals are unchanged. |
| G | Not applicable — design only. |

**Rollback:** phases A–F are code-only and behaviour-preserving for other documents. Reverting the commit restores the previous behaviour; reverting E2 restores the previous report (the extra JSON key is ignored); dropping the B3 index is one statement. No data rollback is required because nothing in A–F writes history. **The single supported recovery path for a bad posting remains: remove approval → `unpost()` clears every master for the voucher → re-approve re-posts from the layers standing at that moment.**

---

## 14. Regression testing requirements

**Posting lifecycle:** save → nothing; pending → nothing; approve → one master + one detail per FIFO layer, `stock_out` = typed qty, non-zero `purchase_price`; approve twice → no second post; remove → rows gone; remove twice → no-op; reject/clear still refused for vouchers.

**Cross-document regression (must still be exactly one master per voucher):** Warehouse Transfer issue / receive / edit, Material Issue, Trading Sales, Trading Combined (both legs), Manufacturing in/out, Delivery, Purchase, Item opening-stock import, cylinder purchase/sale.

**Reporting:** Product In Out multi-page print pagination unchanged; Sales Ledger and Purchase Ledger designer output byte-identical; Product Stock, Closing Stock, Stock Details unchanged for products with no write-offs.

**Existing harnesses to re-run:** `tiles_return_check.php`, `tiles_sales_manual_fields_check.php`, `product_measurement_precision_check.php` (backend); `_stock_details_group_summary_check.ts`, `_product_out_default_reason_check.ts` (frontend).

---

## 15. Dependencies, risks and priorities

| Phase | Priority | Depends on | Principal risk |
|---|---|---|---|
| A | P0 | — | An approval that previously "succeeded" silently now fails loudly; operators must be told. Per-voucher transactions keep locks short. |
| B | P0 | — | The lock lengthens the critical section per voucher; B2 turns any quantity mismatch into a hard failure (intended, but needs an operator-facing message). |
| C | P1 | A (same shape) | A large sweep now performs many small transactions; the failure report must be surfaced in the UI, not just the payload. |
| D | P1 | C for the bulk path | Over-gating could lock out legitimate administrators — mitigate by requiring only `product.out.approve` **in addition** to the existing key, and only when a write-off is actually in the set. |
| E1/E2 | P1 | — | Footer/column arithmetic (9 → 10) and the print grid; cached old bundles ignore the new key. |
| F | P2 | — | Widens an existing report's output for every NULL-godown row, not only write-offs. |
| G | P3 | separate design approval | Changes the value of future Material Issue / Warehouse Transfer / Product Out postings. No work authorised. |
| Historical | — | A–C deployed, plus your per-category ruling | Any repair must be deliberate, per tenant, and documented. |

**Cross-cutting risk:** none of A–F can be proven end-to-end without the read-only verification that ruling 6 has (correctly) withheld. Until the check in §16.2 (TB1) is authorised, D1/D2/D3 remain defects *capable* of having produced unposted or duplicated movements in your data — not proven to have done so.

---

## 16. Decisions and remaining blockers

### 16.1 Resolved — incorporated, no longer open

All seven rulings are applied in this document. None of them remains a question:

| Ruling | Where it now lives |
|---|---|
| Per-voucher atomic transactions with explicit success / skipped / failed | §3 (Approval Center), §5 (bulk sweep) |
| Throw and roll back on a quantity mismatch; no automatic repair | §4 B2 |
| Optional `product_out_master` index omitted | §4 B3, §12 |
| Label "No Warehouse / Unassigned" | §8 |
| Phase G design-only | §9 |
| No database access | §16.2 (TB1) |
| Sequence A + B → C + D → E → F; G separate | §13 |

### 16.2 Remaining technical blockers

These are the only open matters. **TB3 and TB4 are implementation details inside already-approved phases; TB1, TB2 and TB5 gate work that has not been authorised.**

| # | Blocker | Impact | Unblocked by |
|---|---|---|---|
| TB1 | **No read-only database access** (ruling 6). D1/D2/D3 remain defects *capable* of having produced unposted or duplicated movements — not proven, and the affected vouchers are unknown. | Phases A–F can be built and unit-verified, but the *extent* of any historical problem — and therefore whether a repair is needed at all — cannot be quantified. | Explicit authorisation of a read-only connection, or running the Appendix queries yourself. |
| TB2 | **The reconciliation report does not yet exist, and its categories are not yet ruled on.** Ruling D forbids automatic re-approve or unpost, so no record may be corrected before the classification is produced and each category decided. | Phases A–C can still ship; historical correction cannot start. | Producing the classification (§10) from the Appendix queries, then your per-category decision. |
| TB3 | **The Approval Center UI does not render the new `failed[]` list.** The API will return success / skipped / failed, but the screen has no place to show a partially failed batch. | Without this, a partial batch still *looks* like a clean success to the operator — the exact failure mode Phase A exists to remove. | A small front-end addition scoped inside Phase A (Approval Center screen). |
| TB4 | **No dedicated exception type or error code for a quantity-mismatch refusal.** Throwing is correct, but callers currently surface the raw `$e->getMessage()`. | The operator would be shown a database-level string rather than a sentence. | Deciding in Phase B whether to introduce a typed exception or reuse an existing refusal shape. |
| TB5 | **Phase G's impact review is outstanding** (Material Issue, Warehouse Transfer, historical valuation, closing-stock agreement). | Future postings stay priced at post-time layers; D8 remains open by design. | Its own impact review and separate approval. |

---

## Appendix — read-only detection queries

**A. Approved but never posted (D1/D3)**
```sql
SELECT pom.id, pom.out_no, mtm.id AS main_trx_id, mtm.vr_no, pom.out_date,
       mtm.is_approved, mtm.status,
       (SELECT COUNT(*) FROM inventory_masters im WHERE im.main_trx_id = mtm.id) AS inv_masters
FROM product_out_master pom
JOIN main_trx_master mtm ON mtm.id = pom.main_trx_id
WHERE mtm.transaction_type = 17 AND mtm.status = 1 AND mtm.is_approved = 1
  AND NOT EXISTS (SELECT 1 FROM inventory_masters im WHERE im.main_trx_id = mtm.id);
```

**B. Posted but not (or no longer) approved (D2)**
```sql
SELECT pom.id, pom.out_no, mtm.id AS main_trx_id, mtm.vr_no, mtm.is_approved, mtm.status,
       (SELECT COUNT(*) FROM inventory_masters im WHERE im.main_trx_id = mtm.id) AS inv_masters
FROM product_out_master pom
JOIN main_trx_master mtm ON mtm.id = pom.main_trx_id
WHERE mtm.transaction_type = 17
  AND EXISTS (SELECT 1 FROM inventory_masters im WHERE im.main_trx_id = mtm.id)
  AND NOT (mtm.is_approved = 1 AND mtm.status = 1);
```

**C. Partial / short post — typed vs posted per product (D4/D7)**
```sql
SELECT pom.id, pom.out_no, d.product_id,
       SUM(d.quantity) AS typed_qty,
       COALESCE((SELECT SUM(x.stock_out) FROM inventory_details x
                 JOIN inventory_masters im2 ON im2.id = x.inv_mstr_id
                 WHERE im2.main_trx_id = mtm.id AND x.product_id = d.product_id), 0) AS posted_qty
FROM product_out_master pom
JOIN main_trx_master mtm ON mtm.id = pom.main_trx_id
JOIN product_out_details d ON d.out_mstr_id = pom.id AND d.status = 1
WHERE mtm.transaction_type = 17 AND mtm.status = 1 AND mtm.is_approved = 1
GROUP BY pom.id, pom.out_no, mtm.id, d.product_id
HAVING typed_qty <> posted_qty;
```

**D. Duplicate masters (D5/D6)** — Product Out first, then globally by voucher type
```sql
SELECT im.main_trx_id, COUNT(*) AS masters, GROUP_CONCAT(im.id) AS master_ids
FROM inventory_masters im JOIN main_trx_master mtm ON mtm.id = im.main_trx_id
WHERE mtm.transaction_type = 17 GROUP BY im.main_trx_id HAVING COUNT(*) > 1;

SELECT mtm.transaction_type, COUNT(*) AS vouchers_with_multi_master
FROM (SELECT main_trx_id FROM inventory_masters GROUP BY main_trx_id HAVING COUNT(*) > 1) d
JOIN main_trx_master mtm ON mtm.id = d.main_trx_id
GROUP BY mtm.transaction_type;
```

**E. Wrong product mapping (D10)**
```sql
SELECT pom.id, pom.out_no, d.product_id AS typed_product, x.product_id AS posted_product
FROM product_out_master pom
JOIN main_trx_master mtm ON mtm.id = pom.main_trx_id
JOIN product_out_details d ON d.out_mstr_id = pom.id AND d.status = 1
JOIN inventory_masters im ON im.main_trx_id = mtm.id
JOIN inventory_details x ON x.inv_mstr_id = im.id
WHERE mtm.transaction_type = 17 AND d.product_id <> x.product_id
GROUP BY pom.id, pom.out_no, d.product_id, x.product_id;
```

**F. Wrong branch / godown mapping (D9/D10)**
```sql
SELECT pom.id, pom.out_no, pom.branch_id AS slip_branch, mtm.branch_id AS voucher_branch
FROM product_out_master pom JOIN main_trx_master mtm ON mtm.id = pom.main_trx_id
WHERE mtm.transaction_type = 17 AND pom.branch_id <> mtm.branch_id;

SELECT pom.id, pom.out_no, x.branch_id AS stock_branch, mtm.branch_id AS voucher_branch
FROM product_out_master pom
JOIN main_trx_master mtm ON mtm.id = pom.main_trx_id
JOIN inventory_masters im ON im.main_trx_id = mtm.id
JOIN inventory_details x ON x.inv_mstr_id = im.id
WHERE mtm.transaction_type = 17 AND x.branch_id <> mtm.branch_id;

SELECT pom.id, pom.out_no, pom.from_warehouse_id
FROM product_out_master pom
WHERE pom.status = 1 AND pom.from_warehouse_id IS NULL;
```

---

*Draft — Pending Review. This document records verified current behaviour and a proposed solution. It authorises nothing: no application code, schema, configuration, data or version control has been changed, and no repair command has been run.*
