import React from 'react';
import dayjs from 'dayjs';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

type Props = {
  master: any;
  details: any[];
  fontSize?: number;
  /**
   * How many product lines go on a printed page. 0 -- the default -- keeps the
   * whole challan on one, which is what a challan of half a dozen lines wants
   * and what every caller got before this existed.
   */
  rowsPerPage?: number;
  // Only for a caller that wants to say something the voucher itself does not.
  // Left alone, the heading comes off transfer_type below, so no screen has to
  // remember which of the two papers it is printing.
  title?: string;
};

/**
 * Product lines split into pages.
 *
 * Split by product, never inside one: a line's cost layers are printed beneath
 * it, and a product parted from its own rates on a signed document is worse
 * than a page that runs a little long.
 */
const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

// The transport column stores the transport input as `reference` and the note
// as `notes` (see WarehouseTransferController::apiTransferDetails).
const ChallanPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ master, details, fontSize = 11, rowsPerPage = 0, title }, ref) => {
    // Read before the guard below returns, so the hook runs on every render.
    const mobileFormat = useMobileFormat();

    if (!master) {
      return <div ref={ref}>No challan data.</div>;
    }

    // transfer_type: 1 = issue, 2 = receive.
    const isReceive = Number(master?.transfer_type) === 2;

    // Delivery against Received, the pair the godown already reads that way.
    // Decided from the voucher rather than from the screen, because the same
    // component prints from the Transfer List, the Receive List, and wherever
    // it is reached from next -- and a heading that depends on the route it
    // was reached by will eventually be reached by the wrong one.
    const heading = title || (isReceive ? 'Received Challan' : 'Delivery Challan');

    const rawDate = master?.challan_date || master?.vr_date;
    const challanDate = rawDate ? dayjs(rawDate).format('DD/MM/YYYY') : '';
    const rows = Array.isArray(details) ? details : [];

    // An issue detail fills issued_qty/stock_out; a receive detail fills
    // received_qty/stock_in and leaves the other pair 0 — so pick the first
    // non-zero of the four (|| skips both null and 0, unlike ??).
    const lineQty = (d: any) =>
      Number(d?.issued_qty) ||
      Number(d?.received_qty) ||
      Number(d?.stock_out) ||
      Number(d?.stock_in) ||
      0;

    const totalQty = rows.reduce((sum, d) => sum + lineQty(d), 0);
    const totalDamaged = rows.reduce((sum, d) => sum + Number(d?.damaged_qty ?? 0), 0);
    const totalShort = rows.reduce((sum, d) => sum + Number(d?.short_qty ?? 0), 0);
    const totalAmount = rows.reduce((sum, d) => sum + Number(d?.amount ?? 0), 0);

    // Challans raised before transfers carried their cost have nothing to price,
    // and two empty columns on a signed document invite somebody to fill them in.
    const hasCost = rows.some((d) => Number(d?.amount ?? 0) > 0);

    const layersOf = (d: any): any[] => (Array.isArray(d?.cost_layers) ? d.cost_layers : []);

    // Fixed label width, so every value starts on the same vertical line instead
    // of wherever its own label happened to end. In em, not px, so it still holds
    // when the challan is printed at a larger fontSize.
    // A field nobody filled in prints as a dash, which is a line left for the
    // godown to write on by hand -- right for a driver or a receiver named at
    // the gate. `hideIfEmpty` is for the fields that are not like that: an
    // empty one there is a number the system never issued, and a blank line
    // against it invites somebody to write one in.
    //
    // `groupEnd` closes a group of fields that belong together -- the voucher
    // and its date, the receiver and the number to reach them on. A little air
    // beneath the last of each is what tells a reader they are reading two or
    // three short lists rather than one column of seven unrelated lines. It
    // rides on the field rather than on a wrapper so that a hidden field takes
    // its spacing away with it, instead of leaving a gap around nothing.
    const Meta = ({
      label,
      value,
      sub,
      hideIfEmpty,
      groupEnd,
    }: {
      label: string;
      value: any;
      sub?: any;
      hideIfEmpty?: boolean;
      groupEnd?: boolean;
    }) => {
      const blank = value === null || value === undefined || String(value).trim() === '';
      if (hideIfEmpty && blank) return null;

      // An address is two lines tall and needs the wider gap; a group of
      // one-line fields needs less.
      const spacing = sub ? '.8em' : groupEnd ? '.75em' : undefined;

      return (
        // Baselines, not box tops, and one line height for both halves: the
        // label and its value are a single line of reading. The tight leading
        // used to sit on the value alone, which lifted every value a little
        // above the label beside it -- a drift of half a line on a document
        // that is nothing but labelled figures. The same leading holds an
        // address close to the branch name above it.
        //
        // A field carrying an address is two lines tall, so it needs a little
        // more air beneath it than a one-line field does -- otherwise the
        // address sits as close to the next label as it does to its own branch
        // name, and the eye cannot tell which of the two it belongs to.
        <div
          className="flex gap-1 items-baseline leading-tight"
          style={spacing ? { marginBottom: spacing } : undefined}
        >
          <span className="font-semibold whitespace-nowrap shrink-0" style={{ width: '9.5em' }}>
            {label}:
          </span>
          <span>
            {value || '-'}
            {sub ? (
              <span className="block" style={{ marginTop: '.2em' }}>
                {sub}
              </span>
            ) : null}
          </span>
        </div>
      );
    };

    const pages = chunkRows(rows, rowsPerPage);

    return (
      <div ref={ref} className="print-root text-gray-900" style={{ fontSize }}>
        <PrintStyles />
        {/* Only what is the challan's own: it breaks a page per challan page,
            and it names its page class rather than reusing .print-page because
            a challan page is one challan, not one screenful of rows. The
            margins, the sheet height and the gap under the footer come from
            PrintStyles above, where every report reads them. */}
        <style>{`
          @media print {
            .challan-page {
              display: flex;
              flex-direction: column;
              min-height: var(--print-page-height);
              break-after: page;
              page-break-after: always;
            }
            .challan-page:last-child {
              break-after: auto;
              page-break-after: auto;
            }
          }
        `}</style>

        {pages.map((pageRows, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;
          // Where this page's lines sit in the challan as a whole, so the
          // serial numbers run 1..n across the document rather than restarting
          // at every page break.
          const offset = pageIndex * (rowsPerPage > 0 ? rowsPerPage : 0);

          return (
            <div key={pageIndex} className="challan-page">

        {/* Headed with the branch whose voucher this is -- the sender on a
            delivery challan, the receiver on a received one -- and not with
            whoever happens to be printing it. The two papers record one
            movement, so they share their From and To; what separates them is
            which end raised the voucher, and the pad is where a reader looks
            for that. Both used to come out on the sender's pad, which put the
            receiving branch's own file copy under someone else's name. The
            Cash Book's pad works the same way: company at the top, then the
            branch the paper is actually about. */}
        {/* Outside the fontSize the challan's own body is set in. The pad is
            stationery -- the same three lines at the same size on every paper
            the branch prints -- and shrinking it with the product table made
            the challan's letterhead a size nothing else in the system uses. */}
        <div style={{ fontSize: '1rem' }}>
          <PadPrinting
            branch={{
              name: isReceive ? master?.to_branch_name : master?.from_branch_name,
              address: isReceive ? master?.to_branch_address : master?.from_branch_address,
              // Without this the pad prints a branch with no telephone on it:
              // an explicit branch is taken whole, so a phone left out here is
              // not filled in from the session branch's -- and rightly, since
              // that is a different branch's number.
              phone: isReceive ? master?.to_branch_phone : master?.from_branch_phone,
            }}
          />
        </div>

        <h1
          className="text-center font-bold uppercase mt-3 mb-4"
          style={{ fontSize: fontSize + 6 }}
        >
          {heading}
        </h1>

        {/* Meta: challan/voucher/date on one side, branches on the other.
            Each side is its own stack rather than cells of a shared grid: a
            branch address runs to two lines, and in a row-flowing grid that
            second line pushed the whole left column down with it, leaving
            Voucher No adrift beside an address it has nothing to do with. */}
        <div className="grid grid-cols-2 gap-x-8 mb-3 items-start">
          {/* Three groups: the challan's own number, then the voucher it was
              raised on and its date, then the person the goods were handed to
              and the number to reach them on. */}
          <div className="space-y-1">
            <Meta label="Challan No" value={master?.challan_number} hideIfEmpty groupEnd />
            <Meta label="Voucher No" value={master?.vr_no} />
            <Meta label="Date" value={challanDate} groupEnd />
            <Meta label="Receiver" value={master?.receiver_name} />
            <Meta label="Receiver Mobile" value={formatMobile(master?.receiver_mobile_number, mobileFormat)} />
          </div>
          {/* And three on this side: where the goods left, where they are
              going, and who is carrying them. The two branches close
              themselves -- an address already carries the wider gap. */}
          <div className="space-y-1">
            <Meta
              label="From Branch"
              value={master?.from_branch_name}
              sub={master?.from_branch_address}
            />
            <Meta
              label="To Branch"
              value={master?.to_branch_name}
              sub={master?.to_branch_address}
            />
            {/* Falls back to the old single Transport box, which is all an
                entry made before the split has. */}
            <Meta label="Driver" value={master?.driver_name || master?.reference} />
            <Meta label="Driver Mobile" value={formatMobile(master?.driver_mobile, mobileFormat)} />
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-center w-10">#</th>
              <th className="border border-black px-2 py-1 text-left">Product</th>
              <th className="border border-black px-2 py-1 text-right w-24">Qty</th>
              <th className="border border-black px-2 py-1 text-right w-28">Damaged</th>
              <th className="border border-black px-2 py-1 text-right w-24">Short</th>
              {hasCost && <th className="border border-black px-2 py-1 text-right w-24">Rate</th>}
              {hasCost && <th className="border border-black px-2 py-1 text-right w-28">Amount</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((d, index) => {
                const i = offset + index;
                const layers = layersOf(d);
                // Every rate is printed. One price sits on the product line;
                // several are broken out beneath it, because the challan has to
                // say which of the nine came in at which price -- an average
                // would be a figure nothing was bought at.
                const breakOut = hasCost && layers.length > 1;

                return (
                  <React.Fragment key={d?.id ?? i}>
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
                      <td className="border border-black px-2 py-1 text-left">
                        {d?.product_name || '-'}
                      </td>
                      <td className="border border-black px-2 py-1 text-right">
                        {thousandSeparator(lineQty(d))}
                      </td>
                      <td className="border border-black px-2 py-1 text-right">
                        {thousandSeparator(Number(d?.damaged_qty ?? 0))}
                      </td>
                      <td className="border border-black px-2 py-1 text-right">
                        {thousandSeparator(Number(d?.short_qty ?? 0))}
                      </td>
                      {hasCost && (
                        <td className="border border-black px-2 py-1 text-right">
                          {breakOut || d?.rate === null || d?.rate === undefined
                            ? ''
                            : thousandSeparator(Number(d.rate))}
                        </td>
                      )}
                      {hasCost && (
                        <td className="border border-black px-2 py-1 text-right">
                          {thousandSeparator(Number(d?.amount ?? 0))}
                        </td>
                      )}
                    </tr>

                    {breakOut &&
                      layers.map((layer: any, index: number) => (
                        <tr key={`${d?.id ?? i}-${index}`}>
                          <td className="border border-black px-2 py-1"></td>
                          <td className="border border-black px-2 py-1 pl-6 text-left">
                            at {thousandSeparator(Number(layer?.rate ?? 0))}
                          </td>
                          <td className="border border-black px-2 py-1 text-right">
                            {thousandSeparator(Number(layer?.qty ?? 0))}
                          </td>
                          <td className="border border-black px-2 py-1"></td>
                          <td className="border border-black px-2 py-1"></td>
                          <td className="border border-black px-2 py-1 text-right">
                            {thousandSeparator(Number(layer?.rate ?? 0))}
                          </td>
                          <td className="border border-black px-2 py-1 text-right">
                            {thousandSeparator(Number(layer?.amount ?? 0))}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td className="border border-black px-2 py-3 text-center" colSpan={hasCost ? 7 : 5}>
                  No product on this challan.
                </td>
              </tr>
            )}
          </tbody>
          {/* The totals close the document, so they belong under the last of
              its lines -- a Total halfway through reads as the end of the
              challan, and whoever signs it may never turn the page. */}
          <tfoot className={isLastPage ? '' : 'hidden'}>
            <tr className="font-semibold">
              <td className="border border-black px-2 py-1 text-right" colSpan={2}>
                Total
              </td>
              <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totalQty)}</td>
              <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totalDamaged)}</td>
              <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totalShort)}</td>
              {hasCost && <td className="border border-black px-2 py-1"></td>}
              {hasCost && (
                <td className="border border-black px-2 py-1 text-right">
                  {thousandSeparator(totalAmount)}
                </td>
              )}
            </tr>
          </tfoot>
        </table>

        {/* The note and the signatures close the document too, for the same
            reason: a line to sign halfway through invites a signature on a
            challan whose remaining pages nobody has read. */}
        {isLastPage && master?.notes ? (
          <div className="mt-3">
            <span className="font-semibold">Note: </span>
            {master.notes}
          </div>
        ) : null}

        {/* The rules come first in all three columns, so they line up across
            the page on their own -- the name hangs below its rule rather than
            pushing it about. */}
        {isLastPage ? (
          <div className="mt-12 grid grid-cols-3 gap-6">
            {/* Beneath the line, above the words: the space above the rule is
                where the pen goes, so a name printed there would be sitting in
                the signature itself. Tight leading, so a name and the words
                under it read as one caption to the rule rather than as two
                things that happen to share a column.

                These are the users who entered the two vouchers, not the
                receiver_name in the meta above -- that is whoever carried the
                goods away, while these are the people who moved the stock on
                their branch's books and are answerable for the figures here. */}
            <div className="text-center">
              <div className="border-t border-black pt-1">
                {/* Not on a received challan: that paper is the receiving
                    branch's own, and the sender signs nothing on it. */}
                {!isReceive && master?.issued_by_name ? (
                  <div className="font-semibold leading-tight">{master.issued_by_name}</div>
                ) : null}
                <div>Delivered By</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">Driver</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">
                {/* Blank until somebody has actually received: on a delivery
                    challan printed while the goods are still on the road there
                    is no receive yet, and a name there would say the stock had
                    arrived before it had. */}
                {master?.received_by_name ? (
                  <div className="font-semibold leading-tight">{master.received_by_name}</div>
                ) : null}
                <div>Received By</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* The same foot every other printed page in the system carries: who
            wrote the software on the left, where the reader is on the right.
            `continued` stays on it, because a challan is signed, and a signer
            has to know the goods go on past the sheet in their hand. */}
        {/* `continued` stays: a challan is signed, and a signer has to know
            the goods run on past the sheet in their hand. */}
        <PrintFooter
          page={pageIndex + 1}
          total={pages.length}
          note={isLastPage ? undefined : '— continued'}
        />
            </div>
          );
        })}
      </div>
    );
  },
);

ChallanPrint.displayName = 'ChallanPrint';

export default ChallanPrint;
