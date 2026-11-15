# Purchase Invoice in the Print Template Designer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Purchase Invoice a sixth document type in the Print Template Designer, reusing the pageSize/half-page infrastructure already built for Sales Invoice, and retire the hardcoded Purchase Invoice print component.

**Architecture:** Follow the exact same per-doc-type pattern used for Sales Invoice (`docs/superpowers/plans/2026-09-20-sales-invoice-print-designer.md`) — a field catalogue, a line-field catalogue, a default template builder, wiring into `printTemplate.ts`'s central functions. No new band type and no changes to `DocumentPrint.tsx`/`PrintTemplateDesigner.tsx`/`bandEditors.tsx` are needed this time — `pageSize`/half-page/the Designer's page-size toggle are already fully generic. The live Purchase Invoice print path (same `electronics/sales/invoice-print` endpoint Sales Invoice uses → Redux → `VoucherPrintRegistry` → `PurchaseInvoicePrint`) keeps its existing data source; only its rendering swaps from four bespoke components to `<DocumentPrint>`.

**Tech Stack:** React + TypeScript (Vite, no test runner — `npm run build` is the only automated check), Laravel 13 / PHP (no PHPUnit run in this environment — verify with `php artisan tinker`).

**Spec:** `docs/superpowers/specs/2026-09-20-purchase-invoice-print-designer-design.md`

## Global Constraints

