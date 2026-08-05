প্রজেক্টে “Company & Product-wise Bill, Cash Received and Cash Payment
Tracking System” implement করতে হবে।

Companion file: docs/company-product-financial-tracking-schema.sql

এই document বাস্তব codebase inspect করে লেখা হয়েছে। এখানে যেসব table, column
ও ID উল্লেখ আছে সেগুলো যাচাই করা — অনুমান নয়।

Frontend : f:\All_Database\cashbookbd_react
Backend  : F:\All_Database\www\cashbook_api

============================================================
০. INSPECTION RESULT — যা যাচাই করা হয়েছে
============================================================

০.১ Company / Branch / Product
------------------------------

Company ও tenant একই entity।

    com_companies       id INT UNSIGNED (PK)
    com_branches        id INT UNSIGNED (PK), company_id
    product_items       id INT UNSIGNED (PK), company_id
    users               id INT UNSIGNED (PK), company_id, branch_id
    acc_coa_level4s     id INT UNSIGNED (PK), company_id      -- party/account

Authenticated user-এর Company সরাসরি `auth()->user()->company_id` থেকে পাওয়া
যায় — এটাই পুরো codebase-এর প্রতিষ্ঠিত pattern। Client থেকে পাঠানো company_id
কোথাও ব্যবহার করা হবে না।

Product ownership `product_items.company_id` দিয়ে নির্ধারিত। তাই একই নামের
Product এক Company-তে tracked এবং অন্য Company-তে untracked রাখা সম্ভব।

০.২ Cash Received / Payment — save chain
-----------------------------------------

    main_trx_master              voucher master
        id, company_id, branch_id, vr_no, vr_sl, vr_date,
        transaction_type, status
        transaction_type : 1 = Received, 2 = Payment, 5 = Journal
        status           : 1 = live, 0 = cancelled/void
        │
        └── acc_transaction_master
                id, company_id, branch_id, main_trx_id, note
                │
                └── acc_transaction_details        ← প্রতিটি "Add New" row
                        id, trx_mstr_id, coa4_id, remarks,
                        debit, credit, pay_branch, status
                        coa4_id = 17 → Cash contra row

Received ও Payment একই table ব্যবহার করে। পার্থক্য
`main_trx_master.transaction_type` দিয়ে।

API endpoints (routes/api.php):

    POST accounts/received                ReceivedController@apiAccountsCashReceivedStore
    POST accounts/received/api-edit       ReceivedController@apiAccountsCashReceivedEdit
    POST accounts/received/api-update     ReceivedController@apiAccountsCashReceivedUpdate
    POST accounts/payment                 PaymentController@apiAccountsCashPaymentStore
    POST accounts/payment/api-edit        PaymentController@apiAccountsCashPaymentEdit
    POST accounts/payment/api-update      PaymentController@apiAccountsCashPaymentUpdate

০.৩ ⚠ Individual row-এর permanent unique ID নেই
------------------------------------------------

এটি এই feature-এর সবচেয়ে গুরুত্বপূর্ণ finding।

    main_trx_master           update হয়            → id স্থায়ী ✅
    acc_transaction_master    update হয়            → id স্থায়ী ✅
    acc_transaction_details   delete → re-insert   → id স্থায়ী নয় ❌
    inventory_sales_details   delete → re-insert   → id স্থায়ী নয় ❌
    inventory_purchase_details delete → re-insert  → id স্থায়ী নয় ❌

প্রমাণ:
    ReceivedController.php:1420   AccTransactionDetails::where('trx_mstr_id',...)->delete()
    ReceivedController.php:1266   একই pattern (trading)
    TradingCombinedController.php:596  inventory_sales_details delete
    TradingCombinedController.php:553  inventory_purchase_details delete

অর্থাৎ detail row-এর id প্রতি edit-এ বদলে যায়। সেটিকে mapping key বানালে
একবার voucher edit করলেই mapping অনাথ হয়ে যেত, Product-এর Cash Received
কমে যেত এবং Receivable মিথ্যাভাবে বেড়ে যেত।

সিদ্ধান্ত: স্থায়ী anchor হবে

    (company_id, transaction_type, main_trx_id, row_seq)

row_seq = ঐ voucher-এর party row গুলোর (coa4_id <> 17) ১-ভিত্তিক ক্রমিক
নম্বর, controller যে ক্রমে save করে সেই একই ক্রম।

০.৪ Invoice chain
------------------

    inventory_sales_masters       id, main_trx_id, branch_id, customer_id,
                                  total, discount, netpayment, status
        └── inventory_sales_details    id, sal_mstr_id, product_id, quantity,
                                       sales_price, weight_variance,
                                       variance_type, is_return

    inventory_purchase_masters    id, main_trx_id, branch_id, supplier_id,
                                  invoice_number, invoice_date,
                                  total, discount, netpayment
        └── inventory_purchase_details id, pur_mstr_id, product_id, quantity,
                                       purchase_price, weight_variance,
                                       variance_type, is_return

    inventory_sales_return_masters      id, main_trx_id, branch_id, customer_id,
                                        total, discount, netpayment, status
        └── inventory_sales_return_details    sal_mstr_id, product_id, quantity,
                                              return_price, return_pct,
                                              line_net_total

    inventory_purchase_return_masters   id, main_trx_id, branch_id, supplier_id,
                                        total, discount, netpayment, status
        └── inventory_purchase_return_details pur_return_mstr_id, product_id,
                                              quantity, return_price,
                                              return_pct, line_net_total, is_return

