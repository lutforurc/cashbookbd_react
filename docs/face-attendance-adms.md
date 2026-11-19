# ফেস হাজিরা (ADMS / PUSH) — চালু করার নির্দেশিকা

**তারিখ:** ২০২৬-১১-১৯ (সর্বশেষ হালনাগাদ: ২০২৬-১১-১৯ রাত)
**ডিভাইস:** ZKTeco SenseFace 7B (ADMS সাপোর্ট করে)
**পাইলট:** `nibirnirmandb`, এক ব্রাঞ্চ
**সিদ্ধান্ত:** দিনের প্রথম পাঞ্চ = ঢোকা, শেষ পাঞ্চ = বের হওয়া; সারি `pending` থাকে, অ্যাডমিন অনুমোদন করেন।

---

## ১. কীভাবে কাজ করে

```
[SenseFace 7B, ব্রাঞ্চে]
   │  মুখ চেনে (template ডিভাইসেই থাকে)
   │  POST /api/iclock/cdata?SN=<serial>&table=ATTLOG
   │     1001 <TAB> 2026-11-17 08:58:00 <TAB> 0 <TAB> 15
   ▼
[cashbook_api]
   │ 1. serial_no মিলিয়ে ডিভাইস চেনে (না মিললে 403)
   │ 2. hrm_attendance_punches-এ কাঁচা পাঞ্চ (unique: device + code + সময়)
   │ 3. device_employee_code → কর্মচারী (ম্যাপিং, নাহলে hrm_employees.device_employee_code)
   │ 4. দিনের সব পাঞ্চ থেকে সারি নতুন করে: first = in, last = out
   │    একই হিসাব (AttendanceTimesCalculator), attendance_source='biometric',
   │    approval_status='pending'
   ▼
[Manual Attendance, রিপোর্ট, বেতন]  — আগের মতোই
```

⚠️ মুখের ছবি বা টেমপ্লেট সার্ভারে আসে না। `ATTPHOTO` পাঠালেও সংরক্ষণ করা হয় না।

**রাতের শিফট (মধ্যরাত পার):** ২২:০০–০৬:০০-এর মতো শিফট **যে সন্ধ্যায় শুরু হয়েছে সেই দিনের** কাজ। ২১:৫৫-এ ঢুকে ২০ তারিখ ০৬:০৫-এ বেরোলে সারি ১৯ তারিখের, `in` ২১:৫৫ আর `out` ২০ তারিখ ০৬:০৫। শিফটের শেষ সময়ের ৪ ঘণ্টা পর্যন্ত সহনশীলতা ধরা হয়, আর আগের দিনটাও মধ্যরাত-পার হওয়া শিফট হতে হবে — নাহলে দিনের শিফটের ০৬:০৫ পাঞ্চ নিজের দিনেই থাকে।

---

## ২. ডেটাবেস

পাঁচটি টেবিল জড়িত। **কাঁচা পাঞ্চ কখনো মোছে না** — সেটাই প্রমাণ।

| টেবিল | কী রাখে |
|---|---|
| `hrm_attendance_devices` | নিবন্ধিত টার্মিনাল: `device_name`, `serial_no`, `branch_id`, `status`, `comm_key`, `firmware`, `last_seen_at`, `last_sync_at` |
| `hrm_attendance_device_employees` | ডিভাইস কোড → কর্মচারী ম্যাপিং (`device_employee_code`, `employee_id`, `status`) |
| **`hrm_attendance_punches`** | ডিভাইসের পাঠানো প্রতিটি কাঁচা পাঞ্চ |
| `hrm_attendance_entries` | ওই পাঞ্চ থেকে বানানো দিনের হাজিরা (in/out/দেরি/ওভারটাইম/অনুমোদন) |
| `hrm_attendance_device_commands` | ডিভাইসের জন্য জমা কমান্ড (ঘড়ি সিঙ্ক, পাঞ্চ টানা, মুখ মোছা) |

### `hrm_attendance_punches`

| কলাম | কাজ |
|---|---|
| `device_id`, `device_employee_code` | কোন টার্মিনালে কোন কোড |
| `employee_id` | ম্যাপ করা কর্মচারী; অচেনা কোডে `NULL` (Unmatched) |
| **`punch_at`** | **ডিভাইসের ঘড়ির সময়** — অফলাইনে জমে থাকা পাঞ্চও সঠিক সময়ে বসে |
| **`received_at`** | সার্ভারে কখন পৌঁছাল (ব্যাকফিল ও ঘড়ির ব্যবধান ধরার জন্য) |
| `verify_mode`, `status_code` | ডিভাইসের নিজের verify ও status কোড |
| `raw` | ডিভাইস যে লাইনটা হুবহু পাঠিয়েছে |
| `processed_at` | সর্বশেষ কখন দিনের সারি তৈরি হয়েছে |

