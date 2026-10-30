# Tiles & Sanitary — Purchase Report (Spec)

Status: **Analysis settled for the report's arithmetic. A dummy report is in the app; the data behind it is not yet built.**
Updated: 2026-10-30.

Source of truth:
- The shop's sheet: [tiles_original_excel_report.xlsx](tiles_original_excel_report.xlsx) (sheet `Oct-26`, Akij Ceramics, invoice ACR-30401).
- The same invoice as the software holds it: `krishibitandatabase`, `main_trx_master.id = 4157`, voucher `9-261000323`, `inventory_purchase_masters.id = 2357`.
- The client's answers in the 2026-10-30 conversation (section 3).

## 1. Goal

Reproduce the shop's Excel purchase sheet from the software, with **nothing typed by hand**: every figure comes from the purchase, the product, or a setting.

## 2. The Excel, decoded (verified cell by cell)

| Col | Heading | Excel formula | Meaning |
|---|---|---|---|
| A | SN | typed | line number |
| B | Code | typed | product code |
| C | Size | typed | 8*12, 24*24 … |
| D | Box | typed | boxes (cartons) |
| E | Company Measurement | typed | **SFT per box**, the company's figure (16.14, 15.4945, 13.7728, 12.589) |
| F | SFT | `D × E` | |
| G | Rate | typed | Tk per SFT |
| H | Without Measurement | `G × E ÷ 11.667` | used nowhere else; 11.667 kept as is |
| I / J | Monthly SFT / Total | typed (1 or 5) / `F × I` | **Tk per SFT**, not a ratio |
| K / L | Broken SFT / Total | `G × 0.75 ÷ 100` / `F × K` | 0.75% of Rate (answers the old "0.2925" question) |
| M / N | Quarterly SFT / Total | typed 0.9 / `F × M` | Tk per SFT |
| O / P | Offer SFT / Total | typed (0.3, 4.1, 3.27, 2.3) / `F × O` | Tk per SFT, differs by product |
| Q | Invoice | `F × G` | the company's invoice value |
| R | Actual Price/SFT | `G − I − K − M − O` | rate after every commission |
| S | Actual Price/pcs | `R × (SFT per piece)` | the factor is typed and rounded in the sheet (3.87, 7.747, 6.885, 0.968) |
| T | Quaty | `D × pieces per box` | pieces; the multiplier is typed (25, 4, 2, 13) |
| U | Total | `S × T` | net cost of the line |
| row 16 | totals | `SUM` of D, F, J, L, N, P, Q, T, U | |

Header: company name; `Invoice No: ACR-30401`; `Month: Oct-26`; `Invoice Date: 24-10-26`.

**Correction to the earlier draft of this file:** Monthly, Quarterly and Offer are **Tk-per-SFT commissions applied to every SFT**, not ratios of SFT split into buckets. No target allocation is needed to draw this report.

## 3. Decisions (client, 2026-10-30)

| # | Question | Answer |
|---|---|---|
| Box | how many pieces make a box | `product_items.package_size`. Box = pieces bought ÷ `package_size`. |
| Company Measurement | where it lives | **New column on `product_items`.** (Unit still open — see 6.1.) |
| Rate | where it comes from | Worked back from the purchase's per-piece price (see 4). |
| Hand entry | | **Nothing on the report is typed.** Every value comes from the purchase, the product, or Settings. |
| Quarterly, Broken | per what | Differ by size or product. Each company's products are its own; two companies never share a product name. |
| Offer | per what | Per product. |
| Settings owner | | Per manufacturer (`product_manufacturers`: Akij, Sheltech, Marco Polo …). |
| Missing data | a product lacks `package_size`, Company Measurement or a setting | **The report stops with a warning** naming the product and what is missing. No blanks, no guesses. |
| Size column | | "Take the product code." (Open — see 6.2.) |
| Rate rounding | | 2 decimals (e.g. 2.25). |
| H, Without Measurement | | Keep it, 11.667 hardcoded. |
| Target missed | | The commission is **cancelled**. (How the report shows that — see 6.4.) |
| Header company | | The **supplier's ledger** name (e.g. "Akij Ceramics Ltd (Tiles)"). |
| Month | | `Oct-26` (month and year of the invoice). |
| Scope | | Choose a supplier and a month: **every invoice of that month, each as its own table**. |
| Which products | | Only products that have SFT. Sanitary items without it are left out. |

