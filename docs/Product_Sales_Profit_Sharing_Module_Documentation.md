# পণ্য বিক্রয়ভিত্তিক লাভ-বণ্টন ও রেফারেল মডিউল

বর্তমান CashbookBD React + Laravel প্রকল্পের জন্য Feasibility, Functional ও Technical Documentation

- নথির ধরন: প্রস্তাবিত নতুন মডিউলের প্রকল্প ডকুমেন্টেশন
- প্রস্তুতের তারিখ: ০৯ আগস্ট ২০২৬
- মূল নীতি: সদস্য হতে কোনো টাকা লাগবে না; কেবল বাস্তব পণ্য বিক্রয়ের বাস্তবায়িত লাভের অংশ ভাগ হবে।

## ১. Executive Summary

**সিদ্ধান্ত:** প্রস্তাবিত মডিউলটি বর্তমান প্রকল্পের সঙ্গে যোগ করা প্রযুক্তিগতভাবে সম্ভব। বর্তমান সিস্টেমে Product, Purchase/Sales, Sales Return, Customer account ও portal, Product-wise Profit/Loss, Redux state, API service, permission এবং settings অবকাঠামো আছে। তবে এটি শুধু frontend feature নয়; Laravel backend, database, sales lifecycle, return/reversal এবং accounting-এ সমন্বিত পরিবর্তন প্রয়োজন।

মডিউলটির প্রস্তাবিত নাম **Product Sales Profit-Sharing Referral Module**। ব্যবসায়িক ভাষায় MLM বলা গেলেও সফটওয়্যারে “Profit Sharing” বা “Referral Commission” নাম অধিক সুনির্দিষ্ট, কারণ:

- সদস্য ভর্তি সম্পূর্ণ বিনামূল্যে;
- কাউকে সদস্য বানানোর জন্য কোনো কমিশন নেই;
- শুধু বাস্তব পণ্য বিক্রি, মূল্য পরিশোধ/অনুমোদন এবং প্রযোজ্য return period শেষে কমিশন তৈরি হবে;
- বণ্টিত অর্থ সংশ্লিষ্ট বিক্রয়ের নির্ধারিত প্রকৃত লাভ অতিক্রম করবে না।

## ২. নথির পরিধি ও বর্তমান ব্যবস্থা

এই নথি frontend repository `cashbookbd_react` এবং সংযুক্ত Laravel API project `cashbook_api`-এর source structure পর্যালোচনার ভিত্তিতে প্রস্তুত। এটি implementation নয়; implementation-এর blueprint।

| বর্তমান অংশ | পর্যালোচনায় পাওয়া অবস্থা | নতুন মডিউলে ভূমিকা |
|---|---|---|
| Frontend | React 18, TypeScript, Vite, Redux Toolkit, Axios, React Router, Tailwind/Ant Design | Admin ও Member UI |
| Backend | Laravel 13, PHP 8.4, Sanctum, Spatie Permission | হিসাব, transaction, API ও authorization |
| Product/Sales | Product list, trading/electronics/general sales, details ও return | Commission source event |
| Profit report | Stock layer matching করে sale total বনাম purchase cost | Profit engine-এর ভিত্তি; posting-time snapshot প্রয়োজন |
| Customer | Customer/Supplier account ও customer login/dashboard | Member identity ও self-service portal |
| Settings/Permission | Branch/company settings ও permission-guarded routes | Module toggle, configuration ও role control |
| Existing Reseller | SaaS subscription reseller commission ledger/payment | UI/ledger pattern আংশিক reuse; product referral হিসেবে সরাসরি নয় |

## ৩. Business Definition

### ৩.১ বাধ্যতামূলক নীতি

1. সদস্য হওয়ার জন্য admission fee, subscription, security deposit বা activation fee থাকবে না।
2. Admin নির্ধারিত যোগ্য পণ্য কিনে qualifying sale সম্পন্ন হলে customer স্বয়ংক্রিয়ভাবে member হতে পারবেন।
3. নতুন member যুক্ত করলেই কোনো আয় হবে না। আয় কেবল তার বা downline-এর qualifying product sale-এর বাস্তবায়িত লাভ থেকে হবে।
4. প্রতি পণ্য/ক্যাটাগরি/ক্যাম্পেইনে ক্রেতার cashback এবং level-wise share Admin নির্ধারণ করবেন।
5. সর্বোচ্চ কত level পর্যন্ত share যাবে তা Admin নির্ধারণ করবেন।
6. Cancel, return, refund বা sale edit হলে সংশ্লিষ্ট commission reverse বা পুনর্গণনা হবে।

