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
