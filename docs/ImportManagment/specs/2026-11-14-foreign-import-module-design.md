# বিদেশ থেকে পণ্য আমদানি — নতুন ব্যবসায়িক মডিউল: ডিজাইন

**তারিখ:** ১৪ নভেম্বর ২০২৬
**অবস্থা:** খসড়া — কোড শুরুর আগে সিদ্ধান্ত প্রয়োজন (§৯)
**রিপো:** React (`cashbookbd_react`) — এখানে ব্যাকএন্ড নেই; API আলাদা Laravel রিপোতে

---

## ১. কেন এটা আলাদা মডিউল

আমদানি একটা লেনদেন না, একটা **চেইন**: PI → L/C → শিপমেন্ট → বন্দর → ক্লিয়ারিং → স্টক → ব্যাংক পেমেন্ট → ফাইল বন্ধ। প্রতিটা ধাপে টাকা, তারিখ আর নথি জড়িত, আর পণ্যের আসল দাম (landed cost) ফাইলের শেষে গিয়ে ঠিক হয় — কখনো শুরুতেই নয়।

বর্তমান সিস্টেমে এর কিছুই নেই (যাচাই করা):

- `src/components/services/apiRoutes.tsx`-এ currency, exchange-rate, LC — কোনো endpoint নেই।
- `public/help/`-এ "আমদানি", "এলসি", "বৈদেশিক" — কোনো লেখা নেই।
- Sidebar-এ import নামে কিছু নেই; `inv_purchase_import` / `inv_sales_import` হলো **Excel আপলোড** স্ক্রিন, আমদানি ব্যবসা না।

তাই এটা নতুন মেনু, নতুন টেবিল, নতুন স্ক্রিন — বিদ্যমান Purchase invoice-এর ভেতরে ঠেলে দেওয়া যাবে না।

## ২. যে নীতির উপর পুরোটা দাঁড়াবে

**১. স্টক লেজার দুই ভাগ হবে না।** পণ্য ঢোকার কাজটা ইতিমধ্যে purchase invoice / voucher করে, আর `inventory_details`, FIFO, stock report, product ledger — সব ওটার সাথে বাঁধা। আমদানি ফাইল হবে ওটার **উপরে খোলস**: landed cost হিসাব করে **একই purchase voucher** তৈরি করবে, সাথে `import_file_id` রেফারেন্স থাকবে। আলাদা স্টক টেবিল বানালে স্টক দুই জায়গায় ভাগ হয়ে যাবে — এই ভুল এড়ানোর নীতি [purchase-types-design.md](2026-10-17-accounts-transaction-purchase-types-design.md) §৫-এ আগেই লেখা আছে।

**২. ডলারের টাকা কখনো ফের-হিসাব করা হবে না।** প্রতিটা লাইনে তিনটা সংখ্যা জমা থাকবে: `amount_foreign`, `fx_rate`, `amount_bdt`। আজকের রেট দিয়ে পুরনো ফাইলের টাকা আবার হিসাব করলে লেজার আর ফাইল মিলবে না।

**৩. Check আগে, লেখা পরে।** ডেটা-ইমপোর্ট স্ক্রিনগুলো যে দুই ধাপের নীতি মানে (দেখো → তারপর লেখো), আমদানি ফাইলেও তাই: **Post** চাপার আগে স্ক্রিনে দেখাবে ঠিক কী কী ভাউচার তৈরি হবে, কোন হেডে কত যাবে।

**৪. ফাইল ছাড়া কিছুই পোস্ট হয় না।** প্রতিটা খরচ, প্রতিটা স্টক-ভাউচার একটা `import_file`-এর সাথে বাঁধা থাকবে। নাহলে "এই ডিউটি কোন চালানের" প্রশ্নের উত্তর থাকবে না।

## ৩. ওয়ার্কফ্লো ও প্রতিটা ধাপে কী হয়