লক্ষণীয়: sales return-এর FK `sal_mstr_id`, কিন্তু purchase return-এর FK
`pur_return_mstr_id` — নাম আলাদা।

০.৫ ⚠ Invoice line-এ "net amount" column নেই
---------------------------------------------

Sales/Purchase detail table-এ শুধু quantity ও rate আছে। এগুলো নেই:

    line-level discount     নেই
    tax / VAT               নেই
    additional charge       নেই
    rounding                নেই
    net amount              নেই

Discount শুধু master level-এ (`inventory_*_masters.discount`), এবং
`master.total` = ঐ invoice-এর সব line-এর gross যোগফল (controller নিজেই এভাবে
হিসাব করে রাখে)।

তাই "existing accounting rule অনুযায়ী tax/charge/rounding বিবেচনা করা হবে" —
এই দাবি এই system-এ প্রযোজ্য নয়। প্রকৃত formula §১২-তে দেওয়া হলো।

০.৬ ⚠ Return-এর `line_net_total` সব writer populate করে না
-----------------------------------------------------------

    CommissionSalesMaster.php    line_net_total লেখে ✅
    PurchaseReturn.php:63-73     line_net_total লেখে না ❌

তাই return net amount-এ COALESCE fallback দরকার (§১২ দ্রষ্টব্য)।

০.৭ ⚠ ইতিমধ্যে প্রায় একই feature বিদ্যমান
-------------------------------------------

Frontend : src/components/modules/reports/ledger-with-product/
           (LedgerWithProduct.tsx, Print, slice, types, utils)
Backend  : routes/api.php:297 → ReportsController@apiCustomerSupplierStatement
           ReportsController.php:2792 → ledgerWithProductOpeningBalance()

এটি এখনই party + product ভিত্তিক statement দেয় — opening balance, received,
payment ও running balance সহ। Product filter করে invoice detail-এর
`whereExists` দিয়ে।

সীমাবদ্ধতা: invoice-এ Product থাকলে **পুরো voucher amount** ঐ Product-এর ধরে
নেয়। এটাই সেই ambiguity যা নতুন mapping দূর করবে।

সিদ্ধান্ত: নতুন সমান্তরাল report বানানো হবে না। এই বিদ্যমান report-কেই
upgrade করা হবে — mapping থাকলে exact হিসাব, না থাকলে বর্তমান আচরণ অক্ষত।

০.৮ ⚠ Journal ও Bank voucher বাদ দেওয়া যাবে না
-----------------------------------------------

`ledgerWithProductOpeningBalance()` transaction_type = 5 (Journal)-কেও
received/payment হিসেবে গোনে। এছাড়া BankReceivedController ও
BankPaymentController আলাদাভাবে বিদ্যমান।

শুধু cash ধরলে Product Receivable/Payable overstate হবে। তাই mapping-এ
cash, bank ও journal — তিনটিই অন্তর্ভুক্ত।

০.৯ Voucher delete flow
------------------------

`ReceivedController::destroy()` খালি। বাস্তব delete/cancel হয়
`main_trx_master.status` পরিবর্তন করে এবং VoucherModificationController দিয়ে।
Audit-এর জন্য MainTransactionObserver + MainTransactionHistory (old/new
snapshot) ইতিমধ্যে আছে।

তাই mapping cleanup hook status পরিবর্তনের জায়গায় বসাতে হবে — শুধু
destroy() নয়।

০.১০ নাম সংঘাত — সাবধান
------------------------

Cash Received/Payment form-এর row interface-এ ইতিমধ্যেই `currentProduct`
নামে একটি field আছে (GeneralCashReceived.tsx:43, GeneralCashPayment.tsx:51)।
কিন্তু সেটি Product নয় — account dropdown-এর suggestion object, যা remarks ও
amount pre-fill করে।

নতুন field-এর নাম আলাদা রাখতে হবে: `trackedProductId`।

============================================================
১. BUSINESS OBJECTIVE
============================================================

শুধু নির্দিষ্ট Company এবং সেই Company-এর নির্দিষ্ট কিছু Product-এর জন্য
নিচের হিসাব রাখতে হবে:

1. Productটির বিপরীতে কত টাকার Sales Bill/Invoice দেওয়া হয়েছে।
2. Productটির বিপরীতে কত টাকার Purchase Bill/Invoice পাওয়া হয়েছে।
3. Productটির বিপরীতে কত টাকা Received হয়েছে।
4. Productটির বিপরীতে কত টাকা Payment হয়েছে।
5. Productটির বর্তমান Receivable কত।
6. Productটির বর্তমান Payable কত।
7. Date range অনুযায়ী opening, bill, received/payment এবং closing balance।

