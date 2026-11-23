# Salary Management — Flexible Salary Components Design

**Status:** Proposal (revision 2)
**Date:** 2026-11-23

> **Revision 2-এ যা বদলেছে:**
> 1. আলাদা `hrm_payroll_items` বাদ। বর্তমান `hrm_salary_payments` (voucher `main_trx_id`, payment history সহ) একমাত্র source of truth থাকবে; এর নিচে নতুন `hrm_salary_payment_components` (§4.4)।
> 2. Attendance deduction কোন খাতের উপর হিসাব হবে — `include_in_deduction_base` flag ও `hrm_payroll_settings` (§5.7)।
> 3. Overtime একটি system earning component (§5.8)।
> 4. প্রতিটি খাতের accounting ledger — `expense_ledger_id` (§5.9)।
> 5. Full-month rounding নিয়ম, Festival Bonus নির্ভরতা, `is_taxable` default 0, patch command দিয়ে schema প্রয়োগ (§5.2, §9)।
**Scope:** HRMS payroll, SaaS tenants, existing Salary Generate / Salary Sheet / Salary Update / Print flows

---

## 1. এক নজরে সুপারিশ

প্রতিটি কোম্পানির বেতন ভাতা আলাদা — তাই **নতুন নতুন column যোগ করা যাবে না**। সমাধান হলো বেতনের প্রতিটি খাতকে (Basic, House Rent, Mobile Bill, Lunch Bill, Attendance Bonus, Mid Day Meal...) ডাটাবেজে **ডাটা হিসেবে** রাখা, কোডে hard-code না করা।

চার স্তরের মডেল ব্যবহার করবেন:

| স্তর | Table | কাজ |
|---|---|---|
| ১. Pay-head master | `hrm_salary_components` | কোম্পানি নিজের খাত তৈরি করবে (Mobile Bill, Lunch Bill, Attendance Bonus...) |
| ২. Template | `hrm_salary_structures` + `hrm_salary_structure_components` | একটি reusable salary structure, যেমন "Staff Structure" |
| ৩. Employee entitlement | `hrm_employee_salary_revisions` + `..._revision_components` | কোন employee কোন structure-এ, কত টাকা, কোন তারিখ থেকে |
| ৪. Payroll snapshot | বর্তমান `hrm_salary_payments` + নতুন `hrm_salary_payment_components` (+ ছোট `hrm_payroll_runs` header) | প্রতি মাসের generate করা বেতন খাতভিত্তিক **freeze** করে রাখা |

Ready-to-run schema: [`salary-components-schema.sql`](./salary-components-schema.sql)

মূল কথা:

- নতুন কোম্পানি এলে **কোড পরিবর্তন নয়, শুধু data entry** — component তৈরি, structure তৈরি, employee-এ assign।
- Salary Generate, Salary Sheet, Print, Update, Excel — সব স্ক্রিন **dynamic column** হবে component master থেকে।
- Generate করার সময় প্রতিটি component-এর নাম ও টাকা snapshot হবে। পরে master-এ নাম বা amount বদলালে পুরোনো payslip বদলাবে না।
- Calculation **শুধু backend-এ** হবে (`SalaryCalculator` service)। Frontend preview-ও একই API থেকে আসবে।

---

## 2. এখনকার অবস্থা ও সমস্যা

বর্তমান কোডে (`src/components/modules/hrms/`) যা আছে:

- `hrm_employees`-এ fixed column: `basic_salary`, `house_rent`, `medical_allowance`, `others_allowance`, `daily_wage`, `ot_rate`।
- `SalarySheetGenerate.tsx`-এ gross = prorated Basic + prorated `others_allowance`; `others_allowance`-কে UI-তে "Mobile Bill" বলা হচ্ছে।
- `house_rent` ও `medical_allowance` employee master-এ আছে, কিন্তু বর্তমান payroll engine সেগুলো **pay করে না**। এটি migration-এর সময় সবচেয়ে গুরুত্বপূর্ণ সতর্কতা।
- `SalarySheetPrint.tsx` ও `SalarySheet.tsx`-এ Basic + Others Allowance hard-coded।
- Preview calculation TypeScript-এ, Generate calculation PHP-তে — দুই জায়গায় formula থাকায় mismatch হওয়ার ঝুঁকি আছে।
- Generate করা বেতন `hrm_salary_payments`-এ employee-প্রতি একটি row হিসেবে জমা হয়: `basic_salary`, `others_allowance`, `overtime_amount`, `loan_deduction`, `attendance_*` columns, `history` JSON, salary voucher `main_trx_id` ও payment voucher `payment_main_trx_id`। আংশিক payment থাকে `hrm_salary_payment_histories`-এ। নতুন ডিজাইন এই table-কেই ব্যবহার করবে, বিকল্প বানাবে না।
- Late/early-out deduction = `(prorated Basic + prorated Mobile) / 30 × deduction days`, nearest 10-এ round। এখানে ৩০ fixed, মাসের প্রকৃত দিন নয়।
- Prorate-এ `roundUpToNearestTen` হয়, কিন্তু payable days ≥ month days হলে পুরো amount round ছাড়াই দেয়।
- Festival Bonus সরাসরি `hrm_employees.basic_salary` থেকে percent হিসাব করে (`FestivalBonusUpdate.tsx`)।

নতুন কোম্পানি "Lunch Bill", "Attendance Bonus", "Mid Day Meal" চাইলেই column যোগ করতে হবে, তারপর Generate, Sheet, Print, Update, Excel, Report — সব জায়গায় কোড বদলাতে হবে। কোম্পানির সংখ্যা বাড়লে এটি অসীম কাজ।

> আপনার আগের Laravel Blade-এর Salary Setup যদি employee-wise fixed column-ভিত্তিক হয়, সেখান থেকেও একই শিক্ষা: fixed column scale করে না। ওই setup-কে master + template + revision মডেলে রূপান্তর করা যায়। পুরোনো migration/Blade শেয়ার করলে field-by-field mapping করে দেওয়া যাবে — এই repo-তে সেটি নেই।

