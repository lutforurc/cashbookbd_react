import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiX } from 'react-icons/fi';

import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import routes from '../../services/appRoutes';

import SeatEditor from './SeatEditor';
import { HotelResource, LayoutRoom } from './types';
import { SALE_MODE_OPTIONS, money } from './setupHelpers';

/**
 * One room, opened from the grid.
 *
 * A dialog rather than a column down the right-hand side. As a panel it had
 * about 18rem to work in, and the bed table did not fit: the rent column was
 * cut to "ER NIGHT", the sentence under it lost its first few words to a
 * horizontal scrollbar, and the grid it opened beside was squeezed at the same
 * time. Every one of those is the same complaint -- detail wants width, and a
 * column beside the thing it describes is where width is scarcest.
 *
 * It is what lets the tiles stay small. Everything a tile cannot fit -- the
 * full name, the rents, every bed and what each costs -- lives here, and the
 * grid keeps its job of showing the shape of the property rather than its
 * detail.
 *
 * It opens from the SUMMARY the grid already holds and fills in as the detail
 * arrives, so a click paints immediately instead of showing a spinner over an
 * empty box. `detail` is null for that first moment and whenever the fetch
 * fails; everything that reads it says so.
 */

interface RoomPanelProps {
  /** What the grid knew when the tile was clicked. Always present. */
  summary: LayoutRoom;
  /** The room with its beds. Arrives a moment later. */
  detail: HotelResource | null;
  onClose: () => void;
  /** Told when a bed is repriced, so the grid's own totals can be refreshed. */
  onChanged: () => void;
}

const RoomPanel: React.FC<RoomPanelProps> = ({ summary, detail, onClose, onChanged }) => {
  const navigate = useNavigate();

  const showing = detail?.id === summary.id ? detail : null;

  const saleLabel =
    SALE_MODE_OPTIONS.find((o) => o.id === summary.sale_mode)?.name ?? summary.sale_mode;

  const switchedOff = Math.max(0, (summary.beds ?? 0) - (summary.active_beds ?? 0));

  /**
   * The facts, as data.
   *
   * A list rather than markup because "Per bed" is only there for a room sold
   * that way, and the two columns have to divide whatever is actually present.
   * Written as JSX the split would have to be counted by hand and would be
   * wrong the day a fact is added.
   */
  const facts: { label: string; value: React.ReactNode }[] = [
    { label: 'Sold', value: saleLabel },
    {
      label: 'Whole room',
      // A dash, not 0.00. A room sold only by the bed has no whole-room price,
      // and a zero would read as free.
      value: summary.rent === null ? '—' : `৳${money(summary.rent)} / night`,
    },
    ...(summary.seat_rent_min !== null
      ? [
          {
            label: 'Per bed',
            value:
              summary.seat_rent_min === summary.seat_rent_max
                ? `৳${money(summary.seat_rent_min)} / night`
                : `৳${money(summary.seat_rent_min)} – ${money(summary.seat_rent_max)} / night`,
          },
        ]
      : []),
    { label: 'Holds', value: `${summary.capacity} guest${summary.capacity === 1 ? '' : 's'}` },
    {
      label: 'Beds',
      value: switchedOff
        ? `${summary.active_beds} in use, ${switchedOff} switched off`
        : `${summary.active_beds}`,
    },
    {
      label: 'Status',
      value:
        Number(summary.status) === 1 ? (
          <span className="text-success">Active</span>
        ) : (
          <span className="text-gray-400">Inactive</span>
        ),
    },
  ];

  // Escape closes it. A dialog that can only be dismissed by finding its own
  // small × is a dialog people learn to avoid opening.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6 print:hidden"
      // The backdrop closes it; the dialog stops the click from reaching the
      // backdrop, so a stray click inside -- on a rent field, say -- does not
      // throw away what is being typed.
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-sm bg-white shadow-xl dark:bg-gray-800"
      >
        <div className="flex items-start justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
              {summary.display_name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {summary.room_type ?? 'No room type'}
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-100 hover:text-red-500 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FiX className="text-lg" />
          </Button>
        </div>

        {/* The facts sit across the top and the beds get the whole width below.
            Side by side, the bed table had half a dialog to work in and went on
            scrolling sideways -- and the facts, which are six short pairs, were
            the half not needing the room. Whichever of the two is given the
            width should be the one that can use it. */}
        <div className="space-y-4 p-4">
          {/*
            A rule down the middle, because without one the two columns run
            together. Each fact is a label pushed left and its value pushed
            right, so two of them side by side read as four things in a row --
            and "Whole room ... ৳3,500" sits next to "Beds ... 2" with nothing
            saying which value belongs to which label.

            The columns are split here rather than left to the grid to flow,
            which is what makes the rule possible: a border between two real
            columns runs their full height, while a border on every second item
            of a flowing grid is a stack of short dashes with gaps at each row.
          */}
          <div className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
            {factColumns(facts).map((column, index) => (
              <dl
                key={index}
                className={
                  index === 0
                    ? ''
                    : 'sm:border-l sm:border-stroke sm:pl-6 sm:dark:border-strokedark'
                }
              >
                {column.map((fact) => (
                  <Row key={fact.label} label={fact.label} value={fact.value} />
                ))}
              </dl>
            ))}
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-black dark:text-white">
              Beds, priced one at a time
            </div>

            {showing ? (
              <SeatEditor seats={showing.seats ?? []} onSaved={onChanged} />
            ) : (
              <p className="text-xs text-gray-400">Loading the beds…</p>
            )}
          </div>
        </div>

        <div className="border-t border-[rgb(var(--c-border))] px-4 py-3">
          {/* Editing the room itself happens on the Rooms tab, where the form
              already lives. A second copy of it here would be a second set of
              validation rules to keep in step with the first. */}
          <ButtonLoading
            onClick={() => navigate(`${routes.hotel_setup}?tab=rooms&room=${summary.id}`)}
            label="Edit this room"
            variant="primary"
            size="sm"
            icon={<FiEdit2 size={14} />}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * The facts, halved into two columns.
 *
 * The odd one goes to the left, so a list of five reads 3 and 2 rather than
 * leaving the right column standing a row taller than the rule beside it.
 */
const factColumns = <T,>(facts: T[]): [T[], T[]] => {
  const half = Math.ceil(facts.length / 2);

  return [facts.slice(0, half), facts.slice(half)];
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-2 border-b border-stroke/50 pb-1 last:border-b-0 dark:border-strokedark/50">
    <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-right text-sm text-black dark:text-white">{value}</dd>
  </div>
);

export default RoomPanel;
