প্রজেক্টে “Company & Product-wise Bill, Cash Received and Cash Payment
Tracking System” implement করতে হবে।

============================================================
১. BUSINESS OBJECTIVE
============================================================

শুধু নির্দিষ্ট Company এবং সেই Company-এর নির্দিষ্ট কিছু Product-এর জন্য
নিচের হিসাব রাখতে হবে:

1. Productটির বিপরীতে কত টাকার Sales Bill/Invoice দেওয়া হয়েছে।
2. Productটির বিপরীতে কত টাকার Purchase Bill/Invoice পাওয়া হয়েছে।
3. Productটির বিপরীতে কত টাকা Cash Received হয়েছে।
4. Productটির বিপরীতে কত টাকা Cash Payment হয়েছে।
5. Productটির বর্তমান Receivable কত।
6. Productটির বর্তমান Payable কত।
7. Date range অনুযায়ী opening, bill, received/payment এবং closing balance।

এটি সব Company বা সব Product-এর জন্য হবে না।

উদাহরণ:
- Company A + Rice Product → tracking চালু
- Company A + Pen Product → tracking বন্ধ
- Company B + Rice Product → tracking বন্ধ
- Company C + Wheat Product → tracking চালু

অর্থাৎ Company এবং Product combination অনুযায়ী featureটি opt-in হবে।

============================================================
২. NON-NEGOTIABLE DATABASE RULE
============================================================

কোনো existing/legacy database table ALTER করা যাবে না।

বিশেষভাবে:
- Existing transaction table পরিবর্তন করা যাবে না।
- Existing product table পরিবর্তন করা যাবে না।
- Existing company/tenant/branch table পরিবর্তন করা যাবে না।
- Existing Sales/Purchase invoice table পরিবর্তন করা যাবে না।
- Existing invoice detail/items table পরিবর্তন করা যাবে না।
- Existing ledger/account/voucher table পরিবর্তন করা যাবে না।
- Existing table-এ নতুন column যোগ করা যাবে না।
- Existing table-এ index, foreign key, constraint বা trigger যোগ করা যাবে না।
- Existing financial data rewrite করা যাবে না।
- Existing migration modify করা যাবে না।

প্রয়োজনীয় configuration, mapping, allocation ও audit data শুধু নতুন dedicated
table তৈরি করে রাখতে হবে।

নতুন migrationগুলো পরীক্ষা করতে হবে:
- CREATE TABLE থাকতে পারবে।
- Existing table-এর ওপর Schema::table বা ALTER TABLE থাকতে পারবে না।

============================================================
৩. EXISTING SYSTEM INSPECTION
============================================================

Implementation শুরুর আগে frontend এবং backend সম্পূর্ণ inspect করে নির্ভুলভাবে
নিচের বিষয়গুলো শনাক্ত করতে হবে:

1. Company ও tenant একই entity কি না।
2. Authenticated user থেকে company/tenant কীভাবে নির্ধারিত হয়।
3. Branch ownership কীভাবে নির্ধারিত হয়।
4. Product master table ও Product primary key।
5. Productটি কোন Company-এর তা নির্ধারণের নিয়ম।
6. Cash Received form-এর প্রতিটি Add New row কোথায় save হয়।
7. Cash Payment form-এর প্রতিটি Add New row কোথায় save হয়।
8. Individual Received/Payment row-এর permanent unique ID কোনটি।
9. Received ও Payment একই table ব্যবহার করে নাকি আলাদা table।
10. Transaction type কীভাবে শনাক্ত করা হয়।
11. Sales Invoice master ও detail/items tables।
12. Purchase Invoice master ও detail/items tables।
13. Invoice item-এর quantity, rate, discount, tax, return ও net amount
    কীভাবে হিসাব করা হয়।
14. Invoice edit/delete/return/cancel flow।
15. Existing Ledger query ও opening balance calculation।
16. Voucher search, edit, update, delete ও print flow।
17. Order selection-এর সঙ্গে invoice/product relationship।
18. Global form ও tenant form একই component/API ব্যবহার করে কি না।