---

## 3. কেন শুধু নতুন column বা শুধু JSON নয়

| Option | সুবিধা | সমস্যা | রায় |
|---|---|---|---|
| প্রতি component-এ নতুন DB column | প্রথমে সহজ | প্রতিটি tenant-এ ALTER, প্রতিটি স্ক্রিনে কোড পরিবর্তন, report/print hard-code, unlimited growth | ❌ |
| শুধু একটি JSON column-এ সব component | খুব flexible | query/report করা কঠিন, validation নেই, component-wise total বের করা কষ্ট, typo/duplicate নিয়ন্ত্রণ নেই | ❌ master হিসেবে নয় |
| Master + structure + revision + snapshot | flexible, reportable, history-safe | শুরুতে ৪টি table ও UI লাগে | ✅ |

JSON শুধু **snapshot/audit**-এর জন্য ব্যবহার করবেন (যেমন existing `history` column), master data-র জন্য নয়।

---

## 4. প্রস্তাবিত মডেল

```text
hrm_salary_components                  (কী কী খাত আছে)
        │
        ├── hrm_salary_structures        (template: "Staff Structure")
        │        └── hrm_salary_structure_components
        │
        └── hrm_employee_salary_revisions   (employee-এর actual salary, effective date)
                 └── hrm_employee_salary_revision_components

মাসে generate করলে:
hrm_payroll_runs                         (নতুন, ছোট: sheet status ও totals)
   └── hrm_salary_payments               (বর্তমান table, employee-প্রতি row, voucher সহ)
          ├── hrm_salary_payment_components   (নতুন: খাতভিত্তিক নাম + টাকা freeze)
          └── hrm_salary_payment_histories    (বর্তমান: আংশিক payment)

hrm_payroll_settings                     (deduction divisor, rounding policy)
```

### 4.1 Pay-head master — `hrm_salary_components`

প্রতিটি row একটি বেতন খাত। গুরুত্বপূর্ণ field:

| Field | উদাহরণ | কাজ |
|---|---|---|
| `code` | `mobile_bill` | stable machine key; report/API এ ব্যবহার |
| `name` | Mobile Bill | screen/print-এ দেখাবে |
| `short_name` | Mobile | sheet-এর column header |
| `component_type` | earning / deduction | gross-এ যোগ হবে না বিয়োগ হবে |
| `category` | basic / allowance / bonus / benefit / statutory / loan | grouping ও report |
| `calculation_type` | fixed / percent / per_day / formula / system | কীভাবে টাকা বের হবে |
| `percent_base` | basic / gross | percent কোন base-এর উপর |
| `day_basis` | payable_days / present_days / month_days | per_day component কোন day count নেবে |
| `prorate` | 0 / 1 | fixed amount payable days দিয়ে ভাগ হবে কি না |
| `rounding` | none / nearest_1 / nearest_10 / up_10 | per-component rounding |
| `include_in_gross` | 1 / 0 | gross total-এ যোগ হবে কি না |
| `include_in_deduction_base` | 1 / 0 | late/early-out deduction-এর per-day বেতনে এই খাত ধরা হবে কি না (§5.7) |
| `salary_sheet_types` | monthly / overtime | কোন sheet-এ এই খাত আসবে |
| `expense_ledger_id` | ledger id | salary voucher-এ এই খাত কোন account head-এ post হবে (§5.9) |
| `is_taxable`, `include_in_pf` | future, default 0 | tax/PF-এর জন্য প্রস্তুত; ভুল করে করযোগ্য না হতে default 0 |
| `sort_order` | 10, 20, 30... | sheet/print-এ column-এর ক্রম |
| `is_system` | 1 = Basic, Loan, Attendance Deduction | code/type lock; delete করা যাবে না |
| `status` | 1 / 0 | delete নয়, disable |

উদাহরণ master rows:

| name | code | type | calculation | prorate |
|---|---|---|---|---|
| Basic | `basic` | earning | fixed | 1 |
| House Rent | `house_rent` | earning | fixed | 1 |
| Mobile Bill | `mobile_bill` | earning | fixed | 1 |
| Lunch Bill | `lunch_bill` | earning | per_day | 0 |
| Attendance Bonus | `attendance_bonus` | earning | per_day | 0 |
| Mid Day Meal | `mid_day_meal` | earning | per_day | 0 |
| Overtime | `overtime` | earning | system | 0 |
| Loan Deduction | `loan_deduction` | deduction | system | 0 |
| Attendance Deduction | `attendance_deduction` | deduction | system | 0 |

### 4.2 Salary structure (template)

`hrm_salary_structures` = "Staff Structure", "Worker Structure", "Security Guard Structure" ইত্যাদি।

`hrm_salary_structure_components` = ওই structure-এ কোন কোন খাত থাকবে, default amount/percent, order।

Structure হলো **টেমপ্লেট**, employee-এর বেতন নয়। একই structure অনেক employee পাবে; প্রত্যেকের actual amount employee revision-এ থাকবে।

### 4.3 Employee salary revision (effective dated)

Employee-এর বেতন কখনো `UPDATE` করবেন না। বেতন বাড়লে/কমলে **নতুন revision** তৈরি করবেন:

```text
employee_id = 12
effective_from = 2026-11-01
effective_to   = NULL          -- পরের revision না আসা পর্যন্ত
gross_salary   = 30500
```

Revision-এর component rows:

```text
basic           20000
house_rent      10000
mobile_bill       500
```

পরের মাসে বেতন বাড়লে:

- পুরোনো revision-এ `effective_to = 2026-10-31`
- নতুন revision `effective_from = 2026-11-01`

কোনো payroll date-এ employee-এর বেতন বের করার নিয়ম:

