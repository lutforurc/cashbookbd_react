# Delivery, স্টক ও ভাউচার — সংশোধনের নথি (২১ অক্টোবর ২০২৬)

এই নথিতে আছে: কী কী সমস্যা পাওয়া গেছে, কীভাবে ঠিক করা হয়েছে, মালিকের কোন সিদ্ধান্তে কী রাখা হয়েছে, আর live server-এ deploy-এর সময় কী কী চালাতে হবে।

দুটো repo-তে কাজ হয়েছে:

| Repo | Branch |
|---|---|
| `cashbook_api` (Laravel API) | `Reseller` |
| `cashbookbd_react` (React app) | `react-staging` |

---

## ১. Deploy-এর পরে যা চালাতে হবে

ক্রম অনুযায়ী চালান। প্রতিটি command বারবার চালানো নিরাপদ।

```bash
# ১) নতুন route যোগ হয়েছে (product-out/update, product-in/update)।
#    Route cache চালু থাকলে এটি না চালালে Update বোতাম "route not found" দেবে।
php artisan route:cache

# ২) আগে edit হওয়া sales invoice-এর stock row-এ বিক্রির দাম ভুল কলামে
#    (purchase_price) আছে। আগে দেখুন, তারপর ঠিক করুন।
php artisan sales:fix-edited-out-price --dry-run
php artisan sales:fix-edited-out-price

# ৩) Product Out-এর stock যে voucher-এর status-এর সাথে মেলে না, তা মেলানো।
php artisan product-out:resync --dry-run
php artisan product-out:resync

# ৪) কোনো invoice-এ বিক্রির চেয়ে বেশি delivery হয়ে আছে কিনা (শুধু দেখায়, কিছু বদলায় না)।
php artisan delivery:find-over-delivered
```

`delivery:find-over-delivered` কিছু পেলে সেটা হাতে দেখে সিদ্ধান্ত নিতে হবে। নিচে "জানা থাকা ভালো" অংশে দেখুন।

---

## ২. Sales Invoice → Delivery (Deduct stock on delivery)

যে invoice-এ "Deduct stock on delivery" চালু থাকে, সেখানে invoice save হলে stock কমে না। মাল godown থেকে বের হলে Delivery voucher দিয়ে stock কমে।

| সমস্যা | কী হতো | এখন |
|---|---|---|
| চালু delivery থাকা অবস্থায় invoice delete | invoice মুছে যেত, delivery-র stock বাদ পড়েই থাকত | চালু delivery থাকলে delete আটকায়, delivery-র নম্বর বলে দেয়। আগে Delivery স্ক্রিন থেকে cancel করতে হবে |
| Delivery API-তে permission যাচাই ছিল না | login করা যে কেউ API দিয়ে delivery বা cancel করতে পারত | `delivery.view` / `delivery.create` / `delivery.cancel` প্রতিটি endpoint-এ যাচাই হয় |
| Delivery-র তারিখ | কম্পিউটারের তারিখ বা যেকোনো পাঠানো তারিখ নিত, invoice-এর আগেরও | সবসময় branch-এর transaction date (Dayclose), পাঠানো তারিখ উপেক্ষা হয়। Invoice-এর তারিখের আগে হলে আটকায় |
| Stock কম থাকলে | শুধু একটা error, এগোনোর উপায় ছিল না | Invoice-এর মতো `StockShortageModal`: warn branch-এ Continue, block branch-এ শুধু জানায় |
| সফল delivery বা cancel-এ লাল error toast | message থাকলেই error ধরা হতো | এখন সফল হলে সবুজ বার্তা দেখায় |

### বিক্রির চেয়ে বেশি delivery — সব পথ বন্ধ

Delivery স্ক্রিন আগেও বাকির বেশি নিত না। কিন্তু অন্য তিনটি পথে বেশি মাল বের হতে পারত:

| পথ | কী হতো | এখন |
|---|---|---|
| Invoice edit-এ পাঠানো লাইনের product বদলানো | product A বের হয়েছে, invoice-এ লেখা B | পাঠানো লাইনের product বদলানো যায় না |
| Voucher Delete পাতায় delivery voucher delete | stock ফিরত, invoice তখনও "পাঠানো" দেখাত | delivery voucher সেখানে delete হয় না, Delivery স্ক্রিনে cancel করতে হয় |
| Recycle Bin থেকে cancel করা delivery ফেরানো | একই মাল দুবার delivery (১০ বিক্রি, ২০ বের) | cancel করা delivery ফেরানো যায় না, নতুন delivery দিতে হয় |

নিয়ম: **delivery বদলানোর একমাত্র দরজা Delivery স্ক্রিন।**

### Delivery Report

- shared `Table` দিয়ে দেখায়, মোট থাকে footer-এ। তারিখ `DD/MM/YYYY` আকারে।
- Print Cash Book-এর মতো: Rows ও Font ঘর, প্রতি পাতায় pad ও শিরোনাম, মোট শুধু শেষ পাতায়।
- Delivery Report খুললে Reports মেনু চিহ্নিত হয়।

---

## ৩. Sales Invoice

