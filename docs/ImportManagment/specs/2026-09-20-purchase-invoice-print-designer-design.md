# Purchase Invoice in the Print Template Designer

Status: approved by user 2026-09-20, ready for implementation planning.

## Problem

Same shape as the Sales Invoice work just completed
(`docs/superpowers/specs/2026-09-20-sales-invoice-print-designer-design.md`):
Purchase Invoice prints through its own bespoke component tree
(`PurchaseInvoicePrintBase.tsx` + 4 paper-size variants + a thin wrapper,
`src/components/modules/vouchers/print_items/purchase_invoice/` and
`PurchaseInvoicePrint.tsx`), gated by the same per-branch booleans
(`show_category_in_invoice`, `show_brand_in_invoice`,
`show_description_in_invoice`, `device_identifier_text`,
`show_spelling_of_money`) as Sales Invoice had. It has never been on the
Print Template Designer. The user wants the same treatment: a `purchase_invoice`
DocType on the Designer, and the bespoke component tree cut over and retired.

## What's different from Sales Invoice (why this is smaller)

- **No installment table.** Purchase Invoice has no `InstallmentBand` need —
  it foots at Total / Discount / Net / Paid / Due, nothing more.
- **No half-page or InstallmentBand infrastructure work needed.** Both
  already exist as generic `PrintTemplate`/`DocumentPrint` capabilities from
  the Sales Invoice work — `pageSize`, `PrintStyles`'s half-page sizing, the
  Designer's "Half page" toggle and `PAPER_WIDTH_PX` are all doc-type-agnostic
  already. **Zero changes needed to `DocumentPrint.tsx`, `PrintTemplateDesigner.tsx`,
  or `bandEditors.tsx`** for this feature.
- **Same backend endpoint, already serving this data.** `PurchaseInvoicePrint.tsx`
  reads from the exact same Redux-held payload (`electronics/sales/invoice-print`
  → `ElectronicsSalesController::salesPrintData()`) as Sales Invoice — that
  method already eager-loads `purchaseMaster.details.product.category/brand/unit`
  and `purchaseMaster.purchaseOrder`. The only backend change is adding
  `'purchase_invoice'` to `PrintTemplateController::DOC_TYPES` (one line) and
  bundling ITS OWN saved layout into the same response, mirroring exactly
  what Task 1 of the Sales Invoice plan did for `print_layout` — this needs
  a SECOND key (`purchase_print_layout`, say) since a single voucher-print
  call could in principle be either a sale or a purchase, and the two doc
  types' saved layouts are unrelated rows.

## Scope

In scope:
- A sixth `DocType`, `'purchase_invoice'`, with its own field catalogue and
  product-line fields (`PURCHASE_INVOICE_FIELD_CATALOG`, `PURCHASE_INVOICE_LINE_FIELDS`).
- A default template (no Installment band).
- A Designer preview sample.
- Backend: `'purchase_invoice'` added to `PrintTemplateController::DOC_TYPES`;
  `salesPrintData()` gains a second bundled-layout field for this doc type.
- A data adapter, ported from `getPurchaseMeta()` in `PurchaseInvoicePrintBase.tsx`
  (lines ~109-153), same lesson learned as Sales Invoice's adapter: do NOT
  set `printed_by` from voucher data — leave it out so `DocumentPrint.tsx`'s
  session default applies.
- Cutover of `PurchaseInvoicePrint.tsx` to `<DocumentPrint>`.
- Delete the 5 bespoke files (`PurchaseInvoicePrintBase.tsx` + 4 variants)
  after the same kind of real-data verification Sales Invoice used.

Out of scope, for the same reasons as Sales Invoice:
- No new branch-settings UI — the branch booleans fold into the Designer's
  existing include/exclude and label-rename mechanisms.
- No changes to how a purchase is entered or its data captured.

## Decisions

