# ppdhotelmoteldb — Chart of Accounts: Excel শীট বনাম ডাটাবেস

তারিখ: 2026-11-03 · শুধু বিশ্লেষণ, DB-তে কিছু বদলানো হয়নি।
উৎস: `C:\Users\lutfo\OneDrive\Desktop\Chart of Accounts.xlsx` (৬১ লাইন) এবং
`ppdhotelmoteldb` (একটাই ব্রাঞ্চ: *PPD Motel & Convention Center*)।

---

## ০. আগে যা জানা দরকার (সংক্ষেপে)

| বিষয় | অবস্থা |
|---|---|
| DB-তে মোট Level-4 খাত | **168** |
| লেনদেন হয়েছে এমন খাত | মাত্র **9টা** (40টা ভাউচার, 2026-10-25 থেকে 2026-11-05) |
| DB-র খাতগুলো কোথা থেকে এসেছে | অন্য ক্লায়েন্টের টেমপ্লেট থেকে কপি করা। তাই Demo/Sample নামের পার্টি, KB Real Estate বা Talukder Tiles-এর Inter-Branch হিসাব, জমি রেজিস্ট্রেশন খরচ ইত্যাদি আছে। |
| এর মানে | লেনদেন প্রায় নেই, তাই এখনই খাত গোছানোর **সবচেয়ে ভালো সময়**। |

লেনদেন আছে এমন ৯টা খাত (এগুলোর **id বদলানো বা মোছা যাবে না**):

| id | নাম | লাইন | ডেবিট | ক্রেডিট |
|---|---|---|---|---|
| 17 | Cash | 7 | 33,278.00 | 0 |
| 333 | Room Rent Income | 29 | 0 | 60,803.25 |
| 336 | Advance Against Booking | 39 | 86,990.00 | 36,088.00 |
| 337 | VAT Payable | 29 | 0 | 18,527.48 |
| 341 | Bill Rounding | 6 | 0 | 2.75 |
| 342 | Hall Rent Income | 2 | 0 | 6,956.52 |
| 343 | Hotel Discount Allowed | 2 | 1,200.00 | 700.00 |
| 409 | Surovi NGO | 2 | 1,610.00 | 1,610.00 |
| 410 | UDP Office | 1 | 1,610.00 | 0 |

---

## ১. যে নিয়মগুলো ভাঙলে সফটওয়্যার ভেঙে যাবে

1. **কোডে সরাসরি লেখা Level-4 id।** এই id-গুলো মোছা, অন্য খাতে মার্জ করা বা অন্য
   Level-3-এ সরানো চলবে না। শুধু নাম বদলানো চলে।
   `5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 35, 38, 39, 40, 41, 42, 46, 50, 58, 148, 197, 198`
   (17 = Cash, কোডে ১১৪ বার আছে; 23 = Sales Discount; 40 = Purchase Discount; 42 = Service Charge;
   14 = Capital; 18/21 = Opening/Closing Stock)
2. **`sku_code` marker থাকা খাত।** কোড এগুলো marker দিয়ে খোঁজে, নাম দিয়ে নয়। তাই নাম বদলানো
   নিরাপদ, কিন্তু marker মুছলে বা খাত মুছলে Hotel বিল আটকে যাবে:
   `HOTEL_ROOM_RENT_INCOME (333), HOTEL_SERVICE_CHARGE (334), HOTEL_ADVANCE_BOOKING (336),
   HOTEL_VAT_PAYABLE (337), HOTEL_OTHER_INCOME (339), HOTEL_CANCELLATION_CHARGE (340),
   HOTEL_ROUNDING (341), HOTEL_HALL_RENT_INCOME (342), HOTEL_DISCOUNT_ALLOWED (343),
   RETAINED_EARNINGS (354), GOODS_TRF_IN/OUT (331/332)`
