import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiLogOut } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import httpService from '../../../services/httpService';
import { API_HOTEL_PARTY_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import { money } from '../setupHelpers';
import { checkoutRead, checkoutSave, clearCheckout } from './bookingSlice';

/**
 * Letting the guest go -- screen 6.
 *
 * ⚠️ THE BALANCE HERE IS NOT THE FOLIO'S, and that is the single thing about
 * this screen worth understanding. The folio shows what has been CHARGED; this
 * shows what will have been charged once the remaining nights are billed --
 * which, on the morning a guest actually leaves, is usually the whole stay.
 * Showing the folio's figure here would send them away owing everything.
 *
 * ⚠️ EVERY NUMBER IS CONDITIONAL ON THE DEPARTURE DATE. Change the date and the
 * plan is read again from the server rather than filtered here: which nights go
 * back, which get billed and what the rates on them were are all the server's
 * arithmetic, and a second copy on this screen would be a second answer.
 *
 * ⚠️ THIS ONE DELETES THINGS. The nights the guest is not staying are released
 * so the beds can be sold again, and there is no undo -- which is why the
 * button asks first, and why the dialog says what is about to go.
 *
 * ⚠️ A BALANCE MUST BE SOMEBODY'S. The server refuses to end a stay that still
 * owes money with nobody's name against it: either it is settled on the folio,
 * or it is carried to a named party. That is a decision of the business, not a
 * validation rule to be worked around -- an anonymous due is a receivable
 * nobody can ever chase.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a date at the desk is a calendar date,
  // and going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const today = () => asText(new Date());

/**
 * Parties, for the balance that is going on somebody's account.
 *
 * ⚠️ Answers cust_party_infos.id, which is what billed_to_party_id points at.
 * The chart dropdowns elsewhere in this app answer coa4 ids and are NOT
 * interchangeable with it, which is why this does not reuse one of them.
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

const CheckOutScreen = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();

  const plan = useSelector((state: any) => state.hotelBooking.checkout);
  const loading = useSelector((state: any) => state.hotelBooking.loading);
  const saving = useSelector((state: any) => state.hotelBooking.saving);

  const [departure, setDeparture] = useState<string>(today());
  const [party, setParty] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);

  const load = useCallback(
    (on: string) => {
      if (id) dispatch(checkoutRead({ id: Number(id), departure_date: on }));
    },
    [dispatch, id],
  );

  // Read again on every change of date. See the header: the figures belong to
  // the date, not to the booking.
  useEffect(() => {
    load(departure);
  }, [load, departure]);

  useEffect(() => () => {
    dispatch(clearCheckout());
  }, [dispatch]);

  const booking = plan?.booking;
  const totals = plan?.totals;
  const balance = Number(plan?.balance ?? 0);

  // Already on the booking, so a corporate stay taken on the telephone does not
  // have to be looked up again at the desk.
  const alreadyBilledTo = booking?.billed_to_party_id;
  const needsParty = balance > 0 && !party && !alreadyBilledTo;

  const nightColumns = useMemo(
    () => [
      {
        key: 'stay_date',
        header: 'Night',
        render: (row: any) => (
          <span className="text-black dark:text-white">{row.stay_date}</span>
        ),
      },
      {
        key: 'let_as',
        header: 'Let as',
        render: (row: any) => (row.let_as === 'seat' ? 'By the bed' : 'Whole room'),
      },
      {
        key: 'rent',
        header: 'Rent',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => money(row.rent ?? 0),
      },
    ],
    [],
  );

  const confirm = async () => {
    try {
      const result = await dispatch(
        checkoutSave({
          id: Number(id),
          departure_date: departure,
          billed_to_party_id: party?.value ? Number(party.value) : undefined,
          reason: reason.trim() || undefined,
        }),
      ).unwrap();

      toast.success(result.message);
      setAsking(false);
      navigate(routes.hotel_bookings);
    } catch (error: any) {
      // The server's own sentence, which names the figure still owing or the
      // date it refused. A replacement here would say less.
      toast.error(String(error));
      setAsking(false);
    }
  };

  if (loading && !plan) return <Loader />;

  if (!plan) {
    return (
      <div>
        <HelmetTitle title="Check out" />

        <button
          type="button"
          onClick={() => navigate(routes.hotel_bookings)}
          className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-secondary"
        >
          <FiArrowLeft size={15} /> Back to bookings
        </button>

        {/* The server refuses a departure it cannot make sense of -- a day
            after the booking ends, or one nobody slept -- and says why. The
            date box stays so the desk can answer it rather than go back. */}
        <p className="rounded border border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
          This stay cannot be checked out on {departure}. Try another date, or open the
          booking to extend it.
        </p>

        <div className="mt-3 max-w-xs">
          <InputDatePicker
            id="departure_retry"
            name="departure_date"
            label="Leaving on"
            selectedDate={departure ? new Date(departure) : null}
            setSelectedDate={(d: Date | null) => setDeparture(asText(d) || today())}
            setCurrentDate={(d: Date | null) => setDeparture(asText(d) || today())}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <HelmetTitle title="Check out" />

      <button
        type="button"
        onClick={() => navigate(routes.hotel_bookings)}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-secondary"
      >
        <FiArrowLeft size={15} /> Back to bookings
      </button>

      {/* ⚠️ Said plainly, as on the folio. Ending a stay is where somebody most
          expects the books to move, and they do not. It comes down when the
          vouchers of spec 5 are written, not before. */}
      {plan.posted_to_ledger === false ? (
        <p className="mb-3 rounded border border-amber-400 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
          <strong>Not yet in the accounts.</strong> Checking out records the bill and the
          money here; it raises no voucher, and a balance carried to a party does not appear
          in that party&rsquo;s ledger yet.
        </p>
      ) : null}

      <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-black dark:text-white">
              {booking?.booking_no}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {booking?.booker_name} · booked {booking?.check_in_date} →{' '}
              {plan.booked_out_on}
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-right">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">To be charged</div>
              <div className="text-base font-semibold text-black dark:text-white">
                {money(totals?.rounded ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Paid</div>
              <div className="text-base font-semibold text-black dark:text-white">
                {money(plan.paid ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {balance < 0 ? 'In hand' : 'To settle'}
              </div>
              {/* A negative balance is the guest's money, not a debt. Shown as
                  "in hand" and positive: "−500 to settle" is read wrongly by
                  everybody at least once. */}
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

        {/* ⚠️ The figure above is not the folio's. Said here rather than left
            for somebody to discover by comparing two screens. */}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          This counts the {plan.nights_to_bill}{' '}
          {plan.nights_to_bill === 1 ? 'night' : 'nights'} still to be billed. The folio will
          not show them until check-out puts them on it.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <InputDatePicker
          id="departure_date"
          name="departure_date"
          label="Leaving on"
          selectedDate={departure ? new Date(departure) : null}
          setSelectedDate={(d: Date | null) => setDeparture(asText(d) || today())}
          setCurrentDate={(d: Date | null) => setDeparture(asText(d) || today())}
          className="w-full"
        />

        <div className="md:col-span-2 flex items-end">
          {/* The check-out day is not a night (spec: 15th to 18th is three
              nights). Worth saying beside the date, because the desk reads the
              box as "last night here" at least once. */}
          <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
            The day they leave is not charged as a night.
            {plan.leaving_early ? (
              <>
                {' '}
                <strong className="text-danger dark:text-red-400">
                  {plan.nights_released} bed-{plan.nights_released === 1 ? 'night' : 'nights'}
                </strong>{' '}
                will go back on the market — this is an early departure.
              </>
            ) : (
              ' They are leaving on the day the booking ends, so nothing goes back.'
            )}
          </p>
        </div>
      </div>

      {/* Only when there is something to carry. A party picker on a settled
          bill invites somebody to fill it in, and put a paid stay on an
          account. */}
      {balance > 0 ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">
            Who owes the {money(balance)}?
          </div>

          {alreadyBilledTo && !party ? (
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              This booking is already billed to a party, and the balance will go to them.
              Choose somebody below to send it elsewhere instead.
            </p>
          ) : null}

          <div className="max-w-lg">
            <DdlMultiline
              id="billed_to_party_id"
              name="billed_to_party_id"
              fetchOptions={findParties}
              defaultOptions
              value={party}
              onSelect={(chosen: any) => setParty(chosen)}
              placeholder="Search a party by name, mobile or code"
            />
          </div>

          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            Settle it on the folio instead if the guest is paying now. A balance cannot be
            left against nobody — there would be no account to chase it on.
          </p>
        </div>
      ) : null}

      {balance < 0 ? (
        <p className="mb-4 rounded border border-danger bg-rose-50 p-2.5 text-xs text-rose-900 dark:border-danger dark:bg-rose-500/15 dark:text-rose-50">
          <strong>{money(Math.abs(balance))} is being held over the bill.</strong> Refund it
          on the folio before checking out — this screen will not keep it.
        </p>
      ) : null}

      <div className="mb-4 max-w-lg">
        <InputElement
          id="checkout_reason"
          name="reason"
          label="Note (optional)"
          placeholder="Left a day early — family emergency"
          value={reason}
          onChange={(e: any) => setReason(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Kept with the booking&rsquo;s history, where it can be counted and attributed —
          not appended to the notes.
        </p>
      </div>

      <div className="mb-5">
        <ButtonLoading
          onClick={() => setAsking(true)}
          buttonLoading={saving}
          label="Check out"
          variant="primary"
          icon={<FiLogOut size={16} />}
          disabled={needsParty || balance < 0}
        />
        {needsParty ? (
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
            Name the party carrying the balance first.
          </span>
        ) : null}
      </div>

      <div className="mb-2 text-sm font-medium text-black dark:text-white">
        Nights going on the bill
      </div>
      <Table
        columns={nightColumns}
        data={plan.lines_to_add ?? []}
        noDataMessage="Every night slept is already on the bill."
      />

      {/* The app's own dialog, not the browser's. It can say what is about to
          be destroyed, which is the part that cannot be taken back. */}
      <ConfirmModal
        show={asking}
        title="End this stay"
        confirmLabel="Check out"
        cancelLabel="Not yet"
        className="bg-primary hover:bg-primary/90"
        loading={saving}
        onCancel={() => setAsking(false)}
        onConfirm={confirm}
        message={
          <>
            <span className="block">
              <strong className="text-black dark:text-white">{booking?.booking_no}</strong>{' '}
              leaves on {departure}.
            </span>

            {plan.nights_to_bill ? (
              <span className="mt-2 block">
                {plan.nights_to_bill} {plan.nights_to_bill === 1 ? 'night' : 'nights'} will go
                on the bill at the rates in force on {plan.nights_to_bill === 1 ? 'it' : 'each'}.
              </span>
            ) : null}

            {/* ⚠️ The irreversible half, said in the dialog rather than after. */}
            {plan.nights_released ? (
              <span className="mt-2 block text-danger dark:text-red-400">
                {plan.nights_released} bed-{plan.nights_released === 1 ? 'night' : 'nights'}{' '}
                will be released and can be sold to somebody else. This cannot be undone.
              </span>
            ) : null}

            {balance > 0 ? (
              <span className="mt-2 block">
                {money(balance)} will be carried to{' '}
                <strong className="text-black dark:text-white">
                  {party?.label ?? 'the party already on this booking'}
                </strong>
                .
              </span>
            ) : (
              <span className="mt-2 block">Nothing is left owing.</span>
            )}
          </>
        }
      />
    </div>
  );
};

export default CheckOutScreen;
