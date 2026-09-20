import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputDatePicker from '../../../utils/fields/DatePicker';
import { Textarea } from '../../../utils/fields/FormControls';
import httpService from '../../../services/httpService';
import { API_HOTEL_BOOKING_URL } from '../../../services/apiRoutes';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { money } from '../setupHelpers';

/**
 * Moving a guest to another room, mid-stay.
 *
 * 101's air conditioner failed at nine in the evening and the guest is going
 * to 205. It happens every week, and the only path the module offered was the
 * booking edit -- 205 added, 101 dropped -- which is refused the moment
 * tonight is on the bill, and where it is allowed, writes 101 as a departure so
 * the morning's departures list names a guest who is asleep two floors up.
 *
 * One dialog, opened from the bookings list and from the bill. It reads what
 * the stay holds and where it could go, asks the three questions -- which
 * room, to which room, from which night -- and shows the server's own dry run
 * before the desk confirms: how many nights move, how many of them are already
 * billed, and what the rate difference is.
 *
 * ⚠️ THE RATE IS THE DESK'S CALL, and the default is the guest's side of it.
 * "Keep the old rate" is chosen: a guest moved because the hotel's room failed
 * does not pay more for the hotel's failure. "Charge the new room's rate" is
 * for the guest who asked for the upgrade, and the server refuses it on a
 * night already billed -- the line is posted, and re-pricing it is a credit
 * note nobody has.
 *
 * ⚠️ Not a redux slice. The dialog's state is the dialog's own -- nothing
 * else on any screen reads the move options -- and a slice for a form that is
 * open for thirty seconds would be a store entry to clear on every close.
 */

type Props = {
  /** The booking being moved, or null while closed. */
  booking: any | null;
  onClose: () => void;
  /** Called after a successful move, so the caller can reload what it shows. */
  onMoved: () => void;
};

type RoomOnStay = {
  room_id: number;
  display_name: string | null;
  let_as: 'whole' | 'seat';
  nights_ahead: number;
  billed_ahead: number;
  rate: number;
  guests: number;
  already_left: boolean;
  movable: boolean;
};

type FreeRoom = {
  id: number;
  display_name: string;
  rent: number;
  housekeeping: string;
};

