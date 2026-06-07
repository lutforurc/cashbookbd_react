# Attendance Management System Requirements

## 1. উদ্দেশ্য

বর্তমান HRMS ও Salary module-এর সাথে যুক্ত করে একটি Attendance Management System তৈরি করা হবে। এই system-এ employee attendance, holiday, weekly holiday, leave application, leave approval, absent calculation এবং attendance অনুযায়ী salary sheet generate করা যাবে।

## 2. বর্তমান সিস্টেমে যা আছে

- Employee master data already আছে।
- Employee-এর নাম, আইডি, পদবি, বিভাগ, কোম্পানি, project/head office branch, joining date, salary type, basic salary, status ইত্যাদি বিদ্যমান।
- Branch/module আছে এবং branch type `branch_types_id` দিয়ে নির্ধারিত।
- একটি মাত্র Head Office থাকবে।
- Salary Generate, Salary Sheet, Salary Update, Bonus, Loan, Designation module বিদ্যমান।
- বর্তমান Salary Generate module-এ `working_days` manual input হিসেবে ব্যবহার হয়।

## 3. নতুন Attendance Module-এর Scope

নতুন module-গুলো হবে:

1. Shift Setup
2. Weekly Holiday Setup
3. Holiday Calendar
4. Leave Type Setup
5. Leave Balance
6. Leave Application
7. Leave Approval
8. Manual Attendance Entry
9. Attendance Approval
10. Daily Attendance Report
11. Monthly Attendance Summary
12. Absent/Late/Early Out Report
13. Leave Report
14. Salary Sheet Integration
15. PDF/Excel Export

## 4. Branch / Location Policy

একই কোম্পানির Head Office, Project Site, Factory, Branch ইত্যাদি আলাদা branch type হিসেবে থাকবে।

Default weekly holiday rule:

- Head Office: weekly holiday থাকবে।
- Project Site: weekly holiday থাকবে না।
- Factory/Branch: weekly holiday থাকবে না।
- তবে কর্তৃপক্ষ চাইলে Project Site, Factory বা Branch-এর জন্য weekly holiday setup করতে পারবে।

Attendance rule company-wise global থাকবে। একজন employee কোম্পানির অধীনে এক project থেকে অন্য project-এ বদলি হলেও attendance policy একই থাকবে।

## 5. Shift Management

Shift setup-এ নিচের তথ্য থাকবে:

- Shift name
- Start time
- End time
- Grace time
- Minimum working hour
- Half day working hour
- Night shift / cross-date shift support
- Status

Standard night shift rule:

- যে তারিখে shift শুরু হবে, attendance সেই তারিখে ধরা হবে।
- উদাহরণ: রাত ৮টা থেকে সকাল ৬টা shift হলে attendance shift start date অনুযায়ী হবে।

## 6. Attendance Entry

একজন employee attendance দিবে:

- In time
- Out time
- Attendance date
- Branch/project
- Attendance source
- Status

Attendance source:

- Manual entry
- Biometric device
- Mobile app
- Web punch
- GPS/location-based attendance

প্রথম phase-এ manual entry করা হবে। ভবিষ্যতের জন্য biometric/mobile/GPS integration মাথায় রেখে database ও API structure তৈরি করতে হবে।

## 7. Manual Attendance Approval

- Manual attendance entry করলে approval লাগবে।
- যার permission থাকবে, সে manual attendance approve করতে পারবে।
- Approval না হওয়া পর্যন্ত attendance pending থাকবে।

Missing out time rule:

- কেউ `in time` দিয়েছে কিন্তু `out time` দেয়নি হলে management out time ঠিক করে দেবে।
- Out time correction approval-based হবে।

## 8. Late Rule

- Shift start time থেকে ১৫ মিনিট পর্যন্ত grace time থাকবে।
- Grace time পার হলে late ধরা হবে।
- মাসে ৩ বার late হলে salary deduction হবে।
- Late report separately দেখা যাবে।

Recommended deduction:

- প্রতি ৩ বার late = ১ দিনের salary deduction।

## 9. Early Out Rule

- Shift end time-এর ১ ঘণ্টা আগে বের হলে early out ধরা হবে।
- মাসে ৩ দিন early out হলে salary deduction হবে।
- Early out report separately দেখা যাবে।

Recommended deduction:

