# Hotel / Motel + Resort Booking & Ticketing — Working Spec

> **Status: building. Step 1 is done.** The go-ahead was given on **2026-08-24**
> and the five master tables of §8.1 — `hotel_buildings`, `hotel_floors`,
> `hotel_room_types`, `booking_resource_types`, `booking_resources` — are built,
> along with their API and a four-tab setup screen. See **§12** for exactly what
> exists and what was deliberately left out.
>
> **Phase 0 (financial year) was NOT done first**, against the order in §11.
> The reasoning is in §12: phase 0 is a refactor of code running on fifteen live
> sites, the hotel module does not depend on it, and starting a new module with
> the riskiest change in the project buys nothing.
>
> **Rent lives on the room, not on the room type** — the client's instruction of
> 2026-08-24. It changes §4.2 and §6.6 and is written up as **§2.8**.
>
> **2026-08-25:** two small things on the setup screen — the Layout tab can hide
> the rooms that are switched off, and a floor of rooms can be created in one go
> rather than one form at a time. Both are **§14**.
>
> **2026-08-25 (later): the booking engine has started.** `booking_master` and
> `booking_resource_details` are built — tables 6 and 7 of §8.1 — and with them the
> overlap lock, which is **§15**. ⚠️ **This changes §9.** The lock is a UNIQUE key
> on one row per seat per night, not `SELECT … FOR UPDATE` over a date range; the
> reasoning is in §15 and the risk table has been corrected. Nothing is billed and
> nothing is posted — OPEN-12 still blocks that, and screen 5 with it.
>
> **2026-08-25 (later still): a hotel can now be booked from the browser.**
> Screens 2 and 3 of §8.1 — availability and the booking form — are built as one
> screen under a new **Hotel ▸ Bookings** menu, together with the controller
> behind them. **§16.** Whole rooms only, and the first of the two stages of
> §6.5 only: guests, allotment, check-in, billing and check-out are still to come.
>
> **2026-08-25 (last): the second stage is built too.** `booking_guests` — table 8
> — and an allotment panel over the bookings list: names, mobiles, NIDs, gender and
> ages, room by room, on the day the guests arrive. **§17.** That is screens 2, 3
> and 4 of §8.1 done. Screens 5 and 6 — the bill and check-out — remain, and
> **OPEN-12** still blocks 5.
>
> **2026-08-25 (really last): the booking screen draws the property.** The
> availability picker is now the SAME elevation grid the setup screen's Layout
> tab draws, painted by what is free rather than by room type, and a booking's
> state is a chip in the list in those same colours. **§18.**
>
> **2026-08-25 (truly last): a dormitory can be booked bed by bed.** The last
> thing §16 had deliberately left out. Rooms and beds now sell side by side, and
> one booking may hold both. **§19.**
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
>
> **2026-08-24 (later):** **recipes are dropped** — catering is sold as a service, not
> costed dish by dish (§4.5, §6.7). Four tables and phase 7 go with them; the count
> falls to **43**. The kitchen is still the client's own, so material is issued by hand
> through the existing module, and one nullable column on that module — which event an
> issue was for — keeps per-event cost available without any recipe. That column is the
> only part of this that cannot be added later.
>
> **2026-08-24:** four more things settled — where a room physically lives (§2.7,
> §6.6: buildings and floors, **never** branches), the booking form and the
> **two-stage** flow that fills it (§6.5: brief at booking, guest details at
> allotment), how children are counted, and what the **first working release**
> actually is (§8.1 — six screens, thirteen tables, not forty-seven).
>
> **Newest (2026-08-23, later the same day):** billing and booking type are settled
> as an approved **standard** — §6.3 and §6.4. Two tables were added for them (§4.2,
> count now 46), and §5 gained the entries they imply. The one thing that cannot be
> standardised, because it is a matter of law rather than preference — whether VAT
> falls due when an advance is received — is now **OPEN-12** in §7 and **blocks
> billing code**.

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

### 2.7 A building is a location, never a branch

*(Added 2026-08-24, on the client's answers: buildings and floors are open-ended and
will grow; the books are **not** kept separately per building.)*

```
branch = the hotel/property     (no table -- the branch already is this)
 └─ building                    hotel_buildings
     └─ floor      (optional)   hotel_floors
         └─ room                booking_resources
             └─ seat            booking_resources, via parent_id (§2.5)
```

**The top two levels are locations and are never bookable; the bottom two are the
inventory.** Keeping them in separate tables is the point: a building can then never
leak into an availability query, which it could if locations shared
`booking_resources` and one query forgot the filter.

**No project level.** The Realestate module's `Project → Building → Floor → Unit`
was only ever a shape to borrow. A hotel has no project above its buildings — the
branch is the property. A second hotel would be a second branch (or a second
install), not a second building.

**The floor is optional.** A resort's scattered cottages have no floors; there the
building row is a zone and the floor is left empty. Same table, same code — no
invented floors.

**Buildings must not be modelled as branches.** The temptation is real, because
branches already exist. But a branch carries its own accounting, its own financial
year and its own vouchers, so one hotel's books would split in two. The client has
said the books stay together.

Nothing is lost by this: because every room records its building, building-wise
occupancy and income come out as report filters, at no cost. *Not keeping separate
books is not the same as not being able to see them separately.*

### 2.8 Rent lives on the row that is sold

*(The client's instruction, 2026-08-24: **"একেকটি রুম বা সিট এর ভাড়া দেয়া থাকবে"** —
each room, and each seat, carries its own rent. It supersedes what §4.2 and §6.6
said, and both now point here.)*

**The rent that is charged is `booking_resources.rent`** — one number per row,
meaning what *that row* costs for one unit of its type's rate unit.

| Row | What its `rent` means |
|---|---|
| Room | The **whole room**, for one night |
| Seat | **That bed**, for one night |
| Hall / centre | One **slot** |

Room 101 and room 102 can both be "Deluxe" and cost different money. Before this,
a difference in price meant inventing a room type to hold it (§6.6); it no longer
does.

**A room has two rents, not one — and they live on different rows.** §6.2 already
said a seat rate is not the room rate divided by the beds: both are commercial
decisions and the client makes each separately. Keeping them on separate rows is
what stops anybody summing one into the other. Which of the two is required
follows the room's `sale_mode`:

| `sale_mode` | Room row's rent | Seat rows' rent |
|---|---|---|
| `whole` | **required** | empty |
| `seat` | empty | **required** |
| `both` | **required** | **required** |

The unused one is left **NULL, never zero**. A dormitory that is never let whole
has no whole-room price, and a zero would read as *free* on the first bill that
used it — and print as one.

**`hotel_room_types` keeps rents, renamed `default_*`.** They are read in exactly
one place: filling the room form in when a type is chosen. Editing "Deluxe" from
3,000 to 3,500 moves **no existing room**. That is the point rather than a
limitation — a type whose rent *was* the price would silently reprice a hotel the
moment somebody corrected a typo in it, and every bill already printed against
those rooms would stop reconciling. The save says so out loud, because whoever
edits that number is very often trying to do the thing it will not do.

**The rate unit is a fact about the kind, not the room** — a room is priced by the
night and a hall by the slot. It sits on `booking_resource_types.rate_unit`, so
the booking engine never has to guess and no room has to repeat it.

**Nothing here is what a bill is built from.** The §6.3 rule holds unchanged: a
booking stores the rent it was confirmed at, and a folio line stores the rate, the
base and the tax as applied. Raising a room's rent tomorrow must not reprint last
month's bill at the new figure. This table is the default for the **next** booking.

**⚠️ Open — which rent a future booking gets.** A booking taken in June for a
December stay: the rent as it stood at confirmation, or as it stands on the night?
*Recommendation: locked at confirmation*, because that is what the guest was told,
and a rate rise between the two must not follow them. Seasonal properties do run
the other way, so the client should confirm it. Not blocking: it is a rule the
booking engine applies, not a column.

**Season, holiday and corporate rates (`booking_rate_plans`) still sit on top**,
as an override, with the room's own rent as the fallback. No schema change when
they arrive.

**An extra bed is a charge line, never part of the rent** (§6.5), so the money
stays visible.

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

**And drop the project level** — see §2.7. The mapping above is a shape to borrow,
not a hierarchy to reproduce: the branch is the property, and buildings hang off it
directly.

*Worth telling whoever builds this:* in the Realestate schema `flats` is the **floor**
level, not a flat (`buildings → flats → building_units`). The name misleads. The
hotel tables say `hotel_floors`, which does not.

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
| `booking_resources` | 🆕 | **Central list of everything bookable**, incl. `allocation_mode`, and — per §2.5 — a `parent_id` so a seat can point at its room, a sold-whole-or-by-seat flag on the room, and an active flag (seats are deactivated, never deleted). Also `building_id` (required) and `floor_id` (optional) — where the room is, per §2.7. Both are held because the floor is optional; a save must check the two agree |
| `hotel_room_types` | 🆕 | Standard/Deluxe/Suite, capacity, and **suggested** rents. ⚠️ **Superseded in part by §2.8:** the rent that is charged now lives on the room, so these are `default_*` columns that fill the room form in and are read nowhere else. A second building pricing differently no longer *needs* to be a room type of its own, though it may still be one |
| `hotel_buildings` | 🆕 | Buildings, or zones on a resort, under the branch — §2.7. Unlimited: adding one is a row, never a schema change |
| `hotel_floors` | 🆕 | Floors within a building — **optional**, for the floor-plan view. Scattered cottages have none |
| `booking_slots` | 🆕 | Morning/afternoon/evening slots for halls & centres |
| `booking_rate_plans` | 🆕 | Season / holiday / corporate rate cards |
| `booking_rate_details` | 🆕 | Date-wise rates inside a plan |
| `booking_charge_types` | 🆕 | Extra charge types + their COA head |
| `booking_tax_rates` | 🆕 | VAT and service-charge rate per charge type, **with an effective date range** — see §6.3. Rates move; a single stored number reprints old bills wrongly |

**Transactions**

