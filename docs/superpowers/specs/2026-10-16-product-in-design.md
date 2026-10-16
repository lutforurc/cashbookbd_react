# Product In — stock added outside a purchase (Design)

**Status:** **BUILT and verified on the dev database, 2026-10-16.** This document
was the design; it is now also the record of what was built, with the two
corrections the build forced kept visible in place (§10.1, §11) rather than
quietly edited away. **Nothing has been committed or pushed.** See §18 for what
was actually run and what it proved.
**Repos:** `cashbook_api` at `F:\All_Database\www\cashbook_api`,
`cashbookbd_react` at `F:\All_Database\cashbookbd_react`.
**Mirrors:** the Product Out feature as built and pushed (2026-09-24, 2026-10-15)
and `docs/superpowers/specs/2026-10-15-product-out-approval-posting-and-report-design.md`.

> ⚠️ **NAME COLLISION.** The 2026-10-15 spec's title reads "Product In Out
> Report". That is a *stock-in-and-out ledger report* — a different thing
> entirely. This document is about a **Product In document**, the mirror of the
> Product Out write-off slip. Do not merge the two.

**How to read this:** *Verified* = read in the code, with file/line citations.
*Proposed* = agreed design, not yet built. *My call* = a decision a sensible
builder could settle alone; the owner may override any of them (§14).

---

## 0. Owner decisions — FINAL

All five were settled by the owner on 2026-10-16 and are incorporated
throughout. Nothing here is open.

| # | Decision | Final ruling |
|---|---|---|
| 1 | Where the rate comes from | The product's **last purchase rate**, resolved by the server. The clerk does not decide it. |
| 2 | The rate box on the form | **Shown on every line, always.** Read-only when the books hold a rate; empty and editable only when they hold none. |
| 3 | If the clerk edits it anyway | **The server's rate is taken regardless.** The server re-resolves at save and never trusts the figure the form displayed. |
| 4 | When the books hold no rate | The clerk may type one. The server looks in the books **first**; only if it still finds nothing does the clerk's figure stand. Nothing typed → **৳0**. |
| 5 | Everything else | **Exactly like Product Out** — same layout, lifecycle, registers and mirroring permissions, at the owner's instruction: *"অবিকল এটার মত করেই"*. Two new tables, beside the shared reason table (decision 6). |
| 6 | The reasons table | **One table for both documents.** Product Out's and Product In's reasons live in a single `product_reasons` table carrying a `direction` column. Each screen and each endpoint sees only its own direction (§8). |
| 7 | Where the changes ship | **Every schema and permission change goes into `AddUnitTypeToBuildingUnits`**, so an installation runs one command and is done. The standalone SQL file is a fallback, not the deployment path (§9.5). |

**Settled by default, not contradicted (§14):** slip prefix `ADD-`; approval by
the Owner role only; stock moves at save; **two reason screens over the one
shared table** — an *Out Reasons* and an *In Reasons*, each showing only its own
direction.

---

## 1. What Product In is for

Stock that arrived outside a purchase. Today there is nowhere to write it down,
so the shelf holds goods the book does not and the closing stock is understated.

The real events, from the sample seed (§8):

* a stock count found goods the book had already written off;
* a customer brought something back that was never on a sale;
* a mason returned what was left of the goods issued to a job;
* a supplier sent bonus / free goods with an order;
* a transfer arrived with more than the issue sent;
* a sample came back;
* a repair made something usable again.

## 2. The mirror — what is identical, and what is not

| | Product Out | Product In |
|---|---|---|
| Direction | leaves the shelf | joins the shelf |
| Tables | `product_out_master` / `_details` | `product_in_master` / `_details` |
| Reasons | **one shared `product_reasons` table** (`direction = 'out'`) | **the same table** (`direction = 'in'`) — §7 |
| Voucher | `transaction_type` 26, prefix `26-` | `transaction_type` **25**, prefix `25-` |
| Slip number | `DMG-2026-10-00001` | `ADD-2026-10-00001` *(my call)* |
| Slip title | Damage / Loss Slip | Stock In Slip *(my call)* |
| Date | branch's open transaction date, no Date field | identical |
| Stock moves | **at save** (owner, 2026-10-15) | **at save** — mirrors |
| Approval | sign-off only, Approval Center's own endpoint | identical |
| GL entry | **none** (§10) | **none** |
| Line holds | `quantity` | `quantity` **and `rate`** — see §10.1 for why the mirror does not hold here |
| Register | Write-off Register | Stock In Register |
| Register reads | the stock ledger, rolled up | **its own lines** — no join, no roll-up (§11) |
| Print money column | hidden while pending | **shown always** (§12) |
| Permissions | `product.out.*` | `product.in.*` |
| **Rate** | read off the FIFO ledger | **read off the product's last purchase** |

Only the last row is new logic. The rest is a rename.

---

## 3. The rate — the whole of the new logic

