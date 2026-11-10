# Hotel Module — Additional Improvements

**Date:** 2026-11-10
**Scope:** `cashbook_api` (`app/Http/Controllers/Hotel`, `app/Models/Hotel`, `routes/api.php`,
`routes/console.php`) and `cashbookbd_react` (`src/components/modules/hotel`, `src/App.tsx`,
`appRoutes.tsx`, `apiRoutes.tsx`).
**Purpose:** proposals that are **not** in `PROJECT-AUDIT.md` and **not** in the Hotel Module
Audit delivered on 2026-11-10. This document does not modify code, schema, or configuration.

---

## 0. How to read this document

### Classification

| Class | Meaning |
|---|---|
| **Essential** | A real hotel cannot run its daily operation without it, or the books cannot be kept correctly. |
| **Optional** | Strong commercial or operational value, but the property can trade without it. |
| **Future-phase** | A new business line, integration, or capability that needs its own project. |

### Priority

| Priority | Meaning |
|---|---|
| **P1** | Next work. High operational or financial impact, no client decision outstanding. |
| **P2** | Soon. Valuable, but can follow P1. |
| **P3** | Later / opportunistic. |

### Explicitly out of scope (already reported or blocked)

This report does **not** re-list: the Shifts tab prop mismatch; bed release on edit; the room
facility wipe; unguarded `by_account` / `unfloored` render paths; the allotment spinner; the
missing corporate payer picker; the hidden hall-booking menu; the missing List/Print endpoints;
raw SQL messages returned to the browser; the stale "beds not built" sentence; amenity-kit legacy
lines; `financial_year_id = 1`; the shared booking loading flag; register/collection error
surfaces; the guest-drawer z-index; the amenity item-list scope mismatch; timezone-unsafe date
parsing; the `expired` filter; TypeScript drift.

It also does **not** propose: VAT/service-charge rates, rate plans, early check-in / late
check-out charges, cancellation percentages, the dormitory gender rule, child age, Mushak 6.3 /
EFD, events & catering, ticketing, or depreciation. Those are either waiting on the client or
already named as future phases.

### What the code currently exposes (for context)

- **6 report endpoints** — `register`, `bookingDue`, `collection`, `vatSummary`, `performance`,
  `amenityVariance` (`HotelReportController`).
- **2 scheduled commands** — `hotel:expire-holds`, `hotel:night-audit` (`routes/console.php:72,107`).
- **~22 permissions** under `hotel.*`.
- **25 hotel models**; `Booking` has no source/channel/segment/agent columns; `BookingGuest` has
  `national_id`, `address`, `gender`, `age` but no passport/nationality/visa; `HousekeepingLog`
  records *who changed a status* but no assignment; `BookingPayment` has only
  `advance | settlement | refund`.
- **No hotel code in `mobile-app`, `website-next`, or CI.**

---

# PART A — Essential hotel management features

## A1. Front Desk "Today" cockpit

**Class:** Essential · **Priority:** P1

**Business purpose.** A receptionist starts the day with one question: *what must happen today?*
Today that answer is spread across Bookings filters, the register report, the housekeeping board,
the calendar, and the booking-due list. A single cockpit — arrivals, departures, in-house,
dirty rooms, out-of-order rooms, unsettled folios, no-shows to decide, holds lapsing — is the
screen a real front desk keeps open all shift.

**Benefits.**
- Cuts the number of screens per guest interaction from 3–5 to 1.
- Prevents the two most common daily misses: an arrival nobody checked in and a dirty room sold.
- Gives supervisors a live operational picture without reading five reports.

**Backend.**
- `GET hotel-setup/today?branch_id=&date=` returning, in one payload: arrivals (with allotment
  status), departures (with folio balance), in-house, rooms dirty/cleaning/out-of-order, holds
  lapsing in 24 h, bookings with no guest recorded, ended stays still owing.
- Reuse the existing reads rather than adding a second arithmetic: `HotelReportController`
  (register/bookingDue), `HousekeepingController::board()`, `Booking` status counts.
- New permission or reuse `hotel.booking.view` + `hotel.housekeeping.view` with graceful
  degradation per band.

**Frontend.**
- New route `/hotel/today` (`hotel_today`), first item in the Hotel menu.
- Card bands with counts and drill-through links; print-friendly "day sheet" (A4) with
  arrivals/departures and a signature line.
- Auto-refresh every 60 s; no full-page reload.

**Database.** None. All figures already exist in `hotel_booking_master`,
`hotel_booking_resource_details`, `hotel_housekeeping_status`.

**Dependencies.** None. Pairs naturally with A2 (task list) and A6 (dues).

---

## A2. Housekeeping task assignment, checklists, and maintenance work orders

**Class:** Essential · **Priority:** P1

**Business purpose.** `hotel_housekeeping_logs` records that a room moved from dirty to clean
and who moved it (`changed_by`), but there is no notion of *a task assigned to a person*, no
checklist (departure clean vs stayover vs deep clean), no due time, and no way to report "201 has
been dirty for six hours and nobody has it". Maintenance is only the binary `out_of_order`
status with a free-text reason — no work order, vendor, cost, or history beyond the status log.

**Benefits.**
- Rooms are turned in a measurable order; supervisors can see workload per housekeeper.
- Maintenance cost reaches the books through an ordinary expense voucher instead of being
  invisible.
- "Why is 305 out of order, since when, and who is fixing it?" becomes answerable.

**Backend.**
- `hotel_housekeeping_tasks`: `company_id`, `branch_id`, `room_resource_id`, `type`
  (`departure | stayover | deep | inspection`), `priority`, `assigned_to` (user id),
  `due_at`, `started_at`, `completed_at`, `status`, `notes`, timestamps.
