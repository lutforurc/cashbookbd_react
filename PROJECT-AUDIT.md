# Project Audit — CashbookBD (React + Laravel API)

Two-repo sweep across five dimensions: tenant isolation, error leaks, dead UI,
broken data paths, debug/hygiene. **52 findings.**

- Frontend repo: `d:\cashbookbd_react`
- API repo: `D:\www\cashbook_api`

**Verification legend**
- `✓` adversarially verified (an independent agent opened the file and confirmed the code + impact)
- `~` finder-reported only — spot-check before fixing

> Already fixed this session (not listed): product delete wired end-to-end;
> unit-sale payment list branch-scoped; duplicate-receipt friendly message;
> company-logo writable-folder fallback; SignIn left panel rebuilt.

---

## P0 — Cross-tenant data access (security)

One company's logged-in user can read or modify another company's data because
`find($id)` runs with no `company_id`/`branch_id` guard. Same fix pattern
throughout: scope the query to the caller's company (directly, or via
`com_branches` where the table has no `company_id`).

- [ ] `✓` **CRITICAL — overwrite another tenant's payment** (amount, receipt_no, status→CONFIRMED) — `cashbook_api` `app/Http/Controllers/Realestate/UnitSalePaymentController.php:272` (`paymentUpdate`), route `api.php:809`
- [ ] `✓` **CRITICAL — edit another tenant's customer + inject an opening-balance journal into their books** — `cashbook_api` `app/Http/Controllers/Party/PartyController.php:844` (`apiUpdateContactDetailsById`), route `api.php:605`
- [ ] `✓` Read every company's unit-sale list (names, mobiles, amounts) when `branch_id` omitted — `cashbook_api` `app/Http/Controllers/Realestate/UnitSaleController.php:51` (`ddl`), route `api.php:802`
- [ ] `✓` List every tenant's sales/purchase orders — `cashbook_api` `app/Http/Controllers/SalesOrder/SalesOrderController.php:765` (`apiGetOrders`), route `api.php:258`
- [ ] `✓` Read any tenant's sale summary (total, due, customer) by iterating ids — `cashbook_api` `app/Http/Controllers/Realestate/UnitSaleController.php:141` (`summary`), route `api.php:803`
- [ ] `✓` Read any tenant's payment record (amount, cheque, bank) — `cashbook_api` `app/Http/Controllers/Realestate/UnitSalePaymentController.php:556` (`paymentEdit`), route `api.php:807`
- [ ] `~` Update any tenant's product (name, prices, category) — `cashbook_api` `app/Http/Controllers/Products/ItemController.php:1208` (`apiUpdateProducts`); read leak in `getProductEdit:1197`, route `api.php:228`
- [ ] `~` Mutate any tenant's employee/payroll (salary, allowances, status) — `cashbook_api` `app/Http/Controllers/Hrms/EmployeeController.php:657` (`employeeUpdate`); same pattern in `employeeEdit:644`, `employeeUpdateUI:728`, `employeeStatusChange:776`, route `api.php:624`
- [ ] `~` Read any tenant's customer PII (NID, mobile, nominee) — `cashbook_api` `app/Http/Controllers/Party/PartyController.php:1047` (`apiContactEdit`), route `api.php:601`
- [ ] `~` **Customer-portal IDOR** — a logged-in buyer reads another buyer's installment history — `cashbook_api` `app/Http/Controllers/Installment/InstallmentController.php:153` (`installmentDetailsById`), route `api.php:114`

## P0 — Hardcoded production credentials

- [ ] `✓` Owner email + password ship as literal strings in the JS bundle (`lutforurc@gmail.com` / real password). The "Set User" button is dev-gated, but the string is still in shipped JS — **remove it and rotate the password** — `cashbookbd_react` `src/pages/Authentication/SignIn.tsx:94`

---

## P1 — Raw SQL leaked to the browser

`catch { ... $e->getMessage() }` sends the exception (table names, DB name,
bound values) to the client. Same class as the duplicate-receipt bug already
fixed. Return a generic message; keep the detail in the log.

