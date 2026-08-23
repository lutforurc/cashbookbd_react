# Hotel / Motel + Resort Booking & Ticketing — Working Spec

> **Status:** Design agreed, **no code written yet**. The user has said three times
> that nothing is to be built until they explicitly say so — advice and documents
> only. Last updated: 2026-08-23.
>
> **Client-facing proposal:** `docs/Hotel_Community_Center_Asset_Management_Proposal.docx`
> (Bengali, 11 chapters, submitted to the client). **This file is the internal
> working document** — start here when work resumes.
>
> **Since the first draft:** rooms can now be sold by the seat as well as whole —
> a new architecture decision at §2.5, five client answers at §6.1 including the
> gender rule that governs a dormitory, and the questions still open at §6.2.
> And phase 0 is bigger than it looked: the financial-year findings in §3.2 were
> re-checked against the database and three of them were wrong or understated.

---

## 1. What is being built

One codebase, deployed twice, as two separate installs with **separate databases and
separate domains**.

| | **Site 1 — Motel** | **Site 2 — Resort** |
|---|---|---|
| Accommodation | Rooms | Cottages / villas / rooms |
| Function space | Hall + community centre | — (no events) |
| Food | Catering, per-plate | Restaurant only (see OPEN-3) |
| Consumables | Room amenities | Same |
| **Tickets** | — | **Entry, pool, boat, rides** |
| Accounting | FY, reports, assets, depreciation | Identical |

The only real difference is ticketing. Everything else is the same code with
different settings and different display labels.

---

## 2. Architecture decisions (CONFIRMED / locked)

### 2.1 One booking engine, two allocation modes

This is the decision the whole design rests on. `booking_resources` carries an
`allocation_mode` column:

| | `exclusive` | `capacity` |
|---|---|---|
| Used by | Room, cottage, hall, community centre | Day pass, pool, boat, rides |
| Rule | One occupant per time range | Many buyers per date |
| Blocked by | Time overlap | Capacity exhausted |
| Volume | 10–50 / day | 500–5000 / day |

Without this, rooms and tickets need two separate engines. With it, one engine
serves both sites.

### 2.2 Never fork the code

Whatever differs between the two sites differs **through settings, not through
code**. Copying the repo for the resort is the single biggest risk to this project:
every bug would then need fixing twice, and within months there would be two
divergent products.

### 2.3 Three layers of configuration

1. **Business type** — add rows to the existing `business_type` table:
   `Hotel / Motel` (id 9) and `Resort` (id 10). The table already exists with 8 rows.
2. **Module toggles** — stored in the existing `metas` table. Motel: ticketing off,
   community centre on. Resort: ticketing on, events/catering off.
   The sidebar menu is generated from these toggles.
3. **Terminology layer** — same table, different on-screen label
   (`booking_resources` → "রুম" on the motel site, "কটেজ" on the resort site).
   **Do not hardcode these labels in components.** Retrofitting this later means
   touching ~30 screens.

### 2.4 Financial year is derived, never stored on the transaction

`main_trx_master` has no FY column, only `vr_date`. FY is resolved from `vr_date`
against `acc_financial_years`. Reason: the app has a `change_date` module, so a
voucher's date can be edited — a stored FY id would go stale and strand the
voucher in the wrong year.

### 2.5 A room may be sold whole or by the seat — the seat is the bookable thing

*(Added 2026-08-23. Not in the original design; raised by the client.)*

A room is one of two kinds, and a property runs both at once:

| | Whole room | Seat-wise (dormitory) |
|---|---|---|
| Sold to | One guest or party | Several unrelated guests |
| Used by | Families, couples | Students, workers, lone travellers, pilgrims |
| Occupancy risk | Empty room earns nothing | Two guests in a four-bed room still earn |

**The decision: model the seat as the bookable resource, never the room.** A room with
four beds is four `booking_resources` rows, each pointing at its room through a
`parent_id`. A single-occupancy room is one row.

Everything else follows from that and needs no further machinery:

- **Selling a whole room** is booking all of its seats in one booking. No second code
  path, no second table.
- **The two availabilities cannot drift apart.** Whole-room availability *is* "all
  seats free". Counting rooms and seats separately would be two numbers to keep in
  step, and the day they disagree is a double booking.
- **The overlap lock of §2.1 is unchanged.** Every seat is `exclusive`. Rooms never
  need `capacity` mode — that stays what it was meant for, tickets.
- **The gender rule becomes one query** — who else is in this seat's `parent_id` on
  these nights (see §6.2).

Cost: more rows. Twenty four-bed rooms are 80 resource rows rather than 20. That is
nothing to a database, and it buys away every synchronisation problem above.

**Seat rows are deactivated, never deleted.** A stay recorded in July against "seat 3"
must still read as seat 3 after the room is converted in September. Deleting the row
would break the old booking, its bill and its police register entry. Reducing a room
from four seats to two deactivates two rows; going back to four revives the same
seat numbers rather than inventing new ones.

### 2.6 Advance money is a liability, not income

```
On receipt:        Dr Cash/Bank            Cr Advance Against Booking  (liability)
On service given:  Dr Advance Against Bkg  Cr Room Rent / Hall Rent Income
```

Getting this wrong makes every year-end P&L wrong — advance taken on 30 June for a
5 July stay would land in the wrong year.

---

## 3. Codebase findings (verified against the dev DB, not assumed)

These were checked directly. They do not need re-investigating.

### 3.1 Already exists and should be reused

| Need | Existing asset | State |
|---|---|---|
| Amenity / raw-material issue → expense | `material_issue_master` + `material_issue_details` | Ready; has `from_warehouse_id`, `issue_date`, `main_trx_id`, and detail rows with `product_id`/`quantity`. Built for construction material issue, structurally identical to amenity issue. 0 rows. |
| Kitchen / housekeeping store | Warehouse + warehouse-transfer modules | Ready |
| Chef / housekeeping requests | `requisition_master` + `requisition_details` (50KB controller) | Ready |
| Raw material → cost posting | `inventory_manufacturing_masters` + `_details` (uses `transaction_type` to split input vs output rows) | Engine ready, no recipe/BOM table |
| Guest / event organiser records | Existing party/customer master | Ready — reuse, do not create a new guest master |
| Booking confirmations, instalment reminders | SMS module | Ready |
| Decoration / subcontract cost | Supplier + expense vouchers | Ready |
| Asset branch transfer | `asset_ledger`, `asset_issue_masters/_details`, `asset_received_masters/_details` | Ready, 0 rows |
| Item marked as an asset | `product_types` rows: 1=Asset, 2=Non Asset, 3=Inventory, 4=Raw Materials; `product_items.product_type` points at it | Partial — type exists, per-unit register does not |

### 3.2 Exists but broken / incomplete

- **`acc_financial_years`** — 1 row only, and it is corrupt: `display_name` = "2017-18",
  `start_date` = 2021-04-06, `end_date` = 2018-12-30 (end before start). Must be
  cleaned before anything depends on it.
  Columns: `id, company_id, financial_year_type_id, start_date, end_date, display_name, status`.
- **`acc_financial_year_types` — the name and the contents do not match.** Its 3 rows
  are `Active`, `Inactive`, `Process` — statuses, not year types. Nothing in it says
  "July–June" or "Jan–Dec", which is what §7 item 8 has to be answered into. The
  table's purpose has to be settled, not just its data.
- **`'financial_year_id' => 1` is hardcoded in 83 places across 20 files** — counted,
  not estimated (`app/Helpers/helpers.php`, `CommonFunction/AccountsTransaction.php`,
  `ReturnTransaction.php`, every Inventory controller, the Realestate controllers,
  `Tourism/TourismVisitorController.php`, `Products/ItemUploadController.php`).
