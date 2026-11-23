# Flexible Salary Components — Build Brief (coding agent-এর জন্য)

**Date:** 2026-11-23
**পড়ার ক্রম:** এই brief → [`salary-components-how-it-works.md`](./salary-components-how-it-works.md) → [`salary-management-flexible-components.md`](./salary-management-flexible-components.md) → [`salary-components-schema.sql`](./salary-components-schema.sql)

এই brief যা বলে, design doc-এর সাথে অমিল হলে **এই brief-ই চূড়ান্ত**।

---

## 0. Repo ও পরিবেশ

| | Path | Branch (2026-11-23) |
|---|---|---|
| Frontend (React + TS) | `D:\cashbookbd_react` | `Reseller-ui` |
| Backend (Laravel 13) | `D:\www\cashbook_api` | `Reseller` |
| Local DB | MariaDB 12.1.2, database `nibirnirman` (`.env`) | — |

- Phase 1 schema ইতিমধ্যে local DB-তে চালানো ও যাচাই করা: ৮টি table, ১২২ জন employee-এর revision, permission।
- Schema বদলাতে হলে **শুধু** `app/Services/Hrms/SalaryComponentSchema.php` বদলাবেন (additive, re-runnable), তারপর `php artisan patch:add-unit-type`। Raw SQL হাতে চালাবেন না।

---

## 1. চূড়ান্ত সিদ্ধান্ত (owner-এর অনুমোদিত)

| # | বিষয় | সিদ্ধান্ত |
|---|---|---|
| D1 | House Rent / Medical | আলাদা pay করা **হবে না**। Default structure = Basic + Mobile Bill। `hrm_employees.house_rent` / `medical_allowance` কোথাও যোগ করবেন না। |
| D2 | Per-day খাত (Lunch, Attendance Bonus, Mid Day Meal) | প্রথম release-এ **নেই**। Master-এ seed আছে, কিন্তু calculator Phase 3-এ `per_day` সমর্থন পাবে। এখন `per_day` বা `formula` খাত revision-এ এলে calculator **exception দেবে**, চুপচাপ ০ নয়। |
| D3 | Mid-month revision | **পরের মাস থেকে**। নতুন revision-এর `effective_from` সবসময় কোনো মাসের ১ তারিখ — API validation-এ enforce করুন। |
| D4 | Print-এ column | যে খাতে sheet-এর কোনো employee-এর amount > ০, শুধু সেগুলো; Column Manager দিয়ে user লুকাতে পারবে (localStorage, user+branch key)। |
| D5 | Loan | এখনকার মতো — loan module থেকে, Generate screen-এ editable। Revision-এ নয়। |
| D6 | Attendance deduction ভাজক | **30** (`hrm_payroll_settings.deduction_day_divisor = fixed`)। Settings থেকে `month_days` বেছে নেওয়া যাবে, কিন্তু default বদলাবেন না। |
| D7 | Voucher ledger | **এক ledger**, ঠিক এখনকার মতো (§3.3)। `expense_ledger_id` field থাকবে কিন্তু Phase 2-এ পড়া হবে না। |
| D8 | Feature flag | Branch-ভিত্তিক `metas` row: `meta_key = 'payroll_engine'`, `meta_value = 'components'`। Row না থাকলে = পুরোনো engine। Default সবার জন্য বন্ধ। |
| D9 | Shadow run মাস | **`112026`** (November 2026)। ⚠️ 2026-11-23-এ local `nibirnirman`-এ এই মাসের কোনো sheet নেই — সর্বশেষ `102026` (১৭ row, ১ branch); `072026` ও `062026`-এ ৩টি branch। কোনো branch-এ overtime sheet নেই। 112026 পুরোনো engine-এ generate না হওয়া পর্যন্ত T5 এই মাসে চলবে না — owner-কে জিজ্ঞাসা করুন। |

---

## 2. অপরিবর্তনীয় নিয়ম

