/**
 * What a printed document is, written down as data instead of as a component.
 *
 * This is multi-tenant software and no two customers want the same challan.
 * Building a Blade or a React component per customer does not end -- fifty
 * tenants is fifty files, and a change to how a challan paginates has to be
 * made fifty times. So a document is described here as a list of bands, each
 * naming which fields it prints and what to call them, and ONE renderer draws
 * whatever the description says.
 *
 * Deliberately NOT a free canvas of x/y boxes. A challan's row count is not
 * known when it is designed -- three lines or forty -- so anything positioned
 * absolutely would ride over its own footer on a long one and never reach a
 * second page. Bands flow, and the renderer paginates them. Fixed positioning
 * is the right tool only for printing into the boxes of pre-printed stationery,
 * which is a separate mode and not this one.
 */

/**
 * Which paper. One renderer draws all of them; what differs is the field
 * catalogue each may draw from and the layout it starts out with.
 *
 * ⚠️ FOUR, AND THE LIST IS THE UNION OF TWO BRANCHES. Each grew this type on
 * its own -- one added the sales order, the other the hotel's two -- and
 * neither removed anything. A merge that kept one side would have deleted a
 * paper somebody is already saving layouts against, and the only symptom would
 * be "Unknown document type" on a screen that worked yesterday.
 *
 * ⚠️ `hotel_money_receipt` and `hotel_bill` are SEPARATE and must stay so. They
 * are different documents with different legal weight -- the VAT falls due on
 * the bill and not on the receipt (OPEN-12, settled 2026-08-26) -- and one type
 * serving both is how a receipt quietly acquires a tax line and becomes a VAT
 * invoice whatever the desk calls it.
 *
 * ⚠️ These strings are stored in print_templates.doc_type and are checked
 * against PrintTemplateController::DOC_TYPES. A new one needs a row in both
 * lists, and renaming one orphans every layout saved under the old name.
 */
export type DocType =
  | 'sales_challan'
  | 'sales_order'
  | 'hotel_money_receipt'
  | 'hotel_bill'
  | 'sales_invoice'
  | 'purchase_invoice'
  | 'sales_ledger'
  | 'purchase_ledger'
  | 'ledger_details'
  | 'due_list'
  | 'order_transaction';

/**
 * The papers the designer offers, in the order it offers them.
 *
 * ⚠️ Exported from here rather than written out in the designer, which is where
 * the hotel branch had put its own copy. Two lists is how a paper comes to
 * exist in the type and not in the dropdown -- or worse, the other way round.
 */
export const DOC_TYPES: { id: DocType; name: string; hint: string }[] = [
  {
    id: 'sales_challan',
    name: 'Delivery Challan',
    hint: 'What goes out with the goods.',
  },
  {
    id: 'sales_order',
    name: 'Order',
    hint: '',
  },
  {
    id: 'hotel_money_receipt',
    name: 'Hotel — Money Receipt',
    hint: '',
  },
  {
    id: 'hotel_bill',
    name: 'Hotel — Bill',
    hint: '',
  },
  {
    id: 'sales_invoice',
    name: 'Sales Invoice',
    hint: 'What the customer takes home with the goods.',
  },
  {
    id: 'purchase_invoice',
    name: 'Purchase Invoice',
    hint: 'What comes in with the goods, from the supplier.',
  },
  {
    id: 'sales_ledger',
    name: 'Sales Ledger',
    hint: 'The report: many vouchers down one sheet, each with its own lines.',
  },
  {
    id: 'purchase_ledger',
    name: 'Purchase Ledger',
    hint: 'The report: many vouchers down one sheet, each with its own lines.',
  },
  {
    id: 'ledger_details',
    name: 'Ledger Details',
    hint: 'The statement: one line per voucher, bought against sold, and a running balance.',
  },
  {
    id: 'due_list',
    name: 'Due List',
    hint: 'Who owes what as on a date, with how old the money is.',
  },
  {
    id: 'order_transaction',
    name: 'Order With Transaction',
    hint: 'One order, every voucher against it, and the balance carried down.',
  },
];

export type Align = 'left' | 'center' | 'right';

/** Where a cell's contents sit in a cell taller than they are. */
export type Valign = 'top' | 'middle' | 'bottom';

/** A label:value pair on the paper -- in the info block or among the totals. */
export type InfoItem = {
  /** Which value, by key from FIELD_CATALOG. */
  field: string;
  /** What this paper calls it. Empty keeps the catalogue's own name. */
  label?: string;
  /**
   * Leave the whole line off when the voucher has nothing for it, rather than
   * printing a label with blank beside it. Off for the fields somebody is meant
   * to fill in by hand at the gate.
   */
  hideIfEmpty?: boolean;
  /**
   * Leave the line off when it comes to the same figure as another one.
   *
   * ⚠️ For a total that only exists to show a SUBTRACTION. "Gross 3,600 / Net
   * Amount 3,600" on a bill nobody discounted says the same thing twice and
   * makes the reader look for the difference between them. With something taken
   * off, the two differ and both are worth printing.
   *
   * Compared as numbers, so 3,600 and 3,600.00 are the same figure. Only the
   * totals block honours it -- see TotalsBlock.
   */
  hideIfEqualTo?: string;
  /**
   * A rule across the line, above this one.
   *
   * ⚠️ Where a SUM happens, which is how a bill is read: the tax lines are
   * added to make the gross, the discount comes off to make the net, and what
   * was paid comes off to make what is owed. A rule over each of those three
   * says "the figures above this add up to this" without a word.
   *
   * Drawn only where the line is drawn -- a rule over a line hidden for having
   * nothing to say would be a rule under nothing.
   */
  ruleAbove?: boolean;
};

/** One column of the product table. */
export type TableColumn = {
  field: string;
  label?: string;
  /** Share of the table width, in percent. Columns are normalised at render. */
  width?: number;
  align?: Align;
  /**
   * Where the cell sits in a row taller than it is.
   *
   * ⚠️ Left out on most columns on purpose. A row is as tall as its tallest
   * cell, and one column carrying a list -- a ledger voucher's products, three
   * lines of them -- makes every other cell in that row taller than its own
   * contents. The renderer's own rule (top for a list, middle for everything
   * else) is right for a figure beside two lines and wrong for one beside six,
   * and only the tenant knows which of the two they are looking at.
   *
   * Absent means that rule; set it and the column obeys.
   */
  valign?: Valign;
  /**
   * A second value, printed UNDER the first in the same cell.
   *
   * A hotel bill wants the room on one line and what the room offers beneath
   * it: "MB / 101 Deluxe Twin — 27th to 29th", then "AC, two single beds,
   * private bath, hot water, veranda and breakfast". That is one thing said in
   * two registers, not two columns -- a column of its own would put the
   * sentence beside the price and pull the table apart.
   *
   * ⚠️ It is a FIELD, not a fixed string. The sentence differs per row, and a
   * paper that typed it once would print the deluxe twin's description against
   * the single room below it.
   *
   * Empty on a row that has nothing to say, and then the line simply is not
   * drawn -- no blank second line, no cell taller than its neighbours.
   */
  subField?: string;
  /** Draw the second line in brackets, the way a note under a name reads. */
  subInBrackets?: boolean;
  /**
   * For a COMPOSED column (product_flat / product_lines): which of the five
   * product facts it prints, IN THIS ORDER. One shop wants Group then Name,
   * the next Name then Serial then Category; a column that printed all five
   * in one fixed order for everybody would be the wrong column for most.
   *
   * Absent means all five in PRODUCT_PARTS order -- what a layout saved
   * before this existed asked for.
   */
  parts?: string[];
};

/**
 * The five facts that name a product on an invoice line, in the order a
 * column prints them until the tenant reorders: the broad thing first, the
 * serial last. Each is a line key the invoice adapters already fill.
 */
export const PRODUCT_PARTS: { key: string; name: string }[] = [
  { key: 'brand', name: 'Brand' },
  { key: 'category', name: 'Category' },
  { key: 'group', name: 'Group' },
  { key: 'product_name', name: 'Product Name' },
  { key: 'serial_no', name: 'Serial No' },
];

/** A column the renderer builds from `parts` rather than reads from one key. */
export const isComposedField = (key: string) => key === 'product_flat' || key === 'product_lines';

/** The facts a composed column prints for one row, blanks dropped. */
export const composedParts = (row: any, column: TableColumn): string[] | null => {
  if (!isComposedField(column.field)) return null;
  const keys = column.parts?.length ? column.parts : PRODUCT_PARTS.map((part) => part.key);
  return keys.map((key) => String(row?.[key] ?? '').trim()).filter(Boolean);
};

export type SignatureItem = {
  /** The line under the rule -- "Received By", "ড্রাইভারের স্বাক্ষর". */
  label: string;
  /** Printed above the rule: a name the voucher holds, by field key. */
  field?: string;
};

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

type BandBase = {
  /** Stable within a template; what drag-and-drop moves and React keys on. */
  id: string;
  type: BandType;
  show: boolean;
};

/**
 * The letterhead. It draws nothing itself -- PadPrinting already decides
 * between the branch's heading, the company's, an uploaded image and the blank
 * a pre-printed pad needs, and that decision belongs to Branch > Print Setup
 * rather than to every template that has a top.
 */
export type HeaderBand = BandBase & { type: 'header' };

export type TitleBand = BandBase & {
  type: 'title';
  text: string;
  align: Align;
  /** Multiplier on the document's own size, so one font control moves it all. */
  scale: number;
  underline: boolean;
};

export type InfoBand = BandBase & {
  type: 'info';
  columns: 1 | 2 | 3;
  /**
   * `rows` prints each field on its own labelled line -- the shape of a Bengali
   * order pad. `inline` runs them together, which is what a Delivery Challan
   * with four facts across the top wants.
   */
  layout: 'rows' | 'inline';
  /** Draw a box around each line, the way a printed pad does. */
  boxed: boolean;
  /**
   * How wide the label column stands, in `em`.
   *
   * Without it each label is as wide as its own word, so every value starts
   * wherever its label happened to end and the colons walk down the page in a
   * ragged line -- which is the first thing anybody notices about a pad that
   * was not printed by a press.
   *
   * In `em` rather than px or mm, so the column keeps its proportion to the
   * text when the document's size is changed. A width in px would hold its
   * measurement and lose its meaning: the same 90px is a roomy column at 10pt
   * and a cramped one at 16pt.
   *
   * `rows` layout only -- `inline` runs the fields together and has no column.
   */
  labelWidth: number;
  /**
   * Air above and below the text inside each row, in millimetres.
   *
   * This is what makes a row tall or short. A printed pad's rows are a fixed
   * depth chosen so a person can write in them with a pen; a challan that is
   * only read wants them tight, to fit more on the sheet.
   *
   * In millimetres because it is a distance on paper -- the same reason the
   * Blank Space band and the page margins are. The label column above is in
   * `em` instead, and the two units are not mixed carelessly: a label column
   * must keep its proportion to the text, and a row's depth must keep its
   * measurement against a ruler.
   *
   * `rows` layout only.
   */
  rowPadding: number;
  /**
   * Blank paper between one row and the next, in millimetres.
   *
   * Zero puts them flush, which for boxed rows means neighbours share an edge
   * and the block reads as one ruled table -- the look of the pad this started
   * as. Anything above zero separates them into distinct boxes, which is how a
   * pad from the press usually prints.
   *
   * `rows` layout only.
   */
  rowGap: number;
  items: InfoItem[];
};

export type TableBand = BandBase & {
  type: 'table';
  columns: TableColumn[];
  bordered: boolean;
  /** Repeat the column headings at the top of every page. */
  repeatHeader: boolean;
  /**
   * Blank lines added after the last product, so a short challan still fills
   * its table and nobody can add a line to it afterwards.
   */
  fillerRows: number;
  /**
   * A ruled row under the last product, footing the columns that have a total.
   *
   * ⚠️ It foots the columns the PAPER knows a total for -- not every column of
   * numbers. A rate column added up is nonsense, and a running balance added up
   * is worse than nonsense: it counts every earlier delivery again, and six
   * deliveries owing 24,01,810 foot as 84,03,048. See the totals map in
   * DocumentPrint, which is the only thing that knows the difference.
   *
   * Where it earns its place, it replaces a block of totals standing beside the
   * table: the same figures under their own headings, in one line rather than
   * four, and each one directly beneath the column it belongs to.
   */
  totalRow: boolean;
  /** What that row is called. "Grand Total" where nothing is said. */
  totalRowLabel: string;
};

/**
 * The Installment Details table -- a sale's own repayment schedule, printed
 * on its invoice.
 *
 * ⚠️ THE THREE COLUMNS ARE FIXED -- Sl, Due Date, Amount, reading
 * `installments[].due_date`/`installments[].amount` -- and a tenant may not
 * add, remove, or retarget one to a different field, unlike TableBand's
 * columns. What a tenant DOES get, from real-print feedback: the same
 * width-share and alignment a TableColumn already carries, plus the order
 * they print in -- so "Amount" can sit first, or "Due Date" can be centred,
 * without touching code. `columns` is a `TableColumn[]` for exactly that
 * reason: it is the same shape and the same width/align/reorder editor
 * TableBand already has, restricted to these three fields rather than a new
 * mechanism of its own.
 */
export type InstallmentBand = BandBase & {
  type: 'installments';
  /** "Installment Details" by default -- renameable like every other title. */
  title: string;
  bordered: boolean;
  /** Always exactly {field: 'sl'|'due_date'|'amount'}, in whatever order and
   *  width/align a tenant has set. See DEFAULT_INSTALLMENT_COLUMNS. */
  columns: TableColumn[];
  /**
   * Share of the page's printable width the WHOLE block stands, in percent --
   * 100 is edge to edge (within the page's own margins), a smaller share
   * leaves the rest of the row blank to its right. Left-aligned rather than
   * offering a side to dock it against: every existing use of this band
   * prints it before the totals and the signature, where the paper still
   * reads left to right, and a lone alignment control for a block nothing
   * else stands beside would be a knob with only one sensible position.
   */
  width: number;
};

export type TotalsBand = BandBase & {
  type: 'totals';
  align: Align;
  /**
   * `rows` stacks each total on its own labelled line -- the column of figures
   * a bill ends with, and what this band has always drawn.
   *
   * `inline` runs them across one line instead. An order sheet's four totals
   * take four lines and most of a hand's width of paper to say what fits on
   * one, and on a sheet that already runs to a second page for six deliveries
   * those lines are the difference.
   *
   * ⚠️ Not a global change to how totals draw. A hotel bill's column -- charges,
   * service, VAT, grand total, paid, due -- is read DOWNWARDS, each figure
   * against the one above it, and run together on one line it stops being a
   * reckoning and becomes a sentence. So it is the band that chooses, and the
   * default is what every existing paper already has.
   */
  layout: 'rows' | 'inline';
  items: InfoItem[];
};

export type NotesBand = BandBase & {
  type: 'notes';
  text: string;
  align: Align;
  boxed: boolean;
};

export type SignatureBand = BandBase & {
  type: 'signature';
  items: SignatureItem[];
  /** How much air above the rules -- room for an actual signature. */
  space: number;
};

/**
 * Blank paper, on purpose.
 *
 * Nothing else on a template can leave a measured gap: every other band is as
 * tall as what is in it. That is wrong for the two things people actually ask
 * for -- room under the last line for a rubber stamp, and a push down the page
 * so the printed part lands under the letterhead of stationery that came from
 * the press. Both are "leave exactly this much paper here", which is what this
 * is, and a template may carry as many as it needs.
 *
 * Measured in millimetres rather than pixels. This is a distance on paper, and
 * it must not change when somebody changes the document's text size -- which is
 * exactly what a gap stated in ems or in lines would do.
 */
export type SpacerBand = BandBase & {
  type: 'spacer';
  /** Millimetres of blank paper. */
  height: number;
  /** Draw a faint rule through it -- a fold line, or a tear-off. */
  rule: boolean;
};

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

