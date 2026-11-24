# ধাপ ৬ — বাকি ডাটার বাংলা নাম (Product, Category, Brand, Unit, Bank, Warehouse, Hotel room)

**সোর্স:** `docs/mult-language/multi-language-plan.md` §১১ ধাপ ৬, §৪.৪, §১০
**লেখা:** 2026-11-24
**অবস্থা:** **Product সম্পন্ন (2026-11-24)** — প্যাচ মেথড, সেভ/এডিট, তালিকা, সার্চ, ফর্মের দুই ঘর সবই হয়েছে। Category / Brand / Unit / Group-এর কলাম তৈরি হয়েছে, কিন্তু তাদের নিজের ফর্মে ঘর বসানো হয়নি (পরের কাজ)।

---

## ০. কেন এই ডকুমেন্ট

`Add New Product` স্ক্রিনে বাংলা নাম লেখার ঘর নেই। এটা বাগ নয় — প্ল্যানে Product ধাপ ৬-এ, আর ধাপ ৩ (Chart of Account) ও ৪ (Customer/Supplier) শেষ হয়েছে। বাংলা *টাইপ* করা যায় (ফন্ট OK), শুধু ঘরটাই নেই।

নিচের সব কিছু আসল কোড পড়ে লেখা, অনুমান নয়:

| কী | কোথা থেকে পড়া |
|---|---|
| API রেপো | `F:\All_Database\www\cashbook_api`, branch `Language-API`, HEAD `ed343899` |
| Frontend রেপো | `F:\All_Database\cashbookbd_react`, branch `Reseller-ui` |
| ধাপ ৩-৪-এর বাস্তবায়ন | `runMultiLanguageCoaSchema()`, `runMultiLanguagePartySchema()` |
| Product কন্ট্রোলার | `app/Http/Controllers/Products/ItemController.php` |

---

## ১. সবচেয়ে গুরুত্বপূর্ণ সিদ্ধান্ত — পুরনো `bangla` কলাম

`product_items` টেবিলে **আগে থেকেই** Bijoy এনকোডিং-এর দুটো কলাম আছে:

```
product_items.bangla              -- পুরনো Bijoy বাংলা নাম
product_items.description_bangla  -- পুরনো Bijoy বাংলা বর্ণনা
```

এগুলো এখন **লেখা হয়** (`apiItem()` লাইন ১৯২২-১৯২৪, `update()` লাইন ৩৭৩-৩৭৫), আর **পড়াও হয়** (`item/bangla as bangla` — লাইন ৬৪৩, ৬৯০, ৭৫১, ৮৭৭, ৮৯৪)।

### ⚠️ নতুন কলাম যোগ করার সময় এই দুটো ছোঁয়া যাবে না

প্ল্যান §৪.৪-এর নিয়ম স্পষ্ট: **নতুন `name_local`, পুরনো `bangla` অপরিবর্তিত।** কারণ:

1. পুরনো সফটওয়্যার ও রিপোর্ট (`products_print`, `item` টেবিলের select) `bangla` পড়ে — সেগুলো ভাঙা যাবে না
2. `bangla` Bijoy এনকোডিং, নতুন `name_local` হবে **Unicode** — এক কলামে দুটো এনকোডিং রাখা যাবে না
3. §৪.৪-এর রূপান্তর ধাপ (`--bangla-convert`) আলাদা, সেটাও ধাপ ৬-এ নয়

তাই: **নতুন কলাম যোগ করুন, পুরনোতে হাত দেবেন না।** Product-এ পুরনো `bangla` ফর্ম থেকে সরানো হবে না — শুধু নতুন Unicode ঘর পাশে বসবে।

### ⚠️ একটা ফাঁদ

`update()` লাইন ২২০৬-২২০৮-এ একটা বিদ্যমান বাগ আছে:

```php
if ($request->has('bangla')) {
    $item->description = $request->description;   // ← description-এ লিখছে, bangla-তে নয়
}
```

কন্ডিশন `bangla`, কিন্তু লিখছে `description`-এ। এটা এই ধাপের কাজ নয়, কিন্তু `name_local` বসানোর সময় এই ব্লকের পাশ দিয়ে যাবেন — **স্পর্শ করবেন না**, আলাদা টিকিটে ঠিক করুন। নাহলে দুই কাজ একসাথে গুলিয়ে যাবে।

---

## ২. কোন টেবিলে কোন কলাম