- Optional `hotel_housekeeping_task_items` for checklists.
- `hotel_maintenance_requests`: room/building, category, description, priority, reported_by,
  assigned_to/vendor_party_id, `opened_at`, `closed_at`, cost, `main_voucher_id`.
- Endpoints: list/assign/start/complete tasks; create/close maintenance; both under
  `hotel.housekeeping.view` (tasks) and a new `hotel.maintenance.manage` (work orders).
- On check-out, create a departure task per room in the same transaction that marks it dirty
  (extend `Housekeeping::markDirty()`).
- Closing a maintenance request posts an ordinary expense voucher when a cost is entered,
  using `HotelAccountHead` for a `HOTEL_MAINTENANCE_EXPENSE` marker (add to the grant file).

**Frontend.**
- Housekeeping board: group by assignee/status; "Assign to me", drag between columns.
- Task drawer with checklist and timer.
- Maintenance list + form; out-of-order dialog links to a work order rather than only a reason.
- Mobile-friendly layout (see C8).

**Database.** Two new tables; two nullable voucher columns; one new COA marker. Patch step in
`AddUnitTypeToBuildingUnits` plus a `database/sql/2026_*.sql` twin.

**Dependencies.** `users` for assignment; the expense voucher path already exists.

---

## A3. Group blocks and rooming-list import

**Class:** Essential · **Priority:** P1

**Business purpose.** Weddings, corporate conferences, and tour groups are sold as *a block of
N rooms* weeks before the names are known. Today every room must be individually booked with
specific rooms, and the rooming list is typed in one guest at a time at allotment. That is the
single largest data-entry cost in a group hotel — and the source of "booked 20, got 18" disputes.

**Benefits.**
- One block holds inventory and has a cutoff date; unused rooms release automatically.
- Rooming list arrives as Excel/CSV and becomes `hotel_booking_guests` rows in one import.
- Group billing and one master folio are natural consequences.
- Staff time per group drops from hours to minutes.

**Backend.**
- `hotel_group_blocks`: `company_id`, `branch_id`, `name`, `party_id` (billing company/agent),
  `arrival`, `departure`, `rooms_requested`, `rooms_picked_up`, `cutoff_date`, `status`,
  `booking_type`, `notes`, timestamps.
- `hotel_group_block_rooms`: one row per held room/night (or per room type + count if the client
  prefers type-level blocks).
- Endpoints: create/update/release block, pickup rooms, convert block → bookings, import
  rooming list (`multipart` CSV/XLSX), export template.
- Reuse `booking_resource_details` as the lock: a block writes hold rows exactly as a booking
  does, so there is one inventory truth. Cutoff release is a command (A9).
- Import validation: duplicate names, unknown room, dates outside the block, missing ID for the
  identified guest — refused per row with a line-numbered report.

**Frontend.**
- Group Block screen: block summary, pickup grid, cutoff countdown, "Create bookings".
- Import wizard: upload → map columns → preview → commit, with an error download.
- Rooming list editable in a spreadsheet-like grid.

**Database.** Two tables; optional `block_id` on `hotel_booking_master` for reporting.

**Dependencies.** A4 (guest documents) for foreign groups; A7 (deposits) for group prepayment.

---

## A4. Guest documents and foreign-guest compliance (Form C)

**Class:** Essential (jurisdiction-dependent) · **Priority:** P1

**Business purpose.** `BookingGuest` stores `national_id`, `address`, `gender`, `age`. There is no
passport number, nationality, date of birth, visa/permit expiry, or scanned document. In
Bangladesh a hotel must report foreign guests to the police (Form C) and keep passport/visa
particulars; today that is done outside the system. Domestic NID copies are also commonly kept
at the desk with no retention policy.

**Benefits.**
- Statutory reporting becomes a print/export rather than a hand-written register.
- Visa/permit expiry alerts prevent a guest overstaying unnoticed.
- Document images end the "where is the NID copy?" search at checkout.
- A defensible retention policy reduces PII exposure.

**Backend.**
- Add to `hotel_booking_guests`: `passport_no`, `nationality`, `date_of_birth`,
  `visa_no`, `visa_expiry`, `document_type`.
- New `hotel_guest_documents`: `booking_id`, `booking_guest_id`, `kind`
  (`nid | passport | visa | other`), `file_path`, `mime`, `size`, `uploaded_by`,
  `retention_until`, timestamps. Store outside the web root; serve through an authorised
  controller, never a public URL.
- `GET reports/foreign-guests?date=` and a print layout for the statutory form.
- Validation: passport required when `nationality != BD`; visa expiry must be after departure.
- Retention job: anonymise/delete documents past `retention_until` unless a legal hold flag is set.

**Frontend.**
- Allotment form: document type, number, expiry, upload.
- Guest profile drawer: documents tab (view/download with permission).
- Reports: Foreign Guest Register, printable.
- Badge on the guest row when a visa expires during the stay.

**Database.** 6 columns on `hotel_booking_guests`; 1 new table; 1 storage folder.

**Dependencies.** File-upload conventions already used by the voucher uploader; A5 permission
split for document access.

---

## A5. PII access control, masking, and retention

**Class:** Essential · **Priority:** P1

**Business purpose.** NID/passport numbers, mobiles, and addresses are visible to every holder of
`hotel.booking.view` and are printed on registers. There is no separate permission for PII, no
masking in lists, no access log, and no retention/erasure path. A hotel is a high-risk PII
environment (police register, corporate guests, foreign nationals).