3. **Level-3-এর `acc_source_id` ঠিক করে দেয় খাতটা কী আচরণ করবে।** `7` হলে খাতটা Cash হিসেবে গণ্য হয়,
   `8` হলে Bank, `9` Receivable, `10` Payable, `11` Inventory, আর `12` সাধারণ খাত।
   Hotel-এ টাকা নেওয়ার সময় যে Cash/Bank তালিকা দেখায়, সেটা source 7 আর 8 থেকে আসে। Bank-এর
   dropdown আসে শুধু source 8 থেকে। **তাই ব্যাংক হিসাবগুলো অবশ্যই source 8 আছে এমন Level-3-এর নিচে বসাতে হবে।**
4. **`acc_reporting_to_id`** ঠিক করে খাতটা কোন রিপোর্টে যাবে: `2` = P&L, `3` = Balance Sheet।
   আয় আর খরচের নতুন খাতে 2 দিতে হবে, সম্পদ আর দায়ের খাতে 3।
5. Level-3-এর `status` কলামটা `enum('0','1')`। এতে সংখ্যা `1` লিখলে আসলে `'0'` জমা হয়, অর্থাৎ খাত বন্ধ হয়ে যায়।
   নিচে §২-এর ক নম্বরে দেখুন।

---

## ২. DB-তে যে ভুলগুলো আগে থেকেই আছে (শীট নির্বিশেষে ঠিক করা দরকার)

### ক) UI থেকে বানানো Level-3 খাতগুলো বন্ধ অবস্থায় সেভ হচ্ছে, আর ভুল source পাচ্ছে
নিচের ৫টা Level-3 user 8 বানিয়েছেন। সবগুলোর `status='0'` (বন্ধ) আর `acc_source_id=7` (**Cash**):

| L3 id | নাম | status | source |
|---|---|---|---|
| 49 | Food Management A/c | '0' | 7 (Cash!) |
| 50 | Room Rent (AC) | '0' | 7 |
| 51 | Room Rent (Non AC) | '0' | 7 |
| 52 | Fuel & Lubricate | '0' | 7 |
| 54 | Washing & Cleaning A/c | '0' | 7 |

- কারণ সম্ভবত `Coal3Controller.php:137` লাইনে `$coal3->status = 1;`। এখানে সংখ্যা 1 enum-এর
  index হিসেবে গণ্য হয়, তাই `'0'` জমা হয়। একই ফাইলের 119, 149 আর 186 লাইনেও সংখ্যা দিয়ে তুলনা করা হয়েছে।
- **সবচেয়ে বিপজ্জনক অংশ:** L4 366 *Food Management A/c* আর 367 *Washing & Cleaning A/c* এখন
  **Cash-এর গোষ্ঠীতে** পড়ে আছে। তাই Hotel-এ টাকা নেওয়ার তালিকায় এগুলো "cash till" হিসেবে আসতে পারে,
  আর Cash Book-এ খরচের বদলে নগদ হিসেবে দেখাতে পারে।
- **যা করতে হবে:** এই ৫টা L3-তে `status='1'` দিতে হবে আর source `12` (General) করতে হবে। কোডের বাগটাও
  ঠিক করতে হবে, নইলে পরের খাতও একইভাবে নষ্ট হবে।

### খ) Asset Category-র দুটো সারি ভুল খাতে যুক্ত
| Category | asset খাত | accum dep খাত | dep expense খাত | disposal খাত |
|---|---|---|---|---|
| 4 Land | **12 Account Receivable** ✗ | **349 Acc. Dep. Vehicles** ✗ | – | 345 ✓ |
| 5 Building | **325 Abdur Rahim (Loan)** ✗ | **309 Abdul Khaleque (Investor)** ✗ | **131 Advertisement** ✗ | **5 Labour Bill** ✗ |

এই category দিয়ে সম্পদ কেনা হলে টাকা কোনো পার্টির লোন খাতে পোস্ট হবে। নতুন Building খাত বানানোর পর
(§৩) এই সারিগুলো ঠিক করতে হবে। Land-এর জন্য depreciation খাত লাগে না, তাই সেই ঘর খালিই থাকবে।

