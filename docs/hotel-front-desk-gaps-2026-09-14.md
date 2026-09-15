# হোটেল — দৈনন্দিন ফ্রন্ট-ডেস্কে যা লাগে, কিন্তু নেই

**তারিখ:** ২০২৬-০৯-১৪ · **সর্বশেষ হালনাগাদ:** ২০২৬-০৯-১৫ — **পাঁচটিই বানানো** — API `0ed8e12e` (Reseller) · React `63c26793` (Reseller-ui)
**পরিসর:** `cashbook_api` (`app/Http/Controllers/Hotel`, `app/Models/Hotel`),
`cashbookbd_react` (`src/components/modules/hotel`)
**উদ্দেশ্য:** [hotel-resort-booking-spec.md](hotel-resort-booking-spec.md)-এর "যা বাকি"
তালিকা ক্লায়েন্টের উত্তরের অপেক্ষায় থাকা নিয়ম (ভ্যাটের হার, rate plan, cancellation %)
আর বড় ফেজ (events, ticketing) নিয়ে লেখা। এই ফাইলটি অন্য প্রশ্ন করে — **একজন
রিসেপশনিস্ট সকাল থেকে রাত পর্যন্ত যা যা করে, তার কোনটা এই সফটওয়ারে করা যায় না?**
পাঁচটি পেয়েছি। কোনোটিই ক্লায়েন্টের কোনো উত্তরের অপেক্ষায় নেই।

> এই ফাইলটি *পরিকল্পনা*, *সিদ্ধান্ত নয়*। কাজ শেষ হলে সংশ্লিষ্ট অংশে কমিটের হ্যাশসহ ✅
> বসিয়ে দিন, যেভাবে [next-work-2026-08-30.md](next-work-2026-08-30.md) করে।

> **২০২৬-০৯-১৫:** পাঁচটিই বানানো হয়েছে, সুপারিশকৃত ক্রমে। প্রতিটি অংশের নিচে
> "✅ যা বানানো হলো" আছে — কোথায় দলিল থেকে সরে আসা হয়েছে সেটিসহ। স্পেকে **§43**।
> চেক-স্ক্রিপ্ট (সব রোলব্যাক): `hotel_no_show_check.php` (৫৩), `hotel_room_move_check.php`
> (৭০), `hotel_registration_card_check.php` (১৪), `hotel_stay_kind_check.php` (৪১),
> `hotel_guest_profile_check.php` (৩৪)। ডেটাবেস: `patch:add-unit-type` চারটি নতুন ধাপ
> (no_show ENUM, room_checkouts.kind, stay_kind, hotel_guest_notes) — অথবা
> `database/sql/2026_09_15_hotel_*.sql` চারটি ফাইল। নতুন পারমিশন
> `hotel.booking.complimentary` (Hotel গ্রুপ, `--hotel-grant`-এ যায়)। রাউট বদলেছে —
> `route:clear` লাগবে।

---

## ০. যা যাচাই করে দেখা হয়েছে

অনুমান নয় — রুট, মডেল ও কন্ট্রোলারে খুঁজে দেখা:

| দেখা হয়েছে | ফল |
|---|---|
| `routes/api.php`-এর সব `hotel/bookings/*` রুট | store, update, allot, checkout, cancel, folio (charge / discount / receive / receipt / bill / bill-name / bill-paper / transfer), availability, guest, halls, parties — **move / no-show / registration card নেই** |
| `Booking::STATUS_*` (`app/Models/Hotel/Booking.php:150-155`) | hold · confirmed · checked_in · checked_out · cancelled · expired — **no_show নেই** |
| `BookingController::update()`-এর ডক-কমেন্ট (`BookingController.php:1445`) | রুম বদলের বর্তমান পথটি ভুল বিল বানায় — নিচে §১ |
| Housekeeping স্ট্যাটাস | clean · dirty · occupied · **out_of_order আছে** — তাই "রুম বন্ধ রাখা" এই তালিকায় নেই |
| Allotment স্ক্রিন (`AllotmentScreen.tsx:210`) | ফেরত গেস্টের NID খুঁজে আনে — তাই §৫ *খোঁজা* নয়, *ইতিহাস দেখানো* |
| রিপোর্ট (`HotelReports.tsx`) | in-house, arrivals, departures, collection (cash/bank/card/mobile/adjustment), register, performance (occupancy/ADR/RevPAR) |