**Benefits.**
- Least-privilege: a waiter with booking-view need not read NIDs.
- Auditable access to sensitive fields.
- Lower breach impact and a defensible retention position.

**Backend.**
- New permission `hotel.guest.pii.view`; endpoints mask `national_id`/`passport_no`/`mobile`
  unless held (e.g. `•••• 1234`).
- `hotel_guest_access_logs`: who read which guest/booking, when, from where — write only on
  an explicit "reveal" action, not on every list read.
- Optional encryption at rest for NID/passport with a deterministic HMAC lookup column, so
  guest-by-NID search still works without storing plaintext.
- Retention policy per company: `metas.hotel_guest_retention_months` + a purge/anonymise command
  with dry-run.

**Frontend.**
- Masked values in lists; "Reveal" button gated by permission, with a reason prompt where the
  company wants one.
- Access log tab on the guest drawer (auditors).

**Database.** 1 new table; optional 2 columns (ciphertext + HMAC) on `hotel_booking_guests`.

**Dependencies.** A4 (documents) for a complete policy.

---

## A6. Corporate/agent accounts receivable — ageing, statements, and dunning

**Class:** Essential · **Priority:** P1

**Business purpose.** `bookingDue` shows ended stays that still owe, with `days_overdue`, but it is
a booking list, not a receivables ledger. Once a bill is carried to a party, the debt lives in the
party ledger and the hotel has no company-wise ageing, no statement, and no reminder trail. The
specification itself calls the ageing report "the only thing standing between the business and an
unnoticed pile of receivables" because corporate bookings have no credit limit.

**Benefits.**
- A manager can see which companies owe 0–30 / 31–60 / 61–90 / 90+ days.
- A printable statement per company ends month-end reconciliation by email.
- Reminder letters/SMS become a workflow instead of memory.

**Backend.**
- `GET reports/ageing?as_of=&party_id=` reading the party ledger
  (`acc_transaction_details` + `main_trx_master`) filtered to hotel transfers, joined to
  `booking_bill_transfers` for the source booking.
- `GET reports/statement/{partyId}?from=&to=` and a print layout.
- `hotel_receivable_reminders`: party, level, sent_at, channel, note — or reuse the SMS module's
  log with a hotel purpose code.
- Buckets and totals must be reconciled against the Advance Against Booking head for guest-held
  balances (the two halves `bookingDue` already separates).

**Frontend.**
- Reports → **Ageing** tab: company rows, bucket columns, drill to bookings.
- Party statement preview + print.
- "Send reminder" action with a template, gated by a permission.

**Database.** No new table required if the SMS log is reused; otherwise one small table.

**Dependencies.** Bill transfer already posts the party entry; A10 (reconciliation) validates it.

---

## A7. Deposit and prepayment schedules

**Class:** Essential · **Priority:** P1

**Business purpose.** `BookingPayment` understands only `advance | settlement | refund`. Real
group and corporate business runs on a schedule: 30% on signing, 40% before arrival, balance on
departure. Today the desk keeps that schedule outside the system and the booking cannot say what
was due when. A deposit held for a future stay is also conceptually distinct from an advance
already earned into a stay.

**Benefits.**
- The system can answer "what is due next week" and "who has not paid the second instalment".
- Fewer no-shows because the schedule is followed.
- Cleaner liability reporting: deposits held vs advances applied.

**Backend.**
- `hotel_deposit_schedules`: `booking_id`, `due_date`, `amount` or `percent`, `label`,
  `status` (`pending | paid | waived`), `payment_id`, timestamps.
- Extend `BookingPayment::PURPOSES` with `deposit` (liability) and keep `advance` for money
  applied at/after arrival; or treat both as advance but tag the schedule row.
- Endpoints: create/update schedule, "take instalment", list due instalments.
- A scheduled command that flags overdue instalments and (optionally) notifies the desk/guest.
- Voucher: deposit receipt credits `Advance Against Booking` exactly as an advance does; no new
  head is required unless the client wants deposits reported separately.

**Frontend.**
- Booking form: schedule builder (preset % or amount, dates auto-spread).
- Booking detail/folio: instalment strip with paid/pending/overdue.
- "Deposits due" worklist on the Today cockpit.

**Database.** 1 new table; optional enum value.

**Dependencies.** The client's cancellation/forfeiture rule decides what happens to an unpaid or
cancelled schedule; the mechanism can ship before that rule.

---

## A8. Credit notes and bill reversal

**Class:** Essential · **Priority:** P1

**Business purpose.** Folio lines are immutable and there is no credit note. Once a night is
billed, VAT has fallen due, and the only correction paths are a discount, a write-off, or a manual
journal outside the module. A wrong room rate, a departed guest, or a returned deposit cannot be
reversed on the document that created the liability. This is the largest accounting gap left in
the module.

**Benefits.**
- Corrections are traceable and VAT-correct, instead of being hidden in discounts.
- The bill, the ledger, and the VAT summary can be reconciled after a correction.
- Refunds stop being the only way to give money back.

**Backend.**
- `hotel_booking_credit_notes` (header: booking, number, date, reason, approved_by,
  `main_trx_id`, total) + `hotel_booking_credit_note_lines` (reference to the original folio
  line, base/service/VAT as reversed, quantity).
- Posting: reverse the exact rates stored on the original line, one voucher; never re-price.
- Guard: a credit note may not exceed the remaining value of the referenced line; a second note
  on the same line is refused beyond that.
- Permissions: `hotel.folio.creditnote` (manager), separate from `hotel.folio.bill`.
- Receipt reversal: a refund already exists; a *voided receipt* should be a reversing payment row,
  not a delete (the model deliberately has no soft delete).