### গ) টেমপ্লেট থেকে আসা অপ্রয়োজনীয় খাত (কোনোটাতে লেনদেন নেই)
- Account Receivable-এর নিচে ৩২টা Demo/Sample customer (310–404)। শুধু 409 Surovi NGO আর 410 UDP Office আসল।
- Account Payable-এর নিচে ২০টা Demo/Sample supplier (301–408)। *Mizan Meat House* (353) আসল কিনা মালিকের কাছে জানতে হবে।
- Directors Equity-র নিচে পাঁচজনের নামে Capital খাত (300–305, 328)।
- Advance (L3 15)-এর নিচে Investor/Loan খাত (307–326)।
- Inter-Branch-এর ৬টা খাত (330–398), যেগুলোর নামে অন্য প্রতিষ্ঠান। এই DB-তে ব্রাঞ্চ মাত্র একটা।
- Bank 384 *Bank - ABC Electronics (Demo)*।
- Office Others Expense-এর ৩০টা খাতের মধ্যে Mutation/Khajna, Land Registration, Building Design,
  Cement Unloading-এর মতো হোটেলের সাথে সম্পর্কহীন খাত।

এগুলোর অনেকগুলো `cust_party_infos` টেবিলেও আছে (মোট ৬৫টা পার্টি)। তাই খাত মোছার আগে পার্টিগুলোও
সরাতে হবে। **মোছার চেয়ে বন্ধ করা (status 0) নিরাপদ।**

### ঘ) একই নামে দুটো খাত
- `Staff Loan` নামে দুটো খাত আছে (39 আর 99), একই L3-র নিচে। 39 কোডে সরাসরি লেখা, তাই 99 বন্ধ করতে হবে।
- `Service Charge` দুটো: 42 (কোডে লেখা, সাধারণ বিক্রয়ের) আর 334 (Hotel-এর, marker দেওয়া)। Hotel 334 ব্যবহার করে।

---

## ৩. শীট অনুযায়ী লাইন ধরে মিলান

চিহ্ন: ✓ মিলেছে · ✎ নাম বদলাতে হবে · ➕ নতুন খাত বানাতে হবে · ? মালিকের সিদ্ধান্ত লাগবে

### Level-1 / Level-2 (শুধু নাম বদলাতে হবে, id একই থাকবে)
| শীট | DB (id) | করণীয় |
|---|---|---|
| Asset | 1 Assets | ✎ চাইলে বদলানো যায় |
| Liability | 2 Liabilities | ✎ চাইলে বদলানো যায় |
| Income / Expense | 3 / 4 | ✓ |
| Current Asset | L2 1 Current Assets | ✓ |
| Fixed Asset | L2 2 | ✓ |
| Capital | L2 5 Capital **এবং** L2 14 Capital Account | ? আসল Capital খাত (14) L2 14-এর নিচে আছে, L2 5 খালি। দুটোর একটা রাখতে হবে। |
| Current Liability | L2 3 | ✓ |
| Operating Income | L2 6 Direct Income | ✎ |
| Non Operating Income | L2 7 Indirect Income | ✎ |
| Operating Expense | L2 8 Direct Expense | ✎ |
| Overhead Expense | L2 13 Administrative & General Expenses | ✎ |
| Other Expense | L2 10 Others Expense (খালি) | ✎ |
| *(শীটে নেই)* | L2 9 Indirect Expense, 11 Remittence, 12 Loans & Advances, 4 Long term Liability, L1 5 Manufacturing | এগুলো রেখে দিতে হবে, কারণ সিস্টেমের খাত এগুলোর নিচে আছে। শুধু রিপোর্টে খালি দেখাবে। |

