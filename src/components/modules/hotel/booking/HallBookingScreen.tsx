import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiCheck, FiX } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Loader from '../../../../common/Loader';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import routes from '../../../services/appRoutes';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { money, localDate } from '../setupHelpers';
import { bookingSave, hallsRead } from './bookingSlice';
import HallCards from './HallCards';

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
  const loading = useSelector((state: any) => state.hotelBooking.hallsLoading);
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

  const rows: any[] = halls?.halls ?? [];

  // One date asked, so one day on each card.
  const cards = useMemo(
    () =>
      rows.map((hall) => ({
        ...hall,
        name: hall.name || hall.code,
        days: [{ date, sittings: hall.sittings }],
      })),
    [rows, date],
  );

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

  /**
   * ⚠️ How this property reads its rate card (Add / Edit Branch -> Hotel Setup
   * -> VAT Setup). On an inclusive one the rent under each pick is the WHOLE
   * price -- the service charge and the VAT live inside it -- so saying "before
   * service charge and VAT" would tell the clerk the guest owes more than the
   * sitting costs. The server sends the same setting the bill itself is made by,
   * rather than the screen guessing.
   */
  const inclusive = String(halls?.times?.vat_mode ?? '') === 'inclusive';

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

  return (
    <div className="@container">
      <HelmetTitle title="Hall Booking" />

      <button
        type="button"
        onClick={() => navigate(routes.hotel_bookings)}
        className="mb-3 -ml-1 flex items-center gap-2 rounded px-1 py-1 text-base font-semibold text-primary hover:underline dark:text-secondary"
      >
        <FiArrowLeft size={18} />
        Back to bookings
      </button>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-4">
        <div className="w-60 max-w-full">
          <label className="text-sm text-black dark:text-white">Property</label>
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
            selectedDate={localDate(date)}
            setSelectedDate={(d: Date | null) => setDate(asText(d) || today())}
            setCurrentDate={(d: Date | null) => setDate(asText(d) || today())}
            className="w-full"
          />
        </div>
      </div>

      {/* The same two columns as New Booking, read from this page's own width:
          picking on the left, what was picked and who takes it on the right. */}
      <div className="grid grid-cols-1 items-start gap-4 @5xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-4">
          {loading && !halls ? <Loader /> : null}

          {!loading && !halls ? (
            <p className="rounded border border-dashed border-stroke p-10 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
              {error
                || 'Nothing to show. Set a hall up on Hotel Setup, and the sittings it is let for.'}
            </p>
          ) : null}

          {halls ? (
            <>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <span className="text-lg font-semibold text-black dark:text-white">
                  Halls and function spaces
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-100">
                  sold by the sitting, not by the night
                </span>
              </div>

              <HallCards
                cards={cards}
                isChosen={(hall, slot, on) => chosen.has(key(hall, slot, on))}
                onToggle={toggle}
              />
            </>
          ) : null}
        </div>

        <aside className="min-w-0 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark @5xl:sticky @5xl:top-24 @5xl:flex @5xl:max-h-[calc(100vh-7.5rem)] @5xl:flex-col">
          <div className="flex items-baseline justify-between gap-2 border-b border-stroke px-4 py-3 dark:border-strokedark">
            <h3 className="text-base font-semibold text-black dark:text-white">Booking summary</h3>

            {picked.length ? (
              <button
                type="button"
                onClick={() => setPicked([])}
                className="text-xs font-medium text-primary hover:underline dark:text-secondary"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {picked.length ? (
              <>
                {/* ⚠️ Kept across a change of date on purpose. A wedding is the
                    evening of the 29th AND the morning of the 30th, and a screen
                    that forgot the first while the clerk looked for the second
                    could not take that booking at all. */}
                <ul className="mb-3 divide-y divide-stroke text-sm dark:divide-strokedark">
                  {picked.map((one) => (
                    <li
                      key={key(one.resource_id, one.slot_id, one.date)}
                      className="flex items-baseline justify-between gap-3 py-1.5"
                    >
                      <span className="min-w-0 text-black dark:text-white">
                        {one.hall}, {one.sitting}
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {formatDayMonthYear(one.date)}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-2 text-gray-600 dark:text-gray-300">
                        {money(one.rent)}
                        <button
                          type="button"
                          aria-label={`Remove ${one.hall}, ${one.sitting}`}
                          onClick={() =>
                            setPicked((prev) =>
                              prev.filter(
                                (other) =>
                                  key(other.resource_id, other.slot_id, other.date)
                                  !== key(one.resource_id, one.slot_id, one.date),
                              ),
                            )
                          }
                          className="self-center text-danger"
                        >
                          <FiX size={14} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-3">
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
              </>
            ) : (
              <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Sittings you pick appear here.
              </p>
            )}
          </div>

          {picked.length ? (
            <div className="border-t border-stroke px-4 py-3 dark:border-strokedark">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">Total</span>
                <span className="text-xl font-semibold text-black dark:text-white">{money(total)}</span>
              </div>
              <p className="-mt-2 mb-3 text-right text-xs text-gray-500 dark:text-gray-400">
                {inclusive ? 'including service charge and VAT' : 'before service charge and VAT'}
              </p>

              <ButtonLoading
                onClick={() => setAsking(true)}
                buttonLoading={saving}
                label="Book these sittings"
                variant="primary"
                icon={<FiCheck size={16} />}
                disabled={!booker.trim()}
                className="w-full"
              />

              {!booker.trim() ? (
                <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                  Say who is taking it first.
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

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
              {picked.map((one) => `${one.hall} · ${one.sitting} · ${formatDayMonthYear(one.date)}`).join(', ')}
            </span>

            {/* The bill is not made here -- the sittings are held at the rate
                they were confirmed at, and billed on the folio. Said so the
                figure above is not read as an invoice. */}
            <span className="mt-2 block">
              {money(total)} {inclusive ? 'including' : 'before'} service charge and VAT. Nothing
              is billed yet — that happens on the folio.
            </span>
          </>
        }
      />
    </div>
  );
};

export default HallBookingScreen;
