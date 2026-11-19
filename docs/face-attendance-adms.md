# ফেস হাজিরা (ADMS / PUSH) — চালু করার নির্দেশিকা

**তারিখ:** ২০২৬-১১-১৯
**ডিভাইস:** ZKTeco SenseFace 7B (ADMS সাপোর্ট করে)
**পাইলট:** `nibirnirmandb`, এক ব্রাঞ্চ
**সিদ্ধান্ত:** দিনের প্রথম পাঞ্চ = ঢোকা, শেষ পাঞ্চ = বের হওয়া; সারি `pending` থাকে, অ্যাডমিন অনুমোদন করেন।

---

## ১. কীভাবে কাজ করে

```
[SenseFace 7B, ব্রাঞ্চে]
   │  মুখ চেনে (template ডিভাইসেই থাকে)
   │  POST /api/iclock/cdata?SN=<serial>&table=ATTLOG
   ▼
[cashbook_api]
   │ 1. serial_no মিলিয়ে ডিভাইস চেনে (না মিললে 403)
   │ 2. hrm_attendance_punches-এ কাঁচা পাঞ্চ (unique: device + code + সময়)
   │ 3. device_employee_code → কর্মচারী (ম্যাপিং, নাহলে hrm_employees.device_employee_code)
   │ 4. দিনের সব পাঞ্চ থেকে সারি: first = in, last = out
   │    attendanceTimes()-এর হিসাব, attendance_source='biometric', approval pending
   ▼
[Manual Attendance, রিপোর্ট, বেতন]  — আগের মতোই
```

⚠️ মুখের ছবি বা টেমপ্লেট সার্ভারে আসে না। `ATTPHOTO` পাঠালে সেটাও সংরক্ষণ করা হয় না।

---

## ২. ডেটাবেস

`hrm_attendance_punches` — নতুন টেবিল:

| কলাম | কাজ |
|---|---|
| `device_id`, `device_employee_code` | কোন টার্মিনালে কোন কোড |
| `employee_id` | ম্যাপ করা কর্মচারী; অচেনা কোডে `NULL` |
| `punch_at` | **ডিভাইসের ঘড়ির সময়** |
| `received_at` | সার্ভারে কখন পৌঁছাল (অফলাইন ব্যাকফিল ধরার জন্য) |
| `verify_mode`, `status_code`, `raw` | ডিভাইস যা পাঠিয়েছে, হুবহু |
| `processed_at` | সর্বশেষ কখন দিনের সারি তৈরি হয়েছে |

`hrm_attendance_devices`-এ যোগ হয়েছে: `comm_key`, `firmware`, `last_seen_at`।

চালানোর তিন পথ (সবই একই ফল):

```bash
php artisan migrate                      # নতুন ইনস্টল
php artisan patch:attendance-devices     # শুধু এই স্কিমা
php artisan patch:add-unit-type          # ক্লায়েন্টের স্বাভাবিক ডিপ্লয় — এটাও চলে
```

তিনটিই idempotent — দুবার চালালে ক্ষতি নেই।

---

## ৩. ডিভাইসে সেটিং

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

## ৪. স্ক্রিন

- **HRM → Attendance → Attendance Devices** (`hrm.attendance.setup.view`)
  ডিভাইস নিবন্ধন, স্টেটাস, শেষ কখন যোগাযোগ, কে কোন কোডে enrolled, ম্যাপিং।
- **HRM → Attendance → Unmatched Punches** (`hrm.attendance.view`)
  টার্মিনালে আছে কিন্তু কোনো কর্মচারীর সাথে মেলা হয়নি — এমন কোড। এখান থেকে ম্যাপ করলে পুরনো দিনগুলোও তৈরি হয়।
- **Manual Attendance**-এ এখন **Source** কলাম: `Face` / `Manual`।
- কর্মচারী ফর্মে **Device Code (face terminal)** ঘর।

---

## ৫. API

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
| POST | `/api/hrms/attendance/devices/map/delete/{id}` | Sanctum |
| GET | `/api/hrms/attendance/unmatched-punches` | Sanctum |
| POST | `/api/hrms/attendance/unmatched-punches/assign` | Sanctum |

ADMS route-এ throttle `240/মিনিট`।

### কমান্ড (getrequest / devicecmd)

ডিভাইসে সরাসরি ঢোকা যায় না — কমান্ড `hrm_attendance_device_commands`-এ জমা থাকে, ডিভাইস পরের বার `getrequest` করলে `C:<id>:<command>` আকারে পায়, আর `devicecmd`-এ `ID=..&Return=0&CMD=..` দিয়ে উত্তর দেয়।