## 4. Calculation the software uses

Inputs per line: pieces (`inventory_purchase_details.quantity`), net price per piece (`purchase_price`), `package_size`, Company Measurement (SFT per box), Monthly, Quarterly, Offer (Tk per SFT), Broken % (0.75).

```
Box            = pieces ÷ package_size
SFT per piece  = Company Measurement ÷ package_size
SFT            = Box × Company Measurement
Rate           = round2( (net price per piece ÷ SFT per piece + Monthly + Quarterly + Offer) ÷ (1 − Broken% ÷ 100) )
Broken         = Rate × Broken% ÷ 100
Without Meas.  = Rate × Company Measurement ÷ 11.667
<X> Total      = SFT × <X>            for Monthly, Broken, Quarterly, Offer
Invoice        = SFT × Rate
Actual/SFT     = Rate − Monthly − Broken − Quarterly − Offer
Actual/pcs     = Actual/SFT × SFT per piece
Total          = Actual/pcs × pieces
```

Why Rate is worked back: the software stores only the **net** price per piece. Purchase line 6PGVT-CG111 holds 372.40, which is the Excel's S column, not the company's 103 Tk/SFT.

Checked against ACR-30401:
- Box (304), SFT (4762.3946) and Quaty (3318) match exactly.
- Line 1: Rate 39, Broken 0.2925 and Actual/SFT 36.5075 match.
- Rates come back as 39, 102.91, 194.99, 189.99, 129.97, 72.97, 199.99 against the Excel's 39, 103, 195, 190, 130, 73, 200.
  - The net price is stored at 2 decimals, so most lines come back a hair under the Excel's rate.
  - CG111 is further out (102.91) because the sheet used a hand-rounded 3.87 for 3.8736.
- Invoice total: 500,833.00 against the Excel's 501,004.23. Net total: 472,516.23 against 472,522.20 booked.

## 5. What the software holds today (krishibitandatabase)

- **`product_items`:**
  - has `package_size` (pieces per box) and `measurement` (the **nominal** SFT per piece: 24*24 → 4.000, 32*32 → 7.111, 12*12 → 1.000).
  - has `manufacture_id` (Akij = 8).
  - **No company measurement.** The company's figure differs from the nominal one: 3.8736 vs 4.000, 6.8864 vs 7.111.
- **`inventory_purchase_details`:**
  - `quantity` is in pieces; `purchase_price` is the net price per piece.
  - It also carries a snapshot of `measurement` and `package_size`, but only where the product had them.
- **`main_trx_master`:** `manual_voucher_no` = `ACR-30401`, `vr_date` = 2026-10-24. `manual_voucher_date` is empty.
- **Accounts:** supplier credited 472,522.00 (net), Purchase debited 472,522.20, Purchase Discount 0.20. The company's gross invoice (≈501,004) is not booked anywhere.
- **Products in ACR-30401 with no `package_size`:** 777LGR, 777DGR, 777HL, 766DBE, 12RK-704M, 30RK-PANORA-M104STP.
- **Excel typo:** its line 7 says 12RK-701M; the purchase has **12RK-704M**.

## 6. Still open