export type PrintTemplate = {
  /** Bumped when the shape changes; normalise() migrates anything older. */
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
  /**
   * Product lines per printed page. 0 keeps the whole document on one page,
   * which is what a challan of half a dozen lines wants.
   */
  rowsPerPage: number;
  /**
   * Millimetres of blank paper down the left and right edges.
   *
   * Measured from the edge of the sheet, not added to something else, so the
   * number a tenant types is the number they can hold a ruler against.
   *
   * They default to what every report in the app already prints at -- see
   * MARGIN_LEFT/MARGIN_RIGHT -- so a template saved before these existed comes
   * out of the printer exactly as it did. The left is the wider of the two
   * because the left edge is the one that gets punched and filed.
   *
   * Left and right only. The top and the bottom are the shared print
   * stylesheet's business: the foot is pinned a measured distance above the
   * paper edge for every report in the app together, and a template that could
   * move its own would be a report filed beside the others with its foot in a
   * different place. Room at the top of a particular challan is what a Blank
   * Space band is for.
   */
  marginLeft: number;
  marginRight: number;
  /** The app's standard foot -- software name, print time, page count. */
  showFooter: boolean;
  bands: Band[];
};

/**
 * What the shared print stylesheet already puts down each edge, in millimetres.
 *
 * PrintStyles gives every page an 10mm/8mm `@page` margin and then 8mm of
 * padding inside it. These are those two added up, which is the distance ink
 * actually starts from the edge of the paper today -- and therefore the only
 * defaults that leave existing challans unchanged.
 */
export const MARGIN_LEFT = 18;
export const MARGIN_RIGHT = 16;

/* ------------------------------------------------------------------ */
/* The field catalogue                                                 */
/* ------------------------------------------------------------------ */

export type FieldGroup =
  | 'party'
  | 'voucher'
  | 'transport'
  | 'product'
  | 'total'
  | 'manual'
  | 'line'
  /** The order's own terms -- what was agreed, and for how long. */
  | 'order'
  // The hotel's own. Kept apart from 'party' and 'voucher' rather than folded
  // in, because the picker is read by somebody looking for one thing: a desk
  // clerk hunting the guest's NID looks under Guest, not under Party.
  | 'guest'
  | 'stay'
  | 'bill'
  | 'receipt'
  | 'folio';

export type FieldDef = {
  key: string;
  /** What it is called before a tenant renames it. */
  name: string;
  group: FieldGroup;
  /** Right-aligned by default in a table, and summed in the totals band. */
  numeric?: boolean;
  /**
   * How the renderer prints it, where nothing in DocumentPrint's own switch
   * claims the key.
   *
   * Declared here rather than as another `case` because the switch was written
   * for one document and now serves three: a fourth would add twenty more
   * cases, and the twenty-first would be forgotten. The sales challan's fields
   * are untouched -- their cases still run first and behave exactly as they
   * always did.
   *
   *   money    a figure with thousand separators
   *   date     DD/MM/YYYY, the way the desk reads a date
   *   words    the figure at `from`, spelled out
   *   percent  a rate as somebody says it -- "15%", "7.5%"
   */
  format?: 'money' | 'date' | 'words' | 'percent';
  /** For `format: 'words'` -- which key holds the figure to spell. */
  from?: string;
};

export const FIELD_GROUP_NAMES: Record<FieldGroup, string> = {
  party: 'Party',
  voucher: 'Voucher',
  transport: 'Transport',
  product: 'Products (as one line)',
  total: 'Totals',
  manual: 'Filled in by hand',
  line: 'Product line',
  order: 'Order terms',
  guest: 'Guest',
  stay: 'The stay',
  bill: 'Bill totals',
  receipt: 'This receipt',
  folio: 'Bill line',
};

/**
 * Every value a sales challan can print, and nothing else.
 *
 * The keys are the keys the challan-data endpoint answers with, so a template
 * naming a field the server does not send prints blank rather than breaking --
 * which is what should happen on a server whose database is a patch behind.
 */
export const FIELD_CATALOG: FieldDef[] = [
  // Who it goes to
  { key: 'party_name', name: 'Party Name', group: 'party' },
  { key: 'bangla_name', name: 'Party Name (Bangla)', group: 'party' },
  { key: 'idfr_code', name: 'Party Code', group: 'party' },
  { key: 'manual_address', name: 'Address', group: 'party' },
  { key: 'areas', name: 'Area', group: 'party' },
  { key: 'area_bangla', name: 'Area (Bangla)', group: 'party' },
  { key: 'somity_id', name: 'Somity No', group: 'party' },
  { key: 'mobile', name: 'Party Mobile', group: 'party' },
  // "হিসাব হবে" / "A/C-...". Not the customer -- the account the consignment is
  // charged against, which on a commission agent's challan is routinely a third
  // name. Filled at the gate by the challan dialog.
  { key: 'acc_name', name: 'Account (A/C)', group: 'party' },

  // Which paper this is
  { key: 'vr_no', name: 'Invoice No', group: 'voucher' },
  { key: 'vr_date', name: 'Invoice Date', group: 'voucher' },
  { key: 'order_no', name: 'Order / PO No', group: 'voucher' },
  { key: 'created_by', name: 'Sales By', group: 'voucher' },
  /**
   * Whoever is printing, from the session -- not from the voucher.
   *
   * ⚠️ A DIFFERENT FACT FROM `created_by`, and both are worth having. The
   * voucher's creator prepared it; the person at the printer is the one whose
   * signature goes under the rule on THIS copy. A manager reprinting a clerk's
   * order signs their own name to it, and the clerk's name stays available for
   * a paper that wants to say who wrote the order in the first place.
   */
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  { key: 'branch_name', name: 'Branch', group: 'voucher' },
  { key: 'branch_address', name: 'Branch Address', group: 'voucher' },
  { key: 'notes', name: 'Notes', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },

  // Who carried it
  { key: 'vehicle_no', name: 'Vehicle No', group: 'transport' },
  { key: 'driver_name', name: 'Driver Name', group: 'transport' },
  { key: 'driver_mobile', name: 'Driver Mobile', group: 'transport' },
  // "মোট ভাড়া". What the lorry is paid to carry it, agreed at the gate after
  // the invoice was raised -- so it is a figure on the challan, not a posting,
  // and nothing in the accounts reads it.
  { key: 'truck_fare', name: 'Truck Fare', group: 'transport', numeric: true },

  // The goods, written as one line each instead of as a table.
  //
  // A printed order pad does not have a product table -- it has "দ্রব্যের নাম :"
  // with a rule beside it, the way a pad from the press does. These are the
  // same product lines the table would draw, run together into a single value
  // so they can sit on such a line. A challan of one product reads as one name;
  // a challan of three reads as three, separated by commas, rather than
  // silently printing only the first.
  { key: 'product_names', name: 'Product Name(s)', group: 'product' },
  { key: 'product_categories', name: 'Category(s)', group: 'product' },
  { key: 'product_qty_list', name: 'Quantity with Unit', group: 'product' },
  { key: 'product_bag_list', name: 'Bag(s)', group: 'product' },
  { key: 'product_serials', name: 'Serial No(s)', group: 'product' },

  // A label with nothing beside it but a rule.
  //
  // Every pad has lines the software cannot fill -- the fare agreed at the
  // gate, the advance handed over, what is still owed. They are not in the
  // books and printing nothing against them is right; what the paper needs is
  // the label and somewhere to write. Add as many as the pad has, and name
  // each one on the row.
  { key: 'blank', name: 'Blank line', group: 'manual' },

  // What it adds up to
  { key: 'total_qty', name: 'Total Quantity', group: 'total', numeric: true },
  { key: 'total_bag', name: 'Total Bag', group: 'total', numeric: true },
  { key: 'total_amount', name: 'Total Amount', group: 'total', numeric: true },
  { key: 'line_count', name: 'Number of Items', group: 'total', numeric: true },
  { key: 'amount_words', name: 'Amount In Words', group: 'total' },
];

/**
 * Every value a sales order can print.
 *
 * The keys are the ones normalizeOrderPrintPayload() in Orders.tsx settles on,
 * so a template naming one the server did not send prints blank rather than
 * breaking -- the same contract the challan catalogue keeps.
 *
 * Party fields keep the order's own names rather than the challan's. An order
 * is raised against `order_for`, not `party_name`, and inventing an alias so
 * the two catalogues could share a key would put a second name on one thing --
 * which is how a field ends up filled on one paper and blank on the other.
 */
export const ORDER_FIELD_CATALOG: FieldDef[] = [
  // Who it is for
  { key: 'order_for', name: 'Customer Name', group: 'party' },
  { key: 'address', name: 'Address', group: 'party' },
  { key: 'mobile', name: 'Mobile', group: 'party' },

  /* ⚠️ The three below are WORDS, not figures, and they are what lets one saved
     layout serve both kinds of order. ONE screen prints purchase orders and
     sales orders off the same template, so any heading fixed at "Sales" or
     "Customer" is wrong on half of them -- which is exactly what a purchase
     order headed "Sales Details" over a supplier's name was.

     They are worth more in a heading than in a value: a title, a label or a
     column heading naming one in braces -- "{order_type_label} Details",
     "{party_label}" -- gets this order's own word in its place. See caption()
     in DocumentPrint. Offered here as fields too, so the designer's own list
     tells a tenant the words exist. */
  { key: 'order_type_label', name: 'Purchase / Sales', group: 'party' },
  { key: 'party_label', name: 'Word for the party (Customer / Supplier)', group: 'party' },
  { key: 'received_label', name: 'Word for money in (Received / Payment)', group: 'party' },

  // Which paper this is
  { key: 'order_number', name: 'Order No', group: 'voucher' },
  { key: 'order_date', name: 'Order Date', group: 'voucher' },
  { key: 'branch_name', name: 'Branch', group: 'voucher' },
  { key: 'branch_address', name: 'Branch Address', group: 'voucher' },
  { key: 'notes', name: 'Notes', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },
  // ⚠️ The order paper keeps its OWN catalogue, so a field added to the challan's
  // never reaches it -- which is how its signature line came to offer no way of
  // naming anybody. Who is at the printer belongs on every paper that is signed.
  // Both facts, and see the note beside printed_by in FIELD_CATALOG for why:
  // the creator raised the order, the person at the printer signs this copy.
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  { key: 'created_by', name: 'Prepared By (voucher)', group: 'voucher' },

  // What was agreed
  { key: 'product_name', name: 'Product Name', group: 'order' },
  { key: 'order_rate', name: 'Order Rate', group: 'order', numeric: true },
  { key: 'total_order', name: 'Order Quantity', group: 'order', numeric: true },
  { key: 'order_amount', name: 'Order Amount', group: 'order', numeric: true },
  { key: 'unit', name: 'Unit', group: 'order' },
  // The window the order runs for, already written as one string by the payload
  // -- "19/08/2026 to 20/08/2026" -- because that is how the desk says it.
  { key: 'duration', name: 'Duration', group: 'order' },
  { key: 'last_delivery_date', name: 'Last Delivery Date', group: 'order' },
  { key: 'delivery_location', name: 'Delivery Location', group: 'order' },
  { key: 'contract_order_qty', name: 'Contract Quantity', group: 'order', numeric: true },
  { key: 'trx_quantity', name: 'Delivered Quantity', group: 'order', numeric: true },

  { key: 'blank', name: 'Blank line', group: 'manual' },

  // What the deliveries add up to. total_qty and total_amount are the same two
  // the challan has; the other two are the order's own, and exist because its
  // table carries money received against each delivery.
  { key: 'total_qty', name: 'Total Quantity', group: 'total', numeric: true },
  { key: 'total_amount', name: 'Total Amount', group: 'total', numeric: true },
  { key: 'total_received', name: 'Total Received', group: 'total', numeric: true },
  { key: 'total_due', name: 'Total Due', group: 'total', numeric: true },
  { key: 'line_count', name: 'Number of Deliveries', group: 'total', numeric: true },
  { key: 'amount_words', name: 'Amount In Words', group: 'total' },
];

/**
 * One delivery made against an order -- a row of the Sales Details table.
 *
 * `qty`, `price` and `amount` deliberately reuse the challan's line keys rather
 * than being called weight/rate/value. The renderer already separates thousands
 * in those three and already sums them, so borrowing the names means the order
 * table gets both for nothing; a private set of names would have meant teaching
 * the renderer the same lesson twice.
 */
export const ORDER_LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'line' },
  { key: 'vr_no', name: 'Inv. No.', group: 'line' },
  { key: 'date', name: 'Inv. Date', group: 'line' },
  { key: 'vehicle_no', name: 'Vehicle No.', group: 'line' },
  { key: 'qty', name: 'Quantity', group: 'line', numeric: true },
  { key: 'unit', name: 'Unit', group: 'line' },
  { key: 'price', name: 'Rate', group: 'line', numeric: true },
  { key: 'amount', name: 'Amount', group: 'line', numeric: true },
  { key: 'received', name: 'Received', group: 'line', numeric: true },
  // Running, not per row: what is still owed after this delivery and every one
  // above it. Worked out where the rows are built, because a renderer drawing
  // one cell cannot see the rows before it.
  { key: 'due', name: 'Due Amount', group: 'line', numeric: true },
];

/** The columns a product line can offer. `sl` is generated, not a data key. */
export const LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'line' },
  { key: 'product_name', name: 'Product Name', group: 'line' },
  { key: 'category', name: 'Category', group: 'line' },
  { key: 'description', name: 'Description', group: 'line' },
  { key: 'qty', name: 'Quantity', group: 'line', numeric: true },
  { key: 'unit', name: 'Unit', group: 'line' },
  { key: 'qty_unit', name: 'Quantity + Unit', group: 'line' },
  { key: 'bag', name: 'Bag', group: 'line', numeric: true },
  { key: 'price', name: 'Rate', group: 'line', numeric: true },
  { key: 'amount', name: 'Amount', group: 'line', numeric: true },
  { key: 'serial_no', name: 'Serial No', group: 'line' },
  { key: 'warranty_days', name: 'Warranty', group: 'line' },
];

/* ------------------------------------------------------------------ */
/* The hotel's two papers                                              */
/* ------------------------------------------------------------------ */

/**
 * Who stayed, and when. Shared by the bill and the receipt, because a receipt
 * that does not name the stay is a slip of paper nobody can file.
 *
 * The keys are the keys App\Services\Hotel\HotelPaper answers with, so a
 * template naming a field an older server does not send prints blank rather
 * than breaking.
 */
const HOTEL_STAY_FIELDS: FieldDef[] = [
  // ⚠️ The guest and the booker are different people often enough to matter --
  // a company books, a driver sleeps. Both are offered, and a property prints
  // whichever its own paper names.
  { key: 'guest_name', name: 'Guest Name', group: 'guest' },
  { key: 'guest_mobile', name: 'Guest Mobile', group: 'guest' },
  { key: 'guest_nid', name: 'Guest NID', group: 'guest' },
  { key: 'guest_address', name: 'Guest Address', group: 'guest' },
  { key: 'guest_count', name: 'Guests Checked In', group: 'guest', numeric: true },
  { key: 'booker_name', name: 'Booked By', group: 'guest' },
  { key: 'booker_mobile', name: 'Booked By (Mobile)', group: 'guest' },
  // Whose name the bill is in: a name typed on the folio (§40 -- the guest's
  // employer, for a bill they will be reimbursed on) first, else the party the
  // bill was carried to or booked against. Empty when it is the guest's own.
  { key: 'billed_to', name: 'Billed To', group: 'guest' },
  // Who PAYS -- the party the bill is carried on or booked against -- on a
  // line of its own, because a bill made out to one company and owed by
  // another says two names. Empty where no party holds it.
  { key: 'bill_owed_by', name: 'On Account Of', group: 'guest' },

  { key: 'booking_no', name: 'Booking No', group: 'stay' },
  { key: 'booking_date', name: 'Booking Date', group: 'stay', format: 'date' },
  { key: 'booking_type', name: 'Booking Type', group: 'stay' },
  { key: 'booking_status', name: 'Status', group: 'stay' },
  { key: 'check_in_date', name: 'Check-in Date', group: 'stay', format: 'date' },
  { key: 'check_out_date', name: 'Check-out Date', group: 'stay', format: 'date' },
  // ⚠️ Nights, not days. Monday to Tuesday is ONE night and one night's rent,
  // and those two numbers being different is the commonest argument at a counter.
  { key: 'nights', name: 'Nights', group: 'stay', numeric: true },
  { key: 'room_list', name: 'Room(s)', group: 'stay' },
  { key: 'room_count', name: 'Number of Rooms', group: 'stay', numeric: true },
  { key: 'stated_adults', name: 'Adults (booked)', group: 'stay', numeric: true },
  { key: 'stated_children', name: 'Children (booked)', group: 'stay', numeric: true },

  { key: 'branch_name', name: 'Property', group: 'voucher' },
  { key: 'branch_address', name: 'Property Address', group: 'voucher' },
  { key: 'notes', name: 'Notes', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },
  // For the accountant's copy -- the ledger entry this paper corresponds to.
  { key: 'voucher_no', name: 'Voucher No', group: 'voucher' },
  { key: 'blank', name: 'Blank line', group: 'manual' },
];