- No test framework is configured for the React app — every task's check is `npm run build` plus manual verification.
- `npm run build` only transpiles; it does not type-check.
- Never change the existing shape of `electronics/sales/invoice-print`'s response beyond ADDING the new `purchase_print_layout` field — `CashReceivedPrint`, `CashPaymentPrint`, and the Sales Invoice print path all consume this same payload today and must keep working unchanged.
- **Do NOT set `printed_by` from voucher data in the adapter.** This exact mistake was made and caught during the Sales Invoice plan (its Task 9 review): `DocumentPrint.tsx:209` does `{printed_by: printedBy, ...(data?.basic ?? {})}` — the session-based default is overridden by anything the adapter's `basic{}` sets under that key. Leave `printed_by` out of the adapter entirely.
- `purchase_print_layout` (like Sales Invoice's `print_layout`) is the RAW saved layout value directly, or `null` — never a wrapped `{id, branch_id, ...}` object. Read as `data?.purchase_print_layout`, never `.purchase_print_layout.layout`.
- The five bespoke files (`PurchaseInvoicePrintBase.tsx` + 4 variant wrappers) are deleted only in the final task, after real-data verification passes.
- Follow the codebase's existing comment style (long-form prose explaining *why*) in every file touched.

---

### Task 1: Backend — accept `purchase_invoice` as a doc type, bundle its layout

**Files:**
- Modify: `F:\All_Database\www\cashbook_api\app\Http\Controllers\settings\PrintTemplateController.php` (the `DOC_TYPES` constant)
- Modify: `F:\All_Database\www\cashbook_api\app\Http\Controllers\Inventory\ElectronicsSalesController.php` (`salesPrintData()`)

**Interfaces:**
- Consumes: nothing from this plan (first task); the same `PrintTemplate` model and lookup pattern Sales Invoice's Task 1 already established.
- Produces: `electronics/sales/invoice-print`'s response gains a `purchase_print_layout` key (`array|null` — the RAW layout, same unwrapped convention as `print_layout`). Task 6 reads `data?.purchase_print_layout` directly.

- [ ] **Step 1: Add `'purchase_invoice'` to the accepted doc types**

In `PrintTemplateController.php`'s `DOC_TYPES` constant (which now also has `'sales_invoice'` from the earlier plan), append:

```php
        // The Purchase Invoice's own paper, added 2026-09-20 alongside Sales
        // Invoice -- same reasoning, same table. See ElectronicsSalesController
        // for where its layout is bundled into the print-data call.
        'purchase_invoice',
```

- [ ] **Step 2: Bundle the branch's `purchase_invoice` layout into `salesPrintData()`**

In `ElectronicsSalesController.php`'s `salesPrintData()`, right after the existing `$record->print_layout = ...` block (added for Sales Invoice), add a second, parallel lookup:

```php
        // The branch's own Purchase Invoice layout, alongside its Sales
        // Invoice one above -- the two doc types share this one response
        // because both papers are printed off the same voucher-print
        // endpoint, but they are UNRELATED saved layouts (a branch's sales
        // template and purchase template are different rows), so each gets
        // its own key rather than the two colliding on one.
        $record->purchase_print_layout = null;

        if (\Illuminate\Support\Facades\Schema::hasTable('print_templates')) {
            $purchaseTemplate = \App\Models\PrintTemplate::where('company_id', $record->company_id)
                ->where('branch_id', $record->branch_id)
                ->where('doc_type', 'purchase_invoice')
                ->orderByDesc('is_default')
                ->orderBy('id')
                ->first();

            if ($purchaseTemplate) {
                $record->purchase_print_layout = $purchaseTemplate->layout;
            }
        }

        return $record;
```

(This replaces the existing `return $record;` line — the new block goes immediately before it, after the `print_layout` block that's already there.)

- [ ] **Step 3: Verify manually**

Via `php artisan tinker` from `F:\All_Database\www\cashbook_api` (or Herd's `php.exe` if `php` isn't on PATH):

```
php artisan tinker
>>> $c = new App\Http\Controllers\Inventory\ElectronicsSalesController();
>>> $m = new ReflectionMethod($c, 'salesPrintData');
>>> $m->setAccessible(true);
>>> $r = $m->invoke($c, <a real PURCHASE voucher's main_trx_id — vr_no starting with 4- or 9->);
>>> $r->purchase_print_layout; // expect null (no layout saved yet)
>>> $r->print_layout; // also present, unrelated, expect null too unless a sales_invoice layout was saved earlier
>>> json_decode(json_encode($r), true)['purchase_print_layout']; // confirm it survives JSON encoding
```

Expected: no exception, `purchase_print_layout` present and `null`.

- [ ] **Step 4: Commit**

```bash
cd "F:/All_Database/www/cashbook_api"
git add app/Http/Controllers/settings/PrintTemplateController.php app/Http/Controllers/Inventory/ElectronicsSalesController.php
git commit -m "Accept purchase_invoice as a print-template doc type; bundle its layout into the sales print-data call"
```

---

### Task 2: `printTemplate.ts` — DocType, field catalogue, line fields

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\utils\print-designer\printTemplate.ts`

**Interfaces:**
- Consumes: existing `DocType`, `DOC_TYPES`, `FieldDef`, `fieldsFor`, `lineFieldsFor`, `ALL_INFO_BY_KEY`, `ALL_LINE_BY_KEY` (all already established by the Sales Invoice work).
- Produces: `DocType` includes `'purchase_invoice'`; `PURCHASE_INVOICE_FIELD_CATALOG: FieldDef[]`, `PURCHASE_INVOICE_LINE_FIELDS: FieldDef[]`, both wired into every lookup function. Task 3 (default template) and Task 5 (adapter) both read these exact keys by name.

- [ ] **Step 1: Add the doc type**

Find `export type DocType = ... | 'sales_invoice';` and extend it:

```ts
export type DocType = 'sales_challan' | 'sales_order' | 'hotel_money_receipt' | 'hotel_bill' | 'sales_invoice' | 'purchase_invoice';
```

Find `DOC_TYPES`'s array and append, after the `sales_invoice` entry:

```ts
  {
    id: 'purchase_invoice',
    name: 'Purchase Invoice',
    hint: 'What comes in with the goods, from the supplier.',
  },
```

- [ ] **Step 2: Add the field catalogue**

Insert after `SALES_INVOICE_LINE_FIELDS`'s closing `];` (before `export const fieldsFor`):

```ts
/**
 * The Purchase Invoice. Ported from getPurchaseMeta() in
 * PurchaseInvoicePrintBase.tsx, which this paper replaces -- see the design
 * spec at docs/superpowers/specs/2026-09-20-purchase-invoice-print-designer-design.md.
 * No TDS/service-charge/carrying-outward and no installment plan -- a
 * purchase foots at Total, Discount, Net, Paid, Due and nothing else.
 */
export const PURCHASE_INVOICE_FIELD_CATALOG: FieldDef[] = [
  // Who it comes from
  { key: 'party_name', name: 'Supplier Name', group: 'party' },
  { key: 'mobile', name: 'Supplier Mobile', group: 'party' },
  { key: 'manual_address', name: 'Address', group: 'party' },

  // Which paper this is
  { key: 'vr_no', name: 'Voucher No', group: 'voucher' },
  { key: 'vr_date', name: 'Date', group: 'voucher', format: 'date' },
  { key: 'order_number', name: 'Order Number', group: 'voucher' },
  { key: 'delivery_location', name: 'Delivery Location', group: 'voucher' },
  { key: 'vehicle_no', name: 'Vehicle No', group: 'transport' },
  { key: 'created_by', name: 'Prepared By', group: 'voucher' },
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  { key: 'branch_name', name: 'Branch', group: 'voucher' },
  { key: 'branch_address', name: 'Branch Address', group: 'voucher' },
  { key: 'notes', name: 'Notes', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },

  { key: 'blank', name: 'Blank line', group: 'manual' },

  // What it adds up to
  { key: 'total_amount', name: 'Total', group: 'total', numeric: true, format: 'money' },
  { key: 'discount_amount', name: 'Discount', group: 'total', numeric: true, format: 'money' },
  { key: 'net_amount', name: 'Net Total', group: 'total', numeric: true, format: 'money' },
  { key: 'paid_amount', name: 'Paid', group: 'total', numeric: true, format: 'money' },
  { key: 'due_amount', name: 'Due', group: 'total', numeric: true, format: 'money' },
  { key: 'amount_words', name: 'Amount In Words', group: 'total', format: 'words', from: 'net_amount' },
  { key: 'line_count', name: 'Number of Items', group: 'total', numeric: true },
];

/** One product line of a purchase invoice. */
export const PURCHASE_INVOICE_LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'line' },
  { key: 'product_name', name: 'Product Name', group: 'line' },
  { key: 'category', name: 'Category', group: 'line' },
  { key: 'brand', name: 'Brand', group: 'line' },
  { key: 'description', name: 'Description', group: 'line' },
  { key: 'serial_no', name: 'Serial No', group: 'line' },
  { key: 'warranty', name: 'Warranty', group: 'line' },
  { key: 'qty', name: 'Quantity', group: 'line', numeric: true },
  { key: 'price', name: 'Rate', group: 'line', numeric: true, format: 'money' },
  { key: 'amount', name: 'Amount', group: 'line', numeric: true, format: 'money' },
];
```

- [ ] **Step 3: Wire `fieldsFor`, `lineFieldsFor`**

```ts
export const fieldsFor = (docType: DocType): FieldDef[] => {
  if (docType === 'sales_order') return ORDER_FIELD_CATALOG;
  if (docType === 'hotel_bill') return HOTEL_BILL_FIELDS;
  if (docType === 'hotel_money_receipt') return HOTEL_RECEIPT_FIELDS;
  if (docType === 'sales_invoice') return SALES_INVOICE_FIELD_CATALOG;
  if (docType === 'purchase_invoice') return PURCHASE_INVOICE_FIELD_CATALOG;
  return FIELD_CATALOG;
};
```

```ts
export const lineFieldsFor = (docType: DocType): FieldDef[] => {
  if (docType === 'sales_order') return ORDER_LINE_FIELDS;
  if (docType === 'hotel_bill') return HOTEL_BILL_LINE_FIELDS;
  if (docType === 'hotel_money_receipt') return [];
  if (docType === 'sales_invoice') return SALES_INVOICE_LINE_FIELDS;
  if (docType === 'purchase_invoice') return PURCHASE_INVOICE_LINE_FIELDS;
  return LINE_FIELDS;
};
```

- [ ] **Step 4: Add to the flat lookup maps**

```ts
const ALL_INFO_BY_KEY = byKey([
  ...FIELD_CATALOG,
  ...ORDER_FIELD_CATALOG,
  ...HOTEL_BILL_FIELDS,
  ...HOTEL_RECEIPT_FIELDS,
  ...SALES_INVOICE_FIELD_CATALOG,
  ...PURCHASE_INVOICE_FIELD_CATALOG,
]);

