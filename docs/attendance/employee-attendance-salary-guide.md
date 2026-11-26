# কর্মচারী এন্ট্রি → হাজিরা → বেতন (হাতে-কলমে)

**তারিখ:** ২৫ নভেম্বর ২০২৬
**কে পড়বেন:** HR, হিসাব বিভাগ ও নতুন ব্যবহারকারী
**সম্পর্কিত:** `salary-components-user-guide.docx` (পূর্ণ নির্দেশিকা), `salary-components-how-it-works.md` (হিসাবের নিয়ম)

---

## ০. এক নজরে

```text
Designation / Department → Employee Entry → Attendance
      → Salary Components (একবার) → Salary Structures (একবার)
      → Employee-র Salary Revision (মাসে/বছরে) → Salary Generate (প্রতি মাসে)
      → Salary Sheet (প্রিন্ট / পেমেন্ট)
```

মূল কথা: **বেতন কোনো ঘরে টাইপ করা অঙ্ক নয়** — এটা Employee-র salary revision আর ওই মাসের attendance থেকে সার্ভার হিসাব করে। তাই আগে হাজিরা, পরে Generate।

---

## ১. Employee Entry (HRM → Employees → New Employee)

তিনটি ধাপ:

### ক) Personal Information
নাম (ENG | বাংলা), পিতার নাম, NID, জন্মতারিখ, মোবাইল, ঠিকানা, Card No ইত্যাদি।

### খ) Employment & Attendance
Branch, Designation, Department, Employment Type (`monthly` / `daily` / `shifting`), Joining Date, Shift, OT Eligible, Standard Work Minutes, Device Code (ফেস টার্মিনাল ব্যবহার করলে)।

### গ) Salary & Payroll

| ঘর | কাজ |
|---|---|
| **Is Payable?** | `Not Payable` হলে কোনো বেতন শিটে আসবে না |
| Basic Salary | পুরোনো শিটের মাসিক মূল বেতন |
| House Rent / Medical Allowance | সংরক্ষিত থাকে; পুরোনো হিসাবে আলাদা পে হয় না, নতুন হিসাবে pay head হলে revision থেকে আসে |
| Others Allowance | পুরোনো মাসিক শিটে **Mobile Bill** কলাম হিসেবে দেখায় |
| Daily Wage | দৈনিক কর্মীর এক দিনের মজুরি |
| OT Rate | ঘণ্টাপ্রতি ওভারটাইম রেট — OT = (OT মিনিট ÷ ৬০) × রেট |
| Loan Deduction / Others Deduction | ঋণ ও অন্যান্য কর্তনের ঘর (শিটের Loan Ded. অবশ্য বাকি ঋণ থেকেই বসে) |
| Salary Sheet Serial Number | শিটে SL/ক্রম; না দিলে Branch ও কর্মীর ক্রমে বসে |

দুটো লুকানো শর্ত: **Active** (status = 1) আর **Manual Attendance** চালু — নইলে Salary Generate-এর তালিকায় আসবে না।

---

## ২. Attendance (HRM → Attendance)

### সেটিংস (একবার)
Attendance Settings: shift, সাপ্তাহিক ছুটির দিন, সরকারি/উৎসবের ছুটি, late/early-out কর্তনের নিয়ম; ফেস টার্মিনাল হলে Attendance Devices।

### প্রতিদিনের এন্ট্রি
- **Manual Attendance** ট্যাব — কর্মী অনুযায়ী তারিখ, in/out, status, OT মিনিট।
- status: `present` / `late` / `early_out` / `half_day` / `leave` / `absent` / `holiday` / `weekly_holiday`
- **Leave Applications** — paid / unpaid ছুটি।
- ডিভাইসের পাঞ্চ এলে **Unmatched Punches** থেকে কর্মীর সঙ্গে মিলিয়ে দিন।

### বেতনে যেভাবে ঢোকে

| হাজিরা | বেতনে গোনা |
|---|---|
| present / late / early_out | ১ দিন (দেরি বা আগে বেরোলেও উপস্থিত) |
| half_day | ০.৫ দিন |
| leave / paid leave / holiday | payable দিন (মাসিক বেতন ভাগ হয় না), কিন্তু per-day খাতে গোনা হয় না |
| unpaid leave / absent | কর্তন (Attendance Deduction) |
| Per-day খাত (Lunch, Mid Day Meal) | শুধু **উপস্থিত দিন** × রেট |

⚠️ Attendance শুধু **যতদিন এন্ট্রি হয়েছে** ততদিন পর্যন্ত গোনা হয় — তাই **মাস শেষে পুরো মাসের এন্ট্রি দিয়ে** তবেই Generate করুন। Per-day খাত থাকলে attendance এন্ট্রি না থাকলে Generate থেমে কর্মচারী ও খাতের নাম জানাবে (০ বা পুরো মাস ধরে নেবে না)।

---

## ৩. Salary Components ও Salary Structures (একবার)

### Salary Components (HRM → Salary Setup → Salary Components)
প্রতিটি খাত একবার তৈরি করুন:
- `Code` (যেমন `lunch_bill`) — Save-এর পর বদলায় না
- Earning / Deduction, Calculation: **Fixed / Percent / Per day / System**
- Per day হলে **Per-day Rate**, রাউন্ডিং, Include in Gross, ক্রম

### Salary Structures (Salary Structures)
কাঠামো = টেমপ্লেট — কোন কোন খাত একটি বেতনে থাকবে (যেমন "Staff", "Worker")। Available pay heads থেকে + করে খাত যোগ করুন; প্রতিটির ডিফল্ট অঙ্ক, prorate, ক্রম ঠিক করুন। মনে রাখুন: কাঠামো বদলালে কারো চলতি বেতন বদলায় না।

