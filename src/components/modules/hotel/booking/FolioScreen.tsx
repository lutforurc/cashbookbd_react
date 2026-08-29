import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiDownload,
  FiLogOut,
  FiPercent,
  FiPlus,
  FiPrinter,
  FiRepeat,
  FiUpload,
  FiUser,
  FiX,
} from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputDatePicker from '../../../utils/fields/DatePicker';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import {
  PrintTemplate,
  asWalkInBill,
  defaultTemplate,
  normalizeTemplate,
} from '../../../utils/print-designer/printTemplate';
import { FIELD_LABEL } from '../../../../theme/fieldStyles';
import httpService from '../../../services/httpService';
import { API_HOTEL_FOLIO_URL, API_HOTEL_PARTY_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import { money } from '../setupHelpers';
import {
  billRead,
  billTransfer,
  clearBill,
  clearFolio,
  folioBill,
  folioCharge,
  folioDiscount,
  folioReceive,
  folioRead,
  tillList,
} from './bookingSlice';

/**
 * Parties a bill can be moved to.
 *
 * ⚠️ Answers cust_party_infos.id, which is what billed_to_party_id points at.
 * The chart dropdowns elsewhere in this app answer coa4 ids and are NOT
 * interchangeable with it. Same list the check-out screen uses, and it never
 * creates: a party is somebody money is owed by, confirmed by a person.
 */
const findParties = async (typed: string) => {
  const res = await httpService.get(API_HOTEL_PARTY_URL, { params: { q: typed } });
  const rows = res?.data?.data?.data ?? res?.data?.data ?? [];

  return (Array.isArray(rows) ? rows : []).map((party: any) => ({
    value: String(party.id),
    label: party.name,
    label_2: party.mobile || '',
    label_3: party.idfr_code || '',
  }));
};

/**
 * The bill, and the money against it -- screen 5.
 *
 * ⚠️ THE TWO NUMBERS HERE ARE NOT THE SAME QUESTION, and the screen is laid out
 * to keep them apart:
 *
 *   WHAT WAS CHARGED comes from the folio lines. A night is charged when
 *   somebody bills it, not when it is slept.
 *   WHAT WAS PAID comes from the payments. A guest may pay in full before a
 *   single night is on the bill.
 *
 * The balance is the difference, and it is DERIVED -- the server does not store
 * it. A stored balance is a third number that can disagree with the two it came
 * from, and the two it came from are the ones with an audit trail.
 *
 * ⚠️ AN ADVANCE IS NOT INCOME (spec 2.6). Taking money changes nothing on the
 * bill, which is why "Take money" and "Bill the nights" are two separate
 * actions rather than one. A screen that billed on payment would make what a
 * guest is charged depend on when they paid.
 *
 * ⚠️ THE AMBER BANNER IS GONE, and it went the honest way. It said the accounts
 * had not moved; the vouchers of spec 5 were written on 2026-08-26 and now they
 * have, so what stands in its place is the voucher NUMBER against each line and
 * each receipt. A row still without one is shown as still without one -- the
 * screen never claims the books have moved for a row where they have not.
 *
 * ⚠️ WHICH DRAWER THE MONEY WENT INTO IS NOW ASKED FOR. A voucher has to name
 * the cash or bank head, and "cash" as a word is not an account: a property with
 * a till and three bank accounts has four of them, and only the person taking
 * the money knows which one they put it in.
 */

const PURPOSE_OPTIONS = [
  { id: 'advance', name: 'Advance' },
  { id: 'settlement', name: 'Settlement' },
  { id: 'refund', name: 'Refund' },
];

const METHOD_OPTIONS = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank' },
  { id: 'card', name: 'Card' },
  { id: 'mobile', name: 'Mobile' },
  { id: 'adjustment', name: 'Adjustment' },
];

/**
 * What may go on this bill comes from the SERVER (§33), not from a list here.
 *
 * A property that has added "Spa" must be able to bill one, and one that has
 * switched "Ticket" off must not -- neither of which a constant in the client
 * can say, and a hardcoded dropdown would quietly disagree with what the server
 * accepts.
 *
 * room_rent is absent from the answer by its own flag: it goes on through
 * "Bill the nights", the only path that carries a room and a night and
 * therefore the only one the same-night-twice key can see.
 */
const FALLBACK_CHARGE_OPTIONS = [
  // Drawn only until the folio's own answer arrives, and on a server too old to
  // send one. The seven that ship, less room rent.
  { id: 'restaurant', name: 'Restaurant' },
  { id: 'catering', name: 'Catering' },
  { id: 'laundry', name: 'Laundry' },
  { id: 'hall_rent', name: 'Hall rent' },
  { id: 'ticket', name: 'Ticket' },
  { id: 'other', name: 'Other' },
];

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a date at the desk is a calendar date,
  // and going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const today = () => asText(new Date());

/**
 * A row's voucher number, or the fact that it has not got one.
 *
 * ⚠️ "Not posted" is said in words rather than left as a dash. A dash in a
 * column of voucher numbers reads as "nothing to show here", and what it
 * actually means is that this line of the guest's bill is not in the books.
 */
const VoucherMark = ({ vrNo }: { vrNo?: string | null }) =>
  vrNo ? (
    <span className="whitespace-nowrap font-mono text-xs text-black dark:text-white">{vrNo}</span>
  ) : (
    <span className="whitespace-nowrap rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/20 dark:text-amber-50">
      not posted
    </span>
  );

/**
 * A charge line as it is read, with its dates in the local order.
 *
 * ⚠️ The description is STORED as "MB / 501 — 2026-08-30" -- written when the
 * night was billed, and read back by the voucher narration and anything else
 * that quotes a folio line. It is not rewritten here: the stored words are the
 * record, and a screen that edited them would leave the paper and the ledger
 * saying two different things about one charge.
 *
 * So the date is turned round for the eye only, the same way the rest of these
 * screens write one. The printed bill does its own rebuild -- shorter, because
 * paper is narrower than a table -- and neither touches what is stored.
 */
const asRead = (text?: string | null): string =>
  String(text ?? '').replace(
    /(\d{4})-(\d{2})-(\d{2})/g,
    (_all, year, month, day) => `${day}/${month}/${year}`,
  );

