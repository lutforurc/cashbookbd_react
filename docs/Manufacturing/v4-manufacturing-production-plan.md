---
title: "Manufacturing / Production — বাস্তবায়ন পরিকল্পনা v4"
---

**তারিখ:** ৪ নভেম্বর ২০২৬

## অবস্থা ও এই ডকের গঠন

এটা পরিকল্পনা, কোড বা ডেটা বদলের নির্দেশ নয়। v1 (২৪ অক্টোবর, আলোচনার নোট), v2 (৩ নভেম্বর, কারিগরি সংশোধন), v3 (৪ নভেম্বর, দুটো মিলিয়ে) আর [v1 নমুনা পেজ](https://claude.ai/artifact/MZdsUghGGbSzgtvAQf8ZCb) মিলিয়ে v4 লেখা। **নতুন: অংশ গ, Phase 0-এর প্রমাণ।** এতে আছে কোড আর dev DB পড়ে পাওয়া তথ্য, file:line সহ।

- **অংশ ক** মালিক ও ক্লায়েন্টের জন্য, সহজ বাংলায়।
- **অংশ খ** ডেভেলপারের জন্য, কারিগরি নিয়ম ও যাচাই।
- **অংশ গ** Phase 0-এর প্রমাণ: কোড কী বলে, আর তাতে পরিকল্পনা কোথায় বদলাল।

### মূল নিয়ম: ফর্ম আলাদা, রিপোর্ট একই (মালিক, ৪ নভেম্বর ২০২৬)

1. **এই কাজের সব এন্ট্রি ফর্ম নতুন ও আলাদা হবে।** Production, ক্রয়, বিক্রয়, ফেরত, খরচ/মজুরি, opening stock, রেসিপি, স্কিম: প্রতিটা Manufacturing ব্রাঞ্চের নিজের ফর্ম।
2. **আগের কোনো এন্ট্রি ফর্ম আপডেট বা মডিফাই হবে না।** Frontend স্ক্রিন, তার save/edit API, validation (`productValidation` সহ) বা posting কোড কিছুই নয়। আগের ফর্মে কোনো সমস্যা পাওয়া গেলেও (যেমন গ-৪, গ-৭) সেখানে ঠিক করা হবে না; নতুন ফর্ম নিজে সঠিকভাবে লিখবে।
3. **রিপোর্ট আগেরগুলোই ব্যবহার হবে।** নতুন ফর্ম একই টেবিলে লিখবে (`main_trx_master`, `acc_transaction_*`, `inventory_masters`/`inventory_details`), একই head আর একই নিয়মে, যাতে Trial Balance, P&L, Balance Sheet, Cash Flow, Ledger, Stock রিপোর্ট কোনো বদল ছাড়াই ঠিক অঙ্ক দেখায়। P&L একদম বদলাবে না। যে রিপোর্ট নতুন voucher চেনে না (যেমন Product Ledger, গ-৬), সেখানে শুধু নতুন শাখা **যোগ** হবে, আগের শাখা অপরিবর্তিত, আর আলাদা অনুমোদনে।
4. নতুন রিপোর্ট শুধু production-এর নিজের: Production Register, Batch Costing, trace।

এর মানে, নিচে যেখানে v3 "আগের ফর্মে নতুন ঘর" বা "আগের ফর্মের কোড বদল" বলেছিল, v4-এ সেটা নতুন ফর্ম।

### Phase 0-এর অবস্থা

| Phase 0-এর কাজ (খ-১৫) | অবস্থা |
| --- | --- |
| Read-only code/schema audit | **শেষ** (dev DB `krishibitandatabase` ও কোড, ৪ নভেম্বর)। অংশ গ |
| Model A/B সিদ্ধান্ত | **Model A নিশ্চিত, B বাদ** (গ-২)। তবে gross profit কীভাবে দেখাবে, সেটা মালিকের সিদ্ধান্ত (ক-২ #১২) |
| ক্লায়েন্ট DB-তে পুরনো module ব্যবহার | **বাকি।** চালানোর query গ-৯-এ দেওয়া আছে |
| Exact file/dependency list | **শেষ** (গ-১০) |
| খ-১৩-এর হিসাব কোন কোডে কীভাবে আসবে | **শেষ** (গ-৮)। v3-এর সংখ্যা হুবহু আসে না, সংশোধিত সংখ্যা খ-১৩-এ |

**কাজ শুরুর আগে বাকি:** ক্লায়েন্ট DB-র query-র ফল, আর মালিকের সিদ্ধান্ত। বিশেষ করে নতুন দুটো: #১২ (gross profit) আর #১৩ (sales return-এর দাম)।

### v3 থেকে কী বদলাল

1. **Worked example-এর সংখ্যা সংশোধন।** Stock-এর দাম দুই দশমিকে রাখা হয়, তাই ১৭১.১৫৭৮৯… রাখা যায় না। Closing ৮,৫৫৭.৮৯ নয়, ৮,৫৫৮.০০; লাভ ১,২৯৭.৮৯ নয়, ১,২৯৮.০০ (গ-৩, খ-১৩)।
2. **Gross profit v3-এর মতো আসবে না।** P&L-এর trading account শুধু নির্দিষ্ট কয়েকটা head পড়ে; Factory Labour নিচে খরচের ভাগে যায়। Net profit ঠিক থাকে, gross profit বড় দেখায়। P&L বদলানো নিষেধ, তাই মালিককে বাছতে হবে (গ-২, ক-২ #১২)।
3. **Sales return এখন বিক্রির দামে stock-এ ঢোকে, খরচের দামে নয়।** এটা আজকের সব branch-এর সমস্যা, production-এর নয়; কিন্তু এর জন্য worked example ১৪৪.২০ টাকা বেশি লাভ দেখায় (গ-৪, ক-২ #১৩)।
4. **Model B বাদ।** বইয়ে কোনো stock account নেই; "Dr Inventory" লেখার জায়গাই নেই (গ-২)।
5. **FIFO helper তারিখ মানে না।** Production-এর জন্য তারিখ-নির্ভর FIFO পড়া আলাদা লিখতে হবে; shared helper বদলানো নয় (গ-৫)।
6. **Product Ledger-এ production দেখাতে নতুন শাখা লাগবে** (গ-৬)। Shared report বদল, তাই আগে অনুমোদন।
7. **Unit conversion-এর আলাদা কোনো table নেই** (গ-৭)।
8. **কয়েকটা পুরনো পথ পরিমাণকে পূর্ণসংখ্যা করে ফেলে।** Opening stock, sales return আর পুরনো transfer path-এ ১২.৫ কেজি হয়ে যায় ১২ (গ-৭)। নতুন ফর্ম এই পথ ব্যবহার করবে না।
9. **সব এন্ট্রি ফর্ম আলাদা, আগের ফর্ম অপরিবর্তিত, রিপোর্ট একই** (উপরের মূল নিয়ম)। ফলে sales return, free goods, opening stock আর মজুরির জন্যও নতুন ফর্ম; আগের ফর্মে guard বা নতুন ঘর বসানোর পরিকল্পনা বাদ।

## অংশ ক-১: এক নজরে

নতুন ব্রাঞ্চে একটা নতুন ভাউচার "Production Entry" দিয়ে তিনটে কাজই হবে: কাঁচামাল থেকে পণ্য বানানো, বড় প্যাকেট ভেঙে ছোট প্যাকেট, আর কম্বো প্যাক। পুরনো ব্রাঞ্চে কিছু বদলাবে না।

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

**নমুনা ১, মশলা মিক্স:** মরিচ ৬০ কেজি (৭,২০০) + হলুদ ৪০ কেজি (৬,০০০) + মজুরি ও অন্যান্য ৩,০৬০ = ১৬,২৬০ টাকা। ভালো মাল ৯৫ প্যাকেট (১ কেজি), নষ্ট ৫ কেজি (৫%)। প্রতি প্যাকেট ১৭১.১৬ টাকা। (সিস্টেমে ৯৪টা ১৭১.১৬ আর ১টা ১৭০.৯৬ দরে বসবে, যাতে মোট ঠিক ১৬,২৬০.০০ থাকে।)

**নমুনা ২, চিনি repack:** ১ বস্তা ৫০ কেজি (৬,০০০) + ১৯৮টা খালি প্যাকেট + মজুরি। ১৯৮ × ২৫০ গ্রাম = ৪৯.৫ কেজি, নষ্ট ০.৫ কেজি (১%)। প্যাকেট আর মজুরি মিলে ৯৯৪ হলে মোট ৬,৯৯৪, প্রতি প্যাকেট ৩৫.৩২। প্যাকেট এখানে **কাঁচামাল হিসেবে স্টক থেকে বেরোবে**, খরচের লাইনে আবার লেখা হবে না। নমুনা পেজে প্যাকেটকে এখনো খরচের লাইনে দেখানো আছে, সেটা বদলাতে হবে।

### কোন কাজে কোন ফর্ম

সব ফর্ম নতুন, শুধু Manufacturing ব্রাঞ্চের মেনুতে। আগের ফর্ম যেমন আছে তেমন থাকবে।

| কাজ | নতুন ফর্ম | ধাপ | যে আগের ফর্মের বদলে |
| --- | --- | --- | --- |
| কাঁচামাল, বড় প্যাকেট, খালি প্যাকেট/লেবেল কেনা | **Production Purchase** | ১ | Purchase Invoice |
| মজুরি ও কারখানার খরচ (নগদ বা বাকি) | **Production Expense** | ১ | Payment Voucher / Journal |
| বাকি মজুরি পরিশোধ | **Production Expense** (পরিশোধ মোড) | ১ | Payment Voucher |
| শুরুর কাঁচামাল (opening stock) | **Production Opening Stock** | ১ | Item-এর opening stock |
| মাল তৈরি / প্যাকেট বদল / কম্বো | **Production Entry** | ১ | নতুন কাজ |
| তৈরি পণ্য বিক্রি | **Production Sales** | ১ | Sales Invoice |
| বিক্রির ফেরত | **Production Sales Return** (খরচের দামে) | ১ | Sales Return |
| রেসিপি সেট করা | **Recipe** | ২ | নতুন কাজ |
| বিক্রিতে ফ্রি, স্কিম | **Production Sales**-এ ফ্রি ঘর + **স্কিম সেটআপ** | ৩ | নতুন কাজ |
| ক্রয়ে ফ্রি | **Production Purchase**-এ ফ্রি ঘর | ৪ | নতুন কাজ |
| পুরনো ব্রাঞ্চ থেকে কাঁচামাল আনা | ক-২ #১৪ দেখুন | — | Branch Transfer |

**রিপোর্ট আগেরগুলোই:** Trial Balance, P&L, Balance Sheet, Cash Flow, Ledger, Stock রিপোর্ট। নতুন ফর্ম একই টেবিলে একই নিয়মে লেখে বলে এগুলো বদল ছাড়াই নতুন ব্রাঞ্চের অঙ্ক দেখাবে। নতুন রিপোর্ট শুধু **Production Register ও Batch Costing** (ব্যাচ ধরে কাঁচামাল, খরচ, প্রতি ইউনিট দাম, নষ্ট)। রেসিপির চেয়ে বেশি নষ্ট হলে লাল দেখাবে।

### P&L-এ কী দেখাবে (নতুন, গ-২ থেকে)

P&L-এর উপরের অংশ (trading account) শুধু কেনা, বিক্রি, ফেরত আর opening/closing stock দেখে। মজুরি দেখায় নিচে, খরচের তালিকায়। তাই মজুরির খরচ তৈরি মালের দামে ঢুকলেও P&L-এ দেখাবে এভাবে:

- **শেষের লাভ (net profit) ঠিক থাকবে।**
- **উপরের লাভ (gross profit) মজুরির পুরো টাকাটা বেশি দেখাবে,** কারণ মজুরি নিচে বাদ যায়।

P&L রিপোর্ট বদলানো যাবে না (নিয়ম)। তাই মালিককে বাছতে হবে, ক-২ #১২।

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
| ১ | এন্ট্রি সেভ করলেই স্টক বদলাবে, নাকি কেউ অনুমোদন দেওয়ার পর? | "খসড়া" আর "পোস্ট" দুটো বোতাম; পোস্ট করলেই স্টক বদলাবে, আলাদা অনুমোদন নয় (Product In/Out-ও তাই করে) |
| ২ | মজুরি পরে দিলে কী হবে? | উৎপাদনের দিন Production Expense ফর্মে "মজুরি বাকি" লেখা, পরে টাকা দিলে একই ফর্মে পরিশোধ |
| ৩ | কোন কোন খরচ পণ্যের দামে ঢুকবে? | কারখানার মজুরি, প্যাকিং মজুরি, কারখানার পরিবহন; অফিস খরচ নয় |
| ৪ | বিদ্যুৎ-ভাড়ার মতো মাসিক খরচ ভাগ হবে? | এখন না; খরচ হিসেবেই থাকবে। এর ফলে অবিক্রিত মালের দাম একটু কম দেখাবে, আর যে মাসে খরচ সেই মাসের লাভ একটু কম দেখাবে |
| ৫ | কতটুকু নষ্ট "স্বাভাবিক"? | প্রতি পণ্যে সীমা, যেমন মশলা ৫%, চিনি ১%। বেশি হলে বাড়তিটা "অস্বাভাবিক নষ্ট", কারণ লিখতে হবে |
| ৬ | ব্যাচ নম্বর ও মেয়াদ (expiry) লাগবে? | ব্যাচ নম্বর হ্যাঁ; মেয়াদ খাদ্যপণ্য হলে হ্যাঁ। **প্রথম ধাপ শুরুর আগেই জানাতে হবে** (মেয়াদের ঘর এখন কোথাও নেই, গ-৭) |
| ৭ | পুরনো তারিখে এন্ট্রি চলবে? | চলবে, যদি সেই পণ্যের পরে কোনো লেনদেন না হয়ে থাকে |
| ৮ | ফ্রির নিয়ম সবার জন্য এক, নাকি কাস্টমার/সময়ভেদে আলাদা? | শুরুতে সবার জন্য এক, তারিখ থেকে তারিখ পর্যন্ত |
| ৯ | ফ্রি পণ্যের খরচ রিপোর্টে কোথায় দেখাবে? | বিক্রিত মালের খরচেই থাকবে; Production/ফ্রি রিপোর্টে আলাদা লাইন "ফ্রি দেওয়া মালের খরচ" (P&L নিজে বদলাবে না) |
| ১০ | ক্লায়েন্ট VAT-নিবন্ধিত? মূসক-৪.৩ জমা দেন? | ক্লায়েন্টের কাছ থেকে জানতে হবে; VAT পরামর্শকের সাথে যাচাই |
| ১১ | কাঁচামাল নতুন ব্রাঞ্চে কেনা হবে, নাকি পুরনো ব্রাঞ্চ থেকে আসবে? কাঁচামাল আর তৈরি পণ্য আলাদা গুদামে? | ক্লায়েন্টের কাছ থেকে জানতে হবে। দুটোই কোডে সম্ভব (গ-৫, গ-৭) |
| **১২** | **(নতুন) P&L-এর উপরের লাভ (gross profit) কীভাবে দেখাবে?** | **ক:** মজুরি খরচের তালিকায় থাকবে; শেষের লাভ ঠিক, উপরের লাভ মজুরির টাকা বেশি দেখাবে। Production কোনো ledger লেখে না। **খ:** Production পোস্ট করলে একটা স্বয়ংক্রিয় Journal মজুরির টাকাটা "Purchase"-এ সরিয়ে দেবে; দুটো লাভই ঠিক, কিন্তু P&L-এর "Purchase" অঙ্কে মজুরি মিশে থাকবে। **প্রস্তাব: ক দিয়ে শুরু**, কারণ এতে কোনো ledger লেখা হয় না আর ভুল হলে সহজে ধরা যায়; Production রিপোর্টে আসল gross profit আলাদা দেখাবে |
| **১৩** | **(নতুন) বিক্রির পর ফেরত আসা মাল স্টকে কোন দামে ঢুকবে?** | আগের Sales Return ফর্ম ফেরতের টাকার দামে ঢোকায় (যেমন ২০০), কেনা দামে নয় (১৭১.১৬); তাই লাভ বাড়িয়ে দেখায়। **প্রস্তাব:** নতুন **Production Sales Return** ফর্ম ফেরত মাল আসল বিক্রির FIFO খরচে ঢোকাবে; আগের ফর্ম ও পুরনো ব্রাঞ্চ যেমন আছে থাকবে। নিশ্চিত করুন: আগের Sales Return-এর এই সমস্যা আলাদা কাজ হিসেবে ঠিক করা হবে, নাকি যেমন আছে থাকবে |
| **১৪** | **(নতুন) পুরনো ব্রাঞ্চ থেকে কাঁচামাল আনা হলে কোন ফর্ম?** | আগের Branch Transfer ফর্ম FIFO খরচ ঠিকভাবে বহন করে (গ-৫), আর দুই ব্রাঞ্চের মধ্যে চলে। **প্রস্তাব:** এটা যেমন আছে, কোনো বদল ছাড়া ব্যবহার। আপনি চাইলে নতুন ব্রাঞ্চে আলাদা "Production Transfer In" ফর্ম হবে, কিন্তু পাঠানোর দিক পুরনো ব্রাঞ্চের আগের ফর্মেই থাকবে |

## অংশ ক-৩: কখন কী পাবেন

ধাপ ১ শেষ হলেই ক্লায়েন্ট আসল কাজ শুরু করতে পারবেন; বাকি ধাপ একটা একটা করে যোগ হবে, প্রতিটা শেষে দেখানো হবে।

| ধাপ | ক্লায়েন্ট কী পাবেন |
| --- | --- |
| ০. যাচাই | **কোডের অংশ শেষ (অংশ গ)।** বাকি: ক্লায়েন্ট DB-তে query চালানো আর #১২, #১৩, #১৪-এর সিদ্ধান্ত |
| ১. উৎপাদন | নতুন ব্রাঞ্চ; নতুন ফর্ম: Production Purchase, Expense, Opening Stock, Entry (রেসিপি ছাড়া), Sales, Sales Return; Production Register ও Costing রিপোর্ট; আগের তিন রিপোর্ট মেলে |
| ২. রেসিপি | রেসিপি বাছলে লাইন নিজে ভরে যাবে; কাঁচামাল কম থাকলে আগেই জানাবে |
| ৩. বিক্রিতে ফ্রি | Production Sales-এ ফ্রি ঘর, স্কিম সেটআপ, ফ্রিসহ ফেরত |
| ৪. ক্রয়ে ফ্রি | সরবরাহকারীর ফ্রি মাল ঢুকলে দাম নিজে ভাগ হবে |

যা প্রথমে থাকবে না: এক ব্যাচ থেকে একাধিক ভিন্ন পণ্য, উপজাত বা ঝরতি মাল বিক্রি, বিক্রির সময় বান্ডেল বানানো বা ভাঙা, আর মাসিক খরচের স্বয়ংক্রিয় ভাগ। মাসিক খরচ পরে চাইলে রেসিপিতে আন্দাজি হার রাখা যাবে (যেমন বিদ্যুৎ ৳২ প্রতি কেজি), মাস শেষে আসল বিলের পার্থক্য P&L-এ থাকবে; এটা আগে থেকে বানানো হবে না।

## অংশ খ-১: v1 পরিধি

- একটি batch-এ একাধিক input, **একটি** output SKU। Repack ও প্রস্তুত combo একই Production Entry।
- খালি packet/label/carton stock item হিসেবে input (`product_type` 4 "Raw Materials" বা 3 "Inventory"; 2 "Non Asset" নয়, কারণ stock walk ওটা বাদ দেয়, গ-১)।
- Manual আগে (Phase 1), Recipe পরে (Phase 2)।
- Batch reference ও production date বাধ্যতামূলক; expiry-র সিদ্ধান্ত (ক-২ #৬) প্রথম migration-এর আগে।
- বাদ: multi-output, by-product, scrap resale, WIP, sale-time bundle assembly/disassembly, automatic overhead allocation। এমন লেনদেন চুপচাপ সাধারণ batch হিসেবে নেওয়া যাবে না; UI-তে স্পষ্টভাবে আটকাবে।

## অংশ খ-২: Branch ও ভাউচার setup

| বিষয় | যা আছে (dev DB) | নিয়ম |
| --- | --- | --- |
| Business Type | `business_type` 3 = "Manufacturing Business" | id নয়, permission/feature flag দিয়ে মেনু খোলা; অন্য DB-তে id আলাদা হতে পারে |
| Branch Type | `com_branch_types` 4 = "Factory", 5 = "Branch Office" | একই |
| Inventory | General | ক্রয়-বিক্রয় General-এর স্ক্রিনে |
| ভাউচার type | `acc_vr_type` 1–26 আছে; শেষ দুটো 25 Product In, 26 Product Out | নতুন সারি "Production" যোগ (dev-এ হবে 27); কোড id নয়, নাম/marker দিয়ে খুঁজবে, Product In/Out-এর মতো |

## অংশ খ-৩: Production Entry

- **Header:** branch, server business date, server-generated voucher no., batch ref, optional recipe+version, notes, status (Draft / Posted / Reversed)।
- **Input:** product, warehouse (`godown_id`), entered unit/qty, base-unit qty, available stock (production date অনুযায়ী), consumed FIFO layers, actual cost। দাম backend ঠিক করবে; user বদলাতে পারবেন না।
- **Output:** existing SKU, qty, unit conversion, net contents, batch value, precise unit cost। নতুন SKU বানানো আলাদা কাজ (price/MRP, barcode, label সহ)।
- **Cost:** source voucher line, cost head, allocatable balance, allocated amount, explanation।
- **Wastage:** basis (kg ইত্যাদি), actual, expected (qty/%), normal অংশ, abnormal অংশ, reason। Packaging count আর material weight আলাদা।

## অংশ খ-৪: Unit, yield ও cost

প্রতি product-এর base unit ও নির্দিষ্ট conversion; packet আর kg সরাসরি যোগ নয়। Conversion-এর জায়গা এখন নেই (গ-৭), Phase 1-এ যোগ হবে।

**Unit cost = (FIFO material + allocated cost − abnormal loss cost) ÷ good output qty**

- **স্বাভাবিক loss** (recipe বা product-এর tolerance পর্যন্ত) output cost-এ absorb হয়।
- **অস্বাভাবিক loss:** posting বন্ধ নয়। Tolerance-এর বাইরের অংশের cost = (abnormal qty ÷ total input qty) × capitalizable cost; এটা output-এ ঢোকে না, reason বাধ্যতামূলক, register-এ লাল। Model A-তে (ক-২ #১২ "ক") এর জন্য ledger লেখা হয় না: cost-টা closing stock-এ না থাকায় নিজে থেকেই সেই মাসের খরচে পড়ে, আর রিপোর্টে label হিসেবে দেখায় (P&L-এর `writeOffValue()` যেভাবে দেখায়)। "খ" বাছলে স্বয়ংক্রিয় Journal-এ এটা "Abnormal Production Loss" head-এ সরবে। Product Out দিয়ে একই consumption দ্বিতীয়বার নয়।
- Mass balance শুধু তুলনাযোগ্য unit-এ; evaporation/moisture থাকলে expected yield recipe-তে।
- **দুই দশমিকের নিয়ম (নতুন, গ-৩):** `inventory_details.purchase_price` ও `stock_in` দুটোই `decimal(12,2)`। তাই output দুটো সারিতে লেখা হবে: (n − ১) unit গোল করা দামে, আর ১ unit বাকি টাকায়, যাতে মোট ঠিক থাকে। বাকি-টাকার সারি **আগে** insert হবে (ছোট `id`), যাতে FIFO-তে সেটাই আগে বিক্রি হয় আর closing stock-এ গোল দামের সারি থাকে। Input qty-ও দুই দশমিকে (১০ গ্রাম পর্যন্ত)।
- **হিসাব যাচাই:** ১৬,২৬০ ÷ ৯৫ = ১৭১.১৫৭৮৯… → ১ × ১৭০.৯৬ + ৯৪ × ১৭১.১৬ = ১৬,২৬০.০০। ৬,৯৯৪ ÷ ১৯৮ = ৩৫.৩২৩২… → ১ × ৩৫.৯৬ + ১৯৭ × ৩৫.৩২ = ৬,৯৯৪.০০। Recipe: ১০০ × ১ kg, ৪% loss → input ১০০ ÷ ০.৯৬ = ১০৪.১৬৬৭ kg, stock-এ ১০৪.১৭ kg।

## অংশ খ-৫: খরচ ও accounting model

**Model A চলবে** (গ-২-এ প্রমাণ)। Production stock বদলায়, নিজে Cash/Payable লেখে না। খরচ নেবে শুধু আগে post করা খরচের voucher line থেকে; হাতে অঙ্ক লিখে stock value বাড়ানো যাবে না।

**Model A-তে বাধ্যতামূলক:**

- Factory Labour, Packing Labour ইত্যাদি head **level-1 Expense (id 4)**-এর নিচে থাকবে, আর level-3 **Sales (7) বা Purchase (9) group-এর নিচে নয়**। ওই দুই group-এ রাখলে head-টা P&L-এর কোনো অংশেই আসে না (trading শুধু নির্দিষ্ট id পড়ে, নিচের অংশ 7 আর 9 বাদ দেয়), তখন Trial Balance আর P&L মিলবে না (গ-২)।
- Head খোঁজা হবে `sku_code` marker দিয়ে, id দিয়ে নয় (`InterBranchAccountHead`-এর ধাঁচে)। পুরনো `coa4_id = 5` "Labour Bill (Manufacturing)" ব্যবহার হবে না।
- Source expense আর production একই accounting period-এ; না হলে posting আটকাবে। নইলে খরচ এক মাসে আর closing stock-এর বাড়তি অন্য মাসে পড়ে, দুই মাসের লাভ ভুল হয়।

**Gross profit (ক-২ #১২):**

- **"ক" (প্রস্তাব):** কোনো ledger লেখা নয়। Net profit ঠিক; P&L-এর gross profit allocated খরচের পুরোটা বেশি দেখায়, আর একই অঙ্ক খরচের তালিকায় বাদ যায়।
- **"খ":** Post-এর সময় একই transaction-এ Journal: Dr Purchase (coa4 35) / Cr Factory Labour, allocated অঙ্কে। Reversal-এ উল্টো Journal। P&L-এর দুই লাভই ঠিক। কিন্তু "Purchase" অঙ্কে মজুরি মেশে, আর যে রিপোর্ট coa4 35 পড়ে (Cash Flow ইত্যাদি) সেগুলোও এই অঙ্ক দেখবে। এটা বাছলে Phase 1-এর আগে সেই রিপোর্টের তালিকা যাচাই।

**খরচ ঢোকে নতুন Production Expense ফর্ম দিয়ে:** আগের Payment Voucher বা Journal নয়। ফর্মটা একই `acc_transaction_*` টেবিলে, একই ধরনের balanced entry লেখে, তাই Ledger, Cash Book, Trial Balance, P&L আগের মতোই পড়ে। Production শুধু এই ফর্মের line থেকে allocate করবে।

**বাকি মজুরি:** নগদ দেওয়া পর্যন্ত অপেক্ষা নয়। উৎপাদনের দিন Production Expense (বাকি): Dr Factory Labour / Cr Labour Payable; Production সেই line থেকে allocate করবে। পরে Production Expense (পরিশোধ): Dr Labour Payable / Cr Cash।

**নিয়ন্ত্রণ:**

- একই source line তার allocatable balance-এর বেশি allocate নয়; concurrent allocation row lock দিয়ে আটকানো।
- Source আর production একই branch/company, valid ও open period।
- Purchase বা আগেই capitalize করা line আবার capitalize নয়।
- Allocated source voucher edit/delete হলে আটকাবে ("এই খরচ Production #… তে ব্যবহৃত")। Source যেহেতু নতুন Production Expense ফর্মের, guard সেই ফর্মেই থাকবে; আগের edit কোডে কিছু বসবে না।
- ⚠️ **Phase 1-এর শুরুতে যাচাই:** আগের voucher edit/delete স্ক্রিন (`VoucherModificationController`, Journal/Payment edit) vr_no দিয়ে নতুন ফর্মের voucher খুলতে পারে কি না। নতুন voucher নিজের `transaction_type` পাবে; আগের স্ক্রিন যদি type না দেখে যেকোনো voucher খোলে, তাহলে আগের ফর্ম না বদলে আটকানো যাবে না। তখন মালিকের সিদ্ধান্ত লাগবে (permission দিয়ে নতুন ব্রাঞ্চে আগের edit স্ক্রিন বন্ধ রাখা, যা ফর্ম বদল নয়)।
- Overhead (বিদ্যুৎ, ভাড়া) v1-এ allocate নয়; মালিকের সম্মতি (ক-২ #৪) লাগবে।

## অংশ খ-৬: Stock/FIFO integration

- **কোথায় লিখবে:** Production-এর নিজের master/detail টেবিল (নাম প্রস্তাব: `production_master`, `production_inputs`, `production_outputs`, `production_cost_allocations`), আর stock movement **`inventory_masters` + `inventory_details`-এ**, `main_trx_master.transaction_type` = নতুন "Production" type। এটাই সিস্টেমের একমাত্র stock ledger (গ-১); এখানে লিখলে closing stock, opening stock, balance sheet, shortage guard নিজে থেকেই production বুঝবে।
- **Product In/Out টেবিল নয়:** `product_out_master`/`product_in_master` ব্যবহার করলে P&L-এর write-off/receipt label-এ ভুল করে গোনা হবে।
- **Input row:** `stock_out` = qty, দাম `sales_price`-এ (Product Out-এর ২০২৬-১০-১৬-র নিয়ম মেনে, `purchase_price` = 0), প্রতিটা FIFO layer আলাদা সারি।
- **Output row:** `stock_in` = qty, `purchase_price` = unit cost (দুই সারির নিয়ম, খ-৪), `batch_no` = আসল batch ref (অন্য writer-এর মতো `date('Ymd')` নয়)।
- **FIFO পড়া:** `StockCostLayers::forIssue()` সরাসরি নয়, কারণ সেটা তারিখ মানে না আর ঘাটতিকে শেষ দামে ভরে দেয় (গ-৫)। Production-এর নিজের তারিখ-নির্ভর পড়া হবে, যা `rebuildStockTable()`-এর মতো `vr_date, m.id, d.id` ক্রম মানে। Shared class বদলানো নয়।
- Posting একটা DB transaction-এ: validate → lock stock ও cost source → FIFO consume → output layer → source links → ("খ" হলে) journal → status Posted। Error হলে সব rollback। Idempotency key দিয়ে double-click/retry-তে একবারই।
- Availability production date অনুযায়ী; future receipt দিয়ে পুরনো production নয়। **Negative stock নিষিদ্ধ।** এটা Production-এর নিজের কঠিন নিয়ম। `StockShortageGuard` শুধু branch চাইলে সতর্ক করে, আটকায় না (গ-৫)।
- **Backdating:** অনুমোদিত, যদি production date-এর পরে input বা output product-এর কোনো stock movement না থাকে এবং period খোলা থাকে। থাকলে আটকাবে ও কোন voucher-এর কারণে তা দেখাবে। একই দিনে ক্রম: `main_trx_master.id`।
- **গুদাম:** input ও output-এর warehouse আলাদা বাছা যাবে (`inventory_details.godown_id` আছে)।
- **Opening stock:** নতুন Production Opening Stock ফর্ম `inventory_details`-এ দামসহ layer লিখবে, দুই দশমিকের qty সহ। আগের Item opening stock পথ qty পূর্ণসংখ্যা করে (গ-৭), তাই সেটা এই ব্রাঞ্চে ব্যবহার হবে না। Opening-এর মূল্য P&L আগের মতোই opening stock walk থেকে পায়।
- **Transfer:** আগের Branch Transfer `inventory_details`-এ FIFO খরচসহ layer লেখে (গ-৫); ব্যবহার ক-২ #১৪ অনুযায়ী।
- **নতুন ক্রয়-বিক্রয়-ফেরত ফর্ম:** একই `inventory_details` (qty দুই দশমিক, ক্রয়ে `purchase_price`), একই ledger head (35 Purchase, 15 Sales, 19 Sales Return, 16, 23, 40) লিখবে, যাতে trading account কোনো বদল ছাড়াই পড়ে। Sales-এর `stock_out` সারিতে FIFO খরচ থাকবে; Sales Return ফেরত মাল সেই খরচে `stock_in` করবে (ক-২ #১৩)। Ledger-এর ধরন আগের Purchase/Sales যেমন লেখে হুবহু তেমন, যেটা Phase 1-এ আগের voucher-এর সঙ্গে সারি ধরে মিলিয়ে দেখা হবে।

## অংশ খ-৭: Edit, cancel ও audit

- Draft edit/delete চলবে; posted batch hard-delete নয়।
- Output বিক্রি, transfer, write-off বা অন্য production-এ ব্যবহার হলে edit/cancel বন্ধ।
- অব্যবহৃত output-এর reversal: exact input layers ফেরত, allocation মুক্ত, output layer বাতিল; reversal voucher original-এর সঙ্গে linked। Closed period-এ নয়।
- কে কখন post/reverse করেছেন সংরক্ষিত।
- ⚠️ অনেক পুরনো voucher edit-এ `inventory_details` মুছে আবার লেখে (যেমন `InventoryMasterIn::replaceDetails()`)। Production-এর FIFO link যদি কোনো purchase-এর detail row-এর `id` ধরে রাখে, সেই purchase edit হলে link ভাঙবে। তাই link রাখা হবে voucher (`main_trx_id`) + product + qty + দাম দিয়ে। Consumed layer-এর source purchase edit আটকাবে নতুন Production Purchase ফর্ম নিজে; আগের ফর্মের ঝুঁকি খ-৫-এর যাচাইয়ের মতোই।

## অংশ খ-৮: Recipe (Phase 2)

- Yield, base-unit input qty, packaging qty, expected normal loss %, optional suggested cost।
- Production-এ snapshot; batch-এ বদলালে recipe বদলায় না। Version ও effective date।
- Suggested cost কোনো posted source ছাড়া capitalize নয়; শুধু কোন source line বাছতে হবে সেটা মনে করায়।
- **ঘাটতি দেখা:** recipe ও target qty দিলে প্রতিটা input-এর প্রয়োজন বনাম available stock, কম থাকলে লাল।
- VAT প্রযোজ্য হলে recipe-র input-output অনুপাত মূসক-৪.৩-এর সঙ্গে মিলিয়ে রাখার ব্যবস্থা (খ-১০)।

## অংশ খ-৯: Free goods (Phase 3, 4)

- সব free ঘর **নতুন Production Sales / Production Purchase ফর্মে**; আগের Sales/Purchase Invoice-এ কোনো ঘর যোগ হবে না, branch setting-ও লাগবে না।
- **Same-SKU বিক্রি:** `paid_qty` ও `free_qty` আলাদা; stock out = যোগফল, charge শুধু paid।
- **Different-SKU free:** linked promotion line, zero charge। আগের `productValidation` ছোঁয়া হবে না; নতুন ফর্মের নিজের validation।
- **খরচের হিসাব:** free অংশের FIFO cost COGS-এ, তবে আলাদা চিহ্ন রেখে, যাতে Production/ফ্রি রিপোর্টে "ফ্রি দেওয়া মালের খরচ" দেখা যায়। P&L নিজে বদলাবে না।
- **Scheme:** product, threshold, free qty, repeat হবে কি না (২০০-তে ৪?), তারিখ সীমা, customer group (পরে), manual override permission; invoice-এ snapshot।
- **Return:** original line-এর সঙ্গে linked, original issue cost-এ ফেরত (ক-২ #১৩; আজকের return পথ এটা করে না, গ-৪); cumulative return original ছাড়াবে না। Rounding: প্রতি return-এ free = floor(returned paid × free ÷ paid), শেষ return-এ বাকিটা settle।
- **Purchase free (Phase 4):** same SKU-তে unit cost = মোট দাম ÷ মোট received qty; আলাদা SKU হলে rule আগে ঠিক।
- Delivery-based stock deduction চালু থাকলে invoice ও delivery-তে free দুবার কাটবে না।
- Prepared bundle = আলাদা SKU, Production দিয়ে তৈরি; disassembly v1-এ নয়।

## অংশ খ-১০: VAT (মূসক), যাচাই সাপেক্ষ

ক্লায়েন্ট VAT-নিবন্ধিত উৎপাদক হলে সাধারণত উৎপাদনের আগে মূসক-৪.৩ (উপকরণ-উৎপাদ সহগ ঘোষণা) জমা দিতে হয়, আর ক্রয়/বিক্রয়ের হিসাব মূসক-৬.১/৬.২-তে রাখতে হয়। ফ্রি পণ্যে VAT কীভাবে ধরা হবে সেটাও প্রশ্ন। এগুলো এই পরিকল্পনার পরিধিতে নয়, কিন্তু recipe ও free-goods-এর data এমনভাবে রাখতে হবে যাতে পরে এই রিপোর্ট বানানো যায়। **ক্লায়েন্টের VAT পরামর্শকের সঙ্গে নিশ্চিত করতে হবে।**

## অংশ খ-১১: Permission ও branch isolation

- প্রস্তাবিত: `production.view/create/post/reverse`, `production.report.view`; পরে `recipe.*`, `scheme.*`, `free.override`। চূড়ান্ত নাম বিদ্যমান convention অনুযায়ী।
- Menu, route ও API-তে authorization; feature-enabled branch ও company/branch ownership server-side যাচাই (`branchInReach()` আর `company_id` দুটোই, P&L যেমন করে)।
- Numeric Business Type id hardcode নয়; permission একা data scope ঠিক করবে না।

## অংশ খ-১২: রিপোর্ট

- **Production Register** (list) ও **Batch Costing** (detail): input qty/value, allocated cost ও তার source voucher, output qty, unit cost, normal ও abnormal loss qty/%, recipe-র তুলনায় variance (Phase 2)। এখানে আসল gross profit (allocated খরচসহ) দেখাবে, যেহেতু P&L "ক"-তে সেটা দেখায় না।
- **Material-to-output trace:** কোন purchase layer কোন batch-এ গেছে।
- **Product Ledger-এ production in/out আলাদা শাখা** (গ-৬)। এটা shared report বদল, আগে অনুমোদন।
- **আগের রিপোর্টই ব্যবহার হবে:** P&L, Balance Sheet, Trial Balance, Cash Flow, Ledger, Cash/Bank Book, Stock রিপোর্ট। এগুলো বদলাবে না; নতুন ফর্ম একই টেবিলে একই নিয়মে লেখে বলে নিজে থেকেই ঠিক অঙ্ক পায়। P&L একদম বদলাবে না।
- যে আগের রিপোর্ট voucher-এর ধরন ধরে সারি গড়ে (Product Ledger, `transaction_type` filter করা রিপোর্ট), সেখানে নতুন voucher দেখা না গেলে শুধু নতুন শাখা **যোগ**, আগের শাখা অপরিবর্তিত, আলাদা অনুমোদনে (গ-৬)।
- Print/PDF-এর সব text solid black; gray text নয়।

## অংশ খ-১৩: পুরো worked example (Model A, এক মাস), সংশোধিত

Phase 1-এর পাস/ফেল মাপকাঠি এটাই: test DB-তে এই লেনদেনগুলো দিলে রিপোর্টে ঠিক এই সংখ্যা আসতে হবে। শুরু: Capital ২০,০০০, Cash ২০,০০০। কোডে কোন সংখ্যা কোথা থেকে আসে, তা গ-৮-এ।

| # | লেনদেন | Ledger | Stock (`inventory_details`) |
| --- | --- | --- | --- |
| ১ | মরিচ ৬০ kg × ১২০ + হলুদ ৪০ kg × ১৫০ কেনা, নগদ | Purchase ১৩,২০০ / Cash | in: ৬০ @১২০, ৪০ @১৫০ |
| ২ | মজুরি বাকি | Factory Labour ৩,০৬০ / Labour Payable | — |
| ৩ | Production: ৯৫ × ১ kg, নষ্ট ৫ kg, #২ থেকে ৩,০৬০ allocate | "ক": কিছু না | out: ৬০ + ৪০ kg; in: ১ @১৭০.৯৬, ৯৪ @১৭১.১৬ |
| ৪ | ৫০ প্যাকেট × ২০০ বিক্রি, নগদ | Cash / Sales ১০,০০০ | out: ৫০ |
| ৫ | ৫ প্যাকেট ফেরত, নগদ ফেরত | Sales Return ১,০০০ / Cash | in: ৫ @১৭১.১৬ (ক-২ #১৩ প্রস্তাব মেনে) |
| ৬ | মজুরি পরিশোধ | Labour Payable / Cash ৩,০৬০ | — |

**প্রত্যাশিত ফল ("ক", ফেরত খরচের দামে):**

| রিপোর্ট | লাইন | টাকা |
| --- | --- | --- |
| Stock | Closing: ৫ @১৭১.১৬ + ৪৫ @১৭১.১৬ | ৮,৫৫৮.০০ |
| P&L | Net sales (১০,০০০ − ১,০০০) | ৯,০০০.০০ |
| P&L | Cost of goods sold (০ + ১৩,২০০ − ৮,৫৫৮) | ৪,৬৪২.০০ |
| P&L | Gross profit | ৪,৩৫৮.০০ |
| P&L | খরচ: Factory Labour | ৩,০৬০.০০ |
| P&L | Net profit | ১,২৯৮.০০ |
| Production রিপোর্ট | আসল gross profit (৯,০০০ − ৪৫ বিক্রিত প্যাকেটের খরচ ৭,৭০২.০০) | ১,২৯৮.০০ |
| Trial Balance | Dr: Cash ১২,৭৪০ + Purchase ১৩,২০০ + Labour ৩,০৬০ + Return ১,০০০ | ৩০,০০০.০০ |
| Trial Balance | Cr: Capital ২০,০০০ + Sales ১০,০০০ | ৩০,০০০.০০ |
| Balance Sheet | Assets: Cash ১২,৭৪০ + Stock ৮,৫৫৮ | ২১,২৯৮.০০ |
| Balance Sheet | Equity: Capital ২০,০০০ + Profit ১,২৯৮ | ২১,২৯৮.০০ |

**"খ" বাছলে যা বদলায়:** #৩-এ Journal Dr Purchase ৩,০৬০ / Cr Factory Labour ৩,০৬০। P&L-এ Purchase ১৬,২৬০, COGS ৭,৭০২.০০, gross profit ১,২৯৮.০০, Factory Labour ০, net profit ১,২৯৮.০০। Trial Balance-এ Purchase ১৬,২৬০, Labour ০, মোট একই ৩০,০০০।

**আজকের কোডে যা আসবে (ফেরত বিক্রির দামে, ক-২ #১৩ ছাড়া):** ফেরতের ৫টা ২০০ দরে ঢোকে। Closing = ১,০০০ + ৪৫ × ১৭১.১৬ = ৮,৭০২.২০; net profit ১,৪৪২.২০। অর্থাৎ ১৪৪.২০ (= ৫ × ২৮.৮৪) লাভ বেশি দেখায়, আর Check ১ ফেল করবে।

একই উদাহরণের আরও দুটো রূপ চালাতে হবে:

- **(ক) #২ আগের মাসে হলে** posting আটকাবে।
- **(খ) নষ্ট ৮ kg, tolerance ৫%:** ভালো মাল ৯২ প্যাকেট; স্বাভাবিক নষ্ট ৫ kg, অস্বাভাবিক ৩ kg। অস্বাভাবিক cost = ৩ ÷ ১০০ × ১৬,২৬০ = ৪৮৭.৮০। Output value ১৫,৭৭২.২০ ÷ ৯২ = ১৭১.৪৩৭০… → ১ @১৭১.১৬ + ৯১ @১৭১.৪৪ = ১৫,৭৭২.২০। ৪৮৭.৮০ register-এ লাল, Model A-তে সেই মাসের COGS-এ পড়ে।

## অংশ খ-১৪: Acceptance checks

সব যাচাই isolated test DB/branch-এ; live demo read-only।

1. খ-১৩-এর সংখ্যা হুবহু মেলে, দুই রূপসহ, আর ক-২ #১২-এর যে বিকল্প বাছা হয় সেটা অনুযায়ী।
2. Input একাধিক FIFO rate ও partial layer থেকে consume; output batch total exact (দুই সারির নিয়ম)।
3. Expense allocation এক ও একাধিক batch-এ; over-allocation ও concurrent allocation blocked; allocated source voucher edit blocked।
4. বাকি মজুরির journal থেকে allocation কাজ করে; Production নিজে Cash/Payable লেখে না।
5. Trial Balance balanced; stock valuation ও Balance Sheet inventory মেলে; P&L ও Cash Flow-তে double count নেই।
6. Backdating: পরে movement না থাকলে চলে, থাকলে কারণসহ আটকায়; cross-period opening/closing ঠিক; reversal ঠিক।
7. Repack conversion, packaging qty, rounding residual।
8. Unauthorized direct API ও cross-branch access rejected।
9. Failed/retried/concurrent save-এ duplicate movement নেই।
10. Feature বন্ধ থাকা পুরনো branch-এ আগের আচরণ অক্ষুণ্ণ (আগের মাসের P&L, Balance Sheet, Product Ledger আগে-পরে তুলনা)। আগের কোনো এন্ট্রি ফর্মের frontend বা API ফাইলে diff নেই।
11. (Phase 3) ১০০+২ বিক্রি, ৫০ ফেরত → ১ ফ্রি ফেরত, টাকা ৫০-এর, stock +৫১, original issue cost-এ; শেষ return-এ residual settle; ফ্রি মালের খরচ রিপোর্টে আলাদা লাইনে।
12. **(নতুন)** Product Ledger-এ production in/out সারি দেখায় আর running balance পরের মাসের opening-এর সঙ্গে মেলে।
13. **(নতুন)** নতুন Production Purchase/Sales/Sales Return/Expense ফর্মের voucher আগের রিপোর্টে (Ledger, Cash Book, Trial Balance, P&L, Stock) আগের Purchase/Sales/Payment voucher-এর মতোই দেখায়: একই লেনদেন দুই ফর্মে দিলে রিপোর্টের অঙ্ক এক।

## অংশ খ-১৫: Phase ও change boundary

| Phase | কাজ | শেষের প্রমাণ |
| --- | --- | --- |
| 0 | কোড/schema audit **শেষ (অংশ গ)**; বাকি: ক্লায়েন্ট DB query (গ-৯), ক-২ #১২, #১৩ ও #১৪ | গ-৯-এর ফল লেখা, তিন সিদ্ধান্ত লেখা |
| 1 | নতুন ফর্ম: Production Purchase, Expense, Opening Stock, Entry, Sales, Sales Return; manual single-output production, source-linked cost, abnormal loss, stock integration, Product Ledger শাখা, Register ও Costing | Check ১–১০, ১২, ১৩ পাস |
| 2 | Recipe, version, ঘাটতি দেখা | Recipe থেকে ভরা batch-এ check ১, ৭ পাস |
| 3 | Sales free goods, scheme, returns | Check ১১ পাস |
| 4 | Purchase free goods | Purchase free দিয়ে check ২ পাস |

- পুরনো Manufacturing module মোছা হবে না; নতুন flow তার hardcoded account/year id ব্যবহার করবে না।
- **আগের কোনো এন্ট্রি ফর্ম (স্ক্রিন, API, validation, posting) বদলাবে না;** সব এন্ট্রি নতুন ফর্মে।
- শুধু অনুমোদিত phase-এর কোড বদলাবে। Shared engine বা report-এ কিছু যোগ করতে হলে exact impact দেখিয়ে আগে অনুমোদন (তালিকা গ-১০)।
- **P&L Account (`profitLossData`, `ProfitLoss.tsx` ও তার report/print) একদম বদলাবে না।** বাকি সব এর সঙ্গে মিলবে।
- "অন্য রিপোর্ট বদলাতে হবে না" ধরে production movement রিপোর্ট থেকে বাদ দেওয়া যাবে না।
- পুরনো branch, chart ও পুরনো voucher স্বয়ংক্রিয়ভাবে migrate বা repair হবে না।

## অংশ গ: Phase 0-এর প্রমাণ

উৎস: `D:\www\cashbook_api` (backend) ও `D:\cashbookbd_react` (frontend), dev DB `krishibitandatabase`, ৪ নভেম্বর ২০২৬। Line নম্বর এই তারিখের। Dev DB থেকে পাওয়া তথ্য ক্লায়েন্ট DB-তে আবার মেলাতে হবে (গ-৯)।

### গ-১: Stock-এর একটাই ledger আছে

- **`inventory_details` হলো stock ledger।** প্রতিটা সারি একটা movement: `stock_in`, `stock_out`, `purchase_price`, `sales_price`, `godown_id`, `batch_no`, `batch_date`। সারিটা `inventory_masters` → `main_trx_master` (`vr_date`, `branch_id`, `company_id`, `status`, `transaction_type`)-এর সঙ্গে যুক্ত।
- Purchase, sale, return, transfer, Product In/Out, opening stock সবাই এখানে লেখে (৩০টার বেশি writer, যেমন `TradingPurchaseController.php:824`, `ProductInPosting.php:374`, `InventoryTransferMaster.php:147`)।
- **Closing ও opening stock:** `ReportsController::rebuildStockTable()` (`ReportsController.php:8012`) এই টেবিল থেকে প্রতিবার নতুন করে হিসাব করে। প্রতি product-এর balance = Σin − Σout; সবচেয়ে নতুন layer থেকে পিছনে হাঁটে (`vr_date DESC, m.id DESC, d.id DESC`), দাম `purchase_price`। Filter: `product_type <> 2`, `status = 1`, company + branch।
- **বইয়ে কোনো stock account নেই।** `ProductInPosting.php:26` লিখে রেখেছে: closing stock প্রতিটা রিপোর্ট `inventory_details` থেকে নতুন করে বের করে।
- **ফল:** Production যদি `inventory_details`-এ লেখে, closing/opening stock, Balance Sheet stock, Cash Flow (`CashFlowStatementController`), `TradingStockLedger`, `StockShortageGuard` নিজে থেকেই production বুঝবে। যে রিপোর্ট নির্দিষ্ট master টেবিল ধরে সারি গড়ে (গ-৬), শুধু সেগুলোয় হাত দিতে হবে।

### গ-২: P&L-এর formula, আর Model A/B

`ReportsController::profitLossData()` (`ReportsController.php:7549`):

- **Trading অংশ** শুধু এই level-4 head পড়ে: 15 Sales, 16 Purchase Return, 18 Opening Stock, 19 Sales Return, 21 Closing Stock, 23 Sales Discount, 35 Purchase, 40 Purchase Discount (`:7664`)। Opening (18) আর closing (21) ledger থেকে নয়; `product_opening_stock`/`product_closing_stock` থেকে বানানো সারি (`:7583–7600`)।
- **Frontend হিসাব** (`ProfitLoss.tsx:312–317`): gross profit = (closing + net sales + goods issued) − (opening + net purchase + goods received)। Net purchase = 35 − 16 − 40।
- **নিচের অংশ** (`:7686–7709`): level-1 3 (Income) ও 4 (Expense)-এর সব head, তবে level-3 7 (Sales) ও 9 (Purchase) বাদ, inter-branch marker বাদ।
- **অর্থ:** কোনো "Direct Expense in trading" নেই। Factory Labour যেখানেই রাখা হোক, P&L-এ সেটা gross profit-এর নিচে বসে। আর head-টা level-3 7 বা 9-এর নিচে রাখলে trading-এ আসে না (id তালিকায় নেই), নিচের অংশেও আসে না (group বাদ)। তখন P&L থেকে পুরো উধাও হয়, Trial Balance-এ থাকে।
- **Model A নিশ্চিত:** P&L = opening + purchase − closing (stock walk থেকে)। Production stock layer-এ allocated খরচ যোগ করলে closing বাড়ে, আর খরচের head সেই অঙ্ক কমায়; net-এ কাটাকাটি।
- **Model B বাদ:** "Dr Inventory Adj" লেখার মতো কোনো stock head trading-এ পড়া হয় না। লিখলে সেই অঙ্ক closing stock-এর সঙ্গে দ্বিতীয়বার গোনা হতো, বা কোথাও আসত না।
- **P&L বদলানো নিষেধ** (মালিকের নিয়ম, ৩ নভেম্বর ২০২৬)। তাই gross profit ঠিক দেখাতে হলে একমাত্র উপায় ledger-এ অঙ্কটা Purchase (35)-এ সরানো। এটাই ক-২ #১২-এর "খ"।

### গ-৩: দাম দুই দশমিকে

- `inventory_details.purchase_price`, `sales_price`, `stock_in`, `stock_out` সবই `decimal(12,2)` (schema, dev DB)।
- তাই ১৭১.১৫৭৮৯… রাখা যায় না। এক সারিতে ৯৫ @১৭১.১৬ লিখলে মোট হয় ১৬,২৬০.২০, ২০ পয়সা বেশি।
- সমাধান: দুই সারি (খ-৪)। `rebuildStockTable()` নিজেও হিসাব hundredths-এ করে (`:8073`), তাই দুই সারির মোট ঠিক থাকবে।
- v3-এর closing ৮,৫৫৭.৮৯ এই কারণে আসা সম্ভব নয়; সংশোধিত ৮,৫৫৮.০০।

### গ-৪: Sales return stock-এ কোন দামে ঢোকে

- `SalesReturnController` → `InventoryMasterIn::InventoryMaster()` / `replaceDetails()` (`InventoryMasterIn.php:62–95`)।
- লেখে `stock_in = (int)$r['qty']`, `purchase_price = (int)$r['price']`। এখানে `price` হলো ফেরতের দাম, যেটা `inventory_sales_return_details.return_price`-এও যায় (`SalesReturn.php`)।
- সেই একই অঙ্ক stock layer-এর দাম আর ledger-এর ফেরত টাকা। তাই ফেরত মাল কেনা দামে নয়, বিক্রির দামে stock-এ ঢোকে, আর সবচেয়ে নতুন layer হওয়ায় closing stock-এ প্রথমে পড়ে।
- `(int)` দুটোই ভগ্নাংশ কেটে দেয়: ১২.৫ কেজি হয় ১২, ১৭১.১৬ টাকা হয় ১৭১।
- **ফল:** worked example-এ ১৪৪.২০ বেশি লাভ। এটা সব branch-এ আজকের আচরণ; production নতুন কিছু ভাঙছে না। Check ১ পাস করাতে নতুন Production Sales Return ফর্ম খরচের দামে লিখবে; আগের ফর্ম অপরিবর্তিত (ক-২ #১৩)।

### গ-৫: FIFO helper, transfer, opening stock, shortage

- **`StockCostLayers::forIssue()`** (`StockCostLayers.php:33`): branch-এর সব receipt `ids.id` ক্রমে নেয় (`receiptRows()`), তারিখ দেখে না। সব `stock_out` যোগ করে আগে বাদ দেয়, ভবিষ্যতের তারিখেরটাও। ঘাটতি থাকলে বাকিটা শেষ দামে ধরে, শূন্য নয়। Company filter নেই, শুধু branch।
  - তাই backdated production-এ এটা ভুল layer দেবে; আর ঘাটতি আটকায় না। Production-এর তারিখ-নির্ভর পড়া আলাদা লিখতে হবে (খ-৬)।
  - এছাড়া এটা `id` ক্রমে চলে, আর closing walk চলে `vr_date` ক্রমে। Backdated purchase থাকলে দুটো আলাদা layer দেখতে পারে। এটা আজকের shared আচরণ; production-এ নিজের পড়া একই `vr_date` ক্রম মানবে।
- **Branch transfer:** `InventoryTransferMaster::postTransferStock()` (`InventoryTransferMaster.php:105–153`) পাঠানো দিকে `forIssue()`-এর FIFO layer, গ্রহণ দিকে `forReceive()` দিয়ে issue-র একই দাম লেখে। Ledger-এ `InterBranchPosting` marker head-এ লেখে, আর P&L সেটা goods issued/received হিসেবে পড়ে (`ReportsController.php:7870`)। **ফল: পুরনো branch থেকে আনা কাঁচামাল আসল FIFO খরচ নিয়ে আসে।** একই ফাইলের পুরনো পথ (`:65`) qty-কে `(int)` করে; transfer screen কোন পথ ব্যবহার করে তা Phase 1-এ নিশ্চিত।
- **Opening stock:** `ItemController.php:3297–3315` `inventory_details`-এ `stock_in` + `purchase_price = rate` লেখে, কিন্তু qty `(int)` (`:3297`)। Bulk upload (`ItemUploadController.php:521, 1008`) আলাদা পথ।
- **Shortage:** `StockShortageGuard` branch চাইলে শুধু সতর্ক করে, `allow_negative` দিলে চলে যায়। Production-এ এই নরম নিয়ম চলবে না।

### গ-৬: যে রিপোর্টে হাত দিতে হবে

- **Product Ledger** (`ReportsController::productLedgerData()`, `:6147`): opening আসে `inventory_details` থেকে, কিন্তু period-এর সারি গড়ে ছয়টা নির্দিষ্ট উৎসের union থেকে। এর মধ্যে Product Out/In ধরা হয় নিজের master টেবিল দিয়ে (`:6265–6310`)। Production সেই ছয়ের কোনোটায় নেই। ফলে এই মাসে production-এর সারি দেখাবে না, অথচ পরের মাসের opening-এ ঢুকে যাবে, আর running balance ভাঙবে। **সপ্তম শাখা লাগবে।**
- **`writeOffValue()` / `receiptValue()`** (`:7780`, `:7824`): শুধু label, কোনো মোটে যোগ হয় না। Production-এর নিজের master থাকায় এগুলোয় ঢুকবে না, আর ঢোকা উচিতও নয়।
- **যেসব রিপোর্ট `transaction_type` দিয়ে filter করে** (Cash/Bank book, Journal ইত্যাদি: `whereIn(transaction_type, [1, 2])`, `= 5`): এগুলো ledger-এর রিপোর্ট, stock নয়। "ক"-তে production কোনো ledger লেখে না, তাই প্রভাব নেই। "খ"-তে journal-টা `transaction_type` 5 নাকি নতুন type-এ যাবে, তা ঠিক করে এই রিপোর্টগুলো যাচাই করতে হবে।
- Phase 1-এর শুরুতে বাকি stock-পড়া রিপোর্টের (`stockLedgerData()` `:3186`, `productProfitLossPeriodInLayers()` `:9927`, `DashboardSummaryService`, `DailyAccountBook`, `VoucherRegister`) প্রতিটায় নতুন type-এর একটা test voucher দিয়ে আগে-পরে তুলনা।

### গ-৭: Unit, batch, expiry, পূর্ণসংখ্যার ঝুঁকি

- **Unit:** `product_items`-এ `unit_id` (stock unit), `package_unit_id` + `package_size`, `measurement_unit_id` + `measurement` (`decimal(18,3)`), `pack_size_id` (`product_pack_size`, dev-এ ৭ সারি) আছে। কিন্তু "১ বস্তা = ৫০ kg" ধরনের conversion table নেই, আর কোনো stock writer এই ঘরগুলো দিয়ে qty রূপান্তর করে না। Phase 1-এ দুটো পথের একটা লাগবে: (ক) `measurement` + `measurement_unit_id`-কে net contents হিসেবে ব্যবহার, যদি ক্লায়েন্টের ডেটায় এগুলো ভরা থাকে; নয়তো (খ) ছোট নতুন conversion table। কোনটা, তা ক্লায়েন্ট DB দেখে ঠিক হবে (গ-৯)।
- **Batch:** `inventory_details.batch_no`, `batch_date` আছে, কিন্তু writer-রা সাধারণত `date('Ymd')` বসায়। Production আসল batch ref লিখবে।
- **Expiry:** কোথাও কোনো ঘর নেই। লাগলে নতুন কলাম বা production-এর নিজের টেবিলে (ক-২ #৬)।
- **পূর্ণসংখ্যায় কাটা পথ:** sales return qty ও দাম (`InventoryMasterIn.php`), opening stock qty (`ItemController.php:3297`), পুরনো transfer qty (`InventoryTransferMaster.php:65`), পুরনো Manufacturing (`Manufacturing.php:202, 229`)। কেজির কাঁচামালে ভগ্নাংশ হারাবে। নতুন ফর্মগুলো এই পথ ব্যবহার করবে না, দুই দশমিকে লিখবে; আগের পথ যেমন আছে থাকবে।
- **Warehouse:** `inventory_details.godown_id` আছে, `inventory_godown` টেবিল আছে। আলাদা কাঁচামাল/তৈরি মালের গুদাম সম্ভব।

### গ-৮: Worked example কোন কোডে কীভাবে আসে

Phase 0-এর শেষের প্রমাণ (খ-১৫) এটাই: খ-১৩-এর প্রতিটা সংখ্যা কোথা থেকে আসে।

| সংখ্যা | কোথা থেকে |
| --- | --- |
| Purchase ১৩,২০০ | Purchase voucher-এর ledger line coa4 35 → `profitLossData()` trading (`:7626–7658`) → `ProfitLoss.tsx:274` |
| Factory Labour ৩,০৬০ | Journal line (Expense head, group 7/9-এর বাইরে) → `profitLossData()` নিচের অংশ (`:7686`) → `ProfitLoss.tsx:339–349` |
| Production-এর stock | নতুন `inventory_details` সারি: input `stock_out` ৬০ + ৪০; output `stock_in` ১ @১৭০.৯৬, ৯৪ @১৭১.১৬ |
| Sales ১০,০০০ / Return ১,০০০ | ledger coa4 15 / 19 → trading → `ProfitLoss.tsx:289, 295` |
| Closing ৮,৫৫৮.০০ | `rebuildStockTable('product_closing_stock', …, inclusive)` (`:8012`): balance ৯৫ − ৫০ + ৫ = ৫০; নতুন থেকে হাঁটে: return সারি ৫ @১৭১.১৬, তারপর ৯৪-সারির ৪৫ @১৭১.১৬ → `:7597` সারি coa4 21 → `ProfitLoss.tsx:271` |
| Gross profit ৪,৩৫৮.০০ | `ProfitLoss.tsx:312–316`: (৮,৫৫৮ + ৯,০০০) − (০ + ১৩,২০০) |
| Net profit ১,২৯৮.০০ | `ProfitLoss.tsx:422–425`: ৪,৩৫৮ − ৩,০৬০ |
| Balance Sheet stock | একই `product_closing_stock` টেবিল |
| Trial Balance | শুধু ledger; production "ক"-তে কিছু লেখে না, তাই ৩০,০০০ = ৩০,০০০ |
| আজকের কোডে ৮,৭০২.২০ | `InventoryMasterIn.php`-এ return সারি `purchase_price = 200` (গ-৪) |

Production-এর ৯৪-সারি closing-এ থাকে আর ১-সারি আগে বিক্রি হয়, কারণ ১-সারির `d.id` ছোট (খ-৪-এর insert ক্রম)। ক্রম উল্টো হলে closing হবে ৫ @১৭১.১৬ + ৪৪ @১৭১.১৬ + ১ @১৭০.৯৬ = ৮,৫৫৭.৮০।

### গ-৯: পুরনো Manufacturing module, আর ক্লায়েন্ট DB-তে যা দেখতে হবে

Dev DB-তে:

- `inventory_manufacturing_masters` ০, `inventory_manufacturing_details` ০, `inventory_manuf_received_masters` ০, `inventory_labour_masters` ০ সারি।
- coa4 5 "Labour Bill (Manufacturing)" (level-3 32 "Manufacturing Labour") আছে, posting ০।
- `acc_vr_type` 16 "Rice Processing" আর 6 "Labour Invoice" আছে, পুরনো module-এর।
- Code: `ManufacturingController`, `CommonFunction/Manufacturing.php`, `ManufacturingOut.php`, `Http/Utils/ManufacturingJournal.php`, `LabourController.php:326` (এটাও `inventory_details`-এ লেখে)।

**ক্লায়েন্ট DB-তে চালানোর query** (read-only; ফল এই অংশে লিখে Phase 0 বন্ধ হবে):

```sql
SELECT 'manuf_master', COUNT(*) FROM inventory_manufacturing_masters
UNION ALL SELECT 'manuf_detail', COUNT(*) FROM inventory_manufacturing_details
UNION ALL SELECT 'manuf_received', COUNT(*) FROM inventory_manuf_received_masters
UNION ALL SELECT 'labour_master', COUNT(*) FROM inventory_labour_masters
UNION ALL SELECT 'coa4_5_postings', COUNT(*) FROM acc_transaction_details WHERE coa4_id = 5
UNION ALL SELECT 'vr_type_6_16', COUNT(*) FROM main_trx_master WHERE transaction_type IN (6, 16);

SELECT id, name FROM business_type;
SELECT id, name FROM com_branch_types;
SELECT id, name FROM acc_vr_type ORDER BY id;
SELECT id, name FROM product_types;

-- unit/net contents ভরা আছে কি না
SELECT COUNT(*) total,
       SUM(measurement IS NOT NULL AND measurement > 0) has_measurement,
       SUM(package_size IS NOT NULL AND package_size > 0) has_package_size
FROM product_items WHERE status = 1;

-- trading head-গুলোর id এই DB-তে একই কি না (P&L hardcode করে)
SELECT c4.id, c4.name, c4.acc_coa_level3_id FROM acc_coa_level4s c4
WHERE c4.id IN (15, 16, 18, 19, 21, 23, 35, 40);
```

যদি পুরনো module-এর টেবিলে সারি থাকে, সেগুলো যেমন আছে থাকবে; নতুন flow ওদের id বা head ব্যবহার করবে না, আর মালিককে জানানো হবে।

### গ-১০: Exact file/dependency list

**নতুন (production-এর নিজের):**

- Backend: migration (production tables, `acc_vr_type`-এ নতুন সারি: Production, Production Purchase, Production Sales, Production Sales Return, Production Expense, Production Opening; expense head marker); `Services/Production/` (প্রতিটা ফর্মের posting, `ProductInPosting`/`ProductOutPosting`-এর ধাঁচে); নতুন controller; তারিখ-নির্ভর FIFO পড়া (production service-এর ভিতরে); routes; permissions।
- Frontend: প্রতিটা নতুন ফর্মের স্ক্রিন (ক-১-এর তালিকা), Production Register/Costing রিপোর্ট, sidebar entry (permission দিয়ে)। আগের ফর্মের component import করে ব্যবহার চলবে, কিন্তু সেই ফাইলে কোনো বদল নয়; বদল লাগলে নতুন component।

**বিদ্যমান, শুধু পড়বে বা ব্যবহার হবে (বদলাবে না):**

- **সব আগের এন্ট্রি ফর্ম:** Purchase, Sales, Sales Return, Payment, Journal, Item/opening stock, Product In/Out, Branch Transfer; তাদের API, `productValidation`, `InventoryMasterIn`, `SalesReturnController`, `VoucherModificationController`
- `ReportsController::profitLossData()`, `rebuildStockTable()`, `ProfitLoss.tsx` আর P&L-এর report/print (নিষেধ)
- Trial Balance, Balance Sheet, Cash Flow, Ledger, Stock রিপোর্ট
- `StockCostLayers`, `StockShortageGuard`, `TradingStockLedger`, `InterBranchPosting`

**বিদ্যমান, শুধু যোগ করতে হবে (প্রতিটা আলাদা অনুমোদনে):**

| ফাইল | কী যোগ | ঝুঁকি |
| --- | --- | --- |
| `ReportsController::productLedgerData()` | production ও নতুন ফর্মের voucher-এর শাখা (গ-৬) | শুধু যোগ; পুরনো ছয় শাখা অপরিবর্তিত |
| `transaction_type` filter করা আগের রিপোর্ট | নতুন type-এর voucher বাদ পড়লে সেই type যোগ (Check ১৩ দেখে ঠিক হবে) | শুধু তালিকায় যোগ |
| Branch setup / feature flag | Manufacturing ব্রাঞ্চে নতুন মেনু ও API চালু | id hardcode নয় |

## সূত্র

- v1: `docs/Manufacturing/v1-manufacturing-production-plan.md` (২৪ অক্টোবর)
- v2: `docs/Manufacturing/v2-manufacturing-production-plan.md` (৩ নভেম্বর)
- v3: `docs/Manufacturing/v3-manufacturing-production-plan.md` (৪ নভেম্বর); Docs সংস্করণ: [v3](https://claude.ai/artifact/XCq1oDdxrGMUyJL4nhxZsC)
- নমুনা পেজ: [প্রোডাকশন ভাউচার নকশা](https://claude.ai/artifact/MZdsUghGGbSzgtvAQf8ZCb)
- ক্লায়েন্টের প্রশ্ন: `docs/Manufacturing/manufacturing-client-questions.docx`