### Asset → Current Asset
| শীটের Level-4 | DB-তে যা আছে | করণীয় |
|---|---|---|
| Loan Realized General Fund | নেই | ➕ ? নামের মানে স্পষ্ট নয় (General Fund থেকে পাওনা?) |
| FDR A/c | নেই | ➕ নতুন L3 "FDR A/c" (source 12) |
| FDR Receivalbe A/c | নেই | ➕ (বানান ঠিক করতে হবে: *Receivable*) |
| A/c Receivable | 12 Account Receivable (L3 3) | ✓ (Demo পার্টিগুলো §২-গ অনুযায়ী) |
| Advance Paid to Staff | 39 Staff Loan (L3 35) | ✎ 39-এর নাম বদলানো যায়। 99 বন্ধ করতে হবে। |
| Advance Realized to CSF | নেই | ➕ ? CSF কী, জানতে হবে |
| Cash in Hand | **17 Cash** | ✎ শুধু নাম বদলানো যায়। id 17 কোডে লেখা। |
| Balance at Sonali 1457 | নেই | ➕ L3 2 *Bank Account* (source 8)-এর নিচে |
| Balance at IBBL 4587655 | নেই | ➕ একই |
| Balance at DBBL 45555 | নেই | ➕ একই |
| Balance at Premier 4584 | নেই | ➕ একই |
| Balance at Dhaka 12544 | নেই | ➕ একই |
| *(শীটে নেই)* | 306 Social Islami Bank (0225): cheque register-এ ৬টা, unit sale payment-এ ২টা লাইন | ? আসল ব্যাংক হলে রাখতে হবে, না হলে বন্ধ |
| *(শীটে নেই)* | 20 Row Materials Inventory, 240 Somity Kisty, 58 Remittance | 58 কোডে লেখা, তাই রেখে দিতে হবে। বাকিগুলো বন্ধ করা যায়। |

L3 2-এর নাম চাইলে "Balance at Bank" করা যায়। source 8 অবশ্যই থাকতে হবে।

### Asset → Fixed Asset
শীটে প্রতিটা সম্পদ আলাদা L3। DB-তে সব সম্পদ একটা L3 **45 Fixed Assets**-এর নিচে, আর সব accumulated
depreciation একটা L3 **46**-এর নিচে। **পরামর্শ: DB-র গঠনই রাখা।** Asset module খাত বাছে category দিয়ে
(L4 id ধরে), তাই রিপোর্টে L4-এর নাম শীটের মতো থাকলেই যথেষ্ট। শীটের মতো আলাদা L3 চাইলে ১২টা নতুন L3 লাগবে।

| শীট | DB | করণীয় |
|---|---|---|
| Electric Equipment | নেই | ➕ L4 + Acc. Dep L4 + নতুন asset category |
| Furniture & Fixture | 346 (+ acc dep 347) | ✓ category 1 আছে |
| Office Equipment | 350 (+ acc dep 351 "…Equipment") | ✓ / ✎ 351-এর নাম বদলাতে হবে। category 3-এর নাম "Computers & Equipment"। |
| Building A/c (Land & Building) | নেই | ➕ L4 + acc dep + category 5 ঠিক করতে হবে (§২-খ) |
| Accomodation Element | নেই | ➕ (বানান: *Accommodation*) + category |
| Crockeries A/c | নেই | ➕ + category |
| ৬টা Acc Depriciaion … | ২টা মিলেছে (347, 351) | ➕ বাকি ৪টা (বানান: *Depreciation*) |
| *(শীটে নেই)* | 348 Vehicles / 349, 352 Capital Work in Progress (`asset_cwip_works`-এ ব্যবহার হয়) | ? গাড়ি না থাকলে বন্ধ করা যায়। 352 রেখে দিতে হবে। |

**শীটে Depreciation-এর খরচের খাত নেই।** DB-র 344 *Depreciation* খাতটা রাখতে হবে, নইলে accumulated
depreciation-এর বিপরীতে খরচ লেখার কোনো খাত থাকবে না।