/**
 * The bill.
 *
 * ⚠️ `total_amount` and `amount_words` from the sales catalogue are DELIBERATELY
 * ABSENT. The renderer works those out by adding the line amounts up, which is
 * the EXACT figure -- and §6.3 rounds the bill ONCE on the whole total, so what
 * the guest is asked for is `bill_rounded`. Offering both would let a tenant put
 * a figure on the paper that disagrees with the till by up to fifty poisha, and
 * they would not find out until somebody counted the drawer.
 */
export const HOTEL_BILL_FIELDS: FieldDef[] = [
  // Who is at the printer. See the note beside it in FIELD_CATALOG.
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  // ⚠️ THE DAY THE BILL IS MADE, which is neither the day the stay was booked
  // (`booking_date`) nor either end of the stay. A property that shows Booking
  // Date on its paper needs this beside it, or the reader takes one date for
  // the other -- and it is this one the guest's accountant files the paper by.
  //
  // Read off the printer's clock, like `printed_at` below it, because nothing
  // on the folio stores a bill date: the bill is made when it is printed, which
  // at a counter is the moment of check-out. A REPRINT therefore carries the
  // day it was reprinted -- honest, and the same as the Print Time line every
  // paper already has. A fixed date would mean storing one, which is a column,
  // a migration and a decision about which moment to store; say the word if a
  // reprinted bill must keep its original date.
  { key: 'bill_date', name: 'Bill Date', group: 'bill', format: 'date' },
  ...HOTEL_STAY_FIELDS,

  { key: 'bill_base', name: 'Room & Charges', group: 'bill', numeric: true, format: 'money' },
  // ⚠️ WHAT CAME OFF, and it comes off the GROSS -- after the service charge
  // and the VAT, which are both worked out on the room and charges. A guest
  // handed a bill for less than the tariff has to be able to see the
  // subtraction; a bill that quietly shows smaller rents cannot be checked
  // against the rate card.
  { key: 'bill_discount', name: 'Discount', group: 'bill', numeric: true, format: 'money' },
  // Gross less discount, before the single rounding. `bill_rounded` is what is
  // actually asked for.
  { key: 'bill_net', name: 'Net (before rounding)', group: 'bill', numeric: true, format: 'money' },
  { key: 'bill_service_charge', name: 'Service Charge', group: 'bill', numeric: true, format: 'money' },
  // ⚠️ On the BILL this is right and required -- the tax falls due here.
  { key: 'bill_vat', name: 'VAT', group: 'bill', numeric: true, format: 'money' },
  // ⚠️ RATE BY RATE, as a sentence: "15% on 3,000.00 = 450.00; 5% on 800.00 =
  // 40.00". One bill carries several rates -- an air-conditioned room at 15%,
  // dinner at 5% -- and a single VAT figure cannot be checked by the guest's
  // accountant or by an officer. Empty on a bill with one rate, where the line
  // above already says it.
  { key: 'bill_vat_summary', name: 'VAT By Rate', group: 'bill' },
  { key: 'bill_gross', name: 'Total (exact)', group: 'bill', numeric: true, format: 'money' },
  { key: 'bill_rounding', name: 'Rounding', group: 'bill', numeric: true, format: 'money' },
  // What is actually asked for at the counter.
  { key: 'bill_rounded', name: 'Grand Total', group: 'bill', numeric: true, format: 'money' },
  { key: 'bill_words', name: 'Grand Total In Words', group: 'bill', format: 'words', from: 'bill_rounded' },
  { key: 'bill_paid', name: 'Paid', group: 'bill', numeric: true, format: 'money' },
  // Negative means the hotel is holding money over the bill, which is the
  // ordinary state of a booking with an advance and no nights billed yet.
  { key: 'bill_due', name: 'Balance Due', group: 'bill', numeric: true, format: 'money' },
  { key: 'line_count', name: 'Number of Lines', group: 'bill', numeric: true },
];

/** One line of the bill. */
export const HOTEL_BILL_LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'folio' },
  { key: 'description', name: 'Description', group: 'folio' },
  // The same line with the room's type in it. Offered beside the plain one so
  // that a paper already laid out goes on printing exactly what it printed
  // yesterday.
  { key: 'description_with_type', name: 'Description & Type', group: 'folio' },
  { key: 'charge_type', name: 'Charge Type', group: 'folio' },
  // The word the desk picked the charge by -- "Ticket", "Set Menu" -- rather
  // than the code behind it.
  { key: 'charge_type_name', name: 'Charge Name', group: 'folio' },
  // ⚠️ The second line of the description cell, whatever the row is: the
  // type's sentence, in brackets, under a room; the what-for, plain, under a
  // charge. The server writes the brackets, because only the row knows which
  // of the two it is -- so a column showing this must not add its own.
  { key: 'line_detail', name: 'Beneath the Name', group: 'folio' },
  // ⚠️ A row is one room over a RUN of nights, so its date is a FROM and a TO.
  // They are equal on a single night, and the description already reads as a
  // range -- these are for a property whose own paper wants them in columns.
  { key: 'stay_date', name: 'Date', group: 'folio', format: 'date' },
  { key: 'stay_date_to', name: 'Date To', group: 'folio', format: 'date' },
  { key: 'room', name: 'Room', group: 'folio' },
  // The room and what it is let as, in one phrase -- "MB / 101 Deluxe Twin".
  { key: 'room_with_type', name: 'Room & Type', group: 'folio' },
  { key: 'room_type', name: 'Room Type', group: 'folio' },
  // ⚠️ The TYPE's description, which is where a sentence true of every Deluxe
  // Twin belongs -- written once on the Room Types screen rather than onto
  // forty-four rooms, where the one with the typo prints it on a guest's bill.
  { key: 'room_type_description', name: 'Room Type Description', group: 'folio' },
  // ⚠️ WHAT THE ROOM IS, not what the line is. A bill naming "Deluxe 302" and
  // nothing else leaves the guest's own accountant with no record of what was
  // paid for. Offered rather than printed: neither is in any shipped layout, so
  // a paper that does not ask for them comes out exactly as it always did.
  //
  // ⚠️ And both read as the room stands TODAY, not as it stood on the night --
  // nothing here is stored against the folio. That is the honest answer for a
  // description and would be the wrong one for a rate, which is why rates are
  // read back from what was stored and these are not.
  { key: 'room_facilities', name: 'Room Facilities', group: 'folio' },
  { key: 'room_description', name: 'Room Description', group: 'folio' },
  { key: 'quantity', name: 'Quantity', group: 'folio', numeric: true },
  { key: 'unit_rate', name: 'Rate', group: 'folio', numeric: true, format: 'money' },
  { key: 'base_amount', name: 'Amount', group: 'folio', numeric: true, format: 'money' },
  { key: 'service_charge_rate', name: 'Service %', group: 'folio', numeric: true, format: 'percent' },
  { key: 'service_charge_amount', name: 'Service Charge', group: 'folio', numeric: true, format: 'money' },
  // ⚠️ THE RATE, NOT THE MONEY, is what a line is best at saying. One bill
  // carries several -- 15% on an air-conditioned room, 7.5% on a fan one, 5% on
  // dinner -- and the guest's question is which rate applied to what. The money
  // is grouped by rate in the footing, where it can be divided back out and
  // checked; per line it never would be, because the VAT falls on the service
  // charge as well and 393.75 is not 15% of 2,500.
  { key: 'vat_rate', name: 'VAT %', group: 'folio', numeric: true, format: 'percent' },
  { key: 'vat_amount', name: 'VAT', group: 'folio', numeric: true, format: 'money' },
  { key: 'line_total', name: 'Line Total', group: 'folio', numeric: true, format: 'money' },
];

/**
 * The money receipt.
 *
 * ⚠️ NOT ONE TAX FIELD IN THE LIST, and that is the point of it being its own
 * catalogue. OPEN-12, settled 2026-08-26: VAT falls due when the BILL is made.
 * A receipt showing a VAT line becomes a VAT invoice whatever the desk calls
 * it, and the tax then falls due on money taken for a stay that has not
 * happened.
 *
 * Enforced by absence rather than by a warning: the fields are not offered in
 * the designer, and the server does not send them either. A note in a manual
 * would be obeyed for a year and then not.
 */
export const HOTEL_RECEIPT_FIELDS: FieldDef[] = [
  // Who is at the printer. See the note beside it in FIELD_CATALOG.
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  ...HOTEL_STAY_FIELDS,

  { key: 'payment_no', name: 'Receipt No', group: 'receipt' },
  { key: 'payment_date', name: 'Receipt Date', group: 'receipt', format: 'date' },
  { key: 'receipt_amount', name: 'Amount', group: 'receipt', numeric: true, format: 'money' },
  { key: 'receipt_words', name: 'Amount In Words', group: 'receipt', format: 'words', from: 'receipt_amount' },
  // ⚠️ "Received" or "Refund". A refund is stored positive, so without this
  // word on the paper the two receipts are indistinguishable.
  { key: 'receipt_kind', name: 'Received / Refund', group: 'receipt' },
  { key: 'purpose', name: 'Purpose', group: 'receipt' },
  { key: 'method', name: 'Paid By', group: 'receipt' },
  { key: 'reference', name: 'Cheque / Txn No', group: 'receipt' },
  { key: 'payment_notes', name: 'Remarks', group: 'receipt' },
  // The guest's running position, which is what they usually ask about next.
  { key: 'advance_held', name: 'Total Held To Date', group: 'receipt', numeric: true, format: 'money' },
];

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
  { key: 'group', name: 'Group', group: 'line' },
  // Any of brand, category, group, name and serial as ONE cell, two ways: run
  // together on a line, or one under the other. Which of the five is the
  // column's own `parts` -- see PRODUCT_PARTS and composedParts().
  { key: 'product_flat', name: 'Product — one line (pick the parts)', group: 'line' },
  { key: 'product_lines', name: 'Product — stacked (pick the parts)', group: 'line' },
  { key: 'description', name: 'Description', group: 'line' },
  { key: 'serial_no', name: 'Serial No', group: 'line' },
  // The second line under the product name -- see TableColumn.subField.
  // "X day" the way the old component's getWarrantyInfo() read it.
  { key: 'warranty', name: 'Warranty', group: 'line' },
  { key: 'qty', name: 'Quantity', group: 'line', numeric: true },
  { key: 'price', name: 'Rate', group: 'line', numeric: true, format: 'money' },
  { key: 'amount', name: 'Amount', group: 'line', numeric: true, format: 'money' },
];

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
  { key: 'group', name: 'Group', group: 'line' },
  { key: 'product_flat', name: 'Product — one line (pick the parts)', group: 'line' },
  { key: 'product_lines', name: 'Product — stacked (pick the parts)', group: 'line' },
  { key: 'description', name: 'Description', group: 'line' },
  { key: 'serial_no', name: 'Serial No', group: 'line' },
  { key: 'warranty', name: 'Warranty', group: 'line' },
  { key: 'qty', name: 'Quantity', group: 'line', numeric: true },
  { key: 'price', name: 'Rate', group: 'line', numeric: true, format: 'money' },
  { key: 'amount', name: 'Amount', group: 'line', numeric: true, format: 'money' },
];

/* ------------------------------------------------------------------ */
/* The two ledgers                                                     */
/* ------------------------------------------------------------------ */

/**
 * The two facts a ledger knows that no voucher does.
 *
 * Deliberately short. A ledger's info block is a report heading -- which
 * period, which account, which product -- and everything else on it (the
 * branch, who is printing, a blank line) is already in the challan's own
 * catalogue, which `fieldsFor` hands over whole. Writing those out again here
 * would be a second definition of `branch_name` to keep in step with the
 * first, and this file's flat by-key maps resolve to whichever came last.
 */
export const LEDGER_INFO_FIELDS: FieldDef[] = [
  { key: 'report_range', name: 'Report Date', group: 'voucher' },
  { key: 'ledger_account', name: 'Account', group: 'party' },
  { key: 'ledger_product', name: 'Product', group: 'product' },
  { key: 'total_discount', name: 'Total Discount', group: 'total', numeric: true },
  { key: 'total_received', name: 'Total Received', group: 'total', numeric: true },
  { key: 'total_balance', name: 'Total Balance', group: 'total', numeric: true },
];

/**
 * A ledger row: one voucher, with its own product lines inside its cells.
 *
 * ⚠️ The `*_lines` fields are ARRAYS of ready-made strings, not numbers. Today's
 * ledger paper prints a voucher as a block -- the party, then a product per
 * line, then that product's quantity under it, its rate under that -- and a
 * table cell holding one value cannot say that. They are the same lines the
 * bespoke print draws, handed over as lines rather than flattened, and
 * DocumentPrint draws each on its own row. Kept out of the numeric columns on
 * purpose: nobody wants a column of product names footed.
 *
 * ⚠️ The flat `qty`/`amount`/`discount`/`received`/`balance` beside them are the
 * row's own figures -- what the screen's columns show -- and they are what the
 * Grand Total row adds up. `balance`, never `due`: DocumentPrint computes a
 * `total_due` as amount less received, which is the right footing for a running
 * order balance and the wrong one for a ledger, where a discount comes off as
 * well. `total_balance` is a plain sum of this column.
 */
export const LEDGER_LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'line' },
  { key: 'challan_no', name: 'Challan / Invoice No', group: 'line' },
  { key: 'challan_date', name: 'Date', group: 'line' },
  { key: 'coa_name', name: 'Account', group: 'line' },
  { key: 'product_lines', name: 'Product & Details', group: 'line' },
  { key: 'qty_lines', name: 'Quantity (one per line)', group: 'line' },
  { key: 'rate_lines', name: 'Rate (one per line)', group: 'line' },
  { key: 'amount_lines', name: 'Amount (one per line)', group: 'line' },
  { key: 'notes', name: 'Notes', group: 'line' },
  { key: 'qty', name: 'Quantity', group: 'line', numeric: true },
  { key: 'amount', name: 'Amount', group: 'line', numeric: true, format: 'money' },
  { key: 'discount', name: 'Discount', group: 'line', numeric: true },
  { key: 'received', name: 'Received', group: 'line', numeric: true },
  { key: 'balance', name: 'Balance', group: 'line', numeric: true },
];

/**
 * Ledger Details -- the customer/supplier statement.
 *
 * Held apart from the two ledgers above rather than folded in with them: those
 * print a voucher's PRODUCTS, and this one prints the voucher itself -- what
 * was bought against what was sold, debit against credit, and the balance
 * carried down. The two have no field in common but Sl and the date.
 *
 * ⚠️ THERE IS NO `total_amount`, `total_qty`, `total_bag` OR `total_due` HERE,
 * and this catalogue is therefore NOT built on top of FIELD_CATALOG the way the
 * ledgers' is. Those four resolve, they resolve to nought, and they resolve to
 * nought silently: this report's rows carry no `qty`, no `amount` and no
 * `received`, so a total the catalogue offered would print 0 across a
 * statement somebody is reconciling against. What is offered below is what
 * this adapter actually fills, and nothing else.
 */
