# Manufacturing / Production — সংশোধিত বাস্তবায়ন পরিকল্পনা

আপডেট: ৩ নভেম্বর ২০২৬ | সংস্করণ: ২
অবস্থা: পরিকল্পনা; কোনো কোড বা ডেটা পরিবর্তনের নির্দেশ নয়। নিচের প্রস্তাবিত default-গুলো মালিকের চূড়ান্ত সিদ্ধান্ত হিসেবে গণ্য হবে না।

## ১. উদ্দেশ্য ও সীমা
কাঁচামাল থেকে নতুন পণ্য, বড় প্যাকেট থেকে ছোট প্যাকেট, packaging ব্যবহার এবং প্রস্তুত combo pack তৈরি। Production batch অনুযায়ী quantity, cost, yield ও wastage track করা হবে। নতুন ব্রাঞ্চে feature enable হবে; পুরোনো ব্রাঞ্চের আচরণ অপরিবর্তিত থাকবে।

আগের প্রয়োজন বহাল: Recipe ও manual entry দুটোই, আলাদা SKU-তে ছোট প্যাকেট, নির্বাচিত production cost যোগ করা, wastage পৃথক দেখা, purchase/sales free goods এবং proportional returns। Business Type Manufacturing, Branch Type Factory/Branch Office ও General inventory/form configuration বর্তমান code/database দেখে যাচাই করতে হবে; এগুলো আগে থেকেই কার্যকর আছে ধরে নেওয়া যাবে না।

## ২. প্রথম সংস্করণের পরিধি
- একটি batch-এ একাধিক material input ও একটি finished output SKU।
- Repack ও আগে থেকে প্রস্তুত combo একই Production Entry দিয়ে হবে।
- খালি packet/label/carton stock item হিসেবে input হবে।
- Manual production আগে; Recipe পরে।
- Batch/lot reference ও production date থাকবে। Expiry tracking প্রয়োজন হলে প্রথম migration-এর আগেই সিদ্ধান্ত হবে।
- Multi-output, by-product, scrap resale, work-in-progress এবং sale-time bundle assembly প্রথম সংস্করণে থাকবে না। এমন লেনদেন silently সাধারণ batch হিসেবে নেওয়া যাবে না।
- Draft save-এ stock বদলাবে না। প্রস্তাবিত default: Post/Save & Post-এ তাৎক্ষণিক posting, আলাদা approval নয়। এটি মালিকের সিদ্ধান্তসাপেক্ষ।

## ৩. Production Entry
Header: branch, server/API-এর business date, server-generated voucher number, batch reference, optional recipe/version, notes।

Input: product, warehouse যেখানে প্রযোজ্য, entered unit/quantity, base-unit quantity, available stock, consumed FIFO layers, actual cost। FIFO cost backend নির্ধারণ করবে; user ইচ্ছেমতো input valuation বদলাতে পারবেন না।

Output: existing product/SKU, produced quantity, unit conversion, net contents যেখানে প্রযোজ্য, total batch value ও precise unit cost। Product তৈরি ও batch posting আলাদা কাজ হবে।

Cost: source expense/transaction reference, cost head, allocatable balance, allocated amount, cost date এবং explanation।

Wastage: material/measurement basis, actual quantity, expected quantity/percentage, reason। Packaging count ও material weight আলাদা দেখাতে হবে।

## ৪. Unit, yield ও cost
প্রতি product-এর base unit ও নির্দিষ্ট conversion থাকবে। যেমন ১ বস্তা চিনি = ৫০ kg; একটি ২৫০ g finished packet-এর net contents = ০.২৫ kg। Packet count আর kg সরাসরি যোগ করা যাবে না।

প্রস্তাবিত formula:
- Consumed material value = input FIFO layer costs-এর যোগফল।
- Batch capitalizable cost = material value + eligible allocated production costs।
- Output value = batch capitalizable cost − separately recognized abnormal-loss cost, যদি এমন loss workflow অনুমোদিত হয়।
- Output unit cost = output value / actual good output quantity।