### ৩.২ পরিভাষা

| শব্দ | অর্থ |
|---|---|
| Member | যোগ্য পণ্য ক্রয়ের মাধ্যমে বিনা মূল্যে নিবন্ধিত customer |
| Sponsor/Referrer | যার referral code/link/ID ব্যবহার করে নতুন customer এসেছে |
| Upline | Member-এর উপরের referral chain |
| Qualifying Sale | যে বিক্রয় profit-sharing-এর সব শর্ত পূরণ করে |
| Realized Profit | অনুমোদিত পদ্ধতিতে বিক্রয় আয় থেকে cost ও deduction বাদ দিয়ে লাভ |
| Cashback | ক্রেতার নিজের purchase থেকে লাভের নির্ধারিত অংশ |
| Level Commission | বাস্তব product sale-এর লাভ থেকে যোগ্য upline-এর অংশ |
| Wallet Ledger | সব credit, debit, hold, release ও reversal-এর অপরিবর্তনীয় হিসাব |

## ৪. Profit Calculation ও Distribution Rule

প্রাথমিক সূত্র:

> **Realized Profit = Net Product Sales − Cost of Goods Sold − Allocated Product-level Costs**

Net Product Sales-এ line discount এবং line-attributed invoice discount বাদ যাবে। বর্তমান Product Profit/Loss report-এর stock-layer consumption logic একটি শক্তিশালী ভিত্তি। তবে report থেকে পরে হিসাব তুলে কমিশন তৈরি না করে qualifying sale final হওয়ার সময় প্রতিটি sales line-এর cost ও rule snapshot সংরক্ষণ করতে হবে। এতে purchase rate বা settings বদলালেও পুরোনো commission বদলাবে না।

### ৪.১ প্রয়োজনীয় সিদ্ধান্ত

- Costing: বর্তমান stock-layer/FIFO-like matching নাকি weighted average—একটি canonical পদ্ধতি;
- Invoice-level discount line item-এ quantity/value অনুপাতে allocation;
- VAT/Tax, delivery, packaging বা sales expense লাভ থেকে বাদ যাবে কি না;
- Negative/zero profit হলে distributable profit সর্বদা ০;
- Rounding দুই decimal-এ; rounding difference company share-এ;
- Cashback + level commission কখনো distributable cap অতিক্রম করবে না।

### ৪.২ উদাহরণ

| বিবরণ | টাকা |
|---|---:|
| Net sales | ৳৫,০০০ |
| COGS ও অনুমোদিত allocated cost | ৳৪,০০০ |
| **Realized profit** | **৳১,০০০** |

| প্রাপক | লাভের হার | পরিমাণ |
|---|---:|---:|
| Buyer cashback | ১০% | ৳১০০ |
| Level 1 sponsor | ৮% | ৳৮০ |
| Level 2 | ৪% | ৳৪০ |
| Level 3 | ২% | ৳২০ |
| Company retained profit | ৭৬% | ৳৭৬০ |

## ৫. End-to-End Workflow

1. Admin module ও rule version চালু করে eligible product/category নির্ধারণ করবেন।
2. Customer sale-এর সময় existing member/referral code নেওয়া হবে; sponsor না থাকলে Company/Root ধরা হবে।
3. Eligible product কেনা নতুন customer-এর free membership, Member ID ও unique referral code তৈরি হবে।
4. Sales transaction সফল হলে line-wise profit snapshot ও provisional distribution তৈরি হবে; status **Pending**।
5. Sale delivered/paid এবং return-hold period শেষ হলে commission **Available** হবে।
6. Wallet statement-এ buyer cashback ও referral commission আলাদা source সহ দেখা যাবে।
7. Member withdrawal request করবেন; Admin verify করে bKash/Nagad/Bank/Cash-এ পরিশোধ করবেন।
8. Return/edit/cancel হলে original distribution-এর বিপরীতে reversal ledger হবে; পুরোনো ledger delete হবে না।

## ৬. প্রস্তাবিত Database Design