| Table | | Holds |
|---|---|---|
| `booking_master` | ✅ | Guest, dates, status, `main_trx_id`. Also — per §6.4 — `booking_type`, `billed_to_party_id` (who owes, which is not always who stays), `payment_terms`, and `hold_until` for a tentative hold. Per §6.5 it also carries the **stated** counts taken at booking — rooms, adults, children — kept apart from what was actually allocated |
| `booking_resource_details` | ✅ | **One row per seat per night** — ⚠️ **the overlap lock lives here**, as `UNIQUE(resource_id, stay_date)`. Not a from–to range: see §15 for why that changed. Carries the rent confirmed for that night, how it was let, and the occupant's gender for the §6.1 rule |
| `booking_guests` | 🆕 | NID/passport + address (police guest register). May be empty at booking time and filled at check-in — a rooming list usually arrives late |
| `booking_payments` | 🆕 | Advance, instalments, final settlement |
| `booking_folio_details` | 🆕 | Bill lines — rent, restaurant, laundry, VAT, service charge. Each line stores **the rate, the base amount and the tax amount as applied** (§6.3); a bill is read back, never recomputed |
| `booking_bill_transfers` | 🆕 | One row per time a bill is moved to another party — from, to, amount, voucher, by whom, when (§6.4) |
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
| `material_issue_master` | 🔧 | ✅ exists — add a **location** reference (§6.6), and a **nullable booking reference** so a kitchen issue can say which event it was for (§6.7). The table already carries `project_id` for construction; the booking is a second, separate reference, not a reuse of that one |
| `material_issue_details` | ✅ | Unchanged, use as-is |

### 4.4 Events / community centre — phase 6 *(motel site only)*

| Table | | Holds |
|---|---|---|
| `event_types` | 🆕 | Wedding, gaye holud, birthday, seminar |
| `event_details` | 🆕 | Extends `booking_master` — guaranteed vs actual pax |
| `event_service_details` | 🆕 | Decoration, stage, sound — supplier and cost |
| `event_asset_usages` | 🆕 | Chairs/tables/generator used, and return check |

### 4.5 Catering *(motel site only)*

| Table | | Holds |
|---|---|---|
| `catering_packages` | 🆕 | Package and per-plate rate |
| `catering_menu_items` | 🆕 | Dishes — kacchi, borhani, jorda |
| `catering_package_items` | 🆕 | Which dishes in which package |

**Recipes were dropped on 2026-08-24** — the client's decision: catering is sold as a
service, not costed dish by dish. Four tables went with them (`catering_recipes`,
`catering_recipe_items`, `catering_event_plans`, `catering_consumptions`) and phase 7
went with those. The three left are what it takes to price a package and print what
is in it.

The kitchen is the client's own, so raw material still has to reach cost — see §4.3.
Material is issued by hand into the kitchen through the module that already exists; no
recipe is involved. What is lost is only the **expected** figure: how much *should*
have been used. The **actual** figure is not lost, provided each issue records the
event it was for (§6.7).

Recipes are self-contained — a later change of mind costs the same nine days it would
have cost now, and nothing already built has to be undone.

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

**Count:** 43 new · 2 modified · 8+ reused.

*(44 at first draft. `booking_tax_rates` and `booking_bill_transfers` came with the
§6.3 / §6.4 standard on 2026-08-23 and `hotel_buildings` with §2.7 on 2026-08-24,
taking it to 47; the four recipe tables were then dropped on 2026-08-24 (§4.5),
bringing it to 43. All three added names were checked against the dev database —
203 tables, no collision.)*

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
| Raw material consumed | Catering Production Cost | Kitchen Stock *(posted at manual issue — no recipe, §6.7)* |
| Amenity purchased | Guest Supplies Stock | Supplier / Cash |
| Amenity issued / used | Guest Supplies Expense | Guest Supplies Stock |
| Decoration / subcontract | Event Operating Cost | Supplier / Cash |
| Monthly depreciation | Depreciation Expense | Accumulated Depreciation |
| Service charge on a bill | Customer | Service Charge Income *(§6.3 — income, not a sum held for staff)* |
| VAT on a bill | Customer | VAT Payable *(liability — never an income head)* |
| Bill moved to another payer | New payer (e.g. the company) | Original payer (the guest) |
| Booking cancelled | Advance Against Booking | Cash (refund) + Cancellation Income |

The bill-transfer entry moves **the outstanding balance only** — money already received
stays credited to whoever paid it (§6.4). It is a voucher, not an `UPDATE`: without one,
a receivable vanishes from one party's ledger and appears in another's with nothing on
any screen saying why.

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

- **VAT and service charge — the structure is now settled (§6.3); the rates are not.**
  This entry used to say *"this becomes a number in the code"*, and that was the wrong
  instinct — see §6.3 for why a rate table with effective dates replaced it. What is
  still missing is the rates themselves, and they have to come from the client's VAT
  registration rather than from a general figure. The remaining questions are listed
  at the end of §6.3; one of them, **OPEN-12**, blocks billing code outright.
- **Rate card rules** — weekend, wedding season, holiday, corporate rates?
- **Cancellation percentages** — how much is refundable at 30 / 15 / 7 days.
- ~~**Check-in / check-out times**~~ — ✅ **settled 2026-08-25, §21.** A per-branch
  setting with 12:00 / 14:00 as the standing default until the client says
  otherwise. **Early and late charges are still open** and are not built.
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

### 6.3 Billing standard — VAT, service charge, rounding

*(Approved by the client 2026-08-23. This is the default the system ships with; a
client who wants something else changes the settings marked below. The rates are
still missing — the shape they go into is not.)*

**Rates live in a table, not in a setting.** `booking_tax_rates` holds one row per
charge type per rate, **with an effective date range**. The reason is that these
rates move — hotel and restaurant rates in Bangladesh have changed more than once
in recent years, sometimes mid-year. A single stored number means a bill reprinted
next August comes out carrying today's rate, which is the first thing an audit finds.

**A bill line stores what was applied, not a pointer to it.** Every
`booking_folio_details` row carries the rate, the base amount and the tax amount as
they stood when the bill was made. Bills are read back, never recomputed.

**Order of calculation:**

```
service charge = rent × SC%
VAT            = (rent + service charge) × VAT%
total          = rent + service charge + VAT
```

Rent 1,000 at 10% service charge and 15% VAT is **1,265**, not 1,250 — the service
charge is part of the hotel's own takings, so VAT falls on it too. *(Confirm with the
client's VAT consultant; this is the common practice, not a certainty.)*

| | Standard | |
|---|---|---|
| Rate card prices | Quoted **VAT-exclusive** — tax is its own line on the bill | setting |
| Service charge | **Income**, to its own head. If it is later distributed to staff that is a separate expense, not a reduction of income | setting |
| VAT | **Liability** — `VAT Payable`. Never an income head | rule |
| Rounding | Once, on the bill total, to the nearest 1 taka | setting |
| Rates as shipped | **Zero, with a setup warning** — not 15% | rule |

That last row is deliberate. A guessed rate prints wrong bills silently; a zero rate
is visible on the first bill and somebody asks.

**⚠️ The one thing that cannot be standardised.** Whether VAT falls due when an
**advance is received** or when the **service is given** is a matter of law, not of
preference. The standard assumes *at service*, which agrees with §2.6 — but if the
law says otherwise, the advance receipt needs a `Cr VAT Payable` line of its own, and
getting it wrong makes both the monthly return and the year-end P&L wrong. Tracked as
**OPEN-12** in §7. **Billing code should not be written before this is answered.**

**Still needed from the client** *(their VAT consultant, not their manager — a manager
will say "15%", and the question is 15% of what)*:

1. VAT registration number and service codes — accommodation, restaurant and tickets
   may not share one.
2. The rate for each head: accommodation / catering / restaurant / hall rent /
   tickets / laundry.
3. Service charge percentage, and which heads it applies to.
4. Confirmation of the calculation order above.
5. **OPEN-12** — VAT on advance, or on service.
6. Is a মূসক ৬.৩ (Mushak 6.3) VAT challan required? Is there an EFD/SDC machine?
   If so the bill *is* that challan, with a mandated format and an unbroken serial —
   separate work, not a print tweak.
7. Is VAT deducted at source on corporate and government bookings (VDS)? If so the
   hotel receives less than it billed, and receivables will never reconcile without it.
8. Is input VAT (rebate) claimed? If so purchase vouchers must separate VAT too, not
   only sales.
9. On a cancellation refund, does the VAT come back?
10. Do `Room Rent Income`, `VAT Payable`, `Service Charge Income` and
    `Advance Against Booking` exist in the client's COA, or must they be created?

### 6.4 Booking type standard

*(Approved by the client 2026-08-23.)*

Three types: **Individual**, **Group**, **Corporate**. A booking is exactly one of
them — the client ruled out a booking being Corporate *and* Group at once. The type
**drives behaviour**; it is not a display label. So what it drives has to be written
down, or it will spread:

| | Individual | Group | Corporate |
|---|---|---|---|
| Bill in whose name | The guest | Whoever booked | **The company** |
| Credit | No | No | **Yes, no limit — pays when it likes** |
| Default advance % | setting | setting (higher) | setting (or none) |
| Cancellation terms | setting | setting (stricter) | Per contract |
| Hold offered | Yes | Yes | Yes |

**Group and Individual run the same code path.** After the client's answers nothing
behavioural is left between them: both are billed to one person, both settle in cash
or advance, both produce one bill. They differ in two *settings* — default advance and
cancellation terms — and in appearing separately on reports. The number of rooms is a
fact about the booking, not a type.

**Corporate is the real division**, because that is where the bill goes to a company
and the money comes later.

**No credit limit** (client's decision). A corporate booking is never blocked for
outstanding balance. That makes the **company-wise ageing report** the only thing
standing between the business and an unnoticed pile of receivables — it is not
optional.

**All charges go on the company's bill** (client's decision) — room, tax, laundry,
minibar, everything. No master/incidental split, so no second folio structure. Lines
stay itemised so the company can see what it is paying for. *(If a split is ever
wanted, the cheap route is a `payer_party_id` on the folio line rather than a second
folio — one list, printed two ways. Not being built now.)*

**Moving a bill to another payer**

Required, including at check-out — *"bill it to my office"* is normal at the desk.
It is not a field edit: the money owed moves from one party to another.

| | Standard | |
|---|---|---|
| Money already received | **Stays with whoever paid it.** Only the outstanding balance moves. 5,000 advance on a 15,000 bill → the company owes 10,000 | rule |
| Re-pricing | **None.** A stay at rack rate stays at rack rate even if the company has a contract rate. What changes is who pays, not what it cost | rule |
| Direction | Both ways. Not because a company will refuse to pay — the client says that will not happen — but because the desk will sometimes pick the wrong company, and without a way back the whole bill has to be cancelled and re-entered | rule |
| Trail | A **voucher** plus a `booking_bill_transfers` row, every time | rule |
| Permission | New: **`booking.bill.transfer`** — manager and above, not the desk | setting |
| VAT challan already printed | See §6.3 item 6 — a printed Mushak 6.3 cannot be reissued in another name; it needs a credit note. Rule pending that answer | open |

Re-pricing is a rule rather than a setting on purpose: allowed, it becomes the back
door for discounts, and the discount appears nowhere in the books.