Schema বা relationship অনুমান করে implementation করা যাবে না। Inspection-এর
ফলাফলের ভিত্তিতে actual table এবং field ব্যবহার করতে হবে।

============================================================
৪. ACCOUNTING DEFINITIONS
============================================================

“Sales Bill Given” বলতে নির্দিষ্ট Product-এর Sales Invoice detail-এর net
amount বোঝাবে।

“Purchase Bill Received” বলতে নির্দিষ্ট Product-এর Purchase Invoice detail-এর
net amount বোঝাবে।

“Cash Received” বলতে Cash Received transaction-এর যে amount নতুন mapping
table দিয়ে Productটির সঙ্গে যুক্ত করা হয়েছে, তার মোট বোঝাবে।

“Cash Payment” বলতে Cash Payment transaction-এর যে amount নতুন mapping
table দিয়ে Productটির সঙ্গে যুক্ত করা হয়েছে, তার মোট বোঝাবে।

মূল হিসাব:

Product Receivable =
    Sales Bill
  - Sales Return
  - Cash Received
  - Sales-side adjustment/discount, যদি existing accounting rule-এ প্রযোজ্য হয়

Product Payable =
    Purchase Bill
  - Purchase Return
  - Cash Payment
  - Purchase-side adjustment/discount, যদি existing accounting rule-এ প্রযোজ্য হয়

Sales/Purchase return, invoice discount, line discount, tax, transport charge,
rounding এবং cancellation কীভাবে ধরা হবে তা existing accounting convention
inspect করে নির্ধারণ করতে হবে। নতুন করে ভিন্ন accounting rule বানানো যাবে না।

Report-এ Gross Bill এবং Net Bill আলাদা দেখানো সম্ভব হলে দেখাতে হবে এবং কোন
formula ব্যবহার হয়েছে তা document করতে হবে।

============================================================
৫. NEW TABLE: TRACKING CONFIGURATION
============================================================

একটি নতুন table তৈরি করতে হবে। Suggested name:

company_product_tracking_settings

Suggested fields:

- id
- company_id/tenant_id
- product_id
- branch_id nullable
- track_sales_bill boolean default true
- track_purchase_bill boolean default true
- track_cash_received boolean default true
- track_cash_payment boolean default true
- is_active boolean default true
- effective_from nullable
- effective_to nullable
- created_by nullable
- updated_by nullable
- created_at
- updated_at

Actual project naming convention অনুযায়ী tenant_id অথবা company_id ব্যবহার
করতে হবে।

একই Company + Product + Branch scope duplicate হওয়া যাবে না। নতুন table-এর
মধ্যে composite unique index দিতে হবে।

Company A-এর Rice tracking চালু থাকলেও Company B-এর Rice স্বয়ংক্রিয়ভাবে
tracking চালু হবে না।

Setting-এর company এবং product ownership backend থেকে validate করতে হবে।

Client থেকে পাঠানো company_id/tenant_id বিশ্বাস করা যাবে না। Authenticated
user/context এবং authorized admin scope থেকে company নির্ধারণ করতে হবে।

Platform/global admin অন্য Company-এর setting manage করতে পারলে existing
platform-admin authorization অনুসরণ করতে হবে।

Tenant admin শুধু নিজের Company-এর settings manage করতে পারবে।

============================================================
৬. NEW TABLE: TRANSACTION–PRODUCT MAPPING
============================================================

একটি নতুন mapping table তৈরি করতে হবে। Suggested name:

transaction_product_maps

Suggested fields:

- id
- company_id/tenant_id
- branch_id nullable
- transaction_type
- transaction_id
- transaction_row_id, শুধু actual structure অনুযায়ী প্রয়োজন হলে
- product_id
- source_type nullable
- source_id nullable
- mapping_method
- created_by nullable
- updated_by nullable
- created_at
- updated_at

transaction_type-এর সম্ভাব্য value:

- cash_received
- cash_payment