প্রথম সংস্করণে শুধু নির্ধারিত স্বাভাবিক process loss absorb হবে। অস্বাভাবিক loss হলে অনুমোদিত accounting workflow না থাকা পর্যন্ত posting বন্ধ রেখে কারণ দেখাবে; Product Out দিয়ে একই consumption দ্বিতীয়বার post করা যাবে না।

Mass balance কেবল তুলনাযোগ্য material unit-এ হবে। Ingredient conversion/evaporation/moisture-যুক্ত process-এর জন্য expected yield recipe-তে সংজ্ঞায়িত হতে হবে।

সংশোধিত নমুনা:
| বিষয় | পরিমাণ | মূল্য |
|---|---:|---:|
| মরিচ | 60 kg | 7,200.00 |
| হলুদ | 40 kg | 6,000.00 |
| হিসাবভুক্ত eligible cost allocation | — | 3,060.00 |
| ভালো output | 95 × 1 kg | 16,260.00 |
| স্বাভাবিক loss | 5 kg / 5% | output cost-এ অন্তর্ভুক্ত |

16,260 / 95 = 171.157894…; display 171.16 হলেও layer total 16,260.00 থাকবে। Decimal arithmetic ও rounding residual policy ব্যবহার করতে হবে।

Repack: ৫০ kg input থেকে ১৯৮ × ২৫০ g = ৪৯.৫ kg; loss ০.৫ kg। Packaging-এর ১৯৮টি packet-এর value input material cost-এ থাকলে সেটি আবার extra cost-এ যোগ হবে না। মূল উদাহরণের packaging + labour ৯৯৪ টাকা ভেঙে উৎসসহ দেখাতে হবে। মোট cost ৬,৯৯৪ হলে precise unit cost ৬,৯৯৪ / ১৯৮।

Recipe উদাহরণ: ১০০টি ১ kg output এবং ৪% input-weight loss চাইলে ingredient input = ১০০ / ০.৯৬ = ১০৪.১৬৬৬… kg। ১০৫ kg input ও ৪% loss মানে ১০০.৮ kg output।

## ৫. অতিরিক্ত খরচ ও accounting model — বাধ্যতামূলক gate
“Production কখনো ledger লেখে না” সর্বজনীন নিয়ম হিসেবে থাকবে না। বিদ্যমান periodic/purchase-based reporting ও FIFO integration দেখে অনুমোদিত model নির্ধারণ করতে হবে।

প্রস্তাবিত প্রথম সংস্করণ: আগে থেকেই যথাযথ expense হিসেবে posted production cost থেকে batch allocation। Source debit line ও amount link থাকবে। Payment আগে তৈরি হবে; Production নিজে নতুন Cash/Payable posting করবে না। Source অদেয় হলেও valid posted expense/payable থাকলে নির্বাচিত model অনুযায়ী allocation সম্ভব। শুধু হাতে টাকার অঙ্ক লিখে stock value বাড়ানো যাবে না।

নিয়ন্ত্রণ:
- একই source amount মোট allocatable balance-এর বেশি allocate করা যাবে না।
- Allocation ও source transaction একই branch/company এবং বৈধ period-এর হতে হবে।
- Source expense material purchase বা আগেই inventory-capitalized cost হলে আবার capitalize করা যাবে না।
- Allocated source edit/reversal হলে production cost অকার্যকর হয়ে যেতে পারে; source-side guard না থাকলে posting চালু করার আগে অনুমোদিত dependency fix বা enforceable workflow প্রয়োজন।
- Cross-period allocation স্বয়ংক্রিয়ভাবে অনুমোদিত নয়; expense আগের period-এ থাকলে profit timing যাচাই ছাড়া নতুন period-এর inventory বাড়ানো যাবে না।

নতুন unpaid labour/accrual সরাসরি Production-এ নেওয়া ভবিষ্যৎ scope; প্রয়োজন হলে balanced journal ও liability workflow আলাদা অনুমোদন নিয়ে যোগ হবে।

উদাহরণে 3,060 Expense আগে recorded থাকলে production stock value-তে একই cost যোগ হওয়ার ফল expense/closing stock দিয়ে সমন্বিত হতে পারে। কিন্তু report engine সেই treatment করে কি না বাস্তব code ও test দিয়ে প্রমাণ করতে হবে।