const ALL_LINE_BY_KEY = byKey([
  ...LINE_FIELDS,
  ...ORDER_LINE_FIELDS,
  ...HOTEL_BILL_LINE_FIELDS,
  ...SALES_INVOICE_LINE_FIELDS,
  ...PURCHASE_INVOICE_LINE_FIELDS,
]);
```

- [ ] **Step 5: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

- [ ] **Step 6: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/utils/print-designer/printTemplate.ts
git commit -m "printTemplate: add Purchase Invoice DocType, field catalogue, line fields"
```

---

### Task 3: `printTemplate.ts` — default template + wiring

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\utils\print-designer\printTemplate.ts`

**Interfaces:**
- Consumes: `PURCHASE_INVOICE_FIELD_CATALOG`/`PURCHASE_INVOICE_LINE_FIELDS` (Task 2), the `band<T>()` helper, `HeaderBand`/`TitleBand`/`InfoBand`/`TableBand`/`TotalsBand`/`SignatureBand` types (all pre-existing).
- Produces: `defaultTemplate('purchase_invoice')` returns a complete, well-formed `PrintTemplate`. Task 6's cutover reads this by calling `defaultTemplate('purchase_invoice')`.

- [ ] **Step 1: Write `purchaseInvoice()`**

Add this builder function next to `salesInvoice()` (after its closing `});`):

```ts
/**
 * The Purchase Invoice -- built to match, field for field, the arrangement
 * PurchaseInvoicePrintBase.tsx has always printed by default: two-column
 * supplier/voucher info, the product table with warranty as a sub-line, a
 * right-aligned Total/Discount/Net/Paid/Due column, and a signature line.
 * No Installment band -- a purchase carries no repayment plan.
 */