source_type-এর সম্ভাব্য value:

- sales_invoice
- purchase_invoice
- sales_order
- purchase_order
- manual
- historical

mapping_method-এর সম্ভাব্য value:

- manual
- automatic_single_tracked_product
- historical_backfill
- reconciliation

একটি Cash Received/Payment row-এর সঙ্গে সর্বোচ্চ একটি Product যুক্ত করার
বর্তমান business rule থাকবে।

তাই company/tenant + transaction_type + permanent transaction row ID-এর ওপর
composite unique index দিতে হবে।

যদি existing system-এ Received এবং Payment ID collision হতে পারে, তাহলে
transaction_type অবশ্যই unique key ও query join-এর অংশ হবে।

Existing transaction table-এর ওপর কোনো foreign key বা index দেওয়া যাবে না।
নতুন mapping table-এর references indexed থাকবে।

Product table-এর দিকে foreign key দেওয়া হলেও delete cascade দিয়ে financial
transaction delete করা যাবে না। সন্দেহ থাকলে application-level reference
ব্যবহার করতে হবে।

============================================================
৭. OPTIONAL AUDIT/RECONCILIATION TABLE
============================================================

Historical ও ambiguous mapping audit করার জন্য প্রয়োজনে নতুন table:

product_tracking_reconciliation_logs

Suggested fields:

- id
- company_id/tenant_id
- branch_id nullable
- transaction_type
- transaction_id
- source_type nullable
- source_id nullable
- suggested_product_id nullable
- resolved_product_id nullable
- status
- reason nullable
- metadata JSON nullable
- resolved_by nullable
- resolved_at nullable
- created_at
- updated_at

Possible status:

- pending
- auto_mapped
- manually_mapped
- ambiguous
- source_not_found
- ignored

এই table optional; কিন্তু auditability বজায় রাখতে recommended।

============================================================
৮. COMPANY–PRODUCT TRACKING SETTINGS UI
============================================================

একটি নতুন permission-protected settings screen তৈরি করতে হবে।

Suggested UI:

Company:
[Select Company]

Products:
| Product | Sales Bill | Purchase Bill | Cash Received | Cash Payment | Active |

Actions:
- Add tracked product
- Edit setting
- Activate/deactivate
- Search
- Filter
- Pagination

Tenant admin হলে Company dropdown দেখানোর প্রয়োজন না-ও হতে পারে; authenticated
Company স্বয়ংক্রিয়ভাবে ব্যবহার করতে হবে।

Platform/global admin হলে authorized Company নির্বাচন করা যাবে।

Product dropdown-এ শুধু selected Company-এর Product দেখাতে হবে।

Setting deactivate করলে:
- নতুন mapping বা tracking বন্ধ হবে।
- পুরোনো mapping delete হবে না।
- Historical report অক্ষত থাকবে।
- প্রয়োজন হলে report-এ inactive tracked Product নির্বাচন করা যাবে।

============================================================
৯. CASH RECEIVED FORM
============================================================

Existing Cash Received form-এর কোনো বর্তমান field, behaviour, shortcut,
validation, table, save action বা accounting logic পরিবর্তন করা যাবে না।

প্রতিটি Add New transaction row-এর জন্য শুধু একটি নতুন field যোগ করতে হবে:

Select Product (Optional)

Rules:

1. Dropdown-এ শুধু current Company-এর active track_cash_received products
   দেখাবে।
2. অন্য Company-এর Product দেখানো যাবে না।
3. Branch-specific configuration থাকলে selected/current Branch অনুযায়ী
   filter করতে হবে।
4. Product নির্বাচন না করলে existing Cash Received flow আগের মতো চলবে।
5. Product নির্বাচিত হলে product_id existing transaction table-এ save করা
   যাবে না।
6. প্রথমে existing logic দিয়ে Cash Received transaction save করতে হবে।
7. Saved individual transaction row ID পাওয়ার পরে নতুন mapping table-এ
   product relation save করতে হবে।