`UNIQUE (device_id, device_employee_code, punch_at)` — একই পাঞ্চ দুবার এলে একবারই জমে।

**"Punches Kept" সংখ্যাটা কোথা থেকে:** `hrm_attendance_punches`-এ প্রতি ডিভাইসের `COUNT(*)`-এর যোগফল।

```sql
SELECT device_employee_code, punch_at, received_at, verify_mode, raw
FROM hrm_attendance_punches
WHERE device_id = 4
ORDER BY punch_at;
```

### স্কিমা চালানোর তিন পথ (সবই একই ফল, idempotent)

```bash
php artisan migrate                      # নতুন ইনস্টল
php artisan patch:attendance-devices     # শুধু এই স্কিমা
php artisan patch:add-unit-type          # ক্লায়েন্টের স্বাভাবিক ডিপ্লয় — এটাও চলে
```

---

## ৩. ডিভাইস কী পাঠায়, কী পাঠায় না

ADMS "PUSH"-এ ডিভাইস একটা টেক্সট লাইন পাঠায় — ট্যাব দিয়ে আলাদা ঘর:

```
1001	2026-11-17 08:58:00	0	15
```

| ঘর | মানে | উদাহরণ |
|---|---|---|
| ১ | **PIN / device employee code** — ডিভাইসে যে আইডি দিয়ে মুখ enroll করা | `1001` |
| ২ | **সময়** — ডিভাইসের ঘড়ি অনুযায়ী | `2026-11-17 08:58:00` |
| ৩ | **status** — ০ = ঢোকা, ১ = বের হওয়া | `0` |
| ৪ | **verify** — কী দিয়ে চেনা হলো | `15` |

`verify` কোড ZKTeco-র নিজের রীতি (সাধারণত ১৫ = মুখ, ১ = আঙুল, ৪ = কার্ড) — আমরা এটা **যেমন আছে তেমনই** রাখি, তার ভিত্তিতে বেতন ঠিক করি না।

এর বাইরে:

- **হ্যান্ডশেকে** ডিভাইস `SN`, `pushver`, `language`, `options` পাঠায় — serial দিয়েই ডিভাইস চেনা হয়।
- **`OPERLOG`** (ডিভাইসের নিজের লগ) ও **`ATTPHOTO`** (ছবি) এলে `OK` বলে এগিয়ে যাই — **সংরক্ষণ করি না**।
- **পাঠায় না:** কর্মচারীর নাম, employee_id, মুখের ছবি বা template। শুধু নিজের দেওয়া কোডটাই পাঠায় — তাই কোড → কর্মচারী ম্যাপিং লাগে।
- কোনো লাইনের সময় পড়া না গেলে (বা PIN খালি) সেটি বাদ যায় এবং `laravel.log`-এ লেখা থাকে।

---

## ৪. ডিভাইসে সেটিং

ডিভাইসের পর্দায়: **Menu → Comm → Cloud Server / ADMS**

