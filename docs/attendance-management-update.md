
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