# Hotel Asset Purchase — the "Accounts Transaction" form (Design)

**Status:** **STEP 5 BUILT, 2026-10-16.** §1–§11 describe the form as designed and
drawn. **§10 records what was then built**: cash only, paid in full, saving an
ordinary `2-` payment voucher. Bank, credit, discount and part payment are still
not built, and each control that would need them is DISABLED with a line saying
so rather than left to look as if it works.
**Repos:** `cashbookbd_react` (branch `Reseller-ui`) and `cashbook_api` (branch
`Reseller`).
**Source:** `docs/Hotel Asset Transaction/CashBookBD furniture purchase entry.png`
— the owner's own screenshot of the form to be reproduced.

**How to read this:** *Drawn* = on screen. *Built* = behind the screen, writing to
the books. *My call* = a decision taken that the owner may override. *Open* =
waiting on the owner.

---

## 0. What the owner asked for

> "এটা মূলত হোটেল ম্যানেজমেন্ট এর জন্য তৈরী করতে হবে। শুধুমাত্র এই ফরমটি ডিজাইন
> কর, ফাংশনালিটি পরে করব।"

Reproduce the screenshot's form for hotel management, as a design, with no
behaviour behind it.

---

## 1. What the screen is — and what it is not

It is the **FF&E case** — Furniture, Fixtures & Equipment — of a general
"accounts transaction": a purchase made **against an asset head** rather than
against stock.

⚠️ **IT IS NOT A PURCHASE INVOICE.** Nothing here lands in inventory, moves a
product's quantity, or appears in any stock report. A hotel buying twenty chairs
is not buying twenty of a product it resells; it is buying a thing it will keep,
and the two must not share a voucher. This is the single distinction that decides
what the form becomes when it is wired (§10).

What it is *meant* to become, once wired:

| Leg | Direction |
|---|---|
| Cash out, or bank out | credit the cash / bank account |
| The asset head named in Accounts Head | debit it |
| Whatever is left owing to the seller | a balance on the supplier |

That last row is the reason the form asks about payment mode at all (§4.1).

---

## 2. Where it lives

| | |
|---|---|
| Component | `src/components/modules/hotel/assets/HotelAssetPurchase.tsx` |
| Route | `/hotel/assets/purchase` — `routes.hotel_asset_purchase` |
| Menu | **Hotel → Assets Purchase**, between *Amenity Issue* and *Reports* |
| Route gate (screen) | `MENU_PERMISSIONS.hotel` — the Hotel menu's own five permissions |
| API gate | **`hotel.asset.purchase.create`**, its own key (§10.8) |

⚠️ **The screen's gate deliberately borrows the menu's list, and that is now
settled rather than temporary.** `--hotel-grant` hands the whole Hotel group —
the new key included — to the same roles, so whoever can see the Hotel menu is
who holds the purchase permission. The two are granted together by construction
and cannot drift apart.

---

## 3. The form, field by field

### 3.1 Header

| Element | Behaviour |
|---|---|
| Title | `Accounts Transaction` |
| Subtitle | `Furniture & equipment purchases` |
| **List** | ghost button, bordered — says *not built yet* |
| **Print** | ghost button, bordered — says *not built yet*; the voucher already prints from the ledger |

### 3.2 Who, what head, when — one card, three columns

| Field | Type | Notes |
|---|---|---|
| **Accounts Head \*** | dropdown | **Reads the real chart of accounts** — Fixed Asset heads only (§10.2). Help text says outright that nothing here moves a product's quantity. |
| **Transaction Date \*** | date picker | The app's own `InputDatePicker`; speaks `Date` objects, the form speaks `YYYY-MM-DD`. |
| **Voucher No** | text | **Disabled, placeholder "Auto-generated".** ⚠️ Deliberately not typeable — the number is the server's to give, and a box somebody could type one into would be a number the books do not have. |

### 3.3 Adding a line — one row

| Field | Type | Notes |
|---|---|---|
| **Select Item** | **text box** | 5 of 12 columns. ⚠️ A dropdown in the picture; free text now, and the reason is in §10.3 — the name lands on the voucher line's remark. |
| **Quantity** | number | 2 columns |
| **Rate (Tk.)** | number | 2 columns |
| **Add Item** | primary button | 3 columns; becomes **Save Item** while a line is being corrected, with a **✕ cancel** beside it |

### 3.4 The line table

`SL · Item · Quantity · Rate (Tk.) · Total (Tk.) · Action`

- `SL` is zero-padded (`01`, `02`).
- `Total` is quantity × rate, per line.
- **Action** is a blue pencil and a red bin.
- An empty table says so in one line rather than showing a bare grid.
- ⚠️ **A line being corrected stays in the table, greyed**, and the total does
  not move while it is being changed. Removing it and adding it back would lose
  its place and make the total jump about mid-correction — the same rule
  `ProjectExpense` already follows.