**Frontend.**
- Folio: "Credit note" on a billed line, with reason and approval.
- Credit-note list and print.
- Bill shows credit notes as separate document references.

**Database.** 2 new tables; no change to folio lines.

**Dependencies.** Chart head for the reversal (a `HOTEL_CREDIT_NOTE` marker or reuse income
heads with negative legs); OPEN-6 (Mushak) will later constrain renaming/voiding a VAT invoice.

---

## A9. Source of business and market segmentation

**Class:** Essential (commercial) · **Priority:** P2

**Business purpose.** `hotel_booking_master` has no source, channel, market segment, or travel
agent. A hotel cannot answer "where does our business come from?" — walk-in vs phone vs corporate
vs OTA vs agent — which is the first question an owner asks and the basis for commission and
marketing spend.

**Benefits.**
- Channel/segment production reports and commission calculation.
- Justifies rate decisions and marketing spend.
- Enables agent statements and negotiated-volume tracking.

**Backend.**
- Columns on `hotel_booking_master`: `source_code` (`walk_in | phone | website | ota | agent |
  corporate | referral`), `market_segment`, `agent_party_id` (nullable), `channel_ref`
  (OTA confirmation number), `commission_rate`.
- Company-level `booking_sources` master (code, name, active, commission default) so tenants can
  add their own.
- Reports: production by source/segment/agent; commission payable; repeat vs new.
- Validation on booking store/update; source defaults to `walk_in` for desk-created bookings.

**Frontend.**
- Booking form: source dropdown, agent picker when `agent`, commission preview.
- Charge/commission shown on the folio or agent statement.
- Reports tab.

**Database.** 5 columns; 1 master table; 1 report.

**Dependencies.** Agent is a party (`cust_party_infos`); no new party concept.

---

## A10. Daily reconciliation and exception monitoring

**Class:** Essential · **Priority:** P1

**Business purpose.** The module's correctness rests on an invariant: the net movement of
`Advance Against Booking` for a booking must equal what the folio calls "owed". Vouchers,
transfers, write-offs, rounding, and night audits all touch it. Today that equality is asserted in
a PHP check script on a developer machine, not in production. There is also no alert when the night
audit or hold-expiry command does not run.

**Benefits.**
- A drift is found the morning it happens, not at year-end.
- Cron failure becomes a notification instead of a silent weekend of unbilled nights.
- Auditors get a dated reconciliation record.

**Backend.**
- `hotel_reconciliation_runs`: branch, date, checks (advance-head vs folio due, folio lines
  without voucher, payments without voucher, nights without booking, bookings checked out with
  balance and no party), counts, status, notes.
- `php artisan hotel:reconcile` scheduled after the night audit; writes one row per branch and
  emits an alert when a check fails.
- `php artisan hotel:health` or a `/health/hotel` endpoint reporting last successful audit and
  hold sweep per branch.
- Alerting through the existing notification/mail infrastructure or a webhook.

**Frontend.**
- Reports → **Reconciliation** tab: last run, failing checks, drill-through.
- Dashboard band: "Night audit: last run 01:00 today" in red when missing.

**Database.** 1 new table.

**Dependencies.** None; reuses `HotelVoucher` and `FolioBilling`.

---

## A11. Optimistic concurrency and idempotent writes

**Class:** Essential (data integrity) · **Priority:** P1

**Business purpose.** Two clerks can open the same booking; the last save wins, silently. A
double-clicked "Take money" or a retried request after a timeout can create a second receipt.
The per-night unique key protects inventory, but not the booking header, payments, discounts, or
transfers.

**Benefits.**
- No lost updates on booking edits.
- No duplicate receipts from double-submit or flaky networks.
- Safe retries for a future offline/mobile client.

**Backend.**
- Add `version` (or use `updated_at` as a precondition) to `hotel_booking_master`; `update`
  accepts `expected_version` and returns 409 with the current row when it differs.
- Accept an `Idempotency-Key` header on `bookings/store`, `folio/*/receive`, `folio/*/charge`,
  `folio/*/discount`, `bill/*/transfer`; persist key + response hash for 24 h; return the original
  answer on replay.
- Apply the same guard to `payment-entries/store` and `received-entries/store`.

**Frontend.**
- Send the version on save; on 409, offer "reload and re-apply" rather than overwriting.
- Generate an idempotency key per submit and keep it across retries.

**Database.** 1 column + 1 small idempotency table.

**Dependencies.** None.

---

## A12. Guest communication automation (confirmation, reminder, receipt)

**Class:** Essential (service quality) · **Priority:** P2

**Business purpose.** No hotel code sends SMS, email, or WhatsApp today — there is not a single
`Sms`, `Mail`, or notification call in `app/Http/Controllers/Hotel`. Confirmations, arrival
reminders, hold-expiry chases, and post-checkout receipts are all manual. The platform already has
an SMS module and mail infrastructure.

**Benefits.**
- Fewer no-shows and fewer "what time is check-in?" calls.
- Instant, professional confirmation raises conversion on phone bookings.
- Digital bill/receipt reduces printing and speeds corporate reimbursement.

**Backend.**
- `hotel_notifications` (booking, type, channel, recipient, template, status, sent_at, error) or
  reuse the platform's SMS log with a hotel purpose.
- Events: booking confirmed, hold expiring in 24 h, arrival tomorrow, checked out with bill,
  payment received, deposit overdue, no-show decision pending.
