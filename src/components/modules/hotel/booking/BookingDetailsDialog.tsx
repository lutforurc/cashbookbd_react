import { useCallback, useEffect, useState } from 'react';
import { FiFileText, FiX } from 'react-icons/fi';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import httpService from '../../../services/httpService';
import { API_HOTEL_BOOKING_URL, API_HOTEL_FOLIO_URL } from '../../../services/apiRoutes';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { money } from '../setupHelpers';

/**
 * One booking, read in full, from the bookings list.
 *
 * Opened by pressing the booking number. The list row says enough to find a
 * booking; this says enough to answer the telephone about it -- which rooms
 * and halls, for which nights, who pays, what has been billed and paid -- without
 * opening the edit form, where a stray keystroke changes a booking somebody
 * only wanted to read.
 *
 * ⚠️ READ-ONLY, and two reads. The booking comes from the same answer the edit
 * form is filled from (rooms, beds, sittings, payer's name); the money from the
 * bill's own answer. The bill is behind its own permission, so a clerk who may
 * see bookings but not bills gets the booking without the money section rather
 * than a dialog that refuses to open.
 *
 * ⚠️ Not a redux slice, for the reason MoveRoomDialog gives: nothing else reads
 * it, and the edit form's slot (`bookingRead`) must not be overwritten by a
 * booking somebody merely glanced at.
 */

type Props = {
  /** The list row pressed, or null when closed. Shown at once while the rest loads. */
  booking: any | null;
  /** The status chip's look, from the list, so the two always agree. */
  statusLook?: { className: string; label: string };
  /** Opens the bill. Left out where the booking has no bill to go to. */
  onOpenBill?: (bookingId: number) => void;
  onClose: () => void;
};

const TYPE_LABEL: Record<string, string> = {
  individual: 'Individual',
  group: 'Group',
  corporate: 'Corporate',
  walk_in: 'Walk-in (no room)',
};

const STAY_KIND_LABEL: Record<string, string> = {
  paid: 'Paid',
  complimentary: 'Complimentary',
  house_use: 'House use',
};

const PURPOSE_LABEL: Record<string, string> = {
  advance: 'Advance',
  settlement: 'Settlement',
  refund: 'Refund',
};

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

const capitalise = (text?: string | null) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, ' ') : '';