| ঘর | মান |
|---|---|
| Server Address | `https://<client-domain>/api/iclock/cdata` (বা শুধু হোস্ট, পোর্ট আলাদা) |
| Server Port | `443` (HTTPS) / `80` (HTTP) |
| Communication | ADMS (Push) |
| HTTPS | চালু — সার্টিফিকেট বৈধ হতে হবে (Let's Encrypt চলবে) |
| Comm Key | ডিভাইসে দিলে সফটওয়্যারের `Comm Key` ঘরেও একই |

⚠️ কিছু পুরনো ফার্মওয়্যার শুধু HTTP পাঠায়। কেনার/বসানোর আগে দেখে নিন।

কোন সার্ভারে যাচ্ছে তা দেখতে ডিভাইসের **Menu → Comm → Cloud Server**-এর লগ, আর সার্ভারে `storage/logs/laravel.log`-এ `ADMS attendance received` লাইন।

---

## ৫. স্ক্রিন

- **HRM → Attendance → Attendance Devices** (`hrm.attendance.setup.view`)
  - ডিভাইস নিবন্ধন, স্টেটাস, শেষ কখন যোগাযোগ
  - **Offline** (১৫ মিনিট যোগাযোগ নেই) ও **Clock … behind/ahead** (ডিভাইসের ঘড়ি মিলছে না) — লাল সতর্কতা
  - **Users** আইকনে কর্মচারী ম্যাপিং; প্রতি সারিতে **Edit** (কোড বা কর্মচারী সংশোধন), **Unmap** (সফটওয়্যারে ম্যাপিং বন্ধ) ও **Delete on Device** (ডিভাইস থেকে মুখ মোছার কমান্ড)
    ⚠️ **Edit হলো সংশোধন, হাতবদল নয়** — সেই কোডের আগের পাঞ্চগুলোও নতুন কর্মচারীর নামে চলে যায়, তাঁর দিনগুলো আবার তৈরি হয়; পুরনো কর্মচারীর যে সারির আর কোনো পাঞ্চ-প্রমাণ থাকে না, সেটি (pending থাকলে) মুছে যায়। Approved সারি হাতের সিদ্ধান্ত, তাই থাকে।
  - **Punches** আইকনে কাঁচা পাঞ্চ, **Sync Clock**, **Pull Punches**, **Rebuild Days**, আর Command History
- **HRM → Attendance → Unmatched Punches** (`hrm.attendance.view`)
  টার্মিনালে আছে কিন্তু কোনো কর্মচারীর সাথে মেলা হয়নি — এমন কোড। ম্যাপ করলে পুরনো দিনগুলোও তৈরি হয়।
- **Manual Attendance**-এ **Source** কলাম: `Face` / `Manual` (যাদের ওই দিনে এন্ট্রি নেই, তাদের `—`)।
- কর্মচারী ফর্মে **Device Code (face terminal)** ঘর।

### ডিভাইস সেটিংস (Devices → Device Settings ট্যাব)

| সেটিং | মানে |
|---|---|
| **Auto-approve device punches** | হ্যাঁ → পাঞ্চ আসার সাথে সাথে অনুমোদিত, আসল অবস্থাসহ (present / late / half day); না → pending, অ্যাডমিন অনুমোদন করবেন |
| **Keep punches for (days)** | ০ = চিরকাল; সংখ্যা দিলে তার বেশি পুরনো **কাঁচা পাঞ্চ** রাতে মুছে যায় (`attendance:prune-punches`, ০২:৩০) — দিনের হাজিরা মুছবে না |

সেটিং ব্রাঞ্চভিত্তিক; ব্রাঞ্চের নিজের উত্তর না থাকলে কোম্পানির উত্তর, তাও না থাকলে ডিফল্ট (auto-approve বন্ধ, retention ০)।

- **একই কর্মচারী একাধিক টার্মিনালে:** ম্যাপিং তালিকায় **Copy** চাপলে সেই কোড ও কর্মচারী ব্রাঞ্চের অন্য সব ডিভাইসে বসে। ⚠️ মুখ/template যায় না — প্রতিটি টার্মিনালে মুখটি নিজে enroll করতে হবে।
- **সার্ভার থেকে enrollment:** ইচ্ছাকৃতভাবে নেই (বায়োমেট্রিক ডেটা সার্ভারে না রাখার নীতি)।

---

## ৬. API

| Method | Path | Auth |
|---|---|---|
| GET/POST | `/api/iclock/cdata` | নেই — serial দিয়ে |
| GET/POST | `/api/iclock/getrequest` | নেই — serial দিয়ে |
| GET/POST | `/api/iclock/devicecmd` | নেই — serial দিয়ে |
| GET/POST | `/api/iclock/ping`, `/api/iclock/registry` | নেই — serial দিয়ে |
| GET | `/api/hrms/attendance/devices` | Sanctum |
| POST | `/api/hrms/attendance/devices/store` | Sanctum |
| POST | `/api/hrms/attendance/devices/update/{id}` | Sanctum |
| POST | `/api/hrms/attendance/devices/status/{id}` | Sanctum |
| GET | `/api/hrms/attendance/devices/{id}/employees` | Sanctum |
| GET | `/api/hrms/attendance/devices/{id}/punches` | Sanctum |
| GET | `/api/hrms/attendance/devices/{id}/commands` | Sanctum |
| POST | `/api/hrms/attendance/devices/{id}/command` | Sanctum |
| POST | `/api/hrms/attendance/devices/{id}/map` | Sanctum |
| POST | `/api/hrms/attendance/devices/map/update/{id}` | Sanctum |
| POST | `/api/hrms/attendance/devices/map/delete/{id}` | Sanctum |
| GET | `/api/hrms/attendance/unmatched-punches` | Sanctum |
| POST | `/api/hrms/attendance/unmatched-punches/assign` | Sanctum |
| POST | `/api/hrms/attendance/punches/rebuild` | Sanctum |

ADMS route-এ throttle `240/মিনিট`।

### কমান্ড (getrequest / devicecmd)

ডিভাইসে সরাসরি ঢোকা যায় না — কমান্ড `hrm_attendance_device_commands`-এ জমা থাকে, ডিভাইস পরের বার `getrequest` করলে `C:<id>:<command>` আকারে পায়, আর `devicecmd`-এ `ID=..&Return=0&CMD=..` দিয়ে উত্তর দেয়।

| কাজ | কমান্ড |
|---|---|
| ঘড়ি সিঙ্ক | `DATA UPDATE TIME` |
| পুরনো পাঞ্চ টানা | `DATA QUERY ATTLOG StartTime=YYYY-MM-DD 00:00:00\tEndTime=YYYY-MM-DD 23:59:59` |
| সংযোগ পরীক্ষা | `CHECK` |
| ডিভাইস থেকে মুখ মোছা | `DELETE USER PIN=<device_employee_code>` |

পাঁচ মিনিটে উত্তর না এলে কমান্ডটা আবার পাঠানো হয়; স্ক্রিনের Command History-তে `pending / sent / done / failed` দেখা যায়।

### Rebuild (পাঞ্চ থেকে দিন আবার তৈরি)

`POST /api/hrms/attendance/punches/rebuild` — `{date_from, date_to, device_id?}`

⚠️ ডিভাইসে কিছু পাঠানো হয় না; হাতে থাকা পাঞ্চ থেকেই ওই তারিখগুলোর দিনের সারি নতুন করে লেখা হয়। ম্যাপিং দেরিতে হলে, সপ্তাহখানেক অফলাইনের পরে, বা নিয়ম বদলালে এটাই ফেরার পথ। অচেনা কোড বাদ যায় (ম্যাপ করলে নিজেই তৈরি হয়)।

---

## ৭. ডিভাইস ছাড়া পরীক্ষা

```bash
# ১. হ্যান্ডশেক
curl "http://127.0.0.1:8000/api/iclock/cdata?SN=<serial>&options=all&pushver=2.4.1"

# ২. দুইটা পাঞ্চ (ট্যাব দিয়ে আলাদা করা)
printf '1001\t2026-11-19 09:10:00\t0\t15\r\n1001\t2026-11-19 20:40:00\t1\t15\r\n' \
  | curl -X POST --data-binary @- \
    "http://127.0.0.1:8000/api/iclock/cdata?SN=<serial>&table=ATTLOG&Stamp=1"
```

তারপর `hrm_attendance_punches` ও `hrm_attendance_entries` দেখুন — in/out, `attendance_source='biometric'`, `approval_status='pending'`।

একই পাঞ্চ আবার পাঠালে নতুন সারি হবে না; আগের দিনের পাঞ্চ পরে এলে in/out নিজেই ঠিক হয়ে যাবে।

---

## ৮. ইনস্টলেশনের দিনের চেকলিস্ট

বিস্তারিত ছাপার চেকলিস্ট: **`docs/face-attendance-install-checklist.md`**। সংক্ষেপে:

1. **পাবলিক ঠিকানা পৌঁছায় কি না** — ল্যাপটপ থেকে (অফিসের নেট দিয়ে):

   ```bash
   curl -i "https://<client-domain>/api/iclock/ping?SN=TEST-123"
   ```

   - `HTTP/1.1 403` + `UNREGISTERED` → **ঠিক আছে**: সার্ভার পর্যন্ত পৌঁছাচ্ছে, শুধু serial নিবন্ধিত নয়।
   - `404` → রুট ক্যাশ পুরনো: সার্ভারে `php artisan route:clear` চালান।
   - `timeout` / TLS error → DNS, ফায়ারওয়াল বা সার্টিফিকেট ঠিক করুন — ডিভাইসও এখানেই আটকাবে।

2. **HTTPS সার্টিফিকেট বৈধ** — বেশিরভাগ ফার্মওয়্যার self-signed সার্টিফিকেট নেয় না।
3. **সার্ভারের সময়** — `Asia/Dhaka`; ডিভাইসের ঘড়ি এর সাথেই মেলানো হবে।
4. **Serial নম্বর** (Menu → About) — Devices স্ক্রিনে নিবন্ধন করুন।
5. **প্রথম যোগাযোগ** — Last Contact সময় দেখা উচিত (RequestDelay ~১০ সেকেন্ড)।
6. **একটা পাঞ্চ দিয়ে পরীক্ষা** — Devices → Punches-এ রেকর্ড, Manual Attendance-এ দিনের সারি।
7. **কর্মচারী ম্যাপিং** — Unmatched শূন্য হওয়া উচিত।

---

## ৯. অনুমতি (কে ডিভাইস সামলাতে পারবে)

হাজিরা ও ডিভাইসের রুটগুলো এখন permission map-এ বসানো এবং locked গ্রুপে আছে; তবে **enforcement সুইচ ডিফল্টে বন্ধ** — সার্ভারের `.env`-এ চালু করতে হয়:

```bash
ROUTE_PERMISSIONS_ENFORCE=true
php artisan config:cache
```

| কাজ | যে permission লাগে |
|---|---|
| ডিভাইস তালিকা, পাঞ্চ/কমান্ড দেখা, নিবন্ধন/এডিট/স্টেটাস, ম্যাপিং, কমান্ড পাঠানো, Unmatched ম্যাপ করা, দিন rebuild | `hrm.attendance.device.manage` |
| Unmatched তালিকা দেখা | `hrm.attendance.view` |
| Audit history | `hrm.attendance.audit.view` |
| Monthly summary | `hrm.attendance.monthly.view` |
| Attendance report | `hrm.attendance.report.view` |

⚠️ **চালু করার আগে অডিট লগ পড়ুন:** `storage/logs/permission-audit-*.log`-এ দেখা যায় কোন রুটে কোন রোলে "would-block" হচ্ছিল। ভুল ম্যাপিং কেবল কাস্টমারের কেরানির কাছেই ধরা পড়ে, তাই এক গ্রুপ চালু করে কিছুদিন দেখে পরেরটা — এই নিয়মই রাখা হয়েছে। কোম্পানি ১ ও অ্যাডমিন রোল blanket-এ সব পার হয়, তাই তাদের দিয়ে পরীক্ষা করে কিছু বোঝা যায় না।

---

## ১০. ডিভাইসের স্বাস্থ্য (স্বয়ংক্রিয়)

প্রতি ১৫ মিনিটে চলা কমান্ড:

```bash
php artisan attendance:device-health          # শুধু রিপোর্ট
php artisan attendance:device-health --fix    # ঘড়ি সোঁদা ডিভাইসের জন্য Sync Clock জমা করে
```

- ১৫ মিনিটের বেশি যোগাযোগ নেই → **QUIET**
- ৫ মিনিটের বেশি ঘড়ির ব্যবধান → **DRIFT** (সাথে `1h 46m behind` ইত্যাদি)
- আউটপুট যায় `storage/logs/attendance-device-health.log`-এ

⚠️ **cron ছাড়া কিছু চলে না** — সার্ভারে এক লাইন লাগে:

```
* * * * * cd /path/to/cashbook_api && php artisan schedule:run >> /dev/null 2>&1
```

`--fix` ডিফল্টে বন্ধ: শিফট চলাকালীন ঘড়ি বদলানো নিজে থেকে ঠিক করবে না, তবেই ডিভাইসের ঘড়ি সার্ভারের সাথে মিলে যাবে।

---

## ১১. যা এখনো করা হয়নি

- **সার্ভার থেকে enrollment**: মুখ/টেমপ্লেট সার্ভার থেকে ডিভাইসে পাঠানো হয় না — enrollment ডিভাইসেই করতে হয় (পাইলটে ইচ্ছাকৃত; বায়োমেট্রিক ডেটার আইনি অবস্থান বদলাবে)।
- **পাঞ্চ সংরক্ষণের মেয়াদ**: সেটিং আছে (উপরের ট্যাব), কিন্তু কোনো ব্রাঞ্চ সংখ্যা না দিলে ডিফল্টে সব পাঞ্চ চিরকাল থাকে।
- **একাধিক ডিভাইসে template স্থানান্তর**: ম্যাপিং কপি হয়, মুখের template নয় — প্রতিটি টার্মিনালে আলাদা enrollment।
