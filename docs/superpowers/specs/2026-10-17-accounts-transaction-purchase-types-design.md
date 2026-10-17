# Accounts Transaction — Purchase Types: Design

**Status:** concept agreed 2026-10-17. **Phase 1 (Asset) PUSHED** (React `36044207`/`a038e3d7`, API `64d3c6ca`); **Cash/Bank/Credit PUSHED** (React `c030b63d`, API `0ddada5e`). **Phase 2 BUILT 2026-10-17, uncommitted — but as EXPENSE items, not stock.** See "What was built" at the end; it overrides §3, §5 (inventory source) and §6 where they disagree.

**Extends:** `docs/superpowers/specs/2026-10-16-hotel-asset-purchase-design.md` (the single-purpose asset-purchase screen).

**Owner decisions taken in this round:**
- Purchase types 1 (Asset) and 2 (Inventory) are in scope.
- Type 3 (Expenditure) is **out of scope** — the owner will manage it another way.
- Mixing Asset and Inventory lines on one bill is **allowed**.

---

## 1. The idea in one paragraph

One Accounts Transaction screen handles both Asset and Inventory purchases. There is **no purchase-type switch**: the type is a property of the **item** the clerk picks, not of the document. An asset item ("Office Chair") resolves to its asset category's head and moves no stock; a stock item ("Soyabean Oil") resolves to its expense head and increases stock. A single bill may contain both, because one supplier invoice is one event and the ledger has always allowed several debit heads on one voucher.

---

## 2. The flow

```
1. Header:  Date · Cash/Credit · (credit only) Seller · Note
2. Lines:   Select Item  →  Quantity  →  Rate  →  Total
3. Each line resolves, from the item alone:
      - the head it debits
      - whether stock moves
      - whether an asset-register row is created
4. Totals:  Cash  → credit side is Cash (coa4 17)
             Credit → credit side is A/c Payable; Seller is reference data only
```

The screen shows, beside each line, where the money is going ("Furniture & Fixtures", "Food Management") — as information, not as a box the clerk chooses.

---

## 3. The two kinds of line

| | Asset line | Inventory line |
|---|---|---|
| Item example | Office Chair, Vehicle, Crockery set | Meat, Fish, Soyabean Oil, Soap |
| Item source | new asset-item master (§5) | existing `product_items` (§5) |
| Debits | the asset head its category nominates | its expense head (Food Management, Washing & Cleaning) |
| Stock | does not move | increases |
| Asset register | may create a row (open decision) | never |
| Depreciation | belongs here, via the category | not applicable |

Common to both: name, quantity, rate, line total; one cash/credit decision and one seller for the whole bill.

---

## 4. Head resolution — "the item carries its head"

The clerk should never have to think in chart-of-accounts terms.

- **Asset item → asset category → `asset_coa4_id`.**
  Already the rule the Accounts Head box uses today: the category nominates the head, and the dropdown offers the category list while carrying the head id as its value. An asset item belongs to exactly one category, so the head is fully determined.
- **Inventory item → its expense head.**
  The business rule is that food items land on Food Management A/c and cleaning items on Washing & Cleaning A/c. Whether the head lives on the item, on the item's group, or on a mapping is an open decision (§7), but conceptually it is decided once when the item is set up, not each time it is bought.

The "Chart of A/c Head" box therefore stops being an input. It becomes a read-only display per line. This is what makes a mixed bill possible without any extra work, and it removes the entire class of "clerk picked the wrong head" errors.

---

## 5. Where the items come from

Two sources, because the two kinds of item have different lives.

| | Source | Why |
|---|---|---|
| Inventory items | **existing `product_items`** | Stock already lives there — `inventory_details`, stock reports and FIFO all hang off it. A parallel table would split the stock ledger. |
| Asset items | **new small master** | No stock, no resale; tied to `asset_categories`, which is where the head comes from. |

### Why asset items must not go into `product_items`

1. **They would leak into stock and sales.** `product_items` feeds sales, purchase and stock screens and reports. A chair would appear with zero stock and could be picked on a sales invoice.
2. **The two category systems are different.** `product_items.category_id` points at `product_categories` (Tiles, Cement, MS Bar); asset items belong to `asset_categories` (Furniture, Vehicles). One column cannot hold both without ambiguity.
3. **They carry different facts.** An asset item needs its asset category (which decides the head), and optionally a unit and a last rate; none of that belongs on a stock product.

### One search box, two sources

The clerk sees a single **Select Item** search. Results come from both tables and are tagged:

```
Chair (executive)          [Asset]
Soyabean Oil 5 litre       [Stock]
```

The tag is the piece of information the clerk actually needs: it tells them whether this line becomes company property or stock. Picking the line sets the head and the stock behaviour; nothing else is asked.

### Asset item master — minimum shape (not a table design)

For the dropdown to work, an asset item needs only a **name** and its **asset category**. Optional, and recommended only if the owner wants them:
- a unit (piece/set),
- a last purchase rate, so Rate fills in on selection.

New asset items can be added from inside the dropdown ("+ new item"); a separate master screen is optional and can come later.

**Verified on `stagingdatabase` (2026-10-17):** `product_items` holds 771 rows, all construction materials (MS Bar, Bricks, Stone Chips), under `product_categories`. There is no asset-item master. Zero hotel asset-purchase vouchers exist, so a history-based list would start empty — which is why a master is the working choice rather than "distinct remarks from past vouchers".

---

## 6. Cash, credit and the seller

| | Cash purchase | Credit purchase |
|---|---|---|
| Debit | the line heads (asset / expense) | the line heads (asset / expense) |
| Credit | **Cash (coa4 17)** | **A/c Payable** |
| Seller | not needed | **separate field — reference only** |
| Paid / Due | paid = net, due = 0 | paid = 0, due = net |
| Later | — | the payment reduces A/P; the seller reference says whose dues were settled |