### 3.5 Payment Details

A **Cash · Bank · Credit** segmented control, then the fields below it.

| Field | State after step 5 (§10) |
|---|---|
| **Cash** | selected, enabled |
| **Bank · Credit** | **disabled**, tooltip naming them as the next step |
| **Bank Account** | not rendered — only Bank would need it |
| **Seller / Supplier** | **not rendered** — see §10.4; it returns with credit |
| **Payment Amount (Tk.)** | disabled, showing the Net Total — step 5 pays in full |
| **Notes** | textarea, writes the voucher's note |

⚠️ As drawn, Bank Account showed only for **Bank** and Seller / Supplier always,
marked required for **Credit**. Both of those fields are gone until the modes
that need them exist.

### 3.6 Transaction Totals

| Row | State after step 5 (§10) |
|---|---|
| **Subtotal (Tk.)** | sum of the lines |
| **Discount Amount (Tk.)** | **stated as zero, not typeable** — see §10.6 |
| **Net Total (Tk.)** | the subtotal, bold and larger |
| **Paid Amount (Tk.)** | the same figure |
| **Due Amount (Tk.)** | zero — nothing is left owing on a cash purchase |

### 3.7 Footer

**Reset** (ghost, bordered) at the right, **Save Transaction** (primary) at the
far right. Save writes the voucher and the number it was given appears above the
form.

---

## 4. Decisions taken while drawing it

### 4.1 The three tabs are three vouchers — settled

Not three payment methods: cash out, bank out, or a bill with nothing paid yet.
Which one is picked decides what the ledger holds. As drawn, the tabs changed
what was on screen rather than being decorative.

**After step 5 (§10.4) the other two are disabled instead** — the reading was
sound, but a tab that cannot save what it shows is worse than a tab that says it
is not ready.

⚠️ **The exact field-per-mode rules are still the owner's to settle** (§9).

### 4.2 Two sample lines were seeded — *withdrawn*

The design draft opened with Office Chair 5 × 3,000 and Office Desk 1 × 10,000,
the figures in the screenshot, so the screen read as a filled-in form on first
look.

⚠️ **They are gone now the screen saves.** A form that opens with figures nobody
typed, one press away from a real voucher, is a trap — and the discount that went
with them was one of the two figures that would have been written into the books
wrongly. The form opens empty and says so.

### 4.3 What is not built says so — *my call*

List and Print raise `"<name> — not built yet"`. Bank and Credit are disabled
rather than clickable-and-ignored. Nothing that cannot work is left looking as
though it can, which is the one thing a half-built screen must not do.

---

## 5. Placeholders

✅ **Resolved by step 5** (§10): **Accounts Head** now reads the real chart of
accounts. **Select Item** is now a **free-text box**, not a dropdown — see §10.3.

⚠️ **Still fake, and reachable only on a screen that is disabled:** Bank Account
and Seller / Supplier were hand-written lists in the design draft. Both are now
**gone from the component** — Bank and Credit are disabled (§10.4) and the fields
they would need are not rendered at all, so there is nothing left to save
against them by accident.

---

## 6. What is still not built

As of step 5 (§10), **the form saves**. What is still missing:

- **Bank and credit.** Both are disabled tabs with a tooltip. A credit purchase
  moves no money and is a journal, not a setting on this one (§10.5).
- **Part payment.** Payment Amount mirrors the total and cannot be typed into;
  nothing here can leave a balance owing to a seller.
- **Discount.** No third ledger leg, because where a purchase discount lands is a
  bookkeeping decision nobody has made (§10.6).
- **Edit, update and delete.** A saved voucher can be changed from the ordinary
  cash-payment screen, not from here.
- **A list screen.** **List** says it is not built; the voucher number is shown
  on the screen after saving, because there is nowhere else to read it.
- **Approval.** The app has an approval centre; this form knows nothing of it.
- **A paper of its own.** None is needed — a `2-` number already prints.
- **The asset register link** (§9.4) — nothing is written to it.

---

## 7. Files touched

**Created**

- `src/components/modules/hotel/assets/HotelAssetPurchase.tsx` — the whole screen

**Edited — wiring, so the screen can be reached**

- `src/components/services/appRoutes.tsx` — `hotel_asset_purchase: '/hotel/assets/purchase'`
- `src/App.tsx` — import, and a route gated on `MENU_PERMISSIONS.hotel`
- `src/components/Sidebar/index.tsx` — the entry in `SIDEBAR_SUBMENUS.hotel`, and the `<li>` beside *Amenity Issue*
- `src/components/Sidebar/menuRoutes.ts` — the route id added to the `hotel` group

**API — created by step 5 (§10)**