```sql
SELECT * FROM hrm_employee_salary_revisions
WHERE employee_id = ?
  AND effective_from <= :payroll_date
  AND (effective_to IS NULL OR effective_to >= :payroll_date)
ORDER BY effective_from DESC
LIMIT 1;
```

### 4.4 Payroll snapshot (সবচেয়ে গুরুত্বপূর্ণ)

নতুন কোনো employee-row table বানানো হবে না। বর্তমান `hrm_salary_payments` row-এ ইতিমধ্যে attendance days, gross, net, payment, voucher (`main_trx_id`, `payment_main_trx_id`) ও `history` আছে; Salary Sheet, payment ও accounting report এটা থেকেই পড়ে। পাশে আরেকটি `hrm_payroll_items` বানালে একই মাসের বেতন দুই জায়গায় থাকবে এবং কোনটা ঠিক তা নিয়ে গোলমাল হবে।

Generate করলে:

- `hrm_payroll_runs` (নতুন, ছোট) — মাস (`payment_month` VARCHAR(6), `mmyyyy` — `hrm_salary_payments`-এর মতো; সাথে generated `period_ym`), branch, sheet type, totals, status (`draft → approved → paid`)। এটি শুধু header; employee row রাখে না।
- `hrm_salary_payments` (বর্তমান) — employee-wise row আগের মতোই; নতুন nullable `payroll_run_id` দিয়ে run-এর সাথে যুক্ত। Legacy column (`basic_salary`, `others_allowance`, `overtime_amount`, `loan_deduction`, `attendance_deduction_amount`, `gross_salary`, `net_salary`) transition-এ লেখা চলবে (dual-write), যাতে পুরোনো screen/report না ভাঙে।
- `hrm_salary_payment_components` (নতুন) — প্রতিটি line: component code, **frozen name**, monthly amount, rate, quantity, amount, frozen `expense_ledger_id`। `salary_payment_id` → `hrm_salary_payments.id` (ON DELETE CASCADE, যেমন `hrm_salary_payment_histories`)।
- `hrm_salary_payment_histories` (বর্তমান) — আংশিক payment আগের মতোই।

পুরোনো sheet-গুলোর component backfill করা হবে না; সেগুলো legacy column থেকেই পড়বে।

**মাসের ক্রম (`period_ym`):** `payment_month` `mmyyyy` ফরম্যাটে, তাই string হিসেবে sort বা `BETWEEN` করলে বছর পার হলে ভুল হয় (`012027` < `122026`)। Format বদলালে বর্তমান সব কোড ভাঙবে, তাই বদলানো হবে না। এর বদলে `hrm_salary_payments` ও `hrm_payroll_runs`-এ একটি STORED generated column `period_ym` (`yyyymm`) যোগ হবে, index সহ:

```sql
period_ym CHAR(6) AS (CONCAT(RIGHT(payment_month,4), LEFT(payment_month,2))) STORED
```

- Database নিজেই প্রতিটি insert/update-এ এটা ভরে; ALTER-এর সময় পুরোনো row-ও ভরে যায়। কোনো কোড বদলাতে হয় না।
- নতুন কোড ও report-এ মাস ধরে sort/filter সবসময় `period_ym` দিয়ে: `ORDER BY period_ym`, `WHERE period_ym BETWEEN '202601' AND '202612'`।
- একটি নির্দিষ্ট মাস খুঁজতে আগের মতো `payment_month = '112026'` চলবে।
- ALTER-এর আগে যাচাই করুন কোনো row-এ ভুল format নেই: `WHERE payment_month NOT REGEXP '^(0[1-9]|1[0-2])[0-9]{4}$'`।
- বর্তমান যেসব report `payment_month` দিয়ে sort/range করে, সেগুলোকে ধীরে ধীরে `period_ym`-এ সরানো যাবে।

কেন snapshot:

- পরে "Mobile Bill"-এর নাম "Communication Allowance" করলে পুরোনো payslip বদলাবে না।
- Component disable/delete করলেও পুরোনো মাস অক্ষত থাকবে।
- Salary register-এ component-wise total সহজে বের হবে।

---

## 5. Calculation engine

### 5.1 একবারই হিসাব, backend-এ

একটি service (Laravel-এ `SalaryCalculator`) সব হিসাব করবে। Frontend শুধু দেখাবে ও প্রযোজ্য হলে override পাঠাবে।

```text
SalaryCalculator::preview($branchId, $month, $employeeIds)
SalaryCalculator::generate($branchId, $month, $adjustments)
```

Preview ও Generate একই function ব্যবহার করবে। বর্তমানে TypeScript-এ যে `attendanceDeduction()`, `proratedAmount()`, `roundUpToNearestTen()` আছে, সেগুলো backend-এ সরানো উচিত। নাহলে দুই জায়গায় formula আলাদা হয়ে mismatch হবে।

### 5.2 Calculation order

1. Payroll period-এর জন্য employee-এর **active revision** resolve করো।
2. Attendance monthly summary থেকে `payable_days`, `present_days`, `absent_days`, `half_days`, late/early-out দিন আনে।
3. **Basic** বের করো (fixed amount; prorate হলে `amount × payable_days / month_days`)। `hrm_payroll_settings.full_month_skip_rounding = 1` হলে payable days ≥ month days-এ পুরো amount round ছাড়া — বর্তমান engine-এর মতো। এটা না রাখলে shadow run-এ হিসাব মিলবে না।
4. **Fixed earnings** বের করো (House Rent, Mobile Bill...)।
5. **Percent earnings** বের করো। `percent_base = basic` হলে Basic-এর উপর, `gross` হলে Basic + fixed earnings-এর উপর। Percent component অন্য percent component-এর উপর নির্ভর করবে না — এটি স্পষ্টভাবে নিষিদ্ধ।
6. **Per-day earnings** বের করো: `rate × day_basis` (Lunch Bill, Attendance Bonus, Mid Day Meal)।
7. `gross = SUM(earning where include_in_gross = 1)`।
8. Overtime sheet হলে `overtime` system line (§5.8); monthly sheet-এ শুধু `salary_sheet_types`-এ `monthly` আছে এমন খাত।
9. **Deduction components** বের করো (fixed/percent/system)।
10. Attendance deduction (§5.7), loan deduction, one-off adjustment যোগ করো।
11. `net = gross - total_deduction`।
12. প্রতিটি component-এ `rounding` apply করে amount store করো, তারপর total করো। Total আলাদা করে আবার round করবেন না — নাহলে line-গুলোর যোগফল ও total মিলবে না।

