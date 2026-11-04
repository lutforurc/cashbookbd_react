---
title: "Manufacturing / Production — বাস্তবায়ন পরিকল্পনা v3"
---

**তারিখ:** ৪ নভেম্বর ২০২৬

## অবস্থা ও এই ডকের গঠন

এটা পরিকল্পনা, কোড বা ডেটা বদলের নির্দেশ নয়। v1 (২৪ অক্টোবর, আলোচনার নোট) আর v2 (৩ নভেম্বর, কারিগরি সংশোধন) মিলিয়ে v3 লেখা হয়েছে। মালিকের বাকি সিদ্ধান্ত আর Phase 0-এর প্রমাণ ছাড়া কাজ শুরু হবে না।

- **অংশ ক** মালিক ও ক্লায়েন্টের জন্য, সহজ বাংলায়।
- **অংশ খ** ডেভেলপারের জন্য, কারিগরি নিয়ম ও যাচাই।

v2-এর সব নিয়ম বহাল, তিনটে জায়গায় নরম করা হয়েছে যাতে দৈনন্দিন কাজ আটকে না যায়: বাকি মজুরি, অস্বাভাবিক নষ্ট আর পুরনো তারিখে এন্ট্রি (খ-৫, খ-৪, খ-৬)। নতুন যোগ: VAT (মূসক), কাঁচামালের উৎস ও opening stock, গুদাম ভাগ, ঘাটতি দেখা, ফ্রি পণ্যের খরচের হিসাব, আর একটা পুরো worked example।