Overhead: automatic monthly allocation প্রথম সংস্করণে নয়। বাদ দেওয়া production overhead-এর কারণে inventory valuation ও period profit বদলাতে পারে; তাই “মোট P&L সবসময় সঠিক” দাবি করা যাবে না। ভবিষ্যৎ estimated rate-এর জন্য actual expense allocation, under/over absorption ও period policy প্রয়োজন।

## ৬. Stock/FIFO integration ও data design
প্রস্তাবিত logical entities: production master, material inputs, output, source cost allocations, FIFO consumption links এবং audit/reversal references। প্রকৃত table name/schema বিদ্যমান code audit করে নির্ধারণ হবে।

Production master Product In/Out master হবে না। তবে canonical inventory movement engine-এ production-specific source reference দিয়ে stock_out ও stock_in দিতে হবে। Inventory history, FIFO rebuild, opening/closing stock, COGS ও returns—সব consumer production movements বুঝতে হবে। কোনো প্রয়োজনীয় consumer বাদ থাকলে implementation অসম্পূর্ণ।

Posting একটি database transaction-এ: validate → stock/cost-source locks → consume FIFO → create output cost layer → save source links → applicable accounting entries → mark posted। Error হলে সব rollback। Idempotency/unique request guard দিয়ে retry/double-click-এ একবারই posting। Concurrent batch যেন একই stock বা expense allocation দুবার ব্যবহার না করে।

Stock availability production date অনুযায়ী হবে; future receipt দিয়ে পুরোনো production পূরণ নয়। প্রস্তাবিত v1: downstream movement প্রভাবিত হয় এমন backdated posting বন্ধ, যতক্ষণ deterministic recosting নেই। একই দিনের dependency ordering স্পষ্ট করতে হবে। Negative stock নিষিদ্ধ।

## ৭. Edit, cancel ও audit
- Draft edit/delete করা যাবে; posted batch hard-delete নয়।
- Output বিক্রি, transfer, write-off, অন্য production-এ consume বা অন্যভাবে ব্যবহৃত হলে posted batch edit/cancel বন্ধ থাকবে।
- অব্যবহৃত output reversal-এ exact consumed input layers, allocated costs এবং output movement reverse করতে হবে। Date ও closed-period rules প্রযোজ্য।
- কে কখন কী post/reverse করেছেন, original ও reversal references সংরক্ষণ।

## ৮. Recipe
Recipe yield, input base quantities, packaging quantities, expected normal loss ও optional suggested cost allocation থাকবে। Production-এ copy/snapshot হবে; batch পরিবর্তনে recipe বদলাবে না। Recipe version ও effective date সংরক্ষণ করতে হবে। Suggested cost কোনো posted source ছাড়া capitalize হবে না।

## ৯. Free goods ও bundle — পরবর্তী phase
- Same-SKU sale: paid_qty ও free_qty আলাদা; stock_out = দুটির যোগফল, customer charge শুধু paid quantity অনুযায়ী।
- Different-SKU free: আলাদা linked promotion line, product reference ও zero customer charge; shared validation blanket শিথিল নয়।
- Scheme snapshot, eligibility date, threshold repetition, customer applicability ও manual-override permission নির্ধারণ।
- Return original invoice-এর paid/free lines ও original issue cost-এর সঙ্গে linked হবে। মোট cumulative return original quantities ছাড়াবে না। Integer free items-এর proportional rounding policy ও শেষ return-এ residual settlement নির্ধারণ করতে হবে।
- Purchase free goods: একই SKU-তে total allocated purchase cost / total received units। আলাদা free SKU হলে purchase cost allocation rule আগে নির্ধারণ হবে।
- Prepared bundle আলাদা SKU; components Production-এ consume হবে। Disassembly প্রথম সংস্করণে নয়।
- Delivery-based stock deduction চালু থাকলে invoice ও delivery-তে free quantity দুবার deduct করা যাবে না।