### 5.3 Basic-এর নিয়ম

- Basic **সবসময় fixed** হবে (percent নয়)। Basic-কে gross-এর percent করলে circular dependency তৈরি হয়।
- Basic একটাই থাকবে; `code = basic`, `is_system = 1`।
- প্রতিটি employee revision-এ Basic অবশ্যই থাকবে।

### 5.4 Proration

| Component | `prorate` | Payable 28/30 হলে |
|---|---|---|
| Basic 20,000 | 1 | 18,670 |
| House Rent 10,000 | 1 | 9,340 |
| Mobile Bill 500 | 0 (সাধারণত fixed) | 500 |
| Lunch Bill 100/day × 26 present | per_day | 2,600 |
| Mid Day Meal 80/day × 26 present | per_day | 2,080 |

Proration **component-ভিত্তিক**। সব component-এ এক নিয়ম নয় — এটাই flexibility-র মূল।

### 5.5 Attendance-based component

`per_day` component-এ `day_basis` দিয়ে ঠিক করবেন কোন দিন গণনা হবে:

- `present_days` — Lunch Bill, Mid Day Meal, Attendance Bonus
- `payable_days` — present + paid leave + paid holiday
- `month_days` — পুরো মাসের ভিত্তিতে

Attendance Bonus-এর "শর্ত" (যেমন কোনো absent/late নেই) দরকার হলে phase 3-এ component-এর সাথে একটি `attendance_condition` (যেমন `no_absent`, `full_attendance`, `min_present_days`) যোগ করবেন। Phase 1-এ শুধু per-day amount।

### 5.6 Formula component (phase 3)

`calculation_type = formula` রাখবেন শুধু তখনই, যখন fixed/percent/per_day দিয়ে হবে না। যেমন:

```text
basic * 0.10 + present_days * 50
```

নিয়ম:

- PHP-তে `eval()` নয়।
- Allowlist token: `basic`, `gross`, `present_days`, `payable_days`, `month_days`, `ot_hours`, `daily_wage` + সংখ্যা + `+ - * / ( )`।
- অথবা `symfony/expression-language` ব্যবহার করে function/variable limit করে দেবেন।
- Tenant-এর input কখনো সরাসরি code হিসেবে চালাবেন না।

### 5.7 Attendance deduction ও loan

এগুলো **revision component নয়**। এগুলো system-calculated line:

- `attendance_deduction` — attendance summary + policy (late, early out) থেকে।
- `loan_deduction` — loan module-এর outstanding/ installment থেকে; generate screen-এ editable থাকতে পারে।
- এগুলোও `hrm_salary_payment_components`-এ line হিসেবে snapshot হবে, যাতে payslip-এ দেখা যায়।

**Attendance deduction-এর হিসাব:**

```text
deduction_base = SUM(prorated amount of components where include_in_deduction_base = 1)
divisor        = settings.deduction_day_divisor = 'fixed' ? settings.deduction_fixed_divisor (30)
                                                          : month_days
per_day        = round2(deduction_base / divisor)
deduction      = round(settings.deduction_rounding, (late_deduction_days + early_out_deduction_days) × per_day)
```

- Seed-এ শুধু Basic, Mobile Bill (এবং House Rent, যদি পরে structure-এ যোগ হয়) `include_in_deduction_base = 1`। Lunch Bill, Attendance Bonus, Mid Day Meal, Overtime `0` — present days-ভিত্তিক খাত থেকে আবার কাটলে দুবার কাটা হবে।
- Default `fixed / 30 / nearest_10` রাখা হয়েছে, যাতে বর্তমান হিসাব হুবহু মেলে। কোম্পানি চাইলে settings থেকে `month_days` করতে পারবে।
- Absent ও half day এখানে কাটা হবে না — এগুলো payable days কমিয়ে prorate-এই কমে যায় (বর্তমান নিয়ম)।
- Daily labour-এর জন্য attendance deduction `0` (বর্তমান নিয়ম)।

### 5.8 Overtime

- `overtime` একটি `is_system = 1`, `calculation_type = system`, `category = overtime`, `salary_sheet_types = overtime` component।
- Amount আসবে attendance summary-র `overtime_amount` থেকে, অথবা `ot_minutes / 60 × ot_rate` থেকে (বর্তমান Overtime sheet যেভাবে করে)। Line-এ `rate = ot_rate`, `quantity = OT hours` snapshot হবে।
- OT rate আপাতত `hrm_employees.ot_rate`-এ থাকবে। পরে চাইলে revision-এ `per_hour` component হিসেবে আনা যাবে।
- `include_in_deduction_base = 0`।

### 5.9 Accounting voucher (ledger mapping)

Generate করলে বর্তমানে `hrm_salary_payments.main_trx_id`-এ salary voucher তৈরি হয়। Component আসার পর:

- প্রতিটি earning component-এর `expense_ledger_id` থাকলে voucher-এ সেই ledger-এ আলাদা debit line; `NULL` হলে বর্তমান default salary expense ledger-এ যাবে। তাই কোনো কিছু set না করলে voucher আগের মতোই থাকবে।
- Deduction line (loan, attendance, other) বর্তমানে যেভাবে post হয় সেভাবেই থাকবে; loan আগের মতো loan ledger-এ।
- Line-এ `expense_ledger_id` freeze হবে, যাতে পরে master-এ ledger বদলালেও পুরোনো voucher-এর ব্যাখ্যা থাকে।
- Voucher-এর মোট debit = `gross`, অর্থাৎ total অপরিবর্তিত; শুধু খাতভিত্তিক ভাগ হচ্ছে।
- Salary Components screen-এ ledger dropdown থাকবে (expense ledger-গুলো থেকে)।