### Liability
| শীট | DB | করণীয় |
|---|---|---|
| Capital | 14 Capital Accounts (L2 14 → L3 27) | ✎ নাম "Capital" করা যায়। id 14 কোডে লেখা। ব্যক্তির নামের খাতগুলো বন্ধ। |
| Loan from General Fund | নেই | ➕ L3 30 *Current Liability*-এর নিচে (Asset দিকের "Loan Realized General Fund"-এর জোড়া মনে হচ্ছে) |
| Advance A/c | 336 Advance Against Booking (marker দেওয়া, ৩৯টা লাইন) | ✎ নাম বদলানো যায়। marker রাখতে হবে। |
| A/c Payable | 13 Account Payable | ✓ |
| *(শীটে নেই)* | **337 VAT Payable** (marker দেওয়া, ১৮,৫২৭ টাকা জমা) | **রাখতে হবে।** Hotel এই খাতে VAT পোস্ট করে। শীটে যোগ করার কথা মালিককে বলতে হবে। |
| *(শীটে নেই)* | 38 Salaries & Wages Payable, 41 TDS/VAT | কোডে লেখা, তাই রেখে দিতে হবে |
| *(শীটে নেই)* | 18 Opening Stock, 21 Closing Stock, 354 Retained Earnings | সিস্টেমের খাত, রেখে দিতে হবে। Year closing 354 ব্যবহার করে। |

### Income → Operating Income
Hotel-এর চার্জ কোন খাতে যাবে তা ঠিক হয় এভাবে: চার্জ টাইপে (`hotel_booking_charge_types.coa4_id`) খাত দেওয়া থাকলে
সেটাতে যায়। Room Rent যায় 333-এ, Hall Rent 342-এ, আর বাকি সব 339 *Other Income*-এ। এখন কোনো চার্জ টাইপে
খাত দেওয়া নেই।
**মানে কোড না বদলেই নতুন আয়ের খাত বানিয়ে চার্জ টাইপের সাথে জুড়ে দেওয়া যায়।** ব্যতিক্রম Room Rent-এর AC আর
Non-AC ভাগ।

| শীট | DB | করণীয় |
|---|---|---|
| Income from Guest Room Rent (AC) | 333 Room Rent Income (একটাই খাত) | ✎ |
| Income from Guest Room Rent (AC) — **দ্বিতীয়বার** | – | ? সম্ভবত Non-AC। Room Rent এখন একটা খাতেই যায়, তাই AC আর Non-AC ভাগ করতে **কোড বদলাতে হবে** (hotel-vat-rate-wise প্ল্যান, স্থগিত আছে)। L3 50/51 খালি আর বন্ধ অবস্থায় পড়ে আছে। |
| Income from Class Room Rent | নেই | ➕ নতুন খাত + চার্জ টাইপ "Class Room" তার সাথে জুড়ে দেওয়া |
| Catering (Food Management Income A/c) | নেই (catering এখন 339-এ যায়) | ➕ খাত বানিয়ে চার্জ টাইপ *catering* (1497)-এ জুড়ে দেওয়া |
| Service Charge | 334 Hotel Service Charge / 42 Service Charge | ✎ 334-এর নাম বদলানো যায়। 42 সিস্টেমের খাত। |
| Training Service Charge | নেই | ➕ + চার্জ টাইপ |
| *(শীটে নেই)* | 339 Other Income, 340 Cancellation, 341 Rounding, 342 Hall Rent, 343 Discount Allowed | রাখতে হবে (marker দেওয়া, ৩টাতে লেনদেন আছে)। Hall Rent শীটে নেই, কিন্তু ৬,৯৫৬ টাকা জমা আছে। |
| *(শীটে নেই)* | 15 Sales, 19 Sales Return, 23 Sales Discount, 50 Early Payment Discount | কোডে লেখা, তাই রেখে দিতে হবে |