---

## ১. Room move — মাঝপথে রুম বদল

**ঘটনা:** ১০১-এর AC নষ্ট, গেস্টকে ২০৫-এ সরাতে হবে। রোজকার কাজ।

**এখন যা হয়:** `bookings/update/{id}` দিয়ে ২০৫ যোগ, ১০১ বাদ। কোডের কমেন্টেই লেখা
(`BookingController.php:1445`, আবার `:1698`): এক রাতে ১০১ → ১০২ → ১০৩ করলে গেস্ট
**এক রুমে থেকে তিন রুমের বিল** পায় — কারণ যে রাত বিল হয়ে ভাউচারে চলে গেছে সেটি "unsay"
করা যায় না (§35-এর নিয়ম: বিলকৃত নাইট ফেরত নেওয়া হয় না), আর বাদ দেওয়া রুম একটি
*departure* হিসেবে লেখা হয়, *move* হিসেবে নয়।

**যা বানাতে হবে:** একটি অপারেশন — `bookings/move/{id}` — যা এক লেনদেনে:

1. আজ রাত থেকে বাকি **অবিলকৃত** নাইট পুরনো রুম থেকে নতুন রুমে সরায়
   (`hotel_booking_resource_details`-এর তারিখ-সীমা কাটে — পুরনো রুমের আজ পর্যন্ত, নতুন
   রুমের আজ থেকে);
2. **বিলকৃত** নাইট পুরনো রুমেই থাকে — ভাউচার যেখানে ছিল সেখানেই;
3. নতুন রুমের ভাড়া নতুন রুমের (§2.8 — rent lives on the room); ভাড়া বদলালে স্ক্রিনে
   বলে, আর ভিন্ন হলে *কে অনুমোদন করল* লেখে;
4. পুরনো রুম **dirty**, `booking_room_checkouts`-এ *move* কারণসহ (departure নয় — না হলে
   departures রিপোর্টে গেস্ট "চলে গেছে" দেখাবে অথচ সে ২০৫-এ ঘুমাচ্ছে);
5. ওভারল্যাপ লক নতুন রুমে — যে লক `store` ব্যবহার করে সেটিই (§9)।

**স্ক্রিন:** Bookings তালিকা ও Folio-তে "Move room" — নতুন রুম বাছা, কারণ (ঐচ্ছিক),
`dry_run`-এ ভাড়ার পার্থক্য দেখিয়ে তারপর নিশ্চিত — `update` যেভাবে করে।

**সিদ্ধান্ত দরকার:** নতুন রুমের ভাড়া বেশি হলে *কে* দেবে — গেস্ট (upgrade) না হোটেল
(হোটেলের দোষে সরানো)? সুপারিশ: স্ক্রিনে একটি টগল "Charge new room's rate / Keep old
rate", ডিফল্ট *keep old* — হোটেলের সমস্যায় গেস্টের ভাড়া বাড়ে না।

**আকার:** মাঝারি — API ২ দিন, স্ক্রিন ১ দিন, চেক-স্ক্রিপ্ট আধা দিন।

### ✅ যা বানানো হলো (২০২৬-০৯-১৫)

`GET/POST bookings/move/{id}` (`BookingController::moveOptions` / `move`, পারমিশন
`hotel.booking.view`)। GET বলে কোন রুমে কী আছে আর কোন রুমে যাওয়া যায় (বাকি প্রতিটি রাতে
কোনো বেড বিক্রি হয়নি, whole-let, out-of-order নয়, হাউসকিপিং স্ট্যাটাসসহ)। POST এক
লেনদেনে: তারিখ থেকে নাইট নতুন রুমে (বেডপ্রতি এক সারি, ভাড়া প্রথম বেডে); গেস্ট রুমের সাথে
যায়; checked_in হলে পুরনো রুম dirty আর `hotel_booking_room_checkouts`-এ **`kind = 'move'`**,
`moved_to_resource_id` সহ (নতুন দুটি কলাম) — departures রিপোর্ট move বাদ দেয়; ইতিহাসে এক
সারি (status অপরিবর্তিত)। `dry_run` লেখে না।