- **The design in §2.4 and the schema disagree.** §2.4 says FY is never stored on the
  transaction. `main_trx_master` indeed has no such column — but
  **`acc_transaction_master` does**, and that is the column those 83 writes fill with
  `1`. So "derive it" is not the whole answer: something has to be decided about the
  column that already exists.
- **No existing voucher falls inside the one FY row.** Checked on the dev database:
  7,219 vouchers, dated 2026-03-16 to 2026-08-21; the FY row covers 2021-04-06 to
  2018-12-30. **Zero** fall inside it. Turning on a derived-FY lookup today would
  leave every voucher with no year at all, so phase 0 has to decide what happens to
  the vouchers already recorded — not only fix one row.
  *(Counted on `cashbookbdeworlddb`, the local dev database. The client's own figures
  will differ; the corrupt row and the 83 hardcodes are code and schema, so they
  hold either way.)*
- **`business_type`** — 8 rows (General Business, LP Gas, Auto Rice Mill, Computer &
  Accessories, Tourism, Commission Agent, Construction, Trade). **No Hotel, no Resort.**

### 3.3 Does not exist anywhere

- Any depreciation logic — the string `depreciat` appears nowhere in the codebase.
- Any recipe / formula / BOM table.
- Any room, hotel, booking, hall, guest, folio, ticket or amenity table.

### 3.4 Structural template

The **Realestate module** (18 controllers) is the closest analogue:
`Project → Building → Floor → Unit/Flat → UnitSale → UnitSalePayment`
maps to `Property → Block → Floor → Room/Hall → Booking → Payment`.
Tables: `projects`, `buildings`, `flats`, `building_units`, `garages`,
`project_areas`, `unit_sales_master`, `unit_sales_items`, `unit_sale_payments`,
`unit_sale_nominees`, `unit_charge_types`, `unit_price_breakdowns`.

**But do not copy its sale semantics.** A flat is sold once; a room is booked
repeatedly over date ranges. Real estate's "this unit is sold" flag does not apply.

The React screen `real-estate/flat-layout` already renders a unit grid and is a
usable starting point for the floor-plan view.

### 3.5 Adjacent modules worth knowing about

- `air_sales_masters` / `air_sales_details` — travel-agency air ticketing skeleton
  (PNR, journey date, route, airline, vendor cost vs client price). 0 rows.
  **Not** what the resort ticketing means — that is gate entry.
- `tourism_master` / `tourism_details`, `visa_master` / `visa_details` — manpower /
  visa processing (passport, visa expiry, job category, cost per person). 0 rows.

---

## 4. Table list — 44 new tables

Prefixes follow the existing convention (`hrm_`, `inventory_`, `asset_`, `material_`):
`booking_`, `hotel_`, `event_`, `catering_`, `ticket_`.

All names below were checked against the 203 existing tables — **no collisions**.

Legend: 🆕 new · ✅ exists · 🔧 exists, needs change

### 4.1 Financial year — phase 0

| Table | | Holds |
|---|---|---|
| `acc_financial_year_types` | ✅ | FY type (Jul–Jun, Jan–Dec) |
| `acc_financial_years` | 🔧 | FY list — *fix the corrupt row, add index* |
| `acc_financial_year_locks` | 🆕 | Which year/branch is locked, by whom, when |
| `acc_financial_year_closings` | 🆕 | Year-end closing → next year opening transfer |

### 4.2 Booking engine — phases 2–3 (the largest block)

**Master data**

| Table | | Holds |
|---|---|---|
| `booking_resource_types` | 🆕 | room / hall / community centre / ticketed item |
| `booking_resources` | 🆕 | **Central list of everything bookable**, incl. `allocation_mode`, and — per §2.5 — a `parent_id` so a seat can point at its room, a sold-whole-or-by-seat flag on the room, and an active flag (seats are deactivated, never deleted) |
| `hotel_room_types` | 🆕 | Standard/Deluxe/Suite, capacity, base rate |
| `hotel_floors` | 🆕 | Floor list (for the floor-plan view) |
| `booking_slots` | 🆕 | Morning/afternoon/evening slots for halls & centres |
| `booking_rate_plans` | 🆕 | Season / holiday / corporate rate cards |
| `booking_rate_details` | 🆕 | Date-wise rates inside a plan |
| `booking_charge_types` | 🆕 | Extra charge types + their COA head |