/**
 * The calendar day a stored stay_date means, as YYYY-MM-DD.
 *
 * ⚠️ IT ARRIVES AS A UTC TIMESTAMP. The column holds 2026-08-27 and the API
 * serialises it as "2026-08-26T18:00:00.000000Z" -- the same instant six hours
 * west, which is the day BEFORE. Read as text it printed 26/08 for a night
 * slept on the 27th, and cutting the date out of the front of the string was
 * how the bill came to read "26/08/2026T18:00:00.000000Z".
 *
 * So the local day is taken from a parsed instant, and a value that is already
 * a plain date is left alone -- pushing that one through `new Date` is the same
 * trap the other way round, west of Greenwich.
 */
const dayOf = (value?: string | null): string => {
  const text = String(value ?? '');

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const at = new Date(text);

  if (Number.isNaN(at.getTime())) return '';

  return [
    at.getFullYear(),
    String(at.getMonth() + 1).padStart(2, '0'),
    String(at.getDate()).padStart(2, '0'),
  ].join('-');
};

/**
 * The nights of one room, folded into the runs they actually form.
 *
 * "30/08/2026 — 01/09/2026, 05/09/2026" -- three consecutive nights as a range
 * and the odd one after the gap named on its own. ⚠️ The GAP IS THE POINT: read
 * as one range, 30/08 to 05/09 would charge two nights the guest did not have,
 * and a reader adding the bill up by hand could not make it agree.
 */
const foldNights = (dates: string[]): string => {
  const days = [...new Set(dates.map(dayOf).filter(Boolean))].sort();

  if (!days.length) return '';

  const runs: string[][] = [];

  days.forEach((day) => {
    const run = runs[runs.length - 1];
    const previous = run?.[run.length - 1];

    // ⚠️ Compared as calendar days built from their own parts, never by
    // subtracting two parsed strings: an hour of daylight saving, or a value
    // that arrived as an instant rather than a date, makes "one day apart"
    // 23 or 25 hours and the run breaks where it should not.
    const follows = previous ? nextDay(previous) === day : false;

    if (follows) run.push(day);
    else runs.push([day]);
  });

  return runs
    .map((run) =>
      run.length > 1 ? `${asRead(run[0])} — ${asRead(run[run.length - 1])}` : asRead(run[0]),
    )
    .join(', ');
};

/** The day after a YYYY-MM-DD, as YYYY-MM-DD. */
const nextDay = (day: string): string => {
  const [year, month, date] = day.split('-').map(Number);
  const at = new Date(year, month - 1, date + 1);

  return [
    at.getFullYear(),
    String(at.getMonth() + 1).padStart(2, '0'),
    String(at.getDate()).padStart(2, '0'),
  ].join('-');
};

/**
 * The bill, with a room's nights on one line instead of one line each.
 *
 * A three-night stay in three rooms filled the table with nine rows saying the
 * same two things nine times, and finding the restaurant charge underneath
 * meant reading past all of them.
 *
 * ⚠️ WHAT MERGES IS DELIBERATELY NARROW -- the same room, the same charge type,
 * and the same rates. A stay that crosses a tariff change has two rates on it,
 * and one row cannot honestly carry two figures. The folio keeps its line per
 * night underneath either way; this is only how the table is read.
 *
 * ⚠️ ROOM NIGHTS ONLY. A hall carries a resource_id too, and folding on that
 * alone would put the morning, the afternoon and the evening of one day into a
 * single row -- three sales of one hall, with which sittings were sold no
 * longer on the paper. A restaurant charge repeated three times is three things
 * bought on three occasions, and the guest reads them as three.
 *
 * Amounts are summed, which is the only honest thing a merged row can show, and
 * the voucher numbers are listed where a run was posted in more than one batch.
 */
const foldBill = (lines: any[]): any[] => {
  const out: any[] = [];
  const at = new Map<string, number>();

  lines.forEach((line) => {
    const foldable = Boolean(line?.resource_id) && line?.charge_type === 'room_rent';

    const key = foldable
      ? [
          line.resource_id,
          line.charge_type,
          line.unit_rate,
          line.service_charge_rate,
          line.vat_rate,
        ].join('|')
      : null;

    if (key === null || !at.has(key)) {
      if (key !== null) at.set(key, out.length);

      out.push({
        ...line,
        // ⚠️ Only a foldable line collects nights. Without this a restaurant
        // charge had its stay date appended to a description that never
        // carried one -- "Launce-4 — 26/08/2026".
        _nights: foldable && line?.stay_date ? [line.stay_date] : [],
        _vouchers: [line?.vr_no],
      });

      return;
    }

    const row = out[at.get(key) as number];

    // ⚠️ The QUANTITY adds up too, now that the table shows it. Left at the
    // first night's own figure, a folded row read "1 × 6,000 = 18,000" -- three
    // nights' money against one night's count, which is the arithmetic a guest
    // querying the bill would check first. Safe to sum: the rate is part of the
    // fold key, so every line in a row was sold at the same price.
    row.quantity = Number(row.quantity ?? 0) + Number(line.quantity ?? 0);
    row.base_amount = Number(row.base_amount ?? 0) + Number(line.base_amount ?? 0);
    row.service_charge_amount =
      Number(row.service_charge_amount ?? 0) + Number(line.service_charge_amount ?? 0);
    row.vat_amount = Number(row.vat_amount ?? 0) + Number(line.vat_amount ?? 0);
    row.line_total = Number(row.line_total ?? 0) + Number(line.line_total ?? 0);

    if (line.stay_date) row._nights.push(line.stay_date);
    row._vouchers.push(line?.vr_no);
  });

  return out.map((row, index) => ({
    ...row,
    // Numbered as they are drawn. Keeping the folio's own line numbers would
    // print 1, 4, 7, 10 down a column of four rows.
    line_no: index + 1,
    description: row._nights.length
      ? `${String(row.description ?? '').split(' — ')[0]} — ${foldNights(row._nights)}`
      : row.description,
    vr_no: [...new Set(row._vouchers.filter(Boolean))].join(', '),
  }));
};

