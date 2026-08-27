import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiCalendar, FiCheck } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Loader from '../../../../common/Loader';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import routes from '../../../services/appRoutes';
import { money } from '../setupHelpers';
import { bookingSave, hallsRead } from './bookingSlice';

/**
 * Letting a hall -- the community centre screen.
 *
 * ⚠️ THIS IS NOT THE ROOM SCREEN WITH DIFFERENT WORDS, and the difference is
 * the whole reason it is its own page. A room is asked about over a RANGE --
 * "the 14th to the 17th" -- and answered per room. A hall is asked about on ONE
 * DATE and answered per SITTING: the morning may be free while the evening is a
 * wedding, and that is one hall with two answers. A range picker on this screen
 * would be asking a question the answer does not fit.
 *
 * ⚠️ THE GRID IS OUT OF DATE THE MOMENT IT IS DRAWN, exactly like availability.
 * Two clerks can both be told the evening is free and both be right at the
 * moment they are told. Nothing here reserves anything: the claim happens at the
 * server against the unique key, which counts (hall, date, sitting) -- and a
 * clash comes back as a sentence saying nothing was booked.
 *
 * ⚠️ A WHOLE DAY IS EVERY SITTING TICKED, never one box meaning "all". Slot 0 is
 * reserved for a night, and a hall sold as "all day" under it would collide with
 * nothing -- leaving the same hall free to be sold that evening.
 *
 * What it does NOT do yet: put a hall on a booking that also holds rooms. The
 * server takes both in one request (§6.5 -- one stay, one folio, one bill), and
 * that belongs on the room screen, where the rooms are picked.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a date at the desk is a calendar date,
  // and going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const today = () => asText(new Date());

/** One picked sitting, as the server wants it. */
interface Picked {
  resource_id: number;
  slot_id: number;
  date: string;
  hall: string;
  sitting: string;
  rent: number;
}