The permission matters more than it looks. With no credit limit, one click turns a
bill that was going to be settled in cash into an open-ended receivable — that
permission is the only guard left.

**Tentative holds**

| | Standard |
|---|---|
| Default | **7 days**, editable per booking |
| Maximum | 90 days |
| On expiry | The resource is released; the record stays as **expired**, never deleted |
| On advance | A hold with money against it becomes **confirmed** automatically |
| Work list | "Holds expiring within 3 days" — chasing them is the point of the feature |
| On screen | A colour of its own, distinct from a confirmed booking |

Not deleting an expired hold is deliberate: a hold confirmed by telephone but never
entered would otherwise disappear with nothing to show it had existed.

### 6.5 The booking form, and the two stages that fill it

*(Agreed 2026-08-24.)*

A booking and its guest list are **not captured at the same time**. The client raised
this and it matches how the desk actually works:

| Stage | When | What is taken |
|---|---|---|
| **Booking** | On the telephone, days or months ahead | Who is booking · who is billed · dates · **how many rooms** · **how many people** (adults / children) · room type |
| **Allotment** | The day the guests arrive | Each guest's name, mobile, NID (optional) · which room · gender, in a dormitory |

It is **one booking record opened twice**, not two mechanisms — which is why
`booking_guests` was already specified as fillable later (§4.2).

**A stated count still holds real rooms.** "5 rooms" makes the system reserve five
*specific* rooms straight away; the clerk never picks them and can change them later.

The alternative — holding a count and allocating rooms later — puts availability in
two places: free resources *minus* pending counts. That is the §2.5 argument again,
and it ends the same way: the day the two disagree, an 18-room hotel sells 20. The
guest asks by **type**; the system holds a **specific room**. Both are true at once.

**At allotment:**

- **At least one identified guest per room** — ID required for that one, optional for
  the rest. Fully optional endangers the police register; requiring it from everyone
  stops a family of five at the desk for the sake of a rule aimed at one person.
- **One mobile per room** is enough. Twelve numbers for twelve workers will not be
  given, and a required field that cannot be filled gets filled with rubbish.
- **Allotment is piecemeal.** Three of five rooms today, two tomorrow. The screen has
  to show what is still outstanding.
- **The dormitory gender rule is enforced here**, not at booking — the booking held
  counts by gender (§6.1), the allotment matches real people to them.
- **Counts that do not match warn, never block.** Booked for 12, 10 arrive. Keep both
  numbers: what was stated, and what actually came. Amenities and food are computed
  from the actual figure. Same shape as guaranteed vs actual plates.

**A guest is not a customer account.** ⚠️ Guest details live with the booking
(`booking_guests`); the party master is only for whoever **money is owed by** — here
the company, not the twelve workers. Auto-creating a party per guest would bury the
receivables list under thousands of dead accounts within a year. An existing party can
be *linked* when one is found by mobile or NID; none is ever created silently.

**Counting adults and children**

- Store **adults and children; the total is derived.** Storing all three invites the
  day they disagree.
- **What counts as a child is a setting**, not a constant — without an age boundary
  one clerk's child is another's adult and no two reports compare.
- **Children count as guests for amenities.** A child uses a towel and soap, and
  §6.1's per-guest kit items are computed per night; leave children out and the
  variance report carries an unexplained gap forever.
- **Catering does not use this count at all** — plates are their own number. A wedding
  is 400 plates and no room guests.
- **Over capacity warns, never blocks.** The desk knows about the infant and the extra
  mattress. Block it and the clerk enters a smaller number to get the booking saved —
  which destroys the very figure the count was kept for.
- **An extra bed is a charge line**, never a silent consequence of the child count,
  so the money stays visible.

Child rates, free-under-five and similar tiers are **not being built** — the same call
as ticket pricing tiers (§6.1). Recording each child's age in the guest list at
check-in, which the register is being filled in anyway, keeps that door open: tiers
then become a rate rule rather than a schema change, and old bookings can be read
under the new rule.

### 6.6 Where a room lives — buildings and floors in practice

*(Agreed 2026-08-24. The decision itself is §2.7; these are its consequences.)*

- **Room numbers stop being unique.** Two buildings both have a 101. Store the room's
  own number and **build the display name from its location** — "Annexe / 101". Do not
  type "A-101" into the number field.
- **Availability needs a building filter** — "a room in the main block" is a real
  request at the desk.
- **The floor plan becomes two steps** — choose a building, then see that floor's grid.
- **Housekeeping and material issue follow the building**, not the floor: separate
  store, separate staff. §4.3 says `material_issue_master` gains a floor reference —
  make it a **location** reference instead.
- ~~**A different price in the annexe is a different room type.**~~ ⚠️ **Superseded
  by §2.8 (2026-08-24).** The rent now sits on the room itself, so an annexe that
  charges more is simply a room with a different number in it. Making it a room
  type of its own is still allowed — it is just no longer the only way.
- **Growth costs nothing.** A new building, a new floor, more rooms — all rows. No
  schema change, which is what the client asked for.
- **A closed floor is deactivated, never deleted** — the §2.5 rule again. Delete it
  and last year's bookings, bills and register entries become unreadable.

### 6.7 Catering without recipes

*(Agreed 2026-08-24. Tables at §4.5.)*

Catering is sold as a service: a package, a per-plate rate, a number of plates. No
dish is costed against a recipe. The kitchen is the client's own, so raw material is
still bought into a kitchen store and **issued by hand** through the existing material
issue module — cost reaches the books at issue, as a period expense.

**A recipe was never what produced the actual cost.** A recipe says how much *should*
have been used; the issue says how much *was*. So per-event food cost — and with it
per-event margin — is available with no recipes at all, on one condition:

> **Each kitchen issue records which event it was for.** One nullable column on
> `material_issue_master`.

| | Without recipes, if issues name the event | Needs recipes |
|---|---|---|
| Actual food cost per event | ✅ | |
| Margin per event | ✅ | |
| Expected vs actual — waste, theft | | ⏳ |
| Planning the raw material for 400 guests | | ⏳ |

**The column is the one part that cannot wait.** Recipes added in a year cost the same
nine days whenever they are added; an untagged year of issues can never be costed
afterwards, because the fact was never written down. Cheap now, unrecoverable later —
the same shape as recording a child's age at check-in (§6.5).

Two conditions, or the number will mislead:

- **It must be optional.** Not all kitchen material goes to an event — room guests'
  breakfast, staff meals, general use. Made mandatory, a clerk picks any event to get
  the form saved, and wrong data is worse than an empty field.
- **Reports must say how much was tagged** — *"kitchen issues this month 4,20,000;
  78% assigned to an event"*. Without that line, a half-filled figure reads as
  complete and every event looks cheaper than it was.

**The human risk outweighs the technical one.** Manual issue means somebody must
remember. Forgotten for a month, kitchen stock and profit both inflate — together,
silently, with nothing on screen to show it. Two cheap guards: issue at least monthly,
and reconcile kitchen stock against what is physically there.

---

## 7. Open decisions

| # | Question | Recommendation |
|---|---|---|
| 1 | Community centre as its own branch, or a cost centre in one branch? | Own branch — separate P&L for free |
| 2 | Room rent posted per night, or once at check-out? | Per night — daily/monthly income stays correct |
| 3 | Amenities: auto per check-in, or periodic batch issue? | Batch issue primary; kit is only the yardstick for variance |
| 4 | Depreciation: straight-line, reducing balance, or both? | Both — NBR tax filing needs reducing balance |
| 5 | ~~Recipes/BOM in phase 1 or later?~~ | **Settled 2026-08-24: not at all.** Catering is sold as a service; the four recipe tables and phase 7 are dropped (§4.5, §6.7). Reversible later at the same cost |
| 6 | FY stored on the transaction, or derived from `vr_date`? | Derived (see §2.4) |
| 7 | Cancellation refund policy | Configurable in settings |
| 8 | FY start date — 1 July / 1 January / other? | Client's existing practice |
| **OPEN-3** | **Does the resort have a restaurant, or is food inside the stay package?** | **Unanswered.** If a restaurant, reuse the existing sales module — no new tables |
| **OPEN-9** | Do walk-in gate ticket sales go through `booking_master`, or their own tables? | Hybrid: shared master data and capacity check; walk-in cash sale in `ticket_sales_*` (it behaves like POS); advance group booking (e.g. a school booking 300 for Friday) through `booking_master` — note that such a booking is a **Group** booking under §6.4, so booking type spans tickets, not only rooms |
| 13 | Up to what age is a guest a child? | A setting, not a constant (§6.5) — the client's own practice. Until it is answered no two occupancy reports compare |
| **OPEN-12** | **Is VAT due when an advance is received, or when the service is given?** | **Unanswered — blocks billing code.** A matter of law, not preference. The §6.3 standard assumes *at service*, agreeing with §2.6; if the law says at receipt, the advance entry needs its own `Cr VAT Payable` line. Wrong either way makes the monthly return and the year-end P&L wrong together. Client's VAT consultant, not their manager |

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
| ~~7~~ | ~~Recipes + planned-vs-actual analysis~~ — **dropped 2026-08-24 (§6.7)** | ~~9~~ | — |
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

**Phase 3 was costed before §6.4 existed.** It now also carries bill transfer (with
its voucher and permission), tentative holds with expiry and a chasing list, and the
per-charge-type tax table of §6.3. Those are not free; the 17 days needs revisiting
alongside phase 0 (see §11).

Two developers in parallel: roughly 13–15 weeks. Phases 0 and 2 must still finish
first — everything else depends on them, so it does not halve.

**Release plan:** R1 = phases 0–4 (46 d, first usable release) · R2 = phases 5–7
(23 d) · R3 = phases 8–9 (16 d) · R4 = phases 10–11 (15 d) · then T1–T3 for the
resort site.

### 8.1 The first working release — six screens, thirteen tables

*(Written 2026-08-24. The 47-table design is what the system becomes, not what gets
built first; holding all of it in mind at once is neither possible nor necessary. The
whole design was done up front for one reason only — so that nothing has to be torn
up in month three.)*

Of the 47 tables, the first release needs **13**:

| | Table | |
|---|---|---|
| 1–3 | `hotel_buildings`, `hotel_floors`, `hotel_room_types` | Where rooms are, and what kind |
| 4 | `booking_resource_types` | Room / seat / hall |
| 5 | `booking_resources` | Every bookable thing — rooms and seats |
| 6 | `booking_master` | The booking |
| 7 | `booking_resource_details` | ⚠️ **the overlap lock lives here** |
| 8 | ✅ `booking_guests` | Filled at allotment (§6.5) |
| 9 | `booking_payments` | Advance and settlement |
| 10 | `booking_folio_details` | Bill lines |
| 11 | `booking_tax_rates` | VAT and service charge (§6.3) |
| 12 | `booking_status_logs` | Hold → confirmed → checked in |
| 13 | `booking_cancellations` | Cancellation and refund |