- Queue jobs (not synchronous HTTP), with retry and per-branch template settings in `metas`.
- Opt-out flag on the guest/booker; consent stored.
- Reuse the existing SMS provider and PDF paper (`HotelPaper`) for attachments.

**Frontend.**
- Booking form/folio: "Send confirmation", "Resend", message preview.
- Settings: template text per branch, sender ID, enable/disable per event.
- Timeline of sent messages on the booking.

**Database.** 1 log table (or reuse existing); templates in `metas`.

**Dependencies.** SMS gateway credentials; A12 needs no client rule.

---

# PART B — Optional enhancements

## B1. Split a charge across guests / split one bill between payers

**Class:** Optional · **Priority:** P2

**Business purpose.** A room-level charge (damage, extra blanket, room service) belongs to the
people who were in the room that night. A shared dormitory or a family may also want one bill
split between two payers. Today a charge lands on the booking, not on a person.

**Benefits.**
- Fair billing in shared rooms; fewer manual calculations at the desk.
- Two-payer settlement without cancelling and re-entering the booking.
- The folio stays one document, printed two ways.

**Backend.**
- `hotel_booking_charge_splits`: folio line, booking_guest (or payer party), amount, rounding
  remainder flag.
- `POST folio/{id}/charge` accepts `split: equal | by_guest | manual`; rounding remainder goes to
  the identified guest by a stated rule.
- A late charge after a guest settled needs a rule: post to the remaining guests, or to the
  booking's payer — expose it as a setting.
- Do **not** create a second folio (the client ruled out master/incidental split); a
  `payer_party_id` on the split row is the cheap route if two payers are wanted later.

**Frontend.**
- Charge dialog: "Split between guests in this room", preview of each share.
- Folio line expands to show shares.

**Database.** 1 new table. **Dependencies.** Guest rows must exist (allotment).

---

## B2. Waitlist and controlled overbooking

**Class:** Optional · **Priority:** P3

**Business purpose.** When a date is full, the desk writes names on paper. A waitlist captures
demand and lets the hotel release a room to the first suitable guest when a cancellation arrives.
Controlled overbooking (a percentage per room type) is standard revenue practice, but risky
without a clear policy.

**Benefits.**
- Recovers revenue from cancellations.
- Turns "we're full" into a managed queue.
- Provides demand data for pricing.

**Backend.**
- `hotel_waitlist`: branch, room type, arrival/departure, party, contact, priority, status,
  expires_at.
- A read that matches released nights to waiting entries and notifies the desk.
- Overbooking: a per-room-type `metas` allowance and a warning (not a block) when a booking would
  exceed physical beds; a "walk" workflow if it happens.

**Frontend.**
- Waitlist tab on Bookings; convert to booking in one click.
- Overbooking warning in the booking form with the count.

**Database.** 1 table. **Dependencies.** Client policy for overbooking; waitlist needs none.

---

## B3. Minibar, laundry, and ancillary services

**Class:** Optional · **Priority:** P3

**Business purpose.** Folio charge types already exist, but there is no minibar inventory per room,
no laundry ticket, and no ancillary service catalogue. These are high-margin revenue lines in a
real hotel.

**Benefits.**
- Minibar consumption is captured before checkout instead of disappearing.
- Laundry can be outsourced, tracked, and billed.
- Fewer missed charges.

**Backend.**
- Minibar: `hotel_room_minibar` (room, item, par level) + consumption posting to the folio; reuse
  `item-stock` for the store.
- Laundry: `hotel_laundry_tickets` + lines (guest, item, qty, service, rate); posting to the folio;
  optional vendor cost.
- `POST folio/{id}/ancillary` or extend `addCharge` with a service catalogue.
- Quick-charge presets per branch (`metas` or a small table).

**Frontend.**
- Housekeeping/minibar count screen (mobile-friendly).
- Laundry ticket form and list.
- Folio quick-charge tiles.

**Database.** 2–3 tables. **Dependencies.** Item stock exists; no new accounting head if charges
use existing income heads.

---

## B4. Guest requests, wake-up calls, and complaints

**Class:** Optional · **Priority:** P3

**Business purpose.** "Extra pillow", "wake me at 5", "the AC is noisy" are the daily texture of a
hotel. Today only a free-text guest note exists, attached to the person across stays, not to the
request.

**Benefits.**
- Requests are tracked to completion, not remembered.
- Complaints become data (category, room, resolution time).
- Wake-up calls integrate with a future PBX or an SMS fallback.

**Backend.**
- `hotel_guest_requests`: booking, room, guest, type (`request | wakeup | complaint`),
  description, due_at, assigned_to, status, resolution, timestamps.
- Endpoints for create/assign/complete; feed A1 (Today) and A2 (tasks).

**Frontend.**
- Requests panel on in-house guest / room.
- Today cockpit band.

**Database.** 1 table. **Dependencies.** None.

---

## B5. Lost and found

**Class:** Optional · **Priority:** P3

**Business purpose.** Items left behind are logged, stored, claimed, and eventually disposed of.
There is no record today.

**Benefits.**
- A searchable register; fewer disputes.
- Links the item to the stay/room/guest for contact.

**Backend.**
- `hotel_lost_found`: found date, room, booking/guest, description, photo, storage location,
  status (`held | returned | disposed`), claimer, timestamps.
- Photo upload follows the A4 document pattern.

**Frontend.**
- Housekeeping → Lost & Found list and form.

**Database.** 1 table. **Dependencies.** A4 storage pattern.

---

## B6. Batch actions and faster desk workflows

**Class:** Optional (UX) · **Priority:** P2