8. Transaction এবং mapping save একই database transaction-এর মধ্যে করতে হবে।
9. Product current Company-এর এবং tracking active কি না backend validate করবে।
10. Order/Invoice selected থাকলে selected Product ঐ Order/Invoice-এর Product
    কি না validate করতে হবে।
11. Add New দিয়ে একই voucher-এর বিভিন্ন row-তে বিভিন্ন Product দেওয়া যাবে।
12. Edit করার সময় mapping table থেকে selected Product load করতে হবে।
13. Product পরিবর্তন করলে mapping update করতে হবে।
14. Product clear করলে শুধু mapping row delete করতে হবে।
15. Cash Received financial row পরিবর্তন বা delete করা যাবে না শুধু mapping
    clear করার কারণে।
16. Voucher delete হলে related mapping application-level cleanup করতে হবে।
17. Existing API client product_id না পাঠালে request আগের মতো সফল হবে।

============================================================
১০. CASH PAYMENT FORM
============================================================

Existing Cash Payment form-এর কোনো বর্তমান অংশ পরিবর্তন করা যাবে না।

প্রতিটি Add New transaction row-এর জন্য শুধু:

Select Product (Optional)

যোগ করতে হবে।

Rules:

1. Dropdown-এ শুধু current Company-এর active track_cash_payment products
   দেখাবে।
2. Product নির্বাচন না করলে existing Cash Payment flow অপরিবর্তিত থাকবে।
3. Product relation শুধু নতুন transaction_product_maps table-এ save হবে।
4. Purchase Order/Invoice selected থাকলে Product relationship backend থেকে
   validate করতে হবে।
5. Create, edit, update, clear ও delete behaviour Cash Received-এর মতো হবে।
6. Mapping operation existing financial transaction-এর সঙ্গে database
   transaction-এর মধ্যে হতে হবে।
7. অন্য Company/tenant-এর Product map করা যাবে না।

============================================================
১১. SALES AND PURCHASE INVOICE
============================================================

Existing Sales Invoice এবং Purchase Invoice form/table/schema পরিবর্তন করা
যাবে না।

কারণ invoice item/detail rows-এ Product, quantity, rate এবং amount আগে থেকেই
রয়েছে। Product-wise Bill সেই existing invoice detail data থেকেই হিসাব হবে।

Sales Invoice থেকে:

- Product-wise Sales Bill
- Quantity sold
- Gross/net sales amount
- Sales return, যদি প্রযোজ্য

Purchase Invoice থেকে:

- Product-wise Purchase Bill
- Quantity purchased
- Gross/net purchase amount
- Purchase return, যদি প্রযোজ্য

তবে invoice form-এ Received Amount অথবা Payment Amount field থাকলে save flow
inspect করতে হবে।

যদি invoice save-এর সময় automatic Cash Received/Payment transaction তৈরি হয়:

1. Invoice-এ ঠিক একটি active tracked Product থাকলে এবং generated cash amount
   পুরোপুরি সেই Product-এর জন্য বলে নিশ্চিত হওয়া গেলে mapping auto-create করা
   যাবে।
2. Invoice-এ একাধিক tracked Product থাকলে অনুমান করে mapping করা যাবে না।
3. Tracked ও untracked Product মিশ্রিত invoice হলে পুরো received/payment amount
   tracked Product-এর নামে map করা যাবে না।
4. Ambiguous payment mapping ছাড়া থাকবে অথবা reconciliation queue-তে যাবে।
5. Invoice form-এ নতুন allocation UI যোগ করা যাবে না, যদি আলাদাভাবে অনুমোদন
   দেওয়া না হয়।
6. Invoice update/delete/cancel হলে report existing invoice state অনুসরণ করবে।
7. Auto-created mapping থাকলে invoice/transaction lifecycle অনুযায়ী safeভাবে
   sync/cleanup করতে হবে।
8. কোনো invoice বা invoice detail row rewrite করা যাবে না।

============================================================
১২. PRODUCT-WISE BILL CALCULATION
============================================================