type Options = {
  from_date: string;
  last_night: string;
  rooms: RoomOnStay[];
  free_rooms: FreeRoom[];
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const asText = (date: Date | null): string => {
  if (!date) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

const MoveRoomDialog = ({ booking, onClose, onMoved }: Props) => {
  const [options, setOptions] = useState<Options | null>(null);
  const [fromRoom, setFromRoom] = useState<string>('');
  const [toRoom, setToRoom] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [keepRate, setKeepRate] = useState(true);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [previewSaid, setPreviewSaid] = useState<string>('');
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const bookingId = booking?.id ? Number(booking.id) : null;

  /**
   * What the stay holds and where it could go, from a date.
   *
   * Read again when the date changes: "free from Wednesday" and "free from
   * Thursday" are different lists, and the server is the only thing that can
   * say which rooms have no bed sold on every remaining night.
   */
  const readOptions = useCallback(
    async (from?: string) => {
      if (!bookingId) return;

      setReading(true);

      try {
        const res = await httpService.get(`${API_HOTEL_BOOKING_URL}/move/${bookingId}`, {
          params: from ? { from_date: from } : {},
        });

        if (res.data?.success !== true) {
          toast.error(res.data?.message || 'Could not read the rooms');
          onClose();
          return;
        }

        const got: Options = unwrap(res);
        setOptions(got);
        setFromDate(got.from_date);

        // One movable room needs no question asked.
        const movable = (got.rooms ?? []).filter((room) => room.movable);
        setFromRoom((current) =>
          current && movable.some((room) => String(room.room_id) === current)
            ? current
            : movable.length === 1
              ? String(movable[0].room_id)
              : '',
        );
        setToRoom((current) =>
          current && (got.free_rooms ?? []).some((room) => String(room.id) === current) ? current : '',
        );
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || 'Could not read the rooms');
        onClose();
      } finally {
        setReading(false);
      }
    },
    [bookingId, onClose],
  );

  // Fresh on every open. A dialog reopened on another booking must not show
  // the last one's rooms for the instant the read takes.
  useEffect(() => {
    if (!bookingId) {
      setOptions(null);
      setFromRoom('');
      setToRoom('');
      setFromDate('');
      setKeepRate(true);
      setReason('');
      setPreview(null);
      setPreviewSaid('');
      return;
    }

    void readOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  /**
   * The server's own dry run, whenever the answer to any question changes.
   *
   * ⚠️ The figures the desk confirms are the figures the write will produce,
   * worked out by the same code -- there is no second arithmetic here that
   * could disagree with what happens on Confirm.
   */
  useEffect(() => {
    if (!bookingId || !fromRoom || !toRoom || !fromDate) {
      setPreview(null);
      setPreviewSaid('');
      return;
    }

    let stale = false;

    const run = async () => {
      try {
        const res = await httpService.post(`${API_HOTEL_BOOKING_URL}/move/${bookingId}`, {
          from_room_id: Number(fromRoom),
          to_room_id: Number(toRoom),
          from_date: fromDate,
          keep_rate: keepRate,
          dry_run: true,
        });

        if (stale) return;

        if (res.data?.success === true) {
          setPreview(unwrap(res));
          setPreviewSaid(res.data?.message || '');
        } else {
          setPreview({ refused: true });
          setPreviewSaid(res.data?.message || 'That move cannot be made');
        }
      } catch (error: any) {
        if (stale) return;
        setPreview({ refused: true });
        setPreviewSaid(error?.response?.data?.message || error?.message || 'That move cannot be made');
      }
    };

    void run();

    return () => {
      stale = true;
    };
  }, [bookingId, fromRoom, toRoom, fromDate, keepRate]);

  const changeDate = (date: Date | null) => {
    const text = asText(date);

    if (!text) return;

    setFromDate(text);
    void readOptions(text);
  };

  const confirm = async () => {
    if (!bookingId || !fromRoom || !toRoom || !fromDate) {
      toast.error('Pick the room the guest is leaving, and the one they are going to.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_BOOKING_URL}/move/${bookingId}`, {
        from_room_id: Number(fromRoom),
        to_room_id: Number(toRoom),
        from_date: fromDate,
        keep_rate: keepRate,
        reason: reason.trim() || undefined,
      });

      if (res.data?.success === true) {
        toast.success(res.data?.message || 'Moved');
        onMoved();
        onClose();
      } else {
        toast.error(res.data?.message || 'Could not move the room');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not move the room');
    } finally {
      setSaving(false);
    }
  };

  const rooms = options?.rooms ?? [];
  const movable = rooms.filter((room) => room.movable);
  const free = options?.free_rooms ?? [];
  const chosenFrom = rooms.find((room) => String(room.room_id) === fromRoom);
  const chosenTo = free.find((room) => String(room.id) === toRoom);

  return (
    <ConfirmModal
      show={Boolean(booking)}
      title="Transfer to another room"
      confirmLabel="Transfer the guest"
      cancelLabel="Keep them where they are"
      className="bg-primary hover:bg-primary/90"
      loading={saving || reading}
      disabled={!preview || preview.refused || !fromRoom || !toRoom}
      onCancel={onClose}
      onConfirm={confirm}
      message={
        <>
          <span className="block">
            <strong className="text-black dark:text-white">{booking?.booking_no}</strong>
            {booking?.booker_name ? ` · ${booking.booker_name}` : ''}
          </span>
          <span className="mt-1 block text-sm text-[rgb(var(--c-text-muted))]">
            {formatDayMonthYear(booking?.check_in_date)} → {formatDayMonthYear(booking?.check_out_date)}
          </span>

          {options && !movable.length ? (
            <span className="mt-3 block rounded border border-amber-400 bg-amber-50 p-2 text-left text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-50">
              Nothing on this stay can be moved from {formatDayMonthYear(fromDate)}: the rooms have
              no night left from that date, have already been let go, or are let by the bed.
            </span>
          ) : null}

          {/* div, not span: the fields draw their own labelled blocks. */}
          <div className="mt-3 grid grid-cols-1 gap-2 text-left sm:grid-cols-3">
            <DropdownCommon
              id="move_from_room"
              name="from_room_id"
              label="Leaving"
              data={[
                ...(movable.length === 1 ? [] : [{ id: '', name: 'Which room?' }]),
                ...movable.map((room) => ({
                  id: room.room_id,
                  name: `${room.display_name ?? room.room_id}${room.guests ? ` · ${room.guests} guest${room.guests === 1 ? '' : 's'}` : ''}`,
                })),
              ]}
              value={fromRoom}
              onChange={(e: any) => setFromRoom(e.target.value)}
            />
            <DropdownCommon
              id="move_to_room"
              name="to_room_id"
              label="Going to"
              data={[
                { id: '', name: free.length ? 'Pick a free room' : 'Nothing free on those nights' },
                ...free.map((room) => ({
                  id: room.id,
                  name: `${room.display_name} · ${money(room.rent)}${
                    room.housekeeping === 'dirty' || room.housekeeping === 'cleaning'
                      ? ` · ${room.housekeeping}`
                      : ''
                  }`,
                })),
              ]}
              value={toRoom}
              onChange={(e: any) => setToRoom(e.target.value)}
            />
            <InputDatePicker
              id="move_from_date"
              name="from_date"
              label="From the night of"
              selectedDate={asDate(fromDate)}
              setSelectedDate={changeDate}
              setCurrentDate={() => undefined}
              className="w-full"
            />
          </div>

          {/* ⚠️ WHOSE MONEY. The hotel's failure is the hotel's cost; an
              upgrade the guest asked for is the guest's. Chosen here, in
              words, and written into the history with who decided. */}
          <div className="mt-3 flex flex-col gap-1.5 text-left text-sm">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="move_rate"
                checked={keepRate}
                onChange={() => setKeepRate(true)}
                className="mt-0.5"
              />
              <span>
                <strong className="text-black dark:text-white">Keep the old rate</strong>
                {chosenFrom ? ` — ${money(chosenFrom.rate)} a night` : ''}. The hotel's problem
                does not raise the guest's rent.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="move_rate"
                checked={!keepRate}
                onChange={() => setKeepRate(false)}
                className="mt-0.5"
              />
              <span>
                <strong className="text-black dark:text-white">Charge the new room's rate</strong>
                {chosenTo ? ` — ${money(chosenTo.rent)} a night` : ''}. For a guest who asked for
                the upgrade.
              </span>
            </label>
          </div>

          {/* The server's dry run: what pressing the button will do. */}
          {preview && !preview.refused ? (
            <div className="mt-3 rounded border border-[rgb(var(--c-border))] p-2.5 text-left text-sm text-slate-600 dark:text-slate-300">
              <div>
                <strong className="text-black dark:text-white">
                  {preview.nights_moving} {preview.nights_moving === 1 ? 'night' : 'nights'}
                </strong>{' '}
                move from {preview.from_room?.display_name} to {preview.to_room?.display_name},
                from {formatDayMonthYear(preview.from_date)}
                {preview.guests_moving
                  ? `, with ${preview.guests_moving} guest${preview.guests_moving === 1 ? '' : 's'}`
                  : ''}
                .
              </div>
              {preview.billed_moving ? (
                <div className="mt-1">
                  {preview.billed_moving} of them {preview.billed_moving === 1 ? 'is' : 'are'} already
                  on the bill — the line and its voucher stay as they are, re-pointed at the new
                  room.
                </div>
              ) : null}
              {Math.abs(Number(preview.difference)) >= 0.005 ? (
                <div className="mt-1">
                  {preview.to_room?.display_name} lists {money(preview.new_rate)} against{' '}
                  {money(preview.old_rate)} —{' '}
                  {preview.keep_rate ? (
                    <>the guest goes on paying {money(preview.charging)}.</>
                  ) : (
                    <>
                      the guest will pay <strong>{money(preview.charging)}</strong> a night from
                      the move.
                    </>
                  )}
                </div>
              ) : null}
              {preview.to_room_dirty ? (
                <div className="mt-1 text-amber-700 dark:text-amber-300">
                  {preview.to_room?.display_name} is {preview.to_room?.housekeeping} — housekeeping
                  has not made it up yet.
                </div>
              ) : null}
            </div>
          ) : null}

          {preview?.refused ? (
            <span className="mt-3 block rounded border border-danger bg-rose-50 p-2 text-left text-sm text-rose-900 dark:bg-rose-500/15 dark:text-rose-50">
              {previewSaid}
            </span>
          ) : null}

          <span className="mt-3 block text-left">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Why (optional, kept in the history)
            </span>
            <Textarea
              value={reason}
              onChange={(event: any) => setReason(event.target.value)}
              rows={2}
              maxLength={255}
              placeholder="AC failed, guest asked for a sea view…"
              className="block w-full rounded-xs border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-2 text-sm text-gray-900 outline-none dark:text-[rgb(var(--c-text))]"
            />
          </span>
        </>
      }
    />
  );
};

export default MoveRoomDialog;