- প্রতি ৩ বার early out = ১ দিনের salary deduction।

## 10. Half Day Rule

- মোট কাজের সময় ৪ ঘণ্টা পর্যন্ত হলে half day হবে।
- Half day salary deduction হবে।

Recommended deduction:

- Half day = অর্ধেক দিনের salary deduction।

## 11. Absent Rule

একজন employee absent হবে যদি:

- Attendance না থাকে।
- Leave application reject হয়।
- Unauthorized absence থাকে।
- Required attendance correction approve না হয়।

Recommended deduction:

- Absent = ১ দিনের salary deduction।

Absent deduction formula:

```text
Per day deduction = Gross Salary / 30
```

## 12. Holiday Calendar

বাৎসরিক holiday calendar থাকবে। কর্তৃপক্ষ holiday select/create করতে পারবে।

Holiday examples:

- ঈদুল ফিতর
- ঈদুল আযহা
- দুর্গা পূজা
- Government holiday
- Festival holiday
- Company declared holiday
- Optional holiday
- Project-specific holiday

Holiday applicability:

- Holiday সবার জন্য হতে পারে।
- Branch/project/department-wise আলাদা হতে পারে।

Holiday-তে কাজ করলে:

- আপাতত extra payment থাকবে না।
- Normal salary হবে।

## 13. Weekly Holiday

Weekly holiday setup authority নির্ধারণ করবে।

Example:

- Friday
- Saturday
- Custom day

Default:

- Head Office weekly holiday পাবে।
- Project Site, Factory, Branch weekly holiday পাবে না।
- কর্তৃপক্ষ চাইলে যেকোনো branch type-এর জন্য weekly holiday দিতে পারবে।

## 14. Leave Type

Leave type কর্তৃপক্ষ setup করবে।

Possible leave types:

- Casual Leave
- Sick Leave
- Annual Leave
- Unpaid Leave
- Maternity Leave
- Paternity Leave
- Special Leave

প্রতিটি leave type-এর quota কর্তৃপক্ষ নির্ধারণ করবে।

## 15. Leave Balance

- Leave balance calendar year অনুযায়ী হবে।
- প্রতিটি employee-এর leave type-wise yearly quota থাকবে।
- Employee কতদিন leave পেয়েছে, কতদিন নিয়েছে, কতদিন বাকি আছে দেখা যাবে।
- বছরের শেষে unused leave expire হবে।
- Carry forward বা encashment আপাতত থাকবে না।

Leave balance শেষ হলে:

- Approved leave হলেও সেটা unpaid leave হিসেবে গণ্য হবে।

## 16. Leave Application

Employee leave application করতে পারবে।

Leave application-এ থাকবে:

- Employee
- Leave type
- From date
- To date
- Total days
- Reason
- Attachment, optional
- Application date
- Status

Leave timing:

- Advance leave application allow হবে।
- Backdated leave application allow হবে।

## 17. Leave Approval

- Leave approval এক ধাপে হবে।
- যার permission থাকবে, সে leave approve/reject করতে পারবে।
- Project Incharge, HR, Admin বা authorized user permission অনুযায়ী approve করতে পারবে।
- Reject করলে reason রাখা উচিত।

Leave approve হলে:

- Attendance status leave হবে।

Leave reject হলে:

- Leave period absent হবে।

## 18. Sandwich Leave Rule

যদি employee কোনো holiday/weekly holiday-এর আগে এবং পরে leave চায়, তাহলে মাঝের holiday/weekly holiday-সহ leave হিসেবে গণ্য হবে।

Example:

- Thursday leave
- Friday weekly holiday
- Saturday leave

এই ক্ষেত্রে Thursday, Friday, Saturday সবগুলো leave হিসেবে গণ্য হবে।

Leave approve হলে:

- সবগুলো leave হবে।

Leave reject হলে:

- সবগুলো absent হবে।

## 19. Overtime Rule

- আপাতত overtime থাকবে না।
- মাসিক ভিত্তিক employee overtime পাবে না।
- Future phase-এ দরকার হলে non-monthly employee-এর জন্য overtime rule add করা যাবে।

## 20. Salary Calculation Policy

Salary period:

- পুরো মাস।
- ১ তারিখ থেকে মাসের শেষ তারিখ পর্যন্ত।

Salary basis:

- বর্তমানে employee-wise fixed monthly salary।

