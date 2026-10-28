# Tiles & Sanitary — Purchase Report & Target Settings (Draft Spec)

Status: **Draft / discussion notes.** No code or schema changed yet.
Source of truth for requirements: client conversation (Akij Ceramics LTD sample invoice, "Manual Memo No. Order ACR-30401").

## 1. Goal

Generate the client's purchase invoice report (Excel layout) from the software, one report per purchase invoice.

Current sample columns:

SN, Code, Size, Box, Co. Mesua, SFT, Rate, Without Mesua,
Monthly (SFT, Total), Broken (SFT, Total), Quarterly (SFT, Total), Offer (SFT, Total),
Invoice, Actual Price/SFT, Actual Price/pcs, Quaty, Total, Remark.

## 2. Verified relationships (from sample rows)

| Column | Rule | Evidence |
|---|---|---|
| Box | Number of boxes on the line (input, from item) | Row 1: 32 |
| Quaty | Number of pieces (input) | Row 1: 800 pcs |
| Pieces per box | Quaty ÷ Box | 800 ÷ 32 = 25 |
| Company Measurement (SFT per piece) | Per company + item (master) | 516.48 ÷ 800 = 0.6456 |
| Co. Mesua (SFT per box) | Pieces per box × SFT per piece | 25 × 0.6456 = 16.14 |
| SFT | Box × Co. Mesua | 32 × 16.14 = 516.48 |
| Invoice | SFT × Rate | 516.48 × 39 = 20,142.72 |
| Monthly / Quarterly / Offer Total | SFT × category ratio | 516.48 × 0.90 = 464.83 (Quarterly) |
| Broken Total | SFT × ratio (ratio needs confirmation) | Row 1: 516.48 × 0.29 = 149.78, but sheet shows 151.07 (ratio ≈ 0.2925) |

Co. Mesua is "Company Measurement" — it comes from `product_items.measurement` per the client's note. Company Measurement is a new master table (SFT per piece).

Open check: the ratio columns (0.29, 0.90, 0.30 etc.) must NOT be typed per purchase. They come from Settings (section 3).

## 3. Settings module (requested)

### 3.1 Financial calendar
- `quarter_start_month`: declared by the company (e.g. July → Q1 = Jul–Sep, Q2 = Oct–Dec).
- Derives month, quarter, half-year and year boundaries for all reports.

### 3.2 Targets
- **Mandatory: item-level targets** (client confirmed).
- **Targets exist in both SFT and money (BDT).** (client confirmed)
- Targets are **per company** (manufacturer). Company is mandatory on every target.
- Periods: month, quarter, half-year, year.

Proposed table `purchase_targets`:
- `company_id`, `item_id` (mandatory), `period_type` (month | quarter | half | year), `period_key` (e.g. `2027-Q1`, `2027-H1`)
- `target_sft`, `target_amount`
- `offer_sft` (company offer for the period, if any)

Monthly targets are **minimums**. Quarter/half/year targets are **independent totals**, not the sum of months (example: Jan 1000 + Feb 1000 + Mar 1000 minimum, Q1 target = 3500 SFT).

Validation: warn when a quarter target is less than the sum of its monthly minimums.

### 3.3 Special Offers (draft idea, not confirmed)
Table `special_offers`: name, start/end date, scope (company / item / all), offer type (extra SFT, percentage, fixed amount), status.
- Priority: specific item > company > all, when more than one applies.
- Snapshot: each purchase line stores the `offer_id` and computed value, so old reports do not change when settings change.
- Manual override allowed with a mandatory reason, shown separately in the report.

## 4. Open questions (client)

1. **Monthly / Quarterly / Offer allocation of purchased SFT.** Working assumption (not confirmed):
   - Monthly bucket = SFT counted toward the monthly minimum.
   - Quarterly bucket = extra SFT counted toward the quarter target above the monthly minimums.
   - Offer bucket = SFT beyond the quarter target, or the company's free/offer SFT — **to be confirmed.**
2. Does the company Offer apply only when the quarter target is met, or on any SFT above it?
3. Offer value: is it priced at Rate (Offer SFT × Rate, as in the sample), or free (zero value)?
4. Broken ratio: how is it derived? (Sample ratio ≈ 0.2925 vs displayed 0.29.)

## 5. Next steps (once questions answered)
1. Confirm allocation rules (section 4).
2. Design schema: `company_measurement`, `purchase_targets`, `special_offers`, purchase line fields (box, pcs, sft, bucket allocations, offer snapshot).
3. Design the Settings screen and the per-invoice report.
4. Implement in cashbook_api (`krishibitandatabase`) first, then the Android screens.

Related: [WEB_PARITY_2026_08_01.md](WEB_PARITY_2026_08_01.md), [ANDROID_REPORTS_API_SPEC.md](ANDROID_REPORTS_API_SPEC.md).