`multi-language-plan.md:185-192` অনুযায়ী, আসল টেবিল নাম মডেল থেকে যাচাই করা:

| এন্টিটি | টেবিল (মডেল থেকে যাচাই করা) | নতুন কলাম |
|---|---|---|
| Product | `product_items` (`Item.php:9`) | `name_local`, `description_local` |
| Category | `product_categories` (`Category.php:9`) | `name_local` |
| Brand | `product_manufacturers` (`Manufacturer.php:9`) | `name_local` |
| Unit | `sys_inv_units` (`Unit.php:9`) | `name_local` |
| Product Group | `product_groups` (`ProductGroup.php:9`) | `name_local` |
| Warehouse (Godown) | `inventory_godown` (`Godown.php:9`) | `name_local`, `address_local` |
| Branch | `com_branches` (`Branch.php:10`) | `name_local`, `address_local` |
| Bank | ⚠️ **মডেল নেই** — খুঁজে পাননি | `name_local`, `address_local` |
| Hotel room / Hall | ⚠️ যাচাই হয়নি | `name_local` |

⚠️ Bank-এর কোনো Eloquent মডেল নেই (`app/Models`-এ পাওয়া যায়নি; শুধু `bank_reconciliations` টেবিল ব্যবহার হয়)। `BankReconciliationController` পড়ে বা `Schema::hasTable` দিয়ে আসল ব্যাংক টেবিলের নাম নিশ্চিত করুন। Hotel-ও একইভাবে বাকি। ভুল টেবিলে কলাম যোগ করলে patch নীরবে `warn` দিয়ে এগিয়ে যাবে, কিন্তু কাজ হবে না।

**ছোট রাখার পরামর্শ:** এক ধাপে সবগুলো নয়। **Product + Category + Unit** দিয়ে শুরু করুন (Product ফর্মের তিনটে ঘর এগুলোই) — বাকিগুলো পরের রিলিজে। প্রতিটা টেবিল আলাদা মেথড, আলাদা try/catch।

---

## ৩. পার্ট A — Backend (`cashbook_api`)

### A1. প্যাচ মেথড

`app/Console/Commands/AddUnitTypeToBuildingUnits.php`-এ নতুন মেথড, **ঠিক `runMultiLanguagePartySchema()`-এর ঘরানায়** (লাইন ২১৮৪০ দেখুন):

```
private function runMultiLanguageMasterDataSchema(): void
```

গঠন (হুবহু ধাপ ৪-এর মতো):

1. `$database = DB::getDatabaseName();`
2. টেবিল প্রতিটা — `if (!Schema::hasTable('product_items')) { $this->warn("… skipped {$database} -- table is not there."); continue; }` ⚠️ `continue`, `return` নয় — এক টেবিল না থাকলে বাকিগুলো যেন হয়
3. `try { … } catch (\Throwable $e) { $this->error("… failed in {$database}: " . $e->getMessage()); }`
4. কলাম যোগ — **ঠিক এই SQL** (ধাপ ৪ লাইন ২১৮৬৬ থেকে):

```php
DB::statement(
    "ALTER TABLE `product_items` ADD COLUMN `name_local` VARCHAR(155) "
    . 'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL'
);
```

- `name` কলামের দৈর্ঘ্য দেখে `VARCHAR` সাইজ ঠিক করুন (বর্তমানে `name` সাধারণত 155)
- `description_local` → `VARCHAR(512)`, `description`-এর সাথে মিলিয়ে
- **`CHARACTER SET utf8mb4` বাধ্যতামূলক** — এটাই Unicode বাংলা রাখে; `bangla` কলামে Bijoy আছে বলে ওখানে লাগেনি

5. ইনডেক্স — dhap ৪-এর মতো:

```php
$index = 'idx_product_items_name_local';
if ($this->indexExists('product_items', $index)) {
    $this->line('product_items.name_local index already present -- skipped.');
} else {
    $this->addIndexIfMissing('product_items', $index, ['name_local']);
}
```

`indexExists()` (লাইন ১৬১৩২) আর `addIndexIfMissing()` (লাইন ৮৭৮৯) আগেই আছে — নতুন কিছু লিখতে হবে না।

6. `handle()`-এ কল যোগ করুন, বর্তমান বহুভাষার ব্লকে (লাইন ১০০-১১০), `runMultiLanguageBanglaConvert()`-এর **পরে**:

```php
$this->runMultiLanguageMasterDataSchema();
```

