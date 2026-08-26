import React from 'react';
import dayjs from 'dayjs';
import PadPrinting from '../utils-functions/PadPrinting';
import PrintFooter from '../utils-functions/PrintFooter';
import PrintStyles from '../utils-functions/PrintStyles';
import thousandSeparator from '../utils-functions/thousandSeparator';
import numberToWords from '../utils-functions/numberToWords';
import { formatMobile, useMobileFormat } from '../utils-functions/mobileFormat';
import { formatTransportationNumber } from '../utils-functions/formatRoleName';
import type { PrintBranch } from '../utils-functions/printBranch';
import {
  Align,
  Band,
  InfoBand,
  InfoItem,
  NotesBand,
  PrintTemplate,
  SignatureBand,
  SpacerBand,
  TableBand,
  TableColumn,
  TitleBand,
  TotalsBand,
  fieldFormat,
  fieldName,
  isNumericField,
} from './printTemplate';

/**
 * What a document has to print, in the shape the challan-data endpoint answers
 * with. `basic` is the voucher's own facts, `products` its lines; everything
 * else on the paper is worked out from those two here rather than by the
 * server, so a template that starts asking for a new total does not need the
 * API changed to get it.
 */
export type DocumentData = {
  basic?: Record<string, any> | null;
  products?: any[] | null;
  /** Whose letterhead heads the page -- the voucher's branch, not the reader's. */
  branch?: PrintBranch | null;
};

type Props = {
  template: PrintTemplate;
  data: DocumentData;
  /**
   * Sample rather than real. Draws the same paper with a watermark and without
   * the print footer's live timestamp, for the designer's preview pane.
   */
  preview?: boolean;
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const blank = (value: any) =>
  value === null || value === undefined || String(value).trim() === '';

/**
 * How tall a page stands in the designer's preview.
 *
 * A4 at the 96dpi a browser lays out in, less the 76px the preview's paper
 * wrapper puts around it. On screen the print stylesheet is asleep -- @media
 * print governs the real height -- so without a height stated here every
 * preview page would be exactly as tall as the rows on it, and a tenant could
 * not see how much of the sheet a challan actually fills.
 */
const PREVIEW_PAGE_HEIGHT = { portrait: 1046, landscape: 718 };

const alignClass: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Product lines split into pages -- never inside a line, which on a signed
 * document would part a product from its own quantity across a page break.
 */
const chunkRows = <T,>(rows: T[], size: number): T[][] => {
  if (size <= 0) return [rows];
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    pages.push(rows.slice(index, index + size));
  }
  return pages.length ? pages : [[]];
};

/**
 * Columns are stored as rough shares and are not required to add up -- a
 * tenant who drags a column out leaves the rest summing to 80, and a tenant who
 * widens one leaves them summing to 140. Scaled here so the table always fills
 * its width and nothing has to be corrected as it is edited.
 */
const columnWidths = (columns: TableColumn[]) => {
  const raw = columns.map((column) => Math.max(3, num(column.width) || 10));
  const total = raw.reduce((sum, width) => sum + width, 0) || 1;
  return raw.map((width) => `${((width / total) * 100).toFixed(3)}%`);
};

/**
 * A field printed the way its catalogue entry says to print it.
 *
 * The switches above were written when there was one document; there are three
 * now, and a fourth would need twenty more cases of which the twenty-first
 * would be forgotten. So a field may DECLARE its formatting instead -- see
 * FieldDef.format -- and this is the last thing tried, after every case above
 * has had its chance.
 *
 * ⚠️ Nothing on the sales challan reaches here with a format: every one of its
 * fields is a plain string or has a case of its own, so no challan anywhere
 * prints differently for this existing.
 *
 * @param source  The row or the voucher, for a `words` field that has to look
 *                up the figure it is spelling.
 */
