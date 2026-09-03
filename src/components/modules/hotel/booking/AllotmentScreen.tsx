import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import Checkbox from '../../../utils/fields/Checkbox';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import routes from '../../../services/appRoutes';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import httpService from '../../../services/httpService';
import { API_HOTEL_GUEST_URL } from '../../../services/apiRoutes';

import { allotmentRead, allotSave, clearAllotment } from './bookingSlice';
import { AllotmentRoom, Guest } from './types';

/**
 * Allotment -- the same booking, opened on the day the guests arrive.
 *
 * The second of the two stages of spec 6.5. The telephone call took counts;
 * this takes names. It is ONE booking record opened twice, never two
 * mechanisms.
 *
 * ⚠️ A PAGE, not a dialog, and that was learned the hard way.
 *
 * It was a dialog first, and the dialog was wrong twice over. It scrolled its
 * own header off the top of the window so it could not be closed; and even
 * fixed, it was the wrong container for the job -- a coach party is twelve
 * rooms of five guests, sixty rows of six fields, and no dialog holds that.
 * Work that fills a screen belongs on a screen.
 *
 * ⚠️ IT IS PIECEMEAL, AND THAT SHAPES EVERYTHING HERE.
 *
 * Three of five rooms check in at noon and two more at nine in the evening. So
 * each room is its own small form with its own Save, the page says at the top
 * how many rooms are still outstanding, and nothing anywhere asks for the whole
 * booking at once. A screen that demanded all five rooms together would be
 * filled with invented names to get past it -- which is worse than an empty
 * room, because invented names look like a police register.
 *
 * The two rules the desk actually meets (6.5):
 *
 *   * ONE identified guest per room. Name and NID for that one, optional for
 *     everybody else. Requiring ID from all five stops a family at the desk for
 *     the sake of a rule aimed at one person; requiring it from nobody
 *     endangers the register.
 *   * ONE mobile per room is enough. Twelve numbers for twelve workers will not
 *     be given, and a required field that cannot be filled gets filled with
 *     rubbish -- which is worse than empty, because it looks like data.
 *
 * Counts that do not match WARN and never block. Booked for twelve, ten
 * arrived: both numbers are kept, and the amenities are computed from the
 * second. Block it and the clerk edits the booking to get past the screen,
 * which destroys the very figure the count was kept for.
 */

const GENDER_OPTIONS = [
  { id: '', name: 'Not said' },
  { id: 'male', name: 'Male' },
  { id: 'female', name: 'Female' },
  { id: 'other', name: 'Other' },
];

const blankGuest = (): Guest => ({
  name: '',
  mobile: '',
  national_id: '',
  address: '',
  gender: null,
  age: null,
  is_child: false,
});