const BookingDetailsDialog = ({ booking, statusLook, onOpenBill, onClose }: Props) => {
  const open = Boolean(booking);
  const bookingId = booking?.id ? Number(booking.id) : null;

  const [detail, setDetail] = useState<any>(null);
  const [folio, setFolio] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bookingId) return;

    setLoading(true);
    setFailed(null);

    // ⚠️ allSettled, not all: the bill failing (no permission, or no bill yet)
    // must not take the booking down with it.
    const [bookingRes, folioRes] = await Promise.allSettled([
      httpService.get(`${API_HOTEL_BOOKING_URL}/edit/${bookingId}`),
      httpService.get(`${API_HOTEL_FOLIO_URL}/${bookingId}`),
    ]);

    if (bookingRes.status === 'fulfilled' && bookingRes.value?.data?.success === true) {
      setDetail(unwrap(bookingRes.value));
    } else {
      const reason: any = bookingRes.status === 'rejected' ? bookingRes.reason : bookingRes.value;
      setFailed(
        reason?.response?.data?.message || reason?.data?.message || 'The booking could not be read.',
      );
    }

    setFolio(
      folioRes.status === 'fulfilled' && folioRes.value?.data?.success === true
        ? unwrap(folioRes.value)
        : null,
    );

    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setFolio(null);
      setFailed(null);
      return;
    }

    void load();
  }, [open, load]);

  // Escape closes it, like every dialog a desk uses one-handed.
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // The row is shown until the full read arrives, so the dialog never opens blank.
  const b = { ...booking, ...(detail ?? {}) };
  const isWalkIn = b.booking_type === 'walk_in';
  const rooms: any[] = detail?.rooms ?? [];
  const sittings: any[] = detail?.sittings ?? [];

  // A hall is folded into `rooms` as well (its nights are rows like any other),
  // and already said in full under Halls -- so it is not listed twice.
  const hallIds = new Set(sittings.map((s) => Number(s.resource_id)));
  const roomRows = rooms.filter((room) => !hallIds.has(Number(room.room_id)));

  const totals = folio?.totals;
  const balance = Number(folio?.balance ?? 0);
  const payments: any[] = folio?.payments ?? [];

  return (
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Booking ${b.booking_no ?? ''}`}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[rgb(var(--c-border))] bg-white text-slate-800 shadow-2xl dark:bg-graydark dark:text-[rgb(var(--c-text))]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header: the number, the state, and the way out. */}
        <div className="flex items-start justify-between gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-black dark:text-white">{b.booking_no}</h3>
              <span
                className={`inline-flex h-5.5 items-center rounded border px-2 text-[0.65rem] font-semibold leading-none ${
                  statusLook?.className ?? ''
                }`}
              >
                {statusLook?.label ?? capitalise(b.status)}
              </span>
              {b.stay_kind && b.stay_kind !== 'paid' ? (
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {STAY_KIND_LABEL[b.stay_kind] ?? b.stay_kind}
                </span>
              ) : null}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {TYPE_LABEL[b.booking_type] ?? capitalise(b.booking_type)}
              {b.booking_date ? ` · Booked on ${formatDayMonthYear(b.booking_date)}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-black dark:hover:text-white"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          {failed ? (
            <p className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-red-800 dark:border-red-500/50 dark:bg-red-500/15 dark:text-red-100">
              {failed}
            </p>
          ) : null}

          {/* Guest and stay, side by side: who, and when. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Section title="Guest">
              <Row label="Name" value={b.booker_name} />
              <Row label="Mobile" value={b.booker_mobile} />
              <Row label="Bill paid by" value={b.billed_to_party_name} />
              <Row label="Bill in the name of" value={b.bill_name} />
              <Row label="Payment terms" value={capitalise(b.payment_terms)} />
            </Section>

            <Section title={isWalkIn ? 'Sale' : 'Stay'}>
              {isWalkIn ? (
                <Row label="Date" value={formatDayMonthYear(b.check_in_date)} />
              ) : (
                <>
                  <Row label="Arrival" value={formatDayMonthYear(b.check_in_date)} />
                  <Row label="Departure" value={formatDayMonthYear(b.check_out_date)} />
                  <Row
                    label="Nights"
                    value={b.nights !== undefined && b.nights !== null ? String(b.nights) : ''}
                  />
                  <Row
                    label="Guests (stated)"
                    value={`${b.stated_adults ?? 0} adult${Number(b.stated_adults) === 1 ? '' : 's'}${
                      Number(b.stated_children) ? `, ${b.stated_children} children` : ''
                    }`}
                  />
                  {Number(b.guests_count) ? (
                    <Row label="Named at the desk" value={String(b.guests_count)} />
                  ) : null}
                </>
              )}
              {b.status === 'hold' && b.hold_until ? (
                <Row label="Held until" value={formatDayMonthYear(b.hold_until)} />
              ) : null}
              {b.stay_kind && b.stay_kind !== 'paid' && b.stay_kind_reason ? (
                <Row label="Why not charged" value={b.stay_kind_reason} />
              ) : null}
            </Section>
          </div>

          {loading && !detail ? (
            <div className="py-6">
              <Loader />
            </div>
          ) : null}

          {/* Rooms and beds: what the stay holds. */}
          {roomRows.length ? (
            <Section title="Rooms" className="mt-3">
              <MiniTable
                head={['Room', 'Let as', 'Nights', 'Rent']}
                rows={roomRows.map((room) => {
                  const nights: string[] = room.nights ?? [];
                  return [
                    room.display_name ?? `#${room.room_id}`,
                    room.let_as === 'seat'
                      ? `${room.beds} ${Number(room.beds) === 1 ? 'bed' : 'beds'}`
                      : 'Whole room',
                    nights.length
                      ? `${nights.length} (${formatDayMonthYear(nights[0])}${
                          nights.length > 1 ? ` → ${formatDayMonthYear(nights[nights.length - 1])}` : ''
                        })`
                      : '—',
                    money(room.rent_total),
                  ];
                })}
                alignRight={[3]}
              />
            </Section>
          ) : null}

          {/* Halls: one line per sitting, because a wedding is the evening of
              one day and the morning of the next. */}
          {sittings.length ? (
            <Section title="Halls" className="mt-3">
              <MiniTable
                head={['Date', 'Hall', 'Sitting', 'Rent']}
                rows={sittings.map((s) => [
                  formatDayMonthYear(s.date),
                  s.hall ?? '—',
                  s.sitting ?? '—',
                  money(s.rent),
                ])}
                alignRight={[3]}
              />
            </Section>
          ) : null}

          {/* Money: only where the bill could be read. */}
          {folio ? (
            <Section title="Bill" className="mt-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Figure label="Billed" value={money(totals?.rounded ?? 0)} />
                <Figure label="Discount" value={money(totals?.discount ?? 0)} />
                <Figure label="Paid" value={money(folio?.paid ?? 0)} />
                {/* Negative is money in hand -- an advance with nothing billed
                    against it yet -- and must not read as a debt. */}
                <Figure
                  label={balance < 0 ? 'In hand' : 'Due'}
                  value={money(Math.abs(balance))}
                  tone={balance > 0 ? 'text-danger dark:text-red-400' : ''}
                />
              </div>

              {Number(folio?.unbilled_nights) ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  {folio.unbilled_nights} {Number(folio.unbilled_nights) === 1 ? 'night is' : 'nights are'} held
                  but not billed yet.
                </p>
              ) : null}

              {payments.length ? (
                <div className="mt-3">
                  <MiniTable
                    head={['Receipt', 'Date', 'What for', 'How', 'Amount']}
                    rows={payments.map((p) => [
                      p.payment_no ?? '—',
                      formatDayMonthYear(p.payment_date),
                      PURPOSE_LABEL[p.purpose] ?? capitalise(p.purpose),
                      capitalise(p.method),
                      money(p.amount),
                    ])}
                    alignRight={[4]}
                  />
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No money taken yet.</p>
              )}
            </Section>
          ) : null}

          {b.notes ? (
            <Section title="Notes" className="mt-3">
              <p className="whitespace-pre-line text-black dark:text-white">{b.notes}</p>
            </Section>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[rgb(var(--c-border))] px-5 py-3">
          {onOpenBill && bookingId ? (
            <ButtonLoading
              onClick={() => {
                onClose();
                onOpenBill(bookingId);
              }}
              label="Open bill"
              variant="primary"
              icon={<FiFileText size={16} />}
            />
          ) : null}
          <ButtonLoading onClick={onClose} label="Close" icon={<FiX size={16} />} />
        </div>
      </div>
    </div>
  );
};