| Table | মূল উদ্দেশ্য ও গুরুত্বপূর্ণ field |
|---|---|
| `profit_share_settings` | company/branch, enabled, max_level, hold_days, withdrawal rules, costing_method |
| `profit_share_rule_versions` | Immutable rule version, buyer rate, cap, eligibility, effective dates |
| `profit_share_level_rules` | rule_version_id, level_no, percentage/fixed value, active requirement |
| `profit_share_product_rules` | product/category, membership eligibility, enable/override values |
| `members` | company, customer identity, member/referral code, sponsor, joined sale, KYC/status |
| `member_payment_accounts` | method, account details ও verification status |
| `sale_profit_snapshots` | sale/detail, product, qty, net sales, COGS, cost, profit, rule version |
| `profit_distributions` | beneficiary/source, buyer/level/company type, level, rate, amount, status |
| `member_wallet_ledgers` | member, direction/type, amount, source, status, idempotency key |
| `withdrawal_requests` | requested/net/charge amount, account snapshot, approval/payment তথ্য |
| `profit_share_audit_logs` | actor, action, entity, before/after, reason, device/time |

> Member relation company/tenant scoped হতে হবে। একই customer বিভিন্ন company-তে থাকলে referral tree ও wallet যেন মিশে না যায়। Sponsor cycle আটকাতে database/service validation আবশ্যক।

## ৭. Backend পরিবর্তন ও পরিবর্ধন

### ৭.১ নতুন service layer

- **MembershipService:** qualifying sale থেকে member create/activate ও referral resolution;
- **SaleProfitCalculator:** net sale, cost layer, discount allocation ও profit snapshot;
- **ReferralTreeService:** configured level পর্যন্ত sponsor chain এবং cycle/tenant validation;
- **ProfitDistributionService:** versioned rule, cap validation ও pending distribution;
- **CommissionReleaseService:** hold period শেষে available করা;
- **CommissionReversalService:** return, cancel ও sale edit-এর compensating entries;
- **WalletService:** atomic ledger posting, balance query ও idempotency;
- **WithdrawalService:** request, balance reserve, approve/reject/pay ও audit।

### ৭.২ বর্তমান sales flow-এ integration

Trading, Electronics এবং General sales-এর কোন flow profit-sharing-এর আওতায় আসবে তা scope-এ ঘোষণা করতে হবে। প্রতিটি supported flow-এ sale save হওয়ার পর:

1. Customer ও referral context validate;
2. Membership eligibility evaluate;
3. Profit snapshot তৈরি;
4. Unique idempotency key দিয়ে pending distribution/ledger তৈরি;
5. Failure-এ sale consistency অক্ষুণ্ণ রাখা।

বর্তমান Trading sales flow-এ `inventory_sales_masters`, `inventory_sales_details`, inventory ও accounting transactions লেখা হয়। নতুন posting hook persisted identifiers ব্যবহার করবে। একাধিক controller-এ calculation copy না করে shared domain service প্রয়োজন।

### ৭.৩ Return/Edit/Delete

- Full return: সংশ্লিষ্ট commission reverse;
- Partial return: returned line quantity/value অনুযায়ী recalculation;
- Pending commission cancel;
- Available কিন্তু অব্যয়িত balance-এ reversal debit;
- Withdraw হয়ে থাকলে negative payable/debt বা recovery policy;
- Sale edit: old snapshot reverse করে new snapshot post;
- Recycle restore: idempotent re-post, duplicate নয়।

### ৭.৪ Accounting integration

Wallet balance কোম্পানির payable/liability। “Member Profit Share Payable”, “Profit Share Expense/Allocation” এবং “Withdrawal Clearing/Bank/Cash” account প্রয়োজন হতে পারে।

- **Operational sub-ledger + summarized GL posting:** member details wallet ledger-এ, batch summary accounts-এ;
- **Per-member COA posting:** প্রতিটি member-এর আলাদা liability account; বড় member base-এ ভারী।

বর্তমান architecture-এ operational member sub-ledger এবং controlled summary GL posting অধিক scalable। Accountant-এর সঙ্গে final policy স্থির করতে হবে।

## ৮. প্রস্তাবিত API

| Area | Endpoint-এর উদাহরণ |
|---|---|
| Admin settings | GET/PUT `/api/profit-sharing/settings` |
| Rules | GET/POST `/api/profit-sharing/rules`; activate/version endpoint |
| Products | GET/PUT `/api/profit-sharing/product-rules` |
| Members | GET `/api/profit-sharing/members`; detail/status/KYC |
| Tree | GET `/api/profit-sharing/members/{id}/tree` |
| Distributions | GET `/api/profit-sharing/distributions`; release/recalculate |
| Admin withdrawals | List এবং approve/reject/pay `/api/profit-sharing/withdrawals` |
| Member portal | Dashboard, wallet, referrals ও earnings endpoints |
| Member withdrawal | POST `/api/customer/profit-sharing/withdrawals` |
| Reports | Distribution, liability, reversal ও retained profit |