**দলিল থেকে যেখানে সরা হয়েছে:** "বিলকৃত নাইট পুরনো রুমেই থাকে" — না, বিলকৃত নাইটের
*inventory সারি* নতুন রুমে যায় (নইলে ২০৫ availability-তে ফাঁকা দেখাত), আর ফোলিও লাইনের
টাকা, ভাউচার, VAT যা ছিল তা-ই থাকে; শুধু লাইনের `resource_id` নতুন রুমে re-point হয় আর
description-এ "→ MB / 205" যোগ হয়। না হলে `unbilledNights()` একই রাত নতুন রুমের নামে
আবার বিল করত — চেক-স্ক্রিপ্ট ঠিক এটিই ধরে। **ভাড়া:** `keep_rate` (ডিফল্ট true) পুরনো ভাড়া
রাখে; false দিলে নতুন রুমের ভাড়া — কিন্তু বিলকৃত নাইটে false **প্রত্যাখ্যাত** (পোস্টেড লাইন
re-price হয় না; ছাড় বা চার্জ ফোলিওতে হাতে)। কে ঠিক করল ইতিহাসে লেখা। ডরমিটরির বেড আর
হল সরানো যায় না (booking form)। স্ক্রিন: `MoveRoomDialog.tsx` — Bookings তালিকায় "Move"
আর Folio-তে "Move room", একই ডায়ালগ, তিন প্রশ্ন + সার্ভারের dry-run preview।

---

## ২. No-show

**ঘটনা:** অ্যাডভান্স দিয়ে confirmed করা গেস্ট আসেনি। চেক-ইনের রাত পেরিয়ে গেছে।

**এখন যা হয়:** বুকিং `confirmed`-এই বসে থাকে, রুম আটকে — `hotel:expire-holds` কেবল
`hold` মেয়াদোত্তীর্ণ করে, confirmed-কে ছোঁয় না (ঠিকই, অ্যাডভান্স দেওয়া বুকিং আপনাআপনি
মরে না)। রিসেপশন হাতে `cancel` করে — এবং তাতে "গেস্ট আসেনি" কথাটি ইতিহাস থেকে
মুছে যায়: cancellation আর no-show এক নয়। একটি গেস্ট আগেই জানিয়ে বাতিল করেছে, অন্যটি
রুম ফাঁকা রেখে গেছে — occupancy রিপোর্ট, ফেরত গেস্টের ভরসা, আর অ্যাডভান্স রাখার
অধিকার — তিনটিই আলাদা।

**যা বানাতে হবে:**

1. `Booking::STATUS_NO_SHOW = 'no_show'` — `booking_status_logs`-এ যায়, বাকি
   স্ট্যাটাসের মতো;
2. `bookings/no-show/{id}` — শর্ত: `confirmed`, চেক-ইনের তারিখ পেরিয়েছে, কেউ allot হয়নি;
   রুম ছেড়ে দেয়, রুম dirty **করে না** (কেউ ঢোকেনি);
3. অ্যাডভান্সের গতি: **রিসেপশন বাছে** — *রাখা* (ফোলিওতে "No-show charge" লাইন,
   অ্যাডভান্সের সমান, বিল শূন্যে মেলে) না *ফেরত* (§6.2-এর cancellation-এর পথ, যা আছে)।
   Cancellation %-এর নিয়ম ক্লায়েন্ট দেয়নি, তাই *স্বয়ংক্রিয় নয়* — কিন্তু স্ট্যাটাসটি
   নিয়মের অপেক্ষায় থাকে না;
4. Bookings তালিকায় ফিল্টার ও রঙ; performance রিপোর্টে no-show গোনা (দিনে কয়টি,
   হারানো রাত)।

**স্ক্রিন:** Bookings তালিকায় ঐ শর্ত মিললে "Mark no-show" — এক ডায়ালগ: অ্যাডভান্স
রাখব/ফেরত, নোট।

**সিদ্ধান্ত দরকার:** কিছু না — নিয়ম না থাকায় রিসেপশনের হাতে; নিয়ম এলে ডিফল্ট বসবে।

**আকার:** ছোট — এক দিন।