Bill হিসাব transaction mapping থেকে নেওয়া যাবে না। Bill নিতে হবে existing
invoice detail/items থেকে।

Product tracking setting active হলে report query selected Company, Product,
Branch ও date range অনুযায়ী existing invoice detail data পড়বে।

Sales Bill:
- Sales Invoice item net amount
- Cancelled/void invoice বাদ
- Sales return existing rule অনুযায়ী বাদ
- Line discount/tax existing rule অনুযায়ী apply

Purchase Bill:
- Purchase Invoice item net amount
- Cancelled/void invoice বাদ
- Purchase return existing rule অনুযায়ী বাদ
- Line discount/tax existing rule অনুযায়ী apply

এক invoice-এ একাধিক Product থাকলেও bill হিসাব করা সম্ভব, কারণ invoice detail-এ
প্রতিটি Product-এর আলাদা row ও amount আছে।

Invoice-level discount/charge যদি Product row-এ ভাগ করা না থাকে, existing
business rule inspect করতে হবে। Product-wise net bill-এর জন্য প্রয়োজন হলে
proportionate calculation শুধু report query/service layer-এ করা যাবে; existing
invoice data update করা যাবে না। Formula document এবং test করতে হবে।

============================================================
১৩. PRODUCT-WISE LEDGER/REPORT
============================================================

Existing Ledger form-এর কোনো field বাদ বা পরিবর্তন করা যাবে না।

শুধু একটি নতুন optional dropdown যোগ করতে হবে:

Select Product (Optional)

Dropdown-এ selected Company-এর configured products দেখাবে। Historical report
দেখানোর জন্য inactive configured Product অন্তর্ভুক্ত করার option রাখা যায়।

Product selected না হলে existing Ledger API, query, opening, rows, total,
balance এবং print হুবহু আগের মতো চলবে।

Product selected হলে একটি dedicated Product Financial Statement দেখাতে হবে।

Suggested summary:

- Opening Sales Receivable
- Sales Bill Given
- Sales Return
- Cash Received
- Closing Sales Receivable

- Opening Purchase Payable
- Purchase Bill Received
- Purchase Return
- Cash Payment
- Closing Purchase Payable

Detailed rows:

| Date | Voucher | Type | Description | Bill Debit | Bill Credit |
| Cash Received | Cash Payment | Balance | Action |

অথবা পরিষ্কারভাবে দুটি statement:

A. Product Receivable Statement
- Sales Bill
- Sales Return
- Cash Received
- Receivable Balance

B. Product Payable Statement
- Purchase Bill
- Purchase Return
- Cash Payment
- Payable Balance

Existing account ledger-এর debit/credit convention অন্ধভাবে reuse না করে
existing accounting rules inspect করে product statement-এর labels পরিষ্কার
রাখতে হবে।

============================================================
১৪. OPENING AND CLOSING CALCULATION
============================================================

Selected start date-এর আগের সব applicable tracked data দিয়ে opening হিসাব
করতে হবে।

Opening Receivable:

Previous Sales Bills
- Previous Sales Returns
- Previous Cash Received
- Previous applicable sales adjustments

Opening Payable:

Previous Purchase Bills
- Previous Purchase Returns
- Previous Cash Payments
- Previous applicable purchase adjustments

Date range closing:

Closing Receivable =
Opening Receivable
+ Range Sales Bill
- Range Sales Return
- Range Cash Received
- Range applicable adjustments

Closing Payable =
Opening Payable
+ Range Purchase Bill
- Range Purchase Return
- Range Cash Payment
- Range applicable adjustments

Product filter শুধু displayed rows-এ প্রয়োগ করে existing unfiltered opening
ব্যবহার করা যাবে না। Opening, range totals এবং closing—সব জায়গায় একই Company,
Product, Branch ও date filter প্রয়োগ করতে হবে।

============================================================
১৫. HISTORICAL DATA
============================================================

কোনো legacy table/data পরিবর্তন করা যাবে না।

