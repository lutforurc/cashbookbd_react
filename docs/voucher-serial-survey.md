# ভাউচার নম্বর — কোথায় কীভাবে তৈরি হয় (জরিপ)

*২০২৬-০৯-০৩। কেন্দ্রীয়করণের ধাপ ০। এই ফাইলটাই ঐ কাজের **চুক্তি** — রিফ্যাক্টরের পর*
*প্রতিটি সারির নম্বর অক্ষরে অক্ষরে আগের মতোই আসতে হবে।*

সঙ্গী নথি: [voucher-number-duplicate-analysis.md](voucher-number-duplicate-analysis.md)
— duplicate-এর কারণ ও কর্মপরিকল্পনা।

---

## ১. নম্বরের গঠন

```
1 - 26 08 01045
│    │  │   └── ক্রমিক (৫ ঘর), মাসে-মাসে আবার ১ থেকে
│    │  └────── মাস
│    └───────── সাল
└────────────── acc_vr_type: 1 Cash Receipt, 2 Cash Payment,
                             3 Sales Invoice, 4 Purchase Invoice, 5 Journal …
```

⚠️ **মুখ আর কাউন্টার আলাদা চাবিতে চলে।** মুখ বসে `$voucherType` থেকে, ক্রমিক গোনা হয়
`transaction_type` ধরে। তাই বিক্রয় (মুখ ৩) আর নগদ প্রাপ্তি (মুখ ১) **একই ধারা** ভাগ করে:

```
3-260801011 → 1-260801024 → 1-260801025
```

মালিকের নিয়ম: **ঐ ৫ অঙ্কেই ফাঁক থাকা চলবে না** — অর্থাৎ চাবিটা আজ যেমন আছে তেমনই
থাকবে, মুখ ধরে আলাদা করা যাবে না।

---

## ২. প্রতিটি জেনারেটর

`mainTransactionMaster()` সারিটা বানায়, `mainTrxNumber()` তার ক্রমিক খোঁজে — বেশির ভাগ
কন্ট্রোলারে জোড়ায় জোড়ায়।