---

## 6. তিন কোম্পানির উদাহরণ — একই কোড, আলাদা ডাটা

### Company A

Structure: Basic + House Rent + Mobile Bill

| Component | Calculation | মাসিক |
|---|---|---|
| Basic | fixed | 20,000 |
| House Rent | fixed, prorate | 10,000 |
| Mobile Bill | fixed, no prorate | 500 |
| **Gross** | | **30,500** |

Payable 28/30:

```text
Basic        = 20,000 × 28/30 = 18,670
House Rent   = 10,000 × 28/30 =  9,340
Mobile Bill  =                    500
Gross        =                 28,510
```

### Company B

Structure: Basic + House Rent + Lunch Bill

| Component | Calculation | Rate |
|---|---|---|
| Basic | fixed | 18,000 |
| House Rent | fixed | 9,000 |
| Lunch Bill | per_day × present_days | 100/day |
| **Gross** (26 present) | | **29,600** |

### Company C

Structure: Basic + House Rent + Attendance Bonus + Mid Day Meal

| Component | Calculation | Rate |
|---|---|---|
| Basic | fixed | 15,000 |
| House Rent | fixed | 7,500 |
| Attendance Bonus | per_day × present_days | 50/day |
| Mid Day Meal | per_day × present_days | 80/day |
| **Gross** (26 present) | | **25,880** |

তিনটি কোম্পানির জন্য **একই Salary Generate, একই Sheet, একই Print** — শুধু component master/structure/revision আলাদা। এটাই SaaS-এ scalable সমাধান।

---

## 7. UI পরিকল্পনা

### 7.1 নতুন স্ক্রিন: Salary Components

Menu: **HRMS → Salary → Salary Components**

Columns: Name, Short Name, Code, Type, Category, Calculation, Default, Prorate, Deduction Base, Sheet Type, Ledger, Taxable, Order, Status।

এই screen ও §7.2 Salary Structures নতুন menu, তাই `public/help/`-এ help topic যোগ করে `npm run help:check` চালাতে হবে। Generate/Sheet/Print/Update/Employee screen-এর column ও field বদলালে সেগুলোর help topic-ও একই কাজে update হবে।

- `is_system = 1` rows edit/delete করা যাবে না (শুধু নাম/order)।
- Delete নয়, **Disable**।
- Code save করার পর বদলানো যাবে না (report/API এ ব্যবহার হবে)।

### 7.2 নতুন স্ক্রিন: Salary Structures

Menu: **HRMS → Salary → Salary Structures**

দুই-প্যানেল builder:

```text
Available components        Selected components
[House Rent]          →     [Basic        fixed      20,000]
[Mobile Bill]               [House Rent   fixed      10,000]
[Lunch Bill]                [Mobile Bill  fixed         500]
...
                            (drag to reorder)
```

Structure-এ শুধু default amount থাকবে। Employee assign করার সময় amount override করা যাবে।

### 7.3 Employee Create/Edit → Salary tab

- Structure dropdown
- Effective from date
- Component grid (structure থেকে auto-populate)
- প্রতিটি row: Component, Calculation, Amount/Percent/Rate, Prorate, Days basis
- নিচে Gross preview
- Save করলে **নতুন revision**; পুরোনো revision edit নয়

বর্তমান `basic_salary`, `house_rent`, `medical`, `others_allowance` input-গুলো এই grid-এ রূপান্তর হবে। Migration-পরবর্তী সময়ে দুটোই কিছুদিন রাখতে হবে (নিচে §৯)।

### 7.4 Salary Generate — dynamic columns

Header filter অপরিবর্তিত: Branch, Designation Level, Salary Sheet Type, Month, Search।

Table:

```text
Sl | Name/Designation | Month Days | Working Days |
[Basic] [House Rent] [Mobile Bill] [Lunch Bill] ... | Total |
[Loan Ded.] [Att. Ded] [Other Ded.] | Net Salary | Action
```

- Earning columns = revision-এর earning components, `sort_order` অনুযায়ী।
- Deduction columns = deduction components + system deductions।
- Column Manager: user কোন column দেখবে/print করবে তা বেছে নেবে; preference `localStorage`-এ user+branch key দিয়ে রাখবেন।
- Component অনেক হলে horizontal scroll + sticky first column; ৬টির বেশি হলে "Others" group-এ collapse করার option।
- Footer-এ প্রতিটি component-এর grand total।
- Preview server-side API থেকে আসবে; frontend শুধু editable override (loan, extra amount) পাঠাবে।

### 7.5 Salary Sheet / Print / Update / Excel

- `SalarySheetPrint.tsx`-কে dynamic column list দিয়ে render করতে হবে।
- Print-এ কোন component দেখাবে তা structure/column preference থেকে।
- Excel export-ও একই column metadata ব্যবহার করবে।
- `SalarySheetUpdate.tsx`-এ editable component rows dynamic হবে (Basic, Mobile Bill hard-code নয়)।
- Salary Sheet-এ component-wise total ও payslip line dynamic।

### 7.6 Report

- **Salary Register by Pay Head** — component-wise monthly total (report-এর সবচেয়ে বড় লাভ)।
- Bank sheet / cash sheet।
- Payslip (dynamic lines)।
- Revision history report — কে কখন বেতন বদলেছে।
- Attendance vs salary reconciliation।

---

## 8. API পরিকল্পনা

### 8.1 Master / structure / revision