const declared = (key: string, raw: any, source: any): string => {
  const field = fieldFormat(key);

  if (field?.format === 'words') {
    const figure = num(source?.[field.from ?? key]);
    // ⚠️ Zero spells nothing. "Zero Only" on a receipt is a receipt for no
    // money, and printing it is worse than leaving the line blank.
    return figure ? `${numberToWords(figure)} Only` : '';
  }

  if (blank(raw)) return '';

  if (field?.format === 'money') {
    // thousandSeparator turns 0 into a dash, which is right on a bill: a line
    // of nothing should read as nothing rather than as a figure.
    return thousandSeparator(num(raw));
  }

  if (field?.format === 'date') {
    return dayjs(raw).isValid() ? dayjs(raw).format('DD/MM/YYYY') : String(raw);
  }

  return String(raw);
};

const DocumentPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ template, data, preview = false }, ref) => {
    const mobileFormat = useMobileFormat();

    const basic = data?.basic ?? {};
    const rows = Array.isArray(data?.products) ? data.products : [];

    const lineAmount = (row: any) =>
      num(row?.amount) || num(row?.qty) * num(row?.price);

    const totals = {
      total_qty: rows.reduce((sum, row) => sum + num(row?.qty), 0),
      total_bag: rows.reduce((sum, row) => sum + num(row?.bag), 0),
      total_amount: rows.reduce((sum, row) => sum + lineAmount(row), 0),
      line_count: rows.length,
    };

    /**
     * One value, by key, formatted for paper.
     *
     * A key the voucher has nothing for comes back as an empty string rather
     * than "undefined" -- which is what lets `hideIfEmpty` work and what keeps
     * a template naming a field this server does not send from printing the
     * word undefined across a customer's challan.
     */
    /**
     * Every product line's answer to one question, run together into a value a
     * single labelled line can hold.
     *
     * Blanks are dropped rather than printed as empty gaps between commas, and
     * repeats are dropped too -- three bags of the same category on one challan
     * should read "Flour", not "Flour, Flour, Flour".
     */
    const listOf = (pick: (row: any) => any): string => {
      const seen: string[] = [];
      rows.forEach((row) => {
        const text = blank(pick(row)) ? '' : String(pick(row)).trim();
        if (text && !seen.includes(text)) seen.push(text);
      });
      return seen.join(', ');
    };

    const value = (key: string): string => {
      switch (key) {
        // A label the software has no answer for, and is not meant to have --
        // it is a rule for somebody to write on. See FIELD_CATALOG.
        case 'blank':
          return '';
        case 'product_names':
          return listOf((row) => row?.product_name);
        case 'product_categories':
          return listOf((row) => row?.category);
        case 'product_qty_list':
          return listOf((row) => {
            const quantity = thousandSeparator(num(row?.qty));
            return blank(row?.unit) ? quantity : `${quantity} ${row.unit}`;
          });
        case 'product_bag_list':
          return listOf((row) => (num(row?.bag) ? thousandSeparator(num(row.bag)) : ''));
        case 'product_serials':
          return listOf((row) => row?.serial_no);
        case 'vr_date': {
          const raw = basic?.vr_date;
          return raw ? dayjs(raw).format('DD/MM/YYYY') : '';
        }
        case 'printed_at':
          return dayjs().format('DD/MM/YYYY hh:mm A');
        case 'branch_name':
          return String(data?.branch?.name ?? basic?.branch_name ?? '');
        case 'branch_address':
          return String(data?.branch?.address ?? basic?.branch_address ?? '');
        case 'mobile':
        case 'driver_mobile':
          return blank(basic?.[key]) ? '' : formatMobile(basic[key], mobileFormat);
        case 'vehicle_no':
          // A registration number is in capitals on the plate, so it belongs in
          // capitals on the paper that quotes it -- this is the line somebody at
          // a gate reads against the lorry in front of them, and a number that
          // does not match the plate character for character is one they have to
          // stop and puzzle over.
          //
          // Settled here rather than at entry: what is stored is whatever the
          // typist's caps-lock happened to be, across every sale already in the
          // books. Correcting it on the way to the paper fixes the old ones too,
          // and does not quietly rewrite a column the accounts may match on.
          //
          // formatTransportationNumber first, which is what the sales and
          // purchase invoices already put a vehicle number through -- it tidies
          // the spacing around the dashes. Those two then uppercase the result
          // with a CSS class; this returns a string rather than markup, so it
          // does the same in code. Same value, same look, three papers.
          return blank(basic?.vehicle_no)
            ? ''
            : formatTransportationNumber(basic.vehicle_no).toUpperCase();
        case 'truck_fare':
          // NULL and 0 are different answers here. Nobody agreeing a fare
          // leaves the line blank -- which in a boxed pad is a rule for the
          // gate to write on -- while a fare of nothing prints as a figure.
          // thousandSeparator turns 0 into a dash, so it is not asked.
          return blank(basic?.truck_fare)
            ? ''
            : thousandSeparator(num(basic.truck_fare)) || '0';
        case 'total_qty':
        case 'total_bag':
        case 'total_amount':
          return thousandSeparator(totals[key as keyof typeof totals]);
        case 'line_count':
          return String(totals.line_count);
        case 'amount_words':
          return totals.total_amount ? `${numberToWords(totals.total_amount)} Only` : '';
        default:
          return declared(key, basic?.[key], basic);
      }
    };

    /** One cell of the product table. */
    const cell = (row: any, index: number, key: string): string => {
      switch (key) {
        case 'sl':
          return String(index + 1);
        case 'qty_unit': {
          const quantity = thousandSeparator(num(row?.qty));
          return blank(row?.unit) ? quantity : `${quantity} ${row.unit}`;
        }
        case 'amount':
          return thousandSeparator(lineAmount(row));
        case 'qty':
        case 'bag':
        case 'price':
          return thousandSeparator(num(row?.[key]));
        case 'warranty_days':
          return num(row?.warranty_days) ? `${num(row.warranty_days)} days` : '';
        default:
          return declared(key, row?.[key], row);
      }
    };

    /* -------------------------------------------------------------- */
    /* Bands                                                          */
    /* -------------------------------------------------------------- */

    const InfoBlock: React.FC<{ band: InfoBand }> = ({ band }) => {
      // Worked out before anything is drawn: a band whose every field is empty
      // and hidden must take its own margin away with it, not leave a gap.
      const visible = band.items.filter(
        (item) => !(item.hideIfEmpty && blank(value(item.field))),
      );
      if (!visible.length) return null;

      const label = (item: InfoItem) => item.label ?? fieldName(item.field);

      if (band.layout === 'inline') {
        return (
          <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1">
            {visible.map((item, index) => (
              <span key={`${item.field}-${index}`}>
                <b>{label(item)}:</b> {value(item.field) || ' '}
              </span>
            ))}
          </div>
        );
      }

      return (
        <div
          className="mb-2 grid gap-x-6"
          style={{
            gridTemplateColumns: `repeat(${band.columns}, minmax(0, 1fr))`,
            // Zero leaves boxed rows sharing an edge, so the block reads as one
            // ruled table; anything above it separates them into the distinct
            // boxes a pad from the press prints.
            rowGap: `${band.rowGap}mm`,
          }}
        >
          {visible.map((item, index) => (
            <div
              key={`${item.field}-${index}`}
              className={
                'flex min-w-0 items-baseline gap-2 ' +
                (band.boxed ? 'border border-gray-800 px-2' : '')
              }
              // The depth of the row, stated rather than left to a utility
              // class, because this is the one measurement a tenant sets
              // against a printed pad with a ruler.
              style={{
                paddingTop: `${band.rowPadding}mm`,
                paddingBottom: `${band.rowPadding}mm`,
              }}
            >
              {/* A stated width, not the width of the word.
                  Left to size itself, every label is as wide as its own text,
                  so the colons walk down the page in a ragged line and each
                  value starts somewhere different -- the first thing anybody
                  notices about a pad that was not printed by a press. A long
                  label wraps to a second line inside its column rather than
                  pushing the value out of the shared one. */}
              <span
                className="shrink-0 font-semibold"
                style={{ width: `${band.labelWidth}em` }}
              >
                {label(item)}
              </span>
              <span className="shrink-0">:</span>
              {/* The rule under the value is what makes a boxed pad a pad: a
                  field nobody filled leaves a line to write on by hand. */}
              <span
                className={
                  'min-w-0 flex-1 wrap-break-word ' +
                  (band.boxed ? '' : 'border-b border-dotted border-gray-400')
                }
              >
                {value(item.field) || ' '}
              </span>
            </div>
          ))}
        </div>
      );
    };

    const TitleBlock: React.FC<{ band: TitleBand }> = ({ band }) => (
      <div className={`mb-2 ${alignClass[band.align]}`}>
        <span
          className={
            'font-bold ' + (band.underline ? 'border-b-2 border-gray-900 pb-0.5' : '')
          }
          style={{ fontSize: `${template.fontSize * band.scale}px` }}
        >
          {band.text}
        </span>
      </div>
    );

    const TotalsBlock: React.FC<{ band: TotalsBand }> = ({ band }) => {
      const visible = band.items.filter(
        (item) => !(item.hideIfEmpty && blank(value(item.field))),
      );
      if (!visible.length) return null;

      return (
        <div
          className={
            'mb-2 flex ' +
            (band.align === 'left'
              ? 'justify-start'
              : band.align === 'center'
                ? 'justify-center'
                : 'justify-end')
          }
        >
          <table className="min-w-[45%]">
            <tbody>
              {visible.map((item, index) => (
                <tr key={`${item.field}-${index}`}>
                  <td className="pr-3 text-right font-semibold">
                    {item.label ?? fieldName(item.field)}
                  </td>
                  <td className="pr-1 text-right">:</td>
                  <td
                    className={
                      'font-bold ' +
                      (isNumericField(item.field) ? 'text-right' : 'text-left')
                    }
                  >
                    {value(item.field)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    const NotesBlock: React.FC<{ band: NotesBand }> = ({ band }) => {
      if (blank(band.text)) return null;
      return (
        <div
          className={
            `mb-2 whitespace-pre-wrap ${alignClass[band.align]} ` +
            (band.boxed ? 'border border-gray-800 p-2' : '')
          }
          style={{ fontSize: `${Math.max(8, template.fontSize - 2)}px` }}
        >
          {band.text}
        </div>
      );
    };

    /**
     * Blank paper of a stated height.
     *
     * `shrink-0` matters: the page is a flex column, and without it a gap put
     * on a full page would be squeezed to nothing by the rows around it -- the
     * one thing a spacer must never do is give its space back.
     */
    const SpacerBlock: React.FC<{ band: SpacerBand }> = ({ band }) => (
      <div className="shrink-0" style={{ height: `${band.height}mm` }}>
        {band.rule ? (
          <div className="h-full w-full border-b border-dashed border-gray-400" />
        ) : null}
      </div>
    );

    const SignatureBlock: React.FC<{ band: SignatureBand }> = ({ band }) => {
      if (!band.items.length) return null;

      return (
        // Top-aligned, so the rules agree even where one column's label runs to
        // two lines. Bottom-aligning them let the tallest column push its own
        // rule up, and three signature lines sat at two heights on one sheet.
        <div
          className="flex items-start justify-between gap-8"
          style={{ marginTop: `${band.space}px` }}
        >
          {band.items.map((item, index) => {
            const name = item.field ? value(item.field) : '';

            return (
              <div key={`${item.label}-${index}`} className="flex-1 text-center">
                {/* Nothing above the rule -- that is what somebody signs on,
                    and the room to do it is the space this band carries on its
                    top. Under it goes who signed and in what capacity, which is
                    the order the paper is read in: the signature first, then
                    the name that explains it.

                    A column with no name prints no line for one. Reserving a
                    blank there would keep every label level with its
                    neighbours', but it also puts a gap under rules that are
                    waiting to be signed by hand -- and a "Receiver Signature"
                    hanging a line below its own rule reads as a mistake on the
                    paper. The rules stay level either way, which is the
                    alignment that shows; the labels sit where their own column
                    puts them. */}
                <div className="mx-auto w-4/5 border-t border-gray-800 pt-0.5">
                  {name ? <div>{name}</div> : null}
                  <div>{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    const TableBlock: React.FC<{
      band: TableBand;
      pageRows: any[];
      startIndex: number;
      fillers: number;
      /** Off on later pages when the template says not to repeat the headings. */
      withHeader: boolean;
    }> = ({ band, pageRows, startIndex, fillers, withHeader }) => {
      const columns = band.columns.length
        ? band.columns
        : ([{ field: 'product_name', width: 100, align: 'left' }] as TableColumn[]);
      const widths = columnWidths(columns);
      const border = band.bordered ? 'border border-gray-800' : '';

      return (
        <table className="mb-2 w-full table-fixed border-collapse">
          <colgroup>
            {widths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          {withHeader ? (
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={`${column.field}-${index}`}
                    className={`${border} px-1 py-1 font-semibold ${alignClass[column.align ?? 'left']}`}
                  >
                    {column.label ?? fieldName(column.field)}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {pageRows.map((row, rowIndex) => (
              <tr key={row?.id ?? rowIndex} className="avoid-break">
                {columns.map((column, index) => (
                  <td
                    key={`${column.field}-${index}`}
                    className={`${border} px-1 py-0.5 align-top ${alignClass[column.align ?? 'left']}`}
                  >
                    {cell(row, startIndex + rowIndex, column.field)}
                  </td>
                ))}
              </tr>
            ))}

            {/* Empty ruled lines under the last product, so a short challan
                still fills its table and nobody can write a line in after it
                has been signed. */}
            {Array.from({ length: fillers }).map((_, fillerIndex) => (
              <tr key={`filler-${fillerIndex}`}>
                {columns.map((column, index) => (
                  <td
                    key={`${column.field}-${index}`}
                    className={`${border} px-1 py-0.5`}
                  >
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    };

    /* -------------------------------------------------------------- */
    /* Pages                                                          */
    /* -------------------------------------------------------------- */

    const tableBand = template.bands.find(
      (item): item is TableBand => item.type === 'table',
    );
    const tableIndex = tableBand ? template.bands.indexOf(tableBand) : -1;

    const shown = template.bands.filter((item) => item.show);

    // Everything above the table repeats on every page -- a second sheet
    // without the party's name on it is not a document anybody can act on.
    // Everything below it prints once, at the end, because a total or a
    // signature repeated per page is a total repeated per page.
    const isRepeated = (band: Band) =>
      tableIndex < 0 || template.bands.indexOf(band) < tableIndex;

    const repeatedBands = shown.filter((band) => band.type !== 'table' && isRepeated(band));
    const closingBands = shown.filter((band) => band.type !== 'table' && !isRepeated(band));
    const printTable = Boolean(tableBand && tableBand.show);

    /**
     * Whether the foot should stamp the sheet with the time it was printed.
     *
     * Only when the paper does not already say a date somewhere of its own.
     * A challan carrying its invoice date at the top and a printer's timestamp
     * an inch below reads as two dates that disagree, and whoever files it has
     * to work out which one the document is about -- which is exactly the
     * complaint the order sheet drew before its timestamp was taken off.
     */
    const printsADateAlready = shown.some(
      (band) =>
        (band.type === 'info' || band.type === 'totals') &&
        band.items.some((item) => item.field === 'vr_date' || item.field === 'printed_at'),
    );

    const pages = printTable
      ? chunkRows(rows, template.rowsPerPage)
      : [[] as any[]];

    const renderBand = (band: Band) => {
      switch (band.type) {
        case 'header':
          return <PadPrinting key={band.id} branch={data?.branch ?? undefined} />;
        case 'title':
          return <TitleBlock key={band.id} band={band} />;
        case 'info':
          return <InfoBlock key={band.id} band={band} />;
        case 'totals':
          return <TotalsBlock key={band.id} band={band} />;
        case 'notes':
          return <NotesBlock key={band.id} band={band} />;
        case 'signature':
          return <SignatureBlock key={band.id} band={band} />;
        case 'spacer':
          return <SpacerBlock key={band.id} band={band} />;
        default:
          return null;
      }
    };

    let consumed = 0;

    // No background of its own, here or on the pages below.
    //
    // A document is printed onto paper that is already the colour it is, so a
    // fill painted underneath it can only be wrong -- white no less than any
    // other colour: a browser asked to print backgrounds lays toner over the
    // whole sheet for nothing, and on screen a white page painted by the
    // renderer hid where the sheet actually ended. The designer's preview
    // paints the white sheet behind this instead, which is where a sheet of
    // paper belongs.
    return (
      <div ref={ref} className="print-root text-black">
        <PrintStyles orientation={template.orientation} />

        {/*
          This document's own side margins, and nothing else's.

          PrintStyles states the page for some forty reports at once, and its
          numbers must not move -- a challan that could edit the shared sheet
          would move every report in the app with it. So the shared rules stand
          and these two are overridden here, after them, for the pages this
          component draws.

          Both halves are needed. `@page` is where the printer is told to start,
          and `.print-page`'s padding is the gap drawn inside that; leaving
          either standing would add itself to whatever the tenant typed, and the
          number on screen would stop being the number on the ruler. So the
          horizontal `@page` margin goes to zero and the whole distance is the
          padding -- measured from the edge of the sheet, which is what somebody
          setting a margin means. The vertical margins are left exactly as they
          were, because the foot is pinned against them.

          A printer still has an edge it physically cannot reach, and will quietly
          hold anything smaller than that at its own minimum.
        */}
        <style>
          {`
            @media print {
              @page { margin-left: 0; margin-right: 0; }
              .print-page {
                padding-left: ${template.marginLeft}mm !important;
                padding-right: ${template.marginRight}mm !important;
              }
            }
          `}
        </style>

        {pages.map((pageRows, pageIndex) => {
          const startIndex = consumed;
          consumed += pageRows.length;
          const isLast = pageIndex === pages.length - 1;

          return (
            <div
              key={pageIndex}
              className={
                'print-page relative flex flex-col text-black ' +
                (pageIndex < pages.length - 1 ? 'page-break ' : '') +
                // Only in the designer. On screen the print stylesheet is
                // asleep, so without this a two-page challan previews as one
                // long sheet and there is no way to judge a rows-per-page
                // setting by looking at it.
                (preview && !isLast
                  ? 'mb-5 border-b-2 border-dashed border-gray-300 pb-3 '
                  : '')
              }
              style={{
                fontSize: `${template.fontSize}px`,
                ...(preview
                  ? {
                      minHeight: PREVIEW_PAGE_HEIGHT[template.orientation],
                      // On screen the print stylesheet is asleep, so the margins
                      // have to be drawn here or the preview would show the text
                      // running to the edge of a sheet it will not run to.
                      paddingLeft: `${template.marginLeft}mm`,
                      paddingRight: `${template.marginRight}mm`,
                    }
                  : {}),
              }}
            >
              {preview ? (
                <span className="pointer-events-none absolute right-3 top-2 select-none text-[10px] uppercase tracking-widest text-gray-300">
                  Sample
                </span>
              ) : null}

              {repeatedBands.map(renderBand)}

              {printTable && tableBand ? (
                <TableBlock
                  band={tableBand}
                  pageRows={pageRows}
                  startIndex={startIndex}
                  // Filler lines belong under the last product, not under every
                  // page's worth of them.
                  fillers={isLast ? tableBand.fillerRows : 0}
                  withHeader={pageIndex === 0 || tableBand.repeatHeader}
                />
              ) : null}

              {isLast ? closingBands.map(renderBand) : null}

              {template.showFooter ? (
                <PrintFooter
                  page={pageIndex + 1}
                  total={pages.length}
                  fontSize={template.fontSize}
                  hidePrintedAt={printsADateAlready}
                />
              ) : (
                <div className="mt-auto" />
              )}
            </div>
          );
        })}
      </div>
    );
  },
);

DocumentPrint.displayName = 'DocumentPrint';

export default DocumentPrint;