- [ ] `✓` `paymentCreate` — `cashbook_api` `UnitSalePaymentController.php:220`
- [ ] `✓` `paymentUpdate` cheque-collection catch → 422 body — `cashbook_api` `UnitSalePaymentController.php:446`
- [ ] `✓` `generalBankReceived` (daily voucher entry) — `cashbook_api` `app/Http/Controllers/Transaction/BankReceivedController.php:417`
- [ ] `✓` `generalBankPayment` (daily voucher entry) — `cashbook_api` `app/Http/Controllers/Transaction/BankPaymentController.php:372`
- [ ] `✓` `voucherDestroy` — `cashbook_api` `app/Http/Controllers/settings/VoucherSettingsController.php:181`; siblings at `:228`, `:382`, `:415`
- [ ] `✓` `apiSalaryPayment` — `cashbook_api` `app/Http/Controllers/Hrms/SalaryController.php:1794`
- [ ] `~` `apiSalarySheetUpdate` — `cashbook_api` `SalaryController.php:1442`; also `apiSalarySheetRowDelete:1557`
- [ ] `~` `apiFestivalBonusGenerate` — `cashbook_api` `app/Http/Controllers/Hrms/FestivalBonusController.php:193`; also `:363`, `:602`
- [ ] `~` Voucher image upload leaks server paths — `cashbook_api` `app/Http/Controllers/Uploader/VoucherFilesUploaderController.php:854`
- [ ] `~` `removeApprovalById` / `removeApproval` — `cashbook_api` `app/Http/Controllers/VoucherModification/VoucherModificationController.php:769`, `:671`

**Root cause worth fixing once:** the `notFound()` helper puts `$message`
straight into the JSON body (`cashbook_api` `app/Helpers/helpers.php:88`).

---

## P2 — Dead UI (clickable but does nothing)

Icons render with `cursor-pointer` but `onClick={() => {}}` — same as the
Product trash icon already fixed.

- [ ] `✓` **Requisitions** — view/edit/delete all dead — `cashbookbd_react` `src/components/modules/Requisition/Requisitions.tsx:182`
- [ ] `✓` **Chart of Accounts L2** — all three buttons dead — `cashbookbd_react` `src/components/modules/chartofaccounts/leveltwo/CoaL2.tsx:88`
- [ ] `✓` **CoA L3** — delete + view dead (edit works) — `cashbookbd_react` `src/components/modules/chartofaccounts/levelthree/CoaL3.tsx:111`
- [ ] `✓` **CoA L4** — delete + view dead (edit works) — `cashbookbd_react` `src/components/modules/chartofaccounts/levelfour/CoaL4.tsx:109`
- [ ] `✓` **ChargeType** status toggle — `showToggle` on but `handleToggle` commented out — `cashbookbd_react` `src/components/modules/real-estate/charge-types/ChargeTypeList.tsx:194`
- [ ] `✓` **BuildingList** flats expand/collapse — `toggleBuilding` never called, `(+)` slot is empty fragment — `cashbookbd_react` `src/components/modules/real-estate/buildings/BuildingList.tsx:62`
- [ ] `~` **Category** view button dead — `cashbookbd_react` `src/components/modules/category/Category.tsx:167`
- [ ] `~` **ChequeUpdate.tsx** orphan — 445-line cheque-status screen, no import/route — `cashbookbd_react` `src/components/modules/real-estate/checks/ChequeUpdate.tsx`
- [ ] `~` **EditProduct.tsx** orphan — product-edit route renders `AddProduct` instead — `cashbookbd_react` `src/components/modules/product/EditProduct.tsx`
- [ ] `~` Other orphans: `SignUp.tsx`, `LabourIndex.tsx`, `pages/dashboard/ECommerce.tsx`, `router/PrivateRouter.tsx`, `dashboard/HeadOfficeReceivedChart.tsx`

---

## P2 — Screens that render empty or white-screen