The owner's rule, stated outright: **on a credit purchase the credit head is A/c Payable, never the seller's name.** The seller is kept as a reference on the voucher so the payable can be traced and settled, but it is not a ledger identity. This differs from the older pattern where each supplier has its own payable ledger head.

---

## 7. Mixing — the decision and its reasoning

**Allowed.** One bill may carry asset and inventory lines together.

The argument that settled it:
- A bill is **one economic event**. The ledger has always allowed one voucher to debit several heads. Line-level nature is normal accounting, not an exception.
- Forbidding the mix does not merely inconvenience — it forces one real invoice to be recorded as **two vouchers**. Totals may still add up, but the paper-to-record link breaks: two sellers recorded (or two references), two payable lines, two cash payments, and the supplier's statement can never be matched one-to-one.
- Allowing the mix is also **less logic**: with item-first line resolution, nothing extra is needed. Forbidding it requires detecting a second kind and refusing.
- The owner's numbering decision already fits: both kinds are purchases and share the `4-` purchase-invoice series. A mixed bill is still one `4-` voucher.

**What stays at bill level:** date, cash/credit, seller, invoice reference, note.
**What is per line:** item, quantity, rate, head, stock effect, asset-register effect.

The screen may **warn** ("this bill contains both asset and stock items") but must not refuse.

**The one place the mix could bite:** if asset purchases and inventory purchases later need separate voucher series, separate print layouts or separate approval flows, a mixed voucher has to choose one series. That is a workflow question, not an accounting one — see open decisions.

---

## 8. What this changes in the existing screen

The asset-purchase screen built on 2026-10-16 becomes one half of this screen:

- **Kept:** date, cash-only payment panel (to be extended with credit), item lines (name/quantity/rate), totals, the `4-` purchase numbering, the category-driven Accounts Head list (built 2026-10-17, uncommitted — value is the category's `asset_coa4_id`).
- **Becomes derived:** the Accounts Head box is no longer chosen per voucher; it comes from each line's item.
- **Added conceptually:** inventory lines and their stock movement; the item search spanning both sources; cash/credit with A/c Payable and the seller field.
- **Out of scope:** Expenditure purchases.

---

## 9. Open decisions

1. **Inventory head placement** — does each stock item carry its expense head, its group carry it, or is there a mapping table? (Owner's examples: Food Management A/c, Washing & Cleaning A/c.)
2. **Asset item extras** — name + category only, or also unit and last rate (which would auto-fill Rate)?
3. **Adding asset items** — inline from the dropdown, or a small master screen?
4. **Voucher series** — both kinds share the `4-` purchase series. Confirm inventory purchases can be numbered there rather than in the inventory module's own series.
5. **Stock timing** — does an inventory line move stock at **save** (as Product In/Out now do) or at approval?
6. **Asset register** — do asset lines create asset-register rows at save (open question 4 from the 2026-10-16 design)? If yes, which category and fields come from the line.
7. **Inventory module** — does an inventory purchase also write `inventory_purchase_masters`/`details`, or is the ledger plus a stock movement enough for this screen?

---

## 10. Deferred (explicitly not decided here)

Table names, columns, indexes, migrations/patch SQL, endpoints, permissions, screen layout and component choices. The owner asked for the idea first; the implementation plan comes after the decisions in §9.

---

## 11. What was built (2026-10-17) — supersedes §3, §5, §6, §9 where they differ

**Owner decisions in this round:**
- "Inventory" lines are **direct expense, not stock.** Nothing reaches `inventory_details`, FIFO or the Balance Sheet; the P&L carries the whole cost on the purchase date. The quantity is still kept, and an **issue** screen may come later.
- **Credit** credits the **supplier's own head** (not one A/c Payable), and is numbered **`9-` Credit Purchase** (journal, `transaction_type` 5) like every ordinary credit purchase — `PurchaseVoucherKind`'s rule. Cash and Bank are `4-`.
- **Bank** asks for a Bank Account head (level 3 = 2) and an optional cheque no (`main_trx_master.manual_voucher_no`).

**Items:** one catalogue, `asset_items`, gains `kind` (`asset` | `expense`) and `expense_coa4_id`; `category_id` becomes nullable. An expense item names an Expense head (level 1 = 4) directly. Maintained **only** on Fixed Assets → Items (Kind + Expense Head) — the purchase screen's inline "New item" box and its `items/store` endpoint were removed 2026-10-17 at the owner's request. `product_items` is not used — that would put meat on the sales and stock screens.

**Head box:** still a filter (asset category heads, plus expense heads that some expense item is filed under, labelled "(Expense)"). Each line shows its head and kind in the table; the server reads the head from the item.

**Quantities:** new `item_purchase_lines` (voucher, item, kind, head, unit, quantity `decimal(14,3)`, rate, amount) — one row per line, both kinds. An asset quantity must be whole; an expense quantity may be fractional. A future issue screen counts down from here and moves no money.

**Date:** the voucher (and its register rows) are dated on the branch's transaction date — the last day close, `VoucherNumber::businessDate(null)` — as Product Out is. The form has no date box, and a `vr_date` sent anyway is ignored.

**Patch:** `cashbook_api/database/sql/2026_10_17_expense_items.sql`, once per database — also `runAssetItemSchema()` in `patch:add-unit-type`. Applied to `stagingdatabase` only.

**Before use on a database:** create "Food Management A/c" and "Washing & Cleaning A/c" under an Expense group in the Chart of A/c — neither exists on staging.

**Not built:** issue screen; discount; part payment; print of these vouchers from the ledger (the ordinary purchase print reads `inventory_purchase_masters`, which this screen does not write).
