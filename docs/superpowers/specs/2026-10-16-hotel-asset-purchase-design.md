# Hotel Asset Purchase — the "Accounts Transaction" form (Design)

**Status:** **DESIGN ONLY, 2026-10-16.** The form is drawn, laid out and reaches
the screen. **Nothing is saved, sent or calculated server-side** — the owner
asked for the shape first and the wiring afterwards: *"শুধুমাত্র এই ফরমটি ডিজাইন
কর, ফাংশনালিটি পরে করব।"* Every control that would need the server says so when
pressed rather than doing nothing quietly (§6).
**Repo:** `cashbookbd_react` at `F:\All_Database\cashbookbd_react`, branch
`Reseller-ui`. **The API repo is untouched.**
**Source:** `docs/Hotel Asset Transaction/CashBookBD furniture purchase entry.png`
— the owner's own screenshot of the form to be reproduced.

**How to read this:** *Drawn* = built and on screen. *My call* = a decision taken
while drawing it that the owner may override. *Open* = waiting on the owner.
Nothing here is wired to a database.

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
| Route gate | `MENU_PERMISSIONS.hotel` — the Hotel menu's own five permissions |

⚠️ **The route gate is temporary.** It reuses the menu's own list so that what
the menu offers and what the route allows cannot drift apart while the screen is
only being looked at. A real screen wants a permission of its own (see §9).

---

## 3. The form, field by field

### 3.1 Header

| Element | Behaviour |
|---|---|
| Title | `Accounts Transaction` |
| Subtitle | `Furniture & equipment purchases` |
| **List** | ghost button, bordered — *not wired* |
| **Print** | ghost button, bordered — *not wired* |

### 3.2 Who, what head, when — one card, three columns

| Field | Type | Notes |
|---|---|---|
| **Accounts Head \*** | dropdown | The asset head the money lands on. Help text says outright that nothing here moves a product's quantity. |
| **Transaction Date \*** | date picker | The app's own `InputDatePicker`; speaks `Date` objects, the form speaks `YYYY-MM-DD`. |
| **Voucher No** | text | **Disabled, placeholder "Auto-generated".** ⚠️ Deliberately not typeable — the number is the server's to give, and a box somebody could type one into would be a number the books do not have. |

### 3.3 Adding a line — one row

| Field | Type | Notes |
|---|---|---|
| **Select Item** | dropdown | 5 of 12 columns |
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

| Field | When it shows | Notes |
|---|---|---|
| **Bank Account** | only when **Bank** | A cash or credit purchase has no bank account to name. |
| **Seller / Supplier** | always | Marked required only for **Credit**. Help text: *"Required when an outstanding balance remains."* |
| **Payment Amount (Tk.)** | Cash and Bank | Hidden for Credit — nothing is being paid. |
| **Notes** | always | Textarea, full width when Bank is picked. |

### 3.6 Transaction Totals

| Row | Source |
|---|---|
| **Subtotal (Tk.)** | sum of the lines |
| **Discount Amount (Tk.)** | an input — the only editable figure in the panel |
| **Net Total (Tk.)** | subtotal − discount, bold and larger |
| **Paid Amount (Tk.)** | read from the Payment Amount box |
| **Due Amount (Tk.)** | net − paid, in amber |

### 3.7 Footer

**Reset** (ghost, bordered) at the right, **Save Transaction** (primary) at the
far right. Both are for later; Save says so when pressed.

---

## 4. Decisions taken while drawing it

### 4.1 The three tabs really switch — *my call*

The tabs are not three payment methods so much as **three different vouchers**:
cash out, bank out, or a bill with nothing paid yet. Which one is picked decides
what the ledger ends up holding once this is wired.

So the tabs change what is on screen rather than being decorative: Bank Account
appears only for Bank, Payment Amount is hidden for Credit, and Seller / Supplier
is marked required only for Credit. **A tab that changes nothing reads as a
broken tab.**

⚠️ **The exact field-per-mode rules are the owner's to settle** (§9). What is
built is a sensible reading, not a settled design.

