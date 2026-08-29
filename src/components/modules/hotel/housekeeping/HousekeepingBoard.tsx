import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiClock, FiRefreshCw } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Loader from '../../../../common/Loader';
import { Button } from '../../../../pages/UiElements/CustomButtons';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { Textarea } from '../../../utils/fields/FormControls';

import { shortFloor } from '../PropertyGrid';

import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import { API_HOTEL_HOUSEKEEPING_URL } from '../../../services/apiRoutes';

/**
 * Is the room ready? -- phase 5.
 *
 * The gap this closes: after a guest left, the room was dirty and nothing said
 * so. The desk could sell it to somebody walking through the door five minutes
 * later, and the first anybody knew was the new guest standing in an unmade
 * room.
 *
 * ⚠️ CLEANLINESS AND OCCUPANCY ARE DIFFERENT QUESTIONS, and the board shows both
 * because a housekeeper needs both. A dirty room somebody is still asleep in is
 * a different job from a dirty room that is empty, and the only thing that tells
 * them apart is the line under the room number.
 *
 * ⚠️ OUT OF ORDER IS NOT A WORSE KIND OF DIRTY. It takes the room off the market
 * until a person clears it, so it asks for a reason and it is the one state with
 * a confirmation behind it. Everything else is one press, because a housekeeper
 * with an armful of sheets is not going to confirm forty dialogs.
 */

const STATES: { id: string; name: string; className: string; hint: string }[] = [
  {
    id: 'dirty',
    name: 'Dirty',
    className:
      'bg-rose-100 border-rose-400 text-rose-900 dark:bg-rose-500/25 dark:border-rose-400/60 dark:text-rose-50',
    hint: 'Somebody has left it',
  },
  {
    id: 'cleaning',
    name: 'Being cleaned',
    className:
      'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-500/25 dark:border-amber-400/60 dark:text-amber-50',
    hint: 'Somebody is in there now',
  },
  {
    id: 'clean',
    name: 'Ready',
    className:
      'bg-teal-100 border-teal-400 text-teal-900 dark:bg-teal-500/25 dark:border-teal-400/60 dark:text-teal-50',
    hint: 'Made up, ready for a guest',
  },
  {
    id: 'out_of_order',
    name: 'Out of order',
    className:
      'bg-gray-200 border-gray-400 text-gray-700 dark:bg-gray-700/50 dark:border-gray-500 dark:text-gray-200',
    hint: 'Not for sale until somebody clears it',
  },
];

const look = (status: string) => STATES.find((s) => s.id === status) ?? STATES[2];

