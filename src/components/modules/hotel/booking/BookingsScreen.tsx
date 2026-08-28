import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiSearch } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import SearchInput from '../../../utils/fields/SearchInput';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { Textarea } from '../../../utils/fields/FormControls';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import routes from '../../../services/appRoutes';
import SetupShell from '../SetupShell';
import PropertyGrid from '../PropertyGrid';
import {
  BOOKING_COLOUR_MODES,
  BOOKING_LOOKS,
  ColourMode,
  buildTypeIndex,
  lookOf,
} from '../layoutPalette';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { buildingDdl } from '../hotelSetupSlice';
import { clockTime, money, useDebounced } from '../setupHelpers';
import { DdlOption, LayoutBuilding, LayoutRoom, LayoutSeat } from '../types';
import {
  availabilityRead,
  bookingCancel,
  bookingList,
  bookingSave,
  bookingRead,
  bookingUpdate,
  hallsRead,
  cancellationRead,
  clearAvailability,
  clearBookings,
  clearCancellation,
  tillList,
} from './bookingSlice';
import { BookingType } from './types';
import formatDate, { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';

/**
 * Bookings -- what is free on a set of dates, and taking it.
 *
 * BOTH STAGES OF SPEC 6.5, from one list. A booking and its guest list are not
 * captured at the same time: this is the telephone call -- who is booking, the
 * dates, which rooms, how many people -- and the Check in action on a row
 * reopens the SAME booking on the day they arrive, for the names and the NIDs.
 * One record opened twice, never two mechanisms, which is why allotment is a
 * panel over this list rather than a screen somewhere else.
 *
 * BOTH WAYS OF SELLING A ROOM. A room sold whole is picked as a tile; a room
 * sold by the bed opens its beds and they are picked one at a time, each at its
 * own rent. One booking may hold both -- a family in a room and their drivers
 * in a dormitory is one party and one bill.
 *
 * ⚠️ The two rents are never derived from each other (2.8). The screen adds up
 * what was picked; it never divides a room rate across beds, and never sums
 * beds into a room rate.
 *
 *
 * THE THING THIS SCREEN MUST NOT PRETEND
 * --------------------------------------
 *
 * The availability list is what was free at the moment it was read. It is not a
 * reservation, nothing here holds anything, and two clerks may be looking at
 * the same free room. That is not a flaw to be papered over -- it is what any
 * availability screen is, and the alternative (reserving on view) fills a hotel
 * with rooms held by people who wandered off.
 *
 * So the screen is built to be honest about it rather than to hide it:
 *
 *   * The list is thrown away the moment a date changes, and after every save.
 *     A stale list of "free" rooms is the one way this screen could mislead
 *     somebody into thinking a room was already theirs.
 *   * A clash on save is shown as the server's own sentence -- somebody took it
 *     while this form was open, and NOTHING was booked -- rather than as a
 *     failure. The clerk's next move is to look again, and the message says so.
 *   * Changing a date drops the rooms already picked, rather than keeping
 *     them against nights nobody has checked. Losing a selection is a small
 *     annoyance; booking the 20th while looking at the 15th is not.
 */

const TYPE_OPTIONS: { id: BookingType; name: string }[] = [
  { id: 'individual', name: 'Individual' },
  { id: 'group', name: 'Group' },
  // Corporate is deliberately absent. It is the one type that decides the bill
  // goes to a company and the money comes later (6.4), which needs a payer to
  // point at -- and the party picker belongs with the billing screen. The API
  // accepts it already; this list gains it the day there is somebody to name.
];

const STATUS_OPTIONS = [
  { id: 'confirmed', name: 'Confirmed' },
  { id: 'hold', name: 'Tentative hold' },
];

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

const asDate = (value?: string | null) => (value ? new Date(value) : null);

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, not toISOString(): a night is a calendar date at the desk, and
  // converting through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const today = () => asText(new Date());

const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return asText(date);
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
 * A number of hours as somebody says it -- "an hour", "two days".
 *
 * ⚠️ The form used to say "seven days" in fixed words. The property holds its
 * rooms for as long as its own branch settings say, and a screen that names a
 * different number is a screen the desk will believe over the sweep.
 */
const holdLength = (hours?: number): string => {
  if (!hours || hours < 1) return 'a while';
  if (hours === 1) return 'an hour';
  if (hours < 24) return `${hours} hours`;
  if (hours % 24 !== 0) return `${hours} hours`;

  const days = hours / 24;

  return days === 1 ? 'a day' : `${days} days`;
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

const blankBooking = () => ({
  check_in_date: today(),
  check_out_date: tomorrow(),
  booking_type: 'individual' as BookingType,
  status: 'confirmed',
  booker_name: '',
  booker_mobile: '',
  stated_adults: 1,
  stated_children: 0,
  notes: '',
});

const BookingsScreen = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  // One selector per value, each returning something the store already holds.
  //
  // ⚠️ Not one selector building an object out of several: useSelector compares
  // by reference, so a fresh object every call means a re-render on every
  // action dispatched anywhere in the app -- on a screen a desk leaves open all
  // day, next to a toast library that dispatches on a timer.
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const bookings = useSelector((state: any) => state.hotelBooking.bookings);
  const availability = useSelector((state: any) => state.hotelBooking.availability);
  const loading = useSelector((state: any) => state.hotelBooking.loading);
  const checking = useSelector((state: any) => state.hotelBooking.checking);
  const saving = useSelector((state: any) => state.hotelBooking.saving);
  const buildingOptions = useSelector((state: any) => state.hotelSetup.buildingOptions);
  const times = useSelector((state: any) => state.hotelBooking.times);

  // What cancelling the booking in the dialog would do to its money, and the
  // drawers a refund could come out of.
  const cancellation = useSelector((state: any) => state.hotelBooking.cancellation);
  const tills = useSelector((state: any) => state.hotelBooking.tills);

  // From the signed-in user's own property, which covers almost everybody.
  // The effect below covers the account that has none.
  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<any>(null);
  const [building, setBuilding] = useState('');

  // Read beside availability, from the same "Check" press, over the same dates.
  const halls = useSelector((state: any) => state.hotelBooking.halls);

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
  const [picked, setPicked] = useState<number[]>([]);

  // Beds are their own selection, kept apart from rooms because the server
  // takes them apart: room_ids are let whole, seat_ids one bed at a time, and
  // folding them into one list would lose which is which.
  const [pickedSeats, setPickedSeats] = useState<number[]>([]);

  /**
   * The sittings taken, as (hall, date, sitting).
   *
   * ⚠️ A HALL IS NOT A ROOM WITH A CHECKBOX. A room is picked once for the
   * whole stay; a hall is picked per DAY -- the evening of the 28th and the
   * evening of the 29th are two different things to sell, and a wedding takes
   * one of them and not the other. So this is a list of triples rather than a
   * list of ids.
   */
  const [pickedSittings, setPickedSittings] = useState<
    { resource_id: number; slot_id: number; date: string; hall: string; sitting: string; rent: number }[]
  >([]);

  // Whose beds are on show. One room at a time -- six dormitories opened at
  // once is a wall of beds under a grid that was drawn to be glanced at.
  const [openBeds, setOpenBeds] = useState<LayoutRoom | null>(null);

  /**
   * What dropping these nights would cost, read before the clerk confirms.
   *
   * ⚠️ A BILLED NIGHT DROPPED IS MONEY LEFT ON THE BILL. Nothing takes a
   * line off a folio -- a credit note is §6.2 and is not built -- so the guest
   * goes on being charged for a night they will not sleep until somebody
   * adjusts it by hand. The server counts them; this is where the count is put
   * in front of somebody before it happens.
   */
  const [warning, setWarning] = useState<any>(null);

  /**
   * What this booking held when it was opened for editing.
   *
   * ⚠️ ITS OWN ROOMS COME BACK MARKED "BOOKED" -- by itself. The grid
   * kills booked tiles so nobody takes a room somebody else has, which is right
   * for a new booking and wrong here: the clerk could not untick them, so
   * nothing could ever be dropped. And once unticked they would go dead again,
   * so a mis-click could not be undone without closing the form.
   *
   * Kept as its own list rather than read off `picked`, for that second reason.
   */
  const [ownRooms, setOwnRooms] = useState<number[]>([]);
  const [ownSittings, setOwnSittings] = useState<string[]>([]);

  // What the tiles are painted by. Availability first, because that is the
  // question being asked here -- but the other two are kept, so a clerk can ask
  // "which of the free ones is a Deluxe" without leaving the screen.
  const [mode, setMode] = useState<ColourMode>('booking_state');


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

  useEffect(() => {
    if (!branchId) return;

    dispatch(buildingDdl({ branch_id: branchId }));
    setPage(1);
  }, [dispatch, branchId]);

  const load = useCallback(() => {
    if (!branchId) return;

    dispatch(
      bookingList({
        branch_id: branchId,
        page,
        per_page: 10,
        q: debouncedSearch,
        status: statusFilter || undefined,
      }),
    );
  }, [dispatch, branchId, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const buildingChoices = useMemo(
    () => (buildingOptions ?? []).map((o: DdlOption) => ({ id: o.value, name: o.label })),
    [buildingOptions],
  );

  const buildings: LayoutBuilding[] = availability?.buildings ?? [];
  const nights = availability?.nights ?? 0;

  const rooms: LayoutRoom[] = useMemo(
    () =>
      buildings.flatMap((b) => [...b.floors.flatMap((f) => f.rooms), ...b.unfloored]),
    [buildings],
  );

  // Keyed by room type id, exactly as the Layout tab does it, so that renaming
  // "Deluxe" does not repaint the property and the two screens agree on which
  // colour a type is.
  const typeIndex = useMemo(
    () => buildTypeIndex(rooms.map((r) => r.room_type_id).filter((id): id is number => id != null)),
    [rooms],
  );

  /**
   * The key, built from what is actually drawn.
   *
   * Not a fixed list: a property with nothing held tonight should not be shown a
   * key for "booked". Deduplicated on the badge, which is what the tile prints.
   */
  const legend = useMemo(() => {
    const seen = new Map<string, { className: string; badge: string; label: string }>();

    rooms.forEach((room) => {
      const look = lookOf(room, mode, typeIndex);
      if (!seen.has(look.badge + look.label)) seen.set(look.badge + look.label, look);
    });

    return [...seen.values()];
  }, [rooms, mode, typeIndex]);

  /**
   * Any change to the question throws the answer away.
   *
   * Not merely tidy: a list of free rooms read for the 15th, still on screen
   * after the date is changed to the 20th, is a screen actively lying about
   * which nights it checked.
   */
  const forget = () => {
    dispatch(clearAvailability());
    setPicked([]);
    setPickedSeats([]);
    setOpenBeds(null);
  };

  const set = (field: string) => (e: any) =>
    setForm((prev: any) => ({ ...prev, [field]: e.target.value }));

  const setDate = (field: string) => (date: Date | null) => {
    setForm((prev: any) => ({ ...prev, [field]: asText(date) }));
    forget();
  };

  const openNew = () => {
    setForm(blankBooking());
    forget();
  };

  /**
   * Open an existing booking in the same form it was taken in.
   *
   * ⚠️ The three lists come from the server rather than being worked out
   * here: which resource is a bed and which is a hall is a question with one
   * right answer, and a second copy of that answer on the client is one that
   * will drift.
   */
  const openEdit = async (row: any) => {
    try {
      const booking: any = await dispatch(bookingRead(row.id)).unwrap();

      setBuilding('');
      setForm({
        id: booking.id,
        booking_no: booking.booking_no,
        status: booking.status,
        booking_type: booking.booking_type ?? 'individual',
        check_in_date: String(booking.check_in_date ?? '').slice(0, 10),
        check_out_date: String(booking.check_out_date ?? '').slice(0, 10),
        booker_name: booking.booker_name ?? '',
        booker_mobile: booking.booker_mobile ?? '',
        stated_adults: booking.stated_adults ?? 0,
        stated_children: booking.stated_children ?? 0,
        notes: booking.notes ?? '',
      });

      setOwnRooms((booking.room_ids ?? []).map((id: any) => Number(id)));
      setOwnSittings(
        (booking.sittings ?? []).map(
          (one: any) => `${one.resource_id}|${one.slot_id}|${one.date}`,
        ),
      );

      setPicked((booking.room_ids ?? []).map((id: any) => Number(id)));
      setPickedSeats((booking.seat_ids ?? []).map((id: any) => Number(id)));
      setPickedSittings(
        (booking.sittings ?? []).map((one: any) => ({
          resource_id: Number(one.resource_id),
          slot_id: Number(one.slot_id),
          date: one.date,
          hall: one.hall ?? '',
          sitting: one.sitting ?? '',
          rent: Number(one.rent ?? 0),
        })),
      );

      // ⚠️ The grids are read straight away, over the booking's own dates.
      // Without them the form shows what is held but not what else is free,
      // and the clerk cannot add anything -- which is half the reason to edit.
      await checkFor(
        String(booking.check_in_date ?? '').slice(0, 10),
        String(booking.check_out_date ?? '').slice(0, 10),
        false,
      );
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const closeForm = () => {
    setForm(null);
    setOwnRooms([]);
    setOwnSittings([]);
    setWarning(null);
    forget();
  };

  const check = () => {
    if (!form?.check_in_date || !form?.check_out_date) {
      toast.error('Give the dates first — arriving and leaving');
      return;
    }

    return checkFor(form.check_in_date, form.check_out_date, true);
  };

  /**
   * Read what is free over a range.
   *
   * ⚠️ `clearPicks` is FALSE when a booking is opened for editing. The
   * rooms it already holds are shown as picked, and wiping them would make an
   * edit look like an empty booking -- one Save away from being emptied.
   */
  const checkFor = async (from: string, to: string, clearPicks: boolean) => {
    if (clearPicks) {
      setPicked([]);
      setPickedSeats([]);
      setPickedSittings([]);
    }

    try {
      const result = await dispatch(
        availabilityRead({
          branch_id: branchId,
          check_in_date: from,
          check_out_date: to,
          building_id: building || undefined,
        }),
      ).unwrap();

      if (!result.free_count) {
        toast.info('Nothing is free on those dates.');
      }
    } catch (error: any) {
      toast.error(String(error));
    }

    // ⚠️ THE SITTINGS INSIDE THE SAME NIGHTS, in one read rather than one
    // per day. The stay runs to the morning of check-out, and nobody holds a
    // hall on the morning they leave -- so the run ends the night before.
    //
    // ⚠️ Its failure is NOT the room screen's failure. A property with no
    // hall, or no sittings defined, answers 404 with a sentence saying so --
    // which is true and completely uninteresting to a clerk booking rooms. It
    // is swallowed, and the hall section simply does not appear.
    try {
      const lastNight = new Date(to);
      lastNight.setDate(lastNight.getDate() - 1);

      await dispatch(
        hallsRead({
          branch_id: branchId,
          date_from: from,
          date_to: asText(lastNight),
          building_id: building || undefined,
        }),
      ).unwrap();
    } catch {
      // No halls on this property, or no sittings yet. Nothing to say.
    }
  };

  /**
   * Clicking a room means two different things, and the room says which.
   *
   * A room with beds for sale opens them; anything else is picked as a room.
   * The alternative -- a second control on the tile -- would put a button on
   * something the size of a postage stamp, and the tile already carries three
   * things.
   */
  const toggle = (room: LayoutRoom) => {
    // ⚠️ Blocked, unless it is OURS. A room this booking already holds comes
    // back from availability marked "taken" -- by this very booking -- and
    // returning early here left the tile clickable but dead: the clerk pressed
    // it and nothing happened, which reads worse than a disabled tile.
    const ours = picked.includes(room.id) || ownRooms.includes(room.id);

    if (room.blocked_reason && !ours) return;

    if (room.seats?.length) {
      setOpenBeds((prev) => (prev?.id === room.id ? null : room));
      return;
    }

    setPicked((prev) =>
      prev.includes(room.id) ? prev.filter((id) => id !== room.id) : [...prev, room.id],
    );
  };

  const toggleSeat = (seat: LayoutSeat) => {
    if (seat.state !== 'free') return;

    setPickedSeats((prev) =>
      prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id],
    );
  };

  const pickedRooms = useMemo(
    () => rooms.filter((room) => picked.includes(room.id)),
    [rooms, picked],
  );

  /** The chosen beds, each with the room it is in, for the summary line. */
  const pickedBeds = useMemo(
    () =>
      rooms.flatMap((room) =>
        (room.seats ?? [])
          .filter((seat) => pickedSeats.includes(seat.id))
          .map((seat) => ({ seat, room })),
      ),
    [rooms, pickedSeats],
  );

  /** One hall, one day, one sitting -- the identity of a cell. */
  const sittingKey = (hallId: number, slotId: number, on: string) => `${hallId}|${slotId}|${on}`;

  const hallRows: any[] = halls?.halls ?? [];

  // ⚠️ DECLARED AFTER WHAT IT READS. `const` does not hoist: placed above
  // hallRows this threw "Cannot access 'hallRows' before initialization" on the
  // first render, and the whole bookings screen came up blank -- a syntax the
  // build is perfectly happy with.
  /**
   * The hall rows folded into one card per hall, days inside it.
   *
   * ⚠️ The server sends one row per hall PER DAY, which is the right shape
   * for the lock and the wrong one for the eye: three days of one hall would
   * draw three headings for the same room. Folded here rather than there,
   * because the flat shape is what the booking form posts back.
   */
  const hallCards = useMemo(() => {
    const byHall = new Map<number, any>();

    for (const row of hallRows) {
      if (!byHall.has(row.id)) {
        byHall.set(row.id, {
          id: row.id,
          code: row.code,
          name: row.name || row.code,
          capacity: row.capacity,
          rent: row.rent,
          days: [],
        });
      }

      byHall.get(row.id).days.push({ date: row.date, sittings: row.sittings });
    }

    return [...byHall.values()];
  }, [hallRows]);

  /**
   * What a sitting cell looks like -- the ROOM GRID's own palette.
   *
   * ⚠️ Teal is free and rose is booked on both halves of this screen. A
   * second colour scheme for halls would mean learning twice which colour can
   * be clicked, on one page, in one act.
   */
  const lookOfSitting = (cell: any, isChosen: boolean) => {
    if (isChosen) return BOOKING_LOOKS.checked_in ?? BOOKING_LOOKS.booked;
    if (cell.state === 'free') return BOOKING_LOOKS.free;
    if (cell.state === 'closed') return BOOKING_LOOKS.closed ?? BOOKING_LOOKS.booked;

    return BOOKING_LOOKS[cell.state] ?? BOOKING_LOOKS.booked;
  };

  const chosenSittings = useMemo(
    () => new Set(pickedSittings.map((one) => sittingKey(one.resource_id, one.slot_id, one.date))),
    [pickedSittings],
  );

  const toggleSitting = (row: any, cell: any, on?: string) => {
    const date = on ?? row.date;
    const at = sittingKey(row.id, cell.slot_id, date);

    // ⚠️ Free, or already ours. Anything else belongs to another booking.
    if (cell.state !== 'free' && !chosenSittings.has(at) && !ownSittings.includes(at)) {
      return;
    }

    setPickedSittings((prev) =>
      chosenSittings.has(at)
        ? prev.filter((one) => sittingKey(one.resource_id, one.slot_id, one.date) !== at)
        : [
            ...prev,
            {
              resource_id: row.id,
              slot_id: cell.slot_id,
              date,
              hall: row.name || row.code,
              sitting: cell.slot,
              rent: Number(row.rent ?? 0),
            },
          ],
    );
  };

  // ⚠️ A SITTING IS NOT MULTIPLIED BY THE NIGHTS. A room costs its rent
  // once per night; a hall costs its rent once per sitting taken, and a
  // three-night stay with one wedding in it is one hall charge. Folding it into
  // the room total would quote a wedding three times over.
  const sittingsTotal = pickedSittings.reduce((sum, one) => sum + one.rent, 0);

  const anyPicked = picked.length + pickedSeats.length + pickedSittings.length;

  // Room rents summed across the nights. Never a bed rate divided or multiplied
  // into a room one -- these are whole-room lets and nothing else (2.8).
  // Rooms at the room rate, beds at their own. Added, never derived from one
  // another -- see 2.8 and the note at the top.
  const total = useMemo(
    () =>
      pickedRooms.reduce((sum, room) => sum + Number(room.rent ?? 0) * nights, 0) +
      pickedBeds.reduce((sum, { seat }) => sum + Number(seat.rent ?? 0) * nights, 0) +
      // ⚠️ NOT multiplied by the nights. A room earns its rent once per
      // night; a hall earns its rent once per SITTING taken, and a three-night
      // stay with one wedding in it is one hall charge. Multiplying here would
      // quote that wedding three times over.
      sittingsTotal,
    [pickedRooms, pickedBeds, nights, sittingsTotal],
  );

  /**
   * What the form is asking for, in the server's own words.
   *
   * ⚠️ Built ONCE and used three times -- the dry run, the write, and the
   * retry after the warning. Three copies of this object would be three chances
   * for the figure the clerk was shown to differ from the one that was applied.
   */
  const payloadOf = () => ({
    branch_id: branchId,
    room_ids: picked,
    seat_ids: pickedSeats,
    sittings: pickedSittings.map((one) => ({
      resource_id: one.resource_id,
      slot_id: one.slot_id,
      date: one.date,
    })),
    check_in_date: form.check_in_date,
    check_out_date: form.check_out_date,
    booker_name: form.booker_name,
    booker_mobile: form.booker_mobile || undefined,
    stated_adults: Number(form.stated_adults) || 0,
    stated_children: Number(form.stated_children) || 0,
    notes: form.notes || undefined,

    // ⚠️ THE FORM ASKED AND NOTHING SENT IT. "Confirmed or held" sat on the
    // edit screen, the clerk moved it to Confirmed, the save succeeded and the
    // booking stayed held -- the answer never left the browser, and the server
    // did not validate it either. A control that does nothing is worse than no
    // control: the desk believes the guest is confirmed and the sweep releases
    // their room.
    //
    // Sent on every edit, including the ones that do not move it: the server
    // compares it with what the booking already is and treats "the same" as no
    // change at all.
    status: form.status,
  });

  const save = async () => {
    if (!anyPicked) {
      toast.error('Pick at least one room, bed or sitting');
      return;
    }

    if (!form.booker_name?.trim()) {
      toast.error('Who is booking?');
      return;
    }

    // ⚠️ AN EDIT ASKS FIRST. A night that is already billed cannot be dropped
    // -- the server refuses it -- so the dry run is what turns that refusal
    // into something the clerk reads BEFORE filling the form in, instead of an
    // error after pressing Save. A new booking has nothing to drop and goes
    // straight through.
    if (form.id && !warning) {
      try {
        const preview: any = await dispatch(
          bookingUpdate({ ...payloadOf(), id: form.id, dry_run: true }),
        ).unwrap();

        // `refused` is the server's own word for it. The count is read as well,
        // so a server that has not been updated yet still stops here rather
        // than sending a change it is about to reject.
        if (preview?.data?.refused || Number(preview?.data?.billed_dropping ?? 0) > 0) {
          setWarning(preview.data);

          return;
        }
      } catch (error: any) {
        toast.error(String(error));

        return;
      }
    }

    try {
      const result = await dispatch(
        form.id
          ? bookingUpdate({ ...payloadOf(), id: form.id })
          : bookingSave({
          branch_id: branchId,
          room_ids: picked,
          seat_ids: pickedSeats,
          // ⚠️ One booking, one folio, one bill. The server takes rooms and
          // sittings in the same request and stretches the stay's dates over
          // both -- which is why a wedding with rooms for the guests is not two
          // bookings and two bills.
          sittings: pickedSittings.map((one) => ({
            resource_id: one.resource_id,
            slot_id: one.slot_id,
            date: one.date,
          })),
          check_in_date: form.check_in_date,
          check_out_date: form.check_out_date,
          booking_type: form.booking_type,
          status: form.status,
          booker_name: form.booker_name,
          booker_mobile: form.booker_mobile || undefined,
          stated_adults: Number(form.stated_adults) || 0,
          stated_children: Number(form.stated_children) || 0,
          notes: form.notes || undefined,
        }),
      ).unwrap();

      toast.success(result.message);
      setWarning(null);
      closeForm();
      load();
    } catch (error: any) {
      // Usually the clash: somebody took one of these rooms while the form was
      // open. The server's sentence says that, and says nothing was booked --
      // which is what the clerk has to know before trying again.
      toast.error(String(error));
      setPicked([]);
      setPickedSeats([]);
      setPickedSittings([]);
    }
  };

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
        render: (row: any) => (
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
        headerClass: 'text-center',
        cellClass: 'text-center',
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

          if (!rooms && !sittings) return 0;

          return (
            <span className="inline-flex flex-col items-center leading-tight">
              {rooms ? (
                <span className="text-black dark:text-white">
                  {rooms} {rooms === 1 ? 'room' : 'rooms'}
                </span>
              ) : null}

              {/* A hall is the thing somebody scans this list for -- "have we
                  got the centre on the 27th" -- so it is coloured rather than
                  left as another number in a column of numbers. */}
              {sittings ? (
                <span className="text-xs font-medium text-primary dark:text-secondary">
                  {sittings} {sittings === 1 ? 'sitting' : 'sittings'}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        key: 'guests',
        header: 'Guests',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => (
          <span
            title="Adults and children as stated at booking. What actually arrives is recorded at check-in."
          >
            {row.stated_adults}
            {row.stated_children ? ` + ${row.stated_children}` : ''}
          </span>
        ),
      },
      {
        key: 'booking_type',
        header: 'Type',
        render: (row: any) =>
          (row.booking_type ?? '').charAt(0).toUpperCase() + (row.booking_type ?? '').slice(1),
      },
      {
        key: 'status',
        header: 'Status',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => {
          const look = STATUS_LOOK[row.status];

          // Who is actually in, next to the word for it. Counted from the guest
          // rows, so it is the names the desk took -- not the number the
          // telephone gave, which is the Guests column two along.
          const arrived = Number(row.guests_count ?? 0);
          const stated = Number(row.stated_adults ?? 0) + Number(row.stated_children ?? 0);

          return (
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={`inline-block rounded border px-2 py-0.5 text-[0.65rem] font-semibold ${
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
                <button
                  type="button"
                  onClick={() => navigate(`${routes.hotel_booking_check_in}/${row.id}`)}
                  className={`${link} text-primary dark:text-secondary`}
                >
                  {row.status === 'checked_in' ? 'Guests' : 'Check in'}
                </button>
              </span>

              {/* The bill. Offered on every live booking rather than only on a
                  checked-in one: an advance is taken on the telephone, long
                  before anybody arrives. */}
              <span>
                <button
                  type="button"
                  onClick={() => navigate(`${routes.hotel_booking_folio}/${row.id}`)}
                  className={`${link} text-primary dark:text-secondary`}
                >
                  Bill
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
    [branchId],
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
              closeForm();
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
            <SearchInput search={search} setSearchValue={setSearch} className="w-56" />
            <div className="w-48">
              <DropdownCommon
                id="booking_status_filter"
                name="booking_status_filter"
                label="Show"
                data={FILTER_OPTIONS}
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
              />
            </div>
          </>
        }
        formOpen={form !== null}
        // The shell says "Edit Booking" and keeps the row open when this is
        // true, which is exactly what an edit wants.
        editing={!!form?.id}
        onNew={openNew}
        onCancel={closeForm}
        onSave={save}
        saving={saving}
        saveLabel={
          form?.id
            ? // ⚠️ An edit is not a booking. "Book 2 rooms" on a booking that
              // already exists reads as taking a second one, and the number on
              // the button is what somebody checks before pressing it.
              `Save ${form.booking_no ?? 'booking'}`
            : anyPicked
            ? `Book ${[
                picked.length ? `${picked.length} ${picked.length === 1 ? 'room' : 'rooms'}` : null,
                pickedSeats.length
                  ? `${pickedSeats.length} ${pickedSeats.length === 1 ? 'bed' : 'beds'}`
                  : null,
                pickedSittings.length
                  ? `${pickedSittings.length} ${pickedSittings.length === 1 ? 'sitting' : 'sittings'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' and ')}`
            : 'Book'
        }
        form={
          form && (
            <>
              {/* 1 -- the question */}
              <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-4">
                <InputDatePicker
                  id="check_in_date"
                  name="check_in_date"
                  label="Arriving"
                  selectedDate={asDate(form.check_in_date)}
                  setSelectedDate={setDate('check_in_date')}
                  setCurrentDate={setDate('check_in_date')}
                  className="w-full"
                />
                <InputDatePicker
                  id="check_out_date"
                  name="check_out_date"
                  label="Leaving"
                  selectedDate={asDate(form.check_out_date)}
                  setSelectedDate={setDate('check_out_date')}
                  setCurrentDate={setDate('check_out_date')}
                  className="w-full"
                />
                <DropdownCommon
                  id="booking_building"
                  name="booking_building"
                  label="Building"
                  data={[{ id: '', name: 'Anywhere on the property' }, ...buildingChoices]}
                  value={building}
                  onChange={(e: any) => {
                    setBuilding(e.target.value);
                    forget();
                  }}
                />
                <div className="pb-0.5">
                  <ButtonLoading
                    onClick={check}
                    buttonLoading={checking}
                    label="See what is free"
                    variant="primary"
                    icon={<FiSearch size={16} />}
                  />
                </div>
              </div>

              {/* Drawn only once there is something painted. A colour chooser
                  over an empty grid is a control with nothing to control. */}
              {availability ? (
                <div className="mt-3 w-56">
                  <DropdownCommon
                    id="booking_colour_mode"
                    name="booking_colour_mode"
                    label="Colour by"
                    data={BOOKING_COLOUR_MODES}
                    value={mode}
                    onChange={(e: any) => setMode(e.target.value as ColourMode)}
                  />
                </div>
              ) : null}

              {/* 2 -- the answer */}
              {availability ? (
                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-3 text-sm">
                    <span className="font-medium text-black dark:text-white">
                      {availability.free_count} free
                    </span>
                    <span className="text-xs text-gray-700 dark:text-gray-100">
                      { formatDate(availability.check_in_date) } → { formatDate (availability.check_out_date) } ·{' '}
                      {nights} {nights === 1 ? 'night' : 'nights'}
                    </span>
                    {/* Said out loud, every time. It is the one thing about this
                        screen that somebody could reasonably get wrong. */}
                    {/* <span className="text-xs italic text-gray-400">
                      what was free a moment ago — a room is not yours until it is booked
                    </span> */}
                  </div>

                  {/* The key. It carries the badge as well as the colour,
                      because the colour is the half that does not survive a
                      grey printer -- and because FREE and BKD are read faster
                      than teal and rose are told apart. */}
                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {legend.map((entry) => (
                      <span key={entry.badge + entry.label} className="flex items-center gap-1.5 text-xs">
                        <span
                          className={`flex h-4 w-9 items-center justify-center rounded border text-[0.5rem] font-bold ${entry.className}`}
                        >
                          {entry.badge}
                        </span>
                        <span className="text-gray-700 dark:text-gray-100">{entry.label}</span>
                      </span>
                    ))}
                  </div>

                  {buildings.length ? (
                    <PropertyGrid
                      buildings={buildings}
                      mode={mode}
                      typeIndex={typeIndex}
                      selectedIds={[...picked, ...(openBeds ? [openBeds.id] : [])]}
                      ownIds={ownRooms}
                      onSelect={toggle}
                      // Tiles that carry a reason stop being clickable -- but
                      // keep their colour and their tooltip, because WHY is the
                      // whole of what the clerk needs.
                      picking
                      summaryOf={(building) => {
                        const chosen = building.floors
                          .flatMap((f) => f.rooms)
                          .concat(building.unfloored)
                          .filter((room) => picked.includes(room.id));

                        const bedsHere = building.floors
                          .flatMap((f) => f.rooms)
                          .concat(building.unfloored)
                          .flatMap((room) => (room.seats ?? []).filter((s) => pickedSeats.includes(s.id)));

                        if (!chosen.length && !bedsHere.length) return null;

                        const here =
                          chosen.reduce((sum, room) => sum + Number(room.rent ?? 0) * nights, 0) +
                          bedsHere.reduce((sum, seat) => sum + Number(seat.rent ?? 0) * nights, 0);

                        return `${[
                          chosen.length ? `${chosen.length} ${chosen.length === 1 ? 'room' : 'rooms'}` : null,
                          bedsHere.length ? `${bedsHere.length} ${bedsHere.length === 1 ? 'bed' : 'beds'}` : null,
                        ]
                          .filter(Boolean)
                          .join(' + ')} picked here · ${money(here)}`;
                      }}
                    />
                  ) : (
                    <p className="rounded border border-stroke p-4 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
                      No rooms match. Try another building, or set the property up first.
                    </p>
                  )}

                  {/* The beds of one room, under the grid rather than inside a
                      tile. A tile is the size of a postage stamp and already
                      carries three things; six beds with their prices do not go
                      in it, and a popover over a scrolling row would be clipped
                      by the same overflow that shaved the selection ring. */}
                  {openBeds ? (
                    <div className="mt-3 rounded border border-primary/50 bg-primary/5 p-3">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-black dark:text-white">
                          Beds in {openBeds.display_name}
                          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                            sold by the bed — pick the ones you want
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenBeds(null)}
                          className="text-xs font-medium text-primary hover:underline dark:text-secondary"
                        >
                          Close
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(rooms.find((r) => r.id === openBeds.id)?.seats ?? []).map((seat) => {
                          const chosen = pickedSeats.includes(seat.id);
                          const free = seat.state === 'free';

                          return (
                            <button
                              key={seat.id}
                              type="button"
                              disabled={!free}
                              onClick={() => toggleSeat(seat)}
                              title={seat.taken_by ?? undefined}
                              className={`w-28 rounded border px-2 py-1.5 text-left text-xs transition ${
                                !free
                                  ? 'cursor-not-allowed border-rose-400 bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-50'
                                  : chosen
                                    ? 'border-primary bg-primary/20 ring-1 ring-inset ring-primary'
                                    : 'border-teal-400 bg-teal-100 text-teal-900 hover:brightness-95 dark:bg-teal-500/25 dark:text-teal-50 dark:hover:brightness-125'
                              }`}
                            >
                              <div className="flex items-baseline justify-between gap-1">
                                <span className="font-semibold">Bed {seat.code}</span>
                                <span className="text-[0.55rem] font-bold uppercase opacity-70">
                                  {free ? (chosen ? 'TAKING' : 'FREE') : 'TAKEN'}
                                </span>
                              </div>
                              {/* Its own rent, never the room's divided by the
                                  beds -- see the note at the top. */}
                              <div className="text-[0.65rem] opacity-80">
                                {money(seat.rent)}
                                <span className="opacity-70"> / night</span>
                              </div>
                              {seat.name ? (
                                <div className="truncate text-[0.6rem] opacity-70">{seat.name}</div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* ⚠️ THE HALLS, INSIDE THE SAME STAY. A room is picked once
                      for the whole booking; a hall is picked per DAY, because
                      the evening of the 28th and the evening of the 29th are
                      two different things to sell.

                      Drawn only where the property has halls AND sittings --
                      a hotel without a function room never sees this, and the
                      read that fills it fails quietly for exactly that
                      reason. */}
                  {hallRows.length ? (
                    <div className="mt-4">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-black dark:text-white">
                          Halls and function spaces
                          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                            sold by the sitting, not by the night
                          </span>
                        </span>

                        {pickedSittings.length ? (
                          <button
                            type="button"
                            onClick={() => setPickedSittings([])}
                            className="text-xs font-medium text-primary hover:underline dark:text-secondary"
                          >
                            Clear sittings
                          </button>
                        ) : null}
                      </div>

                      {/*  + W + ONE CARD PER HALL, drawn the way a BUILDING is drawn --
                          a heading, then a row per day, then a tile per
                          sitting. The room grid stands right above this one,
                          and a table of tick-boxes underneath it was a second
                          visual language on one screen: the clerk had to learn
                          twice which colour meant taken.

                          The colours are the room grid's own (layoutPalette),
                          so teal is free and rose is booked in both halves. */}
                      <div className="flex flex-wrap items-start gap-4">
                        {hallCards.map((card: any) => (
                          <div
                            key={card.id}
                            className="rounded border border-stroke dark:border-strokedark"
                          >
                            <div className="border-b border-stroke px-3 py-2 dark:border-strokedark">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-black dark:text-white">
                                  {card.name}
                                </span>
                                <span className="text-xs text-gray-400">{card.code}</span>
                              </div>

                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {card.capacity ? `${card.capacity} seats` : 'no seating set'}
                                {/* \u00a72.8: on a hall the rent is the price of ONE
                                    sitting. The room card beside it means the
                                    other thing by "rent". */}
                                {card.rent === null
                                  ? ' · no rate set'
                                  : ` · ${money(card.rent)} a sitting`}
                              </div>
                            </div>

                            <div className="px-3 py-2">
                              {card.days.map((day: any) => (
                                <div key={day.date} className="flex items-center gap-2 py-1">
                                  {/* The day label sits where a floor number
                                      sits on the room grid, for the same
                                      reason: the eye runs down it. */}
                                  <span className="w-16 shrink-0 text-[0.7rem] text-gray-500 dark:text-gray-400">
                                    {formatDate(day.date)}
                                  </span>

                                  <div className="flex flex-wrap gap-1.5">
                                    {day.sittings.map((cell: any) => {
                                      const on = sittingKey(card.id, cell.slot_id, day.date);
                                      const isChosen = chosenSittings.has(on);
                                      const look = lookOfSitting(cell, isChosen);

                                      const dead =
                                        cell.state !== 'free'
                                        && !isChosen
                                        && !ownSittings.includes(on);

                                      return (
                                        <button
                                          key={cell.slot_id}
                                          type="button"
                                          disabled={dead}
                                          onClick={() => toggleSitting(card, cell, day.date)}
                                          title={
                                            cell.blocked_reason
                                            || cell.taken_by
                                            || cell.label
                                            || cell.slot
                                          }
                                          className={`flex w-28 flex-col items-start gap-0.5 rounded border px-2 py-1.5 text-left ${look.className} ${
                                            dead ? 'cursor-not-allowed opacity-60' : ''
                                          } ${isChosen ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-boxdark' : ''}`}
                                        >
                                          <span className="flex w-full items-baseline justify-between gap-1">
                                            <span className="text-[0.8rem] font-semibold leading-none">
                                              {cell.slot}
                                            </span>
                                            {/* Beside the colour, never
                                                instead of it -- the same rule
                                                the room tiles follow. */}
                                            <span className="text-[0.5rem] font-bold uppercase leading-none opacity-70">
                                              {look.badge}
                                            </span>
                                          </span>

                                          {/* The reason is a sentence, not a
                                              colour: "roof leak" and "held for
                                              the whole day" are different
                                              problems. */}
                                          <span className="text-[0.55rem] leading-tight opacity-80">
                                            {cell.blocked_reason || cell.taken_by || ''}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 rounded border border-dashed border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
                  Pick the dates, then <strong>See what is free</strong>.
                </p>
              )}

              {/* 3 -- who it is for. Drawn only once there is something to book,
                  because asking for a guest's name before there is a room to put
                  them in is a form in the wrong order. */}
              {anyPicked ? (
                <>
                  <div className="mt-4 rounded border border-stroke p-3 dark:border-strokedark">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-black dark:text-white">
                        {[
                          ...pickedRooms.map((room) => room.display_name),
                          // Named by room and bed together: "GDN / 301 bed 2"
                          // is what the clerk says out loud, and "bed 2" alone
                          // means nothing across four dormitories.
                          ...pickedBeds.map(({ seat, room }) => `${room.display_name} bed ${seat.code}`),
                        ].join(', ')}
                      </span>
                      <span className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {anyPicked} × {nights} {nights === 1 ? 'night' : 'nights'} ·{' '}
                        </span>
                        <span className="font-semibold text-black dark:text-white">
                          {money(total)}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                      <InputElement
                        id="booker_name"
                        name="booker_name"
                        label="Who is booking"
                        placeholder="The name on the telephone"
                        title="Not necessarily the guest, and not a customer account. A father booking beds for three students is neither — guests are recorded at check-in."
                        value={form.booker_name}
                        onChange={set('booker_name')}
                      />
                      <InputElement
                        id="booker_mobile"
                        name="booker_mobile"
                        label="Mobile"
                        placeholder="01711000000"
                        value={form.booker_mobile ?? ''}
                        onChange={set('booker_mobile')}
                      />
                      <InputElement
                        id="stated_adults"
                        name="stated_adults"
                        label="Adults"
                        type="number"
                        min={0}
                        title="What was stated on the telephone. Over capacity warns at the desk; it never blocks."
                        value={String(form.stated_adults ?? 0)}
                        onChange={set('stated_adults')}
                      />
                      <InputElement
                        id="stated_children"
                        name="stated_children"
                        label="Children"
                        type="number"
                        min={0}
                        title="Children count as guests for towels and soap. What counts as a child is a setting the client has not answered yet."
                        value={String(form.stated_children ?? 0)}
                        onChange={set('stated_children')}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                      <DropdownCommon
                        id="booking_type"
                        name="booking_type"
                        label="Type"
                        data={TYPE_OPTIONS}
                        value={form.booking_type}
                        onChange={set('booking_type')}
                        description="Corporate needs a company to bill, which comes with the billing screen."
                      />
                      <DropdownCommon
                        id="booking_status"
                        name="booking_status"
                        label="Confirmed or held"
                        data={STATUS_OPTIONS}
                        value={form.status}
                        onChange={set('status')}
                        description={`A hold keeps the rooms for ${holdLength(times?.hold_hours)}, then the beds go back on sale.`}
                      />
                      <div className="md:col-span-2">
                        <InputElement
                          id="booking_notes"
                          name="notes"
                          label="Notes"
                          placeholder="Late arrival, sea-facing asked for…"
                          value={form.notes ?? ''}
                          onChange={set('notes')}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
                    Guest names, NIDs and which bed each takes are recorded when they arrive, not
                    now. All the rooms are booked together — if one of them has gone in the
                    meantime, none is booked and you are told which.
                  </p>
                </>
              ) : null}
            </>
          )
        }
        columns={columns}
        rows={bookings?.data ?? []}
        loading={loading}
        emptyMessage="No bookings yet. Press New Booking, pick the dates, and see what is free."
        page={page}
        totalPages={Math.ceil((bookings?.total ?? 0) / (bookings?.per_page || 10))}
        onPageChange={setPage}
      />

      {/* The app's own dialog, not the browser's. It can say what cancelling
          does -- which is not obvious, because the booking stays and only the
          nights go back -- and the reason it takes is the one the record
          keeps. */}
      {/* ⚠️ NOT A WARNING ANY MORE -- A REFUSAL, EXPLAINED.
          It offered "Change it anyway", and the charge then stayed on the folio
          with nothing able to take it off: a guest moved 101 → 102 → 103 on one
          night ended up holding one room and owing for three, each with its own
          posted voucher. The server refuses it now, so the button that offered
          to do it would be offering something that cannot happen -- hence
          `disabled`, with the message carrying the reason and the way out. */}
      <ConfirmModal
        show={warning !== null}
        title="These nights are already billed"
        confirmLabel="Cannot be dropped"
        cancelLabel="Close"
        disabled
        className="bg-primary hover:bg-primary/90"
        loading={saving}
        onCancel={() => setWarning(null)}
        // Belt and braces. The button is disabled, so this cannot be reached --
        // and if it ever were, closing is the one thing that must not write.
        onConfirm={() => setWarning(null)}
        message={
          <>
            <span className="block">
              <strong className="text-danger dark:text-red-400">
                {warning?.billed_dropping} of the nights being dropped {Number(warning?.billed_dropping) === 1 ? 'is' : 'are'} on the bill.
              </strong>{' '}
              A billed night cannot be taken off a booking — the charge is posted to the
              ledger with a voucher against it, and nothing here can unwrite that.
            </span>

            {(warning?.billed_lines ?? []).length ? (
              <span className="mt-2 block text-xs text-gray-600 dark:text-gray-300">
                {(warning?.billed_lines ?? [])
                  .map((line: any) => `${line.description} · ${money(line.amount)}`)
                  .join(', ')}
              </span>
            ) : null}

            {/* A refusal that only refuses teaches people to stop using the
                screen. This is what is still open to them. */}
            <span className="mt-2 block text-xs text-gray-600 dark:text-gray-300">
              Rooms and sittings may still be added, dates extended, and any night that
              has not been billed dropped. A guest who is really leaving a room is
              checked out of it, which keeps what was billed.
            </span>
          </>
        }
      />

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
              {cancelling?.check_in_date} → {cancelling?.check_out_date} ·{' '}
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