1. **P&L Account screen বা তার backend কখনো বদলাবেন না।** অন্য সব এর সাথে মিলবে।
2. Screen-এর menu, label, field বা আচরণ বদলালে `public/help/`-এর topic একই কাজে update করে `npm run help:check` চালান। নতুন screen = নতুন topic।
3. পুরোনো Salary Generate / Sheet / Print / Update / Payment **flag বন্ধ থাকা branch-এ হুবহু আগের মতো** চলবে। কোনো পুরোনো code path মুছবেন না।
4. `hrm_salary_payments` একমাত্র employee-row table। কোনো parallel payroll item table নয়।
5. Revision কখনো `UPDATE` নয় (শুধু আগেরটার `effective_to` বসানো ও `status = closed`)।
6. Generate-এ amount client থেকে বিশ্বাস করা হবে না; server হিসাব করবে। Client শুধু adjustment (loan, other deduction, excluded employee) পাঠাবে।
7. প্রতিটি নতুন endpoint `denyUnlessPermitted('<key>')` দিয়ে শুরু, এবং প্রতিটি query `company_id = auth()->user()->company_id` দিয়ে scope করা।
8. Commit একটি কাজ = একটি commit। Commit message শেষে attribution line।

---

## 3. বর্তমান কোড — আগে পড়তে হবে

### 3.1 Backend

| ফাইল | কী শিখবেন |
|---|---|
| `app/Http/Controllers/Hrms/SalaryController.php` | `apiSalaryGenerate()` (~১০৭৭): month parse (`month_id` `"04-2025"` → `payment_month` `"042025"`), duplicate guard (active voucher থাকলে 422), stale row মুছে ফেলা, loan master, voucher। `apiMakeSalary()` (~৪২৬): `hrm_salary_payments` row-এর সব column। `attendanceDeductionAmount()` (~৫৬০), `proratedSalaryAmount()` (~৫৭১), `attendanceSummariesForSalary()` (~৫৮৪)। |
| ঐ ফাইলের `salariesJournalEntry()` (~২৫৮) | Voucher-এর তিন লাইন — §3.3 |
| `app/Http/Controllers/Hrms/EmployeeController.php` | `employeeStore()` (~৫৩১) ও `employeeUpdate()` (~৬৯২): `basic_salary`, `others_allowance` লেখা হয়; company scope `Employee::where('company_id', …)` |
| `app/Helpers/helpers.php` → `denyUnlessPermitted()` (~২৪৪৬) | Permission check-এর ধরন; উদাহরণ `PurchaseAdvance/PurchaseAdvanceController.php` (class constant হিসেবে permission key) |
| `foundData()` / `notFound()` helper | Response-এর ধরন — সব HRMS endpoint এটাই ফেরত দেয় |
| `routes/api.php` (~১৮৭৮ "Salary Module APIs") | Route group; নতুন route এখানেই যোগ করুন |
| `app/Services/Hrms/SalaryComponentSchema.php` | Phase 1 schema ও seed — কোন column কী |
| `AddUnitTypeToBuildingUnits.php` → `seedDueListShowAreaMeta()` | `metas` row-এর গঠন (`identify_id`, `branch_id`, `meta_key`, `meta_value`) — feature flag এভাবেই |

### 3.2 Frontend

| ফাইল | কী শিখবেন |
|---|---|
| `src/components/modules/hrms/salary/SalarySheetGenerate.tsx` | বর্তমান Generate screen: filter, table, client-side হিসাব (`proratedAmount`, `attendanceDeduction`, `netSalary`), payload |
| `.../salary/SalarySheet.tsx`, `SalarySheetPrint.tsx`, `SalarySheetUpdate.tsx`, `salarySlice.tsx` | Sheet, print ও API slice-এর ধরন |
| `.../employee/EmployeeCreate.tsx`, `EmployeeEdit.tsx`, `employeeSlice.tsx` | Salary field এখন কোথায় |
| `.../designation-level/DesignationLevels.tsx` + `AddDesignationLevel.tsx` | ছোট master CRUD screen-এর ধরন — Salary Components / Structures এটা অনুসরণ করবে |
| `src/App.tsx` (~১৬৮৮) | Route ও `RequirePermission` |
| `src/components/Sidebar/index.tsx` (~৪২৭৫), `Sidebar/menuPermissions.ts`, `Header/globalSearchItems.ts` | Menu entry, এক menu = এক permission, global search |
| `public/help/hrms.json` (`salary-generate`, ~৭৩০) | Help topic-এর গঠন; `scripts/check-help.mjs` |

### 3.3 বর্তমান salary voucher (বদলাবেন না)

`salariesJournalEntry()`:

| coa4_id | নাম | দিক | Amount |
|---|---|---|---|
| 148 | Salary A/C | Dr | gross |
| 38 | Accounts Payable | Cr | net |
| 39 | Staff Loan | Cr | total deduction (> ০ হলে) |

নতুন engine **এই তিন লাইন, একই amount** তৈরি করবে (D7)।

