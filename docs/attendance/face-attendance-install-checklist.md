# ফেস হাজিরা — ইনস্টলেশনের দিনের চেকলিস্ট

**ডিভাইস:** ZKTeco SenseFace 7B · **পাইলট:** `nibirnirmandb`, এক ব্রাঞ্চ
এই পাতাটা ছাপিয়ে ব্রাঞ্চে নিয়ে যান। প্রতিটি ঘরে ✓ দিন।

---

## ক. ব্রাঞ্চে যাওয়ার আগে (অফিস থেকে)

- [ ] `php artisan patch:add-unit-type` চালানো হয়েছে (বা `patch:attendance-devices`) — `hrm_attendance_punches`, `hrm_attendance_device_commands` তৈরি
- [ ] সার্ভারের ঘড়ি ঠিক আছে (`date` → Asia/Dhaka)
- [ ] ক্লায়েন্টের পাবলিক URL-এ API পৌঁছায়:

      curl -i "https://<domain>/api/iclock/ping?SN=TEST-123"
      → HTTP 403 + UNREGISTERED  ✔ (সার্ভার পর্যন্ত পৌঁছাচ্ছে)

      404 → সার্ভারে `php artisan route:clear`
      timeout / TLS error → DNS, ফায়ারওয়াল বা সার্টিফিকেট

- [ ] HTTPS সার্টিফিকেট বৈধ (self-signed হলে ডিভাইস নেবে না)
- [ ] ডিভাইসের **Serial Number** লিখে রাখা (Menu → About)
- [ ] ডিভাইসের ফার্মওয়্যারে **ADMS / Cloud Server** আছে কি না দেখা
- [ ] ব্রাঞ্চে স্থির বিদ্যুৎ ও নেট (Wi-Fi বা LAN)
- [ ] সার্ভারে scheduler cron আছে (ডিভাইস-স্বাস্থ্য লগের জন্য):

      * * * * * cd /path/to/cashbook_api && php artisan schedule:run >> /dev/null 2>&1

---

## খ. ডিভাইস বসানো

- [ ] ডিভাইস চালু, নেটে যুক্ত (IP দেখে নিন)
- [ ] **Menu → Comm → Cloud Server / ADMS**
  - [ ] Server Address: `<client-domain>` (বা পুরো `/api/iclock/cdata`); push 3.x ফার্মওয়্যারে শুধু হোস্ট/IP, পথ নয়
  - [ ] Server Port: `443` (HTTPS) / `80` (HTTP)
  - [ ] Communication: **ADMS (Push)**
  - [ ] HTTPS: চালু (সার্টিফিকেট বৈধ হলে)
- [ ] Save করে ডিভাইস রিস্টার্ট

---

## গ. সফটওয়্যারে

- [ ] **HRM → Attendance → Attendance Devices → Register Device**
  - [ ] Serial Number হুবহু (আগে-পরে ফাঁকা নয়)
  - [ ] Branch বাছাই
- [ ] তালিকায় **Last Contact** সময় দেখাচ্ছে → ডিভাইস কথা বলছে
- [ ] প্রথম ১৫ মিনিটে **Offline** দেখালে: ডিভাইসের নেট, সার্ভার অ্যাড্রেস, পোর্ট, ফায়ারওয়াল দেখুন
- [ ] **Users** আইকনে ঢুকে প্রতিটি কর্মচারীর **Device Code** ম্যাপ করুন
  - [ ] ম্যাপ করার বার্তায় কত দিন rebuild হলো দেখা
- [ ] **Unmatched Punches**-এ কিছু পড়ে আছে কি না দেখুন
- [ ] কেউ চাকরি ছাড়লে: Users → **Delete on Device** (ডিভাইস থেকে মুখ মোছার কমান্ড; হাজিরার ইতিহাস থাকে)

---

## ঘ. প্রথম পরীক্ষা

- [ ] একজন কর্মচারী মুখ দেখান → Devices → **Punches**-এ সেই রেকর্ড (ডিভাইসের সময় সহ)
- [ ] **Manual Attendance**-এ ওই দিনের সারি, **Source = Face**, Status/Approval দেখুন
- [ ] ঘড়ি মিলছে না (**Clock … behind/ahead**) → **Sync Clock** → ডিভাইস পরের বার যোগাযোগের পর আবার দেখুন
- [ ] ডিভাইসে জমে থাকা পুরনো পাঞ্চ দরকার হলে: **Pull Punches** (তারিখ পরিসর দিয়ে)
- [ ] হাজিরা ভুল দেখালে: **Rebuild Days** (ওই তারিখ পরিসরে) — পাঞ্চ থেকেই নতুন করে তৈরি হবে

---

## ঙ. শেষ করার আগে

- [ ] সব কর্মচারীর Device Code ম্যাপ হয়েছে (তালিকায় ০ Unmatched)
- [ ] ডিভাইসের ঘড়ি সার্ভারের সাথে মিলছে (±২ মিনিট)
- [ ] দিনের ৩টি সারি হাতে মিলিয়ে দেখা (in/out/দেরি)
- [ ] অ্যাডমিনকে দেখানো: Approve কোথায়, Rebuild কোথায়, Unmatched কোথায়
- [ ] সমস্যা হলে: ডিভাইসের পর্দায় Cloud Server লগ, আর সার্ভারে `storage/logs/laravel.log` (`ADMS attendance received`, `ADMS call from an unregistered device`)

---

## মনে রাখা

- মুখের ছবি বা টেমপ্লেট সার্ভারে রাখা হয় না — push 3.x ডিভাইস ছবি পাঠালেও সার্ভার শুধু গ্রহণের সংকেত দেয়, সংরক্ষণ করে না।
- push 3.x ডিভাইসে (SenseFace 7B) পাঞ্চ না এলে: সার্ভারের PHP temp ফোল্ডার লেখার যোগ্য কিনা দেখুন; লগে বারবার `tablename=biophoto` মানে queue আটকে আছে।
- ডিভাইসে সরাসরি কমান্ড যায় না; কমান্ড জমা থাকে, ডিভাইস পরের বার যোগাযোগে কার্যকর হয়।
- পাঞ্চ কখনো মোছে না; Unmatched কোড ম্যাপ করলে পুরনো দিনও তৈরি হয়।