const purchaseInvoice = (): PrintTemplate => ({
  version: 1,
  docType: 'purchase_invoice',
  orientation: 'portrait',
  pageSize: 'a4',
  fontSize: 13,
  rowsPerPage: 0,
  marginLeft: MARGIN_LEFT,
  marginRight: MARGIN_RIGHT,
  showFooter: true,
  bands: [
    band<HeaderBand>({ id: 'header', type: 'header', show: true }),
    band<TitleBand>({
      id: 'title',
      type: 'title',
      show: true,
      text: 'Purchase Invoice',
      align: 'center',
      scale: 1.5,
      underline: false,
    }),
    band<InfoBand>({
      id: 'info',
      type: 'info',
      show: true,
      columns: 2,
      layout: 'rows',
      boxed: false,
      labelWidth: DEFAULT_LABEL_WIDTH,
      rowPadding: DEFAULT_ROW_PADDING,
      rowGap: DEFAULT_ROW_GAP,
      items: [
        { field: 'party_name', label: 'Name' },
        { field: 'vr_no', label: 'Voucher No' },
        { field: 'mobile', label: 'Mobile', hideIfEmpty: true },
        { field: 'vr_date', label: 'Date' },
        { field: 'manual_address', label: 'Address', hideIfEmpty: true },
        { field: 'notes', label: 'Notes', hideIfEmpty: true },
      ],
    }),
    band<TableBand>({
      id: 'table',
      type: 'table',
      show: true,
      bordered: true,
      repeatHeader: true,
      fillerRows: 0,
      totalRow: false,
      totalRowLabel: 'Grand Total',
      columns: [
        { field: 'sl', label: '#', width: 6, align: 'center' },
        { field: 'product_name', label: 'Product', width: 54, align: 'left', subField: 'warranty' },
        { field: 'qty', label: 'Qty', width: 12, align: 'center' },
        { field: 'price', label: 'Rate', width: 14, align: 'right' },
        { field: 'amount', label: 'Amount', width: 14, align: 'right' },
      ],
    }),
    band<TotalsBand>({
      id: 'totals',
      type: 'totals',
      show: true,
      align: 'right',
      layout: 'rows',
      items: [
        { field: 'total_amount', label: 'Total Tk.', ruleAbove: false },
        { field: 'discount_amount', label: 'Discount Tk.', hideIfEmpty: true },
        { field: 'net_amount', label: 'Net Tk.', ruleAbove: true },
        { field: 'paid_amount', label: 'Paid Tk.' },
        { field: 'due_amount', label: 'Due Tk.', ruleAbove: true },
      ],
    }),
    band<InfoBand>({
      id: 'amount-words',
      type: 'info',
      show: true,
      columns: 1,
      layout: 'inline',
      boxed: false,
      labelWidth: DEFAULT_LABEL_WIDTH,
      rowPadding: DEFAULT_ROW_PADDING,
      rowGap: DEFAULT_ROW_GAP,
      items: [{ field: 'amount_words', label: 'In Word', hideIfEmpty: true }],
    }),
    band<SignatureBand>({
      id: 'signature',
      type: 'signature',
      show: true,
      space: 50,
      items: [{ label: 'Authorized Signature', field: 'printed_by' }],
    }),
  ],
});
```

- [ ] **Step 2: Wire `defaultTemplate()`**

```ts
export const defaultTemplate = (docType: DocType = 'sales_challan'): PrintTemplate => {
  if (docType === 'sales_order') return standardOrder();
  if (docType === 'hotel_bill') return hotelBill();
  if (docType === 'hotel_money_receipt') return hotelReceipt();
  if (docType === 'sales_invoice') return salesInvoice();
  if (docType === 'purchase_invoice') return purchaseInvoice();
  return standardChallan();
};
```

- [ ] **Step 3: Confirm `normalizeTemplate` needs NO changes**

Unlike Sales Invoice (which needed a new `case 'installments':` in the band-shape switch), Purchase Invoice introduces no new band type — every band `purchaseInvoice()` uses (`header`/`title`/`info`/`table`/`totals`/`signature`) already has a case in `normalizeTemplate`'s switch. And unlike `sales_order`/`hotel_bill`, Purchase Invoice needs no special post-processing pass (no `tokenizeOrderCaptions`-style function). Confirm this by reading `normalizeTemplate`'s body once — do not add anything there for this doc type. `normalizeTemplate`'s generic `pageSize` read (`raw.pageSize === 'half' ? 'half' : (fallback.pageSize ?? 'a4')`) already works for any `docType`, including this new one, because `fallback = defaultTemplate(docType)` and `purchaseInvoice()` always sets `pageSize: 'a4'`.

- [ ] **Step 4: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/utils/print-designer/printTemplate.ts
git commit -m "printTemplate: default Purchase Invoice template + defaultTemplate wiring"
```

