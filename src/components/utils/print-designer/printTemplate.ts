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
export type DocType = 'sales_challan' | 'sales_order' | 'hotel_money_receipt' | 'hotel_bill';

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
    hint: 'The order, and the deliveries made against it.',
  },
  {
    id: 'hotel_money_receipt',
    name: 'Hotel — Money Receipt',
    hint: 'Proof that money arrived. Carries no tax line, by design.',
  },
  {
    id: 'hotel_bill',
    name: 'Hotel — Bill',
    hint: 'What the stay was charged. The VAT falls due on this one.',
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
   *   money  a figure with thousand separators
   *   date   DD/MM/YYYY, the way the desk reads a date
   *   words  the figure at `from`, spelled out
   */
  format?: 'money' | 'date' | 'words';
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
  // Whose name the bill is in, where a balance was carried at check-out.
  { key: 'billed_to', name: 'Billed To (Party)', group: 'guest' },

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
  ...HOTEL_STAY_FIELDS,

  { key: 'bill_base', name: 'Room & Charges', group: 'bill', numeric: true, format: 'money' },
  { key: 'bill_service_charge', name: 'Service Charge', group: 'bill', numeric: true, format: 'money' },
  // ⚠️ On the BILL this is right and required -- the tax falls due here.
  { key: 'bill_vat', name: 'VAT', group: 'bill', numeric: true, format: 'money' },
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
  { key: 'charge_type', name: 'Charge Type', group: 'folio' },
  // ⚠️ A row is one room over a RUN of nights, so its date is a FROM and a TO.
  // They are equal on a single night, and the description already reads as a
  // range -- these are for a property whose own paper wants them in columns.
  { key: 'stay_date', name: 'Date', group: 'folio', format: 'date' },
  { key: 'stay_date_to', name: 'Date To', group: 'folio', format: 'date' },
  { key: 'room', name: 'Room', group: 'folio' },
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
  { key: 'service_charge_rate', name: 'Service %', group: 'folio', numeric: true },
  { key: 'service_charge_amount', name: 'Service Charge', group: 'folio', numeric: true, format: 'money' },
  { key: 'vat_rate', name: 'VAT %', group: 'folio', numeric: true },
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

/** Which fields a paper may draw from. */
export const fieldsFor = (docType: DocType): FieldDef[] => {
  if (docType === 'sales_order') return ORDER_FIELD_CATALOG;
  if (docType === 'hotel_bill') return HOTEL_BILL_FIELDS;
  if (docType === 'hotel_money_receipt') return HOTEL_RECEIPT_FIELDS;
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
  if (docType === 'sales_order') return ORDER_LINE_FIELDS;
  if (docType === 'hotel_bill') return HOTEL_BILL_LINE_FIELDS;
  // A money receipt has none: it is one payment, and a table on it would be the
  // bill -- which is precisely the document a receipt must not become.
  if (docType === 'hotel_money_receipt') return [];
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
]);

const ALL_LINE_BY_KEY = byKey([...LINE_FIELDS, ...ORDER_LINE_FIELDS, ...HOTEL_BILL_LINE_FIELDS]);

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
      columns: [
        { field: 'sl', label: 'Sl.', width: 6, align: 'center' },
        { field: 'description', label: 'Description', width: 40, align: 'left' },
        { field: 'quantity', label: 'Qty', width: 8, align: 'right' },
        { field: 'unit_rate', label: 'Rate', width: 13, align: 'right' },
        { field: 'base_amount', label: 'Amount', width: 15, align: 'right' },
        { field: 'line_total', label: 'Total', width: 18, align: 'right' },
      ],
    }),
    band<TotalsBand>({
      id: 'totals',
      type: 'totals',
      show: true,
      align: 'right',
      items: [
        { field: 'bill_base', label: 'Room & Charges' },
        // Both hidden when zero: a property whose rates are still at zero --
        // which is every install until the client's consultant answers §6.3 --
        // should print a bill with no tax lines on it, not two zeroes.
        { field: 'bill_service_charge', label: 'Service Charge', hideIfEmpty: true },
        { field: 'bill_vat', label: 'VAT', hideIfEmpty: true },
        { field: 'bill_rounding', label: 'Rounding', hideIfEmpty: true },
        { field: 'bill_rounded', label: 'Grand Total' },
        { field: 'bill_words', label: 'In Words' },
        { field: 'bill_paid', label: 'Paid' },
        { field: 'bill_due', label: 'Balance Due' },
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
  if (docType === 'sales_order') return ORDER_PRESETS;
  if (docType === 'hotel_bill') return HOTEL_BILL_PRESETS;
  if (docType === 'hotel_money_receipt') return HOTEL_RECEIPT_PRESETS;
  return CHALLAN_PRESETS;
};

export const defaultTemplate = (docType: DocType = 'sales_challan'): PrintTemplate => {
  if (docType === 'sales_order') return standardOrder();
  if (docType === 'hotel_bill') return hotelBill();
  if (docType === 'hotel_money_receipt') return hotelReceipt();
  return standardChallan();
};

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
/** What this paper calls itself when a saved band has no title of its own. */
const defaultTitleOf = (template: PrintTemplate): string => {
  const title = template.bands.find((item) => item.type === 'title') as TitleBand | undefined;
  return title?.text ?? '';
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