**Transactions**

| Table | | Holds |
|---|---|---|
| `booking_master` | 🆕 | Guest, dates, status, `main_trx_id` |
| `booking_resource_details` | 🆕 | Which resource, from when to when — ⚠️ **overlap lock lives here** |
| `booking_guests` | 🆕 | NID/passport + address (police guest register) |
| `booking_payments` | 🆕 | Advance, instalments, final settlement |
| `booking_folio_details` | 🆕 | Bill lines — rent, restaurant, laundry, VAT, service charge |
| `booking_cancellations` | 🆕 | Cancellation, refund, retained charge |
| `booking_status_logs` | 🆕 | Status history — who, when |
| `booking_night_audit_runs` | 🆕 | Per-night auto-posting record (idempotency guard) |

### 4.3 Housekeeping & amenities — phase 5

| Table | | Holds |
|---|---|---|
| `hotel_housekeeping_status` | 🆕 | Current state per room |
| `hotel_housekeeping_logs` | 🆕 | Cleaning history, assigned staff |
| `hotel_amenity_kits` | 🆕 | Standard kit per room type (header) |
| `hotel_amenity_kit_items` | 🆕 | Which product, how many, per kit — plus whether the quantity is **per room or per guest** (§6.1) |
| `material_issue_master` | 🔧 | ✅ exists — add a floor/department reference column |
| `material_issue_details` | ✅ | Unchanged, use as-is |

### 4.4 Events / community centre — phase 6 *(motel site only)*

| Table | | Holds |
|---|---|---|
| `event_types` | 🆕 | Wedding, gaye holud, birthday, seminar |
| `event_details` | 🆕 | Extends `booking_master` — guaranteed vs actual pax |
| `event_service_details` | 🆕 | Decoration, stage, sound — supplier and cost |
| `event_asset_usages` | 🆕 | Chairs/tables/generator used, and return check |

### 4.5 Catering — phase 7 *(motel site only)*

| Table | | Holds |
|---|---|---|
| `catering_packages` | 🆕 | Package and per-plate rate |
| `catering_menu_items` | 🆕 | Dishes — kacchi, borhani, jorda |
| `catering_package_items` | 🆕 | Which dishes in which package |
| `catering_recipes` | 🆕 | Recipe header (per how many plates) |
| `catering_recipe_items` | 🆕 | Raw material and quantity per dish |
| `catering_event_plans` | 🆕 | Estimated raw material = recipe × plates |
| `catering_consumptions` | 🆕 | Actual consumption and cost posting |

### 4.6 Ticketing — resort site only

| Table | | Holds |
|---|---|---|
| `ticket_items` | 🆕 | Entry, pool, boat, each ride — name, price, COA head |
| `ticket_capacities` | 🆕 | Date-wise capacity and sold count |
| `ticket_sales_master` | 🆕 | Sale header, `main_trx_id` |
| `ticket_sales_details` | 🆕 | Which item, how many |
| `ticket_issued` | 🆕 | Unique number per ticket + used/unused state |
| `ticket_scans` | 🆕 | Gate verification log (when QR goes live) |

Dropped from the earlier draft because pricing is single-rate: a price-rules table,
and a separate attractions table (merged into `ticket_items`).

### 4.7 Assets & depreciation — phases 8–9

| Table | | Holds |
|---|---|---|
| `asset_categories` | 🆕 | Category, default rate, useful life, COA head pair |
| `asset_register` | 🆕 | **Per-unit asset record** — tag, acquisition date and cost |
| `asset_depreciation_runs` | 🆕 | Monthly run header (idempotent + reversible) |
| `asset_depreciation_details` | 🆕 | Per-asset depreciation for that month |
| `asset_disposals` | 🆕 | Sale / write-off, gain or loss |
| `asset_ledger`, `asset_issue_*`, `asset_received_*` | ✅ | Branch transfer — unchanged |