---

### Task 4: `sampleDocument.ts` — preview sample

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\modules\settings\print-designer\sampleDocument.ts`

**Interfaces:**
- Consumes: `DocumentData` type, `PURCHASE_INVOICE_FIELD_CATALOG`/`PURCHASE_INVOICE_LINE_FIELDS` key names (for cross-checking, Task 2).
- Produces: `PURCHASE_INVOICE_SAMPLE: DocumentData`; `sampleFor('purchase_invoice')` returns it.

- [ ] **Step 1: Add the sample**

Append near `SALES_INVOICE_SAMPLE`:

```ts
/**
 * A purchase that never happened, for the same preview -- one product with a
 * warranty, one without, and a non-zero discount so that line's hide-when-zero
 * behavior can be seen NOT hiding here (compare against a real invoice with
 * no discount, where it correctly disappears).
 */
export const PURCHASE_INVOICE_SAMPLE: DocumentData = {
  basic: {
    party_name: 'Sample Wholesale Traders',
    mobile: '01700000000',
    manual_address: 'Sample Bazar, Sample Sadar',
    notes: 'Purchased against PO-1100025951.',
    vr_no: '4-260900021',
    vr_date: dayjs().format('YYYY-MM-DD'),
    total_amount: 84000,
    discount_amount: 2000,
    net_amount: 82000,
    paid_amount: 50000,
    due_amount: 32000,
    amount_words: 'Eighty Two Thousand Taka Only',
  },
  products: [
    {
      sl: 1,
      product_name: 'Xiaomi Redmi Note 15 6/128GB Variant',
      qty: 3,
      price: 24000,
      amount: 72000,
      serial_no: '',
      warranty: '365 day',
    },
    {
      sl: 2,
      product_name: 'Screen Guard (Pack of 10)',
      qty: 2,
      price: 6000,
      amount: 12000,
      serial_no: '',
      warranty: '',
    },
  ],
};
```

- [ ] **Step 2: Wire `sampleFor`**

Read the current body first, then add one branch (preserving every existing one):

```ts
  if (docType === 'purchase_invoice') return PURCHASE_INVOICE_SAMPLE;
```

- [ ] **Step 3: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/modules/settings/print-designer/sampleDocument.ts
git commit -m "Print designer: sample Purchase Invoice document for the preview pane"
```