### ✅ যা বানানো হলো (২০২৬-০৯-১৫)

`Booking::STATUS_NO_SHOW`, `hotel_booking_master.status` ENUM-এ `no_show`;
`Booking::DEAD_STATUSES` (cancelled · expired · no_show) — সাতটি জায়গায় হাতে লেখা
`[cancelled, expired]` তালিকার বদলে, আর `howItEnded()` যাতে প্রত্যাখ্যান "cancelled" না
বলে। `POST bookings/no-show/{id}` (পারমিশন `hotel.booking.cancel`; ডায়ালগ টাকার তথ্য
`bookings/cancellation/{id}` থেকেই পড়ে)। শর্ত: confirmed, চেক-ইনের **রাত** পেরিয়েছে (আজ >
check-in), কোনো গেস্ট রেকর্ড নেই, বিল হয়নি; walk-in নয়।

**দলিল থেকে যেখানে সরা হয়েছে:** "ফোলিওতে No-show charge লাইন" — না। ফোলিও লাইনে VAT
আসে (চার্জ টাইপের হার), আর no-show চার্জে VAT বসবে কি না ক্লায়েন্ট বলেনি; তাছাড়া
cancellation-এর retention পথ (`Dr Advance / Cr Cancellation Charge`) আগে থেকেই আছে ও
পরীক্ষিত। তাই টাকা `hotel_booking_cancellations`-এই যায় — reason-এ "No-show." prefix,
ভাউচার narration "No-show charge retained"; বুকিংয়ের status-ই বলে কোনটা। **ডিফল্ট উল্টো:**
Cancel-এ refund বাক্স পুরো টাকায় শুরু, No-show-এ অ্যাডভান্স **রাখা** হয়, ফেরত দিলে অঙ্ক
টাইপ করতে হয় (রেডিও)। Performance রিপোর্টে `no_shows` আর `no_show_room_nights`
(nights × stated_rooms, arrival-তারিখে কাটা) — নাইট মুছে যায় বলে বুকিং থেকেই গোনা।
`guestByMobile`-এর stays-এ no-show গোনে না। তালিকায় কমলা চিপ, ফিল্টার, "No-show" লিংক
শর্ত মিললে।

---

## ৩. Registration card — চেক-ইনে গেস্টের সই করা কাগজ

**ঘটনা:** চেক-ইনে গেস্ট একটি কার্ডে সই করে — নাম, NID/পাসপোর্ট, ঠিকানা, রুম, ভাড়া,
প্রত্যাশিত চেক-আউট, "হোটেলের নিয়ম মেনে নিলাম"।

**এখন যা হয়:** পুলিশ রেজিস্টার (`reports/register`, `RegisterPrint.tsx`) আছে — সেটি
*হোটেল* লেখে, পুলিশ পড়ে। গেস্ট *যেটাতে সই করে* সেটি নেই। ভাড়া বা চেক-আউট তারিখ নিয়ে
বিবাদ হলে এই কাগজটিই প্রমাণ — না থাকলে ম্যানেজারের কথার বিপরীতে গেস্টের কথা।

**যা বানাতে হবে:** `bookings/allotment/{id}/card` — allotment-এর সব তথ্য একই আছে, নতুন
টেবিল নেই। প্রিন্ট: A5 বা A4-অর্ধেক, ব্রাঞ্চের হেডার (§27-এর bill-paper যেভাবে নেয়),
গেস্টপ্রতি এক কার্ড (ডরমিটরিতে সিটপ্রতি), নিচে দুটি সইয়ের লাইন। শর্তাবলি: `metas`-এ
ব্রাঞ্চপ্রতি এক টেক্সট — বাংলা/ইংরেজি যেটা ব্রাঞ্চ লিখবে।

**স্ক্রিন:** Allotment সেভ হওয়ার পর "Print registration card" — Folio-র "Print bill" যে
প্যাটার্নে, সেই প্যাটার্নে।

**সিদ্ধান্ত দরকার:** কিছু না।

**আকার:** ছোট — আধা দিন।

### ✅ যা বানানো হলো (২০২৬-০৯-১৫)