- [ ] `✓` **FloorList** — reads pagination total one level too deep, pages past the first are unreachable — `cashbookbd_react` `src/components/modules/real-estate/building-flat/FloorList.tsx:58`
- [ ] `✓` **Units branch filter** is a no-op — thunk drops `branch_id` — `cashbookbd_react` `src/components/modules/real-estate/units/unitSlice.tsx:255`
- [ ] `✓` **BuildingUnitsList** — unguarded `row.flat.building.project.area.name` white-screens the list on one orphaned row — `cashbookbd_react` `src/components/modules/real-estate/units/BuildingUnitsList.tsx:190`
- [ ] `✓` **FloorList** — same unguarded chain — `cashbookbd_react` `FloorList.tsx:139`
- [ ] `✓` **BuildingList** — loader bound to the unrelated `history` slice, never shows — `cashbookbd_react` `BuildingList.tsx:259`
- [ ] `✓` **BuildingList** — unguarded `row.project.area.name` — `cashbookbd_react` `BuildingList.tsx:202`
- [ ] `✓` **ProjectsList** — unguarded `row.area.branch.name` — `cashbookbd_react` `src/components/modules/real-estate/project/ProjectsList.tsx:132`
- [ ] `~` **ChangeList** pagination computes totals from the wrong slice → NaN — `cashbookbd_react` `src/components/modules/history/ChangeList.tsx:65`
- [ ] `~` **Employees** per-page handler reads paginator total at wrong depth → NaN — `cashbookbd_react` `src/components/modules/hrms/employee/Employees.tsx:112`
- [ ] `~` **BuildingUnitsList** loader commented out — `cashbookbd_react` `BuildingUnitsList.tsx:287`

---

## P3 — Hygiene / debug leftovers

- [ ] `~` `console.log` dumps signed-in user's permission map — `cashbookbd_react` `src/components/modules/user/UserList.tsx:44`
- [ ] `~` `console.log` prints full journal accounting payload on save — `cashbookbd_react` `src/components/modules/transactions/journal/Journal.tsx:133`
- [ ] `~` Render-path `console.log` of product payloads — `cashbookbd_react` `src/components/modules/product/AddProduct.tsx:288` and `EditProduct.tsx`
- [ ] `~` Mojibake `âœ…` / `âŒ` (double/triple-encoded UTF-8) in shipped source — `Orders.tsx:751`, `BankPayment.tsx:428`, `BankReceived.tsx:435`, `CompareSingleItem.tsx`, `SalesLedger.tsx`, `CustomerDashboard.tsx`; API side `EmployeeController.php:593`, `SalaryController.php`, `AddUnitTypeToBuildingUnits.php:2261`
- [ ] `~` Unauthenticated `/debug` route exposes app config — `cashbook_api` `routes/web.php:118`
- [ ] `~` Unauthenticated test-PDF route outside auth group — `cashbook_api` `routes/api.php:100`
- [ ] `~` Dead duplicate `mainTransactionMasterByRequest` (function_exists-guarded, never runs) — `cashbook_api` `app/Helpers/helpers.php:1825`
- [ ] `~` Committed backup file inside `app/` — `cashbook_api` `app/Http/Controllers/Reports/ReportsController.php.bak_product_profit_loss_fix`
- [ ] `~` Debug stub returns literal `'Lutfor'` — `cashbook_api` `app/Http/Controllers/Requisition/RequisitionController.php:600` (`reqitem`, currently unrouted)

---

## Pending feature (requested, not yet built)

- [ ] **Cheque details into Remarks** — compose `Cheque No: <ref>, <bank>, <branch>`
  into the ledger narration. Flow is mapped: extend `paymentRemarks()` at
  `cashbook_api` `app/Http/Controllers/Realestate/UnitSalePaymentController.php:626`;
  the cheque fields (`reference_no`, `bank_name`, `branch_name`) are already on
  the payload. **Note:** the create request currently validates `bank_name` and
  `branch_name` but not `reference_no` — that gap needs closing too
  (`app/Http/Requests/Realestate/UnitSalePaymentCreateRequest.php`).

---

## Suggested order

1. **P0 security** — the two CRITICAL cross-tenant writes first, then the rest of the IDOR cluster (same fix pattern, can batch).
2. **P0 password** + **P1 SQL leaks** (fix `notFound()` root cause once).
3. **Cheque Remarks** feature.
4. **P2 dead UI + empty screens.**
5. **P3 hygiene.**
