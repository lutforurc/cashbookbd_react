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
import { BOOKING_COLOUR_MODES, ColourMode, buildTypeIndex, lookOf } from '../layoutPalette';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { buildingDdl } from '../hotelSetupSlice';
import { clockTime, money, useDebounced } from '../setupHelpers';
import { DdlOption, LayoutBuilding, LayoutRoom, LayoutSeat } from '../types';
import {
  availabilityRead,
  bookingCancel,
  bookingList,
  bookingSave,
  clearAvailability,
  clearBookings,
} from './bookingSlice';
import { BookingType } from './types';

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

  // From the signed-in user's own property, which covers almost everybody.
  // The effect below covers the account that has none.
  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<any>(null);
  const [building, setBuilding] = useState('');

  // The booking being cancelled, and why. Held here rather than asked for by
  // window.prompt: the browser's own box is the wrong shape for a question that
  // has to name the booking, say what cancelling actually does, and take a
  // sentence for the record -- and it is drawn by the operating system, so it
  // looks like something the page did not mean to do.
  const [cancelling, setCancelling] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [picked, setPicked] = useState<number[]>([]);

  // Beds are their own selection, kept apart from rooms because the server
  // takes them apart: room_ids are let whole, seat_ids one bed at a time, and
  // folding them into one list would lose which is which.
  const [pickedSeats, setPickedSeats] = useState<number[]>([]);

  // Whose beds are on show. One room at a time -- six dormitories opened at
  // once is a wall of beds under a grid that was drawn to be glanced at.
  const [openBeds, setOpenBeds] = useState<LayoutRoom | null>(null);

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

  const closeForm = () => {
    setForm(null);
    forget();
  };

  const check = async () => {
    if (!form?.check_in_date || !form?.check_out_date) {
      toast.error('Give the dates first — arriving and leaving');
      return;
    }

    setPicked([]);

    try {
      const result = await dispatch(
        availabilityRead({
          branch_id: branchId,
          check_in_date: form.check_in_date,
          check_out_date: form.check_out_date,
          building_id: building || undefined,
        }),
      ).unwrap();

      if (!result.free_count) {
        toast.info('Nothing is free on those dates.');
      }
    } catch (error: any) {
      toast.error(String(error));
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
    if (room.blocked_reason) return;

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

  const anyPicked = picked.length + pickedSeats.length;

  // Room rents summed across the nights. Never a bed rate divided or multiplied
  // into a room one -- these are whole-room lets and nothing else (2.8).
  // Rooms at the room rate, beds at their own. Added, never derived from one
  // another -- see 2.8 and the note at the top.
  const total = useMemo(
    () =>
      pickedRooms.reduce((sum, room) => sum + Number(room.rent ?? 0) * nights, 0) +
      pickedBeds.reduce((sum, { seat }) => sum + Number(seat.rent ?? 0) * nights, 0),
    [pickedRooms, pickedBeds, nights],
  );

  const save = async () => {
    if (!anyPicked) {
      toast.error('Pick at least one room or bed');
      return;
    }

    if (!form.booker_name?.trim()) {
      toast.error('Who is booking?');
      return;
    }

    try {
      const result = await dispatch(
        bookingSave({
          branch_id: branchId,
          room_ids: picked,
          seat_ids: pickedSeats,
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
      closeForm();
      load();
    } catch (error: any) {
      // Usually the clash: somebody took one of these rooms while the form was
      // open. The server's sentence says that, and says nothing was booked --
      // which is what the clerk has to know before trying again.
      toast.error(String(error));
      setPicked([]);
      setPickedSeats([]);
    }
  };

  const askToCancel = (row: any) => {
    setCancelling(row);
    setReason('');
  };

  const cancel = async () => {
    if (!cancelling) return;

    try {
      const result = await dispatch(
        // An empty reason is allowed -- it is a choice, and a required field
        // that nobody wants to fill gets filled with a full stop. The server
        // writes "no reason given" against it and the record still says who
        // cancelled it and when.
        bookingCancel({ id: cancelling.id, reason: reason.trim() }),
      ).unwrap();

      toast.success(result.message);
      setCancelling(null);
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
            <div>
              {row.check_in_date} → {row.check_out_date}
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
        header: 'Rooms',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => row.stated_rooms ?? 0,
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

          return (
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={`inline-block rounded border px-2 py-0.5 text-[0.65rem] font-semibold ${
                  look?.className ?? ''
                }`}
              >
                {look?.label ?? (row.status ?? '').replace('_', ' ')}
              </span>

              {/* What it is WAITING for, under what it is. A hold nobody chases
                  expires, and a confirmed booking whose guests are at the desk
                  needs somebody to press Check in -- neither is visible from
                  the state alone. */}
              {row.status === 'hold' && row.hold_until ? (
                <span className="text-[0.6rem] text-gray-500 dark:text-gray-400">
                  until {String(row.hold_until).slice(0, 10)}
                </span>
              ) : null}
              {row.status === 'confirmed' ? (
                <span className="text-[0.6rem] text-gray-400">nobody checked in</span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'action',
        header: 'Action',
        headerClass: 'text-center w-40',
        cellClass: 'text-center',
        render: (row: any) => {
          if (['cancelled', 'expired'].includes(row.status)) {
            return <span className="text-xs text-gray-400">—</span>;
          }

          return (
            <div className="flex items-center justify-center gap-3">
              {/* Named for what it does rather than for the stage it is.
                  "Check in" is what the desk calls it; "allotment" is what
                  the spec calls it, and nobody at a desk says that. */}
              <button
                type="button"
                onClick={() => navigate(`${routes.hotel_booking_check_in}/${row.id}`)}
                className="text-xs text-primary hover:underline"
              >
                {row.status === 'checked_in' ? 'Guests' : 'Check in'}
              </button>

              {row.status === 'checked_out' ? null : (
                <button
                  type="button"
                  onClick={() => askToCancel(row)}
                  className="text-xs text-danger hover:underline"
                >
                  Cancel
                </button>
              )}
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
              className="ml-2 text-xs text-primary hover:underline print:hidden"
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
        editing={false}
        onNew={openNew}
        onCancel={closeForm}
        onSave={save}
        saving={saving}
        saveLabel={
          anyPicked
            ? `Book ${[
                picked.length ? `${picked.length} ${picked.length === 1 ? 'room' : 'rooms'}` : null,
                pickedSeats.length
                  ? `${pickedSeats.length} ${pickedSeats.length === 1 ? 'bed' : 'beds'}`
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {availability.check_in_date} → {availability.check_out_date} ·{' '}
                      {nights} {nights === 1 ? 'night' : 'nights'}
                    </span>
                    {/* Said out loud, every time. It is the one thing about this
                        screen that somebody could reasonably get wrong. */}
                    <span className="text-xs italic text-gray-400">
                      what was free a moment ago — a room is not yours until it is booked
                    </span>
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
                        <span className="text-gray-600 dark:text-gray-300">{entry.label}</span>
                      </span>
                    ))}
                  </div>

                  {buildings.length ? (
                    <PropertyGrid
                      buildings={buildings}
                      mode={mode}
                      typeIndex={typeIndex}
                      selectedIds={[...picked, ...(openBeds ? [openBeds.id] : [])]}
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
                          className="text-xs text-primary hover:underline"
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
                        description="A hold keeps the rooms for seven days."
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
        onCancel={() => setCancelling(null)}
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
