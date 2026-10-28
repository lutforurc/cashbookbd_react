# Hotel Bill-wise Due Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a 'bill'-mode hotel branch check a guest out with a balance, keep it in Advance Against Booking, and later collect / transfer / write it off, with one outstanding figure used everywhere.

**Architecture:** One new method `BookingBalance::outstanding(Booking)` (billed − paid − written off) replaces five hand-rolled subtractions. Write-offs live in a new table `hotel_booking_writeoffs` (not in `BookingPayment`, so `paidOn()` and refund limits at FolioController ~730/781 stay untouched). Branch setting `hotel_due_mode` is a meta row read by `ItemTax`-style static `dueMode()`.

**Tech Stack:** Laravel API (raw SQL for DB changes, no migrations), React front end. Verification = standalone `php xxx_check.php` scripts that go through controllers and roll back (the repo's convention, see `hotel_bill_transfer_check.php`).

**Spec:** `F:\All_Database\cashbookbd_react\docs\superpowers\specs\2026-10-27-hotel-bill-wise-due-design.md`

## Global Constraints

- Absent/unknown `hotel_due_mode` = `customer`; 'customer' branches change in no way.
- Permissions: `hotel.booking.checkout_due`, `hotel.booking.writeoff` (effective via `users.role_id`).
- Write-off voucher: Dr Hotel Discount Allowed, Cr Advance Against Booking. No new voucher at check-out.
- Do not reopen `FolioController::discount` for closed stays.
- DB changes raw SQL; read `.env` first to see which DB; query with php + PDO. After routes: `php artisan route:clear`.
- React: `npm run build` does not type-check; check real exit code (`npx tsc --noEmit`).
- No commit/push unless asked.

## Review Focus

- Write-off equal to full due → outstanding 0 exactly (float rounding, 2dp).
- Write-off then transfer to a party → party gets only the remainder.
- Write-off on a carried booking, a not-checked-out booking, or amount > due → refused.
- Check-out with balance, bill mode, no mobile / no reason / no permission → refused with old message where permission is missing.
- Customer-mode branch: balance with no party still refused exactly as today.

---

### Task 1: Setting `hotel_due_mode`

**Files:** Modify `app/Services/Hotel/ItemTax.php` (next to `vatMode` ~58); `app/Http/Controllers/Company/BranchController.php` (~745, ~1053, ~1699); `F:\All_Database\cashbookbd_react\src\components\modules\branch\AddBranch.tsx` (Hotel Setup).

**Interfaces:** Produces `ItemTax::dueMode(?int $branchId): string` returning `'customer'|'bill'`, anything else → `'customer'`.

- [ ] Step 1: Write `hotel_due_mode_check.php`: `dueMode` is `customer` with no meta, `bill` after setting meta, `customer` for meta `'xyz'`.
- [ ] Step 2: Run it; expect FAIL (method missing).
- [ ] Step 3: Implement `dueMode` mirroring `vatMode` (same `meta()` call). In BranchController add `hotelDueMode(Request,int)` mirroring `hotelVatMode` (:745), expose `hotel_due_mode` on the branch payload (:1053), save the meta row (:1699).
- [ ] Step 4: AddBranch.tsx: select "বাকির হিসাব" (customer / bill) beside VAT Setup, default customer.
- [ ] Step 5: Run check → PASS; `npx tsc --noEmit` exit 0.

### Task 2: Single outstanding method + write-off table

**Files:** Create `app/Services/Hotel/BookingBalance.php`, `app/Models/Hotel/BookingWriteoff.php`; SQL for table `hotel_booking_writeoffs` (id, company_id, branch_id, booking_id, amount, reason, main_trx_id, user_id, created_at); modify the five call sites: `FolioController.php:~133`, `BillTransferController.php:246-265`, `CheckOutController.php:~527/~600`, `GuestProfileController.php:~357`, `HotelPaper.php:~71/~149`.

**Interfaces:** Produces `BookingBalance::writtenOff(int $bookingId): float`, `BookingBalance::outstanding(Booking $b): float` (= `round(totalsFor($b)['rounded'] - paidOn - writtenOff, 2)`).

- [ ] Step 1: Check script `hotel_outstanding_check.php`: with an inserted write-off row, all five endpoints (folio, transfer state, checkout plan, guest profile, printed bill) report the same reduced figure; with none, figures equal today's. Capture baseline figures first on an untouched booking.
- [ ] Step 2: Run; expect FAIL.
- [ ] Step 3: Add table (raw SQL via PDO on the DB named in `.env`; also add to the install command beside `hotel_booking_bill_transfers` creation at AddUnitTypeToBuildingUnits ~11669) and the model + service.
- [ ] Step 4: Route all five sites through `outstanding()`. Add `written_off` to folio and printed-bill payloads; `HotelPaper::bill` shows a "Written off" line only when > 0.
- [ ] Step 5: Run check → PASS; re-run `hotel_bill_transfer_check.php` and `hotel_booking_check.php` for no regression.

### Task 3: Check-out with balance (bill mode)

**Files:** Modify `CheckOutController.php` (`store` ~259, `plan`/`show`); `config/route_permissions.php` untouched (permission checked in code like `hotel.booking.transfer`); SQL to insert permission `hotel.booking.checkout_due` (Hotel, web) per DB, and in the install command list (~2995, ~7179).

**Interfaces:** `show()` payload gains `can_checkout_due: bool` (= dueMode bill AND user has permission AND balance > 0).

- [ ] Step 1: Check script `hotel_checkout_due_check.php`: bill mode + permission + reason + mobile → closes, balance remains in Advance head, no carry, no extra voucher, `BookingRoomCheckout` row has user+reason. Refusals: no permission (old message), no reason, no mobile, customer mode, balance < 0.
- [ ] Step 2: Run; expect FAIL.
- [ ] Step 3: In `store`, when `closes_booking && balance>EPSILON && !$partyId`: if `dueMode==='bill'` and allowed → validate reason + `booker_mobile ?? guest mobile`, set `$party=null` and skip carry; else old refusal. Party supplied → unchanged carry path.
- [ ] Step 4: React check-out screen: "বাকি রেখে চেক-আউট" option + reason box + due amount text, shown when `can_checkout_due`.
- [ ] Step 5: Run check → PASS; `hotel_bill_transfer_check.php` still PASS.

### Task 4: Write-off after check-out

**Files:** Modify `FolioController.php` (new `writeOff`), `HotelVoucher.php` (new `postWriteOff`), `routes/api.php` + `config/route_permissions.php` (POST `bookings/folio/{id}/writeoff` → `hotel.booking.writeoff`), then `php artisan route:clear`; SQL for permission `hotel.booking.writeoff`; React Folio screen.

**Interfaces:** `HotelVoucher::postWriteOff(Booking $b, float $amount, string $reason): int` (main_trx id; Dr Hotel Discount Allowed / Cr Advance Against Booking). Folio payload gains `can_writeoff`, `due_banner`.

- [ ] Step 1: Check script `hotel_writeoff_check.php`: partial write-off lowers due everywhere; full → 0; ledger of Advance head moves by amount; after write-off a transfer moves only the remainder; refused: no reason, amount > due, amount ≤ 0, not checked-out, carried.
- [ ] Step 2: Run; expect FAIL.
- [ ] Step 3: Implement endpoint in one DB transaction: guard → voucher → `BookingWriteoff` row → `BookingStatusLog` entry.
- [ ] Step 4: React Folio: banner for checked-out booking with due; buttons Receive / Transfer / Write-off (modal with amount + reason).
- [ ] Step 5: Run check → PASS.

### Task 5: Report "Booking-wise due"

**Files:** Create `app/Http/Controllers/Hotel/BookingDueReportController.php` (GET `reports/booking-due`, permission `hotel.booking.view`, no new permission); route + `route_permissions.php`; React report screen + `SIDEBAR_MENUS` + `MENU_PERMISSIONS`.

**Interfaces:** Response `{rows:[{booking_no, guest, mobile, checkout_date, billed, paid, written_off, due, days_overdue, checked_out_by, reason, booking_id}], totals:{due, advance_held}}`; `advance_held` = sum of `paidOn` over active (not checked-out) bookings.

- [ ] Step 1: Check script `hotel_booking_due_report_check.php`: includes checked-out, uncarried, due>0; excludes carried, fully written-off, and open stays; totals footer correct; figures equal `outstanding()`.
- [ ] Step 2: Run; expect FAIL.
- [ ] Step 3: Implement via `BookingBalance` / `GuestProfileController::moneyOf` (no second formula).
- [ ] Step 4: React screen with row link to folio, footer with total due and advance held; sidebar entry.
- [ ] Step 5: Run check → PASS; `php artisan route:clear`; `npx tsc --noEmit` exit 0.

### Task 6: Per-DB permissions and final pass

- [ ] Step 1: Read `.env`; insert both permissions with raw SQL into the target DB (idempotent `INSERT ... WHERE NOT EXISTS`); owner assigns via Roles screen.
- [ ] Step 2: Run all new check scripts + `hotel_bill_transfer_check.php`, `hotel_booking_check.php`; `npm run build` exit code 0.

## Self-review

Spec §4→T1, §5→T3, §6 (write-off + single figure + printed line)→T2/T4, §7→T5, §8→T3/T4/T6, §9→T1/T3/T4/T5. Open spec items decided: write-off stored in own table; report reuses `hotel.booking.view`.