Close behind, not needed to open the doors: `booking_charge_types`,
`booking_bill_transfers`, `booking_rate_plans` / `_details`. The three financial-year
tables are phase 0 and sit outside this count.

Six screens, and **the order is also the build order** — each one leaves the previous
ones working:

| | Screen | Notes |
|---|---|---|
| 1 | Rooms and seats (master) | Set up once. Quick. |
| 2 | What is free on these dates | No new tables — it only reads |
| 3 | **Booking form** | ⚠️ The big one. The double-booking lock is here, and it has to be a database lock: a PHP-only check lets both concurrent requests through (§9) |
| 4 | Allotment / check-in | The same booking reopened (§6.5) |
| 5 | Advance and bill | ⚠️ **Cannot be finished without OPEN-12.** The other five are not blocked by it |
| 6 | Check-out | Settle, or move the balance to the company |

Deliberately absent: catering, events, tickets, recipes, amenities, housekeeping,
assets, depreciation, dashboard. Not dropped — later, and separately.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Double booking** | Guest conflict, reputational damage | ⚠️ **Revised 2026-08-25 — see §15.** Was `SELECT … FOR UPDATE` over a date range; is now a **`UNIQUE(resource_id, stay_date)` key over one row per seat per night**. A PHP-only check passes both concurrent requests, and a range lock only holds if InnoDB picks the index the reasoning assumed — a unique key has no query plan to get wrong. This is still the single most important correctness requirement in the project. |
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

1. **Get the ten answers at the end of §6.3 from the client's VAT consultant** —
   **OPEN-12** first, because billing code cannot be written without it. The structure
   is settled, so this is data collection now rather than design.
2. Then the rest of §6.2 — **whether a seat booking may be taken without the guest's
   gender**, since the rule agreed in §6.1 cannot work on the data as it stands
   *(partly eased by §6.4: a group books by gender count, so names and genders arrive
   at check-in rather than at booking)*. Then the open items in §7, including
   **OPEN-3** (resort restaurant).
3. **Re-estimate phase 0 — and now phase 3 too.** Phase 0 is costed at 7 days, set
   before §3.2 was re-checked; it also has to settle what `acc_financial_year_types`
   is for, decide the fate of 83 hardcoded writes, and place 7,000+ existing vouchers
   into years that do not yet exist. Phase 1 (4 days) sits on top of it. Phase 3's 17
   days predates §6.4 — see the note under §8.
4. Produce the technical design for **the thirteen tables of §8.1** — full columns,
   indexes and `CREATE TABLE` SQL. Not all 47 at once: the design will shift once the
   first screens are actually built, and §8.1 is the list to work from.
5. Update the client `.docx` to cover both sites and ticketing, if the client needs
   the wider scope on paper. As of v1.2 it carries modules 13–18 (booking type, billing,
   seat-wise rooms, holds, the two-stage form, buildings) but still describes site 1
   only — the resort and its ticketing are not in it.

   ⚠️ *Step 4 above is now partly done — see §12.*

   ⚠️ **The two documents disagree on effort.** As of v1.3 the `.docx` prices site 1 at
   **117 days / 24 weeks** — the original 100, plus 26 for modules 13–18, less the 9 of
   the dropped recipe phase — with its phases renumbered 0–16 and their week ranges
   recomputed. §8 above still shows the original 100-day table with phase 7 struck
   through and a note that phases 0 and 3 need re-costing. Reconcile them before
   either goes to the client again; the `.docx` table is the fuller of the two.
6. **Wait for an explicit go-ahead before writing any code.**

---

## 12. What is built — step 1, 2026-08-24

*(Written the day it was built. Everything below exists, runs, and is checked.)*

### Why not phase 0 first

§11 puts the financial year first and §8 costs it at 7 days. It was deliberately
**not** done first, and the reasoning should be on the record:

- Phase 0 is a **refactor of code already running on fifteen production sites** —
  83 hardcoded `financial_year_id => 1` writes across 20 files, one corrupt row,
  and 7,000+ vouchers that fall inside no year at all (§3.2).
- **The hotel module does not depend on it.** A booking voucher will write the
  financial year the same way every other module already does. Fixing the year
  later touches no hotel table.
- So starting there would have meant taking the largest risk in the project before
  producing anything the client can look at. Phase 0 is still needed; it is its
  own piece of work, and it is not a prerequisite for this one.

The masters below are the opposite kind of change: **entirely additive**. No
existing table is altered, no existing row is written, no existing code path is
touched.

### The five tables

`database/sql/2026_08_25_hotel_module.sql` — raw SQL, per §10. *(Written at the
time as `2026_08_24_hotel_room_and_seat_masters.sql`; folded into the one file
by §22.)*
Idempotent: every `CREATE` is `IF NOT EXISTS`, every seed is guarded, and it has
been run twice against the dev database to prove it.

| Table | |
|---|---|
| `booking_resource_types` | The five kinds, **shipped** as `company_id = 0` rows: room, seat, hall, community_centre, ticketed_item. Not a vocabulary a tenant edits — the code branches on these codes. Carries `rate_unit` (§2.8) |
| `hotel_buildings` | Blocks and zones under the branch (§2.7) |
| `hotel_floors` | Optional (§2.7) |
| `hotel_room_types` | Categories, with `default_*` rents that fill a form in (§2.8) |
| `booking_resources` | Rooms **and** seats. `parent_id` = 0 on a room, the room's id on a seat |

Also: `Hotel / Motel` and `Resort` rows in `business_type`, and four permissions
in the `Hotel` group.

**Two decisions inside the schema worth knowing:**

- **`parent_id` is `0`, not `NULL`.** The unique key
  `(company_id, branch_id, building_id, parent_id, code)` is what stops two 101s
  in one building — and MySQL counts NULLs as **distinct** inside a unique index,
  which would have switched that guard off for exactly the rows that need it.
  So 0 means "no parent", and there is no foreign key on it because there is no
  row 0 to point at. The controller checks the parent instead.
- **`building_id` is on every row, seats included; `floor_id` is optional.** Both
  are held so that an availability query can filter on either without a join that
  would drop the floorless rows. The database cannot express that the two must
  agree — the controller does, and a room that moves takes its seats with it.

### The API

`app/Http/Controllers/Hotel/` — four controllers, one `ScopesToProperty` trait,
27 routes under `api/hotel-setup/`. Models in `app/Models/Hotel/`.

Every endpoint checks its own permission **in the controller**, not through route
middleware, so a route added later cannot arrive ungated by being one line short.
`denyUnlessPermitted()` rather than `can()`, per §10.

Two lines are drawn on every query: the company, and the branch. In this module
**the branch is the property**, so a company running two hotels cannot have one
desk reach the other's rooms by counting upwards through the ids.

**The seat reconciliation is the piece that matters.** Saving a room writes its
beds with it, in one transaction — there is no way to end up with a room the
availability query cannot see. Changing the bed count:

- a missing bed is **created**
- a switched-off bed is **switched back on**, keeping its number and its rent
- a bed above the new count is **deactivated, never deleted**

The third rule is the one that would have been got wrong. Deleting is the obvious
thing: it is also what breaks the July stay recorded against "seat 3" once the
room is cut to two beds in September — and going back to four would then invent a
*new* seat 3 that the old bill and the old register entry do not point at.

*(The reconciliation compares `CAST(code AS UNSIGNED)`, not the text. Cutting a
twelve-bed room to nine has to switch off 10, 11 and 12 — by text order it would
have switched off 1 and 2, which is not a mistake that announces itself.)*

### The screen

`/hotel/setup` — one route, four tabs: Buildings · Floors · Room Types ·
Rooms & Seats. Tabs rather than four screens because setup is one sitting and the
tab order is the order the tables depend on each other.

The form sits above the table and stays open after a save, keeping the building,
floor and type and clearing only the number — rooms are added in a run of 101,
102, 103, and a page turn between each one triples the job.

Reopening a room shows its beds, each priced on its own. The room form's seat rent
is what a *new* bed starts at; the window bed that costs more is set in that list,
and the room form never overwrites it.

The sidebar entry is gated on **permission alone**, not on a business type. Real
Estate above it checks `business_type_id == 9` — and that id is auto-increment, so
"Hotel / Motel" is 9 in one tenant's database and 11 in another's. *(On the dev
database it landed on 9, which is the Real Estate id. That is a pre-existing
fragility in that menu, not a new one — but it is the reason this one avoids the
pattern.)*

### Checked

`hotel_setup_check.php --write` — 43 assertions, all passing. It refuses to run
without the flag and refuses outright on production, because it writes.

What it pins down, beyond the plain CRUD: two 101s in one building refused and
101 in two buildings allowed; a floor from another building refused; a room sold
whole with no whole-room rent refused, and a dormitory with no seat rent refused;
the four-to-two-to-four bed cycle keeping the same rows and the same per-seat
rents; twelve-to-nine switching off the right three; a room moving taking its beds
with it; a building, floor or room type still in use refusing to delete; and a
room type's default rent changing **nothing** about the rooms already of that type.

The four permissions were also confirmed to answer **403** when not granted —
which is their state on every site until somebody hands them out.

### Deliberately not built

The availability screen, the booking form, the overlap lock, allotment, billing,
check-out. Screens 2–6 of §8.1, in that order. The lock in screen 3 is the single
most important correctness requirement in the project (§9) and wants its own
sitting; screen 5 is still blocked by **OPEN-12**.

Also absent by design: `booking_slots`, `booking_rate_plans` / `_details`,
`booking_charge_types`. §2.8 leaves room for all three without a schema change.

### To deploy

1. Run the SQL on the target database.
2. `php artisan route:clear` and `php artisan permission:cache-reset` (§10).
3. Grant the four `Hotel` permissions to the roles that should hold them. Until
   then the menu does not exist for anybody — which is the correct state for the
   fifteen sites that are not hotels.

### Demo data

`database/seeds/HotelDemoPropertySeeder.php` (API repo) — one five-storey block
and two three-storey blocks, four rooms to a floor: **44 rooms, 104 beds**.

    php artisan db:seed --class=Database\Seeders\HotelDemoPropertySeeder

Deliberately **not** wired into `DatabaseSeeder` — a plain `db:seed` sets up roles
and permissions on a real install and must never quietly add eleven floors of
imaginary rooms to it. It refuses on production, and running it twice adds
nothing.

It is shaped to exercise the parts that are easy to get wrong rather than to look
tidy:

- **All three buildings have a room 101.** That is the per-building uniqueness
  rule doing its job, and the reason a room's display name is built from its
  location rather than typed into the number field.
- **A Deluxe is 3,500 in the Main Block and 4,200 in the Annexe** — the same room
  type at two prices, which is the whole of §2.8 in one row, and needs no second
  room type to express.
- **Garden Block covers all three sale modes**: its 1st floor is `both` (2,200
  whole *or* 1,300 a bed), its 2nd is `whole`, and its 3rd is a six-bed
  `seat`-only dormitory carrying **no** whole-room rent at all — NULL, not zero,
  because a zero prints as free.

*(Note: the four Hotel permissions are granted to nobody by the masters SQL, so
the menu stays hidden until `2026_08_24_hotel_permissions_grant.sql` is run —
which is a separate, opt-in file for a site that really is a hotel.)*

---

## 13. The Layout tab — the property drawn, 2026-08-24

*(Agreed as an **elevation**: buildings side by side, floors stacked, top floor
on top. Built the same day.)*

### The decision that shaped it

There are two building-wise visuals, not one, and they differ only in what the
colour means:

| | Colour source | Needs |
|---|---|---|
| **Structure map** | room type · sale mode · status | the master data — **built** |
| **Occupancy map** | what is free on a date | `booking_resource_details` — screens 2–3 |

They are **the same component**. So the colour was put in
`layoutPalette.ts` rather than inside the grid, and `COLOUR_MODES` is a list
with a comment saying where Availability joins it. When bookings exist, the
occupancy view is a fourth entry in that list and `LayoutTab.tsx` does not
change. Getting this wrong would have meant two grids to keep in step by month
three.

### What it draws

`GET api/hotel-setup/layout` — its own endpoint, because the rooms list
paginates at ten and a floor plan cannot be read ten rooms at a time. It returns
building → floor → room with a **summary** of each room's beds, in **6 queries**
regardless of size. Clicking a room fetches the beds themselves from
`resources/edit/{id}`, which already returned them.

*(The first draft ran 65 queries: `BookingResource::display_name` reaches for
`$this->building`, which lazy-loaded one building per room. The layout groups by
building and already holds it, so it now passes it in. The accessor stays for
callers that have only a room.)*

Floors arrive **ground-first** and the view reverses them. Which end is up is a
fact about the drawing, not about the data.

### Rules the screen keeps

- **Colour means one thing at a time.** Painting type, sale mode and status at
  once leaves none of the three readable.
- **⚠️ Never colour alone.** Every tile carries a badge — the room type's own
  code (`STD`, `DLX`), or `W`/`S`/`B` for sale mode — because red-green is the
  first pair colour blindness takes and none of it survives a grey printer. The
  legend carries the badge too, so the two agree when the colour is gone.
- **Three things on a tile:** number, badge, bed pips. A four-bed dormitory and
  a two-bed room must not look alike from a step back — the seat is the
  inventory, so a grid that showed only rooms would draw a third of the beds
  missing. Switched-off beds are drawn hollow, because the room still has them.
- **An inactive room is drawn inactive whatever the switcher says** — and in
  grey, not red. It is not a fault; it is a room kept so older bookings still
  read.
- **A floorless building keeps no invented floor.** Its rooms sit in a group of
  their own (`unfloored`).
- **The room type's colour is keyed by id**, so renaming "Deluxe" does not
  repaint the building.
- **The legend is built from what is on the property**, not a fixed list — a
  hotel with no dormitory is not shown a key for one.

### Where it lives

Fifth tab of `/hotel/setup`. The tab now lives in the URL (`?tab=layout`), so
the panel's **Edit this room** hands over to the Rooms tab with that room
already open (`?tab=rooms&room=12`) — and a reload comes back to the same place.
Tab changes `replace` rather than push, so Back does not have to walk out of
four tabs one at a time.

### Checked

`php hotel_layout_check.php` — 18 assertions, all passing. Read-only in effect:
it moves one room off its floor for a moment to prove a floorless room lands in
its own group rather than disappearing, then puts it back.

It pins down the things the grid would otherwise get quietly wrong: the
dormitory carrying **null** rather than a zero whole-room rent, the same Deluxe
at 3,500 in one block and 4,200 in another, floors arriving ground-first, and a
branch belonging to somebody else being refused rather than drawn.

*(A bug found while building it and fixed: the detail panel is fed from the
grid's own row, so repricing a bed refreshed the grid underneath while the panel
went on showing the range it opened with. The panel now re-syncs from the
reloaded layout, and closes if the room has gone.)*

## 14. Two smaller things on the setup screen, 2026-08-25

Neither is a new screen. Both came out of the same observation: the setup
tabs describe a property one row at a time, which is right for the *first*
ten minutes of a property and wrong for every minute after.

### Hiding what is switched off

A room is deactivated rather than deleted (§2.5), so a property that has been
running a while carries rooms nobody can book. On a plan of forty they are
noise. The Layout tab now carries a **Hide inactive** switch.

What it settles, and why:

- **Off by default.** A plan that quietly leaves rooms out of itself is the
  more dangerous of the two defaults, and the paper it is printed on cannot be
  asked what it was showing.
- **Drawn only where there is something to hide** — the same rule the legend
  already follows. A hotel that has retired nothing is not offered the switch.
- **"Inactive" is read at every level, not only the room's own flag.** A live
  room on a switched-off floor cannot be let either. A floor or a building left
  with nothing then goes with it, so the switch never leaves an empty card
  standing where a block used to be.
- **The building header is recomputed, not reused.** The API's counts and rent
  range describe the whole building; a header still reading "20 rooms · 40
  beds" over a card drawing eighteen is simply wrong, and so is a range whose
  bottom end is the price of a room nobody can book.
- **The colour index is NOT recomputed.** Room-type colours stay keyed off the
  whole property, so hiding rooms does not shift every colour along by one.
- **The legend follows what is drawn**, so the grey "Inactive" key goes away
  with the rooms it explained.
- **⚠️ The count is printed in the legend row, which is not `print:hidden`.**
  A plan carried to the front desk on paper has to say that rooms were left out
  of it.

### A run of rooms

Rooms on a floor are the same room described a dozen times over: same type,
same rent, same beds, and numbers that run 301, 302, 303. Typing that form
twelve times is twelve chances to put the Deluxe rate on a Standard room, and
the demo property alone is forty-four rooms.

**It is the same form, not a second screen.** Ticking *Add a run of rooms*
swaps the Name field — a run has no name to give; twelve rooms cannot all be
the Rose Room — for a count, and changes nothing else. A second screen would
have been the same fields twice, and the copy that drifts.

- `POST hotel-setup/resources/bulk-store`. Same payload as `store` with
  `start_code` + `count` in place of `code`, and `name` refused rather than
  ignored.
- **Both endpoints write through one `createRoom()`.** A second copy of it in
  the bulk path is the copy that quietly stops creating seats the day the room
  table gains a column — and a room without its seat rows is a room the
  availability screen cannot see, which is the quiet half of a double booking.
- **The trailing digits move; the width is kept.** `301` runs 301–304, `A-08`
  runs A-08–A-11. Asking for the first number rather than for a prefix and a
  count is what makes that possible: a run started at `01` reaches 10, never
  010.
- **⚠️ A clash refuses the WHOLE run and creates nothing.** Skipping the taken
  numbers and creating the rest is the friendlier-looking choice and the wrong
  one: asked for twelve rooms from 301 the operator would get nine, no clear
  sign of which three are missing, and a floor that reads as complete at a
  glance. The refusal names the numbers rather than saying "some".
- **Capped at 100 a request**, so a finger held on the 0 key cannot write six
  hundred rooms. A genuinely larger block is two runs.
- The rent rules of §2.8 are unchanged and are checked once, for the run.
- The form previews the numbers before they are sent. The server counts them
  out again from the same rule and is the one that decides; the preview exists
  so a mistyped start is seen before it is sent rather than after twelve rooms
  exist.

### Checked

`php hotel_setup_check.php --write` — **56 assertions, all passing** (43
before, 13 added for the run). The new ones pin down the things a bulk path
gets quietly wrong: that every room in the run got its beds and not just the
first, that a clash left the property exactly as it was, that `A-08` reaches
`A-10` rather than `A-010`, and that the cap refuses without writing.

The Layout change is front-end only; `tsc --noEmit` and `npm run build` are
clean. It has not been driven in a browser.

### Where it lives

| | |
|---|---|
| The switch | `LayoutTab.tsx` — `liveBuildings`, `summarise()`, `isLive()` |
| The run, on screen | `RoomsTab.tsx` — the `bulk` branch; `runOfCodes()` in `setupHelpers.ts` |
| The run, on the server | `BookingResourceController@bulkStore`, with `runOfCodes()`, `codesTaken()`, `clashMessage()` and the shared `createRoom()` |
| The button that names itself | `SetupShell.tsx` — `saveLabel` |

## 15. The booking engine — the lock first, 2026-08-25

Tables 6 and 7 of §8.1: `booking_master` and `booking_resource_details`.
No controller, no screen, no ledger entry. The lock was built on its own and
first, because every screen above it is wrong if it is wrong, and because it
is the one thing in the project that cannot be fixed after the fact — a hotel
that sold the same bed twice does not get to un-sell it.

`database/sql/2026_08_25_hotel_module.sql`, Part A. Safe to run twice.
*(Written at the time as its own `..._hotel_booking_engine.sql`; folded in by
§22.)*

### ⚠️ The decision that changed: one row per night, not one per stay

This supersedes the mitigation written in §9.

| | A row per stay (§9 as written) | A row per night (built) |
|---|---|---|
| The lock | `SELECT … FOR UPDATE`, then insert | `UNIQUE(resource_id, stay_date)` |
| What has to be true | InnoDB takes the gap the reasoning assumed, on the index the query actually used | The table cannot hold two of the same key |
| How it fails | Silently, under concurrency, in production | It cannot |
| Rows | One per booking | 100 rooms let every night ≈ 36,500 a year |

A range lock is correct **and** subtle. It depends on the query plan, so a
later `ORDER BY`, a changed index, or an optimiser that picks differently can
narrow the gap the lock was assumed to cover. The code still reads correct.
A single-threaded test still passes, because a single-threaded test cannot
see it. It fails the day two clerks press Save at once.

A per-night row asks nothing of the reader. Both requests find the night
free, both insert, and the second is refused — not by a check anybody wrote,
but because the row already exists. Between *subtle but correct* and
*impossible to express incorrectly*, the second is the right choice for the
risk §9 calls the most important in the project.

Three things fall out of it for free, which is what makes the extra rows a
bargain rather than a cost:

- **Date-wise rent.** The rent sits on the night, so a stay spanning a rate
  change is three honest numbers instead of one averaged one — and
  `booking_rate_plans` can arrive later without touching a booking that
  already exists.
- **The gender rule of §6.1 is a per-night rule**, and now has a per-night
  table to answer it in: "who else is in this seat's room tonight" is one
  indexed read rather than range arithmetic in PHP.
- **Availability** is a `GROUP BY` rather than a range intersection.

### What a night is

`stay_date` is **the night slept**, and the **check-out date is never one of**
**them**. The 15th to the 18th is three rows: 15, 16, 17.

That one line is why the next guest can arrive on the 18th while this one is
still at breakfast. Backwards, it costs the hotel one sellable night per
booking, forever, and nothing on any screen would say so.

### Rules the schema keeps

- **The resource is always a seat, never a room.** Letting a room whole is
  booking all of its seats in the same booking — §2.5, unchanged. A single
  room is one seat, so the ordinary case costs nothing.
- **`nights` is a generated column**, never typed. Same argument as adults +
  children + total in §6.5: a stored number that can be derived invites the
  day it disagrees.
- **`let_as` is frozen at booking.** A room may be converted between whole and
  seat-wise later (§6.1); reading today's `sale_mode` would start turning
  families away for a stay that happened in March.
- **`rent` is frozen too** (§2.8). A bill is read back, never recomputed.
- **⚠️ Releasing a night DELETES the row.** The only place in the hotel module
  where something is deleted rather than deactivated. The never-delete rule
  protects master data so an old stay still reads; this table is not master
  data, it is the allocation — and a released night that kept its row would
  keep its key, so a cancelled booking would go on blocking the bed. MySQL has
  no conditional unique index. The history lives in `booking_status_logs` and
  `booking_cancellations`, which is where history belongs.
- **The unique key is deliberately narrow** — no `company_id` in it. A seat
  belongs to one property already, and widening a key with a column that
  cannot vary is how the same seat gets sold twice under two company ids.
- **No foreign key to `main_trx_master`.** It is the oldest table in the
  system and the hotel module does not get to constrain it.

### Checked

`php hotel_booking_lock_check.php --write` — **19 assertions, all passing.**

It checks the *table*, not a controller, on purpose: there is no booking
controller yet, and the whole claim of this design is that the guarantee lives
in the schema rather than in the code above it. A test through a controller
would be testing the code; this tests the claim.

The one that matters most: **two separate database connections are both told
the bed is free, both try to take it, and exactly one gets it** — the loser
stopped by `uq_brd_seat_night` rather than by anything anybody wrote. That is
the assertion the range design could not make without arguing about gap locks.

Also pinned: that the check-out date is not a night; that a guest arriving on
the 18th does not clash with one leaving on the 18th; that bed 2 is free while
bed 1 is taken, because the seat is the lock and the room is not; that a
cancelled booking gives its night back while staying on the books; and that a
zero-night booking, a duplicate booking number, and deleting a bed that has
been slept in are all refused by the schema itself.

⚠️ Single-process, so the two writes are ordered rather than simultaneous.
Both *decisions* are made on the same stale answer, which is the whole of the
bug — but the blocking case, where the second insert waits on the first
transaction, would need a second process and is not covered.

⚠️ Like `hotel_setup_check.php`, it **wipes company 1's hotel rows**. Reseed
the demo property afterwards with `HotelDemoPropertySeeder` (§12).

### What is next, and what is not here

Six of the thirteen remain: `booking_guests`, `booking_payments`,
`booking_folio_details`, `booking_tax_rates`, `booking_status_logs`,
`booking_cancellations`. Halls are not here either — a hall is taken for a
slot rather than for a night, and `booking_slots` is its own table in §4.2.
Nothing built above closes that door: a slot table joins the same booking.

With the lock standing, the build order of §8.1 can run as written — screen 2
(availability) reads these two tables and needs no new ones, and screen 3
(the booking form) writes them. Screen 5 is still blocked by **OPEN-12**.

## 16. Booking from the browser — screens 2 and 3, 2026-08-25

The first thing in the module a guest could actually be booked into. Screens
2 and 3 of §8.1, built as **one** screen rather than two, because "what is
free" and "take it" are one action at a desk and splitting them would mean
the clerk reads a list, navigates away, and picks rooms from memory.

⚠️ **Whole rooms only**, and **the telephone-call stage of §6.5 only.**

### What it is honest about

The design problem on this screen is not the query. It is that **an
availability list is always out of date** — two clerks can be looking at the
same free room, and both are right at the moment they look. Reserving on view
would fix it and fill the hotel with rooms held by people who wandered off.

So the screen is built to admit it rather than to hide it:

- The list is **thrown away** whenever a date or the building changes, and
  after every save. A stale list of "free" rooms is the one way this screen
  could make somebody believe a room was already theirs.
- It says so on the page, every time — *what was free a moment ago; a room is
  not yours until it is booked.*
- **A clash is a sentence, not a failure.** The server answers 409 with
  "somebody took one of those rooms while this form was open. **Nothing was
  booked** — read the dates again and pick from what is left", and the screen
  shows exactly that and clears the selection.

### Rules the controller keeps

- **The read is advisory and the write is authoritative.** `availability()`
  never locks anything; `store()` catches the duplicate-key error from
  `uq_brd_seat_night` and names it. It does not try to avoid it — *avoiding it
  is the bug*, because the check both clerks would pass is the check that
  fails.
- **⚠️ All the rooms or none.** One clash rolls the whole booking back. A
  partial booking would leave a clerk believing a party of ten has somewhere
  to sleep when half of them do not.
- **A room is free only when every one of its live beds is free for every
  night asked for** — §2.5 derived, never counted separately. A room with some
  beds sold reads "3 of 6 beds free — cannot be let whole" rather than
  "taken", because those are different problems.
- **A room sold by the bed is listed, not hidden**, and says why it cannot be
  taken here. §2.8 forbids the alternative: a dormitory has no whole-room
  price, and dividing or summing the bed rates to invent one is exactly what
  that section exists to prevent.
- **The rent goes on the first bed of each room and the rest carry zero.** So
  a plain `SUM(rent)` over a booking is the right total, and no divided
  per-bed figure exists anywhere to be read back later as a seat rate.
- **A corporate booking with nobody to bill is refused.** With no credit limit
  (§6.4), the ageing report is the only guard there is, and it cannot chase a
  booking that names no company.
- **A zero-night stay is refused and named** — "a booking for part of one day
  is a hall slot, which is not built yet" — rather than called an invalid date.
  Day use is a real thing the client asked for; it is `booking_slots`.
- **Cancelling deletes the nights and keeps the booking**, with the reason
  appended. Its own permission, because releasing inventory is not the same
  act as taking a booking.

### Permissions

`hotel.booking.view` and `hotel.booking.cancel`, in the same `Hotel` group,
granted to nobody by Part C of `2026_08_25_hotel_module.sql`. Running
`2026_08_24_hotel_permissions_grant.sql` again picks them up — it grants the
whole group and is `INSERT IGNORE`.

Bookings are gated **separately from the setup four**: a front desk books
rooms and has no business editing the building list, and the manager who
describes the property may never take a booking.

⚠️ The sidebar gates the *group*, not the individual entries — the app has no
per-item menu permissions. A role holding only the setup four still sees the
Bookings link and is refused at the route. That is the existing pattern
everywhere in the app, not something this screen introduced.

### Checked

`php hotel_booking_check.php --write` — **35 assertions, all passing.** The
companion to the lock check and a different question: that one proves the
table cannot hold a double booking, this proves the controller above it
behaves.

Among them: that the 18th is not one of the nights of a 15th–18th stay; that
booking the same room twice is refused *and leaves no half-made booking*; that
a five-room request containing one clash writes not a single night row; that
`SUM(rent)` is rooms × nights × rate with nothing divided and no bed carrying
half a room rate; that a dormitory is listed with a reason rather than hidden;
and that cancelling returns the nights while the booking stays on the books
with its reason.

⚠️ **Not driven in a browser.** `tsc --noEmit` and `npm run build` are clean
and the API is covered by the script, but no human has clicked through the
screen.

### To deploy

1. `2026_08_25_hotel_module.sql`, then `2026_08_24_hotel_permissions_grant.sql`.
   *(Two files rather than four since §22.)*
2. `php artisan route:clear` and `php artisan permission:cache-reset`.
3. ⚠️ The two repos must go together. The Bookings menu without the API is a
   404 on every click.

### What is still missing before a guest can be checked in

| | Screen | Blocked by |
|---|---|---|
| 4 | Allotment / check-in — guest names, NIDs, which bed | `booking_guests`; the dormitory gender rule needs §6.2 |
| 5 | Advance and bill | **OPEN-12** |
| 6 | Check-out | 5 |

And within this screen: booking a dormitory **bed at a time**, and the payer
picker that makes Corporate selectable. Neither needs a schema change — every
night row is a seat row already, and `billed_to_party_id` is on the table.

## 17. Allotment — the second stage, 2026-08-25

Table 8 (`booking_guests`) and screen 4 of §8.1. The booking was taken on the
telephone months ago and already holds real rooms; this is the list of people,
filled in on the day they walk in.

**One booking record opened twice, never two mechanisms** (§6.5). There is no
second booking row and no second lock — nothing here touches
`booking_resource_details`.

⚠️ **It is a PAGE, and that was learned the hard way.** It was built as a dialog
over the bookings list, on the reasoning that the row being checked in is the row
the clerk was already looking at. The dialog was wrong twice over:

1. The scrolling was on the backdrop rather than on the dialog, so a booking with
   several rooms scrolled its own header — and its × — off the top of the window.
   **It could not be closed at all.**
2. Fixed, it was still the wrong container. A coach party is twelve rooms of five
   guests: sixty rows of six fields. No dialog holds that, and the second attempt
   was clipped against the sidebar before it even got there.

Work that fills a screen belongs on a screen. `/hotel/check-in/{id}`, reached
from a row, with the way back drawn on it.

### ⚠️ It is piecemeal, and that shapes the whole screen

Three of five rooms check in at noon and two more at nine in the evening. So:
each room is its own small form with its own Save, the panel says at the top how
many rooms are still outstanding, and nothing anywhere asks for the whole
booking at once.

A screen that demanded all five rooms together would be filled with invented
names to get past it — **which is worse than an empty room, because invented
names look like a police register.**

### The two rules the desk actually meets

| | Rule | Why not the obvious alternative |
|---|---|---|
| ID | **One identified guest per room** — name and NID for that one, optional for the rest | Requiring it of everybody stops a family of five at the desk for a rule aimed at one person; requiring it of nobody endangers the register |
| Mobile | **One mobile per room is enough** | Twelve numbers for twelve workers will not be given, and a required field that cannot be filled gets filled with rubbish — worse than empty, because it looks like data |