এটি সব Company বা সব Product-এর জন্য হবে না।

উদাহরণ:
- Company A + Rice Product → tracking চালু
- Company A + Pen Product → tracking বন্ধ
- Company B + Rice Product → tracking বন্ধ
- Company C + Wheat Product → tracking চালু

অর্থাৎ Company এবং Product combination অনুযায়ী featureটি opt-in হবে।

============================================================
২. NON-NEGOTIABLE DATABASE RULE
============================================================

কোনো existing/legacy database table ALTER করা যাবে না।

বিশেষভাবে:
- Existing transaction table পরিবর্তন করা যাবে না।
- Existing product table পরিবর্তন করা যাবে না।
- Existing company/branch table পরিবর্তন করা যাবে না।
- Existing Sales/Purchase invoice table পরিবর্তন করা যাবে না।
- Existing invoice detail/items table পরিবর্তন করা যাবে না।
- Existing ledger/account/voucher table পরিবর্তন করা যাবে না।
- Existing table-এ নতুন column যোগ করা যাবে না।
- Existing table-এ index, foreign key, constraint বা trigger যোগ করা যাবে না।
- Existing financial data rewrite করা যাবে না।
- Existing migration modify করা যাবে না।

প্রয়োজনীয় configuration, mapping ও audit data শুধু নতুন dedicated table
তৈরি করে রাখতে হবে।

READ-ONLY VIEW তৈরি করা অনুমোদিত — view শুধু SELECT করে, কোনো legacy table
পরিবর্তন করে না।

স্মর্তব্য: এই project-এ schema পরিবর্তন সরাসরি SQL দিয়ে হয়, Laravel migration
দিয়ে নয়। তাই আসল deliverable হলো
docs/company-product-financial-tracking-schema.sql ফাইলটি।

যাচাই: ঐ ফাইলে ALTER TABLE / UPDATE / DELETE / DROP / TRUNCATE একটিও থাকবে না।

============================================================
৩. ACCOUNTING DEFINITIONS
============================================================

“Sales Bill Given” = নির্দিষ্ট Product-এর Sales Invoice line-এর net amount
(§১২-এর formula অনুযায়ী হিসাব করা, কারণ এমন কোনো column নেই)।

“Purchase Bill Received” = নির্দিষ্ট Product-এর Purchase Invoice line-এর
net amount (একই formula)।

“Received” = Cash/Bank/Journal Received transaction-এর যে amount নতুন mapping
table দিয়ে Productটির সঙ্গে যুক্ত করা হয়েছে, তার মোট।

“Payment” = Cash/Bank/Journal Payment transaction-এর যে amount নতুন mapping
table দিয়ে Productটির সঙ্গে যুক্ত করা হয়েছে, তার মোট।

মূল হিসাব:

    Product Receivable = Sales Bill − Sales Return − Received
    Product Payable    = Purchase Bill − Purchase Return − Payment

⚠ গুরুত্বপূর্ণ ঘোষণা — এই report General Ledger-এর সঙ্গে মিলবে না

Cash mapping opt-in, তাই unmapped টাকা এই statement-এ দেখানো হয় না (§২১.৭)।
এটি ইচ্ছাকৃত design — অনুমান করে টাকা দেখানোর চেয়ে না দেখানো নিরাপদ।

তাই print/screen-এ স্পষ্টভাবে লিখতে হবে:

    "Product Financial Statement — memo statement.
     এটি General Ledger-এর সঙ্গে মেলানোর জন্য নয়।"

এবং প্রতিটি report-এ একটি "Unmapped Received/Payment (এই period)" ঘর দেখাতে
হবে, যাতে ব্যবহারকারী ফাঁকটা দেখতে পান।

============================================================
৪. NEW TABLE: TRACKING CONFIGURATION
============================================================

Table: company_product_tracking_settings

Fields:

    id
    company_id          INT UNSIGNED   -- com_companies.id
    branch_id           INT UNSIGNED   -- 0 = সব branch
    product_id          INT UNSIGNED   -- product_items.id (type মিলানো)
    track_sales_bill    default 1
    track_purchase_bill default 1
    track_cash_received default 1
    track_cash_payment  default 1
    is_active           default 1
    effective_from      DATE nullable
    effective_to        DATE nullable
    created_by, updated_by, created_at, updated_at

UNIQUE (company_id, branch_id, product_id)

BRANCH SCOPE নিয়ম:

    branch_id = 0  → ঐ Company-র সব branch-এ প্রযোজ্য
    branch_id > 0  → শুধু ঐ branch-এ প্রযোজ্য
    দুটোই থাকলে branch-specific row জেতে; না থাকলে 0-row fallback।

EFFECTIVE PERIOD নিয়ম:

    effective_from / effective_to শুধু *নতুন mapping তৈরি* নিয়ন্ত্রণ করে।
    Report সবসময় সম্পূর্ণ history পড়বে।

    কারণ: পুরোনো bill বাদ দিয়ে পুরোনো cash রেখে দিলে Opening Receivable
    ঋণাত্মক হয়ে যেত। Opening ও closing-এর মধ্যে অসঙ্গতি তৈরি হতো।