### 4.2 Two sample lines are seeded — *my call*

The table opens with Office Chair 5 × 3,000 and Office Desk 1 × 10,000, and the
discount with 1,000 — the figures in the screenshot — so the screen reads as a
filled-in form rather than an empty grid on first look. **Reset clears them.**

### 4.3 The buttons say they are not wired — *my call*

Save Transaction, List and Print raise `"<name> — not wired up yet."` A button
that does nothing when pressed is worse than one that admits it, and this is the
one thing a design-only screen must not lie about.

---

## 5. Placeholders — must be replaced before this is real

⚠️ **Both dropdown lists are fake.** They are written into the component so the
form can be read; **nothing should ever be saved against them.**

| List | Now | Must become |
|---|---|---|
| Accounts Head | 4 hand-written names | the chart of accounts, level 4, asset group |
| Select Item | 4 hand-written names | whatever a hotel's assets are set up as — see the Asset module (`routes.asset_setup`) |
| Bank Account | 2 hand-written names | the branch's own bank accounts |
| Seller / Supplier | 2 hand-written names | the party list |

---

## 6. What is deliberately not built

- **No API call of any kind.** No store, no update, no delete, no list.
- **No save.** Save Transaction, List and Print are inert (§4.3).
- **No voucher number.** It can never be filled, because nothing issues one.
- **No approval.** The app has an approval centre; this form knows nothing of it.
- **No print paper.** Print is a button and nothing behind it.
- **No validation the server would keep.** The form refuses a line with no item
  and a line with no quantity — that is so the screen behaves, not a rule.
- **No day-close, no voucher-type prefix, no permission of its own.**

---

## 7. Files touched

**Created**

- `src/components/modules/hotel/assets/HotelAssetPurchase.tsx` — the whole screen

**Edited — wiring, so the screen can be reached**

- `src/components/services/appRoutes.tsx` — `hotel_asset_purchase: '/hotel/assets/purchase'`
- `src/App.tsx` — import, and a route gated on `MENU_PERMISSIONS.hotel`
- `src/components/Sidebar/index.tsx` — the entry in `SIDEBAR_SUBMENUS.hotel`, and the `<li>` beside *Amenity Issue*
- `src/components/Sidebar/menuRoutes.ts` — the route id added to the `hotel` group

**Untouched:** the API repo. `git status` on `cashbook_api` is clean.

---

## 8. Verification

| Check | Result |
|---|---|
| `npm run build` | exit 0 |
| TypeScript diagnostics on the new file | none |
| Dev server transforms all five touched modules | 200, no unresolved import, no transform error |

⚠️ **NOT SEEN RENDERED IN A BROWSER.** The build transpiles and Vite resolves
every import, but no one has looked at the screen. There is no login or
Playwright harness available in the session this was built in. It is a static
component with no fetching and no effects, so a crash is unlikely — but that is a
reason, not a check.

**Nothing has been run against a database, because nothing in this screen
touches one.**

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
5. **What is its permission?** It currently borrows the Hotel menu's (§2).
6. **Which voucher type?** A new `acc_vr_type` row and its printed prefix — see
   the recurring trap recorded in the Product In spec: a new prefix prints
   nothing until `VoucherPrintRegistry` is taught it.

---

## 10. When it is wired — what has to change

1. Replace the four placeholder lists (§5).
2. Decide the voucher type and add the prefix to the print registry.
3. Give it its own permission, and move the route off `MENU_PERMISSIONS.hotel`.
4. Decide whether it posts a GL entry, and against which heads — the asset head
   on one side, cash / bank / supplier on the other.
5. Decide the approval path (§9.3).
6. Add the list screen behind **List**, and a paper behind **Print**.

---

## 11. ⚠️ Reaching the screen — the Hotel menu can hide silently

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

Checked on 2026-10-16 against the dev database (`stagingdatabase`): every user
there holds 14–15 `hotel.*` permissions, so the Hotel menu was **not** hidden by
permissions. The same trap is recorded for `MENU_PERMISSIONS` in the Product In
spec §19.