---

### Task 5: The data adapter

**Files:**
- Create: `f:\All_Database\cashbookbd_react\src\components\modules\vouchers\print_items\purchaseInvoiceDocumentData.ts`

**Interfaces:**
- Consumes: the raw `voucherData` shape `electronics/sales/invoice-print` returns (`purchase_master.details[]`, `acc_transaction_master[].acc_transaction_details[]`, `user`). Same shape `getPurchaseMeta()` in `PurchaseInvoicePrintBase.tsx:109-153` already reads correctly.
- Produces: `toPurchaseInvoiceDocumentData(data: any): DocumentData` — Task 6 calls this by name.

- [ ] **Step 1: Read the actual current `getPurchaseMeta()` first**

Before writing anything, read `src/components/modules/vouchers/print_items/purchase_invoice/PurchaseInvoicePrintBase.tsx` (search for `getWarrantyInfo` and `const getPurchaseMeta`) and compare against the code below — this plan's code was transcribed from that function at plan-writing time and could have drifted. Port from the real current logic if they disagree; use this code as-is if they match.

```ts
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';

/**
 * The rich payload `electronics/sales/invoice-print` answers with, reshaped
 * into the flat {basic, products, branch} DocumentPrint reads.
 *
 * Ported from getPurchaseMeta() in PurchaseInvoicePrintBase.tsx:109-153,
 * the bespoke component this replaces.
 *
 * ⚠️ NO `printed_by` HERE. See DocumentPrint.tsx's own comment on why:
 * `basic = {printed_by: printedBy, ...data.basic}` -- the session default is
 * spread over, so setting it here would silently show whoever created or
 * approved the purchase instead of whoever is reprinting it today. This
 * exact mistake was made and caught in the Sales Invoice adapter's review;
 * do not repeat it here.
 */
export const toPurchaseInvoiceDocumentData = (data: any): DocumentData => {
  const purchaseMaster = data?.purchase_master;
  const details = purchaseMaster?.details || [];
  const transactions = Array.isArray(data?.acc_transaction_master)
    ? data.acc_transaction_master
    : data?.acc_transaction_master
      ? [data.acc_transaction_master]
      : [];
  const trxDetails = transactions.flatMap(
    (t: any) => (Array.isArray(t?.acc_transaction_details) ? t.acc_transaction_details : []),
  );

  const supplierFallback =
    trxDetails.find(
      (d: any) =>
        Number(d?.coa4_id) === Number(purchaseMaster?.supplier_id) &&
        d?.coa_l4?.cust_party_infos,
    )?.coa_l4?.cust_party_infos || {};

  const totalAmount = Number(purchaseMaster?.total ?? 0);
  const discountFromLedger = trxDetails
    .filter((row: any) => Number(row?.coa4_id) === 40)
    .reduce((sum: number, row: any) => sum + Number(row?.credit ?? 0), 0);
  const discountAmount = discountFromLedger || Number(purchaseMaster?.discount ?? 0);
  const netAmount = totalAmount - discountAmount;
  const paidAmount = trxDetails
    .filter((row: any) => Number(row?.coa4_id) === 17)
    .reduce((sum: number, row: any) => sum + Number(row?.credit ?? 0), 0);

  const getWarranty = (warranty: any): string => {
    if (!warranty || typeof warranty !== 'object') return '';
    const labelKey = Object.keys(warranty).find((key) => !Number.isNaN(Number(key)));
    const label = labelKey ? warranty[labelKey] : '';
    const dayValue = warranty?.day;
    if (!label || dayValue == null || dayValue === '') return '';
    return `${dayValue} day`;
  };

  return {
    basic: {
      party_name: purchaseMaster?.name || supplierFallback?.name || '-',
      mobile: purchaseMaster?.mobile || supplierFallback?.mobile || '',
      manual_address:
        supplierFallback?.manual_address ||
        purchaseMaster?.manual_address ||
        purchaseMaster?.supplier_address ||
        supplierFallback?.address ||
        purchaseMaster?.address ||
        '',
      notes: purchaseMaster?.notes || '',
      vr_no: data?.vr_no,
      vr_date: purchaseMaster?.invoice_date || purchaseMaster?.transact_date || data?.vr_date,
      order_number: purchaseMaster?.purchase_order?.order_number || '',
      delivery_location: purchaseMaster?.purchase_order?.delivery_location || '',
      vehicle_no: purchaseMaster?.vehicle_no || '',
      created_by: data?.user?.name || '',
      total_amount: totalAmount,
      discount_amount: discountAmount,
      net_amount: netAmount,
      paid_amount: paidAmount,
      due_amount: Math.max(netAmount - paidAmount, 0),
      amount_words: data?.inword || purchaseMaster?.inword || '',
    },
    products: details.map((row: any, index: number) => ({
      sl: index + 1,
      product_name: row?.product?.name || '',
      category: row?.product?.category?.name || '',
      brand: row?.product?.brand?.name || '',
      description: row?.product?.description || '',
      serial_no: row?.serial_no || '',
      warranty: getWarranty(row?.product?.warranty_days),
      qty: Number(row?.quantity) || 0,
      price: Number(row?.purchase_price) || 0,
      amount: (Number(row?.quantity) || 0) * (Number(row?.purchase_price) || 0),
    })),
    branch: {
      name: data?.branch?.name,
      address: data?.branch?.address,
      phone: data?.branch?.phone,
    } as any,
  };
};
```