সব write endpoint-এ validation, tenant scope, permission, database transaction, idempotency ও audit প্রয়োজন। Amount frontend থেকে বিশ্বাস না করে backend-এ পুনর্গণনা করতে হবে।

## ৯. React Frontend পরিবর্তন

### ৯.১ Admin UI

- Profit Sharing dashboard;
- General Settings ও rule version screen;
- Level-wise percentage editor ও cap validation;
- Product/category eligibility ও overrides;
- Member list, profile ও referral tree;
- Distribution list;
- Withdrawal approval/payment;
- Permission ও auditসহ wallet adjustment;
- Reports, Excel export ও print।

### ৯.২ Sales UI

- Customer নির্বাচন অপরিহার্য; walk-in cash customer-এ member earning নয়;
- Referral code/member search;
- Eligible product ও estimated share preview;
- Existing sponsor পরিবর্তনে warning/permission;
- Invoice print-এ optional earned cashback/pending message।

### ৯.৩ Customer/Member Portal

- Member/referral code ও QR;
- Pending, available, reserved ও withdrawn balance;
- Cashback ও level earning statement;
- Direct referral/downline summary;
- Withdrawal request/history;
- KYC ও payout account;
- Return reversal-এর ব্যাখ্যা।

### ৯.৪ Frontend codebase touchpoints

- `src/components/services/apiRoutes.tsx` — API constants;
- `src/components/services/appRoutes.tsx` — app routes;
- `src/App.tsx` — permission-guarded routes;
- `src/components/Sidebar/index.tsx` — menus;
- `src/store.tsx` — Redux slice;
- `src/components/modules/invoices/sales/*` — referral input/preview;
- `src/layout/CustomerLayout.tsx` ও customer dashboard — member portal;
- নতুন `src/components/modules/profit-sharing/` feature folder।

## ১০. Existing Reseller Module: Reuse সিদ্ধান্ত

বর্তমান Reseller module company assignment ও SaaS subscription payment-এর commission পরিচালনা করে। নতুন module customer, product sale, বহু level ও product profit ভিত্তিক। একই tables/service ব্যবহার করলে আলাদা economic domain জড়িয়ে যাবে।

| Reuse করা যাবে | Reuse করা উচিত নয় |
|---|---|
| Dashboard/table presentation, payment fields, pagination, permission, ledger filter ও payment UX | `resellers` identity, company assignment, subscription calculation, reseller ledger-কে member wallet করা |

**প্রস্তাব:** code/UI pattern reuse করুন; নতুন tables, services, permissions ও APIs রাখুন।

## ১১. Permission প্রস্তাব

- `profit.sharing.settings.view/update`
- `profit.sharing.rules.view/create/activate`
- `profit.sharing.members.view/update/suspend`
- `profit.sharing.tree.view`
- `profit.sharing.distributions.view/release/reverse`
- `profit.sharing.withdrawals.view/approve/reject/pay`
- `profit.sharing.wallet.adjust`
- `profit.sharing.reports.view/export`
- `customer.profit.sharing.view/withdraw`

## ১২. Security, Integrity ও Fraud Control

- Self-sponsor বা referral cycle নয়;
- Sponsor স্থায়ী; privileged ও audited correction;
- Duplicate mobile/NID/payout detection;
- Self-referral policy;
- Abnormal device/IP ও sale-return pattern flagging;
- Withdrawal-এর আগে KYC, OTP/2FA ও payout ownership verification;
- Ledger update/delete নয়; compensating entry;
- Transaction, row lock ও idempotency দিয়ে double credit/payment প্রতিরোধ;
- Member কেবল নিজের data দেখবেন; tenant isolation;
- Manual action-এ reason ও immutable audit trail।

## ১৩. Reports

- Product-wise sale, COGS, realized profit ও distribution;
- Sale/invoice-wise distribution breakdown;
- Member-wise cashback, level earning, withdrawal ও balance;
- Level-wise commission;
- Pending aging ও release schedule;
- Return/reversal;
- Withdrawal reconciliation;
- Total member liability ও GL reconciliation;
- Company retained profit;
- Rule version/product performance;
- Suspicious/refund-heavy member।

## ১৪. বাস্তবায়ন ধাপ

| Phase | Deliverable |
|---|---|
| ০ — Policy finalization | Costing, qualifying state, hold, sponsor, accounting ও withdrawal policy |
| ১ — Foundation | Migrations, models, permissions, settings/rule version, member identity |
| ২ — Profit engine | Cost calculation, snapshot, distribution ও wallet ledger |
| ৩ — Sales/Return integration | একটি sales type pilot; edit/cancel/full/partial return |
| ৪ — Admin UI | Settings, products, members, tree, distribution ও monitoring |
| ৫ — Member portal | Dashboard, referral code, wallet ও statement |
| ৬ — Withdrawal/Accounting | KYC, approval/payment, liability/GL reconciliation |
| ৭ — Reports & hardening | Reports, fraud control, load/security tests, rollout |