### 4.8 No new table needed

| Need | Use |
|---|---|
| VAT %, check-out time, cancellation policy | Existing `metas` table + `meta()` helper |
| Screen permissions | **Rows** in the existing permission table |
| "Hotel" / "Resort" business type | Rows in `business_type` |
| Guest / organiser records | Existing party/customer master |
| Warehouse, requisition, vouchers | All already exist |

**Count:** 44 new · 2 modified · 8+ reused.

---

## 5. Accounting entries

| Event | Debit | Credit |
|---|---|---|
| Advance received | Cash / Bank | Advance Against Booking (liability) |
| Service rendered (per night / event day) | Advance / Customer | Room Rent Income / Hall Rent Income |
| Catering served | Customer | Catering Income |
| Ticket sold | Cash / Customer | Ticket Income (per `ticket_items` head) |
| Raw material purchased | Raw Material Stock | Supplier / Cash |
| Transfer to kitchen | Kitchen Stock | Main Store Stock |
| Raw material consumed | Catering Production Cost | Kitchen Stock |
| Amenity purchased | Guest Supplies Stock | Supplier / Cash |
| Amenity issued / used | Guest Supplies Expense | Guest Supplies Stock |
| Decoration / subcontract | Event Operating Cost | Supplier / Cash |
| Monthly depreciation | Depreciation Expense | Accumulated Depreciation |
| Booking cancelled | Advance Against Booking | Cash (refund) + Cancellation Income |

Accumulated depreciation is a **separate contra-asset head** — never reduce the
asset head directly, so the balance sheet can show cost, accumulated depreciation
and net book value separately.

---

## 6. Business rules

### 6.1 Confirmed

- **Guaranteed plates:** `billable plates = MAX(guaranteed_pax, actual_pax)`.
  Store both numbers separately.
- **Ticket pricing:** one rate per ticket item. No child / group / member tiers.
  *(Adding tiers later is ~2–3 days; do not pre-build it.)*
- **Ticket capacity:** treat everything as a daily limit initially. Per-slot and
  per-unit limits (e.g. 8 boats × 30 min) can come later.
- **QR:** generate a unique number per issued ticket **now** (near-zero cost), print
  it as a QR, and track used/unused to prevent reuse. Gate scanning can use the
  existing Android app — no new hardware.
- **Resort has no weddings/events** — the `event_*` and `catering_*` modules ship
  but stay toggled off on that site.

**Seat-wise rooms** *(client decisions, 2026-08-23 — see §2.5 for the model)*

- **A room carries no gender of its own. The first guest of a night sets it, and
  every other seat that night must match.** When they all leave, it is free again.

  Nothing is stored on the room — the rule is answered from the bookings each time,
  so a cancellation releases it with no cleanup. "Others" needs no rule of its own:
  everyone matches the first, whatever the first is.

  Three things this forces:

  **It is asked per night, not per room.** A guest on the 15th–17th and a guest on
  the 16th–18th share only two nights; on the 18th the second guest is the first
  occupant and sets the gender. So the check runs over **every night of the range
  asked for**, not the first — otherwise a three-night booking clears on night one
  and collides on night three.

  **Whole-room bookings are exempt.** A husband and wife, or a family, take the whole
  room and are mixed inside it. The rule applies only where seats are sold
  separately. Left unsaid, the code will turn families away.

  **Unknown gender blocks everything.** Under "match the first", unknown is not male
  and not female, so one unknown guest closes the room for that night to everyone.
  All 197 parties on the dev database have `sex` NULL, and the branch switch
  `need_customer_sex` is `'0'` — the field is not even on the form. Switched on as it
  stands, every dormitory room would shut after its first seat. See §6.2.

  Where the gender comes from is the party record, as the client asked. Note that
  **the booker and the occupant are not always the same person** — a father books
  three seats for three students. The rule has to read the occupant's gender from
  `booking_guests` (which exists for the police register), not the booking's payer.