const AllotmentScreen = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();

  const bookingId = Number(id);

  const allotment = useSelector((state: any) => state.hotelBooking.allotment);
  const saving = useSelector((state: any) => state.hotelBooking.saving);

  // Which room's form is open. One at a time: five rooms of five guests each
  // open together is a wall of a hundred and fifty fields, and the clerk is
  // talking to somebody while they type.
  const [openRoom, setOpenRoom] = useState<number | null>(null);
  const [draft, setDraft] = useState<Guest[]>([]);

  // Which room is open, readable from a callback that was made before the
  // answer came back. See fillOpenRoom.
  const openRoomRef = useRef<number | null>(null);

  useEffect(() => {
    openRoomRef.current = openRoom;
  }, [openRoom]);

  useEffect(() => {
    if (!bookingId) return;

    dispatch(allotmentRead(bookingId));

    return () => {
      dispatch(clearAllotment());
    };
  }, [dispatch, bookingId]);

  const rooms: AllotmentRoom[] = allotment?.rooms ?? [];
  const booking = allotment?.booking;

  const back = () => navigate(routes.hotel_bookings);

  /**
   * The first line of a room nobody has been recorded in yet.
   *
   * ⚠️ Only for an INDIVIDUAL booking, where the person who booked is the
   * person who arrives: the name and mobile were already taken at the top of
   * the booking, and the desk was copying them back out of the header into the
   * first row by hand. A group, a corporate account or a walk-in books for
   * somebody else -- there the booker's name in a guest row would be a wrong
   * name in the police register, so those still start empty.
   *
   * It is a STARTING POINT and nothing more. Both boxes stay editable, and a
   * room that already has guests shows what was recorded rather than this.
   */
  /**
   * Has the person who booked already been written into one of these rooms?
   *
   * ⚠️ ONE PERSON SLEEPS IN ONE ROOM. On a booking of four rooms the booker's
   * name was offered as the first line of every one of them, so a clerk working
   * down the list put the same man in 501, 502, 503 and 504 -- four people in
   * the police register, one of whom was in the building. Once he is recorded
   * anywhere on this booking the next room starts empty.
   *
   * Matched on the mobile where the booking has one, because two guests may
   * share a name and a family often does; on the name where it has not.
   */
  const bookerAlreadyRecorded = useMemo(() => {
    const name = booking?.booker_name?.trim().toLowerCase() ?? '';
    const mobile = booking?.booker_mobile?.trim() ?? '';

    if (!name && !mobile) {
      return false;
    }

    return rooms.some((room) =>
      (room.guests ?? []).some((guest) => {
        if (mobile && String(guest.mobile ?? '').trim() === mobile) {
          return true;
        }

        return !!name && String(guest.name ?? '').trim().toLowerCase() === name;
      }),
    );
  }, [rooms, booking?.booker_name, booking?.booker_mobile]);

  const firstGuest = (): Guest =>
    booking?.booking_type === 'individual' && !bookerAlreadyRecorded
      ? {
          ...blankGuest(),
          name: booking?.booker_name?.trim() ?? '',
          mobile: booking?.booker_mobile?.trim() ?? '',
        }
      : blankGuest();

  const open = (room: AllotmentRoom) => {
    setOpenRoom(room.room_id);
    // Set here as well as in the effect: the lookup below is started in this
    // same tick, and the effect has not run yet.
    openRoomRef.current = room.room_id;

    // Reopening a room shows what is already recorded, so a correction is an
    // edit rather than a retype. A room with nobody starts with one line rather
    // than none -- an empty form with an Add button is one click of ceremony
    // before the first name.
    const rows = room.guests.length
      ? room.guests.map((guest) => ({ ...guest }))
      : [firstGuest()];

    setDraft(rows);

    /*
     * ⚠️ AND LOOK THE NUMBER UP AS THE ROOM OPENS, not when the mobile box
     * is left. On an individual booking that box is filled from the booking
     * itself the moment this row is made, so nobody ever types in it and a
     * blur never happens -- the clerk would sit looking at a name and a
     * telephone number with the NID box empty and no reason to touch it.
     */
    void fillOpenRoom(room.room_id, rows);
  };

  const close = () => {
    setOpenRoom(null);
    openRoomRef.current = null;
    setDraft([]);
  };

  const set = (index: number, field: keyof Guest) => (e: any) =>
    setDraft((prev) =>
      prev.map((guest, i) => (i === index ? { ...guest, [field]: e.target.value } : guest)),
    );

  /**
   * What the register already holds against a telephone number.
   *
   * ⚠️ SO A RETURNING GUEST IS NOT ASKED FOR THEIR NID TWICE. Somebody who
   * stayed here in March already handed over a national id and an address;
   * making them read it out again is what makes a register get filled in
   * badly.
   *
   * ⚠️ EMPTY BOXES ONLY, each checked on its own. A guest whose address has
   * changed types the new one, and this must not put the old one back. Nothing
   * already typed is touched.
   *
   * ⚠️ AGE COMES ACROSS TOO, by the owner's decision. It is the one field
   * that goes stale on its own -- somebody who was 34 last year is 35 now --
   * and unlike a changed address nothing about it looks wrong on screen. The
   * desk has to check it; a date of birth would be the fix that does not
   * depend on anybody remembering.
   */
  const fillFromRegister = async (rows: Guest[]): Promise<Guest[]> => {
    const filled = await Promise.all(
      rows.map(async (guest) => {
        const typed = String(guest.mobile ?? '');

        // A part-typed number matches half the register, so the server refuses
        // it. No point asking.
        if (typed.replace(/\D+/g, '').length < 10) return guest;

        // Somebody already recorded needs nothing filled in.
        if (
          String(guest.national_id ?? '').trim() &&
          String(guest.address ?? '').trim() &&
          String(guest.age ?? '').trim()
        ) {
          return guest;
        }

        try {
          const res = await httpService.get(API_HOTEL_GUEST_URL, { params: { mobile: typed } });
          const found = res?.data?.data?.data ?? null;

          if (!found?.found) return guest;

          const onFile = found.guest ?? {};
          const keep = (current: any, previous: any) =>
            String(current ?? '').trim() === '' && previous ? previous : current;

          return {
            ...guest,
            name: keep(guest.name, onFile.name ?? found.name),
            national_id: keep(guest.national_id, onFile.national_id),
            address: keep(guest.address, onFile.address),
            gender: guest.gender ? guest.gender : (onFile.gender ?? guest.gender),
            // Same rule as the rest: only into an empty box. A clerk who has
            // already asked and typed the right age keeps it.
            age:
              guest.age === null || guest.age === undefined || String(guest.age) === ''
                ? (onFile.age ?? guest.age)
                : guest.age,
          };
        } catch (error) {
          // A lookup that fails changes nothing. The desk types it.
          return guest;
        }
      }),
    );

    return filled;
  };

  /**
   * Run on the rows of one room and put the answers back.
   *
   * ⚠️ The room is checked before the draft is replaced. A clerk who opened
   * a room, saw the lookup was slow and closed it again must not have the
   * answers land in the room they opened next.
   */
  const fillOpenRoom = async (roomId: number, rows: Guest[]) => {
    const filled = await fillFromRegister(rows);

    /*
     * ⚠️ READ THROUGH A REF, not through the openRoom in this closure and
     * not by setting one piece of state from inside another's updater. The
     * closure's value is whatever it was when the room opened, which is what
     * we are trying to check has not changed; and a setDraft called from
     * inside a setOpenRoom updater runs during a state update, which React
     * runs twice in development and is not a place to put an effect.
     *
     * The check itself matters: a clerk who opened a room, saw the lookup was
     * slow and closed it again must not have the answers land in the room they
     * opened next.
     */
    if (openRoomRef.current !== roomId) return;

    setDraft(filled);
  };

  /**
   * The same lookup again when a clerk types a different number into a row.
   *
   * It runs over every row rather than the one just left, which costs nothing:
   * a row already carrying an NID and an address is skipped without asking the
   * server at all.
   */
  const lookUpGuest = () => {
    if (openRoom === null) return;

    void fillOpenRoom(openRoom, draft);
  };

  const save = async (room: AllotmentRoom) => {
    const filled = draft.filter((guest) => guest.name?.trim());

    if (!filled.length) {
      toast.error('Give at least one name');
      return;
    }

    // Checked here as well as on the server. The server is the one that counts,
    // but a message that appears the moment the field is wrong beats one that
    // appears after a round trip -- and this one is about a person standing at
    // the desk with their ID card out.
    if (!filled.some((guest) => guest.national_id?.trim())) {
      toast.error('One guest in this room needs an NID or passport — the rest do not');
      return;
    }

    if (!filled.some((guest) => guest.mobile?.trim())) {
      toast.error('One mobile number for the room, please — any of the guests will do');
      return;
    }

    try {
      const result = await dispatch(
        allotSave({
          id: bookingId,
          room_id: room.room_id,
          guests: filled.map((guest) => ({
            name: guest.name,
            mobile: guest.mobile || null,
            national_id: guest.national_id || null,
            address: guest.address || null,
            gender: guest.gender || null,
            age:
              guest.age === null || guest.age === undefined || String(guest.age) === ''
                ? null
                : Number(guest.age),
            is_child: !!guest.is_child,
          })),
        }),
      ).unwrap();

      toast.success(result.message);
      close();

      // Read again rather than patched in place: what the page has to show is
      // how much is still outstanding, and only the server can say.
      dispatch(allotmentRead(bookingId));
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  if (!allotment) {
    return (
      <div className="relative min-h-60">
        <HelmetTitle title="Check in" />
        <Loader />
      </div>
    );
  }

  const outstanding = allotment.rooms_outstanding;

  return (
    <div>
      <HelmetTitle title={`Check in ${booking?.booking_no ?? ''}`} />

      {/* The way back, first and plainly. A page reached from a list needs the
          door it came through drawn on it -- the browser's own Back is not a
          control this screen is allowed to rely on. */}
      <button
        type="button"
        onClick={back}
        className="mb-3 flex items-center gap-1.5 text-sm text-primary hover:underline dark:text-secondary"
      >
        <FiArrowLeft size={15} /> All bookings
      </button>

      <div className="mb-4 rounded border border-stroke p-4 dark:border-strokedark">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Checking in {booking?.booking_no}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDayMonthYear(booking?.check_in_date)} → {formatDayMonthYear(booking?.check_out_date)}
              {booking?.nights ? ` · ${booking.nights} night${booking.nights === 1 ? '' : 's'}` : ''}
              {booking?.booker_name ? ` · booked by ${booking.booker_name}` : ''}
              {booking?.booker_mobile ? ` · ${booking.booker_mobile}` : ''}
            </p>
          </div>

          {/* Both numbers, side by side, always. Not a validation -- a fact
              worth reading: the food and the towels are computed from the one
              on the right. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Booked for <strong className="text-black dark:text-white">{allotment.stated}</strong>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              Recorded <strong className="text-black dark:text-white">{allotment.arrived}</strong>
            </span>
            {outstanding ? (
              <span className="rounded border border-amber-400 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/25 dark:text-amber-50">
                {outstanding} {outstanding === 1 ? 'room' : 'rooms'} still to check in
              </span>
            ) : (
              <span className="rounded border border-teal-400 bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-900 dark:bg-teal-500/25 dark:text-teal-50">
                every room has somebody
              </span>
            )}
          </div>
        </div>

        {allotment.arrived !== allotment.stated && allotment.arrived > 0 ? (
          <p className="mt-2 text-xs italic text-gray-400">
            The two need not agree — what arrived is what counts for food and towels.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {rooms.map((room) => (
          <div key={room.room_id} className="rounded border border-stroke dark:border-strokedark">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <span className="text-base font-semibold text-black dark:text-white">
                  {room.display_name}
                </span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  holds {room.capacity}
                  {room.guests.length ? ` · ${room.guests.length} recorded` : ''}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* The reason, not a red dot. "No ID yet" and "no mobile" are
                    asked of different people. */}
                {room.needs_identified ? (
                  <span className="text-xs text-warning">nobody checked in yet</span>
                ) : room.needs_mobile ? (
                  <span className="text-xs text-warning">no mobile for this room</span>
                ) : (
                  <span className="text-xs text-success">done</span>
                )}

                <button
                  type="button"
                  onClick={() => (openRoom === room.room_id ? close() : open(room))}
                  className="text-sm text-primary hover:underline dark:text-secondary"
                >
                  {openRoom === room.room_id
                    ? 'Close'
                    : room.guests.length
                      ? 'Edit guests'
                      : 'Check in'}
                </button>
              </div>
            </div>

            {openRoom === room.room_id ? (
              <div className="border-t border-stroke p-4 dark:border-strokedark">
                {draft.map((guest, index) => (
                  <div
                    key={index}
                    className="mb-3 grid grid-cols-1 gap-2 border-b border-stroke pb-3 last:mb-0 last:border-0 last:pb-0 dark:border-strokedark md:grid-cols-12"
                  >
                    <div className="md:col-span-3">
                      <InputElement
                        id={`guest_name_${index}`}
                        name="name"
                        label={index === 0 ? 'Name' : ''}
                        placeholder="As on the ID"
                        value={guest.name ?? ''}
                        onChange={set(index, 'name')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <InputElement
                        id={`guest_mobile_${index}`}
                        name="mobile"
                        label={index === 0 ? 'Mobile' : ''}
                        placeholder="One per room"
                        value={guest.mobile ?? ''}
                        onChange={set(index, 'mobile')}
                        onBlur={lookUpGuest}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <InputElement
                        id={`guest_nid_${index}`}
                        name="national_id"
                        label={index === 0 ? 'NID / passport' : ''}
                        placeholder="One guest per room"
                        title="The police register is built from this. It is required of one guest in the room and optional for the rest."
                        value={guest.national_id ?? ''}
                        onChange={set(index, 'national_id')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <InputElement
                        id={`guest_address_${index}`}
                        name="address"
                        label={index === 0 ? 'Address' : ''}
                        placeholder="Optional"
                        value={guest.address ?? ''}
                        onChange={set(index, 'address')}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <DropdownCommon
                        id={`guest_gender_${index}`}
                        name="gender"
                        label={index === 0 ? 'Gender' : ''}
                        data={GENDER_OPTIONS}
                        value={guest.gender ?? ''}
                        onChange={set(index, 'gender')}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <InputElement
                        id={`guest_age_${index}`}
                        name="age"
                        label={index === 0 ? 'Age' : ''}
                        type="number"
                        min={0}
                        max={120}
                        title="Worth taking for a child. What counts as a child is a setting the client has not answered, so the age is the durable fact."
                        value={guest.age === null || guest.age === undefined ? '' : String(guest.age)}
                        onChange={set(index, 'age')}
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-2 md:col-span-1">
                      <Checkbox
                        id={`guest_child_${index}`}
                        name="is_child"
                        label="Child"
                        checked={!!guest.is_child}
                        onChange={() =>
                          setDraft((prev) =>
                            prev.map((g, i) => (i === index ? { ...g, is_child: !g.is_child } : g)),
                          )
                        }
                        labelClassName="cursor-pointer text-xs text-gray-600 dark:text-gray-300"
                      />
                      {draft.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setDraft((prev) => prev.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-danger dark:hover:text-red-400"
                          title="Remove this line"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => [...prev, blankGuest()])}
                    className="flex items-center gap-1 text-sm text-primary hover:underline dark:text-secondary"
                  >
                    <FiPlus size={15} /> Another guest
                  </button>

                  {/* Over capacity warns; it never blocks. The desk knows about
                      the infant and the extra mattress. */}
                  {draft.length > room.capacity ? (
                    <span className="text-xs text-warning">
                      {draft.length} in a room that holds {room.capacity} — allowed, just worth a
                      glance
                    </span>
                  ) : null}

                  <div className="ml-auto flex gap-2">
                    {/* Named icons, the same pair the booking form uses. Left
                        to itself the button draws an arrow, so Cancel and Save
                        arrived wearing the same one -- two buttons that do
                        opposite things and look alike at a glance. */}
                    <ButtonLoading onClick={close} label="Cancel" icon={<FiX size={16} />} />
                    <ButtonLoading
                      onClick={() => save(room)}
                      buttonLoading={saving}
                      label="Save this room"
                      variant="primary"
                      icon={<FiSave size={16} />}
                    />
                  </div>
                </div>
              </div>
            ) : room.guests.length ? (
              <div className="border-t border-stroke px-4 py-2 text-xs text-gray-600 dark:border-strokedark dark:text-gray-300">
                {room.guests.map((guest) => (
                  <span key={guest.id} className="mr-4 inline-block">
                    {guest.name}
                    {guest.is_primary ? (
                      <span
                        className="ml-1 text-[0.6rem] text-gray-400"
                        title="The guest whose ID was taken"
                      >
                        ID
                      </span>
                    ) : null}
                    {guest.is_child ? (
                      <span className="ml-1 text-[0.6rem] text-gray-400">child</span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-snug text-gray-500 dark:text-gray-400">
        A room can be checked in at any time — three now, two this evening. Guests recorded here are{' '}
        <strong>not</strong> customer accounts: the party master is for whoever the bill goes to.
      </p>
    </div>
  );
};

export default AllotmentScreen;