## ১৫. Testing ও Acceptance Criteria

### ১৫.১ আবশ্যক test scenario

- Eligible বনাম ineligible product;
- Free member creation ও existing member reuse;
- Configured levels এবং missing/inactive upline;
- Zero/negative profit;
- Discount, fractional quantity ও rounding;
- Cash, credit ও partial payment policy;
- Full/partial return, edit, cancel ও restore;
- Retry করলেও duplicate credit নয়;
- Rule পরিবর্তনের পর পুরোনো sale অপরিবর্তিত;
- Concurrent withdrawal-এ negative balance নয়;
- Cross-company access blocked;
- Wallet ও accounting liability reconciliation।

### ১৫.২ Minimum acceptance criteria

1. কোনো ভর্তি ফি বা recruitment-only commission তৈরি হয় না।
2. প্রতিটি earning নির্দিষ্ট qualified sale line ও profit snapshot-এ trace করা যায়।
3. Distribution কখনো configured distributable profit অতিক্রম করে না।
4. Return/edit-এর পর সঠিক reversal ও audit history থাকে।
5. Member balance ledger থেকে পুনর্গঠন করা যায়।
6. Unauthorized user অন্য member/company data বা payment action নিতে পারে না।

## ১৬. Risk ও Mitigation

| Risk | Mitigation |
|---|---|
| Report profit ও commission profit ভিন্ন | Shared canonical calculator ও sale-time snapshot |
| Return-এর আগে withdrawal | Hold period ও recovery policy |
| Settings বদলে historical amount বদল | Immutable rule version/snapshot |
| Double commission | Unique source key, DB constraint, transaction, idempotency |
| Referral tree corruption | Cycle validation, immutable sponsor, tenant scope |
| Accounting mismatch | Daily reconciliation, liability report, controlled GL posting |
| ভুল পরিচিতি/আইনি ব্যাখ্যা | Product-sale profit-sharing নীতি ও স্থানীয় compliance review |

## ১৭. Implementation শুরুর আগে সিদ্ধান্ত

1. কোন sales types প্রথম release-এ থাকবে?
2. Sale কখন qualifying হবে—paid, delivered, day-close, নাকি return period শেষে?
3. Costing-এর canonical পদ্ধতি কী?
4. Buyer cashback ও level-wise default rate/cap কত?
5. সর্বোচ্চ level কত?
6. Inactive/missing upline-এর share company রাখবে, skip করবে, নাকি compression হবে?
7. Membership eligible product/amount/quantity কী?
8. Sponsor কখন lock হবে এবং correction policy কী?
9. Minimum withdrawal, charge, KYC ও payment method কী?
10. Withdraw হয়ে যাওয়া earning পরে return হলে recovery policy কী?
11. Accounting posting summary হবে নাকি member-wise COA?

## ১৮. চূড়ান্ত সুপারিশ

বর্তমান codebase এই মডিউলের জন্য উপযুক্ত ভিত্তি দেয়। সবচেয়ে নিরাপদ প্রথম release:

- একটি নির্দিষ্ট sales flow দিয়ে pilot;
- সর্বোচ্চ ৩ level;
- স্থায়ী sponsor ও free automatic membership;
- শুধু positive realized product profit থেকে share;
- Return hold শেষে balance available;
- Immutable rule snapshot ও append-only wallet ledger;
- প্রথম থেকেই full/partial return reversal;
- Admin-approved withdrawal ও liability reconciliation।

> **Bottom line:** মডিউলটি করা সম্ভব এবং বর্তমান Product/Sales/Customer/Profit/Permission অবকাঠামো সহায়ক। নির্ভুল অর্থনৈতিক ফলের জন্য backend-led design বাধ্যতামূলক। Frontend-এর estimated commission authoritative নয়; চূড়ান্ত হিসাব Laravel service ও database transaction-এ হবে।

---

এই নথি source-code feasibility ও software design documentation। এটি আইন, কর বা হিসাববিজ্ঞানের পেশাদার মতামতের বিকল্প নয়। Production rollout-এর আগে সংশ্লিষ্ট স্থানীয় বিধি ও প্রতিষ্ঠানের accounting policy যাচাই প্রয়োজন।