export const LEDGER_DETAILS_INFO_FIELDS: FieldDef[] = [
  // Who the statement is for.
  { key: 'party_name', name: 'Party Name', group: 'party' },
  { key: 'mobile', name: 'Party Mobile', group: 'party' },
  { key: 'manual_address', name: 'Address', group: 'party' },
  { key: 'ledger_page', name: 'Ledger Page', group: 'party' },

  // What it was filtered to. `ledger_product` is the same key the two ledgers
  // above use and means the same thing on all three -- the product a report was
  // narrowed to -- so a tenant who knows one knows the other. `report_trx_type`
  // is this paper's own: an account statement is routinely pulled for sales
  // only or purchases only, and the paper has to say which.
  { key: 'ledger_product', name: 'Product', group: 'product' },
  { key: 'report_trx_type', name: 'Transaction Type', group: 'voucher' },
  { key: 'report_range', name: 'Report Date', group: 'voucher' },

  /**
   * The two ends of the statement, and NOT totals.
   *
   * ⚠️ Neither is a sum of the column above it. Opening is what the account
   * stood at before the first row and closing is where the running balance
   * finished -- the server's own figures, handed over in `basic`, which is why
   * they carry a format and no `total_` prefix. A totals band reads a
   * `total_`-prefixed key off the table; these two it reads off the voucher,
   * and they print the same on page one as on page nine.
   */
  { key: 'opening_balance', name: 'Opening Balance', group: 'total', numeric: true, format: 'money' },
  { key: 'closing_balance', name: 'Closing Balance', group: 'total', numeric: true, format: 'money' },

  // What the table comes to. Plain sums of the columns of the same name, read
  // by the Grand Total row and by a totals band alike.
  { key: 'total_pur_qty', name: 'Total Purchase Quantity', group: 'total', numeric: true },
  { key: 'total_sal_qty', name: 'Total Sales Quantity', group: 'total', numeric: true },
  { key: 'total_pur_total', name: 'Total Purchase Value', group: 'total', numeric: true },
  { key: 'total_sal_total', name: 'Total Sales Value', group: 'total', numeric: true },
  { key: 'total_debit', name: 'Total Debit', group: 'total', numeric: true },
  { key: 'total_credit', name: 'Total Credit', group: 'total', numeric: true },

  // The same handful of generic keys every catalogue carries, worded as the
  // challan words them: one answer in the flat maps is the point of them.
  { key: 'branch_name', name: 'Branch', group: 'voucher' },
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },
  { key: 'blank', name: 'Blank line', group: 'manual' },
];

/**
 * A statement row: one voucher, and the two sides of it.
 *
 * ⚠️ `running_balance`, NEVER `balance`. DocumentPrint's totals map holds a
 * `total_balance` -- a plain sum of a column called `balance`, added for the two
 * ledgers, where a balance is what a voucher left owing. Here the balance is
 * carried DOWN the page: adding the column up counts every earlier row again
 * and foots the statement at a figure nothing on it says. Naming it
 * `running_balance` leaves the column out of that map, so the Grand Total row
 * draws no figure under it -- which is the honest answer for a running column.
 *
 * ⚠️ `vehicle_no` is the challan's key, reused, because it is the same fact and
 * DocumentPrint already formats it the way a plate is written. This report's
 * own word for it is Truck, and the column's label says so.
 *
 * ⚠️ `voucher_no` AND `description_flat` ARE NEW KEYS RATHER THAN THE OBVIOUS
 * ONES. A statement row is a voucher of any of half a dozen kinds, and calling
 * its number `vr_no` would have put this paper's wording on the challan's
 * column of the same name -- the flat maps answer by key alone, last catalogue
 * in wins, and a rename nobody asked for is still a rename. `sl` and
 * `vehicle_no` are shared because their wording IS the shared one.
 */
export const LEDGER_DETAILS_LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'line' },
  { key: 'voucher_no', name: 'Voucher No', group: 'line' },
  { key: 'voucher_date', name: 'Voucher Date', group: 'line' },
  { key: 'description_lines', name: 'Description', group: 'line' },
  { key: 'description_flat', name: 'Description (one line)', group: 'line' },
  { key: 'vehicle_no', name: 'Vehicle No.', group: 'line' },
  { key: 'pur_qty', name: 'Purchase Quantity', group: 'line', numeric: true },
  { key: 'sal_qty', name: 'Sales Quantity', group: 'line', numeric: true },
  { key: 'rate', name: 'Rate', group: 'line', numeric: true },
  { key: 'pur_total', name: 'Purchase Value', group: 'line', numeric: true },
  { key: 'sal_total', name: 'Sales Value', group: 'line', numeric: true },
  { key: 'debit', name: 'Debit', group: 'line', numeric: true },
  { key: 'credit', name: 'Credit', group: 'line', numeric: true },
  { key: 'running_balance', name: 'Balance', group: 'line', numeric: true },
];

/**
 * The Due List: who owes what as on a date.
 *
 * Its own catalogue for the reason Ledger Details has one -- its rows carry no
 * qty, amount or received, and a total the challan's catalogue offered would
 * print a silent nought. What is here is what dueListDocumentData fills.
 */
export const DUE_LIST_INFO_FIELDS: FieldDef[] = [
  { key: 'as_on_date', name: 'As On', group: 'voucher' },
  // The rule behind the four buckets, said on the paper: a receipt here never
  // names the bill it settles, so the oldest open debt is taken as the one
  // paid. The page outlives the screen, and its reader has to know that.
  { key: 'ageing_rule', name: 'Ageing Rule', group: 'voucher' },
  { key: 'party_count', name: 'Number of Parties', group: 'total', numeric: true },

  { key: 'total_debit', name: 'Total Debit', group: 'total', numeric: true },
  { key: 'total_credit', name: 'Total Credit', group: 'total', numeric: true },
  { key: 'total_age_0_30', name: 'Total 0-30 days', group: 'total', numeric: true },
  { key: 'total_age_31_60', name: 'Total 31-60 days', group: 'total', numeric: true },
  { key: 'total_age_61_90', name: 'Total 61-90 days', group: 'total', numeric: true },
  { key: 'total_age_90_plus', name: 'Total 90+ days', group: 'total', numeric: true },

  { key: 'branch_name', name: 'Branch', group: 'voucher' },
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },
  { key: 'blank', name: 'Blank line', group: 'manual' },
];

/**
 * A due list row: one party, its balance, and the age of that balance.
 *
 * `party_lines` is the name over the mobile over the address -- what the
 * bespoke paper prints when the branch's due_list_with_address is on -- and
 * `last_paid_lines` the date over its age; the scalar twins beside them are
 * for a tenant who wants one of the facts in a column of its own.
 *
 * ⚠️ The four `age_*` columns add up to `debit`, and the server checks that
 * for every row (ageing_check.php). They are footed by name in DocumentPrint's
 * totals map, because the Grand Total row reads only that map.
 */
export const DUE_LIST_LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'line' },
  { key: 'party_lines', name: 'Party (name, mobile, address)', group: 'line' },
  { key: 'party_name', name: 'Party Name', group: 'line' },
  { key: 'mobile', name: 'Party Mobile', group: 'line' },
  { key: 'manual_address', name: 'Address', group: 'line' },
  { key: 'ledger_page', name: 'Ledger Page', group: 'line' },
  { key: 'area_code', name: 'Area Code', group: 'line' },
  { key: 'debit', name: 'Debit', group: 'line', numeric: true },
  { key: 'credit', name: 'Credit', group: 'line', numeric: true },
  { key: 'last_paid_lines', name: 'Last Paid (date, age)', group: 'line' },
  { key: 'last_paid', name: 'Last Paid Date', group: 'line' },
  { key: 'last_paid_age', name: 'Last Paid Age', group: 'line' },
  { key: 'age_0_30', name: '0-30 days', group: 'line', numeric: true },
  { key: 'age_31_60', name: '31-60 days', group: 'line', numeric: true },
  { key: 'age_61_90', name: '61-90 days', group: 'line', numeric: true },
  { key: 'age_90_plus', name: '90+ days', group: 'line', numeric: true },
  { key: 'oldest_age', name: 'Oldest Due Age', group: 'line' },
];

/**
 * Order With Transaction: one order, and every voucher raised against it.
 *
 * The order's own facts take the ORDER catalogue's keys (order_for, order_rate,
 * total_order ...) because they ARE the same facts, and the three word-fields
 * work the same way -- "{received_label}" over the payment column reads
 * Received on a sales order and Payment on a purchase one.
 *
 * ⚠️ NO `total_due` HERE. On the sales order it is amount less received; on
 * this paper the balance is amount less discount less payment, carried down.
 * What the sheet ends at is `closing_balance`, the last row's own figure, the
 * way Ledger Details says it.
 */
export const ORDER_TRANSACTION_INFO_FIELDS: FieldDef[] = [
  // ⚠️ Every key shared with another catalogue keeps that catalogue's wording:
  // the flat maps answer by key alone, last in wins, and a different name here
  // would rename the other paper's fallback label.
  { key: 'order_for', name: 'Customer Name', group: 'party' },
  { key: 'address', name: 'Address', group: 'party' },
  { key: 'order_type_label', name: 'Purchase / Sales', group: 'party' },
  { key: 'party_label', name: 'Word for the party (Customer / Supplier)', group: 'party' },
  { key: 'received_label', name: 'Word for money in (Received / Payment)', group: 'party' },

  { key: 'order_number', name: 'Order No', group: 'voucher' },
  { key: 'order_date', name: 'Order Date', group: 'voucher' },
  { key: 'notes', name: 'Notes', group: 'voucher' },
  { key: 'branch_name', name: 'Branch', group: 'voucher' },
  { key: 'printed_by', name: 'Printed By (signed in user)', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },

  { key: 'product_name', name: 'Product Name', group: 'order' },
  { key: 'unit', name: 'Unit', group: 'order' },
  { key: 'contract_order_qty', name: 'Contract Quantity', group: 'order', numeric: true },
  { key: 'order_rate', name: 'Order Rate', group: 'order', numeric: true },
  { key: 'total_order', name: 'Order Quantity', group: 'order', numeric: true },
  { key: 'order_amount', name: 'Order Amount', group: 'order', numeric: true },
  { key: 'duration', name: 'Duration', group: 'order' },
  { key: 'delivery_location', name: 'Delivery Location', group: 'order' },

  { key: 'blank', name: 'Blank line', group: 'manual' },

  { key: 'total_qty', name: 'Total Quantity', group: 'total', numeric: true },
  { key: 'total_amount', name: 'Total Amount', group: 'total', numeric: true },
  { key: 'total_discount', name: 'Total Discount', group: 'total', numeric: true },
  { key: 'total_received', name: 'Total Received', group: 'total', numeric: true },
  { key: 'closing_balance', name: 'Closing Balance', group: 'total', numeric: true, format: 'money' },
  { key: 'line_count', name: 'Number of Deliveries', group: 'total', numeric: true },
];

/**
 * One voucher against the order. `qty`, `price`, `amount`, `received` and
 * `discount` are keys the renderer already separates and foots; `detail_lines`
 * is the product over the voucher's note over the ledger remark, as the
 * bespoke sheet stacks them. `running_balance` foots blank on purpose -- see
 * LEDGER_DETAILS_LINE_FIELDS -- and the sheet ends at `closing_balance`.
 */
export const ORDER_TRANSACTION_LINE_FIELDS: FieldDef[] = [
  { key: 'sl', name: 'Sl. No.', group: 'line' },
  { key: 'voucher_no', name: 'Voucher No', group: 'line' },
  { key: 'voucher_date', name: 'Voucher Date', group: 'line' },
  { key: 'detail_lines', name: 'Product & Details', group: 'line' },
  { key: 'vehicle_no', name: 'Vehicle No.', group: 'line' },
  { key: 'qty', name: 'Quantity', group: 'line', numeric: true },
  { key: 'price', name: 'Rate', group: 'line', numeric: true },
  { key: 'amount', name: 'Amount', group: 'line', numeric: true },
  { key: 'discount', name: 'Discount', group: 'line', numeric: true },
  { key: 'received', name: 'Received', group: 'line', numeric: true },
  { key: 'running_balance', name: 'Balance', group: 'line', numeric: true },
];

const isLedger = (docType: DocType) =>
  docType === 'sales_ledger' || docType === 'purchase_ledger';

/** Which fields a paper may draw from. */
export const fieldsFor = (docType: DocType): FieldDef[] => {
  // The ledger's three own keys first, then the challan's whole catalogue under
  // them -- branch, print time, blank lines, the totals. A heading is a heading
  // on any paper, and one definition of each is the point of the flat maps.
  if (isLedger(docType)) return [...LEDGER_INFO_FIELDS, ...FIELD_CATALOG];
  // Alone among the papers here: its catalogue is not the challan's with a few
  // keys on top, because most of the challan's keys resolve on this report to a
  // nought that reads as a figure. See the note on LEDGER_DETAILS_INFO_FIELDS.
  if (docType === 'ledger_details') return LEDGER_DETAILS_INFO_FIELDS;
  if (docType === 'due_list') return DUE_LIST_INFO_FIELDS;
  if (docType === 'order_transaction') return ORDER_TRANSACTION_INFO_FIELDS;
  if (docType === 'sales_order') return ORDER_FIELD_CATALOG;
  if (docType === 'hotel_bill') return HOTEL_BILL_FIELDS;
  if (docType === 'hotel_money_receipt') return HOTEL_RECEIPT_FIELDS;
  if (docType === 'sales_invoice') return SALES_INVOICE_FIELD_CATALOG;
  if (docType === 'purchase_invoice') return PURCHASE_INVOICE_FIELD_CATALOG;
  return FIELD_CATALOG;
};

/**
 * The same function under the name the other branch gave it.
 *
 * ⚠️ An alias, not a copy. Both branches wrote this selector -- one called it
 * catalogFor, one fieldsFor -- and their call sites are spread across the
 * designer. Two implementations of "which fields may this paper offer" is a
 * pair that drifts the first time a fifth paper is added and only one of them
 * hears about it.
 */
export const catalogFor = fieldsFor;

/**
 * Which columns its table may draw from.
 *
 * A money receipt has none: it is one payment, and a table on it would be the
 * bill -- which is precisely the document a receipt must not become.
 */
export const lineFieldsFor = (docType: DocType): FieldDef[] => {
  // Its own list, not the challan's: a ledger row is a voucher, not a product,
  // and offering product name, unit and bag on it would be four fields the
  // adapter has nothing to put in.
  if (isLedger(docType)) return LEDGER_LINE_FIELDS;
  if (docType === 'ledger_details') return LEDGER_DETAILS_LINE_FIELDS;
  if (docType === 'due_list') return DUE_LIST_LINE_FIELDS;
  if (docType === 'order_transaction') return ORDER_TRANSACTION_LINE_FIELDS;
  if (docType === 'sales_order') return ORDER_LINE_FIELDS;
  if (docType === 'hotel_bill') return HOTEL_BILL_LINE_FIELDS;
  // A money receipt has none: it is one payment, and a table on it would be the
  // bill -- which is precisely the document a receipt must not become.
  if (docType === 'hotel_money_receipt') return [];
  if (docType === 'sales_invoice') return SALES_INVOICE_LINE_FIELDS;
  if (docType === 'purchase_invoice') return PURCHASE_INVOICE_LINE_FIELDS;
  return LINE_FIELDS;
};

/**
 * How wide a label column starts out, in `em`.
 *
 * Nine is enough for "Invoice Date" and for "ড্রাইভারের নাম", which are about
 * the longest labels either language puts on a challan. A pad with shorter
 * wording narrows it; one with a whole phrase for a label widens it.
 */
export const DEFAULT_LABEL_WIDTH = 9;

/**
 * How deep a row's padding starts out, in millimetres, and how far apart rows
 * start out.
 *
 * One millimetre is what the block was drawn with before either was a setting,
 * so a template saved earlier comes out of the printer as it always did. Rows
 * flush against each other for the same reason -- that is what they were.
 */
export const DEFAULT_ROW_PADDING = 1;
export const DEFAULT_ROW_GAP = 0;