### Income → Non Operating Income (L2 7)
| শীট | DB | করণীয় |
|---|---|---|
| P/L A/c | – | **বানানো উচিত নয়।** P&L রিপোর্ট নিজেই হিসাব করে, আর বছরের লাভ 354 Retained Earnings-এ যায়। P/L নামে আয়ের খাত বানালে লাভ দুবার গোনা হবে। |
| Bank Interest A/c | নেই (133 *Bank Interest* হলো **খরচের** খাত) | ➕ আয়ের দিকে নতুন খাত |
| FDR A/c Withdrawn | – | **বানানো উচিত নয়।** FDR ভাঙানো আয় নয়, এটা টাকা স্থানান্তর (FDR থেকে Bank)। শুধু সুদের অংশটা আয়, যা নিচের "Interest on FDR"-এ যাবে। |
| Other Income | 339 Hotel Other Income | ✎ |
| Interest on FDR | নেই | ➕ |
| Honorarium A/c (আয়) | নেই | ➕ ? খরচের দিকেও একই নাম আছে। দুটো আলাদা খাত হলে নাম আলাদা রাখা ভালো ("Honorarium Received" / "Honorarium Paid")। |
| Sales of Asset | 345 Gain / Loss on Disposal of Asset | ✓ Asset module এটা ব্যবহার করে (নিচে Asset Disposal দেখুন) |
| *(শীটে নেই)* | 40 Purchase Discount, 43 Delivery Charge Income | 40 কোডে লেখা, তাই রেখে দিতে হবে। 43 বন্ধ করা যায়। |

### Expense → Operating Expense (L2 8)
| শীট | DB | করণীয় |
|---|---|---|
| Food Management A/c | 366 (L3 49, যা আছে **L2 13**-এর নিচে, আর §২-ক অনুযায়ী নষ্ট) | L3 49-কে L2 8-এ সরাতে হবে, status আর source ঠিক করতে হবে। asset_items-এর ১১টা খাবারের আইটেম এই খাতে যুক্ত। |
| Amenity Materials A/c | নেই। কাছাকাছি 367 Washing & Cleaning (৭টা পরিষ্কারের আইটেম) | ? নাম বদলাতে হবে নাকি আলাদা খাত, জানতে হবে। L3 54-ও নষ্ট (§২-ক)। |
| *(শীটে নেই)* | 35 Purchase, 16 Purchase Return, 46 Labour, 5, 197, 199, 202, 331/332 | 35/16/46/5/197 কোডে লেখা, তাই রেখে দিতে হবে। 199 আর 202 বন্ধ করা যায়। |

### Expense → Overhead Expense (L2 13)
| শীট | DB | করণীয় |
|---|---|---|
| Office Rent A/c | 146 Office & House Rent | ✎ (147 Hotel Rent বন্ধ করা যায়) |
| Income Tax A/c | নেই | ➕ |
| Bank Charge & Comm A/c | 132 Bank Charge | ✎ |
| Honorariam A/c | L3 19 Honorarium আছে, কিন্তু নিচে কোনো L4 নেই | ➕ L4 (বানান: *Honorarium*) |
| Travelling Allowance A/c | 127 Conveyance & Traveling | ✎ |
| Salaries & Allowances | 148 Salary (L3 16 Salary & Allowances) | ✓ / ✎ 148 কোডে লেখা। 210 *Water Supply* ভুল করে Salary-র নিচে বসে আছে। |
| Electric Bill | 207 Electricity Bill | ✎ |
| Element and Stationery | 191 Stationary Items (L3 21) | ✎ ("Element" সম্ভবত টাইপো) |
| Training Service Charge Paid | নেই | ➕ |
| Fuel & Lubricants | L3 52 Fuel & Lubricate (L2 8-এর নিচে, নষ্ট, L4 নেই) | ✎ L3 ঠিক করে L4 ➕, L2 13-এ সরাতে হবে |
| Repair & Maintenance | L3 24 Office Maintenance (L4 নেই) | ➕ L4 |
| *(শীটে নেই)* | 344 Depreciation | **রাখতে হবে** (Fixed Asset অংশে দেখুন) |
| *(শীটে নেই)* | Office Others-এর ~৩০টা, 133 Bank Interest ইত্যাদি | লেনদেন নেই, বন্ধ করা যায় |

### Expense → Other Expense
| শীট | DB | করণীয় |
|---|---|---|
| Asset Disposal | 345 (Income L3 48-এর নিচে) | ? Asset module লাভ আর ক্ষতি দুটোই **একটা খাতে** (`disposal_coa4_id`) লেখে। শীটে দুটো আলাদা খাত: Sales of Asset (আয়) আর Asset Disposal (খরচ)। দুটো আলাদা রাখতে কোড বদলাতে হবে। একটা রাখলে কোড বদলাতে হবে না। |