1. **Company Measurement unit.** SFT per box (as the Excel's E) or SFT per piece? The dummy uses per box.
2. **Size column.** A product code (777LGR, 6PGVT-CG111) does not contain the size. Should Size show the code, or come from somewhere else (a size field, or a size group)?
3. **Monthly 1 vs 5.** The rule is not known yet. In the sample, 24*48 lines carry 5 and every other size 1. Needs the company's commission letter.
4. **Cancelled commission.** When a target is missed and the commission is cancelled:
   - does the report show that commission as 0 (and so a higher Actual Price)?
   - does the purchase's cost, or the supplier's balance, have to change?
   - How is "target met" decided? This needs the targets of section 8.2.
5. **Settings shape.** Quarterly, Broken and Offer differ "by size or product", and Monthly's rule is unknown. Decide whether each is a per-product value, a per-size default under the manufacturer with a per-product override, or both.
6. **Setting history.** Rates are read from Settings at report time. If Akij changes a rate, do old invoices keep the old rate? If so, settings need a valid-from/valid-to date, or the line must snapshot them (section 8.1).
7. **Output.** Screen and print exist. Is an Excel download needed? A PDF?

## 7. Work list (to build it for real)

### 7.1 Database (cashbook_api, `patch:add-unit-type`)
- `product_items.company_measurement` DECIMAL(18,4) NULL (unit per 6.1).
- Commission settings per manufacturer, shaped per 6.3 and 6.5 — for example `tiles_commission_rates`: `manufacturer_id`, `product_id` (or size), `monthly_per_sft`, `quarterly_per_sft`, `broken_pct`, `offer_per_sft`, and dates if 6.6 says so.
- Add both through `patch:add-unit-type`. Keep the change additive so `patch:preflight` has nothing to block.

### 7.2 Settings screens (React)
- Company Measurement on the product form, beside `package_size` and `measurement`.
- A Tiles Commission settings screen: choose a manufacturer, then edit Monthly, Quarterly, Broken % and Offer per product or size.
- A list of products with SFT that still lack `package_size`, Company Measurement or a setting, so the gaps can be filled before the report is run.

### 7.3 Report API (cashbook_api)
- `GET reports/tiles-purchase?supplier_id=&month=YYYY-MM&branch_id=`.
- Returns every purchase invoice of that supplier in that month:
  - header: supplier ledger name, `manual_voucher_no`, `vr_date`;
  - lines: code, size, pieces, net price, `package_size`, company measurement, and the four settings;
  - per line, the names of any missing fields.
- Only products with SFT (6 / section 3).
- Leave the arithmetic to one place. Either the API or `tilesPurchaseCalc.ts` computes it, not both. The calc file is the tested one.

### 7.4 Report screen (React)
- Swap `tilesPurchaseDemo.ts` for the API.
- Fill the supplier list from the supplier ledgers and the month from the picker. Both are demo-only today.
- Keep the missing-settings warning as it is.
- Add Excel export if 6.7 says so, laid out as the shop's sheet.
- Remove the yellow "Demo data" note.

### 7.5 Data clean-up (krishibitandatabase)
- Fill `package_size` for the products in section 5, and Company Measurement for every tile.
- Enter the commission settings for Akij from the Excel (and for every other manufacturer from their letters).

## 8. Possibly later

1. **Snapshot on the purchase line.** Store box, company measurement, rate and the four commissions on `inventory_purchase_details` when the purchase is saved. A later change to a setting then never rewrites an old report, and Rate need not be worked back. Enter Rate and commissions, and let the purchase screen compute the net price per piece. This removes the 2-decimal drift in section 4.
2. **Targets** (from the earlier draft, still valid):
   - targets per company and item, monthly / quarterly / half / year;
   - both SFT and money;
   - monthly targets are minimums, quarter targets independent totals;
   - each company with its own quarter start month.
   - Needed to decide 6.4 automatically.
3. **Special offers:** date-ranged offers by company, item or all, with a priority rule and a snapshot on the line.
4. **Booking the commission:**
   - Should the supplier's ledger carry the gross invoice?
   - Should the commissions be a receivable from the company until earned?
   - Should a cancelled commission be booked as a cost adjustment?
5. **Month view and progress:** the month's totals per product or size against target, beside the per-invoice tables.
6. **Android:** the same report on the mobile app, from the same API.

## 9. What exists now

**Dummy report**
- Where: Reports → Purchase & Sales → **Tiles Purchase** (`/reports/tiles-purchase`), under the `purchase.ledger` permission.
- Pushed to `cashbookbd_react` branch `Reseller-ui` (commit `eaac018d`).
- Files: `src/components/modules/reports/tiles-purchase/`:
  - `tilesPurchaseCalc.ts` — the arithmetic of section 4, checked against the Excel;
  - `tilesPurchaseDemo.ts` — **demo data**: ACR-30401's pieces and net prices from the database, with company measurement, the commissions and six missing `package_size` values taken from the Excel; plus one made-up invoice to show the missing-settings warning;
  - `TilesPurchaseReport.tsx` — the screen.
- The supplier and month filters only pick among the demo invoices.
- **Not yet seen in a browser:** the local demo login does not exist in the local database.

**Nothing has changed in the database for this report yet.**

Related: [WEB_PARITY_2026_08_01.md](WEB_PARITY_2026_08_01.md), [ANDROID_REPORTS_API_SPEC.md](ANDROID_REPORTS_API_SPEC.md).
