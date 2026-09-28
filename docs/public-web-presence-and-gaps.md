# CashbookBD — পাবলিক উপস্থিতি ও ঘাটতি

তারিখ: ২০২৬-০৯-২৮। সবই `curl` দিয়ে যাচাই করা (সব 200)।

## যা লাইভ আছে

| কী | ঠিকানা |
|---|---|
| প্রচারের সাইট | `cashbookbd.com` |
| সফটওয়্যার | `app.cashbookbd.com` (`/register` আছে) |
| API | `my.cashbookbd.com` |
| প্ল্যানের দাম | `GET my.cashbookbd.com/api/subscription/plans` |
| মোবাইল অ্যাপ | প্লে স্টোর + সাইটে `public/CashBookBD.apk` (১৪.৩ MB) |

প্রচারের সাইটের কোড আলাদা রিপোতে: `F:\All_Database\www\cashbookwebsite`
(React 18 + Vite + Tailwind, বাংলা/ইংরেজির জন্য `LanguageContext`,
শাখা `Lutfor-Rahman`, শেষ পুশ ২০২৬-০৯-০৬)। সেকশনগুলো আগেই আছে — Hero,
Features, Pricing, Modules, Download, Tutorial, Contact, Footer।

সাইট আর সফটওয়্যার আগেই জোড়া লাগানো: `src/components/PricingSection.tsx`
দাম সরাসরি ওই প্ল্যান API থেকে টানে, আর রেজিস্টার বোতাম নিয়ে যায়
`app.cashbookbd.com/register?plan_id=<id>`-এ।

প্ল্যান API-র বর্তমান ক্যাটালগ: Free ০ / Starter ৫০০ / Business ১০০০ /
Enterprise — BDT, `max_*` লিমিট ও ফিচার ফ্ল্যাগ সহ।

Android অ্যাপ লাইভ, আর সে-ও ওই পাবলিক `register/request-otp` ও
`register/verify-otp` এন্ডপয়েন্টই ডাকে।

## যেটা আসলে নেই

1. **SEO দুর্বল।** পুরো সাইট ক্লায়েন্ট-রেন্ডার করা SPA — সার্ভার থেকে
   ~২.৬ KB খালি খোলস নামে, তাই ক্রলার প্রায় কিছুই দেখে না।
   `index.html`-এ বাংলা title/description/OG/JSON-LD ভালোভাবে বসানো আর
   `public/robots.txt` আছে, কিন্তু **`sitemap.xml` নেই**।
2. **পেমেন্ট পুরোপুরি ম্যানুয়াল।**
   `saas_subscription_payments.payment_method` হলো
   `ENUM('bkash','nagad','bank','cash')`; গ্রাহক নিজে ট্রানজেকশন আইডি ও
   প্রমাণ জমা দেয়, প্ল্যাটফর্ম অ্যাডমিন অনুমোদন করে। কোনো গেটওয়ে নেই
   (SSLCommerz / bKash / Nagad / Stripe — কিছুই না), ক্লায়েন্টের জন্য
   ইনভয়েস নেই, আর **অটো রিনিউয়ালও নেই** (শিডিউলারে কিছু নেই)।
3. **সাইট ডিপ্লয়ের পথ কোথাও লেখা নেই** — API-র জন্য
   `.scripts/production-deploy.sh` আছে, সাইটের `dist/` কীভাবে সার্ভারে
   ওঠে তা নথিবদ্ধ নয়।
4. **`saas_plans` প্রতিটি ডেটাবেজে আলাদা কপি** — এক ইনস্টলে দাম বদলালে
   বাকিগুলোয় বদলায় না।
5. **`PROJECT-AUDIT.md`-এর P0 ক্রস-টেন্যান্ট তালিকা** — ক্লায়েন্ট বাড়লে
   ঝুঁকিও বাড়ে (দেখুন `tenant-model-is-per-client-database-copy.md`)।

## প্রয়োগে

প্রচার/গ্রোথ নিয়ে আলোচনা উঠলে প্রথমেই মনে রাখতে হবে — **সাইটটা আগেই আছে
আর লাইভ**। তাই "নতুন সাইট বানানো" কোনো কাজ নয়। আসল কাজের ক্রম:

1. prerender/SEO + `sitemap.xml`
2. পেমেন্ট গেটওয়ে
3. কনটেন্ট (ডেমো ভিডিও, কেস স্টাডি)

খরচ প্রায় শূন্য — সব একই সার্ভারে চলছে।