| কোথায় | ফাংশন | মুখ | তারিখ | চাবি | scope | status=1 | ফেরত |
|---|---|---|---|---|---|---|---|
| `Helpers/helpers` | `apiMainTransactionMaster` | $voucherType | day-close / given | $transactionType | company+branch | yes | insert |
| `Helpers/helpers` | `mainTransactionMaster` | $voucherType | day-close | $voucherType | company+branch | yes | insert |
| `Helpers/helpers` | `mainTransactionMasterByRequest` | $voucherType | day-close | $voucherType | company+branch | yes | insert |
| `Helpers/helpers` | `mainTransactionMasterByRequest` | $voucherType | day-close | $voucherType | branch | yes | insert |
| `Asset/AssetIssueController` | `mainTransactionMaster` | 7 | today | 7 | branch | no | array |
| `Asset/AssetIssueController` | `mainTrxNumber` | ? | ? | 7 | branch | no | array |
| `Asset/AssetReceiveController` | `mainTransactionMaster` | 8 | today | 8 | branch | no | array |
| `Asset/AssetReceiveController` | `mainTrxNumber` | ? | ? | 8 | branch | no | array |
| `CommonFunction/Transaction` | `mainTrxNumber` | $voucherType | ? | $transactionType | branch | yes | array |
| `Inventory/CylinderTransactionController` | `mainTransactionMaster` | 14 | day-close | 3 | company+branch | no | array |
| `Inventory/CylinderTransactionController` | `mainTrxNumber` | ? | day-close | 1 | company+branch | yes | array |
| `Inventory/LabourController` | `mainTransactionMaster` | 6 | day-close | $paymentType | branch | no | insert |
| `Inventory/LabourController` | `mainTrxNumber` | ? | day-close | $paymentType | branch | yes | array |
| `Inventory/PurchaseController` | `mainTransactionMaster` | 4 | day-close | 2 | branch | no | array |
| `Inventory/PurchaseController` | `mainTrxNumber` | ? | day-close | 2 | branch | yes | array |
| `Inventory/PurchaseWithCylinderController` | `mainTransactionMaster` | 4 | day-close | 2 | branch | no | array |
| `Inventory/PurchaseWithCylinderController` | `mainTrxNumber` | ? | day-close | 2 | branch | yes | array |
| `Inventory/SalesController` | `mainTransactionMaster` | 3 | day-close | 1 | branch | no | array |
| `Inventory/SalesController` | `mainTrxNumber` | ? | day-close | 1 | branch | yes | array |
| `Inventory/SalesWithCylinderController` | `mainTransactionMaster` | 3 | day-close | 1 | company+branch | no | array |
| `Inventory/SalesWithCylinderController` | `mainTrxNumber` | ? | day-close | 1 | branch | yes | array |
| `Inventory/TradingPurchaseController` | `mainTransactionMaster` | 4 | day-close | 2 | branch | no | array |
| `Inventory/TradingPurchaseController` | `mainTrxNumber` | ? | day-close | 2 | branch | yes | array |
| `Inventory/TradingSalesController` | `mainTransactionMaster` | 3 | day-close | 1 | branch | no | array |
| `Inventory/TradingSalesController` | `mainTrxNumber` | ? | day-close | 1 | branch | yes | array |
| `Products/ItemUploadController` | `mainTransactionMaster` | 5 | day-close | 5 | branch | no | array |
| `Products/ItemUploadController` | `mainTrxNumber` | ? | day-close | 5 | branch | no | array |
| `Requisition/RequisitionController` | `mainTransactionMaster` | 9 | day-close / given | 9 | branch | no | array |
| `Requisition/RequisitionController` | `mainTrxNumber` | ? | day-close / given | 9 | branch | yes | array |
| `Tourism/TourismVisitorController` | `mainTransactionMaster` | 5 | day-close | 5 | branch | no | array |
| `Tourism/TourismVisitorController` | `mainTrxNumber` | ? | day-close | 5 | branch | yes | array |
| `Tourism/VisaController` | `mainTransactionMaster` | 5 | day-close | 5 | branch | no | array |
| `Tourism/VisaController` | `mainTrxNumber` | ? | day-close | 5 | branch | yes | array |
| `Transaction/BankPaymentController` | `mainTransactionMaster` | 2 | day-close | 2 | company+branch | no | array |
| `Transaction/BankPaymentController` | `mainTrxNumber` | ? | day-close | 2 | company+branch | yes | array |
| `Transaction/BankReceivedController` | `mainTransactionMaster` | 1 | day-close | 1 | company+branch | no | array |
| `Transaction/BankReceivedController` | `mainTrxNumber` | ? | day-close | 1 | company+branch | yes | array |
| `Transaction/JournalController` | `mainTransactionMaster` | 5 | day-close | 5 | company+branch | no | array |
| `Transaction/JournalController` | `mainTrxNumber` | ? | day-close | 5 | branch | yes | array |
| `Transaction/PaymentController` | `mainTransactionMaster` | 2 | day-close | 2 | company+branch | no | array |
| `Transaction/PaymentController` | `mainTrxNumber` | ? | day-close | 2 | company+branch | yes | array |
| `Transaction/ReceivedController` | `mainTransactionMaster` | 1 | day-close | 1 | company+branch | no | array |
| `Transaction/ReceivedController` | `mainTrxNumber` | ? | day-close | 1 | company+branch | yes | array |
| `Http/Utils/Tourism` | `mainTransactionMaster` | 5 | day-close | 5 | branch | no | insert |
| `Http/Utils/Tourism` | `mainTrxNumber` | ? | day-close | 5 | branch | yes | array |
| `Services/Installment/InstallmentDetailsService` | `mainTrxNumber` | ? | day-close | 5 | branch | yes | array |

---

## ৩. যা জরিপে ধরা পড়ল

### ৩.১ ⚠️ Cylinder-এর কাউন্টার আর টাইপ আলাদা — **দ্বিতীয় duplicate-কারণ**

`Inventory/CylinderTransactionController`:

```php
mainTrxNumber()          → ->where('transaction_type', 1)   // রসিদের ধারা থেকে ক্রমিক নেয়
mainTransactionMaster()  → 'transaction_type' => 3          // অথচ সারি লেখে টাইপ ৩ হিসেবে
```

সিলিন্ডার ভাউচার রসিদের ক্রমিক **খরচ করে**, কিন্তু নিজে টাইপ ৩ হয়ে বসে — তাই পরের বার
রসিদের কাউন্টার তাকে **দেখতেই পায় না**, আর ঐ একই নম্বর আবার বিলি হয়।