### 3.4 বর্তমান হিসাব (shadow run-এ হুবহু মিলতে হবে)

```text
prorate(amount, days, monthDays) = days >= monthDays ? amount : ceil(amount / monthDays × days / 10) × 10
basic     = prorate(monthly_basic, payable_days, month_days)
mobile    = monthly sheet ? prorate(others_allowance, payable_days, month_days) : 0
overtime  = overtime sheet ? overtime_amount : 0
gross     = basic + mobile + overtime
base      = basic + mobile
att_ded   = daily labour ? 0 : round((late_ded_days + early_ded_days) × round(base / 30, 2) / 10) × 10
total_ded = provident_fund + loan + others_deduction + att_ded
net       = gross − total_ded
```

`payable_days` আসে `attendanceSummariesForSalary()` থেকে; summary না থাকলে request-এর `working_days`।

---

## 4. কাজের তালিকা

প্রতিটি task আলাদা commit। আগেরটা যাচাই না হলে পরেরটা শুরু নয়।

### T1 — Employee save-এ dual-write
- `EmployeeController::employeeStore()` / `employeeUpdate()`: legacy column লেখা আগের মতো, তারপর `SalaryRevisionService` (নতুন, `app/Services/Hrms/`) দিয়ে —
  - Employee-এর কোনো revision না থাকলে: backfill-এর মতো revision (`effective_from = 2000-01-01`, default structure, basic + mobile_bill)।
  - থাকলে, এবং `basic_salary` বা `others_allowance` বদলালে: নতুন revision, `effective_from` = **পরের মাসের ১ তারিখ** (D3); আগেরটার `effective_to` = তার আগের দিন, `status = closed`। একই `effective_from`-এ (ভবিষ্যতের মাস) আগে থেকেই একটি revision থাকলে নতুন বানাবেন না — সেটারই line প্রতিস্থাপন করুন, কারণ ভবিষ্যৎ revision এখনো কোনো payroll-এ ব্যবহৃত হয়নি। এটাই "revision কখনো UPDATE নয়" নিয়মের একমাত্র ব্যতিক্রম।
  - সব একটি transaction-এ।
- **Done যখন:** একজন employee-এর Basic বদলালে ঠিক একটি নতুন revision; পুরোনোটা closed; বেতন না বদলালে কোনো নতুন revision নয়; legacy column আগের মতো। Pest/PHPUnit feature test।

### T2 — Salary Components (API + screen)
- API: `GET/POST /salary/components`, `PUT /salary/components/{id}`, `PATCH /salary/components/{id}/status` — permission `salary.component.manage`।
- নিয়ম: `code` create-এর পর বদলায় না; `is_system = 1` হলে শুধু `name`, `short_name`, `sort_order` বদলানো যায়; delete নেই, শুধু status; `(company_id, code)` unique-এ সুন্দর error।
- Screen: `src/components/modules/hrms/salary-component/` — `DesignationLevels` ধরনে list + form। Sidebar: **HRM → Salary → Salary Components**। Route, `menuPermissions.ts`, `globalSearchItems.ts`।
- Help topic `salary-components` (`hrms.json`)।
- **Done যখন:** CRUD কাজ করে, system খাতের code/type বদলানো যায় না, permission ছাড়া 403, `npm run help:check` পাস, `npx tsc --noEmit` পাস।

### T3 — Salary Structures (API + screen)
- API: `GET/POST /salary/structures`, `PUT /salary/structures/{id}` — `salary.structure.manage`। Structure-এর component list একসাথে save (replace)।
- Screen: দুই প্যানেল — available / selected, ক্রম, default amount। Menu **HRM → Salary → Salary Structures**। Help topic `salary-structures`।
- **Done যখন:** structure তৈরি/সম্পাদনা; disabled খাত available-এ আসে না; help + tsc পাস।

### T4 — Employee Salary tab (revision)
- API: `GET /salary/employees/{id}/revisions`, `POST /salary/employees/{id}/revisions` — `salary.revision.manage`। T1-এর service ব্যবহার।
- `effective_from` মাসের ১ তারিখ না হলে 422 (D3)। Basic বাধ্যতামূলক। Earning-এ negative নয়।
- `EmployeeEdit.tsx`-এ Salary tab: structure dropdown, effective month, component grid, gross preview, revision history। **Flag বন্ধ branch-এও** tab দেখা যাবে (data তৈরির জন্য), কিন্তু পুরোনো Basic/Mobile input-ও থাকবে; tab থেকে save করলে legacy column-ও update হবে (basic → `basic_salary`, mobile_bill → `others_allowance`)।
- Help: `employee-form` topic-এ নতুন section।
- **Done যখন:** tab থেকে revision তৈরি → legacy column মিলে যায় → T1-এর নিয়ম ভাঙে না।