| # | ধাপ | ব্যবহারকারী যা করে | সিস্টেম যা করে |
|---|---|---|---|
| ১ | **PI এন্ট্রি** | ফরেন সাপ্লায়ার, দেশ, বন্দর, incoterm (FOB/CIF/CFR), currency, আইটেম ও দাম | `import_files` + `import_file_items` তৈরি; কোনো পোস্টিং নেই |
| ২ | **L/C খোলা** | LC নম্বর, ব্যাংক, তারিখ, margin % | ফাইলের তথ্য; (ফেজ ৩ হলে) margin-এর ভাউচার |
| ৩ | **শিপমেন্ট** | BL/AWB নম্বর, শিপমেন্ট তারিখ, আংশিক চালান হলে qty | ফাইলের তথ্য |
| ৪ | **বন্দরে আগমন** | arrival date, C&F এজেন্ট | ফাইলের তথ্য |
| ৫ | **খরচ এন্ট্রি** | ফ্রেইট, ইন্স্যুরেন্স, ডিউটি, VAT, AIT, ক্লিয়ারিং, পরিবহন | `import_costs` সারি; প্রতিটা খরচের সাথে কোন হেড থেকে টাকা গেল |
| ৬ | **Landed cost** | — | খরচ আইটেমে ভাগ হবে (§৬), প্রতি ইউনিটের আসল দাম বের হবে |
| ৭ | **স্টক পোস্ট** | **Post** চাপে | বিদ্যমান purchase voucher তৈরি: ডেবিট স্টক/খরচের হেড, ক্রেডিট A/P বা Cash/Bank; `import_file_id` রেফারেন্স |
| ৮ | **ব্যাংক পেমেন্ট** | LC পেমেন্ট, ব্যাংক চার্জ | (ফেজ ৩) payment voucher; ফাইলের due কমে |
| ৯ | **ফাইল বন্ধ** | Close | ফাইল read-only; আর খরচ যোগ হয় না |

**Post-এর আগে যা বাধা দেবে (blocking):**
- খরচের যোগফল বা FX rate নেই (currency থাকলে rate ছাড়া Post চলবে না)
- আইটেমের qty ≤ 0
- LCMARGIN/AIT ইত্যাদির হেড ম্যাপিং সেটিংসে নেই (ফেজ ২)
- বছর বন্ধ (year closing lock) — বিদ্যমান নিয়মেই
- একই ফাইল দুইবার Post হলে

## ৪. ডেটা মডেল (খসড়া — API রিপোতে বসবে)

```text
import_files                      import_file_items
──────────────────                ──────────────────────
id                                id
company_id, branch_id             import_file_id
file_no (ইউনিক)                   product_id  → product_items
status (§৫)                       hs_code
pi_no, pi_date                    description (ফরেন নাম)
foreign_supplier_name             qty, unit
country, port_of_loading          weight_per_unit
port_of_discharge                 unit_price_foreign
incoterm (FOB|CIF|CFR|...)        amount_foreign
currency (USD|EUR|CNY)            fx_rate, amount_bdt
fx_rate                           landed_unit_cost_bdt (Post-এ ভরে)
lc_no, lc_bank_id, lc_date        purchase_voucher_id (Post-এ ভরে)
lc_margin_percent
bl_no, shipment_date              import_costs
arrival_date                      ────────────
clearing_agent_name               id
remarks                           import_file_id
                                  cost_type (§৭)
                                  amount_foreign, fx_rate, amount_bdt
                                  allocation (value|qty|weight)
                                  debit_coa4_id
                                  voucher_id (পোস্ট হলে)
                                  import_file_events
                                  ─────────────────
                                  import_file_id, at, by, event, note
```

**কেন আলাদা `import_file_items`:** purchase invoice-এর লাইন আর আমদানি ফাইলের লাইন এক জিনিস না। PI-এর দামে পণ্য কেনা হয়, কিন্তু স্টকে ঢোকে landed cost-এ। দুইটা সংখ্যা দুই জায়গায় থাকতেই হবে।

**`import_file_events` কেন:** "কে কখন L/C নম্বর বদলাল" — আমদানিতে এটা প্রায়ই লাগে (ব্যাংক, C&F, অডিট)। বিদ্যমান audit trail-এর সাথে মিলিয়ে রাখা যায়, তবে ফাইলের নিজের টাইমলাইন থাকলে স্ক্রিনে দেখানো সহজ।

## ৫. Status (ফাইলের জীবন)

```
draft → lc_open → shipped → arrived → cleared → posted → closed
                                                   ↑
                                            (Post এখানেই)
```

- Post হওয়ার পর আইটেম/খরচ বদলানো যাবে না; বদলাতে হলে Post বাতিল (unpost) — অনুমতি লাগবে।
- `closed` ফাইলে নতুন খরচ যোগ হয় না, কিন্তু পড়া যায়।
- আংশিক চালান: এক LC-তে একাধিক শিপমেন্ট হলে — হয় এক ফাইলে সব শিপমেন্ট (প্রতি শিপমেন্টে qty), না হয় এক LC থেকে একাধিক ফাইল। **সিদ্ধান্ত দরকার (§৯)।**