```http
GET    /api/hrms/salary/components
POST   /api/hrms/salary/components
PUT    /api/hrms/salary/components/{id}
PATCH  /api/hrms/salary/components/{id}/status

GET    /api/hrms/salary/structures
POST   /api/hrms/salary/structures
PUT    /api/hrms/salary/structures/{id}

GET    /api/hrms/salary/employees/{employeeId}/revisions
POST   /api/hrms/salary/employees/{employeeId}/revisions
```

### 8.2 Preview

```http
POST /api/hrms/salary/preview
```

```json
{
  "branch_id": 3,
  "month_id": "2026-11",
  "salary_sheet_type": "monthly",
  "level_ids": [],
  "employee_ids": []
}
```

Response:

```json
{
  "month_days": 30,
  "rows": [
    {
      "employee_id": 12,
      "employee_name": "Rahim",
      "designation_name": "Officer",
      "month_days": 30,
      "payable_days": 28,
      "present_days": 26,
      "components": [
        { "code": "basic", "name": "Basic", "type": "earning", "amount": 18670 },
        { "code": "house_rent", "name": "House Rent", "type": "earning", "amount": 9340 },
        { "code": "mobile_bill", "name": "Mobile Bill", "type": "earning", "amount": 500 },
        { "code": "attendance_deduction", "name": "Att. Ded", "type": "deduction", "amount": 0 }
      ],
      "gross": 28510,
      "total_deduction": 0,
      "net": 28510
    }
  ]
}
```

### 8.3 Generate

**সব amount frontend থেকে পাঠাবেন না।** শুধু adjustment পাঠান; বাকি server revision + attendance থেকে হিসাব করবে।

```json
{
  "branch_id": 3,
  "month_id": "2026-11",
  "salary_sheet_type": "monthly",
  "adjustments": [
    { "employee_id": 12, "component_code": "mobile_bill", "amount": 700, "note": "extra usage" },
    { "employee_id": 15, "component_code": "loan_deduction", "amount": 3000 }
  ],
  "excluded_employee_ids": [22]
}
```

Response: `payroll_run_id`, totals, employee count।

Server যা করবে (একটি DB transaction-এ):

1. `hrm_payroll_runs` row (draft)।
2. প্রতিটি employee-এর জন্য `hrm_salary_payments` row — legacy column সহ (dual-write) এবং `payroll_run_id`।
3. প্রতিটি line-এর জন্য `hrm_salary_payment_components` row।
4. Salary voucher (`main_trx_id`) — §5.9 অনুযায়ী ledger-wise।

এতে client-side tampering কমবে এবং preview/generate-এর হিসাব এক থাকবে।

### 8.4 Sheet / payment

```http
GET  /api/hrms/salary/runs/{runId}
POST /api/hrms/salary/runs/{runId}/approve
POST /api/hrms/salary/runs/{runId}/payment
GET  /api/hrms/salary/register?year=2026&component_code=mobile_bill
```

---

## 9. Migration — বর্তমান fixed column থেকে

### 9.1 সবার আগে audit

**সবচেয়ে গুরুত্বপূর্ণ:** বর্তমান engine gross-এ কোন field নেয় তা যাচাই করুন।

বর্তমান কোড অনুযায়ী:

```text
gross = prorated(basic_salary) + prorated(others_allowance)
```

`house_rent` ও `medical_allowance` gross-এ **নেই**।

তাই:

- Default migration-এ শুধু **Basic + Mobile Bill** (`others_allowance`) নেবেন।
- House Rent/Medical যোগ করলে **মোট বেতন বাড়বে**। যদি কোম্পানি সত্যিই House Rent আলাদা দেখাতে চায়, তাহলে **gross-neutral restructuring** করুন: মোট একই রেখে Basic ভেঙে House Rent বের করুন (যেমন Basic 30,000 → Basic 18,000 + House Rent 12,000)। Employee-এর সম্মতি/HR approval লাগবে।

### 9.2 Backfill ধাপ

1. `salary-components-schema.sql` হলো reference DDL। Tenant-এ এটি raw SQL হিসেবে নয়, `AddUnitTypeToBuildingUnits` patch command-এর নতুন অংশ হিসেবে প্রয়োগ করুন — প্রতিটি `CREATE`-এর আগে `Schema::hasTable()`, এবং `hrm_salary_payments.payroll_run_id`-এর আগে `Schema::hasColumn()`, যেমন বর্তমান `month_days`/`working_days` patch-এ করা আছে। কোনো column drop হয় না; বর্তমান table-এ শুধু একটি nullable column যোগ হয়।
2. `@company_id` ঠিক করুন, seed component/structure তৈরি করুন।
3. প্রতিটি employee-এর জন্য `'2000-01-01'` effective date-এ revision তৈরি করুন (SQL file-এ আছে)।
4. Revision components-এ legacy `basic_salary` ও `others_allowance` বসান।
5. দুই-তিন মাস **shadow run**: পুরোনো Generate ও নতুন Generate একসাথে চালিয়ে totals মিলিয়ে দেখুন।
6. নতুন payroll screen feature flag দিয়ে branch-ভিত্তিক চালু করুন।
7. সব স্ক্রিন dynamic হলে legacy input field বন্ধ করুন।
8. আরও কিছুদিন পর `basic_salary`/`others_allowance` column drop করার আলাদা patch — তাড়াহুড়ো করবেন না, পুরোনো report/print নির্ভর করতে পারে।

**যেসব module legacy column-এর উপর নির্ভর করে (column বন্ধ করার আগে বদলাতে হবে):**

- **Festival Bonus** (`FestivalBonusUpdate.tsx` ও এর backend) — `basic_salary`-এর percent হিসাব করে। একে bonus date-এর active revision-এর `basic` component থেকে পড়াতে হবে। Phase 1-এ dual-write থাকায় কিছু ভাঙবে না, কিন্তু Phase 4-এর আগে এটি অবশ্যই বদলাতে হবে।
- Employee list/print, Overtime sheet (`ot_rate`), এবং যেকোনো report যা `hrm_employees.basic_salary` পড়ে।