Note: the original component's `amount_words` fell back to a locally-computed
`numberToWords(netAmount)` when neither `data?.inword` nor `purchaseMaster?.inword`
was present. This adapter drops that fallback deliberately — `numberToWords`
would need importing here too, and the field is `hideIfEmpty` in the default
template's Info band, so an empty string simply hides the line rather than
showing a wrong one. If real purchase data never carries `inword`, revisit
this in Task 7's verification.

- [ ] **Step 2: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/modules/vouchers/print_items/purchaseInvoiceDocumentData.ts
git commit -m "Add the Purchase Invoice DocumentData adapter, ported from getPurchaseMeta()"
```

---

### Task 6: Cut `PurchaseInvoicePrint.tsx` over to `DocumentPrint`

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\modules\vouchers\print_items\PurchaseInvoicePrint.tsx`

**Interfaces:**
- Consumes: `toPurchaseInvoiceDocumentData` (Task 5), `DocumentPrint`, `normalizeTemplate`, `defaultTemplate` (existing).
- Produces: `PurchaseInvoicePrint`'s external interface (`{data, rowsPerPage?, fontSize?}`, `forwardRef<HTMLDivElement>`) unchanged — `VoucherPrintRegistry.tsx:255-260` calls it exactly as today.

- [ ] **Step 1: Rewrite the component**

```tsx
import React from 'react';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import { defaultTemplate, normalizeTemplate } from '../../../utils/print-designer/printTemplate';
import { toPurchaseInvoiceDocumentData } from './purchaseInvoiceDocumentData';

type Props = {
  data: any;
  rowsPerPage?: number;
  fontSize?: number;
};

/**
 * The Purchase Invoice, drawn by the Print Template Designer -- the same
 * cutover Sales Invoice went through
 * (docs/superpowers/specs/2026-09-20-purchase-invoice-print-designer-design.md).
 * `data` is the SAME raw payload `electronics/sales/invoice-print` has
 * always returned -- reshaped here, not upstream, because other print
 * components read it in its original shape too.
 */
const PurchaseInvoicePrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => {
    if (!data?.purchase_master) {
      return <div ref={ref}>No purchase invoice data found</div>;
    }

    const documentData = toPurchaseInvoiceDocumentData(data);
    // NOT data?.purchase_print_layout?.layout -- it IS the raw layout (or
    // null). See the plan's Global Constraints and Sales Invoice's Task 1
    // ruling for why.
    const savedLayout = data?.purchase_print_layout;
    const template = savedLayout
      ? normalizeTemplate(savedLayout, 'purchase_invoice')
      : defaultTemplate('purchase_invoice');

    return <DocumentPrint ref={ref} template={template} data={documentData} />;
  },
);

PurchaseInvoicePrint.displayName = 'PurchaseInvoicePrint';

export default PurchaseInvoicePrint;
```

- [ ] **Step 2: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

Do NOT delete the four bespoke variant files or the base component in this task — that is Task 8, gated on Task 7's verification.