Setting-এর company ও product ownership backend থেকে validate করতে হবে।
Client-এর পাঠানো company_id বিশ্বাস করা যাবে না।

Tenant admin শুধু নিজের Company-এর settings manage করবে। Platform admin
existing platform-admin authorization অনুসরণ করবে।

============================================================
৫. NEW TABLE: TRANSACTION–PRODUCT MAPPING
============================================================

Table: transaction_product_maps

এই table ledger-ready — amount, date ও party এখানেই denormalized আছে।
কারণ acc_transaction_details প্রতি edit-এ মুছে যায় (§০.৩), তাই report-কে
সেখানে ফিরে যেতে দেওয়া যাবে না।

Fields:

    id
    company_id        INT UNSIGNED
    branch_id         INT UNSIGNED
    product_id        INT UNSIGNED

    -- stable anchor
    main_trx_id       INT UNSIGNED       -- main_trx_master.id
    row_seq           SMALLINT UNSIGNED  -- party row-এর ক্রমিক নম্বর

    -- informational only, volatile, join করা নিষিদ্ধ
    trx_mstr_id       INT UNSIGNED nullable
    trx_detail_id     INT UNSIGNED nullable

    transaction_type  VARCHAR(30)
    direction         TINYINT            -- 1 = received, -1 = payment

    -- ledger projection
    vr_date           DATE
    vr_no             VARCHAR(64)
    coa4_id           INT UNSIGNED       -- party account
    mapped_amount     DECIMAL(20,4)
    remarks           VARCHAR(255)

    source_type       VARCHAR(30) nullable
    source_id         INT UNSIGNED nullable
    mapping_method    VARCHAR(40)

    created_by, updated_by, created_at, updated_at

UNIQUE (company_id, transaction_type, main_trx_id, row_seq)

transaction_type-এর মান:

    cash_received      cash_payment
    bank_received      bank_payment
    journal_received   journal_payment

source_type-এর মান:

    sales_invoice  purchase_invoice  sales_order  purchase_order
    manual         historical

mapping_method-এর মান:

    manual  automatic_single_tracked_product
    historical_backfill  reconciliation

REWRITE CONTRACT (অলঙ্ঘনীয়):

    voucher store   → mapping insert
    voucher update  → ঐ main_trx_id-এর সব mapping delete + নতুন করে insert
    voucher delete/cancel → ঐ main_trx_id-এর সব mapping delete

    তিনটিই voucher-এর নিজের DB transaction-এর ভিতরে হতে হবে।

একটি voucher row-এর সঙ্গে সর্বোচ্চ একটি Product যুক্ত হবে।

Existing table-এর উপর কোনো foreign key বা index দেওয়া যাবে না। নতুন mapping
table-এর reference গুলো application-level, সব index নতুন table-এর ভিতরে।

============================================================
৬. AUDIT TABLE
============================================================

Table: product_tracking_reconciliation_logs

এটি append-only audit trail — প্রতিটি mapping সিদ্ধান্তের ইতিহাস। এতে কোনো
UNIQUE KEY নেই, কারণ একই transaction একাধিকবার সংশোধিত হতে পারে।

Fields:

    id, company_id, branch_id
    main_trx_id, row_seq, transaction_type
    source_type, source_id
    previous_product_id, suggested_product_id, resolved_product_id
    mapped_amount
    action, reason, metadata JSON
    acted_by, created_at

action-এর মান:

    auto_mapped  manually_mapped  remapped  cleared
    ambiguous    source_not_found  ignored

“Unmapped queue” আলাদা table নয় — সেটি একটি query: যেসব live voucher row-এর
বিপরীতে transaction_product_maps-এ কোনো row নেই, সেগুলোই pending।

============================================================
৭. READ-ONLY VIEWS
============================================================

SQL ফাইলে তিনটি view আছে। এগুলো legacy table স্পর্শ করে না।

    v_product_bill_lines     Sales/Purchase Bill ও Return, product-wise
    v_product_cash_lines     mapped Received/Payment
    v_product_ledger_lines   উপরের দুটির UNION — statement-এর row source

Report query এই view গুলোর উপর দাঁড়াবে, যাতে formula এক জায়গায় থাকে এবং
test করা যায়।

============================================================
৮. COMPANY–PRODUCT TRACKING SETTINGS UI
============================================================

একটি নতুন permission-protected settings screen তৈরি করতে হবে।

    Company: [Select Company]      (tenant admin হলে auto, dropdown নেই)

    | Product | Sales Bill | Purchase Bill | Received | Payment | Branch | Active |

    Actions: Add tracked product / Edit / Activate-Deactivate / Search / Filter / Pagination

Product dropdown-এ শুধু selected Company-এর Product দেখাবে
(product_items.company_id দিয়ে filter)।

