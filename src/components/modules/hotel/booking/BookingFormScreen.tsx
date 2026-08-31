import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiSave, FiSearch, FiX } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import httpService from '../../../services/httpService';
import { API_HOTEL_PARTY_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
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
import { clockTime, money } from '../setupHelpers';
import { DdlOption, LayoutBuilding, LayoutRoom, LayoutSeat } from '../types';
import {
  availabilityRead,
  bookingRead,
  bookingSave,
  bookingUpdate,
  clearAvailability,
  hallsRead,
} from './bookingSlice';
import { BookingType } from './types';
import formatDate from '../../../utils/utils-functions/formatDate';

/**
 * Taking a booking, and changing one -- its own page.
 *
 * ⚠️ IT USED TO BE A PANEL ON THE LIST, folded out above the table, and it had
 * outgrown that by a long way. What is on this page is the availability grid
 * for a whole property, the halls with their sittings, and the details of the
 * party: on a laptop the list ended up far below the fold, and the form itself
 * had no address at all -- half filled in, it could not be reopened, the
 * browser's Back closed nothing, and nobody could send a colleague a link to
 * the booking they were arguing about.
 *
 * The rest of the module already worked this way: checking in, the bill and
 * checking out are each their own page with the booking's id on the end. This
 * is the one that was left behind.
 *
 * ⚠️ WHAT IT MUST NOT PRETEND, unchanged from when it was a panel: the
 * availability grid is what was free at the moment it was read. Nothing here
 * holds anything, two clerks may be looking at the same free room, and the
 * claim happens at the server against the unique key. So the grid is thrown
 * away the moment a date changes, a clash on save is shown as the server's own
 * sentence -- somebody took it while this form was open, and NOTHING was
 * booked -- and changing a date drops what was picked rather than keeping it
 * against nights nobody has checked.
 *
 * ⚠️ The two rents are never derived from each other (2.8). This screen adds up
 * what was picked; it never divides a room rate across beds, and never sums
 * beds into a room rate.
 */

const TYPE_OPTIONS: { id: BookingType; name: string }[] = [
  { id: 'individual', name: 'Individual' },
  { id: 'group', name: 'Group' },
  // The bill goes to a company and the money comes later (6.4), so it needs a
  // payer to point at. The server refuses a corporate booking that names none.
  { id: 'corporate', name: 'Corporate' },
  // ⚠️ A sale with no room behind it -- somebody who walks in for a meal. It
  // takes no room, bed or hall, holds no inventory and is never checked in;
  // what it has is a folio and a bill, which is the whole reason it exists:
  // the restaurant's money lands where the room's does, under the same charge
  // types, on the same reports.
  { id: 'walk_in', name: 'Walk-in (no room)' },
];

const STATUS_OPTIONS = [
  { id: 'confirmed', name: 'Confirmed' },
  { id: 'hold', name: 'Tentative hold' },
];

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
 * The companies this property already has on its customer list.
 *
 * ⚠️ A DROPDOWN, NEVER A TYPED NAME, and that is the whole reason it is
 * here. Typed, "ABC Traders" and "ABC traders" are two companies to every
 * query ever written afterwards, and nobody can say which is the real one. It
 * answers a party ID, so the question the desk actually asks -- who from this
 * company stayed, on which nights, and what is still owed -- has one thing to
 * group by.
 *
 * ⚠️ It answers `cust_party_infos.id`, which is what `billed_to_party_id`
 * points at. The chart dropdowns elsewhere in this app answer coa4 ids and are
 * NOT interchangeable with it.
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

const BookingFormScreen = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const location = useLocation();

  /** Present on the edit route, absent on the new one. That is the whole of it. */
  const { id } = useParams();

  // One selector per value -- useSelector compares by reference, so a selector
  // building an object would re-render on every action dispatched anywhere.
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const availability = useSelector((state: any) => state.hotelBooking.availability);
  const halls = useSelector((state: any) => state.hotelBooking.halls);
  const checking = useSelector((state: any) => state.hotelBooking.checking);
  const saving = useSelector((state: any) => state.hotelBooking.saving);
  const buildingOptions = useSelector((state: any) => state.hotelSetup.buildingOptions);
  const times = useSelector((state: any) => state.hotelBooking.times);

  const branches: any[] = branchDdlData?.protectedData?.data ?? [];

  /**
   * Which property this booking is for.
   *
   * ⚠️ Carried in the address rather than assumed. The list knows which
   * property it was showing; opened cold from a pasted link this page would
   * otherwise fall back to the signed-in user's own -- and take a booking on
   * the wrong site without saying so.
   */
  const [branchId, setBranchId] = useState<number | null>(
    Number(new URLSearchParams(location.search).get('branch')) || user?.branch_id || null,
  );

  const [form, setForm] = useState<any>(id ? null : blankBooking());
  const [building, setBuilding] = useState('');
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
   * one of them and not the other.
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
   * ⚠️ A BILLED NIGHT DROPPED IS MONEY LEFT ON THE BILL. Nothing takes a line
   * off a folio -- a credit note is §6.2 and is not built -- so the server
   * refuses it, and this is where the refusal is put in front of somebody.
   */
  /**
   * The company a corporate booking is billed to.
   *
   * ⚠️ Held as the whole chosen option, not just its id, because the picker
   * needs the label back to show what was chosen. Only the id is sent.
   */
  const [billedTo, setBilledTo] = useState<any>(null);

  const [warning, setWarning] = useState<any>(null);

  /**
   * What this booking held when it was opened for editing.
   *
   * ⚠️ ITS OWN ROOMS COME BACK MARKED "BOOKED" -- by itself. The grid kills
   * booked tiles so nobody takes a room somebody else has, which is right for a
   * new booking and wrong here: the clerk could not untick them, so nothing
   * could ever be dropped.
   */
  const [ownRooms, setOwnRooms] = useState<number[]>([]);
  const [ownSittings, setOwnSittings] = useState<string[]>([]);

  // What the tiles are painted by. Availability first, because that is the
  // question being asked here.
  const [mode, setMode] = useState<ColourMode>('booking_state');

  /** Still fetching the booking this page was opened on. */
  const [reading, setReading] = useState(Boolean(id));

  useEffect(() => {
    dispatch(getDdlProtectedBranch());

    // ⚠️ The grid belongs to this page and dies with it. Left in the store it
    // would be the next booking's opening screen -- rooms read for last week's
    // dates, drawn as though somebody had just asked.
    return () => {
      dispatch(clearAvailability());
    };
  }, [dispatch]);

  // An account with no property of its own -- a platform administrator looking
  // at a tenant -- would otherwise sit waiting for a selection it never makes.
  useEffect(() => {
    if (branchId || branches.length !== 1) return;

    setBranchId(Number(branches[0].id));
  }, [branches, branchId]);

  useEffect(() => {
    if (!branchId) return;

    dispatch(buildingDdl({ branch_id: branchId }));
  }, [dispatch, branchId]);

  /**
   * Where Back and Save go.
   *
   * The list keeps its filters and its page in ITS OWN address, so the way back
   * is the address that was left rather than a bare /hotel/bookings: a clerk
   * who was on page three of the held bookings lands on page three of the held
   * bookings.
   */
  const backTo = (kind?: string) => {
    const from = (location.state as any)?.from as string | undefined;
    const [path, query] = String(from ?? routes.hotel_bookings).split('?');
    const params = new URLSearchParams(query ?? '');

    // ⚠️ A walk-in just saved must not vanish. The list shows rooms and halls
    // by default, and the next thing the clerk does is press Bill on the row
    // that was just written.
    if (kind) params.set('kind', kind);

    const asked = params.toString();

    return asked ? `${path}?${asked}` : path;
  };
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

  /**
   * ⚠️ Turning a booking into a walk-in sale PUTS BACK whatever it was
   * holding. The server refuses a walk-in that names a room -- rightly, since
   * a booking with a room on it is a stay whatever the dropdown says -- and
   * without this the clerk would pick two rooms, change the type, and be
   * refused by a sentence about rooms they can no longer see.
   */
  const chooseType = (e: any) => {
    const chosen = e.target.value;

    if (chosen === 'walk_in') {
      setPicked([]);
      setPickedSeats([]);
      setPickedSittings([]);
    }

    // ⚠️ Dropped the moment the type stops being corporate. Left behind, an
    // Individual booking would have gone to the server carrying a company to
    // bill -- which the server accepts, and which nothing on screen would say.
    if (chosen !== 'corporate') setBilledTo(null);

    setForm((prev: any) => ({
      ...prev,
      booking_type: chosen,
      // Nothing is held, so there is nothing to hold ON to. The server forces
      // this as well; setting it here keeps the form from showing a state the
      // booking will not be saved in.
      status: chosen === 'walk_in' ? 'confirmed' : prev.status,
    }));
  };

  /**
   * Read the booking this page was opened on, into the form it was taken in.
   *
   * ⚠️ The three lists come from the server rather than being worked out
   * here: which resource is a bed and which is a hall is a question with one
   * right answer, and a second copy of that answer on the client is one that
   * will drift.
   */
  const openBooking = async (bookingId: number) => {
    try {
      const booking: any = await dispatch(bookingRead(bookingId)).unwrap();

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

      // Who the bill goes to, so a corporate booking reopened says so instead
      // of showing an empty box on the one screen where that answer decides
      // whether the guest pays or a company is invoiced.
      setBilledTo(
        booking.billed_to_party_id
          ? {
              value: String(booking.billed_to_party_id),
              label: booking.billed_to_party_name || `Party #${booking.billed_to_party_id}`,
            }
          : null,
      );

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

      // ⚠️ Back to the list rather than sitting on a page with no booking on
      // it. A booking that cannot be read is one somebody else cancelled, or an
      // id typed into the address bar -- and either way there is nothing here
      // to do.
      navigate(backTo());
    } finally {
      setReading(false);
    }
  };

  /**
   * ⚠️ ONCE, AND ONLY FOR THE ID IN THE ADDRESS. The read pulls the grids in
   * with it, so a dependency list holding anything that changes as the clerk
   * works -- the picks, the dates -- would re-read the booking underneath them
   * and throw away what they had done.
   */
  useEffect(() => {
    if (!id || !branchId) return;

    openBooking(Number(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, branchId]);

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

  /**
   * ⚠️ A walk-in sale holds nothing, so nearly every rule on this form is
   * about somebody else. No room to pick, no availability to check, no nights
   * to price, no hold to keep and nobody to check in -- what is left is who
   * bought it, and a bill to put the meal on afterwards.
   */
  const isWalkIn = form?.booking_type === 'walk_in';

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
    if (!anyPicked && !isWalkIn) {
      toast.error('Pick at least one room, bed or sitting');
      return;
    }

    if (!form.booker_name?.trim()) {
      toast.error('Who is booking?');
      return;
    }

    // ⚠️ Asked here as well as on the server, and the server keeps the last
    // word. This one only saves the clerk a round trip that ends in a refusal
    // -- the reason for it is in the controller, beside the rule.
    if (!form.id && form.booking_type === 'corporate' && !billedTo?.value) {
      toast.error('Which company is billed? Pick one from the list.');
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
          // Only where it means something. Sent on an individual booking it
          // would quietly bill a company nobody on this screen agreed to.
          billed_to_party_id:
            form.booking_type === 'corporate' && billedTo?.value
              ? Number(billedTo.value)
              : undefined,
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

      // Back to the list it was opened from, on the filters and the page it was
      // left on -- and, for a meal, on the filter that shows meals.
      navigate(backTo(isWalkIn ? 'walk_in' : undefined));
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
   * What the Save button says, where "Save" understates it.
   *
   * A button that creates twelve rooms in one press should say so before it is
   * pressed, not in the message afterwards. An edit says the booking's own
   * number instead: "Book 2 rooms" on a booking that already exists reads as
   * taking a second one.
   */
  const saveLabel = form?.id
    ? `Save ${form.booking_no ?? 'booking'}`
    : isWalkIn
      ? 'Save walk-in sale'
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
        : 'Book';

  return (
    <div>
      <HelmetTitle title={id ? 'Edit Booking' : 'New Booking'} />

      <button
        type="button"
        onClick={() => navigate(backTo())}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-secondary"
      >
        <FiArrowLeft size={16} />
        Back to bookings
      </button>

      <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">
              {form?.id ? `Booking ${form.booking_no ?? ''}` : 'New Booking'}
            </h2>

            {/* ⚠️ The two times, said here as well as on the list. The
                commonest question on the telephone is "what time do we have to
                be out?", and it is asked while the booking is being taken -- and
                it is the pair the night count quietly depends on. */}
            {times ? (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Check in <span className="text-black dark:text-white">{clockTime(times.check_in)}</span>
                {' · '}
                Check out <span className="text-black dark:text-white">{clockTime(times.check_out)}</span>
              </p>
            ) : null}
          </div>

          {/* Drawn only where there is a choice. A dropdown holding one option
              is a question with one answer -- but the answer is still needed,
              so a lone property is selected rather than merely assumed. */}
          {branches.length > 1 ? (
            <div className="w-64">
              <label className="text-sm text-black dark:text-white">Property</label>
              <BranchDropdown
                value={branchId ? String(branchId) : ''}
                defaultValue={branchId ? String(branchId) : ''}
                onChange={(e: any) => {
                  setBranchId(e.target.value === '' ? null : Number(e.target.value));
                  forget();
                }}
                className="w-full text-sm"
                branchDdl={branches}
              />
            </div>
          ) : null}
        </div>

        {reading || !form ? (
          <Loader />
        ) : (
          <>
    <>
      {/* 0 -- WHAT IS BEING SOLD, above everything else, because it
          decides whether the rest of this form is about a room at all.
          It used to sit in section 3, which is drawn only once a room
          has been picked -- so a walk-in sale, which never picks one,
          could not be reached from there. */}
      {/* ⚠️ ONE LINE, AND CAPPED. On a wide monitor a four-column grid
          across the whole page gives every field a quarter of 1700
          pixels: a date box a hand's width across, a Type dropdown with
          three empty columns beside it, and a form that reads as
          scattered parts rather than one question. The cap is what
          keeps the fields the size of what goes in them.

          items-end, so the button sits on the line the fields sit on.
          Nothing in this row carries a description any more -- the one
          that did lifted the row out of true, and what it said is said
          below, when it applies. */}
      <div className="grid max-w-6xl grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <DropdownCommon
          id="booking_type"
          name="booking_type"
          label="Type"
          data={TYPE_OPTIONS}
          value={form.booking_type}
          onChange={chooseType}
        />

        {/* The day it was served. A walk-in has no arriving and no
            leaving, so it is asked for once and both dates are set
            from it -- the nights between them come out at nought,
            which is the truth about a sale with no stay. */}
        {isWalkIn ? (
          <InputDatePicker
            id="walk_in_date"
            name="check_in_date"
            label="Date"
            selectedDate={asDate(form.check_in_date)}
            setSelectedDate={setDate('check_in_date')}
            setCurrentDate={setDate('check_in_date')}
            className="w-full"
          />
        ) : (
          <>
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
            {/* No padding under it: the row is items-end, so anything
                below the button lifts it off the line the fields sit
                on. */}
            <div>
              <ButtonLoading
                onClick={check}
                buttonLoading={checking}
                label="See what is free"
                variant="primary"
                icon={<FiSearch size={16} />}
              />
            </div>

            {/* ⚠️ It came back to this row when the form left the list. It
                belongs to the grid, and the grid is here now -- on the list's
                toolbar it would be a control colouring something on another
                page. It appears with the grid it colours and not before, in
                the space the button leaves. */}
            {availability ? (
              <DropdownCommon
                id="booking_colour_mode"
                name="booking_colour_mode"
                label="Colour by"
                data={BOOKING_COLOUR_MODES}
                value={mode}
                onChange={(e: any) => setMode(e.target.value as ColourMode)}
              />
            ) : null}
          </>
        )}
      </div>

      {/* ⚠️ THE BOX THE HINT USED TO POINT AT. The hint said "name the
          company on the bill" and there was nowhere to name one, so every
          corporate booking was refused by the server for a field the form had
          never had. Said where it applies rather than under the dropdown for
          ever: a hint that is always there is furniture; one that appears when
          the answer needs it is read. */}
      {form.booking_type === 'corporate' ? (
        <div className="mt-2 max-w-lg">
          <label
            htmlFor="billed_to_party_id"
            className="mb-1 block text-sm text-black dark:text-white"
          >
            Billed to <span className="text-danger">*</span>
          </label>

          <DdlMultiline
            id="billed_to_party_id"
            name="billed_to_party_id"
            fetchOptions={findParties}
            defaultOptions
            value={billedTo}
            onSelect={(chosen: any) => setBilledTo(chosen)}
            placeholder="Search a company by name, mobile or code"
            isDisabled={Boolean(form.id)}
          />

          <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
            {form.id ? (
              /* ⚠️ Shown, not editable, and the sentence says where to go
                 instead. The save on an edit does not carry this field, so a
                 live picker here would be a control that quietly does nothing
                 -- worse than no control, because the clerk would believe the
                 bill had moved. Moving it IS a voucher (§6.4), which is why it
                 belongs at check-out and not on this form. */
              <>
                Set when the booking was made. To send the bill somewhere else, move it at
                check-out — that is a voucher, so the money follows it.
              </>
            ) : (
              <>
                Corporate is billed to a company, not to the guest. Picked from the customer
                list rather than typed, so every stay this company pays for can be found under
                one name.
              </>
            )}
          </p>
        </div>
      ) : null}

      {/* A walk-in sale has nothing to look up and nothing to pick, so
          the whole middle of this form is skipped. What it needs is a
          name to bill and, afterwards, the meal itself -- which is
          added on the bill, where every charge is added. */}
      {isWalkIn ? (
        <div className="mt-3 rounded border border-stroke p-3 text-sm text-gray-600 dark:border-strokedark dark:text-gray-300">
          No room, bed or hall is held by a walk-in sale. Save it, then open its
          <span className="font-medium text-black dark:text-white"> Bill </span>
          and add what was sold — restaurant, catering, laundry.
        </div>
      ) : null}

      {/* 2 -- the answer */}
      {availability && !isWalkIn ? (
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
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-300">
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
                        <span className="text-xs text-gray-300">{card.code}</span>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-200">
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
                          <span className="w-16 shrink-0 text-[0.8rem] text-gray-500 dark:text-gray-200 mr-1">
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
      {anyPicked || isWalkIn ? (
        <>
          <div className="mt-4 max-w-6xl rounded border border-stroke p-3 dark:border-strokedark">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-black dark:text-white">
                {isWalkIn
                  ? 'Walk-in sale'
                  : [
                      ...pickedRooms.map((room) => room.display_name),
                      // Named by room and bed together: "GDN / 301 bed 2"
                      // is what the clerk says out loud, and "bed 2" alone
                      // means nothing across four dormitories.
                      ...pickedBeds.map(({ seat, room }) => `${room.display_name} bed ${seat.code}`),
                    ].join(', ')}
              </span>
              <span className="text-sm">
                {isWalkIn ? (
                  // No rooms and no nights, so there is nothing to
                  // price here. What it comes to is decided on the
                  // bill, one charge at a time.
                  <span className="text-gray-500 dark:text-gray-400">
                    Nothing held · priced on the bill
                  </span>
                ) : (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">
                      {anyPicked} × {nights} {nights === 1 ? 'night' : 'nights'} ·{' '}
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      {money(total)}
                    </span>
                  </>
                )}
              </span>
            </div>

            {/* ⚠️ A NAME IS NOT THE SAME WIDTH AS A COUNT OF CHILDREN.
                Four equal columns gave "0" a box as wide as the name on
                the telephone, which is what made this block read as
                scattered parts. Six columns, and each field takes what
                goes in it: name and mobile two apiece, the two counts
                one each. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="xl:col-span-2">
                <InputElement
                  id="booker_name"
                  name="booker_name"
                  label="Who is booking"
                  placeholder="The name on the telephone"
                  title="Not necessarily the guest, and not a customer account. A father booking beds for three students is neither — guests are recorded at check-in."
                  value={form.booker_name}
                  onChange={set('booker_name')}
                />
              </div>
              <div className="xl:col-span-2">
                <InputElement
                  id="booker_mobile"
                  name="booker_mobile"
                  label="Mobile"
                  placeholder="01711000000"
                  value={form.booker_mobile ?? ''}
                  onChange={set('booker_mobile')}
                />
              </div>
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

            <div className="mt-3 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {/* ⚠️ Not on a walk-in. A hold keeps a bed off sale until
                  a deadline; this sale holds no bed, so the choice
                  would mean nothing and the sweep would expire a meal
                  that has been eaten. The server forces it confirmed. */}
              {!isWalkIn ? (
                <div className="xl:col-span-2">
                  <DropdownCommon
                    id="booking_status"
                    name="booking_status"
                    label="Confirmed or held"
                    data={STATUS_OPTIONS}
                    value={form.status}
                    onChange={set('status')}
                    description={`A hold keeps the rooms for ${holdLength(times?.hold_hours)}, then the beds go back on sale.`}
                  />
                </div>
              ) : null}
              <div className={isWalkIn ? 'sm:col-span-2 xl:col-span-6' : 'sm:col-span-2 xl:col-span-4'}>
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

            {/* ⚠️ At the bottom, where the form ends, rather than at the top.
                Reading down and then having to go back up to press Save is what
                a panel on a list made people do; a page can put the button
                after the last question. */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stroke pt-4 dark:border-strokedark">
              <ButtonLoading
                onClick={save}
                buttonLoading={saving}
                label={saveLabel}
                variant="primary"
                icon={<FiSave size={16} />}
              />
              <ButtonLoading
                onClick={() => navigate(backTo())}
                buttonLoading={false}
                label="Cancel"
                icon={<FiX size={16} />}
              />
            </div>
          </>
        )}
      </div>

      {/* ⚠️ NOT A WARNING -- A REFUSAL, EXPLAINED.
          It once offered "Change it anyway", and the charge then stayed on the
          folio with nothing able to take it off: a guest moved 101 → 102 → 103
          on one night ended up holding one room and owing for three, each with
          its own posted voucher. The server refuses it now, so the button that
          offered to do it would be offering something that cannot happen --
          hence `disabled`, with the message carrying the reason and the way
          out. */}
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
                {warning?.billed_dropping} of the nights being dropped{' '}
                {Number(warning?.billed_dropping) === 1 ? 'is' : 'are'} on the bill.
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
    </div>
  );
};

export default BookingFormScreen;
