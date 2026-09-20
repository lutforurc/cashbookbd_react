# Sales Invoice in the Print Template Designer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Sales Invoice a fifth document type in the Print Template Designer — with an Installment Details table and both A4 and half-page sizes — and retire the hardcoded Electronics Sales Invoice print component in favor of it.

**Architecture:** Follow the existing per-doc-type pattern in `printTemplate.ts`/`DocumentPrint.tsx` exactly (the same one Delivery Challan/Order/Hotel Bill/Hotel Money Receipt already use): a field catalogue, a line-field catalogue, a default template builder, and a `normalizeTemplate` case, plus one new band type (`installments`) and one new template dimension (`pageSize`). The live Electronics Sales print path (`electronics/sales/invoice-print` → Redux → `VoucherPrintRegistry` → `ElectronicsSalesInvoicePrint`) keeps its existing data source; only its rendering swaps from four bespoke components to `<DocumentPrint>`.

**Tech Stack:** React + TypeScript (Vite, no test runner configured — `npm run build` is the only automated check this codebase has; see Global Constraints), Laravel 13 / PHP (no PHPUnit run in this environment — verify with `php artisan tinker` or a throwaway script, per project convention).

**Spec:** `docs/superpowers/specs/2026-09-20-sales-invoice-print-designer-design.md`

## Global Constraints

- No test framework is configured for the React app (`package.json` has no `test` script, no `.test.tsx` files exist under `src/`) — every task's check is `npm run build` plus a manual visual/behavioral verification, matching how every other feature in this codebase (see git history on `printTemplate.ts`) has been checked. Do not add a test framework as part of this plan.
- `npm run build` only transpiles; it does not type-check (no TypeScript installed as a standalone checker — see project memory `build-does-not-typecheck`). A clean build is necessary but not sufficient; read the diff.
- Never change the existing shape of `electronics/sales/invoice-print`'s response — `CashReceivedPrint`, `CashPaymentPrint`, and `PurchaseInvoicePrint` (`VoucherPrintRegistry.tsx:241-259`) consume the same payload unchanged. Only add fields to it.
- `docs/superpowers/specs/2026-09-20-sales-invoice-print-designer-design.md`'s Verification section is non-negotiable: the five bespoke files (`ElectronicsSalesInvoicePrintBase.tsx` + 4 variant wrappers) are deleted only in the final task, after visual verification passes.
- Follow the codebase's existing comment style in every file touched (long-form prose comments explaining *why*, not just *what* — see any block already in `printTemplate.ts` or `DocumentPrint.tsx` for the register to match).
- Commit after each task, in Bangla-friendly English identifiers with the existing repo's commit style (short, present-tense, e.g. `git log --oneline -5` for reference — this repo's actual convention is terse "Update"-style messages; use a real descriptive one-liner per task instead, since that is what the file history for `printTemplate.ts` itself does).

---

### Task 1: Backend — accept `sales_invoice` as a doc type, and bundle its layout into the existing print-data call

**Files:**
- Modify: `F:\All_Database\www\cashbook_api\app\Http\Controllers\settings\PrintTemplateController.php:33-55`
- Modify: `F:\All_Database\www\cashbook_api\app\Http\Controllers\Inventory\ElectronicsSalesController.php:111-178`

**Interfaces:**
- Consumes: nothing from earlier tasks (first task).
- Produces: `electronics/sales/invoice-print`'s JSON response gains a `print_layout` key (`array|null` — the same shape `PrintTemplateController::show()` already returns under `layout`, i.e. `{id, branch_id, doc_type, name, is_default, layout}` or `null`). Every later frontend task that reads the sales-invoice print payload relies on `voucherData.print_layout.layout` being the raw template JSON (or `voucherData.print_layout` being `null`).

- [ ] **Step 1: Add `'sales_invoice'` to the accepted doc types**

In `PrintTemplateController.php`, inside the `DOC_TYPES` constant (currently ends at `'hotel_bill',` on line 54):

```php
    private const DOC_TYPES = [
        'sales_challan',
        'sales_order',
        'hotel_money_receipt',
        'hotel_bill',

        // The Electronics Sales Invoice's own paper, added 2026-09-20. Rides on
        // this same table for the reason every other paper does -- see the
        // class doc comment -- and reuses the branch's own invoice-print
        // endpoint to fetch its layout rather than this controller's `show()`,
        // because that endpoint already answers with the sale's data in the
        // same call and a second round trip at the counter is what this
        // avoids. This controller still owns saving, listing and deleting it.
        'sales_invoice',
    ];
```

- [ ] **Step 2: Bundle the branch's `sales_invoice` layout into `salesPrintData()`**

In `ElectronicsSalesController.php`, `salesPrintData()` (starts line 111). After the existing `$record->inword = ...` block (ends around line 175) and before `return $record;` (line 177), add:

```php
        // The branch's own Sales Invoice layout, in the SAME call that fetches
        // the sale itself -- see PrintTemplateController::show() for the
        // identical lookup, duplicated rather than shared because this method
        // already has $branch scoped and adding a dependency on a settings
        // controller from here would run the other way round. A branch that
        // never opened the designer gets null, and the client draws its
        // built-in default for it -- exactly like every other paper.
        $record->print_layout = null;

        if (\Illuminate\Support\Facades\Schema::hasTable('print_templates')) {
            $template = \App\Models\PrintTemplate::where('company_id', $record->company_id)
                ->where('branch_id', $record->branch_id)
                ->where('doc_type', 'sales_invoice')
                ->orderByDesc('is_default')
                ->orderBy('id')
                ->first();

            if ($template) {
                $record->print_layout = $template->layout;
            }
        }

        return $record;
```

Note: `$record->print_layout` is set on the Eloquent model as a dynamic attribute purely to ride along in the JSON response (`foundData($record)` in `salesInvoicePrint()` serializes the model, and an unfillable dynamic property still appears in `toArray()`/JSON output for an Eloquent model unless explicitly hidden — this model has no `$hidden` covering it). Confirm this in Step 3 rather than assuming.

- [ ] **Step 3: Verify manually**

No PHPUnit in this project (see Global Constraints) — verify with `php artisan tinker` from `F:\All_Database\www\cashbook_api`:

```
php artisan tinker
>>> $c = new App\Http\Controllers\Inventory\ElectronicsSalesController();
>>> $m = new ReflectionMethod($c, 'salesPrintData');
>>> $m->setAccessible(true);
>>> $r = $m->invoke($c, <a real sales main_trx_id from this database>);
>>> $r->print_layout; // expect null (no layout saved yet) or an array
>>> json_decode(json_encode($r), true)['print_layout']; // confirm it survives JSON encoding
```

Expected: no exception, `print_layout` key present and `null` (since no `sales_invoice` layout has been saved yet — that only happens after Task 8).

- [ ] **Step 4: Commit**

```bash
cd "F:/All_Database/www/cashbook_api"
git add app/Http/Controllers/settings/PrintTemplateController.php app/Http/Controllers/Inventory/ElectronicsSalesController.php
git commit -m "Accept sales_invoice as a print-template doc type; bundle its layout into the sales print-data call"
```

