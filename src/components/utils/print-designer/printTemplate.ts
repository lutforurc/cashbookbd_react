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
 * The papers this describes.
 *
 * One was enough while there was one. A second is what proves the idea: a sales
 * order is a different set of fields and a different table, and it needed no
 * new renderer, no new designer and no new table -- only its own catalogue and
 * its own default. Anything that still says 'sales_challan' in a signature
 * rather than taking a DocType is a place a third paper would have to touch.
 */
export type DocType = 'sales_challan' | 'sales_order';

export const DOC_TYPES: { id: DocType; name: string; hint: string }[] = [
  {
    id: 'sales_challan',
    name: 'Delivery Challan',
    hint: 'What goes out with the goods.',
  },
  {
    id: 'sales_order',
    name: 'Sales Order',
    hint: 'The order, and the deliveries made against it.',
  },
];

export type Align = 'left' | 'center' | 'right';

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
};

/** One column of the product table. */
export type TableColumn = {
  field: string;
  label?: string;
  /** Share of the table width, in percent. Columns are normalised at render. */
  width?: number;
  align?: Align;
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
};

export type TotalsBand = BandBase & {
  type: 'totals';
  align: Align;
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
  | SpacerBand;

export type PrintTemplate = {
  /** Bumped when the shape changes; normalise() migrates anything older. */
  version: 1;
  docType: DocType;
  orientation: 'portrait' | 'landscape';
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
  | 'order';

export type FieldDef = {
  key: string;
  /** What it is called before a tenant renames it. */
  name: string;
  group: FieldGroup;
  /** Right-aligned by default in a table, and summed in the totals band. */
  numeric?: boolean;
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

  // Which paper this is
  { key: 'order_number', name: 'Order No', group: 'voucher' },
  { key: 'order_date', name: 'Order Date', group: 'voucher' },
  { key: 'branch_name', name: 'Branch', group: 'voucher' },
  { key: 'branch_address', name: 'Branch Address', group: 'voucher' },
  { key: 'notes', name: 'Notes', group: 'voucher' },
  { key: 'printed_at', name: 'Print Time', group: 'voucher' },

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

const byKey = (list: FieldDef[]) =>
  list.reduce<Record<string, FieldDef>>((map, field) => {
    map[field.key] = field;
    return map;
  }, {});

/**
 * Which fields a paper may offer.
 *
 * The designer asks for these rather than reading FIELD_CATALOG, so that an
 * order's field list holds no vehicle number and a challan's holds no order
 * rate. Offering the wrong catalogue does not break anything -- an unknown key
 * prints blank -- but it invites somebody to drag a field onto a paper that
 * will never have a value for it, and then to wonder why.
 */
export const catalogFor = (docType: DocType): FieldDef[] =>
  docType === 'sales_order' ? ORDER_FIELD_CATALOG : FIELD_CATALOG;

export const lineFieldsFor = (docType: DocType): FieldDef[] =>
  docType === 'sales_order' ? ORDER_LINE_FIELDS : LINE_FIELDS;

/**
 * Naming and numeric-ness read across every paper at once, on purpose.
 *
 * These three answer questions about a key that arrives on its own -- from a
 * saved template, or from a cell the renderer is about to draw -- with no doc
 * type beside it. Threading one through every call site would be a large change
 * to tell `amount` from `amount`, and the keys the two papers share mean the
 * same thing in both. Where they differ, the keys differ too.
 */
const ALL_INFO_BY_KEY = byKey([...FIELD_CATALOG, ...ORDER_FIELD_CATALOG]);
const ALL_LINE_BY_KEY = byKey([...LINE_FIELDS, ...ORDER_LINE_FIELDS]);

/** The catalogue's own name for a field, or the key itself if it is unknown. */
export const fieldName = (key: string) =>
  ALL_INFO_BY_KEY[key]?.name ?? ALL_LINE_BY_KEY[key]?.name ?? key;

export const lineFieldName = (key: string) => ALL_LINE_BY_KEY[key]?.name ?? key;

export const isNumericField = (key: string) =>
  Boolean(ALL_INFO_BY_KEY[key]?.numeric || ALL_LINE_BY_KEY[key]?.numeric);

/** True where a line field is one the totals band can add up. */
export const isNumericLineField = (key: string) =>
  Boolean(ALL_LINE_BY_KEY[key]?.numeric);

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
 */
const standardOrder = (): PrintTemplate => ({
  version: 1,
  docType: 'sales_order',
  orientation: 'portrait',
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
        { field: 'order_for', label: 'Customer Name' },
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
      text: 'Sales Details',
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
      columns: [
        { field: 'sl', label: 'Sl. No.', width: 7, align: 'center' },
        { field: 'vr_no', label: 'Inv. No.', width: 15, align: 'center' },
        { field: 'date', label: 'Inv. Date', width: 12, align: 'center' },
        { field: 'vehicle_no', label: 'Vehicle No.', width: 14, align: 'center' },
        { field: 'qty', label: 'Quantity', width: 12, align: 'right' },
        { field: 'price', label: 'Rate', width: 8, align: 'right' },
        { field: 'amount', label: 'Amount', width: 12, align: 'right' },
        { field: 'received', label: 'Received', width: 10, align: 'right' },
        { field: 'due', label: 'Due Amount', width: 12, align: 'right' },
      ],
    }),
    band<TotalsBand>({
      id: 'totals',
      type: 'totals',
      show: true,
      align: 'right',
      items: [
        { field: 'total_qty', label: 'Total Quantity' },
        { field: 'total_amount', label: 'Total Amount' },
        { field: 'total_received', label: 'Total Received' },
        { field: 'total_due', label: 'Total Due' },
      ],
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
      items: [{ label: 'Prepared by', field: 'created_by' }, { label: 'Authorized by' }],
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

/** The presets a paper offers. An unknown paper offers the challan's. */
export const presetsFor = (docType: DocType): PresetDef[] =>
  docType === 'sales_order' ? ORDER_PRESETS : CHALLAN_PRESETS;

export const defaultTemplate = (docType: DocType = 'sales_challan'): PrintTemplate =>
  docType === 'sales_order' ? standardOrder() : standardChallan();

/* ------------------------------------------------------------------ */
/* Reading one back                                                    */
/* ------------------------------------------------------------------ */

const ALIGNS: Align[] = ['left', 'center', 'right'];

const align = (value: any, fallback: Align): Align =>
  ALIGNS.includes(value) ? value : fallback;

const bounded = (value: any, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const infoItems = (value: any): InfoItem[] =>
  (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item.field === 'string' && item.field)
    .map((item) => ({
      field: String(item.field),
      label: typeof item.label === 'string' ? item.label : undefined,
      hideIfEmpty: Boolean(item.hideIfEmpty),
    }));

const tableColumns = (value: any): TableColumn[] =>
  (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item.field === 'string' && item.field)
    .map((item) => ({
      field: String(item.field),
      label: typeof item.label === 'string' ? item.label : undefined,
      width: bounded(item.width, 3, 100, 10),
      align: align(item.align, isNumericField(String(item.field)) ? 'right' : 'left'),
    }));

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
            text: typeof item.text === 'string' ? item.text : 'Delivery Challan',
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
          };
        case 'totals':
          return {
            ...base,
            type: 'totals',
            align: align(item.align, 'right'),
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

  return {
    version: 1,
    docType,
    orientation: raw.orientation === 'landscape' ? 'landscape' : 'portrait',
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
    build: (id) => band<TotalsBand>({ id, type: 'totals', show: true, align: 'right', items: [] }),
  },
  {
    type: 'signature',
    name: 'Signatures',
    hint: 'Another row of ruled signature lines.',
    build: (id) =>
      band<SignatureBand>({ id, type: 'signature', show: true, space: 40, items: [{ label: 'Signature' }] }),
  },
];