Neither can be a `NOT NULL`: "one per room" is not a column-level rule. Both
are enforced in the controller, per room, and checked again in the browser so
the message arrives while the guest is still holding their ID card out.

### Other rules it keeps

- **⚠️ A guest is not a customer account.** The party master is for whoever
  money is owed by; twelve workers in a dormitory owe nothing, the company that
  booked them does. `party_id` is a **link** to a party that already exists,
  found by mobile or NID and confirmed by a person — **nothing creates one.**
  Auto-creating a party per guest would bury the receivables list under
  thousands of dead accounts inside a year, and with no credit limit (§6.4) that
  list is the only guard there is.
- **Counts that do not match warn, never block.** Booked for twelve, ten
  arrived: both numbers are kept and shown side by side, and the message says
  so. Block it and the clerk edits the booking to get past the screen, which
  destroys the very figure the count was kept for. Amenities and food are
  computed from what arrived.
- **Over capacity warns too.** The desk knows about the infant and the extra
  mattress.
- **The first room through the door checks the booking in.** The status is about
  the booking; the panel is what shows the remainder.
- **Both `age` and `is_child` are stored, and they are not the same fact.** The
  age is durable — §6.5 keeps child rate tiers possible as a rate *rule* rather
  than a schema change, but only if the age was written down at the time.
  `is_child` is what the clerk decided on the day, and it exists only because
  "what counts as a child" is a setting the client has not answered. When they
  do, `age` is what reports should be recomputed from.
- **A correction replaces the room's list and SOFT-deletes what it replaced.**
  These rows are the police register: a name recorded and then changed is
  exactly what somebody may have to account for later, and a hard delete would
  leave no trace the desk ever wrote it. Every read goes through the model, so
  the withdrawn rows are invisible to the screen and to every count.

### The gender column, and why nothing enforces it

`gender` is recorded and **no rule acts on it**, for two separate reasons:

1. **Whole-room lets are exempt** (§6.1) — a family is mixed inside its own
   room — and every booking the system can currently take is a whole-room let.
2. **§6.2 is still open.** Under "match the first", unknown is neither male nor
   female, so one guest of unknown gender closes a dormitory for that night to
   everybody. Switched on as the data stands, every dormitory would shut after
   its first bed.

The column is ready. The rule is not, and shipping it would turn guests away.

### Checked

`php hotel_booking_check.php --write` — **59 assertions, all passing** (35
before, 24 added for allotment).

Among the new ones: that a room with nobody identified is refused *and the
message says the rest do not need one*; that one ID and one mobile between three
guests is enough; that exactly one row is marked as the identified guest and it
is the one who gave the NID; that **no party was created for any guest**; that
the first room checks the booking in while the second stays outstanding; that a
correction leaves two live rows and three withdrawn ones; that fewer people than
booked is allowed and *says so*; and that guests cannot be filed against a room
the booking does not hold.

⚠️ **Not driven in a browser.** `tsc --noEmit` and `npm run build` are clean.

### To deploy

The table and the permission are both in `2026_08_25_hotel_module.sql` (Parts A
and C). Then `2026_08_24_hotel_permissions_grant.sql` and
`permission:cache-reset`. It
brings one more permission, **`hotel.booking.allot`** — separate because the
booking is taken by whoever answers the telephone and the allotment by whoever
is at the desk when the guests walk in. A site where those are one person grants
both to one role and loses nothing.

### What is left

| | | Blocked by |
|---|---|---|
| Screen 5 | Advance and bill | **OPEN-12** |
| Screen 6 | Check-out | 5 |
| — | Booking a dormitory bed at a time | §6.2, for the gender rule |
| — | Corporate bookings from the screen | a payer picker |

None needs a schema change.

## 18. The booking screen draws the property, 2026-08-25

The availability picker was a flat grid of tiles. It is now the **same**
elevation the Layout tab draws — buildings side by side, floors stacked, bed
pips on every room — painted by what is free.

This is the thing §13 left a door open for, in its own words: *"When bookings
exist, Availability becomes a fourth entry in that list and this component does
not change — which is the reason the colour lives in layoutPalette.ts rather
than in the component."* It went through that door exactly as written.

### Why it is the same picture and not a similar one

A clerk who has learned where room 302 sits on the floor plan should not have
to learn a second arrangement to book it. And two screens each building their
own grid is how the two drift — one gains a floor sort, the other never does.

So there is only one grid. `PropertyGrid.tsx` was lifted out of `LayoutTab`
unchanged, and on the server `DescribesProperty` was lifted out of
`HotelLayoutController`. The availability read now answers with the **property**
— building → floor → room — rather than with a list, and adds one field per
room: what it is doing on those dates.

The two screens differ in exactly two things, and neither is in the shared
code: the **permission** they check (the desk books rooms without being able
to edit the building list), and what the booking screen **writes into** each
room afterwards.

### The six states, and why each is its own

| | Badge | Colour | |
|---|---|---|---|
| Free | `FREE` | teal | can be taken |
| Held | `HELD` | amber | tentative, may expire |
| Booked | `BKD` | rose | confirmed, nobody in it yet |
| Checked in | `IN` | violet | guests are in the room |
| Part-sold | `PART` | orange | some beds gone — cannot be let whole |
| Not lettable | `—` | grey | sold by the bed, or no rent, or no beds |

- **⚠️ `PART` is its own state, not a kind of booked.** A room with two of its
  four beds sold cannot be let whole, but it is not taken either, and telling a
  clerk "taken" would be a lie they could not act on.
- **A fully-taken room reads as the most committed booking on it** — guests
  asleep in it outrank a confirmed booking, which outranks a hold. A room a
  family is in must never draw as merely "held".
- **Grey is not red.** A dormitory that cannot be sold whole is not a fault.
- **The badge is a word, not a letter.** On the setup screen a badge is a room
  *type* code the reader already knows; here it is a state they are meeting for
  the first time — and `B` for booked beside `B` for "either way" on the next
  tab would be a trap. `FREE`, `HELD`, `BKD`, `IN`, `PART` cost three
  characters and read without a legend.
- **No red/green pair**, as everywhere else in this module, and every tile
  carries its word beside its colour.

### What else the screen gained

- **A "Colour by" switcher**, as on the Layout tab — availability first, then
  room type and how it is sold, so "which of the free ones is a Deluxe" is
  answered without leaving the screen. **Not** "Status", which here would paint
  every room the same and answer nothing.
- **A legend built from what is drawn**, not a fixed list: a property with
  nothing held tonight is not shown a key for "held".
- **The building header says what is picked in it** and what that costs.
- **A blocked tile keeps its colour** and loses only its hover. Fading it would
  take away the shape of the floor — the reason the grid was worth drawing —
  and a wall of grey says nothing about *why*. The tooltip still names the
  booking holding it, which is what the clerk repeats down the telephone.
- **The list's status is a chip in the grid's own colours** — held is amber in
  both places, booked rose in both, checked-in violet in both — with what it is
  *waiting for* underneath: a hold's expiry date, or "nobody checked in".

### A bug found on the way

`hotel_layout_check.php` had been committed with an absolute path to one
developer's own drive (`F:/All_Database/...`), so it had never run on any other
machine since it was written. Now `__DIR__`, like its two siblings — and with
it, proof that lifting the tree out of the controller changed nothing.

### Checked

**160 assertions across four scripts, all passing:**

| | |
|---|---|
| `hotel_setup_check.php` | 56 |
| `hotel_layout_check.php` | 18 — unchanged by the extraction, which is the point |
| `hotel_booking_lock_check.php` | 19 |
| `hotel_booking_check.php` | 67 (59 before) |

The new ones pin down that the answer arrives as the property rather than a
list, that it carries the unfloored bucket and the bed counts the grid draws as
pips, that a hold reads as `HELD` and not as booked, that the same room reads as
`IN` once its guests are checked in, that a dormitory is greyed rather than
coloured as taken, and that the blocked sentence now names *which* kind of taken
it is.

⚠️ **Not driven in a browser.** `tsc --noEmit` and `npm run build` are clean.

### Where it lives

| | |
|---|---|
| The grid, shared | `PropertyGrid.tsx` — lifted out of `LayoutTab` |
| The tree, shared | `Concerns/DescribesProperty.php` — lifted out of `HotelLayoutController` |
| The six states | `layoutPalette.ts` — `BOOKING_LOOKS`, `BOOKING_COLOUR_MODES` |
| Which state a room is in | `BookingController@stateOf` |
| The disabled tile | `RoomTile.tsx` — `disabled`, and the tooltip that still says why |

## 19. Selling a room by the bed, 2026-08-25

The one thing §16 left out on purpose. A dormitory was drawn on the grid and
greyed, saying *"sold by the bed, and booking beds one at a time is not built
yet"*. Now it is.

| | Whole | By the bed |
|---|---|---|
| Picked as | a tile | beds, one at a time |
| Rent written on the night | the ROOM's, on its first bed; the rest carry zero | each bed's OWN |
| `let_as` | `whole` | `seat` |

**⚠️ The two rents are never derived from each other, in either direction**
(§2.8). The screen adds up what was picked; it never divides a room rate
across beds and never sums beds into a room rate. That is the rule this whole
feature could have broken quietly, and the check pins it: a bed booking writes
the bed's 500 on every night row, and a room booking still writes 3,000 once.

A bed with no rent of its own is **refused**, and the room's rent is not used
as a fallback — a bed let for nothing is noticed at check-out, not before.

### The state that changed meaning

`part` — some beds sold — used to mean *blocked*. Now it depends on how the
room is sold:

- A room sold **only whole** with two of four beds gone: still blocked, and it
  says *"2 of 4 beds free — cannot be let whole"*.
- A **dormitory** with two of six gone: **not blocked at all.** Four beds are
  still for sale, and greying it would take a floor of a hotel off the market
  because one bed sold.

Same picture, opposite answers, and only the sale mode tells them apart.

### What the screen does

- Clicking a room means one of two things, **and the room says which**: a room
  with beds for sale opens them; anything else is picked as a room. A second
  control on the tile was the alternative — a button on something the size of
  a postage stamp that already carries three things.
- The beds open **under** the grid, not inside a tile: six beds with prices do
  not fit in a tile, and a popover over a scrolling floor row would be clipped
  by the same overflow that once shaved the selection ring.
- One room's beds at a time. Six dormitories open at once is a wall of beds
  under a grid drawn to be glanced at.
- The picked line names beds as **"GDN / 301 bed 2"**. "Bed 2" alone means
  nothing across four dormitories.
- The Save button says **"Book 1 room and 2 beds"** — what was picked, not a
  count folded into one word.