Historical Product Bill:
- Existing Sales/Purchase invoice detail থেকে সরাসরি পাওয়া যাবে।
- শুধু configured Company + Product combination-এর data report করতে হবে।
- Setting-এর effective_from থাকলে তার আগের data defaultভাবে বাদ দেওয়া যায়;
  তবে “Include historical data” policy requirement অনুযায়ী নির্ধারণ করতে হবে।

Historical Cash Received/Payment:
- পুরোনো transaction-এ product mapping না থাকলে নিশ্চিতভাবে Product বলা যায় না।
- শুধু নিরাপদ ও deterministic case mapping করা যাবে।

একটি dry-run capable backfill command তৈরি করতে হবে:

php artisan product-tracking:backfill --dry-run

Dry run দেখাবে:

- Eligible tracked-company/product transactions
- Automatically mappable
- Multiple tracked products
- Source/order/invoice not found
- Already mapped
- Cross-company invalid references
- Ambiguous transactions

Review-এর পর:

php artisan product-tracking:backfill

Backfill rules:

1. শুধু configured Company + Product combinations process করবে।
2. Untracked Product ignore করবে।
3. Invoice/order-এ একটি মাত্র distinct active tracked Product থাকলে এবং cash
   transactionটি তার সঙ্গে নিশ্চিতভাবে related হলে map করবে।
4. একাধিক tracked Product হলে auto-map করবে না।
5. Tracked এবং untracked Product mixed invoice হলে amount-এর Product নিশ্চিত
   না হলে auto-map করবে না।
6. Invoice/order reference না থাকলে party/date দেখে অনুমান করে map করবে না।
7. Duplicate mapping তৈরি করবে না।
8. Command পুনরায় চালানো নিরাপদ/idempotent হবে।
9. Legacy transaction বা invoice row update করবে না।
10. Ambiguous record manual reconciliation-এর জন্য রাখবে।

============================================================
১৬. MANUAL RECONCILIATION
============================================================

Ambiguous historical transaction-এর জন্য permission-protected screen:

Filters:
- Company
- Branch
- Received/Payment
- Date range
- Account/party
- Voucher
- Only unmapped
- Tracked Product

Table:

| Date | Voucher | Party | Type | Amount | Invoice/Order |
| Eligible Tracked Products | Selected Product | Status | Action |

Rules:

1. শুধু transaction-এর Company-এর configured Product দেখাবে।
2. Order/Invoice থাকলে শুধু তার eligible Product দেখাবে।
3. Manual mapping audit information সংরক্ষণ করবে।
4. Financial transaction edit করবে না।
5. Wrong mapping correction শুধু mapping table-এ হবে।
6. Bulk mapping অনুমানভিত্তিক হবে না।
7. Cross-company mapping সম্পূর্ণ নিষিদ্ধ হবে।

============================================================
১৭. API REQUIREMENTS
============================================================

Actual project conventions অনুসারে endpoints তৈরি করো। Suggested endpoints:

Tracking settings:
GET    /product-tracking/settings
POST   /product-tracking/settings
PUT    /product-tracking/settings/{id}
DELETE অথবা PATCH deactivate /product-tracking/settings/{id}

Dropdown:
GET /product-tracking/products?company_id=&branch_id=&context=received
GET /product-tracking/products?company_id=&branch_id=&context=payment
GET /product-tracking/products?company_id=&branch_id=&context=ledger

Mapping:
GET  /transactions/{type}/{id}/product-map
POST /transactions/{type}/{id}/product-map
DELETE /transactions/{type}/{id}/product-map

Report:
GET /reports/product-financial-statement

Suggested query:
- company_id, শুধু platform admin context-এ
- branch_id
- product_id
- start_date
- end_date
- include_inactive

Reconciliation:
GET  /product-tracking/reconciliation
POST /product-tracking/reconciliation/{transaction}/resolve

Existing Cash Received/Payment request-এ optional product_id নেওয়া যেতে পারে,
কিন্তু existing transaction table-এ save করা যাবে না। Backend save service
transaction ID পাওয়ার পরে mapping table-এ save করবে।