`GET bookings/allotment/{id}/card` (`BookingController::registrationCard`, পারমিশন
`hotel.booking.allot`) — গেস্টপ্রতি এক কার্ড: নাম, NID, মোবাইল, ঠিকানা, রুম, **যে ভাড়ায়
রুম দেওয়া হয়েছিল** (নাইট সারি থেকে, আজকের ট্যারিফ নয়), তারিখ ও চেক-ইন/আউটের সময়,
ব্রাঞ্চ হেডার, শর্তাবলি। কেউ চেক-ইন না হলে প্রত্যাখ্যান। শর্তাবলি: `metas.hotel_registration_terms`
— Branch ফর্মের Hotel Setup ধাপে "Registration card terms" textarea (BranchController
read/write)। প্রিন্ট: `RegistrationCardPrint.tsx` — print designer-এ নয় (register-এর মতো:
NID লাইন টেনে ফেলে দেওয়া কার্ড কার্ড নয়), **A4-এ দুটি কার্ড** (আধা পাতা করে), দুটি সইয়ের
লাইন। Allotment স্ক্রিনে "Print registration cards" (arrived > 0 হলে), Folio-র
react-to-print প্যাটার্নে। Complimentary হলে ভাড়ার জায়গায় "not charged"।

---

## ৪. Complimentary / House-use — বিনামূল্যে থাকা

**ঘটনা:** মালিকের অতিথি, পরিদর্শক কর্মকর্তা, বা রাতের শিফটের স্টাফ রুমে থাকে — বিল
নেই।

**এখন যা হয়:** দুটো ভুল পথ। (ক) শূন্য ভাড়ায় বুকিং — occupancy ঠিক, কিন্তু ADR ও RevPAR
নেমে যায়, রিপোর্ট বলে "রুম সস্তায় বিক্রি হয়েছে"। (খ) বুকিং না করেই চাবি দেওয়া — ADR
ঠিক, কিন্তু রুম availability-তে *ফাঁকা* দেখায়, হাউসকিপিং জানে না, পুলিশ রেজিস্টারে গেস্ট
নেই। দ্বিতীয়টি প্রায়ই ঘটে, এবং ডাবল-বুকিং সেখান থেকেই।

**যা বানাতে হবে:** `hotel_booking_master.stay_kind` — `paid` (ডিফল্ট) · `complimentary`
· `house_use`। নিয়ম:

- complimentary / house_use-এ ভাড়ার লাইন **পোস্ট হয় না** (ভাউচার নেই, ভ্যাট নেই —
  বিক্রি হয়নি); অন্য চার্জ (খাবার, লন্ড্রি) স্বাভাবিক;
- performance রিপোর্ট: occupancy-তে **গোনে**, ADR ও RevPAR-এ **গোনে না** — শিল্পের
  প্রথা, এবং না মানলে দুই মাসের রিপোর্ট তুলনা করা যায় না;
- কে অনুমোদন করল লেখা হয় (`approved_by`) — বিনামূল্যের রুম হলো নগদ ছাড়ের সমান,
  অনুমোদন ছাড়া নয়;
- Bookings তালিকা ও ক্যালেন্ডারে আলাদা রঙ।

**স্ক্রিন:** Booking form-এ একটি ড্রপডাউন, `paid` বাছা থাকে; complimentary বাছলে ভাড়ার
ঘর ধূসর হয়ে "not charged" বলে।

**সিদ্ধান্ত দরকার:** এর জন্য আলাদা **পারমিশন** থাকবে কি (`hotel.booking.complimentary`)?
সুপারিশ: হ্যাঁ — রিসেপশনিস্ট বিনামূল্যে রুম দিতে পারবে না, ম্যানেজার পারবে।

**আকার:** ছোট — এক দিন।

### ✅ যা বানানো হলো (২০২৬-০৯-১৫)

