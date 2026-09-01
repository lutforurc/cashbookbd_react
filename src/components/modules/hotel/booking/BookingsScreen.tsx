import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import SearchInput from '../../../utils/fields/SearchInput';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { Textarea } from '../../../utils/fields/FormControls';

import routes from '../../../services/appRoutes';
import SetupShell from '../SetupShell';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { clockTime, money, useDebounced } from '../setupHelpers';
import {
  billRead,
  bookingCancel,
  bookingList,
  folioRead,
  cancellationRead,
  clearBookings,
  clearCancellation,
  tillList,
} from './bookingSlice';
import formatDate, { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';

/**
 * Bookings -- the list, and the doors out of it.
 *
 * ⚠️ TAKING A BOOKING IS A PAGE OF ITS OWN, and used to be a panel folded out
 * above this table. What that panel held -- a whole property's availability
 * grid, its halls with their sittings, the party's details -- had outgrown a
 * fold-out by a long way, and none of it had an address: a half-filled booking
 * could not be reopened, Back closed nothing, and nobody could send a colleague
 * a link to the booking they were arguing about. New and Edit navigate to
 * BookingFormScreen; nothing on this screen writes a booking any more.
 *
 * What is left is a list and five doors: Edit, Check in, the Bill, Check out
 * and Cancel. One booking is opened by four different screens over its life --
 * one record, never four mechanisms -- and this is the page that knows where
 * they all are.
 *
 * ⚠️ THE FILTERS AND THE PAGE RIDE IN THE ADDRESS. They were state, which was
 * fine while the form never left the screen; now that it does, state would mean
 * a clerk who saved a booking from page three of the held ones came back to
 * page one of everything. The form carries this address with it and returns to
 * it -- see `goToForm`.
 */

/**
 * What kind of sale the list is about.
 *
 * ⚠️ Rooms and halls by default, and the default matters. A restaurant serves
 * more people in a fortnight than the rooms take in a year, so a list holding
 * both would bury the stays this screen exists to run -- the desk would be
 * paging past lunches to find who is arriving tonight. Asked for by name, the
 * meals come on their own; asked for together, everything the property sold.
 */
const KIND_OPTIONS = [
  { id: 'stay', name: 'Rooms & halls' },
  { id: 'walk_in', name: 'Walk-in only' },
  { id: 'all', name: 'Everything' },
];

/**
 * A stored 'YYYY-MM-DD' as a day on this calendar, and back again.
 *
 * ⚠️ Read and written by parts, never through `new Date(value)` or
 * `toISOString()`. A bare date string is parsed as UTC, so east of Greenwich it
 * comes back as the evening before -- a filter set to the 27th would ask the
 * server for the 26th, and the picker would show a day the clerk did not pick.
 */
const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const asText = (date: Date | null): string => {
  if (!date) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const FILTER_OPTIONS = [
  { id: '', name: 'All bookings' },
  { id: 'confirmed', name: 'Confirmed' },
  { id: 'hold', name: 'Held' },
  { id: 'checked_in', name: 'Checked in' },
  { id: 'checked_out', name: 'Checked out' },
  { id: 'cancelled', name: 'Cancelled' },
];

/**
 * A booking's state, in the SAME colours the grid paints a room.
 *
 * Held is amber on both, booked is rose on both, guests-in-the-room is violet
 * on both. A clerk reading "HELD" on a tile and then finding a differently
 * coloured "hold" in the list would have to check whether the two words mean
 * the same thing -- and they do, so they are painted the same.
 *
 * A chip rather than coloured text: it is one word in a column of one-word
 * cells, and tinted text at that size is a hint rather than a state. Every
 * entry carries its own word, so nothing here depends on the colour alone.
 */
const STATUS_LOOK: Record<string, { className: string; label: string }> = {
  hold: {
    className:
      'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-500/25 dark:border-amber-400/60 dark:text-amber-50',
    label: 'Held',
  },
  confirmed: {
    className:
      'bg-rose-100 border-rose-400 text-rose-900 dark:bg-rose-500/25 dark:border-rose-400/60 dark:text-rose-50',
    label: 'Confirmed',
  },
  checked_in: {
    className:
      'bg-violet-100 border-violet-400 text-violet-900 dark:bg-violet-500/25 dark:border-violet-400/60 dark:text-violet-50',
    label: 'Checked in',
  },
  checked_out: {
    className:
      'bg-teal-100 border-teal-400 text-teal-900 dark:bg-teal-500/25 dark:border-teal-400/60 dark:text-teal-50',
    // Teal, the colour of a free room -- because that is what it now is. The
    // guests have gone and the nights it held are behind it.
    label: 'Checked out',
  },
  cancelled: {
    className:
      'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-700/40 dark:border-gray-600 dark:text-gray-400',
    label: 'Cancelled',
  },
  expired: {
    className:
      'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-700/40 dark:border-gray-600 dark:text-gray-400',
    label: 'Hold expired',
  },
};

/**
 * A stored 'YYYY-MM-DD HH:MM:SS' as a moment on this clock.
 *
 * ⚠️ Read out by hand rather than handed to `new Date`. That shape has no zone
 * and no T, so what it means is left to the browser: Chrome reads it as local
 * time and Safari has historically refused it outright, returning Invalid Date
 * — and a hold that will not parse is a countdown that reads as "no deadline"
 * on somebody's phone.
 */
const parseStamp = (value: string): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value ?? '');

  if (!parts) return null;

  const [, y, mo, d, h, mi, sec] = parts;

  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(sec ?? 0),
  );
};
/**
 * "3:45 PM". The hour a person says, not a twenty-four hour stamp.
 *
 * ⚠️ THE AM/PM IS THE WHOLE POINT, and leaving it to the browser lost it.
 * `toLocaleTimeString` with `hour: 'numeric'` follows the visitor's locale, and
 * on a 24-hour one it returns "1:07" with no meridiem at all — which read as a
 * DURATION beside the word "lapses" and was taken for an hour and seven
 * minutes. It was one in the morning.
 *
 * Written out by hand for that reason, and by the same rule as clockTime() in
 * setupHelpers, so the two say the hour the same way across the module.
 */
