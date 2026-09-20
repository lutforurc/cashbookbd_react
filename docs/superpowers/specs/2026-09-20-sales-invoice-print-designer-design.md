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
`settings.branch.paper_size`. After this change, a branch instead *designs* an
a4 template and/or a half template in the Designer (the Designer already lets
a tenant hold more than one saved layout — confirm against current
`print_templates` save/load keying during planning); which one is used at
print time still comes from `branch.paper_size`, preserved as-is so no branch
has to redo a setting it already made.

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

### 4. API — new endpoint

`GET sales/invoice-data/{main_trx_id}`, added to `SalesController.php`
next to `apiSalesChallanData` (`routes/api.php:456`), following its exact
contract: returns `{ basic, products, installments, branch }`. The field
values are drawn from `getSalesMeta()`'s existing logic in
`ElectronicsSalesInvoicePrintBase.tsx:117-157` (customer resolution, TDS /
service charge / carrying outward by `coa4_id`, grand total) — ported
server-side rather than left client-side, matching where the challan payload
is built (`apiSalesChallanData`, not the old challan component).

### 5. Cutover

- `ElectronicsSalesInvoicePrint.tsx` stops switching between four bespoke
  components and instead — following `Orders.tsx` / `FolioScreen.tsx`
  (`src/components/modules/orders/Orders.tsx:1675`,
  `src/components/modules/hotel/booking/FolioScreen.tsx:455-478`) — fetches
  `sales/invoice-data/{id}`, loads the branch's saved `sales_invoice` layout
  (`normalizeTemplate`) or `defaultTemplate('sales_invoice')` when none is
  saved, and renders `<DocumentPrint>`. `branch.paper_size` still selects
  a4-vs-half, now by choosing which saved/default template's `pageSize` to
  request rather than which component to mount.
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

- Confirm how `print_templates` keys a saved layout today (by `docType`
  alone, or `docType` + branch) and whether a branch can hold both an a4 and
  a half `sales_invoice` layout at once, or whether `pageSize` needs to be
  part of that key. This wasn't settled in brainstorming and affects the save
  API, not just the client.
- Confirm the exact `main_trx_id` → sale lookup `apiSalesInvoiceData` should
  use (the challan endpoint's pattern should carry over, but the electronics
  sale's own id field names need checking against `ElectronicsBusinessSales.tsx`).
