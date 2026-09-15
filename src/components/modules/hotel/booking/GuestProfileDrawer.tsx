import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiX } from 'react-icons/fi';

import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { Textarea } from '../../../utils/fields/FormControls';
import httpService from '../../../services/httpService';
import { API_HOTEL_BOOKING_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { money } from '../setupHelpers';

/**
 * One guest, every stay -- "has this person been here before, and how did it go?"
 *
 * Opened by clicking a guest's name on the bookings list, the check-in screen
 * or the booking form. Reads bookings/guest/history by NID or mobile and draws
 * the person as last recorded, the totals, every booking newest first, and the
 * notes the desk keeps about the PERSON -- "wants an east-facing room" -- which
 * are true of the guest and not of the stay they said it on.
 *
 * ⚠️ A drawer, not a page. It is opened mid-task -- on the telephone, or with
 * a guest at the desk -- and closed again; the screen underneath is the one
 * the desk is working on and must still be there when this shuts.
 *
 * ⚠️ NOT A CUSTOMER ACCOUNT. The party master is for whoever money is owed
 * by; nothing here creates one.
 */

export type GuestKey = { national_id?: string | null; mobile?: string | null; name?: string | null };

type Props = {
  guest: GuestKey | null;
  branchId?: number | null;
  onClose: () => void;
};

const STATUS_WORD: Record<string, string> = {
  hold: 'Held',
  confirmed: 'Confirmed',
  checked_in: 'In house',
  checked_out: 'Stayed',
  cancelled: 'Cancelled',
  expired: 'Hold lapsed',
  no_show: 'No-show',
};

const STATUS_TONE: Record<string, string> = {
  checked_in: 'text-violet-700 dark:text-violet-300',
  checked_out: 'text-teal-700 dark:text-teal-300',
  no_show: 'font-semibold text-orange-700 dark:text-orange-300',
  cancelled: 'text-gray-500',
  expired: 'text-gray-500',
};

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

const GuestProfileDrawer = ({ guest, branchId, onClose }: Props) => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const open = Boolean(guest && (guest.national_id || guest.mobile));

  const load = useCallback(async () => {
    if (!guest) return;

    setLoading(true);

    try {
      const res = await httpService.get(`${API_HOTEL_BOOKING_URL}/guest/history`, {
        params: {
          national_id: guest.national_id || undefined,
          mobile: guest.mobile || undefined,
          branch_id: branchId || undefined,
        },
      });

      if (res.data?.success !== true) {
        toast.error(res.data?.message || 'Could not read the guest');
        setProfile(null);
        return;
      }

      setProfile(unwrap(res));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not read the guest');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [guest, branchId]);

  useEffect(() => {
    if (!open) {
      setProfile(null);
      setNote('');
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

  /**
   * Which key a new note hangs off: the NID where the guest has one, the
   * mobile where not -- the rule the whole profile follows.
   */
  const noteKey = useMemo(() => {
    const nid = profile?.key?.national_id || guest?.national_id;

    if (nid) return { key_kind: 'nid', guest_key: nid };

    const mobile = profile?.key?.mobile || guest?.mobile;

    return mobile ? { key_kind: 'mobile', guest_key: mobile } : null;
  }, [profile, guest]);

  const addNote = async () => {
    if (!noteKey || !note.trim()) return;

    setSavingNote(true);

    try {
      const res = await httpService.post(`${API_HOTEL_BOOKING_URL}/guest/notes/store`, {
        ...noteKey,
        note: note.trim(),
      });

      if (res.data?.success !== true) {
        toast.error(res.data?.message || 'Could not save the note');
        return;
      }

      setNote('');
      // Read again rather than patched: the server orders and names them.
      void load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not save the note');
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = async (id: number) => {
    try {
      const res = await httpService.post(`${API_HOTEL_BOOKING_URL}/guest/notes/delete/${id}`, {});

      if (res.data?.success !== true) {
        toast.error(res.data?.message || 'Could not remove the note');
        return;
      }

      void load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not remove the note');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'booking_no',
        header: 'Booking',
        render: (row: any) => (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline dark:text-secondary"
            onClick={() => {
              onClose();
              navigate(`${routes.hotel_booking_edit}/${row.id}`);
            }}
            title="Open the booking"
          >
            {row.booking_no}
          </button>
        ),
      },
      {
        key: 'stay',
        header: 'Stay',
        render: (row: any) => (
          <div className="text-xs">
            <div className="text-black dark:text-white">
              {formatDayMonthYear(row.check_in_date)} → {formatDayMonthYear(row.check_out_date)}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              {row.nights} {Number(row.nights) === 1 ? 'night' : 'nights'}
              {row.rooms?.length ? ` · ${row.rooms.join(', ')}` : ''}
              {row.stay_kind && row.stay_kind !== 'paid'
                ? ` · ${row.stay_kind === 'house_use' ? 'house use' : 'complimentary'}`
                : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'How it went',
        render: (row: any) => (
          <span className={`text-xs ${STATUS_TONE[row.status] ?? 'text-black dark:text-white'}`}>
            {STATUS_WORD[row.status] ?? row.status}
            {/* Telephoned for, never named in a room -- said, because a
                no-show is exactly that, and a stay somebody else slept on
                under this number is not this guest's stay. */}
            {!row.was_guest && ['checked_in', 'checked_out'].includes(row.status) ? (
              <span className="ml-1 text-[0.6rem] text-gray-400" title="Booked under this number; somebody else was named in the room.">
                (booked)
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'money',
        header: 'Billed / paid',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => (
          <div className="text-xs">
            <div className="text-black dark:text-white">
              {money(row.billed)} / {money(row.paid)}
            </div>
            {row.carried ? (
              <div className="text-gray-500 dark:text-gray-400">billed to a company</div>
            ) : Number(row.due) > 0 && ['checked_in', 'checked_out'].includes(row.status) ? (
              <div className="font-semibold text-danger dark:text-red-400">owes {money(row.due)}</div>
            ) : Number(row.retained) > 0 ? (
              <div className="text-gray-500 dark:text-gray-400">{money(row.retained)} kept</div>
            ) : null}
          </div>
        ),
      },
    ],
    [navigate, onClose],
  );

  if (!open) return null;

  const person = profile?.guest;
  const totals = profile?.totals;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col border-l border-[rgb(var(--c-border))] bg-white shadow-2xl dark:bg-graydark"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              {person?.name || guest?.name || 'Guest'}
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {[
                person?.mobile || guest?.mobile,
                person?.national_id ? `NID ${person.national_id}` : null,
                person?.address,
              ]
                .filter(Boolean)
                .join(' · ')}
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && !profile ? <Loader /> : null}

          {profile && !profile.found ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nobody on file under this number yet. The first stay writes the history.
            </p>
          ) : null}

          {profile?.found ? (
            <>
              {/* The four numbers a desk wants before it says yes: how often,
                  how recently, whether they ever did not come, whether they
                  owe. In that order. */}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Figure label="Stays" value={String(totals?.stays ?? 0)} />
                <Figure
                  label="Last stay"
                  value={totals?.last_stay ? formatDayMonthYear(totals.last_stay) : '—'}
                />
                <Figure
                  label="No-shows"
                  value={String(totals?.no_shows ?? 0)}
                  tone={Number(totals?.no_shows) > 0 ? 'text-orange-700 dark:text-orange-300' : ''}
                />
                <Figure
                  label="Owes"
                  value={money(totals?.due ?? 0)}
                  tone={Number(totals?.due) > 0 ? 'text-danger dark:text-red-400' : ''}
                />
              </div>

              <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                {money(totals?.billed ?? 0)} billed over {totals?.stays ?? 0}{' '}
                {Number(totals?.stays) === 1 ? 'stay' : 'stays'}, {money(totals?.paid ?? 0)} paid
                {totals?.cancelled ? ` · ${totals.cancelled} cancelled` : ''}
                {totals?.upcoming ? ` · ${totals.upcoming} upcoming` : ''}
              </div>

              <Table
                columns={columns}
                data={profile.stays ?? []}
                noDataMessage="No bookings under this guest."
                className="mb-5"
              />
            </>
          ) : null}

          {/* The notes: about the person, not a booking. Newest first, and a
              wrong one is removed rather than edited. */}
          {profile ? (
            <div className="rounded border border-stroke p-3 dark:border-strokedark">
              <div className="mb-2 text-sm font-semibold text-black dark:text-white">
                What the desk knows
              </div>

              {(profile.notes ?? []).length ? (
                <ul className="mb-3 flex flex-col gap-2">
                  {profile.notes.map((one: any) => (
                    <li
                      key={one.id}
                      className="flex items-start justify-between gap-3 border-b border-dashed border-stroke pb-2 text-sm last:border-0 dark:border-strokedark"
                    >
                      <div>
                        <div className="text-black dark:text-white">{one.note}</div>
                        <div className="text-[0.65rem] text-gray-500 dark:text-gray-400">
                          {one.by ? `${one.by} · ` : ''}
                          {one.created_at ? formatDayMonthYear(one.created_at) : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNote(one.id)}
                        className="mt-0.5 text-gray-400 hover:text-danger dark:hover:text-red-400"
                        title="Remove this note"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  Nothing written down yet. "Wants an east-facing room", "asks for a discount every
                  time" — the things a receptionist remembers and the next shift does not.
                </p>
              )}

              {noteKey ? (
                <div className="flex items-end gap-2">
                  <Textarea
                    value={note}
                    onChange={(event: any) => setNote(event.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="A sentence about the guest…"
                    className="block w-full rounded-xs border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-2 text-sm text-gray-900 outline-none dark:text-[rgb(var(--c-text))]"
                  />
                  <ButtonLoading
                    onClick={addNote}
                    buttonLoading={savingNote}
                    label="Note"
                    variant="primary"
                    icon={<FiPlus size={16} />}
                    disabled={!note.trim()}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const Figure = ({ label, value, tone = '' }: { label: string; value: string; tone?: string }) => (
  <div className="rounded border border-stroke p-2 dark:border-strokedark">
    <div className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    <div className={`text-base font-semibold ${tone || 'text-black dark:text-white'}`}>{value}</div>
  </div>
);

export default GuestProfileDrawer;