## ১০. Permission ও branch isolation
প্রস্তাবিত permissions: production.view/create/post/reverse/report.view; Recipe ও Scheme-এর পৃথক permissions পরে। Existing naming convention অনুযায়ী চূড়ান্ত keys হবে।

Menu, route ও API-তে authorization; feature-enabled branch এবং company/branch ownership server-side যাচাই। Numeric Business Type ID hardcode নয়। Permission একা stock/data scope নির্ধারণ করবে না।

## ১১. রিপোর্ট ও acceptance checks
Production Register, Batch Costing এবং material-to-output trace থাকবে; প্রথম দুটো একই report-এর list/detail হতে পারে। Quantity, value, allocated expense source, yield, loss ও output unit cost দেখা যাবে।

যাচাই করতে হবে:
1. Purchase → production → unsold output → partial sale → return: stock, FIFO ও COGS সঠিক।
2. Input FIFO multiple rates থেকে consume; partial layers; output batch total exact।
3. Expense allocation একবার ও একাধিক batch-এ; over-allocation/concurrent allocation blocked।
4. Expense 3,060 ও unsold finished stock-এর সমন্বয় অনুমোদিত model অনুযায়ী; partial sale-এ proportional cost recognition।
5. Trial Balance balanced; Inventory subledger valuation ও Balance Sheet inventory agree; P&L ও Cash Flow-তে capitalization double-count নয়।
6. Cross-period opening/closing stock, reversal ও blocked backdating।
7. Recipe/manual, repack conversion, packaging quantity ও rounding।
8. Unauthorized direct API ও cross-branch access rejected।
9. Failed/retried/concurrent saves duplicate movement তৈরি করে না।
10. Existing branches feature disabled থাকলে পূর্বের আচরণ অক্ষুণ্ণ।

সব verification isolated test database/branch-এ হবে। Live demo read-only। Print/PDF-এর সব text solid black; report-এ gray text নয়।

## ১২. বাস্তবায়নের ক্রম ও change boundary
Phase 0: read-only code/schema audit; FIFO engine, reporting consumers, cost sources ও legacy Manufacturing usage যাচাই; exact file/dependency list ও accounting examples দেখানো। Dev DB খালি দেখে client DB খালি ধরে নেওয়া নয়।
Phase 1: Manual single-output production, source-linked cost allocation, stock integration ও costing/register reports।
Phase 2: Recipe/versioning।
Phase 3: Sales free goods, scheme ও returns।
Phase 4: Purchase free goods।

পুরোনো Manufacturing module মুছবেন না; নতুন flow যেন পুরোনো hardcoded account/year IDs ব্যবহার না করে।

শুধু approved phase-এর প্রয়োজনীয় code পরিবর্তন হবে। Existing form/report/shared engine পরিবর্তন দরকার হলে exact impact দেখিয়ে আগে অনুমোদন নিতে হবে। “অন্য রিপোর্ট কখনো পরিবর্তন লাগবে না” প্রতিশ্রুতি দিয়ে production movements reporting থেকে বাদ দেওয়া যাবে না। পুরোনো branch, chart ও historical vouchers স্বয়ংক্রিয় migrate/repair নয়।

## ১৩. মালিকের বাকি সিদ্ধান্ত
1. Save & Post তাৎক্ষণিক হবে, নাকি approval workflow?
2. প্রস্তাবিত v1 single-output, source-linked costs, restricted backdating ও consumed-batch lock গ্রহণযোগ্য কি না।
3. কোন production cost heads eligible এবং allocation period policy কী।
4. স্বাভাবিক loss tolerance; অস্বাভাবিক loss blocked থাকবে কি না।
5. Product batch/expiry প্রয়োজন কি না।
6. Scheme সকল customer-এর জন্য, নাকি customer/time অনুযায়ী; fractional free returns-এর policy।
7. Overhead বাদ দেওয়ার valuation/profit impact ব্যবসা গ্রহণ করবে, নাকি allocation প্রথম phase-এই প্রয়োজন।

এই সিদ্ধান্ত ও Phase 0 evidence ছাড়া implementation অনুমোদিত ধরে নেওয়া যাবে না।
