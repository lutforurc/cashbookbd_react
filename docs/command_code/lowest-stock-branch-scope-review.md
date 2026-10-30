# Lowest Stock card — branch-scoping review (Electronics Business dashboard)

**Scope.** Electronics Business dashboard → **Lowest Stock / Reorder Now** card.
Frontend `src/components/modules/dashboard/LowStockCard.tsx`, rendered by
`ComputerAccessories.tsx`, fed by `getDashboardSummary(branchId)`
(`API_DASHBOARD_SUMMARY_URL = /dashboard/summary`) →
`App\Http\Controllers\Dashboard\DashboardController::summary()` →
`App\Services\Dashboard\DashboardSummaryService::lowStock()`.

**Reported.** The selected branch "has never received KONKA-KK-889DH and has no
inventory transactions for it", yet the card shows **KONKA-KK-889DH — −2**.

Environment: local dev backend `www/cashbook_api` against database `sinthiadb`
(`cashbook_api/.env`), dashboard as-at `2026-10-30` (the branch's own day-close
date from `admin_day_closes`, read by `getDbTrDate()`).

---

## 1. Root cause

Two independent things; only one is a defect.

### 1a. The −2 is genuine branch data — not cross-branch leakage (verified)

`lowStock()` pins **both** `d.branch_id` and `m.branch_id` to the selected
branch *before* summing, and pins `p.branch_id` on the catalogue:

```php
->where('d.branch_id', $branchId)   // movement's branch
->where('m.branch_id', $branchId)   // voucher's branch
->where('p.branch_id', $branchId)   // product's branch
```

Probed directly through the service (`build(company, branch, '2026-10-30')`) and
through the real controller with an authenticated user:

| branch | Lowest Stock items |
|---|---|
| 1 — Sinthia Electronics | `CONION-SIGMA −12`, `CONION-ALPHA −8`, `KONKA-KRCSF-60KB100 −6`, `RANGS-RBR-235DOA −4`, `DHA-SOLAR PANEL −3` — **KONKA-KK-889DH absent** |
| 2 — Exclusive Branch | `KONKA-KK-889DH −2` — **present** |

Product `KONKA-KK-889DH` = `product_items.id 1252`, `company_id 1`,
**`branch_id 2`**, `openingbalance 0`, `order_level 0`. So it lives in branch 2's
own catalogue, and it is branch 2's card (the demo user `lutforurc@gmail.com`,
`users.branch_id 2`) that shows the row.

Its records (all read-only queries; nothing created, edited or deleted):

| inventory_details.id | branch | stock_in | stock_out | voucher (main_trx_master.id) | type | status | vr_date |
|---|---|---|---|---|---|---|---|
| 19905 | 2 | 4 | 0 | 31816 | 5 Journal Voucher | **0 (cancelled)** | 2026-10-26 |
| 19906 | 2 | 0 | 2 | 31817 | 4 Purchase (return) | **1 (live)** | 2026-10-26 |
| 19946 | 1 | 4 | 0 | 31851 | 5 Journal Voucher | 1 (live) | 2026-10-29 |

- Branch 2: the only receipt (`19905`) is a **cancelled** journal voucher, so it
  does not count; the live purchase-return line `19906` takes 2 out →
  **0 − 2 = −2**. The −2 is the branch's real, current stock.
- Branch 1: the receipt `19946` (+4) belongs to branch 1 and is correctly kept
  off branch 2's figure (and vice-versa). Branch 1's own card reads **+4**, which
  is why it never appears in branch 1's bottom five.

**No cross-branch leakage exists in the movement aggregation**, and record
`19906` is a valid movement in the reported branch — so `KONKA-KK-889DH` is
**not** a spurious row and has deliberately **not** been excluded, clamped, or
otherwise hidden.

### 1b. The genuine defect — a product that only *exists* is listed (fixed)

The fallback (`mode: lowest`) listed **every** product in the branch's
catalogue, treating a missing movement as stock `0`:

```php
: $rows;   // all products, whatever they hold
```

So on a branch with fewer than five real low/negative lines, the card filled up
with catalogue-only products at `0` — products created on the branch, never
received, never issued, with no opening. On `sinthiadb` branch 1 that is
**1258** catalogue-only rows (e.g. `249 LED TV`, `260 PHILIPS`, `274 MIYAKO-IRON`)
that were standing at `0` and are genuinely not stock. The reported branch is a
branch whose catalogue is not backed by activity — exactly this class of row,
with a real movement behind it (1a).

---

## 2. Affected files / functions

| File | Function | Change |
|---|---|---|
| `www/cashbook_api/app/Services/Dashboard/DashboardSummaryService.php` | `lowStock()` | catalogue-only exclusion added; branch-before-sum documented/enforced; threshold mode preserved |

No frontend change: `ComputerAccessories.tsx` already re-reads
`getDashboardSummary(branchId)` whenever `viewBranchId` changes (effect dep
`branchId`), and `SwitchBranch.tsx` finishes with a full reload — the card does
refresh on a branch change. `LowStockCard.tsx` styling/logic untouched.

---

## 3. The fix

```php
// marker: does this branch actually hold the product?
DB::raw('(COALESCE(p.openingbalance, 0) <> 0 OR s.product_id IS NOT NULL) as held'),
...
$items = $mode === 'order_level'
    ? $withLevel->filter(fn($r) => (float) $r->stock <= (float) $r->order_level)   // unchanged
    : $rows->filter(fn($r) => (bool) $r->held);                                     // only real stock
```

- Branch filter stays **before** the aggregation (`d.branch_id` + `m.branch_id`),
  so one branch's stock can never enter another's figure (requirement 1, 2).
- A product is listed only when **this branch opened with it or something moved
  here** — merely existing in the catalogue is not enough (requirement 3).
- Stock is left as `SUM(stock_in) − SUM(stock_out)`: **opening is already a
  movement** (`ItemController::saveProductOpening()` posts the opening through
  `apiInventoryMaster()` *and* sets `product_items.openingbalance`), so adding
  `openingbalance` on top would double-count it.
- Zero and negative stock are **kept** — the figure is never clamped
  (requirement 4). `KONKA-KK-889DH −2` on branch 2 is retained.
- Thresholds, sorting and limit unchanged (requirement 5): `order_level` mode
  still lists `stock <= order_level`, and a configured reorder level still shows
  before the line has ever moved.

---

## 4. Impact

- Frontend, API routes, database schema, permissions and the Stock-on-Hand /
  Dead-stock cards: untouched.
- Only `KONKA-KK-889DH`'s branch-2 row is unaffected by design (it has a real
  movement); the change removes rows that have **no** branch activity.
- `www/cashbook_review` carries an identical copy of `lowStock()`; the same
  change must ride along there when that backend is deployed, or the two will
  diverge on a fresh branch's lowest-stock list.

## 5. Verification (read-only)

- `php -l` — no syntax errors.
- `DashboardSummaryService::build(1, branch, '2026-10-30')`: branch 2 → `−2`
  as before; branch 1 → unchanged five negative lines, no KONKA.
- As-of a date **before any movement** (2020-01-01): both branches now return
  **0 items** instead of 1258 / 1 catalogue rows at `0`.
- Catalogue-only rows confirmed present on branch 1 by SQL (`s.product_id IS
  NULL AND openingbalance = 0`), and absent from the fixed list.
- No record was created, edited or deleted; all checks were `SELECT` / service
  calls against the live local database.