| সমস্যা | এখন |
|---|---|
| Edit করলে stock row-এ বিক্রির দাম `purchase_price`-এ চলে যেত, `sales_price` হতো 0 | edit-এও `sales_price`-এ যায়। পুরনো row ঠিক করতে `sales:fix-edited-out-price` |
| লাইনে warehouse খালি গেলে SQL error দিয়ে save ব্যর্থ হতো | খালি warehouse মানে "কোনো warehouse নয়" (null) |
| Submit Payment পাতায় Payment Date ঘর ছোট দেখাত | অন্য ঘরের মতো একই উচ্চতা |

---

## ৪. Product In / Product Out

### ঠিক করা সমস্যা

- **৳0 সতর্কবার্তা দেখাত না:** Product In-এর বার্তা ভুল জায়গা থেকে পড়া হচ্ছিল (`data.unpriced` → `data.data.unpriced`)।
- **Rate লোডে race:** দ্রুত পরপর product বদলালে আগের product-এর rate পরের লাইনে বসে যেত। Rate আসার আগে Add করা যায় না।
- **ভুল customer save হওয়া:** customer লাগে এমন reason বদলে অন্য reason দিলে আগের customer save হয়ে যেত। এখন হয় না।
- **কোম্পানি যাচাই:** অন্য কোম্পানির product, warehouse বা customer-এর id নেয় না (`StockSlipScope`)।
- **Approved slip delete:** API-তেও আটকায়, শুধু বোতাম লুকানো না।
- **এক product, এক rate:** একই unpriced product দুই লাইনে দুই rate দেওয়া যায় না।

### নতুন সুবিধা

- **Slip edit:** approve না হওয়া slip list থেকে Edit চেপে ফর্মে খোলা যায়, তারপর Update।
  - নম্বর, voucher আর তারিখ একই থাকে। Stock একই transaction-এ নতুন করে post হয়।
  - Audit trail (voucher-এর ইতিহাস) এখন slip-এর লাইনও রেকর্ড করে।
- **Product Out-এ ছবি:** ভাঙা মালের ছবি বা PDF slip-এর voucher-এ যুক্ত হয়। List-এর Photos কলামে দেখায়।
- **অ্যাপের নিজের ঘর:** ব্রাউজারের alert আর নেই। Delete, Approve, approval তুলে নেওয়া আর reason মোছা `ConfirmModal`-এ। Stock কম থাকলে `StockShortageModal`।

---

## ৫. Recycle Bin (নিরাপত্তা)

| সমস্যা | এখন |
|---|---|
| Restore আর স্থায়ী delete যেকোনো id নিত, অন্য কোম্পানি বা branch-এরও | শুধু নিজের কোম্পানি, নিজের branch-এর voucher |
| "স্থায়ী delete" দিয়ে **চালু** voucher-ও মুছে যেত, Voucher Delete-এর সব নিয়ম পাশ কাটিয়ে | শুধু delete অবস্থার (status 0) voucher-এ কাজ করে |
| Product In/Out ফেরালে voucher চালু হতো কিন্তু slip delete-ই থাকত, stock ফিরত না | slip আর stock দুটোই voucher-এর সাথে ফিরে আসে |

`product-out:resync`-এ একটা bug ছিল: `--dry-run` ছাড়া চালালে crash করত, কিছুই ঠিক হতো না। এখন কাজ করে।

---

## ৬. মালিকের সিদ্ধান্ত (পরিবর্তন করবেন না)

- **Customer ফেরতের দুটো পথই থাকবে:**
  - Delivery-র সময় ফেরত: Product In, "customer ফেরত" reason দিয়ে।
  - Delivery ছাড়া ফেরত: Sales Return।
- **Delivery-র তারিখ সবসময় transaction date।** Invoice-এর তারিখের পরে যেকোনো দিন delivery দেওয়া যাবে।
- **Write-off (Product Out)** stock কম থাকলেও করা যায়, শুধু জিজ্ঞেস করে। Product Out-এ কোনো তারিখের ঘর নেই।

---

## ৭. জানা থাকা ভালো

- **`delivery:find-over-delivered` কিছু পেলে:**
  - Recycle Bin থেকে ফেরানো delivery-র কারণে হলে: সেই delivery voucher আবার বন্ধ করলেই হিসাব মিলবে।
  - Invoice-এ product বদলের কারণে হলে: আসলে কোন মাল গেছে দেখে invoice ঠিক করতে হবে, নয়তো sales return দিতে হবে।
- **Voucher নম্বর পুনর্ব্যবহার:** delete হওয়া voucher-এর নম্বর নতুন voucher-এ আবার ব্যবহার হয়। এটা system-এর পুরনো আচরণ।
- **Local-এর test ডেটা:** development database-এ পরীক্ষার invoice আর delivery রয়ে গেছে (note: "SMOKE ...")। মোছার দরকার নেই।

---

## ৮. যাচাই

- **Backend:** আসল controller দিয়ে ১২টি smoke test চালানো হয়েছে, মোট ২২৪টি চেক, সব পাস।
- **Frontend:** production build, type-check আর repo-র check, সব পাস।
  - `_delivery_system_check.ts`
  - `_delivery_report_print_check.tsx`
  - `_product_out_default_reason_check.ts`
  - `_product_in_out_screens_check.mjs`

Repo-র check চালানোর নিয়ম প্রতিটি ফাইলের মাথায় লেখা আছে।

**বাকি:** নতুন স্ক্রিনগুলো ব্রাউজারে খুলে দেখা, বিশেষ করে Delivery Report-এর print, slip edit আর ছবি upload।