Setting deactivate করলে:
- নতুন mapping বন্ধ হবে।
- পুরোনো mapping delete হবে না।
- Historical report অক্ষত থাকবে।
- Report-এ inactive tracked Product নির্বাচন করা যাবে (include_inactive)।

============================================================
৯. CASH RECEIVED FORM
============================================================

Existing Cash Received form-এর কোনো বর্তমান field, behaviour, shortcut,
validation, table, save action বা accounting logic পরিবর্তন করা যাবে না।

প্রতিটি Add New transaction row-এর জন্য শুধু একটি নতুন field:

    Select Product (Optional)      → state key: trackedProductId

(নাম `currentProduct` ব্যবহার করা যাবে না — §০.১০)

Rules:

1. Dropdown-এ শুধু current Company-এর active track_cash_received products।
2. অন্য Company-এর Product দেখানো যাবে না।
3. Branch scope অনুযায়ী filter (§৪-এর precedence নিয়ম)।
4. Product নির্বাচন না করলে existing flow হুবহু আগের মতো।
5. product_id existing transaction table-এ save করা যাবে না।
6. প্রথমে existing logic দিয়ে transaction save হবে।
7. main_trx_id ও row_seq পাওয়ার পর mapping table-এ save হবে।
8. Transaction ও mapping একই DB transaction-এর মধ্যে।
9. Product current Company-এর এবং tracking active কি না backend validate করবে।
10. Order/Invoice selected থাকলে Product ঐ Order/Invoice-এর কি না validate হবে।
11. একই voucher-এর বিভিন্ন row-তে বিভিন্ন Product দেওয়া যাবে।
12. Edit-এ mapping table থেকে selected Product load হবে (main_trx_id + row_seq)।
13. Update-এ ঐ voucher-এর সব mapping মুছে নতুন করে লেখা হবে (REWRITE CONTRACT)।
14. Product clear করলে শুধু ঐ row-এর mapping বাদ যাবে।
15. Mapping clear করার কারণে financial row পরিবর্তন বা delete হবে না।
16. Voucher delete/cancel (status পরিবর্তন) হলে mapping cleanup হবে — §০.৯।
17. Existing API client trackedProductId না পাঠালে request আগের মতোই সফল হবে।

============================================================
১০. CASH PAYMENT FORM
============================================================

Cash Received-এর অনুরূপ। Dropdown-এ শুধু active track_cash_payment products।

Create, edit, update, clear ও delete lifecycle সম্পূর্ণ একই নিয়মে।
অন্য Company-এর Product map করা যাবে না।

============================================================
১১. BANK ও JOURNAL VOUCHER
============================================================

BankReceived, BankPayment এবং Journal (transaction_type = 5) — এগুলোও
Product Receivable/Payable-কে প্রভাবিত করে (§০.৮)। তাই:

- BankReceived / BankPayment form-এ একই optional Product field যোগ হবে
  (transaction_type: bank_received / bank_payment)।
- Journal voucher-এর যে row party account-কে প্রভাবিত করে, সেখানেও একই field
  (journal_received / journal_payment; direction debit/credit থেকে নির্ধারিত)।

এগুলো বাদ দিলে Product Receivable overstate হবে।

============================================================
১২. PRODUCT-WISE BILL CALCULATION
============================================================

Bill mapping table থেকে নেওয়া হবে না। Bill আসবে existing invoice detail থেকে।

এই system-এ line-level discount, tax/VAT, additional charge বা rounding-এর
কোনো column নেই (§০.৫)। Discount শুধু master level-এ। প্রকৃত formula:

    gross_amount   = quantity × rate
                     (sales_price অথবা purchase_price)

    discount_share = master.discount × gross_amount / master.total
                     (master.total = ঐ invoice-এর সব line-এর gross যোগফল)

    net_amount     = gross_amount − discount_share

Return line-এর জন্য:

    net_amount = COALESCE(
        line_net_total,
        quantity × return_price
          − (quantity × return_price × COALESCE(return_pct, 0) / 100)
    )

COALESCE লাগছে কারণ PurchaseReturn.php `line_net_total` লেখে না (§০.৬)।

Cancelled/void বাদ দেওয়ার শর্ত: `main_trx_master.status = 1`

এক invoice-এ একাধিক Product থাকলেও হিসাব সম্ভব, কারণ invoice detail-এ
প্রতিটি Product-এর আলাদা row ও amount আছে।

এই formula v_product_bill_lines view-এ implement করা আছে এবং সেখানেই
test করতে হবে।

============================================================
১৩. SALES এবং PURCHASE INVOICE
============================================================

Existing Sales/Purchase Invoice form, table ও schema পরিবর্তন করা যাবে না।

Invoice save-এর সময় Received Amount / Payment Amount থেকে automatic cash
transaction তৈরি হলে (`inventory_*_masters.netpayment`):

1. Invoice-এ ঠিক একটি active tracked Product থাকলে এবং generated cash amount
   পুরোপুরি সেই Product-এর বলে নিশ্চিত হলে mapping auto-create করা যাবে।