/**
 * The Installment Details table's three columns, in the order and widths it
 * has always printed at. `field` is one of 'sl' | 'due_date' | 'amount' and
 * nothing else may appear here -- see InstallmentBand's own comment for why.
 * A tenant reorders, resizes, and realigns from these starting points; they
 * do not add a fourth or point one at a different field.
 */
export const DEFAULT_INSTALLMENT_COLUMNS: TableColumn[] = [
  { field: 'sl', label: 'SL', width: 15, align: 'center' },
  { field: 'due_date', label: 'Due Date', width: 45, align: 'left' },
  { field: 'amount', label: 'Amount', width: 40, align: 'right' },
];

const byKey = (list: FieldDef[]) =>
  list.reduce<Record<string, FieldDef>>((map, field) => {
    map[field.key] = field;
    return map;
  }, {});

/**
 * Every paper's fields in one map, for the lookups below.
 *
 * ⚠️ ONE PAIR OF MAPS, NOT TWO. Both branches built this and each covered only
 * the papers it knew about, so the merge arrived with ALL_INFO_BY_KEY over the
 * challan and the order beside INFO_BY_KEY over the challan and the hotel's --
 * two maps answering the same question, each blind to half the answer. A field
 * missing from whichever one a caller happened to use prints as its own key.
 *
 * ⚠️ Flat across doc types on purpose, and it only works because the keys do
 * not collide: the hotel reuses `branch_name`, `notes` and `printed_at` because
 * they mean the same thing on any paper, and everything else each paper adds is
 * its own. A key that meant two things on two papers would have to be renamed
 * before it went in here -- these lookups answer by key alone, and the renderer
 * asks them without knowing which document it is drawing.
 */
const ALL_INFO_BY_KEY = byKey([
  ...FIELD_CATALOG,
  ...ORDER_FIELD_CATALOG,
  ...HOTEL_BILL_FIELDS,
  ...HOTEL_RECEIPT_FIELDS,
  ...SALES_INVOICE_FIELD_CATALOG,
  ...PURCHASE_INVOICE_FIELD_CATALOG,
  // Last, and it shares nothing with the rest: a ledger's own keys are three
  // facts and three totals no voucher has. Anything it did share would take the
  // name of the paper that came before it, which is what keeps a challan's
  // "Number of Items" from becoming a ledger's "Number of Vouchers" everywhere.
  ...LEDGER_INFO_FIELDS,
  ...LEDGER_DETAILS_INFO_FIELDS,
  ...DUE_LIST_INFO_FIELDS,
  ...ORDER_TRANSACTION_INFO_FIELDS,
]);

const ALL_LINE_BY_KEY = byKey([...LINE_FIELDS, ...ORDER_LINE_FIELDS, ...HOTEL_BILL_LINE_FIELDS, ...SALES_INVOICE_LINE_FIELDS, ...PURCHASE_INVOICE_LINE_FIELDS, ...LEDGER_LINE_FIELDS, ...LEDGER_DETAILS_LINE_FIELDS, ...DUE_LIST_LINE_FIELDS, ...ORDER_TRANSACTION_LINE_FIELDS]);

/** The catalogue's own name for a field, or the key itself if it is unknown. */
export const fieldName = (key: string) =>
  ALL_INFO_BY_KEY[key]?.name ?? ALL_LINE_BY_KEY[key]?.name ?? key;

export const lineFieldName = (key: string) => ALL_LINE_BY_KEY[key]?.name ?? key;

export const isNumericField = (key: string) =>
  Boolean(ALL_INFO_BY_KEY[key]?.numeric || ALL_LINE_BY_KEY[key]?.numeric);

/** True where a line field is one the totals band can add up. */
export const isNumericLineField = (key: string) =>
  Boolean(ALL_LINE_BY_KEY[key]?.numeric);

/**
 * How a field is printed, where DocumentPrint's own switch does not claim it.
 *
 * See FieldDef.format. Returns undefined for the sales challan's fields, every
 * one of which is either a plain string or already has a case of its own --
 * which is what keeps this from changing a single challan.
 */
export const fieldFormat = (key: string): FieldDef | undefined =>
  ALL_INFO_BY_KEY[key] ?? ALL_LINE_BY_KEY[key];

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ids are fixed rather than generated. A template is saved and read back, and
 * a band whose id changed between two loads would look like a different band
 * to React -- and to a tenant who had just dragged it somewhere.
 */
const band = <T extends Band>(value: T) => value;

const standardChallan = (): PrintTemplate => ({
  version: 1,
  docType: 'sales_challan',
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
      text: 'Delivery Challan',
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
        { field: 'party_name', label: 'Party' },
        { field: 'vr_no', label: 'Invoice No' },
        { field: 'manual_address', label: 'Address', hideIfEmpty: true },
        { field: 'vr_date', label: 'Invoice Date' },
        { field: 'mobile', label: 'Mobile', hideIfEmpty: true },
        { field: 'order_no', label: 'Order No', hideIfEmpty: true },
      ],
    }),
    band<InfoBand>({
      id: 'transport',
      type: 'info',
      show: true,
      columns: 3,
      layout: 'inline',
      boxed: false,
      labelWidth: DEFAULT_LABEL_WIDTH,
      rowPadding: DEFAULT_ROW_PADDING,
      rowGap: DEFAULT_ROW_GAP,
      items: [
        { field: 'vehicle_no', label: 'Vehicle No', hideIfEmpty: true },
        { field: 'driver_name', label: 'Driver', hideIfEmpty: true },
        { field: 'driver_mobile', label: 'Mobile', hideIfEmpty: true },
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
        { field: 'sl', label: 'Sl. No.', width: 8, align: 'center' },
        { field: 'product_name', label: 'Product Name', width: 62, align: 'left' },
        { field: 'qty', label: 'Quantity', width: 15, align: 'right' },
        { field: 'unit', label: 'Unit', width: 15, align: 'center' },
      ],
    }),
    band<TotalsBand>({
      id: 'totals',
      type: 'totals',
      show: true,
      align: 'right',
      layout: 'rows',
      items: [{ field: 'total_qty', label: 'Total Quantity' }],
    }),
    band<NotesBand>({
      id: 'notes',
      type: 'notes',
      show: false,
      text: '',
      align: 'left',
      boxed: false,
    }),
    band<SignatureBand>({
      id: 'signature',
      type: 'signature',
      show: true,
      space: 60,
      items: [
        { label: 'Receiver Signature' },
        { label: 'Driver Signature' },
        { label: 'Sales By', field: 'created_by' },
      ],
    }),
  ],
});

/** Priced: the same challan with rate and amount, for a customer who wants it. */
const pricedChallan = (): PrintTemplate => {
  const template = standardChallan();
  const table = template.bands.find((b) => b.id === 'table') as TableBand;
  table.columns = [
    { field: 'sl', label: 'Sl. No.', width: 7, align: 'center' },
    { field: 'product_name', label: 'Product Name', width: 41, align: 'left' },
    { field: 'qty_unit', label: 'Quantity', width: 14, align: 'right' },
    { field: 'price', label: 'Rate', width: 15, align: 'right' },
    { field: 'amount', label: 'Amount', width: 23, align: 'right' },
  ];
  const totals = template.bands.find((b) => b.id === 'totals') as TotalsBand;
  totals.items = [
    { field: 'total_qty', label: 'Total Quantity' },
    { field: 'total_amount', label: 'Total Amount' },
    { field: 'amount_words', label: 'In Words' },
  ];
  return template;
};

/**
 * The shape of a Bengali order pad: every fact on its own boxed line, the
 * table below it, the terms at the foot. Labels are left in English because a
 * preset cannot know the tenant's wording -- renaming them is the first thing
 * the designer is for.
 */
const padChallan = (): PrintTemplate => {
  const template = standardChallan();
  template.fontSize = 14;

  const title = template.bands.find((b) => b.id === 'title') as TitleBand;
  title.underline = true;

  const info = template.bands.find((b) => b.id === 'info') as InfoBand;
  info.columns = 1;
  info.boxed = true;
  info.items = [
    { field: 'party_name', label: 'Receiver Name' },
    { field: 'manual_address', label: 'Address' },
    { field: 'order_no', label: 'Order No' },
    { field: 'vr_no', label: 'Challan No' },
    { field: 'vr_date', label: 'Date' },
  ];

  const transport = template.bands.find((b) => b.id === 'transport') as InfoBand;
  transport.columns = 1;
  transport.layout = 'rows';
  transport.boxed = true;
  transport.items = [
    { field: 'vehicle_no', label: 'Truck No' },
    { field: 'driver_name', label: 'Driver Name' },
    { field: 'driver_mobile', label: 'Mobile No' },
  ];

  const table = template.bands.find((b) => b.id === 'table') as TableBand;
  table.fillerRows = 4;

  const notes = template.bands.find((b) => b.id === 'notes') as NotesBand;
  notes.show = true;
  notes.boxed = true;
  notes.text =
    'Goods once delivered against this challan are the receiver’s responsibility. Any shortage in weight or quantity must be reported before the vehicle leaves.';

  return template;
};

/**
 * The shape of a printed Bengali order pad, with no product table at all.
 *
 * Every fact on its own boxed line -- goods, bags, quantity, lorry, driver --
 * because that is what a pad from the press looks like and what the person at
 * the gate is used to filling in. The product lines come through the
 * `product_*` fields, which run them together onto one line each instead of
 * drawing a table.
 *
 * The last three lines are blank on purpose. The fare agreed at the gate, the
 * advance handed over and what is still owed are not in the books, so the paper
 * carries the label and a rule and the gate writes them in -- exactly as the
 * printed pad does.
 */
const bengaliPadChallan = (): PrintTemplate => {
  const template = standardChallan();
  template.fontSize = 14;

  const title = template.bands.find((b) => b.id === 'title') as TitleBand;
  title.text = 'ডেলিভারি চালান';
  title.underline = true;

  const info = template.bands.find((b) => b.id === 'info') as InfoBand;
  info.columns = 1;
  info.boxed = true;
  // Wider than the default nine. Bengali sets wider per character than Latin,
  // and "ড্রাইভারের নাম" is the longest label on this pad -- at nine it would
  // wrap onto a second line and stand that one row taller than the rest.
  info.labelWidth = 11;
  info.items = [
    { field: 'party_name', label: 'প্রাপকের নাম' },
    { field: 'manual_address', label: 'ঠিকানা' },
    { field: 'order_no', label: 'অর্ডার নং' },
    { field: 'acc_name', label: 'হিসাব হবে' },
    { field: 'product_names', label: 'দ্রব্যের নাম' },
    { field: 'product_bag_list', label: 'বস্তা' },
    { field: 'product_qty_list', label: 'পরিমাণ' },
    { field: 'vehicle_no', label: 'ট্রাক নং' },
    { field: 'driver_name', label: 'ড্রাইভারের নাম' },
    { field: 'driver_mobile', label: 'মোবাইল নং' },
    { field: 'truck_fare', label: 'মোট ভাড়া' },
    // Still blank lines. Unlike the fare and the account, the advance handed to
    // the driver and what is left owing are not recorded anywhere in the
    // system, so the paper carries the label and a rule and the gate writes
    // them in -- which is what the printed pad does.
    { field: 'blank', label: 'অগ্রীম', hideIfEmpty: false },
    { field: 'blank', label: 'পাওনা', hideIfEmpty: false },
  ];

  // The transport block is already inside the list above, line by line.
  const transport = template.bands.find((b) => b.id === 'transport') as InfoBand;
  transport.show = false;

  // The whole point of this preset: the goods are lines, not a table.
  const table = template.bands.find((b) => b.id === 'table') as TableBand;
  table.show = false;

  const totals = template.bands.find((b) => b.id === 'totals') as TotalsBand;
  totals.show = false;

  const notes = template.bands.find((b) => b.id === 'notes') as NotesBand;
  notes.show = true;
  notes.align = 'center';
  notes.text =
    'বিঃদ্রঃ চালানে উল্লেখিত পণ্যের ওজন বা পরিমাণ কম হলে ট্রাক ভাড়া থেকে কর্তন করে ভাড়া প্রদান করার জন্য অনুরোধ করা হলো।';

  const signature = template.bands.find((b) => b.id === 'signature') as SignatureBand;
  signature.items = [{ label: 'ড্রাইভারের স্বাক্ষর' }, { label: 'কর্তৃপক্ষের স্বাক্ষর' }];

  return template;
};

/**
 * The sales order as it prints today.
 *
 * Drawn to match the paper that OrderTransactionPrint hard-codes, so that a
 * branch switching to the designer gets the sheet it already knows and can then
 * change it. A new default that looked better would still be a new sheet
 * arriving without warning on somebody's customer-facing paper.
 *
 * Two info columns, because the order's facts fall naturally in two halves: who
 * it is for on the left, what was agreed on the right. Then the deliveries made
 * against it, and what they come to.
 *
 * ⚠️ THREE HEADINGS ARE WRITTEN AS TOKENS, not as words, and they have to be:
 * this one layout is what the Orders screen prints a PURCHASE order on as well.
 * Fixed words put "Sales Details" at the top of a purchase order and "Customer
 * Name" against its supplier. {order_type_label}, {party_label} and
 * {received_label} are answered by the order itself -- see orderTypeWords() in
 * Orders.tsx and caption() in DocumentPrint -- and a tenant who would rather
 * have one word on every sheet just types it over the token.
 */
const standardOrder = (): PrintTemplate => ({
  version: 1,
  docType: 'sales_order',
  orientation: 'portrait',
  pageSize: 'a4',
  fontSize: 13,
  rowsPerPage: 0,
  marginLeft: MARGIN_LEFT,
  marginRight: MARGIN_RIGHT,
  showFooter: true,
  bands: [
    band<HeaderBand>({ id: 'header', type: 'header', show: true }),
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
      // Read in pairs: the band lays two columns out row by row, so these are
      // interleaved left, right, left, right. Who the order is for runs down
      // the left; what was agreed runs down the right, in the order the sheet
      // people already use puts them.
      items: [
        { field: 'order_for', label: '{party_label}' },
        { field: 'product_name', label: 'Product Name' },

        { field: 'address', label: 'Address', hideIfEmpty: true },
        { field: 'contract_order_qty', label: 'Contact Qty', hideIfEmpty: true },

        { field: 'mobile', label: 'Mobile', hideIfEmpty: true },
        { field: 'order_rate', label: 'Order Rate' },

        { field: 'duration', label: 'Duration', hideIfEmpty: true },
        { field: 'total_order', label: 'Order Qty' },

        { field: 'delivery_location', label: 'Delivery Location', hideIfEmpty: true },
        { field: 'order_amount', label: 'Amount' },

        { field: 'order_number', label: 'Order No' },
      ],
    }),
    band<TitleBand>({
      id: 'title',
      type: 'title',
      show: true,
      text: '{order_type_label} Details',
      align: 'center',
      scale: 1.1,
      underline: false,
    }),
    band<TableBand>({
      id: 'table',
      type: 'table',
      show: true,
      bordered: true,
      repeatHeader: true,
      fillerRows: 0,
      // ⚠️ The four totals that stood beside this table are gone from the
      // totals band below and foot the columns instead: the same figures,
      // each under its own heading, in one ruled line rather than four
      // stacked ones. A rate has no total and gets a blank cell.
      totalRow: true,
      totalRowLabel: 'Grand Total',
      columns: [
        { field: 'sl', label: 'Sl. No.', width: 7, align: 'center' },
        { field: 'vr_no', label: 'Inv. No.', width: 15, align: 'center' },
        { field: 'date', label: 'Inv. Date', width: 12, align: 'center' },
        { field: 'vehicle_no', label: 'Vehicle No.', width: 14, align: 'center' },
        { field: 'qty', label: 'Quantity', width: 12, align: 'right' },
        { field: 'price', label: 'Rate', width: 8, align: 'right' },
        { field: 'amount', label: 'Amount', width: 12, align: 'right' },
        { field: 'received', label: '{received_label}', width: 10, align: 'right' },
        { field: 'due', label: 'Due Amount', width: 12, align: 'right' },
      ],
    }),
    // ⚠️ EMPTY, AND KEPT. The four totals it held -- quantity, amount,
    // received, due -- now foot the table above, each under the column it
    // belongs to, in one ruled line instead of four stacked ones beside it.
    // Repeating them here would print every figure twice.
    //
    // The band stays so that a property wanting a total the table cannot foot
    // has somewhere to put it; with no items it draws nothing at all.
    band<TotalsBand>({
      id: 'totals',
      type: 'totals',
      show: true,
      align: 'right',
      layout: 'inline',
      items: [],
    }),
    // The order's own note, under the totals where the sheet has always put it.
    //
    // An info band rather than the notes band beneath it, and the difference
    // matters: the notes band prints a FIXED string the tenant types once --
    // terms and conditions, the same on every sheet -- while this prints what
    // was written on this order. Hidden when there is none, so an order with no
    // note does not print an empty label.
    band<InfoBand>({
      id: 'order-note',
      type: 'info',
      show: true,
      columns: 1,
      layout: 'inline',
      boxed: false,
      labelWidth: DEFAULT_LABEL_WIDTH,
      rowPadding: DEFAULT_ROW_PADDING,
      rowGap: DEFAULT_ROW_GAP,
      items: [{ field: 'notes', label: 'Notes', hideIfEmpty: true }],
    }),
    band<NotesBand>({
      id: 'notes',
      type: 'notes',
      show: false,
      text: '',
      align: 'left',
      boxed: false,
    }),
    band<SignatureBand>({
      id: 'signature',
      type: 'signature',
      show: true,
      space: 60,
      // ⚠️ The person at the printer, not the voucher's creator. The hard-coded
      // order sheet this layout replaced printed the signed-in user here, and a
      // paper that changed whose name it asks to sign would be a change nobody
      // asked for. `created_by` is still in the catalogue for a property that
      // wants to name the clerk instead.
      items: [{ label: 'Prepared by', field: 'printed_by' }, { label: 'Authorized by' }],
    }),
  ],
});