- `app/Http/Controllers/Hotel/AssetPurchaseController.php`
- routes in `routes/api.php`, under the `hotel-setup` prefix
- `config/route_permissions.php` — two entries
- `app/Console/Commands/AddUnitTypeToBuildingUnits.php` — one permission row in
  `syncPermissions()`

---

## 8. Verification

| Check | Result |
|---|---|
| `npm run build` | exit 0 |
| TypeScript diagnostics on the new file | none |
| Dev server transforms both touched modules | 200, no unresolved import, no transform error |
| The API route is registered | `route:list` shows both, and answers 302→login with no session |
| **The controller run for real** | **28 checks, all passing — §10.7** |

⚠️ **STILL NOT SEEN RENDERED IN A BROWSER.** The build transpiles, Vite resolves
every import and the dev server serves the module, but no one has looked at the
screen. There is no login or Playwright harness available in the sessions this
was built in.

---

## 9. Open questions for the owner

1. **Is this one screen or a family?** The title is generic — *Accounts
   Transaction* — while the subtitle names one case. The same form serves
   vehicle purchase, kitchen equipment, an air-conditioner, with only the head
   and the subtitle changing. One screen with a purpose picked from a list, or
   one screen per purpose?
2. **What exactly does each payment mode change?** (§4.1) Especially Credit:
   is a credit purchase a voucher with nothing paid, or a bill raised against
   the supplier with no voucher until it is paid?
3. **Does it need approval?** The app's other purchases go through the approval
   centre. This one, being an asset rather than stock, may not.
4. **Where does the asset register come in?** The Asset module already has
   categories and a register (`routes.asset_setup`). Does a purchase here
   *create* register rows, or is the register kept by hand and this is only the
   money?
5. ✅ **What is its permission?** Answered by step 5: its own key,
   **`hotel.asset.purchase.create`**, handed out with the Hotel group (§10.8).
6. ✅ **Which voucher type?** Answered by step 5: **none**. It writes an ordinary
   cash payment (`2-`), which already has a series and a printed paper — so the
   recurring trap this question was written to warn about (a new prefix printing
   nothing until `VoucherPrintRegistry` learns it) does not arise. Worth keeping
   in mind for credit, which will need `5-` — already taught, in 2026-10-16.
7. **What should Select Item offer, if it should be a dropdown at all?**
   (§10.3) It is free text today.

---

## 10. Step 5 — built, 2026-10-16

The owner chose the smallest first step and said to start: *"শুধু Cash, একটা লাইন
… সেভ করলে একটা সাধারণ 2- ভাউচার, #346-এ ডিবিট, ক্যাশে ক্রেডিট।"*

### 10.1 The accounting, settled by the code that already existed

It writes an **ordinary cash payment voucher**. Nothing new was invented: no
voucher type, no prefix, no paper, no register.

| | |
|---|---|
| `transaction_type` | 2 — `VoucherNumber::TRX_PAYMENT` |
| `vr_no` prefix | 2 — Cash Payment, which already has a printed paper |
| `acc_transaction_master.voucher_type_id` | 1 — Cash |
| Debit | the chosen asset head, **one line per item**, each carrying its own remark |
| Credit | Cash (coa4 **17**), **one line for the voucher**, not one per item |

**Why one credit line and not one per item:** the money left the till once. A
credit line per item would say it left five times.

**Why this rather than a new voucher type:**
`ProjectExpenseController` already proves the pattern and says so in its own
header — *"The voucher itself is an ordinary one… Only the dimension is new."*
`VoucherNumber` says the rest: cash and part-paid purchases are payments;
**a wholly-credit purchase moves no cash and is a journal** (`TRX_JOURNAL`).

### 10.2 The asset heads — ⚠️ not the group you would guess

**Level-1 "Assets" is the wrong filter and would have been a disaster.** In this
chart it holds the whole asset side of the balance sheet: cash, every bank
account, staff loans, the investors' advances, the inter-branch accounts and
**one receivable per customer**. The dropdown would have offered four hundred
names in which the six real ones are invisible.

The filter is **`acc_coa_level2s.id = 2`, Fixed Asset**, by id rather than by
name for the reason `AssetCategoryController` gives — group names are the
tenant's own words, the seeded level-2 ids are not. Two exclusions:

- **Cash**, which sits in the same group in some charts.
- **Accumulated Depreciation**, a contra-asset written by the depreciation run
  and never bought. Matched by group name, because nothing seeds it by id.