const onTheClock = (at: Date): string => {
  const h = at.getHours();
  const hour = h % 12 === 0 ? 12 : h % 12;

  return `${hour}:${String(at.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/**
 * Re-draw on a timer, so a countdown counts down.
 *
 * ⚠️ A COUNTDOWN THAT DOES NOT MOVE IS A LIE THAT GETS WORSE. "lapses in 54
 * min" was worked out when the row was drawn and then sat there: leave the
 * screen open through lunch and it still says 54 while the hold has been gone
 * an hour. The desk reads that number to decide whether to ring somebody.
 *
 * Half a minute, so the minute on screen is never wrong by a whole one. Cheap
 * -- it re-renders one short line, not the table.
 *
 * ⚠️ Only while `active`. A hold three days out does not change minute to
 * minute, and a timer per row on a page of forty bookings is forty timers doing
 * nothing. The interval is cleared on unmount, which matters here: this list
 * re-renders on every filter change, and a timer left behind would go on
 * calling setState against a component that is gone.
 */
const useTicking = (active: boolean, everyMs = 30000) => {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!active) return undefined;

    const timer = setInterval(() => tick((n) => n + 1), everyMs);

    return () => clearInterval(timer);
  }, [active, everyMs]);
};

/**
 * How long a hold has left, and how loudly to say it.
 *
 * ⚠️ THIS IS THE CHASING LIST (spec 6.4). A hold takes real beds and gives them
 * back when it lapses — `hotel:expire-holds` sweeps every five minutes and
 * deletes the nights, and nothing puts them back. The window in which a person
 * can still ring the guest is what this has to make visible.
 *
 * ⚠️ IT COUNTS IN MINUTES, AND IT USED TO COUNT IN DAYS.
 *
 * A hold ran to the end of a day, so whole days were the only unit that meant
 * anything and the line said "lapses tomorrow". Then a hold became a WAIT --
 * one property holds a room for an hour, because a hold is a guest saying they
 * are on their way, not a booking -- and a day-counter could only ever answer
 * "today" or "tomorrow" for something with forty minutes left on it. The desk
 * needs the hour, and near the end it needs the minutes.
 *
 * So the clock time is the fact, and the countdown appears beside it only while
 * it is short enough to act on. "lapses at 3:45 PM" is what somebody rings a
 * guest about; "in 12 minutes" is what makes them do it now.
 *
 * ⚠️ "Lapsed" shows only between the moment it expires and the next sweep, so
 * it is at most five minutes on screen. That is not a gap in the display; it is
 * the last instant anybody has, and it should look like one.
 */
const HoldDeadline = ({ until }: { until?: string | null }) => {
  // ⚠️ Parsed and the timer started BEFORE either early return below. Hooks run
  // in the same order on every render or React loses track of them, and a
  // `return` above a hook is exactly how that order changes between renders.
  const at = until ? parseStamp(until) : null;

  // Ticking only where the words would actually change: inside two days. "3
  // days left" reads the same at noon and at midnight.
  useTicking(!!at && at.getTime() - Date.now() < 2 * 86400000);

  if (!until) {
    // No deadline at all. Not urgent and not wrong — a row from before
    // hold_until was written. Said plainly rather than left blank, because a
    // hold with no end is one nothing will ever release on its own.
    return (
      <span className="text-[0.6rem] text-gray-500 dark:text-gray-400" title="No expiry set on this hold.">
        no deadline
      </span>
    );
  }

  if (!at) {
    return (
      <span className="text-[0.6rem] text-gray-500 dark:text-gray-400" title={String(until)}>
        {until}
      </span>
    );
  }

  const minutes = Math.round((at.getTime() - Date.now()) / 60000);
  const lapsed = minutes < 0;
  const gone = Math.abs(minutes);

  /**
   * ⚠️ HOW LONG IS LEFT, NOT WHEN IT ENDS.
   *
   * This said "lapses at 1:15 AM" on a hold taken at 1:15 minus an hour, and it
   * was read as wrong twice over: once as a duration ("an hour and fifteen
   * minutes"), and once as a hold that had not started counting. The property
   * sets its hold in HOURS -- "Hold lasts: 1" -- so the hour is the number
   * somebody is looking for in this column, and a clock time makes them work it
   * out from two figures neither of which is on screen.
   *
   * The moment itself is not lost: it is in the tooltip, and that is the form
   * somebody reads out to a guest on the telephone.
   */
  const left = (mins: number): string => {
    if (mins < 60) return `${Math.max(1, mins)} min left`;

    if (mins < 1440) {
      const hours = Math.floor(mins / 60);
      const rest = mins % 60;

      // "1 hr 5 min", but plain "3 hr" on the hour -- a trailing "0 min" is
      // noise in a line this short.
      return rest ? `${hours} hr ${rest} min left` : `${hours} hr left`;
    }

    const days = Math.round(mins / 1440);

    return `${days} day${days === 1 ? '' : 's'} left`;
  };

  const said = lapsed
    ? gone < 1
      ? 'lapsed just now'
      : gone < 60
        ? `lapsed ${gone} min ago`
        : gone < 1440
          ? `lapsed ${Math.round(gone / 60)} hr ago`
          : `lapsed ${Math.round(gone / 1440)} days ago`
    : left(minutes);

  // Three hours, because that is about as far ahead as a desk acts on anything.
  const urgent = !lapsed && minutes <= 180;

  return (
    <span
      className={`text-[0.6rem] ${
        lapsed
          ? 'font-semibold text-danger dark:text-red-400'
          : urgent
            ? 'font-semibold text-amber-700 dark:text-amber-300'
            : 'text-gray-500 dark:text-gray-400'
      }`}
      // The whole moment, to the minute. The line above is deliberately short
      // and a date with no hour on it is what this replaced.
      title={
        lapsed
          ? `Held until ${formatDayMonthYear(until)}, ${onTheClock(at)}. The sweep runs every five minutes — ring the guest or confirm the booking now.`
          : `Held until ${formatDayMonthYear(until)}, ${onTheClock(at)}. The beds go back on sale after that.`
      }
    >
      {said}
    </span>
  );
};

const BookingsScreen = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * ⚠️ THE FILTERS AND THE PAGE LIVE IN THE ADDRESS, not in this component.
   *
   * They were state, and state is lost the moment the screen is left -- which
   * used not to matter, because taking a booking never left it. It does now:
   * New and Edit are pages of their own, and a clerk on page three of the held
   * bookings who saved one would have come back to page one of everything.
   *
   * ⚠️ Not sessionStorage, for the reason the Cash Book gives: a range put back
   * from storage is one somebody asked for a week ago, on a browser they share.
   * An address is asked for by whoever is standing there, it survives a reload,
   * and it can be sent to a colleague.
   */
  const [params, setParams] = useSearchParams();

  // One selector per value, each returning something the store already holds.
  //
  // ⚠️ Not one selector building an object out of several: useSelector compares
  // by reference, so a fresh object every call means a re-render on every
  // action dispatched anywhere in the app -- on a screen a desk leaves open all
  // day, next to a toast library that dispatches on a timer.
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const bookings = useSelector((state: any) => state.hotelBooking.bookings);
  const loading = useSelector((state: any) => state.hotelBooking.loading);
  const saving = useSelector((state: any) => state.hotelBooking.saving);
  const times = useSelector((state: any) => state.hotelBooking.times);

  // What cancelling the booking in the dialog would do to its money, and the
  // drawers a refund could come out of.
  const cancellation = useSelector((state: any) => state.hotelBooking.cancellation);
  const tills = useSelector((state: any) => state.hotelBooking.tills);

  // From the signed-in user's own property, which covers almost everybody.
  // The effect below covers the account that has none.
  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);

  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const statusFilter = params.get('status') ?? '';
  /** Rooms and halls, the meals on their own, or both. See KIND_OPTIONS. */
  const kindFilter = params.get('kind') || 'stay';

  /**
   * The arrival dates the list is about, either end of it optional.
   *
   * ⚠️ By ARRIVAL, not by overlap. "Bookings touching these dates" would pull
   * in a fortnight's stay because one of its nights fell in the range, which is
   * a different question from the one the desk asks this list -- who is coming
   * between these two dates. It is also the date the list is ordered by, so the
   * rows that come back are the rows the range cut, in the order they were in.
   *
   * Empty is a real answer at either end: a start with no end is everything
   * from that day on, an end with no start is everything up to it.
   */
  const dateFrom = params.get('from') ?? '';
  const dateTo = params.get('to') ?? '';

  /**
   * One place that writes the address, so nothing can move a filter and forget
   * the page.
   *
   * ⚠️ Any filter change goes back to page one. Page three of the confirmed
   * bookings is not page three of anything else, and a list that keeps the
   * number while changing the question shows an empty table with a pager
   * underneath it.
   */
  const setFilter = (next: Record<string, string>) => {
    const asked = new URLSearchParams(params);

    Object.entries(next).forEach(([key, value]) => {
      if (value) asked.set(key, value);
      else asked.delete(key);
    });

    if (!('page' in next)) asked.delete('page');

    setParams(asked, { replace: true });
  };

  // The booking whose bill is being fetched -- one row at a time, so the turning
  // link is on the line the clerk actually pressed. See openBill below.
  const [openingBill, setOpeningBill] = useState<number | null>(null);

  // The booking being cancelled, and why. Held here rather than asked for by
  // window.prompt: the browser's own box is the wrong shape for a question that
  // has to name the booking, say what cancelling actually does, and take a
  // sentence for the record -- and it is drawn by the operating system, so it
  // looks like something the page did not mean to do.
  const [cancelling, setCancelling] = useState<any>(null);
  const [reason, setReason] = useState('');

  /**
   * How much of the advance goes back, and out of which drawer.
   *
   * ⚠️ Starts at the WHOLE amount held rather than at zero. Whatever is not
   * refunded is retained as income, so a field left at zero by somebody who
   * meant to think about it later would quietly keep the guest's money. The
   * safe default is giving it back; keeping some is the deliberate act.
   */
  const [refund, setRefund] = useState('');
  const [refundTill, setRefundTill] = useState<any>('');

  const debouncedSearch = useDebounced(search);

  const branches: any[] = branchDdlData?.protectedData?.data ?? [];

  useEffect(() => {
    dispatch(getDdlProtectedBranch());

    return () => {
      dispatch(clearBookings());
    };
  }, [dispatch]);

  // The property in this module IS the branch. A company running two hotels
  // keeps two sets of rooms, and a booking belongs to exactly one of them.
  //
  // An account with no branch of its own -- a platform administrator looking
  // at a tenant -- would otherwise land with nothing chosen and the chooser
  // hidden, and sit waiting for a selection the screen no longer offers.
  useEffect(() => {
    if (branchId || branches.length !== 1) return;

    setBranchId(Number(branches[0].id));
  }, [branches, branchId]);

  const load = useCallback(() => {
    if (!branchId) return;

    dispatch(
      bookingList({
        branch_id: branchId,
        page,
        per_page: 10,
        q: debouncedSearch,
        status: statusFilter || undefined,
        kind: kindFilter,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    );
  }, [dispatch, branchId, page, debouncedSearch, statusFilter, kindFilter, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Open the form on its own page, and tell it the way back.
   *
   * ⚠️ `from` is this address, filters and page and all. The form returns to
   * it after a save, so a clerk working through the held bookings on page three
   * lands back on page three of the held bookings rather than at the top of
   * everything.
   */
  const goToForm = (path: string) =>
    navigate(`${path}${branchId ? `?branch=${branchId}` : ''}`, {
      state: { from: `${location.pathname}${location.search}` },
    });

  const openNew = () => goToForm(routes.hotel_booking_new);

  const openEdit = (row: any) => goToForm(`${routes.hotel_booking_edit}/${row.id}`);

  /**
   * Fill the refund in once the server has said how much there is.
   *
   * ⚠️ THE WHOLE AMOUNT, not zero. Whatever is not refunded is retained as
   * income, so a box left at zero by somebody who meant to decide later would
   * keep the guest's money without anybody choosing to. Giving it back is the
   * default; keeping some is the deliberate act, and it is one keystroke.
   */
  useEffect(() => {
    if (!cancelling || !cancellation) return;

    setRefund(String(cancellation.amount_held ?? 0));
    setRefundTill((current: any) => current || cancellation.tills?.[0]?.id || '');
    // Only when a new plan arrives. Listing `refund` would undo every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancellation, cancelling?.id]);

  const askToCancel = (row: any) => {
    setCancelling(row);
    setReason('');
    setRefund('');
    setRefundTill('');

    // ⚠️ Asked fresh every time, never taken off the row. The list says nothing
    // about what has been paid, and what has been paid is the one figure the
    // desk is about to be asked to divide.
    dispatch(cancellationRead(row.id));

    if (!tills?.length) dispatch(tillList());
  };

  const closeCancel = () => {
    setCancelling(null);
    dispatch(clearCancellation());
  };

  const cancel = async () => {
    if (!cancelling) return;

    const giving = Number(refund || 0);

    if (giving > 0 && !refundTill) {
      toast.error('Which account is the refund paid out of?');
      return;
    }

    try {
      const result = await dispatch(
        // An empty reason is allowed -- it is a choice, and a required field
        // that nobody wants to fill gets filled with a full stop. The server
        // writes "no reason given" against it and the record still says who
        // cancelled it and when.
        bookingCancel({
          id: cancelling.id,
          reason: reason.trim(),
          refund_amount: giving,
          coa4_id: giving > 0 ? Number(refundTill) : null,
        }),
      ).unwrap();

      toast.success(result.message);
      closeCancel();
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  /**
   * Open the bill only once the bill is in hand.
   *
   * ⚠️ The folio is read HERE, before the route changes, and not by the screen
   * we are going to. Navigating first took the list away at the press and left
   * the clerk on an empty screen for as long as the read took, then dropped
   * the bill in -- so pressing Bill looked like it CLOSED the list, and the
   * bill looked like it arrived by itself a moment later. Read first and the
   * list stays put under the finger, with only the link itself turning, and
   * the bill is whole the moment it opens.
   *
   * A read that fails now leaves the clerk on the list with the reason, rather
   * than on a blank bill screen.
   */
  const openBill = useCallback(
    async (bookingId: number) => {
      setOpeningBill(bookingId);

      try {
        await Promise.all([
          dispatch(folioRead(bookingId)).unwrap(),
          // Who owes it, fetched in the same breath because the bill screen
          // wants both -- but NOT unwrapped: the screen copes without it, and
          // a bill nobody has moved is not worth refusing to open the folio.
          dispatch(billRead(bookingId)),
        ]);

        navigate(`${routes.hotel_booking_folio}/${bookingId}`);
      } catch (error: any) {
        toast.error(String(error));
      } finally {
        setOpeningBill(null);
      }
    },
    [dispatch, navigate],
  );

  const columns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-14 text-center', cellClass: 'text-center' },
      {
        key: 'booking_no',
        header: 'Booking',
        render: (row: any) => (
          <div>
            <div className="font-medium text-black dark:text-white">{row.booking_no}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.booker_name}</div>
          </div>
        ),
      },
      {
        key: 'stay',
        header: 'Stay',
        render: (row: any) =>
          // ⚠️ A walk-in sale has no stay to show. Left to the arrow below it
          // would read "27/08 → 27/08, 0 nights", which looks like a booking
          // somebody got wrong rather than a meal somebody sold.
          row.booking_type === 'walk_in' ? (
            <div className="text-xs">
              <div className="font-xs text-black dark:text-white">{formatDate(row.check_in_date)}</div>
              <div className="text-gray-500 dark:text-gray-400">Walk-in, no room</div>
            </div>
          ) : (
            <div className="text-xs">
              <div className="font-xs text-black dark:text-white">
                { formatDate(row.check_in_date) } → { formatDate(row.check_out_date) }
              </div>
              {/* Nights, not days. The number the database worked out from the
                  two dates, so the screen cannot disagree with the booking. */}
              <div className="text-gray-500 dark:text-gray-400">
                {row.nights} {Number(row.nights) === 1 ? 'night' : 'nights'}
              </div>
            </div>
          ),
      },
      {
        key: 'stated_rooms',
        header: 'Holds',
        headerClass: 'text-left',
        cellClass: 'text-left',
        /**
         * ⚠️ ROOMS AND SITTINGS SAID SEPARATELY. This column used to show
         * stated_rooms, which counts a hall as one room -- so a wedding taking
         * a community centre for three sittings read as "1 room", and nothing
         * on the list said a hall was involved at all. The desk could not tell
         * a hall booking from a room booking without opening it.
         */
        render: (row: any) => {
          const rooms = Number(row.rooms_held ?? row.stated_rooms ?? 0);
          const sittings = Number(row.sittings_held ?? 0);

          // What was held and who it was held for, one under the other. Two
          // columns for that was two glances at the same booking.
          const guests = `${row.stated_adults ?? '-'}${
            row.stated_children ? ` + ${row.stated_children}` : ''
          }`;

          return (
            <span className="inline-flex flex-col items-left leading-tight">
              {rooms ? (
                <span className="text-black dark:text-white">
                  {rooms} {rooms === 1 ? 'Room' : 'Rooms'}
                </span>
              ) : null}

              {/* A hall is the thing somebody scans this list for -- "have we
                  got the centre on the 27th" -- so it is coloured rather than
                  left as another number in a column of numbers. */}
              {sittings ? (
                <span className="text-xs font-medium text-primary dark:text-secondary">
                  {sittings} {sittings === 1 ? 'Sitting' : 'Sittings'}
                </span>
              ) : null}

              {!rooms && !sittings ? <span className="text-black dark:text-white">-</span> : null}

              <span
                className="text-xs text-gray-500 dark:text-gray-200"
                title="Adults and children as stated at booking. What actually arrives is recorded at check-in."
              >
                { Number (guests) > 0 ? `${guests} Guest` : null}
              </span>
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        headerClass: 'text-left',
        cellClass: 'text-left',
        render: (row: any) => {
          const look = STATUS_LOOK[row.status];

          // Who is actually in, next to the word for it. Counted from the guest
          // rows, so it is the names the desk took -- not the number the
          // telephone gave, which is the Guests column two along.
          const arrived = Number(row.guests_count ?? 0);
          const stated = Number(row.stated_adults ?? 0) + Number(row.stated_children ?? 0);

          return (
            <div className="flex w-28 flex-col items-stretch gap-0.5">
              {/* ⚠️ ONE HEIGHT FOR EVERY CHIP, set here rather than left to
                  what is inside it. Padded to fit its own text, a chip carrying
                  a guest count "(3)" or a word that wraps came out taller than
                  the one above it, and a column of badges that step up and down
                  the page reads as a fault rather than a list. Fixed height,
                  full width, the word centred in what is left. */}
              <span
                className={`inline-flex h-5.5 w-full items-center justify-center rounded border px-2 text-[0.65rem] font-semibold leading-none ${
                  look?.className ?? ''
                }`}
              >
                {look?.label ?? (row.status ?? '').replace('_', ' ')}

                {/* Drawn only once somebody has been named. "(0)" against a
                    booking nobody has checked in yet says nothing the word
                    beside it did not already say.

                    ⚠️ It carries NO colour of its own. Inside the chip it
                    inherits whatever that state is painted in -- violet on
                    checked in, teal on checked out -- so it stays part of the
                    chip in both themes. A fixed grey was legible on none of
                    them: it read as a foreign mark dropped on the badge. */}
                {arrived ? (
                  <span
                    className="ml-1 opacity-75"
                    title={
                      arrived === stated
                        ? `${arrived} guests named at the desk — the whole party stated at booking.`
                        : `${arrived} guests named at the desk; ${stated} were stated at booking. Booked for one number and arrived as another is normal — food and amenities go by this one.`
                    }
                  >
                    ({arrived})
                  </span>
                ) : null}
              </span>

              {/* What it is WAITING for, under what it is. A hold nobody chases
                  expires, and a confirmed booking whose guests are at the desk
                  needs somebody to press Check in -- neither is visible from
                  the state alone. */}
              {row.status === 'hold' ? <HoldDeadline until={row.hold_until} /> : null}
              {/* {row.status === 'confirmed' ? (
                <span className="text-[0.6rem] text-gray-400">nobody checked in</span>
              ) : null} */}
            </div>
          );
        },
      },
      {
        key: 'action',
        header: 'Action',
        // Five slots wide -- see the grid below. Left narrower they wrap.
        headerClass: 'text-center w-80',
        cellClass: 'text-center',
        render: (row: any) => {
          if (['cancelled', 'expired'].includes(row.status)) {
            return <span className="text-xs text-gray-400">—</span>;
          }

          /**
           * ⚠️ FIVE FIXED SLOTS, and the empty ones are the point.
           *
           * The links were laid out centred, and a row's set depends on where
           * its stay has got to -- a confirmed booking offers four, a
           * checked-in one five. Centred, that put every link in a different
           * place on every row: Cancel sat at five different distances down a
           * single column, and the eye had to read each row to find the one it
           * wanted rather than going straight down.
           *
           * One column per ACTION, always in the same order, so Cancel is
           * always last and Bill always third. A row that cannot offer an
           * action leaves its slot empty rather than closing the gap -- which
           * is what keeps the column straight, and says at a glance which stays
           * have started and which have not.
           *
           * ⚠️ The tracks are SIZED TO THEIR WORDS, not five equal fifths.
           * Equal fifths gave "Bill" the same room as "Check out", and the
           * longer word ran straight over Cancel beside it -- two links sharing
           * the same pixels, one of them the destructive one. Fixed widths keep
           * every row on the same tracks while letting each hold what it has
           * to say.
           */
          const link = 'text-xs font-medium hover:underline whitespace-nowrap';

          return (
            <div className="grid grid-cols-[3rem_4.25rem_2.75rem_4.75rem_3.5rem] items-center justify-items-center gap-x-1">
              {/* ⚠️ Only while the stay can still change. A checked-out or
                  cancelled booking is history -- its nights are the register of
                  who was here and its bill is made -- and the server refuses it
                  anyway. Offering the link would be offering a refusal. */}
              <span>
                {!['checked_out', 'cancelled', 'expired'].includes(row.status) ? (
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className={`${link} text-primary dark:text-secondary`}
                  >
                    Edit
                  </button>
                ) : null}
              </span>

              {/* Named for what it does rather than for the stage it is.
                  "Check in" is what the desk calls it; "allotment" is what
                  the spec calls it, and nobody at a desk says that.

                  One slot for both because they are the same door: before the
                  guests arrive it takes them in, afterwards it shows who came. */}
              <span>
                {/* ⚠️ Never on a walk-in sale. There is no room to allot and
                    nobody to put in it -- the screen behind this link asks
                    which room the guests are in, and the server refuses a room
                    this booking does not hold. */}
                {row.booking_type !== 'walk_in' ? (
                  <button
                    type="button"
                    onClick={() => navigate(`${routes.hotel_booking_check_in}/${row.id}`)}
                    className={`${link} text-primary dark:text-secondary`}
                  >
                    {row.status === 'checked_in' ? 'Guests' : 'Check in'}
                  </button>
                ) : null}
              </span>

              {/* The bill. Offered on every live booking rather than only on a
                  checked-in one: an advance is taken on the telephone, long
                  before anybody arrives.

                  ⚠️ The wait happens HERE, on the link, not on the next screen
                  -- see openBill. The spinner takes the word's place inside the
                  same slot so the row does not shuffle while it turns. */}
              <span>
                <button
                  type="button"
                  onClick={() => openBill(row.id)}
                  disabled={openingBill === row.id}
                  className={`${link} text-primary disabled:opacity-70 dark:text-secondary`}
                >
                  {openingBill === row.id ? (
                    <span
                      aria-label="Opening the bill"
                      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent align-middle"
                    />
                  ) : (
                    'Bill'
                  )}
                </button>
              </span>

              {/* Only on a stay that has actually started. Offered on a hold
                  or a confirmed booking it would be a button that can only
                  ever answer "these guests have not been checked in". */}
              <span>
                {row.status === 'checked_in' ? (
                  <button
                    type="button"
                    onClick={() => navigate(`${routes.hotel_booking_check_out}/${row.id}`)}
                    className={`${link} text-primary dark:text-secondary`}
                  >
                    Check out
                  </button>
                ) : null}
              </span>

              {/* ⚠️ Last, always, and the only red one. A destructive action
                  that moves about the row is one somebody eventually presses by
                  aiming at where it was on the row above. */}
              <span>
                {row.status === 'checked_out' ? null : (
                  <button
                    type="button"
                    onClick={() => askToCancel(row)}
                    className={`${link} text-danger dark:text-red-400`}
                  >
                    Cancel
                  </button>
                )}
              </span>
            </div>
          );
        },
      },
    ],
    [branchId, openingBill, openBill],
  );

  const branchName = branches.find((b: any) => String(b.id) === String(branchId))?.name;

  return (
    <div>
      <HelmetTitle title="Bookings" />

      {/* ⚠️ The two times, where the desk sits.

          Not inside the New Booking form, and not only after somebody has asked
          what is free: the commonest question on the telephone is "what time do
          we have to be out?", and it is asked of this screen with nothing
          pressed on it. So it rides with the LIST and is drawn before anything
          else.

          It is also the pair the night count quietly depends on -- the 26th is
          free for the next guest only because the last one has gone by then --
          which is the other reason it is not tucked away in a settings page. */}
      {times ? (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Check in <strong className="text-black dark:text-white">{clockTime(times.check_in)}</strong>
          {' · '}
          Check out <strong className="text-black dark:text-white">{clockTime(times.check_out)}</strong>
          {times.branch_ref ? (
            <Link
              to={`/branch/branch-edit/${times.branch_ref}`}
              className="ml-2 text-xs text-primary hover:underline dark:text-secondary print:hidden"
            >
              Change
            </Link>
          ) : null}
        </p>
      ) : null}

      {/* Drawn only where there is a choice. A dropdown holding one option is a
          question with one answer -- but the answer is still needed, so a lone
          property is selected rather than merely assumed. */}
      {branches.length > 1 ? (
        <div className="mb-3 w-64">
          <label className="text-sm text-black dark:text-white">Property</label>
          <BranchDropdown
            value={branchId ? String(branchId) : ''}
            defaultValue={branchId ? String(branchId) : ''}
            onChange={(e: any) => {
              setBranchId(e.target.value === '' ? null : Number(e.target.value));
            }}
            className="w-full text-sm"
            branchDdl={branches}
          />
        </div>
      ) : null}

      <SetupShell
        noun="Booking"
        // note={`Rooms are held from the night of arrival up to, but not including, the night of departure — the 15th to the 18th is three nights. Whole rooms only for now; a room sold by the bed says so in the list.${branchName ? ` Booking into: ${branchName}.` : ''}`}
        toolbar={
          <>
            {/* Labelled, because everything beside it is: an unlabelled box
                in a row of labelled ones sits a line lower than the rest and
                reads as something other than a filter. */}
            <SearchInput
              id="booking_search"
              label="Search"
              search={search}
              setSearchValue={(value: string) => setFilter({ q: value })}
              className="w-56"
            />
            {/* The app's own calendar, the one every other date field on the
                module uses -- so a date is typed and read here the way it is
                on the booking form, dd/MM/yyyy, rather than in whatever shape
                the browser's native picker happens to speak.

                ⚠️ Either end on its own is a question worth asking -- "from
                today onwards", "everything up to the end of the month" -- so
                neither box requires the other, and clearing one is allowed. */}
            <div className="w-40">
              <InputDatePicker
                id="booking_date_from"
                name="booking_date_from"
                label="Start Date"
                placeholder="Start Date"
                selectedDate={asDate(dateFrom)}
                setSelectedDate={(date: Date | null) => setFilter({ from: asText(date) })}
                setCurrentDate={() => undefined}
                className="w-full"
              />
            </div>
            <div className="w-40">
              <InputDatePicker
                id="booking_date_to"
                name="booking_date_to"
                label="End Date"
                placeholder="End Date"
                selectedDate={asDate(dateTo)}
                setSelectedDate={(date: Date | null) => setFilter({ to: asText(date) })}
                setCurrentDate={() => undefined}
                className="w-full"
              />
            </div>
            <div className="w-44">
              <DropdownCommon
                id="booking_kind_filter"
                name="booking_kind_filter"
                label="Sold"
                data={KIND_OPTIONS}
                value={kindFilter}
                onChange={(e: any) => setFilter({ kind: e.target.value })}
              />
            </div>
            <div className="w-48">
              <DropdownCommon
                id="booking_status_filter"
                name="booking_status_filter"
                label="Show"
                data={FILTER_OPTIONS}
                value={statusFilter}
                onChange={(e: any) => setFilter({ status: e.target.value })}
              />
            </div>
          </>
        }
        // ⚠️ THE FORM IS A PAGE OF ITS OWN NOW -- /hotel/bookings/new, and the
        // same page with an id on the end for an edit. Nothing folds out above
        // this table any more, so the shell is left holding a toolbar, a table
        // and a pager, which is what a list is.
        formOpen={false}
        editing={false}
        onNew={openNew}
        onCancel={() => undefined}
        onSave={() => undefined}
        saving={false}
        form={null}
        columns={columns}
        rows={bookings?.data ?? []}
        loading={loading}
        emptyMessage="No bookings yet. Press New Booking, pick the dates, and see what is free."
        page={page}
        totalPages={Math.ceil((bookings?.total ?? 0) / (bookings?.per_page || 10))}
        onPageChange={(next: number) => setFilter({ page: String(next) })}
      />

      {/* The app's own dialog, not the browser's. It can say what cancelling
          does -- which is not obvious, because the booking stays and only the
          nights go back -- and the reason it takes is the one the record
          keeps. */}
      <ConfirmModal
        show={Boolean(cancelling)}
        title="Cancel this booking"
        confirmLabel="Cancel the booking"
        cancelLabel="Keep it"
        // DeleteButton carries text-white and no background of its own -- the
        // colour is the caller's to give. Left off, the confirm button was white
        // text on the dialog's own surface and did not read as a button at all,
        // while "Keep it" beside it did. The safe choice must never be the only
        // one that looks pressable.
        //
        // bg-danger, not bg-red-600: this module paints from the theme tokens
        // throughout, and the Cancel link in the row above is text-danger.
        className="bg-danger hover:bg-danger/90"
        loading={saving}
        // ⚠️ The button is taken away rather than left to fail, in the one case
        // the server refuses outright: a booking that has already been billed
        // is checked out, never cancelled.
        disabled={Boolean(cancellation?.billed_lines) || Boolean(cancellation?.chart_missing?.length)}
        onCancel={closeCancel}
        onConfirm={cancel}
        message={
          <>
            <span className="block">
              <strong className="text-black dark:text-white">{cancelling?.booking_no}</strong>
              {cancelling?.booker_name ? ` · ${cancelling.booker_name}` : ''}
            </span>
            <span className="mt-1 block text-sm text-[rgb(var(--c-text-muted))]">
              {formatDayMonthYear(cancelling?.check_in_date)} →{' '}
              {formatDayMonthYear(cancelling?.check_out_date)} ·{' '}
              {cancelling?.stated_rooms} {cancelling?.stated_rooms === 1 ? 'room' : 'rooms'}
            </span>

            {/* Said plainly, because it is the half people get wrong: the rooms
                go back on sale immediately, and the booking itself stays on the
                books so there is still something to show it existed. */}
            <span className="mt-3 block text-sm">
              The rooms go back on sale straight away. The booking stays on the books,
              marked cancelled.
            </span>

            {/* ⚠️ The refusal, said as a fact before the button is pressed. A
                billed booking has charged the guest and VAT has fallen due on
                it; undoing that is a credit note, which this module does not
                have and must not counterfeit. */}
            {cancellation?.billed_lines ? (
              <span className="mt-3 block rounded border border-danger bg-rose-50 p-2 text-left text-sm text-rose-900 dark:bg-rose-500/15 dark:text-rose-50">
                This booking has already been billed, so it cannot be cancelled — the guest has
                been charged and the VAT has fallen due. <strong>Check it out instead</strong>, and
                settle or carry what is owed.
              </span>
            ) : null}

            {cancellation?.chart_missing?.length ? (
              <span className="mt-3 block rounded border border-danger bg-rose-50 p-2 text-left text-sm text-rose-900 dark:bg-rose-500/15 dark:text-rose-50">
                Money has been taken against this booking, but the chart of accounts is not ready
                to record giving it back. Missing: {cancellation.chart_missing.join(', ')}.
              </span>
            ) : null}

            {/* The money half. Only where there is money -- a hold nobody paid
                on is called off without any of this being asked. */}
            {!cancellation?.billed_lines && Number(cancellation?.amount_held) > 0 ? (
              // ⚠️ div, not span. InputElement and DropdownCommon draw their own
              // labelled blocks, and a block element inside a span is invalid
              // markup that browsers repair by closing the span early -- which
              // moves the fields out from under this box.
              <div className="mt-3 rounded border border-[rgb(var(--c-border))] p-2.5 text-left">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  This booking is holding{' '}
                  <strong className="text-black dark:text-white">
                    {money(cancellation.amount_held)}
                  </strong>
                  .
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <InputElement
                    id="cancel_refund"
                    name="refund_amount"
                    label="Give back"
                    type="number"
                    min={0}
                    value={refund}
                    onChange={(e: any) => setRefund(e.target.value)}
                  />
                  <DropdownCommon
                    id="cancel_refund_till"
                    name="coa4_id"
                    label="Out of which account"
                    data={(cancellation.tills ?? tills ?? []).map((till: any) => ({
                      id: till.id,
                      name: `${till.name} (${till.group_name})`,
                    }))}
                    value={refundTill}
                    onChange={(e: any) => setRefundTill(e.target.value)}
                  />
                </div>

                {/* ⚠️ The number nobody would work out for themselves, shown
                    where the decision is made. What is not given back is not
                    left over -- it is the hotel's earnings, and it is posted as
                    such. Said in a sentence rather than as a second figure in a
                    box, because the point is what it BECOMES. */}
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {money(Math.max(0, Number(cancellation.amount_held) - Number(refund || 0)))} stays
                  with the hotel as a cancellation charge, and is posted as income.
                </div>

                {Number(refund || 0) > Number(cancellation.amount_held) ? (
                  <div className="mt-2 text-sm text-danger dark:text-red-400">
                    That is more than the booking is holding.
                  </div>
                ) : null}
              </div>
            ) : null}

            <span className="mt-3 block text-left">
              <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Why, for the record (optional)
              </span>
              <Textarea
                value={reason}
                onChange={(event: any) => setReason(event.target.value)}
                rows={2}
                maxLength={255}
                placeholder="Guest changed plans, double entry, …"
                className="block w-full rounded-xs border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-2 text-sm text-gray-900 outline-none dark:text-[rgb(var(--c-text))]"
              />
            </span>
          </>
        }
      />
    </div>
  );
};

export default BookingsScreen;
