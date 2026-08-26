import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiCalendar, FiLogOut, FiPlus, FiPrinter } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputDatePicker from '../../../utils/fields/DatePicker';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import {
  PrintTemplate,
  defaultTemplate,
  normalizeTemplate,
} from '../../../utils/print-designer/printTemplate';
import httpService from '../../../services/httpService';
import { API_HOTEL_FOLIO_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import { money } from '../setupHelpers';
import {
  clearFolio,
  folioBill,
  folioCharge,
  folioReceive,
  folioRead,
  tillList,
} from './bookingSlice';

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

// room_rent is deliberately absent. It goes on through "Bill the nights", which
// is the only path that carries a room and a night -- and therefore the only one
// the same-night-twice key can see. See FolioController::addCharge.
const CHARGE_OPTIONS = [
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

const FolioScreen = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();

  const folio = useSelector((state: any) => state.hotelBooking.folio);
  const loading = useSelector((state: any) => state.hotelBooking.loading);
  const saving = useSelector((state: any) => state.hotelBooking.saving);
  const tills = useSelector((state: any) => state.hotelBooking.tills);

  const [charge, setCharge] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);

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

      setPaper({
        template: payload.layout
          ? normalizeTemplate(payload.layout, docType)
          : defaultTemplate(docType),
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

  useEffect(() => {
    load();

    return () => {
      dispatch(clearFolio());
    };
  }, [load, dispatch]);

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
            <div className="text-black dark:text-white">{row.description}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {(row.charge_type ?? '').replace('_', ' ')}
            </div>
          </div>
        ),
      },
      {
        key: 'base_amount',
        header: 'Amount',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => (
          <div>
            <div>{money(row.base_amount)}</div>
            {Number(row.quantity) !== 1 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {row.quantity} × {money(row.unit_rate)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'service_charge_amount',
        header: 'Service',
        headerClass: 'text-right',
        cellClass: 'text-right',
        // ⚠️ The rate is shown from the column, never worked back out of the
        // money. A rate divided out of a rounded amount is a rate that drifts.
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
        render: (row: any) =>
          Number(row.vat_amount) ? (
            <div>
              <div>{money(row.vat_amount)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{row.vat_rate}%</div>
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
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
    [],
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

        {totals?.rounding ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Rounded once on the total: {money(totals.gross)} → {money(totals.rounded)}
          </p>
        ) : null}
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
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
        <ButtonLoading
          onClick={() =>
            setCharge(
              charge
                ? null
                : { charge_type: 'restaurant', description: '', quantity: 1, unit_rate: 0, charge_date: today() },
            )
          }
          label={charge ? 'Close' : 'Add a charge'}
          icon={<FiPlus size={16} />}
          disabled={!!folio.chart_missing?.length}
        />
        <ButtonLoading
          onClick={() =>
            setPayment(
              payment
                ? null
                : {
                    purpose: 'advance',
                    amount: '',
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
          icon={<FiPlus size={16} />}
          disabled={!!folio.chart_missing?.length}
        />
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
      </div>

      {charge ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">A charge</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <DropdownCommon
              id="charge_type"
              name="charge_type"
              label="For"
              data={CHARGE_OPTIONS}
              value={charge.charge_type}
              onChange={(e: any) => setCharge({ ...charge, charge_type: e.target.value })}
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
            The VAT and service charge in force on that date are applied and frozen onto the
            line.
          </p>
          <div className="mt-3">
            <ButtonLoading
              onClick={saveCharge}
              buttonLoading={saving}
              label="Add to the bill"
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
            <ButtonLoading
              onClick={savePayment}
              buttonLoading={saving}
              label={payment.purpose === 'refund' ? 'Give it back' : 'Take the money'}
              variant="primary"
            />
          </div>
        </div>
      ) : null}

      <div className="mb-2 text-sm font-medium text-black dark:text-white">The bill</div>
      <Table
        columns={lineColumns}
        data={folio.lines ?? []}
        noDataMessage="Nothing on the bill yet. Press Bill the nights to put the rooms on it."
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
