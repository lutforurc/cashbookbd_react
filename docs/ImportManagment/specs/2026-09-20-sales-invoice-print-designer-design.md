# Sales Invoice in the Print Template Designer

Status: approved by user 2026-09-20, ready for implementation planning.

## Problem

The Electronics Sales Invoice (screenshot: `MD. HAMIDUL ISLAM` invoice,
3-260900038) prints through its own bespoke component tree
(`ElectronicsSalesInvoicePrintBase.tsx`, 442 lines, plus four thin variant
wrappers for a4-portrait / a4-landscape / half-portrait / half-landscape) with
everything — column layout, which fields show, the Installment Details table —
hardcoded in JSX and gated by six per-branch boolean settings.

The Print Template Designer (`printTemplate.ts` / `DocumentPrint.tsx`) already
lets a tenant self-serve this kind of layout control for four other paper
types (Delivery Challan, Order, Hotel Bill, Hotel Money Receipt), including
per-tenant field selection, column widths, and label renaming — but has never
carried a Sales Invoice, and has no concept of an installment table or of a
page smaller than A4.

The user wants Sales Invoice fully on the Designer: same self-service layout
control the other four papers have, including the Installment Details table,
in both A4 and half-page sizes, replacing the bespoke component.

## Scope

In scope:
- A fifth `DocType`, `'sales_invoice'`, with its own field catalogue and
  product-line fields.
- A new `InstallmentBand` the Designer can add/remove/rename, reading
  `data.installments`.
- A `pageSize: 'a4' | 'half'` dimension on `PrintTemplate`, alongside the
  existing `orientation`, so a template can be a half-page receipt as well as
  full A4 — needed because Electronics Sales branches print on both today.
- A new API endpoint building the `DocumentData` payload for a sale.
- Swapping `ElectronicsSalesInvoicePrint.tsx` and its four variants over to
  fetch that data and render the saved (or default) template through
  `DocumentPrint`, then deleting the five bespoke files this replaces
  (`ElectronicsSalesInvoicePrintBase.tsx` + 4 variant wrappers).

Out of scope (confirmed with user — not needed, no gap found):
- Anything under `src/components/modules/installment/` (due-installment
  collection, received-installment recording, early payment, staff-wise due
  list). That module tracks installment *payments* elsewhere in the app
  (unrelated to how an Electronics sale's own installment plan is entered) and
  needs no change.
- The inline installment-plan creation UI inside `ElectronicsBusinessSales.tsx`
  (amount / start date / number of installments, and its edit path). It
  already produces the `installments` array this feature prints; not touched.
- Any new branch-settings UI. The six existing per-branch booleans
  (`show_category_in_invoice`, `show_brand_in_invoice`,
  `show_description_in_invoice`, `device_identifier_text`,
  `show_spelling_of_money`, `show_instalment_list`) are superseded by the
  Designer's existing "field/band included or not" and "label renamed or not"
  mechanisms — see Decisions below. No settings screen work needed.

## Decisions

**Branch booleans fold into the Designer, not into new settings.** The
Designer's whole point is that a tenant controls what prints by what they add
to a template, not by a flag a developer wires per-field. Concretely:
- `show_category_in_invoice` / `show_brand_in_invoice` /
  `show_description_in_invoice` → whether the tenant includes those as
  product-line sub-fields in their line configuration.
- `device_identifier_text` (today: relabels "Serial No" to e.g. "IMEI No") →
  the line field's existing per-template `label` override (`TableColumn` /
  `InfoItem` already support this — see `printTemplate.ts:114,78`).
- `show_spelling_of_money` → whether `amount_words` is included in the totals
  band, exactly like every other doc type already works.
- `show_instalment_list` → the new Installment band's own `show` toggle.

**Installment band has no column configuration.** Unlike `TableBand`, its
three columns (Sl, Due Date, Amount) are fixed to the data shape
(`installments[].due_date`, `installments[].amount`) — there is nothing to
choose. Only `show`, `bordered`, and a renameable title are configurable,
matching the simplicity of `NotesBand`/`SignatureBand` rather than the
generality of `TableBand`.