## ৬. Landed cost কীভাবে ভাগ হবে

খরচগুলো আইটেমে ভাগ করার তিনটা ভিত্তি, প্রতি খরচ-লাইনে বেছে নেওয়া যাবে:

| ভিত্তি | কখন ঠিক | উদাহরণ |
|---|---|---|
| **Value** (ডিফল্ট) | খরচ পণ্যের দামের অনুপাতে | ফ্রেইট, ইন্স্যুরেন্স, ক্লিয়ারিং |
| **Qty** | সব পণ্য সমান ভারী/সমান দামি | কিছু ব্যাংক চার্জ |
| **Weight** | ভারী-হালকা পণ্য মেশানো | সমুদ্র ফ্রেইট, C&F |

```text
item.landed_unit_cost = unit_price_bdt + (নিজের 몫 খরচ / qty)
```

বৃত্তাকার নিয়ম: ভাগশেষ (rounding remainder) **শেষ আইটেমে** যাবে, যাতে খরচের মোট যোগফল হুবহু মেলে — নইলে লেজারে ১ টাকার ফারাক থেকে যায়, যা অডিটে ধরা পড়ে।

ডিউটি/VAT/AIT-এর হিসাব নিজে করা হবে না; ব্যবহারকারী হাতে লেখে (কাস্টমসের কাগজ যা বলে)। সিস্টেম শুধু মোট মিলিয়ে দেখবে।

## ৭. খরচের ধরন ও হিসাবের হেড (ফেজ ২)

| cost_type | ডেবিট (খসড়া) | মন্তব্য |
|---|---|---|
| `freight` | আমদানি ফ্রেইট / Carriage Inward | স্টক-দামে যোগ |
| `insurance` | Insurance | স্টক-দামে যোগ |
| `customs_duty` | Import Duty | স্টক-দামে যোগ |
| `import_vat` | Import VAT (Input) | সাধারণত **স্টক-দামে যোগ হয় না**, রিকভারি হয় |
| `ait` | AIT | রিকভারি/খরচ — সিদ্ধান্ত (§৯) |
| `clearing` | Clearing & Forwarding | স্টক-দামে যোগ |
| `transport` | পরিবহন | স্টক-দামে যোগ |
| `bank_charge` | ব্যাংক চার্জ | সাধারণত খরচ, স্টকে নয় |
| `lc_margin` | L/C Margin | সম্পদ, খরচ নয় |

**নীতি:** এই ম্যাপিং কোডে হার্ডকোড হবে না, সেটিংসে থাকবে (প্রতি কোম্পানি আলাদা চার্ট)। কারণ VAT রিকভারি আর AIT-এর চিকিৎসা কোম্পানি-ভেদে বদলায়।

## ৮. স্ক্রিন, মেনু, অনুমতি

**মেনু:** নতুন টপ-লেভেল `import` — "Import" (Invoice-এর ভেতরে রাখা যাবে না; এটা ভিন্ন ব্যবসা, আর Invoice মেনু ইতিমধ্যে ১০ আইটেমে ভরা)।

| স্ক্রিন | পাথ (খসড়া) | কাজ |
|---|---|---|
| Import File List | `/import/file` | ফাইল তালিকা, status, দেশ, ডলার, BDT, বাকি |
| Import File (নতুন/সম্পাদনা) | `/import/file/:id` | হেডার + ট্যাব: Items · Costs · Documents · Payments · Timeline |
| Import Register | `/import/report/register` | কোন ফাইলে কত খরচ, কত স্টক |
| Landed Cost Sheet | `/import/report/landed-cost` | প্রতি আইটেমে দাম কীভাবে দাঁড়াল |

**অনুমতি:** `import.file.view` · `import.file.create` · `import.file.edit` · `import.stock.post` · `import.cost.edit` · `import.report`.

**এই রিপোতে যে ফাইলগুলো ছুঁতে হবে** (নতুন মেনু মানেই এই তালিকা):

```text
src/components/services/appRoutes.tsx       → রুট
src/App.tsx                                 → import + <Route>
src/components/services/apiRoutes.tsx       → endpoint
src/components/Sidebar/index.tsx            → SIDEBAR_MENUS + SIDEBAR_SUBMENUS
src/components/Sidebar/menuRoutes.ts        → routes.*
src/components/Sidebar/menuPermissions.ts   → মেনু-কী → অনুমতি
src/components/Header/globalSearchItems.ts  → সার্চ
src/components/help/helpTopicForPath.ts     → টপিক
public/help/import.json (+ index.json)      → হেল্প লেখা
docs/help-coverage.md                       → রুট | topic | done
```