### T5 — `SalaryCalculator` + shadow run
- `app/Services/Hrms/SalaryCalculator.php`: `preview(branchId, paymentMonth, sheetType, employeeIds, adjustments)` → employee-প্রতি line সহ ফল। §3.4-এর হিসাব, কিন্তু খাত আসবে active revision থেকে; settings থেকে ভাজক/rounding; `include_in_deduction_base`; `salary_sheet_types`; D2 অনুযায়ী `per_day`/`formula`-এ exception।
- Artisan command `payroll:shadow {month=112026} {--branch=}`: প্রতিটি branch-এর জন্য ঐ মাসের **saved** `hrm_salary_payments` row (active voucher) নিয়ে, একই `working_days`, attendance summary, loan ও others_deduction দিয়ে calculator চালাবে, এবং `basic_salary`, `others_allowance`, `overtime_amount`, `gross_salary`, `attendance_deduction_amount`, `total_deduction`, `net_salary` তুলনা করবে। Mismatch তালিকা + সারাংশ। **DB-তে কিছু লিখবে না।**
- **Done যখন:** `php artisan payroll:shadow 112026` → mismatch **০**। না মিললে calculator ঠিক করুন, পুরোনো data নয়। ঐ মাসে sheet না থাকলে command তা বলবে এবং সবচেয়ে কাছের মাস সুপারিশ করবে — owner-কে জানান, নিজে মাস বদলাবেন না।

### T6 — নতুন Generate (flag-এর পেছনে)
- `POST /salary/preview` ও `POST /salary/generate-v2` — `salary.generate` permission (বর্তমান key)। Branch-এ `payroll_engine = components` না থাকলে 409।
- Generate এক transaction-এ: duplicate guard ও stale cleanup হুবহু `apiSalaryGenerate()`-এর মতো → `hrm_payroll_runs` → `hrm_salary_payments` (সব legacy column + `payroll_run_id`) → `hrm_salary_payment_components` → loan master (বর্তমানের মতো) → voucher `salariesJournalEntry()` একই amount।
- Frontend: `SalarySheetGenerate.tsx` branch flag দেখে নতুন path নেবে — table-এর earning/deduction column dynamic, হিসাব server preview থেকে, client শুধু loan / other deduction / remove পাঠাবে। Flag বন্ধ হলে কোড path হুবহু পুরোনো।
- Sheet / Print / Update: `hrm_salary_payment_components` থাকলে সেখান থেকে dynamic column; না থাকলে (পুরোনো sheet) legacy column (D4)।
- Help: `salary-generate`, `salary-sheet` আপডেট।
- **Done যখন:** test branch-এ flag চালু করে 112026 নতুন engine-এ generate → প্রতিটি employee-এর net, voucher-এর তিন লাইন পুরোনো engine-এর সাথে টাকায় টাকায় সমান; flag বন্ধ branch-এ কিছুই বদলায়নি; help + tsc পাস।

---

## 5. যাচাইয়ের কমান্ড

```powershell
cd D:\www\cashbook_api; php artisan patch:add-unit-type
```

```powershell
cd D:\www\cashbook_api; php artisan test --filter=Salary
```

```powershell
cd D:\www\cashbook_api; php artisan payroll:shadow 112026
```

```powershell
cd D:\cashbookbd_react; npx tsc --noEmit
```

```powershell
cd D:\cashbookbd_react; npm run help:check
```

Backfill-এর সঠিকতা যাচাইয়ের SQL: [`salary-components-how-it-works.md` §11](./salary-components-how-it-works.md)।

---

## 6. কখন থেমে owner-কে জিজ্ঞাসা করবেন

- Shadow run-এ এমন mismatch যা §3.4-এর নিয়ম দিয়ে ব্যাখ্যা হয় না।
- কোনো পুরোনো screen বা report বদলাতে হবে বলে মনে হলে, যা এই brief-এ নেই।
- Voucher-এর ledger বা amount বদলানোর প্রয়োজন দেখা দিলে।
- Production / staging database-এ কিছু চালানোর আগে — সবসময়।
- এই brief আর design doc-এর মধ্যে এমন অমিল যা §1 দিয়ে মেটে না।
