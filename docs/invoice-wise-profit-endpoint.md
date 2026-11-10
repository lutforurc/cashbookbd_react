# Invoice Wise Profit — API contract

Financial Statement → Invoice Wise Profit is built in
`src/components/modules/reports/invoice-wise-profit/` and reads one endpoint:

```
POST /api/reports/invoice-wise-profit
```

The endpoint is implemented in the API project (`cashbook_api`) as
`ReportsController::apiInvoiceWiseProfit()`, registered in `routes/api.php`, and
declared in `config/route_permissions.php` against `invoice.wise.profit`.

## Request

```json
{
  "branch_id": 3,
  "startDate": "2026-11-01",
  "endDate": "2026-11-10",
  "search": "3-261100001",
  "page": 1,
  "per_page": 10
}
```

- Dates are `YYYY-MM-DD`; the screen formats them, so the server never has to
  read a day-first date.
- `search` is the "Search Invoice" box, already trimmed. Empty means every
  invoice in the range; otherwise it matches the voucher number anywhere
  (`3-261100001` and `261100001` both find the bill).
- There is no 31-day cap: this report is read by the month, the quarter and the
  year.

## Response

The usual envelope (`foundData`), payload at `data.data`:

```json
{
  "success": true,
  "message": "",
  "data": {
    "data": {
      "items": [
        {
          "sl": 1,
          "mid": 4821,
          "vr_no": "3-261100001",
          "vr_date": "01/11/2026",
          "customer_name": "Ridoy Saha",
          "invoice_amount": 79600,
          "received_amount": 29600,
          "discount": 50,
          "profit": 327
        }
      ],
      "summary": {
        "invoice_amount": 79600,
        "received_amount": 29600,
        "discount": 50,
        "profit": 327
      },
      "pagination": {
        "current_page": 1,
        "last_page": 1,
        "per_page": 10,
        "total": 1
      },
      "meta": {
        "branch_id": 3,
        "start_date": "2026-11-01",
        "end_date": "2026-11-10",
        "search": ""
      }
    }
  }
}
```

| Field | Meaning |
| --- | --- |
| `mid` | `main_trx_master.id` — the screen hands it to the voucher printer |
| `vr_no` | the voucher number as the books carry it |
| `vr_date` | `dd/mm/yyyy` (`us_to_bd_date`) |
| `customer_name` | the party the invoice was posted to — the chart's level-4 name, falling back to the name typed on the bill |
| `invoice_amount` | the posted invoice's total — `inventory_sales_masters.total`, goods plus any charge the bill carries. The discount is its own column, so it is **not** deducted here; the customer owes `invoice_amount − discount` |
| `received_amount` | the payment recorded on the invoice's own voucher (`inventory_sales_masters.netpayment`, i.e. what was taken at the time of sale), capped at `invoice_amount − discount` so a voucher that also collected older dues cannot make this bill look over-paid. `0` on a credit sale. See the limitation below for later receipts |
| `discount` | every concession on the bill, each once: line-level (`gross − line net`, from `sales_pct`/`line_net_total`) plus the invoice-level `inventory_sales_masters.discount` |
| `profit` | `(invoice_amount − discount) − FIFO cost`: net sales less the cost of the oldest inventory lots the sale consumed, across as many lots as it took. It does not depend on how much the customer has paid |

Rows are ordered by invoice date descending, then `main_trx_master.id` descending,
so two invoices dated the same day keep a stable, gap-free order across pages.
`page`/`per_page` cut that sorted list (default 10 a page; `per_page: 0` returns
every row, which is what the print sheet asks for). `sl` continues across pages.
`summary` foots the whole filtered result, not the page.

⚠️ **Later receipts are not allocated to invoices.** In this schema a subsequent
receipt is a customer-level voucher (transaction type 2) with no invoice
reference, so there is nothing to apply it to without inventing an allocation
rule. `received_amount` therefore means the payment recorded on the invoice's
own voucher; a bill paid later still reports the part paid at the counter until
the receipt-by-invoice model exists.

⚠️ `search` is applied after the costing, never in the sales query. FIFO layers
are consumed across the whole range in date order; asking the database for one
invoice would cost it against the opening stock alone and print a profit the
books do not agree with.

## Permission and rollout

The key is `invoice.wise.profit`, granted to nobody by default — like the other
new statements, a company switches it on by assigning it to a role.

On each API installation:

```bash
php artisan patch:group-financial-statement-permissions   # idempotent; creates the row
php artisan route:clear && php artisan config:clear
```

Then grant **Invoice Wise Profit** to the role that should see it under
Settings → Role Management. The route mapping in `config/route_permissions.php`
is audit-only until `api/reports/` is added to the enforcement list, which is a
separate, deliberate step.

## Verified

- `php -l` on the controller.
- Against the development database (company 1, branch 1, 2026-10-01 … 2026-11-09,
  998 invoices), with the controller's own FIFO walk:
  - `invoice_amount = inventory_sales_masters.total` — 998/998.
  - `received_amount = min(netpayment, invoice_amount − discount)` — 998/998.
  - `profit = (invoice_amount − discount) − FIFO cost` — 998/998.
  - `invoice_amount − discount − received ≥ 0` (no bill reads over-paid) — 998/998.
  - States covered: 373 unpaid, 112 partially paid, 513 fully paid, 307 discounted.
  - Example, partial + discounted: `3-261000001` — total 79,650, invoice 79,650,
    discount 50, received 29,600, FIFO cost 69,729.67, profit 9,870.33.
  - Example reported by the owner: `3-261100001` — total 35,625, discount 25,
    received 25,600, so invoice 35,625 and due 10,000.
  - Multi-lot sale: `10-261000002` sold 280 of product 4676 consuming
    196 @ 119.49, 64 @ 123.50 and 20 at the last known rate (shortage) —
    manual FIFO 33,794.04, report FIFO 33,794.04, profit 855.96 on a 34,650 bill.
  - Pagination: 100 pages of 10, 998 rows, 0 duplicates, order identical to the
    date-desc/id-desc set; a same-date group (`2026-11-09`) comes out id-descending.
- Frontend: `npm run build` passes; `npm run help:check` passes;
  `node _invoice_wise_profit_check.mjs` passes.