const FolioScreen = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();

  const folio = useSelector((state: any) => state.hotelBooking.folio);
  const loading = useSelector((state: any) => state.hotelBooking.loading);
  const saving = useSelector((state: any) => state.hotelBooking.saving);
  const tills = useSelector((state: any) => state.hotelBooking.tills);

  const bill = useSelector((state: any) => state.hotelBooking.bill);

  const [charge, setCharge] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);

  /**
   * The open discount panel: how much, which way, and why.
   *
   * ⚠️ `mode` is not decoration. A percentage follows the bill as it grows and
   * an amount does not, so which of the two was meant is part of the answer --
   * and sending both is refused by the server, because a bill carrying "10%"
   * and "500 off" cannot say which one it charged.
   */
  const [discount, setDiscount] = useState<any>(null);

  /**
   * The open "move this bill" panel: who it is going to, and why.
   *
   * ⚠️ `party: null` inside an OPEN panel means "back to the guest", which is
   * the way out of a company named by mistake (§6.4). The panel being closed is
   * `moving === null`; do not conflate the two.
   */
  const [moving, setMoving] = useState<any>(null);

  /**
   * The paper waiting to go to the printer, and what it is called.
   *
   * ⚠️ Held in state rather than printed straight from the response, because
   * react-to-print copies what is in the DOM at the moment it is called -- so
   * the document has to be MOUNTED first and printed in the effect below.
   * Called in the same breath, it would print the previous paper, or nothing.
   */
  const [paper, setPaper] = useState<{
    template: PrintTemplate;
    data: DocumentData;
    title: string;
  } | null>(null);

  const [fetchingPaper, setFetchingPaper] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  const sendToPrinter = useReactToPrint({
    contentRef: paperRef,
    documentTitle: paper?.title ?? 'Hotel',
    // Unmounted afterwards. Left standing, a whole document would be re-drawn
    // on every keystroke in the charge form on a screen that re-renders often,
    // and there is nothing to draw between papers anyway.
    onAfterPrint: () => setPaper(null),
  });

  useEffect(() => {
    if (!paper) return undefined;
    // The wait is for the letterhead image, which PadPrinting loads rather
    // than renders inline -- printed sooner, the paper goes out headless.
    const timer = setTimeout(() => sendToPrinter(), 250);
    return () => clearTimeout(timer);
  }, [paper]);

  /**
   * Fetch one paper's facts and the branch's own layout, then print it.
   *
   * Both come back in the SAME call: the paper is printed with a guest standing
   * at the counter, and one that needs two round trips is one that opens late.
   *
   * A branch that never opened the designer has no layout, and null here means
   * the built-in default -- which is why this works on the day it ships,
   * without anybody setting anything up.
   */
  const printPaper = async (url: string, docType: any, title: string) => {
    setFetchingPaper(true);

    try {
      const response = await httpService.get(url);
      const payload = response?.data?.data?.data ?? response?.data?.data ?? null;

      if (!payload) {
        toast.error('That paper could not be prepared.');
        return;
      }

      const layout = payload.layout
        ? normalizeTemplate(payload.layout, docType)
        : defaultTemplate(docType);

      setPaper({
        // ⚠️ A walk-in sale is billed on the hotel's own bill, and its stay
        // rows are taken off it here rather than in the designer. The branch
        // keeps ONE bill layout, customised however it likes; the meal simply
        // does not print the four questions -- check-in, check-out, nights,
        // room -- that a room's bill asks and a plate of food cannot answer.
        template:
          docType === 'hotel_bill' && folio?.booking?.booking_type === 'walk_in'
            ? asWalkInBill(layout)
            : layout,
        data: {
          basic: payload.basic ?? null,
          products: payload.products ?? [],
          branch: payload.branch ?? null,
        },
        title,
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'That paper could not be prepared.');
    } finally {
      setFetchingPaper(false);
    }
  };

  const load = useCallback(() => {
    if (id) dispatch(folioRead(Number(id)));
  }, [dispatch, id]);

  /**
   * ⚠️ READ ON EVERY MOUNT, even though the bookings list has just read this
   * same folio before navigating here.
   *
   * Skipping the read when the store already held the right folio was tried,
   * and it is not safe: the cleanup below CLEARS the folio, and a teardown that
   * lands after this screen has decided not to read leaves it holding nothing
   * with nothing on its way -- which is the blank "That bill could not be
   * opened." Nothing in React promises this effect runs after the last cleanup
   * of whatever it replaced.
   *
   * The second read costs nothing that shows, which is the point: the folio is
   * already in the store, so `loading && !folio` is false and the screen draws
   * the bill straight away while the read refreshes it underneath. The wait the
   * clerk sees was already paid on the list.
   */
  useEffect(() => {
    load();

    // Who owes it, read beside the bill itself. The folio's balance says what
    // the BOOKING owes; this says who owes it, and they are two questions.
    if (id) dispatch(billRead(Number(id)));

    return () => {
      dispatch(clearFolio());
      dispatch(clearBill());
    };
  }, [load, dispatch, id]);

  // Read once, and only if it is not already held. The chart of accounts does
  // not change while a clerk is at the desk, and a spinner between the guest
  // and the receipt is a spinner nobody asked for.
  useEffect(() => {
    if (!tills?.length) dispatch(tillList());
  }, [dispatch, tills?.length]);

  // The shape DropdownCommon wants, with the group in the label: 'Cash' and
  // 'Cash — Social Islami Bank (0225)' are told apart by a clerk at a glance,
  // and two accounts called 'Cash' in different groups are not.
  const tillOptions = useMemo(
    () =>
      (tills ?? []).map((till: any) => ({
        id: till.id,
        name: `${till.name} (${till.group_name})`,
      })),
    [tills],
  );

  const booking = folio?.booking;
  const totals = folio?.totals;

  // The company's own list, or the shipped seven until it arrives.
  const chargeOptions = folio?.charge_types?.length
    ? folio.charge_types
    : FALLBACK_CHARGE_OPTIONS;

  /**
   * Does any line on this bill carry tax of its OWN?
   *
   * ⚠️ Only bills made before 2026-08-29 do. The tax is the whole bill's now --
   * one service charge, one VAT, worked out once and shown in the summary above
   * the table -- so on a bill made since, those two columns would be a column of
   * dashes on every row. Drawn only where there is something in them, which is
   * how an old bill goes on reprinting exactly as it was paid.
   */
  const perLineTax = (folio?.lines ?? []).some(
    (line: any) => Number(line.service_charge_amount) || Number(line.vat_amount),
  );

  const lineColumns = useMemo(
    () => [
      {
        key: 'line_no',
        header: '#',
        headerClass: 'w-12 text-center',
        cellClass: 'text-center',
      },
      {
        key: 'description',
        header: 'Charge',
        render: (row: any) => (
          <div>
            <div className="text-black dark:text-white">{asRead(row.description)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {(row.charge_type ?? '').replace('_', ' ')}
            </div>
          </div>
        ),
      },
      /**
       * ⚠️ HOW THE AMOUNT WAS ARRIVED AT, in columns of its own.
       *
       * The two used to hide in a grey line under Amount, and only on a line
       * whose quantity was not one -- so three nights at 6,000 said so, while a
       * single night at 18,000 and a hall at 18,000 looked identical. A guest
       * querying a bill asks how many and at what price, and the answer has to
       * be on the row rather than worked back out of the total.
       *
       * Shown on every line, ones included: a column that appears and vanishes
       * down the page is read as a fault.
       */
      {
        key: 'quantity',
        header: 'Qty',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => {
          const qty = Number(row.quantity ?? 0);

          // Whole nights as "3", never "3.00" -- but a half day of a hall is
          // still a half, so the decimals are kept where there are any.
          return Number.isFinite(qty) ? (qty % 1 === 0 ? String(qty) : qty.toFixed(2)) : '—';
        },
      },
      {
        key: 'unit_rate',
        header: 'Rate',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => money(row.unit_rate),
      },
      {
        key: 'base_amount',
        header: 'Amount',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => money(row.base_amount),
      },
      // The two columns of an OLD bill, drawn only on one. See perLineTax.
      ...(perLineTax
        ? [
            {
              key: 'service_charge_amount',
              header: 'Service',
              headerClass: 'text-right',
              cellClass: 'text-right',
              // ⚠️ The rate is shown from the column, never worked back out of
              // the money. A rate divided out of a rounded amount is a rate
              // that drifts.
              render: (row: any) =>
                Number(row.service_charge_amount) ? (
                  <div>
                    <div>{money(row.service_charge_amount)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {row.service_charge_rate}%
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                ),
            },
            {
              key: 'vat_amount',
              header: 'VAT',
              headerClass: 'text-right',
              cellClass: 'text-right',
              /**
               * ⚠️ A LINE AT NOUGHT IS SAID OUT LOUD, in amber. The rate comes
               * from the room's type or the charge's type, and a room whose type
               * nobody set -- or a hall created without one -- finds nothing and
               * bills untaxed. That is exactly what happened to the halls: every
               * sitting of a community centre went out at nought and no screen
               * mentioned it.
               *
               * Not refused, because a bill is printed with a guest standing
               * there. Said, so somebody can put the rate in.
               */
              render: (row: any) =>
                Number(row.vat_amount) ? (
                  <div>
                    <div>{money(row.vat_amount)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.vat_rate}%</div>
                  </div>
                ) : (
                  <span
                    className="text-xs text-amber-700 dark:text-amber-300"
                    title="No VAT rate was found for this item — set it on the Room Types or Charges screen. Lines already billed keep what they were billed at."
                  >
                    no rate
                  </span>
                ),
            },
          ]
        : []),
      {
        key: 'line_total',
        header: 'Total',
        headerClass: 'text-right',
        cellClass: 'text-right font-medium',
        render: (row: any) => money(row.line_total),
      },
      {
        key: 'vr_no',
        header: 'Voucher',
        headerClass: 'text-center',
        cellClass: 'text-center',
        // ⚠️ The voucher NUMBER, because it is the thing somebody types into
        // the accounts screen. A tick saying "posted" would be a claim they
        // could not check.
        render: (row: any) => <VoucherMark vrNo={row.vr_no} />,
      },
    ],
    [perLineTax],
  );

  const paymentColumns = useMemo(
    () => [
      { key: 'payment_no', header: 'Receipt' },
      {
        key: 'payment_date',
        header: 'Date',
        render: (row: any) => String(row.payment_date ?? '').slice(0, 10),
      },
      {
        key: 'purpose',
        header: 'For',
        render: (row: any) => {
          const refund = row.purpose === 'refund';

          return (
            <span
              className={`inline-block rounded border px-2 py-0.5 text-[0.65rem] font-semibold ${
                refund
                  ? 'border-rose-400 bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-50'
                  : 'border-teal-400 bg-teal-100 text-teal-900 dark:bg-teal-500/25 dark:text-teal-50'
              }`}
            >
              {row.purpose}
            </span>
          );
        },
      },
      { key: 'method', header: 'How' },
      {
        key: 'reference',
        header: 'Reference',
        render: (row: any) => row.reference || <span className="text-gray-400">—</span>,
      },
      {
        key: 'amount',
        header: 'Amount',
        headerClass: 'text-right',
        cellClass: 'text-right font-medium',
        // A refund is stored positive and shown with its sign, because the sign
        // is the whole of what distinguishes it on a list of numbers.
        render: (row: any) => (
          <span className={row.purpose === 'refund' ? 'text-danger dark:text-red-400' : ''}>
            {row.purpose === 'refund' ? '− ' : ''}
            {money(row.amount)}
          </span>
        ),
      },
      {
        key: 'vr_no',
        header: 'Voucher',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => <VoucherMark vrNo={row.vr_no} />,
      },
      {
        key: 'print',
        header: '',
        headerClass: 'w-12 text-center',
        cellClass: 'text-center',
        // ⚠️ Per ROW, not one button for the screen. A receipt is what somebody
        // is handed at the moment they hand money over; a paper covering three
        // payments is a statement, which is a different document.
        render: (row: any) => (
          <button
            type="button"
            title={`Print receipt ${row.payment_no}`}
            onClick={() =>
              printPaper(
                `${API_HOTEL_FOLIO_URL}/${id}/receipt/${row.id}`,
                'hotel_money_receipt',
                `Money Receipt ${row.payment_no}`,
              )
            }
            className="text-primary hover:underline dark:text-secondary"
          >
            <FiPrinter size={15} />
          </button>
        ),
      },
    ],
    // printPaper closes over `id`, which is the only thing about it that moves.
    [id],
  );

  const billNights = async () => {
    try {
      const result = await dispatch(folioBill(Number(id))).unwrap();
      toast.success(result.message);
    } catch (error: any) {
      // Usually the clash: somebody billed one of these nights while this was
      // open, and nothing was added. The server's sentence says exactly that.
      toast.error(String(error));
      load();
    }
  };

  const saveCharge = async () => {
    if (!charge?.description?.trim()) {
      toast.error('What is the charge for?');
      return;
    }

    try {
      const result = await dispatch(folioCharge({ id: Number(id), ...charge })).unwrap();
      toast.success(result.message);
      setCharge(null);
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  /**
   * Allow a discount on the whole bill, or take one back.
   *
   * ⚠️ ONE OF THE TWO BOXES, never both. Whichever the panel is in, the other is
   * sent as nought -- and both nought is how a discount is removed, which is why
   * the reason is only insisted on when something is actually being given away.
   */
  const saveDiscount = async () => {
    const percent = Number(discount?.discount_rate) || 0;
    const amount = Number(discount?.discount_amount) || 0;

    const giving = discount?.mode === 'percent' ? percent : amount;

    if (giving > 0 && !String(discount?.reason ?? '').trim()) {
      toast.error('Say why the discount was allowed — it goes on the record beside the figure.');
      return;
    }

    try {
      const result = await dispatch(
        folioDiscount({
          id: Number(id),
          discount_rate: discount?.mode === 'percent' ? percent : 0,
          discount_amount: discount?.mode === 'percent' ? 0 : amount,
          reason: String(discount?.reason ?? '').trim() || null,
        }),
      ).unwrap();

      toast.success(result.message);
      setDiscount(null);
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const moveBill = async () => {
    const owing = Number(bill?.outstanding ?? 0);

    if (owing <= 0) {
      toast.error('Nothing is outstanding on this bill, so there is nothing to move.');
      return;
    }

    try {
      const result = await dispatch(
        billTransfer({
          id: Number(id),
          // ⚠️ null is not "unset" here, it is "move it back to the guest".
          to_party_id: moving?.party ? Number(moving.party.value) : null,
          reason: (moving?.reason ?? '').trim(),
        }),
      ).unwrap();

      toast.success(result.message);
      setMoving(null);
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const savePayment = async () => {
    if (!Number(payment?.amount)) {
      toast.error('How much?');
      return;
    }

    // ⚠️ Checked here as well as at the server. The server's refusal is the one
    // that matters, but it arrives after the clerk has typed a figure and
    // pressed a button in front of a guest — and this one arrives before.
    if (!payment?.coa4_id) {
      toast.error('Which account did the money go into?');
      return;
    }

    try {
      const result = await dispatch(folioReceive({ id: Number(id), ...payment })).unwrap();
      toast.success(result.message);
      setPayment(null);
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  if (loading && !folio) return <Loader />;

  if (!folio) {
    return (
      <div>
        <HelmetTitle title="Folio" />
        <p className="rounded border border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
          That bill could not be opened.
        </p>
      </div>
    );
  }

  const balance = Number(folio.balance ?? 0);

  return (
    <div>
      <HelmetTitle title="Folio" />

      <button
        type="button"
        onClick={() => navigate(routes.hotel_bookings)}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-secondary"
      >
        <FiArrowLeft size={15} /> Back to bookings
      </button>

      {/* ⚠️ Only for what is actually behind, and it names the number. The old
          blanket "nothing is in the accounts" banner came down when the vouchers
          were written; this replaces it and says something narrower and true.
          Rows written before that day keep their NULL and are counted here. */}
      {folio.unposted_rows ? (
        <p className="mb-3 rounded border border-amber-400 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
          <strong>
            {folio.unposted_rows} {folio.unposted_rows === 1 ? 'row is' : 'rows are'} not in the
            accounts.
          </strong>{' '}
          Everything written from now on raises its voucher as it is saved. Pressing{' '}
          <em>Bill the nights</em> also posts any bill line still behind; a receipt taken before
          this was wired up stays as it is, because nothing here knows what happened to that cash.
        </p>
      ) : null}

      {/* The chart heads are missing, so nothing can be posted at all — and
          because posting is now refused rather than deferred, nothing can be
          taken either. Said before the desk brings a guest to the counter. */}
      {folio.chart_missing?.length ? (
        <p className="mb-3 rounded border border-danger bg-rose-50 p-2.5 text-xs text-rose-900 dark:border-danger dark:bg-rose-500/15 dark:text-rose-50">
          <strong>The chart of accounts is not ready, so no money can be taken.</strong> Missing:{' '}
          {folio.chart_missing.join(', ')}. Run the hotel grant file against this company, then
          reload.
        </p>
      ) : null}

      <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-black dark:text-white">
              {booking?.booking_no}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {booking?.booker_name} · {booking?.check_in_date} → {booking?.check_out_date}
            </div>
          </div>

          {/* ⚠️ Three numbers, and the third is the difference between the other
              two rather than a stored figure of its own. */}
          <div className="flex flex-wrap gap-5 text-right">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Charged</div>
              <div className="text-base font-semibold text-black dark:text-white">
                {money(totals?.rounded ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Paid</div>
              <div className="text-base font-semibold text-black dark:text-white">
                {money(folio.paid ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {balance < 0 ? 'In hand' : 'Owed'}
              </div>
              {/* A negative balance is money the hotel is holding, not a debt.
                  Shown as "in hand" and positive, because "−1,000 owed" is read
                  wrongly by everybody at least once. */}
              <div
                className={`text-base font-semibold ${
                  balance > 0
                    ? 'text-danger dark:text-red-400'
                    : 'text-success dark:text-emerald-400'
                }`}
              >
                {money(Math.abs(balance))}
              </div>
            </div>
          </div>
        </div>

        {/* ⚠️ HOW THE CHARGED FIGURE WAS ARRIVED AT, in the order it is worked
            out (client, 2026-08-29): what was sold, the service charge and the
            VAT on THAT, the gross they add up to, and the discount off the
            gross. One line rather than a table -- a guest asking "why 3,097" is
            asking about four numbers, and four numbers read across a line the
            way a sentence does.

            Each part is drawn only where it is not nothing. A property that
            charges no VAT should not have a "VAT 0.00" on every screen; what it
            should have is a bill that says what it says. */}
        {totals ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Charges <strong className="text-black dark:text-white">{money(totals.base)}</strong>
            </span>

            {Number(totals.service_charge) ? (
              <span>
                service {Number(totals.service_charge_rate) ? `${Number(totals.service_charge_rate)}% ` : ''}
                <strong className="text-black dark:text-white">{money(totals.service_charge)}</strong>
              </span>
            ) : null}

            {/* ⚠️ RATE BY RATE, because one bill carries several: 15% on an
                air-conditioned room, 7.5% on a fan one, 5% on dinner. A single
                "VAT 15%" over the sum of them would be a claim the arithmetic
                does not support. Only the rates actually used are named, and a
                bill with one of them reads as it always did. */}
            {Number(totals.vat) ? (
              <span>
                VAT{' '}
                {(totals.vat_bands ?? []).length > 1
                  ? (totals.vat_bands ?? [])
                      .map((band: any) => `${Number(band.rate)}% ${money(band.vat)}`)
                      .join(' · ')
                  : null}
                {(totals.vat_bands ?? []).length > 1 ? null : (
                  <>
                    {(totals.vat_bands ?? [])[0]?.rate
                      ? `${Number((totals.vat_bands ?? [])[0].rate)}% `
                      : ''}
                    <strong className="text-black dark:text-white">{money(totals.vat)}</strong>
                  </>
                )}
              </span>
            ) : null}

            {/* The gross is only worth a word where tax made it differ from the
                charges above it. */}
            {Number(totals.gross) !== Number(totals.base) ? (
              <span>
                gross <strong className="text-black dark:text-white">{money(totals.gross)}</strong>
              </span>
            ) : null}

            {Number(totals.discount) ? (
              <span className="text-primary dark:text-secondary">
                less discount{' '}
                {Number(totals.discount_rate) ? `${Number(totals.discount_rate)}% ` : ''}
                <strong>{money(totals.discount)}</strong>
              </span>
            ) : null}

            {totals.rounding ? (
              <span>
                rounded {money(totals.net)} → {money(totals.rounded)}
              </span>
            ) : null}
          </p>
        ) : null}

        {/* Who allowed it and why, kept beside the figure it explains. A
            discount whose reason lives only in the database is a discount
            nobody at the desk can answer a question about. */}
        {booking?.discount_reason ? (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Discount: {booking.discount_reason}
          </p>
        ) : null}
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {/* ⚠️ Not on a walk-in sale. It holds no room and has no nights, so the
            button could only ever answer "every night is billed already" --
            true, and no help to somebody looking for the meal they served.
            What that bill is made of is added by hand, one charge at a time. */}
        {booking?.booking_type !== 'walk_in' ? (
          <ButtonLoading
            onClick={billNights}
            buttonLoading={saving}
            label={
              folio.unbilled_nights
                ? `Bill ${folio.unbilled_nights} ${
                    folio.unbilled_nights === 1 ? 'night' : 'nights'
                  }`
                : 'Nights all billed'
            }
            variant={folio.unbilled_nights ? 'primary' : 'default'}
            icon={<FiCalendar size={16} />}
            // Billing raises a journal, so an unready chart stops it as surely as
            // having nothing to bill does.
            disabled={!folio.unbilled_nights || !!folio.chart_missing?.length}
          />
        ) : null}
        <ButtonLoading
          onClick={() =>
            setCharge(
              charge
                ? null
                : { charge_type: 'restaurant', description: '', quantity: 1, unit_rate: 0, charge_date: today() },
            )
          }
          label={charge ? 'Close' : 'Add a charge'}
          icon={charge ? <FiX size={16} /> : <FiPlus size={16} />}
          disabled={!!folio.chart_missing?.length}
        />
        <ButtonLoading
          onClick={() =>
            setPayment(
              payment
                ? null
                : {
                    purpose: 'advance',
                    // ⚠️ WHAT IS OWED, ready to take. It is the figure the desk
                    // asks the guest for nine times in ten, and it was being
                    // read off the corner of the screen and typed back in --
                    // which is where a 450 becomes a 45. Still a plain field:
                    // a guest paying half, or rounding up, types over it.
                    //
                    // Blank where nothing is owed. A bill already settled, or
                    // one in credit, has no amount to suggest, and a nought
                    // sitting in the box reads as a figure somebody meant.
                    amount: balance > 0 ? balance.toFixed(2) : '',
                    method: 'cash',
                    payment_date: today(),
                    reference: '',
                    // The first till on the list, which on a property with one
                    // drawer is the only one and saves a decision nobody has.
                    // Wrong on a property with several, which is exactly why
                    // the field sits beside the amount rather than out of sight.
                    coa4_id: tillOptions[0]?.id ?? '',
                  },
            )
          }
          label={payment ? 'Close' : 'Take money'}
          icon={payment ? <FiX size={16} /> : <FiPlus size={16} />}
          disabled={!!folio.chart_missing?.length}
        />
        {/* What comes OFF the bill. Beside the two buttons that put things on
            it, because it is the same kind of act.

            ⚠️ Not offered where it cannot be honoured: a stay already checked
            out has a bill that has been settled and printed, and one on a
            company with no Discount Allowed head has nowhere for the money to
            be debited to. Both are refusals the server would make; offering the
            button anyway would be offering one. */}
        {booking?.status !== 'checked_out'
        && booking?.status !== 'cancelled'
        && folio.can_discount !== false ? (
          <ButtonLoading
            onClick={() =>
              setDiscount(
                discount
                  ? null
                  : {
                      // Whichever way it was given last time, so reopening the
                      // panel shows what is actually on the bill rather than an
                      // empty box beside a discount that exists.
                      mode: Number(booking?.discount_rate) > 0 ? 'percent' : 'amount',
                      discount_rate: Number(booking?.discount_rate) || '',
                      discount_amount: Number(booking?.discount_amount) || '',
                      reason: booking?.discount_reason ?? '',
                    },
              )
            }
            label={discount ? 'Close' : Number(totals?.discount) ? 'Discount…' : 'Give a discount'}
            icon={discount ? <FiX size={16} /> : <FiPercent size={16} />}
            disabled={!!folio.chart_missing?.length}
          />
        ) : null}

        {/* ⚠️ Prints what is ON the bill, and does not bill anything on the way.
            A stay whose nights nobody has billed prints an empty table, which
            is correct -- it is what the guest has been charged. Disabled while
            that is the case, so nobody hands a guest a blank sheet. */}
        <ButtonLoading
          onClick={() =>
            printPaper(
              `${API_HOTEL_FOLIO_URL}/${id}/bill-paper`,
              'hotel_bill',
              `Bill ${booking?.booking_no ?? ''}`,
            )
          }
          buttonLoading={fetchingPaper}
          label="Print the bill"
          icon={<FiPrinter size={16} />}
          disabled={!folio.lines?.length}
        />
        {/* The way out, from the screen where the money was settled.

            ⚠️ Only on a checked-in stay. It is a link rather than the act
            itself: check-out releases beds and bills the remainder, and
            those are decisions taken on a screen that shows them, not on a
            button beside the laundry. */}
        {booking?.status === 'checked_in' ? (
          <ButtonLoading
            onClick={() => navigate(`${routes.hotel_booking_check_out}/${id}`)}
            label="Check out"
            icon={<FiLogOut size={16} />}
          />
        ) : null}

        {/* "Bill it to my office" -- §6.4. Only where something is actually
            outstanding: a settled bill has nothing to move, and offering the
            button anyway would be offering a refusal. */}
        {Number(bill?.outstanding ?? 0) > 0 ? (
          <ButtonLoading
            onClick={() =>
              setMoving(moving ? null : { party: null, reason: '' })
            }
            label={moving ? 'Close' : 'Bill it to…'}
            icon={moving ? <FiX size={16} /> : <FiRepeat size={16} />}
          />
        ) : null}
      </div>

      {/* Who owes this bill. Shown whenever it is not the guest, because a bill
          on a company's account looks exactly like one on the guest's until
          somebody says otherwise -- and the difference is who gets chased. */}
      {bill?.carried ? (
        <p className="mb-3 rounded border border-primary bg-blue-50 p-2.5 text-xs text-blue-900 dark:border-secondary dark:bg-secondary/15 dark:text-blue-50">
          <strong>This bill is {bill.owed_by?.name}&rsquo;s.</strong>{' '}
          {money(bill.outstanding)} outstanding on their account. Money taken from here settles
          them, not the guest.
        </p>
      ) : null}

      {moving ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">
            Move this bill
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {/* Labelled the way InputElement labels its own field, so the two
                labels sit on one line and the two boxes under them do too. */}
            <div className="flex flex-col text-left">
              <label htmlFor="bill_to_party_id" className={FIELD_LABEL}>
                To whom
              </label>
              <DdlMultiline
                id="bill_to_party_id"
                name="to_party_id"
                fetchOptions={findParties}
                defaultOptions
                value={moving.party}
                onSelect={(chosen: any) => setMoving({ ...moving, party: chosen })}
                placeholder="Search a party by name, mobile or code"
              />
              {/* ⚠️ The way back, and §6.4 requires it: without one, a company
                  named by mistake means cancelling the whole bill and typing it
                  again. */}
              {bill?.carried ? (
                <button
                  type="button"
                  onClick={() => setMoving({ ...moving, party: null })}
                  className="mt-1 text-xs font-medium text-primary hover:underline dark:text-secondary"
                >
                  or move it back to the guest
                </button>
              ) : null}
            </div>

            <InputElement
              id="bill_transfer_reason"
              name="reason"
              label="Why, for the record"
              placeholder="Guest asked for it to go to their office"
              value={moving.reason ?? ''}
              onChange={(e: any) => setMoving({ ...moving, reason: e.target.value })}
            />
          </div>

          {/* ⚠️ The two rules people expect to be otherwise, said where the
              decision is made rather than in a manual. */}
          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            Only the <strong>{money(bill?.outstanding)}</strong> still outstanding moves — money
            already received stays with whoever paid it.{' '}
            <strong>Nothing is re-priced:</strong> what changes is who pays, never what it cost.
          </p>

          <div className="mt-3">
            {/* The icon says who ends up paying, which is what the label says too. */}
            <ButtonLoading
              onClick={moveBill}
              buttonLoading={saving}
              icon={
                moving.party ? (
                  <FiBriefcase className="h-5 w-5" />
                ) : (
                  <FiUser className="h-5 w-5" />
                )
              }
              label={
                moving.party ? `Move it to ${moving.party.label}` : 'Move it back to the guest'
              }
              variant="primary"
            />
          </div>

          {bill?.history?.length ? (
            <div className="mt-3 border-t border-stroke pt-2 text-xs dark:border-strokedark">
              <div className="mb-1 font-medium text-black dark:text-white">Where it has been</div>
              {bill.history.map((row: any) => (
                <div key={row.id} className="text-gray-600 dark:text-gray-300">
                  {row.date}: {row.from} → {row.to}, {money(row.amount)}
                  {row.voucher_no ? (
                    <span className="ml-1 font-mono text-[0.65rem]">{row.voucher_no}</span>
                  ) : null}
                  {row.reason ? <span className="ml-1 italic">— {row.reason}</span> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {charge ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">A charge</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <DropdownCommon
              id="charge_type"
              name="charge_type"
              label="For"
              data={chargeOptions}
              value={charge.charge_type}
              onChange={(e: any) => {
                const picked = e.target.value;
                // The suggested rate fills the box in, and only where the box
                // has not been typed into: overwriting a figure somebody just
                // entered because they corrected the charge type would be worse
                // than not suggesting at all.
                const suggested = chargeOptions.find((t: any) => t.id === picked)?.default_rate;

                setCharge({
                  ...charge,
                  charge_type: picked,
                  unit_rate: Number(charge.unit_rate) ? charge.unit_rate : (suggested ?? 0),
                });
              }}
              description="Room rent goes on through Bill the nights."
            />
            <div className="md:col-span-2">
              <InputElement
                id="charge_description"
                name="description"
                label="What for"
                placeholder="Dinner for four"
                value={charge.description}
                onChange={(e: any) => setCharge({ ...charge, description: e.target.value })}
              />
            </div>
            <InputElement
              id="charge_quantity"
              name="quantity"
              label="Quantity"
              type="number"
              min={0}
              value={String(charge.quantity)}
              onChange={(e: any) => setCharge({ ...charge, quantity: e.target.value })}
            />
            <InputElement
              id="charge_rate"
              name="unit_rate"
              label="Rate"
              type="number"
              min={0}
              value={String(charge.unit_rate)}
              onChange={(e: any) => setCharge({ ...charge, unit_rate: e.target.value })}
            />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-5">
            <InputDatePicker
              id="charge_date"
              name="charge_date"
              label="On"
              selectedDate={charge.charge_date ? new Date(charge.charge_date) : null}
              setSelectedDate={(d: Date | null) => setCharge({ ...charge, charge_date: asText(d) })}
              setCurrentDate={(d: Date | null) => setCharge({ ...charge, charge_date: asText(d) })}
              className="w-full"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            The line carries what was sold and what it cost. VAT and service charge are the whole
            bill&rsquo;s, worked out once at the rates this bill was opened at.
          </p>
          <div className="mt-3">
            <ButtonLoading
              onClick={saveCharge}
              buttonLoading={saving}
              icon={<FiPlus className="h-5 w-5" />}
              label="Add to the bill"
              variant="primary"
            />
          </div>
        </div>
      ) : null}

      {discount ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">
            Discount on this bill
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <DropdownCommon
              id="discount_mode"
              name="mode"
              label="Given as"
              data={[
                { id: 'percent', name: 'A percentage' },
                { id: 'amount', name: 'An amount' },
              ]}
              value={discount.mode}
              onChange={(e: any) => setDiscount({ ...discount, mode: e.target.value })}
              description="A percentage follows the bill; an amount is the amount."
            />

            {discount.mode === 'percent' ? (
              <InputElement
                id="discount_rate"
                name="discount_rate"
                label="Percent off"
                type="number"
                min={0}
                max={100}
                value={String(discount.discount_rate ?? '')}
                onChange={(e: any) => setDiscount({ ...discount, discount_rate: e.target.value })}
                description="Of the gross — charges plus service and VAT."
              />
            ) : (
              <InputElement
                id="discount_amount"
                name="discount_amount"
                label="Amount off"
                type="number"
                min={0}
                value={String(discount.discount_amount ?? '')}
                onChange={(e: any) => setDiscount({ ...discount, discount_amount: e.target.value })}
                description="Never more than the bill itself."
              />
            )}

            <div className="md:col-span-2">
              <InputElement
                id="discount_reason"
                name="reason"
                label="Why"
                placeholder="Manager agreed — air conditioning out on the first night"
                value={discount.reason ?? ''}
                onChange={(e: any) => setDiscount({ ...discount, reason: e.target.value })}
                description="Kept on the booking beside the figure, with who allowed it."
              />
            </div>
          </div>

          {/* ⚠️ Said plainly, because it is the part that surprises people. The
              discount comes off the GROSS -- the tax is worked out on the full
              tariff first -- and where the nights are already in the books,
              saving this writes a voucher of its own rather than editing one. */}
          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            Taken off the gross, after the service charge and VAT — both of those are worked out
            on the room and charges. Debited to <strong>Hotel Discount Allowed</strong>, never
            taken off the rent: a room let at 6,000 with 600 off is a 6,000 room and a 600
            discount.
            {Number(totals?.discount)
              ? ' Setting both boxes to nought removes the discount that is on this bill.'
              : ''}
          </p>

          <div className="mt-3">
            <ButtonLoading
              onClick={saveDiscount}
              buttonLoading={saving}
              icon={<FiPercent className="h-5 w-5" />}
              label={
                (discount.mode === 'percent'
                  ? Number(discount.discount_rate)
                  : Number(discount.discount_amount)) > 0
                  ? 'Allow the discount'
                  : 'Remove the discount'
              }
              variant="primary"
            />
          </div>
        </div>
      ) : null}

      {payment ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">Money</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <DropdownCommon
              id="payment_purpose"
              name="purpose"
              label="What for"
              data={PURPOSE_OPTIONS}
              value={payment.purpose}
              onChange={(e: any) => setPayment({ ...payment, purpose: e.target.value })}
            />
            <InputElement
              id="payment_amount"
              name="amount"
              label="Amount"
              type="number"
              min={0}
              value={String(payment.amount)}
              onChange={(e: any) => setPayment({ ...payment, amount: e.target.value })}
            />
            <DropdownCommon
              id="payment_method"
              name="method"
              label="How"
              data={METHOD_OPTIONS}
              value={payment.method}
              onChange={(e: any) => setPayment({ ...payment, method: e.target.value })}
            />
            <InputDatePicker
              id="payment_date"
              name="payment_date"
              label="On"
              selectedDate={payment.payment_date ? new Date(payment.payment_date) : null}
              setSelectedDate={(d: Date | null) => setPayment({ ...payment, payment_date: asText(d) })}
              setCurrentDate={(d: Date | null) => setPayment({ ...payment, payment_date: asText(d) })}
              className="w-full"
            />
            <InputElement
              id="payment_reference"
              name="reference"
              label="Reference"
              placeholder="Cheque or txn no"
              value={payment.reference ?? ''}
              onChange={(e: any) => setPayment({ ...payment, reference: e.target.value })}
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-5">
            {/* ⚠️ The ACCOUNT, which is not the same question as "How" above.
                Method is how the guest handed it over; this is which of the
                hotel's own drawers it ended up in, and it is what the voucher
                is written against. A card payment is a bank account. */}
            <div className="md:col-span-2">
              <DropdownCommon
                id="payment_coa4_id"
                name="coa4_id"
                label="Into which account"
                data={tillOptions}
                value={payment.coa4_id ?? ''}
                onChange={(e: any) => setPayment({ ...payment, coa4_id: e.target.value })}
                description={
                  payment.purpose === 'refund'
                    ? 'The account the refund is paid out of.'
                    : 'The cash or bank head the voucher is written against.'
                }
              />
            </div>
          </div>

          {/* ⚠️ The one thing about this form that somebody could get wrong,
              said where the money is being taken rather than in a manual. */}
          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            An advance is money held, not income — it stays a liability until the nights are
            billed. <strong>A receipt printed from here is a money receipt, never a VAT
            invoice:</strong> the VAT falls due on the bill. Saving raises the voucher at the same
            moment, so the number appears against the row.
          </p>

          <div className="mt-3">
            {/* Money in or money out, which is the only thing the two labels differ on. */}
            <ButtonLoading
              onClick={savePayment}
              buttonLoading={saving}
              icon={
                payment.purpose === 'refund' ? (
                  <FiUpload className="h-5 w-5" />
                ) : (
                  <FiDownload className="h-5 w-5" />
                )
              }
              label={payment.purpose === 'refund' ? 'Give it back' : 'Take the money'}
              variant="primary"
            />
          </div>
        </div>
      ) : null}

      <div className="mb-2 text-sm font-medium text-black dark:text-white">The bill</div>
      <Table
        columns={lineColumns}
        data={foldBill(folio.lines ?? [])}
        noDataMessage={
          booking?.booking_type === 'walk_in'
            ? 'Nothing on the bill yet. Press Add a charge to put what was sold on it.'
            : 'Nothing on the bill yet. Press Bill the nights to put the rooms on it.'
        }
      />

      <div className="mb-2 mt-5 text-sm font-medium text-black dark:text-white">Money</div>
      <Table
        columns={paymentColumns}
        data={folio.payments ?? []}
        noDataMessage="Nothing taken yet."
      />

      {/* Mounted only while a paper is on its way to the printer. It has to be
          in the DOM for react-to-print to copy it, and it must not be seen on
          screen -- the desk asked for paper, not for a preview. */}
      <div className="hidden">
        {paper ? (
          <DocumentPrint ref={paperRef} template={paper.template} data={paper.data} />
        ) : null}
      </div>
    </div>
  );
};

export default FolioScreen;