- **A room can be converted between whole-room and seat-wise at any time, but not
  while it is booked.** Management is not tied to a season calendar; the block is a
  booking, not a date. *(What exactly "booked" locks is still open — §6.2.)*
- **Amenity kits carry both bases.** Every kit item is either per-room (tissue box,
  curtain wash) or per-guest (soap, towel, comb). Expected use for a night is
  `room items × 1 + guest items × guests that night`.
  Occupancy in a dormitory changes from night to night, so the phase-5 variance
  report must compute this **per night**, not once per stay — a three-night booking
  with four guests one night and two the next will not otherwise reconcile.
- **Housekeeping status stays at room level**, with a "partial" state added: some
  seats turned over, others still occupied.
  *Noted for the build:* "partial" is an occupancy fact, not a cleaning one — a room
  can be partly occupied *and* dirty at once. What the housekeeper actually needs is
  **which seats changed hands**, and that is already in the booking data. Consider
  keeping the status column as it is and answering that question on the work list
  instead of widening the column.
- **A room-level charge is split across the guests in that room.** Damage, an extra
  blanket, room service billed "to the room".
  Four things this forces: the charge needs **a date** (it splits across whoever was
  there *that night*); a **rounding rule** for the remainder (100 ÷ 3); a rule for a
  charge arriving **after somebody has settled and left**; and the split should be the
  **default rather than the only option** — at the desk, damage is usually put on one
  person's name.

### 6.2 Not yet known — needed before schema work

- **VAT and service charge** — hotels in Bangladesh typically charge 15% VAT + 10%
  service charge. On the rent or on the total? What rate on catering? On tickets?
  **This becomes a number in the code — getting it wrong makes every bill wrong.**
- **Rate card rules** — weekend, wedding season, holiday, corporate rates?
- **Cancellation percentages** — how much is refundable at 30 / 15 / 7 days.
- **Check-in / check-out times** and early/late charges.
- **The client's actual COA heads** — do "Room Rent Income" etc. exist, or must they
  be created?

**Seat-wise rooms — open, and each one blocks schema work** *(2026-08-23)*

- **Is the guest's gender required before a seat can be booked?** The rule itself is
  settled (§6.1) — but it only works if the gender is known, and today none of it is:
  `cust_party_infos.sex` is NULL on all 197 rows, and `need_customer_sex` is `'0'` on
  the branch, so the field is not on the form at all.
  *Recommendation: required for a seat booking, not for a whole room* — a family
  taking a room does not need it, and requiring it everywhere would obstruct the rest
  of the system for a rule that only applies to dormitories. The branch switch has to
  go on for the hotel branch either way.
  Unknown then never arises in a dormitory, and the separate colour the client asked
  for is what marks the old records and the whole-room bookings.
- **How the seat map is read.** The client asked for a colour for unknown gender.
  The map needs at least six states — free, male, female, other, unknown, blocked for
  maintenance. Six colours side by side are hard to tell apart, and red-green is the
  first pair colour blindness takes; a letter or a mark beside the colour makes it
  readable at a glance and survives being printed.
- **What "booked" locks, and for how long.** Three readings, all defensible:
  ever-booked locks forever (too hard); any future booking locks the room until it
  passes (safe, explains itself to staff, but one December booking locks a room from
  August); only the booked dates are locked (flexible, but the mode then needs a
  "from when", which is the season calendar coming back through the side door).
  *Recommendation: the middle one to start. Loosening it later is easy; tightening is
  not.*
- **The two directions are not equally risky, and one rule may not fit both.**
  Whole-room → seat-wise is safe: an existing whole-room booking is simply all the
  seats. Seat-wise → whole-room is not: a guest who paid for one seat would either be
  handed the whole room or be sitting in a room the desk now thinks is private.
  *Worth considering: leave whole → seat-wise always open, and lock only seat-wise →
  whole.*