2. একাধিক tracked Product থাকলে অনুমান করে mapping করা যাবে না।
3. Tracked ও untracked মিশ্রিত invoice হলে পুরো amount tracked Product-এর
   নামে map করা যাবে না।
4. Ambiguous mapping ছাড়া থাকবে; audit log-এ `ambiguous` লেখা হবে।
5. Invoice form-এ নতুন allocation UI যোগ করা যাবে না।
6. Invoice update/delete/cancel হলে REWRITE CONTRACT অনুযায়ী mapping sync হবে।
7. কোনো invoice বা invoice detail row rewrite করা যাবে না।

============================================================
১৪. PRODUCT-WISE LEDGER / REPORT
============================================================

⚠ নতুন সমান্তরাল report তৈরি করা হবে না।

বিদ্যমান report upgrade হবে (§০.৭):

    Frontend : src/components/modules/reports/ledger-with-product/
    Backend  : ReportsController@apiCustomerSupplierStatement
               ReportsController::ledgerWithProductOpeningBalance()

পরিবর্তনের নিয়ম:

- Product নির্বাচন না করলে query, opening, rows, debit/credit, balance ও
  print হুবহু আগের মতো চলবে।
- Product নির্বাচন করলে এবং ঐ Company+Product tracked হলে → mapping-ভিত্তিক
  exact হিসাব ব্যবহার হবে।
- Product নির্বাচন করলে কিন্তু tracked না হলে → বর্তমান whereExists heuristic
  আচরণ অপরিবর্তিত থাকবে (backward compatible)।

Product Financial Statement summary:

    Opening Sales Receivable
    Sales Bill Given
    Sales Return
    Received
    Closing Sales Receivable

    Opening Purchase Payable
    Purchase Bill Received
    Purchase Return
    Payment
    Closing Purchase Payable

    Unmapped Received / Payment (এই period)        ← §৩ অনুযায়ী বাধ্যতামূলক

Detail rows:

    | Date | Voucher | Type | Party | Description | Qty | Rate |
    | Sales Bill | Purchase Bill | Received | Payment | Balance | Action |

Row source: v_product_ledger_lines

সম্ভব report সমূহ (একই view থেকে):

1. Product Financial Statement (ledger, running balance সহ)
2. Product-wise Receivable/Payable summary (সব tracked product এক তালিকায়)
3. Product + Party statement (কোন পার্টির কাছে কোন পণ্যের কত পাওনা)
4. Product-wise Received/Payment register (দৈনিক/মাসিক)
5. Bill vs Collection (আদায়ের হার %)
6. Branch × Product summary
7. Unmapped transaction report (reconciliation gap)

Invoice-wise aging শুধু তখনই সম্ভব যখন mapping-এ source_type/source_id
পূরণ থাকে — না থাকলে aging দেখানো যাবে না।

============================================================
১৫. OPENING AND CLOSING CALCULATION
============================================================

Opening Receivable =
      Previous Sales Bills − Previous Sales Returns − Previous Received

Opening Payable =
      Previous Purchase Bills − Previous Purchase Returns − Previous Payments

Closing Receivable =
      Opening Receivable + Range Sales Bill − Range Sales Return − Range Received

Closing Payable =
      Opening Payable + Range Purchase Bill − Range Purchase Return − Range Payment

Opening, range totals এবং closing — তিন জায়গায় হুবহু একই company_id,
branch_id, product_id filter প্রয়োগ করতে হবে। শুধু displayed rows filter করে
unfiltered opening ব্যবহার করা যাবে না।

effective_from opening-এ প্রভাব ফেলবে না (§৪)।

============================================================
১৬. HISTORICAL DATA
============================================================

কোনো legacy table/data পরিবর্তন করা যাবে না।

Historical Product Bill: existing invoice detail থেকে সরাসরি পাওয়া যাবে।

Historical Received/Payment: পুরোনো transaction-এ mapping না থাকলে নিশ্চিতভাবে
Product বলা যায় না। শুধু deterministic case-এ mapping হবে।

    php artisan product-tracking:backfill --dry-run

Dry run দেখাবে: eligible transactions, automatically mappable, multiple
tracked products, source not found, already mapped, cross-company invalid,
ambiguous।

    php artisan product-tracking:backfill

Backfill rules:

1. শুধু configured Company + Product combinations process করবে।
2. Untracked Product ignore করবে।
3. Invoice/order-এ একটিমাত্র distinct active tracked Product থাকলে এবং cash
   transactionটি নিশ্চিতভাবে তার সঙ্গে related হলে map করবে।
4. একাধিক tracked Product হলে auto-map করবে না।
5. Mixed invoice-এ amount নিশ্চিত না হলে auto-map করবে না।
6. Invoice/order reference না থাকলে party/date দেখে অনুমান করবে না।
7. Duplicate mapping তৈরি করবে না (UNIQUE key এটি নিশ্চিত করে)।
8. পুনরায় চালানো নিরাপদ/idempotent হবে।
9. Legacy transaction বা invoice row update করবে না।
10. প্রতিটি সিদ্ধান্ত audit log-এ লিখবে।