API response existing response envelope/convention অনুসরণ করবে।

============================================================
১৮. SECURITY AND TENANT ISOLATION
============================================================

প্রতিটি request-এ backend নিশ্চিত করবে:

1. User requested Company access করতে পারে।
2. Product requested Company-এর।
3. Company + Product tracking setting আছে।
4. Requested operation-এর flag active:
   - Received-এর জন্য track_cash_received
   - Payment-এর জন্য track_cash_payment
   - Sales bill-এর জন্য track_sales_bill
   - Purchase bill-এর জন্য track_purchase_bill
5. Branch selected Company-এর।
6. Transaction selected Company/Branch-এর।
7. Invoice/order selected Company-এর।
8. Product invoice/order-এর item হলে relationship valid।
9. Client-supplied tenant/company ownership blindly trust করা হবে না।
10. Platform admin ও tenant admin permission আলাদা হবে।
11. IDOR/cross-tenant access test করতে হবে।

============================================================
১৯. PERFORMANCE AND INDEXING
============================================================

শুধু নতুন tables-এর মধ্যে প্রয়োজনীয় index দিতে হবে।

Suggested indexes:

company_product_tracking_settings:
- unique company/tenant + branch + product
- company/tenant + is_active
- product_id

transaction_product_maps:
- unique company/tenant + transaction_type + transaction ID
- company/tenant + product_id + transaction_type
- product_id + created_at
- source_type + source_id
- branch_id + product_id

Existing tables-এ নতুন index যোগ করা যাবে না। Existing invoice/report query
performance সমস্যা হলে আগে explain করতে হবে; অনুমতি ছাড়া legacy table alter
করা যাবে না।

Report pagination ব্যবহার করবে এবং বড় data memory-তে load করবে না।

============================================================
২০. PRINT AND EXPORT
============================================================

Product Financial Statement-এর print/export-এ দেখাতে হবে:

- Company
- Branch
- Product
- Date range
- Opening Receivable
- Sales Bill
- Cash Received
- Closing Receivable
- Opening Payable
- Purchase Bill
- Cash Payment
- Closing Payable

Detailed voucher/invoice references দেখাতে হবে।

Existing Ledger print layout পরিবর্তন না করে product-selected অবস্থায় আলাদা
header/section ব্যবহার করা যায়।

============================================================
২১. BACKWARD COMPATIBILITY
============================================================

1. কোনো Product tracking setting না থাকলে পুরো system আগের মতো চলবে।
2. Cash Received/Payment request-এ product_id না থাকলে আগের মতো save হবে।
3. Existing mobile/web clients ভাঙবে না।
4. Existing invoice save/edit/print অপরিবর্তিত থাকবে।
5. Product filter ছাড়া existing Ledger result অপরিবর্তিত থাকবে।
6. Legacy transaction mapping না থাকলেও general ledger-এ থাকবে।
7. Unmapped transaction Product Financial Statement-এ Product cash movement
   হিসেবে দেখানো যাবে না।
8. Existing accounting permissions অপরিবর্তিত থাকবে; নতুন feature-এর জন্য
   নতুন permissions যোগ করা যাবে, কিন্তু existing permission table alter নয়।
9. কোনো unrelated code change করা যাবে না।

============================================================
২২. TEST REQUIREMENTS
============================================================

Backend tests:

1. Company A + Rice tracked।
2. Company A + Pen untracked।
3. Company B + Rice untracked।
4. Received dropdown-এ শুধু track_cash_received Product আসে।
5. Payment dropdown-এ শুধু track_cash_payment Product আসে।
6. Cross-company Product mapping reject হয়।
7. Untracked Product mapping reject হয়।
8. Optional Product ছাড়া existing transaction save হয়।
9. Mapping create/update/delete হয়।
10. Duplicate transaction mapping হয় না।
11. Sales Bill সঠিক invoice items থেকে আসে।
12. Purchase Bill সঠিক invoice items থেকে আসে।
13. Cancelled invoice বাদ যায়।
14. Sales/Purchase return সঠিকভাবে adjust হয়।
15. Cash Received শুধু mapped transaction থেকে আসে।
16. Cash Payment শুধু mapped transaction থেকে আসে।
17. Opening calculation সঠিক।
18. Closing Receivable/Payable সঠিক।
19. Branch filter সঠিক।
20. Date filter সঠিক।
21. Product filter ছাড়া legacy Ledger response অপরিবর্তিত।
22. Backfill command idempotent।
23. Multi-product ambiguous transaction auto-map হয় না।
24. Unauthorized admin settings পরিবর্তন করতে পারে না।
25. Legacy tables alter হয়নি।

Frontend tests/typecheck:

1. Company অনুযায়ী Product dropdown।
2. Received/Payment context অনুযায়ী dropdown।
3. Product optional behaviour।
4. Add New row-এ Product state সংরক্ষণ।
5. Edit load-এ selected Product।
6. Product clear behaviour।
7. Product statement filters।
8. Loading/error/empty states।
9. Print header।
10. Production build/typecheck।

============================================================
২৩. IMPLEMENTATION PROCESS
============================================================

Implementation-এর আগে:

1. git status দেখো এবং existing user changes preserve করো।
2. Relevant schema, controllers, services, forms ও reports inspect করো।
3. কোন legacy table modify করা হবে না—তার তালিকা তৈরি করো।
4. Proposed নতুন tables ও relationship ব্যাখ্যা করো।
5. Invoice bill calculation formula নিশ্চিত করো।

তারপর implementation করো:

1. শুধু নতুন table migrations।
2. Models/repositories/services।
3. Settings API ও UI।
4. Received/Payment optional Product integration।
5. Product mapping lifecycle।
6. Product Bill queries।
7. Product Financial Statement।
8. Historical dry-run/backfill।
9. Manual reconciliation।
10. Print/export।
11. Tests।
12. Build/typecheck।

Implementation শেষে বাংলায় report করবে:

- Inspect করা actual legacy tables এবং IDs
- কোন existing table অপরিবর্তিত রাখা হয়েছে
- তৈরি হওয়া নতুন tables
- তৈরি/পরিবর্তিত files
- Company–Product configuration flow
- Sales/Purchase Bill calculation formula
- Cash Received/Payment mapping flow
- Historical data strategy
- API contract
- Permissions/security
- Migration SQL verification
- Backend test result
- Frontend typecheck/build result
- কোনো unresolved ambiguity বা deployment step

============================================================
২৪. FINAL ACCEPTANCE CRITERIA
============================================================

Featureটি complete তখনই হবে যখন:

1. নির্দিষ্ট Company + নির্দিষ্ট Product combination configure করা যায়।
2. অন্য Company বা untracked Product প্রভাবিত হয় না।
3. Product-wise Sales Bill দেখা যায়।
4. Product-wise Purchase Bill দেখা যায়।
5. Product-wise Cash Received দেখা যায়।
6. Product-wise Cash Payment দেখা যায়।
7. Product-wise Receivable ও Payable সঠিক দেখা যায়।
8. Opening ও closing balance সঠিক।
9. Historical bills existing invoice items থেকে আসে।
10. Historical cash mapping শুধু নিশ্চিত transaction-এর ক্ষেত্রে হয়।
11. Ambiguous data manual reconciliation করা যায়।
12. Existing forms ও accounting flow backward-compatible থাকে।
13. Product filter ছাড়া Ledger আগের মতো থাকে।
14. কোনো legacy table ALTER হয়নি।
15. Tenant/company isolation tests pass করে।



মূল ধারণাটি সংক্ষেপে:
Product bill
    = Existing Sales/Purchase invoice item data

Product cash movement
    = Existing Cash Received/Payment transaction
      + নতুন transaction_product_maps relation

কোন Company-এর কোন Product track হবে
    = নতুন company_product_tracking_settings

পুরোনো কোনো table
    = অপরিবর্তিত