---

### Task 2: `printTemplate.ts` — types for the new doc type, page size, and Installment band

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\utils\print-designer\printTemplate.ts:39,48-69,146-154,237-264,324-368`

**Interfaces:**
- Consumes: nothing new.
- Produces: `DocType` includes `'sales_invoice'`; `PrintTemplate.pageSize: 'a4' | 'half'`; `InstallmentBand` type (`{id, type: 'installments', show, title, bordered}`) exported and included in the `Band` union — every later task in this file and in `DocumentPrint.tsx`/`bandEditors.tsx` builds on these exact names.

- [ ] **Step 1: Add the doc type**

At `printTemplate.ts:39`:

```ts
export type DocType = 'sales_challan' | 'sales_order' | 'hotel_money_receipt' | 'hotel_bill' | 'sales_invoice';
```

At `printTemplate.ts:48-69`, append to `DOC_TYPES` (after the `hotel_bill` entry, before the closing `];`):

```ts
  {
    id: 'sales_invoice',
    name: 'Sales Invoice',
    hint: 'What the customer takes home with the goods.',
  },
```

- [ ] **Step 2: Add `pageSize` to `PrintTemplate`**

At `printTemplate.ts:334-368`, add the field next to `orientation` (line 338):

```ts
export type PrintTemplate = {
  version: 1;
  docType: DocType;
  orientation: 'portrait' | 'landscape';
  /**
   * A4 unless the paper is meant to be a small receipt -- 'half' is exactly
   * the 210mm x 148.5mm sheet the old Electronics Sales Invoice's
   * half-portrait/half-landscape variants printed on. Defaults to 'a4' at
   * every construction site in this file, so the four papers that existed
   * before this field did are unaffected: nothing about a challan or a hotel
   * bill's page shrinks because a different paper started using this.
   */
  pageSize: 'a4' | 'half';
  fontSize: number;
  ...
```

(Keep every other field in `PrintTemplate` exactly as it is — only insert this one line after `orientation`.)

- [ ] **Step 3: Add the `InstallmentBand` type**

At `printTemplate.ts:146-154`, add `'installments'` to `BandType`:

```ts
export type BandType =
  | 'header'
  | 'title'
  | 'info'
  | 'table'
  | 'totals'
  | 'notes'
  | 'signature'
  | 'installments'
  | 'spacer';
```

Immediately after `TableBand`'s closing `};` (currently line 264, right before `export type TotalsBand`), insert:

```ts
/**
 * The Installment Details table -- a sale's own repayment schedule, printed
 * on its invoice. Unlike TableBand this has no columns to configure: its
 * three (Sl, Due Date, Amount) are fixed by the data shape
 * (`installments[].due_date`, `installments[].amount`), so there is nothing
 * for a tenant to choose there. Only whether it shows, whether it is ruled,
 * and what it is called are template-level decisions -- the same level of
 * configurability as NotesBand and SignatureBand, not TableBand's.
 */
export type InstallmentBand = BandBase & {
  type: 'installments';
  /** "Installment Details" by default -- renameable like every other title. */
  title: string;
  bordered: boolean;
};
```

At `printTemplate.ts:324-332`, add `InstallmentBand` to the `Band` union:

```ts
export type Band =
  | HeaderBand
  | TitleBand
  | InfoBand
  | TableBand
  | TotalsBand
  | NotesBand
  | SignatureBand
  | InstallmentBand
  | SpacerBand;
```

- [ ] **Step 4: Build and check for type errors the build can surface**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

Expected: build fails at this point (nothing constructs a `PrintTemplate` with `pageSize` yet, and `defaultTemplate`/`normalizeTemplate` don't set it — Vite's esbuild transpile alone may not catch this, since this project has no standalone type-check step; if the build succeeds anyway, that is expected per Global Constraints, and the gap is caught by reading the diff, not by tooling). Read through `printTemplate.ts` once more to confirm every existing `PrintTemplate`-shaped object literal in this file (the four `standardChallan`/`standardOrder`/`hotelBill`/`hotelReceipt` builders) still compiles logically — they will each need `pageSize: 'a4'` added in Task 4, not here; this step is only confirming today's build state before more files change under it.

- [ ] **Step 5: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/utils/print-designer/printTemplate.ts
git commit -m "printTemplate: add sales_invoice DocType, pageSize, and InstallmentBand types"
```

---

### Task 3: `printTemplate.ts` — field catalogue and line fields for Sales Invoice

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\utils\print-designer\printTemplate.ts` (new consts after `HOTEL_RECEIPT_FIELDS`, ends line 850; wiring into `fieldsFor`/`lineFieldsFor`/`catalogFor` at lines 850-880; wiring into `ALL_INFO_BY_KEY`/`ALL_LINE_BY_KEY` at lines ~918-925)

**Interfaces:**
- Consumes: `FieldDef`, `FieldGroup` (existing types).
- Produces: `SALES_INVOICE_FIELD_CATALOG: FieldDef[]`, `SALES_INVOICE_LINE_FIELDS: FieldDef[]` — exported names Task 4 (default template) and Task 8 (Designer UI, via `fieldsFor`/`lineFieldsFor`) both read by name.

- [ ] **Step 1: Add the field catalogue**

Insert after `HOTEL_RECEIPT_FIELDS` (its closing `];` is right before `export const fieldsFor`, i.e. just before line 850):

```ts
/**
 * The Electronics Sales Invoice.
 *
 * Ported from ElectronicsSalesInvoicePrintBase.tsx's getSalesMeta(), which
 * this paper replaces. The three "extra charge" fields (tds/service
 * charge/carrying outward) keep their DYNAMIC names on purpose -- they are
 * whichever account the sale posted to coa4_id 41/198/42, named however the
 * tenant's own chart of accounts names it ("Installment Charge", "Delivery
 * Charge", whatever a branch actually calls it), not a fixed label. A
 * template names the AMOUNT field; the label the paper prints is read off
 * the sale itself, the same way `bill_vat_summary` already works on the
 * hotel bill.
 */