তারপর `npm run help:check` — নতুন মেনু আইডির প্রতিটা রুট ও টপিক থাকতে হবে, নইলে চেক ফেল করবে।

## ৯. খোলা সিদ্ধান্ত (মালিকের উত্তর দরকার)

1. **স্টক কখন বাড়বে?** — শিপমেন্ট এ্যরাইভালে, নাকি কাস্টমস ক্লিয়ারেন্সের পরে? (আগে বাড়ালে ডিউটি তখনো অজানা)
2. **Landed cost-এ কী কী যোগ হবে?** — উপরের §৭-এ আমার সুপারিশ আছে (`import_vat` বাদ, `ait` বাদ)। মালিকের হিসাবরক্ষক যা বলেন সেটাই চূড়ান্ত।
3. **ভাগের ভিত্তি** — ডিফল্ট value ঠিক আছে, নাকি ওজন/পরিমাণ বেশি দরকার?
4. **LC কতটা গভীর?** — শুধু নম্বর-রেফারেন্স, নাকি margin/acceptance/ব্যাংক চার্জ সব লেজারে?
5. **এক LC-তে কয় শিপমেন্ট?** — আংশিক চালান সমর্থন করতে হবে কি?
6. **একাধিক মুদ্রা** (USD + EUR), নাকি আপাতত শুধু USD?
7. **ব্যাকএন্ড** — API রিপোতে অ্যাক্সেস আছে কি? না থাকলে ফেজ ১ শুধু ফ্রন্টএন্ড + endpoint কনট্রাক্ট হিসেবে হবে।

## ১০. ফেজিং (প্রস্তাব)

| ফেজ | কী | নির্ভরতা |
|---|---|---|
| **১** | ফাইল লিস্ট + ফাইল স্ক্রিন (হেডার, আইটেম, খরচ), status, কোনো পোস্টিং নেই | API টেবিল ৩টা |
| **২** | Landed cost হিসাব + Post (purchase voucher + স্টক) | purchase/stock API |
| **৩** | LC/ব্যাংক পেমেন্ট, margin, ব্যাংক চার্জ | §৯.৪-এর উত্তর |
| **৪** | রিপোর্ট: Register, Landed Cost Sheet, ফাইল-ভিত্তিক due | ১–৩ |

**ফেজ ১-এ সবচেয়ে বেশি মূল্য:** মালিক এখন Excel-এ যে আমদানি ফাইল রাখেন, সেটা সিস্টেমে আসে — আর খরচের হিসাব হারায় না। পোস্টিং ছাড়াও এটা ব্যবহারযোগ্য।

## ১১. যাচাইয়ের পরিকল্পনা

- **ইউনিট-লেভেল (ফ্রন্টএন্ড):** শিট/সংখ্যা পার্সিং নয়, বরং landed cost ভাগের হিসাব — যোগফল মেলে, ভাগশেষ শেষ আইটেমে, শূন্য qty-তে ভাগ হয় না।
- **Post-পূর্ব যাচাই (API):** এক ফাইল দুইবার Post → দ্বিতীয়বার আটকায়; ফাইলের মোট খরচ = তৈরি ভাউচারের মোট; voucher-এর প্রতিটা লাইন ফাইলে ফিরে যায়।
- **ট্রায়াল:** একটা নকল ফাইল (২ আইটেম, ৩ খরচ) দিয়ে rollback-করা transaction-এ চালানো।
- **ব্রাউজার:** Post চাপার আগে প্রিভিউ স্ক্রিনে যা দেখা যায়, পোস্টের পর ভাউচার রিপোর্টে ঠিক তাই আছে কি না।

## ১২. যা এখনো জানা নেই

- API রিপোর structure (controller/service নাম, migration রীতি) — এই রিপোতে দেখা যায়নি, তাই §৪ শুধু খসড়া।
- কাস্টমস/ভ্যাটের কোন রিপোর্ট মালিককে মাসে দিতে হয় — সেটা জানলে §৭-এর হেড ম্যাপিং নিশ্চিত হয়।
- বিদ্যমান purchase voucher-এ `import_file_id` রাখার জায়গা আছে কি না (nullable কলাম দরকার হবে)।