ছবিসহ পুরনো নমুনা পেজ: [v1 নমুনা](https://claude.ai/artifact/MZdsUghGGbSzgtvAQf8ZCb) (প্যাকেটকে খরচের লাইনে দেখানোটা বদলাতে হবে)।

## অংশ ক-১: এক নজরে

নতুন ব্রাঞ্চে একটা নতুন ভাউচার "Production Entry" দিয়ে কাঁচামাল থেকে পণ্য বানানো, বড় প্যাকেট ভেঙে ছোট প্যাকেট আর কম্বো প্যাক, তিনটেই হবে। পুরনো ব্রাঞ্চে কিছু বদলাবে না।

### ক্লায়েন্ট কী চান

1. কাঁচামাল মিশিয়ে নতুন পণ্য বানানো।
2. বড় প্যাকেট থেকে ছোট প্যাকেট (যেমন ৫০ কেজি বস্তা থেকে ২৫০ গ্রাম)।
3. তৈরি পণ্যের আসল প্রতি-ইউনিট খরচ।
4. ফ্রি পণ্য (১০০ কিনলে ২ ফ্রি), বিক্রিতে ও ক্রয়ে।
5. কম্বো প্যাক।
6. Trial Balance, P&L ও Balance Sheet ঠিক মেলা।

### Production Entry কীভাবে কাজ করে

| অংশ | কী হয় | দাম কোথা থেকে |
| --- | --- | --- |
| বের হবে (কাঁচামাল, বড় প্যাকেট, খালি প্যাকেট) | স্টক থেকে বের হয় | কেনা দাম, আগে কেনা মাল আগে (FIFO); সিস্টেম নিজে বসাবে |
| বাড়তি খরচ (মজুরি ইত্যাদি) | আগে লেখা খরচের ভাউচার থেকে নেওয়া হয় | হাতে টাকা লিখে নয়, ভাউচার বেছে |
| ঢুকবে (তৈরি পণ্য / ছোট প্যাকেট) | স্টকে ঢোকে | (কাঁচামাল + খরচ) ÷ ভালো মালের সংখ্যা |
| নষ্ট | আলাদা দেখায় | স্বাভাবিক নষ্টের দাম তৈরি পণ্যে ঢোকে |

**নমুনা ১, মশলা মিক্স:** মরিচ ৬০ কেজি (৭,২০০) + হলুদ ৪০ কেজি (৬,০০০) + মজুরি ও অন্যান্য ৩,০৬০ = ১৬,২৬০ টাকা। ভালো মাল ৯৫ প্যাকেট (১ কেজি), নষ্ট ৫ কেজি (৫%)। প্রতি প্যাকেট ১৭১.১৬ টাকা।

**নমুনা ২, চিনি repack:** ১ বস্তা ৫০ কেজি (৬,০০০) + ১৯৮টা খালি প্যাকেট + মজুরি। ১৯৮ × ২৫০ গ্রাম = ৪৯.৫ কেজি, নষ্ট ০.৫ কেজি (১%)। প্যাকেট আর মজুরি মিলে ৯৯৪ হলে মোট ৬,৯৯৪, প্রতি প্যাকেট ৩৫.৩২। প্যাকেট এখানে **কাঁচামাল হিসেবে স্টক থেকে বেরোবে**, খরচের লাইনে আবার লেখা হবে না।

### কোন কাজে কোন ফর্ম

| কাজ | ফর্ম | নতুন? |
| --- | --- | --- |
| কাঁচামাল, বড় প্যাকেট, খালি প্যাকেট/লেবেল কেনা | Purchase Invoice | না |
| পুরনো ব্রাঞ্চ থেকে কাঁচামাল আনা | Branch Transfer | না, যাচাই লাগবে |
| মজুরি, বিদ্যুৎ, ভাড়া | Payment Voucher, বা বাকি থাকলে Journal | না, নতুন কয়েকটা খরচের head |
| মাল তৈরি / প্যাকেট বদল / কম্বো | **Production Entry** | **হ্যাঁ** |
| রেসিপি সেট করা | **Recipe** | **হ্যাঁ** (পরের ধাপে) |
| ফ্রির নিয়ম | **স্কিম সেটআপ** | **হ্যাঁ** (পরের ধাপে) |
| তৈরি পণ্য বিক্রি | Sales Invoice + ফ্রি ঘর | না, শুধু নতুন ঘর |

নতুন রিপোর্ট: **Production Register ও Batch Costing** (ব্যাচ ধরে কাঁচামাল, খরচ, প্রতি ইউনিট দাম, নষ্ট)। রেসিপির চেয়ে বেশি নষ্ট হলে লাল দেখাবে।

## অংশ ক-২: সিদ্ধান্ত

### যা ঠিক হয়ে গেছে (২৪ অক্টোবর)

| বিষয় | সিদ্ধান্ত |
| --- | --- |
| কোথায় চলবে | নতুন ব্রাঞ্চে; পুরনোগুলো যেমন আছে |
| রেসিপি | দুটোই: রেসিপি দিয়ে, আর রেসিপি ছাড়া হাতে |
| বাড়তি খরচ | যোগ হবে, শুধু যেগুলো এন্ট্রিতে বেছে দেওয়া হবে |
| নষ্ট | আলাদা দেখাবে, দাম তৈরি পণ্যে ঢুকবে |
| ছোট প্যাকেট | আলাদা পণ্য, আলাদা কোড |
| ফ্রিসহ ফেরত | ফ্রি অংশও আনুপাতিক হারে ফেরত |
| পারচেজে ফ্রি | লাগবে |

### যা মালিককে ঠিক করতে হবে

প্রতিটায় আমাদের প্রস্তাব দেওয়া আছে। আপত্তি না থাকলে প্রস্তাবটাই চলবে।

| # | প্রশ্ন (সহজ ভাষায়) | প্রস্তাব |
| --- | --- | --- |
| ১ | এন্ট্রি সেভ করলেই স্টক বদলাবে, নাকি কেউ অনুমোদন দেওয়ার পর? | "খসড়া" আর "পোস্ট" দুটো বোতাম; পোস্ট করলেই স্টক বদলাবে, আলাদা অনুমোদন নয় |
| ২ | মজুরি পরে দিলে কী হবে? | উৎপাদনের দিন Journal দিয়ে "মজুরি বাকি" লেখা, পরে টাকা দিলে Payment |
| ৩ | কোন কোন খরচ পণ্যের দামে ঢুকবে? | কারখানার মজুরি, প্যাকিং মজুরি, কারখানার পরিবহন; অফিস খরচ নয় |
| ৪ | বিদ্যুৎ-ভাড়ার মতো মাসিক খরচ ভাগ হবে? | এখন না; খরচ হিসেবেই থাকবে। এর ফলে অবিক্রিত মালের দাম একটু কম দেখাবে, আর যে মাসে খরচ সেই মাসের লাভ একটু কম দেখাবে |
| ৫ | কতটুকু নষ্ট "স্বাভাবিক"? | প্রতি পণ্যে সীমা, যেমন মশলা ৫%, চিনি ১%। বেশি হলে বাড়তিটা "অস্বাভাবিক নষ্ট" খরচে যাবে, কারণ লিখতে হবে |
| ৬ | ব্যাচ নম্বর ও মেয়াদ (expiry) লাগবে? | ব্যাচ নম্বর হ্যাঁ; মেয়াদ খাদ্যপণ্য হলে হ্যাঁ। **প্রথম ধাপ শুরুর আগেই জানাতে হবে** |
| ৭ | পুরনো তারিখে এন্ট্রি চলবে? | চলবে, যদি সেই পণ্যের পরে কোনো লেনদেন না হয়ে থাকে |
| ৮ | ফ্রির নিয়ম সবার জন্য এক, নাকি কাস্টমার/সময়ভেদে আলাদা? | শুরুতে সবার জন্য এক, তারিখ থেকে তারিখ পর্যন্ত |
| ৯ | ফ্রি পণ্যের খরচ রিপোর্টে কোথায় দেখাবে? | বিক্রিত মালের খরচেই থাকবে, তবে রিপোর্টে আলাদা লাইন "ফ্রি দেওয়া মালের খরচ" |
| ১০ | ক্লায়েন্ট VAT-নিবন্ধিত? মূসক-৪.৩ জমা দেন? | ক্লায়েন্টের কাছ থেকে জানতে হবে; VAT পরামর্শকের সাথে যাচাই |
| ১১ | কাঁচামাল নতুন ব্রাঞ্চে কেনা হবে, নাকি পুরনো ব্রাঞ্চ থেকে আসবে? কাঁচামাল আর তৈরি পণ্য আলাদা গুদামে? | ক্লায়েন্টের কাছ থেকে জানতে হবে |

## অংশ ক-৩: কখন কী পাবেন

ধাপ ১ শেষ হলেই ক্লায়েন্ট আসল কাজ শুরু করতে পারবেন; বাকি ধাপ একটা একটা করে যোগ হবে, প্রতিটা শেষে দেখানো হবে।

| ধাপ | ক্লায়েন্ট কী পাবেন |
| --- | --- |
| ০. যাচাই | কোড ও ডেটাবেস দেখে নিশ্চিত হওয়া, একটা পুরো সংখ্যার উদাহরণ (খ-১৩) দেখানো। ক্লায়েন্ট কিছু পান না, কিন্তু পরের সব ধাপের ভিত্তি |
| ১. উৎপাদন | নতুন ব্রাঞ্চ, Production Entry (রেসিপি ছাড়া), Production Register ও Costing রিপোর্ট; তিন রিপোর্ট মেলে |
| ২. রেসিপি | রেসিপি বাছলে লাইন নিজে ভরে যাবে; কাঁচামাল কম থাকলে আগেই জানাবে |
| ৩. বিক্রিতে ফ্রি | সেলসে ফ্রি ঘর, স্কিম সেটআপ, ফ্রিসহ ফেরত |
| ৪. ক্রয়ে ফ্রি | সরবরাহকারীর ফ্রি মাল ঢুকলে দাম নিজে ভাগ হবে |

যা প্রথমে থাকবে না: এক ব্যাচ থেকে একাধিক ভিন্ন পণ্য, উপজাত বা ঝরতি মাল বিক্রি, বিক্রির সময় বান্ডেল বানানো বা ভাঙা, আর মাসিক খরচের স্বয়ংক্রিয় ভাগ।

## অংশ খ-১: v1 পরিধি

- একটি batch-এ একাধিক input, **একটি** output SKU। Repack ও প্রস্তুত combo একই Production Entry।
- খালি packet/label/carton stock item হিসেবে input।
- Manual আগে (Phase 1), Recipe পরে (Phase 2)।
- Batch reference ও production date বাধ্যতামূলক; expiry-র সিদ্ধান্ত (ক-২ #৬) প্রথম migration-এর আগে।
- বাদ: multi-output, by-product, scrap resale, WIP, sale-time bundle assembly/disassembly, automatic overhead allocation। এমন লেনদেন চুপচাপ সাধারণ batch হিসেবে নেওয়া যাবে না; UI-তে স্পষ্টভাবে আটকাবে।

## অংশ খ-২: কোড থেকে যা জানা (Phase 0-এর শুরুর বিন্দু)

v1-এর সময় কোড দেখে পাওয়া তথ্য। Phase 0-এ আবার যাচাই করে প্রমাণসহ লিখতে হবে, কারণ এগুলো dev DB/কোড থেকে, ক্লায়েন্টের DB থেকে নয়।

| বিষয় | পর্যবেক্ষণ | প্রভাব |
| --- | --- | --- |
| Branch setup | Business Type "Manufacturing", Branch Type "Factory", Inventory "General" সারি আছে (এই DB-তে Manufacturing id = 3) | মেনু খুলবে permission দিয়ে, numeric id দিয়ে নয়; Sidebar-এর Hotel মেনুর মন্তব্যে একই সমস্যার উল্লেখ |
| Closing stock | P&L ও Balance Sheet closing stock পড়ে FIFO layer থেকে, `ReportsController::rebuildStockTable()` দিয়ে | Production movement এই rebuild-এ না ঢুকলে রিপোর্টে মাল হারাবে। **Phase 1-এর সবচেয়ে বড় কাজ** |
| Write-off ও receipt | `writeOffValue()` ও receipt হিসাব `product_out_master` / `product_in_master` দেখে চেনে | Production-এর নিজের টেবিল; Product In/Out টেবিল ব্যবহার করা যাবে না |
| দাম > ০ নিয়ম | `productValidation` সব sales/purchase স্ক্রিনে শেয়ার করা | নিয়ম ঢিলা করা যাবে না; ফ্রির জন্য আলাদা ঘর/লাইন |
| পুরনো Manufacturing module | `ManufacturingController`, `CommonFunction/Manufacturing.php`, `Http/Utils/ManufacturingJournal.php`, `inventory_manufacturing_*`; dev DB-তে সারি নেই; React স্ক্রিন নেই; `coa4_id = 5` ও financial year `1` hardcoded | ব্যবহার হবে না, মোছাও হবে না। ক্লায়েন্ট DB-তে ব্যবহার আছে কি না Phase 0-এ দেখতে হবে |

**Phase 0-এ বের করতে হবে:** একটা canonical stock movement table/engine আছে কি না, নাকি প্রতিটা report নিজে বিভিন্ন টেবিল থেকে stock গড়ে; stock পড়ে এমন সব consumer-এর তালিকা (stock ledger, closing stock, COGS, sales return, transfer, delivery); unit conversion product master-এ আছে কি না; branch transfer কোন দামে যায়।

## অংশ খ-৩: Production Entry

- **Header:** branch, server business date, server-generated voucher no., batch ref, optional recipe+version, notes, status (Draft / Posted / Reversed)।
- **Input:** product, warehouse, entered unit/qty, base-unit qty, available stock (production date অনুযায়ী), consumed FIFO layers, actual cost। দাম backend ঠিক করবে; user বদলাতে পারবেন না।
- **Output:** existing SKU, qty, unit conversion, net contents, batch value, precise unit cost। নতুন SKU বানানো আলাদা কাজ (price/MRP, barcode, label সহ)।
- **Cost:** source voucher line, cost head, allocatable balance, allocated amount, explanation।
- **Wastage:** basis (kg ইত্যাদি), actual, expected (qty/%), normal অংশ, abnormal অংশ, reason। Packaging count আর material weight আলাদা।

## অংশ খ-৪: Unit, yield ও cost

প্রতি product-এর base unit ও নির্দিষ্ট conversion; packet আর kg সরাসরি যোগ নয়। Decimal arithmetic; rounding residual শেষ unit বা layer-এ বসবে যাতে layer total ঠিক থাকে।

**Unit cost = (FIFO material + allocated cost − abnormal loss cost) ÷ good output qty**

- **স্বাভাবিক loss** (recipe বা product-এর tolerance পর্যন্ত) output cost-এ absorb হয়।
- **অস্বাভাবিক loss (v2 থেকে নরম করা):** posting বন্ধ নয়। Tolerance-এর বাইরের অংশের cost = (abnormal qty ÷ total input qty) × capitalizable cost; এটা "Abnormal Production Loss" expense head-এ যাবে (Dr Abnormal Loss / Cr Production Cost Clearing বা চূড়ান্ত model অনুযায়ী), reason বাধ্যতামূলক, register-এ লাল। Product Out দিয়ে একই consumption দ্বিতীয়বার নয়।
- Mass balance শুধু তুলনাযোগ্য unit-এ; evaporation/moisture থাকলে expected yield recipe-তে।
- **হিসাব যাচাই:** ১৬,২৬০ ÷ ৯৫ = ১৭১.১৫৭৮৯…; display ১৭১.১৬ কিন্তু layer total ১৬,২৬০.০০। ৬,৯৯৪ ÷ ১৯৮ = ৩৫.৩২৩২…। Recipe: ১০০ × ১ kg, ৪% loss → input ১০০ ÷ ০.৯৬ = ১০৪.১৬৬৭ kg (v1-এর ১০৫ kg-তে output হতো ১০০.৮ kg)।

## অংশ খ-৫: খরচ ও accounting model (Phase 0 gate)

Production শুধু আগে post করা খরচের voucher line থেকে cost নেবে; হাতে অঙ্ক লিখে stock value বাড়ানো যাবে না। কোন accounting model চলবে তা Phase 0-এ report formula দেখে ঠিক হবে।

| | Model A: periodic (v1-এর ধারণা) | Model B: clearing account |
| --- | --- | --- |
| Production ledger লেখে? | না | হ্যাঁ: Dr Inventory Adj / Cr Production Cost Clearing (allocated অংশ) |
| কখন কাজ করে | P&L = Opening + Purchase + Direct Exp − Closing (FIFO) হলে | Ledger-ভিত্তিক inventory থাকলে |
| ঝুঁকি | খরচ আর production আলাদা period-এ পড়লে দুই মাসের লাভ ভুল | Report-এ double count যদি closing stock-ও আবার যোগ হয় |
| প্রস্তাব | Phase 0-এ formula নিশ্চিত হলে **A**, সঙ্গে cross-period block | A না মিললে B |

**Model A-তে বাধ্যতামূলক:**

- Factory Labour, Packing Labour ইত্যাদি head P&L-এর **Direct Expense / Cost of Sales** group-এ থাকবে, যাতে Gross Profit ঠিক আসে।
- Source expense আর production একই accounting period-এ; না হলে posting আটকাবে।

**বাকি মজুরি (v2 থেকে নরম করা):** নগদ দেওয়া পর্যন্ত অপেক্ষা নয়। উৎপাদনের দিন Journal: Dr Factory Labour / Cr Labour Payable; Production সেই journal line থেকে allocate করবে। পরে Payment: Dr Labour Payable / Cr Cash। Production নিজে কখনো Cash/Payable লিখবে না।

**নিয়ন্ত্রণ:**

- একই source line তার allocatable balance-এর বেশি allocate নয়; concurrent allocation row lock দিয়ে আটকানো।
- Source আর production একই branch/company, valid ও open period।
- Purchase বা আগেই capitalize করা line আবার capitalize নয়।
- Allocated source voucher edit/delete হলে source-side guard আটকাবে ("এই খরচ Production #… তে ব্যবহৃত")। Guard তৈরি না হওয়া পর্যন্ত posting চালু হবে না।
- Overhead (বিদ্যুৎ, ভাড়া) v1-এ allocate নয়; এর ফলে অবিক্রিত মালের valuation কম ও খরচের period-এর লাভ কম। মালিকের সম্মতি (ক-২ #৪) লাগবে।

## অংশ খ-৬: Stock/FIFO integration

- Logical entity: production master, inputs, output, cost allocations, FIFO consumption links, audit/reversal refs। Table নাম Phase 0-এর পর।
- Production-এর নিজের টেবিল, তবে stock পড়ে এমন **প্রতিটা** consumer (খ-২-এর তালিকা) production in/out বুঝবে। একটা বাদ থাকলে কাজ অসম্পূর্ণ।
- Posting একটা DB transaction-এ: validate → lock stock ও cost source → FIFO consume → output layer → source links → (Model B হলে) journal → status Posted। Error হলে সব rollback। Idempotency key দিয়ে double-click/retry-তে একবারই।
- Availability production date অনুযায়ী; future receipt দিয়ে পুরনো production নয়; negative stock নিষিদ্ধ।
- **Backdating (v2 থেকে নরম করা):** অনুমোদিত, যদি production date-এর পরে input বা output product-এর কোনো stock movement না থাকে এবং period খোলা থাকে। থাকলে আটকাবে ও কোন voucher-এর কারণে তা দেখাবে। একই দিনে ক্রম: voucher time/sequence অনুযায়ী।
- **গুদাম:** input ও output-এর warehouse আলাদা বাছা যাবে (Raw Material Store / Finished Goods Store), ক্লায়েন্টের উত্তর (ক-২ #১১) অনুযায়ী।
- **Opening stock ও transfer:** নতুন branch-এর opening stock কাঁচামাল FIFO layer হিসেবে ঢোকার পথ, আর পুরনো branch থেকে transfer হলে আসল FIFO cost বহন হচ্ছে কি না, Phase 0-এ যাচাই।

## অংশ খ-৭: Edit, cancel ও audit

- Draft edit/delete চলবে; posted batch hard-delete নয়।
- Output বিক্রি, transfer, write-off বা অন্য production-এ ব্যবহার হলে edit/cancel বন্ধ।
- অব্যবহৃত output-এর reversal: exact input layers ফেরত, allocation মুক্ত, output layer বাতিল; reversal voucher original-এর সঙ্গে linked। Closed period-এ নয়।
- কে কখন post/reverse করেছেন সংরক্ষিত।

## অংশ খ-৮: Recipe (Phase 2)

- Yield, base-unit input qty, packaging qty, expected normal loss %, optional suggested cost।
- Production-এ snapshot; batch-এ বদলালে recipe বদলায় না। Version ও effective date।
- Suggested cost কোনো posted source ছাড়া capitalize নয়; শুধু কোন source line বাছতে হবে সেটা মনে করায়।
- **ঘাটতি দেখা:** recipe ও target qty দিলে প্রতিটা input-এর প্রয়োজন বনাম available stock, কম থাকলে লাল।
- VAT প্রযোজ্য হলে recipe-র input-output অনুপাত মূসক-৪.৩-এর সঙ্গে মিলিয়ে রাখার ব্যবস্থা (নিচে খ-১০)।

## অংশ খ-৯: Free goods (Phase 3, 4)

- **Same-SKU বিক্রি:** `paid_qty` ও `free_qty` আলাদা; stock out = যোগফল, charge শুধু paid। ঘর দেখাবে branch setting চালু থাকলে।
- **Different-SKU free:** linked promotion line, zero charge; `productValidation` blanket শিথিল নয়, promotion line-এর আলাদা validation।
- **খরচের হিসাব:** free অংশের FIFO cost COGS-এ, তবে আলাদা চিহ্ন রেখে, যাতে report-এ "ফ্রি দেওয়া মালের খরচ" দেখা যায়।
- **Scheme:** product, threshold, free qty, repeat হবে কি না (২০০-তে ৪?), তারিখ সীমা, customer group (পরে), manual override permission; invoice-এ snapshot।
- **Return:** original line-এর সঙ্গে linked, original issue cost-এ ফেরত; cumulative return original ছাড়াবে না। Rounding: প্রতি return-এ free = floor(returned paid × free ÷ paid), শেষ return-এ বাকিটা settle।
- **Purchase free (Phase 4):** same SKU-তে unit cost = মোট দাম ÷ মোট received qty; আলাদা SKU হলে rule আগে ঠিক।
- Delivery-based stock deduction চালু থাকলে invoice ও delivery-তে free দুবার কাটবে না।
- Prepared bundle = আলাদা SKU, Production দিয়ে তৈরি; disassembly v1-এ নয়।

## অংশ খ-১০: VAT (মূসক), যাচাই সাপেক্ষ

ক্লায়েন্ট VAT-নিবন্ধিত উৎপাদক হলে সাধারণত উৎপাদনের আগে মূসক-৪.৩ (উপকরণ-উৎপাদ সহগ ঘোষণা) জমা দিতে হয়, আর ক্রয়/বিক্রয়ের হিসাব মূসক-৬.১/৬.২-তে রাখতে হয়। ফ্রি পণ্যে VAT কীভাবে ধরা হবে সেটাও প্রশ্ন। এগুলো এই পরিকল্পনার পরিধিতে নয়, কিন্তু recipe ও free-goods-এর data এমনভাবে রাখতে হবে যাতে পরে এই রিপোর্ট বানানো যায়। **ক্লায়েন্টের VAT পরামর্শকের সঙ্গে নিশ্চিত করতে হবে।**

## অংশ খ-১১: Permission ও branch isolation

- প্রস্তাবিত: `production.view/create/post/reverse`, `production.report.view`; পরে `recipe.*`, `scheme.*`, `free.override`। চূড়ান্ত নাম বিদ্যমান convention অনুযায়ী।
- Menu, route ও API-তে authorization; feature-enabled branch ও company/branch ownership server-side যাচাই।
- Numeric Business Type id hardcode নয়; permission একা data scope ঠিক করবে না।

## অংশ খ-১২: রিপোর্ট

- **Production Register** (list) ও **Batch Costing** (detail): input qty/value, allocated cost ও তার source voucher, output qty, unit cost, normal ও abnormal loss qty/%, recipe-র তুলনায় variance (Phase 2)।
- **Material-to-output trace:** কোন purchase layer কোন batch-এ গেছে।
- Stock ledger-এ production in/out আলাদা voucher type হিসেবে।
- Print/PDF-এর সব text solid black; gray text নয়।

## অংশ খ-১৩: পুরো worked example (Model A, এক মাস)

Phase 0-এর পাস/ফেল মাপকাঠি এটাই: test DB-তে এই লেনদেনগুলো দিলে রিপোর্টে ঠিক এই সংখ্যা আসতে হবে। শুরু: Capital ২০,০০০, Cash ২০,০০০।

| # | লেনদেন | Ledger | Stock |
| --- | --- | --- | --- |
| ১ | মরিচ ৬০ kg × ১২০ + হলুদ ৪০ kg × ১৫০ কেনা, নগদ | Purchase ১৩,২০০ / Cash | +১৩,২০০ |
| ২ | মজুরি বাকি | Factory Labour ৩,০৬০ / Labour Payable | — |
| ৩ | Production: ৯৫ × ১ kg, নষ্ট ৫ kg, #২ থেকে ৩,০৬০ allocate | কিছু না | −১৩,২০০, +১৬,২৬০ |
| ৪ | ৫০ প্যাকেট × ২০০ বিক্রি, নগদ | Cash / Sales ১০,০০০ | −৮,৫৫৭.৮৯ |
| ৫ | ৫ প্যাকেট ফেরত, নগদ ফেরত | Sales Return ১,০০০ / Cash | +৮৫৫.৭৯ |
| ৬ | মজুরি পরিশোধ | Labour Payable / Cash ৩,০৬০ | — |

**প্রত্যাশিত ফল:**

| রিপোর্ট | লাইন | টাকা |
| --- | --- | --- |
| Stock | Closing: ৫০ প্যাকেট | ৮,৫৫৭.৮৯ |
| P&L | Net sales (১০,০০০ − ১,০০০) | ৯,০০০.০০ |
| P&L | COGS (০ + ১৩,২০০ + ৩,০৬০ − ৮,৫৫৭.৮৯) | ৭,৭০২.১১ |
| P&L | Gross profit (= ৪৫ × ২৮.৮৪২১) | ১,২৯৭.৮৯ |
| Trial Balance | Dr: Cash ১২,৭৪০ + Purchase ১৩,২০০ + Labour ৩,০৬০ + Return ১,০০০ | ৩০,০০০.০০ |
| Trial Balance | Cr: Capital ২০,০০০ + Sales ১০,০০০ | ৩০,০০০.০০ |
| Balance Sheet | Assets: Cash ১২,৭৪০ + Stock ৮,৫৫৭.৮৯ | ২১,২৯৭.৮৯ |
| Balance Sheet | Equity: Capital ২০,০০০ + Profit ১,২৯৭.৮৯ | ২১,২৯৭.৮৯ |

একই উদাহরণের আরও দুটো রূপ চালাতে হবে: (ক) #২ আগের মাসে হলে posting আটকাবে; (খ) নষ্ট ৮ kg আর tolerance ৫% হলে ৩ kg-এর cost Abnormal Loss-এ যাবে এবং unit cost সেই অনুযায়ী বদলাবে।

## অংশ খ-১৪: Acceptance checks

সব যাচাই isolated test DB/branch-এ; live demo read-only।

1. খ-১৩-এর সংখ্যা হুবহু মেলে, দুই রূপসহ।
2. Input একাধিক FIFO rate ও partial layer থেকে consume; output batch total exact।
3. Expense allocation এক ও একাধিক batch-এ; over-allocation ও concurrent allocation blocked; allocated source voucher edit blocked।
4. বাকি মজুরির journal থেকে allocation কাজ করে; Production নিজে Cash/Payable লেখে না।
5. Trial Balance balanced; stock valuation ও Balance Sheet inventory মেলে; P&L ও Cash Flow-তে double count নেই।
6. Backdating: পরে movement না থাকলে চলে, থাকলে কারণসহ আটকায়; cross-period opening/closing ঠিক; reversal ঠিক।
7. Repack conversion, packaging qty, rounding residual।
8. Unauthorized direct API ও cross-branch access rejected।
9. Failed/retried/concurrent save-এ duplicate movement নেই।
10. Feature বন্ধ থাকা পুরনো branch-এ আগের আচরণ অক্ষুণ্ণ (আগের মাসের রিপোর্ট আগে-পরে তুলনা)।
11. (Phase 3) ১০০+২ বিক্রি, ৫০ ফেরত → ১ ফ্রি ফেরত, টাকা ৫০-এর, stock +৫১; শেষ return-এ residual settle; ফ্রি মালের খরচ রিপোর্টে আলাদা লাইনে।

## অংশ খ-১৫: Phase ও change boundary

| Phase | কাজ | শেষের প্রমাণ |
| --- | --- | --- |
| 0 | Read-only code/schema audit (খ-২-এর তালিকা), Model A/B সিদ্ধান্ত, ক্লায়েন্ট DB-তে পুরনো module ব্যবহার আছে কি না, exact file/dependency list | খ-১৩-এর হিসাব কোন কোডে কীভাবে আসবে তার লিখিত ব্যাখ্যা |
| 1 | Manual single-output production, source-linked cost, abnormal loss, stock integration, Register ও Costing | Check ১–১০ পাস |
| 2 | Recipe, version, ঘাটতি দেখা | Recipe থেকে ভরা batch-এ check ১, ৭ পাস |
| 3 | Sales free goods, scheme, returns | Check ১১ পাস |
| 4 | Purchase free goods | Purchase free দিয়ে check ২ পাস |

- পুরনো Manufacturing module মোছা হবে না; নতুন flow তার hardcoded account/year id ব্যবহার করবে না।
- শুধু অনুমোদিত phase-এর কোড বদলাবে। Shared engine, form বা report বদলাতে হলে exact impact দেখিয়ে আগে অনুমোদন।
- "অন্য রিপোর্ট বদলাতে হবে না" ধরে production movement রিপোর্ট থেকে বাদ দেওয়া যাবে না।
- পুরনো branch, chart ও পুরনো voucher স্বয়ংক্রিয়ভাবে migrate বা repair হবে না।