============================================================
১৭. MANUAL RECONCILIATION
============================================================

Permission-protected screen।

Filters: Company, Branch, Received/Payment, Date range, Party, Voucher,
Only unmapped, Tracked Product।

Table:

    | Date | Voucher | Party | Type | Amount | Invoice/Order |
    | Eligible Tracked Products | Selected Product | Status | Action |

Rules:

1. শুধু ঐ transaction-এর Company-এর configured Product দেখাবে।
2. Order/Invoice থাকলে শুধু তার eligible Product দেখাবে।
3. প্রতিটি সিদ্ধান্ত audit log-এ যাবে।
4. Financial transaction edit করবে না।
5. ভুল mapping সংশোধন শুধু mapping table-এ হবে।
6. Bulk mapping অনুমানভিত্তিক হবে না।
7. Cross-company mapping সম্পূর্ণ নিষিদ্ধ।

============================================================
১৮. API REQUIREMENTS
============================================================

Route file: routes/api.php
Middleware group: ['auth:sanctum', 'ensure.user', LastUserActivity::class]

    GET    product-tracking/settings
    POST   product-tracking/settings
    PUT    product-tracking/settings/{id}
    PATCH  product-tracking/settings/{id}/deactivate

    GET    product-tracking/products?branch_id=&context=received|payment|ledger

    GET    product-tracking/map/{mainTrxId}
    POST   product-tracking/map/{mainTrxId}
    DELETE product-tracking/map/{mainTrxId}/{rowSeq}

    GET    reports/product-financial-statement
           ?branch_id=&product_id=&start_date=&end_date=&include_inactive=

    GET    product-tracking/reconciliation
    POST   product-tracking/reconciliation/resolve

company_id কোনো request-এ নেওয়া হবে না — auth থেকে আসবে। Platform admin-এর
ক্ষেত্রে existing platform-admin authorization pattern অনুসরণ করতে হবে।

Existing Received/Payment request-এ optional trackedProductId নেওয়া যাবে,
কিন্তু existing transaction table-এ save করা যাবে না।

API response existing envelope (foundData / notFound) অনুসরণ করবে।

⚠ Route যোগ করার পর `php artisan route:clear` চালাতে হবে, নইলে 404 আসবে।

============================================================
১৯. SECURITY AND TENANT ISOLATION
============================================================

প্রতিটি request-এ backend নিশ্চিত করবে:

1. Company সবসময় auth()->user()->company_id থেকে — client থেকে নয়।
2. Product ঐ Company-এর (product_items.company_id)।
3. Company + Product tracking setting আছে এবং active।
4. Requested operation-এর flag active
   (track_cash_received / track_cash_payment / track_sales_bill / track_purchase_bill)।
5. Branch ঐ Company-এর (com_branches.company_id)।
6. Voucher ঐ Company/Branch-এর (main_trx_master.company_id, branch_id)।
7. Invoice/order ঐ Company-এর।
8. Product invoice/order-এর item হলে relationship valid।
9. Platform admin ও tenant admin permission আলাদা।
10. IDOR/cross-tenant access test করতে হবে।

============================================================
২০. PERFORMANCE AND INDEXING
============================================================

শুধু নতুন table-এর ভিতরে index — SQL ফাইলে সংজ্ঞায়িত।

Existing table-এ নতুন index যোগ করা যাবে না। বিদ্যমান invoice/report query
ধীর হলে আগে EXPLAIN করে দেখাতে হবে; অনুমতি ছাড়া legacy table alter নয়।

Report pagination ব্যবহার করবে এবং বড় data memory-তে load করবে না।

============================================================
২১. BACKWARD COMPATIBILITY
============================================================

1. কোনো tracking setting না থাকলে পুরো system আগের মতো চলবে।
2. Received/Payment request-এ trackedProductId না থাকলে আগের মতো save হবে।
3. Existing mobile/web clients ভাঙবে না।
4. Existing invoice save/edit/print অপরিবর্তিত থাকবে।
5. Product filter ছাড়া existing Ledger result অপরিবর্তিত থাকবে।
6. Product নির্বাচন করলেও, Product untracked হলে বর্তমান heuristic আচরণ
   অপরিবর্তিত থাকবে।
7. Unmapped transaction Product Financial Statement-এ cash movement হিসেবে
   দেখানো যাবে না, তবে "Unmapped" ঘরে গণনা হবে।
8. Tracking deactivate করলে historical mapping delete হবে না।
9. Existing accounting permissions অপরিবর্তিত; নতুন permission যোগ করা যাবে
   কিন্তু existing permission table alter নয়।
10. কোনো unrelated code change করা যাবে না।

============================================================
২২. TEST REQUIREMENTS
============================================================

Backend:

1. Company A + Rice tracked, Company A + Pen untracked, Company B + Rice untracked।
2. Received dropdown-এ শুধু track_cash_received Product আসে।
3. Payment dropdown-এ শুধু track_cash_payment Product আসে।
4. Cross-company Product mapping reject হয়।
5. Untracked Product mapping reject হয়।
6. Product ছাড়া existing transaction আগের মতো save হয়।
7. Mapping create/update/delete কাজ করে।
8. Duplicate mapping হয় না।
9. ⚠ Voucher edit করার পরেও mapping টিকে থাকে এবং সঠিক row-এর সঙ্গে থাকে
   (§০.৩-এর regression test — সবচেয়ে গুরুত্বপূর্ণ)।