**Business purpose.** The booking list is a list of rows; every action is one row at a time. A
group of 20 rooms means 20 check-ins and 20 registration-card prints. The desk works in batches.

**Benefits.**
- Group check-in in one action.
- One print job for all registration cards.
- Bulk extend, bulk assign rooms, bulk no-show.

**Backend.**
- Batch endpoints that loop the existing single-item logic in one transaction (never a second
  copy of the rules).
- Dry-run answers for destructive batches.

**Frontend.**
- Row selection + action bar on Bookings, Allotment, Housekeeping.
- Print batch (one PDF, one card per guest).

**Database.** None. **Dependencies.** Existing single-item endpoints.

---

## B7. Drag-and-drop room move on the tape chart

**Class:** Optional (UX) · **Priority:** P3

**Business purpose.** Moving a guest is a dialog today. On the tape chart, a drag from one room to
another is the natural gesture and shows the hole it will leave.

**Benefits.**
- Faster moves, fewer mistakes.
- Conflict preview before the drop.

**Backend.** Reuse `bookings/move/{id}` with `dry_run`; no change.

**Frontend.**
- Drag handle on a tape cell; drop target validates free nights; preview the rate difference.

**Database.** None. **Dependencies.** Existing move endpoint.

---

## B8. Saved views, column chooser, and sticky totals

**Class:** Optional (UX) · **Priority:** P3

**Business purpose.** Large properties filter the same lists every day (arrivals, corporate dues,
dirty rooms). Rebuilding filters each morning is friction.

**Backend.** Optional: persist views per user/branch (`hotel_saved_views`).
**Frontend.** Save/load filters, visible columns, default sort; sticky footer totals.
**Database.** 1 small table or `localStorage` for a first version.
**Dependencies.** None.

---

## B9. Manager mobile / PWA for housekeeping and approvals

**Class:** Optional · **Priority:** P3

**Business purpose.** Housekeepers do not carry a laptop; managers approve discounts and credit
notes away from the desk. The repo has a `mobile-app`, but it contains no hotel code.

**Benefits.**
- Status updates happen in the room, not an hour later.
- Approvals do not wait for someone to return to the desk.
- Photos of a dirty room / damage become evidence.

**Backend.** Reuse the same endpoints; add a token-authenticated mobile scope and push
notifications.
**Frontend.** PWA or React Native screens: my tasks, mark clean, report maintenance, approve
discount/credit note.
**Database.** Device tokens if push is added.
**Dependencies.** A2 (tasks), A8 (credit notes).

---

## B10. Foreign-currency and multi-currency settlement

**Class:** Optional · **Priority:** P3

**Business purpose.** Foreign guests may pay in USD/EUR; the books are in BDT. Today the payment
model records an amount with no currency.

**Benefits.**
- Correct FX gain/loss and a truthful receipt.
- Fewer manual conversions at the desk.

**Backend.** `currency`, `fx_rate`, `amount_base` on payments; a daily rate source (manual or API);
posting in base currency; FX difference to its own head.
**Frontend.** Currency selector, rate preview, dual-amount receipt.
**Database.** 3 columns + optional rates table.
**Dependencies.** Client's accounting policy for FX differences.

---

## B11. Additional reports

**Class:** Optional · **Priority:** P2/P3 (per report)

| Report | Purpose | Priority |
|---|---|---|
| **Arrivals/departures sheet** (printable) | The paper the desk works from each morning | P1 |
| **In-house list** (printable, optional PII masking) | Fire/evacuation and phone calls | P2 |
| **Forecast / on-the-books** (next 7/30/90 days) | Pricing and staffing decisions | P2 |
| **Booking pace / pickup** | How bookings for a future date are accumulating | P2 |
| **Discount and write-off audit** | Who allowed what, why, how much | P2 |
| **Source / segment / agent production** | Marketing and commission | P2 |
| **Repeat guest and length-of-stay** | Loyalty and packaging | P3 |
| **Housekeeping productivity** | Rooms per attendant, time per room | P3 |
| **Maintenance and out-of-order log** | Downtime cost and recurring faults | P3 |
| **Cashier / day-end reconciliation** | Drawer count vs collection by method | P2 |
| **Foreign guest register (Form C)** | Statutory | P1 (with A4) |
| **Reconciliation exceptions** | Integrity (A10) | P1 |

**Backend.** Extend `HotelReportController` with one method per report; prefer SQL aggregates over
per-row PHP. **Frontend.** Tabs under Hotel → Reports; print layouts only where the paper is used
at the desk.

---

## B12. Performance and scale improvements

**Class:** Optional (technical) · **Priority:** P2

**Business purpose.** The module is correct but some reads are per-row and some reports are
unbounded. `bookingDue` already carries a "ponytail" note about one `moneyOf()` per booking (three
small queries each); the register and collection reports can return an entire property's history.

**Benefits.**
- Reports stay fast at 10k+ bookings.
- Nightly jobs finish inside their window.
- Less database load during check-in peaks.

**Backend.**
- `hotel_daily_metrics` (branch, date, rooms_available, room_nights_sold, room_nights_held,
  revenue, adr, revpar, arrivals, departures, no_shows) written by the night audit; reports and
  the dashboard read it instead of re-aggregating years of nights.
- Composite indexes for the hot paths: `(company_id, branch_id, stay_date)`,
  `(company_id, branch_id, status, check_in_date)`, `(booking_id, stay_date)`,
  `(company_id, branch_id, created_at)` on payments.
- Pagination/streaming and server-side CSV export for register, collection, and guest history.
- Cache `layout`, `ddl`, room types, and charge types per branch with invalidation on write.
- Replace `moneyOf()` loops with a single aggregate query or a maintained summary column.
- Add a query-count budget assertion to the hotel check scripts.