export const SALES_INVOICE_FIELD_CATALOG: FieldDef[] = [
  // Who it goes to
  { key: 'party_name', name: 'Customer Name', group: 'party' },
  { key: 'mobile', name: 'Customer Mobile', group: 'party' },
  { key: 'manual_address', name: 'Address', group: 'party' },

  // Which paper this is
  { key: 'vr_no', name: 'Invoice No', group: 'voucher' },
  { key: 'vr_date', name: 'Invoice Date', group: 'voucher', format: 'date' },
  { key: 'order_number', name: 'Order Number', group: 'voucher' },
  { key: 'delivery_location', name: 'Delivery Location', group: 'voucher' },
  { key: 'vehicle_no', name: 'Vehicle No', group: 'transport' },
  { key: 'created_by', name: 'Sales By', group: 'voucher' },
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  { key: 'branch_name', name: 'Branch', group: 'voucher' },
  { key: 'branch_address', name: 'Branch Address', group: 'voucher' },
  { key: 'notes', name: 'Notes', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },

  { key: 'blank', name: 'Blank line', group: 'manual' },

  // What it adds up to
  { key: 'grand_total', name: 'Total', group: 'total', numeric: true, format: 'money' },
  // The name is read off the sale's own chart of accounts -- see the note
  // above the catalogue. Empty on a sale with none, and the amount line
  // hides with it (TotalsBand already hides a zero money line).
  { key: 'tds_name', name: 'Extra Charge 1 -- Label', group: 'total' },
  { key: 'tds_amount', name: 'Extra Charge 1 -- Amount', group: 'total', numeric: true, format: 'money' },
  { key: 'service_charge_name', name: 'Extra Charge 2 -- Label', group: 'total' },
  { key: 'service_charge_amount', name: 'Extra Charge 2 -- Amount', group: 'total', numeric: true, format: 'money' },
  { key: 'carrying_outward_name', name: 'Extra Charge 3 -- Label', group: 'total' },
  { key: 'carrying_outward_amount', name: 'Extra Charge 3 -- Amount', group: 'total', numeric: true, format: 'money' },
  { key: 'discount_amount', name: 'Discount', group: 'total', numeric: true, format: 'money' },
  { key: 'net_amount', name: 'Net Total', group: 'total', numeric: true, format: 'money' },
  { key: 'received_amount', name: 'Received', group: 'total', numeric: true, format: 'money' },
  { key: 'due_amount', name: 'Due', group: 'total', numeric: true, format: 'money' },
  { key: 'amount_words', name: 'Amount In Words', group: 'total', format: 'words', from: 'net_amount' },
  { key: 'line_count', name: 'Number of Items', group: 'total', numeric: true },
];

/** One product line of a sales invoice. */
export const SALES_INVOICE_LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'line' },
  { key: 'product_name', name: 'Product Name', group: 'line' },
  { key: 'category', name: 'Category', group: 'line' },
  { key: 'brand', name: 'Brand', group: 'line' },
  { key: 'description', name: 'Description', group: 'line' },
  { key: 'serial_no', name: 'Serial No', group: 'line' },
  // The second line under the product name -- see TableColumn.subField.
  // "X day" the way the old component's getWarrantyInfo() read it.
  { key: 'warranty', name: 'Warranty', group: 'line' },
  { key: 'qty', name: 'Quantity', group: 'line', numeric: true },
  { key: 'price', name: 'Rate', group: 'line', numeric: true, format: 'money' },
  { key: 'amount', name: 'Amount', group: 'line', numeric: true, format: 'money' },
];
```

- [ ] **Step 2: Wire into `fieldsFor`, `lineFieldsFor`**

At `printTemplate.ts:850-855` (`fieldsFor`):

```ts
export const fieldsFor = (docType: DocType): FieldDef[] => {
  if (docType === 'sales_order') return ORDER_FIELD_CATALOG;
  if (docType === 'hotel_bill') return HOTEL_BILL_FIELDS;
  if (docType === 'hotel_money_receipt') return HOTEL_RECEIPT_FIELDS;
  if (docType === 'sales_invoice') return SALES_INVOICE_FIELD_CATALOG;
  return FIELD_CATALOG;
};
```

At `printTemplate.ts:874-880` (`lineFieldsFor`):

```ts
export const lineFieldsFor = (docType: DocType): FieldDef[] => {
  if (docType === 'sales_order') return ORDER_LINE_FIELDS;
  if (docType === 'hotel_bill') return HOTEL_BILL_LINE_FIELDS;
  if (docType === 'hotel_money_receipt') return [];
  if (docType === 'sales_invoice') return SALES_INVOICE_LINE_FIELDS;
  return LINE_FIELDS;
};
```

- [ ] **Step 3: Add to the flat lookup maps**

At the `ALL_INFO_BY_KEY` / `ALL_LINE_BY_KEY` definitions (just above `fieldName`, around line 918-925):

```ts
const ALL_INFO_BY_KEY = byKey([
  ...FIELD_CATALOG,
  ...ORDER_FIELD_CATALOG,
  ...HOTEL_BILL_FIELDS,
  ...HOTEL_RECEIPT_FIELDS,
  ...SALES_INVOICE_FIELD_CATALOG,
]);

const ALL_LINE_BY_KEY = byKey([
  ...LINE_FIELDS,
  ...ORDER_LINE_FIELDS,
  ...HOTEL_BILL_LINE_FIELDS,
  ...SALES_INVOICE_LINE_FIELDS,
]);
```

- [ ] **Step 4: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

Expected: succeeds (this task only adds data, no shape it depends on is missing yet).

- [ ] **Step 5: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/utils/print-designer/printTemplate.ts
git commit -m "printTemplate: add Sales Invoice field catalogue and line fields"
```

---

### Task 4: `printTemplate.ts` — default template, normalizeTemplate, ADDABLE_BANDS

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\utils\print-designer\printTemplate.ts` (new `salesInvoiceDefault()` builder near `hotelBill()`/`hotelReceipt()`; `defaultTemplate()` at line 1895-1900; `normalizeTemplate()` band-shape switch at 1944-2034 and the trailer at 2053-2066; `ADDABLE_BANDS` at 2105-2166)

**Interfaces:**
- Consumes: `SALES_INVOICE_FIELD_CATALOG`/`SALES_INVOICE_LINE_FIELDS` (Task 3), `InstallmentBand`/`PrintTemplate.pageSize` (Task 2), the `band<T>()` helper (existing, `printTemplate.ts:1743`).
- Produces: `defaultTemplate('sales_invoice')` returns a complete `PrintTemplate`; `normalizeTemplate(raw, 'sales_invoice')` round-trips a saved layout including an `installments` band and `pageSize`; `ADDABLE_BANDS` lets a tenant add an Installment band to any template. `DocumentPrint.tsx` (Task 5) renders exactly this shape.

- [ ] **Step 1: Every existing default-template builder gains `pageSize: 'a4'`**

In `standardChallan()`, `standardOrder()`, `hotelBill()`, `hotelReceipt()` (the four existing builder functions — find each by its `orientation: 'portrait',` line, e.g. `printTemplate.ts:1745`, `:1230`, `:1388`, and `hotelReceipt`'s), add the field directly under `orientation`:

```ts
  orientation: 'portrait',
  pageSize: 'a4',
```

(Four one-line insertions — this is what keeps the four existing papers unaffected per the type comment in Task 2.)

- [ ] **Step 2: Write `salesInvoiceDefault()`**

Add this new builder function next to `hotelBill()`/`hotelReceipt()` (after `hotelReceipt()`'s closing `});`, before `export type PresetDef` — or, simpler, right after `hotelReceipt()` wherever it ends; find it by searching for the next `const hotelReceipt = ()`):

```ts
/**
 * The Electronics Sales Invoice -- built to match, field for field, the
 * arrangement ElectronicsSalesInvoicePrintBase.tsx has always printed by
 * default: two-column party/voucher info, the product table with warranty as
 * a sub-line, a right-aligned totals column, the Installment Details table
 * beside it, and a signature line under the person who printed it. A branch
 * that never opens the designer gets exactly what it got before this
 * existed -- see the plan's Verification task for how that is checked.
 */