Absent deduction:

```text
Absent deduction = Gross Salary / 30
```

Unpaid leave deduction:

```text
Unpaid leave deduction = Gross Salary / 30
```

Half day deduction:

```text
Half day deduction = (Gross Salary / 30) / 2
```

Recommended late deduction:

```text
Every 3 late days = 1 day deduction
```

Recommended early out deduction:

```text
Every 3 early out days = 1 day deduction
```

Salary sheet generate করা যাবে:

- Company-wise monthly
- Branch-wise monthly
- Project-wise monthly
- Filter-based

## 21. Salary Module Integration

বর্তমানে salary generate করার সময় `working_days` manual input হিসেবে দেওয়া হয়।

Attendance module তৈরি হলে:

- Monthly attendance summary থেকে working days আসবে।
- Present, leave, paid holiday count salary payable day হিসেবে গণ্য হবে।
- Absent, unpaid leave, half day, late deduction, early out deduction salary deduction হিসেবে গণ্য হবে।
- Salary Generate screen-এ attendance summary দেখা যাবে।
- দরকার হলে management final adjustment করতে পারবে।

## 22. Reports

নিচের report দরকার:

1. Daily Attendance Report
2. Monthly Attendance Summary
3. Employee-wise Attendance Report
4. Branch/project-wise Attendance Report
5. Absent Report
6. Late Report
7. Early Out Report
8. Half Day Report
9. Leave Report
10. Leave Balance Report
11. Holiday Calendar Report
12. Salary Sheet
13. Overtime Report, future use

Reports PDF ও Excel export করা যাবে।

## 23. Role & Permission

Permission-based access থাকবে।

Possible permissions:

- attendance.view
- attendance.create
- attendance.edit
- attendance.approve
- attendance.delete
- attendance.report
- leave.view
- leave.create
- leave.approve
- leave.reject
- leave.balance
- holiday.view
- holiday.create
- shift.view
- shift.create
- salary.attendance.generate

Approval করতে পারবে যার permission থাকবে।

## 24. Audit Log

বর্তমান salary system-এ audit/security structure আছে। Attendance module-এও audit রাখতে হবে।

Log রাখতে হবে:

- কে attendance entry করল
- কে attendance edit করল
- কে manual attendance approve করল
- কে leave approve/reject করল
- কে holiday/weekly holiday setup change করল
- কে salary generate করল

Edit করলে reason রাখা উচিত, বিশেষ করে approved attendance বা generated salary period-এর ক্ষেত্রে।

## 25. Suggested Database Entities

Backend implementation-এর সময় নিচের entities প্রয়োজন হতে পারে:

- attendance_shifts
- attendance_policies
- weekly_holiday_policies
- holiday_calendars
- leave_types
- leave_balances
- leave_applications
- leave_approvals
- attendance_entries
- attendance_approvals
- attendance_summaries
- attendance_devices, future use

## 26. Development Phase Suggestion

Phase 1:

- Shift setup
- Weekly holiday setup
- Holiday calendar
- Leave type
- Leave balance
- Manual attendance entry
- Attendance approval
- Leave application/approval
- Basic reports

Phase 2:

- Attendance-based salary integration
- Monthly attendance summary
- Late/early out/half day deduction
- Salary sheet adjustment
- PDF/Excel export

Phase 3:

- Biometric integration
- Mobile punch
- GPS attendance
- Device employee mapping
- Advanced audit/reporting

## 27. Working Plan

Attendance Management System development তিনটি ধাপে করা হবে।

### Phase 1: Core Attendance Setup

এই phase-এ attendance system-এর basic setup এবং entry/approval flow তৈরি হবে।

কাজের তালিকা:

1. Shift Setup
2. Weekly Holiday Setup
3. Holiday Calendar
4. Leave Type Setup
5. Manual Attendance Entry
6. Attendance Approval
7. Leave Application
8. Leave Approval
9. Basic Attendance Report

এই phase শেষ হলে user manual attendance দিতে পারবে, leave application করতে পারবে, authorized user approve/reject করতে পারবে এবং basic report দেখতে পারবে।


### Phase 1: Core Attendance Setup

এই phase-এ attendance system-এর basic setup এবং entry/approval flow তৈরি হবে।

কাজের তালিকা:

1. Shift Setup
2. Weekly Holiday Setup
3. Holiday Calendar
4. Leave Type Setup
5. Manual Attendance Entry
6. Attendance Approval
7. Leave Application
8. Leave Approval
9. Basic Attendance Report

এই phase শেষ হলে user manual attendance দিতে পারবে, leave application করতে পারবে, authorized user approve/reject করতে পারবে এবং basic report দেখতে পারবে।

### Phase 2: Attendance Calculation And Summary

এই phase-এ attendance rule অনুযায়ী calculation তৈরি হবে।

কাজের তালিকা:

1. Monthly Attendance Summary
2. Late calculation
3. Early out calculation
4. Half day calculation
5. Absent calculation
6. Leave balance calculation
7. Unpaid leave calculation
8. Sandwich leave calculation
9. Branch/project-wise attendance summary

এই phase শেষ হলে system employee-wise monthly attendance status calculate করতে পারবে।

### Phase 3: Salary Integration

এই phase-এ attendance summary salary sheet-এর সাথে integrate হবে।

কাজের তালিকা:

1. Salary Generate module-এ attendance-based working days add করা
2. Absent deduction add করা
3. Unpaid leave deduction add করা
4. Half day deduction add করা
5. Late deduction add করা
6. Early out deduction add করা
7. Salary sheet preview-তে attendance summary দেখানো
8. Branch/project-wise salary generate support
9. PDF/Excel export finalize করা

এই phase শেষ হলে salary sheet attendance data-এর ভিত্তিতে generate করা যাবে।



Attendance Workflow

Setup আগে করতে হবে
Attendance Setup এ গিয়ে Shift তৈরি করবেন।
Weekly Holiday সেট করবেন, যেমন Head Office হলে শুক্রবার/শনিবার ইত্যাদি।
Holiday Calendar এ বাৎসরিক/কোম্পানি/প্রজেক্ট holiday দিবেন।
Leave Type তৈরি করবেন, যেমন Casual, Sick, Annual; quota কর্তৃপক্ষ নির্ধারণ করবে।
Manual Attendance Entry
Manual Attendance menu তে যাবেন।
Employee search করে select করবেন।
Branch, Shift, Attendance Date দিবেন।
In Time ও Out Time দিবেন।
Status select করবেন: Present, Absent, Half Day, Late ইত্যাদি।
Save করলে attendance pending approval হিসেবে থাকবে।
Manual Attendance Approval
একই Manual Attendance list থেকে pending attendance দেখা যাবে।
যার permission আছে সে Approve/Reject করবে।
Approve হলে salary calculation-এ count হবে।
Reject হলে policy অনুযায়ী absent/rejected হিসেবে ধরা হবে।
Leave Application
Leave Applications menu তে employee select করে leave type, from date, to date, reason দিয়ে Apply করবেন।
Leave application প্রথমে pending থাকবে।
যার permission আছে সে approve/reject করবে।
Leave Approval Logic
Approve হলে leave dates save হবে।
Leave balance থাকলে paid leave হবে।
Balance শেষ হলে unpaid leave হবে।
Reject হলে ওই দিনগুলো absent হিসেবে গণ্য হবে।
Sandwich leave rule অনুযায়ী leave-এর মাঝে holiday/weekly holiday থাকলে সেগুলোও leave হিসেবে ধরা হবে।
Monthly Salary
মাস শেষে attendance, approved leave, unpaid leave, absent, late/early out rule দেখে salary sheet generate হবে।
Salary period হবে ১ তারিখ থেকে মাসের শেষ দিন।
Absent deduction হবে gross salary / 30 হিসাবে।
Holiday-তে কাজ করলে আপাতত extra payment হবে না।
Recommended কাজের order

Setup data entry
Daily/manual attendance entry
Attendance approval
Leave application
Leave approval
Monthly attendance summary/report
Salary sheet integration












Ekhon attendance module-er jonno report gula dorkar hobe:

Daily Attendance Report
Date-wise employee present/absent/leave/late status.

Monthly Attendance Summary
Employee-wise month total: working day, present, absent, leave, late, early out, half day, payable day.

Employee-wise Attendance Report
Specific employee-er full attendance history.

Branch/Project-wise Attendance Report
Branch/project/team wise attendance summary.

Absent Report
Date range diye absent employee list.

Late Report
Late count, late minutes, late deduction calculation.