**Frontend.** Virtualised tables where rows can be thousands; export buttons.
**Database.** 1 table + indexes. **Dependencies.** None.

---

## B13. Testing, CI, and contract safety

**Class:** Optional (technical) · **Priority:** P2

**Business purpose.** The module has an unusually strong safety net — hundreds of assertions across
the `hotel_*_check.php` scripts — but CI does not run any of them, and the frontend builds with
`vite build` (no type-check). A regression can ship green.

**Benefits.**
- The check scripts become a gate instead of a developer ritual.
- Type drift and API mismatches are caught before deploy.
- Refactors are safe.

**Backend.**
- CI job: MySQL service, run `patch:add-unit-type`, then every `hotel_*_check.php` with `--write`
  on a disposable database; fail on any assertion.
- A schema-drift check between the patch steps and `database/sql/2026_*_sql`.
- Contract tests for the hotel routes (permission 403, validation 422, happy path).

**Frontend.**
- `tsc --noEmit` in CI (it currently fails on at least `PropertyGrid`'s `ownIds` and
  `HotelRoomType.vat_rate`).
- Playwright smoke: create booking → allot → folio → receive → checkout; hall sitting; no-show;
  move; credit note (once A8 lands).
- Typed API client generated from a route/schema list, or at minimum shared response types.

**Database.** None. **Dependencies.** A disposable CI database.

---

## B14. Observability and operational alerts

**Class:** Optional (technical) · **Priority:** P2

**Business purpose.** Two scheduled commands carry the module's correctness. Their failure is
silent except in a log file. There are no metrics for booking failures, 409 clashes, or slow
reports.

**Benefits.**
- A dead cron is noticed in minutes.
- Clash rate becomes a measurable signal (a rising 409 rate means stale availability screens).
- Slow endpoints are found before the desk complains.

**Backend.**
- Structured logs with request id and booking id; redact PII.
- Metrics: bookings created, night rows written, unique-key clashes, folio postings, audit runs,
  reconciliation failures, command duration.
- Health endpoint plus an uptime monitor.
- Alert channels: email/webhook on audit gap or reconciliation failure.

**Frontend.** A small "system health" band on the hotel dashboard (admin only).
**Database.** None (log/metrics store), unless alerts need persistence.

---

## B15. In-app help, SOPs, and a permission matrix

**Class:** Optional (documentation) · **Priority:** P3

**Business purpose.** The module has deep operational rules (piecemeal allotment, holds, billing
order, night audit). New staff learn them by asking a senior. The repo has `docs/help-*` and
`help-coverage.md`, but hotel-specific help is not part of that effort.

**Benefits.**
- Faster onboarding; fewer support calls.
- A written rule is easier to defend when a guest disputes a bill.

**Backend.** None.
**Frontend.** Contextual help drawer per screen; a printable one-page SOP per role; a permission
matrix beside the Role screen.
**Database.** None. **Dependencies.** Existing help system.

---

# PART C — Future-phase features

> These add new business lines or external integrations. Each is a project, not a task, and none
> should start before the essential items in Part A are stable.

## C1. Channel manager / OTA integration

**Class:** Future-phase · **Priority:** P3 (after A9)

**Purpose.** Two-way availability and rate sync with Booking.com, Agoda, Expedia, and Airbnb;
reservation pull with a channel reference; cancellation and modification propagation.

**Benefits.** Reach without manual re-entry; fewer overbookings; measurable channel ROI.

**Backend.** Channel mapping per room type/rate; availability push queue; reservation ingest with
idempotency (A11) and source tracking (A9); conflict resolution rules; commission fields.
**Frontend.** Channel manager settings, sync log, mapping grid, error console.
**Database.** `hotel_channels`, `hotel_channel_mappings`, `hotel_channel_events`.
**Dependencies.** A9 (source), A11 (idempotency), A10 (monitoring), stable availability API.

## C2. Direct booking engine on the website

**Class:** Future-phase · **Priority:** P3

**Purpose.** A guest books from `website-next` without a phone call. `website-next` currently has
no hotel pages.

**Benefits.** Direct bookings avoid OTA commission; 24/7 capture; the availability API already
exists.

**Backend.** Public availability/quote endpoints (rate-limited, no PII), hold creation with a short
TTL, payment gateway (C3), confirmation email (A12), anti-abuse.
**Frontend.** Search → room selection → guest details → pay → confirmation, responsive and
Bangla/English.
**Database.** Public hold/booking staging or reuse `hold` status with a source of `website`.
**Dependencies.** C3, A9, A11, A12.

## C3. Payment gateway and settlement reconciliation

**Class:** Future-phase · **Priority:** P3

**Purpose.** Cards and mobile wallets (bKash/Nagad/SSLCommerz/Stripe depending on the market) at
the desk and online, with settlement reports reconciled against the collection report.

**Benefits.** Fewer cash-handling errors; online prepayment; automatic reconciliation.

**Backend.** Gateway adapter, tokenisation, 3-D Secure, webhook handling with idempotency, refunds,
fees, settlement import, reconciliation against `hotel_booking_payments`.
**Frontend.** Payment pane with gateway redirect/modal, status polling, receipt.
**Database.** `hotel_gateway_transactions`, settlement batches; fee head.
**Dependencies.** A11, A10, A8 (refund/credit note).

## C4. Loyalty, memberships, and gift vouchers

**Class:** Future-phase · **Priority:** P3

**Purpose.** Repeat-guest points, member rates, and prepaid gift vouchers.