export type PresetDef = {
  id: string;
  name: string;
  /** One line saying who this preset is for. */
  hint: string;
  build: () => PrintTemplate;
};

/**
 * The hotel bill.
 *
 * ⚠️ Base, service charge and VAT each shown on their own line rather than
 * folded into a total. A bill that gives only the final figure is unusable to
 * the guest's own accountant, and useless as evidence for a VAT return.
 *
 * ⚠️ It is titled "Bill", not "VAT Challan" or মূসক ৬.৩. Whether the client's
 * hotel must issue a Mushak 6.3 -- and whether an EFD machine is involved -- is
 * open question 6 in §6.3 of the spec and has not been answered. A Mushak has a
 * mandated format and an unbroken government serial, and calling this one would
 * be claiming something nobody has checked. When the answer comes it is a
 * layout saved in the designer plus, if a serial is required, a numbering
 * decision -- not a rewrite of this file.
 */
const hotelBill = (): PrintTemplate => ({
  version: 1,
  docType: 'hotel_bill',
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
      text: 'Bill',
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
        { field: 'guest_name', label: 'Guest' },
        { field: 'booking_no', label: 'Booking No' },
        { field: 'guest_mobile', label: 'Mobile', hideIfEmpty: true },
        { field: 'check_in_date', label: 'Check-in' },
        { field: 'room_list', label: 'Room' },
        { field: 'check_out_date', label: 'Check-out' },
        // Hidden when absent rather than printing "Billed To:" with a blank
        // beside it -- most stays are settled at the counter and belong to
        // nobody but the guest.
        { field: 'billed_to', label: 'Billed To', hideIfEmpty: true },
        // And who pays, where that is somebody else again: a bill made out
        // to the guest's employer and carried on a company's account. Hidden
        // where it would only repeat the line above.
        { field: 'bill_owed_by', label: 'On account of', hideIfEmpty: true, hideIfEqualTo: 'billed_to' },
        { field: 'nights', label: 'Nights' },
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
        { field: 'sl', label: 'Sl.', width: 6, align: 'center' },
        // ⚠️ The room, WHAT IT WAS LET AS, and the dates on one line, with the
        // type's own sentence beneath it in brackets. A bill naming "MB / 101"
        // and nothing else leaves the guest's own accountant with no record of
        // what was paid for -- and the sentence is the type's, so it is written
        // once on the Room Types screen rather than onto every room.
        //
        // A charge reads the other way up: what it IS on the line -- "Ticket"
        // -- and what for beneath, plain, as the desk typed it. One sub-field
        // carries both, brackets included where they belong (see the
        // catalogue), which is why the column adds none of its own.
        //
        // The second line is simply not drawn where a row has nothing to say,
        // so a property that never fills those in prints what it always did.
        {
          field: 'description_with_type',
          label: 'Description',
          width: 45,
          align: 'left',
          subField: 'line_detail',
        },
        { field: 'quantity', label: 'Qty', width: 7, align: 'right' },
        { field: 'unit_rate', label: 'Rate', width: 13, align: 'right' },
        // ⚠️ AND NOTHING AFTER IT. There was a "Total" column carrying the
        // line's own tax, and it footed to nothing: the column added up to
        // 3,019 while "Room & Charges" underneath said 2,500, and the reader was
        // left to work out that the difference was the tax listed further down.
        // The tax is stated once, in the footing, on the whole bill -- so the
        // last money column here is what the footing starts from.
        { field: 'base_amount', label: 'Amount', width: 17, align: 'right' },
        // ⚠️ WHICH RATE, not how much. A bill carries several -- 15% on an
        // air-conditioned room, 7.5% on a fan one, 5% on dinner -- and the
        // question a guest asks is which one applied to what. One narrow column
        // answers it; the money is grouped by rate in the footing, where it can
        // be divided back out and checked.
        { field: 'vat_rate', label: 'VAT', width: 7, align: 'right' },
      ],
    }),
    band<TotalsBand>({
      id: 'totals',
      type: 'totals',
      show: true,
      align: 'right',
      // Stacked, and it matters here: a bill's figures are read downwards, each
      // against the one above it.
      layout: 'rows',
      items: [
        // ⚠️ THE ORDER IS THE ARITHMETIC, and it is the client's (2026-08-29):
        // the two taxes fall on the room and charges, they add up to the gross,
        // and the discount comes off THAT. A paper that put the discount higher
        // would be showing a subtraction the figures below it did not do.
        { field: 'bill_base', label: 'Room & Charges' },
        // Both hidden when zero: a property whose rates are still at zero --
        // which is every install until the client's consultant answers §6.3 --
        // should print a bill with no tax lines on it, not two zeroes.
        { field: 'bill_service_charge', label: 'Service Charge', hideIfEmpty: true },
        { field: 'bill_vat', label: 'VAT', hideIfEmpty: true },
        // Drawn only where the bill carries more than one rate -- see the field.
        { field: 'bill_vat_summary', label: 'VAT by rate', hideIfEmpty: true },
        // Ruled off above: the charges and the two taxes add up to this.
        { field: 'bill_gross', label: 'Gross', ruleAbove: true },
        // Hidden on a bill with no discount: a paper that prints "Discount —"
        // on every stay invites the question every time, and the answer is
        // always "none was given".
        { field: 'bill_discount', label: 'Discount', hideIfEmpty: true },
        // ⚠️ No Rounding line, by the client's decision. The rounding still
        // happens -- §6.3 rounds the bill once to the nearest taka, and the
        // ledger still has a head for the poisha -- it simply is not a line the
        // guest is shown. `bill_rounding` stays in the catalogue for a property
        // that wants it back.
        //
        // What is actually asked for at the counter: gross less discount,
        // rounded once.
        //
        // ⚠️ Off the paper on a bill nobody discounted, where it is the gross
        // again -- the same figure printed twice makes the reader hunt for a
        // difference that is not there. It comes back the moment something is
        // taken off, and on the rare bill where §6.3's rounding moved the total
        // by a few poisha.
        // Ruled off above: the discount comes off the gross to make this.
        {
          field: 'bill_rounded',
          label: 'Net Amount',
          hideIfEqualTo: 'bill_gross',
          ruleAbove: true,
        },
        // ⚠️ No "In Words" line either, by the same decision. The field stays in
        // the catalogue -- a property that wants the amount spelled out adds it
        // back in the designer -- it is simply not on the bill as it ships.
        { field: 'bill_paid', label: 'Paid' },
        // And again: what was paid comes off what is owed.
        { field: 'bill_due', label: 'Balance Due', ruleAbove: true },
      ],
    }),
    band<NotesBand>({
      id: 'notes',
      type: 'notes',
      show: false,
      text: '',
      align: 'left',
      boxed: false,
    }),
    band<SignatureBand>({
      id: 'signature',
      type: 'signature',
      show: true,
      space: 50,
      items: [{ label: 'Guest Signature' }, { label: 'For the Hotel' }],
    }),
  ],
});

/**
 * The money receipt.
 *
 * ⚠️ NO TABLE BAND AT ALL, and no tax line anywhere. A receipt is one payment;
 * a table on it would be the bill, and a VAT line on it would make it a VAT
 * invoice for money taken against a stay that has not happened (OPEN-12).
 * The catalogue behind this doc type offers neither, so a tenant editing it in
 * the designer cannot add them back.
 *
 * Landscape half-page would be closer to what a real receipt book looks like,
 * but portrait is what every other paper in the app prints and what every
 * tenant's printer is set up for. A property that wants a half sheet says so in
 * the designer.
 */
const hotelReceipt = (): PrintTemplate => ({
  version: 1,
  docType: 'hotel_money_receipt',
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
      text: 'Money Receipt',
      align: 'center',
      scale: 1.5,
      underline: true,
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
        { field: 'payment_no', label: 'Receipt No' },
        { field: 'payment_date', label: 'Date' },
        { field: 'guest_name', label: 'Received From' },
        { field: 'booking_no', label: 'Booking No' },
        { field: 'guest_mobile', label: 'Mobile', hideIfEmpty: true },
        { field: 'method', label: 'Paid By' },
      ],
    }),
    band<InfoBand>({
      id: 'amount',
      type: 'info',
      show: true,
      columns: 1,
      layout: 'rows',
      // Boxed, because this is the line the whole paper exists for and it
      // should not read as one of six facts.
      boxed: true,
      labelWidth: DEFAULT_LABEL_WIDTH,
      rowPadding: 2,
      rowGap: 0,
      items: [
        // ⚠️ "Received" or "Refund". A refund is stored positive, so without
        // this the two papers are the same document with the same figure on it.
        { field: 'receipt_kind', label: 'Nature' },
        { field: 'receipt_amount', label: 'Amount' },
        { field: 'receipt_words', label: 'In Words' },
        { field: 'purpose', label: 'On Account Of' },
        { field: 'reference', label: 'Cheque / Txn No', hideIfEmpty: true },
      ],
    }),
    band<InfoBand>({
      id: 'stay',
      type: 'info',
      show: true,
      columns: 3,
      layout: 'inline',
      boxed: false,
      labelWidth: DEFAULT_LABEL_WIDTH,
      rowPadding: DEFAULT_ROW_PADDING,
      rowGap: DEFAULT_ROW_GAP,
      items: [
        { field: 'check_in_date', label: 'Check-in' },
        { field: 'check_out_date', label: 'Check-out' },
        { field: 'room_list', label: 'Room', hideIfEmpty: true },
      ],
    }),
    band<NotesBand>({
      id: 'notes',
      type: 'notes',
      show: true,
      // ⚠️ Says what the paper is, in words, on the paper itself. An advance is
      // money held against a stay that has not happened -- a guest who reads
      // this as a bill has been told the wrong thing by their own receipt.
      text: 'An advance is money held against the stay. The bill is issued separately.',
      align: 'left',
      boxed: false,
    }),
    band<SignatureBand>({
      id: 'signature',
      type: 'signature',
      show: true,
      space: 50,
      items: [{ label: 'Received By' }],
    }),
  ],
});

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
      // Narrower than DEFAULT_LABEL_WIDTH (9em) -- this band's longest label
      // is "Invoice No" at ten characters, and 9em was sized for a challan's
      // "ড্রাইভারের নাম", not this one. At 9em, "Name"/"Date" sat inside a box
      // wider than themselves and left a visible gap before their own colon.
      // Caught in real-print review; the tenant can still widen it from here
      // in the designer if their own labels run longer.
      labelWidth: 6,
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
      columns: DEFAULT_INSTALLMENT_COLUMNS,
      width: 100,
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
      // Same narrowing as Sales Invoice's info band, and for the same
      // reason -- see its comment.
      labelWidth: 6,
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

/**
 * The two ledgers -- built to match what SalesLedgerPrint.tsx and
 * PurchaseLedgerPrint.tsx print today: the report heading, then one row per
 * voucher with its product lines filling three cells beside it, and a Grand
 * Total foot row.
 *
 * A report, not a voucher, and the layout says so: no signature line, and no
 * amount in words. `rowsPerPage` is 0 and the type 9pt because that is the
 * paper these two screens have always produced -- the screen's own Rows per
 * page and Font size still override both, so the page count behaves exactly as
 * it did before there was a designer to print these from.
 *
 * ⚠️ ONE DIGRESSION from today's purchase paper, and it is deliberate: that one
 * has no Balance column, so its foot prints a Balance that no column of its own
 * adds up to. Here both papers carry the column and the foot sums it, which is
 * the same figure reached a way the designer can edit. Nobody's purchase ledger
 * changes on this -- a layout only prints once a tenant saves one -- and a
 * tenant who wants the eight columns back deletes the ninth.
 *
 * ⚠️ `printed_at` is deliberately not in the info band. DocumentPrint only
 * stamps the time in its footer on a paper that does not already date itself,
 * and a report reprinted in the afternoon should keep saying when it was
 * printed -- adding the field here would silently take that line away.
 */
const ledgerHeading = (docType: DocType, title: string): PrintTemplate => ({
  version: 1,
  docType,
  orientation: 'portrait',
  pageSize: 'a4',
  fontSize: 9,
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
      text: title,
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
        { field: 'report_range', label: 'Report Date' },
        { field: 'ledger_account', label: 'Account', hideIfEmpty: true },
        { field: 'ledger_product', label: 'Product', hideIfEmpty: true },
        { field: 'branch_name', label: 'Branch', hideIfEmpty: true },
      ],
    }),
    band<TableBand>({
      id: 'table',
      type: 'table',
      show: true,
      bordered: true,
      repeatHeader: true,
      fillerRows: 0,
      totalRow: true,
      totalRowLabel: 'Grand Total',
      columns: [
        { field: 'sl', label: 'Sl', width: 5, align: 'center' },
        {
          field: 'challan_no',
          label: 'Chal. & Date',
          width: 11,
          align: 'left',
          // The voucher's number over its date, which is how both ledgers have
          // always printed the second column.
          subField: 'challan_date',
        },
        { field: 'product_lines', label: 'Product & Details', width: 33, align: 'left' },
        // ⚠️ The three a voucher's own figures come in as lists, and the only
        // columns on this paper whose default is wrong. Every other cell here
        // holds one value and the renderer already centres it; these three hold
        // one figure per product line, so they would hang from the top of a box
        // as tall as the block beside them -- a Qty level with the first product
        // and pointing at nothing. Centred, each sits against the block it
        // belongs to, which is how both ledgers have always printed.
        { field: 'qty_lines', label: 'Qty', width: 8, align: 'right', valign: 'middle' },
        { field: 'rate_lines', label: 'Rate', width: 10, align: 'right', valign: 'middle' },
        { field: 'amount_lines', label: 'Total', width: 12, align: 'right', valign: 'middle' },
        { field: 'discount', label: 'Disc.', width: 6, align: 'right' },
        // ⚠️ The same field on both papers and a different wording, because it
        // is a different direction of money: a customer pays the shop, the shop
        // pays the supplier. "Received" over a purchase ledger's column would
        // read as though the supplier had paid us.
        { field: 'received', label: docType === 'sales_ledger' ? 'Received' : 'Payment', width: 8, align: 'right' },
        { field: 'balance', label: 'Balance', width: 7, align: 'right' },
      ],
    }),
  ],
});