**গুরুত্বপূর্ণ:** নতুন `try` ব্লক বানাবেন না — বিদ্যমান ব্লকে বসান। নাহলে বাকি patch-এর ভুলে এই ধাপ বাদ পড়তে পারে (প্ল্যান §৪.০)।

### A2. `apiStoreProducts` — Product সেভ

`ItemController.php` লাইন ১৬৩১। লিখুন `apiItem()`-এ (লাইন ১৯১৫), কারণ `apiStoreProducts` শেষে ওটাই ডাকে (লাইন ১৭১৭, ১৭৩৬):

```php
// লাইন ১৯২২-এর পাশে, পুরনো bangla-র ঠিক নিচে
$item->bangla             = $request->bangla ?? '';          // ছোঁবেন না
if ($request->has('name_local') && Schema::hasColumn('product_items', 'name_local')) {
    $item->name_local = $request->name_local ?: null;
}
if ($request->has('description_local') && Schema::hasColumn('product_items', 'description_local')) {
    $item->description_local = $request->description_local ?: null;
}
```

⚠️ **`Schema::hasColumn` গার্ড বাদ দেবেন না।** ধাপ ৪-এ ঠিক এভাবেই আছে (`PartyController.php:2222`)। কারণ: patch না চালানো কোনো সার্ভারে এই কোড চললে SQL error হবে।

### A3. `update()` — Product সম্পাদনা

লাইন ৩৪৯। লাইন ৩৭৩-৩৭৫-এর পাশে, **একই guard দিয়ে**। API-তে দুইটা update পথ আছে — `update()` আর `apiUpdateProduct`-জাতীয় (লাইন ২২০৪-২২৪২) — **দুটোতেই** বসাতে হবে, নাহলে নতুন করে সেভ করলে নাম থাকে, এডিট করলে মুছে যায়:

লাইন ২২০৪-এর ব্লকে (যেখানে `if ($request->has('description'))` ইত্যাদি আছে) একই ঘরানায় যোগ করুন।

### A4. পড়া — তালিকা, DDL, রিপোর্ট

**Product তালিকা** (`items()`/DataTables, লাইন ~৬৩৯):

```php
->select('item.id', 'item.name', 'item.name_local', ...)
```

**Product DDL** (লাইন ৭৫১ — `product/ddl/list`, ইনভয়েস-প্রোডাক্ট সার্চ এটা ব্যবহার করে):

```php
->select(..., 'item.name_local as name_local', ...)
```

⚠️ **`label` ফিল্ড গুলাবেন না।** ওয়েবে `label` = প্লেইন নাম (Excel import এটা দিয়ে ম্যাচ করে), `name_local` আলাদা থাকে — `ProductDropdown.tsx`-এর কমেন্টে এটা স্পষ্ট লেখা আছে। `label`-এ কোড বা বাংলা নাম মেশালে import ভাঙবে।

**সার্চ** — নাম দিয়ে খোঁজে এমন সব জায়গায় (প্ল্যান §১০.৬):

```php
->where(function ($q) use ($search) {
    $q->where('name', 'LIKE', "%{$search}%")
      ->orWhere('name_local', 'LIKE', "%{$search}%");
})
```

কোথায় কোথায় দরকার — `ItemController.php`-এ `->where('name',` / `LIKE` খুঁজে বের করুন (লাইন ২৯৭৪, ৩০৭৯, ৩০৯০ পাশে)।

**রিপোর্ট** (প্ল্যান §১০.৭): Stock, Purchase/Sales Ledger, Product Statement — `name`-এর পাশে `name_local` select করুন। আলাদা join লাগে না।

### A5. উভয়দিকে খালি রাখার নিয়ম

```php
$request->name_local ?: null
```

`?:` — ফাঁকা স্ট্রিং `null` হবে। `''` রাখলে "নেই" আর "খালি" আলাদা করা যাবে না, আর §২.৫-এর "Local Language বদলানো আটকানো" চেক ভুল ফল দেবে (`has_local_names` ট্রু হয়ে যাবে)।

---

## ৪. পার্ট B — Frontend (`cashbookbd_react`)

### B1. `AddProduct.tsx`

**প্যাটার্ন হুবহু `AddCustomerSupplier.tsx`-এর মতো** (লাইন ১০, ৫২, ২২৬, ২৬৩-২৬৪, ৬৪২-৬৪৬)। ওখানে যা করা হয়েছে:

```tsx
import LocalNameInput from '../../utils/fields/LocalNameInput';
import { useLanguage } from '../../../i18n/useLanguage';

const { localCode } = useLanguage();
```

- `formData`-তে `name_local: ''`, `description_local: ''` যোগ
- **পেলোড থেকে বাদ দিন local বন্ধ থাকলে** (লাইন ২৬৩-২৬৪-এর নিয়ম):

```tsx
const { name_local, description_local, ...rest } = payload;
const finalPayload = localCode ? { ...rest, name_local, description_local } : rest;
```

- **Product Name-এর ঠিক নিচে** (লাইন ৬২৪-এর পরে):

```tsx
<LocalNameInput
  field="name"
  value={formData.name_local}
  onChange={(value) => setFormData({ ...formData, name_local: value })}
/>
```

- **Product Description-এর ঠিক নিচে** (লাইন ৬৩৩-এর পরে) একইভাবে `description_local`

⚠️ `LocalNameInput`-এর `field` প্রপ শুধু `'address'` আর বাকি সবকে "Name (…)" ধরে (`LocalNameInput.tsx:45-49`), আর key মাত্র দুইটা আছে — `data.nameInLanguage`, `data.addressInLanguage` (`src/locales/en/common.json:33-34`)। বর্ণনার জন্য **নতুন key লাগবে**, দুই ফাইলেই:

```json
// src/locales/en/common.json  ও  public/locales/bn/common.json
"data": {
  "nameInLanguage": "Name ({{language}})",          // আছে
  "addressInLanguage": "Address ({{language}})",    // আছে
  "descriptionInLanguage": "Description ({{language}})"   // ← নতুন
}
```

তারপর:

```tsx
<LocalNameInput field="description" label={t('data.descriptionInLanguage', { language: localName })} … />
```

⚠️ `i18n:check` (স্ক্রিপ্ট আছে, `package.json:11`) **key না থাকলে ফেল করবে** — en আর bn দুইটাতেই যোগ না করলে build আটকাবে।

### B2. Edit ফর্ম

`AddProduct.tsx`-ই `id` থাকলে এডিট মোডে চলে (`useEffect` → `dispatch(editProduct(id))`, লাইন ১৭৬-১৭৮)। তাই:

- `editProduct` স্লাইস reducer-এ `name_local`/`description_local` ফর্মে তুলুন
- `productSlice.tsx`-এর `updateProduct`/`editProduct` দুইটাতেই ফিল্ড যোগ

`customerSlice.tsx`-এ ধাপ ৪-এ কীভাবে করা হয়েছে, সেটাই মডেল।

**ভালো খবর:** পেলোড বানানো হয় না — `AddProduct.tsx`-এর `formData` **সোজা পোস্ট হয়** (`productSlice.tsx:221` আর `:270` — `httpService.post(URL, data)` যেখানে `data` = `formData`)। তাই স্লাইস বদলানো লাগবে না, শুধু `formData`-তে ফিল্ড যোগ করলেই পেলোডে যাবে।

**এডিট মোডে fork:** `editProduct` (`productSlice.tsx:347`) রেসপন্স থেকে ফর্ম ভরে — কন্ট্রোলার `name_local` পাঠাচ্ছে কি না (পার্ট A4), সেটাই ঠিক করে এডিটে বাংলা নাম দেখাবে কি না।

### B3. তালিকা ও দেখানো

`Product.tsx`-এ `displayName({ name, name_local }, 'name', code)` ব্যবহার করুন — ধাপ ৩-৪-এর `DdlMultiline.tsx:421` আর `ChartOfAccountsL3.tsx:158`-এ এই হেল্পার আগেই ব্যবহৃত। নিজে `? :` লিখবেন না।

---

## ৫. কাজের ক্রম

