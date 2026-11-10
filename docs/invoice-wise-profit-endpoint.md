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
  "search": "3-261100001"
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
          "invoice_amount": 17500,
          "profit": 327
        }
      ],
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
| `invoice_amount` | what the bill charged its party — the customer's own leg on the voucher (`SUM(debit) - SUM(credit)` where `coa4_id = inventory_sales_masters.customer_id`), i.e. goods plus extra charges less discount. Falls back to the goods total on a voucher with no party leg |
| `profit` | the goods' FIFO profit, the same figure Product Profit Loss reports for that invoice's lines |

Rows are ordered by invoice date and then number. The screen foots the table and
the print sheet from the rows it received, so the endpoint returns no `summary`.

`profit` is the goods' margin, as Product Profit Loss defines it. `invoice_amount`
includes the voucher's discount and extra charges, so an invoice with a discount
shows `invoice_amount − cost ≠ profit`. If the owner wants the discount and
charges folded into the profit as well, that is one line in the controller
(`invoiceWiseProfit`'s `profit` sum) — do not change it without asking, because
the two reports would then disagree on the same invoice.

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

- `php -l` on the controller, routes, config and command.
- `php artisan route:list --path=invoice-wise-profit` registers the route.
- Controller method executed against the development database: one invoice
  returned with its amount and profit, `search` matched it by number, a
  non-matching search returned nothing, and a reversed date range was refused.