### 9.3 Dual-read / dual-write

Transition-এ:

- নতুন স্ক্রিন: revision থেকে পড়বে; revision না থাকলে legacy column থেকে fallback।
- Employee save: legacy column + revision দুই জায়গায় লিখবে।
- পুরোনো Salary Sheet: আগের stored data পড়বে, কিছু বদলাবে না।
- Salary generate: নতুন engine `hrm_salary_payments`-এর legacy column-ও ভরবে (Basic → `basic_salary`, Mobile Bill → `others_allowance`, Overtime → `overtime_amount`, ইত্যাদি)। যে খাতের legacy column নেই (Lunch, Bonus...) সেটা শুধু component line-এ থাকবে, কিন্তু `gross_salary`/`net_salary`-তে যোগ হবে — তাই পুরোনো report-এ total ঠিক থাকবে।

### 9.4 Rollback

- নতুন Generate feature flag-এর পিছনে রাখুন।
- নতুন table additive; rollback-এ শুধু flag বন্ধ করবেন, data মুছবেন না।
- Legacy columns শেষ পর্যন্ত রাখুন যতক্ষণ না business sign-off দেয়।

---

## 10. Edge cases ও সিদ্ধান্ত (এগুলো আগে lock করুন)

| প্রশ্ন | সুপারিশ |
|---|---|
| Blank amount | DB-তে `NULL` নয়; UI blank হলে calculation-এ `0`, payload-এ `0` |
| Negative amount | শুধু deduction/adjustment-এ allow; earning-এ নয় |
| Mid-month salary revision | Phase 1: পরের মাস থেকে apply। Phase 2: দিন ভাগ করে split |
| Mid-month joining/leaving | payable days দিয়ে prorate |
| Branch transfer | payroll কোন branch-এ হবে তা lock করুন; attendance summary branch-wise, তাই সাধারণত যে branch-এর attendance সেই branch |
| Daily labour | `employment_type = daily` হলে monthly component নয় — daily wage × present days + OT |
| Overtime sheet | শুধু OT-eligible employee; `salary_sheet_types` দিয়ে শুধু `overtime` component |
| Attendance deduction base | শুধু `include_in_deduction_base = 1` খাত; divisor ও rounding `hrm_payroll_settings` থেকে |
| Full month rounding | payable days ≥ month days হলে round ছাড়া পুরো amount (`full_month_skip_rounding`) |
| Accounting | খাতভিত্তিক ledger `expense_ledger_id`; NULL হলে default salary ledger; voucher total = gross |
| Taxable default | `is_taxable = 0`; tax module চালুর সময় খাত ধরে ধরে চালু |
| Festival bonus | আলাদা bonus module বা one-off component; monthly revision-এ নয় |
| Loan | revision-এ নয়; loan module থেকে প্রতি মাসের installment, generate screen-এ editable |
| Attendance deduction | system line, revision component নয় |
| Component rename | পুরোনো payroll snapshot-এ পুরোনো নাম থাকবে; নতুন মাসে নতুন নাম |
| Component delete | delete নয়, `status = 0`; revision/payroll-এ ব্যবহৃত হলে delete করবেন না |
| Component code duplicate | `UNIQUE(company_id, code)` |
| Rounding | প্রতিটি component-এ master-level `rounding`; line amount round করে তারপর total |
| Percent chain | percent component অন্য percent-এর উপর নির্ভর করবে না |
| Basic percent | Basic সবসময় fixed |
| Payroll lock | `approved`/`paid` হলে edit নয়; correction adjustment run দিয়ে |
| Ad-hoc payment/deduction | `hrm_salary_payment_components`-এ `component_id = NULL` + নাম/নোট |
| Audit | revision-এ `created_by/updated_by`, payroll-এ `generated_by/approved_by` রাখুন |
| Permission | `salary.component.manage`, `salary.structure.manage`, `salary.revision.manage`, `payroll.generate`, `payroll.approve`, `payroll.payment` |
| Tenant isolation | per-tenant DB হলেও প্রতিটি query-তে `company_id` রাখুন; ভবিষ্যতে shared DB হলে কাজে লাগবে |

---

## 11. Phased rollout

### Phase 1 — ভিত্তি (কোনো বেতন বদলাবে না)

- [x] নতুন table + `hrm_salary_payments.payroll_run_id` + `period_ym` — `App\Services\Hrms\SalaryComponentSchema`, যাকে `patch:add-unit-type` (`runSalaryComponentSchema()`) ও migration `2026_11_23_000001_create_hrm_salary_components_tables` দুটোই ডাকে
- [x] `hrm_payroll_settings` seed (fixed 30 / nearest 10 / full-month skip rounding), pay head ও default structure — `hrm_employees`-এ যত company আছে সবার জন্য
- [x] Legacy backfill (Basic + `others_allowance`) — একটি transaction-এ
- [x] Permission: `salary.component.manage`, `salary.structure.manage`, `salary.revision.manage` — administrator role ও যাদের `hrm.salary.setup.edit` আছে তাদের একবার দেওয়া হয়
- [ ] Employee save-এ dual-write (legacy column + নতুন revision) — না হলে backfill-এর পর employee-র বেতন বদলালে revision পুরোনো থেকে যাবে
- [ ] Component master CRUD + permission (deduction base, sheet type, ledger field সহ)
- [ ] নতুন screen-এর help topic (`public/help/`) + `npm run help:check`
- [ ] Structure CRUD + component builder
- [ ] Employee salary revision + effective date
- [ ] নতুন স্ক্রিনগুলো branch-ভিত্তিক feature flag-এর পিছনে

### Phase 2 — Dynamic payroll

