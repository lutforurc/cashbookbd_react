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
 *
 * ⚠️ AND IT NOW REACHES THE LEDGER (spec 5, 2026-08-26). Ending a stay raises a
 * journal for the nights it bills, and a SECOND one where a balance is carried
 * -- Dr the party, Cr Advance Against Booking -- so the receivable arrives in
 * that party's own ledger with a voucher explaining it. The amber banner that
 * used to say none of this happened has come down.
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

  /**
   * The rooms leaving, or null for "whatever the server takes as all of them".
   *
   * ⚠️ NULL IS NOT AN EMPTY LIST. Sending no rooms means every room -- which is
   * what this screen meant before §6.5 and still means on the ordinary
   * departure. An empty array would mean the same thing to the server, which is
   * why the toggle below refuses to empty it.
   */
  const [picked, setPicked] = useState<number[] | null>(null);

  const load = useCallback(
    (on: string, rooms: number[] | null) => {
      if (id) {
        dispatch(
          checkoutRead({
            id: Number(id),
            departure_date: on,
            resource_ids: rooms ?? undefined,
          }),
        );
      }
    },
    [dispatch, id],
  );

  // Read again on every change of date OR of which rooms are going. See the
  // header: the figures belong to the date and the rooms, not to the booking.
  useEffect(() => {
    load(departure, picked);
  }, [load, departure, picked]);

  useEffect(() => () => {
    dispatch(clearCheckout());
  }, [dispatch]);

  const booking = plan?.booking;
  const totals = plan?.totals;
  const balance = Number(plan?.balance ?? 0);

  const rooms: any[] = plan?.rooms ?? [];

  // ⚠️ Whether this check-out ENDS the stay, which is the server's answer and
  // not a count done here. Everything about money on this screen hangs on it: a
  // room going home mid-stay settles nothing, because one stay is one bill.
  const closing = plan ? plan.closes_booking !== false : true;

  // Already on the booking, so a corporate stay taken on the telephone does not
  // have to be looked up again at the desk.
  const alreadyBilledTo = booking?.billed_to_party_id;
  const needsParty = closing && balance > 0 && !party && !alreadyBilledTo;

  /**
   * Tick a room on or off.
   *
   * ⚠️ Never down to nothing. An empty list reads to the server as "all rooms",
   * so a desk that unticked the last one would be shown the figures for the
   * whole stay and press the button on them.
   */
  const toggle = (roomId: number) => {
    const on = rooms
      .filter((room: any) => room.chosen && !room.already_left)
      .map((room: any) => Number(room.room_resource_id));

    const next = on.includes(roomId)
      ? on.filter((held: number) => held !== roomId)
      : [...on, roomId];

    if (next.length) setPicked(next);
  };

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
        // ⚠️ Without this the table is unreadable the moment a booking has two
        // rooms: four identical "Whole room, 2,500" lines and nothing saying
        // which room each belongs to.
        key: 'room',
        header: 'Room',
        render: (row: any) => row.room ?? '—',
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

          // ⚠️ What is on the SCREEN, read back from the plan rather than from
          // `picked` -- which is null until somebody unticks something, and
          // would send nothing on the very departure it was meant to describe.
          resource_ids: rooms
            .filter((room: any) => room.chosen && !room.already_left)
            .map((room: any) => Number(room.room_resource_id)),
        }),
      ).unwrap();

      toast.success(result.message);
      setAsking(false);

      // ⚠️ A stay that is still running stays on this screen. The desk has
      // guests upstairs and often another room to let go in the same breath,
      // and sending it back to the list would make it find the booking again.
      // The ticks are cleared with it: the rooms just released are gone, and
      // holding them in `picked` would ask the server for a check-out of rooms
      // that have already left.
      if (result?.data?.closes_booking === false) {
        setPicked(null);
        setParty(null);
        setReason('');

        return;
      }

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
          {picked
            ? `The rooms you picked cannot be checked out on ${departure}. Try another date, or go back to every room.`
            : `This stay cannot be checked out on ${departure}. Try another date, or open the booking to extend it.`}
        </p>

        {/* ⚠️ THE WAY OUT OF A CORNER. A refused date wipes the plan, and the
            room picker goes with it — so a desk that ticked one room and then
            chose a date that room cannot leave on would be left with a date
            box that refuses every answer, and no way to untick anything. */}
        {picked ? (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="text-sm font-medium text-primary hover:underline dark:text-secondary"
            >
              Check out every room instead
            </button>
          </div>
        ) : null}

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

      {/* ⚠️ The amber "not in the accounts" banner came down on 2026-08-26,
          when the vouchers of spec 5 were written — checking out now raises a
          journal for the nights and a second one for a balance carried to a
          party. What replaces it is the one thing that can still stop it. */}
      {plan.chart_missing?.length ? (
        <p className="mb-3 rounded border border-danger bg-rose-50 p-2.5 text-xs text-rose-900 dark:border-danger dark:bg-rose-500/15 dark:text-rose-50">
          <strong>The chart of accounts is not ready, so this stay cannot be ended.</strong>{' '}
          Missing: {plan.chart_missing.join(', ')}. Run the hotel grant file against this
          company, then reload — the guest can wait at the desk, but the beds must not be
          released without the bill going into the books.
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
          {plan.nights_to_bill === 1 ? 'night' : 'nights'}{' '}
          {closing ? '' : `in the ${plan.rooms_leaving === 1 ? 'room' : 'rooms'} leaving `}
          still to be billed. The folio will not show them until check-out puts them on it.
          {closing ? null : (
            <>
              {' '}
              The rooms staying behind are not billed today — their nights have not been
              slept yet.
            </>
          )}
        </p>
      </div>

      {/* ⚠️ The rooms, before the date. A stay is not always ended all at once
          (§6.5): guests in one room of four can go home on Wednesday, and the
          desk decides WHO is leaving before it decides anything else. Shown
          only where there is a choice to make — one room needs no picker. */}
      {rooms.length > 1 ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">
            Which rooms are leaving?
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room: any) => {
              const roomId = Number(room.room_resource_id);

              // ⚠️ Already LEFT, not "nothing pending". A room whose nights the
              // night audit billed days ago is pending nothing and is still
              // full of guests -- ticking it is exactly what ends their stay.
              const gone = !!room.already_left;

              return (
                <label
                  key={roomId}
                  className={`flex items-start gap-2 rounded border p-2 text-sm ${
                    gone
                      ? 'cursor-not-allowed border-stroke opacity-60 dark:border-strokedark'
                      : room.chosen
                        ? 'cursor-pointer border-primary bg-primary/5 dark:border-secondary'
                        : 'cursor-pointer border-stroke dark:border-strokedark'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={!gone && !!room.chosen}
                    disabled={gone}
                    onChange={() => toggle(roomId)}
                  />

                  <span className="leading-snug">
                    <span className="block font-medium text-black dark:text-white">
                      {room.room}
                    </span>

                    {/* A room already let go says so instead of showing figures
                        that are all zero — the desk asks why they are zero. */}
                    {gone ? (
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        Already left — {room.nights_held}{' '}
                        {room.nights_held === 1 ? 'night' : 'nights'} kept
                      </span>
                    ) : (
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {room.nights_to_bill} to bill
                        {room.nights_to_release
                          ? `, ${room.nights_to_release} to release`
                          : ''}{' '}
                        · through {room.last_night}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            {closing ? (
              <>
                Every room still on this stay is leaving, so the booking will be closed
                and the bill answered for.
              </>
            ) : (
              <>
                <strong className="text-black dark:text-white">
                  {plan.rooms_staying}{' '}
                  {plan.rooms_staying === 1 ? 'room stays' : 'rooms stay'} occupied
                </strong>{' '}
                — the booking stays open and the bill stays with it. Nothing has to be
                settled until the last room goes.
              </>
            )}
          </p>
        </div>
      ) : null}

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

      {/* Only when there is something to carry, and only when the stay is
          actually ending. A party picker on a settled bill invites somebody to
          fill it in and put a paid stay on an account; one on a partial
          check-out invites them to bill a company for a stay still running. */}
      {closing && balance > 0 ? (
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

      {/* ⚠️ NIGHTS ALREADY CHARGED THAT ARE BEING GIVEN BACK. Screen 5 bills
          every night a booking holds, future ones included — so a stay billed
          on Monday and cut short on Wednesday has the guest paying for nights
          they will not sleep. The rows go; the folio lines stay, because taking
          money back off a bill is a credit note and this module has none. Said
          here, before the button, so the desk adjusts the folio rather than
          finding out from the guest. */}
      {plan.billed_ahead ? (
        <p className="mb-4 rounded border border-warning bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-warning dark:bg-amber-500/15 dark:text-amber-50">
          <strong>
            {plan.billed_ahead} {plan.billed_ahead === 1 ? 'night' : 'nights'} already on
            the bill {plan.billed_ahead === 1 ? 'is' : 'are'} being given back.
          </strong>{' '}
          Somebody billed these nights in advance, and the guest is not staying them.
          Check-out will not take them off — adjust the folio before or after, or the
          guest pays for a room they left.
        </p>
      ) : null}

      {/* ⚠️ Only at the end, like the party picker. Money in hand over the bill
          is the ORDINARY state of a stay that took an advance and still has
          rooms occupied — refusing a room's departure over it would make an
          advance impossible to take. */}
      {closing && balance < 0 ? (
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
          // Says what it will do. "Check out" on a booking where three rooms
          // are staying reads as ending the stay, which it is not.
          label={
            closing
              ? 'Check out'
              : `Check out ${plan.rooms_leaving} ${
                  plan.rooms_leaving === 1 ? 'room' : 'rooms'
                }`
          }
          variant="primary"
          icon={<FiLogOut size={16} />}
          // The third reason it can be refused, and the only one the desk
          // cannot fix from this screen: the chart has no heads to post to.
          disabled={
            needsParty
            || (closing && balance < 0)
            || !plan.rooms_leaving
            || !!plan.chart_missing?.length
          }
        />
        {needsParty ? (
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
            Name the party carrying the balance first.
          </span>
        ) : !plan.rooms_leaving ? (
          // The button is dead and the reason is not on the screen otherwise:
          // every room ticked has already been let go.
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
            Tick a room that has not left yet.
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
        title={closing ? 'End this stay' : 'Let these rooms go'}
        confirmLabel="Check out"
        cancelLabel="Not yet"
        className="bg-primary hover:bg-primary/90"
        loading={saving}
        onCancel={() => setAsking(false)}
        onConfirm={confirm}
        message={
          <>
            <span className="block">
              {closing ? (
                <>
                  <strong className="text-black dark:text-white">
                    {booking?.booking_no}
                  </strong>{' '}
                  leaves on {departure}.
                </>
              ) : (
                <>
                  <strong className="text-black dark:text-white">
                    {rooms
                      .filter((room: any) => room.chosen && !room.already_left)
                      .map((room: any) => room.room)
                      .join(', ')}
                  </strong>{' '}
                  {plan.rooms_leaving === 1 ? 'leaves' : 'leave'} {booking?.booking_no} on{' '}
                  {departure}.
                </>
              )}
            </span>

            {plan.nights_to_bill ? (
              <span className="mt-2 block">
                {plan.nights_to_bill} {plan.nights_to_bill === 1 ? 'night' : 'nights'} will go
                on the bill at the rates in force on {plan.nights_to_bill === 1 ? 'it' : 'each'}.
              </span>
            ) : null}

            {plan.billed_ahead ? (
              <span className="mt-2 block text-danger dark:text-red-400">
                {plan.billed_ahead} of those {plan.billed_ahead === 1 ? 'night is' : 'nights are'}{' '}
                already on the bill and will not come off it.
              </span>
            ) : null}

            {/* ⚠️ The irreversible half, said in the dialog rather than after. */}
            {plan.nights_released ? (
              <span className="mt-2 block text-danger dark:text-red-400">
                {plan.nights_released} bed-{plan.nights_released === 1 ? 'night' : 'nights'}{' '}
                will be released and can be sold to somebody else. This cannot be undone.
              </span>
            ) : null}

            {/* ⚠️ On a partial check-out the money is not answered for at all,
                and the dialog says so rather than staying silent — the desk is
                about to send a guest away and needs to know the bill is still
                running. */}
            {!closing ? (
              <span className="mt-2 block">
                The stay goes on in {plan.rooms_staying}{' '}
                {plan.rooms_staying === 1 ? 'room' : 'rooms'}, so nothing is settled
                today. {money(balance)} stands on the bill.
              </span>
            ) : balance > 0 ? (
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