const salesInvoice = (): PrintTemplate => ({
  version: 1,
  docType: 'sales_invoice',
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
      text: 'Sales Invoice',
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
        { field: 'vr_no', label: 'Invoice No' },
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
        {
          field: 'product_name',
          label: 'Product',
          width: 54,
          align: 'left',
          // The room's second line, borrowed by name -- here it is the
          // warranty, printed under the product exactly as
          // getWarrantyInfo() always has.
          subField: 'warranty',
        },
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
        { field: 'grand_total', label: 'Total Tk.', ruleAbove: false },
        { field: 'tds_amount', label: '{tds_name} Tk.', hideIfEmpty: true },
        { field: 'service_charge_amount', label: '{service_charge_name} Tk.', hideIfEmpty: true },
        { field: 'carrying_outward_amount', label: '{carrying_outward_name} Tk.', hideIfEmpty: true },
        { field: 'discount_amount', label: 'Discount Tk.', hideIfEmpty: true },
        { field: 'net_amount', label: 'Net Tk.', ruleAbove: true },
        { field: 'received_amount', label: 'Received Tk.' },
        { field: 'due_amount', label: 'Due Tk.', ruleAbove: true },
      ],
    }),
    band<InstallmentBand>({
      id: 'installments',
      type: 'installments',
      show: true,
      title: 'Installment Details',
      bordered: true,
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

Note on the `{tds_name}`-style label tokens: this plan follows the existing `{party_label}`/`{order_type_label}` token convention already used by the Order paper (`ORDER_FIELD_CATALOG`, `printTemplate.ts:541-547` and `caption()` in `DocumentPrint.tsx`). If `caption()` (in `DocumentPrint.tsx`) only resolves tokens against `basic`/info fields and not against a totals-band item's own row, verify this in Task 5 — the fallback, if it does not resolve there, is to hardcode the label as the field name itself (`"TDS/Service Charge Tk."`) and drop the dynamic-label feature for v1, since it is a labeling nicety, not the correctness-critical part of this paper (the amount and whether the line shows at all still work either way).

- [ ] **Step 3: Wire `defaultTemplate()`**

At `printTemplate.ts:1895-1900`:

```ts
export const defaultTemplate = (docType: DocType = 'sales_challan'): PrintTemplate => {
  if (docType === 'sales_order') return standardOrder();
  if (docType === 'hotel_bill') return hotelBill();
  if (docType === 'hotel_money_receipt') return hotelReceipt();
  if (docType === 'sales_invoice') return salesInvoice();
  return standardChallan();
};
```

- [ ] **Step 4: `normalizeTemplate` — the `installments` band case**

At `printTemplate.ts:1944-2034`, add a case in the band-shape `switch` (right after the `case 'signature':` block, before `default:`):

```ts
        case 'installments':
          return {
            ...base,
            type: 'installments',
            title: typeof item.title === 'string' && item.title.trim() ? item.title : 'Installment Details',
            bordered: item.bordered !== false,
          };
```

- [ ] **Step 5: `normalizeTemplate` — read `pageSize`**

At `printTemplate.ts:2053-2066` (the object literal returned at the end of `normalizeTemplate`), add the field next to `orientation`:

```ts
  return {
    version: 1,
    docType,
    orientation: raw.orientation === 'landscape' ? 'landscape' : 'portrait',
    // Read back with the same "trust nothing, fall back to this paper's own
    // default" discipline as orientation beside it -- a template saved before
    // this field existed (every layout saved before today) has no pageSize to
    // read, and falls to 'a4' rather than to undefined.
    pageSize: raw.pageSize === 'half' ? 'half' : (fallback.pageSize ?? 'a4'),
    fontSize: bounded(raw.fontSize, 7, 24, fallback.fontSize),
    ...
```

(Keep every other field in that returned object exactly as it is.)

- [ ] **Step 6: `ADDABLE_BANDS` — let a tenant add an Installment band**

At `printTemplate.ts:2105-2166`, append one more entry (before the closing `];`):

```ts
  {
    type: 'installments',
    name: 'Installment Details',
    hint: 'A repayment schedule, read off the sale\'s own installment plan.',
    build: (id) =>
      band<InstallmentBand>({ id, type: 'installments', show: true, title: 'Installment Details', bordered: true }),
  },
```

- [ ] **Step 7: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

Expected: succeeds. `defaultTemplate('sales_invoice')` and `normalizeTemplate(raw, 'sales_invoice')` are now both callable and return a well-formed `PrintTemplate` — this is checkable directly in the browser console once Task 8 wires the Designer's dropdown, or right now via a scratch call from any already-mounted screen's dev console: `import { defaultTemplate } from '.../printTemplate'; console.log(defaultTemplate('sales_invoice'))`. Confirm the printed object has all 7 bands and `pageSize: 'a4'`.

- [ ] **Step 8: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/utils/print-designer/printTemplate.ts
git commit -m "printTemplate: default Sales Invoice template, normalizeTemplate installments case, pageSize round-trip"
```

---

### Task 5: `sampleDocument.ts` — preview sample for the Designer

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\modules\settings\print-designer\sampleDocument.ts`

**Interfaces:**
- Consumes: `DocumentData` type (from `DocumentPrint.tsx` — will gain `installments` in Task 6; this task can be written now and will compile once Task 6 lands, since TypeScript in this project is only transpiled, not checked — see Global Constraints. Do this task after Task 6 if working strictly in order, or accept the field is unused by the type checker either way).
- Produces: `SALES_INVOICE_SAMPLE: DocumentData`; `sampleFor('sales_invoice')` returns it.

- [ ] **Step 1: Add the sample**

Append near `HOTEL_RECEIPT_SAMPLE` (before `sampleFor`, currently starting line 307):

```ts
/**
 * A sale that never happened, matching the screenshot this feature was built
 * from: two products (one with a warranty, one a flat service charge with
 * none), an installment plan, and every optional total at a real
 * non-zero value so none of them are silently hidden in the preview -- a
 * sample with a zero TDS would let a tenant design a layout that never shows
 * where a real one goes.
 */
export const SALES_INVOICE_SAMPLE: DocumentData = {
  basic: {
    party_name: 'MD. Sample Islam',
    mobile: '01700000000',
    manual_address: 'Sample Bazar, Sample Sadar, Sample District',
    notes: 'Sales By Installments.',
    vr_no: '3-260900038',
    vr_date: dayjs().format('YYYY-MM-DD'),
    grand_total: 32520,
    tds_name: 'Installment Charge',
    tds_amount: 3600,
    service_charge_name: '',
    service_charge_amount: 0,
    carrying_outward_name: '',
    carrying_outward_amount: 0,
    discount_amount: 0,
    net_amount: 36120,
    received_amount: 7000,
    due_amount: 29120,
    amount_words: 'Thirty Six Thousands One Hundred And Twenty Taka Only',
    printed_by: 'Sample User',
  },
  products: [
    {
      sl: 1,
      product_name: 'Xiaomi Redmi Note 15 6/128GB Variant',
      qty: 1,
      price: 28000,
      amount: 28000,
      serial_no: '862795086755008',
      warranty: '365 day',
    },
    {
      sl: 2,
      product_name: 'Sample Mobile Shop Service Charge (Stamp with Locker)',
      qty: 1,
      price: 4520,
      amount: 4520,
      serial_no: '',
      warranty: '',
    },
  ],
  installments: [
    { due_date: dayjs().add(1, 'month').format('YYYY-MM-DD'), amount: 4860 },
    { due_date: dayjs().add(2, 'month').format('YYYY-MM-DD'), amount: 4860 },
    { due_date: dayjs().add(3, 'month').format('YYYY-MM-DD'), amount: 4860 },
    { due_date: dayjs().add(4, 'month').format('YYYY-MM-DD'), amount: 4860 },
    { due_date: dayjs().add(5, 'month').format('YYYY-MM-DD'), amount: 4860 },
    { due_date: dayjs().add(6, 'month').format('YYYY-MM-DD'), amount: 4820 },
  ],
};
```

- [ ] **Step 2: Wire `sampleFor`**

Find `sampleFor` (line 307) and add a branch:

```ts
export const sampleFor = (docType: string): DocumentData => {
  if (docType === 'sales_order') return SAMPLE_ORDER_DOCUMENT;
  if (docType === 'hotel_bill') return HOTEL_BILL_SAMPLE;
  if (docType === 'hotel_money_receipt') return HOTEL_RECEIPT_SAMPLE;
  if (docType === 'sales_invoice') return SALES_INVOICE_SAMPLE;
  return SAMPLE_DOCUMENT;
};
```

(Read the existing body first — it may already have the `hotel_bill`/`hotel_money_receipt` lines in a different order; add only the `sales_invoice` line, preserving whatever is already there.)

- [ ] **Step 3: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/modules/settings/print-designer/sampleDocument.ts
git commit -m "Print designer: sample Sales Invoice document for the preview pane"
```

---

### Task 6: `DocumentPrint.tsx` — render the Installment band, and half-page sizing

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\utils\print-designer\DocumentPrint.tsx:38-43,87,1148,1206`
- Modify: `f:\All_Database\cashbookbd_react\src\components\utils\utils-functions\PrintStyles.tsx`

**Interfaces:**
- Consumes: `InstallmentBand`, `PrintTemplate.pageSize` (Task 2); `template.bands` containing an `installments`-typed band (Task 4's default template, or any normalized one).
- Produces: `DocumentData.installments?: any[] | null`; `<PrintStyles pageSize={...} orientation={...} />`; every doc type's print output is otherwise pixel-identical to before this task (verified in Step 5), since `pageSize` defaults to `'a4'` everywhere except the new sales-invoice default.

- [ ] **Step 1: `DocumentData` gains `installments`**

At `DocumentPrint.tsx:38-43`:

```ts
export type DocumentData = {
  basic?: Record<string, any> | null;
  products?: any[] | null;
  /** A sale's own repayment schedule -- {due_date, amount}[]. */
  installments?: any[] | null;
  branch?: PrintBranch | null;
};
```

- [ ] **Step 2: `PrintStyles` — a `pageSize` prop**

Read the full current file first (`PrintStyles.tsx`, 88 lines — already read in full during planning). Change its `Props` and the `@page`/height calc:

```tsx
type Props = {
  /** A4 the tall way unless a report says otherwise. */
  orientation?: 'portrait' | 'landscape';
  /**
   * A4 unless the page is a half-size receipt -- 210mm x 148.5mm, the same
   * figure the old Electronics Sales Invoice's half-page variants used. Only
   * the Sales Invoice paper uses this; every other report's default (`'a4'`)
   * is unchanged from before this prop existed.
   */
  pageSize?: 'a4' | 'half';
};

const PrintStyles: React.FC<Props> = ({ orientation = 'portrait', pageSize = 'a4' }) => {
  // A4: 210 x 297mm. Half: 210 x 148.5mm -- half of A4's height, the sheet a
  // half-page receipt is actually cut from. 'landscape' swaps which of the
  // two is the printed width, exactly as it already did for A4 alone.
  const dims = pageSize === 'half' ? { width: '210mm', height: '148.5mm' } : { width: '210mm', height: '297mm' };
  const printedWidth = orientation === 'landscape' ? dims.height : dims.width;
  const printedHeight = orientation === 'landscape' ? dims.width : dims.height;

  return (
    <style>
      {`
        @media print {
          @page {
            size: ${printedWidth} ${printedHeight};
            margin: 6mm 8mm 5mm 10mm;
          }

          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          .avoid-break { break-inside: avoid; }
          .print-root { padding: 0 !important; }

          :root {
            --print-page-height: calc(${printedHeight} - 6mm - 5mm - 1mm);
          }
          ...
```

Keep every other rule in the file (`.print-page`, `h1,h2,h3`, the accent-color block) exactly as it is — only the `@page` line and the `--print-page-height` calc's source dimension change, from the old `A4 ${orientation}` shorthand to explicit `${printedWidth} ${printedHeight}`.

- [ ] **Step 3: `DocumentPrint.tsx` passes `pageSize` through**

At `DocumentPrint.tsx:1148`:

```tsx
<PrintStyles orientation={template.orientation} pageSize={template.pageSize} />
```

At `DocumentPrint.tsx:87`, `PREVIEW_PAGE_HEIGHT` needs a half-page row for the Designer's on-screen preview (screen rendering ignores `@media print`, so this constant is what actually sizes the preview pane):

```ts
/**
 * How tall a page stands in the designer's preview, keyed by pageSize then
 * orientation. A4 numbers are unchanged from before pageSize existed; half is
 * roughly half A4's height at the same 96dpi/-76px basis (148.5mm vs 297mm).
 */
const PREVIEW_PAGE_HEIGHT = {
  a4: { portrait: 1046, landscape: 718 },
  half: { portrait: 485, landscape: 484 },
};
```

At `DocumentPrint.tsx:1206`, change the read site:

```tsx
minHeight: PREVIEW_PAGE_HEIGHT[template.pageSize ?? 'a4'][template.orientation],
```

- [ ] **Step 4: The `InstallmentBlock` renderer**

Add near the other `*Block` components (after `NotesBlock`, before `SpacerBlock` — `DocumentPrint.tsx:756-776`):

```tsx
    const InstallmentBlock: React.FC<{ band: InstallmentBand }> = ({ band }) => {
      const rows = Array.isArray(data?.installments) ? data.installments : [];
      if (!rows.length) return null;

      const border = band.bordered ? 'border border-gray-800' : '';

      return (
        <div className={`mb-2 inline-block ${border}`} style={{ minWidth: '260px' }}>
          {band.title ? (
            <h2 className="w-full border-b border-gray-800 px-2 py-0.5 text-center text-[0.9em] font-semibold">
              {band.title}
            </h2>
          ) : null}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-[0.85em] font-semibold">
                <th className="px-2 py-0.5 text-center">SL</th>
                <th className="px-2 py-0.5 text-left">Due Date</th>
                <th className="px-2 py-0.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, index: number) => (
                <tr key={index} className="border-b border-gray-300 last:border-b-0">
                  <td className="px-2 py-0.5 text-center">{index + 1}</td>
                  <td className="px-2 py-0.5 text-left">
                    {dayjs(row?.due_date).isValid() ? dayjs(row.due_date).format('DD/MM/YYYY') : ''}
                  </td>
                  <td className="px-2 py-0.5 text-right font-medium">
                    {thousandSeparator(num(row?.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };
```

Add the case to `renderBand`'s switch (`DocumentPrint.tsx:1114-1133`, right after `case 'signature':`):

```tsx
        case 'installments':
          return <InstallmentBlock key={band.id} band={band as InstallmentBand} />;
```

Add `InstallmentBand` to the import list at the top of the file (`DocumentPrint.tsx:12-29`, alongside `TableBand`, `TotalsBand`, etc.):

```ts
import {
  Align,
  Band,
  InfoBand,
  InstallmentBand,
  NotesBand,
  ...
```

- [ ] **Step 5: Build and visually confirm nothing else moved**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

Then open the Print Template Designer in the running app for **Delivery Challan** and **Hotel — Bill** (the two most different existing papers) and confirm their preview panes render exactly as they did before this task — same page height, same margins. This is the check that `pageSize` defaulting to `'a4'` truly left every existing paper untouched.

- [ ] **Step 6: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/utils/print-designer/DocumentPrint.tsx src/components/utils/utils-functions/PrintStyles.tsx
git commit -m "DocumentPrint: render the Installment band; PrintStyles gains half-page sizing"
```

---

### Task 7: `bandEditors.tsx` — the Installment band's editor

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\modules\settings\print-designer\bandEditors.tsx`

**Interfaces:**
- Consumes: `InstallmentBand` (Task 2), `CheckRow`/`Input`/`CONTROL`/`SUB_LABEL` (existing exports/constants already used by `NotesBandEditor`, same file lines 827-853).
- Produces: `InstallmentBandEditor: React.FC<{band: InstallmentBand; onChange: (band: InstallmentBand) => void}>` — Task 8 wires it into the Designer's switch by this exact name.

- [ ] **Step 1: Add the editor**

Add `InstallmentBand` to this file's type imports (alongside `NotesBand`, `SignatureBand` at line 12-13). Then add the component, right after `NotesBandEditor` (after its closing `);` at line 853):

```tsx
export const InstallmentBandEditor: React.FC<{
  band: InstallmentBand;
  onChange: (band: InstallmentBand) => void;
}> = ({ band, onChange }) => (
  <div className="flex flex-col gap-3">
    <div>
      <span className={SUB_LABEL}>Title</span>
      <Input
        value={band.title}
        placeholder="Installment Details"
        onChange={(event) => onChange({ ...band, title: event.target.value })}
        className={CONTROL}
      />
    </div>
    <CheckRow
      checked={band.bordered}
      onChange={(bordered) => onChange({ ...band, bordered })}
      label="Draw a border around it"
    />
    <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">
      Its three columns -- Sl, Due Date, Amount -- come from the sale's own
      installment plan and are not configurable here. The table only appears
      on a sale that actually has one, and only on the last page, beside the
      totals.
    </p>
  </div>
);
```

- [ ] **Step 2: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/modules/settings/print-designer/bandEditors.tsx
git commit -m "Print designer: Installment band editor (title, border)"
```

---

### Task 8: `PrintTemplateDesigner.tsx` — wire Sales Invoice into the screen

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\modules\settings\print-designer\PrintTemplateDesigner.tsx:142,580-611,920-953`

**Interfaces:**
- Consumes: `InstallmentBandEditor` (Task 7), `sampleFor` already including `'sales_invoice'` (Task 5), `DOC_TYPES` already including `'sales_invoice'` (Task 2 — this file imports `DOC_TYPES` from `printTemplate.ts` and needs no change to pick it up).
- Produces: a tenant can open the Designer, pick "Sales Invoice" from the Paper dropdown (reached the same way the hotel papers are — no dedicated route; see `ROUTE_OF` comment at line 145-155, left unchanged), edit every band including the new Installment one, toggle A4/Half, and save.

- [ ] **Step 1: Add the bandEditor switch case**

At `PrintTemplateDesigner.tsx:580-611`, add a case and its import:

```tsx
      case 'installments':
        return (
          <InstallmentBandEditor band={selected as InstallmentBand} onChange={replaceBand} />
        );
```

Add `InstallmentBandEditor` and the `InstallmentBand` type to this file's existing import block from `bandEditors.tsx` / `printTemplate.ts` (alongside `NotesBandEditor`/`NotesBand` etc., around line 49-58 and wherever the type imports from `printTemplate.ts` live).

- [ ] **Step 2: A page-size control beside orientation**

At `PrintTemplateDesigner.tsx:936-946` (the `CheckRow` for `template.orientation === 'landscape'`), add one more `CheckRow` right after it, inside the same grid:

```tsx
          <div className="flex flex-col justify-end">
            <CheckRow
              checked={template.pageSize === 'half'}
              onChange={(half) => patch({ pageSize: half ? 'half' : 'a4' })}
              label="Half page (210 x 148.5mm)"
              hint="For a small receipt printer instead of a full A4 sheet."
            />
          </div>
```

- [ ] **Step 3: `PAPER_WIDTH_PX` keyed by page size too**

At `PrintTemplateDesigner.tsx:142`:

```ts
/** The preview pane's width, keyed by pageSize then orientation. */
const PAPER_WIDTH_PX = {
  a4: { portrait: 794, landscape: 1123 },
  half: { portrait: 794, landscape: 561 },
};
```

At `PrintTemplateDesigner.tsx:230`:

```ts
  const paperWidth = PAPER_WIDTH_PX[template.pageSize ?? 'a4'][template.orientation];
```

(`half-portrait` keeps A4's 210mm width — the shrink is in height, which `PREVIEW_PAGE_HEIGHT` in `DocumentPrint.tsx` already carries from Task 6; `half-landscape`'s width is the true 148.5mm shrunk side, 561px at the same 96dpi basis the existing numbers use — 148.5mm × 96/25.4 ≈ 561.)

- [ ] **Step 4: Build and manually walk through the Designer**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

Then in the running app: open the Print Template Designer, pick "Sales Invoice" from the Paper dropdown, confirm the preview renders the sample from Task 5 (two products, warranty line, installment table, all totals visible including the non-zero "Installment Charge" line), toggle "Half page" and confirm the preview pane visibly shrinks, add an "Installment Details" band via "Add a part" if one was removed, and save a layout for a test branch.

- [ ] **Step 5: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/modules/settings/print-designer/PrintTemplateDesigner.tsx
git commit -m "Print designer: wire Sales Invoice into the screen (installments editor, page-size toggle)"
```

---

### Task 9: The data adapter — reshape the existing sale payload into `DocumentData`

**Files:**
- Create: `f:\All_Database\cashbookbd_react\src\components\modules\invoices\sales\salesInvoiceDocumentData.ts`

**Interfaces:**
- Consumes: the raw `voucherData` shape `electronics/sales/invoice-print` already returns (`sales_master.details[]`, `acc_transaction_master[].acc_transaction_details[]`, `installments[]`, `inword`, `user`, `approved_user`, `print_layout` — the last one added in Task 1). Same shape `getSalesMeta()` in `ElectronicsSalesInvoicePrintBase.tsx:117-157` already reads correctly.
- Produces: `toSalesInvoiceDocumentData(voucherData: any): DocumentData` — Task 10 calls this by name.

- [ ] **Step 1: Write the adapter**

```ts
import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';

/**
 * The rich, relation-laden payload `electronics/sales/invoice-print` answers
 * with (shared, unchanged, with three other print components -- see the plan
 * task this came from) reshaped into the flat {basic, products, installments,
 * branch} the Print Template Designer's field catalogue reads by key.
 *
 * Ported from getSalesMeta() in the bespoke component this replaces --
 * ElectronicsSalesInvoicePrintBase.tsx:117-157 -- rather than rewritten, since
 * that logic (customer resolution, the three extra-charge lines by coa4_id,
 * the grand total) is already correct against real data.
 */
export const toSalesInvoiceDocumentData = (data: any): DocumentData => {
  const salesMaster = data?.sales_master;
  const details = salesMaster?.details || [];
  const transactions = Array.isArray(data?.acc_transaction_master)
    ? data.acc_transaction_master
    : data?.acc_transaction_master
      ? [data.acc_transaction_master]
      : [];
  const trxDetails = transactions.flatMap(
    (t: any) => (Array.isArray(t?.acc_transaction_details) ? t.acc_transaction_details : []),
  );

  const received = trxDetails.find((d: any) => d.coa4_id === 17);
  const discount = trxDetails.find((d: any) => d.coa4_id === 23);
  const tds = trxDetails.find((d: any) => d.coa4_id === 41);
  const serviceCharge = trxDetails.find((d: any) => d.coa4_id === 42);
  const carryingOutward = trxDetails.find((d: any) => d.coa4_id === 198);

  const customerId = Number(salesMaster?.customer_id);
  const customerDetail =
    trxDetails.find(
      (d: any) => Number(d?.coa4_id) === customerId || Number(d?.coa_l4?.id) === customerId,
    ) || trxDetails.find((d: any) => d?.coa_l4?.cust_party_infos);
  const customerInfo = customerDetail?.coa_l4?.cust_party_infos || {};

  const grandTotal = details.reduce(
    (sum: number, d: any) => sum + Number(d.quantity) * Number(d.sales_price),
    0,
  );
  const tdsAmount = tds ? Number(tds.credit) : 0;
  const serviceChargeAmount = serviceCharge ? Number(serviceCharge.credit) : 0;
  const carryingOutwardAmount = carryingOutward ? Number(carryingOutward.credit) : 0;
  const discountAmount = discount ? Number(discount.debit) : 0;
  const receivedAmount = received ? Number(received.debit) : 0;
  const netAmount = grandTotal + tdsAmount + serviceChargeAmount + carryingOutwardAmount - discountAmount;

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
      party_name: salesMaster?.name || customerInfo?.name || customerDetail?.coa_l4?.name || '-',
      mobile: salesMaster?.mobile || customerInfo?.mobile || '',
      manual_address:
        customerInfo?.manual_address ||
        customerDetail?.coa_l4?.manual_address ||
        salesMaster?.manual_address ||
        salesMaster?.customer_address ||
        customerInfo?.address ||
        salesMaster?.address ||
        '',
      notes: salesMaster?.notes || '',
      vr_no: data?.vr_no,
      vr_date: data?.vr_date,
      order_number: salesMaster?.sales_order?.order_number || '',
      delivery_location: salesMaster?.sales_order?.delivery_location || '',
      vehicle_no: salesMaster?.vehicle_no || '',
      created_by: data?.user?.name || '',
      printed_by: data?.approved_user?.name || data?.user?.name || '',
      grand_total: grandTotal,
      tds_name: tds ? tds.coa_l4?.name : '',
      tds_amount: tdsAmount,
      service_charge_name: serviceCharge ? serviceCharge.coa_l4?.name : '',
      service_charge_amount: serviceChargeAmount,
      carrying_outward_name: carryingOutward ? carryingOutward.coa_l4?.name : '',
      carrying_outward_amount: carryingOutwardAmount,
      discount_amount: discountAmount,
      net_amount: netAmount,
      received_amount: receivedAmount,
      due_amount: netAmount - receivedAmount,
      amount_words: data?.inword || '',
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
      price: Number(row?.sales_price) || 0,
      amount: (Number(row?.quantity) || 0) * (Number(row?.sales_price) || 0),
    })),
    installments: Array.isArray(data?.installments)
      ? data.installments.map((inst: any) => ({
          due_date: inst?.due_date,
          amount: Number(inst?.amount) || 0,
        }))
      : [],
    branch: {
      name: data?.branch?.name,
      address: data?.branch?.address,
      phone: data?.branch?.phone,
    } as any,
  };
};
```

Note: `dayjs` is imported but unused directly in this file (dates are passed through as raw strings and formatted by `DocumentPrint.tsx`, matching how every other doc type's adapter behaves — `salesInfo()` in the PHP challan endpoint does the same). Remove the unused import if the build warns about it; keep it only if a later formatting need arises.

- [ ] **Step 2: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/modules/invoices/sales/salesInvoiceDocumentData.ts
git commit -m "Add the Sales Invoice DocumentData adapter, ported from getSalesMeta()"
```

---

### Task 10: Cut `ElectronicsSalesInvoicePrint.tsx` over to `DocumentPrint`

**Files:**
- Modify: `f:\All_Database\cashbookbd_react\src\components\modules\invoices\sales\ElectronicsSalesInvoicePrint.tsx`

**Interfaces:**
- Consumes: `toSalesInvoiceDocumentData` (Task 9), `DocumentPrint`, `normalizeTemplate`, `defaultTemplate` (existing, from `printTemplate.ts`).
- Produces: `ElectronicsSalesInvoicePrint`'s external interface (`props: {data, rowsPerPage?, fontSize?}`, a `forwardRef<HTMLDivElement>`) is unchanged — `VoucherPrintRegistry.tsx:233-238` calls it exactly as today. Nothing outside this file needs to change.

- [ ] **Step 1: Rewrite the component**

Replace the file's contents:

```tsx
import React from 'react';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import { defaultTemplate, normalizeTemplate } from '../../../utils/print-designer/printTemplate';
import { toSalesInvoiceDocumentData } from './salesInvoiceDocumentData';

type Props = {
  data: any;
  rowsPerPage?: number;
  fontSize?: number;
};

/**
 * The Electronics Sales Invoice, drawn by the Print Template Designer.
 *
 * Replaces four bespoke paper-size variants and their shared base component
 * (see docs/superpowers/specs/2026-09-20-sales-invoice-print-designer-design.md)
 * with the same self-service layout system Delivery Challan/Order/the two
 * hotel papers already use. `data` is the SAME raw payload
 * `electronics/sales/invoice-print` has always returned -- reshaped here,
 * not upstream, because three other print components
 * (CashReceivedPrint/CashPaymentPrint/PurchaseInvoicePrint) still read it in
 * its original shape.
 *
 * `fontSize`/`rowsPerPage` props are accepted for interface compatibility
 * with VoucherPrintRegistry's other print components but are no longer read
 * here -- both are now template properties the tenant sets in the designer,
 * the same as every other doc type on it.
 */
const ElectronicsSalesInvoicePrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => {
    if (!data?.sales_master) {
      return <div ref={ref}>No invoice data</div>;
    }

    const documentData = toSalesInvoiceDocumentData(data);
    const savedLayout = data?.print_layout?.layout;
    const template = savedLayout
      ? normalizeTemplate(savedLayout, 'sales_invoice')
      : defaultTemplate('sales_invoice');

    return <DocumentPrint ref={ref} template={template} data={documentData} />;
  },
);

ElectronicsSalesInvoicePrint.displayName = 'ElectronicsSalesInvoicePrint';

export default ElectronicsSalesInvoicePrint;
```

- [ ] **Step 2: Build**

```bash
cd "f:/All_Database/cashbookbd_react"
npm run build
```

Expected: succeeds. The four variant files and the base component still exist and still compile at this point (they are simply no longer imported from `ElectronicsSalesInvoicePrint.tsx`) — do not delete them yet; that is Task 12, gated on Task 11's verification.

- [ ] **Step 3: Commit**

```bash
cd "f:/All_Database/cashbookbd_react"
git add src/components/modules/invoices/sales/ElectronicsSalesInvoicePrint.tsx
git commit -m "Cut ElectronicsSalesInvoicePrint over to DocumentPrint + the sales_invoice template"
```

---

### Task 11: Verify against real data — both reference cases, plus a real half-page branch

**Files:** none changed; this task is verification only, per the spec's non-negotiable Verification section.

- [ ] **Step 1: Zero-extras case (the screenshot)**

In the running app, print a real (or the same kind of) invoice as the one in the spec's reference screenshot: two product lines (one with a warranty, one without), an installment plan, TDS/discount/carrying-outward all at zero. Compare field-by-field against the screenshot in the spec:
- Name, Mobile, Address, Notes, Invoice No, Date all present and correctly labeled.
- Both product rows correct, including the IMEI/serial line and the warranty line under the phone.
- Total Tk., Installment Charge Tk. (this is `tds_amount`/`tds_name` in the new catalogue — confirm it is genuinely the TDS line and not service charge or carrying-outward for this particular sale's chart-of-accounts mapping), Net Tk., Received Tk., Due Tk. all present and correct.
- Installment Details table: six rows, correct due dates and amounts, SL numbering 1-6.
- The "In Word" line and the signature line at the foot.

Note any visual difference from the old bespoke output (font size, spacing, column widths) — these are expected to need designer-side tuning (editing `salesInvoice()`'s default template in Task 4, not a new task) rather than being architectural problems.

- [ ] **Step 2: Non-zero-extras case**

Find or create a real sale where TDS, discount, AND carrying-outward are all non-zero simultaneously (the screenshot case hides all three, so this is the only way to confirm those totals-band rows actually render and are individually correct, not just correctly hidden). Print it and confirm all three extra lines show with their real chart-of-accounts labels and figures, and that Net Tk. correctly sums `grand_total + tds + service_charge + carrying_outward - discount`.

- [ ] **Step 3: A real half-page branch**

Identify a branch currently configured for `half-portrait` or `half-landscape` (check `branch.paper_size` in the branch settings, or ask -- this was flagged as unverified in the spec). In the Designer, build and save a `sales_invoice` layout with "Half page" checked for that branch (or its company/branch context), then print a real sale from that branch and confirm it comes out on the correct physical page size, legible, with no column running off the printable width — adjust `fontSize`/column widths in the Designer if not.

- [ ] **Step 4: Report findings inline**

If Steps 1-3 all pass without needing anything beyond designer-level layout tuning, proceed to Task 12. If something is architecturally wrong (a field genuinely missing from the catalogue, a calculation that does not match the old component), fix it in the relevant earlier task's file before proceeding — do not patch around it in `ElectronicsSalesInvoicePrint.tsx`.

---

### Task 12: Delete the five bespoke files

**Files:**
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\invoices\sales\variants\ElectronicsSalesInvoicePrintBase.tsx`
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\invoices\sales\variants\ElectronicsSalesInvoicePrintA4Portrait.tsx`
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\invoices\sales\variants\ElectronicsSalesInvoicePrintA4Landscape.tsx`
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\invoices\sales\variants\ElectronicsSalesInvoicePrintHalfPortrait.tsx`
- Delete: `f:\All_Database\cashbookbd_react\src\components\modules\invoices\sales\variants\ElectronicsSalesInvoicePrintHalfLandscape.tsx`

**Interfaces:**
- Consumes: Task 11's passed verification (gate — do not run this task if Task 11 found an unresolved gap).
- Produces: nothing else in the codebase references these five files (confirm in Step 1).

- [ ] **Step 1: Confirm nothing else imports them**

```bash
cd "f:/All_Database/cashbookbd_react"
grep -rln "ElectronicsSalesInvoicePrintBase\|ElectronicsSalesInvoicePrintA4Portrait\|ElectronicsSalesInvoicePrintA4Landscape\|ElectronicsSalesInvoicePrintHalfPortrait\|ElectronicsSalesInvoicePrintHalfLandscape" src/
```

Expected: no output (Task 10 already removed the only importer, `ElectronicsSalesInvoicePrint.tsx`).

- [ ] **Step 2: Delete**

```bash
cd "f:/All_Database/cashbookbd_react"
git rm src/components/modules/invoices/sales/variants/ElectronicsSalesInvoicePrintBase.tsx \
       src/components/modules/invoices/sales/variants/ElectronicsSalesInvoicePrintA4Portrait.tsx \
       src/components/modules/invoices/sales/variants/ElectronicsSalesInvoicePrintA4Landscape.tsx \
       src/components/modules/invoices/sales/variants/ElectronicsSalesInvoicePrintHalfPortrait.tsx \
       src/components/modules/invoices/sales/variants/ElectronicsSalesInvoicePrintHalfLandscape.tsx
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: succeeds — confirms Step 1's grep was right.

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove the bespoke Electronics Sales Invoice print components, superseded by the Print Template Designer"
```

---

## Self-Review Notes

- **Spec coverage:** every numbered section of the design spec (§1 data model, §2 field catalogue/bands, §3 half-page, §4 API, §5 cutover, plus the Decisions section's three folded-in branch flags and Verification) has a task. The three "no change needed" areas from the spec's Scope (`installment/` module, inline installment creation, new branch settings) have deliberately no task.
- **Placeholder scan:** no TBD/TODO; the two spots with genuine runtime uncertainty (whether `{tds_name}`-style tokens resolve in totals-band labels; whether a dynamic Eloquent property survives `foundData()`'s JSON serialization) are called out with a concrete fallback each, not left open.
- **Type/name consistency:** `InstallmentBand`, `toSalesInvoiceDocumentData`, `salesInvoice()`/`defaultTemplate('sales_invoice')`, `print_layout` are each defined once and referenced by that exact name in every later task that uses them.