**Field catalogue mirrors Sales Invoice's shape minus the sale-only fields.**
Party group renamed to supplier terms (`party_name`→ still generically
"Party Name" since `FieldDef` groups are shared across doc types the same
way `printed_by`/`notes`/`branch_name` already are reused verbatim across
existing catalogues — group `'party'` covers supplier the same as customer).
Totals: `total_amount`, `discount_amount`, `net_amount`, `paid_amount`,
`due_amount`, `amount_words` — no TDS/service-charge/carrying-outward
(purchase has none in `getPurchaseMeta()`), no `line_count` needed unless
useful (keep it, harmless, matches Sales Invoice's catalogue for consistency).

**`purchase_print_layout` is its own bundled field, separate from
`print_layout`.** The two doc types share one endpoint but are unrelated
papers with unrelated saved layouts — reusing the same response key would
mean a branch's sales layout and purchase layout collide on one field.
Mirrors `print_layout`'s own shape and lookup exactly (raw layout or `null`,
same `PrintTemplate::where(...)->orderByDesc('is_default')->orderBy('id')->first()`
query, this time with `doc_type = 'purchase_invoice'`).

**No new band type, no Designer/DocumentPrint changes.** Confirmed by
reading the existing infrastructure: `InstallmentBand` is additive and
irrelevant to a template with no `installments` band in its `bands[]`; a
template simply omitting that band never triggers `InstallmentBlock`.
`pageSize`/half-page sizing, the "Half page" toggle, and `PAPER_WIDTH_PX`
are already fully generic across every `DocType`.

## Design

### 1. Backend

- `PrintTemplateController::DOC_TYPES` gains `'purchase_invoice'`.
- `ElectronicsSalesController::salesPrintData()` gains a second bundled-layout
  lookup and field, `$record->purchase_print_layout`, using `doc_type =
  'purchase_invoice'` — same pattern as `print_layout`, added right next to it.

### 2. `printTemplate.ts`

- `DocType` gains `'purchase_invoice'`; `DOC_TYPES` entry: name "Purchase
  Invoice", hint "What comes in with the goods, from the supplier."
- `PURCHASE_INVOICE_FIELD_CATALOG`, `PURCHASE_INVOICE_LINE_FIELDS` (same
  shape as Sales Invoice's, discount/paid/due instead of the sale's fuller
  totals set; line fields identical shape — product/category/brand/description/
  serial/warranty/qty/rate/amount).
- `purchaseInvoice()` default template builder — Header, Title ("Purchase
  Invoice"), Info (supplier + voucher facts), Table (with warranty subField),
  Totals (Total/Discount/Net/Paid/Due), Info (amount words), Signature. No
  Installment band. `pageSize: 'a4'`.
- Wire into `fieldsFor`, `lineFieldsFor`, `defaultTemplate`, `normalizeTemplate`
  (no new band case needed — only the existing per-type fallback wiring),
  `ALL_INFO_BY_KEY`/`ALL_LINE_BY_KEY`.

### 3. `sampleDocument.ts`

- `PURCHASE_INVOICE_SAMPLE`, wired into `sampleFor`.

### 4. Data adapter

- New file `src/components/modules/vouchers/print_items/purchaseInvoiceDocumentData.ts`,
  `toPurchaseInvoiceDocumentData(data)`, ported from `getPurchaseMeta()`.
  **Does not set `printed_by`** (lesson carried over from Sales Invoice's
  Task 9 review finding).

### 5. Cutover

- `PurchaseInvoicePrint.tsx` rewritten as a thin `<DocumentPrint>` wrapper,
  reading `data?.purchase_print_layout` (raw layout or null — same
  unwrapped convention, not `.purchase_print_layout.layout`).
- Delete `PurchaseInvoicePrintBase.tsx` + 4 variants after verification.

## Verification

Same discipline as Sales Invoice: compare the default template's rendered
output against a real purchase invoice (zero-discount case and a
non-zero-discount case), and check a real half-page-configured branch if
one exists for purchases, before deleting the bespoke files.