const Section = ({
  title,
  className = '',
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`rounded border border-stroke p-3 dark:border-strokedark ${className}`}>
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {title}
    </div>
    {children}
  </div>
);

/** One label and its answer. A blank answer is left out rather than drawn as a dash. */
const Row = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium text-black dark:text-white">{value}</span>
    </div>
  ) : null;

const Figure = ({ label, value, tone = '' }: { label: string; value: string; tone?: string }) => (
  <div className="rounded border border-stroke p-2 dark:border-strokedark">
    <div className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    <div className={`text-base font-semibold ${tone || 'text-black dark:text-white'}`}>{value}</div>
  </div>
);

const MiniTable = ({
  head,
  rows,
  alignRight = [],
}: {
  head: string[];
  rows: React.ReactNode[][];
  alignRight?: number[];
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-stroke text-gray-500 dark:border-strokedark dark:text-gray-400">
          {head.map((h, i) => (
            <th key={h} className={`py-1 pr-2 font-medium ${alignRight.includes(i) ? 'text-right' : 'text-left'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, r) => (
          <tr key={r} className="border-b border-dashed border-stroke last:border-0 dark:border-strokedark">
            {cells.map((cell, i) => (
              <td
                key={i}
                className={`py-1 pr-2 text-black dark:text-white ${alignRight.includes(i) ? 'text-right' : 'text-left'}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default BookingDetailsDialog;