`hotel_booking_master.stay_kind` ENUM(paid · complimentary · house_use) + `stay_kind_reason`
+ `stay_kind_by`; `Booking::isCharged()`। পারমিশন **`hotel.booking.complimentary`**
(সুপারিশ মেনে) — store/update-এ paid ছাড়া অন্য কিছু দিলে লাগে, আর **কারণ বাধ্যতামূলক**
(ছাড়ের নিয়মই)। বিল হওয়ার পর kind বদলানো প্রত্যাখ্যাত (দুই দিকেই)। ভাড়ার লাইন কখনো বিল
হয় না — এক জায়গায়: `FolioBilling::unbilledNights()` unpaid stay-তে খালি ফেরায়, তাই "Bill
the nights", check-out আর night audit তিনটিই একসাথে বাদ; folio bill বোতাম বলে কেন। নাইট
সারিতে ট্যারিফ থাকে (রুমটা কত হতে পারত)। Performance: SQL-এ `stay_kind = 'paid'` শর্তে
revenue ও ADR-এর ভাজক, occupancy সবটাই — মাস, দিন, রুম-টাইপ তিন টেবিলেই এক নিয়ম;
`free_room_nights` আলাদা লাইনে। Booking form-এ "Stay" ড্রপডাউন (পারমিশন থাকলে; না থাকলে
শুধু দেখায়), কারণের ঘর, মোট ভাড়া কাটা + "not charged"। তালিকায় ও Folio-তে চিহ্ন,
ক্যালেন্ডারে রিং, বিল কাগজে `stay_kind` ফিল্ড।

---

## ৫. Guest profile — এক গেস্টের সব থাকা

**ঘটনা:** "এই গেস্ট আগেও এসেছেন?" — ফোনে বুকিং নেওয়ার সময়, বা চেক-ইনে।

**এখন যা হয়:** Allotment-এ NID দিলে আগের নাম-ঠিকানা এসে যায় (`AllotmentScreen.tsx:210`)
— *খোঁজা* আছে। কিন্তু "কবে কবে ছিল, কোন রুমে, মোট কত দিয়েছে, কিছু বাকি রেখে গেছে কি,
আগে no-show করেছে কি" — এক পাতায় নেই। একটি গেস্ট যে তিনবার এসে তিনবারই ছাড় চেয়েছে,
সেটা রিসেপশনিস্টের স্মৃতিতে থাকে, সফটওয়ারে নয়।

**যা বানাতে হবে:** নতুন টেবিল **নেই**। `hotel_booking_guests`-কে NID/পাসপোর্ট (আর
সেটা না থাকলে মোবাইল) ধরে জোড়া দিলেই ইতিহাস — `bookings/guest/{key}/history`: থাকার
তালিকা (তারিখ, রুম, রাত, বিল, দেওয়া, বাকি, স্ট্যাটাস), মোট, শেষ থাকা, no-show সংখ্যা
(§২ হলে)। একটি নোট-ঘর — "পূর্ব দিকের রুম চান", "শব্দে অসুবিধা" — `metas`-এ নয়,
একটি ছোট `hotel_guest_notes` টেবিল (key, note, কে লিখল, কখন), কারণ নোট গেস্টের,
বুকিংয়ের নয়।

**স্ক্রিন:** Bookings তালিকা ও Allotment-এ গেস্টের নামে ক্লিক → ড্রয়ার/পাতা। Booking
form-এ returning গেস্ট মিললে "3 stays · last 12/08/2026 · owes 0" এক লাইনে।

**সিদ্ধান্ত দরকার:** গেস্ট-কি কী — NID একমাত্র, না NID *অথবা* মোবাইল? সুপারিশ: NID
থাকলে NID, না থাকলে মোবাইল — দেশি গেস্টের NID প্রায় সবসময় থাকে, বিদেশির পাসপোর্ট।
দুটো একই গেস্টের দুই রেকর্ড হয়ে গেলে একত্র করার (merge) বোতাম *পরে*, দরকার হলে।

**আকার:** মাঝারি — API এক দিন, স্ক্রিন এক দিন।

### ✅ যা বানানো হলো (২০২৬-০৯-১৫)