It yields exactly four heads here: Furniture & Fixtures (#346), Vehicles (#348),
Office Equipment (#350), Capital Work in Progress (#352).

⚠️ **The dropdown and the save read ONE definition** (`assetHeads()`). A list
built from one rule and a save checked against another is how a screen comes to
offer something the server then refuses.

### 10.3 The item is free text — *my call*, and a change from the picture

The screenshot shows **Select Item** as a dropdown. It is now a **text box**.

An office chair is not a product and there is no catalogue behind it: a hotel
buys things it keeps, not things it resells. A dropdown here would have meant a
hand-written list of four names being written into real vouchers as if it were
data. What is typed lands on the voucher line's **remark**, which is the only
place the ledger can say what was bought.

If the owner wants a dropdown, the list it should offer is a question for them
(§9.1), not a guess.

### 10.4 Bank and Credit are disabled, not merely unbuilt — *my call*

Three tabs, cash selected, the other two `disabled` with a tooltip naming them as
the next step. ⚠️ They are not clickable-but-ignored: pressing **Bank** and
getting a cash voucher anyway is the one thing this screen must not do. Their
fields (Bank Account, Seller / Supplier) are not rendered at all.

**Seller / Supplier is gone from the working path**, and that is deliberate. A
cash purchase paid in full leaves no balance with anybody, and
`acc_transaction_details` has **no party column** to record one in — checked, not
assumed. It returns with Credit, which is the case that actually creates a
balance owing.

### 10.5 Payment Amount mirrors the total

Disabled, showing the Net Total. Step 5 pays in full; a part payment is the thing
that creates a supplier balance, and that is not built. Leaving the box typeable
would have saved the full amount while the screen showed a smaller one.

### 10.6 Discount is shown as zero and cannot be typed into

A purchase discount is a **third ledger leg**, and where it lands is a
bookkeeping decision nobody has made. Zero, and stated as not built, rather than
a refusal met after the fact.

### 10.7 Verification — 28 checks, all passing

The real controller, called with a faked request, **inside a transaction that was
rolled back** — including the temporary permission grant that let the gate open.
Nothing was written and there was no cleanup step to get wrong. (The last time a
test of mine cleaned up by a broad `WHERE`, it destroyed four real write-off
slips; that is why this one leaves nothing to clean.)

- **The dropdown** — four heads, all under Fixed Assets; Cash, Accumulated
  Depreciation and the customer receivables all absent.
- **The save** — accepted; a `2-` number came back.
- **The voucher** — `transaction_type` 2, `voucher_type_id` 1, three lines: two
  debits to #346 of 15,000 and 10,000 each keeping its own remark, one credit to
  Cash of 25,000. Debits equal credits.
- **The refusals** — cash as the head, an expense head, an accumulated
  depreciation head, no lines, a zero amount, and no head at all: every one
  refused with a message that says which.
- **Nothing left behind** — the voucher and the permission both gone after the
  rollback.

**Still not verified: the screen itself, in a browser** (§8), and any database
other than the one in the API's `.env`.

### 10.8 To make it work on a database

```
php artisan patch:add-unit-type --hotel-grant
php artisan route:clear
php artisan permission:cache-reset
```

⚠️ The permission is **`hotel.asset.purchase.create`**, and it is created by
`syncPermissions()` and handed out by `--hotel-grant` with the rest of the Hotel
group — so whoever can see the Hotel menu is who holds it. Which is also why the
screen's route gate is still `MENU_PERMISSIONS.hotel` (§2): the two are granted
together by construction and cannot drift apart.

---

## 11. What comes next, in order

1. **Bank** — the same voucher with a bank head credited, and a bank chooser.
2. **Credit** — a journal (`TRX_JOURNAL`, prefix `5-`), not a setting on this
   one. This is what brings Seller / Supplier back, and it is the case that
   creates a balance.
3. **Part payment** — one payment voucher with two credit legs, cash and the
   seller.
4. **Discount** — once the owner says which head it lands on.
5. **A list screen**, and the register link if §9.4 is answered yes.

---

## 12. ⚠️ Reaching the screen — the Hotel menu can hide silently

Worth recording, because it cost time on the day this was built.

The sidebar lets each user **hide any menu** from Settings → Arrange Menu. A
hidden menu is rendered `display: none` — **no error, no warning, nothing in the
console**. The arrangement lives in the browser's `localStorage` under
`sidebar-menu-order` (inner entries under `sidebar-sub-order`) and, once changed,
on the server in `metas` under `dashboard_preferences:sidebar`.

So "the menu is missing" has two entirely different causes and they look
identical:

| Cause | How to tell |
|---|---|
| The user lacks the permission | `hasMenuPermission` returns false — check the role |
| The user hid it themselves | `JSON.parse(localStorage['sidebar-menu-order']).hidden` names it |

Checked on 2026-10-16 against the database in the API's `.env`
(`stagingdatabase`): every user there holds 14–15 `hotel.*` permissions, so the
Hotel menu was **not** hidden by permissions. The same trap is recorded for
`MENU_PERMISSIONS` in the Product In spec §19.