export const SALES_LEDGER_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Standard Sales Ledger',
    hint: 'One row per voucher, its products beside it, and a Grand Total foot.',
    build: () => ledgerHeading('sales_ledger', 'Sales Ledger'),
  },
];

export const PURCHASE_LEDGER_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Standard Purchase Ledger',
    hint: 'One row per voucher, its products beside it, and a Grand Total foot.',
    build: () => ledgerHeading('purchase_ledger', 'Purchase Ledger'),
  },
];

/**
 * The customer/supplier statement, and the only paper here that is LANDSCAPE.
 *
 * Twelve columns of paired figures -- purchase against sales, debit against
 * credit -- do not fit a portrait sheet at a size anybody can read, which is
 * why the screen it comes from has always printed it sideways. A tenant who
 * wants it portrait may have it; they will find out why it is not.
 *
 * ⚠️ The Balance column is footed with nothing, on purpose: it is a running
 * balance, and the column above it already ends at the closing figure the
 * totals band prints. See LEDGER_DETAILS_LINE_FIELDS.
 */
const ledgerStatement = (): PrintTemplate => ({
  version: 1,
  docType: 'ledger_details',
  orientation: 'landscape',
  pageSize: 'a4',
  fontSize: 9,
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
      text: 'Ledger Details',
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
        { field: 'report_range', label: 'Report Date' },
        { field: 'party_name', label: 'Name' },
        { field: 'mobile', label: 'Mobile', hideIfEmpty: true },
        { field: 'manual_address', label: 'Address' },
        // The two filters, which print as "All" rather than vanishing: the
        // statement of one product's trade is a different document from the
        // account's, and a reader has to be able to tell which they hold.
        { field: 'ledger_product', label: 'Product' },
        { field: 'report_trx_type', label: 'Transaction Type' },
        { field: 'branch_name', label: 'Branch', hideIfEmpty: true },
      ],
    }),
    band<TableBand>({
      id: 'table',
      type: 'table',
      show: true,
      bordered: true,
      repeatHeader: true,
      fillerRows: 0,
      totalRow: true,
      totalRowLabel: 'Total',
      columns: [
        { field: 'sl', label: 'Sl', width: 4, align: 'center' },
        // The voucher's number over its date, as the screen prints it.
        { field: 'voucher_no', label: 'Vr No & Date', width: 10, align: 'center', subField: 'voucher_date' },
        { field: 'description_lines', label: 'Description', width: 21, align: 'left' },
        { field: 'vehicle_no', label: 'Truck', width: 8, align: 'left' },
        { field: 'pur_qty', label: 'Pur. Qty.', width: 6, align: 'right' },
        { field: 'sal_qty', label: 'Sal. Qty.', width: 6, align: 'right' },
        { field: 'rate', label: 'Rate', width: 6, align: 'right' },
        { field: 'pur_total', label: 'Pur. Total', width: 8, align: 'right' },
        { field: 'sal_total', label: 'Sal. Total', width: 8, align: 'right' },
        { field: 'debit', label: 'Debit', width: 7, align: 'right' },
        { field: 'credit', label: 'Credit', width: 7, align: 'right' },
        // ⚠️ No foot under this one, and the renderer is what decides that --
        // see the note on the field. Left to its own default of centred, since
        // a single figure against a description of three lines reads better
        // level with the middle of them than hanging from the top.
        { field: 'running_balance', label: 'Balance', width: 7, align: 'right', valign: 'middle' },
      ],
    }),
    band<TotalsBand>({
      id: 'totals',
      type: 'totals',
      show: true,
      align: 'right',
      // One line, as the screen's own summary bar has always been -- eight
      // figures read across, not down a column that would take eight lines off
      // a statement already running to several sheets.
      layout: 'inline',
      items: [
        { field: 'opening_balance', label: 'Opening' },
        { field: 'total_pur_qty', label: 'Pur. Qty', hideIfEmpty: true },
        { field: 'total_sal_qty', label: 'Sal. Qty', hideIfEmpty: true },
        { field: 'total_pur_total', label: 'Pur. Amt', hideIfEmpty: true },
        { field: 'total_sal_total', label: 'Sal. Amt', hideIfEmpty: true },
        { field: 'total_debit', label: 'Debit', hideIfEmpty: true },
        { field: 'total_credit', label: 'Credit', hideIfEmpty: true },
        { field: 'closing_balance', label: 'Closing' },
      ],
    }),
  ],
});

/**
 * The Due List as the bespoke paper (DueListPrint.tsx) has always drawn it:
 * party, area, the two sides of the balance, when they last paid, and the
 * four ages of what is owed. Portrait -- ten columns, but most of them a
 * single figure wide.
 */
const dueListPaper = (): PrintTemplate => ({
  version: 1,
  docType: 'due_list',
  orientation: 'portrait',
  pageSize: 'a4',
  fontSize: 9,
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
      text: 'Due List',
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
        { field: 'as_on_date', label: 'As On' },
        { field: 'branch_name', label: 'Branch', hideIfEmpty: true },
        { field: 'ageing_rule', label: 'Ageing', hideIfEmpty: true },
      ],
    }),
    band<TableBand>({
      id: 'table',
      type: 'table',
      show: true,
      bordered: true,
      repeatHeader: true,
      fillerRows: 0,
      totalRow: true,
      totalRowLabel: 'Total',
      columns: [
        { field: 'sl', label: 'Sl', width: 5, align: 'center' },
        { field: 'party_lines', label: 'Member Info', width: 27, align: 'left' },
        { field: 'area_code', label: 'Area', width: 8, align: 'center' },
        { field: 'debit', label: 'Debit', width: 10, align: 'right', valign: 'middle' },
        { field: 'credit', label: 'Credit', width: 10, align: 'right', valign: 'middle' },
        { field: 'last_paid_lines', label: 'Last Paid', width: 10, align: 'center' },
        { field: 'age_0_30', label: '0-30', width: 7.5, align: 'right', valign: 'middle' },
        { field: 'age_31_60', label: '31-60', width: 7.5, align: 'right', valign: 'middle' },
        { field: 'age_61_90', label: '61-90', width: 7.5, align: 'right', valign: 'middle' },
        { field: 'age_90_plus', label: '90+ d', width: 7.5, align: 'right', valign: 'middle' },
      ],
    }),
  ],
});

/**
 * Order With Transaction as the bespoke sheet (OrderWithProductPrint.tsx)
 * draws it: the order's facts in two columns, the vouchers under them, and
 * the balance carried down. Landscape, as it has always printed.
 *
 * ⚠️ The Balance column foots blank; the sheet's last balance is the totals
 * band's `closing_balance`, which is what the bespoke foot printed there.
 */
const orderTransactionPaper = (): PrintTemplate => ({
  version: 1,
  docType: 'order_transaction',
  orientation: 'landscape',
  pageSize: 'a4',
  fontSize: 10,
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
      text: 'Order With Transaction',
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
        { field: 'order_for', label: '{party_label}' },
        { field: 'product_name', label: 'Product Name' },
        { field: 'address', label: 'Address' },
        { field: 'contract_order_qty', label: 'Contract Qty' },
        { field: 'duration', label: 'Duration' },
        { field: 'order_rate', label: 'Order Rate' },
        { field: 'delivery_location', label: 'Delivery Location' },
        { field: 'total_order', label: 'Order Qty' },
        { field: 'order_number', label: 'Order No.' },
        { field: 'order_amount', label: 'Amount' },
      ],
    }),
    band<TableBand>({
      id: 'table',
      type: 'table',
      show: true,
      bordered: true,
      repeatHeader: true,
      fillerRows: 0,
      totalRow: true,
      totalRowLabel: 'Total',
      columns: [
        { field: 'sl', label: 'Sl. No', width: 5, align: 'center' },
        { field: 'voucher_no', label: 'Chal. No. & Date', width: 11, align: 'left', subField: 'voucher_date' },
        { field: 'detail_lines', label: 'Product & Details', width: 24, align: 'left' },
        { field: 'vehicle_no', label: 'Truck Number', width: 10, align: 'left' },
        { field: 'qty', label: 'Quantity', width: 8, align: 'right', valign: 'middle' },
        { field: 'price', label: 'Rate', width: 7, align: 'right', valign: 'middle' },
        { field: 'amount', label: 'Total', width: 9, align: 'right', valign: 'middle' },
        { field: 'discount', label: 'Discount', width: 8, align: 'right', valign: 'middle' },
        { field: 'received', label: '{received_label}', width: 9, align: 'right', valign: 'middle' },
        { field: 'running_balance', label: 'Balance', width: 9, align: 'right', valign: 'middle' },
      ],
    }),
    band<TotalsBand>({
      id: 'totals',
      type: 'totals',
      show: true,
      align: 'right',
      layout: 'inline',
      items: [{ field: 'closing_balance', label: 'Balance' }],
    }),
    // The order's own note under the table. A bare token, so a blank note
    // takes the whole line away rather than printing "Note:" over nothing.
    band<NotesBand>({ id: 'notes', type: 'notes', show: true, text: '{notes}', align: 'left', boxed: false }),
  ],
});

export const ORDER_TRANSACTION_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Standard Order With Transaction',
    hint: 'The order above, every voucher against it below, the balance carried down.',
    build: orderTransactionPaper,
  },
];

export const DUE_LIST_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Standard Due List',
    hint: 'Party, balance, last payment and the four ages of the debt.',
    build: dueListPaper,
  },
];

export const LEDGER_DETAILS_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Standard Ledger Details',
    hint: 'One line per voucher, bought against sold, with the balance carried down.',
    build: ledgerStatement,
  },
];

export const CHALLAN_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Standard Challan',
    hint: 'Product, quantity and unit. No prices on the paper.',
    build: standardChallan,
  },
  {
    id: 'priced',
    name: 'Challan with Rate & Amount',
    hint: 'Adds rate, amount and the total in words.',
    build: pricedChallan,
  },
  {
    id: 'pad',
    name: 'Order Pad Style',
    hint: 'Every fact on its own boxed line, with terms at the foot.',
    build: padChallan,
  },
  {
    id: 'bengali-pad',
    name: 'Bengali Pad — no product table',
    hint: 'Goods, bags and quantity as labelled lines. Bengali labels.',
    build: bengaliPadChallan,
  },
];

export const ORDER_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Standard Order',
    hint: 'The order above, its deliveries below, and what they come to.',
    build: standardOrder,
  },
];

/**
 * The hotel's papers ship with one layout each rather than a shelf of them.
 *
 * The challan has four because four real tenants print four different challans.
 * Nobody has printed a hotel bill from this system yet, so a second and a third
 * would be guesses -- and a guess in a preset list is worse than an absence,
 * because somebody picks it and then has to undo it.
 */
export const HOTEL_BILL_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Standard Bill',
    hint: 'Charges as a table, with service charge and VAT shown separately.',
    build: hotelBill,
  },
];

export const HOTEL_RECEIPT_PRESETS: PresetDef[] = [
  {
    id: 'standard',
    name: 'Money Receipt',
    hint: 'One payment, the amount in words, and no tax line.',
    build: hotelReceipt,
  },
];

/** What the designer offers for the paper being edited. */
export const presetsFor = (docType: DocType): PresetDef[] => {
  if (docType === 'sales_ledger') return SALES_LEDGER_PRESETS;
  if (docType === 'purchase_ledger') return PURCHASE_LEDGER_PRESETS;
  if (docType === 'ledger_details') return LEDGER_DETAILS_PRESETS;
  if (docType === 'due_list') return DUE_LIST_PRESETS;
  if (docType === 'order_transaction') return ORDER_TRANSACTION_PRESETS;
  if (docType === 'sales_order') return ORDER_PRESETS;
  if (docType === 'hotel_bill') return HOTEL_BILL_PRESETS;
  if (docType === 'hotel_money_receipt') return HOTEL_RECEIPT_PRESETS;
  return CHALLAN_PRESETS;
};

export const defaultTemplate = (docType: DocType = 'sales_challan'): PrintTemplate => {
  if (docType === 'sales_ledger') return ledgerHeading('sales_ledger', 'Sales Ledger');
  if (docType === 'purchase_ledger') return ledgerHeading('purchase_ledger', 'Purchase Ledger');
  if (docType === 'ledger_details') return ledgerStatement();
  if (docType === 'due_list') return dueListPaper();
  if (docType === 'order_transaction') return orderTransactionPaper();
  if (docType === 'sales_order') return standardOrder();
  if (docType === 'hotel_bill') return hotelBill();
  if (docType === 'hotel_money_receipt') return hotelReceipt();
  if (docType === 'sales_invoice') return salesInvoice();
  if (docType === 'purchase_invoice') return purchaseInvoice();
  return standardChallan();
};

/* ------------------------------------------------------------------ */
/* Reading one back                                                    */
/* ------------------------------------------------------------------ */

const ALIGNS: Align[] = ['left', 'center', 'right'];

const align = (value: any, fallback: Align): Align =>
  ALIGNS.includes(value) ? value : fallback;

const VALIGNS: Valign[] = ['top', 'middle', 'bottom'];

