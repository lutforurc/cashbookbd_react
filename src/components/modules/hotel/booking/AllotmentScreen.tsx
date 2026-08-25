import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import Checkbox from '../../../utils/fields/Checkbox';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import routes from '../../../services/appRoutes';

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

  const open = (room: AllotmentRoom) => {
    setOpenRoom(room.room_id);

    // Reopening a room shows what is already recorded, so a correction is an
    // edit rather than a retype. A room with nobody starts with one empty line
    // rather than none -- an empty form with an Add button is one click of
    // ceremony before the first name.
    setDraft(room.guests.length ? room.guests.map((guest) => ({ ...guest })) : [blankGuest()]);
  };

  const close = () => {
    setOpenRoom(null);
    setDraft([]);
  };

  const set = (index: number, field: keyof Guest) => (e: any) =>
    setDraft((prev) =>
      prev.map((guest, i) => (i === index ? { ...guest, [field]: e.target.value } : guest)),
    );

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
              {booking?.check_in_date} → {booking?.check_out_date}
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
                    <ButtonLoading onClick={close} label="Cancel" />
                    <ButtonLoading
                      onClick={() => save(room)}
                      buttonLoading={saving}
                      label="Save this room"
                      variant="primary"
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