const HallBookingScreen = ({ user }: { user?: any }) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  const halls = useSelector((state: any) => state.hotelBooking.halls);
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const loading = useSelector((state: any) => state.hotelBooking.loading);
  const saving = useSelector((state: any) => state.hotelBooking.saving);
  const error = useSelector((state: any) => state.hotelBooking.error);

  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  const [date, setDate] = useState<string>(today());

  const [picked, setPicked] = useState<Picked[]>([]);
  const [booker, setBooker] = useState('');
  const [mobile, setMobile] = useState('');
  const [notes, setNotes] = useState('');
  const [asking, setAsking] = useState(false);

  const load = useCallback(() => {
    if (branchId) dispatch(hallsRead({ branch_id: branchId, date }));
  }, [dispatch, branchId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const slots: any[] = halls?.slots ?? [];
  const rows: any[] = halls?.halls ?? [];

  const key = (hallId: number, slotId: number, on: string) => `${hallId}|${slotId}|${on}`;

  const chosen = useMemo(
    () => new Set(picked.map((one) => key(one.resource_id, one.slot_id, one.date))),
    [picked],
  );

  const toggle = (hall: any, cell: any) => {
    if (cell.state !== 'free') return;

    const at = key(hall.id, cell.slot_id, date);

    setPicked((prev) =>
      chosen.has(at)
        ? prev.filter((one) => key(one.resource_id, one.slot_id, one.date) !== at)
        : [
            ...prev,
            {
              resource_id: hall.id,
              slot_id: cell.slot_id,
              date,
              hall: hall.name || hall.code,
              sitting: cell.slot,
              rent: Number(hall.rent ?? 0),
            },
          ],
    );
  };

  // ⚠️ The picks are NOT cleared when the date changes. A wedding is the evening
  // of the 29th and the morning of the 30th, and a screen that forgot the first
  // when the clerk went looking for the second could not take that booking at
  // all. They are cleared after a save, and by the clerk.
  const total = picked.reduce((sum, one) => sum + one.rent, 0);

  const confirm = async () => {
    try {
      const result = await dispatch(
        bookingSave({
          branch_id: branchId,
          booker_name: booker.trim(),
          booker_mobile: mobile.trim() || undefined,
          notes: notes.trim() || undefined,
          // ⚠️ No check_in_date and no check_out_date. A hall-only booking has
          // no stay of nights -- the server reads its dates off the sittings,
          // and sending a same-day range here would be refused as "a stay has
          // to be at least one night".
          sittings: picked.map((one) => ({
            resource_id: one.resource_id,
            slot_id: one.slot_id,
            date: one.date,
          })),
        }),
      ).unwrap();

      toast.success(result.message);
      setAsking(false);
      setPicked([]);
      setBooker('');
      setMobile('');
      setNotes('');
      load();
    } catch (problem: any) {
      // The server's own sentence. A clash says which, and says nothing was
      // booked -- which is the half the clerk needs.
      toast.error(String(problem));
      setAsking(false);
      load();
    }
  };

  const cellClass = (cell: any, isChosen: boolean) => {
    if (isChosen) return 'border-primary bg-primary/10 dark:border-secondary';
    if (cell.state === 'free') return 'border-stroke hover:border-primary dark:border-strokedark';

    return 'cursor-not-allowed border-stroke bg-gray-100 opacity-70 dark:border-strokedark dark:bg-boxdark-2';
  };

  return (
    <div>
      <HelmetTitle title="Hall Booking" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-60">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Property
          </span>
          <BranchDropdown
            id="hall_branch"
            name="branch_id"
            branchDdl={branchDdl?.protectedData?.data ?? []}
            value={String(branchId ?? '')}
            onChange={(e: any) => {
              setBranchId(Number(e.target.value) || null);
              // ⚠️ The picks go with the property. A sitting id belongs to one
              // branch, and carrying a pick across would post another
              // property's hall into this one's booking.
              setPicked([]);
            }}
          />
        </div>

        <div className="w-48">
          <InputDatePicker
            id="hall_date"
            name="date"
            label="Date"
            selectedDate={date ? new Date(date) : null}
            setSelectedDate={(d: Date | null) => setDate(asText(d) || today())}
            setCurrentDate={(d: Date | null) => setDate(asText(d) || today())}
            className="w-full"
          />
        </div>

        {/* ⚠️ Said on the page, every time. A list of free sittings is out of
            date the moment it is drawn, and a screen that does not admit it is
            one somebody treats as a reservation. */}
        <p className="mb-1 flex-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
          What was free a moment ago. A sitting is not yours until it is booked —
          somebody else may be looking at this same evening.
        </p>
      </div>

      {loading && !halls ? <Loader /> : null}

      {!loading && !halls ? (
        <p className="rounded border border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
          {error
            || 'Nothing to show. Set a hall up on Hotel Setup, and the sittings it is let for.'}
        </p>
      ) : null}

      {halls ? (
        <div className="mb-5 overflow-x-auto rounded border border-stroke dark:border-strokedark">
          <table className="w-full min-w-[640px] table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="px-4 py-3 text-sm font-medium text-black dark:text-white">Hall</th>
                {slots.map((slot: any) => (
                  <th
                    key={slot.id}
                    className="px-4 py-3 text-sm font-medium text-black dark:text-white"
                  >
                    {slot.label ?? slot.name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((hall: any) => (
                <tr key={hall.id} className="border-t border-stroke dark:border-strokedark">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-black dark:text-white">
                      {hall.name || hall.code}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {hall.building ? `${hall.building} · ` : ''}
                      {hall.capacity ? `${hall.capacity} seats · ` : ''}
                      {/* §2.8: the rent on a hall is the price of ONE sitting,
                          never of a night. Labelled, because the room screen
                          right beside it means the other thing by "rent". */}
                      {hall.rent === null ? 'no rate set' : `${money(hall.rent)} a sitting`}
                    </div>
                  </td>

                  {hall.sittings.map((cell: any) => {
                    const isChosen = chosen.has(key(hall.id, cell.slot_id, date));

                    return (
                      <td key={cell.slot_id} className="px-2 py-2 align-top">
                        <button
                          type="button"
                          disabled={cell.state !== 'free'}
                          onClick={() => toggle(hall, cell)}
                          className={`w-full rounded border p-2 text-left text-xs ${cellClass(cell, isChosen)}`}
                        >
                          <span className="block font-medium text-black dark:text-white">
                            {isChosen ? (
                              <span className="flex items-center gap-1">
                                <FiCheck size={13} /> Taking it
                              </span>
                            ) : cell.state === 'free' ? (
                              'Free'
                            ) : cell.state === 'closed' ? (
                              'Not for sale'
                            ) : (
                              'Booked'
                            )}
                          </span>

                          {/* The reason is a sentence, not a colour: "roof leak"
                              and "held for the whole day" are different
                              problems with different answers. */}
                          {cell.blocked_reason ? (
                            <span className="mt-0.5 block text-gray-500 dark:text-gray-400">
                              {cell.blocked_reason}
                            </span>
                          ) : null}

                          {cell.taken_by ? (
                            <span className="mt-0.5 block text-gray-500 dark:text-gray-400">
                              {cell.taken_by}
                            </span>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {picked.length ? (
        <div className="mb-5 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm font-medium text-black dark:text-white">
              {picked.length} {picked.length === 1 ? 'sitting' : 'sittings'} picked
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {money(total)}{' '}
              <span className="text-xs">before service charge and VAT</span>
            </div>
          </div>

          {/* ⚠️ Kept across a change of date on purpose. A wedding is the
              evening of the 29th AND the morning of the 30th, and a screen that
              forgot the first while the clerk looked for the second could not
              take that booking at all. */}
          <ul className="mb-3 flex flex-wrap gap-2">
            {picked.map((one) => (
              <li
                key={key(one.resource_id, one.slot_id, one.date)}
                className="flex items-center gap-2 rounded border border-primary bg-primary/5 px-2 py-1 text-xs dark:border-secondary"
              >
                <FiCalendar size={12} />
                <span className="text-black dark:text-white">
                  {one.hall} · {one.sitting} · {one.date}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPicked((prev) =>
                      prev.filter(
                        (other) =>
                          key(other.resource_id, other.slot_id, other.date)
                          !== key(one.resource_id, one.slot_id, one.date),
                      ),
                    )
                  }
                  className="text-danger hover:underline"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <InputElement
              id="hall_booker"
              name="booker_name"
              label="Booked by"
              placeholder="Who is taking it"
              value={booker}
              onChange={(e: any) => setBooker(e.target.value)}
            />

            <InputElement
              id="hall_mobile"
              name="booker_mobile"
              label="Mobile"
              placeholder="01…"
              value={mobile}
              onChange={(e: any) => setMobile(e.target.value)}
            />

            <InputElement
              id="hall_notes"
              name="notes"
              label="Note (optional)"
              placeholder="Wedding — 300 guests"
              value={notes}
              onChange={(e: any) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <ButtonLoading
              onClick={() => setAsking(true)}
              buttonLoading={saving}
              label="Book these sittings"
              variant="primary"
              icon={<FiCheck size={16} />}
              disabled={!booker.trim()}
            />

            {!booker.trim() ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Say who is taking it first.
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => setPicked([])}
              className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        show={asking}
        title="Take these sittings"
        confirmLabel="Book"
        cancelLabel="Not yet"
        className="bg-primary hover:bg-primary/90"
        loading={saving}
        onCancel={() => setAsking(false)}
        onConfirm={confirm}
        message={
          <>
            <span className="block">
              <strong className="text-black dark:text-white">{booker.trim()}</strong> takes{' '}
              {picked.length} {picked.length === 1 ? 'sitting' : 'sittings'}.
            </span>

            <span className="mt-2 block">
              {picked.map((one) => `${one.hall} · ${one.sitting} · ${one.date}`).join(', ')}
            </span>

            {/* The bill is not made here -- the sittings are held at the rate
                they were confirmed at, and billed on the folio. Said so the
                figure above is not read as an invoice. */}
            <span className="mt-2 block">
              {money(total)} before service charge and VAT. Nothing is billed yet — that
              happens on the folio.
            </span>
          </>
        }
      />

      <button
        type="button"
        onClick={() => navigate(routes.hotel_bookings)}
        className="text-sm font-medium text-primary hover:underline dark:text-secondary"
      >
        Room bookings →
      </button>
    </div>
  );
};

export default HallBookingScreen;
