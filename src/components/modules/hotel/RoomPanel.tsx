import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiX } from 'react-icons/fi';

import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import routes from '../../services/appRoutes';

import SeatEditor from './SeatEditor';
import { HotelResource, LayoutRoom } from './types';
import { SALE_MODE_OPTIONS, money } from './setupHelpers';

/**
 * One room, opened from the grid.
 *
 * This is what lets the tiles stay small. Everything a tile cannot fit -- the
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

  return (
    <aside className="w-72 shrink-0 rounded border border-stroke dark:border-strokedark print:hidden">
      <div className="flex items-start justify-between border-b border-stroke px-3 py-2 dark:border-strokedark">
        <div>
          <div className="font-semibold text-black dark:text-white">{summary.display_name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {summary.room_type ?? 'No room type'}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-black dark:hover:text-white"
          title="Close"
        >
          <FiX size={16} />
        </button>
      </div>

      <dl className="space-y-1.5 px-3 py-2 text-sm">
        <Row label="Sold" value={saleLabel} />
        <Row
          label="Whole room"
          // A dash, not 0.00. A room sold only by the bed has no whole-room
          // price, and a zero would read as free.
          value={summary.rent === null ? '—' : `৳${money(summary.rent)} / night`}
        />
        {summary.seat_rent_min !== null ? (
          <Row
            label="Per bed"
            value={
              summary.seat_rent_min === summary.seat_rent_max
                ? `৳${money(summary.seat_rent_min)} / night`
                : `৳${money(summary.seat_rent_min)} – ${money(summary.seat_rent_max)} / night`
            }
          />
        ) : null}
        <Row label="Holds" value={`${summary.capacity} guest${summary.capacity === 1 ? '' : 's'}`} />
        <Row
          label="Beds"
          value={
            switchedOff
              ? `${summary.active_beds} in use, ${switchedOff} switched off`
              : `${summary.active_beds}`
          }
        />
        <Row
          label="Status"
          value={
            Number(summary.status) === 1 ? (
              <span className="text-success">Active</span>
            ) : (
              <span className="text-gray-400">Inactive</span>
            )
          }
        />
      </dl>

      <div className="border-t border-stroke px-3 py-2 dark:border-strokedark">
        <div className="mb-1.5 text-xs font-medium text-black dark:text-white">
          Beds, priced one at a time
        </div>

        {showing ? (
          <SeatEditor seats={showing.seats ?? []} onSaved={onChanged} />
        ) : (
          <p className="text-xs text-gray-400">Loading the beds…</p>
        )}
      </div>

      <div className="border-t border-stroke px-3 py-2 dark:border-strokedark">
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
    </aside>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-2">
    <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-right text-sm text-black dark:text-white">{value}</dd>
  </div>
);

export default RoomPanel;