| কাজ | কমান্ড |
|---|---|
| ঘড়ি সিঙ্ক | `DATA UPDATE TIME` |
| পুরনো পাঞ্চ টানা | `DATA QUERY ATTLOG StartTime=YYYY-MM-DD 00:00:00\tEndTime=YYYY-MM-DD 23:59:59` |
| সংযোগ পরীক্ষা | `CHECK` |

পাঁচ মিনিটে উত্তর না এলে কমান্ডটা আবার পাঠানো হয়; স্ক্রিনের Command History-তে sent/done/failed দেখা যায়।

---

## ৬. ডিভাইস ছাড়া পরীক্ষা

```bash
# ১. হ্যান্ডশেক
curl "http://127.0.0.1:8000/api/iclock/cdata?SN=<serial>&options=all&pushver=2.4.1"

# ২. দুইটা পাঞ্চ (ট্যাব দিয়ে আলাদা করা)
printf '1001\t2026-11-19 09:10:00\t0\t15\r\n1001\t2026-11-19 20:40:00\t1\t15\r\n' \
  | curl -X POST --data-binary @- \
    "http://127.0.0.1:8000/api/iclock/cdata?SN=<serial>&table=ATTLOG&Stamp=1"
```

তারপর `hrm_attendance_punches` ও `hrm_attendance_entries` দেখুন — in/out, `attendance_source='biometric'`, `approval_status='pending'`।

---

## ৭. ইনস্টলেশনের দিনের চেকলিস্ট

ব্রাঞ্চে যাওয়ার আগে / ডিভাইস বসানোর আগে:

1. **পাবলিক ঠিকানা পৌঁছায় কি না** — ল্যাপটপ থেকে (অফিসের নেট দিয়ে, ভেতরের Wi-Fi নয়):

   ```bash
   curl -i "https://<client-domain>/api/iclock/ping?SN=TEST-123"
   ```

   - `HTTP/1.1 403` + `UNREGISTERED` → **ঠিক আছে**: সার্ভার পর্যন্ত পৌঁছাচ্ছে, শুধু serial নিবন্ধিত নয়।
   - `404` → রুট ক্যাশ পুরনো: সার্ভারে `php artisan route:clear` চালান।
   - `timeout` / TLS error → DNS, ফায়ারওয়াল বা সার্টিফিকেট ঠিক করুন — ডিভাইসও এখানেই আটকাবে।

2. **HTTPS সার্টিফিকেট বৈধ** — `curl -v` করে দেখুন। বেশিরভাগ ফার্মওয়্যার self-signed সার্টিফিকেট নেয় না।

3. **সার্ভারের সময়** — `date` মিলছে কি না দেখুন (`Asia/Dhaka`); ডিভাইসের সময় এর সাথেই মেলানো হবে।

4. **ডিভাইসের ফার্মওয়্যার ADMS চালায়** — `Menu → Comm → Cloud Server / ADMS` আছে কি না দেখুন।

5. **Serial নম্বর লিখে রাখুন** (Menu → About) — তারপর Devices স্ক্রিনে নিবন্ধন করুন।

6. **প্রথম যোগাযোগ** — নিবন্ধনের পর ডিভাইসের স্ক্রিনে "Connect Success" বা তালিকায় Last Contact সময় দেখা উচিত (RequestDelay ~১০ সেকেন্ড)।

7. **একটা পাঞ্চ দিয়ে পরীক্ষা** — একজন মুখ দেখান, তারপর Devices → Punches-এ সেই রেকর্ড ও Manual Attendance-এ দিনের সারি দেখা উচিত।

---

## ৮. যা এখনো করা হয়নি

- **রাতের শিফট**: পাঞ্চ পঞ্জিকার তারিখ ধরে হিসাব হয়; মধ্যরাত পেরোনো শিফটে পরের দিনের পাঞ্চ আগের দিনে টানার নিয়ম এখনো নেই।
- **কর্মচারী মোছার কমান্ড**: `DELETE USER` প্রেরণ এখনো যোগ করা হয়নি (হাতে করা যাবে)।
- **অনুমতি কার্যকর**: HRMS route-এ permission enforcement এখনো চালু নয় — বায়োমেট্রিক ব্যবস্থাপনার আগে এটি ঠিক করা দরকার।
- **একাধিক ডিভাইসে একই কর্মচারী**: প্রতি ডিভাইসে আলাদা enrollment ধরা হয়েছে; template সার্ভারের মধ্য দিয়ে যাবে না।