- **What a conversion actually changes** — the selling rule, or the furniture? A
  four-bed room sold to one family is not the same thing as a room with one bed in
  it, and they do not price the same.
- **Does a guest book a seat, or a kind of seat?** Nobody asks for "seat 3" — they ask
  for "a seat in the women's dormitory". This is the same question as the one on rooms
  above (§7 has it as a room question), and it wants the same answer for both.
  **Sharper now that the gender rule is settled:** since a room has no gender of its
  own until somebody is in it, there is no such thing as "the women's dormitory" to
  ask for. An empty room is neither. So either the desk searches for *a room that is
  already female for those nights, or empty*, or some rooms carry a standing label
  after all — which the client has ruled out. Worth confirming this is understood
  before the availability screen is designed.
- **Rate structure.** A seat rate is not the room rate divided by the seats. Both
  rates are needed, and the relationship between them is a commercial decision.

---

## 7. Open decisions

| # | Question | Recommendation |
|---|---|---|
| 1 | Community centre as its own branch, or a cost centre in one branch? | Own branch — separate P&L for free |
| 2 | Room rent posted per night, or once at check-out? | Per night — daily/monthly income stays correct |
| 3 | Amenities: auto per check-in, or periodic batch issue? | Batch issue primary; kit is only the yardstick for variance |
| 4 | Depreciation: straight-line, reducing balance, or both? | Both — NBR tax filing needs reducing balance |
| 5 | Recipes/BOM in phase 1 or later? | Later — keeps the first release close |
| 6 | FY stored on the transaction, or derived from `vr_date`? | Derived (see §2.4) |
| 7 | Cancellation refund policy | Configurable in settings |
| 8 | FY start date — 1 July / 1 January / other? | Client's existing practice |
| **OPEN-3** | **Does the resort have a restaurant, or is food inside the stay package?** | **Unanswered.** If a restaurant, reuse the existing sales module — no new tables |
| **OPEN-9** | Do walk-in gate ticket sales go through `booking_master`, or their own tables? | Hybrid: shared master data and capacity check; walk-in cash sale in `ticket_sales_*` (it behaves like POS); advance group booking (e.g. a school booking 300 for Friday) through `booking_master` |

---

## 8. Phases and effort

One full-time developer, 5 working days per week. Includes analysis, DB, backend,
frontend and internal testing.

| Phase | Work | Days | Week |
|---|---|---|---|
| 0 | Financial year setup + fix corrupt data | 7 | 1–2 |
| 1 | FY filter across existing reports | 4 | 2–3 |
| 2 | Bookable resource masters (room, hall, centre) | 9 | 3–4 |
| 3 | Booking engine, advance, double-booking lock | 17 | 5–8 |
| 4 | Visual views — floor grid, timeline, month calendar | 9 | 8–10 |
| 5 | Amenity issue, kits, variance report | 5 | 10–11 |
| 6 | Event management + catering booking | 9 | 11–12 |
| 7 | Recipes + planned-vs-actual analysis | 9 | 13–14 |
| 8 | Asset register + categories | 7 | 14–16 |
| 9 | Depreciation + monthly run | 9 | 16–17 |
| 10 | Dashboard + KPIs (occupancy, ADR, RevPAR) | 5 | 18 |
| 11 | UAT, training, data entry, go-live | 10 | 19–20 |
| | **Site 1 subtotal** | **100** | **20 weeks** |
| T1 | Ticketing module (6 tables) | 14 | |
| T2 | Terminology layer | 3 | |
| T3 | Second install + configuration | 4 | |
| | **Total both sites** | **~121** | **~24 weeks ≈ 6 months** |

QR scanning, if added later: **+4 days**.

Two developers in parallel: roughly 13–15 weeks. Phases 0 and 2 must still finish
first — everything else depends on them, so it does not halve.