এটি `status` ফিল্টারের সমস্যা নয়, সম্পূর্ণ আলাদা পথ। ফলে ঐ ফিক্সে এটি সারবে না।

### ৩.২ status ফিল্টার সব জায়গায় নেই

`ItemUploadController`, `Asset/AssetIssueController`, `Asset/AssetReceiveController` —
এই তিনটিতে `->where('status', 1)` **নেই**। অর্থাৎ এরা ইতিমধ্যেই "নম্বর পুনর্ব্যবহার
করে না" নিয়মে চলে।

⚠️ তাই "সব জায়গা থেকে এক লাইন বাদ" কথাটা আসলে **২৪ জায়গা, ২৬ নয়** — আর আচরণ
ইতিমধ্যেই অভিন্ন নয়।

### ৩.৩ scope এক জোড়ার ভিতরেই আলাদা

| কন্ট্রোলার | সারি লেখে | ক্রমিক গোনে |
|---|---|---|
| `SalesWithCylinderController` | company+branch | branch only |
| `JournalController` | company+branch | branch only |

আজকের ডেটায় ফল একই (কোনো ব্রাঞ্চ দুই কোম্পানিতে নেই), কিন্তু বহু-কোম্পানির ইনস্টলে
এটি নীরব ফাঁদ।

### ৩.৪ তারিখের তিন উৎস

- **day-close** (`Dayclose.trx_date`) — বেশির ভাগ
- **আজকের তারিখ** (`date('Y-m-d')`) — Asset Issue / Receive
- **হাতে দেওয়া তারিখ** — Requisition, আর `apiMainTransactionMaster($vrDate)`

### ৩.৫ ফেরতের দুই আকার

- **array** — কন্ট্রোলার নিজে insert করে (৩৮টি)
- **insert করে id** — helper তিনটি, `Utils/Tourism`, `LabourController`

### ৩.৬ `Services/Installment/InstallmentDetailsService`-এও একটি কপি

সার্ভিস স্তরেও একটা `mainTrxNumber()` আছে (টাইপ ৫) — অর্থাৎ কাজটা কেবল কন্ট্রোলারের
নয়, তাই Trait দিয়ে সমাধান হবে না।

---

## ৪. এতে সার্ভিসের আকার কী দাঁড়ায়

```
App\Services\Voucher\VoucherSerial

    next(prefix, transactionType, date, scope)  → ['vr_sl', 'vr_no']
    open(prefix, transactionType, date, scope)  → সারি লিখে id
```

চারটি প্যারামিটারই **বাধ্যতামূলক**, কোনো অনুমান নয় — কারণ জরিপ দেখাচ্ছে চারটিই
জায়গাভেদে আলাদা:

| প্যারামিটার | কেন |
|---|---|
| `prefix` | ১ থেকে ১৪ পর্যন্ত হার্ডকোড, জায়গাভেদে |
| `transactionType` | কাউন্টারের চাবি; `$paymentType`-এর মতো চলমান মানও আছে |
| `date` | day-close / আজ / হাতে দেওয়া |
| `scope` | branch, না company+branch |

⚠️ **`status = 1` সার্ভিসের ভিতরে থাকবে, আর এই ধাপে সরানো হবে না** — সেটি আলাদা
সিদ্ধান্ত (বাতিল ভাউচার তালিকায় দেখানো হবে কি না)। এক কাজে দুটো মেশালে নম্বর বদলালে
দোষ কার, বোঝা যাবে না।

⚠️ **৩.১ আর ৩.২-এর অসঙ্গতিগুলোও এই ধাপে "ঠিক" করা হবে না** — হুবহু আজকের আচরণেই
সার্ভিসে তোলা হবে, প্রতিটি কল-সাইট আজ যা পাঠায় তাই পাঠাবে। ঠিক করা পরের ধাপ, আলাদা
কমিটে, যাতে কোন বদলে কোন নম্বর নড়ল তা দেখা যায়।

---

## ৫. পরের ধাপ

1. `VoucherSerial` সার্ভিস — আচরণ অপরিবর্তিত
2. `voucher_serial_check.php` — প্রতিটি কল-সাইটের ইনপুটে **পুরনো == নতুন** প্রমাণ
3. ২৬টি কল-সাইট তিন দলে স্থানান্তর
4. ২২টি `mainTrxNumber()` কপি বিদায়, `apiMainTransactionMaster` পাতলা wrapper হয়ে টিকে থাকবে