- [ ] **Step 3: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/modules/vouchers/print_items/PurchaseInvoicePrint.tsx
git commit -m "Cut PurchaseInvoicePrint over to DocumentPrint + the purchase_invoice template"
```

---

### Task 7: Verify against real data

**Files:** none changed; verification only.

- [ ] **Step 1: Zero-discount case**

Print a real purchase with no discount. Confirm the Discount line correctly hides (matches the sample's proof case for the opposite — sample has non-zero discount showing; a real zero-discount purchase should show nothing on that line), and every other field (supplier, voucher no, date, product table with warranty, Total/Net/Paid/Due) is correct.

- [ ] **Step 2: Non-zero-discount case**

Print a real purchase with a discount applied (or use the sample as a stand-in reference if none exists yet). Confirm the Discount line shows and Net correctly equals Total minus Discount.

- [ ] **Step 3: `amount_words` fallback**

Check whether a real purchase actually carries `data?.inword` or `purchaseMaster?.inword` — if neither is ever present in practice, the "In Word" line will always be blank, which may be a real gap versus the old component's local `numberToWords()` fallback. If so, note it and consider a follow-up task (do not silently patch around it here).

- [ ] **Step 4: Report findings**

If everything passes, proceed to Task 8. If something is wrong, fix it in the relevant earlier task's file before proceeding.

---

### Task 8: Delete the five bespoke files

**Files:**
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\vouchers\print_items\purchase_invoice\PurchaseInvoicePrintBase.tsx`
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\vouchers\print_items\purchase_invoice\PurchaseInvoicePrintA4Portrait.tsx`
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\vouchers\print_items\purchase_invoice\PurchaseInvoicePrintA4Landscape.tsx`
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\vouchers\print_items\purchase_invoice\PurchaseInvoicePrintHalfPortrait.tsx`
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\vouchers\print_items\purchase_invoice\PurchaseInvoicePrintHalfLandscape.tsx`

**Interfaces:**
- Consumes: Task 7's passed verification (gate).
- Produces: nothing else in the codebase references these files (confirm).

- [ ] **Step 1: Confirm nothing else imports them**

```bash
cd "f:/All_Database/cashbookbd_react"
grep -rln "PurchaseInvoicePrintBase\|PurchaseInvoicePrintA4Portrait\|PurchaseInvoicePrintA4Landscape\|PurchaseInvoicePrintHalfPortrait\|PurchaseInvoicePrintHalfLandscape" src/
```

Expected: no output.

- [ ] **Step 2: Delete**

```bash
cd "f:/All_Database/cashbookbd_react"
git rm src/components/modules/vouchers/print_items/purchase_invoice/PurchaseInvoicePrintBase.tsx \
       src/components/modules/vouchers/print_items/purchase_invoice/PurchaseInvoicePrintA4Portrait.tsx \
       src/components/modules/vouchers/print_items/purchase_invoice/PurchaseInvoicePrintA4Landscape.tsx \
       src/components/modules/vouchers/print_items/purchase_invoice/PurchaseInvoicePrintHalfPortrait.tsx \
       src/components/modules/vouchers/print_items/purchase_invoice/PurchaseInvoicePrintHalfLandscape.tsx
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove the bespoke Purchase Invoice print components, superseded by the Print Template Designer"
```

## Self-Review Notes

- **Spec coverage:** every section of the design spec (backend, field catalogue, default template, sample, adapter, cutover, verification) has a task.
- **Placeholder scan:** no TBD/TODO. The `amount_words` fallback gap (Task 5/7) is explicitly named with a concrete follow-up path, not left vague.
- **Type/name consistency:** `PURCHASE_INVOICE_FIELD_CATALOG`, `PURCHASE_INVOICE_LINE_FIELDS`, `purchaseInvoice()`/`defaultTemplate('purchase_invoice')`, `purchase_print_layout`, `toPurchaseInvoiceDocumentData` are each defined once and referenced by that exact name everywhere they're used.
- **Lessons carried from Sales Invoice's review findings:** `printed_by` deliberately excluded from the adapter (called out in Global Constraints AND in the adapter's own code comment); `purchase_print_layout` read as raw, not `.layout`-nested (called out in Global Constraints AND in the cutover task's code comment) — both mistakes made it into the Sales Invoice plan text and were only caught by task review; this plan states the correct version directly rather than repeating the error.