const HousekeepingBoard = () => {
  const dispatch = useDispatch<any>();
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings?.data);

  const [branchId, setBranchId] = useState<string>('');
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  /** The room being taken out of order, and why. */
  const [blocking, setBlocking] = useState<any>(null);
  const [reason, setReason] = useState('');

  const [history, setHistory] = useState<any>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (!branchId && settings?.branch?.id) setBranchId(String(settings.branch.id));
  }, [settings?.branch?.id, branchId]);

  const load = useCallback(async () => {
    if (!branchId) return;

    setLoading(true);

    try {
      const res = await httpService.get(API_HOTEL_HOUSEKEEPING_URL, {
        params: { branch_id: branchId },
      });

      setBoard(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the board');
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const move = async (room: any, status: string, notes?: string) => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_HOUSEKEEPING_URL}/move/${room.id}`, {
        status,
        notes: notes ?? null,
      });

      toast.success(res?.data?.message || 'Moved');
      setBlocking(null);
      setReason('');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not move it');
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (room: any) => {
    try {
      const res = await httpService.get(`${API_HOTEL_HOUSEKEEPING_URL}/history/${room.id}`);
      setHistory(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read its history');
    }
  };

  const rooms = (board?.rooms ?? []).filter((room: any) => !filter || room.status === filter);

  // The property drawn the way the Layout tab and the booking screen draw it:
  // one card per block, floors stacked with the top one at the top. A
  // housekeeper looking for ANX/203 reads one card and one row, not forty-six
  // cards; and somebody who has learned where 302 is on the setup screen does
  // not have to learn a second arrangement here.
  //
  // Built by walking the list rather than sorting it: the server already sends
  // the rooms by block, then floor number, then room number, and a sort here
  // would be a second opinion about that order.
  const blocks: {
    id: any;
    name: string;
    code: string;
    count: number;
    floors: { id: any; label: string; title?: string; rooms: any[] }[];
  }[] = [];

  rooms.forEach((room: any) => {
    const blockId = room.building_id ?? room.building ?? '';
    let block = blocks[blocks.length - 1];

    if (!block || block.id !== blockId) {
      block = {
        id: blockId,
        // A room in no block still has to go somewhere it can be found.
        name: room.building_name || room.building || 'Elsewhere on the property',
        code: room.building_name && room.building !== room.building_name ? room.building : '',
        count: 0,
        floors: [],
      };
      blocks.push(block);
    }

    block.count += 1;

    const floorId = room.floor_id ?? '';
    let floor = block.floors[block.floors.length - 1];

    if (!floor || floor.id !== floorId) {
      floor = {
        id: floorId,
        // One rule for what goes in the gutter, and it lives with the grid that
        // invented it: "5th Floor" does not fit there, "5F" does.
        label: room.floor_no === null || room.floor_no === undefined
          ? '—'
          : shortFloor({ floor_no: room.floor_no } as any),
        title: room.floor_name
          || 'Rooms with no floor. A resort’s cottages have none, and none is invented for them.',
        rooms: [],
      };
      block.floors.push(floor);
    }

    floor.rooms.push(room);
  });

  // Top floor at the top: which end is up is a fact about the drawing, not
  // about the data, so it is turned over here and not on the server.
  //
  // The rooms that belong to no floor go under the lot rather than above it --
  // a hall and a community centre have none, and turning the stack over had
  // been standing them on the roof.
  blocks.forEach((block) => {
    block.floors.reverse();

    const loose = block.floors.filter((floor) => !floor.id);

    if (loose.length) {
      block.floors = block.floors.filter((floor) => floor.id).concat(loose);
    }
  });

  if (loading && !board) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Housekeeping" />

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Property
          </span>
          <BranchDropdown
            id="housekeeping_branch"
            name="branch_id"
            branchDdl={branchDdl?.protectedData?.data ?? []}
            value={branchId}
            onChange={(event: any) => setBranchId(event.target.value)}
          />
        </div>
      </div>

      {/* The shape of the morning. Pressing one filters to it; pressing it
          again clears — a housekeeper working down the dirty rooms wants the
          count to stay visible while they do it. */}
      {board?.counts ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {STATES.map((state) => (
            <button
              key={state.id}
              type="button"
              onClick={() => setFilter(filter === state.id ? '' : state.id)}
              title={state.hint}
              className={`rounded border px-3 py-1.5 text-left text-xs transition ${state.className} ${
                filter === state.id ? 'ring-2 ring-primary dark:ring-secondary' : ''
              }`}
            >
              <span className="text-base font-semibold">{board.counts[state.id] ?? 0}</span>{' '}
              {state.name}
            </button>
          ))}

          <Button
            type="button"
            onClick={load}
            className="rounded border border-stroke px-3 dark:border-strokedark"
            title="Read the board again"
          >
            <FiRefreshCw size={14} />
          </Button>
        </div>
      ) : null}

      {blocks.map((block) => (
        <div
          key={String(block.id)}
          className="mb-4 rounded border border-stroke dark:border-strokedark"
        >
          {/* The block named the way the layout grid names it -- full name,
              code beside it -- and under it how many rooms are on show, so a
              filtered board says "3 rooms" rather than leaving somebody to
              count the cards. */}
          <div className="border-b border-stroke px-3 py-2 dark:border-strokedark">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-black dark:text-white">{block.name}</span>
              {block.code ? <span className="text-xs text-gray-400">{block.code}</span> : null}
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-200">
              {block.count} {block.count === 1 ? 'room' : 'rooms'}
            </div>
          </div>

          {/* One gap for both directions, as on the layout grid: the column
              spaces the floors and the grid spaces the cards, and they are the
              same number, so a room sits as far from the one above it as from
              the one beside it. */}
          <div className="flex flex-col gap-2 p-2">
            {block.floors.map((floor) => (
              <div key={String(floor.id)} className="flex items-start gap-2">
                {/* The floor marker, in ink and no colour: on this board colour
                    means a state, and a filled chip in the gutter would join
                    that conversation with nothing to say. */}
                <span
                  title={floor.title}
                  className="w-10 shrink-0 pt-2 text-center text-sm font-bold text-gray-700 dark:text-gray-200"
                >
                  {floor.label}
                </span>

                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {floor.rooms.map((room: any) => {
                    const paint = look(room.status);

                    return (
                      <div key={room.id} className={`rounded border p-2 ${paint.className}`}>
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="text-sm font-semibold">{room.name}</span>
                          <button
                            type="button"
                            onClick={() => openHistory(room)}
                            title="What has happened to this room"
                            className="opacity-70 hover:opacity-100"
                          >
                            <FiClock size={13} />
                          </button>
                        </div>

                        {/* ⚠️ Occupancy, said separately from cleanliness. A dirty
                            room somebody is still asleep in is a different job from a
                            dirty room that is empty. */}
                        <div className="mt-0.5 text-[0.65rem] leading-tight opacity-80">
                          {room.occupied ? <div>{room.guest}</div> : <div>empty</div>}
                          {room.notes ? <div className="italic">{room.notes}</div> : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {STATES.filter((s) => s.id !== room.status).map((state) => (
                            <button
                              key={state.id}
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                // ⚠️ The only state with a dialog behind it. It
                                // takes the room off the market until a person clears
                                // it, so it has to say why — everything else is one
                                // press, because somebody with an armful of sheets will
                                // not confirm forty dialogs.
                                if (state.id === 'out_of_order') {
                                  setBlocking(room);
                                  setReason('');
                                  return;
                                }

                                move(room, state.id);
                              }}
                              className="rounded border border-current/30 bg-white/50 px-1.5 py-0.5 text-[0.6rem] font-medium hover:bg-white/80 disabled:opacity-50 dark:bg-black/20 dark:hover:bg-black/40"
                            >
                              {state.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!rooms.length ? (
        <p className="rounded border border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
          {filter
            ? 'No rooms in that state.'
            : 'No rooms on this property yet. Set them up on the Hotel Setup screen first.'}
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-snug text-gray-500 dark:text-gray-400">
        A room is marked <strong>dirty automatically</strong> when its guests check out — nobody
        has to remember. <strong>Out of order</strong> takes it off the booking screen entirely
        until somebody clears it.
      </p>

      <ConfirmModal
        show={Boolean(blocking)}
        title="Take this room out of order"
        confirmLabel="Take it out of service"
        cancelLabel="Never mind"
        className="bg-danger hover:bg-danger/90"
        loading={saving}
        disabled={!reason.trim()}
        onCancel={() => setBlocking(null)}
        onConfirm={() => move(blocking, 'out_of_order', reason.trim())}
        message={
          <>
            <span className="block">
              <strong className="text-black dark:text-white">{blocking?.name}</strong>
            </span>

            <span className="mt-2 block text-sm">
              It will not be offered on the booking screen at all — not even for dates it is free
              on — until somebody puts it back.
            </span>

            <span className="mt-3 block text-left">
              <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                What is wrong with it
              </span>
              <Textarea
                value={reason}
                onChange={(event: any) => setReason(event.target.value)}
                rows={2}
                maxLength={255}
                placeholder="Air conditioner broken, being painted…"
                className="block w-full rounded-xs border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-2 text-sm text-gray-900 outline-none dark:text-[rgb(var(--c-text))]"
              />
              {/* Required, and the button stays dead until it is given. A room
                  nobody can sell for a reason nobody wrote down stays out of
                  order until it is noticed. */}
            </span>
          </>
        }
      />

      <ConfirmModal
        show={Boolean(history)}
        title={`${history?.room ?? 'Room'} — what has happened to it`}
        confirmLabel="Close"
        showCancelButton={false}
        className="bg-slate-500 hover:bg-slate-600"
        onCancel={() => setHistory(null)}
        onConfirm={() => setHistory(null)}
        message={
          <span className="block max-h-80 overflow-y-auto text-left text-xs">
            {history?.rows?.length ? (
              history.rows.map((row: any, index: number) => (
                <span key={index} className="block border-b border-stroke py-1 dark:border-strokedark">
                  <span className="text-gray-500 dark:text-gray-400">{row.at}</span>{' '}
                  <strong className="text-black dark:text-white">
                    {String(row.to).replace('_', ' ')}
                  </strong>
                  {row.from ? (
                    <span className="text-gray-500 dark:text-gray-400">
                      {' '}
                      (was {String(row.from).replace('_', ' ')})
                    </span>
                  ) : null}
                  <span className="text-gray-500 dark:text-gray-400"> · {row.by}</span>
                  {row.notes ? <span className="block italic">{row.notes}</span> : null}
                </span>
              ))
            ) : (
              <span className="block py-2 text-gray-500 dark:text-gray-400">
                Nothing has happened to it yet.
              </span>
            )}
          </span>
        }
      />
    </div>
  );
};

export default HousekeepingBoard;