10. Voucher cancel (status=0) করলে ঐ mapping report থেকে বাদ যায়।
11. Sales Bill সঠিক invoice line থেকে আসে, master discount apportioned।
12. Purchase Bill একইভাবে।
13. Cancelled invoice বাদ যায়।
14. Sales/Purchase return সঠিকভাবে adjust হয়, line_net_total না থাকলেও।
15. Received শুধু mapped transaction থেকে আসে।
16. Payment শুধু mapped transaction থেকে আসে।
17. Bank ও Journal voucher-ও গণনায় আসে।
18. Opening calculation সঠিক এবং effective_from তাতে প্রভাব ফেলে না।
19. Closing Receivable/Payable সঠিক।
20. Branch scope precedence (branch-specific > branch_id 0) সঠিক।
21. Date filter সঠিক।
22. Product filter ছাড়া legacy ledger response byte-for-byte অপরিবর্তিত।
23. Untracked Product নির্বাচন করলে পুরোনো heuristic আচরণ অপরিবর্তিত।
24. Backfill idempotent।
25. Ambiguous transaction auto-map হয় না।
26. Unauthorized admin settings পরিবর্তন করতে পারে না।
27. কোনো legacy table alter হয়নি।

Frontend:

1. Company অনুযায়ী Product dropdown।
2. Received/Payment context অনুযায়ী dropdown।
3. Product optional behaviour।
4. Add New row-এ Product state সংরক্ষণ।
5. Edit load-এ selected Product।
6. Product clear behaviour।
7. `currentProduct` field-এর সঙ্গে সংঘাত হয়নি।
8. Product statement filters।
9. Loading/error/empty states।
10. Print header ও "memo statement" ঘোষণা।
11. Production build ও typecheck।

============================================================
২৩. IMPLEMENTATION PROCESS
============================================================

শুরুর আগে:

1. git status দেখে existing user changes preserve করো।
2. docs/company-product-financial-tracking-schema.sql চালানোর আগে §০.৬-এর
   column verification query গুলো চালাও।

Implementation ক্রম:

1. নতুন table ও view তৈরি (SQL ফাইল)।
2. Models / repositories / ProductTrackingService।
3. Settings API ও UI।
4. Received/Payment optional Product integration + REWRITE CONTRACT।
5. Bank ও Journal integration।
6. Voucher delete/cancel hook-এ mapping cleanup।
7. Bill query (view-ভিত্তিক)।
8. ledger-with-product report upgrade।
9. Historical dry-run/backfill।
10. Manual reconciliation।
11. Print/export।
12. Tests।
13. Build/typecheck।
14. php artisan route:clear

শেষে বাংলায় report করতে হবে:

- Inspect করা actual legacy tables এবং IDs
- কোন existing table অপরিবর্তিত রাখা হয়েছে (প্রমাণসহ)
- তৈরি হওয়া নতুন tables ও views
- তৈরি/পরিবর্তিত files
- Company–Product configuration flow
- Sales/Purchase Bill calculation formula
- Received/Payment mapping flow ও REWRITE CONTRACT
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

1. নির্দিষ্ট Company + নির্দিষ্ট Product combination configure করা যায়।
2. অন্য Company বা untracked Product প্রভাবিত হয় না।
3. Product-wise Sales Bill, Purchase Bill, Received, Payment দেখা যায়।
4. Product-wise Receivable ও Payable সঠিক দেখা যায়।
5. Opening ও closing balance সঠিক।
6. ⚠ Voucher edit করার পরেও হিসাব অপরিবর্তিত থাকে।
7. Bank ও Journal voucher হিসাবে আসে।
8. Historical bills existing invoice items থেকে আসে।
9. Historical cash mapping শুধু নিশ্চিত transaction-এর ক্ষেত্রে হয়।
10. Ambiguous data manual reconciliation করা যায়।
11. Product filter ছাড়া Ledger আগের মতো থাকে।
12. Untracked Product নির্বাচনে পুরোনো আচরণ অক্ষত থাকে।
13. Report-এ "memo statement" ঘোষণা ও Unmapped ঘর আছে।
14. কোনো legacy table ALTER হয়নি।
15. Tenant/company isolation tests pass করে।

============================================================
সংক্ষেপে মূল ধারণা
============================================================

    Product bill
        = Existing Sales/Purchase invoice line
          (qty × rate − apportioned master discount)

    Product cash movement
        = Existing Received/Payment/Journal voucher row
          + নতুন transaction_product_maps relation
          anchor: main_trx_id + row_seq  (detail row id নয়)

    কোন Company-এর কোন Product track হবে
        = নতুন company_product_tracking_settings

    পুরোনো কোনো table
        = অপরিবর্তিত