### 3.1 Where the server reads it *(Verified)*

A purchase writes `stock_in` and `purchase_price` together —
`PurchaseController::inventoryDetails()` :361-363, `'purchase_price' => $r['price']`.
The last purchase rate is therefore a lookup, not a new column:

```sql
SELECT ids.purchase_price
  FROM inventory_details ids
  JOIN inventory_masters ims ON ims.id = ids.inv_mstr_id
  JOIN main_trx_master  mtm ON mtm.id = ims.main_trx_id
 WHERE ids.product_id      = ?
   AND ids.stock_in        > 0
   AND ids.purchase_price  > 0
   AND mtm.status          = 1
   AND mtm.company_id      = ?                              -- §3.4
   AND NOT EXISTS (SELECT 1 FROM product_in_master pim
                    WHERE pim.main_trx_id = mtm.id)         -- §3.2
 ORDER BY ids.id DESC
 LIMIT 1
```

**Fallbacks, in order:**

1. the query above — the product's last purchase rate;
2. `product_items.purchase_price` — the catalogue figure;
3. nothing → control passes to the clerk (§5).

### 3.2 ⚠️ The `NOT EXISTS` is load-bearing

A Product In's own receipt is a `stock_in` row **with a price on it**. Without
this clause the *second* Product In on a product would read the *first* one's
rate and treat it as a purchase rate — and worse, that rate would then be
read-only, so the box could never be corrected again. A product that has only
ever been Product-In'd must keep offering the box.

### 3.3 ⚠️ `purchase_price`, never `sales_price`

Product Out's *out* rows carry their price in `sales_price` (owner, 2026-10-16 —
"an out row looks like a sale's"). The **in** row must not copy that:
`StockCostLayers::receiptRows()` reads only `stock_in > 0` rows' **`purchase_price`**
(:112-125). An in row priced into `sales_price` would join the shelf at ৳0 —
invisible to FIFO, to closing stock and to every report, with the quantity
correctly moved and the money silently gone.

### 3.4 Source scope *(my call)*

Read **company-wide**, not per branch. The owner's rule names no branch, and a
second branch that has never bought the product would otherwise ask the clerk
every time. The alternative — branch-scoped, the way the stock ledger is — is a
one-word change (`AND mtm.branch_id = ?`).

### 3.5 ⚠️ Blank and explicit zero are different answers

`ConvertEmptyStringsToNull` (`app/Http/Middleware`) turns an empty box into
`null`. So an empty box means *the clerk did not answer* and falls through to
৳0 only after the server has looked; a written `0` means *the clerk says zero*
and stands as it is. The same trap is documented on `applyTilesManualFields()`
(`helpers.php` :951-957). Either way the save is **not refused** — the values
are the same, only the route to them differs.

---

## 4. Posting — and why `postTransferStock()` cannot be reused

`InventoryTransferMaster::postTransferStock($mtmId, $branchId, $warehouseId,
$rows, 'in', $ctx)` looks like the right tool. It is not: its `in` branch calls
`StockCostLayers::forReceive()`, which copies the cost from an **issue voucher**
(`$context['issue_main_trx_id']`). Called with no issue it returns
`[['qty' => $qty, 'price' => 0.0]]` (:86-90) and would post **every** Product In
at ৳0. Extending it with a third mode would put a flag in a function two other
documents already depend on.

`ProductInPosting` is therefore the mirror of `ProductOutPosting` — same state
model, same idempotence — with its own fifteen-line poster:
**voucher `status` only**, never `is_approved`; `sync()`, `syncMany()`,
`isPosted()`, `includesProductIn()`, `unpost()`.

```
post($mainTrxId):
  one inventory_masters row   (main_trx_id = $mainTrxId)
  one inventory_details row per line:
      branch_id      = the slip's branch
      godown_id      = to_warehouse_id
      stock_in       = quantity
      stock_out      = 0
      purchase_price = the resolved rate        ⚠️ §3.3
      sales_price    = 0
```

One `inventory_details` row per line, **not** one per FIFO cost layer: we decide
the price, so there is nothing to walk. `ProductOutPosting` splits by layer
because FIFO chooses; here it does not.

### 4.1 What "the server re-resolves" means, per line, at save

```php
// the figure the form displayed is NOT an input; only a box the server
// left empty can carry the clerk's answer
$rate = $bookRate($companyId, $pid)          // §3.1 step 1
     ?? $masterPrice($pid)                   // §3.1 step 2
     ?? $clerkRate[$pid]                     // §5 — only ever sent where the books are silent
     ?? 0;
```

⚠️ **The order is the owner's ruling (#3), not a preference.** `$clerkRate` is
consulted last on purpose: a rate that exists on the books can never be
overridden from this screen, however the request was constructed.

---

## 5. The rate box on the form

The form learns each product's rate as soon as the product is picked, from a
small lookup (§9). The box then behaves by decision #2:

| Books hold a rate | Box |
|---|---|
| yes | filled with the server's figure, **read-only**, faintly labelled *last purchase rate* |
| no | **empty and editable**; the clerk may type one, and it is sent |

**Why read-only and not merely ignored:** if the box were editable and then
disregarded, a clerk who typed ৳300 would watch the form show ৳300 and the
system save ৳250 without ever saying so. A greyed box tells the truth; an
editable one that lies is worse than no box at all.

**What the server sends back when nothing is found:** nothing. There is no
refusal, no confirmation, and no second click — the owner's ruling is that an
unanswered box simply saves at ৳0. The form does **not** block a blank box.

**Where the clerk's figure is validated:** numeric, non-negative, two decimals.
Anything else is a validation failure on that line, not a silent ৳0.

---

## 6. ⚠️ What ৳0 actually costs — read before signing off

A line at ৳0 joins the shelf **with quantity and no value**. Closing stock does
not move, but `StockCostLayers` now holds a cost layer at price 0 for those
units.

The real damage lands later: when those units are **sold**, FIFO prices them at
৳0, so that sale shows as pure profit. 100 bags received at ৳0 and sold at
৳2,000 book ৳200,000 of profit that was never earned, and the sale's own paper
will not reconcile.

Product Out has no such hole — there FIFO decides the figure and nobody can
name it.