| # | কাজ | কেন এই ক্রমে |
|---|---|---|
| 1 | ⚠️ বাকি টেবিলের আসল নাম যাচাই (Bangla/Bank/Warehouse/Hotel) | ভুল টেবিলে কলাম যোগ করলে সময় নষ্ট |
| 2 | `runMultiLanguageMasterDataSchema()` — এক টেবিল, `product_items` দিয়েই শুরু | patch আগে, নাহলে ফর্মে ঘর বসিয়ে সেভ করলে error |
| 3 | patch দুইবার চালিয়ে idempotent যাচাই | দ্বিতীয়বার "already present -- skipped" আসতে হবে |
| 4 | `apiItem()` + দুই update পথে `name_local` লিখন | সেভ/এডিট দুইটাই কাজ করবে |
| 5 | `item/ddl/list` ও তালিকায় `name_local` পাঠানো | ফর্মে ফিরে আসবে |
| 6 | `AddProduct.tsx`-এ দুই `LocalNameInput` | স্ক্রিনশটের সমস্যা এখানেই মেটে |
| 7 | এডিট মোড + তালিকা `displayName` | পূর্ণ চক্র |
| 8 | সার্চ (`name_local LIKE`) | খোঁজে পাওয়া যাবে |
| 9 | রিপোর্ট | আলাদা রিলিজেও চলবে |
| 10 | বাকি টেবিল (Category, Unit…) — একই নিয়মে | |

**১-৫ শেষ হলে** স্ক্রিনশটের ফর্মে ঘর আসবে এবং সেভ হবে। **৬ ছাড়া** ঘর থাকবে না — ঠিক এখন যেমন।

---

## ৬. পরীক্ষা

**Backend:**

- [ ] `php artisan patch:add-unit-type` — `product_items.name_local added in <db>`
- [ ] দুইবার চালালে — `already present -- skipped`, কিছু বদলায় না
- [ ] যেখানে `product_items` নেই — `warn`, patch থামে না
- [ ] Postman: `POST /api/product/store` body-তে `name_local: "সিমেন্ট"` → DB-তে UTF-8 বাংলা (মোজিবকোড নয়)
- [ ] `name_local` না পাঠালে → `null` (খালি স্ট্রিং নয়)
- [ ] `GET /api/product/ddl/list?q=সিমেন্ট` → পাওয়া যায়
- [ ] patch না চালিয়ে সেভ → SQL error নয় (guard কাজ করছে)
- [ ] পুরনো `bangla` কলাম আগের মতোই লেখা/পড়া হচ্ছে — **এটা ভাঙলে রিপোর্ট ভাঙবে**

**Frontend:**

- [ ] ভাষা সেটিংসে বাংলা বন্ধ → Product ফর্মে কোনো নতুন ঘর নেই, আগের মতোই
- [ ] বাংলা চালু → "Name (Bangla)" + "Description (Bangla)" ঘর আসে
- [ ] ফাঁকা রেখে সেভ → চলে, তালিকায় ইংরেজি নাম দেখায়
- [ ] বাংলা নাম দিয়ে সেভ → তালিকায় বাংলা দেখায় (বাংলা চালু থাকলে)
- [ ] এডিট খুললে বাংলা নাম ভরা থাকে, বদলে সেভ করলে থাকে
- [ ] `npm run build` — TS ভুল নেই
- [ ] `npm run i18n:check` — নতুন key `data.descriptionInLanguage` en+bn দুইটাতেই

---

## ৭. ইচ্ছাকৃতভাবে বাদ

- **পুরনো `bangla` → `name_local` রূপান্তর** — §৪.৪-এ আলাদা, `--bangla-convert` দিয়ে। Product-এ Bijoy ডেটা থাকলে সেটা আলাদা টিকিট
- **Excel import/export-এ `_local` কলাম** — ধাপ ৮
- **প্রিন্টে বাংলা** — ধাপ ৫
- **`label` ফিল্ডে বাংলা মেশানো** — কখনো নয়, import ভাঙবে
- **`update()`-এর বিদ্যমান `bangla`/`description` বাগ** — আলাদা টিকিট (উপরের §১ দেখুন)

---

## ৮. খোলা প্রশ্ন

1. **কোন টেবিলগুলো एकই রিলিজে?** পরামর্শ: Product + Category + Unit (Product ফর্মের তিনটে ঘর) — বাকিগুলো পরে
2. **`description_local` লাগবে কি?** প্ল্যানে আছে, কিন্তু অনেক দোকান বর্ণনা লেখেই না। দরকার না হলে বাদ দিলে কাজ কমে
3. **প্রিন্টে বাংলা নাম কখন?** ধাপ ৫-এর আগে `name_local` কেবল অন-স্ক্রিন — ইনভয়েসে ইংরেজিই থাকবে। এটা মেনে নেওয়া হচ্ছে তো?
4. **পুরনো `bangla` ডেটা** — কোন দোকানে Bijoy বাংলা নাম লেখা আছে? থাকলে সেটা রূপান্তরের আলাদা কাজ
