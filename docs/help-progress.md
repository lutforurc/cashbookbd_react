# Help — কাজের অগ্রগতি

শেষ হালনাগাদ: 06/11/2026

## ব্যবস্থাটি

- **একটি Help জানালা:** `HelpProvider` মূল layout-এ একবার বসানো; সব স্ক্রিনের `?`
  একই `HelpModal` খোলে।
- **একটি স্থায়ী জায়গা:** `?` এখন `HelmetTitle`-এ, পেজের শিরোনামের পাশে ভিডিও
  আইকনের ঠিক পরে। কোনো স্ক্রিনে আলাদা বা ভাসমান বাটন নেই।
- **topic কোথা থেকে:** `helpTopicForPath.ts`-এর route-map; ট্যাবওয়ালা স্ক্রিন
  (Assets) নিজের `helpTopic` দেয়, আর `/hrms/attendance/*` ট্যাবের শিরোনাম ও
  route অনুযায়ী আলাদা topic পায়।
- **পূর্ণ তালিকা:** `docs/help-coverage.md` — ৩০১টি route: **done ২৮৪**,
  **skipped ১৭**, **বাকি ০**।
- **Sidebar:** প্রতিটি মেনু ও সাবমেনু লিংকের topic আছে। `/admin/check-register`
  লিংকটি কোডে মন্তব্য করা, তাই skipped।
- **লেখা শুধু JSON-এ:** `public/help/<module>.json` (২৩টি ফাইল, ২৩৭টি বিষয়);
  তালিকা `public/help/index.json`।
- **যাচাই:** `npm run help:check` — JSON, বিষয়ের ঘর, index-এর মিল, প্রতিটি done
  route-এর topic route-map-এ আছে কি না, আর সেই স্ক্রিনে `HelmetTitle` আছে কি না।

## হয়ে গেছে

| মডিউল | বিষয় |
| --- | --- |
| Sales, Purchase, Collection, Payment | invoice, return, cash/bank receive ও payment |
| Ledger, Cash Book, Reports | ledger, cash/bank book, ৩৬+ রিপোর্ট |
| HRM | labour, requisition, employee, designation, attendance (ট্যাবভিত্তিক), salary, bonus |
| Real Estate | এলাকা, প্রকল্প, বিল্ডিং, ইউনিট, বিক্রি, কিস্তি, রিপোর্ট |
| Hotel | সেটআপ, বুকিং, হল, ক্যালেন্ডার, হাউসকিপিং, স্টোর, দৈনিক এন্ট্রি |
| Assets | Categories, Items, Register, Under construction, Depreciation, Schedule, Handovers, Verification |
| Products | list, form, category, brand, unit, pack size, group, stock alerts, statement, opening import |
| Customers | list, form, opening import |
| Inventory | Product In/Out, reasons, registers, Branch Issue/Receive, Material Issue |
| Chart of Accounts | L1–L4, opening balance |
| Admin | deletions, voucher images, business types, inventory systems, tutorials, in-app messages, installments, day close/jump, notifications, approvals, resellers, unit payments, voucher date/type, website templates, highlight rules |
| Subscription, Settings | plans, pricing, my plan, payment, billing; print layout, menu, software info, product tracking, voucher settings |
| Accounts extras | bank reconciliation, budget, cheque register, employee loan (3), inter-branch, year closing |
| Invoices/Orders | delivery, labour invoice, sales/purchase import, tiles/trading combined; order list/form, average price, order transactions |
| Users/Company | user list/form, company users, online users, login history, roles/permissions, company, branch wizard |
| Others | SMS log/templates, legacy records/accounts, somity reports, dashboards, customer dashboard, reseller, approval center, company scheme, product tracking, profile, devices, tasks, switch branch, change password |

## Skipped (কারণসহ)

- `/admin/check-register` — Sidebar লিংক কোডে মন্তব্য করা (নিষ্ক্রিয়)।
- `/customer/login`, `/customer/change-password`, `/customer-dashboard`-এর পাবলিক
  রূপ, `/customer` — সাইন-ইন করা Help layout-এর বাইরে।
- `/account-deletion` — পাবলিক পাতা, Help layout-এর বাইরে।
- `/forgot-password`, reset-password — পাসওয়ার্ড রিসেট।
- `/forms/form-elements`, `/forms/form-layout`, `/ui/alerts`, `/ui/buttons` —
  টেমপ্লেটের নমুনা পাতা, ব্যবসার কোনো তথ্য নেই।
- `hello-bangladesh`, `no-access` — পরীক্ষার/অনুমতি নেই পাতা।

## সীমাবদ্ধতা

- পুরনো `public/help/help.json` আগের এক-ফাইল সংস্করণ; এখন পড়া হয় না, ফাইল মোছা
  নিষেধ তাই রাখা হয়েছে।
- `businessTypes` সব বিষয়ে `"all"`; শাখার ব্যবসার ধরন অনুযায়ী ফিল্টার এখনো ব্যবহার
  করা হয়নি।
- Print বাটন আছে, কিন্তু হেডলেস ব্রাউজারে print dialog যাচাই করা যায় না।
- **শেষ ব্রাউজার যাচাই (06/11/2026):** `http://127.0.0.1:5173/` খুলেছে এবং
  সাইন-ইন পাতা দেখা গেছে। লোকাল API-তে ডেমো অ্যাকাউন্ট দিয়ে সেশন তৈরি হয়নি;
  staging API-তেও একই ফল। automation daemon মাঝে মাঝে unresponsive হয়েছে।
  তাই শিরোনামের পাশের `?` চোখে দেখা যায়নি — কোড, route-map ও HelmetTitle
  যাচাই `help:check`-এ পাস করেছে, কিন্তু দৃশ্য যাচাই বাকি।