**Release plan:** R1 = phases 0–4 (46 d, first usable release) · R2 = phases 5–7
(23 d) · R3 = phases 8–9 (16 d) · R4 = phases 10–11 (15 d) · then T1–T3 for the
resort site.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Double booking** | Guest conflict, reputational damage | DB-level `SELECT … FOR UPDATE` inside the transaction. A PHP-only check passes both concurrent requests. This is the single most important correctness requirement in the project. |
| **Counting rooms and seats separately** | A second route to double booking, and a silent one | Seats are the only inventory (§2.5). Whole-room availability is derived from them, never stored beside them. Two counters would eventually disagree, and nothing on screen would say which was right. |
| **Two strangers of different genders in one room** | A complaint at the desk, at best | The rule is in §6.1: the first guest of a night sets the room, the rest must match, and it is checked on every night of the range. The engine refuses the booking — a policy document cannot. **It is only as good as the gender data, which is empty today** (§6.2). |
| **Forking the code for the resort** | Two divergent products within months | Differences via settings only. Never copy the repo. |
| **Schema drift between the two databases** | The installs silently diverge | The project changes schema with **raw SQL, not migrations** (see §10). With two installs, every change must run in both. A tracking method is needed before the second install exists. |
| Advance treated as income | Year-end P&L wrong | Liability head, converted on service |
| Depreciation run twice | Doubled expense | Run header + idempotency guard |
| Ticket volume | Thousands of rows/day | Index and archive plan for `ticket_issued` / `ticket_scans` |
| Staff not adopting the flow | Data incomplete, reports useless | Design around what staff actually do (e.g. batch amenity issue, not per-room taps) |

---

## 10. Project conventions to follow

Learned from this codebase — ignoring these causes real breakage.

- **Schema changes are raw SQL**, placed in `database/sql/` as
  `YYYY_MM_DD_description.sql`. Laravel migrations are not used.
- **Run `route:clear` after adding API routes**, or they 404.
- **Laravel 12:** middleware aliases go in `bootstrap/app.php`. `Kernel.php` is dead.
- **`can()` throws** — the `user_permissions` table is missing, so `can()` raises a
  `QueryException`. Use `CompanyRoleScope` instead.
- **Enum status columns compare as strings** — e.g. `acc_coa_level4s.status` needs
  `'1'`; `status != 0` filters nothing.
- **Settings from `metas` are text `'0'`/`'1'`, or boolean `false` if never saved.**
  In React, never use a bare `&&` on them — go through `isBranchSettingOn()` /
  `settingOn()` in `userFeatureSettings.ts`.
- **One control height:** `FIELD_HEIGHT` drives every field and button. No `h-*`
  classes at call sites.
- **Voucher approval** lives on `main_trx_master.is_approved`. The
  `acc_transaction_master` twin is never set.
- **Querying the dev DB:** no mysql client is installed. Use Herd's PHP with PDO,
  parsing `.env` manually (`parse_ini_file` fails on it).
- **Do not commit or push** unless explicitly asked.

---

## 11. Next steps

1. Answer §6.2 — **VAT / service charge** above all, and now also **whether a seat
   booking may be taken without the guest's gender**, since the rule agreed in §6.1
   cannot work on the data as it stands. Then the open items in §7, including
   **OPEN-3** (resort restaurant).
2. **Re-estimate phase 0.** It is costed at 7 days, which was set before §3.2 was
   re-checked. It now also has to settle what `acc_financial_year_types` is for,
   decide the fate of 83 hardcoded writes, and place 7,000+ existing vouchers into
   years that do not yet exist. Phase 1 (4 days) sits on top of it.
3. Produce the technical design for phases 0–3 — full columns, indexes and
   `CREATE TABLE` SQL for the ~22 tables involved. Not all 44 at once: the design
   will shift once the first phase is actually built.
4. Update the client `.docx` to cover both sites and ticketing, if the client needs
   the wider scope on paper. It does not mention seat-wise rooms either.
5. **Wait for an explicit go-ahead before writing any code.**