Early Out Report
Early out count/minutes/deduction.

Half Day Report
Half day status and deduction info.

Leave Report
Approved/rejected/pending leave list.

Leave Balance Report
Leave type-wise yearly quota, used, remaining, unpaid leave.

Holiday Calendar Report
Company/branch/project-wise holiday and weekly holiday list.

Salary Attendance Summary Report
Salary generate-er agey present, absent, unpaid leave, late deduction, payable days dekhar jonno.

Overtime Report
Eta future use, karon requirements-e bola ache apatoto overtime thakbe na.

Phase-wise korte chaile: Phase 1-e Daily Attendance, Leave Report, Absent/Late basic report enough. Phase 2-e Monthly Summary + Branch/Project Summary. Phase 3-e Salary Attendance Summary লাগবে.

## 28. Future Useful Modules / Business Automation Backlog

নিচের module/feature-গুলো attendance module শেষ হওয়ার পরে future phase-এ ready করা যেতে পারে। এগুলো CashBookBD-এর daily operation, cash flow, accounting control এবং business decision support উন্নত করবে।

### 28.1 Daily Cash Summary

Purpose:

- প্রতিদিন cash in, cash out এবং closing cash এক জায়গায় দেখা।
- system cash balance এবং physical cash balance মিলানো।
- cashier-wise বা branch-wise daily cash position দেখা।

Expected benefit:

- cash mismatch দ্রুত ধরা যাবে।
- cashier accountability বাড়বে।
- owner প্রতিদিন business cash position বুঝতে পারবে।

Database note:

- basic report existing transaction/ledger data থেকে করা যাবে।
- physical cash closing, mismatch reason, cashier note বা day closing lock দরকার হলে future table লাগতে পারে, যেমন `daily_cash_closings`।

### 28.2 Due Collection Reminder

Purpose:

- customer-wise due amount, overdue days এবং follow-up reminder দেখা।
- next follow-up date, promise date, collection note এবং assigned user রাখা।

Expected benefit:

- due collection improve হবে।
- customer follow-up miss হবে না।
- cash flow ভালো হবে।

Database note:

- basic due report existing sales/customer/payment data থেকে করা যাবে।
- reminder/follow-up workflow দরকার হলে future table লাগতে পারে, যেমন `customer_due_followups` বা `due_collection_reminders`।

### 28.3 Profit Snapshot

Purpose:

- daily, weekly এবং monthly sales, purchase, expense, gross profit এবং net profit summary দেখা।
- owner dashboard-এ quick business health দেখা।

Expected benefit:

- business লাভে না ক্ষতিতে আছে দ্রুত বোঝা যাবে।
- কোন expense category বেশি বাড়ছে সেটা দেখা যাবে।
- management দ্রুত decision নিতে পারবে।

Database note:

- সাধারণত existing sales, purchase, expense এবং ledger data থেকে report করা যাবে।
- snapshot history save করতে চাইলে future table লাগতে পারে, যেমন `profit_snapshots`।

### 28.4 Bank Reconciliation

Purpose:

- software bank ledger এবং bank statement মিলিয়ে দেখা।
- missing, duplicate, pending cheque/payment/deposit এবং mismatch transaction identify করা।

Expected benefit:

- bank balance accurate থাকবে।
- accounting mistake কমবে।
- audit এবং month-end closing সহজ হবে।

Database note:

- proper module করতে database change লাগবে।
- possible future tables: `bank_statement_imports`, `bank_statement_lines`, `bank_reconciliation_matches`।

### 28.5 Expense Approval

Purpose:

- expense entry approval-based করা।
- approved, rejected, pending status রাখা।
- approved by, approved at এবং reject reason রাখা।

Expected benefit:

- unauthorized expense কমবে।
- internal control শক্ত হবে।
- management approval history দেখতে পারবে।

Database note:

- expense/voucher table-এ approval fields যোগ করা যেতে পারে, যেমন `approval_status`, `approved_by`, `approved_at`।
- অথবা আলাদা approval table করা যেতে পারে, যেমন `expense_approvals`।

### 28.6 AI / Smart Automation Ideas

Purpose:

- auto narration suggestion।
- duplicate transaction warning।
- abnormal expense alert।
- smart search।
- customer late payment pattern এবং expense trend analysis।

Expected benefit:

- data entry দ্রুত হবে।
- ভুল entry এবং duplicate transaction কমবে।
- owner abnormal transaction বা expense দ্রুত ধরতে পারবে।
- user সাধারণ ভাষায় transaction/report search করতে পারবে।

Implementation note:

- প্রথম phase-এ rule-based logic দিয়ে শুরু করা যাবে।
- পরে দরকার হলে AI model বা smart search engine integrate করা যাবে।

Recommended future order:

1. Daily Cash Summary
2. Due Collection Reminder
3. Profit Snapshot
4. Bank Reconciliation
5. Expense Approval
6. AI / Smart Automation

## 29. Employee Attendance Category, Policy, Overtime And Shift Roster

এই section-এর উদ্দেশ্য হলো একই Attendance Management System-এর মধ্যে মাসিক কর্মচারী, দৈনিক হাজিরা ভিত্তিক শ্রমিক এবং শিফট ভিত্তিক সিকিউরিটি গার্ডদের আলাদা নিয়মে attendance, overtime এবং salary calculation manage করা।

### 29.1 Employee Attendance Category

প্রতিটি employee-এর জন্য একটি attendance category থাকবে। এই category employee master থেকে নির্ধারিত হবে, যাতে attendance entry, shift selection, overtime এবং salary calculation একই জায়গা থেকে সঠিক নিয়মে কাজ করতে পারে।

প্রস্তাবিত category:

1. Monthly Employee
2. Daily Labour
3. Security Guard / Shift Based Employee

Suggested values:

```text
monthly
daily
shifting
```

### 29.2 Required Update In `hrm_employees`

Attendance policy সঠিকভাবে চালানোর জন্য `hrm_employees` table-এ নিচের field যোগ করার প্রস্তাব করা হলো।

Minimum required fields:

```text
employment_type
attendance_policy_id
default_shift_id
```

Recommended additional fields:

```text
overtime_eligible
daily_wage
ot_rate
standard_work_minutes
```

Field description:

| Field | Purpose |
| --- | --- |
| `employment_type` | Employee monthly, daily নাকি security guard তা নির্ধারণ করবে |
| `attendance_policy_id` | কোন attendance rule/policy follow করবে |
| `default_shift_id` | Employee-এর default shift, যেমন 08:00 AM - 05:00 PM |
| `overtime_eligible` | Employee overtime পাবে কি না |
| `daily_wage` | দৈনিক হাজিরা ভিত্তিক শ্রমিকের দৈনিক মজুরি |
| `ot_rate` | Overtime rate, hourly বা fixed rule অনুযায়ী |
| `standard_work_minutes` | এক দিনের standard duty minutes |

Example:

| Employee Type | employment_type | default_shift_id | overtime_eligible |
| --- | --- | --- | --- |
| Monthly Employee | `monthly` | General 08-05 Shift | No |
| Daily Labour | `daily` | General 08-05 Shift | Yes |
| Security Guard / Shift Based | `shifting` | Optional | Depends on roster/policy |

### 29.3 Attendance Policy Table

Employee-এর attendance rule আলাদা রাখার জন্য `attendance_policies` table ব্যবহার করা উচিত। এতে future change সহজ হবে এবং employee table অতিরিক্ত rule দিয়ে ভারী হবে না।

Suggested fields:

```text
id
name
employment_type
default_shift_id
standard_work_minutes
minimum_work_minutes
half_day_minutes
grace_minutes
early_out_minutes
overtime_enabled
overtime_after_minutes
late_deduction_after_count
early_out_deduction_after_count
status
```

Example policies:

| Policy | Type | Rule |
| --- | --- | --- |
| Monthly Staff Policy | monthly | Fixed salary, late/early out deduction, no overtime |
| Daily Labour Policy | daily | Daily wage, overtime after standard duty |
| Shifting Duty Policy | shifting | Roster based shift, night shift support |

### 29.4 Monthly Employee Rule

Monthly employee সাধারণত fixed monthly salary পাবে।

Rule:

- Default duty time: 08:00 AM to 05:00 PM
- Attendance না থাকলে absent হবে
- Late, early out, half day rule apply হবে
- Overtime সাধারণত payable হবে না, unless management enables it
- Salary deduction monthly salary থেকে attendance summary অনুযায়ী হবে

Attendance entry:

```text
Employee
Date
Branch
Shift
In Time
Out Time
Status
Approval Status
```

### 29.5 Daily Labour Rule

Daily labour দৈনিক হাজিরা ভিত্তিতে কাজ করবে।

Rule:

- Default duty time: 08:00 AM to 05:00 PM
- Attendance থাকলে ১ দিনের হাজিরা count হবে
- Standard duty time-এর বেশি কাজ করলে overtime count হবে
- Daily wage এবং overtime rate employee বা policy থেকে আসবে
- Attendance absent হলে ঐ দিনের daily wage payable হবে না

Overtime example:

```text
In Time: 08:00 AM
Out Time: 07:00 PM
Standard End Time: 05:00 PM
Overtime: 02:00 Hours
```

Recommended calculation:

```text
Normal payable day = 1 day
Overtime minutes = actual worked minutes - standard work minutes
Overtime amount = overtime hours * ot_rate
```

### 29.6 Security Guard / Shift Based Employee Rule

Security guard-দের fixed 08:00 AM to 05:00 PM rule দিয়ে manage না করে roster based shift দিয়ে manage করা উচিত।

Security guard-এর জন্য shift examples:

| Shift | Start | End | Night Shift |
| --- | --- | --- | --- |
| Day Guard | 08:00 AM | 05:00 PM | No |
| Evening Guard | 05:00 PM | 11:00 PM | No |
| Night Guard | 11:00 PM | 08:00 AM | Yes |

Night shift rule:

- Shift যে তারিখে শুরু হবে, attendance সেই তারিখে count হবে
- Out time পরের দিনে হলেও attendance date shift start date অনুযায়ী থাকবে
- `is_night_shift` true হলে system cross-date out time support করবে

### 29.7 Security Guard Shift Roster

Security guard duty আগে থেকে assign করার জন্য আলাদা roster table থাকা উচিত।

Suggested table: `hrm_employee_shift_rosters`

Suggested fields:

```text
id
employee_id
branch_id
shift_id
duty_date
status
remarks
created_by
updated_by
created_at
updated_at
```

Roster example:

| Employee | Date | Branch | Shift |
| --- | --- | --- | --- |
| Rahim | 2026-06-07 | Head Office | Night Guard |
| Karim | 2026-06-07 | Head Office | Day Guard |

Manual Attendance screen behavior:

- Employee এবং date select করলে roster থেকে assigned shift auto load হবে
- Roster না থাকলে employee-এর default shift দেখানো যেতে পারে
- Security guard-এর ক্ষেত্রে shift ছাড়া attendance save করা যাবে না
- Night shift হলে out date internally next day হতে পারে

### 29.8 Manual Attendance Entry Behavior By Employee Type

Manual Attendance screen-এ employee select করার পর system employee type অনুযায়ী behavior বদলাবে।

Monthly employee:

- Default shift auto select হবে
- In/Out time দিয়ে attendance save হবে
- Overtime field hide বা disabled থাকবে

Daily labour:

- Default shift auto select হবে
- Out time standard end time-এর বেশি হলে overtime calculate হবে
- Overtime approval required করা যেতে পারে

Security guard:

- Date অনুযায়ী roster shift auto select হবে
- Night shift হলে cross-date attendance support হবে
- Roster না থাকলে warning দেখাবে

### 29.9 Salary Integration

Monthly employee salary:

```text
Payable salary = monthly salary - absent/late/early out/half day deduction
```

Daily labour salary:

```text
Payable amount = present days * daily_wage + overtime amount
```

Security guard salary:

```text
Payable salary = policy based salary + approved overtime/extra duty, if enabled
```

### 29.10 Reports Needed For This Policy

Additional reports:

1. Employee Type-wise Attendance Report
2. Daily Labour Attendance And Overtime Report
3. Security Guard Roster Report
4. Shift-wise Attendance Report
5. Overtime Approval Report
6. Monthly Payable Summary By Employment Type

### 29.11 Implementation Recommendation

Recommended implementation order:

1. Add employee attendance category fields in `hrm_employees`
2. Create or update `attendance_policies`
3. Link employee with attendance policy and default shift
4. Add daily labour overtime calculation
5. Create security guard shift roster table
6. Update Manual Attendance screen to auto-load policy/shift/roster
7. Update monthly attendance summary and salary integration