const bounded = (value: any, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

/**
 * ⚠️ EVERY KEY A SAVED ITEM MAY CARRY HAS TO BE NAMED HERE, and forgetting one
 * fails silently: this rebuilds each item from the keys it knows, so anything
 * absent from the list is dropped on the way in. A rule that was in the
 * database, and a line meant to hide itself, simply never reached the paper --
 * and nothing anywhere said why.
 */
const infoItems = (value: any): InfoItem[] =>
  (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item.field === 'string' && item.field)
    .map((item) => ({
      field: String(item.field),
      label: typeof item.label === 'string' ? item.label : undefined,
      hideIfEmpty: Boolean(item.hideIfEmpty),
      // Off unless a field is named -- a bad value must not hide a total.
      hideIfEqualTo:
        typeof item.hideIfEqualTo === 'string' && item.hideIfEqualTo
          ? item.hideIfEqualTo
          : undefined,
      ruleAbove: Boolean(item.ruleAbove),
    }));

const tableColumns = (value: any): TableColumn[] =>
  (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item.field === 'string' && item.field)
    .map((item) => ({
      field: String(item.field),
      label: typeof item.label === 'string' ? item.label : undefined,
      width: bounded(item.width, 3, 100, 10),
      align: align(item.align, isNumericField(String(item.field)) ? 'right' : 'left'),
      // Undefined means "whatever the renderer does with a cell this shape",
      // which is the only answer a column saved before this existed can give.
      valign: VALIGNS.includes(item.valign) ? (item.valign as Valign) : undefined,
      // Absent on every column saved before this existed, which is every one:
      // no paper gains a second line it did not ask for.
      subField: typeof item.subField === 'string' && item.subField ? item.subField : undefined,
      subInBrackets: item.subInBrackets === true,
      // Only the five known parts survive, each once, IN THE SAVED ORDER --
      // the order is the tenant's choice. None chosen reads as all, so a
      // column can never be saved into printing nothing.
      parts: (() => {
        const known = PRODUCT_PARTS.map((part) => part.key);
        const chosen = Array.isArray(item.parts) ? item.parts.map(String) : [];
        const kept = chosen.filter((key, at) => known.includes(key) && chosen.indexOf(key) === at);
        return kept.length ? kept : undefined;
      })(),
    }));

/**
 * The Installment band's columns, read back the same way TableBand's are
 * (`tableColumns`, just above) but held to the fixed three fields the type
 * allows -- a stray field from a hand-edited layout is dropped rather than
 * rendered as a blank column, and any of the three MISSING from what was
 * saved is appended from DEFAULT_INSTALLMENT_COLUMNS rather than left out,
 * so a truncated save can never drop Sl, Due Date, or Amount off the paper.
 */
const installmentColumns = (value: any): TableColumn[] => {
  const allowed = new Set(DEFAULT_INSTALLMENT_COLUMNS.map((c) => c.field));
  const saved = tableColumns(value).filter((c) => allowed.has(c.field));
  const have = new Set(saved.map((c) => c.field));
  const missing = DEFAULT_INSTALLMENT_COLUMNS.filter((c) => !have.has(c.field));
  return [...saved, ...missing];
};

/**
 * Anything at all, turned into a template the renderer can trust.
 *
 * What comes back from the server is whatever was saved months ago by a version
 * of this screen that may not have had half these fields. Rather than guard
 * every read in the renderer, everything is filled in once here -- a missing
 * band keeps its default, an unknown band type is dropped, and a template that
 * lost its table gets one back, because a challan without a product table is
 * not a challan and the tenant would have nothing to drag onto.
 */
/** What this paper calls itself when a saved band has no title of its own. */
const defaultTitleOf = (template: PrintTemplate): string => {
  const title = template.bands.find((item) => item.type === 'title') as TitleBand | undefined;
  return title?.text ?? '';
};

/**
 * An order layout saved before the wording could vary, given the tokens.
 *
 * ⚠️ WHY A LAYOUT ALREADY IN THE DATABASE IS REWRITTEN AT ALL. The order sheet
 * shipped with three words fixed in its default -- "Sales Details", "Customer
 * Name", "Received" -- and the SAME layout prints purchase orders, where all
 * three are wrong: a purchase order came off the printer headed "Sales Details"
 * over its supplier's name. Teaching the renderer the tokens fixes the default
 * for layouts designed from today on; every branch that has already designed
 * one keeps its saved wording, and keeps printing the lie, until somebody opens
 * the designer and retypes three headings they have no reason to suspect.
 *
 * So the three the software itself wrote are swapped for the tokens that say
 * the same thing on a sales order and the right thing on a purchase one.
 *
 * ⚠️ EXACT MATCHES ONLY, and against the field as well as the words. A branch
 * that has already typed its own heading -- "Delivery Statement", "পার্টির নাম"
 * -- means it, and nothing here touches it. Rewritten text no longer matches,
 * so running twice changes nothing the first pass did not.
 */
const tokenizeOrderCaptions = (bands: Band[]): void => {
  bands.forEach((item) => {
    if (item.type === 'title' && item.text === 'Sales Details') {
      item.text = '{order_type_label} Details';
    }

    if (item.type === 'info') {
      item.items.forEach((entry) => {
        if (entry.field === 'order_for' && entry.label === 'Customer Name') {
          entry.label = '{party_label}';
        }
      });
    }

    if (item.type === 'table') {
      item.columns.forEach((column) => {
        if (column.field === 'received' && column.label === 'Received') {
          column.label = '{received_label}';
        }
      });
    }
  });
};

/**
 * A bill layout saved while the second line was the room type's alone.
 *
 * ⚠️ WHY A SAVED LAYOUT IS REWRITTEN. The description column's second line
 * used to read `room_type_description`, bracketed by the column -- so a charge,
 * which has no room type, printed one line and said only what it was for. It
 * now reads `line_detail`, which the server fills for rooms and charges alike
 * and brackets itself where brackets belong. A layout saved with the old
 * sub-field would keep printing charges the old way until somebody opened the
 * designer, and there is nothing in the designer to open: the sub-field was
 * never a control, it was written by the software and carried through every
 * save. So it is the software's to move.
 *
 * ⚠️ EXACT MATCH ONLY, and the column's bracketing is switched off in the same
 * breath -- the brackets now arrive in the data, and a column still adding its
 * own would print a room's sentence as "((AC, veranda))". Running twice changes
 * nothing the first pass did not.
 */
const retargetBillSubLine = (bands: Band[]): void => {
  bands.forEach((item) => {
    if (item.type !== 'table') return;

    item.columns.forEach((column) => {
      if (column.subField === 'room_type_description') {
        column.subField = 'line_detail';
        column.subInBrackets = false;
      }
    });
  });
};

/**
 * A bill layout saved before "who pays" had a line of its own.
 *
 * ⚠️ WHY A LINE IS ADDED TO A LAYOUT SOMEBODY ARRANGED. Billed To used to be
 * the only name on the paper, and with §40 it can be the guest's employer
 * while a different company holds the account -- so a saved layout printed the
 * employer and said nothing about who would be chased for the money. That is
 * wrong paper, not a styling preference, and it is wrong on exactly the bills
 * where it matters.
 *
 * Added directly under Billed To, hidden where it is empty or would only
 * repeat that line -- so on every bill the layout printed correctly before,
 * it prints exactly as it did. Only where a layout names Billed To at all,
 * and never twice. Billed To is made to hide when empty in the same pass --
 * see inside.
 */
const addBillAccountLine = (bands: Band[]): void => {
  bands.forEach((item) => {
    if (item.type !== 'info') return;

    const at = item.items.findIndex((entry) => entry.field === 'billed_to');
    if (at < 0) return;

    // ⚠️ AND BILLED TO ITSELF HIDES WHEN THERE IS NOBODY. Most stays are
    // settled at the counter and belong to nobody but the guest, and "Billed
    // To :" with a blank beside it asks a question on every one of them. The
    // shipped layout has always hidden it; a saved one carries the designer's
    // default of false from the day the field was dropped in, which nobody
    // chose. Set, not merely defaulted, so the next save keeps it.
    item.items[at].hideIfEmpty = true;

    if (item.items.some((entry) => entry.field === 'bill_owed_by')) return;

    item.items.splice(at + 1, 0, {
      field: 'bill_owed_by',
      label: 'On account of',
      hideIfEmpty: true,
      hideIfEqualTo: 'billed_to',
      ruleAbove: false,
    });
  });
};

export const normalizeTemplate = (raw: any, docType: DocType = 'sales_challan'): PrintTemplate => {
  const fallback = defaultTemplate(docType);
  if (!raw || typeof raw !== 'object') return fallback;

  const source = Array.isArray(raw.bands) ? raw.bands : [];

  const bands = source
    .map((item: any): Band | null => {
      if (!item || typeof item !== 'object') return null;

      const base = {
        id: String(item.id || item.type || ''),
        show: item.show !== false,
      };
      if (!base.id) return null;

      switch (item.type) {
        case 'header':
          return { ...base, type: 'header' };
        case 'title':
          return {
            ...base,
            type: 'title',
            // ⚠️ The fallback comes from THIS paper's own default, not from the
            // word "Delivery Challan" -- a hotel bill saved without a title
            // would otherwise print the challan's heading over a guest's bill.
            text: typeof item.text === 'string' ? item.text : defaultTitleOf(fallback),
            align: align(item.align, 'center'),
            scale: bounded(item.scale, 0.8, 3, 1.5),
            underline: Boolean(item.underline),
          };
        case 'info':
          return {
            ...base,
            type: 'info',
            columns: (bounded(item.columns, 1, 3, 2) as 1 | 2 | 3),
            layout: item.layout === 'inline' ? 'inline' : 'rows',
            boxed: Boolean(item.boxed),
            // A template saved before the column existed has no width to read,
            // and falls to the default rather than to zero -- which would put
            // every label in a column no wider than nothing.
            labelWidth: bounded(item.labelWidth, 2, 30, DEFAULT_LABEL_WIDTH),
            rowPadding: bounded(item.rowPadding, 0, 20, DEFAULT_ROW_PADDING),
            rowGap: bounded(item.rowGap, 0, 20, DEFAULT_ROW_GAP),
            items: infoItems(item.items),
          };
        case 'table':
          return {
            ...base,
            type: 'table',
            columns: tableColumns(item.columns),
            bordered: item.bordered !== false,
            repeatHeader: item.repeatHeader !== false,
            fillerRows: bounded(item.fillerRows, 0, 30, 0),
            // ⚠️ Off for anything saved before this existed. A total row that
            // switched itself on would add a line to every challan in the
            // system on its next print.
            totalRow: item.totalRow === true,
            totalRowLabel:
              typeof item.totalRowLabel === 'string' && item.totalRowLabel.trim()
                ? item.totalRowLabel
                : 'Grand Total',
          };
        case 'totals':
          return {
            ...base,
            type: 'totals',
            align: align(item.align, 'right'),
            // ⚠️ 'rows' for anything saved before this existed, which is every
            // layout a tenant has. A default of 'inline' would have run the
            // totals of every bill in the system onto one line on the next
            // print, without anybody asking for it.
            layout: item.layout === 'inline' ? 'inline' : 'rows',
            items: infoItems(item.items),
          };
        case 'notes':
          return {
            ...base,
            type: 'notes',
            text: typeof item.text === 'string' ? item.text : '',
            align: align(item.align, 'left'),
            boxed: Boolean(item.boxed),
          };
        case 'spacer':
          return {
            ...base,
            type: 'spacer',
            // Capped at 200mm: A4 is 297mm tall, and a gap taller than most of
            // the sheet is a mistyped number rather than a request.
            height: bounded(item.height, 0, 200, 10),
            rule: Boolean(item.rule),
          };
        case 'signature':
          return {
            ...base,
            type: 'signature',
            space: bounded(item.space, 0, 200, 60),
            items: (Array.isArray(item.items) ? item.items : [])
              .filter((entry: any) => entry && typeof entry.label === 'string')
              .map((entry: any) => ({
                label: entry.label,
                field: typeof entry.field === 'string' && entry.field ? entry.field : undefined,
              })),
          };
        case 'installments':
          return {
            ...base,
            type: 'installments',
            title: typeof item.title === 'string' && item.title.trim() ? item.title : 'Installment Details',
            bordered: item.bordered !== false,
            columns: installmentColumns(item.columns),
            // 100 for a template saved before this existed -- edge to edge,
            // exactly what it always drew.
            width: bounded(item.width, 10, 100, 100),
          };
        default:
          return null;
      }
    })
    .filter(Boolean) as Band[];

  // A template with no table cannot print a challan and cannot be repaired by
  // dragging, because there would be no table band to drag a column onto.
  if (!bands.some((item) => item.type === 'table')) {
    const spare = fallback.bands.find((item) => item.type === 'table') as TableBand;
    bands.push({ ...spare, id: 'table' });
  }

  // Safe to do in place: every band above was built here out of the saved JSON,
  // so nothing else is holding one.
  if (docType === 'sales_order') tokenizeOrderCaptions(bands);
  if (docType === 'hotel_bill') {
    retargetBillSubLine(bands);
    addBillAccountLine(bands);
  }

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
    rowsPerPage: bounded(raw.rowsPerPage, 0, 200, 0),
    // Capped at 60mm: A4 is 210mm across, and two 60mm margins already leave
    // less than half the sheet to print on.
    marginLeft: bounded(raw.marginLeft, 0, 60, MARGIN_LEFT),
    marginRight: bounded(raw.marginRight, 0, 60, MARGIN_RIGHT),
    showFooter: raw.showFooter !== false,
    bands: bands.length ? bands : fallback.bands,
  };
};

/* ------------------------------------------------------------------ */
/* Adding a part                                                       */
/* ------------------------------------------------------------------ */

/**
 * An id no other band in this template is using.
 *
 * The type's own name where it is free -- 'spacer', 'notes' -- and numbered
 * after that. Ids have to be stable across a save and a reload, because they
 * are what drag-and-drop moves and what React keys the rows on; generating a
 * random one would give the same band a different identity every time the
 * screen was opened.
 */
export const nextBandId = (template: PrintTemplate, type: BandType): string => {
  const used = new Set(template.bands.map((item) => item.id));
  if (!used.has(type)) return type;

  let index = 2;
  while (used.has(`${type}-${index}`)) index += 1;
  return `${type}-${index}`;
};

/**
 * The parts a tenant may add to a paper, and what each starts out as.
 *
 * Header and table are missing on purpose. A second letterhead is not a thing,
 * and a second product table would need its own pagination -- the renderer
 * splits rows across pages against one table, and two would each want the whole
 * page. Everything else can appear as many times as somebody has a use for.
 */
export type AddableBand = {
  type: BandType;
  name: string;
  hint: string;
  build: (id: string) => Band;
};

export const ADDABLE_BANDS: AddableBand[] = [
  {
    type: 'spacer',
    name: 'Blank Space',
    hint: 'A measured gap — room for a stamp, or a push down the page.',
    build: (id) => band<SpacerBand>({ id, type: 'spacer', show: true, height: 10, rule: false }),
  },
  {
    type: 'info',
    name: 'Details Block',
    hint: 'Another set of labelled fields.',
    build: (id) =>
      band<InfoBand>({
        id,
        type: 'info',
        show: true,
        columns: 2,
        layout: 'rows',
        boxed: false,
        labelWidth: DEFAULT_LABEL_WIDTH,
        rowPadding: DEFAULT_ROW_PADDING,
        rowGap: DEFAULT_ROW_GAP,
        items: [],
      }),
  },
  {
    type: 'title',
    name: 'Heading',
    hint: 'A line of your own wording, at any size.',
    build: (id) =>
      band<TitleBand>({
        id,
        type: 'title',
        show: true,
        text: 'Heading',
        align: 'center',
        scale: 1.2,
        underline: false,
      }),
  },
  {
    type: 'notes',
    name: 'Terms & Notes',
    hint: 'A paragraph of your own — conditions, a warning, an instruction.',
    build: (id) =>
      band<NotesBand>({ id, type: 'notes', show: true, text: '', align: 'left', boxed: false }),
  },
  {
    type: 'totals',
    name: 'Totals',
    hint: 'Another set of summed figures.',
    build: (id) =>
      band<TotalsBand>({ id, type: 'totals', show: true, align: 'right', layout: 'rows', items: [] }),
  },
  {
    type: 'signature',
    name: 'Signatures',
    hint: 'Another row of ruled signature lines.',
    build: (id) =>
      band<SignatureBand>({ id, type: 'signature', show: true, space: 40, items: [{ label: 'Signature' }] }),
  },
  {
    type: 'installments',
    name: 'Installment Details',
    hint: 'A repayment schedule, read off the sale\'s own installment plan.',
    build: (id) =>
      band<InstallmentBand>({
        id,
        type: 'installments',
        show: true,
        title: 'Installment Details',
        bordered: true,
        columns: DEFAULT_INSTALLMENT_COLUMNS,
        width: 100,
      }),
  },
];

/**
 * The same bill, for a sale that had no room behind it.
 *
 * ⚠️ A WALK-IN SALE IS BILLED ON THE HOTEL'S OWN BILL, deliberately -- the
 * money belongs in the same folio, the same charge types and the same reports
 * as a room's. What it must not do is print a room's questions: a meal has no
 * check-in, no check-out, no nights and no room list, and a layout that asks
 * for them prints a dash against each one. Four dashes down a bill read as a
 * paper somebody filled in badly, not as a paper that was never about rooms.
 *
 * Applied to whatever layout the branch actually uses -- its own from the
 * designer, or the shipped default -- so a property that has customised its
 * bill keeps every other change it made. It takes rows away and never adds a
 * field the layout did not have, with one exception: if dropping the stay
 * leaves the paper with no date at all, the booking date goes back in, because
 * an undated bill is not a bill.
 */
export const asWalkInBill = (template: PrintTemplate): PrintTemplate => {
  /** Facts that exist only because somebody slept here. */
  const stayOnly = new Set([
    'check_in_date',
    'check_out_date',
    'nights',
    'room_list',
    'room_count',
    'stated_rooms',
  ]);

  const dated = new Set(['booking_date', 'check_in_date', 'check_out_date']);

  return {
    ...template,
    bands: template.bands.map((band) => {
      if (band.type === 'info') {
        const kept = (band as InfoBand).items.filter((item) => !stayOnly.has(item.field));
        const hasDate = kept.some((item) => dated.has(item.field));

        return {
          ...band,
          items: hasDate ? kept : [{ field: 'booking_date', label: 'Date' }, ...kept],
        } as InfoBand;
      }

      // "Room & Charges" against a plate of food. The figure is right and the
      // word is not, and it is the one line of a bill everybody reads.
      if (band.type === 'totals') {
        return {
          ...band,
          items: (band as TotalsBand).items.map((item) =>
            item.field === 'bill_base' ? { ...item, label: 'Charges' } : item,
          ),
        } as TotalsBand;
      }

      return band;
    }),
  };
};