- [ ] `SalaryCalculator` service (single source of truth)
- [ ] Preview API + Generate API (`hrm_salary_payments` dual-write + `hrm_salary_payment_components`)
- [ ] Attendance deduction base ও Overtime component
- [ ] Salary voucher ledger-wise (`expense_ledger_id`, NULL = default)
- [ ] Salary Generate dynamic columns
- [ ] Salary Sheet / Print / Excel / Update dynamic
- [ ] Payroll run status: draft → approved → paid
- [ ] Column preference (user+branch)
- [ ] Old vs new shadow comparison

### Phase 3 — Advanced

- [ ] Per-day components (Lunch, Attendance Bonus, Mid Day Meal)
- [ ] Attendance condition (full attendance, no late)
- [ ] Formula component (safe parser)
- [ ] Salary register by pay head
- [ ] Tax/PF flags কার্যকর করা
- [ ] Mid-month revision split
- [ ] Ad-hoc bonus/deduction UI

### Phase 4 — Cleanup

- [ ] সব স্ক্রিন revision-ভিত্তিক
- [ ] Festival Bonus revision-এর Basic থেকে পড়ে
- [ ] Legacy column write বন্ধ
- [ ] পুরোনো column drop (আলাদা patch, sign-off-এর পর)
- [ ] পুরোনো documentation update

---

## 12. Acceptance checklist

- [ ] নতুন কোম্পানির নতুন component যোগ করতে **কোনো code deploy লাগে না**
- [ ] একই company-র দুই employee-এর component set আলাদা হতে পারে
- [ ] Company A/B/C-এর তিন ধরনের structure একই payroll code-এ চলে
- [ ] Preview ও generated sheet-এর প্রতিটি total মেলে
- [ ] Master-এ নাম/amount বদলালে পুরোনো payslip বদলায় না
- [ ] Component disable করলে নতুন payroll-এ আসে না, পুরোনো history থাকে
- [ ] Salary Sheet/Print/Excel-এ column গুলো dynamic
- [ ] Legacy salary sheet আগের মতোই পড়া যায়
- [ ] একই মাসের বেতন শুধু `hrm_salary_payments`-এ থাকে (কোনো parallel employee-row table নেই)
- [ ] Shadow run-এ attendance deduction ও full-month amount পুরোনো engine-এর সাথে টাকায় টাকায় মেলে
- [ ] Salary voucher-এর total gross-এর সমান; ledger না দিলে voucher আগের মতো
- [ ] Overtime sheet শুধু overtime line দেখায়
- [ ] Festival Bonus migration-এর পরও একই amount দেয়
- [ ] Attendance-based component present/payable days থেকে সঠিকভাবে হিসাব হয়
- [ ] Permission ও audit trail কাজ করে
- [ ] কোনো tenant-এর data অন্য tenant-এ যায় না

---

## 13. যেগুলো এখনই করবেন না

- প্রতিটি নতুন কোম্পানির জন্য `ALTER TABLE hrm_employees ADD ...` — এটি scalability-কে ধ্বংস করবে।
- সব component একটি JSON-এ রেখে report বানানোর চেষ্টা।
- Frontend-এ final salary হিসাব করে সেটাই save করা।
- Generate করার সময় component-এর নাম/amount master থেকে live join করে payslip দেখানো।
- পুরোনো revision `UPDATE` করে বেতন বদলানো।
- `house_rent`/`medical_allowance` কে না বুঝে নতুন structure-এ যোগ করা — এতে gross বেড়ে যাবে।

---

## 14. সংযুক্ত ফাইল

- [`salary-components-schema.sql`](./salary-components-schema.sql) — table DDL, seed component/structure, legacy backfill।
- [`salary-components-build-brief.md`](./salary-components-build-brief.md) — চূড়ান্ত সিদ্ধান্ত, বর্তমান কোডের মানচিত্র, T1–T6 কাজ ও "done" শর্ত; coding agent-কে এটা আগে দিন।
- [`salary-components-how-it-works.md`](./salary-components-how-it-works.md) — বাস্তবায়িত সিস্টেম কীভাবে চলে, patch-এর ধাপ, যাচাইয়ের ফল ও query, rollback, সমস্যা-সমাধান।
- [`attendance-management-system-requirements.md`](./attendance-management-system-requirements.md) — attendance policy ও salary integration-এর বিদ্যমান spec।
- [`attendance-management-update.md`](./attendance-management-update.md) — OT/pay rules ও attendance settings।

---

## 15. সিদ্ধান্ত

> **2026-11-23-এ চূড়ান্ত:** নিচের সব প্রশ্নে সুপারিশকৃত উত্তর গৃহীত; shadow run মাস `112026`; feature flag branch-ভিত্তিক `metas.payroll_engine`। বিস্তারিত ও কাজের তালিকা: [`salary-components-build-brief.md`](./salary-components-build-brief.md) §1।

মূল প্রশ্নগুলো (রেকর্ডের জন্য):

1. House Rent ও Medical Allowance কি সত্যিই আলাদা pay করতে হবে, নাকি এগুলো Basic-এর অংশ? (gross-neutral restructuring দরকার হবে কি?)
2. প্রথম release-এ per-day component (Lunch/Attendance Bonus/Mid Day Meal) দরকার, নাকি শুধু fixed component দিয়ে শুরু?
3. Salary revision mid-month হলে কী হবে — পরের মাস থেকে, নাকি দিন ভাগ?
4. Print-এ ডিফল্টে কতগুলো component দেখাবে — সব, নাকি user-selected?
5. Loan installment কি revision-এর অংশ, নাকি প্রতি মাসে generate screen-এ editable থাকবে?
6. Attendance deduction-এর divisor fixed 30-ই থাকবে, নাকি কোম্পানিভেদে মাসের প্রকৃত দিন?
7. Salary voucher-এ খাতভিত্তিক আলাদা ledger চাই, নাকি আপাতত সব এক salary expense ledger-এ (`expense_ledger_id = NULL`)?