**Benefits.** Retention; prepaid cash flow; a reason to book direct.

**Backend.** Member profiles linked to guest key (A5 has the identity problem to solve first),
earn/burn ledger, voucher issuance/redemption with a liability head, expiry rules.
**Frontend.** Member lookup at booking, voucher sale/redemption, member statement.
**Database.** `hotel_members`, `hotel_member_ledger`, `hotel_gift_vouchers`.
**Dependencies.** A5, A9, C3.

## C5. Dynamic pricing / revenue management

**Class:** Future-phase · **Priority:** P3

**Purpose.** Per-date rates by room type, occupancy-based suggestions, and eventually automated
pricing. Rate plans are blocked on the client's rate-card rules; this is the larger version.

**Benefits.** Higher RevPAR; consistent pricing across channels.

**Backend.** Rate calendar per room type, restrictions (min stay, closed to arrival), yield
suggestions from `hotel_daily_metrics`, audit of rate changes.
**Frontend.** Rate calendar grid, bulk update, suggestion review.
**Database.** Rate calendar + restriction tables.
**Dependencies.** Client rate rules; A9; C1 for distribution.

## C6. Multi-property consolidation

**Class:** Future-phase · **Priority:** P3

**Purpose.** A company running two or more hotels sees consolidated occupancy, revenue, ADR,
RevPAR, receivables, and a shared guest registry (with privacy controls).

**Benefits.** Owner-level reporting without exporting spreadsheets; cross-property guest history.

**Backend.** Company-scoped report endpoints with a branch dimension; a consolidated permissions
model; a shared guest identity key (A5).
**Frontend.** Property switcher / "All properties" on the dashboard and reports.
**Database.** No new transactional table; reporting views or `hotel_daily_metrics` with branch.
**Dependencies.** A10, B12, A5.

## C7. Door-lock, PBX, and energy integrations

**Class:** Future-phase · **Priority:** P3

**Purpose.** Issue/revoke digital keys at check-in/out; wake-up calls through the PBX; optional
energy management.

**Benefits.** Fewer key errors; faster check-in; energy savings.

**Backend.** Vendor adapters, room-to-lock mapping, issue/revoke on status transitions, retry and
audit.
**Frontend.** Key issue status on allotment/check-out; failure queue.
**Database.** Mapping + event log.
**Dependencies.** A2, stable check-in/out flow.

## C8. Events & catering, restaurant POS, ticketing

**Class:** Future-phase · **Priority:** P3

**Purpose.** Already named as phases in the specification. Not repeated here beyond noting the
dependency: events need `booking_slots` (built) and the hall booking screen; restaurant depends on
OPEN-3; ticketing is resort-only.

---

# PART D — Consolidated priority view

## P1 — next

| # | Item | Class | Backend | Frontend | DB |
|---|---|---|---|---|---|
| A1 | Front Desk Today cockpit | Essential | 1 read endpoint | 1 screen + print | none |
| A2 | Housekeeping tasks + maintenance work orders | Essential | 2 tables, endpoints, voucher | Board + forms | 2 tables |
| A3 | Group blocks + rooming-list import | Essential | Block/pickup/import | Block screen + wizard | 2 tables |
| A4 | Guest documents + foreign-guest compliance | Essential | Columns, upload, report | Allotment + drawer + print | 1 table + cols |
| A5 | PII permission, masking, retention | Essential | Permission, mask, audit log, purge | Reveal UI | 1 table |
| A6 | AR ageing + statements + reminders | Essential | 2 reports, reminder log | Reports + print | 0–1 table |
| A7 | Deposit/prepayment schedules | Essential | Table, endpoints, command | Schedule builder | 1 table |
| A8 | Credit notes / bill reversal | Essential | Tables, posting, permission | Folio action + list | 2 tables |
| A10 | Reconciliation + exception monitoring | Essential | Command, table, alerts | Report tab + dashboard | 1 table |
| A11 | Optimistic concurrency + idempotency | Essential | Version, key store | Conflict handling | 1 table + col |
| B11a | Arrivals/departures sheet, foreign register | Optional | 1–2 reports | Print layouts | none |

## P2 — soon

A9 source of business · A12 guest communication · B1 charge splitting · B6 batch actions ·
B11 remaining reports · B12 performance/aggregates · B13 CI/testing · B14 observability.

## P3 — later

B2 waitlist/overbooking · B3 minibar/laundry · B4 requests/complaints · B5 lost & found ·
B7 drag-drop move · B8 saved views · B9 mobile/PWA · B10 multi-currency · B15 help/SOP.

## Future-phase

C1 channel manager · C2 booking engine · C3 payment gateway · C4 loyalty/vouchers ·
C5 dynamic pricing · C6 multi-property · C7 door lock/PBX · C8 events/POS/ticketing.

---

# PART E — Suggested sequencing

1. **Integrity first** — A10 (reconciliation), A11 (concurrency/idempotency), B13 (CI). These
   protect everything built afterwards and are cheap relative to their risk.
2. **Daily operations** — A1 (Today), A2 (tasks/maintenance), B11a (day sheet). This is what the
   desk feels immediately.
3. **Commercial** — A3 (groups), A7 (deposits), A6 (AR), A9 (source), A12 (communication).
4. **Compliance and billing correctness** — A4 (documents), A5 (PII), A8 (credit notes).
5. **Experience and scale** — B6, B1, B12, B14, then the P3 list.
6. **New business** — Part C, one project at a time, each after its dependencies above.

---

*Prepared from a read-only inspection of both repositories. No code, schema, or configuration was
changed.*