The owner has accepted this (decisions #4 and #5). The design's answer is to
make it **visible, never silent**:

* the items table on the entry form carries **Rate** and **Value** columns, so a
  ৳0 line is on screen *before* Save is pressed;
* the register and the print show rate and value on every row;
* the print shows them **while the slip is still pending** — Product Out hides
  its cost column until approval (:133, :147), and that must not carry over
  here, because the rate is the one thing this document exists to establish.

No ৳0 warning, no confirmation dialog, no block — the owner's ruling is that a
shop may mean it.

---

## 7. Tables

`product_in_master` — `id`, `company_id`, `branch_id`, `main_trx_id`, `in_no`,
`in_date`, `to_warehouse_id`, `reason_id`, `party_id`, `note`, `status`,
`created_by`, `update_by`, `created_at`, `updated_at`.
Same keys as `product_out_master`: `(company_id, branch_id, status)`,
`main_trx_id`, `reason_id`, `in_date`.

`product_in_details` — `id`, `in_mstr_id`, `product_id`,
`quantity decimal(18,3)`, **`rate decimal(18,2)`**, `note`, `status`.
⚠️ The rate column was not in the first draft of this document; §10.1 explains
why it turned out to be required, and it is a correction rather than a change of
mind.

`product_reasons` — **shared by both documents** (owner, 2026-10-16):
`id`, `company_id`, `direction enum('out','in')`, `name`, `needs_party`, `sort`,
`is_active`, `created_by`, `created_at`, `updated_at`,
`UNIQUE (company_id, direction, name)`, `KEY (company_id, direction, is_active, sort)`.

The shop keeps **one vocabulary**, and the pair that would otherwise drift apart
sits side by side: *ট্রান্সফারে ভাঙা* (`out`) beside *ট্রান্সফারে বেশি এসেছে*
(`in`), *দোকানের নিজের ব্যবহার* beside *দোকানের নিজের ব্যবহার করা মাল ফেরত*.

### 7.1 ⚠️ The migration, and why the ids must not move

`product_out_reasons` is **live** — it holds rows on `krishibitandatabase` and
`rmrmultidb`, and some of those rows are referenced by real slips through
`product_out_master.reason_id`. The copy therefore **carries the primary keys
across**; a fresh auto-increment would renumber the reasons and leave every old
slip with a blank where its only explanation used to be.

```sql
INSERT IGNORE INTO product_reasons
        (id, company_id, direction, name, needs_party, sort, is_active,
         created_by, created_at, updated_at)
SELECT   id, company_id, 'out',     name, needs_party, sort, is_active,
         created_by, created_at, updated_at
  FROM   product_out_reasons;
```

The Product In seed follows, at `direction = 'in'` and **without** explicit ids,
so it can never collide with a copied one.

`product_out_reasons` is then **left in place, unread**. Not dropped: it is the
only copy of the reasons if the copy is ever in doubt, and dropping it buys
nothing. A later cleanup can retire it once a release has passed without it.

⚠️ **`ProductOutReason::$table` changes to `product_reasons`**, and the five
places `ProductOutController` touches reasons (:93-97, :706, :734, :776, :787,
:824, :833) each gain `where('direction', 'out')`. Miss one and the Product Out
form starts offering Product In's reasons.

⚠️ **Per database.** Every tenant has its own schema; the file runs against each
one. `CREATE TABLE IF NOT EXISTS` + `INSERT IGNORE` keep it re-runnable — which
matters here twice over, since a re-run must not duplicate a copied reason or
re-seed a renamed one.

## 8. Reasons and party

* **One table, two directions** (§7). A reason belongs to a direction and is
  only ever offered on that side.
* Choosing a reason now answers to **three** conditions, not two — the caller's
  company, `is_active = 1`, **and the caller's own direction**. Without the third
  a Product In slip could be saved against *ভেঙে গেছে*, and the register would
  print a write-off's reason on a receipt.
* A `needs_party` switch **on each reason**, read off the row rather than from a
  list in the controller — so a reason the shop adds later behaves with no code
  change (mirrors `ProductOutController::apiStore()` :106-108).
* `party_id` → `cust_party_infos.id`, same as Product Out's.
* Retiring a reason already on a voucher **deactivates, never deletes**
  (:816-847). It is the only word on the slip saying where the goods came from.
* Seed driven off `com_companies`, not a hard-coded company 1 — most tenants hold
  one company, `myappsaasdatabase` holds seven. The Product Out seed already
  exists in `2026_09_25_product_out.sql` and is not re-run; only the `in` rows
  are new here.

**Sample seed — `direction = 'in'`** (the real shop edits it in its own master
screen; this list is a starting point, not a specification):

| name | needs_party | sort |
|---|---|---|
| গুদামে হিসাব করে পাওয়া গেছে | 0 | 1 |
| কাস্টমার ফেরত দিয়েছে | 1 | 2 |
| ঠিকাদার কাজ শেষে ফেরত দিয়েছে | 1 | 3 |
| সাপ্লায়ারের বোনাস / ফ্রি মাল | 1 | 4 |
| ট্রান্সফারে বেশি এসেছে | 0 | 5 |
| ভুলে বেশি পাঠানো হয়েছে | 1 | 6 |
| মেরামতের পর আবার ব্যবহারযোগ্য | 0 | 7 |
| নমুনা ফেরত এসেছে | 1 | 8 |
| পুরনো হিসাব সমন্বয় | 0 | 9 |
| দোকানের নিজের ব্যবহার করা মাল ফেরত | 0 | 10 |

## 9. Voucher, routes, screens, permissions

### 9.1 Voucher

* `transaction_type` **25** and prefix **25** — the same number both ways, as
  Product Out uses 26/26. The prefix is what the paper shows.
* Opened with `apiMainTransactionMaster(25, 25)`. The date comes back off the
  voucher and the slip's `in_date` is read from it, so the two can never
  disagree. **No Date field on the form.**
* ✅ **`acc_vr_type` is already covered — nothing to add.** Verified:
  `runProductInOutVoucherTypes()` (`AddUnitTypeToBuildingUnits` :7805) inserts
  **both** 25 `Product In` and 26 `Product Out`, and it is **always on** — called
  unconditionally at :406, above every flag. It never overwrites and never
  guesses: an id already holding another name, or the name sitting under a
  different id, is reported with `$this->warn()` and left alone (:7814-7826).
  Id 25 is free on every database that has the table today (highest id in use
  elsewhere is 23), so the row goes in cleanly everywhere.
  * The same method also closes the `rmrmultidb` / `aftradingdb` gap noted
  earlier — neither carries a 26 row for Product Out, and both get one the next
  time the patch runs. **No SQL file needs to carry this.**
* `VoucherSerial::open()` itself needs no `acc_vr_type` row — the prefix is only
  a string, and numbering is per branch + month + run. The row matters for
  reporting, not for the number.
* `in_no` = `ADD-YYYY-MM-00001`, zero-padded to five, counted per company +
  branch + month, copied from `ProductOutController::nextOutNo()` :866-880.
  Old rows keep the numbers they were given.

### 9.2 API

`ProductInController`, mirroring `ProductOutController` method for method:
`apiList`, `apiDetails`, `apiReport`, `apiPartyList`, `apiStore`, `apiDestroy`,
and the four reason methods. Routes under `product-in/`, the same seven paths,
`config/route_permissions.php` given the same entries against `product.in.*`.

**The reason methods keep their own endpoint set** even though the table is
shared — `product-in/reason/*` exists, answers to `product.in.reason.manage`,
and every query in it carries `direction = 'in'`. That is what lets a role hold
one document's reason master without the other's, and it is why the shared table
costs the frontend nothing: `ProductInReason.tsx` is `ProductOutReason.tsx` with
the URLs swapped and no other change.

**One route with no Product Out twin:**

```
GET api/product-in/rate/{product_id}   →  { rate: 250.00, source: "last_purchase" | "master" | "none" }
```

`source: "none"` is what makes the box editable (§5). It is the only new
endpoint in the feature, and it answers the one question the form cannot work
out for itself.

### 9.3 Permissions

Four keys, handed to each company's **Owner** role and to nobody else:
`product.in.create`, `product.in.approve`, `product.in.report.view`,
`product.in.reason.manage`. Reading the register keeps its own key, exactly as
Product Out's does, so a manager can be asked what came in without being handed
the pen.

Registered through `patch:add-unit-type` (`AddUnitTypeToBuildingUnits`) beside
the Product Out four, plus a standalone SQL file for a server where the command
cannot run.

⚠️ **Approval is a separate permission from creation.** `denyWriteOffApproval()`
(`ApprovalCenterController` :357-366) gets its twin, and
`ProductInPosting::syncMany($targets)` joins the approve and remove branches
beside `ProductOutPosting::syncMany()` (:297, :334).

### 9.4 React

A `product-in/` module beside `product-out/` — six files: `ProductIn.tsx`,
`ProductInList.tsx`, `ProductInPrintModal.tsx`, `ProductInReason.tsx`,
`ProductInReport.tsx`, `productInSlice.tsx`.

Wiring: ten `API_PRODUCT_IN_*` constants in `services/apiRoutes.tsx`; three
paths in `services/appRoutes.tsx`; three entries in `Sidebar/index.tsx` under
the existing `branch-transfer` group, whose `hasPermission` guard (:1089-1096)
widens to the four `product.in.*` keys — **a menu key missing from
`MENU_PERMISSIONS` hides the link with no error**; the three route ids added to
`Sidebar/menuRoutes.ts`; three `RequirePermission` wrappers in `App.tsx` beside
:958-966; `productInSlice` registered in `store.tsx` (:192).

The form is `ProductOut.tsx` with the labels changed, plus the rate box (§5) and
the **Rate + Value columns in the items table**.

### 9.5 ⚠️ All of it lives in `AddUnitTypeToBuildingUnits` (owner, 2026-10-16)

**Every schema and permission change this feature needs goes into the patch
command**, not into a file an operator has to remember to run. That is the house
route — `php artisan patch:add-unit-type` is what each installation already runs
— and it is the owner's explicit instruction. The standalone SQL file becomes a
fallback for a server where the command cannot run, and is not the primary path.

What that means in the command, exactly:

| Where | Change | Status |
|---|---|---|
| `runProductInOutVoucherTypes()`, called at :406 | `acc_vr_type` 25 `Product In` + 26 `Product Out` | ✅ **already ships**, always-on |
| `syncPermissions()` :2112 | four `product.in.*` rows, group `Product In` | ➕ add beside the Product Out four at :2530-2533 |
| `grantProductOutPermissions()` :11245, called at :608 | the same grant, widened to cover both key sets | ✏️ loop `['Product Out', 'Product In']` instead of the single string at :11262; rename the method, since its name would otherwise lie |
| `runProductOutSchema()` :5215, called at :704 | **unchanged** — it still creates and seeds `product_out_reasons`, and that table is what the copy reads | ✅ leave alone |
| **new** `runProductInSchema()`, called immediately after :704 | the shared `product_reasons` table, the id-preserving copy (§7.1), the `in` seed, `product_in_master`, `product_in_details` | ➕ new method |

⚠️ **The new call goes after `runProductOutSchema()`, not before.** On a database
that has never seen Product Out the legacy seeder is what puts the ten original
reasons into `product_out_reasons` in the first place; running the copy first
would find an empty table and every shop would come up with no write-off reasons
at all.

The grant stays flag-free and always-on, for the reason its own docblock already
gives (:11230-11239): Product Out is part of the ordinary inventory set, not an
opt-in module, and Product In is its mirror. `--product-out-roles=` keeps
working and now names the roles for both.

## 10. No GL entry — and why the rate is still not stored on the line

The books hold no stock account: closing stock is recomputed from
`inventory_details` on every report, and the P&L reads its value from there.
Adding a "found goods" income head as well would count the same money twice —
once through the larger closing stock, once through the new head in the
net-profit sweep. So the gain is carried by the stock alone, exactly as a
write-off's loss is.

⚠️ **The visible consequence, stated plainly:** ৳50,000 of found stock raises
closing stock by ৳50,000 and so raises profit by ৳50,000, with nothing on the
other side of the entry. That is the exact mirror of a write-off taking profit
down, and it is the owner's design (decision #5).

### 10.1 ⚠️ Correction — the line DOES carry a rate

The first draft of this document argued the rate should live only in
`inventory_details.purchase_price`, mirroring Product Out. **That was wrong, and
the build exposed it.**

Product Out's line can hold no rate because FIFO computes one at post time from
the ledger. Product In's rate cannot be computed later at all:

* the book rate **moves** every time the shop buys, so a second resolve returns a
  different figure than the one the goods actually came in at; and
* a rate the clerk typed exists **nowhere else** — there is no other record of it.

`ProductInPosting::sync()` is idempotent and may run again — from the approval
centre, from a repair command — and on a re-run it re-reads the lines. Without
the column it would re-resolve against a book that had moved on, and quietly
write ৳0 over the money. So the decision is stored where it is taken, and
`inventory_details.purchase_price` is that same number, copied.

The "second opinion" worry does not apply here, because there is no first
opinion to compete with: this figure *is* the decision.

**Consequence for the register and the print:** both read the line, not the
ledger. That is simpler than Product Out's, and it removes the multiplication
trap §11 warns about rather than guarding against it.

## 11. Register

`apiReport` keeps the same shape and the same filters as
`ProductOutController::apiReport()` :498-655, but **reads the lines instead of
the stock ledger**, and that is a deliberate departure rather than an oversight.

⚠️ **The write-off register's two traps do not exist here, and copying its SQL
would introduce a third problem rather than avoid one.** That register has to
reach into `inventory_details` and roll it up per product before joining, because
FIFO writes one row per cost layer and a product listed twice would count its
layers twice. A receipt's rate is on its own line (§10.1), so `quantity * rate`
is the whole answer: no join, no roll-up, and no multiplication to guard against.

Rows: date, in no, voucher no, product, unit, warehouse, quantity, **rate**,
**value**, reason, note. Breakdowns `by_reason` and `by_product` carrying value
instead of cost. Headline = total value added, summed from the same lines.

**One extra figure Product Out has no twin for:** `unpriced` — how many lines
went in at ৳0, over how much quantity, across how many slips (§6). The owner
asked for those lines to be visible rather than silent, and the register is where
they are worth seeing.

### 11.1 The other report — Product In Out (Product Ledger Data)

The owner asked for Product In here too: *"Product In Out এখানেও যোগ করে দেখাতে হবে."*

This is a different screen from §11 — `ReportsController::productLedgerData()`, the
per-product movement ledger, which already carried a **Product Out** column
(shipped 2026-10-16). Product In joins it.

**API.** A sixth UNION branch reading `SUM(id.stock_in)` where a
`product_in_master` row exists — the exact mirror of the Product Out branch, and
found by its slip rather than by `transaction_type` for the same reason. Every
branch gains `0 as product_in`, and ⚠️ **a UNION lines columns up by position**,
so `product_out` and `product_in` are last, in that order, in all six.

**Frontend.** A `Product In` column before `Product Out` — the ledger already
reads in-then-out (Purchase, Sales Return, Sales, Purchase Return, Product Out),
so the addition joins the "in" group rather than being tacked on the end.
Running stock **adds** it, beside purchase and sales return. `ProductLedgerDataPrint.tsx`
takes the column too, and its `colSpan` for the empty state and its footer total
move from 10 to 11.

⚠️ The display order and the SQL order differ on purpose: the UNION appends
`product_in` last to keep `product_out`'s position stable, while the screen shows
it before `product_out`. Neither constrains the other.

### 11.2 ⚠️ Printing a voucher from the ledger — the switch that did not know 25 or 26

The owner found this: on the Product In Out ledger, clicking the number in the
**Invoice No.** column did nothing for `26-261000005` or `25-261000001`.

**The cause was not in this feature.** `VoucherPrintRegistry` decides what paper
to print by the prefix of `vr_no`, and its switch knew `1, 2, 3, 10, 4, 9, 13,
12` — **not `25` and not `26`**. So a write-off's row was clickable in the ledger
and the click answered *"Unknown voucher type: 26"*. That has been true since
Product Out shipped on 2026-09-24; nobody had clicked one from the ledger until
now. It is the same mistake the sales case in that file already records for
prefix `10`, made a second time.

**Two things were needed.**

1. **A way to name a slip by its voucher.** A ledger row carries
   `main_trx_master.id` and nothing else — it is a ledger *of vouchers*. Both
   `apiDetails` endpoints now take `?by=trx`, which answers by
   `main_trx_id` instead of by the slip's own id. Every existing caller still
   passes the slip id and is unaffected.

2. **One paper, two doors.** The slip layouts were locked inside
   `ProductOutPrintModal` and `ProductInPrintModal`, which are dialogs — fixed
   overlays with a toolbar, opened by their own screens. They were extracted into
   `ProductOutSlipPrint.tsx` / `ProductInSlipPrint.tsx` (plain `forwardRef`
   components taking `{ master, details }`), which the dialogs now render and the
   registry now holds hidden. A second copy of the layout would have been a
   second place to fix the next time a slip changes.

⚠️ **The registry's other branches go through `electronicsSalesPrint`, and these
two must not.** That call answers with a sale's or a purchase's shape; on a
write-off or a receipt every one of its relations is null. So case `25`/`26`
fetches its own details into local state and prints from there — the note on
`printStockSlip()` says so.

## 12. Print

`ProductInPrintModal`, mirroring `ProductOutPrintModal.tsx` — self-contained, no
`print_templates` row and no blade view, so nothing has to be seeded per
database. Title **Stock In Slip**; the `Cost` column becomes **Rate** and
**Value**; the "Pending approval" band and the three signatories
(Prepared By / Store In-charge / Authorized By) carry over unchanged.

⚠️ **Rate and Value print on a pending slip too.** Product Out hides its money
column until approval (`ProductOutPrintModal.tsx` :133, :147). Product In must
not: the rate is what the clerk came to the screen to establish, and hiding it
on a pending slip hides the only figure that needed checking.

## 13. Files

**API — new:** `app/Http/Controllers/Inventory/ProductInController.php`,
`app/Services/Inventory/ProductInPosting.php`,
`app/Models/ProductIn/{ProductInMaster,ProductInDetails,ProductInReason}.php`
(the reason model maps the shared `product_reasons`), and
`database/sql/2026_10_16_product_in.sql` — **the fallback only** (§9.5): the same
DDL and the same id-preserving copy, for a server where the command cannot run.
It is not the deployment path and is not expected to be executed by hand.

**API — edited:** `routes/api.php`, `config/route_permissions.php`,
`app/Http/Controllers/ApprovalCenterController.php`,
**`app/Console/Commands/AddUnitTypeToBuildingUnits.php` — the primary home for
every schema and permission change (§9.5)**, and — because of the shared table —
`app/Http/Controllers/Inventory/ProductOutController.php` and
`app/Models/ProductOut/ProductOutReason.php` (§7.1).

No `..._permissions_grant.sql` file: the grant runs from the command, always on
(:608), and a second copy of it would be a second thing to keep in step.

**React — new:** the six module files (§9.4), under `src/components/modules/product-in/`.

**React — edited:** `src/components/services/apiRoutes.tsx`,
`src/components/services/appRoutes.tsx`, `src/App.tsx`, `src/store.tsx`,
`src/components/Sidebar/index.tsx`, `src/components/Sidebar/menuRoutes.ts`.

## 14. My calls — check these while reading

1. Slip prefix `ADD-`; slip title **Stock In Slip**.
2. Stock moves **at save**; approval is a sign-off only — mirrors Product Out
   as it stands today.
3. The rate is read **company-wide**, not per branch (§3.4).
4. The rate box is **read-only rather than editable-and-ignored** where the
   books hold a rate (§5).
5. The print shows rate and value **even while pending** (§12).
6. Checked but left out: no `product-in:resync` repair command. Product Out
   needed one for slips saved under the old approval-moves-stock rule; Product
   In has no such history.
7. The reasons seed in §8.
8. **Two reason screens over the one shared table** — *Out Reasons* and *In
   Reasons* — rather than one screen with a direction column. The existing
   `ProductOutReason.tsx` is then untouched, so a shipped screen cannot break;
   and a clerk can never file a reason under the wrong direction, because the
   screen has no direction to choose. A combined view can be added later as a
   filter on the same table without moving anything.
9. `product_out_reasons` is **left in place and unread**, not dropped (§7.1).

## 15. Deployment, verification and rollback

**Per database** — the feature does nothing on a database that has not had all
four steps:

1. **`php artisan patch:add-unit-type`** — one command, on every database. It
   creates `product_reasons`, **copies `product_out_reasons` into it with ids
   intact**, seeds the `in` rows, creates the two `product_in_*` tables, and
   grants the four `product.in.*` keys to the Owner role. The `acc_vr_type` rows
   for 25 and 26 it already handles (:406). `2026_10_16_product_in.sql` exists
   only for a server where the command cannot be run (§9.5).
   ⚠️ **Do not deploy the API before this runs.** The shared table is where the
   already-shipped Product Out screen reads its reasons from once
   `ProductOutReason::$table` changes; on a database that has not had the copy,
   the Product Out reason list goes empty. Command first, code second.
2. `php artisan permission:cache-reset`, then log in again — the frontend reads
   the permission list from `/api/settings/get-settings`.
3. `php artisan config:clear` **and** `php artisan route:clear`. The last is not
   optional: **a new route 404s until the route cache is cleared.**
4. Smoke test on **each** database, not just the dev one:
   * a product **with** a purchase history — the box fills, is read-only, and
     the saved `inventory_details.purchase_price` equals the book rate;
   * a product **without** — the box is empty and editable; typed → saved;
     left blank → saved at 0;
   * a product that has only ever been Product-In'd — the box must stay
     editable on the second slip (§3.2);
   * closing stock moves by the value added, and the voucher number reads `25-`;
   * **a pre-existing Product Out slip still names its reason**, and the Product
     Out form's reason dropdown still lists the old reasons and none of the new
     `in` ones (§7.1).

**Rollback:** delete the `permissions` rows for `product.in.*` (and their
`role_has_permissions` grants), delete the `acc_vr_type` row 25 if this patch
added it, then `permission:cache-reset` and `route:clear`. Vouchers already saved
under `25-` keep their numbers — a number already on paper is not ours to move.

⚠️ **The shared reason table is the one piece that does not roll back cleanly**,
because Product Out has moved onto it. Reverting the API alone leaves Product Out
reading `product_reasons` while the model is pointed back at
`product_out_reasons` — so the order is: revert the API first, **then**
`DELETE FROM product_reasons WHERE direction = 'in'`, and leave the copied `out`
rows where they are. `product_out_reasons` was never dropped (§7.1), so the old
state is still intact underneath.

The two Product In tables (`product_in_master`, `product_in_details`) drop
freely — nothing else reads them.

## 16. Risks

| Risk | Where it bites | Mitigation |
|---|---|---|
| ৳0 stock sold later as pure profit | the P&L, months after the slip | visible on the form, the register and the print (§6). Not blocked — owner's ruling |
| In row priced into `sales_price` | every stock report, silently | stated in §3.3 and in the poster's own comment |
| Product In's own receipt read back as a purchase rate | the box locks on a wrong figure | `NOT EXISTS` (§3.2) |
| `acc_vr_type` row missing on a tenant | Voucher Register prints a blank | already handled by `runProductInOutVoucherTypes()`, always on (§9.1) |
| The reason copy runs before the legacy seeder | every shop comes up with no write-off reasons | `runProductInSchema()` is called after `runProductOutSchema()` (§9.5) |
| Route cache not cleared | 404 on a fresh server | step 3 of §15 |
| A later `sync()` re-resolves the rate | ৳0 written over real money, silently | the rate is stored on the line (§10.1) |
| The register copied from the write-off's SQL | an unnecessary ledger join, and the same double-count | §11 — read the lines |
| The reason copy renumbers ids | every old write-off's reason goes blank | primary keys carried across explicitly (§7.1) |
| One `direction = 'out'` filter missed | the Product Out picker starts offering Product In's reasons | §7.1 names every touch-point; smoke test 4 of §15 |
| API deployed before the copy SQL | the live Product Out reason list goes empty | §15 step 1, in that order |

## 17. Open — owner only

1. **Is `ADD-` the word that should print on the paper?** It is on the slip the
   clerk files.
2. **Should anyone but the Owner approve?** Today's answer is Owner only; a
   store in-charge would be a role grant, not a code change.

## 18. What was built, and what was proved

**On the dev database** (`krishibitandatabase`) the shared reason table was
created and the ten write-off reasons copied across with their ids intact —
checked explicitly, because a renumbering there would have blanked the reason on
every write-off already raised. Both directions now hold ten reasons, and the
four existing slips still name theirs.

**The API was driven end to end from a script** — the real controller, a faked
request, no HTTP — through **34 checks, all passing**: the rate lookup in all
three of its forms; a receipt saved with a book rate, with nothing at all, and
with a clerk's figure; the clerk's figure being *ignored* where the book holds
one; `stock_in` and `purchase_price` reaching `inventory_details` with
`sales_price` left at zero; the rate surviving on the line; `sync()` being
idempotent; the register's rate and value; delete taking the stock back off; a
write-off reason being refused on a receipt; and a party-owing reason being
refused without a party.

**Product Out was regression-checked** — its reason list holds only `out`
reasons, its four slips still resolve, its register still reads.

**The screens were driven in a real browser** (headless Chrome against the app on
5173, the only origin the API's CORS allows) — **21 checks, all passing**: all
three screens render with no console or page errors, and Product Out still
renders. Then **14 more through the entry form itself**: the rate box filling
from the books at ৳428 and refusing to be typed into, opening empty with its
explanation where the books are silent, the clerk's ৳77.50 being taken, the line
table showing ৳856 and ৳232.50, and a save that wrote slip
`ADD-2026-10-01` / voucher `25-261000001` with exactly those rates in both the
lines and the stock ledger.

**Everything the runs created was taken back out** — the test vouchers, their
stock rows, the throw-away user and its role pivots, tokens and log rows. The
database holds no `product_in` rows and no `25-` vouchers.

**And the Product In Out report** (§11.1) — **12 checks, all passing** on the
report's own data: `product_in` and `product_out` present on every row, a
receipt of 5 raising the product_in total by exactly 5 and leaving product_out
untouched, its own row reading `25-` with `product_in = 5` and `purchase = 0`,
and — the one that matters — **the running stock computed from the report
equalling the stock ledger to the unit** (519 against 519). Then **9 more in the
browser**: an 11-column table with Product In before Product Out in both the
visible table and the hidden print copy, and the seeded receipt's row moving the
running stock *up* by its quantity (80 → 87) where the Product Out rows below it
move it down.

**And printing from the ledger** (§11.2) — **23 checks, all passing** in a real
browser: clicking `25-261000002` fetched `/api/product-in/details/3514?by=trx`
(HTTP 200, slip `ADD-2026-10-00002`) and rendered the **Stock In Slip**;
clicking `26-261000001` fetched its own details and rendered the **Damage / Loss
Slip**; neither answered "Unknown voucher type"; and the two dialogs on the
receipt list and the write-off list still draw the same paper after their
layouts moved out.

**Not verified:** no paper has actually been produced by a printer — the browser
run proves the slip reaches the print call with its content, not that a sheet
came out. And nothing has been tried on any database other than the dev one.