---

## ৪. শীটের নিজের ভুল (মালিককে জানাতে হবে)
1. "Income from Guest Room Rent (AC)" দুবার আছে। দ্বিতীয়টা কি Non-AC?
2. বানান ভুল: Receivalbe, Depriciaion, "onElectric", Accomodation, Honorariam, "Element and Stationery"।
3. **P/L A/c** আর **FDR A/c Withdrawn** আয়ের খাত হতে পারে না (কারণ §৩-এ লেখা আছে)।
4. **VAT Payable**, **Hall Rent Income**, **Depreciation** (খরচ), **Discount Allowed** শীটে নেই, অথচ
   সফটওয়্যারের জন্য এগুলো লাগে। দুটোতে টাকাও জমা আছে।
5. "Loan Realized General Fund" আর "Advance Realized to CSF"-এর মানে কী, জানতে হবে।
6. Honorarium আয় আর খরচ দুদিকেই আছে। নাম আলাদা করতে হবে।

---

## ৫. কাজের ক্রম (যখন ঠিক করা হবে)

1. **কোড ঠিক করা:** `Coal3Controller.php`-এ status `'1'` string হিসেবে লেখা আর তুলনা করা। নইলে
   ধাপ ৪-এ বানানো নতুন L3-ও বন্ধ অবস্থায় সেভ হবে।
2. **নষ্ট L3 ঠিক করা:** 49, 50, 51, 52, 54-এ `status='1'`, `acc_source_id=12`। 49 আর 52-কে সঠিক L2-তে সরানো।
3. **নাম বদলানো (✎):** শুধু `name` কলাম। id আর marker একই থাকবে।
4. **নতুন খাত (➕):** প্রায় ২৮টা L4, আর FDR, Income Tax, Training, Class Room ইত্যাদির জন্য দরকার হলে নতুন L3।
   ব্যাংক L3 2-এর নিচে। reporting_to: আয় আর খরচে 2, সম্পদ আর দায়ে 3।
5. **Asset category:** নতুন ৪টা (Electric, Building, Accommodation, Crockeries)। Land আর Building-এর ভুল খাত
   ঠিক করা (§২-খ)। সবগুলোর dep expense = 344, disposal = 345।
6. **Hotel চার্জ টাইপ:** Catering, Class Room, Training-এর `coa4_id`-তে নতুন খাত দেওয়া।
7. **অপ্রয়োজনীয় খাত বন্ধ করা (status 0), মোছা নয়।** Demo/Sample পার্টি, Inter-Branch, হোটেলের সাথে সম্পর্কহীন
   খরচের খাত। শুধু লেনদেন নেই এমন খাত, আর কোডে লেখা id-গুলো বাদ দিয়ে (§১)।
8. যাচাই: Trial Balance, Balance Sheet আর Report Mismatch আগের মতোই মিলছে কিনা। Hotel checkout করে দেখা,
   টাকা নেওয়ার তালিকায় Food Management যেন আর না আসে।

### মালিকের কাছে যে প্রশ্নগুলোর উত্তর লাগবে
1. Room Rent AC আর Non-AC আলাদা খাতে যাবে? (যাবে হলে কোড বদলাতে হবে)
2. Fixed Asset-এর জন্য শীটের মতো আলাদা L3, নাকি DB-র মতো একটা L3? (পরামর্শ: DB-র মতো)
3. Asset বিক্রির লাভ আর ক্ষতির জন্য একটা খাত, নাকি দুটো?
4. P/L A/c আর FDR Withdrawn বাদ দিতে রাজি?
5. CSF / General Fund খাতগুলোর মানে, আর 306 Social Islami Bank ও 353 Mizan Meat House আসল কিনা।
6. Amenity Materials কি Washing & Cleaning-এর নতুন নাম, নাকি আলাদা খাত?