নতুন `GuestProfileController`: `GET bookings/guest/history?national_id=&mobile=`
(পারমিশন `hotel.booking.view`)। **গেস্ট-কি:** সুপারিশ মেনে NID থাকলে NID, না থাকলে মোবাইল
— দুটোই খোঁজা হয়: NID-এর সারিগুলোর সব মোবাইল, সেই মোবাইলের সব সারি, **আর সেই মোবাইল যে
বুকিং টেলিফোনে করেছে** (no-show কোনো রুমে নাম হয়নি — booker_mobile-ই একমাত্র সূত্র)।
প্রতি বুকিং: তারিখ, রাত, রুম, status, stay_kind, billed/paid/due (`totalsFor` +
`paidOn` — দ্বিতীয় হিসাব নয়), `carried` (পার্টিতে গেলে সেটি কোম্পানির দেনা, গেস্টের নয়),
retained। মোট: stays (আসলে থেকেছে), no_shows, cancelled, upcoming, billed, paid, due
(in-house বা checked_out non-carried), last/first stay। গেস্টের বিবরণ **ঘরপ্রতি সর্বশেষ
অ-শূন্য মান** (এবার ঠিকানা না লিখলে আগেরটা থাকে)। নোট: `hotel_guest_notes` (company_id,
key_kind nid|mobile, guest_key ডিজিটে, note, created_by) — append-only, মুছে নতুন লেখা;
`POST bookings/guest/notes/store|delete/{id}`। `guestByMobile`-এ `no_shows` ও `owed`।
স্ক্রিন: `GuestProfileDrawer.tsx` — ডান দিকের ড্রয়ার; Bookings তালিকায় booker-এর নাম,
Allotment-এ রেকর্ড করা গেস্টের নাম, Booking form-এর returning লাইনে "N no-shows · Owes X ·
History"। Merge বোতাম পরে, দরকার হলে।

---

## ৬. যেগুলো ঠিকই আছে — তাই এখানে নেই

খোঁজার সময় এগুলোও দেখা হয়েছে; আছে, কাজ করে:

| | কোথায় |
|---|---|
| থাকা বাড়ানো (extend) | `bookings/update` — বিলকৃত নাইট ছুঁয় না, বাকি সব বদলায় |
| এক রুম আগে চলে যাওয়া (partial check-out) | স্পেক §35 |
| রুম বন্ধ রাখা (out of order) | Housekeeping board |
| একাধিক রুম এক বুকিংয়ে (group) | Booking form |
| বিল অন্যের নামে সরানো (bill transfer) | `bookings/bill/{id}/transfer`, §6.4 |
| বিলে অন্য নাম (employee → employer) | §40, `bill_name` |
| ছাড় | `bookings/folio/{id}/discount`, §37 |
| ফেরত গেস্টের NID খোঁজা | Allotment |
| হল/সিটিং বুকিং | `HallBookingScreen`, §36 |
| Walk-in | Booking form — hold ছাড়া সরাসরি confirmed |

---

## ৭. ক্রম — সুপারিশ

| ক্রম | কাজ | কেন এই জায়গায় |
|---|---|---|
| ১ | **§২ No-show** | সবচেয়ে ছোট; রিপোর্টের সততার প্রশ্ন; §৫-এর "no-show সংখ্যা" এর উপর দাঁড়ায় |
| ২ | **§১ Room move** | রোজ ঘটে, এখন *ভুল বিল* বানায় — এই তালিকার একমাত্র সক্রিয় ক্ষতি |
| ৩ | **§৩ Registration card** | আধা দিন, প্রমাণপত্র |
| ৪ | **§৪ Complimentary** | ছোট; ADR/RevPAR-এর সততা (§38) |
| ৫ | **§৫ Guest profile** | সবচেয়ে বড়; বাকিগুলোর তথ্য জমলে তবেই দেখানোর মতো ইতিহাস হবে |

এই পাঁচটির পরে স্পেকের বড় ফেজ — **Events ও Catering (phase 6)**, তারপর Ticketing।
ওগুলো এখানে নেই কারণ ওগুলো *নতুন ব্যবসা* যোগ করে; এই পাঁচটি *যে ব্যবসা চলছে* তার ফাঁক।

**ক্লায়েন্টের উত্তরের অপেক্ষায় থাকা নিয়ম — অপরিবর্তিত:** ভ্যাট ও সার্ভিস চার্জের হার (§6.3),
rate plan (§6.2, §32), early check-in / late check-out চার্জ, cancellation %, §6.1-এর
gender rule, child age (OPEN-13), Mushak 6.3 / EFD (OPEN-6)। §২-এর no-show charge
cancellation %-এর নিয়ম এলে তার ডিফল্ট পাবে; তার আগে রিসেপশনের হাতে।