**Half-page is a template property, not a per-branch runtime choice.**
Today `ElectronicsSalesInvoicePrint.tsx` picks a paper size at print time from
`settings.branch.paper_size`. After this change, a branch instead *designs*
whichever one it actually uses (a4 or half) in the Designer and saves it —
resolved during planning: `print_templates` already keys one row per
(company, branch, doc_type, name) with an `is_default` flag deciding which one
prints (`PrintTemplateController.php:130-144`), exactly the same mechanism
`hotel_bill` already uses for its own single portrait-or-landscape choice.
`pageSize` joins `orientation` inside the `layout` JSON that row already
stores — no schema change, no second key dimension. A branch that genuinely
wants both sizes on hand can already save two named layouts and flip
`is_default`; nothing new is needed for that either.

**No feature flag, no dead code kept as a safety net.** The five bespoke
files are deleted once the default `sales_invoice` template is verified
(visually, against real print output) to reproduce today's default look. Git
history is the rollback path — an unused parallel code path is exactly the
kind of scaffolding-for-later this project avoids, and it's one more thing
someone has to remember to remove.

## Design

### 1. `printTemplate.ts` changes

- `DocType` gains `'sales_invoice'`; add its entry to `DOC_TYPES`.
- `PrintTemplate.pageSize: 'a4' | 'half'`, defaulting to `'a4'` everywhere it
  is constructed today (`defaultTemplate`, `normalizeTemplate`'s fallback) so
  the four existing doc types are unaffected.
- New band type:
  ```ts
  export type InstallmentBand = BandBase & {
    type: 'installments';
    title: string;       // "Installment Details" by default, renameable
    bordered: boolean;
  };
  ```
  Add `'installments'` to `BandType` and `InstallmentBand` to the `Band` union.
- `SALES_INVOICE_FIELD_CATALOG: FieldDef[]` — party (customer name, mobile,
  address), voucher (invoice no, date, notes, order number, delivery
  location, vehicle no, printed by), totals (grand total, TDS amount + its
  dynamic name, service charge amount + name, carrying outward amount + name,
  discount, net, received, due, amount in words). The three dynamic-named
  charge lines are why the screenshot's "Installment Charge Tk. 3,600" needs
  no special-casing — it is just whichever of TDS/service-charge/carrying-out
  the tenant's chart of accounts names that.
- `SALES_INVOICE_LINE_FIELDS: FieldDef[]` — product name (with `subField` for
  warranty, following the existing hotel-bill room/description pattern at
  `printTemplate.ts:118-136`), category, brand, description, qty, rate,
  amount, serial no.
- Wire both into `fieldsFor` / `lineFieldsFor`.
- `defaultTemplate('sales_invoice')` and a `sales_invoice` entry in
  `normalizeTemplate`'s per-type defaults, built to match the current bespoke
  component's default arrangement as closely as reasonable (see Verification).
- `SAMPLE_DOCUMENT`-equivalent for the Designer's preview pane (mirrors
  `sampleDocument.ts`'s existing per-doc-type samples), including a sample
  `installments` array.
- `ADDABLE_BANDS` gains the installment band so a tenant can add it to a
  template that started without one.

### 2. `DocumentPrint.tsx` changes

- `DocumentData.installments?: any[] | null`.
- Render branch for `band.type === 'installments'`: three fixed columns (Sl —
  generated 1..n, Due Date — `date` format, Amount — `money` format), title
  from `band.title`, skipped entirely when `!band.show` or the array is empty
  (matching how other optional bands behave today).
- Page sizing: `PrintStyles` gets a `pageSize` prop alongside `orientation`;
  `'half'` renders `@page { size: 210mm 148.5mm; }` (the same figure
  `ElectronicsSalesInvoicePrintBase`'s `half-portrait`/`half-landscape` use
  today) instead of the A4 sizes. `PREVIEW_PAGE_HEIGHT` and the designer's
  preview-pane math get the matching half-page height. Column widths, font
  size and margins stay entirely template-driven (`fontSize`, `TableColumn.width`,
  `marginLeft/Right`) — no per-page-size hardcoded tuning, unlike the bespoke
  component's `variantConfig`. This is the actual point of moving to the
  Designer: a tenant tunes a half-page layout visually instead of a developer
  hand-tuning four constant objects.

### 3. `PrintTemplateDesigner.tsx` / `bandEditors.tsx`

- `'Sales Invoice'` in the doc-type picker.
- A page-size control (A4 / Half) alongside the existing orientation control.
- An editor for the Installment band: show/hide toggle, bordered toggle, title
  text field — same shape as the existing `NotesBand`/`SignatureBand` editors.

### 4. API — no new endpoint; extend the one already in use

Corrected during planning: Sales Invoice printing does **not** go through
`SalesController@apiSalesChallanData` at all. It already has its own live
endpoint, `POST electronics/sales/invoice-print`
(`ElectronicsSalesController@salesInvoicePrint` →
`salesPrintData($transactionId)`, `routes/api.php:605`), which the whole app
already calls for every voucher print (`electronicsSalesSlice.ts`'s
`electronicsSalesPrint` thunk, dispatched from `VoucherPrintRegistry.tsx`,
used across every voucher listing screen — not just Electronics Sales). It
returns the full `MainTransactionMaster` record with `salesMaster.details`,
`installments`, `inword`, `user`, `approvedUser` already eager-loaded — richer
than `DocumentData` needs, and consumed **as-is** by three other print
components that share this same Redux-held payload
(`CashReceivedPrint`, `CashPaymentPrint`, `PurchaseInvoicePrint` — see
`VoucherPrintRegistry.tsx:241-259`). The plan must not change this payload's
existing shape, only add to it.

Two small, additive changes instead of a new endpoint:
- `salesPrintData()` gains one more line: look up this branch's saved
  `sales_invoice` `PrintTemplate` row (same query
  `PrintTemplateController::show()` runs — company, branch, doc_type,
  `is_default`) and attach it as `$record->print_layout`. Bundles data and
  layout in one round trip, matching the documented reason `FolioScreen.tsx`
  does the same (`FolioScreen.tsx:445-453`: "one that needs two round trips is
  one that opens late").
- `PrintTemplateController::DOC_TYPES` gains `'sales_invoice'` (one line),
  so the Designer's own save/list/delete calls for the new type are accepted
  — it currently 404s ("Unknown document type") for anything not listed.

The `{basic, products, installments, branch}` reshape happens **client-side**,
in a new small adapter (ported from the existing, already-correct
`getSalesMeta()` in `ElectronicsSalesInvoicePrintBase.tsx:117-157`), not on
the server — because the server payload is shared with three unrelated print
components that must keep receiving it unchanged.

### 5. Cutover

- `ElectronicsSalesInvoicePrint.tsx` stops switching between four bespoke
  components. It keeps receiving the same `voucherData` prop it gets today
  (nothing changes in `VoucherPrintRegistry.tsx` or the Redux thunk), reshapes
  it with the new adapter, reads `voucherData.print_layout` and runs it
  through `normalizeTemplate(layout, 'sales_invoice')` or falls back to
  `defaultTemplate('sales_invoice')`, and renders one `<DocumentPrint>`.
  `branch.paper_size` is no longer read by this component — the printed page
  size now comes from whichever `pageSize` the branch saved inside their
  `sales_invoice` layout (see Decisions).
- Delete `ElectronicsSalesInvoicePrintBase.tsx` and the four
  `ElectronicsSalesInvoicePrint{A4Portrait,A4Landscape,HalfPortrait,HalfLandscape}.tsx`
  wrappers once Verification below passes.

## Verification

Non-negotiable before deleting the old files:
1. Build the default `sales_invoice` template (a4 and half) and compare its
   rendered print preview, field by field, against a real invoice printed by
   the current bespoke component (the screenshot in this spec is one
   reference case: two product lines with warranty and a service-charge line,
   installments, TDS/discount all at zero — a second reference case with
   TDS/discount/carrying-outward non-zero should be checked too, since those
   rows are hidden at zero and easy to miss in a single sample).
2. Print (or print-preview) at least one real sale from a branch that
   currently uses `half-portrait`, since that is the size with no prior
   Designer precedent.
3. Only then remove the five bespoke files.

## Open items for the implementation plan

Both resolved during planning (see Design §4 and the Half-page decision
above) — kept here as a record of what changed from the original brainstorm:
- `print_templates` keying needed no change; `pageSize` lives inside the
  existing `layout` JSON column, like `orientation` already does.
- There is no `apiSalesInvoiceData` — the existing
  `electronics/sales/invoice-print` endpoint (`ElectronicsSalesController@salesInvoicePrint`)
  is extended in place rather than duplicated, because three other print
  components already depend on its exact current response shape.