### One booking may hold both

Three whole rooms and four dormitory beds — a family and their drivers — is
**one** booking, because it is one party and one bill. `stated_rooms` counts
the rooms *touched*: a dormitory taken four beds at a time is one room on that
line, not four.

### ⚠️ The gender rule is still not enforced

Unchanged from §17, and worth repeating because this is the feature that makes
it reachable. §6.1 says a room sold by the bed takes its gender from its first
guest of the night and every other bed that night must match. It is **off**:

- **§6.2 is open.** Under "match the first", unknown is neither male nor
  female, so one guest of unknown gender closes a dormitory for that night to
  everybody — and no guest carries a gender on the data as it stands.
- Every night row carries `guest_gender`, left NULL at booking and filled at
  allotment where §6.5 puts it anyway.

The column is ready. The rule is not, and shipping it would turn guests away.

### Checked

**226 assertions across five scripts, all passing** (194 before):

| | |
|---|---|
| `hotel_setup_check.php` | 56 |
| `hotel_layout_check.php` | 18 |
| `hotel_booking_lock_check.php` | 19 |
| `hotel_booking_check.php` | 88 (67 before) |
| `hotel_booking_smoke.php` | 45 (34 before) |

The new ones: that six night rows are written for two beds over three nights
and not the whole room; that each carries the bed's own rent with nothing
divided; that the same bed twice is refused by the same unique key that guards
a room; that a part-sold dormitory stays open while a part-sold twin does not;
that a room sold only whole will not sell one of its beds *and says so in those
words*; and that a booking can hold a room and two beds at once, with both
`let_as` values in the same booking.

On the demo property the grid now reads **44 free** where it read 40 free and
4 closed — the Garden Block dormitory floor the client asked about.

⚠️ **Not driven in a browser.** `tsc --noEmit --noUnusedLocals` and
`npm run build` are clean.

### Still not built

Booking a bed does not yet ask **who** is in it — the gender counts §6.4 says a
group states at booking. They arrive at allotment instead, which is where the
names are taken anyway. Screens 5 and 6 (the bill, check-out) remain, and
**OPEN-12** still blocks 5.

## 20. A hold that outlived its stay, 2026-08-25

Found on the screen, not by a check: a booking for the night of the 25th,
shown as **Held until 2026-09-01**.

§6.4 gives a hold seven days by default and ninety at most. It does not say
the thing that turns out to matter:

> ⚠️ **A hold cannot outlive what it is holding.**

Seven days *added to today* is only right when the stay is further off than
that. For a stay tomorrow it holds nights that are already behind it — they
went unsold while the record said somebody might still want them, which is the
exact opposite of what a hold is for.

So the seven days are now a **maximum measured against the stay**:

```
hold_until = min(asked-for or +7 days, +90 days, end of the check-out day)
```

End of the day rather than its start — a guest arrives *during* a day, and a
hold expiring at midnight on its own last day would release the room while
they were on their way. The ninety-day ceiling of §6.4 is enforced here too;
it never had been.

⚠️ **This leaves the arrival day inside the hold.** A booking nobody turned up
for still holds its rooms for the rest of the stay — one unsold night per night
of it. Capping at `check_in_date` instead is a one-word change and is the
tighter, more revenue-protecting rule; it was **not** made unasked, because it
decides how long the desk has to chase somebody, which is the client's business
rather than the code's. Worth putting to them.

### The check scripts stopped eating the demo data

Found the same way. All three fixture-building scripts wipe company 1's hotel
rows — the headers said so — and the person setting the screens up in a browser
had four bookings in there. A warning about "every hotel row company 1 has"
does not read as *"your four bookings"*.

`hotel_check_support.php` now gives them two courtesies:

- **Before**: the number is counted and named. The `--write` flag is the
  consent; this is what makes it informed.
- **After**: the demo property is reseeded automatically. The bookings are gone
  either way — they were made by hand — but an empty property is a fixable
  thing to leave behind, so it is fixed rather than described in a closing
  line of advice.

### Checked

**233 assertions across five scripts** (226 before). The seven new ones pin the
cap from both sides: a distant stay still gets its seven days *from today*; a
stay two days off is cut to the stay and not a day further; asking for sixty
days over a two-day stay gets the two days; the expiry lands at `23:59:59`; and
a confirmed booking carries no hold date at all.

## 21. When the day turns over, 2026-08-25

Asked plainly: *what time is check-in, what time is check-out?* The answer was
**nowhere** — no column, no setting, no value — while the engine had been
quietly depending on one since §15.

### ⚠️ The assumption that was never written down

The engine counts **nights** and never hours. A stay of the 15th to the 18th
holds the nights of the 15th, 16th and 17th, and the 18th is sold to somebody
else.

That is right **only while check-out comes before check-in**. Set check-out to
6pm and check-in to 2pm and the same room is let to two parties for four hours,
every turnover day — and nothing in the engine would notice, because it is not
looking at hours.

It was an unwritten assumption holding up the module's most important
guarantee. It is now a rule with a check on it.

### Where it lives, and why there

| | |
|---|---|
| **Stored** | `metas`, per branch — `hotel_check_in_time`, `hotel_check_out_time` |
| **Edited** | Branch form, a new **Hotel Setup** step |
| **Enforced** | `BranchController::hotelTimes()` — the only place that knows the rule |
| **Shown** | Head of the **Bookings** screen *and* the Layout tab, with a **Change** link |
| **Default** | 12:00 out / 14:00 in |

The branch form rather than a sixth tab on Hotel Setup, for five reasons:

1. **§2.7 — the branch IS the property.** Property policy belongs on the
   property record.
2. **Real Estate Setup is the exact precedent** — one module's branch-level
   settings as a named step.
3. **§4.8 already said so**: "VAT %, check-out time, cancellation policy →
   existing `metas` table + `meta()` helper".
4. The write path exists. Nothing new was built on that side.
5. **It will not come alone.** The child-age boundary (§6.5), VAT rates (§6.3),
   cancellation percentages, default advance % and the hold's seven days are
   all §4.8 settings, all branch-level, all set once. One step holds them; a
   hotel tab would become a second settings screen beside the one that exists.

### But it is shown where the work happens

The objection to the branch form is real: **the hotel manager knows the
check-in time; the company administrator does not.** So the value is drawn as a
line — *Check in 2:00 PM · Check out 12:00 noon* — with a Change link into that
step, in **two** places:

- **The Bookings screen**, above everything. This is the one that matters: the
  commonest question on the telephone is *"what time do we have to be out?"*,
  and it is asked of a screen the desk has pressed nothing on. So the times ride
  with the booking **list**, not only with an availability read — a clerk should
  not have to start a booking to answer a question about one.
- **The Layout tab**, where the rooms are drawn, and it prints with the floor
  plan.

A number that decides whether a room can be sold twice must not be invisible to
the people whose day it governs.

*(Carrying them on the list meant wrapping that response —
`{ bookings, times }` — rather than returning the paginator bare. A second
request for two strings would be a second request on every page turn, and
hanging them off the paginator object would be smuggling them through something
that means something else.)*

*(The hotel screens hold a plain branch id and the branch form is reached by an
encoded one, so the read hands over `branch_ref` as well. Without it the link
could only point at a branch list, which is a hint rather than a link.)*

### Checked

`php hotel_times_check.php --write` — **13 assertions**. It reaches the private
rule by reflection rather than making it public for a test's sake, and puts the
two meta rows back exactly as it found them, *including not existing*.

Among them: that 6pm out with 2pm in is refused and says **"two guests at
once"**; that the same time for both is refused; that a minute apart is allowed,
because that is the desk's business and not the code's; that rubbish and
impossible hours fall back rather than being written; that a form sending
neither keeps what the branch had; and that the hotel screens default to the
same pair the form does — a property nobody has asked must not read blank on
one screen and noon on another.

**254 assertions across six scripts** (233 before).

### Still open

**Early check-in and late check-out charges** (§6.2) are not built. Neither is
the no-show moment — which these times now make answerable, and which is the
same question §20 left hanging about how long a hold should survive.

## 22. Four SQL files became one, 2026-08-25

The module was installed by running four files in order:

```
2026_08_24_hotel_room_and_seat_masters.sql     tables 1–5, kinds, permissions
2026_08_25_hotel_booking_engine.sql            tables 6–7
2026_08_25_hotel_booking_guests.sql            table 8, one permission
2026_08_25_hotel_booking_permissions.sql       two permissions
```

They are now **`2026_08_25_hotel_module.sql`** — one file. Running four things
in the right order is three chances to run them in the wrong one.

Nothing in it is new. The blocks were **moved rather than rewritten**, so the
reasoning that came with each table is still attached to it.

### ⚠️ The grant file is deliberately still separate

`2026_08_24_hotel_permissions_grant.sql` was **not** merged in, and that is the
whole of the safety in this design.

The combined file is harmless on any of the fifteen sites that sell rice, gas
and building materials: it adds tables nothing reads and permissions **nobody
holds**, so no menu appears anywhere. Merging the grant would put a Hotel menu
in front of every one of them the moment somebody ran the schema.

So a site that really is a hotel runs two files, not one:

```
mysql -u USER -p DATABASE < 2026_08_25_hotel_module.sql
mysql -u USER -p DATABASE < 2026_08_24_hotel_permissions_grant.sql
php artisan permission:cache-reset
php artisan route:clear
```

### How it is organised

| Part | |
|---|---|
| **A** | The eight tables, in the order their foreign keys need |
| **B** | The rows that ship with the system — resource kinds, business types |
| **C** | The seven permissions, granted to nobody |
| **D** | What to run afterwards, and how to check or undo it |

The table numbers inside Part A are §8.1's, so "table 7" means the same thing
in the file as it does in this document.

### Checked

Proved the way it will actually be used: the eight tables were **dropped** and
the seven permissions **deleted**, then the one file was run against the empty
state.

- eight tables back, seven permissions back
- five resource kinds and both business types seeded
- **granted to nobody** — 0 rows, which is the correct state for a site that
  is not a hotel
- `uq_brd_seat_night = (resource_id, stay_date)` — the lock, intact
- run a second time: no error, no change

Then all six check scripts: **249 assertions, all passing.**

### One thing the rebuild exposed

Dropping and recreating the permissions gave them **new ids**, which left the
existing `role_has_permissions` rows pointing at nothing — and
`hotel_layout_check.php` failed, because unlike its siblings it does **not**
borrow the permissions it needs; it assumes they are already granted.

Re-running the grant file fixed it. Worth knowing for any real deployment that
ever recreates a permission row: **the grants do not survive it.** Worth fixing
in that script too, so it stands on its own like the others do.