---

## ৪. কর্মীর বেতন ঠিক করা (Salary Revision)

Employee → **Edit** → Salary & Payroll ধাপ → নিচের খাত প্যানেল:

1. **Structure** বাছুন (খাতগুলো নেমে আসবে) অথবা Available pay heads থেকে একটি একটি করে যোগ করুন।
2. প্রতিটি খাতে অঙ্ক দিন — **per-day খাতে এক দিনের রেট**।
3. Branch-এ "মোট বেতন ভাগ করবেন?" চালু থাকলে: মোট বেতন লিখে **ভাগ করুন** → খাদ্য/চিকিৎসা/যাতায়াত বাদ দিয়ে Basic, তার % দিয়ে House Rent বসে যায়।
4. **Effective From** = মাস (বেতন সবসময় ওই মাসের ১ তারিখ থেকে), তারপর **Save Revision**।

- নতুন revision আগেরটাকে বন্ধ করে; পুরোনো revision বদলানো যায় না — বাড়াতে/কমাতে নতুন revision দিন।
- নিচের Salary history-তে দেখা যায় কে কোন মাস থেকে কত পেয়েছে।
- Per-day খাতের রেট Monthly Gross-এ যোগ হয় না — Generate-এ উপস্থিত দিন দিয়ে হিসাব হয়।

---

## ৫. Salary Generate (প্রতি মাসে)

HRM → Salary → **Salary Generate**:

1. Branch (+ চাইলে Designation Level), শিটের ধরন **Monthly Salary / Overtime Salary**, **Month** → **Search**।
2. তালিকায় আসে: সক্রিয় + Payable + Manual Attendance চালু, এবং এই/পরের মাসে আগে বেতন হয়নি এমন কর্মী।
   - Monthly শিটে শুধু monthly কর্মী; Overtime শিটে শুধু OT-eligible।
3. মিলিয়ে দেখুন: Basic/Mobile Bill কর্মদিবস অনুযায়ী ভাগ, Attendance Deduction, Loan Ded. (বাকি ঋণ আগে থেকে বসা, বদলানো যায়), Net Salary সঙ্গে সঙ্গে বদলায়।
   - সারি টেনে (drag) ক্রম বদলানো যায়; কাউকে বাদ দিতে Action-এর ট্র্যাশ → নিশ্চিত করুন (শিট তৈরি না হওয়া পর্যন্ত কিছুই মোছেনা)।
4. **Salary Generate** চেপে নিশ্চিত করুন।

Voucher হয় তিন লাইনে: Salary A/C (Dr), Accounts Payable (Cr), Staff Loan (Cr)।

> Branch Settings → Payroll → **"পে-হেড থেকে বেতন?"** চালু থাকলে প্রতিটি খাতের আলাদা কলাম আসে (per-day খাত সহ)। বন্ধ থাকলে পুরোনো শিট — শুধু Basic + Mobile Bill।

---

## ৬. Salary Sheet (HRM → Salary → Salary Sheet)

তৈরি হওয়া শিট থেকে: **Print/PDF** (বাংলা ডিজিটে; per-day খাতে "১৯ দিন × ৫০"), **Update** (পেমেন্ট), **Excel**, আর **Payment**।

শিট ফ্রোজেন: পরে খাতের নাম বা রেট বদলালেও পুরোনো পে-স্লিপ/রিপ্রিন্ট বদলায় না।

---

## ৭. প্রথমবারের চেকলিস্ট

1. Branch Settings-এ Payroll টগল ঠিক করুন (পে-হেড হিসাব চাইলে চালু)।
2. Designation / Department তৈরি করুন।
3. Salary Components-এ দরকারি খাত (per-day হলে রেট সহ)।
4. একটি Structure বানান (অন্তত Basic)।
5. Employee-র তিন ধাপ পূরণ — Payable, Manual Attendance, Serial নিশ্চিত করুন।
6. চলতি মাসের attendance পুরোটা এন্ট্রি করুন।
7. Edit → খাত প্যানেল → Revision → Save।
8. Salary Generate → যাচাই → Generate → Salary Sheet।

---

## ৮. সাধারণ ভুল ও সমাধান

| যা দেখছেন | কারণ | কী করবেন |
|---|---|---|
| কর্মী Generate-এর তালিকায় নেই | Payable/Manual Attendance বন্ধ, daily কর্মী, অন্য Level, বা বেতন আগেই তৈরি | Employee তথ্য ও ফিল্টার মিলিয়ে দেখুন |
| "Attendance has not been summarised yet…" | ওই মাসের attendance এন্ট্রি নেই, কিন্তু per-day খাত আছে | আগে হাজিরা এন্ট্রি/সামারি করুন, তারপর আবার Search |
| "Salary already generated…" | এই/পরের মাসে কারো বেতন আগেই তৈরি | আবার Search করুন; তালিকা থেকে সে বাদ পড়বে |
| Per-day খাতের টাকা অপ্রত্যাশিত | রেট না দিয়ে মাসিক অঙ্ক লেখা হয়েছে | Edit → খাত প্যানেলে এক দিনের রেট দিন, নতুন revision Save |
| Salary Sheet-এ খাতভিত্তিক কলাম নেই | Branch পুরোনো ইঞ্জিনে | Branch Settings → Payroll → "পে-হেড থেকে বেতন?" চালু করুন |
| Effective From-এ তারিখ দেওয়া যায় না | বেতন সবসময় মাসের ১ তারিখ থেকে | শুধু মাস বাছুন |
